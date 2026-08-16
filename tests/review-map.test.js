// Uji _mapSupaReviewPublic (pure) — ekstrak dari gas/Code.gs, eval di node dgn stub Utilities.
// Jalankan: node tests/review-map.test.js
const fs = require('fs');
const assert = require('assert');

global.Utilities = { formatDate: () => '01 Sep 2026' }; // stub GAS

const src = fs.readFileSync(__dirname + '/../gas/Code.gs', 'utf8');
const m = src.match(/function _mapSupaReviewPublic\(r\) \{[\s\S]*?\n\}/);
assert(m, '_mapSupaReviewPublic tidak ditemukan');
eval(m[0]);

const r = _mapSupaReviewPublic({
  review_id: 'REV-1', tanggal: '2026-09-01T10:00:00+07:00', nama_tampil: 'B*** S***',
  produk: 'Office 365', varian: 'Web', rating: 4, komentar: 'mantap', likes: 3,
});
assert.strictEqual(r.id, 'REV-1');
assert.strictEqual(r.nama, 'B*** S***');
assert.strictEqual(r.rating, 4);
assert.strictEqual(r.likes, 3);
assert.strictEqual(r.tgl, '01 Sep 2026');

// Default: rating kosong → 5, nama kosong → Pengguna, likes kosong → 0
const d = _mapSupaReviewPublic({ review_id: 'REV-2' });
assert.strictEqual(d.rating, 5);
assert.strictEqual(d.nama, 'Pengguna');
assert.strictEqual(d.likes, 0);
assert.strictEqual(d.tgl, '', 'tanggal kosong → tgl kosong');

console.log('OK _mapSupaReviewPublic — mapping & default benar');
