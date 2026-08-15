// Uji logika murni helper OTP (mirror supabase/functions/_shared/util.ts).
// node tests/otp-util.test.js
const assert = require('assert');
const crypto = require('crypto');

// —— salinan logika dari util.ts (harus tetap sinkron) ——
const genOTP = () => String(Math.floor(100000 + Math.random() * 900000));
const sha256hex = (s) => crypto.createHash('sha256').update(s).digest('hex');
function normalizeWA(wa) {
  const d = String(wa || '').replace(/\D/g, '');
  if (!d) return '';
  if (d.startsWith('62')) return d;
  if (d.startsWith('0')) return '62' + d.slice(1);
  return '62' + d;
}

// genOTP: selalu 6 digit, dalam rentang
for (let i = 0; i < 5000; i++) {
  const o = genOTP();
  assert.match(o, /^\d{6}$/, 'OTP harus 6 digit: ' + o);
  const n = Number(o);
  assert.ok(n >= 100000 && n <= 999999, 'OTP di luar rentang: ' + o);
}

// sha256hex: deterministik + beda input beda hash
assert.strictEqual(sha256hex('123456'), sha256hex('123456'));
assert.notStrictEqual(sha256hex('123456'), sha256hex('123457'));
assert.strictEqual(sha256hex('123456').length, 64);

// normalizeWA: mirror _normalizeWA GAS
assert.strictEqual(normalizeWA('08123456789'), '628123456789');
assert.strictEqual(normalizeWA('8123456789'), '628123456789');   // tanpa 0
assert.strictEqual(normalizeWA('628123456789'), '628123456789');
assert.strictEqual(normalizeWA('+62 812-3456-789'), '628123456789');
assert.strictEqual(normalizeWA(''), '');
assert.strictEqual(normalizeWA(null), '');

console.log('otp-util.test.js: OK');
