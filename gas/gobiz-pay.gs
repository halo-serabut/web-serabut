// ────────────────────────────────────────────────────────
//  GOBIZ PAY INTEGRATION — QRIS GoPay resmi (developer.gobiz.com)
//  Uang masuk ke saldo GoPay Merchant. Deteksi paid = POLLING
//  (pay-integration TIDAK punya push webhook seperti Xendit).
//
//  Script Properties yang wajib diset:
//    GOBIZ_CLIENT_ID      — App ID dari portal
//    GOBIZ_CLIENT_SECRET  — Secret dari portal
//    GOBIZ_OUTLET_ID      — Outlet ID (sandbox: G292916417)
//    GOBIZ_API_BASE       — (opsional) default sandbox partner
//    GOBIZ_OAUTH_BASE     — (opsional) default sandbox goauth
//  Prod: GOBIZ_API_BASE=https://api.gobiz.co.id  GOBIZ_OAUTH_BASE=https://accounts.go-jek.com
// ────────────────────────────────────────────────────────

var GOBIZ_SCOPE           = 'payment:transaction:read payment:transaction:write';
var GOBIZ_API_BASE_DEF    = 'https://api.partner-sandbox.gobiz.co.id';
var GOBIZ_OAUTH_BASE_DEF  = 'https://integration-goauth.gojekapi.com';

function _gobizConfig() {
  var p = PropertiesService.getScriptProperties();
  var cfg = {
    clientId:  (p.getProperty('GOBIZ_CLIENT_ID')     || '').trim(),
    secret:    (p.getProperty('GOBIZ_CLIENT_SECRET') || '').trim(),
    outletId:  (p.getProperty('GOBIZ_OUTLET_ID')     || '').trim(),
    apiBase:   (p.getProperty('GOBIZ_API_BASE')   || GOBIZ_API_BASE_DEF).replace(/\/+$/, ''),
    oauthBase: (p.getProperty('GOBIZ_OAUTH_BASE') || GOBIZ_OAUTH_BASE_DEF).replace(/\/+$/, ''),
  };
  if (!cfg.clientId || !cfg.secret || !cfg.outletId) {
    throw new Error('Kredensial GoBiz belum lengkap (GOBIZ_CLIENT_ID / SECRET / OUTLET_ID)');
  }
  return cfg;
}

// Access token — client_credentials, Basic auth, reusable ~3600s. Cache 3500s.
function _gobizToken() {
  var cache  = CacheService.getScriptCache();
  var cached = cache.get('gobiz_token');
  if (cached) return cached;

  var cfg = _gobizConfig();
  var url = cfg.oauthBase + '/oauth2/token';

  // Method 1: client_secret_basic (Authorization header) — sesuai contoh dokumen
  var res = UrlFetchApp.fetch(url, {
    method: 'post',
    headers: { Authorization: 'Basic ' + Utilities.base64Encode(cfg.clientId + ':' + cfg.secret) },
    contentType: 'application/x-www-form-urlencoded',
    payload: { grant_type: 'client_credentials', scope: GOBIZ_SCOPE },
    muteHttpExceptions: true,
  });
  var body = JSON.parse(res.getContentText() || '{}');

  // Method 2: client_secret_post (kredensial di body) — fallback kalau server tolak Basic
  if (res.getResponseCode() >= 300 && body.error === 'invalid_client') {
    Logger.log('gobiz token: Basic ditolak, coba client_secret_post');
    res = UrlFetchApp.fetch(url, {
      method: 'post',
      contentType: 'application/x-www-form-urlencoded',
      payload: { grant_type: 'client_credentials', scope: GOBIZ_SCOPE, client_id: cfg.clientId, client_secret: cfg.secret },
      muteHttpExceptions: true,
    });
    body = JSON.parse(res.getContentText() || '{}');
  }

  if (res.getResponseCode() >= 300 || !body.access_token) {
    throw new Error('Gagal ambil token GoBiz: ' + res.getResponseCode() + ' ' + res.getContentText());
  }
  // Verifikasi scope payment benar-benar diberikan (fail-fast kalau credential salah jenis)
  if (String(body.scope || '').indexOf('payment:transaction:write') < 0) {
    throw new Error('Credential GoBiz tidak punya scope payment:transaction:write (scope: ' + body.scope + ')');
  }
  var ttl = Math.min(Number(body.expires_in) || 3600, 3600) - 100;
  cache.put('gobiz_token', body.access_token, ttl > 0 ? ttl : 3500);
  return body.access_token;
}

// Simpan transaction_id per order (durable — QRIS expiry 1 minggu > cache 6 jam)
function _gobizSaveTxn(orderId, txnId) {
  PropertiesService.getScriptProperties().setProperty('gobizTxn:' + orderId, txnId);
}
function _gobizGetTxn(orderId) {
  return PropertiesService.getScriptProperties().getProperty('gobizTxn:' + orderId) || '';
}
function _gobizDelTxn(orderId) {
  PropertiesService.getScriptProperties().deleteProperty('gobizTxn:' + orderId);
}

// ────────────────────────────────────────────────────────
//  ENDPOINT — doPost: createGobizTransaction { orderId }
//  Total dari sheet (anti-tamper). Return qris_string utk render QR.
// ────────────────────────────────────────────────────────
function createGobizTransaction(params) {
  var orderId = String(params.orderId || '').trim();
  if (!orderId) return { success: false, error: 'Order ID wajib diisi' };

  var t = _qrisOrderTotal(orderId);              // reuse dari qris-converter.gs
  if (t.error) return { success: false, error: t.error };

  try {
    var cfg   = _gobizConfig();
    var token = _gobizToken();
    var res = UrlFetchApp.fetch(
      cfg.apiBase + '/integrations/payment/outlets/' + cfg.outletId + '/v2/transactions',
      {
        method: 'post',
        headers: {
          Authorization:     'Bearer ' + token,
          'Idempotency-Key': orderId.slice(0, 32),   // max 32 char
        },
        contentType: 'application/json',
        payload: JSON.stringify({
          payment_type: 'qris',
          transaction_details: { order_id: orderId, gross_amount: t.total, currency: 'IDR' },
          item_details: [{ id: orderId, price: t.total, quantity: 1, name: 'Serabut Store Order ' + orderId, category: 'others' }],
        }),
        muteHttpExceptions: true,
      }
    );
    var body = JSON.parse(res.getContentText() || '{}');
    var txn  = body && body.data && body.data.transaction;
    if (res.getResponseCode() >= 300 || !txn || !txn.qris_string) {
      Logger.log('createGobizTransaction fail: ' + res.getResponseCode() + ' ' + res.getContentText());
      return { success: false, error: (body && body.message) || 'Gagal membuat transaksi GoBiz' };
    }
    _gobizSaveTxn(orderId, txn.id);
    return {
      success:   true,
      orderId:   orderId,
      amount:    t.total,
      qrString:  txn.qris_string,
      txnId:     txn.id,
      status:    txn.status,
    };
  } catch (err) {
    Logger.log('createGobizTransaction error: ' + err.message);
    return { success: false, error: err.message };
  }
}

// Cek apakah status transaksi = lunas (settlement_at terisi = dana masuk)
function _gobizIsPaid(txn) {
  if (!txn) return false;
  if (txn.settlement_at) return true;
  return ['settlement', 'success', 'paid', 'capture'].indexOf(String(txn.status || '').toLowerCase()) >= 0;
}

// ────────────────────────────────────────────────────────
//  ENDPOINT — doPost: gobizCheckPaid { orderId }
//  Poll get-transaction-detail → jika lunas, set Lunas + notif (idempotent).
//  Dipanggil saat buyer klik "cek pembayaran" + bisa dari trigger 1-menit.
// ────────────────────────────────────────────────────────
function gobizCheckPaid(params) {
  var orderId = String(params.orderId || '').trim();
  if (!orderId) return { success: false, error: 'Order ID wajib diisi' };
  var txnId = _gobizGetTxn(orderId);
  if (!txnId) return { success: false, error: 'Transaksi GoBiz tidak ditemukan untuk order ini' };

  var txn;
  try {
    var cfg   = _gobizConfig();
    var token = _gobizToken();
    var res = UrlFetchApp.fetch(
      cfg.apiBase + '/integrations/payment/outlets/' + cfg.outletId + '/v1/transactions/' + txnId,
      { method: 'get', headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true }
    );
    var body = JSON.parse(res.getContentText() || '{}');
    txn = body && body.data && body.data.transaction;
    if (res.getResponseCode() >= 300 || !txn) {
      return { success: false, error: 'Gagal cek status GoBiz: ' + res.getResponseCode() };
    }
  } catch (err) {
    Logger.log('gobizCheckPaid error: ' + err.message);
    return { success: false, error: err.message };
  }

  Logger.log('gobizCheckPaid: order=' + orderId + ' status=' + txn.status + ' settlement_at=' + txn.settlement_at);
  if (!_gobizIsPaid(txn)) return { success: true, paid: false, status: txn.status };

  _gobizMarkPaid(orderId, 'GoPay QRIS');
  _gobizDelTxn(orderId);
  return { success: true, paid: true, status: txn.status };
}

// Set order → Lunas + Diproses + notif WA grup & buyer (idempotent). Pola sama xenditCallback.
function _gobizMarkPaid(orderId, method) {
  var sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_ORDERS);
  if (!sheet) return;
  var data    = sheet.getDataRange().getValues();
  var headers = data[0].map(function (h) { return String(h).toLowerCase().trim(); });
  var idCol = headers.indexOf('order id'), stCol = headers.indexOf('status');
  var pmCol = headers.indexOf('payment method'), psCol = headers.indexOf('payment status');
  if (idCol < 0 || stCol < 0) return;

  // Order cart = banyak baris ber-Order ID sama → update SEMUA baris, bukan hanya yang pertama.
  var rows = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === orderId) rows.push(i);
  }
  if (!rows.length) return;

  {
    var first = rows[0];
    var curStatus = String(data[first][stCol]).trim();
    // Idempotency: skip jika sudah Lunas/Berhasil
    if (psCol >= 0 && ['Lunas', 'Berhasil'].indexOf(String(data[first][psCol]).trim()) >= 0) return;

    rows.forEach(function (r) {
      var st = String(data[r][stCol]).trim();
      if (st === 'Pending' || st === 'Dibatalkan') sheet.getRange(r + 1, stCol + 1).setValue('Diproses');
      if (pmCol >= 0) sheet.getRange(r + 1, pmCol + 1).setValue(method);
      if (psCol >= 0) sheet.getRange(r + 1, psCol + 1).setValue('Lunas');
    });
    SpreadsheetApp.flush();

    if (curStatus === 'Pending') {
      var g = function (name) { var c = headers.indexOf(name); return c >= 0 ? data[first][c] : ''; };
      var buyerNama = String(g('nama') || ''), buyerEmail = String(g('email') || ''), buyerWa = String(g('no wa') || '');
      var produk = String(g('produk') || ''), varian = String(g('varian') || '-');
      var masaAktif = String(g('masa aktif') || '-'), tanggal = String(g('tanggal') || '-');
      var hrgCol = headers.indexOf('harga');
      var harga = rows.reduce(function (s, r) { return s + (Number(data[r][hrgCol]) || 0); }, 0);
      if (rows.length > 1) produk = produk + ' +' + (rows.length - 1) + ' item lain';
      sendWAToGroup(
        '💰 *Pembayaran masuk — order siap diproses*\n\n' +
        'Order *' + orderId + '*\n' +
        produk + (varian !== '-' ? ' — ' + varian : '') + (masaAktif !== '-' ? ' (' + masaAktif + ')' : '') + '\n' +
        'Pembeli: ' + buyerNama + '\n' +
        'Total: *Rp ' + Number(harga).toLocaleString('id-ID') + '*\n' +
        'Dibayar via ' + method + ' • ' + tanggal + '\n\n' +
        'Pembayarannya sudah terkonfirmasi otomatis, jadi tidak perlu dicek manual di aplikasi. ' +
        'Status order saya ubah ke *Diproses*, dan pembeli sudah dapat konfirmasi lewat WhatsApp & email.\n\n' +
        'Tinggal disiapkan akunnya ya 🙏'
      );
      sendBuyerOrderConfirmed(buyerNama, buyerEmail, buyerWa ? _normalizeWA(buyerWa) : '', orderId, produk, varian, masaAktif, harga, method, tanggal);
    }
    _ordersMirror(orderId);
    return;
  }
}

// ────────────────────────────────────────────────────────
//  TEST — jalankan dari GAS editor setelah set Script Properties
// ────────────────────────────────────────────────────────
function testGobizToken() {
  try { Logger.log('Token OK, len=' + _gobizToken().length + ' (scope payment terverifikasi)'); }
  catch (e) { Logger.log('GAGAL: ' + e.message); }
}
function testGobizCreate() {
  // Buat transaksi dummy Rp 1.000 langsung ke API (tanpa order sheet) untuk cek qris_string
  var cfg = _gobizConfig(), token = _gobizToken();
  var oid = 'TEST-' + Date.now();
  var res = UrlFetchApp.fetch(cfg.apiBase + '/integrations/payment/outlets/' + cfg.outletId + '/v2/transactions', {
    method: 'post',
    headers: { Authorization: 'Bearer ' + token, 'Idempotency-Key': oid.slice(0, 32) },
    contentType: 'application/json',
    payload: JSON.stringify({ payment_type: 'qris', transaction_details: { order_id: oid, gross_amount: 1000, currency: 'IDR' },
      item_details: [{ id: oid, price: 1000, quantity: 1, name: 'Test', category: 'others' }] }),
    muteHttpExceptions: true,
  });
  Logger.log(res.getResponseCode() + ' ' + res.getContentText());
}
