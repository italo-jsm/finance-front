import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const build = values => require('../lib/accountForm.ts').buildAccountPayload(values, false);
const values = { name: ' Banco ', accountType: 'CHECKING_ACCOUNT', closingDay: '', dueDay: '', initialBalance: '1000,25' };
test('conta corrente envia saldo inicial decimal, incluindo zero e negativo', () => {
  assert.deepEqual(build(values), { name: 'Banco', accountType: 'CHECKING_ACCOUNT', closingDay: null, dueDay: null, initialBalance: 1000.25 });
  for (const value of ['0', '-150,30', '9999999999999.99', '-9999999999999.99']) assert.equal(build({ ...values, initialBalance: value }).initialBalance, Number(value.replace(',', '.')));
});
test('saldo inicial rejeita ausência, precisão e limite inválidos sem arredondamento', () => {
  for (const value of ['', ' ', '1.001', '1,001', '1e3', 'NaN', '1.000,25', '10000000000000', '-10000000000000']) assert.throws(() => build({ ...values, initialBalance: value }), /saldo/i);
});
test('edição e outros tipos omitem campos de saldo', () => {
  const form = require('../lib/accountForm.ts');
  assert.equal('initialBalance' in form.buildAccountPayload({ ...values, initialBalance: '' }, true), false);
  for (const accountType of ['CREDIT_CARD', 'FIXED_BILL']) {
    const payload = build({ ...values, accountType, closingDay: '10', dueDay: '15', initialBalance: 'inválido' });
    assert.equal('initialBalance' in payload, false);
    assert.equal(payload.dueDay, 15);
  }
});
