# Serabut Store — Setup Guide

## Struktur File
```
serabut-web/
├── index.html          ← Frontend (upload ke GitHub)
├── gas/
│   ├── Code.gs         ← Backend Google Apps Script
│   ├── appsscript.json ← Konfigurasi GAS
│   └── .clasp.json     ← Clasp config (script ID sudah diisi)
```

---

## STEP 1: Setup GAS Backend

### Cara A — Manual (termudah)
1. Buka [script.google.com](https://script.google.com)
2. Buka project dengan ID: `1JbCq1uEmn46wHEDG9zU-bema_1IDDyNbLsnbcm7oU2PJ876XOK_5_hnu`
3. Copy-paste isi `gas/Code.gs` ke editor GAS
4. Klik **Deploy → New Deployment**
5. Pilih type: **Web App**
6. Execute as: **Me**
7. Who has access: **Anyone**
8. Klik Deploy → copy URL deployment

### Cara B — Via Clasp (CLI)
```bash
npm install -g @google/clasp
clasp login
cd gas
clasp push
clasp deploy
```

---

## STEP 2: Update URL di Frontend

Buka `index.html`, cari baris:
```js
GAS_URL: 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec',
WA_NUMBER: 'XXXXXXXXXX',
```
Ganti dengan URL deployment dan nomor WA kamu.

---

## STEP 3: Setup Tab "Akun" di GSheet

Buat tab baru bernama **Akun** dengan kolom:

| Nama | Email | No WA | Produk | Email Aktif | Masa Berlaku | Status | Catatan |
|------|-------|-------|--------|-------------|--------------|--------|---------|

Status yang valid: `Aktif`, `Expired`, `Suspended`, `Pending`

---

## STEP 4: Deploy ke GitHub Pages

```bash
git init
git add .
git commit -m "Initial Serabut Store"
git remote add origin https://github.com/USERNAME/REPO.git
git push -u origin main
```

Aktifkan GitHub Pages: **Settings → Pages → Branch: main → / (root)**

---

## STEP 5: Connect Cloudflare

1. Login Cloudflare → Add Site → masukkan `serabut.com`
2. Tambahkan CNAME record:
   - Name: `@` atau `www`
   - Target: `USERNAME.github.io`
3. Di GitHub Pages settings, tambahkan Custom Domain: `serabut.com`

---

## Rekomendasi Payment Gateway
**Tripay** (tripay.co.id) — paling mudah daftar di Indonesia:
- Gratis daftar, no monthly fee
- Support QRIS, VA (BCA/BNI/BRI/Mandiri), Alfamart/Indomaret
- Dokumentasi API lengkap
