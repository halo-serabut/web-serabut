/**
 * Serabut Store — OG Dynamic Meta Worker
 * Intercepts bot requests to /produk/* and injects product-specific OG tags
 */

const GAS_URL = 'https://script.google.com/macros/s/AKfycbwt6SJi1nXOKc5I0CMWaTIfxtaBDoi3e4RyOPn7Znea-VUbABvg__4KA5n-QYfP308n9w/exec';
const SITE    = 'https://serabut.id';
const DEFAULT_OG_IMAGE = `${SITE}/og-image.jpg`;

// Social media bots that read OG tags
const BOT_PATTERNS = [
  'facebookexternalhit', 'Facebot',
  'WhatsApp',
  'Twitterbot',
  'LinkedInBot',
  'TelegramBot',
  'Slackbot', 'Slack-ImgProxy',
  'Discordbot',
  'Googlebot', 'Google-InspectionTool',
  'bingbot',
  'Applebot',
  'redditbot',
  'Pinterest',
  'vkShare', 'W3C_Validator',
];

// Category → logo icon URL (same as app)
const CATEGORY_LOGO = {
  'microsoft 365': 'https://static2.sharepointonline.com/files/fabric/assets/brand-icons/product/png/office365_48x1.png',
  'office':        'https://static2.sharepointonline.com/files/fabric/assets/brand-icons/product/png/office365_48x1.png',
  'windows':       'https://serabut.id/og-image.jpg',
  'adobe':         'https://serabut.id/og-image.jpg',
  'google':        'https://serabut.id/og-image.jpg',
  'coreldraw':     'https://serabut.id/og-image.jpg',
  'project':       'https://serabut.id/og-image.jpg',
  'visio':         'https://serabut.id/og-image.jpg',
};

function isBot(ua = '') {
  const lower = ua.toLowerCase();
  return BOT_PATTERNS.some(b => lower.includes(b.toLowerCase()));
}

function slugToDisplay(slug) {
  return slug.replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .replace(/\b(365|2019|2021|2024|11|10)\b/g, m => m);
}

async function fetchProductData(slug) {
  try {
    const res = await fetch(`${GAS_URL}?action=getCatalog`, {
      cf: { cacheTtl: 300, cacheEverything: true },
    });
    const json = await res.json();
    const products = json.products || [];

    // Match by slug
    const matched = products.find(p => {
      const pSlug = (p.nama || '')
        .toLowerCase()
        .normalize('NFD').replace(/[̀-ͯ]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      return pSlug === slug;
    });
    return matched || null;
  } catch (e) {
    return null;
  }
}

function buildOGHtml({ title, description, image, url, productName, price, category }) {
  const esc = s => (s || '').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <title>${esc(title)}</title>

  <!-- Open Graph -->
  <meta property="og:type"        content="product">
  <meta property="og:site_name"   content="Serabut Store">
  <meta property="og:url"         content="${esc(url)}">
  <meta property="og:title"       content="${esc(title)}">
  <meta property="og:description" content="${esc(description)}">
  <meta property="og:image"       content="${esc(image)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height"content="630">
  <meta property="og:image:type"  content="image/jpeg">
  <meta property="og:locale"      content="id_ID">

  <!-- Twitter -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="${esc(title)}">
  <meta name="twitter:description" content="${esc(description)}">
  <meta name="twitter:image"       content="${esc(image)}">

  <!-- Product meta (optional structured data) -->
  ${price ? `<meta property="product:price:amount"   content="${price}">
  <meta property="product:price:currency" content="IDR">` : ''}

  <!-- Redirect real users to SPA -->
  <meta http-equiv="refresh" content="0;url=${esc(url)}">
</head>
<body>
  <p>Mengalihkan ke <a href="${esc(url)}">${esc(productName)}</a>...</p>
  <script>window.location.replace('${url}');</script>
</body>
</html>`;
}

export default {
  async fetch(request) {
    const url  = new URL(request.url);
    const ua   = request.headers.get('User-Agent') || '';
    const path = url.pathname;

    // Only handle /produk/* paths + only for bots
    // (real users go straight through to GitHub Pages)
    if (!path.startsWith('/produk/') || !isBot(ua)) {
      return fetch(request);
    }

    const slug    = path.replace('/produk/', '').replace(/\/$/, '');
    const product = await fetchProductData(slug);

    let title, description, image, price;

    if (product) {
      const productName = product.nama || slugToDisplay(slug);
      const minPrice    = product.harga || product.variants?.[0]?.harga;
      const priceStr    = minPrice
        ? 'Rp ' + parseInt(minPrice).toLocaleString('id-ID')
        : null;
      const catKey      = (product.category || '').toLowerCase();

      title       = `${productName} — Serabut Store`;
      description = `Beli ${productName} original${priceStr ? ` mulai ${priceStr}` : ''}. Garansi resmi, aktivasi 5–30 menit. 10K+ pelanggan terpercaya.`;
      image       = CATEGORY_LOGO[catKey] || DEFAULT_OG_IMAGE;
      price       = minPrice;
    } else {
      const displayName = slugToDisplay(slug);
      title       = `${displayName} — Serabut Store`;
      description = `Beli ${displayName} original dengan harga terjangkau di Serabut Store. Garansi resmi, aktivasi cepat.`;
      image       = DEFAULT_OG_IMAGE;
    }

    const html = buildOGHtml({
      title,
      description,
      image,
      url:         `${SITE}${path}`,
      productName: product?.nama || slugToDisplay(slug),
      price,
      category:    product?.category,
    });

    return new Response(html, {
      status:  200,
      headers: {
        'Content-Type':  'text/html;charset=UTF-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  },
};
