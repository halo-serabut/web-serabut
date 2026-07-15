// ═══════════════════════════════════════════════════════
//  SERABUT STORE — Google Apps Script Backend v5
//  Security hardened — session tokens, POST-only sensitive actions,
//  server-side price validation, Google JWT verification
// ═══════════════════════════════════════════════════════

const SPREADSHEET_ID  = '1ZHvmuE6r-cmygFBCKSThmlevKGLcByqhmOb0WvrKZ3I';
const TAB_CATALOG     = 'Catalog';
const TAB_USERS       = 'Users-web';
const TAB_ORDERS      = 'Orders';
const TAB_SETTINGS    = 'Settings';
const TAB_REVIEWS     = 'Reviews';

// [SEC] Semua token dari Script Properties — JANGAN hardcode di sini
// Setup: Extensions → Apps Script → Project Settings → Script Properties
// Keys: FONNTE_TOKEN, OPENROUTER_KEY
const FONNTE_TOKEN        = PropertiesService.getScriptProperties().getProperty('FONNTE_TOKEN') || '';
const OPENROUTER_KEY      = PropertiesService.getScriptProperties().getProperty('OPENROUTER_KEY') || '';

const WA_GROUP_ID         = '';
const WA_GROUP_ESCALATION = '120363172991002805@g.us';
const WA_STORE_NO         = '628881500555';
const STORE_NAME          = 'Serabut Store';
const OTP_EXPIRY_MIN      = 10;
const OTP_MAX_ATTEMPTS    = 5;     // [SEC] lockout setelah N kali OTP salah
const SESSION_EXPIRY_DAYS = 30;    // [SEC] session token expired setelah N hari

const TAB_CS         = 'CS-Sessions';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ── Kolom Users-web (0-indexed) ──────────────────────────
// 0:Nama  1:Email  2:No Hp  3:Password  4:Created At  5:Status
// 6:Privacy Notice  7:OTP  8:OTP Expiry  9:Role
// 10:Tanggal Lahir  11:Jenis Kelamin  12:Kota  13:Provinsi
// 14:Session Token  15:OTP Attempts  [SEC] kolom baru v5

// ── Kolom Catalog (0-indexed) ───────────────────────────
// 0:Nama  1:Varian  2:MasaAktif  3:Harga  4:LinkProduk
// 5:Aktif  6:Stok  7:IconUrl

// ────────────────────────────────────────────────────────
//  MAIN HANDLER — GET (public read-only only)
// ────────────────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;

  // [SEC] GET hanya untuk endpoint publik read-only
  const PUBLIC_ACTIONS = ['getCatalog', 'getSettings', 'getGuides', 'checkStatus', 'smartSearch', 'getReviews', 'getPublicQuo'];
  if (!PUBLIC_ACTIONS.includes(action)) {
    return _jsonOut({ success: false, error: 'Gunakan POST untuk aksi ini' });
  }

  let result;
  try {
    switch (action) {
      case 'getCatalog':  result = getCatalog(); break;
      case 'checkStatus': result = checkStatus(e.parameter.type, e.parameter.query); break;
      case 'smartSearch': result = smartSearch(e.parameter.query); break;
      case 'getSettings': result = getSettings(); break;
      case 'getGuides':   result = getGuides(); break;
      case 'getReviews':    result = getReviews(e.parameter.produk); break;
      case 'getPublicQuo':  result = getPublicQuo(e.parameter); break;
      default:              result = { success: false, error: 'Unknown action' };
    }
  } catch (err) {
    Logger.log('doGet ERROR [' + action + ']: ' + err.message);
    result = { success: false, error: 'Terjadi kesalahan. Silakan coba lagi.' };
  }

  return _jsonOut(result);
}

// ────────────────────────────────────────────────────────
//  POST HANDLER — semua aksi sensitif
// ────────────────────────────────────────────────────────
function doPost(e) {
  let params;
  try { params = JSON.parse(e.postData.contents); } catch (_) { params = {}; }

  // Xendit webhook kirim action via query string, bukan di body
  const action = params.action || (e.parameter && e.parameter.action) || '';
  let result;

  // [SEC] CSRF defense-in-depth: unauthenticated endpoints wajib sertakan _srb marker
  const UNAUTHENTICATED_ACTIONS = ['register','verifyOTP','resendOTP','login','googleLogin','forgotPasswordSendOTP','forgotPasswordVerify'];
  if (UNAUTHENTICATED_ACTIONS.includes(action) && String(params._srb || '') !== '1') {
    return _jsonOut({ success: false, error: 'Bad request' });
  }

  // [SEC-03] Centralized session validation untuk semua user-authenticated endpoints
  const USER_AUTH_ACTIONS = [
    'getOrders','getProfile','updateProfile','changePassword',
    'confirmPayment','checkIPaymuOrderStatus','cancelOrder',
    'submitReview','getBuyerReviews','likeReview','editReview','deleteReview','sendReviewReminder',
  ];
  if (USER_AUTH_ACTIONS.includes(action) && !validateSession(params.email, params.sessionToken)) {
    return _jsonOut({ success: false, error: 'Sesi tidak valid. Silakan login ulang.' });
  }

  try {
    switch (action) {
      // Auth
      case 'register':          result = register(params); break;
      case 'verifyOTP':         result = verifyOTP(params); break;
      case 'resendOTP':         result = resendOTP(params); break;
      case 'login':             result = login(params); break;
      case 'googleLogin':       result = googleLogin(params); break;
      // User (authenticated)
      case 'createOrder':       result = createOrder(params); break;
      case 'getOrders':         result = getOrders(params); break;
      case 'getProfile':        result = getProfile(params); break;
      case 'updateProfile':     result = updateProfile(params); break;
      case 'changePassword':          result = changePassword(params); break;
      case 'forgotPasswordSendOTP':   result = forgotPasswordSendOTP(params); break;
      case 'forgotPasswordVerify':    result = forgotPasswordVerify(params); break;
      case 'createCartOrder':         result = createCartOrder(params); break;
      case 'createIPaymuPayment':     result = createIPaymuPayment(params); break;
      case 'ipaymuCallback':          result = ipaymuCallback(params); break;
      case 'createXenditInvoice':     result = createXenditInvoice(params); break;
      case 'xenditCallback':          result = xenditCallback(params, e); break;
      case 'confirmPayment':          result = confirmPayment(params); break;
      case 'checkIPaymuOrderStatus':  result = checkIPaymuOrderStatus(params); break;
      case 'getQrisPayment':          result = getQrisPayment(params); break;
      case 'qrisClaimPaid':           result = qrisClaimPaid(params); break;
      case 'cancelOrder':             result = cancelOrder(params); break;
      case 'requestDeleteAccount':    result = requestDeleteAccount(params); break;
      // CS
      case 'csChat':            result = handleCSChat(params); break;
      // Admin
      case 'getSettings':       result = getSettings(); break;
      case 'saveSettings':      result = saveSettings(params); break;
      case 'getCatalogAdmin':   result = getCatalogAdmin(params); break;
      case 'addProduct':        result = addProduct(params); break;
      case 'updateProduct':     result = updateProduct(params); break;
      case 'deleteProduct':     result = deleteProduct(params); break;
      case 'getAllOrders':       result = getAllOrders(params); break;
      case 'updateOrderStatus': result = updateOrderStatus(params); break;
      case 'getGuides':         result = getGuides(); break;
      case 'saveGuides':        result = saveGuides(params); break;
      case 'setUserRole':       result = setUserRole(params); break;
      case 'getAdminUsers':     result = getAdminUsers(params); break;
      case 'updateUserAdmin':   result = updateUserAdmin(params); break;
      case 'deleteUserAdmin':   result = deleteUserAdmin(params); break;
      case 'updateProductStock':    result = updateProductStock(params); break;
      case 'updateProductAktif':    result = updateProductAktif(params); break;
      case 'saveProductBenefits':       result = saveProductBenefits(params); break;
      case 'uploadProductImage':        result = uploadProductImage(params); break;
      case 'iPaymuAdminGetBalance':     result = iPaymuAdminGetBalance(params); break;
      case 'iPaymuAdminGetHistory':     result = iPaymuAdminGetHistory(params); break;
      case 'iPaymuAdminGetTransaction': result = iPaymuAdminGetTransaction(params); break;
      case 'iPaymuAdminSyncOrders':     result = iPaymuAdminSyncOrders(params); break;
      case 'xenditGetBalance':          result = xenditGetBalance(params); break;
      case 'xenditGetTransactions':     result = xenditGetTransactions(params); break;
      case 'getOrderDetail':            result = getOrderDetail(params); break;
      // Reviews
      case 'submitReview':              result = submitReview(params); break;
      case 'getBuyerReviews':           result = getBuyerReviews(params); break;
      case 'likeReview':                result = likeReview(params); break;
      case 'sendQuotationEmail':        result = sendQuotationEmail(params); break;
      case 'sendQuotationWA':          result = sendQuotationWA(params); break;
      case 'saveQuotation':            result = saveQuotation(params); break;
      case 'getQuotations':            result = getQuotations(params); break;
      case 'sendReviewReminder':        result = sendReviewReminder(params); break;
      case 'editReview':                result = editReview(params); break;
      case 'toggleReview':              result = toggleReview(params); break;
      case 'deleteReview':              result = deleteReview(params); break;
      case 'getAdminReviews':           result = getAdminReviews(params); break;
      case 'resetOfficePassword':   result = resetOfficePassword(params); break;
      default: result = { success: false, error: 'Unknown action' };
    }
  } catch (err) {
    Logger.log('doPost ERROR [' + action + ']: ' + err.message + '\n' + err.stack);
    result = { success: false, error: 'Terjadi kesalahan. Silakan coba lagi.' };
  }

  return _jsonOut(result);
}

function _jsonOut(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// ════════════════════════════════════════════════════════
//  [SEC] SECURITY HELPERS
// ════════════════════════════════════════════════════════

// Generate session token UUID
function _generateSessionToken() {
  return Utilities.getUuid();
}

// [SEC] SHA-256 hex digest via GAS Utilities
function _sha256GAS(str) {
  const bytes  = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(str), Utilities.Charset.UTF_8);
  return bytes.map(b => ('0' + (b < 0 ? b + 256 : b).toString(16)).slice(-2)).join('');
}

// [SEC] Generate random 32-char hex salt
function _generateSalt() {
  return Utilities.getUuid().replace(/-/g, '');
}

// [SEC] Terapkan server-side salt ke client hash: SHA256(clientHash + ':' + salt)
function _applyServerSalt(clientHash, salt) {
  return _sha256GAS(String(clientHash) + ':' + String(salt));
}

// [SEC-15] Cegah formula injection di Google Sheets — prefix ' jika string diawali = + - @ |
function _sanitizeCell(val) {
  const s = String(val === null || val === undefined ? '' : val);
  return /^[=+\-@|]/.test(s) ? "'" + s : s;
}

// ────────────────────────────────────────────────────────
//  [SEC-11] ADMIN AUDIT LOG — catat setiap aksi admin ke sheet "Admin-Log"
// ────────────────────────────────────────────────────────
function _logAdminAction(adminEmail, action, details) {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    let log     = ss.getSheetByName('Admin-Log');
    if (!log) {
      log = ss.insertSheet('Admin-Log');
      log.appendRow(['Timestamp', 'Admin Email', 'Action', 'Details']);
      log.getRange(1, 1, 1, 4).setFontWeight('bold');
    }
    const ts = formatJkt(new Date(), 'yyyy-MM-dd HH:mm:ss');
    log.appendRow([ts, adminEmail, action, typeof details === 'object' ? JSON.stringify(details) : String(details || '')]);
  } catch (e) {
    Logger.log('_logAdminAction error (non-fatal): ' + e.message);
  }
}

// [SEC] Rate limiter via CacheService — return false jika sudah melebihi batas
// Fail-open: jika CacheService error, izinkan request (jangan block semua user)
function _rateLimit(key, maxAttempts, windowSeconds) {
  try {
    const cache   = CacheService.getScriptCache();
    const current = parseInt(cache.get(key) || '0', 10);
    if (current >= maxAttempts) return false;
    cache.put(key, String(current + 1), windowSeconds);
    return true;
  } catch (e) {
    Logger.log('RateLimit error (fail-open): ' + e.message);
    return true;
  }
}

// Simpan session token ke Users-web
function _storeSessionToken(sheet, rowIdx, token) {
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 16)).getValues()[0];
  const col     = _colIndex(headers, 'session token', 'sessiontoken');
  if (col >= 0) {
    sheet.getRange(rowIdx, col + 1).setValue(token);
  } else {
    sheet.getRange(rowIdx, 15).setValue(token); // fallback col O
  }
}

// Validasi session token: return true jika valid & belum expired
function validateSession(email, sessionToken) {
  if (!email || !sessionToken) return false;
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return false;
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const tokenCol  = _colIndex(headers, 'session token', 'sessiontoken');
  const expiryCol = _colIndex(headers, 'session token expiry', 'sessiontokenexpiry');
  if (tokenCol < 0) return true; // kolom belum ada → compat user lama, izinkan

  const emailNorm = email.toLowerCase().trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== emailNorm) continue;
    const stored = String(data[i][tokenCol] || '').trim();
    if (stored === '') return true; // user lama tanpa token → izinkan
    if (stored !== String(sessionToken).trim()) return false;
    // [SEC] Cek expiry jika kolom ada dan terisi — session lama (tanpa expiry) tetap valid
    if (expiryCol >= 0) {
      const expiry = data[i][expiryCol];
      if (expiry && new Date() > new Date(expiry)) return false;
    }
    return true;
  }
  return false;
}

// Require authenticated user — return error string atau null jika OK
function _requireAuth(email, sessionToken) {
  if (!email || !sessionToken) return 'Autentikasi diperlukan. Silakan login ulang.';
  if (!validateSession(email, sessionToken)) return 'Sesi tidak valid atau kadaluarsa. Silakan login ulang.';
  return null;
}

// Require admin — return error string atau null jika OK
function _requireAdmin(adminEmail, adminToken) {
  if (!adminEmail) return 'Akses ditolak';
  if (!adminToken) return 'Token admin diperlukan. Silakan login ulang.';
  if (!validateSession(adminEmail, adminToken)) return 'Sesi admin tidak valid. Silakan login ulang.';
  if (!isAdminEmail(adminEmail)) return 'Akses ditolak';
  return null;
}

// Cek apakah email adalah admin (tanpa token check)
function isAdminEmail(email) {
  if (!email) return false;
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== email.toLowerCase().trim()) continue;
    return _getUserRole(data, i) === 'admin';
  }
  return false;
}

// Backward compat alias
function isAdminUser(email) { return isAdminEmail(email); }

// [SEC] Verifikasi Google ID Token via Google tokeninfo API
function _verifyGoogleToken(idToken) {
  if (!idToken) return null;
  try {
    const resp = UrlFetchApp.fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(idToken),
      { muteHttpExceptions: true }
    );
    if (resp.getResponseCode() !== 200) return null;
    const payload = JSON.parse(resp.getContentText());
    if (!payload.email || payload.email_verified !== 'true' && payload.email_verified !== true) return null;
    return payload; // { email, name, sub, ... }
  } catch (e) {
    Logger.log('Google token verify error: ' + e.message);
    return null;
  }
}

// [SEC] Lookup harga diskon dari campaign aktif (jika ada) — untuk member
// Return: harga diskon (Number) atau null jika tidak ada campaign aktif yang cocok
function _getActiveCampaignPrice(produk, varian, masaAktif) {
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(TAB_SETTINGS);
    if (!sheet) return null;
    const data     = sheet.getDataRange().getValues();
    const settings = {};
    for (let i = 1; i < data.length; i++) {
      const k = String(data[i][0] || '').trim();
      const v = String(data[i][1] || '').trim();
      if (k) settings[k] = v;
    }
    const normStr = s => String(s || '').trim().toLowerCase();
    const now = new Date();

    // Format baru: flashSale.campaigns (array of campaign objects)
    const campaigns = JSON.parse(settings['flashSale.campaigns'] || '[]');
    for (const camp of campaigns) {
      if (!camp.aktif) continue;
      const start    = camp.startDate ? new Date(camp.startDate) : null;
      const deadline = camp.endDate   ? new Date(camp.endDate)   :
                       camp.deadline  ? new Date(camp.deadline)  : null;
      if (start    && now < start)    continue;
      if (deadline && now > deadline) continue;
      const items = camp.items || [];
      // item.varian bisa berupa combined "Varian · MasaAktif" (format baru) atau terpisah
      const combinedKey = masaAktif && masaAktif !== '-' ? normStr(varian) + ' · ' + normStr(masaAktif) : normStr(varian);
      for (const item of items) {
        if (normStr(item.produk) !== normStr(produk)) continue;
        const itemVarian = normStr(item.varian || '');
        // Match combined "Varian · MasaAktif" ATAU varian+masaAktif terpisah
        const matchCombined = itemVarian === combinedKey;
        const matchSeparate = itemVarian === normStr(varian) && normStr(item.masaAktif || '') === normStr(masaAktif);
        if (matchCombined || matchSeparate) {
          const h = Number(item.harga);
          if (h > 0) return h;
        }
      }
    }

    // Format lama: flashSale.aktif + flashSale.items (single campaign)
    if (settings['flashSale.aktif'] === 'true') {
      const deadline = settings['flashSale.deadline'] ? new Date(settings['flashSale.deadline']) : null;
      if (!deadline || now <= deadline) {
        const items = JSON.parse(settings['flashSale.items'] || '[]');
        const combinedKeyOld = masaAktif && masaAktif !== '-' ? normStr(varian) + ' · ' + normStr(masaAktif) : normStr(varian);
        for (const item of items) {
          if (normStr(item.produk) !== normStr(produk)) continue;
          const itemVarian = normStr(item.varian || '');
          const matchC = itemVarian === combinedKeyOld;
          const matchS = itemVarian === normStr(varian) && normStr(item.masaAktif || '') === normStr(masaAktif);
          if (matchC || matchS) {
            const h = Number(item.harga);
            if (h > 0) return h;
          }
        }
      }
    }
  } catch(e) {
    Logger.log('_getActiveCampaignPrice error: ' + e.message);
  }
  return null;
}

// [SEC] Lookup harga produk dari Catalog (untuk validasi server-side)
function _getCatalogPrice(produk, varian, masaAktif) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return null;
  const data = sheet.getDataRange().getValues();
  const normStr = s => String(s || '').trim().toLowerCase();
  for (let i = 1; i < data.length; i++) {
    const row   = data[i];
    const aktif = row[5];
    if (aktif !== true && String(aktif).toUpperCase() !== 'TRUE') continue;
    if (normStr(row[0]) === normStr(produk) &&
        normStr(row[1]) === normStr(varian) &&
        normStr(row[2]) === normStr(masaAktif)) {
      return Number(row[3]) || 0;
    }
  }
  return null; // produk tidak ditemukan
}

// ────────────────────────────────────────────────────────
//  GENERAL HELPERS
// ────────────────────────────────────────────────────────
function _getUserRole(data, rowIdx) {
  const headers  = data[0].map(h => String(h).toLowerCase().trim());
  const roleCol  = headers.findIndex(h => h === 'role');
  const col      = roleCol !== -1 ? roleCol : 9;
  return String(data[rowIdx][col] || 'buyer').trim().toLowerCase();
}

function _formatDateCell(val) {
  if (!val) return '';
  if (val instanceof Date) return Utilities.formatDate(val, 'Asia/Jakarta', 'yyyy-MM-dd');
  return String(val).trim();
}

function _colIndex(headers, ...names) {
  for (const name of names) {
    const n   = name.toLowerCase();
    const idx = headers.findIndex(h => String(h).toLowerCase().trim() === n);
    if (idx !== -1) return idx;
  }
  return -1;
}

// ────────────────────────────────────────────────────────
//  GET CATALOG (public)
// ────────────────────────────────────────────────────────
function getCatalog() {
  // Cache 5 menit di GAS — drastis kurangi latency untuk request berulang
  const cache    = CacheService.getScriptCache();
  const cacheKey = 'getCatalog_v1';
  const cached   = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch (_) {}
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  const data     = sheet.getDataRange().getValues();
  const headers  = data[0].map(h => String(h).toLowerCase().trim());
  const cKat     = _colIndex(headers, 'kategori', 'category');
  const cIcon    = _colIndex(headers, 'icon url', 'iconurl', 'icon_url');
  const cBen     = _colIndex(headers, 'deskripsi', 'benefits', 'benefit');
  const cGbr     = _colIndex(headers, 'gambar', 'image url', 'imageurl', 'image_url', 'foto');
  const cTerjual = _colIndex(headers, 'terjual', 'sold', 'terjual (p)');
  const products = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    const aktif = row[5];
    if (aktif !== true && String(aktif).toUpperCase() !== 'TRUE') continue;

    const rawStok = row[6];
    const stok    = (rawStok === '' || rawStok === null || rawStok === undefined) ? null : Number(rawStok);
    const parsed  = _parseProductDesc(cBen >= 0 ? row[cBen] : row[14]);

    products.push({
      rowIndex:   i + 1,
      nama:       String(row[0]).trim(),
      varian:     String(row[1] || '').trim(),
      masaAktif:  String(row[2] || '-').trim(),
      harga:      Number(row[3]) || 0,
      linkProduk: String(row[4] || '').trim(),
      stok:       stok,
      category:   cKat    >= 0 ? String(row[cKat]    || '').trim() : '',
      iconUrl:    cIcon   >= 0 ? String(row[cIcon]   || '').trim() : String(row[7] || '').trim(),
      benefits:   parsed.benefits,
      descHtml:   parsed.descHtml,
      gambar:     cGbr    >= 0 ? _parseImages(row[cGbr]) : [],
      terjual:    cTerjual >= 0 ? (Number(row[cTerjual]) || 0) : 0,
    });
  }

  const result = { success: true, data: products };
  try { cache.put(cacheKey, JSON.stringify(result), 300); } catch (_) {}
  return result;
}

// ────────────────────────────────────────────────────────
//  GET CATALOG ADMIN
// ────────────────────────────────────────────────────────
function getCatalogAdmin({ adminEmail, adminToken }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  const data     = sheet.getDataRange().getValues();
  const headers  = data[0].map(h => String(h).toLowerCase().trim());
  const cKat     = _colIndex(headers, 'kategori', 'category');
  const cIcon    = _colIndex(headers, 'icon url', 'iconurl', 'icon_url');
  const cBen     = _colIndex(headers, 'deskripsi', 'benefits', 'benefit');
  const cGbr     = _colIndex(headers, 'gambar', 'image url', 'imageurl', 'image_url', 'foto');
  const products = [];

  for (let i = 1; i < data.length; i++) {
    const row   = data[i];
    if (!row[0]) continue;
    const aktif   = row[5];
    const rawStok = row[6];
    const stok    = (rawStok === '' || rawStok === null || rawStok === undefined) ? null : Number(rawStok);
    const parsed  = _parseProductDesc(cBen >= 0 ? row[cBen] : row[14]);

    products.push({
      rowIndex:   i + 1,
      nama:       String(row[0]).trim(),
      varian:     String(row[1] || '').trim(),
      masaAktif:  String(row[2] || '-').trim(),
      harga:      Number(row[3]) || 0,
      linkProduk: String(row[4] || '').trim(),
      aktif:      (aktif === true || String(aktif).toUpperCase() === 'TRUE'),
      stok:       stok,
      category:   cKat  >= 0 ? String(row[cKat]  || '').trim() : '',
      iconUrl:    cIcon >= 0 ? String(row[cIcon] || '').trim() : String(row[7] || '').trim(),
      benefits:   parsed.benefits,
      descHtml:   parsed.descHtml,
      gambar:     cGbr  >= 0 ? _parseImages(row[cGbr]) : [],
    });
  }

  return { success: true, data: products };
}

// Parse kolom Deskripsi: bisa berupa JSON array (legacy benefits) atau HTML rich text.
// Return { benefits: [], descHtml: '' }
function _parseProductDesc(raw) {
  const t = String(raw == null ? '' : raw).trim();
  if (!t) return { benefits: [], descHtml: '' };
  if (t.charAt(0) === '[') {
    try {
      const arr = JSON.parse(t);
      if (Array.isArray(arr)) return { benefits: arr, descHtml: '' };
    } catch (_) {}
  }
  // Bukan JSON array → anggap HTML rich text deskripsi
  return { benefits: [], descHtml: t };
}

// Parse kolom Gambar: bisa JSON array URL atau single URL string. Return array.
function _parseImages(raw) {
  const t = String(raw == null ? '' : raw).trim();
  if (!t) return [];
  if (t.charAt(0) === '[') {
    try {
      const a = JSON.parse(t);
      if (Array.isArray(a)) return a.filter(function (x) { return x; });
    } catch (_) {}
  }
  return [t];
}

// ────────────────────────────────────────────────────────
//  ADD PRODUCT
// ────────────────────────────────────────────────────────
function addProduct({ adminEmail, adminToken, nama, varian, masaAktif, harga, linkProduk, aktif, stok, iconUrl, kategori, benefits, descHtml, gambar }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!nama || !varian) return { success: false, error: 'Nama dan varian wajib diisi' };
  // [SEC-06] Validasi harga: harus angka positif
  const hargaNum = Number(harga);
  if (!hargaNum || hargaNum <= 0) return { success: false, error: 'Harga harus lebih dari Rp 0' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_CATALOG);

  if (!sheet) {
    sheet = ss.insertSheet(TAB_CATALOG);
    sheet.appendRow(['Nama Produk', 'Varian', 'Masa Aktif', 'Harga', 'Link Produk', 'Aktif', 'Stok', 'Kategori', 'Icon URL']);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const cKat    = _colIndex(headers, 'kategori', 'category');
  const cIcon   = _colIndex(headers, 'icon url', 'iconurl', 'icon_url');
  const cBen    = _colIndex(headers, 'deskripsi', 'benefits', 'benefit');
  const cGbr    = _colIndex(headers, 'gambar', 'image url', 'imageurl', 'image_url', 'foto');
  // Deskripsi: prioritas descHtml (rich text), fallback benefits (legacy JSON)
  const descVal = (descHtml !== undefined && descHtml !== null && String(descHtml).trim() !== '')
    ? String(descHtml).trim()
    : ((benefits !== undefined && benefits !== null && benefits !== '') ? String(benefits).trim() : '');
  const numCols = Math.max(headers.length, cBen >= 0 ? cBen + 1 : 15, cGbr >= 0 ? cGbr + 1 : 0);

  const row   = new Array(numCols).fill('');
  row[0] = _sanitizeCell(nama);
  row[1] = _sanitizeCell(varian);
  row[2] = _sanitizeCell(masaAktif || '-');
  row[3] = Number(harga) || 0;
  row[4] = _sanitizeCell(linkProduk || '');
  row[5] = (aktif === 'true' || aktif === true);
  row[6] = (stok === '' || stok === null || stok === undefined) ? '' : Number(stok);
  if (cKat  >= 0) row[cKat]  = _sanitizeCell(kategori || '');
  if (cIcon >= 0) row[cIcon] = String(iconUrl  || '').trim();
  if (cGbr  >= 0) row[cGbr]  = String(gambar   || '').trim();
  if (descVal && cBen >= 0) row[cBen] = descVal;

  sheet.appendRow(row);

  if (descVal && cBen < 0) {
    sheet.getRange(sheet.getLastRow(), 15).setValue(descVal);
  }

  CacheService.getScriptCache().remove('getCatalog_v1');
  _logAdminAction(adminEmail, 'addProduct', { nama, varian, masaAktif, harga, kategori });
  return { success: true };
}

// ────────────────────────────────────────────────────────
//  UPDATE PRODUCT
// ────────────────────────────────────────────────────────
function updateProduct({ adminEmail, adminToken, rowIndex, nama, varian, masaAktif, harga, linkProduk, aktif, stok, iconUrl, kategori, benefits, descHtml, gambar }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!rowIndex) return { success: false, error: 'rowIndex diperlukan' };
  // [SEC-06] Validasi harga: harus angka positif jika disertakan
  if (harga !== undefined && harga !== null && harga !== '') {
    const hargaNum = Number(harga);
    if (!hargaNum || hargaNum <= 0) return { success: false, error: 'Harga harus lebih dari Rp 0' };
  }

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  const row     = Number(rowIndex);
  const isAktif = (aktif === 'true' || aktif === true);
  const stokVal = (stok === '' || stok === null || stok === undefined) ? '' : Number(stok);
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 15)).getValues()[0];
  const cKat    = _colIndex(headers, 'kategori', 'category');
  const cIcon   = _colIndex(headers, 'icon url', 'iconurl', 'icon_url');
  const cBen    = _colIndex(headers, 'deskripsi', 'benefits', 'benefit');
  const cGbr    = _colIndex(headers, 'gambar', 'image url', 'imageurl', 'image_url', 'foto');

  sheet.getRange(row, 1).setValue(_sanitizeCell(nama || ''));
  sheet.getRange(row, 2).setValue(_sanitizeCell(varian || ''));
  sheet.getRange(row, 3).setValue(_sanitizeCell(masaAktif || '-'));
  sheet.getRange(row, 4).setValue(Number(harga) || 0);
  sheet.getRange(row, 5).setValue(_sanitizeCell(linkProduk || ''));
  sheet.getRange(row, 6).setValue(isAktif);
  sheet.getRange(row, 7).setValue(stokVal);
  if (cKat  >= 0 && kategori !== undefined) sheet.getRange(row, cKat  + 1).setValue(_sanitizeCell(kategori || ''));
  if (cIcon >= 0)                           sheet.getRange(row, cIcon + 1).setValue(_sanitizeCell(iconUrl  || ''));
  if (cGbr  >= 0 && gambar !== undefined)   sheet.getRange(row, cGbr  + 1).setValue(String(gambar || '').trim());
  // Deskripsi: prioritas descHtml (rich text), fallback benefits (legacy)
  if (descHtml !== undefined && descHtml !== null) {
    sheet.getRange(row, cBen >= 0 ? cBen + 1 : 15).setValue(String(descHtml).trim());
  } else if (benefits !== undefined && benefits !== null && benefits !== '') {
    sheet.getRange(row, cBen >= 0 ? cBen + 1 : 15).setValue(String(benefits).trim());
  }

  CacheService.getScriptCache().remove('getCatalog_v1');
  _logAdminAction(adminEmail, 'updateProduct', { rowIndex, nama, varian, masaAktif, harga, aktif, kategori });
  return { success: true };
}

// ────────────────────────────────────────────────────────
//  UPDATE PRODUCT STOCK
// ────────────────────────────────────────────────────────
function updateProductStock({ adminEmail, adminToken, rowIndex, stok }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!rowIndex) return { success: false, error: 'rowIndex diperlukan' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  sheet.getRange(Number(rowIndex), 7).setValue(
    (stok === '' || stok === null || stok === undefined) ? '' : Number(stok)
  );
  CacheService.getScriptCache().remove('getCatalog_v1');
  return { success: true };
}

// ────────────────────────────────────────────────────────
//  UPDATE PRODUCT AKTIF
// ────────────────────────────────────────────────────────
function updateProductAktif({ adminEmail, adminToken, rowIndex, aktif }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!rowIndex) return { success: false, error: 'rowIndex diperlukan' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  sheet.getRange(Number(rowIndex), 6).setValue(aktif === 'true' || aktif === true);
  CacheService.getScriptCache().remove('getCatalog_v1');
  return { success: true };
}

// ────────────────────────────────────────────────────────
//  SAVE PRODUCT BENEFITS
// ────────────────────────────────────────────────────────
function saveProductBenefits({ adminEmail, adminToken, rowIndex, benefits }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!rowIndex) return { success: false, error: 'rowIndex diperlukan' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  sheet.getRange(Number(rowIndex), 15).setValue(String(benefits || '[]').trim());
  CacheService.getScriptCache().remove('getCatalog_v1');
  return { success: true };
}

// ────────────────────────────────────────────────────────
//  UPLOAD PRODUCT IMAGE → Google Drive
// ────────────────────────────────────────────────────────
function uploadProductImage({ adminEmail, adminToken, dataUrl, filename }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!dataUrl) return { success: false, error: 'Data gambar kosong' };

  // dataUrl format: data:image/jpeg;base64,xxxx
  const m = String(dataUrl).match(/^data:([^;]+);base64,(.+)$/);
  if (!m) return { success: false, error: 'Format gambar tidak valid' };
  const mime = m[1];
  if (mime.indexOf('image/') !== 0) return { success: false, error: 'File harus berupa gambar' };

  const bytes = Utilities.base64Decode(m[2]);
  // Batas ~6MB setelah decode (payload GAS aman)
  if (bytes.length > 6 * 1024 * 1024) return { success: false, error: 'Ukuran gambar terlalu besar (maks 6MB)' };

  const ext  = (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const safe = String(filename || 'produk').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 40);
  const blob = Utilities.newBlob(bytes, mime, safe + '_' + Date.now() + '.' + ext);

  // Cari/buat folder khusus gambar produk
  const FOLDER_NAME = 'Serabut Produk Images';
  let folder;
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  folder = it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);

  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  const id  = file.getId();
  // URL yang reliable untuk <img> embed (lh3 langsung render tanpa delay thumbnail)
  const url = 'https://lh3.googleusercontent.com/d/' + id + '=w1200';

  _logAdminAction(adminEmail, 'uploadProductImage', { id: id, size: bytes.length });
  return { success: true, url: url, id: id };
}

// ────────────────────────────────────────────────────────
//  DELETE PRODUCT
// ────────────────────────────────────────────────────────
function deleteProduct({ adminEmail, adminToken, rowIndex }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!rowIndex) return { success: false, error: 'rowIndex diperlukan' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  sheet.deleteRow(Number(rowIndex));
  CacheService.getScriptCache().remove('getCatalog_v1');
  _logAdminAction(adminEmail, 'deleteProduct', { rowIndex });
  return { success: true };
}

// ────────────────────────────────────────────────────────
//  GET ALL ORDERS (admin)
// ────────────────────────────────────────────────────────
function getAllOrders({ adminEmail, adminToken }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: true, data: [] };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const _col    = function(names) {
    for (var i = 0; i < names.length; i++) {
      var idx = headers.indexOf(names[i]);
      if (idx >= 0) return idx;
    }
    return -1;
  };
  const pmCol    = _col(['payment method','payment_method']);
  const psCol    = _col(['payment status','payment_status']);
  const msnCol   = _col(['nama ms','nama_ms','namams']);
  const usnCol   = _col(['username']);
  const msemCol  = _col(['email microsoft','email_microsoft','emailmicrosoft','microsoft email']);
  const eaCol    = _col(['email aktif','email_aktif','emailaktif']);
  const erCol    = _col(['email reminder','email_reminder','emailreminder']);
  const dateCol  = _col(['tanggal','date']);

  const _s = function(row, col) { return col >= 0 && row[col] ? String(row[col]).trim() : ''; };
  const _fmtDate = function(val) {
    if (!val) return '';
    if (val instanceof Date) return Utilities.formatDate(val, 'Asia/Jakarta', 'yyyy-MM-dd HH:mm');
    return String(val).trim();
  };

  const orders  = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    orders.push({
      rowIndex:       i + 1,
      orderId:        String(row[0]),
      tanggal:        dateCol >= 0 ? _fmtDate(row[dateCol]) : _fmtDate(row[1]),
      nama:           String(row[2] || ''),
      email:          String(row[3] || ''),
      wa:             String(row[4] || ''),
      produk:         String(row[5] || ''),
      varian:         String(row[6] || ''),
      masaAktif:      String(row[7] || ''),
      harga:          Number(row[8]) || 0,
      status:         String(row[9] || 'Pending'),
      paymentMethod:  _s(row, pmCol),
      paymentStatus:  _s(row, psCol),
      msNama:         _s(row, msnCol),
      username:       _s(row, usnCol),
      microsoftEmail: _s(row, msemCol),
      emailAktif:     _s(row, eaCol),
      emailReminder:  _s(row, erCol),
    });
  }
  orders.reverse();
  return { success: true, data: orders };
}

// ────────────────────────────────────────────────────────
//  UPDATE ORDER STATUS (admin)
// ────────────────────────────────────────────────────────
function updateOrderStatus({ adminEmail, adminToken, rowIndex, status, paymentMethod, skipNotify }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!rowIndex || (!status && !paymentMethod)) return { success: false, error: 'Data tidak lengkap' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: false, error: 'Tab Orders tidak ditemukan' };

  const ri = Number(rowIndex);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (status) sheet.getRange(ri, 10).setValue(status);
  if (paymentMethod) {
    const pmIdx = headers.findIndex(h => /payment.?method/i.test(String(h)));
    if (pmIdx >= 0) sheet.getRange(ri, pmIdx + 1).setValue(paymentMethod);
  }

  // Kirim notif ke buyer jika status jadi Aktif atau Selesai (skip jika hanya update paymentMethod)
  if (!skipNotify && (status === 'Aktif' || status === 'Selesai')) {
    try {
      const row = sheet.getRange(ri, 1, 1, 15).getValues()[0];
      const buyerNama   = String(row[2] || '');
      const buyerEmail  = String(row[3] || '');
      const buyerWa     = String(row[4] || '');
      const orderId     = String(row[0] || '');
      const produk      = String(row[5] || '');
      const varian      = String(row[6] || '');
      const masaAktif   = String(row[7] || '');
      const harga       = Number(row[8]) || 0;
      const emailAktif  = String(row[13] || '');
      sendBuyerStatusNotif(buyerWa, buyerEmail, buyerNama, orderId, produk, varian, masaAktif, harga, emailAktif, status);
    } catch(e) { Logger.log('Notif buyer error: ' + e.message); }
  }
  _logAdminAction(adminEmail, 'updateOrderStatus', { rowIndex, status, paymentMethod });
  return { success: true };
}

// ────────────────────────────────────────────────────────
//  SET USER ROLE (admin)
// ────────────────────────────────────────────────────────
function setUserRole({ adminEmail, adminToken, targetEmail, role }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!targetEmail || !role) return { success: false, error: 'Data tidak lengkap' };

  const validRoles = ['buyer', 'admin'];
  if (!validRoles.includes(role)) return { success: false, error: 'Role tidak valid' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== targetEmail.toLowerCase().trim()) continue;
    sheet.getRange(i + 1, 10).setValue(role); // col J = index 9 = Role
    _logAdminAction(adminEmail, 'setUserRole', { targetEmail, role });
    return { success: true };
  }
  return { success: false, error: 'Email tidak ditemukan' };
}

// ────────────────────────────────────────────────────────
//  ADMIN USER MANAGEMENT
// ────────────────────────────────────────────────────────
function getAdminUsers({ adminEmail, adminToken }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, data: [] };

  const data = sheet.getDataRange().getValues();
  const users = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0] && !row[1]) continue; // skip empty rows
    users.push({
      nama:    String(row[0] || ''),
      email:   String(row[1] || ''),
      wa:      String(row[2] || ''),
      created: String(row[4] || ''),
      status:  String(row[5] || ''),
      role:    String(row[9] || 'buyer'),
    });
  }
  return { success: true, data: users };
}

function updateUserAdmin({ adminEmail, adminToken, email, nama, wa, role }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!email) return { success: false, error: 'Email wajib diisi' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_USERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== email.toLowerCase().trim()) continue;
    if (nama !== undefined) sheet.getRange(i + 1, 1).setValue(nama);
    if (wa   !== undefined) sheet.getRange(i + 1, 3).setValue(wa);
    if (role !== undefined) sheet.getRange(i + 1, 10).setValue(role);
    SpreadsheetApp.flush();
    _logAdminAction(adminEmail, 'updateUserAdmin', { email, nama, wa, role });
    return { success: true };
  }
  return { success: false, error: 'User tidak ditemukan' };
}

function deleteUserAdmin({ adminEmail, adminToken, email }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!email) return { success: false, error: 'Email wajib diisi' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_USERS);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== email.toLowerCase().trim()) continue;
    sheet.deleteRow(i + 1);
    _logAdminAction(adminEmail, 'deleteUserAdmin', { email });
    return { success: true };
  }
  return { success: false, error: 'User tidak ditemukan' };
}

// ────────────────────────────────────────────────────────
//  GET SETTINGS (public via GET, also accessible via POST for admin)
// ────────────────────────────────────────────────────────
function getSettings() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_SETTINGS);

  if (!sheet) {
    sheet = ss.insertSheet(TAB_SETTINGS);
    sheet.appendRow(['Key', 'Value']);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    _populateDefaultSettings(sheet);
  }

  const data     = sheet.getDataRange().getValues();
  const settings = {};
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0] || '').trim();
    const val = String(data[i][1] || '').trim();
    if (key) settings[key] = val;
  }
  return { success: true, data: settings };
}

// ────────────────────────────────────────────────────────
//  SAVE SETTINGS (admin)
// ────────────────────────────────────────────────────────
function saveSettings({ adminEmail, adminToken, key, value }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!key) return { success: false, error: 'Key diperlukan' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_SETTINGS);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_SETTINGS);
    sheet.appendRow(['Key', 'Value']);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    _populateDefaultSettings(sheet);
  }

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]).trim() === key) {
      sheet.getRange(i + 1, 2).setValue(value || '');
      return { success: true };
    }
  }
  sheet.appendRow([key, value || '']);
  return { success: true };
}

// ────────────────────────────────────────────────────────
//  GET GUIDES (public)
// ────────────────────────────────────────────────────────
function getGuides() {
  const result = getSettings();
  if (!result.success) return result;
  const s = result.data;
  return {
    success: true,
    data: {
      office365: _parseJSON(s['guides.office365'], []),
      windows:   _parseJSON(s['guides.windows'], []),
      adobe:     _parseJSON(s['guides.adobe'], []),
    }
  };
}

// ────────────────────────────────────────────────────────
//  SAVE GUIDES (admin)
// ────────────────────────────────────────────────────────
function saveGuides({ adminEmail, adminToken, tab, guidesJson }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  const validTabs = ['office365', 'windows', 'adobe'];
  if (!validTabs.includes(tab)) return { success: false, error: 'Tab tidak valid' };
  return saveSettings({ adminEmail, adminToken, key: `guides.${tab}`, value: guidesJson });
}

// ────────────────────────────────────────────────────────
//  SMART SEARCH
// ────────────────────────────────────────────────────────
function smartSearch(query) {
  if (!query || !String(query).trim()) return { success: false, error: 'Query kosong' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const q  = String(query).toLowerCase().trim();
  const results = [];

  // ── Office 365 & Family sheets ────────────────────────
  const OFFICE_SHEETS = [
    { name: 'List Account 365',        isFamily: false, defaultFromCol: 6 },
    { name: 'List Account 365 Family', isFamily: true,  defaultFromCol: 9 },
  ];

  for (const cfg of OFFICE_SHEETS) {
    const sheet = ss.getSheetByName(cfg.name);
    if (!sheet) continue;
    const data = sheet.getDataRange().getValues();
    if (data.length < 2) continue;

    const headers = data[0].map(h => String(h).toLowerCase().trim());
    const col = {
      buyerName:    findColIdx(headers, ['buyer name', 'nama pembeli', 'nama buyer']),
      mailActive:   findColIdx(headers, ['mailactive', '4reminder', 'mail active']),
      emailActive:  findColIdx(headers, ['email active', 'email aktif']),
      msa:          findColIdx(headers, ['msa']),
      officeAcc:    findColIdx(headers, ['office account', 'office acc']),
      wa:           findColIdx(headers, ['no whatsapp', 'no wa', 'whatsapp', 'no hp']),
      endDate:      findColIdx(headers, ['end subs', 'end date', 'masa berlaku', 'expired date', 'end sub']),
      startDate:    findColIdx(headers, ['creation date', 'start date', 'invitation date']),
      status:       findColIdx(headers, ['status']),
      duration:     findColIdx(headers, ['duration']),
      subscription: findColIdx(headers, ['subscription']),
      from:         findColIdx(headers, ['from', 'source', 'platform', 'sumber pembelian']),
    };
    const fromCol = col.from !== -1 ? col.from : cfg.defaultFromCol;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const searchable = [
        getVal(row, col.buyerName), getVal(row, col.mailActive),
        getVal(row, col.emailActive), getVal(row, col.msa),
        getVal(row, col.officeAcc), getVal(row, col.wa),
      ].filter(v => v).map(v => v.toLowerCase());

      if (!searchable.some(v => v.includes(q))) continue;

      results.push({
        sumber:         cfg.name,
        productType:    cfg.isFamily ? 'office365family' : 'office365',
        nama:           getVal(row, col.buyerName),
        emailPembeli:   getVal(row, col.mailActive) || getVal(row, col.emailActive),
        officeAccount:  getVal(row, col.officeAcc) || getVal(row, col.msa),
        wa:             getVal(row, col.wa),
        masaBerlaku:    getDateVal(row, col.endDate),
        mulaiLangganan: getDateVal(row, col.startDate),
        status:         getVal(row, col.status) || 'Aktif',
        durasi:         getVal(row, col.duration),
        tipe:           getVal(row, col.subscription) || (cfg.isFamily ? 'Family' : 'Personal'),
        pembelianDari:  getVal(row, fromCol),
      });
    }
  }

  // ── Adobe CC sheet ────────────────────────────────────
  const adobeSheet = ss.getSheetByName('List Account Adobe CC');
  if (adobeSheet) {
    const data = adobeSheet.getDataRange().getValues();
    if (data.length >= 2) {
      const headers = data[0].map(h => String(h).toLowerCase().trim());
      const col = {
        duration:     findColIdx(headers, ['duration', 'duration (month)']),
        product:      findColIdx(headers, ['product', 'produk']),
        emailActive:  findColIdx(headers, ['email active', 'email aktif']),
        adobeAcc:     findColIdx(headers, ['adobe account', 'adobe acc', 'adobe email']),
        startDate:    findColIdx(headers, ['invitation date', 'start date', 'creation date']),
        endDate:      findColIdx(headers, ['end subs date', 'end subs', 'end date', 'masa berlaku']),
        from:         findColIdx(headers, ['from', 'source', 'platform']),
        buyerName:    findColIdx(headers, ['buyer name', 'nama pembeli', 'nama buyer']),
      };

      for (let i = 1; i < data.length; i++) {
        const row = data[i];
        const searchable = [
          getVal(row, col.buyerName), getVal(row, col.emailActive), getVal(row, col.adobeAcc),
        ].filter(v => v).map(v => v.toLowerCase());

        if (!searchable.some(v => v.includes(q))) continue;

        results.push({
          sumber:        'List Account Adobe CC',
          productType:   'adobe',
          nama:          getVal(row, col.buyerName),
          emailPembeli:  getVal(row, col.emailActive),
          adobeAccount:  getVal(row, col.adobeAcc),
          masaBerlaku:   getDateVal(row, col.endDate),
          mulaiLangganan:getDateVal(row, col.startDate),
          durasi:        getVal(row, col.duration),
          productName:   getVal(row, col.product) || 'Adobe Creative Cloud',
          pembelianDari: getVal(row, col.from),
          status:        'Aktif',
        });
      }
    }
  }

  return { success: true, data: results };
}

// ────────────────────────────────────────────────────────
//  RESET PASSWORD AKUN OFFICE 365
// ────────────────────────────────────────────────────────
function resetOfficePassword({ officeEmail, buyerEmail }) {
  if (!officeEmail) return { success: false, error: 'officeEmail wajib diisi' };

  // Rate limit: max 3 reset per officeEmail per jam
  if (!_rateLimit('resetOffice_' + officeEmail.toLowerCase(), 3, 3600)) {
    return { success: false, error: 'Terlalu banyak permintaan reset. Coba lagi dalam 1 jam.' };
  }

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('List Account 365');
  if (!sheet) return { success: false, error: 'Sheet tidak ditemukan' };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());

  const colOfficeAcc = findColIdx(headers, ['office account', 'office acc', 'msa']);
  const colPassword  = findColIdx(headers, ['password', 'pw', 'pass', 'kata sandi']);
  const colBuyer     = findColIdx(headers, ['buyer name', 'nama pembeli', 'mail active', '4reminder', 'email active']);
  const colWA        = findColIdx(headers, ['no whatsapp', 'no wa', 'whatsapp', 'no hp']);

  if (colOfficeAcc < 0) return { success: false, error: 'Kolom Office Account tidak ditemukan di sheet' };
  if (colPassword  < 0) return { success: false, error: 'Kolom Password tidak ditemukan di sheet. Tambahkan kolom "Password" di List Account 365.' };

  const emailNorm = officeEmail.trim().toLowerCase();
  let foundRow = -1;
  let buyerWA  = '';

  for (let i = 1; i < data.length; i++) {
    const acc = String(data[i][colOfficeAcc] || '').trim().toLowerCase();
    if (acc === emailNorm) {
      foundRow = i;
      if (colWA >= 0) buyerWA = String(data[i][colWA] || '').trim();
      break;
    }
  }

  if (foundRow < 0) return { success: false, error: 'Akun Office tidak ditemukan: ' + officeEmail };

  // Generate password baru: 10 karakter, kombinasi huruf + angka + simbol
  const chars    = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  let newPassword = '';
  for (let i = 0; i < 10; i++) {
    newPassword += chars[Math.floor(Math.random() * chars.length)];
  }

  // Update password di sheet
  sheet.getRange(foundRow + 1, colPassword + 1).setValue(newPassword);
  SpreadsheetApp.flush();

  // Kirim notif WA ke buyer jika ada nomor WA
  if (buyerWA) {
    const waMsg = `🔑 *Password Akun Office 365 Direset*\n\nAkun: ${officeEmail}\nPassword Baru: *${newPassword}*\n\nSilakan login ulang di office.com dengan password ini.\n— Serabut Store`;
    try {
      UrlFetchApp.fetch('https://api.fonnte.com/send', {
        method: 'post',
        headers: { 'Authorization': FONNTE_TOKEN },
        payload: { target: _normalizeWA(buyerWA), message: waMsg },
        muteHttpExceptions: true,
      });
    } catch(_) {}
  }

  // Kirim notif WA ke grup admin (WA_GROUP_ESCALATION)
  try {
    const adminMsg = `🔑 *Reset Password Office 365*\n\n• Akun: ${officeEmail}\n• Password Baru: ${newPassword}\n• Via: Web (Cek Status)\n— Sera`;
    sendWAToGroup(adminMsg);
  } catch(_) {}

  Logger.log('Reset password Office 365: ' + officeEmail);
  return { success: true, officeEmail, newPassword };
}

// ────────────────────────────────────────────────────────
//  CHECK STATUS AKUN (public, min query 4 char)
// ────────────────────────────────────────────────────────
function checkStatus(type, query) {
  if (!type || !query) return { success: false, error: 'Parameter tidak lengkap' };
  // [SEC] Minimum 4 karakter untuk cegah enumeration
  if (String(query).trim().length < 4) return { success: false, error: 'Masukkan minimal 4 karakter untuk pencarian' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const candidates = [TAB_ORDERS, 'Akun', 'Pelanggan', 'Accounts'];
  let sheet = null;
  for (const name of candidates) {
    sheet = ss.getSheetByName(name);
    if (sheet) break;
  }
  if (!sheet) return { success: false, error: 'Tab akun tidak ditemukan' };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());

  const searchMap = {
    email:      ['email'],
    nama:       ['nama'],
    wa:         ['no wa', 'wa', 'whatsapp', 'no hp'],
    emailAktif: ['email aktif', 'email akun'],
  };

  let colIdx = -1;
  for (const h of (searchMap[type] || [])) {
    colIdx = headers.findIndex(x => x === h || x.includes(h));
    if (colIdx !== -1) break;
  }
  if (colIdx === -1) return { success: false, error: 'Kolom tidak ditemukan' };

  const q       = String(query).toLowerCase().trim();
  const results = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const val = String(row[colIdx] || '').toLowerCase().trim();
    if (!val || val !== q) continue; // [SEC] exact match — cegah enumerasi partial

    const account = {};
    headers.forEach((h, idx) => {
      const v = row[idx];
      if (!v && v !== 0) return;
      if (h.includes('nama'))                                        account.nama        = String(v);
      else if (h === 'email')                                        account.email       = String(v);
      else if (h.includes('wa') || h.includes('hp'))                account.wa          = String(v);
      else if (h.includes('produk'))                                 account.produk      = String(v);
      else if (h.includes('email aktif') || h.includes('email akun')) account.emailAktif = String(v);
      else if (h.includes('berlaku') || h.includes('expired'))      account.masaBerlaku = String(v);
      else if (h === 'status')                                       account.status      = String(v);
      else if (h.includes('catatan'))                                account.catatan     = String(v);
    });
    if (!account.status) account.status = 'Aktif';
    results.push(account);
  }
  return { success: true, data: results };
}

// ────────────────────────────────────────────────────────
//  REGISTER
// ────────────────────────────────────────────────────────
function register({ nama, email, wa, password, privacyConsent }) {
  if (!nama || !email || !wa || !password) {
    return { success: false, error: 'Semua field harus diisi' };
  }
  // [SEC] Validasi format WA
  if (!/^[0-9]{9,15}$/.test(wa.replace(/[\s\-+]/g, ''))) {
    return { success: false, error: 'Format nomor WhatsApp tidak valid' };
  }
  // [SEC] Rate limit: max 5 register per email per jam
  const emailKey = String(email).toLowerCase().trim();
  if (!_rateLimit('reg_' + emailKey, 5, 3600)) {
    return { success: false, error: 'Terlalu banyak percobaan. Coba lagi dalam 1 jam.' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) sheet = ss.insertSheet(TAB_USERS);
  ensureUserSheetHeaders(sheet);

  const data = sheet.getDataRange().getValues();
  const emailNorm = email.toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== emailNorm) continue;
    const status = String(data[i][5] || '').trim();
    if (status === 'Pending') {
      return sendNewOTP(sheet, i + 1, emailNorm, String(data[i][0]));
    }
    return { success: false, error: 'Email sudah terdaftar' };
  }

  const otp        = generateOTP();
  const expiry     = getOTPExpiry();
  const createdAt  = formatJkt(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const privacyTs  = privacyConsent
    ? `I Accept – ${formatJkt(new Date(), 'dd MMM yyyy, HH:mm')} WIB`
    : '';

  // [SEC] Server-side salt — simpan SHA256(clientHash:salt) bukan clientHash langsung
  const salt         = _generateSalt();
  const saltedPw     = _applyServerSalt(password, salt);

  sheet.appendRow([
    nama.trim(),      // 0 Nama
    emailNorm,        // 1 Email
    wa.trim(),        // 2 No Hp
    saltedPw,         // 3 Password (server-salted: SHA256(clientHash:salt))
    createdAt,        // 4 Created At
    'Pending',        // 5 Status
    privacyTs,        // 6 Privacy Notice
    otp,              // 7 OTP
    expiry,           // 8 OTP Expiry
    'buyer',          // 9 Role
    '', '', '', '',   // 10-13 Profile fields
    '',               // 14 Session Token
    0,                // 15 OTP Attempts
    '',               // 16 Session Token Expiry
    salt,             // 17 Salt
  ]);

  sendOTPEmail(emailNorm, nama.trim(), otp);
  return { success: true, action: 'verify_otp', email: emailNorm };
}

// ────────────────────────────────────────────────────────
//  VERIFY OTP — [SEC] attempt counter + session token
// ────────────────────────────────────────────────────────
function verifyOTP({ email, otp }) {
  if (!email || !otp) return { success: false, error: 'Data tidak lengkap' };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const attCol  = _colIndex(headers, 'otp attempts');
  const tokCol  = _colIndex(headers, 'session token', 'sessiontoken');
  const emailNorm = email.toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== emailNorm) continue;

    const storedOTP = String(data[i][7] || '').trim();
    const expiryStr = String(data[i][8] || '').trim();
    const status    = String(data[i][5] || '').trim();
    const role      = _getUserRole(data, i);
    const attempts  = attCol >= 0 ? (Number(data[i][attCol]) || 0) : 0;

    if (status === 'Aktif') return { success: false, error: 'Akun sudah aktif, silakan login' };
    if (!storedOTP)         return { success: false, error: 'OTP tidak ditemukan, daftar ulang' };

    // [SEC] Lockout setelah OTP_MAX_ATTEMPTS gagal
    if (attempts >= OTP_MAX_ATTEMPTS) {
      return { success: false, error: 'Terlalu banyak percobaan. Minta OTP baru.' };
    }
    if (new Date() > new Date(expiryStr)) {
      return { success: false, error: 'OTP kadaluarsa. Klik "Kirim Ulang OTP".' };
    }
    if (String(otp).trim() !== storedOTP) {
      // Increment attempt counter
      if (attCol >= 0) sheet.getRange(i + 1, attCol + 1).setValue(attempts + 1);
      const remaining = OTP_MAX_ATTEMPTS - attempts - 1;
      return { success: false, error: remaining > 0
        ? `Kode OTP salah. Sisa ${remaining} percobaan.`
        : 'Terlalu banyak percobaan. Minta OTP baru.' };
    }

    // OTP benar — aktifkan akun, generate session token
    const sessionToken = _generateSessionToken();
    const tokenExpiry  = new Date(Date.now() + SESSION_EXPIRY_DAYS * 86400000).toISOString();
    const row = i + 1;
    sheet.getRange(row, 6).setValue('Aktif');
    sheet.getRange(row, 8).setValue('');  // clear OTP
    sheet.getRange(row, 9).setValue('');  // clear OTP Expiry
    if (attCol >= 0) sheet.getRange(row, attCol + 1).setValue(0); // reset attempts
    if (tokCol  >= 0) sheet.getRange(row, tokCol  + 1).setValue(sessionToken);
    // [SEC] Tulis expiry token — gunakan kolom dinamis, fallback kolom Q (17)
    const expHeaders  = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 17)).getValues()[0];
    const expColIdx   = _colIndex(expHeaders.map(h => String(h).toLowerCase().trim()), 'session token expiry', 'sessiontokenexpiry');
    sheet.getRange(row, expColIdx >= 0 ? expColIdx + 1 : 17).setValue(tokenExpiry);

    const userName = String(data[i][0]);
    const userWa   = String(data[i][2]);
    sendWelcomeEmail(emailNorm, userName);
    sendWAWelcome(userWa, userName);

    return {
      success: true,
      user: {
        nama:         String(data[i][0]),
        email:        String(data[i][1]),
        wa:           String(data[i][2]),
        role:         role || 'buyer',
        sessionToken: sessionToken,
        loginAt:      new Date().getTime(),
      },
    };
  }
  return { success: false, error: 'Email tidak ditemukan' };
}

// ────────────────────────────────────────────────────────
//  RESEND OTP — reset attempt counter
// ────────────────────────────────────────────────────────
function resendOTP({ email }) {
  if (!email) return { success: false, error: 'Email tidak boleh kosong' };
  const emailNorm = email.toLowerCase().trim();

  // [SEC-07] Rate limit resendOTP: max 3 kali per jam — cegah bypass brute force OTP via resend
  if (!_rateLimit('resendotp_' + emailNorm, 3, 3600)) {
    return { success: false, error: 'Terlalu banyak permintaan OTP. Tunggu 1 jam.' };
  }

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const attCol  = _colIndex(headers, 'otp attempts');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== emailNorm) continue;
    if (String(data[i][5]).trim() === 'Aktif') {
      return { success: false, error: 'Akun sudah aktif, silakan login' };
    }
    // Reset attempt counter
    if (attCol >= 0) sheet.getRange(i + 1, attCol + 1).setValue(0);
    return sendNewOTP(sheet, i + 1, emailNorm, String(data[i][0]));
  }
  return { success: false, error: 'Email tidak ditemukan' };
}

function sendNewOTP(sheet, sheetRow, email, nama) {
  const otp    = generateOTP();
  const expiry = getOTPExpiry();
  sheet.getRange(sheetRow, 8).setValue(otp);
  sheet.getRange(sheetRow, 9).setValue(expiry);
  sendOTPEmail(email, nama, otp);
  return { success: true, action: 'verify_otp', email };
}

// ────────────────────────────────────────────────────────
//  LOGIN — [SEC] session token + legacy password migration
// ────────────────────────────────────────────────────────
function login({ email, password, passwordLegacy }) {
  if (!email || !password) return { success: false, error: 'Email dan password harus diisi' };

  // [SEC] Rate limit: max 10 login per email per 15 menit (cegah brute-force)
  if (!_rateLimit('login_' + String(email).toLowerCase().trim(), 10, 900)) {
    return { success: false, error: 'Terlalu banyak percobaan login. Coba lagi dalam 15 menit.' };
  }

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'Belum ada user terdaftar' };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const tokCol  = _colIndex(headers, 'session token', 'sessiontoken');
  const expCol  = _colIndex(headers, 'session token expiry', 'sessiontokenexpiry');
  const saltCol = _colIndex(headers, 'salt');
  const emailNorm = email.toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[1]).toLowerCase().trim() !== emailNorm) continue;

    const status = String(row[5] || 'Aktif').trim();
    if (status === 'Pending') {
      return { success: false, error: 'Akun belum diverifikasi. Cek email kamu untuk kode OTP.' };
    }

    const storedPw   = String(row[3]);
    const storedSalt = saltCol >= 0 ? String(row[saltCol] || '').trim() : '';
    let matched      = false;

    if (storedSalt) {
      // [SEC] User sudah punya server-side salt — bandingkan SHA256(clientHash:salt)
      matched = (_applyServerSalt(password, storedSalt) === storedPw);
      if (!matched && passwordLegacy) {
        matched = (_applyServerSalt(passwordLegacy, storedSalt) === storedPw);
      }
    } else {
      // [SEC] User lama tanpa salt — coba direct compare, lalu upgrade ke salted
      if (storedPw === String(password)) {
        matched = true;
      } else if (passwordLegacy && storedPw === String(passwordLegacy)) {
        matched = true;
      }
      if (matched) {
        // Upgrade: generate salt + simpan salted hash
        const newSalt   = _generateSalt();
        const newSalted = _applyServerSalt(password, newSalt);
        sheet.getRange(i + 1, 4).setValue(newSalted);
        if (saltCol >= 0) sheet.getRange(i + 1, saltCol + 1).setValue(newSalt);
        else sheet.getRange(i + 1, 18).setValue(newSalt); // fallback col R
        Logger.log('Password upgraded to server-salted for: ' + emailNorm);
      }
    }

    if (!matched) return { success: false, error: 'Password salah' };

    // Generate session token — tulis token+expiry sekaligus dalam 1 operasi
    const sessionToken  = _generateSessionToken();
    const tokenExpiry   = new Date(Date.now() + SESSION_EXPIRY_DAYS * 86400000).toISOString();
    const tokColFinal   = tokCol >= 0 ? tokCol + 1 : 15; // col O default
    const expColFinal   = expCol >= 0 ? expCol + 1 : 17; // col Q default
    // Tulis token & expiry dalam satu batch jika kolom bersebelahan, singl otherwise
    if (expColFinal === tokColFinal + 1) {
      sheet.getRange(i + 1, tokColFinal, 1, 2).setValues([[sessionToken, tokenExpiry]]);
    } else {
      sheet.getRange(i + 1, tokColFinal).setValue(sessionToken);
      sheet.getRange(i + 1, expColFinal).setValue(tokenExpiry);
    }

    const role = _getUserRole(data, i);
    return {
      success: true,
      user: {
        nama:         row[0],
        email:        row[1],
        wa:           row[2],
        role:         role,
        sessionToken: sessionToken,
        loginAt:      new Date().getTime(),
      }
    };
  }
  return { success: false, error: 'Email tidak terdaftar' };
}

// ────────────────────────────────────────────────────────
//  GOOGLE LOGIN — [SEC] verifikasi JWT + session token
// ────────────────────────────────────────────────────────
// [SEC] Terima 'credential' (nama field dari frontend) ATAU 'idToken' (nama lama)
function googleLogin({ idToken, credential }) {
  const token = credential || idToken;
  if (!token) return { success: false, error: 'Token Google diperlukan. Silakan coba lagi.' };

  // [SEC] Wajib verifikasi JWT via Google — tidak ada fallback email tanpa token
  const payload = _verifyGoogleToken(token);
  if (!payload) return { success: false, error: 'Token Google tidak valid. Silakan coba lagi.' };

  const email = payload.email;
  const nama  = payload.name || '';
  if (!email) return { success: false, error: 'Email tidak ditemukan dari token Google.' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_USERS);
  }
  ensureUserSheetHeaders(sheet);

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const tokCol  = _colIndex(headers, 'session token', 'sessiontoken');
  const emailNorm = email.toLowerCase().trim();

  const expiryCol = _colIndex(headers, 'session token expiry', 'sessiontokenexpiry');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== emailNorm) continue;
    if (String(data[i][5]).trim() === 'Pending') {
      sheet.getRange(i + 1, 6).setValue('Aktif');
    }
    const sessionToken = _generateSessionToken();
    const tokenExpiry  = new Date(Date.now() + SESSION_EXPIRY_DAYS * 86400000).toISOString();
    if (tokCol    >= 0) sheet.getRange(i + 1, tokCol    + 1).setValue(sessionToken);
    // [SEC] Tulis expiry token
    sheet.getRange(i + 1, expiryCol >= 0 ? expiryCol + 1 : 17).setValue(tokenExpiry);

    const role = _getUserRole(data, i);
    return {
      success: true,
      user: {
        nama:         String(data[i][0]),
        email:        String(data[i][1]),
        wa:           String(data[i][2]),
        role:         role || 'buyer',
        sessionToken: sessionToken,
        loginAt:      new Date().getTime(),
      }
    };
  }

  // User baru — auto register via Google SSO
  const displayNama  = (nama || emailNorm.split('@')[0]).trim();
  const createdAt    = formatJkt(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const sessionToken = _generateSessionToken();
  const tokenExpiry  = new Date(Date.now() + SESSION_EXPIRY_DAYS * 86400000).toISOString();

  sheet.appendRow([
    displayNama, emailNorm, '', '', createdAt, 'Aktif', 'Google SSO', '', '', 'buyer',
    '', '', '', '', sessionToken, 0, tokenExpiry,
  ]);

  return {
    success: true,
    user: {
      nama:         displayNama,
      email:        emailNorm,
      wa:           '',
      role:         'buyer',
      sessionToken: sessionToken,
      loginAt:      new Date().getTime(),
    }
  };
}

// ────────────────────────────────────────────────────────
//  CREATE ORDER — [SEC] validasi harga server-side
// ────────────────────────────────────────────────────────
function createOrder({ email, sessionToken, userNama, userEmail, userWa, produk, varian, masaAktif, harga, msNama, username, microsoftEmail, emailAktif, emailReminder, imageUrl, env }) {
  // Auth check — guest order masih diperbolehkan (tanpa session)
  const effectiveEmail = userEmail || email || '';
  if (!effectiveEmail || !produk) return { success: false, error: 'Data tidak lengkap' };

  // [SEC] Harga WAJIB dari catalog server — tidak pernah percaya harga mentah dari client
  const catalogPrice = _getCatalogPrice(produk, varian, masaAktif);
  if (catalogPrice === null) {
    Logger.log('createOrder REJECTED: produk tidak ditemukan di catalog: ' + produk + '|' + varian + '|' + masaAktif);
    return { success: false, error: 'Produk tidak tersedia. Silakan refresh halaman dan coba lagi.' };
  }

  // Cek apakah buyer adalah member valid (ada sessionToken) → boleh dapat harga campaign
  let hargaNum = catalogPrice;
  if (sessionToken) {
    const campaignPrice = _getActiveCampaignPrice(produk, varian, masaAktif);
    // Pakai harga campaign hanya jika lebih murah dari harga catalog (sanity check)
    if (campaignPrice !== null && campaignPrice < catalogPrice && campaignPrice > 0) {
      hargaNum = campaignPrice;
      Logger.log('createOrder: member price applied — catalog=' + catalogPrice + ' campaign=' + campaignPrice);
    }
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_ORDERS);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_ORDERS);
    sheet.appendRow(['Order ID', 'Tanggal', 'Nama', 'Email', 'No WA', 'Produk', 'Varian', 'Masa Aktif', 'Harga', 'Status', 'Nama MS', 'Username', 'Email Microsoft', 'Email Aktif', 'Email Reminder']);
    sheet.getRange(1, 1, 1, 15).setFontWeight('bold');
  } else {
    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).toLowerCase());
    if (!existingHeaders.includes('username')) {
      const lc = sheet.getLastColumn();
      sheet.getRange(1, lc + 1, 1, 5).setValues([['Nama MS', 'Username', 'Email Microsoft', 'Email Aktif', 'Email Reminder']]);
      sheet.getRange(1, lc + 1, 1, 5).setFontWeight('bold');
    }
  }

  const orderId  = 'SRB-' + new Date().getTime().toString().slice(-8);
  const tanggal  = formatJkt(new Date(), 'yyyy-MM-dd HH:mm');

  sheet.appendRow([
    orderId, tanggal, userNama, userEmail, userWa,
    produk, varian || '-', masaAktif || '-', hargaNum, 'Pending',
    msNama || '-', username || '-', microsoftEmail || '-', emailAktif || '-', emailReminder || '-'
  ]);

  const varLower    = (varian || '').toLowerCase();
  const isFamily    = varLower.includes('family');
  const isWeb       = varLower.includes('web');
  const reminderLine = emailReminder ? `\nEmail Reminder: ${emailReminder}` : '';

  let groupMsg;
  if (isFamily) {
    groupMsg = `*ORDER 365 FAMILY: ${produk}*\nOrder ID: *${orderId}*\nEmail Microsoft (invite): *${microsoftEmail || '-'}*\nEmail Aktif: ${emailAktif || '-'}${reminderLine}\nDurasi: ${masaAktif || '-'}\nNama Pembeli: ${userNama}\nNo WA: ${userWa || '-'}\nTotal: Rp ${hargaNum.toLocaleString('id-ID')}\nStatus: *UNPAID*`;
  } else if (isWeb) {
    groupMsg = `*ORDER WEB: ${produk}*\nOrder ID: *${orderId}*\nNama MS: ${msNama || '-'}\nUsername Request: *${username || '-'}*\nEmail Aktif: ${emailAktif || '-'}${reminderLine}\nDurasi: ${masaAktif || '-'}\nNo WA: ${userWa || '-'}\nTotal: Rp ${hargaNum.toLocaleString('id-ID')}\nStatus: *UNPAID*`;
  } else {
    groupMsg = `*ORDER BARU: ${produk}*\nOrder ID: *${orderId}*\nVarian: ${varian || '-'}\nDurasi: ${masaAktif || '-'}\nNama: ${userNama}\nEmail Aktif: ${emailAktif || '-'}${reminderLine}\nNo WA: ${userWa || '-'}\nTotal: Rp ${hargaNum.toLocaleString('id-ID')}\nStatus: *UNPAID*`;
  }

  // Kirim notif WAG segera saat order dibuat
  sendWAToGroup(groupMsg);

  // WA + email ke buyer dikirim setelah pembayaran berhasil (xenditCallback / syncOrders)

  const isUat      = String(env || '').toLowerCase() === 'uat';
  const paymentMode = isUat ? 'xendit' : (PropertiesService.getScriptProperties().getProperty('PAYMENT_MODE') || 'xendit').toLowerCase();
  let paymentUrl = null;
  let paymentError = null;

  if (paymentMode === 'xendit') {
    try {
      const xnRes = createXenditInvoice({
        orderId,
        items:     [{ produk, varian: varian||'-', masaAktif: masaAktif||'-', harga: hargaNum, qty: 1 }],
        buyerName:  userNama,
        buyerEmail: userEmail,
        buyerPhone: userWa,
        total: hargaNum
      });
      if (xnRes.success) paymentUrl = xnRes.paymentUrl;
      else {
        paymentError = xnRes.error || 'Gagal membuat sesi pembayaran';
        Logger.log('createOrder Xendit error: ' + paymentError);
      }
    } catch(e) {
      paymentError = 'Xendit exception: ' + e.message;
      Logger.log('createOrder Xendit exception: ' + e.message);
    }
  }
  // mode manual: paymentUrl tetap null → frontend tampilkan WA payment info

  return { success: true, orderId, harga: hargaNum, paymentUrl, paymentError, paymentMode };
}

// ────────────────────────────────────────────────────────
//  GET ORDERS — filter by email, group by orderId
//  Return: [{ orderId, tanggal, buyerNama, buyerWa, status, paymentMethod, paymentStatus, total, items:[...] }]
// ────────────────────────────────────────────────────────
// Public endpoint — ambil detail order by orderId (no auth required, orderId is unguessable)
function getOrderDetail({ orderId }) {
  if (!orderId) return { success: false, error: 'orderId diperlukan' };
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: false, error: 'Sheet tidak ditemukan' };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const idCol   = headers.indexOf('order id');
  const prodCol = headers.indexOf('produk');
  const varCol  = headers.indexOf('varian');
  const masCol  = headers.indexOf('masa aktif');
  const hrgCol  = headers.indexOf('harga');
  const stCol   = headers.indexOf('status');
  const dateCol = headers.indexOf('tanggal') >= 0 ? headers.indexOf('tanggal') : 1;
  const namaCol = headers.indexOf('nama');
  const pmCol   = headers.indexOf('payment method');
  const psCol   = headers.indexOf('payment status');
  const eaCol   = headers.indexOf('email aktif');
  const msnCol  = headers.indexOf('nama ms');

  if (idCol < 0 || prodCol < 0) return { success: false, error: 'Kolom tidak ditemukan' };

  const _str = (row, col) => col >= 0 ? String(row[col] || '').trim() : '';
  const items = [];
  let orderMeta = null;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[idCol] || '').trim() !== orderId.trim()) continue;
    if (!orderMeta) {
      orderMeta = {
        orderId,
        tanggal:       _str(row, dateCol),
        nama:          _str(row, namaCol),
        status:        _str(row, stCol),
        paymentMethod: _str(row, pmCol),
        paymentStatus: _str(row, psCol),
      };
    }
    // Update status from latest row (in case updated)
    orderMeta.status        = _str(row, stCol) || orderMeta.status;
    orderMeta.paymentMethod = _str(row, pmCol) || orderMeta.paymentMethod;
    orderMeta.paymentStatus = _str(row, psCol) || orderMeta.paymentStatus;

    const produk = _str(row, prodCol);
    if (produk) items.push({
      produk,
      varian:    _str(row, varCol)  || '-',
      masaAktif: _str(row, masCol)  || '-',
      harga:     hrgCol >= 0 ? Number(row[hrgCol]) || 0 : 0,
      emailAktif: _str(row, eaCol)  || '',
      msNama:    _str(row, msnCol)  || '',
    });
  }

  if (!orderMeta) return { success: false, error: 'Order tidak ditemukan' };
  const total = items.reduce((s, it) => s + it.harga, 0);
  return { success: true, order: { ...orderMeta, items, total } };
}

function getOrders({ email }) {
  if (!email) return { success: false, error: 'Email diperlukan' };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: true, data: [] };

  const data      = sheet.getDataRange().getValues();
  const headers   = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
  const emailNorm = email.toLowerCase().trim();
  const orderMap  = new Map();
  const orderKeys = [];

  const idCol    = headers.indexOf('order id');
  const dateCol  = headers.indexOf('tanggal') >= 0 ? headers.indexOf('tanggal') : (headers.indexOf('date') >= 0 ? headers.indexOf('date') : 1);
  const namaCol  = headers.indexOf('nama');
  const waCol    = headers.indexOf('no wa');
  const emailCol = headers.indexOf('email');
  const prodCol  = headers.indexOf('produk');
  const varCol   = headers.indexOf('varian');
  const masCol   = headers.indexOf('masa aktif');
  const hrgCol   = headers.indexOf('harga');
  const stCol    = headers.indexOf('status');
  const pmCol    = headers.indexOf('payment method');
  const psCol    = headers.indexOf('payment status');
  const msnCol   = headers.indexOf('nama ms');
  const usnCol   = headers.indexOf('username');
  const msemCol  = headers.indexOf('email microsoft');
  const eaCol    = headers.indexOf('email aktif');
  const erCol    = headers.indexOf('email reminder');

  if (idCol === -1 || prodCol === -1) return { success: true, data: [] };

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[idCol] || String(row[emailCol] || '').toLowerCase().trim() !== emailNorm) continue;

    const orderId = String(row[idCol]).trim();
    const produk  = String(row[prodCol] || '').trim();
    if (!orderId || !produk) continue;

    const _str = function(col) { return col >= 0 ? String(row[col] || '').trim() : ''; };

    const item = {
      produk,
      varian:         _str(varCol)  || '-',
      masaAktif:      _str(masCol)  || '-',
      harga:          hrgCol >= 0 ? Number(row[hrgCol]) || 0 : 0,
      msNama:         _str(msnCol)  || '-',
      username:       _str(usnCol)  || '-',
      microsoftEmail: _str(msemCol) || '-',
      emailAktif:     _str(eaCol)   || '-',
      emailReminder:  _str(erCol)   || '-',
    };

    if (orderMap.has(orderId)) {
      const o = orderMap.get(orderId);
      o.items.push(item);
      o.total += item.harga;
    } else {
      orderMap.set(orderId, {
        orderId,
        tanggal:       (dateCol >= 0 && row[dateCol] instanceof Date)
                         ? Utilities.formatDate(_fixDateSwap(row[dateCol]), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm')
                         : _str(dateCol),
        buyerNama:     _str(namaCol),
        buyerWa:       _str(waCol),
        status:        stCol >= 0 ? String(row[stCol] || 'Pending').trim() : 'Pending',
        paymentMethod: pmCol >= 0 && row[pmCol] ? String(row[pmCol]).trim() : '',
        paymentStatus: psCol >= 0 && row[psCol] ? String(row[psCol]).trim() : '',
        total:         item.harga,
        items:         [item],
      });
      orderKeys.push(orderId);
    }
  }

  // Hitung sisa waktu untuk Pending orders — TIDAK auto-cancel di sini
  // (cancel hanya via user action atau admin, agar order yg sudah dibayar tidak ikut di-cancel)
  const H24 = 24 * 3600 * 1000;
  const nowMs = Date.now();
  const processedMs = new Set();
  for (let i = 1; i < data.length; i++) {
    const oid = String(data[i]?.[idCol] || '').trim();
    if (!oid || !orderMap.has(oid) || processedMs.has(oid)) continue;
    const order = orderMap.get(oid);
    if (order.status !== 'Pending') continue;
    processedMs.add(oid);
    const created = _parseTanggalGAS(order.tanggal);
    if (created) order.msecLeft = Math.max(0, H24 - (nowMs - created.getTime()));
  }

  const orders = orderKeys.map(k => orderMap.get(k)).reverse();
  return { success: true, data: orders };
}

// ────────────────────────────────────────────────────────
//  GET PROFILE — [SEC] require session auth
// ────────────────────────────────────────────────────────
function getProfile({ email, sessionToken }) {
  const authErr = _requireAuth(email, sessionToken);
  if (authErr) return { success: false, error: authErr };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data = sheet.getDataRange().getValues();
  const cols = _profileCols(data[0]);
  const emailNorm = email.toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== emailNorm) continue;
    return {
      success: true,
      profile: {
        nama:         String(data[i][0] || ''),
        email:        String(data[i][1] || ''),
        wa:           String(data[i][2] || ''),
        role:         _getUserRole(data, i),
        tanggalLahir: cols.tgl  >= 0 ? _formatDateCell(data[i][cols.tgl]) : '',
        jenisKelamin: cols.jk   >= 0 ? String(data[i][cols.jk]   || '') : '',
        alamat:       cols.kota >= 0 ? String(data[i][cols.kota]  || '') : '',
        provinsi:     cols.prov >= 0 ? String(data[i][cols.prov]  || '') : '',
      }
    };
  }
  return { success: false, error: 'User tidak ditemukan' };
}

// ────────────────────────────────────────────────────────
//  UPDATE PROFILE — [SEC] require session auth
// ────────────────────────────────────────────────────────
function updateProfile({ email, sessionToken, nama, tanggalLahir, jenisKelamin, alamat, provinsi, wa }) {
  const authErr = _requireAuth(email, sessionToken);
  if (authErr) return { success: false, error: authErr };
  if (!nama) return { success: false, error: 'Nama tidak boleh kosong' };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  ensureUserSheetHeaders(sheet);
  const data = sheet.getDataRange().getValues();
  const cols = _profileCols(data[0]);
  const emailNorm = email.toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== emailNorm) continue;
    const row  = i + 1;
    const role = _getUserRole(data, i);
    sheet.getRange(row, 1).setValue(nama.trim());
    if (wa !== undefined) sheet.getRange(row, 3).setValue(String(wa || '').trim());
    if (cols.tgl  >= 0) sheet.getRange(row, cols.tgl  + 1).setValue(tanggalLahir  || '');
    if (cols.jk   >= 0) sheet.getRange(row, cols.jk   + 1).setValue(jenisKelamin  || '');
    if (cols.kota >= 0) sheet.getRange(row, cols.kota + 1).setValue(alamat        || '');
    if (cols.prov >= 0) sheet.getRange(row, cols.prov + 1).setValue(provinsi      || '');
    return {
      success: true,
      user: { nama: nama.trim(), email: String(data[i][1]), wa: String(wa || data[i][2]), role }
    };
  }
  return { success: false, error: 'User tidak ditemukan' };
}

// ────────────────────────────────────────────────────────
//  CHANGE PASSWORD — [SEC] require session auth + legacy migration
// ────────────────────────────────────────────────────────
function changePassword({ email, sessionToken, oldPassword, oldPasswordLegacy, newPassword }) {
  const authErr = _requireAuth(email, sessionToken);
  if (authErr) return { success: false, error: authErr };
  if (!oldPassword || !newPassword) return { success: false, error: 'Data tidak lengkap' };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data = sheet.getDataRange().getValues();
  const emailNorm = email.toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== emailNorm) continue;
    const storedPw = String(data[i][3]);
    const matched  = storedPw === String(oldPassword) ||
                     (oldPasswordLegacy && storedPw === String(oldPasswordLegacy));
    if (!matched) return { success: false, error: 'Password lama salah' };
    sheet.getRange(i + 1, 4).setValue(newPassword);

    // [SEC-05] Invalidate session setelah ganti password — paksa login ulang
    const hdrs   = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).toLowerCase().trim());
    const tokCol = _colIndex(hdrs, 'session token', 'sessiontoken');
    const expCol = _colIndex(hdrs, 'session token expiry', 'sessiontokenexpiry');
    if (tokCol >= 0) sheet.getRange(i + 1, tokCol + 1).setValue('');
    if (expCol >= 0) sheet.getRange(i + 1, expCol + 1).setValue('');

    return { success: true, requireLogin: true };
  }
  return { success: false, error: 'User tidak ditemukan' };
}

// ────────────────────────────────────────────────────────
//  FORGOT PASSWORD — kirim OTP via email (dan WA jika tersedia)
// ────────────────────────────────────────────────────────
function forgotPasswordSendOTP({ email }) {
  if (!email) return { success: false, error: 'Email harus diisi' };
  const emailNorm = String(email).toLowerCase().trim();
  // [SEC] Rate limit: max 3 kirim OTP reset per email per jam
  if (!_rateLimit('fpwd_' + emailNorm, 3, 3600)) {
    return { success: false, error: 'Terlalu banyak permintaan. Tunggu 1 jam sebelum coba lagi.' };
  }

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== emailNorm) continue;
    const status = String(data[i][5] || '').trim();
    if (status === 'Pending') return { success: false, error: 'Akun belum diverifikasi. Selesaikan verifikasi OTP registrasi terlebih dahulu.' };

    const nama = String(data[i][0]);
    const wa   = String(data[i][2] || '').trim();
    const otp  = generateOTP();
    const exp  = getOTPExpiry();

    const attCol = _colIndex(sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0], 'otp attempts');
    sheet.getRange(i + 1, 8).setValue(otp);
    sheet.getRange(i + 1, 9).setValue(exp);
    if (attCol >= 0) sheet.getRange(i + 1, attCol + 1).setValue(0);

    sendOTPEmail(emailNorm, nama, otp);

    const maskedEmail = emailNorm.replace(/(.{2}).*(@.*)/, '$1***$2');
    let maskedWa = '';
    if (wa && FONNTE_TOKEN) {
      const waNum = _normalizeWA(wa);
      const msg   = `*Kode Reset Password Serabut Store*\n\nKode OTP kamu: *${otp}*\n\nBerlaku ${OTP_EXPIRY_MIN} menit. Jangan bagikan ke siapapun.`;
      try {
        UrlFetchApp.fetch('https://api.fonnte.com/send', {
          method: 'post',
          headers: { 'Authorization': FONNTE_TOKEN },
          payload: { target: waNum, message: msg },
          muteHttpExceptions: true,
        });
      } catch(e) { Logger.log('WA OTP error: ' + e.message); }
      maskedWa = wa.replace(/(\d{3})\d+(\d{3})/, '$1****$2');
    }

    return { success: true, maskedEmail, maskedWa, hasWa: !!wa };
  }
  return { success: false, error: 'Email tidak terdaftar' };
}

// ────────────────────────────────────────────────────────
//  FORGOT PASSWORD — verifikasi OTP + set password baru
// ────────────────────────────────────────────────────────
function forgotPasswordVerify({ email, otp, newPassword }) {
  if (!email || !otp || !newPassword) return { success: false, error: 'Data tidak lengkap' };
  // [SEC] Rate limit: max 10 verify per email per jam
  if (!_rateLimit('fverify_' + String(email).toLowerCase().trim(), 10, 3600)) {
    return { success: false, error: 'Terlalu banyak percobaan. Coba lagi dalam 1 jam.' };
  }
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data      = sheet.getDataRange().getValues();
  const headers   = data[0].map(h => String(h).toLowerCase().trim());
  const emailNorm = email.toLowerCase().trim();
  const attCol    = _colIndex(headers, 'otp attempts');
  const saltCol   = _colIndex(headers, 'salt');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== emailNorm) continue;

    const storedOTP = String(data[i][7] || '').trim();
    const expiry    = String(data[i][8] || '').trim();
    const attempts  = attCol >= 0 ? (Number(data[i][attCol]) || 0) : 0;

    if (!storedOTP) return { success: false, error: 'OTP tidak ditemukan. Minta kode baru.' };
    if (attempts >= OTP_MAX_ATTEMPTS) return { success: false, error: 'Terlalu banyak percobaan. Minta kode baru.' };
    if (expiry && new Date() > new Date(expiry)) return { success: false, error: 'OTP kadaluarsa. Minta kode baru.' };

    if (String(otp).trim() !== storedOTP) {
      if (attCol >= 0) sheet.getRange(i + 1, attCol + 1).setValue(attempts + 1);
      const remaining = OTP_MAX_ATTEMPTS - attempts - 1;
      return { success: false, error: remaining > 0 ? `Kode OTP salah. Sisa ${remaining} percobaan.` : 'Terlalu banyak percobaan. Minta kode baru.' };
    }

    // [SEC] Generate salt baru + simpan salted password setelah reset
    const newSalt   = _generateSalt();
    const saltedPw  = _applyServerSalt(newPassword, newSalt);
    sheet.getRange(i + 1, 4).setValue(saltedPw);
    if (saltCol >= 0) sheet.getRange(i + 1, saltCol + 1).setValue(newSalt);
    else sheet.getRange(i + 1, 18).setValue(newSalt);
    sheet.getRange(i + 1, 8).setValue('');
    sheet.getRange(i + 1, 9).setValue('');
    if (attCol >= 0) sheet.getRange(i + 1, attCol + 1).setValue(0);
    return { success: true };
  }
  return { success: false, error: 'User tidak ditemukan' };
}

// ────────────────────────────────────────────────────────
//  CREATE CART ORDER — semua item keranjang dalam 1 order ID
// ────────────────────────────────────────────────────────
function createCartOrder({ email, sessionToken, userNama, userEmail, userWa, itemsJson, imageUrlsJson, env }) {
  const effectiveEmail = userEmail || email || '';
  if (!effectiveEmail || !itemsJson) return { success: false, error: 'Data tidak lengkap' };

  let items;
  try { items = JSON.parse(itemsJson); } catch(_) { return { success: false, error: 'Format data tidak valid' }; }
  if (!items || !items.length) return { success: false, error: 'Keranjang kosong' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_ORDERS);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_ORDERS);
    sheet.appendRow(['Order ID','Tanggal','Nama','Email','No WA','Produk','Varian','Masa Aktif','Harga','Status','Nama MS','Username','Email Microsoft','Email Aktif','Email Reminder']);
    sheet.getRange(1, 1, 1, 15).setFontWeight('bold');
  }

  const orderId = 'SRB-' + new Date().getTime().toString().slice(-8);
  const tanggal = formatJkt(new Date(), 'yyyy-MM-dd HH:mm');
  let totalHarga = 0;
  const waLines       = [];
  const computedItems = []; // simpan item + harga final (sudah discount)

  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    const catalogPrice = _getCatalogPrice(it.produk, it.varian, it.masaAktif);
    if (catalogPrice === null) {
      Logger.log('createCartOrder REJECTED: produk tidak ditemukan: ' + it.produk + '|' + it.varian + '|' + it.masaAktif);
      return { success: false, error: 'Produk "' + (it.produk || '') + '" tidak tersedia. Silakan refresh halaman dan coba lagi.' };
    }
    let unitPrice = catalogPrice;
    if (sessionToken) {
      const campaignPrice = _getActiveCampaignPrice(it.produk, it.varian, it.masaAktif);
      if (campaignPrice !== null && campaignPrice < catalogPrice && campaignPrice > 0) {
        unitPrice = campaignPrice;
        Logger.log('createCartOrder: member price applied for ' + it.produk + ' — catalog=' + catalogPrice + ' campaign=' + campaignPrice);
      }
    }
    const hargaNum = unitPrice * (Number(it.qty) || 1);
    totalHarga += hargaNum;

    sheet.appendRow([
      orderId, tanggal, userNama, userEmail, userWa,
      it.produk, it.varian||'-', it.masaAktif||'-', hargaNum, 'Pending',
      it.msNama||'-', it.username||'-', it.microsoftEmail||'-', it.emailAktif||'-', '-'
    ]);

    const varLower  = (it.varian || '').toLowerCase();
    const isFamily  = varLower.includes('family');
    const isWeb     = varLower.includes('web');
    const produkCat = (it.produk || '').toLowerCase();
    const isAdobe   = produkCat.includes('adobe');
    let line = `*[${idx+1}] ${it.produk}${it.varian && it.varian!=='-' ? ' - '+it.varian : ''}${it.masaAktif && it.masaAktif!=='-' ? ' ('+it.masaAktif+')' : ''}*`;
    if (isFamily  && it.microsoftEmail) line += `\n   > MS Email: ${it.microsoftEmail}`;
    if (isWeb && it.msNama)             line += `\n   > Nama MS: ${it.msNama}`;
    if (isWeb && it.username)           line += `\n   > Username: ${it.username}`;
    if (isAdobe && it.adobeEmail)       line += `\n   > Adobe: ${it.adobeEmail}`;
    if (it.emailAktif)                  line += `\n   > Email Aktif: ${it.emailAktif}`;
    line += `\n   > No WA: ${userWa || '-'}`;
    line += `\n   > Harga: Rp ${hargaNum.toLocaleString('id-ID')}`;
    waLines.push(line);
    computedItems.push({ produk: it.produk, varian: it.varian||'-', masaAktif: it.masaAktif||'-', harga: hargaNum, qty: Number(it.qty)||1 });
  }

  // Kirim notif WAG segera saat order dibuat
  const firstVar    = (items[0]?.varian || '').toLowerCase();
  const firstProduk = items[0]?.produk || '';
  const cartTitle   = firstVar.includes('family') ? `ORDER 365 FAMILY: ${firstProduk}` :
                      firstVar.includes('web')    ? `ORDER WEB: ${firstProduk}` :
                      firstProduk.toLowerCase().includes('adobe') ? `ORDER ADOBE: ${firstProduk}` :
                      items.length > 1 ? `ORDER BARU (${items.length} item)` : `ORDER BARU: ${firstProduk}`;
  const cartGroupMsg = `*${cartTitle}*\nOrder ID: *${orderId}*\nPembeli: ${userNama}\n────────────────────\n${waLines.join('\n')}\n────────────────────\nTotal: Rp ${totalHarga.toLocaleString('id-ID')}\nStatus: *UNPAID*`;
  sendWAToGroup(cartGroupMsg);

  // WA + email ke buyer dikirim setelah pembayaran berhasil (xenditCallback / syncOrders)

  const isUat       = String(env || '').toLowerCase() === 'uat';
  const paymentMode = isUat ? 'xendit' : (PropertiesService.getScriptProperties().getProperty('PAYMENT_MODE') || 'xendit').toLowerCase();
  let paymentUrl = null;
  let paymentError = null;

  if (paymentMode === 'xendit') {
    try {
      const xnItems = computedItems;
      const xnRes = createXenditInvoice({
        orderId,
        items:     xnItems,
        buyerName:  userNama,
        buyerEmail: userEmail,
        buyerPhone: userWa,
        total: totalHarga
      });
      if (xnRes.success) paymentUrl = xnRes.paymentUrl;
      else {
        paymentError = xnRes.error || 'Gagal membuat sesi pembayaran';
        Logger.log('createCartOrder Xendit error: ' + paymentError);
      }
    } catch(e) {
      paymentError = 'Xendit exception: ' + e.message;
      Logger.log('createCartOrder Xendit exception: ' + e.message);
    }
  }

  return { success: true, orderId, total: totalHarga, paymentUrl, paymentError, paymentMode };
}

// ────────────────────────────────────────────────────────
//  IPAYMU PAYMENT INTEGRATION
// ────────────────────────────────────────────────────────
function createIPaymuPayment({ orderId, itemsJson, buyerName, buyerEmail, buyerPhone, total, imageUrlsJson }) {
  const props  = PropertiesService.getScriptProperties();
  const va     = (props.getProperty('IPAYMU_VA')      || '').trim();
  const apiKey = (props.getProperty('IPAYMU_API_KEY') || '').trim();
  if (!va || !apiKey) return { success: false, error: 'iPaymu belum dikonfigurasi. Hubungi admin.' };
  if (!orderId)       return { success: false, error: 'Order ID diperlukan' };

  const items     = JSON.parse(itemsJson || '[]');
  if (!items.length) return { success: false, error: 'Item pesanan kosong' };

  const imageUrls = JSON.parse(imageUrlsJson || '[]');

  const prices   = items.map(i => Math.round(Number(i.harga) || 0));
  const totalAmt = Math.round(Number(total) || 0) || prices.reduce(function(s,p){ return s+p; }, 0);

  // notifyUrl: HARUS domain yang terdaftar di merchant iPaymu (bukan script.google.com)
  // Set IPAYMU_NOTIFY_URL di Script Properties jika ada endpoint khusus
  const notifyUrl = (props.getProperty('IPAYMU_NOTIFY_URL') || '').trim() || 'https://serabut.id/';

  const body = {
    product:     items.map(function(i){ return i.produk + (i.varian && i.varian !== '-' ? ' - ' + i.varian : ''); }),
    qty:         items.map(function(){ return 1; }),
    price:       prices,
    amount:      totalAmt,
    returnUrl:   'https://serabut.id/?payment=success&orderId=' + orderId,
    cancelUrl:   'https://serabut.id/?payment=cancel&orderId=' + orderId,
    notifyUrl:   notifyUrl,
    referenceId: orderId,
    buyerName:   (buyerName  || 'Pembeli').substring(0, 50),
    buyerEmail:  buyerEmail  || '',
    buyerPhone:  buyerPhone  || ''
  };

  // Hanya sertakan imageUrl yang valid (http/https); iPaymu menolak data: URI dan empty string
  const cleanUrls = imageUrls.filter(function(u){ return u && typeof u === 'string' && u.indexOf('http') === 0; });
  if (cleanUrls.length > 0) {
    body.imageUrl = cleanUrls;
  }

  const bodyStr = JSON.stringify(body);
  const timestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMddHHmmss');

  function _hex(arr) {
    return arr.map(function(b){ return ((b & 0xff) < 16 ? '0' : '') + (b & 0xff).toString(16); }).join('');
  }

  // SHA256 body hash (lowercase hex)
  const bodyHash    = _hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bodyStr));
  // stringToSign: POST:VA:sha256(body):apiKey  — timestamp hanya di header, bukan di signature
  const stringToSign = 'POST:' + va + ':' + bodyHash + ':' + apiKey;
  const signature   = _hex(Utilities.computeHmacSha256Signature(stringToSign, apiKey));

  const resp = UrlFetchApp.fetch('https://my.ipaymu.com/api/v2/payment', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'va': va, 'signature': signature, 'timestamp': timestamp },
    payload: bodyStr,
    muteHttpExceptions: true
  });

  let result;
  try {
    result = JSON.parse(resp.getContentText());
  } catch(e) {
    Logger.log('iPaymu createPayment parse error: ' + resp.getContentText().substring(0, 500));
    return { success: false, error: 'Response iPaymu tidak valid: ' + e.message };
  }
  Logger.log('iPaymu createPayment response: ' + JSON.stringify(result));

  // iPaymu bisa return Status sebagai number (200) atau string ("200")
  if (Number(result.Status) === 200 && result.Data && result.Data.Url) {
    return { success: true, paymentUrl: result.Data.Url, sessionId: result.Data.SessionID };
  }
  return { success: false, error: (result.Message || 'Status: ' + result.Status + ' — Gagal membuat sesi pembayaran iPaymu') };
}

function ipaymuCallback(params) {
  // iPaymu POST callback: { trx_id, status, status_code, reference_id, payment_method, ... }
  const referenceId = params.reference_id || params.referenceId || params.trx_id;
  const statusCode  = String(params.status_code || params.status || '');
  if (!referenceId) return { success: false };

  // status_code 1 = berhasil
  const isPaid = (statusCode === '1' || statusCode.toLowerCase() === 'berhasil');
  if (!isPaid) return { success: true, message: 'Status diabaikan: ' + statusCode };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: false };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
  const idCol   = headers.indexOf('order id');
  const stCol   = headers.indexOf('status');
  if (idCol < 0 || stCol < 0) return { success: false };

  // Cari kolom Payment Method & Payment Status, buat jika belum ada
  let pmCol = headers.indexOf('payment method');
  let psCol = headers.indexOf('payment status');
  
  // Jika kolom belum ada, tambahkan di akhir
  if (pmCol === -1) {
    sheet.getRange(1, headers.length + 1).setValue('Payment Method');
    pmCol = headers.length;
    headers.push('payment method');
  }
  if (psCol === -1) {
    sheet.getRange(1, headers.length + 1).setValue('Payment Status');
    psCol = headers.length;
    headers.push('payment status');
  }

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === String(referenceId).trim()) {
      // [SEC-04] Idempotency: skip jika order sudah dibayar sebelumnya
      if (psCol >= 0 && String(data[i][psCol]).trim() === 'Berhasil') {
        Logger.log('ipaymuCallback: already paid, skip: ' + referenceId);
        return { success: true };
      }
      if (data[i][stCol] === 'Pending') {
        sheet.getRange(i + 1, stCol + 1).setValue('Diproses');
        Logger.log('ipaymuCallback: order ' + referenceId + ' → Diproses');
      }
      
      // Update payment method & status dari iPaymu
      const paymentMethod = params.payment_method || 'QRIS'; // default QRIS
      const paymentStatus = isPaid ? 'Berhasil' : 'Pending';
      
      sheet.getRange(i + 1, pmCol + 1).setValue(paymentMethod);
      sheet.getRange(i + 1, psCol + 1).setValue(paymentStatus);
      
      Logger.log('ipaymuCallback: order ' + referenceId + ' → ' + paymentMethod + ', ' + paymentStatus);
      return { success: true };
    }
  }
  Logger.log('ipaymuCallback: order tidak ditemukan: ' + referenceId);
  return { success: false, error: 'Order tidak ditemukan' };
}

// ────────────────────────────────────────────────────────
//  CHECK IPAYMU ORDER STATUS — cek ke iPaymu & update sheet jika paid
// ────────────────────────────────────────────────────────
function checkIPaymuOrderStatus({ orderId, email }) {
  if (!orderId || !email) return { success: false, error: 'Data tidak lengkap' };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: false, error: 'Sheet tidak ditemukan' };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
  const idCol   = headers.indexOf('order id');
  const emCol   = headers.indexOf('email');
  const stCol   = headers.indexOf('status');
  if (idCol < 0) return { success: false, error: 'Sheet error' };

  // Verifikasi order milik email ini
  const emailNorm = email.toLowerCase().trim();
  let firstRow = -1;
  const currentStatus = (function() {
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]).trim() === String(orderId).trim() &&
          String(data[i][emCol] || '').toLowerCase().trim() === emailNorm) {
        if (firstRow < 0) firstRow = i;
        return String(data[i][stCol] || '').trim();
      }
    }
    return null;
  })();

  if (currentStatus === null) return { success: false, error: 'Order tidak ditemukan' };
  // Jika sudah settled (Diproses/Aktif/Selesai) → skip cek iPaymu, anggap paid
  if (['Diproses', 'Aktif', 'Selesai'].includes(currentStatus)) {
    return { success: true, paid: true, currentStatus };
  }
  // Jika Pending atau Dibatalkan → cek ke iPaymu untuk verifikasi aktual
  // (Dibatalkan bisa terjadi karena bug auto-cancel lama, perlu restore jika sudah dibayar)

  // Panggil iPaymu status API
  let result;
  try {
    const va2 = (PropertiesService.getScriptProperties().getProperty('IPAYMU_VA') || '').trim();
    result = _iPaymuRequest('https://my.ipaymu.com/api/v2/payment/status', { account: va2, referenceId: orderId });
    Logger.log('checkIPaymuOrderStatus [' + orderId + ']: ' + JSON.stringify(result));
  } catch(e) {
    Logger.log('checkIPaymuOrderStatus error: ' + e.message);
    return { success: false, error: 'Gagal cek status iPaymu' };
  }

  if (result.Status === 200 && result.Data) {
    const ipStatus  = String(result.Data.Status || result.Data.status_code || '').toLowerCase();
    const isPaid    = (ipStatus === 'berhasil' || ipStatus === '1' || ipStatus === 'success');
    const payMethod = result.Data.PaymentMethod || result.Data.Via || result.Data.payment_channel || 'iPaymu';

    if (isPaid) {
      // Ensure payment cols exist
      let pmCol = headers.indexOf('payment method');
      let psCol = headers.indexOf('payment status');
      if (pmCol < 0) { sheet.getRange(1, headers.length + 1).setValue('Payment Method'); pmCol = headers.length; headers.push('payment method'); }
      if (psCol < 0) { sheet.getRange(1, headers.length + 1).setValue('Payment Status'); psCol = headers.length; headers.push('payment status'); }

      // Update semua baris orderId ini (Pending & Dibatalkan → Diproses)
      for (let i = 1; i < data.length; i++) {
        if (String(data[i][idCol]).trim() !== String(orderId).trim()) continue;
        const rowSt = String(data[i][stCol] || '').trim();
        if (rowSt === 'Pending' || rowSt === 'Dibatalkan') {
          sheet.getRange(i + 1, stCol + 1).setValue('Diproses');
        }
        sheet.getRange(i + 1, pmCol + 1).setValue(payMethod);
        sheet.getRange(i + 1, psCol + 1).setValue('Berhasil');
      }
      try { SpreadsheetApp.flush(); } catch(e) {}
      Logger.log('checkIPaymuOrderStatus: order ' + orderId + ' restored → Diproses (' + payMethod + ')');
      return { success: true, paid: true, paymentMethod: payMethod, paymentStatus: 'Berhasil', orderStatus: 'Diproses' };
    }
    return { success: true, paid: false, ipStatus };
  }

  return { success: true, paid: false, message: result.Message || 'Belum dibayar' };
}

// ────────────────────────────────────────────────────────
//  CANCEL ORDER — user batalkan pesanan Pending miliknya
// ────────────────────────────────────────────────────────
function cancelOrder({ orderId, email }) {
  if (!orderId || !email) return { success: false, error: 'Data tidak lengkap' };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: false, error: 'Sheet tidak ditemukan' };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
  const idCol   = headers.indexOf('order id');
  const emCol   = headers.indexOf('email');
  const stCol   = headers.indexOf('status');

  const emailNorm = email.toLowerCase().trim();
  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() !== String(orderId).trim()) continue;
    if (String(data[i][emCol] || '').toLowerCase().trim() !== emailNorm) continue;
    if (String(data[i][stCol] || '').trim() !== 'Pending') continue;
    sheet.getRange(i + 1, stCol + 1).setValue('Dibatalkan');
    found = true;
  }
  if (!found) return { success: false, error: 'Order tidak ditemukan atau sudah diproses' };
  try { SpreadsheetApp.flush(); } catch(e) {}
  return { success: true };
}

// ────────────────────────────────────────────────────────
//  CONFIRM PAYMENT — dipanggil frontend saat user kembali dari iPaymu
//  Update status → Diproses, kirim WA group + notif buyer
// ────────────────────────────────────────────────────────
function confirmPayment({ orderId }) {
  if (!orderId) return { success: false, error: 'Order ID diperlukan' };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: false, error: 'Sheet tidak ditemukan' };

  const data    = sheet.getDataRange().getValues();
  const h       = data[0].map(x => String(x).toLowerCase().trim());
  const idCol   = h.indexOf('order id');
  const stCol   = h.indexOf('status');
  const namaCol = h.indexOf('nama');
  const waCol   = h.indexOf('no wa');
  const emCol   = h.indexOf('email');
  const prodCol = h.indexOf('produk');
  const varCol  = h.indexOf('varian');
  const masCol  = h.indexOf('masa aktif');
  const hrgCol  = h.indexOf('harga');
  const nmMSCol = h.indexOf('nama ms');
  const usrCol  = h.indexOf('username');
  const msEmCol = h.indexOf('email microsoft');
  const eaCol   = h.indexOf('email aktif');

  if (idCol < 0 || stCol < 0) return { success: false, error: 'Kolom tidak ditemukan' };

  // Kumpulkan semua baris dengan orderId ini
  const rows = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() === String(orderId).trim()) rows.push({ idx: i + 1, row: data[i] });
  }
  if (!rows.length) return { success: false, error: 'Order tidak ditemukan' };

  // Cek apakah sudah "Diproses" sebelumnya (idempotent) — skip verify iPaymu
  const existingStatus = String(rows[0].row[stCol] || '').trim();
  let iPaymuVerified = (existingStatus === 'Diproses' || existingStatus === 'Aktif' || existingStatus === 'Selesai');
  let payMethod = '';

  if (!iPaymuVerified) {
    // Verifikasi pembayaran ke iPaymu sebelum kirim WA
    try {
      const va2 = (PropertiesService.getScriptProperties().getProperty('IPAYMU_VA') || '').trim();
      const ipResult = _iPaymuRequest('https://my.ipaymu.com/api/v2/payment/status', { account: va2, referenceId: orderId });
      Logger.log('confirmPayment iPaymu verify [' + orderId + ']: ' + JSON.stringify(ipResult));
      if (ipResult.Status === 200 && ipResult.Data) {
        const ipStatus = String(ipResult.Data.Status || ipResult.Data.status_code || '').toLowerCase();
        iPaymuVerified = (ipStatus === 'berhasil' || ipStatus === '1' || ipStatus === 'success');
        payMethod = ipResult.Data.PaymentMethod || ipResult.Data.Via || ipResult.Data.payment_channel || 'iPaymu';
      }
    } catch(e) {
      Logger.log('confirmPayment: iPaymu verify error: ' + e.message);
    }
    if (!iPaymuVerified) return { success: false, pending: true, error: 'Pembayaran belum terverifikasi di iPaymu' };

    // Simpan payment method/status ke sheet
    let pmCol = h.indexOf('payment method');
    let psCol = h.indexOf('payment status');
    if (pmCol < 0) { sheet.getRange(1, h.length + 1).setValue('Payment Method'); pmCol = h.length; h.push('payment method'); }
    if (psCol < 0) { sheet.getRange(1, h.length + 1).setValue('Payment Status'); psCol = h.length; h.push('payment status'); }
    rows.forEach(r => {
      if (payMethod) sheet.getRange(r.idx, pmCol + 1).setValue(payMethod);
      sheet.getRange(r.idx, psCol + 1).setValue('Berhasil');
    });
  }

  // Update status semua baris → Diproses
  rows.forEach(r => sheet.getRange(r.idx, stCol + 1).setValue('Diproses'));

  const first    = rows[0].row;
  const userNama = String(first[namaCol]  || '');
  const userWa   = String(first[waCol]    || '');
  const userEmail= String(first[emCol]    || '');

  // Bangun WA group message
  let groupMsg, productName;

  if (rows.length === 1) {
    const produk    = String(first[prodCol] || '');
    const varian    = String(first[varCol]  || '-');
    const masaAktif = String(first[masCol]  || '-');
    const harga     = Number(first[hrgCol]  || 0);
    const msNama    = String(first[nmMSCol] || '');
    const username  = String(first[usrCol]  || '');
    const msEmail   = String(first[msEmCol] || '');
    const emailAktif= String(first[eaCol]   || '');
    const varLower  = varian.toLowerCase();
    const isFamily  = varLower.includes('family');
    const isWeb     = varLower.includes('web');

    productName = produk + (varian !== '-' ? ' ' + varian : '');
    const hargaFmt = harga.toLocaleString('id-ID');

    if (isFamily) {
      productName = produk;
      groupMsg = `ORDER: *${produk}*\nOrder ID: ${orderId}\nEmail Microsoft (invite): ${msEmail || '-'}\nEmail Aktif: ${emailAktif || '-'}\nDurasi: ${masaAktif}\nNama Pembeli: ${userNama}\nNo WA: ${userWa}\nStatus: *Paid*\nNext: Please proceed!`;
    } else if (isWeb) {
      productName = produk;
      groupMsg = `ORDER: *${produk}*\nOrder ID: ${orderId}\nNama MS: ${msNama || '-'}\nUsername Request: ${username || '-'}\nEmail Aktif: ${emailAktif || '-'}\nDurasi: ${masaAktif}\nNo WA: ${userWa}\nStatus: *Paid*\nNext: Please proceed!`;
    } else {
      productName = produk + (varian !== '-' ? ' ' + varian : '');
      groupMsg = `ORDER: *${produk}*\nOrder ID: ${orderId}\nProduk: ${produk}${varian !== '-' ? ' - '+varian : ''}\nEmail Aktif: ${emailAktif || '-'}\nDurasi: ${masaAktif}\nNama: ${userNama}\nNo WA: ${userWa}\nStatus: *Paid*\nNext: Please proceed!`;
    }
  } else {
    // Cart order — multiple items
    let totalHarga = 0;
    const waLines  = [];
    const produkNames = [];

    rows.forEach((r, idx) => {
      const row       = r.row;
      const produk    = String(row[prodCol] || '');
      const varian    = String(row[varCol]  || '-');
      const masaAktif = String(row[masCol]  || '-');
      const harga     = Number(row[hrgCol]  || 0);
      const varLower  = varian.toLowerCase();
      const isFamily  = varLower.includes('family');
      const isWeb     = varLower.includes('web');
      const msEmail   = String(row[msEmCol] || '');
      const username  = String(row[usrCol]  || '');
      const msNama    = String(row[nmMSCol] || '');
      const emailAktif= String(row[eaCol]   || '');

      totalHarga += harga;
      produkNames.push(produk);

      let line = `[${idx+1}] *${produk}${varian !== '-' ? ' - '+varian : ''}${masaAktif !== '-' ? ' ('+masaAktif+')' : ''}*`;
      if (isFamily && msEmail && msEmail !== '-')  line += `\n   Email MS: ${msEmail}`;
      if (isWeb && msNama && msNama !== '-')        line += `\n   Nama MS: ${msNama}`;
      if (isWeb && username && username !== '-')    line += `\n   Username: ${username}`;
      if (emailAktif && emailAktif !== '-')         line += `\n   Email Aktif: ${emailAktif}`;
      waLines.push(line);
    });

    const uniq = [...new Set(produkNames)];
    productName = uniq.length <= 2 ? uniq.join(' + ') : uniq[0] + ' +' + (uniq.length - 1) + ' lainnya';
    const totalFmt = totalHarga.toLocaleString('id-ID');
    groupMsg = `ORDER: *${productName}* (${rows.length} item)\nOrder ID: ${orderId}\nPembeli: ${userNama}\nNo WA: ${userWa}\n────────────────────\n${waLines.join('\n')}\n────────────────────\nTotal: Rp ${totalFmt}\nStatus: *Paid*\nNext: Please proceed!`;
  }

  sendWAToGroup(groupMsg);
  Logger.log('confirmPayment: WA group terkirim untuk order ' + orderId);

  // Notif ke buyer (WA personal + email)
  const buyerItems = rows.map(r => ({
    produk:    String(r.row[prodCol] || ''),
    varian:    String(r.row[varCol]  || '-'),
    masaAktif: String(r.row[masCol]  || '-'),
    harga:     Number(r.row[hrgCol]  || 0)
  }));
  const totalHarga = buyerItems.reduce((s, it) => s + it.harga, 0);
  try {
    sendBuyerOrderConfirm(userWa, userEmail, userNama, orderId, buyerItems, totalHarga);
  } catch(e) { Logger.log('confirmPayment: buyer notif error: ' + e.message); }

  return { success: true, orderId, productName: productName || '', paymentMethod: payMethod || '', totalHarga, items: buyerItems, buyerNama: userNama };
}

// ────────────────────────────────────────────────────────
//  PROFILE HELPERS
// ────────────────────────────────────────────────────────
function _profileCols(headers) {
  const h = headers.map(x => String(x).toLowerCase().trim());
  return {
    tgl:  h.findIndex(x => x === 'tanggal lahir'),
    jk:   h.findIndex(x => x === 'jenis kelamin'),
    kota: h.findIndex(x => x === 'kota'),
    prov: h.findIndex(x => x === 'provinsi'),
  };
}

function ensureUserSheetHeaders(sheet) {
  const needed = [
    'Nama','Email','No Hp','Password','Created At','Status',
    'Privacy Notice','OTP','OTP Expiry','Role',
    'Tanggal Lahir','Jenis Kelamin','Kota','Provinsi',
    'Session Token','OTP Attempts',
    'Session Token Expiry', // [SEC] kolom baru v6 — expiry 30 hari
    'Salt',                 // [SEC] kolom baru v7 — server-side password salt
  ];
  const cur     = sheet.getRange(1, 1, 1, needed.length).getValues()[0];
  const changed = needed.some((h, i) => String(cur[i] || '').trim() !== h);
  if (changed) sheet.getRange(1, 1, 1, needed.length).setValues([needed]).setFontWeight('bold');
}

// ────────────────────────────────────────────────────────
//  CS AGENT
// ────────────────────────────────────────────────────────
function handleCSChat({ sessionId, message, userName, userEmail }) {
  if (!sessionId || !message) return { success: false, error: 'sessionId dan message wajib' };

  // [SEC-16] Rate limit: max 15 pesan per sesi per menit
  if (!_rateLimit('cschat_' + sessionId, 15, 60)) {
    return { success: false, error: 'Terlalu cepat. Tunggu sebentar sebelum mengirim pesan lagi.' };
  }

  // [SEC-16] Max panjang pesan
  const msgClean = String(message).trim().substring(0, 500);

  // [SEC-16] Prompt injection detection — pola umum untuk manipulasi AI
  const injectionPatterns = [
    /ignore (previous|above|system|all)/i,
    /forget (all|everything|your|the)/i,
    /you are now/i,
    /act as (a |an )?(?!customer|buyer|user)/i,
    /\[system\]/i,
    /new instruction/i,
  ];
  if (injectionPatterns.some(p => p.test(msgClean))) {
    return { success: false, error: 'Format pesan tidak valid. Silakan ulangi pertanyaan kamu.' };
  }

  const sheet   = getOrCreateCSSheet();
  const history = getChatHistory(sheet, sessionId);
  const guides  = loadGuidesText();

  const messages = [
    { role: 'system', content: buildCSSystemPrompt(guides) },
    ...history,
    { role: 'user', content: msgClean },
  ];

  const aiResponse = callOpenRouter(messages);
  if (!aiResponse || !aiResponse.choices) {
    return { success: false, error: 'AI tidak merespons' };
  }

  let reply      = (aiResponse.choices[0].message.content || '').trim();
  const escalate = shouldEscalate(msgClean, reply);
  reply          = reply.replace('[ESCALATE]', '').trim();

  const ts = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  sheet.appendRow([sessionId, ts, 'user',      msgClean, userName || '', userEmail || '', false]);
  sheet.appendRow([sessionId, ts, 'assistant', reply,                   userName || '', userEmail || '', escalate]);

  return { success: true, reply, escalate };
}

function getChatHistory(sheet, sessionId) {
  const data    = sheet.getDataRange().getValues();
  const history = [];
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) !== String(sessionId)) continue;
    const role = String(data[i][2]);
    if (role === 'user' || role === 'assistant') {
      history.push({ role, content: String(data[i][3]) });
    }
  }
  return history.slice(-10);
}

function getOrCreateCSSheet() {
  const ss  = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_CS);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_CS);
    sheet.appendRow(['Session ID', 'Timestamp', 'Role', 'Message', 'User Name', 'User Email', 'Escalated']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
  return sheet;
}

function callOpenRouter(messages) {
  const payload = {
    model: 'deepseek/deepseek-chat', messages,
    max_tokens: 600, temperature: 0.75, top_p: 0.9,
  };
  const options = {
    method: 'post', contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + OPENROUTER_KEY,
      'HTTP-Referer':  'https://serabut.id',
      'X-Title':       'Serabut CS Agent',
    },
    payload: JSON.stringify(payload), muteHttpExceptions: true,
  };
  return JSON.parse(UrlFetchApp.fetch(OPENROUTER_URL, options).getContentText());
}

function shouldEscalate(userMsg, aiReply) {
  const lower    = String(userMsg).toLowerCase();
  const keywords = ['chat cs', 'cs manusia', ' cs ', 'bicara cs', 'hubungi cs', 'minta cs', 'cs aja', 'cs saja', 'ke cs'];
  if (keywords.some(k => lower.includes(k))) return true;
  if (String(aiReply).includes('[ESCALATE]'))  return true;
  return false;
}

function loadGuidesText() {
  try {
    const result = getGuides();
    if (!result.success || !result.data) return '';
    const cats   = { office365: 'Microsoft Office 365', windows: 'Windows', adobe: 'Adobe Creative Cloud' };
    let   text   = '';
    for (const [key, label] of Object.entries(cats)) {
      const list = result.data[key] || [];
      if (!list.length) continue;
      text += `\n=== ${label} ===\n`;
      for (const g of list) {
        text += `\n[${g.title}]\n`;
        if (Array.isArray(g.steps)) g.steps.forEach((s, i) => { text += `${i + 1}. ${s}\n`; });
        if (g.note) text += `Catatan: ${g.note}\n`;
      }
    }
    return text;
  } catch (_) { return ''; }
}

function buildCSSystemPrompt(guidesText) {
  const panduanSection = guidesText
    ? `\n\nPANDUAN RESMI SERABUT STORE (wajib jadikan referensi utama sebelum menjawab):\n${guidesText}`
    : '';
  return `Kamu adalah Sera, asisten AI resmi Serabut Store — bukan sekadar bot. Kamu paham konteks, ngobrol natural, dan selalu siap bantu pelanggan.

## IDENTITAS
- Nama: Sera
- Brand: Serabut Store — serabut.id
- Bahasa: Indonesia, santai tapi profesional. Pahami bahasa gaul, singkatan, dan typo.
- Nada: hangat, singkat, to the point — tidak bertele-tele, tidak pakai salam panjang
- Signature wajib di setiap balasan: — Sera, AI Assistant (tulis persis ini, tanpa underscore)
- Jangan sebut atau rekomendasikan produk/toko lain. Semua link selalu ke https://serabut.id/

## PRODUK & HARGA RESMI

**Microsoft Office 365:**
- Office 365 Family (5 devices) | 1 Bulan → Rp 59.000
- Office 365 Family (5 devices) | 6 Bulan → Rp 236.000
- Office 365 Family (5 devices) | 1 Tahun → Rp 337.000
- Office 365 Family as Organizer | 1 Tahun → Rp 1.559.999
- Renewal Account (perpanjang) | 1 Tahun → Rp 35.000

**Adobe Creative Cloud:**
- Adobe CC All Apps | 1 Bulan → Rp 341.000
- Adobe CC Fotografi (Lr + Ps) | 1 Bulan → Rp 269.000
- Adobe CC Private Account | 1 Tahun → Rp 3.351.000

**Windows:**
- Windows 10 Pro (lifetime) → Rp 160.000
- Windows 11 Pro (lifetime) → Rp 160.000

**Microsoft Office (one-time):**
- Office 2024 Professional Plus → Rp 800.000
- Office 2021 Professional Plus (Bind Account) → Rp 1.850.000
- Office 2021 Home Business for Mac → Rp 1.750.000
- Office 2019 Professional Plus (Bind Account) → Rp 1.110.000
- Office 2024 Home Business → Rp 3.450.000

**Lainnya:**
- Ms Project Pro 2016/2019 (5 devices) → Rp 205.000 | 2021 (5 devices) → Rp 215.000
- Ms Visio Pro 2016/2019 (5 devices) → Rp 145.000–155.000
- CorelDRAW 2024 (one-time Windows) → Rp 5.500.000
- Windows Server 2016 → Rp 150.000 | 2019/2022 → Rp 190.000
- G Suite Admin (Edu/Non-Profit) → Rp 15.000.000–20.500.000
- Global ADMIN A1 Office 365 (1k users) → Rp 5.000.000

## CARA INSTALL OFFICE 365
1. Cek email dari halo@serabut.com (cek folder spam juga)
2. Klik "Accept Invitation" di email tersebut
3. Buat password baru di halaman Microsoft yang muncul
4. Login ke office.com dengan akun yang dikirim
5. Download Office di office.com/install → install → login dengan akun yang sama
Akun aktif 5–15 menit setelah konfirmasi pembayaran (jam 09.00–22.00 WIB)

## CARA AKTIVASI WINDOWS
1. Klik kanan Start → Settings → System → Activation
2. Klik "Change product key"
3. Masukkan key yang dikirim via WhatsApp
4. Tunggu verifikasi online otomatis

## CARA INSTALL ADOBE CC
1. Download Adobe Creative Cloud App di creativecloud.adobe.com/apps/download
2. Login dengan akun yang diberikan Serabut
3. Install aplikasi yang diinginkan dari dalam CC App

## TROUBLESHOOT UMUM
- Email undangan tidak masuk → Cek spam/junk, tunggu 5 menit, minta resend ke CS WA
- Office tidak bisa install → Uninstall Office lama via Control Panel, restart, coba lagi
- Windows key invalid → Screenshot error, kirim ke CS WA, kami ganti dalam 1 jam
- Adobe login gagal → Clear cache browser, coba incognito, atau reinstall CC App
- Akun expired → Hubungi CS WA untuk perpanjang dengan harga spesial pelanggan lama

## LINK LANGSUNG
- Lihat semua produk → https://serabut.id/produk
- Panduan instalasi → https://serabut.id/panduan
- Cek status akun → https://serabut.id/cek-status
- Hubungi CS / WA → https://wa.me/628881500555

## LINK DETAIL PRODUK SPESIFIK
Setiap produk punya halaman sendiri di: https://serabut.id/produk/[slug]
Cara buat slug: nama produk → huruf kecil → spasi jadi "-" → hapus karakter non-alfanumerik kecuali "-"

## FAQ
- Kapan akun dikirim? → 5–15 menit setelah pembayaran dikonfirmasi, jam 09.00–22.00 WIB
- Garansi? → Garansi penuh selama masa aktif
- Metode bayar? → Transfer bank, QRIS, dompet digital — konfirmasi via WA setelah transfer
- Cek status akun? → https://serabut.id/cek-status
- Mau beli? → https://serabut.id/produk atau WA +62 888 1500 555

## REKOMENDASI PRODUK
- Tanya software kerja/kuliah → rekomendasikan Office 365, berikan link spesifik produknya
- Tanya software desain/edit foto/video → rekomendasikan Adobe CC, berikan link spesifik produknya
- Tanya aktivasi Windows → rekomendasikan Windows license, berikan link spesifik produknya
- Tanya panduan/cara install → "Panduan lengkap ada di https://serabut.id/panduan"
- Tanya status akun → "Cek langsung di https://serabut.id/cek-status"
- Selalu natural, tidak hard-sell, selalu sertakan link langsung

## ATURAN JAWAB
- Jawab singkat — max 4–5 kalimat. Paham maksud pesan, bukan cuma formatnya.
- Jangan sebut harga yang tidak ada di daftar — arahkan ke serabut.id untuk harga terkini
- Jangan mengarang informasi
- SELALU sertakan signature di akhir jawaban

## KAPAN ESCALATE KE CS MANUSIA
Tambahkan [ESCALATE] di akhir reply jika:
- User komplain soal pembayaran yang belum selesai
- User marah atau frustrasi (simpati dulu, baru escalate)
- User minta bicara CS manusia / ketik "CS" / "hubungi manusia"
- Akun dilaporkan dibobol/diretas
- Pertanyaan tidak bisa dijawab dari info yang ada
- Pertanyaan di luar produk/layanan Serabut${panduanSection}`;
}

// ────────────────────────────────────────────────────────
//  WA NOTIFICATIONS
// ────────────────────────────────────────────────────────

// Normalisasi nomor WA ke format 62xxx (Fonnte)
// Handles: 08xxx → 628xxx, 8xxx → 628xxx, 628xxx → 628xxx
function _normalizeWA(wa) {
  if (!wa) return '';
  const digits = String(wa).replace(/\D/g, '');
  if (!digits) return '';
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('0')) return '62' + digits.slice(1);
  return '62' + digits;
}

function sendWANotification(message) {
  if (!FONNTE_TOKEN || !WA_GROUP_ID) return;
  try {
    UrlFetchApp.fetch('https://api.fonnte.com/send', {
      method: 'post',
      headers: { 'Authorization': FONNTE_TOKEN },
      payload: { target: WA_GROUP_ID, message: message },
      muteHttpExceptions: true,
    });
  } catch (e) { Logger.log('WA notif error: ' + e.message); }
}

function sendWAToGroup(message) {
  if (!FONNTE_TOKEN || !WA_GROUP_ESCALATION) {
    Logger.log('sendWAToGroup: TOKEN atau GROUP_ID kosong');
    return;
  }
  try {
    const resp = UrlFetchApp.fetch('https://api.fonnte.com/send', {
      method: 'post',
      headers: { 'Authorization': FONNTE_TOKEN },
      payload: { target: WA_GROUP_ESCALATION, message: message },
      muteHttpExceptions: true,
    });
    Logger.log('Fonnte response [' + resp.getResponseCode() + ']: ' + resp.getContentText());
  } catch (e) { Logger.log('WA group notif error: ' + e.message); }
}

function sendWAWelcome(waNumber, nama) {
  if (!FONNTE_TOKEN || !waNumber) return;
  const msg = `Halo, *${nama}*! 🎉\n\nSelamat bergabung di *Serabut Store*!\n\nAkun kamu sudah aktif. Terima kasih sudah menjadi bagian dari keluarga kami 😊\n\nYuk nikmati promo-promo eksklusif di *serabut.id* — hemat hingga 70% dari harga resmi! ✨\n\nAda pertanyaan? CS kami siap membantu kamu jam 09.00–22.00 WIB.\n\n— Tim Serabut Store 🛍️`;
  try {
    UrlFetchApp.fetch('https://api.fonnte.com/send', {
      method: 'post',
      headers: { 'Authorization': FONNTE_TOKEN },
      payload: { target: _normalizeWA(waNumber), message: msg },
      muteHttpExceptions: true,
    });
  } catch(e) { Logger.log('WA welcome error: ' + e.message); }
}

// ────────────────────────────────────────────────────────
//  BUYER NOTIFICATIONS
// ────────────────────────────────────────────────────────

// Kirim konfirmasi order baru ke buyer via WA + email
// items: [{produk, varian, masaAktif, harga}]
function sendBuyerOrderConfirm(waNumber, email, nama, orderId, items, total) {
  const itemLines = items.map((it, i) => {
    let line = `[${i+1}] *${it.produk}*`;
    if (it.varian && it.varian !== '-') line += ` - ${it.varian}`;
    if (it.masaAktif && it.masaAktif !== '-') line += ` (${it.masaAktif})`;
    line += `\n    Rp ${Number(it.harga).toLocaleString('id-ID')}`;
    return line;
  }).join('\n');

  const waMsg = `Halo Kak *${nama}*! 👋\n\nPesanan kamu di *Serabut Store* sudah kami terima dan sedang kami proses! ✅\n\nBerikut detail pesanan kamu:\n\n*Order ID: ${orderId}*\n────────────────────\n${itemLines}\n────────────────────\nTotal: *Rp ${Number(total).toLocaleString('id-ID')}*\n\nMohon tunggu ya! 🙏\n\n— Serabut Store`;

  if (FONNTE_TOKEN && waNumber) {
    try {
      UrlFetchApp.fetch('https://api.fonnte.com/send', {
        method: 'post',
        headers: { 'Authorization': FONNTE_TOKEN },
        payload: { target: _normalizeWA(waNumber), message: waMsg },
        muteHttpExceptions: true,
      });
    } catch(e) { Logger.log('WA buyer confirm error: ' + e.message); }
  }

  if (email) {
    try {
      GmailApp.sendEmail(email,
        `Pesanan #${orderId} Diterima — Serabut Store`,
        `Halo ${nama},\n\nTerima kasih sudah order! Order ID kamu: ${orderId}\nTotal: Rp ${Number(total).toLocaleString('id-ID')}\n\nTim kami akan segera menghubungi kamu.\n\n— Serabut Store`,
        { name: 'No Reply - Serabut Store', htmlBody: buildOrderConfirmEmailHTML(nama, orderId, items, total) }
      );
    } catch(e) { Logger.log('Email buyer confirm error: ' + e.message); }
  }
}

// Kirim notif perubahan status ke buyer (Aktif / Selesai)
function sendBuyerStatusNotif(waNumber, email, nama, orderId, produk, varian, masaAktif, harga, emailAktif, status) {
  const statusLabel = status === 'Aktif' ? 'Aktif' : 'Selesai';
  const produkLine  = `${produk}${varian && varian!=='-' ? ' - '+varian : ''}${masaAktif && masaAktif!=='-' ? ' ('+masaAktif+')' : ''}`;
  const waMsg = `Halo *${nama}*!\n\nPesanan kamu sudah diproses!\n\n*Order ID: ${orderId}*\n*Produk: ${produkLine}*\nStatus: *${statusLabel}*\n${emailAktif && emailAktif!=='-' ? '\nEmail Aktif: '+emailAktif : ''}\n\nCek detail di profil: https://serabut.id\n\nAda pertanyaan? Chat kami di +62 888 1500 555\n\n— Tim Serabut Store`;

  if (FONNTE_TOKEN && waNumber) {
    try {
      UrlFetchApp.fetch('https://api.fonnte.com/send', {
        method: 'post',
        headers: { 'Authorization': FONNTE_TOKEN },
        payload: { target: _normalizeWA(waNumber), message: waMsg },
        muteHttpExceptions: true,
      });
    } catch(e) { Logger.log('WA status notif error: ' + e.message); }
  }

  if (email) {
    try {
      GmailApp.sendEmail(email,
        `Pesanan #${orderId} ${status} — Serabut Store`,
        `Halo ${nama},\n\nPesanan kamu sudah ${status}!\nOrder ID: ${orderId}\nProduk: ${produkLine}\n${emailAktif && emailAktif!=='-' ? 'Email Aktif: '+emailAktif+'\n' : ''}\nCek detail di: https://serabut.id\n\n— Serabut Store`,
        { name: 'No Reply - Serabut Store', htmlBody: buildStatusEmailHTML(nama, orderId, produkLine, harga, emailAktif, status) }
      );
    } catch(e) { Logger.log('Email status notif error: ' + e.message); }
  }
}

// ── Shared email shell ──
function _emailShell(heroLabel, heroTitle, bodyHtml) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
  <tr><td style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="background:#DC2626;padding:24px 32px 20px">
        <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#fca5a5;letter-spacing:1.5px;text-transform:uppercase">${heroLabel}</p>
        <p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">${heroTitle}</p>
      </td></tr>
      <tr><td style="padding:28px 32px 24px">${bodyHtml}</td></tr>
      <tr><td style="border-top:1px solid #f1f5f9"></td></tr>
      <tr><td style="background:#f8fafc;padding:16px 32px;border-radius:0 0 12px 12px">
        <p style="margin:0;font-size:12px;color:#64748b;line-height:1.7">Salam hangat,<br><strong style="color:#111827">Tim Serabut Store</strong><br><a href="https://serabut.id" style="color:#DC2626;text-decoration:none">serabut.id</a></p>
      </td></tr>
    </table>
  </td></tr>
  <tr><td style="padding:16px 0 0;text-align:center">
    <p style="margin:0;font-size:11px;color:#cbd5e1">Email ini dikirim otomatis oleh sistem Serabut Store &middot; Jangan balas email ini</p>
  </td></tr>
</table>
</td></tr>
</table>
</body></html>`;
}

function buildOrderConfirmEmailHTML(nama, orderId, items, total) {
  const rows = items.map((it, i) => {
    const produkStr = `${it.produk}${it.varian && it.varian!=='-' ? ' – '+it.varian : ''}`;
    const dur       = it.masaAktif && it.masaAktif!=='-' ? ` <span style="color:#6b7280;font-size:12px">(${it.masaAktif})</span>` : '';
    return `<tr><td style="padding:9px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">${i+1}. ${produkStr}${dur}</td><td style="padding:9px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;font-weight:700;text-align:right">Rp ${Number(it.harga).toLocaleString('id-ID')}</td></tr>`;
  }).join('');
  const body = `<p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#111827">Halo, <span style="color:#DC2626">${nama}</span></p>
    <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6">Terima kasih sudah order di Serabut Store. Berikut ringkasan pesanan kamu.</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px">${rows}
      <tr><td style="padding:12px 0 0;font-size:14px;font-weight:700;color:#111827">Total</td><td style="padding:12px 0 0;font-size:15px;font-weight:800;color:#DC2626;text-align:right">Rp ${Number(total).toLocaleString('id-ID')}</td></tr>
    </table>
    <p style="margin:0 0 20px;font-size:13px;color:#92400e;background:#fef3c7;border-radius:8px;padding:12px 14px;line-height:1.5">Tim kami akan segera memproses pesanan kamu. Estimasi: <strong>1&ndash;2 jam</strong> kerja.</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr><td style="border-radius:8px;background:#DC2626">
      <a href="https://serabut.id" target="_blank" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">Cek Status Pesanan &rarr;</a>
    </td></tr></table>
    <p style="margin:0;font-size:11px;color:#94a3b8">Ada pertanyaan? Hubungi CS kami di <a href="https://wa.me/628881500555" style="color:#2563eb">+62 888 1500 555</a> (09.00&ndash;22.00 WIB)</p>`;
  return _emailShell('Konfirmasi Pesanan', orderId, body);
}

function buildStatusEmailHTML(nama, orderId, produkLine, harga, emailAktif, status) {
  const headline = status === 'Aktif' ? 'Pesanan Aktif' : 'Pesanan Selesai';
  const emailRow = emailAktif && emailAktif !== '-'
    ? `<tr style="background:#f0fdf4"><td style="padding:9px 14px;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb">Email Aktif</td><td style="padding:9px 14px;font-size:13px;color:#059669;font-weight:700;border-bottom:1px solid #e5e7eb">${emailAktif}</td></tr>` : '';
  const body = `<p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#111827">Halo, <span style="color:#DC2626">${nama}</span></p>
    <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6">Pesanan kamu sudah diproses!</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:24px">
      <tr style="background:#f8fafc"><td style="padding:9px 14px;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb" width="35%">Order ID</td><td style="padding:9px 14px;font-size:14px;color:#DC2626;font-weight:800;border-bottom:1px solid #e5e7eb">${orderId}</td></tr>
      <tr><td style="padding:9px 14px;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb">Produk</td><td style="padding:9px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb">${produkLine}</td></tr>
      <tr style="background:#f8fafc"><td style="padding:9px 14px;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb">Harga</td><td style="padding:9px 14px;font-size:14px;color:#111827;font-weight:700;border-bottom:1px solid #e5e7eb">Rp ${Number(harga).toLocaleString('id-ID')}</td></tr>
      <tr${emailAktif && emailAktif!=='-' ? '' : ''}><td style="padding:9px 14px;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px${emailAktif && emailAktif!=='-' ? ';border-bottom:1px solid #e5e7eb' : ''}">Status</td><td style="padding:9px 14px;font-size:14px;font-weight:700;color:${status==='Aktif'?'#059669':'#2563eb'}${emailAktif && emailAktif!=='-' ? ';border-bottom:1px solid #e5e7eb' : ''}">${status}</td></tr>
      ${emailRow}
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr><td style="border-radius:8px;background:#DC2626">
      <a href="https://serabut.id" target="_blank" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">Lihat Detail di Profil &rarr;</a>
    </td></tr></table>
    <p style="margin:0;font-size:11px;color:#94a3b8">Ada pertanyaan? <a href="https://wa.me/628881500555" style="color:#2563eb">+62 888 1500 555</a> (09.00&ndash;22.00 WIB)</p>`;
  return _emailShell('Update Status Pesanan', headline, body);
}


// ────────────────────────────────────────────────────────
//  EMAIL
// ────────────────────────────────────────────────────────
function sendOTPEmail(email, nama, otp) {
  const subject  = `Kode OTP Serabut Store ${otp}`;
  const htmlBody = buildOTPEmailHTML(nama, otp);
  GmailApp.sendEmail(email, subject,
    `Kode OTP kamu: ${otp}\nBerlaku ${OTP_EXPIRY_MIN} menit.\nJangan bagikan kode ini kepada siapapun.`,
    { name: 'No Reply - Serabut Store', htmlBody }
  );
}

function buildOTPEmailHTML(nama, otp) {
  const digits = String(otp).split('').map(d =>
    `<td style="padding:0 4px"><div style="width:44px;height:56px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:10px;text-align:center;line-height:56px;font-size:26px;font-weight:800;color:#111827;font-family:'Courier New',Courier,monospace">${d}</div></td>`
  ).join('');
  const body = `<p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#111827">Halo, <span style="color:#DC2626">${nama}</span></p>
    <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6">Masukkan kode berikut untuk menyelesaikan verifikasi akun kamu di Serabut Store.</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 12px"><tr>${digits}</tr></table>
    <p style="margin:0 0 20px;font-size:12px;color:#94a3b8">Berlaku <strong style="color:#111827">${OTP_EXPIRY_MIN} menit</strong> &nbsp;&middot;&nbsp; Jangan bagikan ke siapapun</p>
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">Tidak mendaftar di Serabut Store? Abaikan email ini.</p>`;
  return _emailShell('Verifikasi Akun', 'Kode OTP Kamu', body);
}

function sendWelcomeEmail(email, nama) {
  try {
    const subject  = `Akun Serabut Store kamu sudah aktif`;
    const htmlBody = buildWelcomeEmailHTML(nama);
    GmailApp.sendEmail(email, subject,
      `Halo ${nama}! Akun kamu sudah aktif. Terima kasih sudah bergabung — yuk nikmati promo eksklusif di serabut.id`,
      { name: 'No Reply - Serabut Store', htmlBody }
    );
  } catch(e) { Logger.log('Welcome email error: ' + e.message); }
}

function buildWelcomeEmailHTML(nama) {
  const body = `<p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#111827">Halo, <span style="color:#DC2626">${nama}</span></p>
    <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6">Akun kamu di <strong style="color:#111827">Serabut Store</strong> telah berhasil diverifikasi dan siap digunakan.</p>
    <table cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr><td style="border-radius:8px;background:#DC2626">
      <a href="https://serabut.id" target="_blank" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">Kunjungi serabut.id &rarr;</a>
    </td></tr></table>
    <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6">Ada pertanyaan? Hubungi CS kami di <a href="https://wa.me/628881500555" style="color:#2563eb">+62 888 1500 555</a> (09.00&ndash;22.00 WIB)</p>`;
  return _emailShell('Selamat Datang', 'Akun Kamu Sudah Aktif', body);
}

// ────────────────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────────────────
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getOTPExpiry() {
  return formatJkt(new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000), 'yyyy-MM-dd HH:mm:ss');
}

function formatJkt(date, fmt) {
  return Utilities.formatDate(date, 'Asia/Jakarta', fmt);
}

// Auto-fix: jika Google Sheets salah parse DD/MM sebagai MM/DD (date jadi future > 7 hari)
// swap month↔day agar kembali ke tanggal yang benar
function _fixDateSwap(d) {
  if (!(d instanceof Date)) return d;
  const now = new Date();
  const sevenDays = 7 * 24 * 3600 * 1000;
  if (d.getTime() - now.getTime() <= sevenDays) return d; // tanggal wajar, tidak perlu fix
  // Coba swap: gunakan getDate() sebagai bulan dan getMonth()+1 sebagai tanggal
  const swapped = new Date(d.getFullYear(), d.getDate() - 1, d.getMonth() + 1, d.getHours(), d.getMinutes(), d.getSeconds());
  // Hanya pakai hasil swap jika lebih masuk akal (tidak future > 7 hari)
  if (swapped.getTime() - now.getTime() <= sevenDays) return swapped;
  return d; // swap juga tidak masuk akal, kembalikan aslinya
}

// Parse "dd/MM/yyyy HH:mm" (WIB) → UTC Date
function _parseTanggalGAS(str) {
  if (!str) return null;
  const parts = String(str).trim().split(' ');
  const dp = (parts[0] || '').split('/');
  const tp = (parts[1] || '00:00').split(':');
  if (dp.length < 3 || !dp[2]) return null;
  // WIB = UTC+7
  return new Date(Date.UTC(+dp[2], +dp[1] - 1, +dp[0], +tp[0] - 7, +tp[1] || 0));
}

// Signature helper reusable untuk iPaymu API calls
function _iPaymuRequest(endpoint, body) {
  const props   = PropertiesService.getScriptProperties();
  const va      = (props.getProperty('IPAYMU_VA')           || '').trim();
  const apiKey  = (props.getProperty('IPAYMU_API_KEY')      || '').trim();
  const proxyUrl    = (props.getProperty('IPAYMU_PROXY_URL')    || '').trim();
  const proxySecret = (props.getProperty('IPAYMU_PROXY_SECRET') || '').trim();
  if (!va || !apiKey) return { success: false, error: 'iPaymu belum dikonfigurasi' };

  const bodyStr  = JSON.stringify(body);
  const ts       = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMddHHmmss');
  function _hex(arr) { return arr.map(function(b){ return ((b & 0xff) < 16 ? '0' : '') + (b & 0xff).toString(16); }).join(''); }
  const bodyHash = _hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bodyStr));
  const sts      = 'POST:' + va + ':' + bodyHash + ':' + apiKey;
  const sig      = _hex(Utilities.computeHmacSha256Signature(sts, apiKey));

  const useProxy = !!(proxyUrl && proxySecret);
  const fetchUrl = useProxy ? proxyUrl : endpoint;
  const headers  = { 'Content-Type': 'application/json', 'Accept': 'application/json', 'va': va, 'signature': sig, 'timestamp': ts };
  if (useProxy) { headers['X-Proxy-Secret'] = proxySecret; headers['X-Target-URL'] = endpoint; }

  Logger.log('_iPaymuRequest: ' + (useProxy ? 'via CF proxy → ' : 'direct → ') + endpoint);
  const resp = UrlFetchApp.fetch(fetchUrl, { method: 'post', headers: headers, payload: bodyStr, muteHttpExceptions: true });
  return JSON.parse(resp.getContentText());
}

// Jalankan di GAS Editor untuk cek IP outgoing CF Worker → daftarkan ke iPaymu
function checkCFWorkerIP() {
  const props       = PropertiesService.getScriptProperties();
  const proxyUrl    = (props.getProperty('IPAYMU_PROXY_URL')    || '').trim();
  const proxySecret = (props.getProperty('IPAYMU_PROXY_SECRET') || '').trim();
  if (!proxyUrl || !proxySecret) { Logger.log('ERROR: Set IPAYMU_PROXY_URL dan IPAYMU_PROXY_SECRET dulu'); return; }

  // Kirim tanpa X-Target-URL → Worker return IP outgoing-nya
  const resp = UrlFetchApp.fetch(proxyUrl, {
    method: 'post',
    headers: { 'Content-Type': 'application/json', 'X-Proxy-Secret': proxySecret },
    payload: '{}',
    muteHttpExceptions: true
  });
  Logger.log('=== IP CF Worker (daftarkan ke iPaymu) ===');
  Logger.log(resp.getContentText());
  Logger.log('==========================================');
}

function _parseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
}

// ============================================================
//  XENDIT PAYMENT INTEGRATION
//  Script Properties: XENDIT_API_KEY
// ============================================================

function _xenditRequest(endpoint, body) {
  const props  = PropertiesService.getScriptProperties();
  const apiKey = (props.getProperty('XENDIT_API_KEY') || '').trim();
  if (!apiKey) return { success: false, error: 'XENDIT_API_KEY belum dikonfigurasi' };

  const auth    = Utilities.base64Encode(apiKey + ':');
  const isGet   = body === null || body === undefined;
  const options = {
    method: isGet ? 'get' : 'post',
    headers: {
      'Authorization': 'Basic ' + auth,
      'Content-Type':  'application/json',
    },
    muteHttpExceptions: true
  };
  if (!isGet) options.payload = JSON.stringify(body);

  const resp   = UrlFetchApp.fetch('https://api.xendit.co' + endpoint, options);
  const result = JSON.parse(resp.getContentText());
  Logger.log('Xendit [' + resp.getResponseCode() + ']: ' + JSON.stringify(result).substring(0, 300));
  return result;
}

// Buat invoice/payment link Xendit
// items: [{produk, varian, masaAktif, harga, qty}]
function xenditGetBalance(params) {
  const authErr = _requireAdmin(params.adminEmail, params.adminToken);
  if (authErr) return { success: false, error: authErr };
  const res = _xenditRequest('/balance', null);
  if (res && typeof res.balance !== 'undefined') return { success: true, balance: res.balance };
  return { success: false, error: res.message || 'Gagal ambil saldo' };
}

function xenditGetTransactions(params) {
  const authErr = _requireAdmin(params.adminEmail, params.adminToken);
  if (authErr) return { success: false, error: authErr };
  const res = _xenditRequest('/transactions?limit=20', null);
  if (res && Array.isArray(res.data)) {
    return { success: true, transactions: res.data.map(t => ({
      id:        t.id,
      type:      t.type,
      status:    t.status,
      channel:   t.channel_code || t.settlement_status || '-',
      amount:    t.amount,
      net:       t.net_amount,
      fee:       t.fee,
      reference: t.reference_id || t.external_id || '-',
      created:   t.created,
    }))};
  }
  return { success: false, error: 'Gagal ambil transaksi' };
}

function createXenditInvoice({ orderId, items, buyerName, buyerEmail, buyerPhone, total }) {
  const xenItems = items.map(it => ({
    name:     it.produk + (it.varian && it.varian!=='-' ? ' - '+it.varian : '') + (it.masaAktif && it.masaAktif!=='-' ? ' ('+it.masaAktif+')' : ''),
    quantity: it.qty || 1,
    price:    it.harga,
    category: 'Digital Product',
  }));

  const body = {
    external_id:          orderId,
    amount:               total,
    description:          'Serabut Store - Order ' + orderId,
    invoice_duration:     86400, // 24 jam
    customer: {
      given_names: buyerName,
      email:       buyerEmail || undefined,
      mobile_number: buyerPhone ? '+' + String(buyerPhone).replace(/^\+/,'') : undefined,
    },
    customer_notification_preference: {
      invoice_created:  buyerEmail ? ['email','whatsapp'] : ['whatsapp'],
      invoice_reminder: buyerEmail ? ['email','whatsapp'] : ['whatsapp'],
      invoice_paid:     buyerEmail ? ['email','whatsapp'] : ['whatsapp'],
    },
    success_redirect_url: 'https://serabut.id/pesanan/' + orderId + '?payment=success',
    failure_redirect_url: 'https://serabut.id/pesanan/' + orderId + '?payment=cancel',
    currency: 'IDR',
    items:    xenItems,
    fees: [],
  };

  const result = _xenditRequest('/v2/invoices', body);
  if (result && result.invoice_url) {
    return { success: true, paymentUrl: result.invoice_url, invoiceId: result.id, expiryDate: result.expiry_date };
  }

  // Handle DUPLICATE_ERROR: ambil invoice yang sudah ada dan masih aktif (PENDING)
  if (result && (result.error_code === 'DUPLICATE_ERROR' || (result.message && result.message.toLowerCase().includes('duplicate')))) {
    try {
      const existing = _xenditRequest('/v2/invoices?external_id=' + encodeURIComponent(body.external_id), null);
      const invoices = Array.isArray(existing) ? existing : (existing ? [existing] : []);
      for (const inv of invoices) {
        if (String(inv.status || '').toUpperCase() === 'PENDING' && inv.invoice_url) {
          Logger.log('createXenditInvoice: reuse existing PENDING invoice for ' + body.external_id);
          return { success: true, paymentUrl: inv.invoice_url, invoiceId: inv.id, expiryDate: inv.expiry_date };
        }
      }
      // Semua invoice sudah expired/paid — buat dengan external_id baru (append timestamp)
      const retryId = body.external_id + '-R' + new Date().getTime().toString().slice(-6);
      const retryBody = Object.assign({}, body, { external_id: retryId });
      const retry = _xenditRequest('/v2/invoices', retryBody);
      if (retry && retry.invoice_url) {
        return { success: true, paymentUrl: retry.invoice_url, invoiceId: retry.id };
      }
      return { success: false, error: retry.message || 'Gagal membuat ulang invoice Xendit' };
    } catch(e) {
      Logger.log('createXenditInvoice retry error: ' + e.message);
    }
  }

  return { success: false, error: result.message || result.error_code || 'Gagal membuat invoice Xendit' };
}

// Validasi callback webhook dari Xendit
function xenditWebhookValid(callbackToken, payloadTimestamp) {
  const props = PropertiesService.getScriptProperties();
  const token = (props.getProperty('XENDIT_WEBHOOK_TOKEN') || '').trim();
  // [SEC-08] Tolak jika XENDIT_WEBHOOK_TOKEN belum diset — jangan pernah skip validasi
  if (!token) {
    Logger.log('[SEC] PERINGATAN: XENDIT_WEBHOOK_TOKEN belum diset di Script Properties! Webhook ditolak.');
    return false;
  }
  if (callbackToken !== token) return false;
  return true;
}

// ────────────────────────────────────────────────────────
//  XENDIT WEBHOOK CALLBACK
// ────────────────────────────────────────────────────────
function xenditCallback(params, e) {
  // Validasi: GAS tidak expose HTTP headers, jadi pakai query param ?token=... di webhook URL
  // Set webhook URL di Xendit: https://script.google.com/.../exec?action=xenditCallback&token=WEBHOOK_TOKEN
  try {
    // Baca token dari query param (direct) atau body (_xenditToken dari CF Worker proxy)
    const qToken = (e && e.parameter && e.parameter.token) || params._xenditToken || '';
    // [SEC-08] Pass timestamp dari payload untuk replay protection
    if (!xenditWebhookValid(qToken, params.updated || params.created)) {
      Logger.log('xenditCallback: invalid token');
      return { success: false, error: 'Unauthorized' };
    }
  } catch(ex) {
    Logger.log('xenditCallback token check error: ' + ex.message);
  }

  // Xendit sends `status` field: PAID, EXPIRED, PENDING
  const status   = String(params.status || '').toUpperCase();
  const extId    = String(params.external_id || params.id || '').trim();
  const method   = String(params.payment_method || params.payment_channel || 'Xendit').trim();

  if (!extId) return { success: false, error: 'external_id kosong' };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: false, error: 'Orders sheet not found' };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const idCol   = headers.indexOf('order id');
  const stCol   = headers.indexOf('status');
  const pmCol   = headers.indexOf('payment method') >= 0 ? headers.indexOf('payment method') : -1;
  const psCol   = headers.indexOf('payment status') >= 0 ? headers.indexOf('payment status') : -1;

  if (idCol < 0 || stCol < 0) return { success: false, error: 'Kolom tidak ditemukan' };

  let found = false;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idCol]).trim() !== extId) continue;
    found = true;
    const curStatus = String(data[i][stCol]).trim();
    Logger.log('xenditCallback: orderId=' + extId + ' status=' + status + ' curStatus=' + curStatus);

    if (status === 'PAID') {
      // [SEC-04] Idempotency: skip jika order sudah bertanda Lunas
      if (psCol >= 0 && String(data[i][psCol]).trim() === 'Lunas') {
        Logger.log('xenditCallback: already paid (Lunas), skip: ' + extId);
        break;
      }
      // Update status → Diproses jika masih Pending
      if (curStatus === 'Pending' || curStatus === 'Dibatalkan') {
        sheet.getRange(i + 1, stCol + 1).setValue('Diproses');
      }
      if (pmCol >= 0) sheet.getRange(i + 1, pmCol + 1).setValue(method);
      if (psCol >= 0) sheet.getRange(i + 1, psCol + 1).setValue('Lunas');
      SpreadsheetApp.flush();

      // Hanya kirim notif jika baru bayar (was Pending)
      if (curStatus === 'Pending') {
        const buyerNama  = String(data[i][headers.indexOf('nama')] || '');
        const buyerEmail = String(data[i][headers.indexOf('email')] || '');
        const buyerWa    = String(data[i][headers.indexOf('no wa')] || '');
        const produk     = String(data[i][headers.indexOf('produk')] || '');
        const varian     = String(data[i][headers.indexOf('varian')] || '-');
        const masaAktif  = String(data[i][headers.indexOf('masa aktif')] || '-');
        const harga      = data[i][headers.indexOf('harga')] || 0;
        const tanggal    = String(data[i][headers.indexOf('tanggal')] || '-');

        // WA group notif
        const groupMsg = `✅ *PEMBAYARAN DITERIMA*\nOrder ID: *${extId}*\nProduk: ${produk} ${varian!=='-'?'- '+varian:''} ${masaAktif!=='-'?'('+masaAktif+')':''}\nPembeli: ${buyerNama}\nMetode: ${method}\nTotal: Rp ${Number(harga).toLocaleString('id-ID')}\nTanggal: ${tanggal}`;
        sendWAToGroup(groupMsg);

        // WA + email ke buyer
        sendBuyerOrderConfirmed(buyerNama, buyerEmail, buyerWa ? _normalizeWA(buyerWa) : '', extId, produk, varian, masaAktif, harga, method, tanggal);
      }
    } else if (status === 'EXPIRED') {
      if (curStatus === 'Pending') {
        sheet.getRange(i + 1, stCol + 1).setValue('Dibatalkan');
        if (psCol >= 0) sheet.getRange(i + 1, psCol + 1).setValue('Expired');
        SpreadsheetApp.flush();
      }
    }
    break;
  }

  if (!found) Logger.log('xenditCallback: order tidak ditemukan: ' + extId);
  return { success: true };
}

// Helper kirim notif ke buyer setelah pembayaran dikonfirmasi
function sendBuyerOrderConfirmed(nama, email, wa, orderId, produk, varian, masaAktif, harga, method, tanggal) {
  const produkStr = produk + (varian && varian!=='-' ? ' - '+varian : '') + (masaAktif && masaAktif!=='-' ? ' ('+masaAktif+')' : '');
  const hargaStr  = 'Rp ' + Number(harga).toLocaleString('id-ID');
  const waMsg = `Halo *${nama}*! 🎉\n\nPembayaran kamu sudah kami terima!\n\n*Detail Order:*\nOrder ID: ${orderId}\nProduk: ${produkStr}\nTotal: ${hargaStr}\nMetode: ${method}\nTanggal: ${tanggal}\n\nTim kami sedang memproses pesananmu. Estimasi aktivasi: *5–30 menit*.\n\nTerima kasih sudah berbelanja di Serabut Store! 🙏`;
  if (wa) _sendWA(wa, waMsg);
  if (email) {
    const subject  = `[Serabut Store] Pembayaran Diterima — ${orderId}`;
    const bodyHtml = `<p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#111827">Halo, <span style="color:#DC2626">${nama}</span></p>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6">Pembayaran kamu sudah kami terima. Berikut detail pesanan kamu.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;margin-bottom:20px">
        <tr style="background:#f8fafc"><td style="padding:9px 14px;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb" width="35%">Order ID</td><td style="padding:9px 14px;font-size:14px;color:#DC2626;font-weight:800;border-bottom:1px solid #e5e7eb">${orderId}</td></tr>
        <tr><td style="padding:9px 14px;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb">Produk</td><td style="padding:9px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb">${produkStr}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:9px 14px;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb">Total</td><td style="padding:9px 14px;font-size:14px;color:#111827;font-weight:700;border-bottom:1px solid #e5e7eb">${hargaStr}</td></tr>
        <tr><td style="padding:9px 14px;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid #e5e7eb">Metode</td><td style="padding:9px 14px;font-size:13px;color:#374151;border-bottom:1px solid #e5e7eb">${method}</td></tr>
        <tr style="background:#f8fafc"><td style="padding:9px 14px;font-size:12px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:.5px">Tanggal</td><td style="padding:9px 14px;font-size:13px;color:#374151">${tanggal}</td></tr>
      </table>
      <p style="margin:0 0 20px;font-size:13px;color:#92400e;background:#fef3c7;border-radius:8px;padding:12px 14px;line-height:1.5">Tim kami sedang memproses pesanan kamu. Estimasi aktivasi: <strong>5&ndash;30 menit</strong>.</p>
      <table cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr><td style="border-radius:8px;background:#DC2626">
        <a href="https://serabut.id" target="_blank" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">Cek Status Pesanan &rarr;</a>
      </td></tr></table>
      <p style="margin:0;font-size:11px;color:#94a3b8">Ada pertanyaan? <a href="https://wa.me/628881500555" style="color:#2563eb">+62 888 1500 555</a> (09.00&ndash;22.00 WIB)</p>`;
    try { GmailApp.sendEmail(email, subject, '', { htmlBody: _emailShell('Konfirmasi Pembayaran', 'Pembayaran Diterima', bodyHtml), name: 'No Reply - Serabut Store' }); } catch(ex) { Logger.log('sendBuyerOrderConfirmed email error: ' + ex.message); }
  }
}

// Debug raw response Xendit
function debugXenditRaw() {
  const props  = PropertiesService.getScriptProperties();
  const apiKey = (props.getProperty('XENDIT_API_KEY') || '').trim();
  Logger.log('API Key ada: ' + (apiKey ? 'YA (' + apiKey.substring(0,20) + '...)' : 'TIDAK'));

  const auth = Utilities.base64Encode(apiKey + ':');
  const body = { external_id: 'debug-' + Date.now(), amount: 10000, description: 'test', currency: 'IDR' };
  const resp = UrlFetchApp.fetch('https://api.xendit.co/v2/invoices', {
    method: 'post',
    headers: { 'Authorization': 'Basic ' + auth, 'Content-Type': 'application/json' },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
  Logger.log('HTTP Code : ' + resp.getResponseCode());
  Logger.log('Response  : ' + resp.getContentText());
}

// ============================================================
//  TEST XENDIT — jalankan di GAS Editor untuk cek koneksi
// ============================================================
function testXenditConnection() {
  Logger.log('=== TEST XENDIT CONNECTION ===');
  const result = createXenditInvoice({
    orderId:    'TEST-' + Date.now().toString().slice(-6),
    items:      [{ produk: 'Microsoft Office 365', varian: 'Personal', masaAktif: '1 Tahun', harga: 35000, qty: 1 }],
    buyerName:  'Test Buyer',
    buyerEmail: 'test@serabut.id',
    buyerPhone: '6282300011736',
    total:      35000,
  });

  if (result.success) {
    Logger.log('✅ BERHASIL! Payment URL: ' + result.paymentUrl);
    Logger.log('Invoice ID  : ' + result.invoiceId);
    Logger.log('Expiry      : ' + result.expiryDate);
  } else {
    Logger.log('❌ GAGAL: ' + result.error);
  }
  Logger.log('=============================');
}

// ────────────────────────────────────────────────────────
//  IPAYMU ADMIN APIs — balance, history, cek transaksi
// ────────────────────────────────────────────────────────
function iPaymuAdminGetBalance(params) {
  const authErr = _requireAdmin(params.adminEmail, params.adminToken);
  if (authErr) return { success: false, error: authErr };
  const props = PropertiesService.getScriptProperties();
  const va    = (props.getProperty('IPAYMU_VA') || '').trim();
  if (!va) return { success: false, error: 'IPAYMU_VA belum dikonfigurasi' };
  const res = _iPaymuRequest('https://my.ipaymu.com/api/v2/balance', { account: va });
  if (Number(res.Status) === 200) {
    return { success: true, data: res.Data };
  }
  return { success: false, error: res.Message || 'Gagal cek balance' };
}

function iPaymuAdminGetHistory(params) {
  const authErr = _requireAdmin(params.adminEmail, params.adminToken);
  if (authErr) return { success: false, error: authErr };
  const props = PropertiesService.getScriptProperties();
  const va    = (props.getProperty('IPAYMU_VA') || '').trim();
  if (!va) return { success: false, error: 'IPAYMU_VA belum dikonfigurasi' };

  const body = { account: va };
  if (params.startdate) body.startdate = params.startdate;
  if (params.enddate)   body.enddate   = params.enddate;
  if (params.status !== undefined && params.status !== '') body.status = Number(params.status);
  body.page    = Number(params.page)  || 1;
  body.limit   = Number(params.limit) || 20;
  body.orderBy = params.orderBy || 'id';
  body.order   = params.order   || 'DESC';
  body.date    = params.date    || 'created_at';

  const res = _iPaymuRequest('https://my.ipaymu.com/api/v2/history', body);
  if (Number(res.Status) === 200 && res.Data) {
    const trxList   = res.Data.Transaction   || [];
    const pagination = res.Data.Pagination   || {};
    return { success: true, data: trxList, pagination };
  }
  return { success: false, error: res.Message || 'Gagal ambil history' };
}

function iPaymuAdminGetTransaction(params) {
  const authErr = _requireAdmin(params.adminEmail, params.adminToken);
  if (authErr) return { success: false, error: authErr };
  const props = PropertiesService.getScriptProperties();
  const va    = (props.getProperty('IPAYMU_VA') || '').trim();
  if (!va) return { success: false, error: 'IPAYMU_VA belum dikonfigurasi' };
  if (!params.transactionId) return { success: false, error: 'transactionId diperlukan' };

  const res = _iPaymuRequest('https://my.ipaymu.com/api/v2/transaction', {
    transactionId: params.transactionId,
    account: va
  });
  if (Number(res.Status) === 200) {
    return { success: true, data: res.Data };
  }
  return { success: false, error: res.Message || 'Transaksi tidak ditemukan' };
}

// Sync semua order Pending ke Xendit — cek invoice by external_id per orderId
function iPaymuAdminSyncOrders(params) {
  const authErr = _requireAdmin(params.adminEmail, params.adminToken);
  if (authErr) return { success: false, error: authErr };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: false, error: 'Sheet tidak ditemukan' };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(function(h){ return String(h).toLowerCase().trim(); });
  const idCol   = headers.indexOf('order id');
  const stCol   = headers.indexOf('status');
  if (idCol < 0 || stCol < 0) return { success: false, error: 'Kolom tidak ditemukan' };

  // Map kolom detail order untuk WA notif
  const namaCol  = headers.indexOf('nama');
  const waCol    = headers.indexOf('no wa');
  const prodCol  = headers.indexOf('produk');
  const varCol   = headers.indexOf('varian');
  const masCol   = headers.indexOf('masa aktif');
  const hrgCol   = headers.indexOf('harga');
  const msnCol   = headers.indexOf('nama ms');
  const usnCol   = headers.indexOf('username');
  const msemCol  = headers.indexOf('email microsoft');
  const eaCol    = headers.indexOf('email aktif');
  const erCol    = headers.indexOf('email reminder');

  // Kumpulkan orderId unik yang Pending
  const pendingIds = {};
  for (let i = 1; i < data.length; i++) {
    const st = String(data[i][stCol] || '').trim();
    if (st === 'Pending') {
      const oid = String(data[i][idCol] || '').trim();
      if (oid) pendingIds[oid] = true;
    }
  }

  const pendingCount = Object.keys(pendingIds).length;
  Logger.log('syncOrders: ' + pendingCount + ' pending orders');
  if (pendingCount === 0) return { success: true, checked: 0, updated: 0 };

  // Cek setiap orderId ke Xendit via external_id
  const paidMap = {}; // orderId → paymentMethod
  for (const orderId of Object.keys(pendingIds)) {
    try {
      const res = _xenditRequest('/v2/invoices?external_id=' + encodeURIComponent(orderId), null);
      const invoices = Array.isArray(res) ? res : [];
      for (const inv of invoices) {
        if (String(inv.status || '').toUpperCase() === 'PAID') {
          paidMap[orderId] = inv.payment_method || inv.payment_channel || 'Xendit';
          Logger.log('syncOrders: paid orderId=' + orderId + ' method=' + paidMap[orderId]);
          break;
        }
      }
    } catch(e) {
      Logger.log('syncOrders Xendit check error for ' + orderId + ': ' + e.message);
    }
  }

  Logger.log('syncOrders: paidMap = ' + JSON.stringify(paidMap));

  // Ensure payment cols exist
  let pmCol = headers.indexOf('payment method');
  let psCol = headers.indexOf('payment status');
  if (pmCol < 0) { sheet.getRange(1, headers.length + 1).setValue('Payment Method'); pmCol = headers.length; headers.push('payment method'); }
  if (psCol < 0) { sheet.getRange(1, headers.length + 1).setValue('Payment Status'); psCol = headers.length; headers.push('payment status'); }

  let updated = 0;
  for (const orderId of Object.keys(pendingIds)) {
    if (!paidMap[orderId]) continue;
    const payMethod = paidMap[orderId];
    let waNotifSent = false;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idCol]).trim() !== orderId) continue;
      const row   = data[i];
      const rowSt = String(row[stCol] || '').trim();
      if (rowSt === 'Pending' || rowSt === 'Dibatalkan') {
        sheet.getRange(i + 1, stCol + 1).setValue('Diproses');
      }
      sheet.getRange(i + 1, pmCol + 1).setValue(payMethod);
      sheet.getRange(i + 1, psCol + 1).setValue('Berhasil');

      // Kirim WA grup sekali per orderId (row pertama)
      if (!waNotifSent) {
        waNotifSent = true;
        try {
          const produk    = prodCol  >= 0 ? String(row[prodCol]  || '') : '';
          const varian    = varCol   >= 0 ? String(row[varCol]   || '-') : '-';
          const masaAktif = masCol   >= 0 ? String(row[masCol]   || '-') : '-';
          const harga     = hrgCol   >= 0 ? Number(row[hrgCol]   || 0) : 0;
          const nama      = namaCol  >= 0 ? String(row[namaCol]  || '') : '';
          const waNum     = waCol    >= 0 ? String(row[waCol]    || '') : '';
          const msNama    = msnCol   >= 0 ? String(row[msnCol]   || '') : '';
          const username  = usnCol   >= 0 ? String(row[usnCol]   || '') : '';
          const msEmail   = msemCol  >= 0 ? String(row[msemCol]  || '') : '';
          const emailAkt  = eaCol    >= 0 ? String(row[eaCol]    || '') : '';
          const emailRem  = erCol    >= 0 ? String(row[erCol]    || '') : '';

          const hargaFmt = 'Rp ' + harga.toLocaleString('id-ID');
          let detailLines = '';
          if (msNama)   detailLines += `\nNama MS: ${msNama}`;
          if (username) detailLines += `\nUsername: ${username}`;
          if (msEmail)  detailLines += `\nEmail MS: ${msEmail}`;
          if (emailAkt) detailLines += `\nEmail Aktif: ${emailAkt}`;
          if (emailRem) detailLines += `\nEmail Reminder: ${emailRem}`;

          const msg = `✅ *PEMBAYARAN BERHASIL*\n` +
            `Order ID: *${orderId}*\n` +
            `Produk: *${produk}${varian && varian!=='-' ? ' · ' + varian : ''}*\n` +
            `Durasi: ${masaAktif}\n` +
            `Total Bayar: *${hargaFmt}*\n` +
            `Metode: ${payMethod}${detailLines}\n` +
            `Nama: ${nama}\n` +
            (waNum ? `No WA: ${waNum}\n` : '') +
            `Status: *Diproses* ⚙️`;

          sendWAToGroup(msg);
        } catch(eWa) {
          Logger.log('syncOrders WA notif error: ' + eWa.message);
        }
      }
    }
    updated++;
    Logger.log('syncOrders: updated ' + orderId + ' → Diproses via ' + payMethod);
  }

  SpreadsheetApp.flush(); // pastikan semua write ter-commit sebelum return
  Logger.log('syncOrders: done. checked=' + pendingCount + ' updated=' + updated);
  return { success: true, checked: pendingCount, updated };
}

// Test helper — jalankan di GAS editor untuk debug sync
// Test kirim WA grup tanpa harus bayar — jalankan dari GAS Editor
function testWAGroupNotif() {
  const msg = `✅ *PEMBAYARAN BERHASIL* [TEST]\n` +
    `Order ID: *SRB-TEST-001*\n` +
    `Produk: *Microsoft Office 365 · Personal*\n` +
    `Durasi: 1 Tahun\n` +
    `Total Bayar: *Rp 35.000*\n` +
    `Metode: QRIS\n` +
    `Email Aktif: test@gmail.com\n` +
    `Nama: Eko Harianto\n` +
    `No WA: 628123456789\n` +
    `Status: *Diproses* ⚙️`;
  Logger.log('Mengirim test WA ke grup...');
  sendWAToGroup(msg);
  Logger.log('Selesai. Cek grup WA.');
}

// Test notif ORDER MASUK ke WAG — format sama dengan groupMsg di createOrder (UNPAID).
// Jalankan dari editor GAS untuk verifikasi token Fonnte baru + nomor sudah masuk grup.
function testOrderMasukWAG() {
  const msg = `*ORDER BARU: Microsoft Office 365 (Web)* [TEST]\n` +
    `Order ID: *SRB-TEST-002*\n` +
    `Varian: Personal\n` +
    `Durasi: 1 Tahun\n` +
    `Nama: Eko Harianto\n` +
    `Email Aktif: test@gmail.com\n` +
    `No WA: 628881700555\n` +
    `Total: Rp 35.000\n` +
    `Status: *UNPAID*`;
  Logger.log('Mengirim test order masuk ke grup...');
  sendWAToGroup(msg);
  Logger.log('Selesai. Cek grup WA — kalau tidak masuk, cek Execution log (respons Fonnte) & pastikan nomor baru sudah join grup.');
}

function testSyncOrders() {
  const props = PropertiesService.getScriptProperties();
  const va    = (props.getProperty('IPAYMU_VA') || '').trim();
  Logger.log('=== Test Sync Orders ===');
  // Step 1: history tanpa filter
  const res = _iPaymuRequest('https://my.ipaymu.com/api/v2/history', {
    account: va, page: 1, limit: 20, orderBy: 'id', order: 'DESC', date: 'created_at'
  });
  Logger.log('HTTP: ' + res.Status);
  Logger.log('Total: ' + ((res.Data || {}).Pagination || {}).total);
  const trxList = (res.Data || {}).Transaction || [];
  trxList.forEach(function(t) {
    Logger.log('Ref: ' + t.ReferenceId + ' | Status: ' + t.Status + '/' + t.StatusDesc + ' | PaidStatus: ' + t.PaidStatus + ' | Method: ' + t.PaymentMethod);
  });
}

function findColIdx(headers, keywords) {
  for (const kw of keywords) {
    const idx = headers.findIndex(h => h === kw || h.includes(kw));
    if (idx !== -1) return idx;
  }
  return -1;
}

function getVal(row, idx) {
  if (idx === -1 || idx >= row.length) return '';
  const v = row[idx];
  if (v === null || v === undefined || v === '') return '';
  return String(v).trim();
}

function getDateVal(row, idx) {
  if (idx === -1 || idx >= row.length) return '';
  const v = row[idx];
  if (!v) return '';
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Jakarta', 'dd/MM/yyyy');
  return String(v).trim();
}

function _populateDefaultSettings(sheet) {
  const defaults = [
    ['flashSale.aktif',    'true'],
    ['flashSale.produk',   'Microsoft Office 365 Family'],
    ['flashSale.varian',   '1 Tahun · 5 Devices'],
    ['flashSale.harga',    '249000'],
    ['flashSale.hargaAsli','337000'],
    ['flashSale.diskon',   '26'],
    ['flashSale.deadline', '2026-05-01T23:59:59'],
    ['hero.tagline1',      'Software Original,'],
    ['hero.tagline2',      'Harga Terjangkau'],
    ['hero.subtext',       'Microsoft Office 365, Adobe Creative Cloud, Windows & lebih banyak. Bergaransi resmi, proses kilat, hemat hingga 70%.'],
    ['hero.btn1',          'Lihat Semua Produk →'],
    ['hero.btn2',          'Cek Status Akun'],
    ['footer.desc',        'Software original terpercaya. Microsoft, Adobe, Windows & lebih banyak dengan harga terjangkau.'],
    ['footer.email',       'halo@serabut.id'],
    ['footer.phone',       '0888-150-0555'],
    ['footer.jam',         '09.00 – 22.00 WIB'],
    ['footer.copyright',   '© 2019–2026 PT Serabut Solusi Digital. Seluruh hak cipta dilindungi.'],
    ['renewal.discountPct', '10'],
    ['renewal.discountMax', '10000'],
  ];
  defaults.forEach(row => sheet.appendRow(row));
}

// ── TEST FUNCTIONS (hapus sebelum production jika perlu) ─
function testCatalog()  { Logger.log(JSON.stringify(getCatalog(), null, 2)); }
function testSettings() { Logger.log(JSON.stringify(getSettings(), null, 2)); }
function testWAGroup()  { sendWAToGroup('Test notif dari GAS v5 - ' + new Date().toLocaleString()); }
function testTokenVerify() {
  Logger.log('FONNTE_TOKEN set: ' + (FONNTE_TOKEN ? 'YES' : 'NO (set di Script Properties)'));
  Logger.log('OPENROUTER_KEY set: ' + (OPENROUTER_KEY ? 'YES' : 'NO (set di Script Properties)'));
}

// Test iPaymu menggunakan SANDBOX credentials — run dari GAS editor
// Sebelum test: set Script Properties IPAYMU_SANDBOX_VA dan IPAYMU_SANDBOX_KEY
// (daftar akun sandbox di: https://sandbox.ipaymu.com)
function testIPaymuSandbox() {
  var props     = PropertiesService.getScriptProperties();
  var va        = (props.getProperty('IPAYMU_SANDBOX_VA')  || '').trim();
  var apiKey    = (props.getProperty('IPAYMU_SANDBOX_KEY') || '').trim();

  if (!va || !apiKey) {
    Logger.log('ERROR: Set IPAYMU_SANDBOX_VA dan IPAYMU_SANDBOX_KEY di Script Properties dulu');
    Logger.log('Daftar akun sandbox di https://sandbox.ipaymu.com/register');
    return;
  }

  var body = {
    product:     ['Test Product'],
    qty:         [1],
    price:       [10000],
    returnUrl:   'https://serabut.id',
    cancelUrl:   'https://serabut.id',
    notifyUrl:   'https://serabut.id',
    referenceId: 'SANDBOX-TEST-' + Date.now(),
    buyerName:   'Test Buyer',
    buyerEmail:  'test@serabut.id',
    buyerPhone:  '08881500555'
  };

  var bodyStr   = JSON.stringify(body);
  var timestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMddHHmmss');

  function _hex(arr) {
    return arr.map(function(b){ return ((b & 0xff) < 16 ? '0' : '') + (b & 0xff).toString(16); }).join('');
  }

  var bodyHash    = _hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bodyStr));
  var toSign      = 'POST:' + va + ':' + bodyHash + ':' + apiKey;
  var signature   = _hex(Utilities.computeHmacSha256Signature(toSign, apiKey));

  Logger.log('=== iPaymu SANDBOX Test ===');
  Logger.log('VA       : ' + va);
  Logger.log('timestamp: ' + timestamp);
  Logger.log('bodyStr  : ' + bodyStr);
  Logger.log('bodyHash : ' + bodyHash);
  Logger.log('toSign   : ' + toSign);
  Logger.log('signature: ' + signature);

  var resp   = UrlFetchApp.fetch('https://sandbox.ipaymu.com/api/v2/payment', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'va': va, 'signature': signature, 'timestamp': timestamp },
    payload: bodyStr,
    muteHttpExceptions: true
  });

  Logger.log('HTTP status: ' + resp.getResponseCode());
  Logger.log('Response   : ' + resp.getContentText());
}

// Cek IP publik yang dipakai GAS saat keluar ke internet
function testGasEgressIP() {
  var resp = UrlFetchApp.fetch('https://api.ipify.org?format=json', { muteHttpExceptions: true });
  Logger.log('GAS Egress IP: ' + resp.getContentText());
}

// Test iPaymu Check Balance — run dari GAS editor
function testIPaymuBalance() {
  var props  = PropertiesService.getScriptProperties();
  var va     = (props.getProperty('IPAYMU_VA')      || '').trim();
  var apiKey = (props.getProperty('IPAYMU_API_KEY') || '').trim();
  if (!va || !apiKey) { Logger.log('ERROR: Set IPAYMU_VA dan IPAYMU_API_KEY dulu'); return; }

  var body    = { account: va };
  var bodyStr = JSON.stringify(body);
  var ts      = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMddHHmmss');
  function _hex(a) { return a.map(function(b){ return ((b&0xff)<16?'0':'')+(b&0xff).toString(16); }).join(''); }
  var hash = _hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bodyStr));
  var sig  = _hex(Utilities.computeHmacSha256Signature('POST:'+va+':'+hash+':'+apiKey, apiKey));

  var resp = UrlFetchApp.fetch('https://my.ipaymu.com/api/v2/balance', {
    method: 'post',
    headers: { 'Content-Type':'application/json','Accept':'application/json','va':va,'signature':sig,'timestamp':ts },
    payload: bodyStr,
    muteHttpExceptions: true
  });

  Logger.log('=== iPaymu Balance ===');
  Logger.log('HTTP Code: ' + resp.getResponseCode());
  Logger.log('Response : ' + resp.getContentText());
  try {
    var r = JSON.parse(resp.getContentText());
    if (Number(r.Status) === 200) {
      Logger.log('VA             : ' + r.Data.Va);
      Logger.log('Saldo Merchant : Rp ' + Number(r.Data.MerchantBalance).toLocaleString());
      Logger.log('Saldo Member   : Rp ' + Number(r.Data.MemberBalance).toLocaleString());
    } else {
      Logger.log('Error: ' + r.Message);
    }
  } catch(e) { Logger.log('Parse error: ' + e.message); }
}

// Test iPaymu History Transaction — run dari GAS editor
// Ubah startdate/enddate/status sesuai kebutuhan sebelum run
function testIPaymuHistory() {
  var props  = PropertiesService.getScriptProperties();
  var va     = (props.getProperty('IPAYMU_VA')      || '').trim();
  var apiKey = (props.getProperty('IPAYMU_API_KEY') || '').trim();
  if (!va || !apiKey) { Logger.log('ERROR: Set IPAYMU_VA dan IPAYMU_API_KEY dulu'); return; }

  // ── Sesuaikan filter di sini ──────────────────────
  var body = {
    account:   va,
    startdate: '2026-05-01',   // format YYYY-MM-DD
    enddate:   '2026-05-31',
    // status: 1,              // 0=Pending 1=Berhasil 2=Batal 3=Refund 5=Gagal 6=Berhasil(Unsettled) 7=Escrow -2=Expired
    page:      1,
    limit:     20,
    orderBy:   'id',
    order:     'DESC',
    date:      'created_at'
  };
  // ─────────────────────────────────────────────────

  var bodyStr = JSON.stringify(body);
  var ts      = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMddHHmmss');
  function _hex(a) { return a.map(function(b){ return ((b&0xff)<16?'0':'')+(b&0xff).toString(16); }).join(''); }
  var hash = _hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bodyStr));
  var sig  = _hex(Utilities.computeHmacSha256Signature('POST:'+va+':'+hash+':'+apiKey, apiKey));

  var resp = UrlFetchApp.fetch('https://my.ipaymu.com/api/v2/history', {
    method: 'post',
    headers: { 'Content-Type':'application/json','Accept':'application/json','va':va,'signature':sig,'timestamp':ts },
    payload: bodyStr,
    muteHttpExceptions: true
  });

  Logger.log('=== iPaymu History ===');
  Logger.log('HTTP Code: ' + resp.getResponseCode());
  var raw = resp.getContentText();
  Logger.log('Response : ' + raw);
  try {
    var r = JSON.parse(raw);
    if (Number(r.Status) === 200) {
      var statusMap = {'-2':'Expired','0':'Pending','1':'Berhasil','2':'Batal','3':'Refund','4':'Error','5':'Gagal','6':'Berhasil(Unsettled)','7':'Escrow'};
      var data = Array.isArray(r.Data) ? r.Data : [];
      Logger.log('Transaksi ditemukan: ' + data.length);
      data.forEach(function(trx, i) {
        var st = statusMap[String(trx.Status || trx.status)] || String(trx.Status || '-');
        Logger.log('['+( i+1)+'] ID:'+(trx.TransactionId||trx.id||'-')+
          ' | Ref:'+(trx.ReferenceId||trx.reference_id||'-')+
          ' | '+st+
          ' | Rp '+(trx.Amount||trx.amount||0)+
          ' | '+(trx.PaymentMethod||trx.Via||'-')+
          ' | '+(String(trx.CreatedAt||trx.created_at||'-').substring(0,16)));
      });
    } else {
      Logger.log('Error: ' + r.Message);
    }
  } catch(e) { Logger.log('Parse error: ' + e.message); }
}

// Test iPaymu PRODUCTION — run dari GAS editor, lihat hasil di Execution Log
function testIPaymuProduction() {
  var props   = PropertiesService.getScriptProperties();
  var va      = (props.getProperty('IPAYMU_VA')      || '').trim();
  var apiKey  = (props.getProperty('IPAYMU_API_KEY') || '').trim();

  if (!va || !apiKey) {
    Logger.log('ERROR: Set IPAYMU_VA dan IPAYMU_API_KEY di Script Properties dulu');
    return;
  }

  Logger.log('VA      : [' + va + ']');
  Logger.log('API Key : [' + apiKey + ']');

  var body = {
    product:     ['Test Office 365'],
    qty:         [1],
    price:       [35000],
    amount:      35000,
    returnUrl:   'https://serabut.id/?payment=success&orderId=TEST-001',
    cancelUrl:   'https://serabut.id/?payment=cancel&orderId=TEST-001',
    notifyUrl:   'https://serabut.id/',
    referenceId: 'TEST-' + Date.now(),
    buyerName:   'Test Buyer',
    buyerEmail:  'test@serabut.id',
    buyerPhone:  '6282300011736'
  };

  var bodyStr   = JSON.stringify(body);
  var timestamp = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyyMMddHHmmss');

  function _hex(arr) {
    return arr.map(function(b){ return ((b & 0xff) < 16 ? '0' : '') + (b & 0xff).toString(16); }).join('');
  }

  var bodyHash  = _hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, bodyStr));
  var toSign    = 'POST:' + va + ':' + bodyHash + ':' + apiKey;
  var signature = _hex(Utilities.computeHmacSha256Signature(toSign, apiKey));

  Logger.log('=== iPaymu PRODUCTION Test ===');
  Logger.log('bodyStr  : ' + bodyStr);
  Logger.log('bodyHash : ' + bodyHash);
  Logger.log('toSign   : ' + toSign);
  Logger.log('signature: ' + signature);
  Logger.log('timestamp: ' + timestamp);

  var resp = UrlFetchApp.fetch('https://my.ipaymu.com/api/v2/payment', {
    method: 'post',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json', 'va': va, 'signature': signature, 'timestamp': timestamp },
    payload: bodyStr,
    muteHttpExceptions: true
  });

  var httpCode = resp.getResponseCode();
  var rawBody  = resp.getContentText();
  Logger.log('HTTP Code: ' + httpCode);
  Logger.log('Response : ' + rawBody);

  try {
    var parsed = JSON.parse(rawBody);
    Logger.log('Status field type: ' + typeof parsed.Status + ' = ' + parsed.Status);
    Logger.log('Data.Url : ' + (parsed.Data && parsed.Data.Url ? parsed.Data.Url : 'NOT FOUND'));
    Logger.log('Message  : ' + (parsed.Message || '-'));
  } catch(e) {
    Logger.log('Parse error: ' + e.message);
  }
}

// ============================================================
//  AUTO CHECK IP GAS — jalankan via Time-driven Trigger (tiap 1 jam)
//  Setup: Apps Script Editor → Triggers → + Add Trigger
//         Function: autoCheckGASIp | Event: Time-driven | Every hour
// ============================================================
function autoCheckGASIp() {
  var props   = PropertiesService.getScriptProperties();
  var savedIp = (props.getProperty('GAS_LAST_IP') || '').trim();

  var currentIp = '';
  try {
    var resp = UrlFetchApp.fetch('https://api.ipify.org?format=json', { muteHttpExceptions: true });
    currentIp = (JSON.parse(resp.getContentText()).ip || '').trim();
  } catch(e) {
    Logger.log('autoCheckGASIp: gagal ambil IP — ' + e.message);
    return;
  }

  if (!currentIp) { Logger.log('autoCheckGASIp: IP kosong, skip'); return; }

  Logger.log('autoCheckGASIp: saved=' + savedIp + ' | current=' + currentIp);

  if (currentIp === savedIp) {
    Logger.log('autoCheckGASIp: IP tidak berubah, skip notif');
    return;
  }

  // IP berubah — simpan & kirim notif ke WA group
  props.setProperty('GAS_LAST_IP', currentIp);

  var msg = '⚠️ *[Serabut Store] IP GAS Berubah!*\n\n'
    + '🔴 IP Lama: ' + (savedIp || '(belum ada)') + '\n'
    + '🟢 IP Baru: ' + currentIp + '\n\n'
    + '📌 *Action required:*\n'
    + 'Login ke iPaymu → Pengaturan → Whitelist IP\n'
    + 'Tambahkan IP baru: *' + currentIp + '*\n'
    + 'Non-aktifkan IP lama jika sudah tidak dipakai.\n\n'
    + '⏰ ' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd/MM/yyyy HH:mm') + ' WIB';

  sendWAToGroup(msg);
  Logger.log('autoCheckGASIp: notif WA group terkirim — IP baru ' + currentIp);
}

// ============================================================
//  CEK IP ADDRESS GAS SERVER
//  Jalankan via Apps Script Editor → Run → checkGASIpAddress
//  Lihat hasilnya di Execution Log (Ctrl+Enter)
// ============================================================
function checkGASIpAddress() {
  var services = [
    'https://api.ipify.org?format=json',
    'https://api64.ipify.org?format=json',
    'https://ifconfig.me/ip',
    'https://checkip.amazonaws.com'
  ];

  Logger.log('=== CEK IP ADDRESS GAS SERVER ===');
  Logger.log('Timestamp: ' + new Date().toISOString());

  services.forEach(function(url) {
    try {
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      var body = resp.getContentText().trim();
      var ip   = body;
      try { ip = JSON.parse(body).ip || body; } catch(e) {}
      Logger.log(url.split('/')[2] + ' → IP: ' + ip);
    } catch(e) {
      Logger.log(url.split('/')[2] + ' → ERROR: ' + e.message);
    }
  });

  Logger.log('=================================');
  Logger.log('Daftarkan semua IP di atas ke whitelist iPaymu:');
  Logger.log('Dashboard iPaymu → Pengaturan → Whitelist IP');
}


// ════════════════════════════════════════════════════════
//  REVIEWS SYSTEM
// ════════════════════════════════════════════════════════

// ── Helper: init Reviews sheet ──
function _ensureReviewsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_REVIEWS);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_REVIEWS);
    sheet.appendRow(['Review ID','Tanggal','Order ID','Email','Nama Tampil','Produk','Varian','Rating','Komentar','Published','Reminder Sent','Likes']);
    sheet.getRange(1, 1, 1, 12).setFontWeight('bold');
    sheet.setFrozenRows(1);
  } else {
    // Pastikan kolom Likes ada
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => String(h).toLowerCase().trim());
    if (!headers.includes('likes')) {
      sheet.getRange(1, sheet.getLastColumn() + 1).setValue('Likes');
    }
  }
  return sheet;
}

// ── GET REVIEWS (public) — per produk, only published ──
function getReviews(produk) {
  const sheet = _ensureReviewsSheet();
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return { success: true, data: [] };

  const headers   = data[0].map(h => String(h).toLowerCase().trim());
  const cId       = _colIndex(headers, 'review id');
  const cTgl      = _colIndex(headers, 'tanggal');
  const cNama     = _colIndex(headers, 'nama tampil');
  const cProduk   = _colIndex(headers, 'produk');
  const cVarian   = _colIndex(headers, 'varian');
  const cRating   = _colIndex(headers, 'rating');
  const cKomentar = _colIndex(headers, 'komentar');
  const cPub      = _colIndex(headers, 'published');
  const cLikes    = _colIndex(headers, 'likes');

  const normStr = s => String(s || '').trim().toLowerCase();
  const reviews = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[cId]) continue;
    const pub = row[cPub];
    if (pub !== true && String(pub).toUpperCase() !== 'TRUE') continue;
    if (produk && normStr(row[cProduk]) !== normStr(produk)) continue;

    const tgl = row[cTgl] instanceof Date
      ? Utilities.formatDate(row[cTgl], 'Asia/Jakarta', 'dd MMM yyyy')
      : String(row[cTgl] || '').trim();

    reviews.push({
      id:       String(row[cId]),
      tgl,
      nama:     String(row[cNama] || 'Pengguna'),
      produk:   String(row[cProduk] || ''),
      varian:   String(row[cVarian] || ''),
      rating:   Number(row[cRating]) || 5,
      komentar: String(row[cKomentar] || ''),
      likes:    cLikes >= 0 ? (Number(row[cLikes]) || 0) : 0,
    });
  }

  // Urutan: rating tertinggi → likes terbanyak → terbaru
  reviews.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (b.likes  !== a.likes)  return b.likes  - a.likes;
    return b.id.localeCompare(a.id);
  });
  return { success: true, data: reviews };
}

// ── GET BUYER'S OWN REVIEWS (semua review milik buyer ini) ──
function getBuyerReviews({ sessionToken, email }) {
  if (!email) return { success: false, error: 'Email diperlukan' };
  const sheet = _ensureReviewsSheet();
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return { success: true, data: [] };

  const headers  = data[0].map(h => String(h).toLowerCase().trim());
  const cId      = _colIndex(headers, 'review id');
  const cTgl     = _colIndex(headers, 'tanggal');
  const cOid     = _colIndex(headers, 'order id');
  const cEmail   = _colIndex(headers, 'email');
  const cRating  = _colIndex(headers, 'rating');
  const cKomen   = _colIndex(headers, 'komentar');
  const cAnonim  = _colIndex(headers, 'nama tampil'); // 'Anonim' → anonim=true

  const emailNorm = String(email).toLowerCase().trim();
  const reviews   = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[cId]) continue;
    if (String(row[cEmail] || '').toLowerCase().trim() !== emailNorm) continue;

    const tgl = row[cTgl] instanceof Date
      ? Utilities.formatDate(row[cTgl], 'Asia/Jakarta', 'yyyy-MM-dd HH:mm')
      : String(row[cTgl] || '').trim();

    reviews.push({
      reviewId:    String(row[cId]),
      orderId:     String(row[cOid] || ''),
      rating:      Number(row[cRating]) || 5,
      komentar:    String(row[cKomen] || ''),
      anonim:      String(row[cAnonim] || '') === 'Anonim',
      submittedAt: row[cTgl] instanceof Date ? row[cTgl].getTime() : 0,
      tgl,
    });
  }
  return { success: true, data: reviews };
}

// ── SUBMIT REVIEW (buyer) ──
function submitReview({ sessionToken, email, orderId, produk, varian, rating, komentar, anonim }) {
  if (!orderId || !produk || !rating) return { success: false, error: 'Data tidak lengkap' };
  if (rating < 1 || rating > 5)      return { success: false, error: 'Rating tidak valid' };
  if (!komentar || komentar.trim().length < 5)  return { success: false, error: 'Komentar minimal 5 karakter' };
  if (komentar.trim().length > 1000)            return { success: false, error: 'Komentar maksimal 1000 karakter' }; // [SEC-17]

  // Resolve nama buyer
  let namaTampil = 'Anonim';
  if (!anonim) {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const users = ss.getSheetByName(TAB_USERS);
    if (users && email) {
      const uData = users.getDataRange().getValues();
      const uRow  = uData.find(r => String(r[0]).trim().toLowerCase() === String(email).trim().toLowerCase());
      if (uRow) {
        const rawNama = String(uRow[1] || '').trim();
        // Mask: "Budi Santoso" → "B*** S***"
        namaTampil = rawNama.split(' ').map(w => w.length > 1 ? w[0] + '***' : w).join(' ');
      }
    }
  }

  // Cegah double review per orderId+produk
  const sheet = _ensureReviewsSheet();
  const existing = sheet.getDataRange().getValues();
  const headers  = existing[0].map(h => String(h).toLowerCase().trim());
  const cOid     = _colIndex(headers, 'order id');
  const cProd    = _colIndex(headers, 'produk');
  for (let i = 1; i < existing.length; i++) {
    if (String(existing[i][cOid]) === String(orderId) &&
        String(existing[i][cProd]).toLowerCase() === String(produk).toLowerCase()) {
      return { success: false, error: 'Kamu sudah memberikan ulasan untuk pesanan ini' };
    }
  }

  const reviewId = 'REV-' + new Date().getTime().toString().slice(-10);
  const tanggal  = new Date();

  sheet.appendRow([
    reviewId, tanggal, orderId,
    email || '', namaTampil,
    produk, varian || '',
    Number(rating), String(komentar).trim(),
    true,  // published langsung
    '',    // reminder sent timestamp
  ]);
  SpreadsheetApp.flush();

  // Update terjual di Catalog (col P, index 15)
  _incrementTerjual(produk);

  Logger.log('Review submitted: ' + reviewId + ' untuk ' + produk);
  return { success: true, reviewId };
}

// ── EDIT REVIEW (buyer, dalam 7 hari) ──
function editReview({ sessionToken, email, reviewId, rating, komentar, anonim }) {
  if (!reviewId || !rating || !komentar) return { success: false, error: 'Data tidak lengkap' };
  if (rating < 1 || rating > 5)          return { success: false, error: 'Rating tidak valid' };
  if (!komentar || komentar.trim().length < 5) return { success: false, error: 'Komentar minimal 5 karakter' };

  const sheet    = _ensureReviewsSheet();
  const data     = sheet.getDataRange().getValues();
  const headers  = data[0].map(h => String(h).toLowerCase().trim());
  const cId      = _colIndex(headers, 'review id');
  const cTgl     = _colIndex(headers, 'tanggal');
  const cEmail   = _colIndex(headers, 'email');
  const cNama    = _colIndex(headers, 'nama tampil');
  const cRating  = _colIndex(headers, 'rating');
  const cKomen   = _colIndex(headers, 'komentar');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][cId]) !== String(reviewId)) continue;
    // Validasi email pemilik review
    if (String(data[i][cEmail]).toLowerCase() !== String(email || '').toLowerCase()) {
      return { success: false, error: 'Tidak bisa mengedit ulasan orang lain' };
    }
    // Validasi 7 hari
    const tgl = data[i][cTgl] instanceof Date ? data[i][cTgl] : new Date(data[i][cTgl]);
    const ms7 = 7 * 24 * 60 * 60 * 1000;
    if (Date.now() - tgl.getTime() > ms7) {
      return { success: false, error: 'Masa edit ulasan sudah berakhir (7 hari)' };
    }
    // Update nama tampil jika anonim berubah
    let namaTampil = data[i][cNama];
    if (anonim) {
      namaTampil = 'Anonim';
    } else if (namaTampil === 'Anonim' && email) {
      // Restore nama dari Users-web
      const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
      const users = ss.getSheetByName(TAB_USERS);
      if (users) {
        const uData = users.getDataRange().getValues();
        const uRow  = uData.find(r => String(r[0]).trim().toLowerCase() === String(email).trim().toLowerCase());
        if (uRow) namaTampil = String(uRow[1] || '').trim().split(' ').map(w => w.length > 1 ? w[0] + '***' : w).join(' ');
      }
    }
    // Update baris
    sheet.getRange(i + 1, cRating + 1).setValue(Number(rating));
    sheet.getRange(i + 1, cKomen + 1).setValue(String(komentar).trim());
    sheet.getRange(i + 1, cNama + 1).setValue(namaTampil);
    SpreadsheetApp.flush();
    Logger.log('Review edited: ' + reviewId);
    return { success: true };
  }
  return { success: false, error: 'Ulasan tidak ditemukan' };
}

// ── INCREMENT TERJUAL di Catalog col P ──
function _incrementTerjual(produk) {
  try {
    const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
    if (!sheet) return;
    const data    = sheet.getDataRange().getValues();
    const headers = data[0].map(h => String(h).toLowerCase().trim());
    let cTerjual  = _colIndex(headers, 'terjual');
    // Jika kolom belum ada, tambahkan di posisi P (index 15)
    if (cTerjual < 0) {
      const lastCol = sheet.getLastColumn();
      const newCol  = Math.max(lastCol + 1, 16);
      sheet.getRange(1, newCol).setValue('Terjual');
      cTerjual = newCol - 1;
    }
    const normStr = s => String(s || '').trim().toLowerCase();
    for (let i = 1; i < data.length; i++) {
      if (normStr(data[i][0]) === normStr(produk)) {
        const cur = Number(data[i][cTerjual]) || 0;
        sheet.getRange(i + 1, cTerjual + 1).setValue(cur + 1);
      }
    }
    SpreadsheetApp.flush();
  } catch(e) {
    Logger.log('_incrementTerjual error: ' + e.message);
  }
}

// ── SEND REVIEW REMINDER (manual trigger dari buyer) ──
function sendReviewReminder({ sessionToken, email, orderId, produk, varian, buyerNama, buyerWa }) {
  if (!orderId || !produk) return { success: false, error: 'Data tidak lengkap' };

  const slug    = produk.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const prodUrl = 'https://serabut.id/produk/' + slug;

  // WA
  if (buyerWa) {
    const waMsg = `Halo *${buyerNama || 'Kak'}*! 👋\n\nBagaimana pengalaman pakai *${produk}* dari Serabut Store?\n\nUlasan kamu sangat membantu calon pembeli lain. Cuma 1 menit, yuk! ⭐\n\n→ ${prodUrl}\n\n(Buka halaman produk → tab Ulasan → Tulis Ulasan)\n\n— Tim Serabut Store`;
    _sendWA(_normalizeWA(buyerWa), waMsg);
  }

  // Email
  if (email) {
    const subject   = `Bagaimana ${produk} kamu? — Serabut Store`;
    const bodyHtml  = `<p style="margin:0 0 4px;font-size:15px;font-weight:700;color:#111827">Halo, <span style="color:#DC2626">${buyerNama || 'Kak'}</span></p>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b;line-height:1.6">Pesanan <strong>${produk}</strong> kamu sudah aktif. Bagaimana pengalamannya? Ulasan kamu membantu ribuan pembeli lain membuat keputusan yang tepat.</p>
      <table cellpadding="0" cellspacing="0" style="margin:0 0 20px"><tr><td style="border-radius:8px;background:#DC2626">
        <a href="${prodUrl}" target="_blank" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">Tulis Ulasan Sekarang &rarr;</a>
      </td></tr></table>
      <p style="margin:0;font-size:12px;color:#94a3b8">Ada pertanyaan? <a href="https://wa.me/628881500555" style="color:#2563eb">+62 888 1500 555</a> (09.00&ndash;22.00 WIB)</p>`;
    try { GmailApp.sendEmail(email, subject, '', { htmlBody: _emailShell('Review Produk', produk, bodyHtml), name: 'No Reply - Serabut Store' }); } catch(e) { Logger.log('Email reminder error: ' + e.message); }
  }

  // Mark reminder sent di Orders sheet
  try {
    const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
    const oSht  = ss.getSheetByName(TAB_ORDERS);
    if (oSht) {
      const oData = oSht.getDataRange().getValues();
      const oHdr  = oData[0].map(h => String(h).toLowerCase().trim());
      let cRem    = _colIndex(oHdr, 'review reminder');
      if (cRem < 0) {
        const nc = oSht.getLastColumn() + 1;
        oSht.getRange(1, nc).setValue('Review Reminder');
        cRem = nc - 1;
      }
      for (let i = 1; i < oData.length; i++) {
        if (String(oData[i][0]) === String(orderId)) {
          oSht.getRange(i + 1, cRem + 1).setValue(new Date());
          break;
        }
      }
      SpreadsheetApp.flush();
    }
  } catch(e) { Logger.log('Mark reminder error: ' + e.message); }

  return { success: true };
}

// ── DAILY AUTO REMINDER (H+3) — dipanggil oleh Time Trigger ──
function checkAndSendReviewReminders() {
  const ss   = SpreadsheetApp.openById(SPREADSHEET_ID);
  const oSht = ss.getSheetByName(TAB_ORDERS);
  if (!oSht) return;

  const data  = oSht.getDataRange().getValues();
  const hdr   = data[0].map(h => String(h).toLowerCase().trim());
  const cOid  = _colIndex(hdr, 'order id');
  const cTgl  = _colIndex(hdr, 'tanggal');
  const cNama = _colIndex(hdr, 'nama');
  const cEml  = _colIndex(hdr, 'email');
  const cWa   = _colIndex(hdr, 'no wa');
  const cProd = _colIndex(hdr, 'produk');
  const cVar  = _colIndex(hdr, 'varian');
  const cStat = _colIndex(hdr, 'status');
  let   cRem  = _colIndex(hdr, 'review reminder');

  // Tambah kolom jika belum ada
  if (cRem < 0) {
    const nc = oSht.getLastColumn() + 1;
    oSht.getRange(1, nc).setValue('Review Reminder');
    cRem = nc - 1;
  }

  const now     = new Date();
  const H3_MS   = 3 * 24 * 60 * 60 * 1000; // 3 hari dalam ms
  let   sent    = 0;

  for (let i = 1; i < data.length; i++) {
    const row    = data[i];
    const status = String(row[cStat] || '').toLowerCase();
    if (status !== 'aktif' && status !== 'selesai') continue;

    const reminderSent = row[cRem];
    if (reminderSent && String(reminderSent).trim() !== '') continue; // sudah dikirim

    const tglOrder = row[cTgl] instanceof Date ? row[cTgl] : new Date(row[cTgl]);
    if (isNaN(tglOrder.getTime())) continue;
    if ((now - tglOrder) < H3_MS) continue; // belum 3 hari

    const orderId  = String(row[cOid] || '');
    const produk   = String(row[cProd] || '');
    const varian   = String(row[cVar] || '');
    const buyerNama= String(row[cNama] || '');
    const email    = String(row[cEml] || '');
    const wa       = String(row[cWa] || '');

    if (!orderId || !produk) continue;

    sendReviewReminder({ orderId, produk, varian, buyerNama, buyerWa: wa, email });
    sent++;

    if (sent >= 50) break; // max 50 per run agar tidak timeout
  }

  Logger.log('checkAndSendReviewReminders: sent=' + sent);
}

// ── SETUP TIME TRIGGER (jalankan sekali) ──
function setupReviewReminderTrigger() {
  // Hapus trigger lama jika ada
  ScriptApp.getProjectTriggers().forEach(t => {
    if (t.getHandlerFunction() === 'checkAndSendReviewReminders') ScriptApp.deleteTrigger(t);
  });
  // Buat trigger baru: tiap hari jam 09:00 WIB (02:00 UTC)
  ScriptApp.newTrigger('checkAndSendReviewReminders')
    .timeBased()
    .atHour(2)
    .everyDays(1)
    .create();
  Logger.log('Review reminder trigger created — runs daily at 09:00 WIB');
}

// ── ADMIN: get all reviews ──
function getAdminReviews({ adminEmail, adminToken }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };

  const sheet = _ensureReviewsSheet();
  const data  = sheet.getDataRange().getValues();
  if (data.length < 2) return { success: true, data: [] };

  const headers   = data[0].map(h => String(h).toLowerCase().trim());
  const cId       = _colIndex(headers, 'review id');
  const cTgl      = _colIndex(headers, 'tanggal');
  const cOid      = _colIndex(headers, 'order id');
  const cNama     = _colIndex(headers, 'nama tampil');
  const cProduk   = _colIndex(headers, 'produk');
  const cVarian   = _colIndex(headers, 'varian');
  const cRating   = _colIndex(headers, 'rating');
  const cKomentar = _colIndex(headers, 'komentar');
  const cPub      = _colIndex(headers, 'published');

  const reviews = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[cId]) continue;
    const pub = row[cPub];
    const tgl = row[cTgl] instanceof Date
      ? Utilities.formatDate(row[cTgl], 'Asia/Jakarta', 'dd MMM yyyy HH:mm')
      : String(row[cTgl] || '');
    reviews.push({
      rowIndex: i + 1,
      id:       String(row[cId]),
      tgl,
      orderId:  String(row[cOid] || ''),
      nama:     String(row[cNama] || ''),
      produk:   String(row[cProduk] || ''),
      varian:   String(row[cVarian] || ''),
      rating:   Number(row[cRating]) || 5,
      komentar: String(row[cKomentar] || ''),
      published: pub === true || String(pub).toUpperCase() === 'TRUE',
    });
  }

  reviews.sort((a, b) => b.id.localeCompare(a.id));
  return { success: true, data: reviews };
}

// ── PUBLIC: like/helpful review ──
function likeReview({ reviewId }) {
  if (!reviewId) return { success: false, error: 'reviewId diperlukan' };
  const sheet   = _ensureReviewsSheet();
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const cId     = _colIndex(headers, 'review id');
  let   cLikes  = _colIndex(headers, 'likes');

  // Tambah kolom Likes jika belum ada
  if (cLikes < 0) {
    const col = sheet.getLastColumn() + 1;
    sheet.getRange(1, col).setValue('Likes');
    cLikes = col - 1;
  }

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][cId]) === String(reviewId)) {
      const current = Number(data[i][cLikes]) || 0;
      sheet.getRange(i + 1, cLikes + 1).setValue(current + 1);
      SpreadsheetApp.flush();
      return { success: true, likes: current + 1 };
    }
  }
  return { success: false, error: 'Review tidak ditemukan' };
}

// ── ADMIN: hapus review permanen ──
function deleteReview({ adminEmail, adminToken, reviewId }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };

  const sheet   = _ensureReviewsSheet();
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const cId     = _colIndex(headers, 'review id');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][cId]) === String(reviewId)) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      _logAdminAction(adminEmail, 'deleteReview', { reviewId });
      return { success: true };
    }
  }
  return { success: false, error: 'Review tidak ditemukan' };
}

// ── ADMIN: toggle published ──
function toggleReview({ adminEmail, adminToken, reviewId, published }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };

  const sheet   = _ensureReviewsSheet();
  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const cId     = _colIndex(headers, 'review id');
  const cPub    = _colIndex(headers, 'published');

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][cId]) === String(reviewId)) {
      sheet.getRange(i + 1, cPub + 1).setValue(published ? true : false);
      SpreadsheetApp.flush();
      _logAdminAction(adminEmail, 'toggleReview', { reviewId, published });
      return { success: true };
    }
  }
  return { success: false, error: 'Review tidak ditemukan' };
}

// ── Quotation: kirim email dengan HTML invoice sebagai body ──
// ── Quotation: public endpoint — ambil formData by quoId (no auth) ──
function getQuotations({ adminEmail, adminToken }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Quotations');
  if (!sheet) return { success: true, data: [] };
  const data    = sheet.getDataRange().getValues();
  if (data.length < 2) return { success: true, data: [] };
  const h = data[0];
  const col = k => h.indexOf(k);
  const idC = col('ID'), namaC = col('Nama'), emailC = col('Email'), totalC = col('Total'),
        statusC = col('Status'), tglC = col('Tanggal'), itemsC = col('Item Count');
  const rows = [];
  for (let r = 1; r < data.length; r++) {
    const row = data[r];
    if (!row[idC]) continue;
    rows.push({
      id:     row[idC],
      nama:   row[namaC],
      email:  row[emailC] || '',
      total:  row[totalC] || 0,
      status: row[statusC] || '',
      tgl:    row[tglC] ? String(row[tglC]).slice(0,10) : '',
      items:  row[itemsC] || 0,
    });
  }
  rows.reverse(); // terbaru dulu
  return { success: true, data: rows };
}

function getPublicQuo({ quoId }) {
  if (!quoId) return { success: false, error: 'quoId required' };
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName('Quotations');
  if (!sheet) return { success: false, error: 'Not found' };
  const data    = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol   = headers.indexOf('ID');
  const fdCol   = headers.indexOf('Form Data');
  const namaCol = headers.indexOf('Nama');
  for (let r = 1; r < data.length; r++) {
    if (String(data[r][idCol]) === String(quoId)) {
      return { success: true, quoId, nama: data[r][namaCol], formDataJson: data[r][fdCol] || '' };
    }
  }
  return { success: false, error: 'Quotation not found' };
}

// ── Helper: simpan HTML quotation ke Drive, return public download URL ──
function _saveQuoToDrive(quoId, htmlContent) {
  const blob = Utilities.newBlob(htmlContent, 'text/html', (quoId||'quotation') + '.html');
  const file = DriveApp.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return 'https://drive.google.com/uc?id=' + file.getId() + '&export=download';
}

function sendQuotationEmail({ adminEmail, adminToken, to, subject, quoId, nama, quoLink }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!to)      return { success: false, error: 'Email tujuan kosong' };
  if (!quoLink) return { success: false, error: 'Link quotation tidak tersedia' };

  const subj = subject || ('Penawaran ' + (quoId||'') + (nama ? ' untuk ' + nama : '') + ' dari Serabut Store');
  const emailHtml = `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,'Helvetica Neue',Helvetica,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">

  <!-- Card utama — border sebagai "frame" -->
  <tr><td style="background:#ffffff;border-radius:12px;border:1px solid #e2e8f0;overflow:hidden">
    <table width="100%" cellpadding="0" cellspacing="0">

      <!-- Hero strip merah -->
      <tr><td style="background:#DC2626;padding:24px 32px 20px">
        <p style="margin:0 0 4px;font-size:10px;font-weight:700;color:#fca5a5;letter-spacing:1.5px;text-transform:uppercase">Dokumen Penawaran Harga</p>
        <p style="margin:0;font-size:20px;font-weight:800;color:#ffffff;letter-spacing:-0.3px">${quoId||'Quotation'}</p>
      </td></tr>

      <!-- Body -->
      <tr><td style="padding:28px 32px 24px">
        <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#111827">Halo, <span style="color:#DC2626">${nama||to}</span></p>
        <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6">
          Kami telah menyiapkan penawaran harga untuk Anda. Klik tombol di bawah untuk melihat detail lengkap, mencetak, atau menyimpan sebagai PDF.
        </p>

        <!-- CTA button -->
        <table cellpadding="0" cellspacing="0" style="margin:0 0 24px">
          <tr><td style="border-radius:8px;background:#DC2626">
            <a href="${quoLink}" target="_blank"
               style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none">
              Lihat Penawaran &rarr;
            </a>
          </td></tr>
        </table>

        <!-- Info pills -->
        <table cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;border:1px solid #e2e8f0;border-radius:8px">
          <tr>
            <td style="padding:12px 16px;border-right:1px solid #e2e8f0" width="50%">
              <p style="margin:0 0 2px;font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.6px">Berlaku</p>
              <p style="margin:0;font-size:13px;font-weight:700;color:#111827">7 Hari</p>
            </td>
            <td style="padding:12px 16px" width="50%">
              <p style="margin:0 0 2px;font-size:10px;color:#94a3b8;font-weight:700;text-transform:uppercase;letter-spacing:0.6px">Respon</p>
              <p style="margin:0;font-size:13px;font-weight:700;color:#111827">09.00 - 22.00 WIB</p>
            </td>
          </tr>
        </table>

        <!-- Link fallback -->
        <p style="margin:0 0 4px;font-size:11px;color:#94a3b8">Tombol tidak bisa diklik? Salin link berikut ke browser:</p>
        <p style="margin:0;font-size:11px;color:#2563eb;word-break:break-all">${quoLink}</p>
      </td></tr>

      <!-- Divider -->
      <tr><td style="border-top:1px solid #f1f5f9"></td></tr>

      <!-- Footer -->
      <tr><td style="background:#f8fafc;padding:16px 32px;border-radius:0 0 12px 12px">
        <table cellpadding="0" cellspacing="0" width="100%"><tr>
          <td>
            <p style="margin:0;font-size:12px;color:#64748b;line-height:1.7">
              Salam hangat,<br>
              <strong style="color:#111827">Tim Serabut Store</strong><br>
              <a href="https://serabut.id" style="color:#DC2626;text-decoration:none">serabut.id</a>
            </p>
          </td>
        </tr></table>
      </td></tr>

    </table>
  </td></tr>

  <!-- Bottom note -->
  <tr><td style="padding:16px 0 0;text-align:center">
    <p style="margin:0;font-size:11px;color:#cbd5e1">Email ini dikirim otomatis oleh sistem Serabut Store &middot; Jangan balas email ini</p>
  </td></tr>

</table>
</td></tr>
</table>
</body></html>`;

  try {
    GmailApp.sendEmail(to, subj, '', {
      htmlBody: emailHtml,
      name:     'No Reply - Serabut Store',
    });
    return { success: true };
  } catch (e) {
    Logger.log('sendQuotationEmail error: ' + e.message);
    return { success: false, error: 'Gagal kirim email: ' + e.message };
  }
}

// ── Quotation: kirim WA via Fonnte ke nomor penerima ──
function sendQuotationWA({ adminEmail, adminToken, noHP, quoId, nama, itemLines, total, payMethod, bankInfo, quoLink, htmlContent }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };

  const wa = _normalizeWA(noHP);
  if (!wa || wa.length < 10) return { success: false, error: 'No. WA tidak valid' };
  if (!FONNTE_TOKEN)         return { success: false, error: 'FONNTE_TOKEN belum diset' };

  // Simpan ke Drive untuk dapat link download
  let downloadLine = '';
  if (htmlContent) {
    try {
      const url = _saveQuoToDrive(quoId, htmlContent);
      downloadLine = '\n\n📥 *Download Quotation:*\n' + url;
    } catch(e) {
      Logger.log('Drive save error: ' + e.message);
    }
  }

  const fp  = v => 'Rp ' + Number(v||0).toLocaleString('id-ID');
  const linkLine = quoLink ? '\n\n🔗 *Preview Quotation:*\n' + quoLink : (downloadLine || '');
  const msg =
`Halo *${nama||''}*! 👋

Berikut penawaran dari *Serabut Store*:
━━━━━━━━━━━━━━━━━━
📄 No: *${quoId||'–'}*

${itemLines||''}
━━━━━━━━━━━━━━━━━━
💰 *Total: ${fp(total)}*

Pembayaran: ${payMethod||'Transfer Bank'}
${bankInfo||''}${linkLine}

Penawaran berlaku *7 hari*. Balas pesan ini untuk konfirmasi 😊`;

  try {
    const resp = UrlFetchApp.fetch('https://api.fonnte.com/send', {
      method: 'post',
      headers: { 'Authorization': FONNTE_TOKEN },
      payload: { target: wa, message: msg },
      muteHttpExceptions: true,
    });
    const body = JSON.parse(resp.getContentText());
    Logger.log('sendQuotationWA [' + resp.getResponseCode() + ']: ' + JSON.stringify(body));
    if (resp.getResponseCode() === 200 && body.status !== false) return { success: true };
    return { success: false, error: body.reason || body.message || 'Fonnte error' };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

// ── Quotation: simpan ke Sheet "Quotations" ──
function saveQuotation({ adminEmail, adminToken, quoId, nama, email, noHP, total, itemCount, status, formDataJson }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet   = ss.getSheetByName('Quotations');
  if (!sheet) {
    sheet = ss.insertSheet('Quotations');
    sheet.appendRow(['ID', 'Tanggal', 'Nama', 'Email', 'No HP', 'Total', 'Item Count', 'Status', 'Form Data']);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idCol = headers.indexOf('ID');

  // Update jika sudah ada, insert jika baru
  for (let r = 1; r < data.length; r++) {
    if (data[r][idCol] === quoId) {
      const row = r + 1;
      sheet.getRange(row, 1, 1, 9).setValues([[
        quoId, new Date(), nama||'', email||'', noHP||'',
        Number(total||0), Number(itemCount||0), status||'draft', formDataJson||''
      ]]);
      SpreadsheetApp.flush();
      return { success: true, action: 'updated' };
    }
  }
  sheet.appendRow([quoId, new Date(), nama||'', email||'', noHP||'', Number(total||0), Number(itemCount||0), status||'draft', formDataJson||'']);
  SpreadsheetApp.flush();
  return { success: true, action: 'inserted' };
}

// ── Permintaan Hapus Data ──────────────────────────────────────────────────
function requestDeleteAccount({ email, nama }) {
  if (!email) return { success: false, error: 'Email diperlukan' };

  const waktu  = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'dd MMM yyyy HH:mm z');
  const subject = `[HAPUS DATA] Permintaan dari ${nama || email}`;
  const body    = `Permintaan Penghapusan Data Pengguna\n\n` +
                  `Nama    : ${nama || '—'}\n` +
                  `Email   : ${email}\n` +
                  `Waktu   : ${waktu}\n\n` +
                  `Silakan proses penghapusan data dalam 30 hari kerja sesuai Kebijakan Privasi.\n` +
                  `Data transaksi tetap disimpan sesuai ketentuan perpajakan (5 tahun).`;

  GmailApp.sendEmail('halo@serabut.id', subject, body, {
    replyTo: email,
    name:    'Sistem Serabut Store',
  });

  // Konfirmasi ke user
  GmailApp.sendEmail(email, 'Permintaan Hapus Data Diterima — Serabut Store',
    `Halo ${nama || 'Pelanggan'},\n\n` +
    `Kami telah menerima permintaan penghapusan data akun Anda pada ${waktu}.\n\n` +
    `Tim kami akan memproses dalam 30 hari kerja. Data transaksi tetap disimpan sesuai ketentuan perpajakan.\n\n` +
    `Jika ini bukan permintaan Anda, segera hubungi kami di halo@serabut.id\n\n` +
    `Serabut Store\nhttps://serabut.id`, {
    name: 'Serabut Store',
  });

  return { success: true };
}

// ────────────────────────────────────────────────────────
//  AUTO-CANCEL EXPIRED PENDING ORDERS (>24 jam)
//  Dijalankan via time-driven trigger setiap 1 jam.
//  Install trigger: jalankan setupAutoCancelTrigger() SATU KALI dari GAS editor.
// ────────────────────────────────────────────────────────
function autoCancelExpiredOrders() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_ORDERS);
  if (!sheet) return;

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const dateCol = (function() {
    var idx = headers.indexOf('tanggal'); if (idx >= 0) return idx;
    idx = headers.indexOf('date'); if (idx >= 0) return idx;
    return 1; // fallback kolom B
  })();
  const stCol   = 9; // kolom J = Status (0-indexed)
  const pmCol   = (function() {
    var idx = headers.indexOf('payment method'); if (idx >= 0) return idx;
    idx = headers.indexOf('payment_method'); if (idx >= 0) return idx;
    return -1;
  })();

  const now      = new Date();
  const LIMIT_MS = 24 * 60 * 60 * 1000; // 24 jam
  let   cancelled = 0;

  for (var i = 1; i < data.length; i++) {
    const row    = data[i];
    if (!row[0]) continue;                          // baris kosong
    const status = String(row[stCol] || '').trim();
    if (status !== 'Pending') continue;

    // Jika sudah ada paymentMethod (iPaymu/Xendit sudah dibayar tapi belum di-update) → skip
    if (pmCol >= 0 && String(row[pmCol] || '').trim()) continue;

    const rawDate = row[dateCol];
    if (!rawDate) continue;
    const orderDate = rawDate instanceof Date ? rawDate : new Date(rawDate);
    if (isNaN(orderDate)) continue;

    if ((now - orderDate) >= LIMIT_MS) {
      sheet.getRange(i + 1, stCol + 1).setValue('Dibatalkan');
      cancelled++;
      Logger.log('Auto-cancel: ' + row[0] + ' (order: ' + orderDate + ')');
    }
  }

  if (cancelled > 0) SpreadsheetApp.flush();
  Logger.log('autoCancelExpiredOrders selesai — ' + cancelled + ' order dibatalkan');
  return cancelled;
}

// Jalankan SATU KALI dari GAS editor untuk install time-driven trigger setiap 1 jam
function setupAutoCancelTrigger() {
  // Hapus trigger lama jika ada
  ScriptApp.getProjectTriggers().forEach(function(t) {
    if (t.getHandlerFunction() === 'autoCancelExpiredOrders') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('autoCancelExpiredOrders')
    .timeBased()
    .everyHours(1)
    .create();
  Logger.log('Trigger autoCancelExpiredOrders setiap 1 jam berhasil dipasang.');
}
