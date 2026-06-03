const SITE = 'https://serabut.id';
const GAS_URL = 'https://script.google.com/macros/s/AKfycbwt6SJi1nXOKc5I0CMWaTIfxtaBDoi3e4RyOPn7Znea-VUbABvg__4KA5n-QYfP308n9w/exec';

const BOT_PATTERNS = [
  'facebookexternalhit','Facebot','WhatsApp','Twitterbot','LinkedInBot',
  'TelegramBot','Slackbot','Slack-ImgProxy','Discordbot','Googlebot',
  'Google-InspectionTool','bingbot','Applebot','redditbot','Pinterest',
];

// Keys = category lowercase dari GAS (sesuai hasil getCatalog)
const CAT_IMAGE = {
  'microsoft 365': `${SITE}/assets/og-products/og-microsoft-365.jpg`,
  'office':        `${SITE}/assets/og-products/og-office.jpg`,
  'windows':       `${SITE}/assets/og-products/og-windows.jpg`,
  'windows server':`${SITE}/assets/og-products/og-windows-server.jpg`,
  'adobe':         `${SITE}/assets/og-products/og-adobe.jpg`,
  'google':        `${SITE}/assets/og-products/og-google.jpg`,
  'coreldraw':     `${SITE}/assets/og-products/og-coreldraw.jpg`,
  'project':       `${SITE}/assets/og-products/og-project.jpg`,
  'visio':         `${SITE}/assets/og-products/og-visio.jpg`,
};
const DEFAULT_IMAGE = `${SITE}/assets/og-products/og-default.jpg`;

function isBot(ua='') {
  const low = ua.toLowerCase();
  return BOT_PATTERNS.some(b => low.includes(b.toLowerCase()));
}

function slugToDisplay(slug) {
  return slug.replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase());
}

async function fetchProduct(slug) {
  try {
    const res = await fetch(`${GAS_URL}?action=getCatalog`, {
      cf: { cacheTtl: 600, cacheEverything: true },
    });
    const json = await res.json();
    // FIX: GAS returns 'data', not 'products'
    const products = json.data || json.products || [];
    return products.find(p => {
      const s = (p.nama || '').toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g,'')
        .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      return s === slug;
    }) || null;
  } catch { return null; }
}

function buildHTML(title, desc, image, url, price, category) {
  const e = s => (s||'').replace(/"/g,'&quot;').replace(/</g,'&lt;');
  return `<!DOCTYPE html><html lang="id"><head>
<meta charset="UTF-8"><title>${e(title)}</title>
<meta property="og:type" content="product">
<meta property="og:site_name" content="Serabut Store">
<meta property="og:url" content="${e(url)}">
<meta property="og:title" content="${e(title)}">
<meta property="og:description" content="${e(desc)}">
<meta property="og:image" content="${e(image)}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:locale" content="id_ID">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${e(title)}">
<meta name="twitter:description" content="${e(desc)}">
<meta name="twitter:image" content="${e(image)}">
${price?`<meta property="product:price:amount" content="${price}"><meta property="product:price:currency" content="IDR">`:''}
<meta http-equiv="refresh" content="0;url=${e(url)}">
</head><body><script>window.location.replace('${url}');</script></body></html>`;
}

export default {
  async fetch(request) {
    const url  = new URL(request.url);
    const ua   = request.headers.get('User-Agent') || '';
    const path = url.pathname;

    if (!path.startsWith('/produk/') || !isBot(ua)) return fetch(request);

    const slug    = path.replace('/produk/','').replace(/\/$/,'');
    const product = await fetchProduct(slug);

    let title, desc, image, price;

    if (product) {
      const name  = product.nama || slugToDisplay(slug);
      // FIX: lowercase the category to match CAT_IMAGE keys
      const cat   = (product.category || '').toLowerCase().trim();
      const harga = product.harga;
      const priceStr = harga ? 'Rp ' + parseInt(harga).toLocaleString('id-ID') : null;

      title  = `${name} — Serabut Store`;
      desc   = `Beli ${name} original${priceStr ? ` mulai ${priceStr}` : ''}. Garansi resmi, aktivasi 5–30 menit. Terpercaya 10K+ pelanggan.`;
      image  = CAT_IMAGE[cat] || DEFAULT_IMAGE;
      price  = harga;
    } else {
      const name = slugToDisplay(slug);
      title  = `${name} — Serabut Store`;
      desc   = `Beli ${name} original dengan harga terjangkau di Serabut Store. Garansi resmi, aktivasi cepat.`;
      image  = DEFAULT_IMAGE;
    }

    return new Response(
      buildHTML(title, desc, image, `${SITE}${path}`, price, product?.category),
      {
        status: 200,
        headers: {
          'Content-Type':  'text/html;charset=UTF-8',
          'Cache-Control': 'public, max-age=3600',
          'X-OG-Matched':  product ? 'yes' : 'no',
          'X-OG-Category': product?.category || 'none',
          'X-OG-Image':    image,
        },
      }
    );
  },
};
