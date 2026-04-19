// ═══════════════════════════════════════════════════════
//  SERABUT STORE — Google Apps Script Backend v3
// ═══════════════════════════════════════════════════════

const SPREADSHEET_ID = '1ZHvmuE6r-cmygFBCKSThmlevKGLcByqhmOb0WvrKZ3I';
const TAB_CATALOG    = 'Catalog';
const TAB_USERS      = 'Users-web';
const TAB_ORDERS     = 'Orders';

const FONNTE_TOKEN   = ''; // isi token dari fonnte.com
const WA_GROUP_ID    = ''; // isi ID group WA dari dashboard Fonnte
const WA_STORE_NO    = '628881500555';
const STORE_NAME     = 'Serabut Store';
const OTP_EXPIRY_MIN = 10;

// ── Kolom Users-web (0-indexed) ──────────────────────────
// 0:Nama  1:Email  2:No Hp  3:Password  4:Created At  5:Status  6:OTP  7:OTP Expiry

// ────────────────────────────────────────────────────────
//  MAIN HANDLER
// ────────────────────────────────────────────────────────
function doGet(e) {
  const action = e.parameter.action;
  let result;

  try {
    switch (action) {
      case 'getCatalog':   result = getCatalog(); break;
      case 'checkStatus':  result = checkStatus(e.parameter.type, e.parameter.query); break;
      case 'register':     result = register(e.parameter); break;
      case 'verifyOTP':    result = verifyOTP(e.parameter); break;
      case 'resendOTP':    result = resendOTP(e.parameter); break;
      case 'login':        result = login(e.parameter); break;
      case 'createOrder':  result = createOrder(e.parameter); break;
      case 'getOrders':      result = getOrders(e.parameter); break;
      case 'getProfile':     result = getProfile(e.parameter); break;
      case 'updateProfile':  result = updateProfile(e.parameter); break;
      case 'changePassword': result = changePassword(e.parameter); break;
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
//  GET CATALOG
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

    products.push({
      nama:       String(row[0]).trim(),
      varian:     String(row[1] || '').trim(),
      masaAktif:  String(row[2] || '-').trim(),
      harga:      Number(row[3]) || 0,
      linkProduk: String(row[4] || '').trim(),
    });
  }

  return { success: true, data: products };
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
    sheet.appendRow(['Nama', 'Email', 'No Hp', 'Password', 'Created At', 'Status', 'OTP', 'OTP Expiry']);
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold');
  }

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]).toLowerCase().trim() === email.toLowerCase().trim()) {
      const status = String(data[i][5] || '').trim();
      if (status === 'Pending') {
        // Email sudah ada tapi belum verifikasi → kirim ulang OTP
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

    if (status === 'Aktif') return { success: false, error: 'Akun sudah aktif, silakan login' };
    if (!storedOTP)         return { success: false, error: 'OTP tidak ditemukan, daftar ulang' };

    if (new Date() > new Date(expiryStr)) {
      return { success: false, error: `OTP kadaluarsa. Klik "Kirim Ulang OTP".` };
    }
    if (String(otp).trim() !== storedOTP) {
      return { success: false, error: 'Kode OTP salah' };
    }

    // Aktifkan akun, hapus OTP
    const row = i + 1;
    sheet.getRange(row, 6).setValue('Aktif');
    sheet.getRange(row, 7).setValue('');
    sheet.getRange(row, 8).setValue('');

    sendWelcomeEmail(email.toLowerCase().trim(), String(data[i][0]));

    return {
      success: true,
      user: { nama: String(data[i][0]), email: String(data[i][1]), wa: String(data[i][2]) },
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
      return { success: true, user: { nama: row[0], email: row[1], wa: row[2] } };
    }
    return { success: false, error: 'Password salah' };
  }
  return { success: false, error: 'Email tidak terdaftar' };
}

// ────────────────────────────────────────────────────────
//  CREATE ORDER
// ────────────────────────────────────────────────────────
function createOrder({ userNama, userEmail, userWa, produk, varian, masaAktif, harga }) {
  if (!userEmail || !produk || !harga) return { success: false, error: 'Data tidak lengkap' };

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(TAB_ORDERS);

  if (!sheet) {
    sheet = ss.insertSheet(TAB_ORDERS);
    sheet.appendRow(['Order ID', 'Tanggal', 'Nama', 'Email', 'No WA', 'Produk', 'Varian', 'Masa Aktif', 'Harga', 'Status']);
    sheet.getRange(1, 1, 1, 10).setFontWeight('bold');
  }

  const orderId  = 'SRB-' + new Date().getTime().toString().slice(-8);
  const tanggal  = formatJkt(new Date(), 'dd/MM/yyyy HH:mm');
  const hargaNum = Number(harga) || 0;

  sheet.appendRow([orderId, tanggal, userNama, userEmail, userWa, produk, varian || '-', masaAktif || '-', hargaNum, 'Pending']);

  const msg =
    `🛒 *ORDER BARU — Serabut Store*\n\n` +
    `📋 Order ID: *${orderId}*\n` +
    `📅 Tanggal: ${tanggal}\n\n` +
    `👤 *Data Pembeli*\n` +
    `Nama: ${userNama}\nEmail: ${userEmail}\nNo WA: ${userWa}\n\n` +
    `🛍️ *Detail Produk*\n` +
    `Produk: ${produk}\nVarian: ${varian || '-'}\nDurasi: ${masaAktif || '-'}\n` +
    `Harga: Rp${hargaNum.toLocaleString()}\n\n` +
    `⏳ Status: *Pending*\nSegera hubungi pembeli! ✅`;

  sendWANotification(msg);

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
        tanggalLahir: String(data[i][8]  || ''),
        jenisKelamin: String(data[i][9]  || ''),
        alamat:       String(data[i][10] || ''),
        provinsi:     String(data[i][11] || ''),
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
    const row = i + 1;
    sheet.getRange(row, 1).setValue(nama.trim());
    sheet.getRange(row, 9).setValue(tanggalLahir  || '');
    sheet.getRange(row, 10).setValue(jenisKelamin || '');
    sheet.getRange(row, 11).setValue(alamat       || '');
    sheet.getRange(row, 12).setValue(provinsi     || '');
    return {
      success: true,
      user: { nama: nama.trim(), email: String(data[i][1]), wa: String(data[i][2]) }
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

  orders.reverse(); // terbaru di atas
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

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:32px 40px 28px;text-align:center;">
      <div style="width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:32px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;">
        <img src="https://halo-serabut.github.io/web-serabut/logo.png" width="40" height="40" alt="S" style="display:block;margin:0 auto;" onerror="this.style.display='none'">
      </div>
      <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px;line-height:1;">SERABUT</div>
      <div style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:5px;margin-top:3px;">STORE</div>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:36px 40px 28px;">
      <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Halo, ${nama}!</p>
      <p style="margin:0 0 28px;font-size:15px;color:#6b7280;line-height:1.65;">
        Terima kasih telah mendaftar di <strong style="color:#111827;">Serabut Store</strong>.<br>
        Masukkan kode OTP di bawah untuk verifikasi akun kamu.
      </p>

      <!-- OTP Box -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="background:#fef2f2;border:2px dashed #fca5a5;border-radius:16px;padding:28px 24px;text-align:center;">
            <p style="margin:0 0 10px;font-size:11px;font-weight:700;color:#dc2626;letter-spacing:3px;text-transform:uppercase;">Kode OTP Kamu</p>
            <div style="font-size:48px;font-weight:900;letter-spacing:14px;color:#dc2626;font-family:'Courier New',Courier,monospace;line-height:1.1;">${otp}</div>
            <p style="margin:12px 0 0;font-size:13px;color:#9ca3af;">Berlaku <strong style="color:#374151;">${OTP_EXPIRY_MIN} menit</strong> sejak email ini dikirim</p>
          </td>
        </tr>
      </table>

      <!-- Warning -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="background:#fffbeb;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px 18px;">
            <p style="margin:0;font-size:13px;color:#92400e;line-height:1.5;">
              <strong>[!] Jangan bagikan kode ini</strong> kepada siapapun, termasuk tim Serabut Store. Kami tidak pernah meminta kode OTP kamu.
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Jika kamu tidak mendaftar di Serabut Store, abaikan email ini.
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 40px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        &copy; 2025 Serabut Store &nbsp;&middot;&nbsp;
        <a href="https://serabut.id" style="color:#dc2626;text-decoration:none;">serabut.id</a>
        &nbsp;&middot;&nbsp;
        <a href="https://wa.me/${WA_STORE_NO}" style="color:#dc2626;text-decoration:none;">Hubungi Kami</a>
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
//  EMAIL — Selamat Datang (setelah OTP berhasil)
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

  <!-- Header -->
  <tr>
    <td style="background:linear-gradient(135deg,#dc2626 0%,#b91c1c 100%);padding:32px 40px 28px;text-align:center;">
      <div style="width:64px;height:64px;background:rgba(255,255,255,0.2);border-radius:32px;margin:0 auto 14px;display:flex;align-items:center;justify-content:center;">
        <img src="https://halo-serabut.github.io/web-serabut/logo.png" width="40" height="40" alt="S" style="display:block;margin:0 auto;" onerror="this.style.display='none'">
      </div>
      <div style="font-size:26px;font-weight:900;color:#fff;letter-spacing:-0.5px;line-height:1;">SERABUT</div>
      <div style="font-size:10px;font-weight:600;color:rgba(255,255,255,0.7);letter-spacing:5px;margin-top:3px;">STORE</div>
      <div style="margin-top:20px;font-size:14px;font-weight:700;color:rgba(255,255,255,0.9);letter-spacing:1px;">AKUN BERHASIL DIAKTIFKAN</div>
    </td>
  </tr>

  <!-- Body -->
  <tr>
    <td style="padding:36px 40px 28px;">
      <p style="margin:0 0 6px;font-size:22px;font-weight:700;color:#111827;">Selamat datang, ${nama}!</p>
      <p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.65;">
        Akun kamu di <strong style="color:#111827;">Serabut Store</strong> sudah aktif dan siap digunakan.
        Yuk mulai jelajahi produk kami!
      </p>

      <!-- Feature list -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        <tr>
          <td style="background:#fef2f2;border-radius:12px;padding:24px;">
            <p style="margin:0 0 14px;font-size:13px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:1px;">Yang bisa kamu lakukan:</p>
            <p style="margin:0 0 8px;font-size:14px;color:#374151;">&rsaquo;&nbsp; Pesan produk langsung dari website</p>
            <p style="margin:0 0 8px;font-size:14px;color:#374151;">&rsaquo;&nbsp; Cek status akun kamu kapan saja</p>
            <p style="margin:0;font-size:14px;color:#374151;">&rsaquo;&nbsp; Akses panduan instalasi lengkap</p>
          </td>
        </tr>
      </table>

      <!-- CTA Button -->
      <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        <tr>
          <td align="center">
            <a href="https://serabut.id" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#b91c1c);color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:16px 40px;border-radius:12px;letter-spacing:0.3px;">
              Mulai Belanja &rarr;
            </a>
          </td>
        </tr>
      </table>

      <p style="margin:0;font-size:13px;color:#9ca3af;line-height:1.6;">
        Ada pertanyaan? Chat kami di WhatsApp:
        <a href="https://wa.me/${WA_STORE_NO}" style="color:#dc2626;text-decoration:none;font-weight:600;">0888-150-0555</a>
      </p>
    </td>
  </tr>

  <!-- Footer -->
  <tr>
    <td style="background:#f9fafb;border-top:1px solid #f3f4f6;padding:20px 40px;">
      <p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">
        &copy; 2025 Serabut Store &nbsp;&middot;&nbsp;
        <a href="https://serabut.id" style="color:#dc2626;text-decoration:none;">serabut.id</a>
        &nbsp;&middot;&nbsp;
        <a href="https://wa.me/${WA_STORE_NO}" style="color:#dc2626;text-decoration:none;">Hubungi Kami</a>
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
  } catch (e) {
    Logger.log('WA notif error: ' + e.message);
  }
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
function testRegister() { Logger.log(JSON.stringify(register({ nama:'Test', email:'test@test.com', wa:'08123', password:'abc123hash' }), null, 2)); }
function testLogin()    { Logger.log(JSON.stringify(login({ email:'test@test.com', password:'abc123hash' }), null, 2)); }
function testOTP()      { Logger.log(JSON.stringify(verifyOTP({ email:'test@test.com', otp:'123456' }), null, 2)); }
