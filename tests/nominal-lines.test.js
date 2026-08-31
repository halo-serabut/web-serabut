// Uji _nominalLines — nominal di notif WA grup harus cocok dengan yang benar-benar ditagih.
// Jalankan: node tests/nominal-lines.test.js
const fs = require('fs');
const assert = require('assert');

const src = fs.readFileSync(__dirname + '/../gas/Code.gs', 'utf8');
const m = src.match(/function _nominalLines\(orderId, total\) \{[\s\S]*?\n\}/);
assert(m, '_nominalLines tidak ditemukan di Code.gs');

// stub: kode unik QRIS deterministik + fee Xendit
const FEE = 4000;
global._qrisUniqueCode = () => 61;
global._xenditVAFee = () => FEE;
eval(m[0]);

const total = 25000;
const out = _nominalLines('SRB-86050786', total);

// 1. Baris QRIS = total + kode unik, TANPA fee (QRIS langsung tidak lewat Xendit)
assert.ok(out.includes('Nominal QRIS: *Rp 25.061*'), 'nominal QRIS salah: ' + out);

// 2. Baris Xendit = total + fee
assert.ok(out.includes('Nominal Xendit: *Rp 29.000*'), 'nominal Xendit salah: ' + out);
assert.ok(out.includes('biaya admin Rp 4.000'), 'rincian fee tidak disebut: ' + out);

// 3. Angka QRIS dan Xendit tidak boleh sama — kalau sama, admin tak bisa bedakan jalurnya
const qris = total + 61, xen = total + FEE;
assert.notStrictEqual(qris, xen);

// 4. Fee nol (mis. Settings di-override 0) → baris Xendit tidak ditampilkan, bukan "Rp 25.000" palsu
global._xenditVAFee = () => 0;
eval(m[0]);
const noFee = _nominalLines('SRB-1', total);
assert.ok(noFee.includes('Nominal QRIS'), 'baris QRIS harus tetap ada');
assert.ok(!noFee.includes('Nominal Xendit'), 'fee 0 seharusnya tanpa baris Xendit: ' + noFee);

// 5. Kode unik gagal dihitung → jangan diam, baris Xendit tetap tampil
global._qrisUniqueCode = () => { throw new Error('gagal'); };
global._xenditVAFee = () => FEE;
eval(m[0]);
const partial = _nominalLines('SRB-2', total);
assert.ok(!partial.includes('Nominal QRIS'), 'QRIS gagal seharusnya dilewati');
assert.ok(partial.includes('Nominal Xendit: *Rp 29.000*'), 'baris Xendit harus tetap ada: ' + partial);

console.log('OK _nominalLines — QRIS tanpa fee, Xendit + Rp 4.000, aman saat fee 0 / hitung gagal');
