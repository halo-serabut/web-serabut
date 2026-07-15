// Test qris-converter.gs — jalankan: node tests/qris-converter.test.js
// Opsional: QRIS_STATIC="000201..." node tests/qris-converter.test.js
//   → print string dinamis + URL QR asli untuk discan dari HP (string TIDAK disimpan ke mana pun)
const fs = require('fs');
const path = require('path');
const assert = require('assert');

eval(fs.readFileSync(path.join(__dirname, '../gas/qris-converter.gs'), 'utf8'));

// Sample QRIS statis sintetis (bukan merchant asli) — CRC dihitung valid
function buildSample() {
  const tlv = (id, v) => id + String(v.length).padStart(2, '0') + v;
  let p = tlv('00', '01') + tlv('01', '11') +
          tlv('26', tlv('00', 'ID.CO.QRIS.WWW') + tlv('01', '936000000000000000')) +
          tlv('52', '5411') + tlv('53', '360') + tlv('58', 'ID') +
          tlv('59', 'TOKO CONTOH') + tlv('60', 'JAKARTA') + '6304';
  return p + qrisCrc16(p);
}

const sample = buildSample();
const dyn = qrisStaticToDynamic(sample, 15000);
const tags = qrisParseTLV(dyn);
const get = id => (tags.find(t => t.id === id) || {}).value;

// 1. tag 01: "11" → "12"
assert.strictEqual(get('01'), '12', 'tag 01 harus jadi 12');

// 2. tag 54 = nominal, posisinya sebelum tag 58
assert.strictEqual(get('54'), '15000', 'tag 54 harus 15000');
const ids = tags.map(t => t.id);
assert.ok(ids.indexOf('54') < ids.indexOf('58'), 'tag 54 harus sebelum tag 58');

// 3. CRC valid — re-parse & hitung ulang
assert.strictEqual(qrisCrc16(dyn.slice(0, -4)), dyn.slice(-4), 'CRC harus valid');

// 4. idempotent: convert ulang hasil dinamis dengan nominal beda → tag 54 tunggal & baru
const dyn2 = qrisStaticToDynamic(dyn, 25000);
assert.strictEqual(qrisParseTLV(dyn2).filter(t => t.id === '54').length, 1);
assert.strictEqual((qrisParseTLV(dyn2).find(t => t.id === '54')).value, '25000');

// 5. validasi input ditolak
const rejects = fn => { try { fn(); return false; } catch { return true; } };
assert.ok(rejects(() => qrisStaticToDynamic(sample, 0)), 'amount 0 harus ditolak');
assert.ok(rejects(() => qrisStaticToDynamic(sample, -5)), 'amount negatif harus ditolak');
assert.ok(rejects(() => qrisStaticToDynamic(sample, 'abc')), 'amount non-angka harus ditolak');
assert.ok(rejects(() => qrisStaticToDynamic(sample, 10.5)), 'amount desimal harus ditolak');
assert.ok(rejects(() => qrisStaticToDynamic('bukan qris', 10000)), 'string sampah harus ditolak');
assert.ok(rejects(() => qrisStaticToDynamic(sample.slice(0, -1) + '0', 10000)), 'CRC salah harus ditolak');

console.log('✓ Semua test lulus');

// Test dengan QRIS asli via env var (tidak pernah ditulis ke file/git)
if (process.env.QRIS_STATIC) {
  const real = qrisStaticToDynamic(process.env.QRIS_STATIC, Number(process.env.AMOUNT || 1000));
  console.log('\nDynamic QRIS asli:\n' + real);
  console.log('\nScan dari HP: https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=' + encodeURIComponent(real));
}
