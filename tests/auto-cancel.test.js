// Uji autoCancelExpiredOrders — ekstrak dari gas/Code.gs, jalankan dengan SpreadsheetApp palsu.
// Jalankan: node tests/auto-cancel.test.js
const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync(__dirname + '/../gas/Code.gs', 'utf8');
const m = src.match(/const ORDER_EXPIRY_MS[\s\S]*?\nfunction autoCancelExpiredOrders\(\) \{[\s\S]*?\n\}\n/);
assert(m, 'autoCancelExpiredOrders tidak ditemukan di Code.gs');

const HEAD = ['Order ID', 'Tanggal', 'Nama', 'Status', 'Payment Status'];
const H = 25 * 3600 * 1000;
const jam = (n) => new Date(Date.now() - n * 3600 * 1000);

let written = [];
function run(rows) {
  written = [];
  const data = [HEAD].concat(rows);
  global.SPREADSHEET_ID = 'x';
  global.TAB_ORDERS = 'Orders';
  global.Logger = { log() {} };
  global._fixDateSwap = (d) => d;
  global._ordersMirror = () => {};
  global.SpreadsheetApp = {
    flush() {},
    openById: () => ({
      getSheetByName: () => ({
        getDataRange: () => ({ getValues: () => data }),
        getRange: (r, c) => ({ setValue: (v) => written.push([r, c, v]) }),
      }),
    }),
  };
  eval(m[0]);
  return autoCancelExpiredOrders();
}

// 1. Pending > 24 jam, tanpa tanda bayar → dibatalkan
let r = run([['SRB-1', jam(30), 'A', 'Pending', '']]);
assert.strictEqual(r.cancelled, 1, 'order basi harus dibatalkan');
assert.deepStrictEqual(written, [[2, 4, 'Dibatalkan']]);

// 2. Belum lewat 24 jam → aman
assert.strictEqual(run([['SRB-2', jam(5), 'A', 'Pending', '']]).cancelled, 0);

// 3. Sudah ada tanda bayar → jangan sentuh, walau basi
['Lunas', 'Berhasil', 'Menunggu Verifikasi'].forEach((ps) => {
  assert.strictEqual(run([['SRB-3', jam(50), 'A', 'Pending', ps]]).cancelled, 0, 'jangan batalkan ' + ps);
});

// 4. Bukan Pending → jangan sentuh
assert.strictEqual(run([['SRB-4', jam(99), 'A', 'Diproses', '']]).cancelled, 0);

// 5. Cart (banyak baris) basi → SEMUA baris dibatalkan
r = run([
  ['SRB-5', jam(30), 'A', 'Pending', ''],
  ['SRB-5', jam(30), 'A', 'Pending', ''],
]);
assert.strictEqual(r.cancelled, 1);
assert.deepStrictEqual(written, [[2, 4, 'Dibatalkan'], [3, 4, 'Dibatalkan']]);

// 6. Cart yang salah satu barisnya sudah dibayar → order utuh diselamatkan
assert.strictEqual(run([
  ['SRB-6', jam(30), 'A', 'Pending', ''],
  ['SRB-6', jam(30), 'A', 'Pending', 'Lunas'],
]).cancelled, 0);

// 7. Tanggal tak terbaca → jangan batalkan (fail-safe)
assert.strictEqual(run([['SRB-7', '', 'A', 'Pending', '']]).cancelled, 0);

console.log('OK autoCancelExpiredOrders — batas 24 jam, tanda bayar, cart all-or-nothing');
