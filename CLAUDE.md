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
- [2026-04-23] Selesai: No WA field bisa diedit untuk SSO user — field sebelumnya disabled, sekarang editable + tersimpan ke Users-web col C
- [2026-04-23] Selesai: Adobe order fields — email akun Adobe (required) + password Adobe (required) + warning ganti password; parsed ke WA notif team
- [2026-04-23] Selesai: Email reminder hidden untuk produk one-time (CorelDRAW, Office 2019/2021/2024, Project, Visio, Windows, Windows Server, G Suites)
- [2026-04-23] Selesai: Benefits "Yang kamu dapat" dipindah dari Settings ke Catalog GSheet — disimpan sebagai JSON string di kolom O "Deskripsi"; GAS v29 pakai TextFinder + SpreadsheetApp.flush()
- [2026-04-23] Selesai: GAS `_colIndexAny()` helper — kenali kolom "benefits", "deskripsi", "benefit" secara dinamis (tidak hardcode index)
- [2026-04-23] Selesai: Spinner Save Profile button — SVG animate-spin saat editLoading
- [2026-04-23] Selesai: Order flow tanpa login — hapus redirect ke login saat "Pesan Sekarang"; auto-set guest `{nama:'Pembeli', isGuest:true}`; tombol "Lanjutkan sebagai Tamu" dihapus dari auth modal
- [2026-04-23] Selesai: Admin edit produk bug fix — `adminStartEditProduct` pakai `{...p}` baru + scroll ke form; `adminSaveBenefits` pakai `finally` untuk `adminSaving=false`
- [2026-04-23] Selesai: Order modal mobile scrollable — `max-h-[92vh] overflow-y-auto flex flex-col`; konten bisa di-scroll jika panjang
- [2026-04-23] Selesai: Checkbox "Gunakan email profil saya" tersembunyi jika user tidak punya email (auto-guest)
- [2026-04-23] Selesai: "Update Produk" otomatis simpan benefits sekaligus ke GSheet col O — tidak perlu klik "Simpan Deskripsi" terpisah lagi; toast berubah jadi "Produk & deskripsi diupdate ✓"
- [2026-04-23] Selesai: Benefits per-produk (bukan per-kategori) — setiap baris Catalog GSheet punya col O sendiri; getCatalog/getCatalogAdmin baca col O; updateProduct/addProduct/saveProductBenefits simpan ke col O; modal pakai benefits sesuai varian dipilih; label admin "Deskripsi spesifik untuk: [nama · varian]"; "Simpan Deskripsi" pakai rowIndex
- [2026-04-24] Selesai: Kategori dinamis dari GSheet kolom H — GAS v31: _colIndex helper, getCatalog/getCatalogAdmin return `category` dari col H, updateProduct/addProduct tidak hardcode col 8; frontend: _mapProducts pakai p.category dari API, get categories() computed dari products+extraCategories, filter pills otomatis
- [2026-04-24] Selesai: Tab Admin Kategori redesign — dua seksi: "Dari Catalog (otomatis)" read-only + "Tambahan Manual" bisa tambah/hapus kategori via UI, simpan ke Settings key `categories.extra`; merged di get categories()
- [2026-04-24] Selesai: Admin form produk — field Kategori baru dengan datalist autocomplete; pass `kategori` ke updateProduct/addProduct GAS
- [2026-04-24] Selesai: Admin Populer search fix — adminInitTab('populer') panggil adminLoadProducts() agar fresh; filter dari adminProducts.filter(aktif); fix x-for key tambah masaAktif agar 3 varian berbeda tampil semua (bukan deduplicate by nama+varian)
- [2026-04-26] Selesai: CS Chat Sera — OpenRouter/DeepSeek via GAS, OPENROUTER_KEY di Script Properties, markdown render (bold/italic/link), signature clean
- [2026-04-26] Selesai: Product detail pages /produk/[slug] — full page (hero card, varian/durasi selector, benefits, harga flash sale, CTA Pesan Sekarang, Salin Link); deep link support via 404.html + pendingProductSlug; goToProductDetail() + slugify() helpers
- [2026-04-26] Selesai: getProductLogo() case-insensitive — fix CorelDraw icon (GSheet "CorelDraw" vs map "CorelDRAW"), Microsoft 365 alias ke Office icon
- [2026-04-26] Selesai: Kategori grid — grid-cols-5 mobile (2 baris) + md:grid-cols-10 desktop (1 baris)
- [2026-04-26] Selesai: OpenClaw CATALOG.md rewrite — clean URL serabut.id/produk/[slug] untuk semua produk; SOUL.md + AGENTS.md diupdate; GAS system prompt Sera bisa share link produk spesifik
- [2026-04-26] Selesai: Guest order flow revamp — hapus akun temp "Pembeli"; `isMember` computed helper; tamu bisa order tapi harga penuh; duration selector + price area tunjukkan "X% OFF Member" badge ke tamu; order modal user card ganti jadi "Pesan sebagai Tamu" + tombol Login
- [2026-04-26] Selesai: Security hardening full (Critical + High) — GAS v5 + frontend:
  - GAS: FONNTE_TOKEN ke Script Properties, session token system (UUID, 30 hari), OTP lockout 5x, server-side price validation, Google JWT verify via tokeninfo API, doGet hanya public, doPost semua sensitive action, error sanitization
  - Frontend: `gasPost()` helper (semua sensitive call via POST JSON body), salted password hash `sha256(email:password)` + legacy migration, sessionToken disimpan di localStorage + dikirim ke setiap request, Google SSO kirim raw credential (no client-side decode), session expiry 30 hari auto-logout, checkStatus min 4 karakter

- [2026-04-27] Selesai: gasPost() fallback GET — try POST dulu, jika "Unknown action" fallback ke GET (backward compat GAS lama); try/catch return `{success:false, error:'Gagal terhubung'}`
- [2026-04-27] Selesai: Keranjang belanja (Cart) — add-to-cart dari catalog card + product detail, cart panel (dropdown desktop / full panel mobile), cart icon navbar + badge count, product-specific fields modal (web/family/adobe), cart checkout modal 2-col (summary + buyer info), member savings banner
- [2026-04-27] Selesai: Forgot password via OTP — modal 3-step (email → OTP → password baru), OTP ke email + WA jika tersedia; GAS: forgotPasswordSendOTP + forgotPasswordVerify
- [2026-04-27] Selesai: Cart checkout single order ID — createCartOrder GAS, 1 orderId untuk semua item, 1 pesan WA group terangkum
- [2026-04-27] Selesai: Profile > Pesanan "Aktif s/d" hanya muncul jika status = Aktif/Selesai (bukan Pending)
- [2026-04-27] Selesai: getOrders fix auth — `login()` kini panggil `ensureUserSheetHeaders` agar kolom Session Token selalu ada; `validateSession` lebih lenient: return true jika kolom tidak ada atau token row kosong (compat user lama); orders buyer muncul kembali
- [2026-04-27] Selesai: WA number normalization — helper `_normalizeWA()`: handle 08xxx→628xxx, 8xxx→628xxx, 628xxx→628xxx; dipakai di semua fungsi WA individu (welcome, buyer confirm, buyer status, OTP reset); root cause: nomor 82300011736 tidak diawali 0 sehingga replace(/^0/,'62') tidak bekerja
- [2026-04-27] Selesai: Buyer notifications — WA + email ke pembeli saat order berhasil dibuat; WA + email saat admin ubah status ke Aktif/Selesai; HTML email template untuk konfirmasi order + status update

- [2026-04-27 sesi 2] Selesai: Cart modal fix — Office 365 Web: 2 field (Nama + Username); Renewal: template baru Nama saja; License: email penerima; `cartExtraType()` pisah 'renewal' dari 'web'
- [2026-04-27 sesi 2] Selesai: Cache busting — `APP_VERSION` constant + check localStorage `srb_app_v` di init(); auto reload saat versi baru deploy
- [2026-04-27 sesi 2] Selesai: Cart checkout member savings banner — selalu tampil untuk tamu; jika ada flash sale: "Hemat Rp X.xxx jika jadi Member!"; tanpa flash sale: pesan generic; getter `cartMemberSavings`; 2 tombol: Daftar + Login
- [2026-04-27 sesi 2] Selesai: Discount Campaign system — admin tab "Flash Sale" → "Diskon"; toggle `showAsFlashSale` per campaign (ON=banner+countdown, OFF=hanya diskon harga); badge ⚡ Flash Sale / 🏷 Diskon Regular; `flashSaleItem()` cek `allDiscountItems` (semua campaign aktif)
- [2026-04-27 sesi 2] Selesai: Footer mobile padding — `pb-24` → `pb-4` (space berlebih hilang)
- [2026-04-27 sesi 2] Selesai: PWA popup redesign — compact, modern, OS-aware; Android: 1 tombol native install; iOS: 3 step Safari guide; capture `beforeinstallprompt` di `<head>` sebelum Alpine; Android fallback manual jika event tidak fire dalam 5s
- [2026-04-27 sesi 2] Selesai: Auth modal scrollable — `max-h-[92vh] overflow-y-auto`; tabs sticky; fix register tab terpotong di mobile

- [2026-04-27 sesi 3] Selesai: Security audit round 2 + UX fixes — semua di-push ke GitHub
  - SEC-05: Server-side salt — helper `_sha256GAS/_generateSalt/_applyServerSalt`; register() simpan SHA256(clientHash:salt); login() validasi dengan salt + auto-upgrade user lama; forgotPasswordVerify() generate salt baru; kolom 'Salt' di Users-web sheet
  - SEC-06: CSRF marker — doPost() wajib `_srb:'1'` untuk 7 unauthenticated actions; gasPost() inject marker otomatis
  - SEC-10: Rate limit tambahan — forgotPasswordVerify max 10x/jam
  - UX-02: Progress bar 3-langkah di forgot password modal (Langkah 1/3, 2/3, 3/3)
  - UX-01: Section "Langkah selanjutnya" di order success (single + cart) — screenshot ID, chat WA, estimasi 5–30 menit
  - UX-05: Non-member tidak tampil harga flash sale; tampil harga penuh + badge "Member hemat X%"; badge "% OFF" juga disembunyikan

## Current Focus
- Semua security + UX selesai. Produksi stabil.
- **FONNTE_TOKEN** perlu diset di GAS Script Properties agar WA notification aktif.
- **Google SSO** sudah aktif (GOOGLE_CLIENT_ID sudah diisi di Alpine config).
- Deploy GAS: `cp worktree/gas/Code.gs gas/Code.gs && cd gas && clasp push && clasp deploy --deploymentId [ID]`
- **Penting**: Setelah deploy GAS baru, user lama tanpa salt kolom akan auto-upgrade ke salted hash saat login pertama kali.
