// Uji _groupSupaOrders (pure) — ekstrak dari gas/Code.gs via regex, eval di node.
// Jalankan: node tests/group-supa-orders.test.js
const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync(__dirname + '/../gas/Code.gs', 'utf8');
const m = src.match(/function _groupSupaOrders\(rows\) \{[\s\S]*?\n\}/);
assert(m, '_groupSupaOrders tidak ditemukan di Code.gs');
eval(m[0]);

// 1 cart (2 item, order lama) + 1 single (order baru) → newest-first, total benar, item ter-group
const rows = [
  { order_id: 'A', tanggal: '2026-08-01T10:00:00+07:00', _tgl: '2026-08-01 10:00', nama: 'Budi', no_wa: '628x', produk: 'Office', varian: 'Web', masa_aktif: '1 Thn', harga: 50000, status: 'Selesai', payment_method: 'QRIS', payment_status: 'Lunas' },
  { order_id: 'A', tanggal: '2026-08-01T10:00:00+07:00', _tgl: '2026-08-01 10:00', nama: 'Budi', no_wa: '628x', produk: 'Canva', varian: '', masa_aktif: '', harga: 60000, status: 'Selesai' },
  { order_id: 'B', tanggal: '2026-08-05T09:00:00+07:00', _tgl: '2026-08-05 09:00', nama: 'Ani', produk: 'Adobe', harga: 320000, status: 'Pending' },
];

const out = _groupSupaOrders(rows);
assert.strictEqual(out.length, 2, 'harus 2 order');
assert.strictEqual(out[0].orderId, 'B', 'newest-first: B dulu');
assert.strictEqual(out[1].orderId, 'A');
assert.strictEqual(out[1].items.length, 2, 'A punya 2 item');
assert.strictEqual(out[1].total, 110000, 'total A = 50k+60k');
assert.strictEqual(out[1].items[1].varian, '-', 'varian kosong → "-"');
assert.strictEqual(out[1].items[1].masaAktif, '-', 'masaAktif kosong → "-"');
assert.strictEqual(out[1].tanggal, '2026-08-01 10:00', 'pakai _tgl');
assert.strictEqual(out[1].paymentStatus, 'Lunas');
assert.strictEqual(out[0].status, 'Pending');
assert.strictEqual(out[0].paymentMethod, '', 'default kosong');

console.log('OK _groupSupaOrders — 2 order, grouping/total/tanggal/default benar');
