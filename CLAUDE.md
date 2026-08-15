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

- [2026-04-28] Selesai: Cek Status UI/UX overhaul + fitur baru:
  - Format Masa Berlaku: `DD/MM/YYYY` → `DD Mon YYYY` (mis. 29 Apr 2026), via `formatMasaBerlaku()`
  - Hapus tombol "Chat WhatsApp Support" dari result card
  - Tambah field "Pembelian dari" (Shopee/Web) — dari kolom G (List 365) atau kolom J (List 365 Family); dideteksi via header 'from'
  - Cek Adobe CC: `smartSearch()` sekarang juga baca sheet "List Account Adobe CC"; tampilkan "Akun Adobe" + product name; icon Adobe merah
  - Status badge: 3 state — Active (hijau) / Hampir Habis H-7 (oranye) / Sudah Dihapus (merah), via `getDaysUntilExpiry()`
  - Suggest renewal/rebuy: banner + tombol muncul jika H-7 atau expired; `statusSuggestRebuy()` sekarang cari produk exact match di `this.products` by name+duration lalu `goToProductDetail()`; fallback ke search jika tidak ditemukan
  - Not found state: ganti "Chat WhatsApp" → tombol "Hubungi Live Agent" (WA link dengan query keyword)
  - Chatbot: icon FAB + header + bubble diganti ke sparkle/AI icon; tombol eskalasi "Lanjut Chat ke CS Manusia" → "Hubungi Live Agent"
  - Bottom nav: Akun tab selalu visible untuk semua user; admin mendapat tab ekstra (flex layout, tidak lagi grid-cols-5 hardcoded)

- [2026-04-28 sesi 2] Selesai: 3 small fixes:
  - `statusSuggestRebuy()` → navigate langsung ke product detail page yang matching (by productType + productName + durasi); fallback ke catalog search jika tidak ditemukan
  - GAS `smartSearch()` → CacheService 5 menit untuk 3 sheets (List Account 365, Family, Adobe CC); drastis kurangi latency untuk pencarian berulang
  - Admin "Semua Order" → grouped by orderId: 1 card per order number, item list di dalam card, total per order, 1 selector "Ubah Status" untuk semua item sekaligus via `adminUpdateGroupStatus()`

- [2026-04-29] Selesai: iPaymu verification requirements (3 poin):
  - **iPaymu Integration**: GAS `createIPaymuPayment()` + `ipaymuCallback()` — redirect payment API v2, HMAC-SHA256 signature; VA & API Key dari Script Properties (`IPAYMU_VA`, `IPAYMU_API_KEY`); frontend `payViaIPaymu()`, tombol "Bayar via iPaymu" di order success modal & cart checkout success; notification banner return dari iPaymu (success/cancel)
  - **FAQ page**: halaman `/faq` dengan 11 Q&A accordion; FAQ masuk navItems (mobile bottom nav + desktop nav); link FAQ di semua footer
  - **Alamat**: "Jakarta Selatan, DKI Jakarta" di footer desktop, footer mobile (home section), dan desktop footer mobile-view

- [2026-04-30] Selesai: Fix product logo Office/Windows/Windows Server — 'office' pakai `sp('office')`; 'windows'/'windows server' pakai inline SVG data URI (Windows logo #0078D4, btoa encoded)
- [2026-04-30] Selesai: Footer iPaymu — hapus dari mobile footer & copyright; pindah inline di samping "Syarat & Ketentuan" di desktop footer bottom bar
- [2026-04-30] Selesai: FAQ redesign modern — category filter pills (Office 365, Windows, Adobe, Pembayaran, Akun & Garansi), dot warna per kategori, 15 FAQ product-focused, CTA "Hubungi Live Agent" (bukan WhatsApp)
- [2026-04-30] Selesai: iPaymu iframe payment flow — 5s countdown → full-screen iframe modal; countdown 15 menit MM:SS + progress bar (hijau→kuning→merah); same-origin iframe detection untuk success/cancel; timeout auto-redirect ke Pesanan; `payViaIPaymu` juga pakai iframe; fallback "Buka di tab baru"

- [2026-05-01] Selesai: iPaymu Admin Panel + Sync + Payment UX:
  - Fix `_requireAdmin` (ganti `_isAdmin` yang tidak exist) di semua endpoint iPaymu admin
  - Fix history API: `limit: 100` → `limit: 20` (max iPaymu), break condition disesuaikan
  - Fix `getAllOrders` baca `paymentMethod` & `paymentStatus` dinamis dari header sheet (sebelumnya hardcode index 0–9)
  - Kolom **Bayar Via** di tabel Semua Order (desktop tabel + mobile card): metode + status bayar
  - Cache tab admin: Semua Order & iPaymu hanya load sekali, refresh manual via tombol Refresh; cache invalidate otomatis setelah sync/update
  - `iPaymuAdminSyncOrders`: hapus status filter → cek isPaid di kode; `SpreadsheetApp.flush()`; **kirim WA grup** per orderId saat terdeteksi bayar (produk, durasi, total, metode, extra fields)
  - Payment return UX: modal popup → **banner inline** di tab Pesanan (hijau=berhasil, kuning=pending); close button → home; `sessionStorage` survive cache-bust reload
  - Helper: `testWAGroupNotif()` dan `testSyncOrders()` di GAS untuk debug tanpa bayar
  - GAS deployment: @90

- [2026-06-01] Selesai: Reset Password Office 365 dari Cek Status — tombol "Reset Password Office" di detail modal (hanya office365 personal); step konfirmasi; GAS `resetOfficePassword` generate password 10 karakter, update sheet, notif WA buyer + grup; rate limit 3x/jam; tampil password baru + tombol salin di UI

- [2026-06-09] Selesai: Hero 3D + Sera tour guide hidup (index.html only):
  - Hero 3D sungguhan: perspective 1300px, kartu Flash Sale & teks tilt mengikuti kursor (lerp halus via satu loop rAF) + idle "breathing" + glare dinamis; area tracking = seluruh lebar `#sec-hero` (bukan kontainer max-w-6xl)
  - Maskot robot SVG (eye-tracking) sempat dibuat lalu DIGANTI: FAB Sera (`/sera.png`) yang sudah `fixed`/ikut scroll dijadikan tour guide
  - Sera tour guide: gelembung teks per section (`_guideTexts`), trigger via setPage + scroll-spy (deteksi `rect.top<=120 && bottom>120` agar section pendek seperti Kategori tetap kena), `force:true` → menjelaskan ulang tiap masuk section termasuk scroll up; auto-hide 7s; sapaan awal saat load
  - Sera "hidup": cs-float (bob+rotate), cs-breathe (shadow), cs-blink (kedip ganda), cs-look (lirik kiri-kanan via object-position), sera-wave saat menyapa
  - Teks guide ditulis natural/manusiawi (bukan gaya AI) untuk semua section
  - Count-up statistik (10K+/<30m/4.9★) saat reveal via IntersectionObserver; hover-lift kartu kategori & produk populer
  - Semua hormati `prefers-reduced-motion`

- [2026-06-09 sesi 2] Selesai: Gamifikasi & interaksi hero (index.html only):
  - Kartu Flash Sale bisa di-drag/putar manual (pointer): geser kiri-kanan→rotateY, atas-bawah→rotateX, pegas balik saat lepas; klik "Beli" tetap jalan (suppress klik jika dMoved); hint chip "↕ Tarik untuk putar" auto-hilang setelah dicoba; desktop-only
  - Mini-game "Sera Run" saat loading Cek Status: engine `window.SeraRunner` (canvas), pseudo-3D — lantai perspektif (rel konvergen + garis melaju), obstacle kubus isometrik, player squash/stretch + bayangan dinamis, parallax langit/bukit/awan, partikel debu, screen shake; lompat Spasi/klik; auto start/stop via checkStatus()
  - Audio Web Audio API (disintesis, tanpa file): sfx jump/point/crash + tombol mute (state `gameMuted`); AudioContext resume saat interaksi pertama
  - Ilustrasi SVG 3D animasi untuk state "Akun tidak ditemukan": kaca pembesar ring merah + "?" lensa, kartu miring, float/scan/glint/partikel/bayangan dinamis
  - checkStatus() logic TIDAK diubah (hanya tambah start/stopMiniGame)

- [2026-06-10] Selesai: Efek 3D & animasi modern bagian bawah (index.html only):
  - Tilt 3D mengikuti kursor (`.js-tilt`) di kartu Testimoni & logo Metode Pembayaran: rotateX/rotateY (max 20°), perspective 520px, translateZ 26px + scale, glare radial + bayangan terangkat; reset halus saat pointerleave; di-skip untuk pointer coarse
  - Reveal-on-scroll (`.reveal-up`) fade-up + zoom + stagger via IntersectionObserver; jaring pengaman MutationObserver di #sec-testimoni + fallback agar konten async (Alpine x-for) tidak tersembunyi permanen
  - Count-up statistik testimoni (Produk Tersedia/Pelanggan/Rating/Aktivasi) pakai `.countup` + data-to/prefix/suffix (Produk Tersedia `:data-to="products.length||37"`)
  - Footer CTA "Mulai Belanja": animasi berdegup `cta-beat` + glow pulse `cta-glow`; hover ambil alih ke scale-105 + panah translate-x
  - Footer links (`.flink`, 13 link): underline gradient merah→amber slide-in dari kiri + geser halus + warna putih; varian `.flink-dim` untuk legal
  - Semua hormati prefers-reduced-motion

- [2026-06-10 sesi 2] Selesai: Fix mobile (index.html only):
  - Bug FAB Sera ke-tap nyasar saat keyboard mobile terbuka → chat kebuka tak sengaja: FAB sekarang `x-show="!csPopup && !csKeyboardOffset"` (sembunyi saat keyboard terbuka)
  - Drag-to-spin kartu Flash Sale kini jalan di mobile (touch): cabang isTouch di init hero tilt — touchstart/move/end di `scene`, geser horizontal dominan → rotateY/rotateX + preventDefault, geser vertikal tetap scroll; pegas balik + autofloat di-pause saat drag
  - Hint "Tarik untuk putar" kini tampil di mobile juga (hapus `hidden md:flex` → `flex`)

- [2026-06-10 sesi 3] Selesai: Fix "chatbot/mini-game nyangkut" saat search di mobile (index.html only):
  - Akar masalah: search GAS lambat (~7,5s cold-start) → statusChecking lama true → mini-game muncul tanpa tombol close; + FAB Sera bisa ke-tap nyasar saat keyboard
  - FAB Sera sembunyi saat input difokus: state `inputFocused` (focusin/focusout listener, blur delay 250ms) + ditambah ke `x-show="!csPopup && !csKeyboardOffset && !inputFocused"`
  - Mini-game dapat tombol Tutup (✕) → `gameDismissed`; x-show jadi `statusChecking && !gameDismissed`; reset gameDismissed tiap search baru
  - checkStatus: timeout aman 20s via AbortController (cegah hang selamanya)
  - QC lengkap: FAB buka/tutup chat OK, fokus/blur tidak nyangkut, search resolve + ada hasil, tombol close game OK, console bersih

- [2026-06-11] Selesai: Audit & fix mobile (index.html only):
  - Bug "chatbot tak bisa close" = ternyata GUIDE BUBBLE Sera (csPopup selalu false). Pemicu: klik field status → keyboard → auto-scroll → scroll-spy `showGuide(force:true)` berulang tiap scroll → terasa tak bisa ditutup
  - Fix: guide section-scroll dimatikan di mobile (`window.innerWidth < 768`); `showGuide` early-return saat `inputFocused` atau setelah `_guideStopped`; `hideGuide()` set `_guideStopped=true` (tutup × = stop sesi)
  - Gerak kartu Flash Sale mobile lebih natural: ganti CSS keyframe `hero-autofloat` (kaku) → loop rAF "breathing" multi-sinus organik + drag putar di-lerp + pegas balik; hanya jalan di pointer coarse (HP asli), skip saat kartu offscreen
  - Catatan: cabang touch tak bisa diuji di preview (emulator lapor pointer fine); diverifikasi parse tanpa error + logika mirror breathing desktop

- [2026-06-11 sesi 2] Selesai: Mobile UX fix final (index.html only):
  - Hapus TOTAL animasi putar/float kartu Flash Sale di mobile (berat) → cabang isTouch kini hanya remove hero-autofloat + clear transform lalu return (kartu statis); hint "Tarik untuk putar" balik desktop-only
  - Bug chatbot saat klik search akun (masih muncul) → matikan Sera guide SEPENUHNYA di mobile: `showGuide` early-return jika `window.innerWidth < 768` (kill greeting + nav + scroll sekaligus)
  - Cegah ghost-tap FAB: focusout input set `_fabGuardUntil = now+700` + delay inputFocused→false jadi 400ms (FAB baru muncul setelah keyboard benar2 turun); openSera sudah cek `_fabGuardUntil`
  - QC: mobile greeting=false & showGuide no-op, ghost-tap diblok lalu normal setelah guard; desktop guide tetap jalan; console bersih

- [2026-06-12] Selesai: Fix FAB Sera ke-tap nyasar di section Cek Status (mobile, index.html only) — tombol "Cek" ada di pojok kanan baris input, persis di bawah FAB Sera (fixed bottom-right ~y637–704). Tap tombol Cek malah kena FAB → chat kebuka & terasa "tak bisa ditutup" (tiap tap re-trigger FAB). Fix: FAB `x-show` tambah `&& !(activeSection==='status' && window.innerWidth < 768)` → FAB sembunyi saat section status aktif di mobile. Verifikasi preview: display→none saat activeSection='status' @375px, csPopup toggle tetap normal, console bersih

- [2026-06-12] Selesai: Fix "chat Sera kebuka sendiri" saat fokus field search (index.html only) — AKAR MASALAH SEBENARNYA: di iOS, fokus ke input search memicu klik sintetis yang nyasar ke FAB Sera (`position:fixed`) → `openSera()` jalan → chat (csPopup) kebuka tanpa diniatkan. Terjadi di SEMUA input search (produk + Cek Status), bukan cuma section status. Fix berlapis:
  - `openSera()` early-return jika `inputFocused || csKeyboardOffset` (sedang ngetik / keyboard naik) + `_fabGuardUntil` (700ms pasca-blur) + `statusInView` (mobile)
  - FAB `pointer-events:none` saat `inputFocused || csKeyboardOffset || (statusInView && mobile)` → cegah klik sintetis kena FAB walau sedang di leave-transition
  - IntersectionObserver khusus `#sec-status` → `statusInView` (deteksi deterministik, ganti tebakan band `currentSection`)
  - Verifikasi via state Alpine: openSera diblok saat focus/keyboard/status, buka normal di luar itu; pointer-events none↔auto sesuai state; console bersih
  - Catatan: percobaan awal (hide FAB by activeSection/currentSection) gagal karena (a) section detection lag & (b) trigger ternyata BUKAN overlap posisi tapi klik sintetis iOS pada SEMUA field
  - GOTCHA: preview lokal (python http.server) MENGUNCI scroll (window.scrollTo no-op) & salah-lapor display x-show+x-transition → andalkan state Alpine + binding :class (pointer-events) untuk verifikasi, bukan getComputedStyle display

- [2026-06-12 sesi lanjут] Selesai: Fix DEFINITIF chat Sera kebuka saat fokus search + matikan 3D di mobile (index.html only):
  - Akar masalah final: `scrollIntoView` saat fokus input (line ~9266) menggeser konten, lalu iOS melempar **ghost click** di koordinat tap awal yang nyasar ke tombol pembuka chat. FAB sendiri `display:none` saat fokus (tak bisa diklik), jadi pelakunya tombol `csPopup=true` MENTAH yang belum dijaga (`Chat Sera →` di kartu produk line 2307, `Hubungi Live Agent` FAQ line 3936).
  - Fix berlapis: catat `_lastInputTouch` di `touchstart`(capture)+`focusin`+`focusout` field → `openSera()` tolak buka jika `<1000ms` sejak sentuh input (+ guard `inputFocused`/`csKeyboardOffset`/`_fabGuardUntil`/`statusInView`). SEMUA jalur buka chat (FAB + 2 tombol) sekarang lewat `openSera()` — tidak ada lagi `csPopup=true` mentah.
  - Hero 3D tilt & card-tilt testimoni dimatikan di mobile via `innerWidth<768` (bukan cuma `pointer:coarse`, krn sebagian browser mobile lapor pointer:fine). Hero card sudah statis di mobile sebelumnya juga.
  - Verifikasi state Alpine: openSera diblok saat ghost-click(<1s)/inputFocused/keyboard/status, buka normal setelah cooldown & tap deliberate; focusin input real men-set guard; console bersih; render mobile OK.
  - Catatan deploy: APP_VERSION tidak bust cache HTML Cloudflare → user WAJIB hard-refresh/incognito utk dapat versi baru (kemungkinan besar alasan fix sebelumnya "masih sama").

- [2026-06-12 sesi 3] Selesai: 3 bug mobile (index.html only), QA verified via preview (APP_VERSION 20260612-5):
  - **Search field ketutup navbar**: AKAR MASALAH — header mobile render ~75px (tombol cart `w-12 h-12` 48px + padding + safe-area > `min-h-3.5rem`), tapi `.sticky-search-top`/`.main-top-offset` cuma hitung `3.5rem + env(safe)` = 62px → search & konten ketutup ~13px di bawah header. Fix: ukur tinggi header SEBENARNYA runtime → set CSS var `--hdr-h` (`_setHdrH()` di init + listener resize/orientationchange); offset pakai `var(--hdr-h, fallback)`. Verified: stickyTop=75=headerBottom, no overlap.
  - **Chat Sera auto-buka saat fokus field search**: perkuat guard ghost-click iOS — `type="search"` TIDAK di-`scrollIntoView` (pemicu utama pergeseran konten), input lain pakai `block:'nearest'`; benteng capture window 1300→2000ms, `openSera` lastInputTouch 1000→1600ms. Verified state Alpine: klik opener saat recentTouch/inputFocused → diblok (csPopup tetap false); deliberate open+close tetap jalan.
  - **Hero mobile no-animasi + alignment**: media query `@media(max-width:767px)` matikan canvas/orb/streak/3D `perspective`/`hero-depth-*` translateZ/glare/js-tilt. Bonus fix: `translateZ(85px)` pada `.hero-depth-3` + perspective off-center bikin h1 "Platform Produk Digital" tergeser kiri (tak sejajar subtext) — dengan 3D off, h1 kini sejajar subtext. Canvas loop di-skip di JS (`innerWidth<768` return, TANPA inline display none → cegah lock permanen saat viewport race; hiding via CSS). Desktop 3D utuh (canvas block @1280, depth3 translateZ aktif).

- [2026-06-12 sesi 4] Chat Sera kebuka saat fokus search — JARING TERAKHIR real-time (index.html only, APP_VERSION 20260612-7):
  - ROOT CAUSE (akhirnya): semua guard sebelumnya (benteng click capture, gerbang pointerdown-armed, guard di openSera) berada di **jalur klik** dan/atau mengandalkan **flag `inputFocused`** yang di-reset dengan delay 400ms → bisa STALE saat ghost-click iOS tiba. Jadi sebagian pembukaan tetap lolos. Tidak bisa direpro di preview (programmatic focus tak set activeElement; ghost-click iOS device-only).
  - FIX definitif: `this.$watch('csPopup')` — saat csPopup→true, cek LANGSUNG ke DOM real-time (`document.activeElement` field? `csKeyboardOffset`>0? `_lastInputTouch`<2500ms? `inputFocused`?) → kalau ya, set balik `false`. Path-independent: menangkap klik, ghost-click, overlap, maupun panggilan programatik. Konsekuensi: chat tak bisa dibuka 2.5s setelah menyentuh input (trade-off diterima).
  - Diagnostik: `window.__csOpenLog` (≤20 entri) catat activeEl/kbOffset/inputFocused/reverted tiap kali csPopup coba dibuka — utk audit di device via remote-debug kalau masih lolos.
  - Verified preview: open saat keyboard naik → reverted; open <2.5s pasca input → reverted; open bersih (openSera) → tetap buka; console bersih.

- [2026-06-12 sesi 5] ROOT CAUSE chat Sera kebuka di HP (index.html only, APP_VERSION 20260612-13):
  - **AKAR MASALAH SEBENARNYA (akhirnya ketemu):** semua guard chat (touchstart `_lastInputTouch`, benteng click-capture, `$watch('csPopup')` safety net, keyboard tracking) didaftarkan di `init()` **SETELAH** `await Promise.all([fetchProducts, loadSiteSettings])`. Di HP lambat/flaky, await ke GAS itu hang/reject → SELURUH kode guard di bawahnya tak pernah jalan → chat kebuka bebas saat fokus search & tak ada yang membatalkan. Di emulator desktop fetch instan → guard kepasang → makanya "cuma bug di HP asli, aman di emulator". Inilah kenapa semua fix -6..-12 tak ngefek: kodenya benar tapi tak pernah ter-eksekusi di device.
  - FIX: ekstrak seluruh blok guard jadi method `_setupChatGuards()` dan panggil di **baris pertama `init()` sebelum await apa pun**. Verified preview: touchstart set flag, watcher revert, deliberate open jalan, products tetap load.
  - Juga: hapus SW auto-reload `location.reload()` on activate (penyebab reload loop + load lambat yg dilaporkan user).
  - Diagnostik tersisa: `?debug=1` → panel on-screen (`_dlog`) catat OPENER/focus/openSera/csPopup; `window.__csOpenLog`. version.txt = cek versi tanpa devtools (footer hidden di mobile).
  - Lesson: kalau bug "cuma di device tertentu", curigai **urutan init + await yang bisa gagal** sebelum nyalahin logika guard-nya.

- [2026-06-12 sesi 6] ROOT CAUSE DEFINITIF chat Sera kebuka sendiri — BUKAN logika, melainkan CSS/Alpine binding bug (index.html only, APP_VERSION 20260612-16, lalu cleanup di -17):
  - **AKAR MASALAH SEBENARNYA (final, terbukti via MutationObserver di `?debug=1` langsung di HP):** panel chat (`x-show="csPopup"`) di elemen yang sama juga punya `:style="csKeyboardOffset ? 'bottom:'+csKeyboardOffset+'px' : ''"`. Saat `csKeyboardOffset` balik ke `0` (terjadi sesaat setelah fokus field search di HP via event `visualViewport`), Alpine men-set `el.style.cssText = ''` untuk binding string kosong — ini **MENGHAPUS SELURUH inline style termasuk `display:none`** yang dipasang `x-show`. Akibat: div `fixed inset-x-0 bottom-0 z-[91]` (default `display:block`) langsung tampil **walau `csPopup` tetap `false`**. Dibuktikan: log MutationObserver nunjukin `display=block csPopup=false` tepat saat `focusin <INPUT type=search>`.
  - Ini menjelaskan SEMUA kegagalan sesi 1-5: seluruh guard (`openSera`, `$watch('csPopup')`, benteng click-capture, dll) tidak relevan karena csPopup TIDAK PERNAH berubah jadi true — chat-nya tampil lewat jalur CSS, bypass total dari reaktivitas yang dijaga. Juga menjelaskan kenapa iPad aman (pola resize visualViewport beda di layar besar) dan emulator selalu aman (visualViewport resize tak terpicu sama).
  - FIX: ganti `:style` ke object syntax `:style="{ bottom: csKeyboardOffset ? csKeyboardOffset+'px' : null }"` — Alpine set/remove properti `bottom` satu-per-satu via `setProperty`/`removeProperty`, tidak menyentuh `display`.
  - Verified langsung di HP (iOS) via `?debug=1`: focusin/focusout search berulang kali → `display=none` konsisten, csPopup tetap false, chat tidak kebuka.
  - Cleanup -17: hapus semua instrumentasi debug (`_dlog`, panel `?debug=1`, `window.__csOpenLog`, `_csDebugToast`, MutationObserver, window.onerror/unhandledrejection, `#seraChatPanel` id) — guard fungsional (`$watch('csPopup')` safety net, benteng click-capture, `_setupChatGuards` di awal init) DIPERTAHANKAN sebagai defense-in-depth meski root cause asli sudah di CSS binding.
  - Lesson: kalau state JS (`csPopup`) konsisten `false` tapi UI tetap muncul, curigai **`x-show` + `:style`/`:class` string binding di elemen yang sama** — string binding mereset `cssText`/`className` dan bisa menghapus hasil directive lain di elemen itu. Pakai object/array syntax untuk binding dinamis pada elemen yang juga pakai `x-show`.

- [2026-06-27] Selesai: Admin form produk — rich text deskripsi + upload gambar produk (index.html + gas/Code.gs, APP_VERSION 20260627-1):
  - **Rich text deskripsi**: ganti total list benefit per-item → editor contenteditable dengan toolbar (Bold/Italic/Underline, bullet & numbered list, H3/paragraf, link, clear). Pakai `document.execCommand`; toolbar `@mousedown.prevent` agar selection tidak hilang. Helper: `adminInitDescEditor()` isi innerHTML saat form dibuka, `adminSyncDesc()` tulis `innerHTML` → `adminNewProduct.descHtml`, `adminFmt(cmd,val)`, `adminRtLink()`. Editor pakai `x-ref="descEditor"` (Alpine x-model tak jalan di contenteditable). CSS `.rt-btn`, `.rt-editor` placeholder, `.prose-mini` untuk render.
  - **Upload gambar**: file input → `_compressImage()` (canvas resize maks 1200px, JPEG 0.85) → dataURL → POST `uploadProductImage` ke GAS → simpan ke Drive folder "Serabut Produk Images", sharing ANYONE_WITH_LINK, return URL `drive.google.com/thumbnail?id=...&sz=w1200`. State `adminImageUploading`, preview + tombol hapus (`adminRemoveProductImage`).
  - **Storage**: kolom Deskripsi (col O) sekarang simpan HTML string (bukan JSON array). GAS `_parseProductDesc()` deteksi: diawali `[` → benefits legacy array; selain itu → `descHtml`. getCatalog/getCatalogAdmin return `descHtml` + `benefits` + `gambar`. Kolom baru "Gambar" di Catalog GSheet (`_colIndex` kenali 'gambar'/'image url'/'foto'). addProduct/updateProduct terima `descHtml`+`gambar`. Edit produk legacy: benefits array auto-konversi ke `<ul><li>`.
  - **Tampilan**: product detail + modal render `getProductDescHtml()` via x-html (fallback ke benefits list lama jika kosong) + `getProductImage()` banner di atas deskripsi.
  - **Deploy**: GAS pakai DriveApp (scope baru) → deployer WAJIB re-authorize sekali saat `clasp push`/buka editor. Tambah kolom header "Gambar" di tab Catalog GSheet (opsional; tanpa itu field gambar diabaikan, deskripsi tetap jalan).
  - Catatan: form admin ter-gate role admin → tak bisa diuji penuh di preview lokal; diverifikasi parse bersih + semua method/state terdaftar via Alpine.$data.

- [2026-07-09] Selesai: Banner pengumuman WhatsApp gangguan + admin toggle (index.html only, APP_VERSION 20260709-2) — mobile: banner amber di bawah header; desktop: toast putih kanan-bawah (bottom-28 right-8, z-[89], di atas FAB Sera). Email kontak: halo@serabut.id. Tab admin baru "Pengumuman" (grup Konten): toggle ON/OFF + edit teks + email + live preview, simpan ke Settings GAS keys `announce.on/text/email` (tanpa perubahan backend — saveSettings generic). loadSiteSettings override default lokal `ANNOUNCE_ON/TEXT/EMAIL` jika key ada. Polish UX (APP_VERSION 20260709-3): dismiss diingat per sesi via sessionStorage `srb_announce_dismissed` (`dismissAnnounce()`), emoji 🙏 anti-orphan (&nbsp;), `role="status" aria-live="polite"`, toast desktop naik otomatis saat bubble Sera tampil (`:class guideShow ? bottom-[17rem] : bottom-28`).

- [2026-07-15] Selesai & LIVE: QRIS statis Dana → dinamis + opsi bayar QRIS di checkout (APP_VERSION 20260715-1, GAS @162)
  - **gas/qris-converter.gs** (file baru): `qrisCrc16` (CRC16-CCITT-FALSE), `qrisParseTLV`, `qrisStaticToDynamic` (tag 01 11→12, buang tag 54/63 lama, sisip 54 sebelum 58, CRC ulang; validasi: amount integer>0, CRC sumber dicek, tag 58 wajib); `_qrisUniqueCode(orderId)` hash deterministik 1–299 (tanpa storage); `getQrisPayment {orderId}` → total dari sheet + kode unik → `{amount, baseAmount, uniqueCode, qrString}`; `qrisClaimPaid {orderId}` → set Payment Method=QRIS + Payment Status='Menunggu Verifikasi' + WA grup (sendWANotification), idempotent; `testQrisConverter()` untuk uji di GAS editor. Static QRIS di Script Properties key **QRIS_STATIC** (tidak pernah di client/git)
  - **Code.gs**: 2 case doPost baru `getQrisPayment` + `qrisClaimPaid` (public by design — hanya butuh orderId, QR memang untuk dibayar siapa pun)
  - **index.html**: `startPaymentRedirect` → tidak auto-redirect lagi, buka modal **paymentChoice** (QRIS FREE vs VA/E-Wallet Xendit + admin fee); modal **qrisPay** (English, sesuai mockup uat/qris-checkout-mockup.html): QR dirender client-side via qrcodejs CDN (`_loadQRCodeLib` on-demand, string QRIS tidak dikirim ke layanan eksternal), nominal 3 digit terakhir merah, countdown 15 menit, How to pay 3 langkah, klaim dengan spinner → state claimed (View my orders utk member / Back to home), state expired (Generate new QR), state error (Back to payment options); `closeQrisPay(true)` buka tab Pesanan
  - **GOTCHA penting**: semua modal setelah komentar "ORDER SUCCESS MODAL" (redirect overlay, manual payment, dll) ter-NEST di dalam div orderModal (unbalanced div lama) — fixed child tak tampil saat orderModal false. Overlay redirect lama "berfungsi" hanya karena setInterval-nya tetap redirect walau overlay invisible. Modal baru DIPINDAH ke body-level (sebelum div iPaymuReturnStatus, line ~7300); `startPaymentRedirect` juga set orderModal=false + cartCheckoutModal=false
  - Testing: `tests/qris-converter.test.js` (node, load .gs via eval, QRIS sintetis) — tag 01→12, tag 54 posisi sebelum 58, CRC re-parse valid, idempotensi, semua rejection; converter juga diuji dengan QRIS Dana asli (decode dari gambar via opencv lokal) → scan OK di 3 bank + GoPay, pembayaran masuk Dana
  - qrisClaimPaid pakai `sendWAToGroup` (WA_GROUP_ESCALATION) — BUKAN `sendWANotification` (WA_GROUP_ID kosong, silent skip); bug ini sempat kejadian, fix di @162
  - Deploy: QRIS_STATIC sudah diset di Script Properties; GAS @162 live; clasp login sekarang pakai halo@serabut.id (pemilik script — editor lintas domain tidak boleh deploy); E2E verified: order test SRB-19919458/SRB-20160799 → chooser → QR asli → klaim → WA grup masuk + sheet Menunggu Verifikasi (order test boleh dihapus dari sheet)
  - QR merchant asli TIDAK ada di repo (uat/qris-live-1137.png sudah dihapus, mockup pakai QR dummy)

- [2026-07-15 sesi 2] Selesai & LIVE (GAS @163, APP_VERSION 20260715-3): 3 fix pasca-rilis QRIS:
  - Badge status order konsisten: `orderAwaitingVerification()` — Pending + paymentStatus 'Menunggu Verifikasi' → badge "Menunggu Verifikasi" (kuning), tidak lagi "Belum Dibayar"; order yang sudah klaim QRIS tidak auto-"Dibatalkan" saat lewat expiry
  - Email invoice Xendit prematur: createOrder/createCartOrder TIDAK lagi membuat invoice di awal — GAS baru `createXenditInvoiceForOrder {orderId}` (data dari sheet, anti-tamper) dipanggil lazy saat buyer klik opsi VA/E-Wallet di chooser; `payViaIPaymu` juga dialihkan ke endpoint ini (sebelumnya kirim currentOrderIPaymuData yang selalu null)
  - paymentChooseXendit: loading state "Preparing secure payment page…" + error inline di chooser
  - E2E verified: order SRB-22727338 dibuat TANPA paymentUrl → klik opsi 2 → invoice dibuat on-demand → redirect checkout.xendit.co OK

- [2026-07-15 sesi 3] Fix: opsi "Virtual Account / E-Wallet" di chooser grey/tak bisa diklik (APP_VERSION 20260715-4) — `:disabled="paymentChoice?.loading"` dengan key `loading` TIDAK ADA di objek → Alpine malah men-set `disabled` (bukan remove); fix: `paymentChoice` selalu dibuat dengan `loading:false, error:''` eksplisit (startPaymentRedirect + qrisBackToChooser). Lesson: key yang dipakai binding Alpine harus ada sejak objek dibuat.

- [2026-07-16] Selesai (LOKAL, belum deploy): Xendit Fixed VA langsung di serabut.id — tanpa halaman checkout Xendit (APP_VERSION 20260716-1):
  - **gas/Code.gs**: `createXenditVA {orderId, bankCode}` — bank whitelist BNI/BRI/BSI/CIMB/MANDIRI/PERMATA (channel "Fixed" yang aktif di dashboard Xendit), total dari sheet (anti-tamper) + fee, POST `/callback_virtual_accounts` (is_closed + is_single_use, expected_amount terkunci, expiry 24 jam), idempotent via CacheService 6 jam per order+bank; `_xenditVAFee()` default 4440 override via Settings key `xendit.vafee`; `xenditCallback` extended: payload FVA paid (tanpa field `status`, ada `callback_virtual_account_id`) → PAID, method "VA {bank}" — reuse notif WA grup + buyer WA/email existing; doPost case `createXenditVA`
  - **index.html**: chooser 3 seksi — QRIS (FREE) / grid 6 bank VA + chip fee "+ Rp 4.440" / "Other methods" (AstraPay, Indomaret, PayLater via invoice Xendit lama); modal `vaPay` baru body-level: nomor VA + copy, nominal + fee + valid until, how-to-pay, note auto-confirm; state `vaPay` + `XND_VA_FEE` (override dari getSettings), methods `paymentChooseVA/vaCopy/vaBackToChooser/closeVaPay/vaExpiryText/vaBankLabel`; `paymentChoice` selalu punya key `vaLoading` (Alpine key gotcha)
  - QC preview: chooser desktop + mobile OK, modal VA OK, back-to-chooser OK, console bersih, Code.gs parse OK
  - Fee final: Rp 4.000 ke buyer (rate kontrak flat), PPN Rp 440 ditanggung merchant (keputusan owner)
  - BUG Alpine varian baru: `:disabled="a || b"` yang hasilnya `''` (string kosong) → Alpine tetap MEN-SET disabled; semua tombol bank mati diam-diam. Fix: `:disabled="!!(a || b)"`. Lesson: binding boolean Alpine harus selalu dipaksa boolean (`!!`), bukan cuma "key harus ada"
  - GAS sudah deployed @164; createXenditVA diuji live (VA BNI asli terbuat, idempotent, bank invalid ditolak); klik fisik tombol bank → modal VA verified di preview
  - **DEPLOY CHECKLIST (belum dilakukan)**: (1) clasp push + deploy GAS; (2) dashboard Xendit → Pengaturan → Developer → Webhooks → isi callback URL **"Fixed Virtual Account paid"** = `https://script.google.com/.../exec?action=xenditCallback&token=XENDIT_WEBHOOK_TOKEN` (pola sama dgn invoice); (3) opsional Settings key `xendit.vafee` sesuai rate kontrak (Pengaturan → Tagihan dan Biaya → Struktur biaya); (4) test order kecil E2E

- [2026-07-16 sesi 2] Selesai & LIVE (GAS @165, APP_VERSION 20260716-2): QRIS Manual di admin — tab baru "QRIS Manual" (grup Transaksi): input nominal bebas → QR QRIS Dana dinamis (nominal terkunci); GAS `getQrisManual {amount}` (requireAdmin, 1–100jt, reuse `qrisStaticToDynamic`); frontend state `adminQris` + `adminQrisGenerate()` (QR render client-side qrcodejs, box #adminQrisBox). Catatan: adminToken = `this.currentUser.sessionToken` (BUKAN this.sessionToken). Juga: fix VA fee → Rp 4.000; VA chooser+modal live & teruji klik fisik.

- [2026-07-16 sesi 3] Selesai & LIVE (APP_VERSION 20260716-3, frontend only): QRIS Manual polish + riwayat — layout 2 kolom desktop (generator | riwayat) / stack mobile; input prefix "Rp" + preview format id-ID; tombol **Download QR** (`adminQrisDownload` — ambil img/canvas dari #adminQrisBox → a.download PNG); riwayat di localStorage `srb_qris_manual_hist` (state `adminQrisHistory`, max 20, dedupe nominal sama, klik item = set amount + generate ulang, "Hapus semua"); tab qrismanual ditambahkan ke array pill mobile admin (line ~4444 — array TERPISAH dari sidebar desktop, jangan lupa kalau nambah tab admin baru!)

- [2026-07-17] Selesai & LIVE: project reminder TERPISAH di `~/serabut/` (Apps Script container-bound GSheet List Account, scriptId 1dBBjOAIrwcPos00qb2B_TIViTsDBjkYpafYZC08brQg9eh7OaG7ES1It, clasp login halo@serabut.id, `clasp push -f`) — pengirim WA = Fonnte nomor kedua 0888-1700-555:
  - ROOT CAUSE reminder lama masih terkirim: fix H-3/hari-H sudah ada di lokal tapi TIDAK PERNAH di-clasp push → server jalankan versi lama. Lesson: cek `clasp push` dulu sebelum debug logika
  - WA reminder (sendReminderO365Family/O365/Adobe.js): hanya H-3 + hari-H, link langsung produk, closing diganti → arahkan pertanyaan ke CS utama *0888-1500-555* (H-3: "nomor ini khusus pengingat otomatis…"; hari-H: "Mau tanya-tanya dulu?…")
  - WA kiriman pertama (OnEditAction.js): 365 Web (kredensial + portal.office.com), undangan Family (link 24 jam), Adobe Send Thanks — semua ditulis ulang natural (buka dengan makasih, tanpa icon+label stack, CS utama disebut); pesan "Renewed" (365 Web/Family/Adobe) juga ditulis ulang natural — 1 kalimat inti "sudah beres, lanjut aktif sampai [tanggal]" + benefit per produk + CS utama
  - Email reminder tetap H-3/H-2/H-1/H (tidak diubah)

- [2026-07-17 sesi 2] Selesai & LIVE (GAS @166): audit alur QRIS Dana pasca order real SRB-82697870 — temuan: buyer bayar tapi TIDAK klik "I've completed the payment" → tidak ada WA klaim/kode unik/status; label Lunas tidak pernah di-set di jalur admin. Fix: (1) notif order WAG (createOrder + createCartOrder) sisipkan baris "Nominal QRIS: Rp X" (total + `_qrisUniqueCode`, deterministik — admin bisa cocokkan di app Dana walau buyer tak klaim); (2) `updateOrderStatus` set Payment Status='Lunas' saat status → Diproses/Aktif/Selesai (kecuali sudah Lunas/Berhasil) — satu guard di fungsi shared, semua jalur admin (single + group) kena

- [2026-07-19] Selesai & LIVE (APP_VERSION 20260719-1, frontend only): redesign header + hero polish:
  - **Header desktop**: 7 pill → 3 (Produk · Cek Akun · Bantuan ▾); dropdown Bantuan (x-data lokal `{open}`, @click.outside) berisi Panduan/Tanya Jawab (FAQ)/Download dgn deskripsi kecil; search SELALU tampil di header (≥lg saja — md disembunyikan biar tidak sesak; @focus/@keydown.enter → scrollTo catalog); logo teks hidden <lg; wording ID: Masuk/Daftar/Keluar; navItems label → Beranda/Produk/Cek Akun/Panduan/Download (dipakai juga bottom nav mobile)
  - **Countdown flash sale**: state `flashSaleCountdownShow` — pill timer (mobile+desktop) hanya tampil saat sisa ≤ 10 hari (di-set di interval countdown yang sama)
  - **Kartu flash sale 3D "balok akrilik"**: pose istirahat rotateY(-10°) rotateX(4°) di loop rAF (breathing/drag di sekitar pose); ketebalan = `.hero-slab` 12 irisan `.hero-slice` opaque rapat 1px (translateZ -1..-12) — slice transparan/renggang = efek "kertas terkipas", HARUS opaque+1px; slice terakhir punya `.hero-back-face` (rotateY 180 + translateZ .5px + backface-visibility hidden, parent slice WAJIB preserve-3d) berisi logo+brand → punggung kartu ada konten, terbaca normal dari belakang; bayangan lantai dihapus; semua desktop-only
  - **Teks hero rata kiri**: hapus class `hero-depth-3` dari h1 (translateZ 85px + perspective off-center menggeser judul vs subteks)
  - GOTCHA preview: server preview bisa nyangkut menyajikan file BASI (fetch /index.html utk konfirmasi versi; restart via preview_start) + init 3D bisa skip krn innerWidth=0 saat load (resize dulu baru reload)

- [2026-07-26] Selesai: logo kategori "Lainnya"/tak dikenal tidak lagi pinjam logo Office → SVG data URI kotak paket abu-abu (`genericLogo` di `getProductLogo`); kartu katalog pakai helper baru `getProductThumb(p)` = gambar produk (col Gambar) kalau ada, fallback logo kategori (foto render `w-full h-16 object-cover`) — APP_VERSION 20260726-1
- [2026-07-26] Selesai: preview instan upload gambar produk (admin) — `adminUploadProductImage` push dataURL hasil kompres ke `adminNewProduct.gambar` SEBELUM POST ke Drive, lalu `swap()` tukar jadi URL Drive (atau buang kalau gagal/sudah dihapus admin); thumbnail dataURL dapat overlay spinner; tombol Simpan/Update disabled saat `adminImageUploading` (`!!` boolean gotcha) + `adminSaveProduct` filter dataURL sebagai jaring pengaman — APP_VERSION 20260726-2

- [2026-08-01] Selesai & LIVE (GAS @173): auto-confirm pembayaran QRIS via notifikasi HP — "Xendit mini" tanpa API resmi:
  - **gas/notif-paid.gs** (file baru): endpoint `notifPaid {token, title, text}` — MacroDroid di HP Android tangkap notif app **GoFood Merchant** (BUKAN "GoPay Merchant" — notif QRIS masuk lewat app GoFood Merchant `com.gojek.gofood.merchant`) lalu POST teksnya ke GAS. `_notifParseAmount` regex `/rp\s*([\d.,]+)/i`; anti-dobel via CacheService 6 jam berbasis "ID transaksi" di teks notif; `_notifFindOrderByAmount` jumlahkan harga per orderId (cart = multi-row), cari yang `total + _qrisUniqueCode(orderId) === amount` & belum Lunas, order terbaru menang saat tabrakan hash → panggil `_gobizMarkPaid` (reuse dari gobiz-pay.gs: set Lunas + Diproses + WA grup + WA/email buyer). Tidak cocok → WA grup "UANG MASUK — TANPA ORDER COCOK" (tidak pernah hilang diam-diam). Auth: Script Property **NOTIF_TOKEN** (sudah diset = `srb-notif-9f3k2xQ7`)
  - Format notif asli: judul `Pembayaran QRIS diterima!` / isi `Rp1.000 berhasil diterima. ID transaksi: 40tc6WND`
  - MacroDroid: trigger Notification Received → app GoFood Merchant **Include** (default picker-nya Exclude — jebakan, makro diam total), Text Contains `berhasil diterima`, Prevent multiple triggers OFF; action **Connectivity → HTTP Request** (BUKAN "Open Website"), POST, Content Body JSON, **Follow redirects WAJIB ON** (Apps Script selalu balas 302 ke script.googleusercontent.com)
  - GOTCHA test curl: `curl -L -X POST` ke /exec → "Halaman Tidak Ditemukan", karena `-X` memaksa POST diulang saat redirect. Pakai `curl -sL -d '...'` tanpa `-X` (redirect turun jadi GET) → JSON balik normal
  - E2E verified: bayar Rp 1.100 asli ke QRIS GoPay Merchant → notif → WA grup masuk dgn ID transaksi `xMi408ID`
  - **BELUM**: `QRIS_STATIC` masih QRIS **Dana** (Dana tidak kirim notif sama sekali → pembayaran buyer tak terdeteksi). Auto-confirm baru berguna setelah QRIS_STATIC diganti string QRIS statis **GoPay Merchant**
  - ponytail ceiling: HP mati / teks notif berubah = tak terdeteksi (fallback: klaim manual buyer + WA grup). Upgrade path = `createGobizTransaction`/`gobizCheckPaid` (API resmi, blocker kredensial outlet)

- [2026-08-01 sesi 2] Selesai (GAS @176, APP_VERSION 20260801-1): modal QRIS full Bahasa Indonesia + tombol Unduh QR + aturan siapa yang berhak menyatakan "lunas":
  - **Sumber kebenaran = notif MacroDroid.** Tombol buyer tidak pernah bisa menaikkan status ke Lunas. `qrisClaimPaid` sekarang menganggap `Lunas` (bukan cuma `Berhasil`) sebagai sudah-dibayar → BUG yang diperbaiki: klik "Konfirmasi Pembayaran" setelah notif masuk menimpa `Lunas` balik jadi `Menunggu Verifikasi`
  - WAG maksimal 2 pesan per order: `ORDER WEB … UNPAID` (saat order dibuat) + `💰 Pembayaran masuk` (hanya dari notif). Pesan ke-3 `⚠️ Pembeli klaim sudah bayar, tapi belum terdeteksi` hanya muncul kalau notif belum masuk — sengaja dipertahankan sebagai jaring pengaman kalau HP mati
  - Copy modal ditulis natural (bukan terjemahan): "Tinggal scan, terus bayar", "Nominalnya sudah nempel di QR-nya", "QR berlaku MM:SS lagi", "Begitu kamu bayar, kami langsung tahu"; nominal `IDR 5,086` → `Rp 5.086`; semua state (loading/expired/claimed/error) ikut ID; state claimed punya 2 varian via `qrisPay.paid` dari `d.alreadyPaid`
  - Chooser QRIS: hapus "Verified in 1–5 min (8 AM–10 PM)" → "Langsung terkonfirmasi"
  - `adminQrisDownload` dipecah jadi `_downloadQr(boxId, filename)` + 2 pemanggil (admin & buyer `qrisDownloadQr`) — tombol Unduh QR di modal buyer
  - ponytail-review diterapkan ke notif-paid.gs: buang field balikan yang tak ada pembacanya (`ignored/reason/duplicate/matched`) + cabang fallback dedupe tanpa ID transaksi (notif tanpa ID sekarang diabaikan — lebih baik diam daripada dobel proses)
  - GOTCHA deploy: setelah `clasp deploy`, /exec bisa **masih menyajikan kode lama ~20 detik**. Sempat bikin salah kira push gagal — tunggu sebentar lalu tes ulang sebelum debug
  - GOTCHA preview: tab `file://` menyajikan HTML basi (Alpine lapor APP_VERSION lama walau DOM baru). Pakai `preview_start` (python http.server :3737) → localhost, baru state Alpine akurat
  - Xendit tidak terpengaruh: jalur konfirmasinya `xenditCallback`, dan nominal VA beda (kena fee Rp 4.000) jadi tidak mungkin tertangkap pencocokan nominal QRIS

- [2026-08-01 sesi 3] Fix (GAS @178): pembayaran asli masuk ke GoPay tapi WAG tidak dapat notif "Pembayaran masuk". Penyebab: potongan hasil ponytail-review di sesi sebelumnya membuang notif yang tidak mengandung "ID transaksi" **tanpa jejak apa pun** — notif asli yang formatnya beda sedikit dari notif tes langsung hilang. Fix: fallback dedupe nominal+menit dikembalikan; notif "uang masuk" yang nominalnya tak terbaca dilaporkan apa adanya ke WA grup (rate limit 1x/10 menit); Script Property `NOTIF_LAST` menyimpan notif terakhir yang benar-benar sampai (bedakan "MacroDroid tak kirim" vs "GAS gagal proses", cek via `testNotifLast()`); `_notifFindOrderByAmount` + `_gobizMarkPaid` dibungkus try/catch dan kegagalannya dilaporkan ke WAG. **Lesson: di jalur uang, "abaikan diam-diam" bukan penyederhanaan — itu bug. Setiap cabang yang membuang input harus punya suara.** `clasp logs` tidak bisa dipakai di project ini (GCP project ID belum di-set)

## MIGRASI KE SUPABASE (in progress — mulai 2026-08-15)
Tujuan: pindahkan backend GAS + Google Sheets ke Supabase (Postgres + PostgREST + Auth + Edge Functions), bertahap per-irisan. **Migrate, bukan ubah logic.**
- **Project Supabase**: `https://pmyuwaerzzpjwskdzxxw.supabase.co` (region Singapore). Owner login `halo@serabut.id`. anon key sudah di index.html config (`SUPABASE_ANON`, aman publik). service_role JANGAN pernah di frontend.
- **Config frontend** (index.html Alpine): `SUPABASE_URL`, `SUPABASE_ANON`, `USE_SUPABASE_CATALOG:true` (set false = rollback katalog ke GAS).
- **Pola tulis admin**: `_supaEnsureAuth()` login password grant ke Supabase Auth (akun `halo@serabut.id`, prompt 1x/sesi, token di `this._supaToken` memori) → `_supaWrite(method,path,body,prefer)`. RLS: anon SELECT publik, authenticated INSERT/UPDATE/DELETE. **ponytail ceiling**: sementara "semua authenticated = admin" (baru 1 akun); WAJIB diperketat ke admin-only saat migrasi Users/Auth.
- **Selesai & LIVE (commit 2026-08-15, APP_VERSION 20260815-1)**:
  - ✅ **Catalog**: tabel `catalog` (kolom snake_case: nama_produk, varian, masa_aktif, harga, link_produk, aktif, stok, kategori, deskripsi, terjual, gambar; +id PK). Read publik (`fetchProducts._fetchSupabase` reshape ke bentuk GAS lama + fallback `_fetchGAS`). Admin CRUD (`adminLoadProducts/adminSaveProduct/adminToggleAktif/adminUpdateStock/adminDeleteProduct/adminSaveBenefits`) via PostgREST by `id` (alias `rowIndex`=id). Upload gambar tetap ke Drive, URL disimpan ke kolom gambar.
  - ✅ **Settings + Guides**: tabel `settings(key text pk, value text)`. Read `_loadSettingsObj()` (Supabase→object, fallback GAS), tulis `_adminSave()` (upsert Prefer resolution=merge-duplicates). Guides pakai key `guides.office365/windows/adobe`. 28 setting sudah diimpor. File skema: `migrations-settings.sql`.
- ✅ **Supabase MCP aktif (2026-08-15)**: server `supabase` terdaftar via `claude mcp add -s local` (token di `~/.claude.json`, tidak di git), read-write, project-ref `pmyuwaerzzpjwskdzxxw`. Tools MCP (`mcp__supabase__apply_migration/execute_sql/list_tables/get_advisors/...`) bisa jalankan DDL/SQL langsung. PAT Supabase expired 30 hari (dibuat 2026-08-15) — regen di dashboard → account/tokens kalau MCP mati.
- **AUTH — keputusan arah (2026-08-15)**: owner pilih **FULL Supabase Auth** (bukan "GAS tetap engine"). OTP = **Email + WA custom** (generate OTP sendiri, kirim email + Fonnte WA, verify di Edge Function lalu mint sesi Supabase — BUKAN OTP email bawaan Supabase, krn kodenya tak bisa dibaca utk diteruskan ke WA). User lama = **import + wajib reset password** (hash lama `SHA256(clientHash:salt)` tak kompatibel bcrypt GoTrue).
  - ✅ **Slice 1 SELESAI (skema, DDL live via MCP)**: `users_web` (sempat dibuat lalu di-drop, salah bentuk utk Supabase Auth) → diganti:
    - `public.profiles` (id uuid PK → auth.users(id) on delete cascade; nama, no_hp, role default 'buyer', status, privacy_notice, tanggal_lahir, jenis_kelamin, kota, provinsi, created_at). RLS: select/update own row; kolom `role`+`status` **tidak** di-grant ke authenticated (revoke update + grant kolom non-sensitif saja) → cegah self-escalate admin. Insert/delete & ubah role hanya service_role.
    - `public.auth_otp` (email PK, otp_hash=sha256(otp), expiry, attempts, purpose 'signup'|'reset'). RLS on, tanpa policy → service_role only. Advisor: INFO rls_enabled_no_policy (memang disengaja).
  - ✅ **Slice 2 SELESAI (Edge Functions, deployed ACTIVE via MCP)**: keputusan email = **GAS-bridge (GmailApp)**, WA = **Fonnte langsung** dari Edge Function.
    - `profiles` + kolom **`email`** (denormalized, unique lower) — admin API tak punya getUserByEmail, jadi existence-check & lookup no_hp/id lewat kolom ini.
    - `supabase/functions/_shared/util.ts` — genOTP (6 digit), sha256hex, normalizeWA (mirror GAS), sendWA (Fonnte langsung), sendEmailViaGAS (POST ke GAS `sendAuthEmail`, redirect:follow).
    - `otp-request` (POST {email,purpose,no_hp?}): existence-check via profiles, throttle 45s, upsert auth_otp (otp_hash), kirim email(GAS)+WA(Fonnte). signup tolak jika email ada; reset tolak jika tak ada.
    - `otp-verify` (POST {email,otp,purpose,nama?,no_hp?,password?,newPassword?}): cek otp/expiry/attempts(max5); signup→`admin.createUser`(email_confirm:true)+insert profiles+`generateLink` magiclink→`token_hash`(client `verifyOtp({token_hash,type:'email'})` utk mint sesi)+welcome; reset→`updateUserById` password baru. Hapus auth_otp row saat sukses.
    - GAS: action `sendAuthEmail` (Code.gs, diproteksi Script Property **AUTH_BRIDGE_SECRET**) reuse `sendOTPEmail`/`sendWelcomeEmail`. Test: `tests/otp-util.test.js` (node) — genOTP range, sha256, normalizeWA → PASS.
    - verify_jwt=true (client kirim anon key = JWT valid). ponytail: throttle naif + password client di-pass apa adanya ke createUser (slice 3 tentukan format).
  - ✅ **DEPLOY CHECKLIST slice 2 SELESAI & TERUJI E2E (2026-08-15, GAS @182)**: Secrets Supabase (`FONNTE_TOKEN`, `GAS_URL`, `AUTH_BRIDGE_SECRET`) di-set; GAS Script Property `AUTH_BRIDGE_SECRET` sama + `clasp push`/`deploy @182`. Test: otp-request → email+WA OTP masuk; otp-verify → `signup_done`, `auth.users`(email_confirmed=true) + `profiles`(Eko/buyer/Aktif) kebuat, `auth_otp` kebersihkan. **User test `ekoharianto.mr@gmail.com` ada di DB — boleh dihapus dari Auth+profiles saat migrasi user lama.**
    - **GOTCHA penting**: tabel bikinan MCP `apply_migration` TIDAK auto-grant `service_role` → Edge Function kena `permission denied for table auth_otp`. Fix: `grant all on <tbl> to service_role` (sudah dijalankan utk auth_otp+profiles). Ingat grant service_role tiap bikin tabel service-only berikutnya (orders dll).
    - **TODO grant profiles**: `authenticated` belum punya table-level SELECT grant di `profiles` (cuma column-update yg di-grant) → policy "profil sendiri boleh dibaca" belum efektif. Grant `select` ke authenticated saat wiring frontend baca profil (slice 3).
  - ✅ **Slice 3 SELESAI (frontend auth rewire, LOKAL, flag default OFF)**: flag `USE_SUPABASE_AUTH:false` di config (true = auth lewat Supabase). Helper baru di index.html: `_supaFn` (panggil Edge Function), `_supaPassSignIn` (`/auth/v1/token?grant_type=password`), `_supaVerifyTokenHash` (`/auth/v1/verify` type email → mint sesi dari token_hash signup), `_supaLoadProfile` (GET profiles RLS own-row), `_supaSetSession` (bangun currentUser + persist + set `_supaToken` biar admin write tak prompt ulang). Branch di `submitLogin/submitRegister/submitOTP/resendOTP/submitForgotPwEmail/submitForgotPwNewPw` — semua kirim password **RAW** (GoTrue bcrypt sendiri, BUKAN sha256). Signup stash `_supaSignupData{nama,wa,password}` utk dipakai saat otp-verify.
    - **Admin boundary diperketat (security, DDL live)**: helper `public.is_admin()` (SECURITY DEFINER, cek profiles.role='admin' utk auth.uid()); policy write catalog+settings diganti dari "semua authenticated=true" → `is_admin()`. Profil `halo@serabut.id` dibuat role='admin' (sebelumnya tak ada row → kalau tak dibuat, admin write ikut ketolak). E2E verified via preview: login buyer OK (token+profil role=buyer), buyer POST settings → **403 RLS** (ketolak), `_supaLoadProfile` return row sendiri.
    - **Interim gap (flag OFF default, sengaja)**: `getOrders` cuma butuh email → order history TETAP jalan lintas GAS/Supabase. TAPI `updateProfile/changePassword` + admin GAS actions (getAllOrders/updateOrderStatus/iPaymu) masih `validateSession` ke sheet Users-web → GAGAL utk user ber-token Supabase. Karena itu flag default **false**; owner flip **true** hanya setelah slice 4/5 (user lama diimpor + profile/orders ikut Supabase). Sampai itu, aktifkan flag hanya utk uji.
  - ✅ **Slice 4 SELESAI (impor user lama, code + Edge live, BELUM dijalankan)**: hash lama `SHA256(clientHash:salt)` ≠ bcrypt → impor dengan password **acak** + `must_reset=true`; user login pakai "Lupa Password".
    - Kolom `profiles.must_reset boolean default false` (DDL live).
    - Edge Function **`import-users`** (deployed ACTIVE v1): POST `{users:[{nama,email,wa,role,status}]}`, gated header `x-bridge-secret == AUTH_BRIDGE_SECRET` (secret sama dgn email-bridge, GAS sudah punya). Per user: skip kalau email sudah di profiles (idempotent), `admin.createUser`(random pw, email_confirm) + insert profiles (no_hp dinormalisasi, status Pending→Aktif, must_reset=true). Return `{created,skipped,failed,errors}`. verify_jwt=true → caller kirim anon key.
    - GAS **`migrateUsersToSupabase()`** (Code.gs, jalankan manual dari editor): baca Users-web (col 0 nama/1 email/2 wa/5 status/9 role) → POST batch ke import-users. service_role TIDAK di GAS (pakai anon + bridge secret). 
    - Frontend: gagal login Supabase → hint "Akun lama? Pakai Lupa Password untuk set ulang".
    - E2E verified via curl: user sintetis → created:1, WA `081..`→`6281..`, must_reset=true; re-run → skipped:1; secret salah → 401; test user dihapus (cascade).
    - **DEPLOY (owner, saat siap flip auth)**: (a) `clasp push` GAS; (b) jalankan `migrateUsersToSupabase()` sekali dari editor → cek Logger `{created,skipped,failed}`; (c) baru pertimbangkan `USE_SUPABASE_AUTH:true` setelah slice 5.
  - 🚧 **Slice 5 IN PROGRESS (Orders → Supabase, FULL MOVE — keputusan owner)**: cutover backend penuh (orders memaksa auth+profile+admin ikut, krn buyer baca order via RLS JWT-email). Dibangun di balik flag + fallback sheet, flip di akhir setelah E2E.
    - ✅ Tabel `public.orders` (1 baris/item, mirror sheet; kolom snake_case + payment_method/payment_status) + RLS: buyer baca `lower(email)=JWT email`, admin full (`is_admin()`), update admin; service_role utk sistem. Index order_id + lower(email).
    - ✅ Edge **`orders-write`** (ACTIVE, gated x-bridge-secret): `action:'insert'{rows}` + `action:'status'{orderId,status?,paymentMethod?,paymentStatus?}`. E2E curl: insert/status/401 OK.
    - ✅ GAS: konst `SUPABASE_URL_SRB/ANON_SRB`, helper `_ordersStoreOn()` (Script Property `ORDERS_STORE='supabase'`), `_ordersWrite(payload)` (best-effort, tak gagalkan order), `_orderRowSupa(o)`. **Wired: createOrder + createCartOrder** insert ke Supabase (masih dual: sheet + Supabase).
    - **BELUM**: status update — `updateOrderStatus` + payment paid paths (`_gobizMarkPaid`/notif, `qrisClaimPaid`, `xenditCallback`, iPaymu sync) belum panggil `_ordersWrite('status')`. Frontend read: `getOrders`(buyer) + `getAllOrders`(admin) belum baca Supabase. Cutover: flip `ORDERS_STORE` + `USE_SUPABASE_AUTH` + migrasi updateProfile/changePassword. Belum `clasp push`/deploy (ORDERS_STORE default off → dormant, aman).
  - **GOTCHA**: `_supaEnsureAuth()` frontend sekarang login sbg `halo@serabut.id` (admin) — saat auth buyer live, admin write harus divalidasi via `profiles.role='admin'`, bukan sekadar "authenticated".
- **Catatan**: GAS lama masih hidup sebagai fallback + belum-dimigrasi. Cloudflare bisa sajikan HTML basi beberapa menit (cek incognito).

## Current Focus
- **Auto-confirm notif QRIS LIVE** (GAS @178, pesan WA grup sudah ditulis natural) — QRIS GoPay Merchant sudah didecode & converter terbukti cocok (acquirer COM.GO-JEK.WWW, NMID ID1025367167661, statis→dinamis + CRC valid). TODO: owner ganti Script Property `QRIS_STATIC` ke string GoPay (dari QRIS Dana), lalu test E2E order asli. Decode QR: venv opencv (`/tmp/qrenv`), tidak ada cv2 di python sistem
- **Xendit Fixed VA in-site** selesai di lokal (20260716-1) — MENUNGGU deploy GAS + set webhook FVA paid di dashboard Xendit + test E2E
- **QRIS checkout LIVE** (GAS @162 + frontend 20260715-1) — verifikasi pembayaran manual via WA grup + app Dana; admin ubah status di Semua Order
- **Banner WA gangguan sedang ON** (default lokal true) — admin bisa OFF via tab Pengumuman; setelah admin pernah save, Settings GAS yang menang
- iPaymu sudah fully integrated & teruji — sync, WA notif, payment return banner semua working
- **FONNTE_TOKEN** harus diset di GAS Script Properties agar WA notification aktif
- **Google SSO** sudah aktif (GOOGLE_CLIENT_ID sudah diisi di Alpine config)
- Deploy command: `cp worktree/gas/Code.gs gas/Code.gs && cd gas && clasp push && clasp deploy --deploymentId AKfycbwt6SJi1nXOKc5I0CMWaTIfxtaBDoi3e4RyOPn7Znea-VUbABvg__4KA5n-QYfP308n9w`
