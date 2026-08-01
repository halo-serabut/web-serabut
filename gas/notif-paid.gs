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

// Semua nominal yang muncul di teks, urut kemunculan.
// "Rp1.000 berhasil diterima" → [1000] ; "Rp1.100 | Rp5.088" → [1100, 5088]
function _notifParseAmounts(text) {
  const out = [];
  const re = /rp\s*([\d.,]+)/gi;
  let m;
  while ((m = re.exec(String(text)))) {
    const n = Number(m[1].replace(/[^\d]/g, ''));
    if (n && out.indexOf(n) < 0) out.push(n);
  }
  return out;
}

// ────────────────────────────────────────────────────────
//  ENDPOINT — doPost: notifPaid { token, text, title }
// ────────────────────────────────────────────────────────
function notifPaid(params) {
  const secret = (PropertiesService.getScriptProperties().getProperty('NOTIF_TOKEN') || '').trim();
  if (!secret) return { success: false, error: 'NOTIF_TOKEN belum diset' };
  if (String(params.token || '').trim() !== secret) return { success: false, error: 'Unauthorized' };

  // Terima semua varian teks notifikasi. Notif yang dikelompokkan Android bikin
  // teks ringkas ({notification}) berisi ringkasan/notif lama — teks panjang
  // (big text) yang memuat isi sebenarnya. Kirim semuanya, biar di sini yang memilih.
  const raw = [params.title, params.text, params.bigText, params.ticker]
    .map(function (v) { return String(v || ''); })
    .filter(function (v) { return v && v !== 'null'; })
    .join(' | ');
  const cache = CacheService.getScriptCache();

  // Jejak notif terakhir — biar bisa dicek kalau ada yang "seharusnya masuk tapi tidak"
  PropertiesService.getScriptProperties().setProperty('NOTIF_LAST', new Date().toISOString() + ' | ' + raw.slice(0, 300));

  // Hanya notif "uang masuk". Notif lain (pesanan GoFood, promo, dll) diabaikan diam-diam.
  if (!/diterima|masuk|berhasil/i.test(raw)) return { success: true };

  const amounts = _notifParseAmounts(raw);
  const txnMatch = raw.match(/id\s*transaksi[:\s]*([A-Za-z0-9_-]+)/i);

  // Payload bisa memuat lebih dari satu nominal (teks ringkas basi + teks panjang baru).
  // Yang dipakai: nominal pertama yang benar-benar cocok dengan order belum lunas.
  let amount = amounts[0] || 0, orderId = '';
  try {
    for (let i = 0; i < amounts.length && !orderId; i++) {
      orderId = _notifFindOrderByAmount(amounts[i]);
      if (orderId) amount = amounts[i];
    }
  } catch (err) {
    Logger.log('notifPaid find error: ' + err.message);
    return { success: false, error: 'find: ' + err.message };
  }

  // Notif uang masuk tapi tak terbaca → JANGAN diam. Lapor apa adanya ke WA grup,
  // maks 1x per 10 menit biar tidak banjir kalau formatnya berubah total.
  if (!amount) {
    if (!cache.get('notifUnparsed')) {
      cache.put('notifUnparsed', '1', 600);
      sendWAToGroup(
        '❓ *Ada notifikasi pembayaran yang tidak terbaca*\n\n' +
        'Isi notifnya:\n_' + raw.slice(0, 250) + '_\n\n' +
        'Nominalnya tidak bisa saya baca, jadi tidak ada order yang saya proses. ' +
        'Kalau ini pembayaran beneran, tolong dicek manual ya.'
      );
    }
    return { success: true };
  }

  // Anti-dobel TIDAK perlu di jalur order ketemu: _notifFindOrderByAmount hanya
  // mengembalikan order yang belum lunas, dan _gobizMarkPaid sendiri idempotent.
  // Notif lama yang disodorkan ulang Android otomatis jatuh ke jalur "tidak cocok".
  if (!orderId) {
    // Cegah WA berulang untuk notif lama yang sama — permanen, bukan cache 6 jam
    const props = PropertiesService.getScriptProperties();
    const key = 'notifSeen:' + (txnMatch ? txnMatch[1] : amount + '@' + Math.floor(Date.now() / 60000));
    if (props.getProperty(key)) return { success: true };
    props.setProperty(key, String(Date.now()));

    sendWAToGroup(
      '💵 *Ada uang masuk, tapi belum ketemu ordernya*\n\n' +
      'Nominal: *Rp ' + amount.toLocaleString('id-ID') + '*\n' +
      (txnMatch ? 'ID transaksi: ' + txnMatch[1] + '\n' : '') + '\n' +
      'Tidak ada order Pending dengan nominal persis segitu. Biasanya ini pembayaran di luar web, ' +
      'atau nominalnya dibulatkan pembeli sehingga kode uniknya hilang.\n\n' +
      'Tolong dicek manual di Admin > Semua Order ya.'
    );
    return { success: true, matched: false, amount: amount };
  }

  try {
    _gobizMarkPaid(orderId, 'GoPay QRIS'); // set Lunas + Diproses + WA grup + notif buyer
  } catch (err) {
    Logger.log('notifPaid mark error: ' + err.message);
    // Sheet sudah mungkin ter-update tapi notif gagal → jangan diam, laporkan
    sendWAToGroup('⚠️ *Pembayaran masuk tapi notifikasinya gagal*\n\nOrder *' + orderId +
      '*\nNominal: *Rp ' + amount.toLocaleString('id-ID') + '*\n\nCek status ordernya manual ya. (' + err.message + ')');
    return { success: false, error: 'mark: ' + err.message };
  }
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
// Notif terakhir yang benar-benar sampai ke GAS — kosong = MacroDroid tidak pernah kirim
function testNotifLast() {
  Logger.log(PropertiesService.getScriptProperties().getProperty('NOTIF_LAST') || '(belum pernah ada notif masuk)');
}

function testNotifPaid() {
  const cases = [
    ['Rp1.000 berhasil diterima. ID transaksi: 40tc6WND', 1000],
    ['Rp 1.234.567 berhasil diterima.', 1234567],
    ['Pesanan baru masuk', 0],
  ];
  cases.forEach(function (c) {
    if ((_notifParseAmounts(c[0])[0] || 0) !== c[1]) throw new Error('parse gagal: ' + c[0]);
  });
  // payload campuran: nominal basi + nominal baru harus terbaca dua-duanya
  const multi = _notifParseAmounts('Rp1.100 berhasil diterima | Rp5.088 berhasil diterima');
  if (multi.join() !== '1100,5088') throw new Error('parse ganda gagal: ' + multi.join());
  Logger.log('parse OK. Order cocok utk Rp1.000: "' + _notifFindOrderByAmount(1000) + '"');
}
