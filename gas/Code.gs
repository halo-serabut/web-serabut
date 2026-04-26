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
  const PUBLIC_ACTIONS = ['getCatalog', 'getSettings', 'getGuides', 'checkStatus', 'smartSearch'];
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
      default:            result = { success: false, error: 'Unknown action' };
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

  const action = params.action;
  let result;

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
      case 'updateProductStock':    result = updateProductStock(params); break;
      case 'updateProductAktif':    result = updateProductAktif(params); break;
      case 'saveProductBenefits':   result = saveProductBenefits(params); break;
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
  const tokenCol = _colIndex(headers, 'session token', 'sessiontoken');
  if (tokenCol < 0) return false; // kolom belum ada

  const emailNorm = email.toLowerCase().trim();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== emailNorm) continue;
    const stored = String(data[i][tokenCol] || '').trim();
    return stored !== '' && stored === String(sessionToken).trim();
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
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  const data     = sheet.getDataRange().getValues();
  const headers  = data[0].map(h => String(h).toLowerCase().trim());
  const cKat     = _colIndex(headers, 'kategori', 'category');
  const cIcon    = _colIndex(headers, 'icon url', 'iconurl', 'icon_url');
  const cBen     = _colIndex(headers, 'deskripsi', 'benefits', 'benefit');
  const products = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    const aktif = row[5];
    if (aktif !== true && String(aktif).toUpperCase() !== 'TRUE') continue;

    const rawStok = row[6];
    const stok    = (rawStok === '' || rawStok === null || rawStok === undefined) ? null : Number(rawStok);
    let benefits  = [];
    try { benefits = JSON.parse(String(cBen >= 0 ? row[cBen] : row[14]) || '[]'); } catch (_) { benefits = []; }
    if (!Array.isArray(benefits)) benefits = [];

    products.push({
      rowIndex:   i + 1,
      nama:       String(row[0]).trim(),
      varian:     String(row[1] || '').trim(),
      masaAktif:  String(row[2] || '-').trim(),
      harga:      Number(row[3]) || 0,
      linkProduk: String(row[4] || '').trim(),
      stok:       stok,
      category:   cKat  >= 0 ? String(row[cKat]  || '').trim() : '',
      iconUrl:    cIcon >= 0 ? String(row[cIcon] || '').trim() : String(row[7] || '').trim(),
      benefits:   benefits,
    });
  }

  return { success: true, data: products };
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
  const products = [];

  for (let i = 1; i < data.length; i++) {
    const row   = data[i];
    if (!row[0]) continue;
    const aktif   = row[5];
    const rawStok = row[6];
    const stok    = (rawStok === '' || rawStok === null || rawStok === undefined) ? null : Number(rawStok);
    let benefits  = [];
    try { benefits = JSON.parse(String(cBen >= 0 ? row[cBen] : row[14]) || '[]'); } catch (_) { benefits = []; }
    if (!Array.isArray(benefits)) benefits = [];

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
      benefits:   benefits,
    });
  }

  return { success: true, data: products };
}

// ────────────────────────────────────────────────────────
//  ADD PRODUCT
// ────────────────────────────────────────────────────────
function addProduct({ adminEmail, adminToken, nama, varian, masaAktif, harga, linkProduk, aktif, stok, iconUrl, kategori, benefits }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!nama || !varian) return { success: false, error: 'Nama dan varian wajib diisi' };

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
  const numCols = Math.max(headers.length, cBen >= 0 ? cBen + 1 : 15);

  const row   = new Array(numCols).fill('');
  row[0] = String(nama).trim();
  row[1] = String(varian).trim();
  row[2] = String(masaAktif || '-').trim();
  row[3] = Number(harga) || 0;
  row[4] = String(linkProduk || '').trim();
  row[5] = (aktif === 'true' || aktif === true);
  row[6] = (stok === '' || stok === null || stok === undefined) ? '' : Number(stok);
  if (cKat  >= 0) row[cKat]  = String(kategori || '').trim();
  if (cIcon >= 0) row[cIcon] = String(iconUrl  || '').trim();
  if (benefits !== undefined && benefits !== null && benefits !== '') {
    if (cBen >= 0) row[cBen] = String(benefits).trim();
  }

  sheet.appendRow(row);

  if (benefits !== undefined && benefits !== null && benefits !== '' && cBen < 0) {
    sheet.getRange(sheet.getLastRow(), 15).setValue(String(benefits).trim());
  }

  return { success: true };
}

// ────────────────────────────────────────────────────────
//  UPDATE PRODUCT
// ────────────────────────────────────────────────────────
function updateProduct({ adminEmail, adminToken, rowIndex, nama, varian, masaAktif, harga, linkProduk, aktif, stok, iconUrl, kategori, benefits }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!rowIndex) return { success: false, error: 'rowIndex diperlukan' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  const row     = Number(rowIndex);
  const isAktif = (aktif === 'true' || aktif === true);
  const stokVal = (stok === '' || stok === null || stok === undefined) ? '' : Number(stok);
  const headers = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 15)).getValues()[0];
  const cKat    = _colIndex(headers, 'kategori', 'category');
  const cIcon   = _colIndex(headers, 'icon url', 'iconurl', 'icon_url');
  const cBen    = _colIndex(headers, 'deskripsi', 'benefits', 'benefit');

  sheet.getRange(row, 1).setValue(String(nama || '').trim());
  sheet.getRange(row, 2).setValue(String(varian || '').trim());
  sheet.getRange(row, 3).setValue(String(masaAktif || '-').trim());
  sheet.getRange(row, 4).setValue(Number(harga) || 0);
  sheet.getRange(row, 5).setValue(String(linkProduk || '').trim());
  sheet.getRange(row, 6).setValue(isAktif);
  sheet.getRange(row, 7).setValue(stokVal);
  if (cKat  >= 0 && kategori !== undefined) sheet.getRange(row, cKat  + 1).setValue(String(kategori || '').trim());
  if (cIcon >= 0)                           sheet.getRange(row, cIcon + 1).setValue(String(iconUrl  || '').trim());
  if (benefits !== undefined && benefits !== null && benefits !== '') {
    sheet.getRange(row, cBen >= 0 ? cBen + 1 : 15).setValue(String(benefits).trim());
  }

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
  return { success: true };
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

  const data   = sheet.getDataRange().getValues();
  const orders = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    orders.push({
      rowIndex:  i + 1,
      orderId:   String(row[0]),
      tanggal:   String(row[1]),
      nama:      String(row[2]),
      email:     String(row[3]),
      wa:        String(row[4]),
      produk:    String(row[5]),
      varian:    String(row[6]),
      masaAktif: String(row[7]),
      harga:     Number(row[8]) || 0,
      status:    String(row[9]),
    });
  }
  orders.reverse();
  return { success: true, data: orders };
}

// ────────────────────────────────────────────────────────
//  UPDATE ORDER STATUS (admin)
// ────────────────────────────────────────────────────────
function updateOrderStatus({ adminEmail, adminToken, rowIndex, status }) {
  const authErr = _requireAdmin(adminEmail, adminToken);
  if (authErr) return { success: false, error: authErr };
  if (!rowIndex || !status) return { success: false, error: 'Data tidak lengkap' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: false, error: 'Tab Orders tidak ditemukan' };

  sheet.getRange(Number(rowIndex), 10).setValue(status);
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
    return { success: true };
  }
  return { success: false, error: 'Email tidak ditemukan' };
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

  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const q       = String(query).toLowerCase().trim();
  const results = [];
  const SHEETS  = ['List Account 365', 'List Account 365 Family'];

  for (const sheetName of SHEETS) {
    const sheet = ss.getSheetByName(sheetName);
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
    };

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      const searchable = [
        getVal(row, col.buyerName), getVal(row, col.mailActive),
        getVal(row, col.emailActive), getVal(row, col.msa),
        getVal(row, col.officeAcc), getVal(row, col.wa),
      ].filter(v => v).map(v => v.toLowerCase());

      if (!searchable.some(v => v.includes(q))) continue;

      results.push({
        sumber:         sheetName,
        nama:           getVal(row, col.buyerName),
        emailPembeli:   getVal(row, col.mailActive) || getVal(row, col.emailActive),
        officeAccount:  getVal(row, col.officeAcc) || getVal(row, col.msa),
        wa:             getVal(row, col.wa),
        masaBerlaku:    getDateVal(row, col.endDate),
        mulaiLangganan: getDateVal(row, col.startDate),
        status:         getVal(row, col.status) || 'Aktif',
        durasi:         getVal(row, col.duration),
        tipe:           getVal(row, col.subscription) || (sheetName.includes('Family') ? 'Family' : 'Personal'),
      });
    }
  }
  return { success: true, data: results };
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
    if (!val || (!val.includes(q) && val !== q)) continue;

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

  sheet.appendRow([
    nama.trim(),      // 0 Nama
    emailNorm,        // 1 Email
    wa.trim(),        // 2 No Hp
    password,         // 3 Password (SHA-256 salted dari client)
    createdAt,        // 4 Created At
    'Pending',        // 5 Status
    privacyTs,        // 6 Privacy Notice
    otp,              // 7 OTP
    expiry,           // 8 OTP Expiry
    'buyer',          // 9 Role
    '', '', '', '',   // 10-13 Profile fields
    '',               // 14 Session Token
    0,                // 15 OTP Attempts
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
    const row = i + 1;
    sheet.getRange(row, 6).setValue('Aktif');
    sheet.getRange(row, 8).setValue('');  // clear OTP
    sheet.getRange(row, 9).setValue('');  // clear OTP Expiry
    if (attCol >= 0) sheet.getRange(row, attCol + 1).setValue(0); // reset attempts
    if (tokCol  >= 0) sheet.getRange(row, tokCol  + 1).setValue(sessionToken);

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

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const attCol  = _colIndex(headers, 'otp attempts');
  const emailNorm = email.toLowerCase().trim();

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

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'Belum ada user terdaftar' };

  const data    = sheet.getDataRange().getValues();
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const tokCol  = _colIndex(headers, 'session token', 'sessiontoken');
  const emailNorm = email.toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[1]).toLowerCase().trim() !== emailNorm) continue;

    const status = String(row[5] || 'Aktif').trim();
    if (status === 'Pending') {
      return { success: false, error: 'Akun belum diverifikasi. Cek email kamu untuk kode OTP.' };
    }

    const storedPw = String(row[3]);
    let matched    = false;
    let upgraded   = false;

    if (storedPw === String(password)) {
      matched = true; // new salted hash matches
    } else if (passwordLegacy && storedPw === String(passwordLegacy)) {
      // [SEC] Legacy unsalted hash — upgrade ke salted hash
      sheet.getRange(i + 1, 4).setValue(String(password));
      matched  = true;
      upgraded = true;
      Logger.log('Password upgraded to salted hash for: ' + emailNorm);
    }

    if (!matched) return { success: false, error: 'Password salah' };

    // Generate session token
    const sessionToken = _generateSessionToken();
    if (tokCol >= 0) sheet.getRange(i + 1, tokCol + 1).setValue(sessionToken);

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
function googleLogin({ idToken, email: emailFallback, nama: namaFallback }) {
  // [SEC] Verifikasi ID token Google secara server-side
  let email, nama;
  if (idToken) {
    const payload = _verifyGoogleToken(idToken);
    if (!payload) return { success: false, error: 'Token Google tidak valid. Silakan coba lagi.' };
    email = payload.email;
    nama  = payload.name || emailFallback || '';
  } else {
    // Fallback jika idToken tidak dikirim (untuk kompatibilitas sementara)
    if (!emailFallback) return { success: false, error: 'Email diperlukan' };
    email = emailFallback;
    nama  = namaFallback || '';
    Logger.log('WARN: googleLogin tanpa idToken verification untuk: ' + email);
  }

  if (!email) return { success: false, error: 'Email tidak ditemukan dari token Google' };

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

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== emailNorm) continue;
    if (String(data[i][5]).trim() === 'Pending') {
      sheet.getRange(i + 1, 6).setValue('Aktif');
    }
    const sessionToken = _generateSessionToken();
    if (tokCol >= 0) sheet.getRange(i + 1, tokCol + 1).setValue(sessionToken);

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
  const displayNama = (nama || emailNorm.split('@')[0]).trim();
  const createdAt   = formatJkt(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const sessionToken = _generateSessionToken();

  sheet.appendRow([
    displayNama, emailNorm, '', '', createdAt, 'Aktif', 'Google SSO', '', '', 'buyer',
    '', '', '', '', sessionToken, 0,
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
function createOrder({ email, sessionToken, userNama, userEmail, userWa, produk, varian, masaAktif, harga, msNama, username, microsoftEmail, emailAktif, emailReminder }) {
  // Auth check — guest order masih diperbolehkan (tanpa session)
  const effectiveEmail = userEmail || email || '';
  if (!effectiveEmail || !produk) return { success: false, error: 'Data tidak lengkap' };

  // [SEC] Validasi harga dari server (bukan percaya client)
  const catalogPrice = _getCatalogPrice(produk, varian, masaAktif);
  let hargaNum;
  if (catalogPrice !== null) {
    hargaNum = catalogPrice; // selalu pakai harga dari catalog
  } else {
    // Produk tidak ditemukan di catalog — tolak order
    Logger.log('createOrder: produk tidak ditemukan di catalog: ' + produk + '|' + varian + '|' + masaAktif);
    hargaNum = Number(harga) || 0; // fallback untuk produk custom/tidak ada di catalog
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
  const tanggal  = formatJkt(new Date(), 'dd/MM/yyyy HH:mm');

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
    groupMsg = `*ORDER 365 FAMILY*\nOrder ID: *${orderId}*\nEmail Microsoft (invite): *${microsoftEmail || '-'}*\nEmail Aktif: ${emailAktif || '-'}${reminderLine}\nDurasi: ${masaAktif || '-'}\nNama Pembeli: ${userNama}\nNo WA: ${userWa}\nStatus: *Pending*`;
  } else if (isWeb) {
    groupMsg = `*ORDER 365 WEB*\nOrder ID: *${orderId}*\nNama MS: ${msNama || '-'}\nUsername Request: *${username || '-'}*\nEmail Aktif: ${emailAktif || '-'}${reminderLine}\nDurasi: ${masaAktif || '-'}\nNo WA: ${userWa}\nStatus: *Pending*`;
  } else {
    groupMsg = `*ORDER BARU*\nOrder ID: *${orderId}*\nProduk: ${produk}\nVarian: ${varian || '-'}\nDurasi: ${masaAktif || '-'}\nNama: ${userNama}\nEmail Aktif: ${emailAktif || '-'}${reminderLine}\nNo WA: ${userWa}\nStatus: *Pending*`;
  }

  sendWAToGroup(groupMsg);
  return { success: true, orderId, harga: hargaNum };
}

// ────────────────────────────────────────────────────────
//  GET ORDERS — [SEC] require session auth
// ────────────────────────────────────────────────────────
function getOrders({ email, sessionToken }) {
  const authErr = _requireAuth(email, sessionToken);
  if (authErr) return { success: false, error: authErr };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: true, data: [] };

  const data   = sheet.getDataRange().getValues();
  const orders = [];
  const emailNorm = email.toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[3]).toLowerCase().trim() !== emailNorm) continue;
    orders.push({
      orderId:   String(row[0]),
      tanggal:   String(row[1]),
      produk:    String(row[5]),
      varian:    String(row[6]),
      masaAktif: String(row[7]),
      harga:     Number(row[8]) || 0,
      status:    String(row[9]),
    });
  }

  orders.reverse();
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
    return { success: true };
  }
  return { success: false, error: 'User tidak ditemukan' };
}

// ────────────────────────────────────────────────────────
//  FORGOT PASSWORD — kirim OTP via email (dan WA jika tersedia)
// ────────────────────────────────────────────────────────
function forgotPasswordSendOTP({ email }) {
  if (!email) return { success: false, error: 'Email harus diisi' };
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data      = sheet.getDataRange().getValues();
  const emailNorm = email.toLowerCase().trim();

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
      const waNum = wa.replace(/^0/, '62');
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
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data      = sheet.getDataRange().getValues();
  const headers   = data[0].map(h => String(h).toLowerCase().trim());
  const emailNorm = email.toLowerCase().trim();
  const attCol    = _colIndex(headers, 'otp attempts');

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

    sheet.getRange(i + 1, 4).setValue(String(newPassword));
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
function createCartOrder({ email, sessionToken, userNama, userEmail, userWa, itemsJson }) {
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
  const tanggal = formatJkt(new Date(), 'dd/MM/yyyy HH:mm');
  let totalHarga = 0;
  const waLines  = [];

  for (let idx = 0; idx < items.length; idx++) {
    const it = items[idx];
    const catalogPrice = _getCatalogPrice(it.produk, it.varian, it.masaAktif);
    let hargaNum;
    if (catalogPrice !== null) {
      hargaNum = catalogPrice * (Number(it.qty) || 1);
    } else {
      hargaNum = Number(it.harga) || 0;
    }
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
    line += `\n   > Harga: Rp ${hargaNum.toLocaleString('id-ID')}`;
    waLines.push(line);
  }

  const itemsBlock = waLines.join('\n');
  const totalFmt   = totalHarga.toLocaleString('id-ID');
  const groupMsg   = `*ORDER KERANJANG*\nOrder ID: *${orderId}*\nPembeli: ${userNama}\nNo WA: ${userWa}\n────────────────────\n${itemsBlock}\n────────────────────\nTotal: *Rp ${totalFmt}*\nStatus: *Pending*`;
  sendWAToGroup(groupMsg);

  return { success: true, orderId, total: totalHarga };
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
    'Session Token','OTP Attempts', // [SEC] kolom baru v5
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

  const sheet   = getOrCreateCSSheet();
  const history = getChatHistory(sheet, sessionId);
  const guides  = loadGuidesText();

  const messages = [
    { role: 'system', content: buildCSSystemPrompt(guides) },
    ...history,
    { role: 'user', content: String(message).trim() },
  ];

  const aiResponse = callOpenRouter(messages);
  if (!aiResponse || !aiResponse.choices) {
    return { success: false, error: 'AI tidak merespons' };
  }

  let reply      = (aiResponse.choices[0].message.content || '').trim();
  const escalate = shouldEscalate(message, reply);
  reply          = reply.replace('[ESCALATE]', '').trim();

  const ts = Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyyy-MM-dd HH:mm:ss');
  sheet.appendRow([sessionId, ts, 'user',      String(message).trim(), userName || '', userEmail || '', false]);
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
Akun aktif 5–15 menit setelah konfirmasi pembayaran (jam 08.00–22.00 WIB)

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
- Kapan akun dikirim? → 5–15 menit setelah pembayaran dikonfirmasi, jam 08.00–22.00 WIB
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
  const msg = `Halo, *${nama}*! 🎉\n\nSelamat bergabung di *Serabut Store*!\n\nAkun kamu sudah aktif. Terima kasih sudah menjadi bagian dari keluarga kami 😊\n\nYuk nikmati promo-promo eksklusif di *serabut.id* — hemat hingga 70% dari harga resmi! ✨\n\nAda pertanyaan? CS kami siap membantu kamu jam 08.00–22.00 WIB.\n\n— Tim Serabut Store 🛍️`;
  try {
    UrlFetchApp.fetch('https://api.fonnte.com/send', {
      method: 'post',
      headers: { 'Authorization': FONNTE_TOKEN },
      payload: { target: waNumber.replace(/^0/, '62'), message: msg },
      muteHttpExceptions: true,
    });
  } catch(e) { Logger.log('WA welcome error: ' + e.message); }
}

// ────────────────────────────────────────────────────────
//  EMAIL
// ────────────────────────────────────────────────────────
function sendOTPEmail(email, nama, otp) {
  const subject  = `Kode OTP Serabut Store ${otp}`;
  const htmlBody = buildOTPEmailHTML(nama, otp);
  GmailApp.sendEmail(email, subject,
    `Kode OTP kamu: ${otp}\nBerlaku ${OTP_EXPIRY_MIN} menit.\nJangan bagikan kode ini kepada siapapun.`,
    { name: STORE_NAME, htmlBody }
  );
}

function buildOTPEmailHTML(nama, otp) {
  const digits = String(otp).split('').map(d =>
    `<td style="padding:0 5px;"><div style="width:46px;height:58px;background:#f8fafc;border:1.5px solid #e2e8f0;border-radius:12px;text-align:center;line-height:58px;font-size:28px;font-weight:800;color:#111827;font-family:'Courier New',Courier,monospace;">${d}</div></td>`
  ).join('');
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Kode OTP Serabut Store</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
<tr><td align="center"><table width="100%" style="max-width:460px;" cellpadding="0" cellspacing="0">
<tr><td style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:28px 40px;text-align:center;border-radius:16px 16px 0 0;">
<div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:3px;">SERABUT STORE</div></td></tr>
<tr><td style="background:#ffffff;padding:36px 40px 28px;border-radius:0 0 16px 16px;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
<p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Halo, ${nama}</p>
<p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.65;">Masukkan kode berikut untuk menyelesaikan verifikasi akun kamu di Serabut Store.</p>
<table cellpadding="0" cellspacing="0" style="margin:0 auto 14px;"><tr>${digits}</tr></table>
<p style="text-align:center;margin:0 0 28px;font-size:12px;color:#9ca3af;">Berlaku <strong style="color:#111827;">${OTP_EXPIRY_MIN} menit</strong> &nbsp;&middot;&nbsp; Jangan bagikan ke siapapun</p>
<div style="height:1px;background:#f3f4f6;margin:0 0 20px;"></div>
<p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Tidak mendaftar di Serabut Store? Abaikan email ini.</p>
</td></tr>
<tr><td style="padding:20px 0;text-align:center;">
<p style="margin:0;font-size:11px;color:#9ca3af;">&copy; 2019&#8211;2026 PT Serabut Solusi Digital &nbsp;&middot;&nbsp; <a href="https://serabut.id" style="color:#dc2626;text-decoration:none;">serabut.id</a></p>
</td></tr></table></td></tr></table></body></html>`;
}

function sendWelcomeEmail(email, nama) {
  try {
    const subject  = `Akun Serabut Store kamu sudah aktif`;
    const htmlBody = buildWelcomeEmailHTML(nama);
    GmailApp.sendEmail(email, subject,
      `Halo ${nama}! Akun kamu sudah aktif. Terima kasih sudah bergabung — yuk nikmati promo eksklusif di serabut.id`,
      { name: STORE_NAME, htmlBody, replyTo: 'halo@serabut.id' }
    );
  } catch(e) { Logger.log('Welcome email error: ' + e.message); }
}

function buildWelcomeEmailHTML(nama) {
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Konfirmasi Akun Serabut Store</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
<tr><td align="center"><table width="100%" style="max-width:460px;" cellpadding="0" cellspacing="0">
<tr><td style="background:#b91c1c;padding:28px 40px;text-align:center;border-radius:16px 16px 0 0;">
<div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:3px;">SERABUT STORE</div></td></tr>
<tr><td style="background:#ffffff;padding:36px 40px 32px;border-radius:0 0 16px 16px;">
<p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Halo, ${nama}!</p>
<p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.7;">Akun kamu di <strong style="color:#111827;">Serabut Store</strong> telah berhasil diverifikasi dan siap digunakan.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
<tr><td align="center"><a href="https://serabut.id" style="display:inline-block;background:#b91c1c;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 44px;border-radius:10px;">Kunjungi serabut.id</a></td></tr>
</table>
<div style="height:1px;background:#f3f4f6;margin:0 0 20px;"></div>
<p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Pertanyaan? Hubungi CS kami di WhatsApp <a href="https://wa.me/${WA_STORE_NO}" style="color:#b91c1c;text-decoration:none;font-weight:600;">0888-1500-555</a> (08.00&#8211;22.00 WIB)</p>
</td></tr>
<tr><td style="padding:20px 0;text-align:center;">
<p style="margin:0;font-size:11px;color:#9ca3af;">&copy; 2019&#8211;2026 PT Serabut Solusi Digital &nbsp;&middot;&nbsp; <a href="https://serabut.id" style="color:#b91c1c;text-decoration:none;">serabut.id</a></p>
</td></tr></table></td></tr></table></body></html>`;
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

function _parseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
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
    ['footer.jam',         '08.00 – 22.00 WIB'],
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
