# Serabut Store — Project Context for Claude Code

## Project Overview
- **Name:** Serabut Store (serabut.id)
- **Type:** E-commerce SPA — digital software license reseller
- **Products:** Microsoft Office 365, Adobe Creative Cloud, Windows, dll

## Tech Stack
- **Frontend:** Single `index.html` — Alpine.js, Tailwind CSS (CDN), Vanilla JS
- **Backend:** Google Apps Script (GAS) — `gas/Code.gs`, REST API via `doGet()`
- **Database:** Google Sheets (tabs: Catalog, Users-web, Orders, List Account 365, List Account 365 Family)
- **Email:** GmailApp (GAS) untuk OTP & welcome email
- **WhatsApp:** Fonnte API → notifikasi order ke WA group
- **Hosting:** GitHub Pages + Cloudflare (proxy + Flexible SSL)
- **Domain:** serabut.id (CNAME → GitHub Pages)

## Folder Structure
serabut-web/
├── index.html           ← Main SPA (semua UI ada di sini)
├── email-preview.html   ← Tool preview template email
├── logo.png             ← Brand logo
├── CNAME                ← Custom domain config
├── README.md            ← Setup guide
└── gas/
├── Code.gs          ← Semua backend logic (GAS)
├── appsscript.json  ← GAS config (timezone: Asia/Jakarta, V8)
└── .clasp.json      ← Clasp CLI config (script ID)

## Key Features
- Product catalog
- User registration & login dengan OTP email verification
- Order placement
- Account status checker
- User profile
- WhatsApp group notification untuk setiap order baru

## Important Rules for Claude
- **TIDAK perlu baca ulang semua file** di setiap sesi — gunakan context ini
- Jika perlu edit frontend → fokus ke `index.html`
- Jika perlu edit backend/API → fokus ke `gas/Code.gs`
- Tidak ada build step — murni CDN, langsung edit file
- Tidak ada `package.json`, `node_modules`, atau tooling build
- Gunakan **Bahasa Indonesia** untuk semua penjelasan dan komentar
- Selalu tanya dulu sebelum refactor besar atau ubah struktur
- Setelah selesai setiap task, **otomatis update section `Progress & Session Log` dan `Current Focus`** di CLAUDE.md

## No-Read List (kecuali diminta eksplisit)
- `logo.png` — tidak perlu dibaca
- `CNAME` — isinya hanya `serabut.id`
- `.clasp.json` — hanya berisi script ID
- `appsscript.json` — hanya runtime config

## When Starting a New Task
Langsung tanya: "File mana yang perlu diedit?" — jangan explore dulu.

## Progress & Session Log
- [2026-04-19] Selesai: Flash Sale card mobile responsive — layout horizontal 2-baris (nama produk tidak terpotong, countdown, harga, tombol Beli →)
- [2026-04-19] Selesai: Footer — hidden di mobile (app feel), tampil penuh di desktop
- [2026-04-19] Selesai: Format tanggal pesanan — DD/MM/YYYY → DD Mon YYYY (misal: 19 Apr 2026)
- [2026-04-19] Selesai: Logo produk Microsoft spesifik — Office 365, Office, Visio, Project pakai SharePoint CDN (`static2.sharepointonline.com`); Windows/Windows Server tetap Google Favicons
- [2026-04-19] Selesai: Ganti semua emoji icon dengan SVG — tombol "Pesan Sekarang" (shopping bag SVG), "Konfirmasi Pesanan" (checkmark SVG)
- [2026-04-19] Selesai: Fix warna teks "Memproses..." — tombol konfirmasi pesanan tetap merah & teks putih saat loading (hapus `disabled:text-gray-400`)
- [2026-04-20] Selesai: Floating CS Button — FAB merah fixed bottom-right, green dot online indicator
  - Login → langsung buka WA dengan template pesan personal (nama dari profil)
  - Guest → popup minta nama dulu, lalu buka WA dengan template sesuai
  - Jam operasional ditampilkan di header popup: 08.00–22.00 WIB
- [2026-04-20] Selesai: Hapus banner "Ada pertanyaan?" yang flat di home
- [2026-04-20] Selesai: Footer Kontak — tambah jam operasional 08.00–22.00 WIB (desktop & mobile)
- [2026-04-20] Selesai: CS floating button auto-hide di mobile — tempel ke dinding (peek 14px), klik untuk unhide, lalu klik buka popup; popup dipisah jadi div terpisah
- [2026-04-20] Selesai: Hapus banner "Butuh bantuan?" di halaman Panduan
- [2026-04-20] Selesai: Sistem Role Admin — Code.gs v4 dengan endpoints: getSettings, saveSettings, getCatalogAdmin, addProduct, updateProduct, deleteProduct, getAllOrders, updateOrderStatus, getGuides, saveGuides, setUserRole; login/verifyOTP return field `role`
- [2026-04-20] Selesai: Settings tab GAS — Flash Sale, Hero, Footer, Kategori, Panduan semua disimpan di Google Sheets tab "Settings" (key-value), auto-populate defaults
- [2026-04-20] Selesai: Frontend Admin Dashboard — halaman /admin dengan 7 tab: Flash Sale, Hero, Kategori, Produk (CRUD), Panduan (CRUD), Footer, Semua Order; hanya muncul untuk role=admin
- [2026-04-20] Selesai: Hero & Footer sekarang dynamic dari Settings GAS (bukan hardcode di HTML)
- [2026-04-20] Selesai: Admin nav item di desktop dan mobile bottom nav (hanya muncul jika role=admin)
- [2026-04-20] Selesai: Benefits CRUD di form Edit Produk — section "Yang kamu dapat" langsung di tab Produk, per-kategori, tersimpan di Settings GAS
- [2026-04-20] Selesai: Fix iOS auto-zoom input — `font-size: 16px !important` via `@supports (-webkit-touch-callout: none)`
- [2026-04-20] Selesai: Admin bottom nav — hide tombol "Akun" jika login sebagai admin (pakai x-show)
- [2026-04-20] Selesai: Admin produk list mobile — scorecard card layout (md:hidden), desktop tetap tabel
- [2026-04-20] Selesai: Catalog reverted ke Logo Hero Card grid; Home Produk Populer pakai horizontal scorecard; Kategori di home compact (icon + nama saja)
- [2026-04-20] Selesai: Sticky search bar di navbar — muncul saat scroll > 140px (desktop) / 100px (mobile), bind ke searchQuery
- [2026-04-20] Selesai: Tab Admin "Populer" — CRUD curated featured products (max 10), search & add, drag-reorder, simpan ke Settings GAS sebagai `featured.items` JSON
- [2026-04-20] Selesai: Fix adminFeaturedAdd duplicate check — tambah masaAktif ke kondisi agar produk sama nama+varian tapi beda masaAktif bisa di-add
- [2026-04-21] Selesai: Campaign scorecard admin mobile — redesign jadi 3 baris terpisah (toggle+nama+badge, tanggal card, aksi)
- [2026-04-21] Selesai: Google SSO aman — tombol hidden via x-if jika GOOGLE_CLIENT_ID kosong; script GSI load dinamis di init() saja; googleSignIn() pakai this.GOOGLE_CLIENT_ID
- [2026-04-21] Selesai: Flash Sale desktop scroll — max-h-[264px] overflow-y-auto, max 3 item visible
- [2026-04-21] Selesai: Cache produk stale-while-revalidate — localStorage TTL 5 menit, tampil instan dari cache lalu refresh background
- [2026-04-21] Selesai: Harga flash sale di konfirmasi pesanan — Total modal pakai harga flash sale + badge diskon + harga asli dicoret
- [2026-04-22] Selesai: Campaign warna merah (hapus emerald), grid 2→3 kolom desktop, search campaign by nama
- [2026-04-22] Selesai: Catalog x-for key fix — ganti linkProduk+varian+harga → nama|varian|masaAktif (root cause: duplicate key Alpine → produk tidak render)
- [2026-04-22] Selesai: Hero & Footer admin full-width field, Flash Sale campaign card 3-col compact di desktop

## Current Focus
- **Semua fitur admin sudah lengkap** — Benefits CRUD, Produk CRUD, Tab Populer, Flash Sale (multi-campaign), Hero, Footer, Kategori, Panduan, Semua Order
- **Google SSO:** Siap diaktifkan — isi `GOOGLE_CLIENT_ID: 'xxxx.apps.googleusercontent.com'` di Alpine config; buat di Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client ID → authorized origin: `https://serabut.id`
- **Fonnte note:** Jika notif WA group berhenti, jalankan `testWAGroupAfterSync()` di GAS untuk re-sync device Fonnte
- **GAS deployment:** Setiap edit `Code.gs` perlu re-deploy manual di script.google.com (New Deployment)
- **Column Role di Users-web**: harus di kolom **I** (setelah OTP Expiry di H) — index 8 (0-indexed)
