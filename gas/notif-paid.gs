// ────────────────────────────────────────────────────────
//  NOTIF PAID — jembatan notifikasi GoPay/GoFood Merchant (Android) → order Lunas
//
//  Alur: MacroDroid di HP menangkap notifikasi app merchant, POST teksnya ke sini.
//  Nominal notif dicocokkan ke (total order + kode unik 3 digit) dari order Pending.
//
//  Contoh notif asli:
//    judul : "Pembayaran QRIS diterima!"
//    isi   : "Rp1.000 berhasil diterima. ID transaksi: 40tc6WND"
//
//  Script Property wajib: NOTIF_TOKEN (rahasia bebas, disamakan di MacroDroid)
//
//  ponytail: cocokkan-by-nominal, bukan API resmi. Ceiling: HP mati / teks notif
//  berubah = pembayaran tidak terdeteksi (fallback: klaim manual buyer + WA grup).
//  Upgrade path: createGobizTransaction/gobizCheckPaid di gobiz-pay.gs.
// ────────────────────────────────────────────────────────

// "Rp1.000 berhasil diterima" → 1000 ; "Rp 1.234.567," → 1234567
function _notifParseAmount(text) {
  const m = String(text).match(/rp\s*([\d.,]+)/i);
  if (!m) return 0;
  return Number(m[1].replace(/[^\d]/g, '')) || 0;
}

// ────────────────────────────────────────────────────────
//  ENDPOINT — doPost: notifPaid { token, text, title }
// ────────────────────────────────────────────────────────
function notifPaid(params) {
  const secret = (PropertiesService.getScriptProperties().getProperty('NOTIF_TOKEN') || '').trim();
  if (!secret) return { success: false, error: 'NOTIF_TOKEN belum diset' };
  if (String(params.token || '').trim() !== secret) return { success: false, error: 'Unauthorized' };

  const raw = String(params.title || '') + ' ' + String(params.text || '');

  // Hanya notif "uang masuk". Notif lain (pesanan GoFood, promo, dll) diabaikan.
  if (!/diterima|masuk|berhasil/i.test(raw)) return { success: true };

  const amount = _notifParseAmount(raw);
  if (!amount) return { success: true };

  // Anti-dobel via ID transaksi. Tanpa ID tidak ada cara aman bedakan notif ulang
  // dari dua pembayaran nominal sama — lebih baik diam daripada dobel proses.
  const txnMatch = raw.match(/id\s*transaksi[:\s]*([A-Za-z0-9_-]+)/i);
  if (!txnMatch) return { success: true };
  const cache = CacheService.getScriptCache();
  if (cache.get('notifPaid:' + txnMatch[1])) return { success: true };
  cache.put('notifPaid:' + txnMatch[1], '1', 21600); // 6 jam

  const orderId = _notifFindOrderByAmount(amount);

  if (!orderId) {
    sendWAToGroup(
      '💵 *Ada uang masuk, tapi belum ketemu ordernya*\n\n' +
      'Nominal: *Rp ' + amount.toLocaleString('id-ID') + '*\n' +
      'ID transaksi: ' + txnMatch[1] + '\n\n' +
      'Tidak ada order Pending dengan nominal persis segitu. Biasanya ini pembayaran di luar web, ' +
      'atau nominalnya dibulatkan pembeli sehingga kode uniknya hilang.\n\n' +
      'Tolong dicek manual di Admin > Semua Order ya.'
    );
    return { success: true, matched: false, amount: amount };
  }

  _gobizMarkPaid(orderId, 'GoPay QRIS'); // set Lunas + Diproses + WA grup + notif buyer
  return { success: true, matched: true, orderId: orderId, amount: amount };
}

// Cari order yang belum lunas dengan (total + kode unik) == amount.
// Cart = beberapa baris satu orderId, jadi total dijumlahkan dulu per order.
function _notifFindOrderByAmount(amount) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_ORDERS);
  if (!sheet) return '';
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(function (h) { return String(h).toLowerCase().trim(); });
  const idCol = headers.indexOf('order id');
  const hrgCol = headers.indexOf('harga');
  const psCol = headers.indexOf('payment status');
  if (idCol < 0 || hrgCol < 0) return '';

  const totals = {}, paid = {};
  for (let i = 1; i < data.length; i++) {
    const oid = String(data[i][idCol]).trim();
    if (!oid) continue;
    totals[oid] = (totals[oid] || 0) + (Number(data[i][hrgCol]) || 0);
    if (psCol >= 0 && ['Lunas', 'Berhasil'].indexOf(String(data[i][psCol]).trim()) >= 0) paid[oid] = true;
  }

  // Order terbaru menang kalau ada tabrakan hash (baris paling bawah = paling baru)
  const ids = Object.keys(totals);
  for (let i = ids.length - 1; i >= 0; i--) {
    const oid = ids[i];
    if (paid[oid]) continue;
    if (totals[oid] + _qrisUniqueCode(oid) === amount) return oid;
  }
  return '';
}

// ────────────────────────────────────────────────────────
//  TEST — jalankan dari GAS editor
// ────────────────────────────────────────────────────────
function testNotifPaid() {
  const cases = [
    ['Rp1.000 berhasil diterima. ID transaksi: 40tc6WND', 1000],
    ['Rp 1.234.567 berhasil diterima.', 1234567],
    ['Pesanan baru masuk', 0],
  ];
  cases.forEach(function (c) {
    if (_notifParseAmount(c[0]) !== c[1]) throw new Error('parse gagal: ' + c[0]);
  });
  Logger.log('parse OK. Order cocok utk Rp1.000: "' + _notifFindOrderByAmount(1000) + '"');
}
