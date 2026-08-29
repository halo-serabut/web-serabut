// ────────────────────────────────────────────────────────
//  QRIS CONVERTER — statis → dinamis (EMVCo TLV)
//  Static QRIS merchant disimpan di Script Properties key: QRIS_STATIC
//  (JANGAN hardcode string QRIS di file ini / di frontend)
// ────────────────────────────────────────────────────────

// CRC16-CCITT-FALSE (poly 0x1021, init 0xFFFF) — dipakai tag 63 QRIS
function qrisCrc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xFFFF : (crc << 1) & 0xFFFF;
    }
  }
  return ('0000' + crc.toString(16).toUpperCase()).slice(-4);
}

// Parse payload EMVCo jadi array [{id, value}] — throw jika struktur rusak
function qrisParseTLV(payload) {
  const tags = [];
  let i = 0;
  while (i < payload.length) {
    const id = payload.substr(i, 2);
    const lenStr = payload.substr(i + 2, 2);
    if (!/^\d{2}$/.test(id) || !/^\d{2}$/.test(lenStr)) throw new Error('QRIS tidak valid (struktur TLV rusak)');
    const len = parseInt(lenStr, 10);
    if (i + 4 + len > payload.length) throw new Error('QRIS tidak valid (panjang tag ' + id + ' melebihi data)');
    tags.push({ id: id, value: payload.substr(i + 4, len) });
    i += 4 + len;
  }
  return tags;
}

// Konversi QRIS statis → dinamis dengan nominal (IDR, integer > 0)
// Return string QRIS dinamis siap di-encode jadi QR code
function qrisStaticToDynamic(qrisStatic, amount) {
  const amt = Number(amount);
  if (!isFinite(amt) || amt <= 0 || Math.floor(amt) !== amt) throw new Error('Nominal tidak valid');

  const src = String(qrisStatic || '').trim();
  if (src.length < 20) throw new Error('QRIS statis tidak valid (terlalu pendek)');

  // Validasi CRC string asli (4 hex terakhir, dihitung atas payload + "6304")
  if (qrisCrc16(src.slice(0, -4)) !== src.slice(-4).toUpperCase()) {
    throw new Error('QRIS statis tidak valid (CRC salah)');
  }

  const tags = qrisParseTLV(src);
  if (!tags.some(function (t) { return t.id === '58'; })) {
    throw new Error('QRIS tidak valid (tag 58 tidak ditemukan)');
  }

  const out = [];
  tags.forEach(function (t) {
    if (t.id === '54' || t.id === '63') return;           // buang nominal lama & CRC lama
    if (t.id === '01') { out.push({ id: '01', value: '12' }); return; } // statis → dinamis
    if (t.id === '58') out.push({ id: '54', value: String(amt) });      // nominal sebelum country code
    out.push(t);
  });

  let payload = out.map(function (t) {
    return t.id + ('0' + t.value.length).slice(-2) + t.value;
  }).join('');
  payload += '6304';
  return payload + qrisCrc16(payload);
}

// Kode unik deterministik per order (1–299) — tidak butuh penyimpanan,
// order yang sama selalu dapat kode yang sama
// ponytail: hash sederhana; dua order Pending dengan total & hash sama bisa tabrakan (~0.3%) — pindah ke kolom sheet jika pernah kejadian
function _qrisUniqueCode(orderId) {
  let h = 0;
  const s = String(orderId);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0x7FFFFFFF;
  return (h % 299) + 1;
}

// Cari total order (sum semua baris dengan orderId sama; cart = multi-row).
// Baca sheet (order tetap dual-write sheet+Supabase, jadi sheet selalu sinkron utk order normal).
function _qrisOrderTotal(orderId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_ORDERS);
  if (!sheet) return { error: 'Sheet tidak ditemukan' };
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(function (h) { return String(h).toLowerCase().trim(); });
  const idCol   = headers.indexOf('order id');
  const hrgCol  = headers.indexOf('harga');
  if (idCol < 0 || hrgCol < 0) return { error: 'Sheet error' };
  let total = 0, found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === orderId) {
      found = true;
      total += Number(data[i][hrgCol]) || 0;
    }
  }
  if (!found) return { error: 'Order tidak ditemukan' };
  if (total <= 0) return { error: 'Nominal order tidak valid' };
  return { total: total };
}

// ────────────────────────────────────────────────────────
//  ENDPOINT — doPost action: getQrisPayment { orderId }
//  Nominal dari sheet Orders (server-side, anti-tamper) + kode unik
// ────────────────────────────────────────────────────────
function getQrisPayment(params) {
  const orderId = String(params.orderId || '').trim();
  if (!orderId) return { success: false, error: 'Order ID wajib diisi' };

  const qrisStatic = PropertiesService.getScriptProperties().getProperty('QRIS_STATIC');
  if (!qrisStatic) return { success: false, error: 'Pembayaran QRIS belum tersedia' };

  const t = _qrisOrderTotal(orderId);
  if (t.error) return { success: false, error: t.error };

  const uniqueCode = _qrisUniqueCode(orderId);
  const amount     = t.total + uniqueCode;

  try {
    return {
      success: true,
      orderId: orderId,
      baseAmount: t.total,
      uniqueCode: uniqueCode,
      amount: amount,
      qrString: qrisStaticToDynamic(qrisStatic, amount),
    };
  } catch (err) {
    Logger.log('getQrisPayment error: ' + err.message);
    return { success: false, error: 'Gagal membuat QRIS: ' + err.message };
  }
}

// ────────────────────────────────────────────────────────
//  ENDPOINT admin — doPost action: getQrisManual { amount }
//  QRIS dinamis nominal bebas (tanpa order) — untuk tagihan manual
// ────────────────────────────────────────────────────────
function getQrisManual(params) {
  const authErr = _requireAdmin(params.adminEmail, params.adminToken);
  if (authErr) return { success: false, error: authErr };

  const amount = Math.round(Number(params.amount));
  if (!amount || amount < 1 || amount > 100000000) return { success: false, error: 'Nominal tidak valid (1 – 100.000.000)' };

  const qrisStatic = PropertiesService.getScriptProperties().getProperty('QRIS_STATIC');
  if (!qrisStatic) return { success: false, error: 'QRIS_STATIC belum diset' };

  try {
    return { success: true, amount: amount, qrString: qrisStaticToDynamic(qrisStatic, amount) };
  } catch (err) {
    Logger.log('getQrisManual error: ' + err.message);
    return { success: false, error: 'Gagal membuat QRIS: ' + err.message };
  }
}

// ────────────────────────────────────────────────────────
//  ENDPOINT — doPost action: qrisClaimPaid { orderId }
//  Buyer klik "I've completed the payment" → tandai Menunggu Verifikasi
//  + WA ke grup admin untuk cek app Dana
// ────────────────────────────────────────────────────────
function qrisClaimPaid(params) {
  const orderId = String(params.orderId || '').trim();
  if (!orderId) return { success: false, error: 'Order ID wajib diisi' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: false, error: 'Sheet tidak ditemukan' };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(function (h) { return String(h).toLowerCase().trim(); });
  const idCol   = headers.indexOf('order id');
  const pmCol   = headers.indexOf('payment method');
  const psCol   = headers.indexOf('payment status');
  if (idCol < 0) return { success: false, error: 'Sheet error' };

  let found = false, alreadyClaimed = false, total = 0;
  const hrgCol = headers.indexOf('harga');
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() !== orderId) continue;
    found = true;
    total += Number(data[i][hrgCol]) || 0;
    if (psCol >= 0) {
      const ps = String(data[i][psCol] || '').trim();
      // Sudah terdeteksi lunas (notif HP / webhook) → jangan turunkan lagi ke Menunggu Verifikasi
      if (ps === 'Berhasil' || ps === 'Lunas') return { success: true, alreadyPaid: true };
      if (ps === 'Menunggu Verifikasi') alreadyClaimed = true;
      sheet.getRange(i + 1, psCol + 1).setValue('Menunggu Verifikasi');
    }
    if (pmCol >= 0) sheet.getRange(i + 1, pmCol + 1).setValue('QRIS');
  }
  if (!found) return { success: false, error: 'Order tidak ditemukan' };
  SpreadsheetApp.flush();
  _ordersMirror(orderId);

  if (!alreadyClaimed) {
    const amount = total + _qrisUniqueCode(orderId);
    sendWAToGroup(
      '⚠️ *Pembeli klaim sudah bayar, tapi belum terdeteksi*\n\n' +
      'Order *' + orderId + '*\n' +
      'Nominal: *Rp ' + amount.toLocaleString('id-ID') + '*\n\n' +
      'Pembeli menekan tombol konfirmasi, tapi notifikasi pembayaran belum masuk. ' +
      'Bisa jadi notifnya telat sedikit, atau memang belum benar-benar dibayar.\n\n' +
      'Tunggu sebentar — kalau pembayarannya beneran masuk, saya kirim konfirmasi otomatis menyusul. ' +
      'Kalau tidak ada kabar lagi, berarti perlu dicek manual ya.'
    );
  }
  return { success: true };
}

// ────────────────────────────────────────────────────────
//  TEST MANUAL — jalankan dari GAS editor setelah set QRIS_STATIC
//  Log: string dinamis + URL gambar QR untuk discan dari HP
// ────────────────────────────────────────────────────────
function testQrisConverter() {
  const qrisStatic = PropertiesService.getScriptProperties().getProperty('QRIS_STATIC');
  if (!qrisStatic) { Logger.log('Set dulu Script Property QRIS_STATIC'); return; }
  const dyn = qrisStaticToDynamic(qrisStatic, 10000);
  Logger.log('Dynamic QRIS (Rp10.000): ' + dyn);
  Logger.log('Scan test: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(dyn));
}
