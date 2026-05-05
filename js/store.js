// ── SHA-256 client-side hash (untuk password) ──────────
async function sha256(str) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2,'0')).join('');
}

function serabutStore() {
    return {
        // Config
        GAS_URL:          'https://script.google.com/macros/s/AKfycbwt6SJi1nXOKc5I0CMWaTIfxtaBDoi3e4RyOPn7Znea-VUbABvg__4KA5n-QYfP308n9w/exec',
        WA_NUMBER:        '8881500555',
        GOOGLE_CLIENT_ID: '174228273794-dhbn970erdha53jtqqiqpc356ep8ntfb.apps.googleusercontent.com', // Isi Client ID dari Google Cloud Console untuk aktifkan SSO Google
        APP_VERSION:      '20260506-1',
        APP_ENV:          window._SRB_ENV || ''  ,

        // PWA Install
        pwaPopup:            false,
        pwaIsIos:            false,
        pwaIsAndroidManual:  false,
        pwaPromptEvent:      null,

        // CS Floating Button
        csPopup:    false,
        csHidden:   true,
        csGuestName: '',
        csMessages:  [],
        csInput:     '',
        csSending:   false,
        csSessionId: null,
        csEscalate:  false,
        csStarted:   false,

        scrollY: 0,

        // Pages
        activePage:   'home',
        loading:      true,
        products:     [],
        searchQuery:  '',
        activeCategory: 'Semua',
        activeGuide:  'office365',

        // Modals
        productModal: false,
        authModal:    false,
        guestStep:    false,
        guestNameInput: '',
        orderModal:   false,
        orderSuccess: false,
        orderExtra:   { nama:'', username:'', microsoftEmail:'', emailAktif:'', emailSameAsProfile:true, emailReminder:'', adobeEmail:'', adobePass:'' },
        orderExtraError: '',

        // Product detail
        selectedProductGroup: null,
        selectedVariant:      null,
        pendingProductSlug:   null,

        // Auth
        authTab:      'login',
        authLoading:  false,
        authError:    '',
        currentUser:  null,
        loginForm:    { email:'', password:'' },
        registerForm: { nama:'', email:'', wa:'', password:'', privacyAccepted: false },

        // OTP
        otpModal:      false,
        otpEmail:      '',
        otpCode:       '',
        otpLoading:    false,
        otpError:      '',
        otpResending:  false,
        otpTimer:      600,
        otpInterval:   null,

        // Order
        orderLoading:    false,
        orderError:      '',
        currentOrderId:  null,
        iPaymuLoading:   false,
        iPaymuError:     '',
        iPaymuReturnStatus: null,
        currentOrderIPaymuData: null,
        paymentConfirmed: null,
        pendingOrderDetailId: null,

        // Profile
        profileTab:    'diri',
        editMode:      false,
        editForm:      { nama:'', tanggalLahir:'', jenisKelamin:'', alamat:'', provinsi:'' },
        editLoading:   false,
        editError:     '',
        profileExtra:  {},
        orders:          [],
        ordersLoading:   false,
        ordersLoaded:    false,
        ordersPerPage:    5,
        ordersCurrentPage: 1,
        orderDetailModal: null,
        orderDetailSyncing: false,

        // Reset Password (dari profil — butuh password lama)
        redirectPayment: null, // { orderId, countdown, paymentUrl }
        manualPayment:   null, // { orderId, total } — mode manual WA
        paymentIframe: null,
        legalModal:     null,
        privacyScrolled: false,
        resetPwModal:   false,
        logoutConfirm:  false,
        welcomeToast:   false,
        welcomeToastName: '',
        ordersFilter:   'Semua',
        resetPwForm:    { oldPassword:'', newPassword:'', konfirmasi:'' },
        resetPwLoading: false,
        resetPwError:   '',
        resetPwSuccess: false,

        // Forgot Password (dari login — via OTP email/WA)
        forgotPwModal:   false,
        forgotPwStep:    1,
        forgotPwEmail:   '',
        forgotPwOtp:     '',
        forgotPwNewPw:   '',
        forgotPwConfirm: '',
        forgotPwError:   '',
        forgotPwLoading: false,
        forgotPwSuccess: false,
        forgotPwMaskedEmail: '',
        forgotPwMaskedWa:    '',
        forgotPwHasWa:       false,

        // Provinces
        provinces: ['Aceh','Sumatera Utara','Sumatera Barat','Riau','Jambi','Sumatera Selatan','Bengkulu','Lampung','Kepulauan Bangka Belitung','Kepulauan Riau','DKI Jakarta','Jawa Barat','Jawa Tengah','DI Yogyakarta','Jawa Timur','Banten','Bali','Nusa Tenggara Barat','Nusa Tenggara Timur','Kalimantan Barat','Kalimantan Tengah','Kalimantan Selatan','Kalimantan Timur','Kalimantan Utara','Sulawesi Utara','Sulawesi Tengah','Sulawesi Selatan','Sulawesi Tenggara','Gorontalo','Sulawesi Barat','Maluku','Maluku Utara','Papua Barat','Papua','Papua Selatan','Papua Tengah','Papua Pegunungan','Papua Barat Daya'],

        // Cart
        cart: [],
        cartOpen: false,
        cartCheckoutModal: false,
        cartCheckoutExtra: { guestNama:'', guestEmail:'', guestWa:'' },
        cartCheckoutError: '',
        cartCheckoutLoading: false,
        cartCheckoutSuccess: false,
        cartOrderIds: [],
        cartToast: '',
        cartToastTimer: null,
        // Cart add modal (product-specific fields)
        cartAddModal: false,
        cartAddPending: null,
        cartAddExtra: { nama:'', username:'', microsoftEmail:'', adobeEmail:'', adobePass:'', emailAktif:'' },
        cartAddError: '',

        // Status check
        statusSearchType: 'email',
        statusQuery:      '',
        statusChecking:   false,
        statusResult:     null,

        // Flash Sale
        flashSale: {
            aktif: false,
            campaigns: [],
            allDiscountItems: [],
            items: [],
            produk: '',
            varian: '',
            harga: 0,
            hargaAsli: 0,
            diskon: 0,
            deadline: '',
            startDate: '',
        },
        flashSaleCountdown: '--:--:--',

        // Site Settings (dari GAS Settings tab)
        siteSettings: {
            hero:     { tagline1:'', tagline2:'', subtext:'', btn1:'Lihat Semua Produk →', btn2:'Cek Status Akun' },
            footer:   { desc:'', email:'', phone:'', jam:'', copyright:'' },
            benefits: {},
            featured: [],
            renewal:  { discountPct: 10, discountMax: 10000 },
            extraCategories: [],
        },
        renewalMode: false,
        settingsLoaded: false,

        // Admin
        adminTab:        'flashsale',
        adminSaving:     false,
        adminSaveMsg:    '',
        adminStokEditRow: null,
        adminStokDraft:  '',
        adminProducts:   [],
        adminProductsLoading: false,
        adminProductSearch: '',
        adminOrders:        [],
        adminOrdersLoading: false,
        adminOrdersLoaded:  false,
        adminOrderFilter:   'Semua',
        adminOrdersPage:    1,
        adminOrdersPerPage: 10,
        adminEditProduct: null,
        adminAddMode:    false,
        adminNewProduct: { nama:'', varian:'', masaAktif:'', harga:'', linkProduk:'', aktif:true, stok:'', iconUrl:'', kategori:'' },
        adminEditFlash:    {},
        adminFlashCampaigns: [],
        adminFlashCampIdx: -1,
        adminFlashCampForm: { id:'', nama:'', aktif:true, startDate:'', endDate:'', items:[] },
        adminFlashItems:   [],
        adminFlashEditIdx: -1,
        adminFlashFormItem: { produk:'', varian:'', harga:0, hargaAsli:0, diskon:0 },
        flashItemDragIdx:  null,
        flashItemDragOver: null,
        adminCampSearch:   '',
        adminFlashSearch:  '',
        adminFlashResults: [],
        adminFlashVariants:[],
        adminFlashVariantIdx: 0,
        guideDragIdx: null,
        guideDragOverIdx: null,
        adminEditHero:   {},
        adminEditFooter: {},
        adminEditCats:   [],
        adminGuideTab:   'office365',
        adminGuides:     { office365:[], windows:[], adobe:[] },
        adminGuidesLoading: false,
        adminNewGuide:   { title:'', steps:[''], note:'' },
        adminAddGuideMode: false,
        adminEditGuideIdx: -1,
        adminBenefitCat:   'Office 365',
        adminBenefitItems: [],
        adminBenefitNewItem: '',
        adminFeaturedItems:   [],
        adminFeaturedSearch:  '',
        adminFeaturedResults: [],
        adminNewCatName:      '',

        // ── iPaymu Admin ──────────────────────────────
        adminIPaymuBalance:        null,
        adminIPaymuBalanceLoading: false,
        adminIPaymuBalanceError:   '',
        adminIPaymuTrxId:          '',
        adminIPaymuTrxData:        null,
        adminIPaymuTrxLoading:     false,
        adminIPaymuTrxError:       '',
        adminIPaymuHistory:        [],
        adminIPaymuHistoryLoading: false,
        adminIPaymuHistoryError:   '',
        adminIPaymuPagination:     {},
        adminIPaymuLoaded:         false,
        adminIPaymuSyncLoading:    false,
        adminIPaymuSyncMsg:        '',
        adminIPaymuSyncConfirm:    false,
        adminIPaymuFilter:         { startdate:'', enddate:'', status:'', page:1, limit:20 },

        // ── Static Data ──────────────────────────────
        navItems: [
            { id:'home',    label:'Beranda',    mobile:true,  icon:`<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"/></svg>` },
            { id:'catalog', label:'Produk',     mobile:true,  icon:`<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>` },
            { id:'status',  label:'Cek Status', mobile:false, icon:`<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>` },
            { id:'panduan', label:'Panduan',    mobile:true,  icon:`<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>` },
            { id:'faq',     label:'FAQ',        mobile:false, icon:`<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>` },
        ],
        _categoryIconMap: {
            'Office 365':    `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
            'Microsoft 365': `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
            'Adobe':         `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>`,
            'Windows':       `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
            'Windows Server':`<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"/></svg>`,
            'Office':        `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
            'Google':        `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>`,
            'CorelDRAW':     `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
            'CorelDraw':     `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
            'Project':       `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
            'Visio':         `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
        },
        benefits: [
            {icon:`<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>`,title:'Original & Resmi',  desc:'Semua produk bergaransi keaslian dari vendor resmi'},
            {icon:`<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>`,title:'Proses Kilat',      desc:'Aktivasi dalam hitungan menit setelah pembayaran'},
            {icon:`<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>`,title:'Support 24/7',      desc:'Tim siap bantu via WhatsApp kapan saja'},
            {icon:`<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/></svg>`,title:'Harga Terbaik',     desc:'Hemat hingga 70%'},
        ],
        faqItems: [
            // Office 365
            { cat:'office', q: 'Apa perbedaan Office 365 Biasa (Web) dengan Family plan?', a: '<strong>Office 365 Biasa (Web)</strong>: Akun Microsoft baru yang kami buatkan khusus untuk kamu. Bisa request username sesuai keinginan, saat ini masih mendukung full Office apps (Word, Excel, PowerPoint, dll) + 100GB OneDrive. Bisa dipakai di hingga <strong>5 perangkat</strong>.<br><br><strong>Office 365 Family</strong>: Akun existing kamu akan join sebagai member di host kami. Tidak perlu akun baru — cukup email Microsoft yang sudah ada. Full Office apps + <strong>1TB OneDrive pribadi (tidak sharing)</strong>. Juga bisa dipakai di hingga <strong>5 perangkat</strong>.<br><br>Keduanya mendukung 5 perangkat aktif, perbedaan utamanya ada di asal akun dan kapasitas OneDrive.' },
            { cat:'office', q: 'Berapa perangkat yang bisa digunakan untuk Office 365?', a: 'Baik Office 365 Biasa maupun Family keduanya mendukung hingga <strong>5 perangkat aktif bersamaan</strong> per akun pengguna (Windows, Mac, iPad, Android, iOS).' },
            { cat:'office', q: 'Apa yang terjadi jika masa aktif Office 365 habis?', a: 'Bergantung pada jenis paket:<br><br><strong>Office 365 Biasa (Web)</strong>: Akun akan otomatis dihapus di hari H kedaluwarsa. Masih bisa renewal selama order dilakukan di bulan yang sama, paling lambat pukul <strong>18.00 WIB</strong> di hari tersebut.<br><br><strong>Office 365 Family</strong>: Akun otomatis di-kick dari group di hari yang sama. Aplikasi Office beralih ke mode <strong>read-only</strong> — dokumen masih bisa dibaca tapi tidak bisa diedit. OneDrive tetap bisa diakses selama <strong>30 hari</strong> setelah kedaluwarsa sebelum data terhapus.<br><br>Disarankan renewal sebelum masa aktif habis untuk menghindari gangguan akses.', action: 'catalog', actionLabel: 'Perpanjang Sekarang →' },
            { cat:'office', q: 'Apakah Office 365 bisa digunakan untuk keperluan komersial?', a: 'Paket yang kami jual adalah lisensi <strong>personal/home use</strong>. Untuk penggunaan komersial skala besar, sebaiknya gunakan Microsoft 365 Business. Namun untuk freelancer atau UMKM, paket personal umumnya sudah mencukupi.' },
            // Windows
            { cat:'windows', q: 'Apakah lisensi Windows yang dijual berlaku seumur hidup?', a: 'Ya! Lisensi Windows yang kami jual adalah <strong>lisensi digital resmi</strong> yang berlaku <strong>seumur hidup</strong> untuk 1 perangkat. Aktivasi dilakukan via Settings → Activation menggunakan product key yang diberikan.' },
            { cat:'windows', q: 'Apa perbedaan Windows 10 dan Windows 11?', a: '<strong>Windows 11</strong>: Tampilan lebih modern, performa gaming lebih baik (DirectStorage, Auto HDR), keamanan ketat (butuh TPM 2.0).<br><br><strong>Windows 10</strong>: Kompatibel dengan perangkat lama, didukung Microsoft hingga Oktober 2025.<br><br>Rekomendasi: pilih Windows 11 untuk PC/laptop baru, Windows 10 untuk perangkat lama.' },
            { cat:'windows', q: 'Bagaimana jika aktivasi Windows gagal?', a: 'Langkah troubleshooting:<br>1. Pastikan product key dimasukkan benar (perhatikan O vs 0, I vs 1)<br>2. Coba via CMD (Admin): <code style="background:#f3f4f6;padding:1px 5px;border-radius:3px;font-size:11px">slmgr /ipk XXXXX-XXXXX-XXXXX-XXXXX</code><br>3. Error 0xC004F050: key tidak kompatibel dengan edisi yang terinstall<br><br>Hubungi CS dengan screenshot error untuk dibantu lebih lanjut.' },
            // Adobe
            // Adobe
            { cat:'adobe', q: 'Apa yang termasuk dalam paket Adobe Creative Cloud?', a: 'Paket Adobe CC mencakup akses ke <strong>20+ aplikasi Adobe</strong> sesuai paket yang dibeli: Photoshop, Illustrator, Premiere Pro, After Effects, InDesign, Lightroom, XD, dan lainnya. Storage cloud 100GB juga termasuk.' },
            { cat:'adobe', q: 'Apakah akun Adobe bisa dipakai di 2 komputer?', a: 'Satu akun Adobe Creative Cloud hanya bisa aktif di <strong>1 perangkat dalam satu waktu</strong>. Penggunaan di 2 perangkat bisa dilakukan secara <strong>bergantian</strong> — cukup logout di perangkat pertama sebelum login di perangkat berikutnya.<br><br>Login bersamaan di 2 perangkat sekaligus tidak didukung oleh Adobe dan dapat memicu verifikasi keamanan akun.' },
            { cat:'adobe', q: 'Bolehkah mengubah password akun Adobe yang diberikan?', a: '<strong>Boleh, dan justru disarankan untuk diganti setelah proses selesai.</strong><br><br>Alur aktivasi Adobe kami:<br>1. Kamu share email akun Adobe saat order<br>2. Tim kami akan japri kamu via WhatsApp untuk meminta password <strong>secara private</strong><br>3. Kami login, beli subscription, lalu konfirmasi ke kamu bahwa sudah beres<br>4. Setelah dapat konfirmasi dari kami, <strong>segera ganti password</strong> akun Adobe kamu<br><br>Pastikan ganti password <strong>setelah</strong> ada konfirmasi dari kami ya — jangan sebelum atau selama proses berlangsung, karena kami masih butuh akses di tahap tersebut.' },
            // Pembayaran
            { cat:'pembayaran', q: 'Metode pembayaran apa saja yang tersedia?', a: 'Semua pembayaran diproses aman melalui <strong>Xendit</strong>:<br>• Transfer bank (BCA, BNI, BRI, Mandiri, 100+ bank lain)<br>• QRIS (GoPay, OVO, Dana, ShopeePay, dll)<br>• Virtual Account (instan, 24 jam)<br>• Kartu Kredit/Debit Visa & Mastercard<br>• Minimarket (Alfamart & Indomaret)' },
            { cat:'pembayaran', q: 'Berapa lama proses aktivasi setelah pembayaran?', a: 'Pesanan diproses dalam <strong>5–30 menit</strong> setelah pembayaran dikonfirmasi, setiap hari 08.00–22.00 WIB.<br><br>Pesanan di luar jam operasional diproses di awal hari berikutnya. Notifikasi dikirim via <strong>WhatsApp & Email</strong>.' },
            { cat:'pembayaran', q: 'Bagaimana cara mengajukan refund?', a: 'Refund bisa diajukan dalam <strong>3×24 jam</strong> setelah pembelian jika produk tidak sesuai deskripsi atau tidak bisa diaktifkan setelah troubleshooting.<br><br>Hubungi CS dengan: ID pesanan, bukti pembelian, dan screenshot masalah. Proses refund <strong>3–7 hari kerja</strong>.' },
            // Akun & Garansi
            { cat:'akun', q: 'Apakah produk yang dijual legal dan resmi?', a: 'Ya. Semua produk adalah <strong>lisensi resmi</strong> dari vendor (Microsoft, Adobe, dll). Kami beroperasi sebagai reseller software berlisensi dan mematuhi ketentuan penggunaan. Produk 100% legal untuk keperluan pribadi maupun profesional.' },
            { cat:'akun', q: 'Bagaimana cara mengecek status & masa berlaku akun saya?', a: 'Gunakan fitur <strong>Cek Status</strong> di menu navigasi. Masukkan email pembelian, nama, atau nomor WhatsApp — sistem akan menampilkan status akun, masa berlaku, dan saran renewal secara real-time.', action: 'status', actionLabel: 'Cek Status Akun →' },
            { cat:'akun', q: 'Apakah ada garansi untuk produk yang dibeli?', a: 'Ya! Semua produk bergaransi sesuai masa aktif. Jika bermasalah karena kesalahan kami (akun tidak aktif, lisensi tidak valid), kami <strong>wajib perbaiki atau ganti</strong> tanpa biaya tambahan.<br><br>Garansi tidak berlaku jika masalah disebabkan oleh perubahan password/email, penyalahgunaan, atau penggunaan di luar ketentuan.' },
        ],
        statusOptions: [
            {value:'email',      label:'Email Pembelian',hint:'Email saat order',     placeholder:'contoh@email.com'},
            {value:'nama',       label:'Nama Pembeli',   hint:'Nama saat pembelian',  placeholder:'Nama lengkap kamu'},
            {value:'wa',         label:'No. WhatsApp',   hint:'Nomor WA yang dipakai',placeholder:'08xxxxxxxxxx'},
            {value:'emailAktif', label:'Email Akun',     hint:'Email akun aktifmu',   placeholder:'emailakun@outlook.com'},
        ],
        guideTabs: [
            {id:'office365',label:'Office 365',icon:`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`},
            {id:'windows',  label:'Windows',   icon:`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`},
            {id:'adobe',    label:'Adobe',     icon:`<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>`},
        ],
        guides: {
            office365: [
                {title:'Cara Install Microsoft Office 365',open:false,steps:['Buka browser dan kunjungi office.com, lalu login menggunakan email dan password akun Office 365 yang diberikan Serabut Store.','Setelah login, klik tombol "Install Office" di pojok kanan atas halaman.','Pilih "Office 365 apps" untuk download installer (OfficeSetup.exe).','Jalankan file installer dan ikuti proses instalasi.','Tunggu proses download & instalasi selesai (~15-30 menit).','Buka salah satu aplikasi Office — login dengan akun yang sama untuk aktivasi otomatis.'],note:'Pastikan koneksi internet stabil selama proses download.'},
                {title:'Menambahkan Akun ke Perangkat Baru',open:false,steps:['Buka aplikasi Office di perangkat baru.','Klik "Sign In" atau "Masuk".','Masukkan email akun Office 365 yang diberikan.','Masukkan password — aktivasi berjalan otomatis.'],note:'Office 365 Family mendukung hingga 6 pengguna & 5 perangkat per pengguna.'},
                {title:'Akses OneDrive 1TB',open:false,steps:['Login ke office.com.','Klik ikon OneDrive di menu aplikasi.','Kamu mendapat storage 1TB per pengguna.','Install OneDrive Desktop App untuk sinkronisasi otomatis.'],note:'OneDrive 1TB tersedia untuk setiap pengguna di paket Family dan Personal.'},
                {title:'Troubleshooting: Office Tidak Bisa Aktivasi',open:false,steps:['Pastikan login dengan email yang benar.','Sign out semua perangkat: account.microsoft.com → Security → Sign out everywhere.','Uninstall Office, lalu install ulang dari office.com.','Pastikan tanggal & waktu di komputer sudah benar.','Hubungi support kami jika masih gagal.'],note:'Jangan gunakan tools aktivasi pihak ketiga — bisa menyebabkan akun diblokir Microsoft.'},
            ],
            windows: [
                {title:'Aktivasi Windows 10 Pro dengan License Key',open:false,steps:['Klik kanan Start → System.','Klik "Change product key or upgrade your edition".','Masukkan license key 25 digit (XXXXX-XXXXX-XXXXX-XXXXX-XXXXX).','Klik Next dan tunggu aktivasi selesai.','Cek Settings → Update & Security → Activation.'],note:'License key hanya untuk 1 perangkat.'},
                {title:'Aktivasi Windows 11 Pro dengan License Key',open:false,steps:['Tekan Windows + I → System → Activation.','Klik "Change product key".','Masukkan license key 25 digit.','Klik Next — tunggu konfirmasi "Windows is activated".','Restart komputer.'],note:'Pastikan koneksi internet aktif saat aktivasi.'},
                {title:'Troubleshooting: Error Aktivasi Windows',open:false,steps:['Pastikan key dimasukkan benar (O vs 0, I vs 1).','Coba via CMD (Admin): slmgr /ipk XXXXX-XXXXX-XXXXX-XXXXX-XXXXX','Error 0xC004F050: key tidak kompatibel dengan edisi Windows.','Screenshot error dan kirim ke support kami via WhatsApp.'],note:'Catat kode error untuk mempermudah troubleshooting.'},
            ],
            adobe: [
                {title:'Cara Install Adobe Creative Cloud',open:false,steps:['Login ke creativecloud.adobe.com dengan akun dari Serabut Store.','Download & install Adobe Creative Cloud Desktop App.','Login dengan akun yang sama.','Pilih aplikasi yang ingin diinstall, klik Install.'],note:'Satu akun Adobe CC bisa digunakan di 2 perangkat.'},
                {title:'Troubleshooting: Adobe Tidak Bisa Login',open:false,steps:['Pastikan email dan password benar.','Coba di incognito browser.','Hapus cache browser.','Uninstall CC Desktop App, download versi terbaru.','Hubungi support jika masih gagal.'],note:'Jangan ganti password akun Adobe yang diberikan.'},
            ],
        },

        // ── Computed ──────────────────────────────────
        get currentStatusOption() { return this.statusOptions.find(o=>o.value===this.statusSearchType)||this.statusOptions[0]; },
        get categoryList() { return [...new Set(this.products.map(p=>p.category))].filter(Boolean).sort(); },
        get categories() {
            const defaultIcon = `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`;
            const seen = new Set();
            this.products.map(p => p.category).filter(Boolean).forEach(c => seen.add(c));
            const extra = (this.siteSettings.extraCategories || []).filter(c => c && !seen.has(c));
            return [...seen, ...extra]
                .filter(Boolean)
                .sort()
                .map(name => ({ name, icon: this._categoryIconMap[name] || defaultIcon, desc: '', iconKey: name.toLowerCase().replace(/\s+/g,'') }));
        },
        // true hanya jika user login dengan akun nyata (bukan tamu CS chat)
        get isMember() { return !!(this.currentUser && !this.currentUser.isGuest); },
        get ordersTotalPages() { return Math.max(1, Math.ceil(this.orders.length / this.ordersPerPage)); },
        get ordersFiltered() {
            const f = this.ordersFilter;
            if (f === 'Semua')      return this.orders;
            if (f === 'Belum Bayar') return this.orders.filter(o => o.status === 'Pending' && this.orderMsLeft(o) > 0);
            if (f === 'Diproses')   return this.orders.filter(o => o.status === 'Diproses');
            if (f === 'Selesai')    return this.orders.filter(o => o.status === 'Aktif' || o.status === 'Selesai');
            if (f === 'Dibatalkan') return this.orders.filter(o => this.orderIsCancelled(o) && o.status !== 'Pending');
            return this.orders;
        },
        get orderFilterCounts() {
            return {
                'Semua':      this.orders.length,
                'Belum Bayar': this.orders.filter(o => o.status === 'Pending' && this.orderMsLeft(o) > 0).length,
                'Diproses':   this.orders.filter(o => o.status === 'Diproses').length,
                'Selesai':    this.orders.filter(o => o.status === 'Aktif' || o.status === 'Selesai').length,
                'Dibatalkan': this.orders.filter(o => this.orderIsCancelled(o) && o.status !== 'Pending').length,
            };
        },
        get ordersPaginated() {
            const s = (this.ordersCurrentPage - 1) * this.ordersPerPage;
            return this.ordersFiltered.slice(s, s + this.ordersPerPage);
        },
        get cartCount() { return this.cart.reduce((s,i) => s + (i.qty||1), 0); },
        get cartTotal() { return this.cart.reduce((s,i) => s + this.cartItemUnitPrice(i) * (i.qty||1), 0); },
        get cartMemberSavings() {
            return this.cart.reduce((s,i) => {
                const f = this.flashSaleItem(i.product.nama, i.variant.varian, i.variant.masaAktif);
                return s + (f ? (i.variant.harga - f.harga) * (i.qty||1) : 0);
            }, 0);
        },
        get orderUnitPrice() {
            if (!this.selectedVariant) return 0;
            if (!this.isMember) return this.selectedVariant.harga;
            const base = this.flashSaleItem(this.selectedProductGroup?.nama, this.selectedVariant.varian, this.selectedVariant.masaAktif)?.harga ?? this.selectedVariant.harga;
            return this.renewalMode ? base - this.getRenewalDiscount(base) : base;
        },
        get orderTotal() { return this.orderUnitPrice * (this.orderExtra?.qty || 1); },
        get filteredProducts() {
            return this.products.filter(p => {
                const matchCat = this.activeCategory==='Semua'||p.category===this.activeCategory;
                const q = this.searchQuery.toLowerCase();
                const matchSearch = !q||p.nama.toLowerCase().includes(q)||(p.varian||'').toLowerCase().includes(q);
                return matchCat&&matchSearch;
            });
        },
        get featuredProducts() {
            // Jika admin sudah set featured list, gunakan itu (dengan urutan yang disimpan)
            if(this.siteSettings.featured?.length) {
                const result = [];
                for(const f of this.siteSettings.featured) {
                    const p = this.products.find(p => p.nama===f.nama && p.varian===f.varian && (p.masaAktif||'-')===(f.masaAktif||'-'));
                    if(p) result.push(p);
                }
                if(result.length) return result;
            }
            // Fallback: 1 produk per kategori, max 6
            const seen={}, out=[];
            for(const p of this.products){ if(!seen[p.category]){seen[p.category]=true;out.push(p);if(out.length>=6)break;} }
            return out.length>0?out:this.products.slice(0,6);
        },

        // ── POST helper ───────────────────────────────
        async gasPost(payload) {
            try {
                // [SEC] CSRF marker — wajib ada _srb di semua POST ke GAS
                const body = Object.assign({ _srb: '1' }, payload);
                const res = await fetch(this.GAS_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                    body: JSON.stringify(body),
                });
                const data = await res.json();
                // Jika GAS lama (belum deploy v5), doPost tidak handle action → fallback GET
                if (data?.error === 'Unknown action') {
                    const p = new URLSearchParams(
                        Object.fromEntries(Object.entries(payload).map(([k,v]) => [k, v == null ? '' : String(v)]))
                    );
                    const r2 = await fetch(`${this.GAS_URL}?${p}`);
                    return r2.json();
                }
                return data;
            } catch {
                return { success: false, error: 'Gagal terhubung ke server' };
            }
        },

        // ── Init ──────────────────────────────────────
        async init() {
            this.initPageFromURL();

            // ── iPaymu return URL — capture & simpan ke sessionStorage SEBELUM reload ──
            let pendingPayment = null;
            try {
                const urlParams  = new URLSearchParams(window.location.search);
                const payStatus  = urlParams.get('payment');
                const payOrderId = urlParams.get('orderId');
                if (payStatus && payOrderId) {
                    pendingPayment = { status: payStatus, orderId: payOrderId };
                    sessionStorage.setItem('srb_pending_payment', JSON.stringify(pendingPayment));
                }
                if (payStatus || payOrderId) window.history.replaceState({}, '', window.location.pathname);
            } catch {}
            // Ambil dari sessionStorage jika tidak ada di URL (misal setelah cache-bust reload)
            if (!pendingPayment) {
                try {
                    const ss = sessionStorage.getItem('srb_pending_payment');
                    if (ss) pendingPayment = JSON.parse(ss);
                } catch {}
            }
            try { sessionStorage.removeItem('srb_pending_payment'); } catch {}

            // ── Cache busting — auto-reload jika versi baru terdeteksi ──
            // sessionStorage survive reload → pendingPayment aman
            try {
                const storedV = localStorage.getItem('srb_app_v');
                if (storedV && storedV !== this.APP_VERSION) {
                    localStorage.setItem('srb_app_v', this.APP_VERSION);
                    // simpan ulang ke sessionStorage agar survive reload
                    if (pendingPayment) sessionStorage.setItem('srb_pending_payment', JSON.stringify(pendingPayment));
                    location.reload(true);
                    return;
                }
                localStorage.setItem('srb_app_v', this.APP_VERSION);
            } catch {}
            // ── Load site settings dari cache dulu (instant) ──
            try {
                const cached = localStorage.getItem('serabutSettings');
                if (cached) {
                    const c = JSON.parse(cached);
                    if (c.hero)   this.siteSettings.hero   = { ...this.siteSettings.hero,   ...c.hero };
                    if (c.footer) this.siteSettings.footer = { ...this.siteSettings.footer, ...c.footer };
                }
            } catch {}

            // ── Google SSO — load script hanya jika Client ID dikonfigurasi ──
            if (this.GOOGLE_CLIENT_ID) {
                const gsiScript = document.createElement('script');
                gsiScript.src = 'https://accounts.google.com/gsi/client';
                gsiScript.async = true;
                gsiScript.defer = true;
                document.head.appendChild(gsiScript);
            }

            // ── PWA Service Worker ─────────────────────────
            if ('serviceWorker' in navigator) {
                navigator.serviceWorker.register('/sw.js').catch(() => {});
            }

            // ── PWA Install Prompt ─────────────────────────
            const isStandalone = window.matchMedia('(display-mode: standalone)').matches
                || window.navigator.standalone === true;
            const dismissed = localStorage.getItem('pwa_dismissed');
            const dismissedRecently = dismissed && (Date.now() - Number(dismissed)) < 7 * 24 * 60 * 60 * 1000;

            const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent);
            if (!isStandalone && !dismissedRecently && isMobile) {
                const ua = navigator.userAgent.toLowerCase();
                this.pwaIsIos = /iphone|ipad|ipod/.test(ua) && !window.MSStream;

                if (this.pwaIsIos) {
                    setTimeout(() => { this.pwaPopup = true; }, 3000);
                } else {
                    // Cek apakah event sudah dicapture sebelum Alpine init
                    if (window._pwaPrompt) {
                        this.pwaPromptEvent = window._pwaPrompt;
                        window._pwaPrompt = null;
                        setTimeout(() => { this.pwaPopup = true; }, 3000);
                    } else {
                        // Fallback: tunggu event, jika 5s tidak datang → tunjukkan instruksi manual
                        let prompted = false;
                        window.addEventListener('beforeinstallprompt', e => {
                            e.preventDefault();
                            prompted = true;
                            this.pwaPromptEvent = e;
                            setTimeout(() => { this.pwaPopup = true; }, 1000);
                        });
                        setTimeout(() => {
                            if (!prompted && !this.pwaPopup) {
                                this.pwaIsAndroidManual = true;
                                this.pwaPopup = true;
                            }
                        }, 5000);
                    }
                }
            }

            this.loadCart();
            const saved = localStorage.getItem('serabutUser');
            if(saved) {
                try {
                    const u = JSON.parse(saved);
                    // H5: auto-logout jika sessionToken missing atau sesi > 30 hari
                    const expired = u.loginAt && (Date.now() - new Date(u.loginAt).getTime()) > 30 * 24 * 60 * 60 * 1000;
                    if(!u.sessionToken || expired) {
                        localStorage.removeItem('serabutUser');
                    } else {
                        this.currentUser = u;
                    }
                } catch {}
            }
            // Selalu refresh role dari GAS agar menu Admin selalu akurat
            if(this.currentUser) {
                await this.refreshUserRole();
            }

            // ── iPaymu return — jalankan SETELAH user di-load ──
            if (pendingPayment) {
                if (pendingPayment.status === 'success') {
                    await this.verifyAndConfirmPayment(pendingPayment.orderId);
                } else if (pendingPayment.status === 'cancel') {
                    this.iPaymuReturnStatus = { status: 'cancel', orderId: pendingPayment.orderId };
                }
            }

            await Promise.all([this.fetchProducts(), this.loadSiteSettings()]);
            setInterval(() => {
                if(!this.flashSale.aktif) return;
                const diff = new Date(this.flashSale.deadline) - new Date();
                if(diff <= 0) { this.flashSaleCountdown = '00:00:00'; this.flashSale.aktif = false; return; }
                const h = Math.floor(diff/3600000);
                const m = Math.floor((diff%3600000)/60000);
                const s = Math.floor((diff%60000)/1000);
                this.flashSaleCountdown = [h,m,s].map(v=>String(v).padStart(2,'0')).join(':');
            }, 1000);
        },

        // ── Refresh role dari GAS (sesi lama) ─────────
        async refreshUserRole() {
            try {
                const data = await this.gasPost({ action:'getProfile', email:this.currentUser.email, sessionToken:this.currentUser.sessionToken });
                if(data.success && data.profile?.role) {
                    this.currentUser = { ...this.currentUser, role: data.profile.role };
                    localStorage.setItem('serabutUser', JSON.stringify(this.currentUser));
                } else if(!data.success) {
                    // Token expired/invalid — auto logout
                    this.logout();
                }
            } catch {}
        },

        // ── Load Site Settings dari GAS ───────────────
        async loadSiteSettings() {
            try {
                const res  = await fetch(`${this.GAS_URL}?action=getSettings`);
                const data = await res.json();
                if(!data.success) return;
                const s = data.data;

                // Flash Sale — multi-campaign
                const fsCampaigns = (() => { try { return JSON.parse(s['flashSale.campaigns']||'[]'); } catch { return []; } })();
                if(fsCampaigns.length) {
                    // Aktif campaign: aktif=true DAN saat ini di dalam date range (atau jika tidak ada deadline, tetap aktif)
                    const now = new Date();
                    const active = fsCampaigns.find(c => c.aktif && (c.showAsFlashSale !== false) && (!c.endDate || new Date(c.endDate) > now))
                                || fsCampaigns.find(c => c.aktif && (c.showAsFlashSale !== false));
                    // Compute allDiscountItems: semua campaign aktif dalam periode
                    const _now = new Date();
                    const allDiscountItems = fsCampaigns
                        .filter(c => c.aktif && (!c.endDate || new Date(c.endDate) > _now))
                        .flatMap(c => c.items || []);
                    this.flashSale = {
                        aktif:     !!active,
                        campaigns: fsCampaigns,
                        allDiscountItems,
                        items:     active ? (active.items||[]) : [],
                        deadline:  active ? (active.endDate||'')  : '',
                        startDate: active ? (active.startDate||'') : '',
                        produk: active?.items?.[0]?.produk || '',
                        varian: active?.items?.[0]?.varian || '',
                        harga:  Number(active?.items?.[0]?.harga)     || 0,
                        hargaAsli: Number(active?.items?.[0]?.hargaAsli) || 0,
                        diskon: Number(active?.items?.[0]?.diskon)    || 0,
                    };
                } else {
                    // Backward compat — format lama (single campaign)
                    this.flashSale = {
                        aktif:    s['flashSale.aktif'] === 'true',
                        campaigns: [],
                        produk:   s['flashSale.produk']    || '',
                        varian:   s['flashSale.varian']    || '',
                        harga:    Number(s['flashSale.harga'])     || 0,
                        hargaAsli:Number(s['flashSale.hargaAsli']) || 0,
                        diskon:   Number(s['flashSale.diskon'])    || 0,
                        deadline:  s['flashSale.deadline']   || '',
                        startDate: s['flashSale.startDate']  || '',
                        items: (() => { try { return JSON.parse(s['flashSale.items']||'[]'); } catch { return []; } })(),
                        allDiscountItems: (() => { try { const it = JSON.parse(s['flashSale.items']||'[]'); return (s['flashSale.aktif']==='true') ? it : []; } catch { return []; } })(),
                    };
                }

                // Hero
                this.siteSettings.hero = {
                    tagline1: s['hero.tagline1'] || this.siteSettings.hero.tagline1,
                    tagline2: s['hero.tagline2'] || this.siteSettings.hero.tagline2,
                    subtext:  s['hero.subtext']  || this.siteSettings.hero.subtext,
                    btn1:     s['hero.btn1']     || this.siteSettings.hero.btn1,
                    btn2:     s['hero.btn2']     || this.siteSettings.hero.btn2,
                };

                // Footer
                this.siteSettings.footer = {
                    desc:      s['footer.desc']      || this.siteSettings.footer.desc,
                    email:     s['footer.email']     || this.siteSettings.footer.email,
                    phone:     s['footer.phone']     || this.siteSettings.footer.phone,
                    jam:       s['footer.jam']       || this.siteSettings.footer.jam,
                    copyright: s['footer.copyright'] || this.siteSettings.footer.copyright,
                };

                // Renewal discount
                this.siteSettings.renewal = {
                    discountPct: Number(s['renewal.discountPct']) || 10,
                    discountMax: Number(s['renewal.discountMax']) || 10000,
                };

                // Guides
                try {
                    if(s['guides.office365']) this.guides.office365 = JSON.parse(s['guides.office365']);
                    if(s['guides.windows'])   this.guides.windows   = JSON.parse(s['guides.windows']);
                    if(s['guides.adobe'])     this.guides.adobe     = JSON.parse(s['guides.adobe']);
                    // Reset open state
                    ['office365','windows','adobe'].forEach(k =>
                        this.guides[k] = this.guides[k].map(g => ({...g, open:false}))
                    );
                } catch {}

                // Featured products
                try {
                    const feat = JSON.parse(s['featured.items'] || '[]');
                    if(feat.length) this.siteSettings.featured = feat;
                } catch {}

                // Extra categories (manual tambah dari admin)
                try {
                    const extra = JSON.parse(s['categories.extra'] || '[]');
                    if(Array.isArray(extra)) this.siteSettings.extraCategories = extra;
                } catch {}

                // Benefits per category
                const benefits = {};
                Object.keys(s).forEach(k => {
                    if(k.startsWith('benefits.')) {
                        const cat = k.slice('benefits.'.length);
                        try { benefits[cat] = JSON.parse(s[k]); } catch {}
                    }
                });
                if(Object.keys(benefits).length) this.siteSettings.benefits = benefits;

                // Simpan hero & footer ke localStorage buat load instant di visit berikutnya
                try {
                    localStorage.setItem('serabutSettings', JSON.stringify({
                        hero:   this.siteSettings.hero,
                        footer: this.siteSettings.footer,
                    }));
                } catch {}

                this.settingsLoaded = true;
            } catch(e) {
                this.settingsLoaded = true;
            }
        },

        // ── Products ──────────────────────────────────
        async fetchProducts(force=false) {
            const CACHE_KEY = 'serabut_catalog_cache';
            const TTL = 5 * 60 * 1000; // 5 menit
            const _mapProducts = (list) => list.map(p=>({...p, category: p.category || this.getCategory(p.nama)}));
            const _fetchFresh  = async () => {
                const res  = await fetch(`${this.GAS_URL}?action=getCatalog`);
                const data = await res.json();
                if(data.success&&data.data) {
                    const mapped = _mapProducts(data.data);
                    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: data.data })); } catch {}
                    return mapped;
                }
                return null;
            };
            const _resolvePendingSlug = () => {
                if(!this.pendingProductSlug) return;
                const slug = this.pendingProductSlug;
                this.pendingProductSlug = null;
                const product = this.products.find(p => this.productSlug(p) === slug);
                if(product) {
                    const variants = this.products.filter(p => p.nama === product.nama);
                    this.selectedProductGroup = { nama:product.nama, category:product.category, variants };
                    this.selectedVariant = variants[0];
                    this.activePage = 'product-detail';
                } else {
                    this.activePage = 'catalog';
                }
            };
            // Coba load dari cache dulu → tampil instan
            if(!force) {
                try {
                    const cached = JSON.parse(localStorage.getItem(CACHE_KEY)||'null');
                    if(cached?.data?.length && (Date.now()-cached.ts) < TTL) {
                        this.products = _mapProducts(cached.data);
                        this.loading  = false;
                        _resolvePendingSlug();
                        // Refresh di background tanpa blocking UI
                        _fetchFresh().then(p=>{ if(p) this.products=p; }).catch(()=>{});
                        return;
                    }
                } catch {}
            }
            this.loading=true;
            try {
                const fresh = await _fetchFresh();
                this.products = fresh || this.demoProducts();
            } catch { this.products=this.demoProducts(); }
            this.loading=false;
            _resolvePendingSlug();
        },
        demoProducts() {
            return [
                {nama:'Microsoft Office 365 Family - 1 User 5 Devices',varian:'Office 365 Family',masaAktif:'1 Tahun',harga:337000,linkProduk:'#',category:'Office 365'},
                {nama:'Microsoft Office 365 Family - 1 User 5 Devices',varian:'Office 365 Family',masaAktif:'1 Bulan', harga:99000, linkProduk:'#',category:'Office 365'},
                {nama:'Adobe Creative Cloud All Apps',                  varian:'Adobe CC',        masaAktif:'1 Bulan', harga:341000,linkProduk:'#',category:'Adobe'},
                {nama:'Adobe Creative Cloud - 1 Year',                  varian:'Private Account', masaAktif:'1 Tahun', harga:3351000,linkProduk:'#',category:'Adobe'},
                {nama:'Windows 11 Pro Original License',                varian:'Windows 11 Pro',  masaAktif:'-',       harga:160000,linkProduk:'#',category:'Windows'},
                {nama:'Microsoft Office 2021 Professional Plus',        varian:'Bind Account',    masaAktif:'-',       harga:1850000,linkProduk:'#',category:'Office'},
                {nama:'CorelDRAW Graphics Suite 2024',                  varian:'One time Windows',masaAktif:'-',       harga:5500000,linkProduk:'#',category:'CorelDRAW'},
                {nama:'Ms Project Pro 2021',                            varian:'1 Key 5 Devices', masaAktif:'-',       harga:215000,linkProduk:'#',category:'Project'},
            ];
        },

        // ── Category helpers ──────────────────────────
        getCategory(nama) {
            if(!nama) return 'Lainnya';
            const n=nama.toLowerCase();
            if(n.includes('office 365'))   return 'Office 365';
            if(n.includes('adobe'))        return 'Adobe';
            if(n.includes('windows server')) return 'Windows Server';
            if(n.includes('windows'))      return 'Windows';
            if(n.includes('office 20')&&!n.includes('365')) return 'Office';
            if(n.includes('ms project')||n.includes('project pro')) return 'Project';
            if(n.includes('ms visio')||n.includes('visio')) return 'Visio';
            if(n.includes('coreldraw'))    return 'CorelDRAW';
            if(n.includes('g suite')||n.includes('workspace')||n.includes('global admin')) return 'Google';
            return 'Lainnya';
        },
        getCategoryColor(cat) {
            const m={'Office 365':'bg-blue-100 text-blue-700','Adobe':'bg-red-100 text-red-700','Windows':'bg-sky-100 text-sky-700','Office':'bg-orange-100 text-orange-700','Google':'bg-green-100 text-green-700','CorelDRAW':'bg-yellow-100 text-yellow-700','Project':'bg-purple-100 text-purple-700','Visio':'bg-indigo-100 text-indigo-700','Windows Server':'bg-gray-100 text-gray-700'};
            return m[cat]||'bg-gray-100 text-gray-600';
        },
        getProductLogo(cat) {
            const sz = 64;
            const f  = d => `https://www.google.com/s2/favicons?domain=${d}&sz=${sz}`;
            const sp = name => `https://static2.sharepointonline.com/files/fabric/assets/brand-icons/product/png/${name}_48x1.png`;
            // Windows logo via reliable SVG data URI
            const winLogo = 'data:image/svg+xml;base64,' + btoa('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 22 22"><path fill="#0078D4" d="M0 3.5 9 2.25v8.5H0zm10 -1.25 12-1.8v10.8H10zM0 11.75h9v8.5L0 18.5zm10 0h12v10.75L10 20.75z"/></svg>');
            const m = {
                'office 365':    sp('office'),
                'microsoft 365': sp('office'),
                'office':        sp('office'),
                'visio':         sp('visio'),
                'project':       sp('project'),
                'windows':       winLogo,
                'windows server':winLogo,
                'adobe':         'https://www.adobe.com/favicon.ico',
                'google':        f('google.com'),
                'google one':    f('one.google.com'),
                'coreldraw':     f('coreldraw.com'),
                'netflix':       f('netflix.com'),
                'canva':         f('canva.com'),
                'nordvpn':       f('nordvpn.com'),
                'wattpad':       f('wattpad.com'),
                'disney+':       f('disneyplus.com'),
                'amazon prime':  f('amazon.com'),
                'iqiyi':         f('iqiyi.com'),
                'zoom':          f('zoom.us'),
            };
            return m[(cat||'').toLowerCase()] || sp('office');
        },
        getCategoryBg(cat) {
            const m={'Office 365':'bg-blue-50','Adobe':'bg-red-50','Windows':'bg-sky-50','Office':'bg-orange-50','Google':'bg-green-50','CorelDRAW':'bg-yellow-50','Project':'bg-purple-50','Visio':'bg-indigo-50'};
            return m[cat]||'bg-gray-50';
        },
        getCategoryIcon(cat) {
            const m={'Office 365':'📧','Adobe':'🎨','Windows':'🪟','Office':'💼','Google':'☁️','CorelDRAW':'✏️','Project':'📊','Visio':'📐','Windows Server':'🖥️'};
            return m[cat]||'📦';
        },
        getProductBenefits(catOrProduct) {
            // Prioritas 1: object produk langsung (per-produk benefits)
            if(catOrProduct && typeof catOrProduct === 'object') {
                if(catOrProduct.benefits?.length) return catOrProduct.benefits;
                catOrProduct = catOrProduct.category;
            }
            const cat = catOrProduct;
            // Prioritas 2: dari catalog (products array, cari yg punya benefits)
            const fromCatalog = this.products.find(p => p.category === cat && p.benefits?.length);
            if(fromCatalog?.benefits?.length) return fromCatalog.benefits;
            // Prioritas 3: dari siteSettings cache
            if(this.siteSettings.benefits?.[cat]?.length) return this.siteSettings.benefits[cat];
            const m={
                'Office 365':['Akses semua Office apps (Word, Excel, PowerPoint, Outlook)','OneDrive 1TB cloud storage per pengguna','Support hingga 5 perangkat per akun','Update otomatis ke versi terbaru','Teams, OneNote, dan Publisher termasuk'],
                'Adobe':     ['Akses semua aplikasi Adobe Creative Cloud','100GB cloud storage Adobe','Adobe Fonts premium','Bisa diinstall di 2 perangkat','Update rutin ke versi terbaru'],
                'Windows':   ['Lisensi original & resmi dari Microsoft','Berlaku seumur hidup (lifetime)','Update keamanan via Windows Update','Fitur lengkap Windows Pro','Aktivasi untuk 1 perangkat'],
                'Office':    ['Lisensi original & resmi (non-subscription)','Word, Excel, PowerPoint, Outlook','Berlaku seumur hidup','OneNote dan Publisher termasuk','Bisa diinstall sekali, pakai selamanya'],
                'Google':    ['Admin control penuh atas semua user','Storage besar per pengguna','Google Meet, Drive, Docs, Sheets','Email dengan domain custom','Support prioritas'],
                'CorelDRAW': ['Suite desain grafis profesional','CorelDRAW + Corel PHOTO-PAINT','Ribuan template & font premium','Support format AI, PSD, PDF','Lisensi original resmi'],
                'Project':   ['Ms Project versi original','Manajemen proyek & timeline','Gantt chart & resource planning','Kompatibel dengan Office lainnya','Lisensi untuk 5 perangkat'],
                'Visio':     ['Ms Visio versi original','Diagram alur & flowchart','Template profesional lengkap','Export ke PDF & Office','Lisensi untuk 5 perangkat'],
            };
            return m[cat]||['Produk original & bergaransi resmi','Proses aktivasi cepat & mudah','Support 24/7 via WhatsApp','Garansi jika ada masalah aktivasi'];
        },

        // ── Product Modal ─────────────────────────────
        flashSaleBeli(item) {
            const product = this.products.find(p =>
                p.nama === item.produk && (
                    !item.varian || item.varian === '-' ||
                    p.varian === item.varian ||
                    p.masaAktif === item.masaAktif
                )
            ) || this.products.find(p => p.nama === item.produk);
            if (product) {
                this.goToProductDetail(product);
            } else {
                this.setPage('catalog');
                this.searchQuery = item.produk;
            }
        },
        slugify(str) {
            return String(str).toLowerCase()
                .replace(/[^a-z0-9\s-]/g, '')
                .replace(/\s+/g, '-')
                .replace(/-+/g, '-')
                .trim();
        },
        productSlug(product) {
            return this.slugify(product.nama);
        },
        async shareCurrentProduct(btn) {
            const url   = window.location.href;
            const nama  = this.selectedProductGroup?.nama || 'Produk Serabut Store';
            const label = btn.querySelector('[x-ref="shareLabel"]') || btn.querySelector('span');
            if (navigator.share) {
                try {
                    await navigator.share({ title: nama, text: 'Cek ' + nama + ' di Serabut Store 🛒', url });
                } catch(e) { /* user cancelled */ }
            } else {
                await navigator.clipboard?.writeText(url);
                if (label) {
                    label.textContent = 'Link Tersalin ✓';
                    setTimeout(() => { label.textContent = 'Bagikan Produk Ini'; }, 2000);
                }
            }
        },
        goToProductDetail(product) {
            if(!product || product.stok === 0) return;
            const variants = this.products.filter(p => p.nama === product.nama);
            this.selectedProductGroup = { nama: product.nama, category: product.category, variants };
            this.selectedVariant = variants.find(v => v.varian === product.varian && v.masaAktif === product.masaAktif) || variants[0];
            const slug = this.productSlug(product);
            history.pushState({ page: 'product-detail', slug }, '', '/produk/' + slug);
            this.activePage = 'product-detail';
            window.scrollTo({ top: 0, behavior: 'smooth' });
        },
        openProductModal(product) {
            const variants = this.products.filter(p=>p.nama===product.nama);
            this.selectedProductGroup = { nama:product.nama, category:product.category, variants };
            this.selectedVariant = variants.find(v=>v.varian===product.varian&&v.masaAktif===product.masaAktif)||variants[0];
            this.productModal = true;
            document.body.style.overflow = 'hidden';
        },
        closeProductModal() {
            this.productModal  = false;
            this.renewalMode   = false;
            document.body.style.overflow = '';
        },
        getUniqueVariants(group) {
            if(!group) return [];
            return [...new Set(group.variants.map(v=>v.varian))].filter(Boolean);
        },
        getVariantDurations(group, varianName) {
            if(!group) return [];
            const filtered = varianName ? group.variants.filter(v=>v.varian===varianName) : group.variants;
            return filtered.length>0 ? filtered : group.variants;
        },
        selectVariantByName(v) {
            const durations = this.getVariantDurations(this.selectedProductGroup, v);
            this.selectedVariant = durations[0];
        },

        // ── Auth ──────────────────────────────────────
        openAuth(tab) {
            this.authTab = tab;
            this.authError = '';
            this.authModal = true;
            this.privacyScrolled = false;
            this.registerForm.privacyAccepted = false;
            document.body.style.overflow = 'hidden';
        },
        closeAuthModal() {
            this.authModal = false;
            this.authError = '';
            document.body.style.overflow = '';
        },
        async submitLogin() {
            if(!this.loginForm.email||!this.loginForm.password){ this.authError='Email dan password harus diisi'; return; }
            this.authLoading=true; this.authError='';
            try {
                const email = this.loginForm.email.toLowerCase().trim();
                const hashed = await sha256(email + ':' + this.loginForm.password);
                const hashedLegacy = await sha256(this.loginForm.password);
                const data = await this.gasPost({ action:'login', email, password:hashed, passwordLegacy:hashedLegacy });
                if(data.success) {
                    this.currentUser = { ...data.user, loginAt: new Date().toISOString() };
                    localStorage.setItem('serabutUser', JSON.stringify(this.currentUser));
                    this.closeAuthModal();
                    this.loginForm = {email:'',password:''};
                    this._showWelcomeToast(data.user.nama);
                    if(this.productModal) setTimeout(()=>{ this.orderModal=true; },200);
                } else { this.authError = data.error||'Login gagal'; }
            } catch { this.authError='Gagal terhubung ke server'; }
            this.authLoading=false;
        },
        async submitRegister() {
            const {nama,wa,password,privacyAccepted}=this.registerForm;
            const email = (this.registerForm.email||'').toLowerCase().trim();
            if(!nama||!email||!wa||!password){ this.authError='Semua field harus diisi'; return; }
            if(password.length<6){ this.authError='Password minimal 6 karakter'; return; }
            if(!privacyAccepted){ this.authError='Harap setujui Kebijakan Privasi terlebih dahulu'; return; }
            this.authLoading=true; this.authError='';
            try {
                const hashed = await sha256(email + ':' + password);
                const data = await this.gasPost({ action:'register', nama, email, wa, password:hashed, privacyConsent:'1' });
                if(data.success && data.action==='verify_otp') {
                    this.closeAuthModal();
                    this.openOTPModal(data.email);
                } else { this.authError = data.error||'Registrasi gagal'; }
            } catch { this.authError='Gagal terhubung ke server'; }
            this.authLoading=false;
        },
        openOTPModal(email) {
            this.otpEmail   = email;
            this.otpCode    = '';
            this.otpError   = '';
            this.otpModal   = true;
            this.startOTPTimer();
            document.body.style.overflow = 'hidden';
        },
        closeOTPModal() {
            this.otpModal = false;
            this.otpCode  = '';
            this.otpError = '';
            clearInterval(this.otpInterval);
            document.body.style.overflow = '';
        },
        startOTPTimer() {
            clearInterval(this.otpInterval);
            this.otpTimer = 600;
            this.otpInterval = setInterval(()=>{
                if(this.otpTimer > 0) { this.otpTimer--; }
                else { clearInterval(this.otpInterval); }
            }, 1000);
        },
        otpTimerLabel() {
            const m = String(Math.floor(this.otpTimer/60)).padStart(2,'0');
            const s = String(this.otpTimer%60).padStart(2,'0');
            return `${m}:${s}`;
        },
        async submitOTP() {
            if(!this.otpCode||this.otpCode.length!==6){ this.otpError='Masukkan 6 digit kode OTP'; return; }
            this.otpLoading=true; this.otpError='';
            try {
                const data = await this.gasPost({ action:'verifyOTP', email:this.otpEmail, otp:this.otpCode });
                if(data.success) {
                    this.currentUser = { ...data.user, loginAt: new Date().toISOString() };
                    localStorage.setItem('serabutUser', JSON.stringify(this.currentUser));
                    this.closeOTPModal();
                    this.registerForm = {nama:'',email:'',wa:'',password:''};
                    if(this.productModal) setTimeout(()=>{ this.orderModal=true; },200);
                } else { this.otpError = data.error||'Verifikasi gagal'; }
            } catch { this.otpError='Gagal terhubung ke server'; }
            this.otpLoading=false;
        },
        async resendOTP() {
            this.otpResending=true; this.otpError='';
            try {
                const data = await this.gasPost({ action:'resendOTP', email:this.otpEmail });
                if(data.success) { this.startOTPTimer(); this.otpError=''; }
                else { this.otpError = data.error||'Gagal kirim ulang OTP'; }
            } catch { this.otpError='Gagal terhubung ke server'; }
            this.otpResending=false;
        },
        logout() {
            this.setPage('home');
            this.currentUser = null;
            localStorage.removeItem('serabutUser');
            this.renewalMode   = false;
            this.csStarted     = false;
            this.csMessages    = [];
            this.csSessionId   = null;
            this.csEscalate    = false;
        },

        // ── Order ─────────────────────────────────────
        get orderExtraType() {
            const cat  = (this.selectedProductGroup?.category || '').toLowerCase();
            const v    = (this.selectedVariant?.varian || '').toLowerCase();
            const name = (this.selectedProductGroup?.nama || '').toLowerCase();
            if (cat === 'adobe')                                                    return 'adobe';
            if (v.includes('family'))                                               return 'family';
            if (v.includes('web') && (name.includes('renewal') || this.renewalMode)) return 'renewal';
            if (v.includes('web'))                                                  return 'web';
            return 'other';
        },
        get isOneTimeProduct() {
            const ma = (this.selectedVariant?.masaAktif || '').toLowerCase();
            return !ma.includes('bulan') && !ma.includes('tahun') && !ma.includes('month') && !ma.includes('year');
        },
        // ── Cart ──────────────────────────────────────
        cartExtraType(product, variant) {
            const cat  = (product?.category  || '').toLowerCase();
            const nama = (product?.nama       || '').toLowerCase();
            const v    = (variant?.varian    || '').toLowerCase();
            const ma   = (variant?.masaAktif || '').toLowerCase();
            if (cat === 'adobe')               return 'adobe';
            if (v.includes('family'))          return 'family';
            if (v.includes('web') && nama.includes('renewal')) return 'renewal'; // Renewal: hanya Nama
            if (v.includes('web'))             return 'web';    // 365 Web biasa: Nama + Username
            // Produk one-time (Windows, Office, CorelDraw, G Suite, dll)
            const isOnetime = !ma.includes('bulan') && !ma.includes('tahun') && !ma.includes('month') && !ma.includes('year');
            if (isOnetime)                     return 'license';
            return 'other';
        },
        cartItemUnitPrice(item) {
            if (!item?.variant) return 0;
            if (!this.isMember) return item.variant.harga || 0;
            const fs = this.flashSaleItem(item.product?.nama, item.variant.varian, item.variant.masaAktif);
            return fs ? fs.harga : (item.variant.harga || 0);
        },
        addToCart(product, variant) {
            const v    = variant || product;
            const type = this.cartExtraType(product, v);
            if (type !== 'other') {
                this.cartAddPending = { product, variant: v };
                this.cartAddExtra   = { nama:'', username:'', microsoftEmail:'', adobeEmail:'', adobePass:'', emailAktif:'' };
                this.cartAddError   = '';
                this.cartAddModal   = true;
                return;
            }
            this._pushToCart(product, v, {});
        },
        confirmAddToCart() {
            const { product, variant } = this.cartAddPending;
            const type = this.cartExtraType(product, variant);
            if (type === 'web'     && !this.cartAddExtra.nama.trim())           { this.cartAddError = 'Request Nama akun Microsoft wajib diisi'; return; }
            if (type === 'web'     && !this.cartAddExtra.username.trim())       { this.cartAddError = 'Request Username Microsoft wajib diisi'; return; }
            if (type === 'renewal' && !this.cartAddExtra.nama.trim())           { this.cartAddError = 'Nama akun Microsoft wajib diisi'; return; }
            if (type === 'family'  && !this.cartAddExtra.microsoftEmail.trim()) { this.cartAddError = 'Email Microsoft wajib diisi'; return; }
            if (type === 'adobe'   && !this.cartAddExtra.adobeEmail.trim())     { this.cartAddError = 'Email akun Adobe wajib diisi'; return; }
            if (type === 'license' && !this.cartAddExtra.emailAktif.trim())     { this.cartAddError = 'Email penerima wajib diisi'; return; }
            this._pushToCart(product, variant, { ...this.cartAddExtra });
            this.cartAddModal = false;
        },
        _pushToCart(product, v, extra) {
            const existing = this.cart.find(i =>
                i.product.nama === product.nama &&
                i.variant.varian === v.varian &&
                i.variant.masaAktif === v.masaAktif
            );
            if (existing && Object.keys(extra).every(k => !extra[k])) {
                if (existing.qty < 10) existing.qty++;
            } else {
                this.cart.push({ id: Date.now() + Math.random(), product, variant: v, qty: 1, extra });
            }
            this.saveCart();
            this.showCartToast('Ditambahkan ke keranjang!');
        },
        removeFromCart(id) {
            this.cart = this.cart.filter(i => i.id !== id);
            this.saveCart();
        },
        updateCartItemQty(id, delta) {
            const item = this.cart.find(i => i.id === id);
            if (!item) return;
            const next = (item.qty || 1) + delta;
            if (next < 1) { this.removeFromCart(id); return; }
            if (next > 10) return;
            item.qty = next;
            this.saveCart();
        },
        saveCart() {
            try { localStorage.setItem('serabutCart', JSON.stringify(this.cart)); } catch {}
        },
        loadCart() {
            try {
                const raw = localStorage.getItem('serabutCart');
                if (raw) this.cart = JSON.parse(raw);
            } catch {}
        },
        showCartToast(msg) {
            this.cartToast = msg;
            clearTimeout(this.cartToastTimer);
            this.cartToastTimer = setTimeout(() => { this.cartToast = ''; }, 2200);
        },
        openCartCheckout() {
            this.cartCheckoutError = '';
            this.cartCheckoutSuccess = false;
            this.cartOrderIds = [];
            const profileEmail = this.currentUser?.email || '';
            this.cartCheckoutExtra = {
                guestNama: this.isMember ? (this.currentUser?.nama||'') : '',
                guestEmail: this.isMember ? profileEmail : '',
                guestWa: this.isMember ? (this.currentUser?.wa||'') : '',
            };
            this.cartCheckoutModal = true;
        },
        async submitCartOrder() {
            if (!this.cart.length) return;
            this.cartCheckoutError = '';
            if (!this.isMember) {
                if (!this.cartCheckoutExtra.guestNama.trim()) { this.cartCheckoutError='Nama lengkap wajib diisi'; return; }
                if (!this.cartCheckoutExtra.guestEmail.trim()) { this.cartCheckoutError='Email wajib diisi'; return; }
                if (!this.cartCheckoutExtra.guestWa.trim()) { this.cartCheckoutError='No. WhatsApp wajib diisi'; return; }
            }
            this.cartCheckoutLoading = true;
            const uNama  = this.isMember ? (this.currentUser?.nama||'') : this.cartCheckoutExtra.guestNama.trim();
            const uEmail = this.isMember ? (this.currentUser?.email||'') : this.cartCheckoutExtra.guestEmail.trim();
            const uWa    = this.isMember ? (this.currentUser?.wa||'') : this.cartCheckoutExtra.guestWa.trim();
            const items  = this.cart.map(item => {
                const ex = item.extra || {};
                return {
                    produk:         item.product.nama,
                    varian:         item.variant.varian||'',
                    masaAktif:      item.variant.masaAktif||'-',
                    harga:          this.cartItemUnitPrice(item) * (item.qty||1),
                    qty:            item.qty||1,
                    msNama:         ex.nama||'',
                    username:       ex.username||'',
                    microsoftEmail: ex.microsoftEmail||'',
                    adobeEmail:     ex.adobeEmail||'',
                    adobePass:      ex.adobePass||'',
                    emailAktif:     ex.emailAktif || uEmail,
                };
            });
            try {
                const data = await this.gasPost({
                    action:        'createCartOrder',
                    userNama:      uNama,
                    userEmail:     uEmail,
                    userWa:        uWa,
                    sessionToken:  this.currentUser?.sessionToken || '',
                    itemsJson:     JSON.stringify(items),
                    imageUrlsJson: JSON.stringify(this.cart.map(item => this.getProductLogo(item.product.category || item.product.nama))),
                });
                if (data.success) {
                    this.cart = [];
                    this.saveCart();
                    this.cartCheckoutModal = false;
                    if (data.paymentUrl) {
                        this.startPaymentRedirect(data.orderId || data.referenceId || '', data.paymentUrl);
                    } else if (data.paymentMode === 'manual') {
                        this.showManualPaymentInfo(data.orderId, data.total);
                    } else {
                        this.cartCheckoutError = data.paymentError || 'Pesanan dibuat tapi gagal membuat sesi pembayaran. Hubungi CS.';
                    }
                } else { this.cartCheckoutError = data.error||'Gagal memproses pesanan'; }
            } catch { this.cartCheckoutError = 'Gagal terhubung ke server'; }
            this.cartCheckoutLoading = false;
        },

        showManualPaymentInfo(orderId, total) {
            this.manualPayment = { orderId, total };
        },

        startPaymentRedirect(orderId, paymentUrl) {
            this.redirectPayment = { orderId, paymentUrl, countdown: 5 };
            const tick = setInterval(() => {
                this.redirectPayment.countdown--;
                if (this.redirectPayment.countdown <= 0) {
                    clearInterval(tick);
                    this.redirectPayment = null;
                    window.location.href = paymentUrl;
                }
            }, 1000);
        },

        openPaymentIframe(orderId, paymentUrl) {
            // Alias — langsung redirect (iPaymu blok iframe)
            window.location.href = paymentUrl;
        },

        closePaymentIframe() { this.paymentIframe = null; },

        async verifyAndConfirmPayment(orderId) {
            if (!orderId) return;
            try {
                const res = await this.gasPost({ action: 'confirmPayment', orderId });
                if (res.success) {
                    this.paymentConfirmed = {
                        orderId,
                        productName:   res.productName   || '',
                        paymentMethod: res.paymentMethod || '',
                        totalHarga:    res.totalHarga    || 0,
                        items:         res.items         || [],
                        buyerNama:     res.buyerNama     || '',
                        pending: false
                    };
                } else {
                    this.paymentConfirmed = { orderId, productName: '', pending: !!res.pending };
                }
            } catch(e) {
                this.paymentConfirmed = { orderId, productName: '', pending: true };
            }
            if (this.currentUser) {
                this.setPage('profile');
                this.profileTab = 'pesanan';
                this.pendingOrderDetailId = orderId;
                await this.loadOrders();
            }
        },

        async openConfirmedOrderDetail() {
            const orderId = this.paymentConfirmed?.orderId;
            this.paymentConfirmed = null;
            this.productModal = false;
            this.renewalMode  = false;
            this.setPage('profile');
            this.profileTab = 'pesanan';
            if (this.currentUser && !this.orders.length) await this.loadOrders();
            const order = this.orders.find(o => o.orderId === orderId);
            if (order) this.$nextTick(() => this.openOrderDetail(order));
        },

        async payViaIPaymu() {
            // Alias untuk backward compat — gunakan Xendit
            if (!this.currentOrderId) return;
            this.iPaymuLoading = true;
            this.iPaymuError   = '';
            try {
                const d    = this.currentOrderIPaymuData || {};
                const data = await this.gasPost({
                    action:     'createXenditInvoice',
                    orderId:    this.currentOrderId,
                    items:      d.items || [],
                    buyerName:  d.buyerName || '',
                    buyerEmail: d.buyerEmail || '',
                    buyerPhone: d.buyerPhone || '',
                    total:      d.total || 0,
                });
                if (data.success && data.paymentUrl) {
                    this.openPaymentIframe(this.currentOrderId || '', data.paymentUrl);
                } else {
                    this.iPaymuError = data.error || 'Gagal membuat sesi pembayaran';
                }
            } catch { this.iPaymuError = 'Gagal terhubung ke server'; }
            this.iPaymuLoading = false;
        },

        handlePesan() {
            this.orderError=''; this.orderExtraError='';
            const profileEmail = this.currentUser?.email || '';
            this.orderExtra = { qty:1, guestNama:'', guestEmail:'', guestWa:'', nama:'', username:'', microsoftEmail:'', emailAktif: profileEmail, emailSameAsProfile: !!profileEmail, emailReminder:'', adobeEmail:'', adobePass:'' };
            this.orderModal=true;
        },
        async submitOrder() {
            if(!this.selectedVariant) return;
            this.orderExtraError='';
            const type = this.orderExtraType;
            const qty  = this.orderExtra.qty || 1;
            const effectiveEmail = this.orderExtra.emailSameAsProfile ? (this.currentUser?.email||'') : this.orderExtra.emailAktif.trim();
            // Guest validation
            if(!this.isMember && !this.orderExtra.guestNama.trim())  { this.orderExtraError='Nama lengkap wajib diisi'; return; }
            if(!this.isMember && !this.orderExtra.guestEmail.trim()) { this.orderExtraError='Email wajib diisi'; return; }
            if(!this.isMember && !this.orderExtra.guestWa.trim())    { this.orderExtraError='No. WhatsApp wajib diisi'; return; }
            if(type==='web'     && !this.orderExtra.nama.trim())           { this.orderExtraError='Request Nama untuk akun Microsoft wajib diisi'; return; }
            if(type==='web'     && !this.orderExtra.username.trim())       { this.orderExtraError='Request Username Microsoft wajib diisi'; return; }
            if(type==='family'  && !this.orderExtra.microsoftEmail.trim()) { this.orderExtraError='Email Microsoft wajib diisi'; return; }
            if(type==='renewal' && !this.orderExtra.microsoftEmail.trim()) { this.orderExtraError='Email akun Microsoft wajib diisi'; return; }
            if(type==='adobe'   && !this.orderExtra.adobeEmail.trim())     { this.orderExtraError='Email akun Adobe wajib diisi'; return; }
            if(this.isMember && type!=='adobe' && !effectiveEmail)         { this.orderExtraError='Email wajib diisi'; return; }
            this.orderLoading=true; this.orderError='';
            const unitHarga = (() => {
                if (!this.isMember) return this.selectedVariant.harga;
                const base = this.flashSaleItem(this.selectedProductGroup.nama, this.selectedVariant.varian, this.selectedVariant.masaAktif)?.harga ?? this.selectedVariant.harga;
                return this.renewalMode ? base - this.getRenewalDiscount(base) : base;
            })();
            try {
                const data = await this.gasPost({
                    action:         'createOrder',
                    userNama:       this.isMember ? (this.currentUser?.nama||'') : this.orderExtra.guestNama.trim(),
                    userEmail:      this.isMember ? (this.currentUser?.email||'') : this.orderExtra.guestEmail.trim(),
                    userWa:         this.isMember ? (this.currentUser?.wa||'') : this.orderExtra.guestWa.trim(),
                    sessionToken:   this.currentUser?.sessionToken || '',
                    produk:         this.selectedProductGroup.nama,
                    varian:         this.selectedVariant.varian||'',
                    masaAktif:      this.selectedVariant.masaAktif||'-',
                    qty:            qty,
                    harga:          unitHarga * qty,
                    msNama:         this.orderExtra.nama,
                    username:       this.orderExtra.username,
                    microsoftEmail: this.orderExtra.microsoftEmail,
                    emailAktif:     this.isMember ? effectiveEmail : this.orderExtra.guestEmail.trim(),
                    emailReminder:  this.orderExtra.emailReminder,
                    adobeEmail:     this.orderExtra.adobeEmail,
                    adobePass:      this.orderExtra.adobePass,
                    imageUrl:       this.getProductLogo(this.selectedProductGroup.category || this.selectedProductGroup.nama),
                });
                if(data.success) {
                    if (data.paymentUrl) {
                        this.orderModal = false;
                        this.startPaymentRedirect(data.orderId || data.referenceId || '', data.paymentUrl);
                    } else if (data.paymentMode === 'manual') {
                        this.orderModal = false;
                        this.showManualPaymentInfo(data.orderId, data.harga || data.total);
                    } else {
                        this.orderError = data.paymentError || 'Gagal membuat sesi pembayaran. Silakan coba lagi atau hubungi CS.';
                    }
                } else { this.orderError = data.error||'Gagal membuat pesanan'; }
            } catch { this.orderError='Gagal terhubung ke server'; }
            this.orderLoading=false;
        },

        // ── Status Check ──────────────────────────────
        async checkStatus() {
            const q = this.statusQuery.trim();
            if(q.length < 4) { this.statusResult = null; return; }
            this.statusChecking=true; this.statusResult=null;
            try {
                const params = new URLSearchParams({ action:'smartSearch', query:q });
                const res  = await fetch(`${this.GAS_URL}?${params}`);
                const data = await res.json();
                this.statusResult = data.data||[];
            } catch { this.statusResult=[]; }
            this.statusChecking=false;
        },

        // ── Helpers ───────────────────────────────────
        formatPrice(p) {
            if(!p) return 'Hubungi Kami';
            return new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',minimumFractionDigits:0}).format(p);
        },
        formatTglLahir(str) {
            if(!str) return '—';
            const parts = String(str).split('-');
            if(parts.length!==3) return str;
            const bulan = ['','Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
            return `${parseInt(parts[2])} ${bulan[parseInt(parts[1])]} ${parts[0]}`;
        },
        // ── Guest Login ───────────────────────────────
        loginAsGuest(nama) {
            const name = (nama || '').trim() || 'Tamu';
            this.currentUser  = { nama: name, role: 'guest', isGuest: true };
            this.authModal    = false;
            this.authError    = '';
            this.guestStep    = false;
            this.guestNameInput = '';
        },

        // ── Expiry Helpers ────────────────────────────
        calcExpiry(tanggal, masaAktif) {
            if (!tanggal || !masaAktif || masaAktif === '-' || masaAktif === '') return null;
            const lower = masaAktif.toLowerCase();
            if (lower.includes('lifetime') || lower.includes('seumur')) return null;
            // Parse tanggal "dd/MM/yyyy HH:mm"
            const parts = tanggal.split(' ')[0].split('/');
            if (parts.length < 3) return null;
            const base = new Date(parts[2], parts[1] - 1, parts[0]);
            if (isNaN(base)) return null;
            // Parse masa aktif
            const num = parseInt(masaAktif) || 1;
            if (lower.includes('tahun') || lower.includes('year')) base.setFullYear(base.getFullYear() + num);
            else if (lower.includes('bulan') || lower.includes('month')) base.setMonth(base.getMonth() + num);
            else if (lower.includes('hari') || lower.includes('day')) base.setDate(base.getDate() + num);
            else return null;
            // Return as dd/MM/yyyy for formatOrderDate
            const d = String(base.getDate()).padStart(2,'0');
            const m = String(base.getMonth()+1).padStart(2,'0');
            return `${d}/${m}/${base.getFullYear()}`;
        },
        isExpired(expiryStr) {
            if (!expiryStr) return false;
            const parts = expiryStr.split('/');
            if (parts.length < 3) return false;
            return new Date(parts[2], parts[1]-1, parts[0]) < new Date();
        },
        isExpiringSoon(expiryStr, days = 30) {
            if (!expiryStr) return false;
            const parts = expiryStr.split('/');
            if (parts.length < 3) return false;
            const exp = new Date(parts[2], parts[1]-1, parts[0]);
            const now = new Date();
            return exp >= now && (exp - now) / 86400000 <= days;
        },

        // ── Renewal ───────────────────────────────────
        reorderProduct(order) {
            const product = this.products.find(p => p.nama === order.produk)
                || this.products.find(p => order.produk?.startsWith(p.nama));
            if (!product) { this.setPage('catalog'); this.searchQuery = order.produk; return; }
            this.renewalMode = false;
            this.openProductModal(product);
        },
        renewOrder(order) {
            const product = this.products.find(p => p.nama === order.produk)
                || this.products.find(p => order.produk?.startsWith(p.nama));
            if (!product) { this.setPage('catalog'); this.searchQuery = order.produk; return; }
            this.renewalMode = true;
            this.openProductModal(product);
        },
        getRenewalDiscount(harga) {
            const pct = this.siteSettings.renewal?.discountPct || 10;
            const max = this.siteSettings.renewal?.discountMax || 10000;
            return Math.min(Math.round(harga * pct / 100), max);
        },

        openCSChat(guestName) {
            const nama = this.currentUser ? this.currentUser.nama : (guestName || '').trim();
            if (!nama) return;
            const pesan = this.currentUser
                ? `Halo Serabut Store! 👋 Saya *${nama}*, pelanggan Serabut.id. Saya ingin bertanya mengenai produk atau layanan kalian. Bisa bantu?`
                : `Halo Serabut Store! 👋 Saya *${nama}*, ingin bertanya mengenai produk atau layanan kalian. Bisa bantu?`;
            const url = `https://wa.me/62${this.WA_NUMBER}?text=${encodeURIComponent(pesan)}`;
            window.open(url, '_blank');
            this.csPopup = false;
            this.csGuestName = '';
        },
        startCSChat() {
            if (this.csStarted) return;
            this.csSessionId = Date.now() + '-' + Math.random().toString(36).slice(2, 7);
            this.csStarted   = true;
            const nama = this.currentUser ? this.currentUser.nama : this.csGuestName.trim();
            this.csMessages  = [{ id: 0, role: 'assistant', content: `Halo${nama ? ', ' + nama : ''}! 👋 Ada yang bisa Sera bantu hari ini?\n\n— Sera, AI Assistant` }];
            this.$nextTick(() => this.scrollCSToBottom());
        },
        async sendCSMessage() {
            const msg = this.csInput.trim();
            if (!msg || this.csSending) return;
            this.csInput = '';
            this.csMessages.push({ id: Date.now(), role: 'user', content: msg });
            this.csSending = true;
            this.$nextTick(() => this.scrollCSToBottom());
            try {
                const data = await this.gasPost({
                    action:    'csChat',
                    sessionId: this.csSessionId,
                    message:   msg,
                    userName:  this.currentUser ? this.currentUser.nama  : this.csGuestName,
                    userEmail: this.currentUser ? this.currentUser.email : '',
                });
                if (data.success) {
                    this.csMessages.push({ id: Date.now() + 1, role: 'assistant', content: data.reply });
                    if (data.escalate) this.csEscalate = true;
                } else {
                    this.csMessages.push({ id: Date.now() + 1, role: 'assistant', content: 'Maaf, ada gangguan sementara. Silakan coba lagi atau langsung chat CS kami.' });
                    this.csEscalate = true;
                }
            } catch (_) {
                this.csMessages.push({ id: Date.now() + 1, role: 'assistant', content: 'Koneksi bermasalah. Silakan coba lagi.' });
            }
            this.csSending = false;
            this.$nextTick(() => this.scrollCSToBottom());
        },
        scrollCSToBottom() {
            const el = this.$refs.csScrollArea;
            if (el) el.scrollTop = el.scrollHeight;
        },
        flashItemDrop(toIdx) {
            const from = this.flashItemDragIdx;
            if (from === null || from === toIdx) return;
            const items = [...this.adminFlashItems];
            const [moved] = items.splice(from, 1);
            items.splice(toIdx, 0, moved);
            this.adminFlashItems = items;
            this.flashItemDragIdx = null;
            this.flashItemDragOver = null;
        },
        applyGuideFormat(event, field, idx, italic = false) {
            const el = event.target;
            const start = el.selectionStart, end = el.selectionEnd;
            const marker = italic ? '*' : '**';
            const selected = el.value.slice(start, end) || (italic ? 'teks' : 'teks tebal');
            const before = el.value.slice(0, start);
            const after  = el.value.slice(end);
            const newVal = before + marker + selected + marker + after;
            if (field === 'steps' && idx !== null) {
                this.adminNewGuide.steps[idx] = newVal;
            } else {
                this.adminNewGuide.note = newVal;
            }
            this.$nextTick(() => {
                el.setSelectionRange(start + marker.length, start + marker.length + selected.length);
                el.focus();
            });
        },
        renderGuideText(text) {
            return String(text)
                .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
                .replace(/\*(.+?)\*/g,'<em>$1</em>');
        },
        renderCSMessage(text) {
            // [SEC] Escape & < > terlebih dahulu, lalu proses markdown
            // URL regex exclude " dan ' agar tidak bisa inject atribut ke href
            return String(text)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/\*(.+?)\*/g, '<em>$1</em>')
                .replace(/`([^`]+)`/g, '<code class="bg-black/10 rounded px-1">$1</code>')
                .replace(/\[([^\]]+)\]\((https?:\/\/[^)"'\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline text-brand-600 hover:text-brand-800">$1</a>')
                .replace(/https?:\/\/[^<\s"'&]+/g, url => `<a href="${url}" target="_blank" rel="noopener noreferrer" class="underline text-brand-600 hover:text-brand-800">${url}</a>`)
                .replace(/\n/g, '<br>');
        },
        formatOrderDate(str) {
            if(!str) return str;
            const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
            const parts = (str||'').split(' ')[0].split('/');
            if(parts.length !== 3) return str;
            return `${parts[0]} ${months[Number(parts[1])-1]} ${parts[2]}`;
        },
        formatOrderDateTime(str) {
            if(!str) return '';
            const [datePart, timePart] = String(str).trim().split(' ');
            const dateStr = this.formatOrderDate(datePart);
            return timePart ? `${dateStr}, ${timePart} WIB` : dateStr;
        },
        orderIsCancelled(order) {
            return order?.status === 'Dibatalkan' || (order?.status === 'Pending' && this.orderMsLeft(order) <= 0);
        },
        orderDisplayStatus(order) {
            if (order?.status === 'Pending' && this.orderMsLeft(order) <= 0) return 'Dibatalkan';
            if (order?.status === 'Pending' && this.orderMsLeft(order) > 0) return 'Belum Dibayar';
            return order?.status || '';
        },
        setPage(page) {
            this.activePage = page;
            const routeMap = { home:'/', catalog:'/produk', panduan:'/panduan', faq:'/faq', status:'/cek-status', admin:'/admin', profile:'/akun' };
            history.pushState({ page }, '', routeMap[page] || '/');
            window.scrollTo({ top:0, behavior:'smooth' });
            this.searchQuery = '';
            if(page==='catalog') this.activeCategory='Semua';
            if(page!=='status')  this.statusResult=null;
            if(page==='profile') { this.profileTab='diri'; this.editMode=false; this.loadProfile(); }
            if(page==='admin')   { this.adminTab='flashsale'; this.adminInitTab('flashsale'); }
        },
        initPageFromURL() {
            const pathMap = { '/':'home', '/produk':'catalog', '/panduan':'panduan', '/faq':'faq', '/cek-status':'status', '/admin':'admin', '/akun':'profile' };
            const path = window.location.pathname;
            // Detect /produk/[slug] — product detail deep link
            const produkMatch = path.match(/^\/produk\/(.+)$/);
            if(produkMatch) {
                this.pendingProductSlug = produkMatch[1];
                this.activePage = 'catalog'; // will redirect after products load
                history.replaceState({ page:'product-detail', slug:produkMatch[1] }, '', path);
            } else {
                const page = pathMap[path] || 'home';
                this.activePage = page;
                history.replaceState({ page }, '', path);
            }
            window.addEventListener('popstate', (e) => {
                const state = e.state;
                if(state?.page === 'product-detail' && state?.slug) {
                    const slug = state.slug;
                    const product = this.products.find(p => this.productSlug(p) === slug);
                    if(product) {
                        const variants = this.products.filter(p => p.nama === product.nama);
                        this.selectedProductGroup = { nama:product.nama, category:product.category, variants };
                        this.selectedVariant = variants[0];
                        this.activePage = 'product-detail';
                    } else {
                        this.activePage = 'catalog';
                    }
                } else {
                    const p = state?.page || pathMap[window.location.pathname] || 'home';
                    this.activePage = p;
                }
                window.scrollTo({ top:0, behavior:'smooth' });
            });
        },

        // ── Admin computed ────────────────────────────
        get adminFormProduct() { return this.adminNewProduct; },
        get adminFilteredOrders() {
            const f = this.adminOrderFilter;
            if (f === 'Semua')          return this.adminOrders;
            if (f === 'Belum Bayar')    return this.adminOrders.filter(o => o.status === 'Pending');
            if (f === 'Perlu Diproses') return this.adminOrders.filter(o => o.status === 'Diproses');
            if (f === 'Selesai')        return this.adminOrders.filter(o => o.status === 'Aktif' || o.status === 'Selesai');
            if (f === 'Dibatalkan')     return this.adminOrders.filter(o => o.status === 'Dibatalkan');
            return this.adminOrders;
        },
        get adminGroupedOrders() {
            const filtered = this.adminFilteredOrders;
            const map = new Map(); const list = [];
            for (const o of filtered) {
                if (!map.has(o.orderId)) {
                    const g = { orderId:o.orderId, nama:o.nama, email:o.email, wa:o.wa, tanggal:o.tanggal, status:o.status, items:[], total:0 };
                    map.set(o.orderId, g); list.push(g);
                }
                const g = map.get(o.orderId);
                g.items.push(o); g.total += (Number(o.harga)||0);
            }
            return list;
        },
        get adminOrdersTotalPages() { return Math.max(1, Math.ceil(this.adminGroupedOrders.length / this.adminOrdersPerPage)); },
        get adminPagedOrders()      { const s = (this.adminOrdersPage-1)*this.adminOrdersPerPage; return this.adminGroupedOrders.slice(s, s+this.adminOrdersPerPage); },
        get adminOrdersPageRange() {
            const t = this.adminOrdersTotalPages, c = this.adminOrdersPage;
            if (t <= 7) return Array.from({length:t},(_,i)=>i+1);
            if (c <= 4) return [1,2,3,4,5,'…',t];
            if (c >= t-3) return [1,'…',t-4,t-3,t-2,t-1,t];
            return [1,'…',c-1,c,c+1,'…',t];
        },
        adminOrderTabCount(tab) {
            if (tab === 'Semua')          return this.adminOrders.length;
            if (tab === 'Belum Bayar')    return this.adminOrders.filter(o => o.status === 'Pending').length;
            if (tab === 'Perlu Diproses') return this.adminOrders.filter(o => o.status === 'Diproses').length;
            if (tab === 'Selesai')        return this.adminOrders.filter(o => o.status === 'Aktif' || o.status === 'Selesai').length;
            if (tab === 'Dibatalkan')     return this.adminOrders.filter(o => o.status === 'Dibatalkan').length;
            return 0;
        },
        get adminFilteredProducts() {
            const q = this.adminProductSearch.toLowerCase().trim();
            if(!q) return this.adminProducts;
            return this.adminProducts.filter(p =>
                p.nama.toLowerCase().includes(q) ||
                (p.varian||'').toLowerCase().includes(q) ||
                (p.masaAktif||'').toLowerCase().includes(q)
            );
        },

        // ── Admin tab init ────────────────────────────
        async adminInitTab(tab) {
            if(tab==='flashsale') {
                const now = new Date();
                this.adminFlashCampaigns = JSON.parse(JSON.stringify(this.flashSale.campaigns || [])).map(c => {
                    if (c.aktif && c.endDate && new Date(c.endDate) < now) c.aktif = false;
                    return c;
                });
                this.adminFlashCampIdx = -1;
                this.adminFlashItems = [];
                this.adminFlashEditIdx = -1;
                this.adminFlashFormItem = { produk:'', varian:'', harga:0, hargaAsli:0, diskon:0 };
                this.adminFlashSearch = '';
                this.adminFlashResults = [];
                this.adminFlashVariants = [];
                this.adminFlashVariantIdx = 0;
            } else if(tab==='hero') {
                this.adminEditHero = { ...this.siteSettings.hero };
            } else if(tab==='footer') {
                this.adminEditFooter = { ...this.siteSettings.footer };
            } else if(tab==='kategori') {
                this.adminEditCats = [...(this.siteSettings.extraCategories || [])];
                this.adminNewCatName = '';
            } else if(tab==='produk') {
                this.adminLoadProducts();
            } else if(tab==='populer') {
                this.adminFeaturedSearch = ''; this.adminFeaturedResults = [];
                // Load adminProducts dulu agar search selalu fresh (semua produk aktif)
                await this.adminLoadProducts();
                this.adminFeaturedItems = (this.siteSettings.featured||[]).map(f =>
                    this.adminProducts.find(p => p.nama===f.nama && p.varian===f.varian && (p.masaAktif||'-')===(f.masaAktif||'-') && p.aktif)
                ).filter(Boolean);
            } else if(tab==='panduan') {
                this.adminLoadGuides();
            } else if(tab==='orders') {
                if (!this.adminOrdersLoaded) this.adminLoadOrders();
            } else if(tab==='ipaymu') {
                if (!this.adminIPaymuLoaded) {
                    this.adminIPaymuLoadBalance();
                    this.adminIPaymuLoadHistory();
                }
            }
        },

        // ── Admin iPaymu ──────────────────────────────
        async adminIPaymuLoadBalance() {
            this.adminIPaymuBalanceLoading = true;
            this.adminIPaymuBalanceError   = '';
            this.adminIPaymuBalance        = null;
            const res = await this.gasPost({ action:'iPaymuAdminGetBalance', adminEmail:this.currentUser.email, adminToken:this.currentUser.sessionToken });
            if (res.success) this.adminIPaymuBalance = res.data;
            else this.adminIPaymuBalanceError = res.error || 'Gagal memuat saldo';
            this.adminIPaymuBalanceLoading = false;
        },
        async adminIPaymuCheckTrx() {
            const id = this.adminIPaymuTrxId.trim();
            if (!id) return;
            this.adminIPaymuTrxLoading = true;
            this.adminIPaymuTrxError   = '';
            this.adminIPaymuTrxData    = null;
            const res = await this.gasPost({ action:'iPaymuAdminGetTransaction', adminEmail:this.currentUser.email, adminToken:this.currentUser.sessionToken, transactionId: id });
            if (res.success) this.adminIPaymuTrxData = res.data;
            else this.adminIPaymuTrxError = res.error || 'Transaksi tidak ditemukan';
            this.adminIPaymuTrxLoading = false;
        },
        async adminIPaymuLoadHistory() {
            this.adminIPaymuHistoryLoading = true;
            this.adminIPaymuHistoryError   = '';
            const f = this.adminIPaymuFilter;
            try {
                const res = await this.gasPost({
                    action:     'iPaymuAdminGetHistory',
                    adminEmail: this.currentUser.email,
                    adminToken: this.currentUser.sessionToken,
                    startdate:  f.startdate,
                    enddate:    f.enddate,
                    status:     f.status,
                    page:       f.page,
                    limit:      f.limit,
                });
                if (res.success) {
                    this.adminIPaymuHistory    = Array.isArray(res.data) ? res.data : [];
                    this.adminIPaymuPagination = res.pagination || {};
                    this.adminIPaymuLoaded     = true;
                } else {
                    this.adminIPaymuHistoryError = res.error || 'Gagal memuat riwayat';
                    this.adminIPaymuHistory = [];
                }
            } catch(e) {
                this.adminIPaymuHistoryError = 'Gagal terhubung ke server';
                this.adminIPaymuHistory = [];
            }
            this.adminIPaymuHistoryLoading = false;
        },
        async adminIPaymuSyncOrders() {
            this.adminIPaymuSyncLoading = true;
            this.adminIPaymuSyncMsg     = '';
            try {
                const res = await this.gasPost({ action: 'iPaymuAdminSyncOrders', adminEmail: this.currentUser.email, adminToken: this.currentUser.sessionToken });
                if (res.success) {
                    this.adminIPaymuSyncMsg = `✓ Selesai: ${res.checked} order dicek, ${res.updated} diupdate ke Diproses`;
                    if (res.updated > 0) { this.adminOrdersLoaded = false; this.adminLoadOrders(); }
                } else {
                    this.adminIPaymuSyncMsg = 'Error: ' + (res.error || 'Gagal sync');
                }
            } catch(e) {
                this.adminIPaymuSyncMsg = 'Gagal terhubung ke server';
            }
            this.adminIPaymuSyncLoading = false;
        },
        adminIPaymuTrxStatusLabel(status) {
            const map = { '-2':'Expired', '0':'Pending', '1':'Berhasil', '2':'Batal', '3':'Refund', '4':'Error', '5':'Gagal', '6':'Berhasil', '7':'Escrow' };
            return map[String(status)] || ('Status ' + status);
        },
        adminIPaymuTrxStatusBadge(status) {
            const s = String(status);
            if (s === '1' || s === '6' || s === '7') return 'bg-emerald-100 text-emerald-700';
            if (s === '0') return 'bg-yellow-100 text-yellow-700';
            if (s === '-2' || s === '2' || s === '4' || s === '5') return 'bg-red-100 text-red-700';
            if (s === '3') return 'bg-blue-100 text-blue-700';
            return 'bg-gray-100 text-gray-600';
        },

        // ── Admin save helper ─────────────────────────
        async _adminSave(key, value) {
            return this.gasPost({ action:'saveSettings', adminEmail:this.currentUser.email, adminToken:this.currentUser.sessionToken, key, value });
        },
        _adminShowMsg(msg) {
            this.adminSaveMsg = msg;
            setTimeout(()=>{ this.adminSaveMsg=''; }, 3000);
        },

        // ── Admin: Flash Sale helpers ─────────────────
        adminFlashFilter() {
            const q = this.adminFlashSearch.toLowerCase().trim();
            if(!q) { this.adminFlashResults = []; return; }
            const seen = new Set();
            this.adminFlashResults = this.products
                .filter(p => p.nama.toLowerCase().includes(q))
                .filter(p => { if(seen.has(p.nama)) return false; seen.add(p.nama); return true; })
                .slice(0, 6);
        },
        adminFlashSelectProduct(p) {
            this.adminFlashFormItem.produk = p.nama;
            this.adminFlashSearch = '';
            this.adminFlashResults = [];
            this.adminFlashVariants = this.products.filter(pr => pr.nama === p.nama);
            this.adminFlashVariantIdx = 0;
            if(this.adminFlashVariants.length > 0) this.adminFlashPickVariant(0);
        },
        adminFlashPickVariant(idx) {
            this.adminFlashVariantIdx = Number(idx);
            const v = this.adminFlashVariants[this.adminFlashVariantIdx];
            if(v) {
                this.adminFlashFormItem.varian = v.varian + (v.masaAktif && v.masaAktif !== '-' ? ' · ' + v.masaAktif : '');
                this.adminFlashFormItem.hargaAsli = v.harga;
                this.adminFlashCalcDiskon();
            }
        },
        adminFlashCalcDiskon() {
            const sale = Number(this.adminFlashFormItem.harga) || 0;
            const asli = Number(this.adminFlashFormItem.hargaAsli) || 0;
            if(asli > 0 && sale > 0 && sale < asli)
                this.adminFlashFormItem.diskon = Math.round((1 - sale/asli) * 100);
        },
        adminFlashClearForm() {
            this.adminFlashFormItem = { produk:'', varian:'', harga:0, hargaAsli:0, diskon:0 };
            this.adminFlashSearch = '';
            this.adminFlashResults = [];
            this.adminFlashVariants = [];
            this.adminFlashVariantIdx = 0;
        },
        adminFlashAddItem() {
            this.adminFlashEditIdx = -2;
            this.adminFlashFormItem = { produk:'', varian:'', harga:0, hargaAsli:0, diskon:0 };
            this.adminFlashSearch = '';
            this.adminFlashResults = [];
            this.adminFlashVariants = [];
        },
        adminFlashEditItem(i) {
            this.adminFlashEditIdx = i;
            this.adminFlashFormItem = { ...this.adminFlashItems[i] };
            this.adminFlashSearch = '';
            this.adminFlashResults = [];
            this.adminFlashVariants = this.products.filter(p => p.nama === this.adminFlashFormItem.produk);
            this.adminFlashVariantIdx = 0;
        },
        adminFlashDeleteItem(i) {
            this.adminFlashItems.splice(i, 1);
        },
        adminFlashSaveItem() {
            const item = { ...this.adminFlashFormItem };
            if(!item.produk) return;
            item.harga = Number(item.harga)||0;
            item.hargaAsli = Number(item.hargaAsli)||0;
            item.diskon = Number(item.diskon)||0;
            if(this.adminFlashEditIdx === -2) {
                this.adminFlashItems.push(item);
            } else {
                this.adminFlashItems[this.adminFlashEditIdx] = item;
                this.adminFlashItems = [...this.adminFlashItems];
            }
            this.adminFlashCancelEdit();
        },
        adminFlashCancelEdit() {
            this.adminFlashEditIdx = -1;
            this.adminFlashFormItem = { produk:'', varian:'', harga:0, hargaAsli:0, diskon:0 };
            this.adminFlashSearch = '';
            this.adminFlashResults = [];
            this.adminFlashVariants = [];
            this.adminFlashVariantIdx = 0;
        },
        flashSaleItem(nama, varian, masaAktif) {
            const combined = masaAktif && masaAktif !== '-' ? varian + ' · ' + masaAktif : varian;
            // Cek semua active discount items (flash sale + regular discount)
            const allItems = this.flashSale.allDiscountItems?.length
                ? this.flashSale.allDiscountItems
                : (this.flashSale.aktif ? (this.flashSale.items || []) : []);
            return allItems.find(i => i.produk === nama && (i.varian === varian || i.varian === combined)) || null;
        },
        formatDT(dt) {
            if(!dt) return '—';
            const [date, time] = dt.split('T');
            if(!date) return dt;
            const [y,m,d] = date.split('-');
            const mo = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
            return `${d} ${mo[parseInt(m)-1]} ${y}${time ? ', '+time.slice(0,5) : ''}`;
        },

        // ── Google SSO ───────────────────────────────
        googleSignIn() {
            const CLIENT_ID = this.GOOGLE_CLIENT_ID;
            if(!CLIENT_ID) { this.authError = 'Login Google belum dikonfigurasi.'; return; }
            if(!window.google?.accounts?.id) {
                this.authError = 'Google Sign-In belum siap, coba beberapa saat lagi.'; return;
            }
            this.authError = '';
            window._serabutGoogleCallback = async (response) => {
                this.authLoading = true;
                try {
                    // C4: kirim raw credential (id_token) ke GAS — verifikasi dilakukan server-side
                    await this.googleAuthCallback(response.credential);
                } catch(e) { this.authError = 'Gagal login dengan Google.'; }
                this.authLoading = false;
            };
            google.accounts.id.initialize({ client_id: CLIENT_ID, callback: window._serabutGoogleCallback, auto_select: false });
            google.accounts.id.prompt((notification) => {
                if(notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    const div = document.createElement('div');
                    div.style.display='none';
                    document.body.appendChild(div);
                    google.accounts.id.renderButton(div, { type:'standard', size:'large' });
                    setTimeout(() => { div.querySelector('div[role=button]')?.click(); }, 100);
                }
            });
        },
        async googleAuthCallback(credential) {
            const data = await this.gasPost({ action:'googleLogin', credential });
            if(data.success) {
                this.currentUser = { ...data.user, loginAt: new Date().toISOString() };
                localStorage.setItem('serabutUser', JSON.stringify(this.currentUser));
                this.closeAuthModal();
                this._showWelcomeToast(data.user.nama);
                if(data.user.role==='admin') this.setPage('admin');
            } else {
                this.authError = data.error || 'Gagal login dengan Google.';
            }
        },

        _showWelcomeToast(nama) {
            this.welcomeToastName = nama || 'Kamu';
            this.welcomeToast = true;
            setTimeout(() => { this.welcomeToast = false; }, 4000);
        },

        // ── Guide Drag & Drop ────────────────────────
        guideDragStart(gi) { this.guideDragIdx = gi; },
        guideDragOver(gi)  { if(this.guideDragIdx!==null && this.guideDragIdx!==gi) this.guideDragOverIdx = gi; },
        guideDrop(gi) {
            if(this.guideDragIdx===null || this.guideDragIdx===gi) { this.guideDragIdx=null; this.guideDragOverIdx=null; return; }
            const arr = [...(this.adminGuides[this.adminGuideTab]||[])];
            const [moved] = arr.splice(this.guideDragIdx, 1);
            arr.splice(gi, 0, moved);
            this.adminGuides[this.adminGuideTab] = arr;
            this.guideDragIdx = null; this.guideDragOverIdx = null;
            this.adminSaveGuideOrder();
        },
        async adminSaveGuideOrder() {
            try {
                const data = await this.gasPost({ action:'saveGuides', adminEmail:this.currentUser.email, adminToken:this.currentUser.sessionToken, tab:this.adminGuideTab, guidesJson:JSON.stringify(this.adminGuides[this.adminGuideTab]) });
                if(data.success) {
                    this.guides[this.adminGuideTab] = this.adminGuides[this.adminGuideTab].map(g=>({...g,open:false}));
                    this._adminShowMsg('Urutan panduan disimpan ✓');
                }
            } catch {}
        },

        // ── Admin: Flash Sale Campaigns ──────────────
        adminFlashNewCampaign() {
            this.adminFlashCampForm = { id:'camp_'+Date.now(), nama:'', aktif:true, showAsFlashSale:true, startDate:'', endDate:'', items:[] };
            this.adminFlashItems = [];
            this.adminFlashEditIdx = -1;
            this.adminFlashCampIdx = -2;
        },
        adminFlashEditCampaign(ci) {
            const camp = this.adminFlashCampaigns[ci];
            this.adminFlashCampForm = { ...camp, items:[...( camp.items||[])] };
            this.adminFlashItems = JSON.parse(JSON.stringify(camp.items||[]));
            this.adminFlashEditIdx = -1;
            this.adminFlashCampIdx = ci;
        },
        adminFlashDeleteCampaign(ci) {
            if(!confirm(`Hapus campaign "${this.adminFlashCampaigns[ci].nama}"?`)) return;
            this.adminFlashCampaigns.splice(ci, 1);
            this.adminSaveFlashCampaigns();
        },
        async adminFlashSaveCampaign() {
            const f = this.adminFlashCampForm;
            if(!f.nama.trim()) { this._adminShowMsg('⚠ Nama campaign wajib diisi'); return; }
            if(!f.startDate || !f.endDate) { this._adminShowMsg('⚠ Isi tanggal mulai & berakhir'); return; }
            f.items = JSON.parse(JSON.stringify(this.adminFlashItems));
            if(this.adminFlashCampIdx === -2) {
                this.adminFlashCampaigns.push({ ...f });
            } else {
                this.adminFlashCampaigns[this.adminFlashCampIdx] = { ...f };
                this.adminFlashCampaigns = [...this.adminFlashCampaigns];
            }
            await this.adminSaveFlashCampaigns();
            this.adminFlashCampIdx = -1;
        },
        async adminSaveFlashCampaigns() {
            this.adminSaving = true;
            try {
                await this._adminSave('flashSale.campaigns', JSON.stringify(this.adminFlashCampaigns));
                const now = new Date();
                // Flash Sale banner: hanya campaign aktif DAN showAsFlashSale !== false
                const flashActive = this.adminFlashCampaigns.find(c =>
                    c.aktif && (c.showAsFlashSale !== false) && (!c.endDate || new Date(c.endDate) > now)
                ) || this.adminFlashCampaigns.find(c => c.aktif && (c.showAsFlashSale !== false));
                // All active discount items: semua campaign aktif yang masih dalam periode
                const allDiscountItems = this.adminFlashCampaigns
                    .filter(c => c.aktif && (!c.endDate || new Date(c.endDate) > now))
                    .flatMap(c => c.items || []);
                this.flashSale.campaigns = [...this.adminFlashCampaigns];
                this.flashSale.aktif      = !!flashActive;
                this.flashSale.items      = flashActive ? (flashActive.items || []) : [];
                this.flashSale.deadline   = flashActive ? (flashActive.endDate || '')   : '';
                this.flashSale.startDate  = flashActive ? (flashActive.startDate || '') : '';
                this.flashSale.allDiscountItems = allDiscountItems;
                this._adminShowMsg('Campaign disimpan ✓');
            } catch { this._adminShowMsg('Gagal menyimpan'); }
            this.adminSaving = false;
        },

        // ── Admin: Flash Sale ─────────────────────────
        async adminSaveFlash() {
            const f = this.adminEditFlash;
            if(!f.startDate || !f.deadline) { this._adminShowMsg('⚠ Isi tanggal mulai & berakhir campaign'); return; }
            if(this.adminFlashItems.length === 0) { this._adminShowMsg('⚠ Tambah minimal 1 produk'); return; }
            this.adminSaving=true;
            try {
                const items = this.adminFlashItems;
                const first = items[0] || {};
                await Promise.all([
                    this._adminSave('flashSale.aktif',     String(f.aktif)),
                    this._adminSave('flashSale.items',     JSON.stringify(items)),
                    this._adminSave('flashSale.deadline',  f.deadline),
                    this._adminSave('flashSale.startDate', f.startDate),
                    this._adminSave('flashSale.produk',    first.produk||''),
                    this._adminSave('flashSale.varian',    first.varian||''),
                    this._adminSave('flashSale.harga',     String(first.harga||0)),
                    this._adminSave('flashSale.hargaAsli', String(first.hargaAsli||0)),
                    this._adminSave('flashSale.diskon',    String(first.diskon||0)),
                ]);
                this.flashSale = { ...this.flashSale, aktif: f.aktif, items,
                    deadline: f.deadline, startDate: f.startDate,
                    produk: first.produk||'', varian: first.varian||'',
                    harga: Number(first.harga)||0, hargaAsli: Number(first.hargaAsli)||0, diskon: Number(first.diskon)||0 };
                this._adminShowMsg('Flash Sale disimpan ✓');
            } catch { this._adminShowMsg('Gagal menyimpan'); }
            this.adminSaving=false;
        },

        // ── Admin: Hero ───────────────────────────────
        async adminSaveHero() {
            this.adminSaving=true;
            try {
                const h = this.adminEditHero;
                await Promise.all([
                    this._adminSave('hero.tagline1', h.tagline1||''),
                    this._adminSave('hero.tagline2', h.tagline2||''),
                    this._adminSave('hero.subtext',  h.subtext||''),
                    this._adminSave('hero.btn1',     h.btn1||''),
                    this._adminSave('hero.btn2',     h.btn2||''),
                ]);
                this.siteSettings.hero = { ...h };
                this._adminShowMsg('Hero disimpan ✓');
            } catch { this._adminShowMsg('Gagal menyimpan'); }
            this.adminSaving=false;
        },

        // ── Admin: Categories ─────────────────────────
        adminAddCat() {
            this.adminEditCats.push({ name:'', desc:'', iconKey:'other' });
        },
        async adminSaveCats() {
            this.adminSaving=true;
            try {
                await this._adminSave('categories.extra', JSON.stringify(this.adminEditCats));
                this.siteSettings.extraCategories = [...this.adminEditCats];
                this._adminShowMsg('Kategori tambahan disimpan ✓');
            } catch { this._adminShowMsg('Gagal menyimpan'); }
            this.adminSaving=false;
        },

        // ── Admin: Products ───────────────────────────
        async adminLoadProducts() {
            this.adminProductsLoading=true;
            try {
                const data = await this.gasPost({ action:'getCatalogAdmin', adminEmail:this.currentUser.email, adminToken:this.currentUser.sessionToken });
                this.adminProducts = data.success ? data.data : [];
            } catch { this.adminProducts=[]; }
            this.adminProductsLoading=false;
        },
        adminStartEditProduct(p) {
            // Update semua state langsung (synchronous) agar reactive binding tidak rusak
            this.adminEditProduct = { ...p, _uid: p.rowIndex }; // spread + uid agar referensi selalu baru
            this.adminAddMode     = false;
            this.adminNewProduct  = { nama:p.nama, varian:p.varian, masaAktif:p.masaAktif, harga:p.harga, linkProduk:p.linkProduk, aktif:p.aktif, stok:(p.stok===null||p.stok===undefined)?'':p.stok, iconUrl:p.iconUrl||'', kategori:p.category||'' };
            this.adminBenefitCat  = p.category || this.getCategory(p.nama);
            this.adminBenefitItems = Array.isArray(p.benefits) ? [...p.benefits] : [];
            this.adminBenefitNewItem = '';
            // Scroll ke form (hanya setelah render selesai)
            this.$nextTick(() => {
                document.getElementById('adminProdukForm')?.scrollIntoView({ behavior:'smooth', block:'start' });
            });
        },
        async adminSaveProduct() {
            if(!this.adminNewProduct.nama||!this.adminNewProduct.varian) {
                this._adminShowMsg('Nama dan varian wajib diisi'); return;
            }
            this.adminSaving=true;
            try {
                const action = this.adminEditProduct ? 'updateProduct' : 'addProduct';
                const payload = {
                    action, adminEmail:this.currentUser.email, adminToken:this.currentUser.sessionToken,
                    nama:      this.adminNewProduct.nama,
                    varian:    this.adminNewProduct.varian,
                    masaAktif: this.adminNewProduct.masaAktif,
                    harga:     this.adminNewProduct.harga,
                    linkProduk:this.adminNewProduct.linkProduk,
                    aktif:     String(this.adminNewProduct.aktif),
                    stok:      this.adminNewProduct.stok===''?'':Number(this.adminNewProduct.stok),
                    iconUrl:   this.adminNewProduct.iconUrl||'',
                    kategori:  this.adminNewProduct.kategori||'',
                    benefits:  JSON.stringify(this.adminBenefitItems),
                };
                if(this.adminEditProduct) payload.rowIndex = this.adminEditProduct.rowIndex;
                const data = await this.gasPost(payload);
                if(data.success) {
                    // Update local state benefits untuk produk yang diedit
                    if(this.adminEditProduct) {
                        const saved = [...this.adminBenefitItems];
                        const idx = this.products.findIndex(p => p.rowIndex == this.adminEditProduct.rowIndex);
                        if(idx >= 0) {
                            this.products[idx] = { ...this.products[idx], benefits: saved };
                            this.products = [...this.products];
                        }
                    }
                    this._adminShowMsg(this.adminEditProduct ? 'Produk & deskripsi diupdate ✓' : 'Produk ditambahkan ✓');
                    this.adminEditProduct=null; this.adminAddMode=false;
                    await this.adminLoadProducts();
                    await this.fetchProducts();
                } else { this._adminShowMsg(data.error||'Gagal menyimpan'); }
            } catch { this._adminShowMsg('Gagal terhubung'); }
            this.adminSaving=false;
        },
        async adminToggleAktif(p) {
            const newAktif = !p.aktif;
            p.aktif = newAktif;
            try {
                const data = await this.gasPost({ action:'updateProductAktif', adminEmail:this.currentUser.email, adminToken:this.currentUser.sessionToken, rowIndex:p.rowIndex, aktif:String(newAktif) });
                if (!data.success) { p.aktif = !newAktif; this._adminShowMsg(data.error||'Gagal update'); }
                else { this._adminShowMsg(newAktif ? 'Produk diaktifkan ✓' : 'Produk dinonaktifkan ✓'); await this.fetchProducts(); }
            } catch { p.aktif = !newAktif; this._adminShowMsg('Gagal terhubung'); }
        },
        async adminUpdateStock(p, val) {
            const stok = val===''?'':Number(val);
            try {
                await this.gasPost({ action:'updateProductStock', adminEmail:this.currentUser.email, adminToken:this.currentUser.sessionToken, rowIndex:p.rowIndex, stok });
                p.stok = val===''?null:Number(val);
                this._adminShowMsg('Stok diperbarui ✓');
                await this.fetchProducts();
            } catch { this._adminShowMsg('Gagal update stok'); }
        },
        async adminDeleteProduct(p) {
            if(!confirm(`Hapus produk "${p.nama} — ${p.varian}"?`)) return;
            try {
                const data = await this.gasPost({ action:'deleteProduct', adminEmail:this.currentUser.email, adminToken:this.currentUser.sessionToken, rowIndex:p.rowIndex });
                if(data.success) { this._adminShowMsg('Produk dihapus ✓'); await this.adminLoadProducts(); await this.fetchProducts(); }
                else { this._adminShowMsg(data.error||'Gagal hapus'); }
            } catch { this._adminShowMsg('Gagal terhubung'); }
        },

        // ── Admin: Guides ─────────────────────────────
        async adminLoadGuides() {
            this.adminGuidesLoading=true;
            try {
                const res  = await fetch(`${this.GAS_URL}?action=getGuides`);
                const data = await res.json();
                if(data.success) this.adminGuides = data.data;
            } catch {}
            this.adminGuidesLoading=false;
        },
        adminStartEditGuide(gi) {
            this.adminEditGuideIdx = gi;
            this.adminAddGuideMode = false;
            const g = this.adminGuides[this.adminGuideTab][gi];
            this.adminNewGuide = { title:g.title, steps:[...g.steps], note:g.note||'' };
        },
        async adminSaveGuide() {
            if(!this.adminNewGuide.title.trim()) { this._adminShowMsg('Judul wajib diisi'); return; }
            this.adminSaving=true;
            try {
                const tabGuides = [...(this.adminGuides[this.adminGuideTab]||[])];
                const entry = { title:this.adminNewGuide.title, steps:this.adminNewGuide.steps.filter(s=>s.trim()), note:this.adminNewGuide.note };
                if(this.adminEditGuideIdx>=0) tabGuides[this.adminEditGuideIdx]=entry;
                else tabGuides.push(entry);
                const data = await this.gasPost({ action:'saveGuides', adminEmail:this.currentUser.email, adminToken:this.currentUser.sessionToken, tab:this.adminGuideTab, guidesJson:JSON.stringify(tabGuides) });
                if(data.success) {
                    this.adminGuides[this.adminGuideTab] = tabGuides;
                    this.guides[this.adminGuideTab] = tabGuides.map(g=>({...g,open:false}));
                    this.adminAddGuideMode=false; this.adminEditGuideIdx=-1;
                    this._adminShowMsg('Panduan disimpan ✓');
                } else { this._adminShowMsg(data.error||'Gagal'); }
            } catch { this._adminShowMsg('Gagal terhubung'); }
            this.adminSaving=false;
        },
        async adminDeleteGuide(gi) {
            const g = this.adminGuides[this.adminGuideTab][gi];
            if(!confirm(`Hapus panduan "${g.title}"?`)) return;
            try {
                const tabGuides = [...this.adminGuides[this.adminGuideTab]];
                tabGuides.splice(gi,1);
                const data = await this.gasPost({ action:'saveGuides', adminEmail:this.currentUser.email, adminToken:this.currentUser.sessionToken, tab:this.adminGuideTab, guidesJson:JSON.stringify(tabGuides) });
                if(data.success) {
                    this.adminGuides[this.adminGuideTab]=tabGuides;
                    this.guides[this.adminGuideTab]=tabGuides.map(g=>({...g,open:false}));
                    this._adminShowMsg('Panduan dihapus ✓');
                }
            } catch {}
        },

        // ── Admin: Produk Populer ─────────────────────
        adminFeaturedFilter() {
            const q = this.adminFeaturedSearch.toLowerCase().trim();
            if(!q) { this.adminFeaturedResults = []; return; }
            const source = this.adminProducts.length
                ? this.adminProducts.filter(p => p.aktif)
                : this.products;
            this.adminFeaturedResults = source.filter(p =>
                (p.nama.toLowerCase().includes(q) || (p.varian||'').toLowerCase().includes(q) || (p.masaAktif||'').toLowerCase().includes(q)) &&
                !this.adminFeaturedItems.some(f => f.nama===p.nama && f.varian===p.varian && (f.masaAktif||'-')===(p.masaAktif||'-'))
            ).slice(0, 8);
        },
        adminFeaturedAdd(p) {
            if(this.adminFeaturedItems.length >= 10) { this._adminShowMsg('Maksimal 10 produk'); return; }
            if(this.adminFeaturedItems.some(f => f.nama===p.nama && f.varian===p.varian && (f.masaAktif||'-')===(p.masaAktif||'-'))) return;
            this.adminFeaturedItems.push(p);
            this.adminFeaturedSearch = ''; this.adminFeaturedResults = [];
        },
        adminFeaturedRemove(i) { this.adminFeaturedItems.splice(i,1); },
        adminFeaturedMoveUp(i) {
            if(i===0) return;
            [this.adminFeaturedItems[i-1], this.adminFeaturedItems[i]] = [this.adminFeaturedItems[i], this.adminFeaturedItems[i-1]];
            this.adminFeaturedItems = [...this.adminFeaturedItems];
        },
        adminFeaturedMoveDown(i) {
            if(i>=this.adminFeaturedItems.length-1) return;
            [this.adminFeaturedItems[i], this.adminFeaturedItems[i+1]] = [this.adminFeaturedItems[i+1], this.adminFeaturedItems[i]];
            this.adminFeaturedItems = [...this.adminFeaturedItems];
        },
        async adminSaveFeatured() {
            this.adminSaving = true;
            try {
                const payload = this.adminFeaturedItems.map(p => ({ nama:p.nama, varian:p.varian, masaAktif:p.masaAktif||'-' }));
                const res = await this._adminSave('featured.items', JSON.stringify(payload));
                if(res.success) {
                    this.siteSettings.featured = payload;
                    this._adminShowMsg('Produk Populer disimpan ✓');
                } else { this._adminShowMsg(res.error||'Gagal'); }
            } catch { this._adminShowMsg('Gagal terhubung'); }
            this.adminSaving = false;
        },

        // ── Admin: Benefits ───────────────────────────
        adminBenefitAdd() {
            const v = this.adminBenefitNewItem.trim();
            if(!v) return;
            this.adminBenefitItems.push(v);
            this.adminBenefitNewItem = '';
        },
        adminBenefitRemove(i) {
            this.adminBenefitItems.splice(i, 1);
        },
        adminBenefitMoveUp(i) {
            if(i===0) return;
            [this.adminBenefitItems[i-1], this.adminBenefitItems[i]] = [this.adminBenefitItems[i], this.adminBenefitItems[i-1]];
            this.adminBenefitItems = [...this.adminBenefitItems];
        },
        adminBenefitMoveDown(i) {
            if(i>=this.adminBenefitItems.length-1) return;
            [this.adminBenefitItems[i], this.adminBenefitItems[i+1]] = [this.adminBenefitItems[i+1], this.adminBenefitItems[i]];
            this.adminBenefitItems = [...this.adminBenefitItems];
        },
        async adminSaveBenefits() {
            const rowIndex = this.adminEditProduct?.rowIndex;
            if(!rowIndex) { this._adminShowMsg('Pilih produk terlebih dahulu'); return; }
            this.adminSaving = true;
            try {
                const data = await this.gasPost({
                    action:      'saveProductBenefits',
                    adminEmail:  this.currentUser.email,
                    adminToken:  this.currentUser.sessionToken,
                    rowIndex,
                    benefits:    JSON.stringify(this.adminBenefitItems),
                });
                if(data.success) {
                    const saved = [...this.adminBenefitItems];
                    const idx = this.products.findIndex(p => p.rowIndex == rowIndex);
                    if(idx >= 0) {
                        this.products[idx] = { ...this.products[idx], benefits: saved };
                        this.products = [...this.products];
                    }
                    this._adminShowMsg('Deskripsi disimpan ✓');
                } else {
                    this._adminShowMsg('❌ ' + (data.error||'Gagal'));
                }
            } catch(err) {
                this._adminShowMsg('Gagal terhubung: ' + err.message);
            } finally {
                this.adminSaving = false;
            }
        },

        // ── Admin: Footer ─────────────────────────────
        async adminSaveFooter() {
            this.adminSaving=true;
            try {
                const f = this.adminEditFooter;
                await Promise.all([
                    this._adminSave('footer.desc',      f.desc||''),
                    this._adminSave('footer.email',     f.email||''),
                    this._adminSave('footer.phone',     f.phone||''),
                    this._adminSave('footer.jam',       f.jam||''),
                    this._adminSave('footer.copyright', f.copyright||''),
                ]);
                this.siteSettings.footer = { ...f };
                this._adminShowMsg('Footer disimpan ✓');
            } catch { this._adminShowMsg('Gagal menyimpan'); }
            this.adminSaving=false;
        },

        // ── Admin: Orders ─────────────────────────────
        async adminLoadOrders() {
            this.adminOrdersLoading=true;
            try {
                const data = await this.gasPost({ action:'getAllOrders', adminEmail:this.currentUser.email, adminToken:this.currentUser.sessionToken });
                this.adminOrders = data.success ? data.data : [];
                this.adminOrdersLoaded = true;
            } catch { this.adminOrders=[]; }
            this.adminOrdersLoading=false;
        },
        async adminUpdateOrderStatus(order, newStatus, silent=false) {
            if(!newStatus) return;
            try {
                const data = await this.gasPost({ action:'updateOrderStatus', adminEmail:this.currentUser.email, adminToken:this.currentUser.sessionToken, rowIndex:order.rowIndex, status:newStatus });
                if(data.success) {
                    order.status = newStatus;
                    if(!silent) this._adminShowMsg(`Status ${order.orderId} → ${newStatus} ✓`);
                }
            } catch {}
        },
        async adminUpdateGroupStatus(group, newStatus) {
            if(!newStatus) return;
            await Promise.all(group.items.map(item => this.adminUpdateOrderStatus(item, newStatus, true)));
            group.status = newStatus;
            group.items.forEach(i => i.status = newStatus);
            this._adminShowMsg(`${group.orderId} (${group.items.length} item) → ${newStatus} ✓`);
        },

        // ── getCategoryIconSVG (icon preset) ──────────
        getCategoryIconSVG(key) {
            const icons = {
                office365: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
                adobe:     `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>`,
                windows:   `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
                office:    `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>`,
                google:    `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/></svg>`,
                coreldraw: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
                project:   `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>`,
                visio:     `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>`,
                other:     `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>`,
            };
            return icons[key] || icons['other'];
        },
        // ── Order date helpers ─────────────────────────────
        parseTanggalWIB(str) {
            // "dd/MM/yyyy HH:mm" (WIB = UTC+7) → Date
            if (!str) return null;
            const [datePart, timePart] = String(str).trim().split(' ');
            const [d, m, y] = (datePart||'').split('/');
            const [h, min]  = (timePart||'00:00').split(':');
            if (!y) return null;
            return new Date(Date.UTC(+y, +m - 1, +d, +h - 7, +min || 0));
        },
        orderMsLeft(order) {
            const created = this.parseTanggalWIB(order?.tanggal);
            if (!created) return 0;
            return Math.max(0, created.getTime() + 24 * 3600 * 1000 - Date.now());
        },
        orderTimeLeftStr(order) {
            const ms = order?.msecLeft ?? this.orderMsLeft(order);
            if (ms <= 0) return null;
            const h = Math.floor(ms / 3600000);
            const m = Math.floor((ms % 3600000) / 60000);
            return h + 'j ' + m + 'm';
        },

        // ── Open order detail (auto-sync jika Pending atau Dibatalkan) ──
        openOrderDetail(order) {
            this.orderDetailModal = order;
            this.orderDetailSyncing = false;
            // Auto-sync: Pending dalam 24 jam, atau Dibatalkan (mungkin korban auto-cancel bug)
            if (order.status === 'Pending' || order.status === 'Dibatalkan') {
                this.checkOrderPaymentStatus(order, true);
            }
        },

        // ── Cek status ke iPaymu & update UI jika sudah dibayar ──
        async checkOrderPaymentStatus(order, silent = false) {
            if (!this.currentUser || !order) return;
            this.orderDetailSyncing = true;
            try {
                const data = await this.gasPost({
                    action: 'checkIPaymuOrderStatus',
                    orderId: order.orderId,
                    email: this.currentUser.email,
                    sessionToken: this.currentUser.sessionToken
                });
                if (data.success && data.paid) {
                    const updated = { ...order, status: data.orderStatus || 'Diproses', paymentMethod: data.paymentMethod || '', paymentStatus: data.paymentStatus || 'Berhasil' };
                    const idx = this.orders.findIndex(o => o.orderId === order.orderId);
                    if (idx >= 0) this.orders[idx] = updated;
                    if (this.orderDetailModal?.orderId === order.orderId) this.orderDetailModal = updated;
                } else if (!silent && data.error) {
                    console.warn('[checkOrderPaymentStatus]', data.error);
                }
            } catch(e) { console.error('[checkOrderPaymentStatus]', e); }
            this.orderDetailSyncing = false;
        },

        // ── Lanjutkan pembayaran Pending ──
        async continuePendingPayment(order) {
            if (!this.currentUser || !order) return;
            this.orderDetailSyncing = true;
            try {
                // Cek dulu apakah sudah dibayar
                const statusData = await this.gasPost({
                    action: 'checkIPaymuOrderStatus',
                    orderId: order.orderId,
                    email: this.currentUser.email,
                    sessionToken: this.currentUser.sessionToken
                });
                if (statusData.success && statusData.paid) {
                    const updated = { ...order, status: statusData.orderStatus || 'Diproses', paymentMethod: statusData.paymentMethod || '', paymentStatus: 'Berhasil' };
                    const idx = this.orders.findIndex(o => o.orderId === order.orderId);
                    if (idx >= 0) this.orders[idx] = updated;
                    this.orderDetailModal = updated;
                    this.orderDetailSyncing = false;
                    return;
                }
                // Buat invoice Xendit baru
                const data = await this.gasPost({
                    action:     'createXenditInvoice',
                    orderId:    order.orderId,
                    items:      order.items.map(i => ({ produk: i.produk, varian: i.varian || '-', masaAktif: i.masaAktif || '-', harga: i.harga, qty: 1 })),
                    buyerName:  this.currentUser.nama || '',
                    buyerEmail: this.currentUser.email || '',
                    buyerPhone: this.currentUser.wa || '',
                    total:      order.total
                });
                if (data.success && data.paymentUrl) {
                    this.orderDetailModal = null;
                    this.openPaymentIframe(order.orderId, data.paymentUrl);
                } else {
                    alert(data.error || 'Gagal membuat sesi pembayaran. Coba lagi atau hubungi CS.');
                }
            } catch(e) { alert('Gagal terhubung ke server'); }
            this.orderDetailSyncing = false;
        },

        async loadOrders() {
            if(!this.currentUser || this.ordersLoading) return;
            this.ordersLoading=true;
            this.ordersLoaded=true;
            this.ordersCurrentPage=1;
            try {
                const data = await this.gasPost({ action:'getOrders', email:this.currentUser.email, sessionToken:this.currentUser.sessionToken });
                if(!data.success) console.warn('[loadOrders] error dari GAS:', data.error);
                this.orders = data.data || [];
                // Auto-open order detail jika kembali dari payment redirect
                if (this.pendingOrderDetailId) {
                    const targetId = this.pendingOrderDetailId;
                    this.pendingOrderDetailId = null;
                    const order = this.orders.find(o => o.orderId === targetId);
                    if (order) this.$nextTick(() => this.openOrderDetail(order));
                }
            } catch(err) { console.error('[loadOrders] exception:', err); this.orders=[]; }
            finally { this.ordersLoading=false; }
        },
        async loadProfile() {
            if(!this.currentUser) return;
            try {
                const data = await this.gasPost({ action:'getProfile', email:this.currentUser.email, sessionToken:this.currentUser.sessionToken });
                if(data.success) this.profileExtra = data.profile || {};
            } catch {}
        },
        openEditMode() {
            this.editForm = {
                nama:         this.profileExtra.nama  || this.currentUser?.nama || '',
                wa:           this.currentUser?.wa || '',
                tanggalLahir: this.profileExtra.tanggalLahir || '',
                jenisKelamin: this.profileExtra.jenisKelamin || '',
                alamat:       this.profileExtra.alamat || '',
                provinsi:     this.profileExtra.provinsi || '',
            };
            this.editError = '';
            this.editMode  = true;
        },
        async saveProfile() {
            if(!this.editForm.nama.trim()){ this.editError='Nama tidak boleh kosong'; return; }
            this.editLoading=true; this.editError='';
            try {
                const data = await this.gasPost({
                    action:       'updateProfile',
                    email:        this.currentUser.email,
                    sessionToken: this.currentUser.sessionToken,
                    nama:         this.editForm.nama.trim(),
                    wa:           this.editForm.wa || '',
                    tanggalLahir: this.editForm.tanggalLahir,
                    jenisKelamin: this.editForm.jenisKelamin,
                    alamat:       this.editForm.alamat,
                    provinsi:     this.editForm.provinsi,
                });
                if(data.success) {
                    this.currentUser = data.user;
                    localStorage.setItem('serabutUser', JSON.stringify(data.user));
                    this.profileExtra = { ...this.profileExtra, ...this.editForm };
                    this.editMode = false;
                } else { this.editError = data.error||'Gagal menyimpan'; }
            } catch { this.editError='Gagal terhubung ke server'; }
            this.editLoading=false;
        },
        async submitResetPw() {
            const {oldPassword,newPassword,konfirmasi} = this.resetPwForm;
            if(!oldPassword||!newPassword||!konfirmasi){ this.resetPwError='Semua field harus diisi'; return; }
            if(newPassword.length<6){ this.resetPwError='Password baru minimal 6 karakter'; return; }
            if(newPassword!==konfirmasi){ this.resetPwError='Konfirmasi password tidak cocok'; return; }
            this.resetPwLoading=true; this.resetPwError='';
            try {
                const email = this.currentUser.email.toLowerCase().trim();
                const oldHash = await sha256(email + ':' + oldPassword);
                const newHash = await sha256(email + ':' + newPassword);
                const oldHashLegacy = await sha256(oldPassword);
                const data = await this.gasPost({
                    action:           'changePassword',
                    email,
                    sessionToken:     this.currentUser.sessionToken,
                    oldPassword:      oldHash,
                    newPassword:      newHash,
                    oldPasswordLegacy: oldHashLegacy,
                });
                if(data.success) { this.resetPwSuccess=true; }
                else { this.resetPwError = data.error||'Gagal mengubah password'; }
            } catch { this.resetPwError='Gagal terhubung ke server'; }
            this.resetPwLoading=false;
        },

        // ── Forgot Password (via OTP) ──────────────────
        openForgotPw() {
            this.forgotPwModal   = true;
            this.forgotPwStep    = 1;
            this.forgotPwEmail   = this.loginForm?.email || '';
            this.forgotPwOtp     = '';
            this.forgotPwNewPw   = '';
            this.forgotPwConfirm = '';
            this.forgotPwError   = '';
            this.forgotPwSuccess = false;
            this.authModal = false;
            document.body.style.overflow = 'hidden';
        },
        async submitForgotPwEmail() {
            if (!this.forgotPwEmail.trim()) { this.forgotPwError='Email harus diisi'; return; }
            this.forgotPwLoading=true; this.forgotPwError='';
            try {
                const data = await this.gasPost({ action:'forgotPasswordSendOTP', email: this.forgotPwEmail.trim().toLowerCase() });
                if (data.success) {
                    this.forgotPwMaskedEmail = data.maskedEmail || '';
                    this.forgotPwMaskedWa    = data.maskedWa    || '';
                    this.forgotPwHasWa       = !!data.hasWa;
                    this.forgotPwStep = 2;
                } else { this.forgotPwError = data.error||'Gagal mengirim kode OTP'; }
            } catch { this.forgotPwError='Gagal terhubung ke server'; }
            this.forgotPwLoading=false;
        },
        submitForgotPwOtp() {
            if (!this.forgotPwOtp.trim()) { this.forgotPwError='Kode OTP harus diisi'; return; }
            if (this.forgotPwOtp.trim().length < 4) { this.forgotPwError='Kode OTP tidak valid'; return; }
            this.forgotPwError='';
            this.forgotPwStep = 3;
        },
        async submitForgotPwNewPw() {
            if (!this.forgotPwNewPw || !this.forgotPwConfirm) { this.forgotPwError='Semua field harus diisi'; return; }
            if (this.forgotPwNewPw.length < 6) { this.forgotPwError='Password minimal 6 karakter'; return; }
            if (this.forgotPwNewPw !== this.forgotPwConfirm) { this.forgotPwError='Konfirmasi password tidak cocok'; return; }
            this.forgotPwLoading=true; this.forgotPwError='';
            try {
                const email   = this.forgotPwEmail.trim().toLowerCase();
                const newHash = await sha256(email + ':' + this.forgotPwNewPw);
                const data    = await this.gasPost({ action:'forgotPasswordVerify', email, otp: this.forgotPwOtp.trim(), newPassword: newHash });
                if (data.success) { this.forgotPwSuccess=true; }
                else { this.forgotPwError = data.error||'Gagal reset password'; }
            } catch { this.forgotPwError='Gagal terhubung ke server'; }
            this.forgotPwLoading=false;
        },

        async pwaInstall() {
            if (this.pwaPromptEvent) {
                this.pwaPromptEvent.prompt();
                const { outcome } = await this.pwaPromptEvent.userChoice;
                if (outcome === 'accepted') localStorage.setItem('pwa_dismissed', Date.now());
                this.pwaPromptEvent = null;
            }
            this.pwaPopup = false;
        },
        pwaDismiss() {
            localStorage.setItem('pwa_dismissed', Date.now());
            this.pwaPopup = false;
        },

        getStatusIcon(s)    { return {Aktif:'✅',Expired:'⏰',Suspended:'🚫',Pending:'⏳'}[s]||'❓'; },
        getStatusBg(s)      { return {Aktif:'bg-emerald-100',Expired:'bg-orange-100',Suspended:'bg-red-100',Pending:'bg-yellow-100'}[s]||'bg-gray-100'; },
        getStatusBadge(s)   { return {Aktif:'bg-emerald-100 text-emerald-700',Selesai:'bg-blue-100 text-blue-700',Expired:'bg-orange-100 text-orange-700',Suspended:'bg-red-100 text-red-700',Dibatalkan:'bg-red-100 text-red-600',Pending:'bg-yellow-100 text-yellow-700',Diproses:'bg-indigo-100 text-indigo-700'}[s]||'bg-gray-100 text-gray-600'; },
        _orderCardBorder(s) { return {Pending:'border-amber-300',Diproses:'border-indigo-300',Aktif:'border-emerald-300',Selesai:'border-blue-300',Dibatalkan:'border-red-200'}[s]||'border-gray-100'; },
        _orderCardHeader(s) { return {Pending:'bg-amber-50 border-amber-200',Diproses:'bg-indigo-50 border-indigo-200',Aktif:'bg-emerald-50 border-emerald-200',Selesai:'bg-blue-50 border-blue-200',Dibatalkan:'bg-red-50 border-red-100'}[s]||'bg-gray-50 border-gray-100'; },
        _orderCardFooter(s) { return {Pending:'bg-amber-50/50',Diproses:'bg-indigo-50/50',Aktif:'bg-emerald-50/50',Selesai:'bg-blue-50/50',Dibatalkan:'bg-red-50/50'}[s]||'bg-gray-50/50'; },
        _isVal(v) { return v && String(v).trim() !== '' && String(v).trim() !== '-'; },
        _adminOrderHasDetails(item) {
            return this._isVal(item.emailAktif) || this._isVal(item.microsoftEmail) ||
                   this._isVal(item.msNama) || this._isVal(item.username) || this._isVal(item.emailReminder);
        },
        adminFormatDate(str) {
            if (!str) return '';
            // Handle "dd/MM/yyyy HH:mm" (GAS format)
            const m = String(str).match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{2}:\d{2})/);
            if (m) {
                const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
                const d = new Date(+m[3], +m[2]-1, +m[1]);
                return `${days[d.getDay()]}, ${+m[1]} ${['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'][+m[2]-1]} ${m[3]} ${m[4]} WIB`;
            }
            // Handle ISO / JS Date string fallback
            const d = new Date(str);
            if (!isNaN(d)) {
                const days = ['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
                const mons = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
                const pad = n => String(n).padStart(2,'0');
                return `${days[d.getDay()]}, ${d.getDate()} ${mons[d.getMonth()]} ${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())} WIB`;
            }
            return str;
        },
        getStatusMessage(s) { return {Aktif:'Akun kamu aktif dan berjalan normal',Expired:'Masa berlaku habis — segera perpanjang!',Suspended:'Akun dinonaktifkan — hubungi support',Pending:'Akun sedang dalam proses aktivasi'}[s]||'Hubungi support untuk info lebih lanjut'; },
        _parseDateStr(str) {
            if (!str) return null;
            // DD/MM/YYYY
            const slash = String(str).split('/');
            if (slash.length === 3) return new Date(Number(slash[2]), Number(slash[1])-1, Number(slash[0]));
            // ISO 8601: "2026-04-08T17:00:00.000Z" atau "2026-04-08"
            const iso = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (iso) return new Date(Number(iso[1]), Number(iso[2])-1, Number(iso[3]));
            return null;
        },
        computeSubscriptionStatus(masaBerlaku) {
            const endDate = this._parseDateStr(masaBerlaku);
            if (!endDate) return 'Active';
            const today = new Date(); today.setHours(0,0,0,0);
            return endDate >= today ? 'Active' : 'Sudah Dihapus';
        },
        getDaysUntilExpiry(masaBerlaku) {
            const endDate = this._parseDateStr(masaBerlaku);
            if (!endDate) return Infinity;
            const today = new Date(); today.setHours(0,0,0,0);
            return Math.floor((endDate - today) / 86400000);
        },
        formatMasaBerlaku(str) {
            if (!str) return '—';
            const bulan = ['','Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
            // DD/MM/YYYY
            const slash = String(str).split('/');
            if (slash.length === 3) {
                const d = parseInt(slash[0]), m = parseInt(slash[1]), y = parseInt(slash[2]);
                return `${d} ${bulan[m]||''} ${y}`;
            }
            // ISO 8601
            const iso = String(str).match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (iso) return `${parseInt(iso[3])} ${bulan[parseInt(iso[2])]||''} ${iso[1]}`;
            return str;
        },
        statusSuggestRebuy(account) {
            const durasiNum = parseInt(account.durasi) || 0;
            const daysLeft  = this.getDaysUntilExpiry(account.masaBerlaku);
            const durationMatch = (p) => {
                if (!durasiNum) return true;
                const ma = (p.masaAktif || p.nama || '').toLowerCase();
                if (durasiNum >= 12) return ma.includes('year') || ma.includes('tahun') || ma.includes('12');
                return ma.includes(String(durasiNum));
            };
            let matchedProduct = null;
            if (account.productType === 'adobe') {
                const nameParts = (account.productName || '').toLowerCase().split(/\s+/).filter(Boolean);
                matchedProduct = this.products.find(p => {
                    const pn = p.nama.toLowerCase();
                    if (!pn.includes('adobe')) return false;
                    if (nameParts.length && !nameParts.every(w => pn.includes(w))) return false;
                    return durationMatch(p);
                }) || this.products.find(p => p.nama.toLowerCase().includes('adobe') && durationMatch(p));
            } else {
                const isFamily  = account.productType === 'office365family';
                const isRenewal = !isFamily && daysLeft >= 0 && daysLeft <= 7;
                const tipe      = (account.tipe || '').toLowerCase();
                matchedProduct = this.products.find(p => {
                    const pn = p.nama.toLowerCase();
                    if (!pn.includes('365') && !pn.includes('office') && !pn.includes('microsoft')) return false;
                    if (isFamily  && !pn.includes('family'))   return false;
                    if (!isFamily &&  pn.includes('family'))   return false;
                    if (isRenewal && !pn.includes('renewal'))  return false;
                    if (!isRenewal && pn.includes('renewal'))  return false;
                    if (tipe === 'web' && !pn.includes('web')) return false;
                    return durationMatch(p);
                }) || this.products.find(p => {
                    const pn = p.nama.toLowerCase();
                    if (!pn.includes('365') && !pn.includes('office') && !pn.includes('microsoft')) return false;
                    if (isFamily && !pn.includes('family'))  return false;
                    if (!isFamily && pn.includes('family'))  return false;
                    if (isRenewal && !pn.includes('renewal')) return false;
                    if (!isRenewal && pn.includes('renewal')) return false;
                    return true;
                });
            }
            if (matchedProduct) { this.goToProductDetail(matchedProduct); return; }
            const keyword = account.productType === 'adobe'
                ? (account.productName || 'Adobe Creative Cloud')
                : account.productType === 'office365family'
                ? 'Office 365 Family'
                : (daysLeft >= 0 && daysLeft <= 7 ? 'Renewal' : 'Office 365');
            this.searchQuery = keyword;
            this.setPage('catalog');
        },
    };
}
