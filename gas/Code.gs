// ═══════════════════════════════════════════════════════
//  SERABUT STORE — Google Apps Script Backend v4
// ═══════════════════════════════════════════════════════

const SPREADSHEET_ID = '1ZHvmuE6r-cmygFBCKSThmlevKGLcByqhmOb0WvrKZ3I';
const TAB_CATALOG    = 'Catalog';
const TAB_USERS      = 'Users-web';
const TAB_ORDERS     = 'Orders';
const TAB_SETTINGS   = 'Settings';

const FONNTE_TOKEN         = 'jwTYdGg2eoSrTx3MRpcE';
const WA_GROUP_ID          = ''; // isi ID group WA personal (untuk notif order lama)
const WA_GROUP_ESCALATION  = '120363172991002805@g.us'; // Escalation Serabut Team
const WA_STORE_NO    = '628881500555';
const STORE_NAME     = 'Serabut Store';
const OTP_EXPIRY_MIN = 10;

const TAB_CS         = 'CS-Sessions';
const OPENROUTER_KEY = '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';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

// ── Kolom Users-web (0-indexed) ──────────────────────────
// 0:Nama  1:Email  2:No Hp  3:Password  4:Created At  5:Status
// 6:OTP   7:OTP Expiry  8:Role
// 9:TanggalLahir  10:JenisKelamin  11:Alamat  12:Provinsi

// ── Kolom Catalog (0-indexed) ───────────────────────────
// 0:Nama  1:Varian  2:MasaAktif  3:Harga  4:LinkProduk  5:Aktif  6:Stok  7:IconUrl

// ────────────────────────────────────────────────────────
//  MAIN HANDLER
// ────────────────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      case 'getCatalog':        result = getCatalog(); break;
      case 'checkStatus':       result = checkStatus(e.parameter.type, e.parameter.query); break;
      case 'smartSearch':       result = smartSearch(e.parameter.query); break;
      case 'register':          result = register(e.parameter); break;
      case 'verifyOTP':         result = verifyOTP(e.parameter); break;
      case 'resendOTP':         result = resendOTP(e.parameter); break;
      case 'login':             result = login(e.parameter); break;
      case 'createOrder':       result = createOrder(e.parameter); break;
      case 'getOrders':         result = getOrders(e.parameter); break;
      case 'getProfile':        result = getProfile(e.parameter); break;
      case 'updateProfile':     result = updateProfile(e.parameter); break;
      case 'changePassword':    result = changePassword(e.parameter); break;
      // Admin actions
      case 'getSettings':       result = getSettings(); break;
      case 'saveSettings':      result = saveSettings(e.parameter); break;
      case 'getCatalogAdmin':   result = getCatalogAdmin(e.parameter); break;
      case 'addProduct':        result = addProduct(e.parameter); break;
      case 'updateProduct':     result = updateProduct(e.parameter); break;
      case 'deleteProduct':     result = deleteProduct(e.parameter); break;
      case 'getAllOrders':       result = getAllOrders(e.parameter); break;
      case 'updateOrderStatus': result = updateOrderStatus(e.parameter); break;
      case 'getGuides':         result = getGuides(); break;
      case 'saveGuides':        result = saveGuides(e.parameter); break;
      case 'setUserRole':         result = setUserRole(e.parameter); break;
      case 'updateProductStock':    result = updateProductStock(e.parameter); break;
      case 'updateProductAktif':    result = updateProductAktif(e.parameter); break;
      case 'saveProductBenefits':   result = saveProductBenefits(e.parameter); break;
      case 'googleLogin':         result = googleLogin(e.parameter); break;
      case 'csChat':              result = handleCSChat(e.parameter); break;
      default: result = { success: false, error: 'Unknown action' };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ────────────────────────────────────────────────────────
//  POST HANDLER (CS Agent)
// ────────────────────────────────────────────────────────
function doPost(e) {
  let params;
  try { params = JSON.parse(e.postData.contents); } catch(_) { params = {}; }

  let result;
  try {
    switch (params.action) {
      case 'csChat': result = handleCSChat(params); break;
      default: result = { success: false, error: 'Unknown action' };
    }
  } catch (err) {
    result = { success: false, error: err.message };
  }

  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ────────────────────────────────────────────────────────
//  ADMIN — helper cek role
// ────────────────────────────────────────────────────────
function isAdminUser(email) {
  if (!email) return false;
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return false;
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== email.toLowerCase().trim()) continue;
    // Cari kolom Role secara dinamis berdasarkan header
    const role = _getUserRole(data, i);
    return role === 'admin';
  }
  return false;
}

// Cari nilai Role dari row — cek header dulu, fallback ke index 8
function _getUserRole(data, rowIdx) {
  const headers = data[0].map(h => String(h).toLowerCase().trim());
  const roleCol = headers.findIndex(h => h === 'role');
  const col = roleCol !== -1 ? roleCol : 8;
  return String(data[rowIdx][col] || 'buyer').trim().toLowerCase();
}

// Format nilai sel date dari GSheet — Date object → 'yyyy-MM-dd', string tetap apa adanya
function _formatDateCell(val) {
  if (!val) return '';
  if (val instanceof Date) return Utilities.formatDate(val, 'Asia/Jakarta', 'yyyy-MM-dd');
  return String(val).trim();
}

// Cari index kolom berdasarkan nama header (case-insensitive, trim)
function _colIndex(headers, ...names) {
  for (const name of names) {
    const n = name.toLowerCase();
    const idx = headers.findIndex(h => String(h).toLowerCase().trim() === n);
    if (idx !== -1) return idx;
  }
  return -1;
}

// ────────────────────────────────────────────────────────
//  GET CATALOG (public — hanya aktif)
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
//  GET CATALOG ADMIN (semua produk termasuk nonaktif)
// ────────────────────────────────────────────────────────
function getCatalogAdmin({ adminEmail }) {
  if (!isAdminUser(adminEmail)) return { success: false, error: 'Akses ditolak' };

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
function addProduct({ adminEmail, nama, varian, masaAktif, harga, linkProduk, aktif, stok, iconUrl, kategori, benefits }) {
  if (!isAdminUser(adminEmail)) return { success: false, error: 'Akses ditolak' };
  if (!nama || !varian) return { success: false, error: 'Nama dan varian wajib diisi' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_CATALOG);

  if (!sheet) {
    sheet = ss.insertSheet(TAB_CATALOG);
    sheet.appendRow(['Nama Produk', 'Varian', 'Masa Aktif', 'Harga', 'Link Produk', 'Aktif', 'Stok', 'Kategori', 'Icon URL']);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  const headers  = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const cKat     = _colIndex(headers, 'kategori', 'category');
  const cIcon    = _colIndex(headers, 'icon url', 'iconurl', 'icon_url');
  const cBen     = _colIndex(headers, 'deskripsi', 'benefits', 'benefit');
  const numCols  = Math.max(headers.length, cBen >= 0 ? cBen + 1 : 15);

  const row      = new Array(numCols).fill('');
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

  // Fallback: tulis benefits ke col O (15) jika header tidak ditemukan
  if (benefits !== undefined && benefits !== null && benefits !== '' && cBen < 0) {
    sheet.getRange(sheet.getLastRow(), 15).setValue(String(benefits).trim());
  }

  return { success: true };
}

// ────────────────────────────────────────────────────────
//  UPDATE PRODUCT
// ────────────────────────────────────────────────────────
function updateProduct({ adminEmail, rowIndex, nama, varian, masaAktif, harga, linkProduk, aktif, stok, iconUrl, kategori, benefits }) {
  if (!isAdminUser(adminEmail)) return { success: false, error: 'Akses ditolak' };
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
//  UPDATE PRODUCT STOCK (quick update dari admin)
// ────────────────────────────────────────────────────────
function updateProductStock({ adminEmail, rowIndex, stok }) {
  if (!isAdminUser(adminEmail)) return { success: false, error: 'Akses ditolak' };
  if (!rowIndex) return { success: false, error: 'rowIndex diperlukan' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  const stokVal = (stok === '' || stok === null || stok === undefined) ? '' : Number(stok);
  sheet.getRange(Number(rowIndex), 7).setValue(stokVal);

  return { success: true };
}

// ────────────────────────────────────────────────────────
//  GOOGLE LOGIN / AUTO-REGISTER
// ────────────────────────────────────────────────────────
function googleLogin({ email, nama }) {
  if (!email) return { success: false, error: 'Email diperlukan' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_USERS);

  if (!sheet) {
    sheet = ss.insertSheet(TAB_USERS);
    sheet.appendRow(['Nama', 'Email', 'No Hp', 'Password', 'Created At', 'Status', 'OTP', 'OTP Expiry', 'Role']);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  const data = sheet.getDataRange().getValues();
  const emailNorm = email.toLowerCase().trim();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== emailNorm) continue;
    // Jika Pending → auto-aktifkan
    if (String(data[i][5]).trim() === 'Pending') {
      sheet.getRange(i + 1, 6).setValue('Aktif');
    }
    const role = _getUserRole(data, i);
    return {
      success: true,
      user: { nama: String(data[i][0]), email: String(data[i][1]), wa: String(data[i][2]), role: role || 'buyer' }
    };
  }

  // Buat user baru (Google SSO = auto aktif, tanpa password)
  const displayNama = (nama || emailNorm.split('@')[0]).trim();
  const createdAt   = formatJkt(new Date(), 'yyyy-MM-dd HH:mm:ss');
  sheet.appendRow([displayNama, emailNorm, '', '', createdAt, 'Aktif', '', '', 'buyer']);

  return {
    success: true,
    user: { nama: displayNama, email: emailNorm, wa: '', role: 'buyer' }
  };
}

// ────────────────────────────────────────────────────────
//  UPDATE PRODUCT AKTIF (quick toggle dari admin)
// ────────────────────────────────────────────────────────
function updateProductAktif({ adminEmail, rowIndex, aktif }) {
  if (!isAdminUser(adminEmail)) return { success: false, error: 'Akses ditolak' };
  if (!rowIndex) return { success: false, error: 'rowIndex diperlukan' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  sheet.getRange(Number(rowIndex), 6).setValue(aktif === 'true' || aktif === true);

  return { success: true };
}

// ────────────────────────────────────────────────────────
//  SAVE PRODUCT BENEFITS (simpan deskripsi per-baris)
// ────────────────────────────────────────────────────────
function saveProductBenefits({ adminEmail, rowIndex, benefits }) {
  if (!isAdminUser(adminEmail)) return { success: false, error: 'Akses ditolak' };
  if (!rowIndex) return { success: false, error: 'rowIndex diperlukan' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  sheet.getRange(Number(rowIndex), 15).setValue(String(benefits || '[]').trim());

  return { success: true };
}

// ────────────────────────────────────────────────────────
//  DELETE PRODUCT
// ────────────────────────────────────────────────────────
function deleteProduct({ adminEmail, rowIndex }) {
  if (!isAdminUser(adminEmail)) return { success: false, error: 'Akses ditolak' };
  if (!rowIndex) return { success: false, error: 'rowIndex diperlukan' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  sheet.deleteRow(Number(rowIndex));
  return { success: true };
}

// ────────────────────────────────────────────────────────
//  GET ALL ORDERS (admin)
// ────────────────────────────────────────────────────────
function getAllOrders({ adminEmail }) {
  if (!isAdminUser(adminEmail)) return { success: false, error: 'Akses ditolak' };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_ORDERS);
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
function updateOrderStatus({ adminEmail, rowIndex, status }) {
  if (!isAdminUser(adminEmail)) return { success: false, error: 'Akses ditolak' };
  if (!rowIndex || !status) return { success: false, error: 'Data tidak lengkap' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: false, error: 'Tab Orders tidak ditemukan' };

  sheet.getRange(Number(rowIndex), 10).setValue(status);
  return { success: true };
}

// ────────────────────────────────────────────────────────
//  SET USER ROLE (admin)
// ────────────────────────────────────────────────────────
function setUserRole({ adminEmail, targetEmail, role }) {
  if (!isAdminUser(adminEmail)) return { success: false, error: 'Akses ditolak' };
  if (!targetEmail || !role) return { success: false, error: 'Data tidak lengkap' };

  const validRoles = ['buyer', 'admin'];
  if (!validRoles.includes(role)) return { success: false, error: 'Role tidak valid' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== targetEmail.toLowerCase().trim()) continue;
    sheet.getRange(i + 1, 9).setValue(role); // col 9 = index 8 = Role
    return { success: true };
  }
  return { success: false, error: 'Email tidak ditemukan' };
}

// ────────────────────────────────────────────────────────
//  GET SETTINGS
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
function saveSettings({ adminEmail, key, value }) {
  if (!isAdminUser(adminEmail)) return { success: false, error: 'Akses ditolak' };
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

  // Key belum ada → tambah baris baru
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
function saveGuides({ adminEmail, tab, guidesJson }) {
  if (!isAdminUser(adminEmail)) return { success: false, error: 'Akses ditolak' };
  const validTabs = ['office365', 'windows', 'adobe'];
  if (!validTabs.includes(tab)) return { success: false, error: 'Tab tidak valid' };

  return saveSettings({ adminEmail, key: `guides.${tab}`, value: guidesJson });
}

// ────────────────────────────────────────────────────────
//  HELPERS — Settings
// ────────────────────────────────────────────────────────
function _parseJSON(str, fallback) {
  try { return JSON.parse(str); } catch { return fallback; }
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
    ['categories', JSON.stringify([
      {name:'Office 365',desc:'Family & Personal',iconKey:'office365'},
      {name:'Adobe',     desc:'Creative Cloud',   iconKey:'adobe'},
      {name:'Windows',   desc:'Pro License',      iconKey:'windows'},
      {name:'Office',    desc:'2019/2021/2024',   iconKey:'office'},
      {name:'Google',    desc:'Workspace & Suite',iconKey:'google'},
      {name:'CorelDRAW', desc:'Graphics Suite',   iconKey:'coreldraw'},
      {name:'Project',   desc:'Ms Project Pro',   iconKey:'project'},
      {name:'Visio',     desc:'Ms Visio Pro',     iconKey:'visio'},
    ])],
    ['guides.office365', JSON.stringify([
      {title:'Cara Install Microsoft Office 365',steps:['Buka browser dan kunjungi office.com, lalu login menggunakan email dan password akun Office 365 yang diberikan Serabut Store.','Setelah login, klik tombol "Install Office" di pojok kanan atas halaman.','Pilih "Office 365 apps" untuk download installer (OfficeSetup.exe).','Jalankan file installer dan ikuti proses instalasi.','Tunggu proses download & instalasi selesai (~15-30 menit).','Buka salah satu aplikasi Office — login dengan akun yang sama untuk aktivasi otomatis.'],note:'Pastikan koneksi internet stabil selama proses download.'},
      {title:'Menambahkan Akun ke Perangkat Baru',steps:['Buka aplikasi Office di perangkat baru.','Klik "Sign In" atau "Masuk".','Masukkan email akun Office 365 yang diberikan.','Masukkan password — aktivasi berjalan otomatis.'],note:'Office 365 Family mendukung hingga 6 pengguna & 5 perangkat per pengguna.'},
      {title:'Akses OneDrive 1TB',steps:['Login ke office.com.','Klik ikon OneDrive di menu aplikasi.','Kamu mendapat storage 1TB per pengguna.','Install OneDrive Desktop App untuk sinkronisasi otomatis.'],note:'OneDrive 1TB tersedia untuk setiap pengguna di paket Family dan Personal.'},
      {title:'Troubleshooting: Office Tidak Bisa Aktivasi',steps:['Pastikan login dengan email yang benar.','Sign out semua perangkat: account.microsoft.com → Security → Sign out everywhere.','Uninstall Office, lalu install ulang dari office.com.','Pastikan tanggal & waktu di komputer sudah benar.','Hubungi support kami jika masih gagal.'],note:'Jangan gunakan tools aktivasi pihak ketiga — bisa menyebabkan akun diblokir Microsoft.'},
    ])],
    ['guides.windows', JSON.stringify([
      {title:'Aktivasi Windows 10 Pro dengan License Key',steps:['Klik kanan Start → System.','Klik "Change product key or upgrade your edition".','Masukkan license key 25 digit (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX).','Klik Next dan tunggu aktivasi selesai.','Cek Settings → Update & Security → Activation.'],note:'License key hanya untuk 1 perangkat.'},
      {title:'Aktivasi Windows 11 Pro dengan License Key',steps:['Tekan Windows + I → System → Activation.','Klik "Change product key".','Masukkan license key 25 digit.','Klik Next — tunggu konfirmasi "Windows is activated".','Restart komputer.'],note:'Pastikan koneksi internet aktif saat aktivasi.'},
      {title:'Troubleshooting: Error Aktivasi Windows',steps:['Pastikan key dimasukkan benar (O vs 0, I vs 1).','Coba via CMD (Admin): slmgr /ipk XXXXX-XXXXX-XXXXX-XXXXX-XXXXX','Error 0xC004F050: key tidak kompatibel dengan edisi Windows.','Screenshot error dan kirim ke support kami via WhatsApp.'],note:'Catat kode error untuk mempermudah troubleshooting.'},
    ])],
    ['guides.adobe', JSON.stringify([
      {title:'Cara Install Adobe Creative Cloud',steps:['Login ke creativecloud.adobe.com dengan akun dari Serabut Store.','Download & install Adobe Creative Cloud Desktop App.','Login dengan akun yang sama.','Pilih aplikasi yang ingin diinstall, klik Install.'],note:'Satu akun Adobe CC bisa digunakan di 2 perangkat.'},
      {title:'Troubleshooting: Adobe Tidak Bisa Login',steps:['Pastikan email dan password benar.','Coba di incognito browser.','Hapus cache browser.','Uninstall CC Desktop App, download versi terbaru.','Hubungi support jika masih gagal.'],note:'Jangan ganti password akun Adobe yang diberikan.'},
    ])],
  ];

  defaults.forEach(row => sheet.appendRow(row));
}

// ────────────────────────────────────────────────────────
//  SMART SEARCH — cari di List Account 365 + Family
// ────────────────────────────────────────────────────────
function smartSearch(query) {
  if (!query || !String(query).trim()) return { success: false, error: 'Query kosong' };

  const ss      = SpreadsheetApp.openById(SPREADSHEET_ID);
  const q       = String(query).toLowerCase().trim();
  const results = [];

  const SHEETS = ['List Account 365', 'List Account 365 Family'];

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
        getVal(row, col.buyerName),
        getVal(row, col.mailActive),
        getVal(row, col.emailActive),
        getVal(row, col.msa),
        getVal(row, col.officeAcc),
        getVal(row, col.wa),
      ].filter(v => v).map(v => v.toLowerCase());

      if (!searchable.some(v => v.includes(q))) continue;

      results.push({
        sumber:       sheetName,
        nama:         getVal(row, col.buyerName),
        emailPembeli: getVal(row, col.mailActive) || getVal(row, col.emailActive),
        officeAccount:getVal(row, col.officeAcc) || getVal(row, col.msa),
        wa:           getVal(row, col.wa),
        masaBerlaku:  getDateVal(row, col.endDate),
        mulaiLangganan: getDateVal(row, col.startDate),
        status:       getVal(row, col.status) || 'Aktif',
        durasi:       getVal(row, col.duration),
        tipe:         getVal(row, col.subscription) || (sheetName.includes('Family') ? 'Family' : 'Personal'),
      });
    }
  }

  return { success: true, data: results };
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

// ────────────────────────────────────────────────────────
//  CHECK STATUS AKUN
// ────────────────────────────────────────────────────────
function checkStatus(type, query) {
  if (!type || !query) return { success: false, error: 'Parameter tidak lengkap' };

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

  const q = String(query).toLowerCase().trim();
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
//  REGISTER → simpan Pending + kirim OTP email
// ────────────────────────────────────────────────────────
function register({ nama, email, wa, password, privacyConsent }) {
  if (!nama || !email || !wa || !password) {
    return { success: false, error: 'Semua field harus diisi' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_USERS);

  if (!sheet) {
    sheet = ss.insertSheet(TAB_USERS);
  }
  ensureUserSheetHeaders(sheet);

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() === email.toLowerCase().trim()) {
      const status = String(data[i][5] || '').trim();
      if (status === 'Pending') {
        return sendNewOTP(sheet, i + 1, email.toLowerCase().trim(), String(data[i][0]));
      }
      return { success: false, error: 'Email sudah terdaftar' };
    }
  }

  const otp       = generateOTP();
  const expiry    = getOTPExpiry();
  const createdAt = formatJkt(new Date(), 'yyyy-MM-dd HH:mm:ss');
  const privacyTs = privacyConsent
    ? `I Accept – Kebijakan Privasi Serabut Store | ${formatJkt(new Date(), 'dd MMM yyyy, HH:mm')} WIB`
    : '';

  sheet.appendRow([
    nama.trim(),
    email.toLowerCase().trim(),
    wa.trim(),
    password,
    createdAt,
    'Pending',
    privacyTs,  // col G: Privacy Notice
    otp,        // col H
    expiry,     // col I
    'buyer',    // col J: Role
  ]);

  sendOTPEmail(email.toLowerCase().trim(), nama.trim(), otp);

  return { success: true, action: 'verify_otp', email: email.toLowerCase().trim() };
}

// ────────────────────────────────────────────────────────
//  VERIFY OTP
// ────────────────────────────────────────────────────────
function verifyOTP({ email, otp }) {
  if (!email || !otp) return { success: false, error: 'Data tidak lengkap' };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== email.toLowerCase().trim()) continue;

    const storedOTP = String(data[i][7] || '').trim();
    const expiryStr = String(data[i][8] || '').trim();
    const status    = String(data[i][5] || '').trim();
    const role      = _getUserRole(data, i);

    if (status === 'Aktif') return { success: false, error: 'Akun sudah aktif, silakan login' };
    if (!storedOTP)         return { success: false, error: 'OTP tidak ditemukan, daftar ulang' };

    if (new Date() > new Date(expiryStr)) {
      return { success: false, error: `OTP kadaluarsa. Klik "Kirim Ulang OTP".` };
    }
    if (String(otp).trim() !== storedOTP) {
      return { success: false, error: 'Kode OTP salah' };
    }

    const row = i + 1;
    sheet.getRange(row, 6).setValue('Aktif');
    sheet.getRange(row, 8).setValue('');  // clear OTP (col H)
    sheet.getRange(row, 9).setValue('');  // clear OTP Expiry (col I)

    const userName = String(data[i][0]);
    const userWa   = String(data[i][2]);
    sendWelcomeEmail(email.toLowerCase().trim(), userName);
    sendWAWelcome(userWa, userName);

    return {
      success: true,
      user: {
        nama:  String(data[i][0]),
        email: String(data[i][1]),
        wa:    String(data[i][2]),
        role:  role || 'buyer',
      },
    };
  }

  return { success: false, error: 'Email tidak ditemukan' };
}

// ────────────────────────────────────────────────────────
//  RESEND OTP
// ────────────────────────────────────────────────────────
function resendOTP({ email }) {
  if (!email) return { success: false, error: 'Email tidak boleh kosong' };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() === email.toLowerCase().trim()) {
      if (String(data[i][5]).trim() === 'Aktif') {
        return { success: false, error: 'Akun sudah aktif, silakan login' };
      }
      return sendNewOTP(sheet, i + 1, email.toLowerCase().trim(), String(data[i][0]));
    }
  }
  return { success: false, error: 'Email tidak ditemukan' };
}

function sendNewOTP(sheet, sheetRow, email, nama) {
  const otp    = generateOTP();
  const expiry = getOTPExpiry();
  sheet.getRange(sheetRow, 8).setValue(otp);    // col H
  sheet.getRange(sheetRow, 9).setValue(expiry); // col I
  sendOTPEmail(email, nama, otp);
  return { success: true, action: 'verify_otp', email };
}

// ────────────────────────────────────────────────────────
//  LOGIN
// ────────────────────────────────────────────────────────
function login({ email, password }) {
  if (!email || !password) return { success: false, error: 'Email dan password harus diisi' };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'Belum ada user terdaftar' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[1]).toLowerCase().trim() !== email.toLowerCase().trim()) continue;

    const status = String(row[5] || 'Aktif').trim();
    if (status === 'Pending') {
      return { success: false, error: 'Akun belum diverifikasi. Cek email kamu untuk kode OTP.' };
    }
    if (String(row[3]) === String(password)) {
      const role = _getUserRole(data, i);
      return {
        success: true,
        user: {
          nama:  row[0],
          email: row[1],
          wa:    row[2],
          role:  role,
        }
      };
    }
    return { success: false, error: 'Password salah' };
  }
  return { success: false, error: 'Email tidak terdaftar' };
}

// ────────────────────────────────────────────────────────
//  CREATE ORDER
// ────────────────────────────────────────────────────────
function createOrder({ userNama, userEmail, userWa, produk, varian, masaAktif, harga, msNama, username, microsoftEmail, emailAktif, emailReminder }) {
  if (!userEmail || !produk || !harga) return { success: false, error: 'Data tidak lengkap' };

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
  const hargaNum = Number(harga) || 0;

  sheet.appendRow([
    orderId, tanggal, userNama, userEmail, userWa,
    produk, varian || '-', masaAktif || '-', hargaNum, 'Pending',
    msNama || '-', username || '-', microsoftEmail || '-', emailAktif || '-', emailReminder || '-'
  ]);

  const varLower = (varian || '').toLowerCase();
  const isFamily = varLower.includes('family');
  const isWeb    = varLower.includes('web');

  let groupMsg;
  const reminderLine = emailReminder ? `\nEmail Reminder: ${emailReminder}` : '';
  if (isFamily) {
    groupMsg =
      `*ORDER 365 FAMILY*\n` +
      `Order ID: *${orderId}*\n` +
      `Email Microsoft (invite): *${microsoftEmail || '-'}*\n` +
      `Email Aktif: ${emailAktif || '-'}${reminderLine}\n` +
      `Durasi: ${masaAktif || '-'}\n` +
      `Nama Pembeli: ${userNama}\n` +
      `No WA: ${userWa}\n` +
      `Status: *Pending*`;
  } else if (isWeb) {
    groupMsg =
      `*ORDER 365 WEB*\n` +
      `Order ID: *${orderId}*\n` +
      `Nama MS: ${msNama || '-'}\n` +
      `Username Request: *${username || '-'}*\n` +
      `Email Aktif: ${emailAktif || '-'}${reminderLine}\n` +
      `Durasi: ${masaAktif || '-'}\n` +
      `No WA: ${userWa}\n` +
      `Status: *Pending*`;
  } else {
    groupMsg =
      `*ORDER BARU*\n` +
      `Order ID: *${orderId}*\n` +
      `Produk: ${produk}\n` +
      `Varian: ${varian || '-'}\n` +
      `Durasi: ${masaAktif || '-'}\n` +
      `Nama: ${userNama}\n` +
      `Email Aktif: ${emailAktif || '-'}${reminderLine}\n` +
      `No WA: ${userWa}\n` +
      `Status: *Pending*`;
  }

  sendWAToGroup(groupMsg);

  return { success: true, orderId };
}

// ────────────────────────────────────────────────────────
//  GET PROFILE
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
  const needed = ['Nama','Email','No Hp','Password','Created At','Status','Privacy Notice','OTP','OTP Expiry','Role','Tanggal Lahir','Jenis Kelamin','Kota','Provinsi'];
  const cur = sheet.getRange(1, 1, 1, needed.length).getValues()[0];
  const changed = needed.some((h, i) => String(cur[i]||'').trim() !== h);
  if (changed) sheet.getRange(1, 1, 1, needed.length).setValues([needed]).setFontWeight('bold');
}

function getProfile({ email }) {
  if (!email) return { success: false, error: 'Email kosong' };
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data = sheet.getDataRange().getValues();
  const cols = _profileCols(data[0]);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== email.toLowerCase().trim()) continue;
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
//  UPDATE PROFILE
// ────────────────────────────────────────────────────────
function updateProfile({ email, nama, tanggalLahir, jenisKelamin, alamat, provinsi }) {
  if (!email || !nama) return { success: false, error: 'Data tidak lengkap' };
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  ensureUserSheetHeaders(sheet);
  const data = sheet.getDataRange().getValues();
  const cols = _profileCols(data[0]);
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== email.toLowerCase().trim()) continue;
    const row  = i + 1;
    const role = _getUserRole(data, i);
    sheet.getRange(row, 1).setValue(nama.trim());
    if (cols.tgl  >= 0) sheet.getRange(row, cols.tgl  + 1).setValue(tanggalLahir  || '');
    if (cols.jk   >= 0) sheet.getRange(row, cols.jk   + 1).setValue(jenisKelamin || '');
    if (cols.kota >= 0) sheet.getRange(row, cols.kota + 1).setValue(alamat        || '');
    if (cols.prov >= 0) sheet.getRange(row, cols.prov + 1).setValue(provinsi      || '');
    return {
      success: true,
      user: { nama: nama.trim(), email: String(data[i][1]), wa: String(data[i][2]), role }
    };
  }
  return { success: false, error: 'User tidak ditemukan' };
}

// ────────────────────────────────────────────────────────
//  CHANGE PASSWORD
// ────────────────────────────────────────────────────────
function changePassword({ email, oldPassword, newPassword }) {
  if (!email || !oldPassword || !newPassword) return { success: false, error: 'Data tidak lengkap' };
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== email.toLowerCase().trim()) continue;
    if (String(data[i][3]) !== String(oldPassword)) {
      return { success: false, error: 'Password lama salah' };
    }
    sheet.getRange(i + 1, 4).setValue(newPassword);
    return { success: true };
  }
  return { success: false, error: 'User tidak ditemukan' };
}

// ────────────────────────────────────────────────────────
//  GET ORDERS (by email)
// ────────────────────────────────────────────────────────
function getOrders({ email }) {
  if (!email) return { success: false, error: 'Email tidak boleh kosong' };

  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_ORDERS);
  if (!sheet) return { success: true, data: [] };

  const data    = sheet.getDataRange().getValues();
  const orders  = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (String(row[3]).toLowerCase().trim() !== email.toLowerCase().trim()) continue;
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
//  EMAIL — OTP
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
  return `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Kode OTP Serabut Store</title></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:460px;" cellpadding="0" cellspacing="0">

  <tr>
    <td style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:28px 40px;text-align:center;border-radius:16px 16px 0 0;">
      <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:3px;">SERABUT STORE</div>
    </td>
  </tr>

  <tr>
    <td style="background:#ffffff;padding:36px 40px 28px;border-radius:0 0 16px 16px;box-shadow:0 8px 32px rgba(0,0,0,0.08);">
      <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Halo, ${nama}</p>
      <p style="margin:0 0 28px;font-size:14px;color:#6b7280;line-height:1.65;">Masukkan kode berikut untuk menyelesaikan verifikasi akun kamu di Serabut Store.</p>

      <table cellpadding="0" cellspacing="0" style="margin:0 auto 14px;">
        <tr>${digits}</tr>
      </table>

      <p style="text-align:center;margin:0 0 28px;font-size:12px;color:#9ca3af;">Berlaku <strong style="color:#111827;">${OTP_EXPIRY_MIN} menit</strong> &nbsp;&middot;&nbsp; Jangan bagikan ke siapapun</p>

      <div style="height:1px;background:#f3f4f6;margin:0 0 20px;"></div>
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Tidak mendaftar di Serabut Store? Abaikan email ini.</p>
    </td>
  </tr>

  <tr>
    <td style="padding:20px 0;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">&copy; 2019&#8211;2026 PT Serabut Solusi Digital &nbsp;&middot;&nbsp; <a href="https://serabut.id" style="color:#dc2626;text-decoration:none;">serabut.id</a></p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ────────────────────────────────────────────────────────
//  EMAIL — Selamat Datang
// ────────────────────────────────────────────────────────
function sendWelcomeEmail(email, nama) {
  try {
    const subject  = `Akun Serabut Store kamu sudah aktif`;
    const htmlBody = buildWelcomeEmailHTML(nama);
    GmailApp.sendEmail(email, subject,
      `Halo ${nama}! Akun kamu sudah aktif. Terima kasih sudah bergabung — yuk nikmati promo eksklusif di serabut.id`,
      { name: STORE_NAME, htmlBody, replyTo: 'halo@serabut.id' }
    );
    Logger.log('Welcome email sent to: ' + email);
  } catch(e) {
    Logger.log('Welcome email error: ' + e.message);
  }
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

function buildWelcomeEmailHTML(nama) {
  return `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Konfirmasi Akun Serabut Store</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:460px;" cellpadding="0" cellspacing="0">

  <tr>
    <td style="background:#b91c1c;padding:28px 40px;text-align:center;border-radius:16px 16px 0 0;">
      <div style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:3px;">SERABUT STORE</div>
    </td>
  </tr>

  <tr>
    <td style="background:#ffffff;padding:36px 40px 32px;border-radius:0 0 16px 16px;">

      <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">Halo, ${nama}!</p>
      <p style="margin:0 0 24px;font-size:14px;color:#6b7280;line-height:1.7;">Akun kamu di <strong style="color:#111827;">Serabut Store</strong> telah berhasil diverifikasi dan siap digunakan.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td width="40" style="width:40px;"><img src="https://serabut.id/icon-tag.svg" width="40" height="40" alt="" style="display:block;border:0;"></td>
              <td style="font-size:13px;color:#374151;padding-left:12px;">Harga terbaik untuk software original</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td width="40" style="width:40px;"><img src="https://serabut.id/icon-zap.svg" width="40" height="40" alt="" style="display:block;border:0;"></td>
              <td style="font-size:13px;color:#374151;padding-left:12px;">Aktivasi cepat setelah pembayaran dikonfirmasi</td>
            </tr></table>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td width="40" style="width:40px;"><img src="https://serabut.id/icon-check.svg" width="40" height="40" alt="" style="display:block;border:0;"></td>
              <td style="font-size:13px;color:#374151;padding-left:12px;">Garansi resmi selama masa aktif</td>
            </tr></table>
          </td>
        </tr>
      </table>

      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        <tr>
          <td align="center">
            <a href="https://serabut.id" style="display:inline-block;background:#b91c1c;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:14px 44px;border-radius:10px;">Kunjungi serabut.id</a>
          </td>
        </tr>
      </table>

      <div style="height:1px;background:#f3f4f6;margin:0 0 20px;"></div>
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">Pertanyaan? Hubungi CS kami di WhatsApp <a href="https://wa.me/${WA_STORE_NO}" style="color:#b91c1c;text-decoration:none;font-weight:600;">0888-1500-555</a> (08.00&#8211;22.00 WIB)</p>
    </td>
  </tr>

  <tr>
    <td style="padding:20px 0;text-align:center;">
      <p style="margin:0;font-size:11px;color:#9ca3af;">&copy; 2019&#8211;2026 PT Serabut Solusi Digital &nbsp;&middot;&nbsp; <a href="https://serabut.id" style="color:#b91c1c;text-decoration:none;">serabut.id</a></p>
    </td>
  </tr>

</table>
</td></tr>
</table>
</body>
</html>`;
}

// ────────────────────────────────────────────────────────
//  WA NOTIFICATION via Fonnte
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

function testWAGroup() {
  sendWAToGroup('Test notif order dari Serabut Store GAS - ' + new Date().toLocaleString());
}

function listFonntGroups() {
  UrlFetchApp.fetch('https://api.fonnte.com/fetch-group', {
    method: 'post', headers: { 'Authorization': FONNTE_TOKEN },
    payload: {}, muteHttpExceptions: true,
  });
  Utilities.sleep(2000);
  const payloads = [{ device: WA_STORE_NO }, { phone: WA_STORE_NO }, { id: WA_STORE_NO }, {}];
  payloads.forEach(function(p) {
    const r = UrlFetchApp.fetch('https://api.fonnte.com/get-group', {
      method: 'post', headers: { 'Authorization': FONNTE_TOKEN },
      payload: p, muteHttpExceptions: true,
    });
    Logger.log('get-group payload=' + JSON.stringify(p) + ' → ' + r.getContentText().substring(0, 500));
  });
}

function testWAGroupAfterSync() {
  UrlFetchApp.fetch('https://api.fonnte.com/fetch-group', {
    method: 'post', headers: { 'Authorization': FONNTE_TOKEN },
    payload: {}, muteHttpExceptions: true,
  });
  Utilities.sleep(3000);
  const r1 = UrlFetchApp.fetch('https://api.fonnte.com/send', {
    method: 'post', headers: { 'Authorization': FONNTE_TOKEN },
    payload: { target: '120363172991002805@g.us', message: 'Test setelah sync - ' + new Date().toLocaleString() },
    muteHttpExceptions: true,
  });
  Logger.log('@g.us → ' + r1.getContentText());
}

// ════════════════════════════════════════════════════════
//  CS AGENT — AI Customer Service
// ════════════════════════════════════════════════════════

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
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  let   sheet = ss.getSheetByName(TAB_CS);
  if (!sheet) {
    sheet = ss.insertSheet(TAB_CS);
    sheet.appendRow(['Session ID', 'Timestamp', 'Role', 'Message', 'User Name', 'User Email', 'Escalated']);
    sheet.getRange(1, 1, 1, 7).setFontWeight('bold');
  }
  return sheet;
}

function callOpenRouter(messages) {
  const payload = {
    model:       'deepseek/deepseek-chat',
    messages,
    max_tokens:  512,
    temperature: 0.7,
  };
  const options = {
    method:             'post',
    contentType:        'application/json',
    headers: {
      'Authorization': 'Bearer ' + OPENROUTER_KEY,
      'HTTP-Referer':  'https://serabut.id',
      'X-Title':       'Serabut CS Agent',
    },
    payload:            JSON.stringify(payload),
    muteHttpExceptions: true,
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
  return `Kamu adalah Sera, AI Customer Service Serabut Store (serabut.id) — toko digital license software terpercaya di Indonesia.

IDENTITAS:
- Nama: Sera
- Bahasa: Indonesia (santai tapi profesional)
- Nada: hangat, to the point, tidak bertele-tele
- Tanda tangan: _— Sera, CS Serabut Store_ (tambahkan di akhir setiap balasan)

PRODUK & HARGA:
1. Microsoft Office 365 Personal (1 device) — 1 tahun: Rp 59.000
2. Microsoft Office 365 Family (5 devices) — 1 tahun: Rp 99.000
3. Adobe Creative Cloud All Apps — bulanan/tahunan: Rp 269.000–3.351.000
4. Windows 10/11 Pro (lifetime): Rp 160.000
5. Microsoft Office 2024 Professional Plus: Rp 800.000
6. Microsoft Office 2021 Professional Plus: Rp 650.000
7. Microsoft Project Pro, Visio, CorelDRAW, G Suite Admin — tersedia, harga tanya CS

CARA INSTALL OFFICE 365:
1. Cek email dari halo@serabut.com (cek folder spam juga)
2. Klik "Accept Invitation" di email tersebut
3. Buat password baru di halaman Microsoft yang muncul
4. Login ke office.com dengan akun yang dikirim
5. Download Office di office.com/install
6. Install, lalu masuk dengan akun Microsoft yang dikirim
Akun aktif 5–15 menit setelah konfirmasi pembayaran

CARA AKTIVASI WINDOWS:
1. Klik kanan Start → Settings → System → Activation
2. Klik "Change product key"
3. Masukkan key yang dikirim via WhatsApp
4. Tunggu verifikasi online otomatis

CARA INSTALL ADOBE CC:
1. Download Adobe Creative Cloud App di creativecloud.adobe.com/apps/download
2. Login dengan akun yang diberikan Serabut
3. Install aplikasi yang diinginkan dari dalam CC App

TROUBLESHOOT UMUM:
- Email undangan tidak masuk → Cek folder spam/junk, tunggu 5 menit, lalu minta resend ke CS
- Office tidak bisa install → Uninstall Office versi lama dulu via Control Panel, restart PC, coba lagi
- Windows key invalid → Screenshot error dan kirim ke CS WA, kami proses ganti dalam 1 jam
- Adobe login gagal → Clear cache browser, coba mode incognito, atau reinstall CC App
- Akun expired → Hubungi CS WA untuk perpanjang dengan harga spesial pelanggan lama

FAQ:
- Kapan akun dikirim? → Setelah pembayaran dikonfirmasi, 5–15 menit di jam 08.00–22.00 WIB
- Garansi? → Garansi penuh selama masa aktif yang dibeli
- Metode bayar? → Transfer bank, QRIS, dompet digital — konfirmasi via WA setelah transfer
- Cek status akun? → Gunakan menu "Cek Status Akun" di serabut.id

ATURAN PENTING:
- Jawab MAKSIMAL 3–4 kalimat. Singkat, jelas, helpful.
- SELALU cek PANDUAN RESMI dulu sebelum menjawab. Panduan adalah sumber kebenaran utama.
- Jika pertanyaan di luar produk/layanan Serabut → arahkan ke CS WA, akhiri dengan [ESCALATE]
- Jika user komplain soal pembayaran yang belum selesai → akhiri dengan [ESCALATE]
- Jika user marah atau frustrasi → simpati dulu, lalu akhiri dengan [ESCALATE]
- Jika kamu benar-benar tidak tahu jawaban meski sudah cek panduan → akhiri dengan [ESCALATE]
- JANGAN mengarang informasi atau harga yang tidak ada${panduanSection}`;
}

// ────────────────────────────────────────────────────────
//  HELPERS
// ────────────────────────────────────────────────────────
function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function getOTPExpiry() {
  const expiry = new Date(Date.now() + OTP_EXPIRY_MIN * 60 * 1000);
  return formatJkt(expiry, 'yyyy-MM-dd HH:mm:ss');
}

function formatJkt(date, fmt) {
  return Utilities.formatDate(date, 'Asia/Jakarta', fmt);
}

// ── TEST FUNCTIONS ───────────────────────────────────────
function testCatalog()  { Logger.log(JSON.stringify(getCatalog(), null, 2)); }
function testSettings() { Logger.log(JSON.stringify(getSettings(), null, 2)); }
function testRegister() { Logger.log(JSON.stringify(register({ nama:'Test', email:'test@test.com', wa:'08123', password:'abc123hash' }), null, 2)); }
function testLogin()    { Logger.log(JSON.stringify(login({ email:'test@test.com', password:'abc123hash' }), null, 2)); }
function testOTP()      { Logger.log(JSON.stringify(verifyOTP({ email:'test@test.com', otp:'123456' }), null, 2)); }

// Ganti TARGET_EMAIL dengan email tujuan lalu run fungsi ini dari editor GAS
function testWelcomeEmail() {
  const TARGET_EMAIL = 'ganti@emailkamu.com'; // ← ganti ini
  const TARGET_NAMA  = 'Test User';
  try {
    sendWelcomeEmail(TARGET_EMAIL, TARGET_NAMA);
    Logger.log('✓ Welcome email berhasil dikirim ke: ' + TARGET_EMAIL);
  } catch(e) {
    Logger.log('✗ Gagal kirim welcome email: ' + e.message);
  }
}

function testOTPEmail() {
  const TARGET_EMAIL = 'ganti@emailkamu.com'; // ← ganti ini
  const TARGET_NAMA  = 'Test User';
  try {
    sendOTPEmail(TARGET_EMAIL, TARGET_NAMA, '123456');
    Logger.log('✓ OTP email berhasil dikirim ke: ' + TARGET_EMAIL);
  } catch(e) {
    Logger.log('✗ Gagal kirim OTP email: ' + e.message);
  }
}
