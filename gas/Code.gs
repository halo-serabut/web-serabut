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
      case 'updateProductStock':  result = updateProductStock(e.parameter); break;
      case 'updateProductAktif':  result = updateProductAktif(e.parameter); break;
      case 'googleLogin':         result = googleLogin(e.parameter); break;
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

// ────────────────────────────────────────────────────────
//  GET CATALOG (public — hanya aktif)
// ────────────────────────────────────────────────────────
function getCatalog() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  const data = sheet.getDataRange().getValues();
  const products = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    const aktif = row[5];
    if (aktif !== true && String(aktif).toUpperCase() !== 'TRUE') continue;

    const rawStok = row[6];
    const stok = (rawStok === '' || rawStok === null || rawStok === undefined) ? null : Number(rawStok);
    products.push({
      rowIndex:   i + 1,
      nama:       String(row[0]).trim(),
      varian:     String(row[1] || '').trim(),
      masaAktif:  String(row[2] || '-').trim(),
      harga:      Number(row[3]) || 0,
      linkProduk: String(row[4] || '').trim(),
      stok:       stok,
      iconUrl:    String(row[7] || '').trim(),
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

  const data = sheet.getDataRange().getValues();
  const products = [];

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue;
    const aktif   = row[5];
    const rawStok = row[6];
    const stok    = (rawStok === '' || rawStok === null || rawStok === undefined) ? null : Number(rawStok);
    products.push({
      rowIndex:   i + 1,
      nama:       String(row[0]).trim(),
      varian:     String(row[1] || '').trim(),
      masaAktif:  String(row[2] || '-').trim(),
      harga:      Number(row[3]) || 0,
      linkProduk: String(row[4] || '').trim(),
      aktif:      (aktif === true || String(aktif).toUpperCase() === 'TRUE'),
      stok:       stok,
      iconUrl:    String(row[7] || '').trim(),
    });
  }

  return { success: true, data: products };
}

// ────────────────────────────────────────────────────────
//  ADD PRODUCT
// ────────────────────────────────────────────────────────
function addProduct({ adminEmail, nama, varian, masaAktif, harga, linkProduk, aktif, stok, iconUrl }) {
  if (!isAdminUser(adminEmail)) return { success: false, error: 'Akses ditolak' };
  if (!nama || !varian) return { success: false, error: 'Nama dan varian wajib diisi' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_CATALOG);

  if (!sheet) {
    sheet = ss.insertSheet(TAB_CATALOG);
    sheet.appendRow(['Nama Produk', 'Varian', 'Masa Aktif', 'Harga', 'Link Produk', 'Aktif', 'Stok', 'Icon URL']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  const isAktif  = (aktif === 'true' || aktif === true);
  const stokVal  = (stok === '' || stok === null || stok === undefined) ? '' : Number(stok);
  sheet.appendRow([
    String(nama).trim(),
    String(varian).trim(),
    String(masaAktif || '-').trim(),
    Number(harga) || 0,
    String(linkProduk || '').trim(),
    isAktif,
    stokVal,
    String(iconUrl || '').trim(),
  ]);

  return { success: true };
}

// ────────────────────────────────────────────────────────
//  UPDATE PRODUCT
// ────────────────────────────────────────────────────────
function updateProduct({ adminEmail, rowIndex, nama, varian, masaAktif, harga, linkProduk, aktif, stok, iconUrl }) {
  if (!isAdminUser(adminEmail)) return { success: false, error: 'Akses ditolak' };
  if (!rowIndex) return { success: false, error: 'rowIndex diperlukan' };

  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(TAB_CATALOG);
  if (!sheet) return { success: false, error: 'Tab Catalog tidak ditemukan' };

  const row     = Number(rowIndex);
  const isAktif = (aktif === 'true' || aktif === true);
  const stokVal = (stok === '' || stok === null || stok === undefined) ? '' : Number(stok);

  sheet.getRange(row, 1).setValue(String(nama || '').trim());
  sheet.getRange(row, 2).setValue(String(varian || '').trim());
  sheet.getRange(row, 3).setValue(String(masaAktif || '-').trim());
  sheet.getRange(row, 4).setValue(Number(harga) || 0);
  sheet.getRange(row, 5).setValue(String(linkProduk || '').trim());
  sheet.getRange(row, 6).setValue(isAktif);
  sheet.getRange(row, 7).setValue(stokVal);
  sheet.getRange(row, 8).setValue(String(iconUrl || '').trim());

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
function register({ nama, email, wa, password }) {
  if (!nama || !email || !wa || !password) {
    return { success: false, error: 'Semua field harus diisi' };
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_USERS);

  if (!sheet) {
    sheet = ss.insertSheet(TAB_USERS);
    sheet.appendRow(['Nama', 'Email', 'No Hp', 'Password', 'Created At', 'Status', 'OTP', 'OTP Expiry', 'Role']);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

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

  sheet.appendRow([
    nama.trim(),
    email.toLowerCase().trim(),
    wa.trim(),
    password,
    createdAt,
    'Pending',
    otp,
    expiry,
    'buyer', // Role default
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

    const storedOTP = String(data[i][6] || '').trim();
    const expiryStr = String(data[i][7] || '').trim();
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
    sheet.getRange(row, 7).setValue('');
    sheet.getRange(row, 8).setValue('');

    sendWelcomeEmail(email.toLowerCase().trim(), String(data[i][0]));

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
  sheet.getRange(sheetRow, 7).setValue(otp);
  sheet.getRange(sheetRow, 8).setValue(expiry);
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
function getProfile({ email }) {
  if (!email) return { success: false, error: 'Email kosong' };
  const ss    = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(TAB_USERS);
  if (!sheet) return { success: false, error: 'User tidak ditemukan' };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== email.toLowerCase().trim()) continue;
    return {
      success: true,
      profile: {
        nama:         String(data[i][0]  || ''),
        email:        String(data[i][1]  || ''),
        wa:           String(data[i][2]  || ''),
        role:         _getUserRole(data, i),
        tanggalLahir: String(data[i][9]  || ''),
        jenisKelamin: String(data[i][10] || ''),
        alamat:       String(data[i][11] || ''),
        provinsi:     String(data[i][12] || ''),
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

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() !== email.toLowerCase().trim()) continue;
    const row  = i + 1;
    const role = _getUserRole(data, i);
    sheet.getRange(row, 1).setValue(nama.trim());
    sheet.getRange(row, 10).setValue(tanggalLahir  || '');
    sheet.getRange(row, 11).setValue(jenisKelamin || '');
    sheet.getRange(row, 12).setValue(alamat       || '');
    sheet.getRange(row, 13).setValue(provinsi     || '');
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
  const subject  = `[${otp}] Kode Verifikasi Akun Serabut Store`;
  const htmlBody = buildOTPEmailHTML(nama, otp);
  GmailApp.sendEmail(email, subject,
    `Kode OTP kamu: ${otp}\nBerlaku ${OTP_EXPIRY_MIN} menit.\nJangan bagikan kode ini kepada siapapun.`,
    { name: STORE_NAME, htmlBody }
  );
}

function buildOTPEmailHTML(nama, otp) {
  return `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Kode OTP Serabut Store</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);" cellpadding="0" cellspacing="0">
  <tr>
    <td style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:32px 40px 28px;text-align:center;">
      <img src="https://halo-serabut.github.io/web-serabut/logo.png" width="40" height="40" alt="S" style="display:block;margin:0 auto 14px;" onerror="this.style.display='none'">
      <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px;line-height:1;">SERABUT</div>
      <div style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:5px;margin-top:3px;">STORE</div>
    </td>
  </tr>
  <tr>
    <td style="padding:36px 40px 28px;">
      <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Halo, ${nama}!</p>
      <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.65;">Masukkan kode OTP di bawah untuk verifikasi akun kamu.</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="background:#fef2f2;border:2px dashed #fca5a5;border-radius:16px;padding:28px 24px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#dc2626;letter-spacing:3px;text-transform:uppercase;">Kode OTP Kamu</p>
            <div style="font-size:48px;font-weight:900;letter-spacing:14px;color:#dc2626;font-family:'Courier New',Courier,monospace;line-height:1.1;">${otp}</div>
            <p style="margin:12px 0 0;font-size:13px;color:#9ca3af;">Berlaku <strong style="color:#374151;">${OTP_EXPIRY_MIN} menit</strong></p>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">Jika kamu tidak mendaftar di Serabut Store, abaikan email ini.</p>
    </td>
  </tr>
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 40px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        &copy; 2025 Serabut Store &nbsp;&middot;&nbsp;
        <a href="https://serabut.id" style="color:#dc2626;text-decoration:none;">serabut.id</a>
      </p>
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
  const subject  = `Selamat Datang di Serabut Store, ${nama}!`;
  const htmlBody = buildWelcomeEmailHTML(nama);
  GmailApp.sendEmail(email, subject,
    `Halo ${nama}! Akun kamu sudah aktif. Yuk belanja di serabut.id`,
    { name: STORE_NAME, htmlBody }
  );
}

function buildWelcomeEmailHTML(nama) {
  return `<!DOCTYPE html>
<html lang="id">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Selamat Datang — Serabut Store</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:40px 16px;">
<tr><td align="center">
<table width="100%" style="max-width:520px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 32px rgba(0,0,0,0.08);" cellpadding="0" cellspacing="0">
  <tr>
    <td style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:32px 40px 28px;text-align:center;">
      <img src="https://halo-serabut.github.io/web-serabut/logo.png" width="40" height="40" alt="S" style="display:block;margin:0 auto 14px;" onerror="this.style.display='none'">
      <div style="font-size:26px;font-weight:900;color:#fff;">SERABUT</div>
      <div style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:5px;margin-top:3px;">STORE</div>
      <div style="margin-top:20px;font-size:14px;font-weight:700;color:rgba(255,255,255,0.9);">AKUN BERHASIL DIAKTIFKAN</div>
    </td>
  </tr>
  <tr>
    <td style="padding:36px 40px 28px;">
      <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Selamat datang, ${nama}!</p>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.65;">Akun kamu di <strong style="color:#111827;">Serabut Store</strong> sudah aktif. Yuk mulai jelajahi produk kami!</p>
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        <tr>
          <td align="center">
            <a href="https://serabut.id" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;">Mulai Belanja &rarr;</a>
          </td>
        </tr>
      </table>
      <p style="margin:0;font-size:13px;color:#9ca3af;">Ada pertanyaan? <a href="https://wa.me/${WA_STORE_NO}" style="color:#dc2626;font-weight:600;">Chat WhatsApp</a></p>
    </td>
  </tr>
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 40px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        &copy; 2025 Serabut Store &nbsp;&middot;&nbsp;
        <a href="https://serabut.id" style="color:#dc2626;text-decoration:none;">serabut.id</a>
      </p>
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
