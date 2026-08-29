// Self-check _gobizIsPaid — jalankan: node tests/gobiz-pay.test.js
const fs = require('fs');
const src = fs.readFileSync(__dirname + '/../gas/gobiz-pay.gs', 'utf8');
// Ekstrak fungsi _gobizIsPaid (pure, tanpa global GAS) lalu eval
const m = src.match(/function _gobizIsPaid[\s\S]*?\n}/);
eval(m[0]);

const assert = require('assert');
assert.equal(_gobizIsPaid(null), false, 'null → belum bayar');
assert.equal(_gobizIsPaid({ status: 'pending', settlement_at: null }), false, 'pending → belum');
assert.equal(_gobizIsPaid({ status: 'pending', settlement_at: '2026-07-23T10:00:00Z' }), true, 'settlement_at terisi → lunas');
assert.equal(_gobizIsPaid({ status: 'settlement' }), true, 'status settlement → lunas');
assert.equal(_gobizIsPaid({ status: 'SUCCESS' }), true, 'case-insensitive → lunas');
assert.equal(_gobizIsPaid({ status: 'expire' }), false, 'expire → belum');
console.log('OK — _gobizIsPaid semua lolos');
