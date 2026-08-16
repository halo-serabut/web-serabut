// Uji _accountRowToResult (pure) — ekstrak dari gas/Code.gs via regex, eval di node.
// Jalankan: node tests/account-map.test.js
const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync(__dirname + '/../gas/Code.gs', 'utf8');
const m = src.match(/function _accountRowToResult\(r\) \{[\s\S]*?\n\}/);
assert(m, '_accountRowToResult tidak ditemukan');
eval(m[0]);

// Office → officeAccount + wa + tipe
const o = _accountRowToResult({
  source: 'List Account 365', product_type: 'office365', nama: 'Budi',
  email_pembeli: 'budi@mail.com', akun: 'budi@office.com', wa: '628x',
  masa_berlaku: '01 Sep 2026', mulai_langganan: '01 Sep 2025', status: '', durasi: '1 Thn', tipe: '',
});
assert.strictEqual(o.officeAccount, 'budi@office.com');
assert.strictEqual(o.wa, '628x');
assert.strictEqual(o.tipe, 'Personal', 'tipe kosong → Personal');
assert.strictEqual(o.status, 'Aktif', 'status kosong → Aktif');
assert.strictEqual(o.adobeAccount, undefined, 'office tak punya adobeAccount');

// Family → tipe default Family
const f = _accountRowToResult({ source: 'x', product_type: 'office365family', tipe: '' });
assert.strictEqual(f.tipe, 'Family');

// Adobe → adobeAccount + productName, tanpa officeAccount/wa
const a = _accountRowToResult({
  source: 'List Account Adobe CC', product_type: 'adobe', nama: 'Ani',
  email_pembeli: 'ani@mail.com', akun: 'ani@adobe.com', product_name: '', masa_berlaku: '10 Okt 2026',
});
assert.strictEqual(a.adobeAccount, 'ani@adobe.com');
assert.strictEqual(a.productName, 'Adobe Creative Cloud', 'productName kosong → default');
assert.strictEqual(a.officeAccount, undefined);
assert.strictEqual(a.wa, undefined);

console.log('OK _accountRowToResult — office/family/adobe shape benar');
