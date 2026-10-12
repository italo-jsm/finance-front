import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
const helper = () => require('../lib/expensePayment.ts');
const api = () => require('../lib/expensePaymentApi.ts');
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const payload = { paidFromAccountId: 'a', paymentDate: '2026-10-12', paymentMethod: 'PIX' };
test('POST envia somente contrato e aceita 204 sem JSON', async () => {
  global.fetch = async (url, options) => {
    assert.ok(url.endsWith('/expenses/a%2Fb/pay'));
    assert.equal(options.method, 'POST'); assert.equal(options.headers.Authorization, 'Bearer token');
    assert.deepEqual(JSON.parse(options.body), payload);
    return new Response(null, { status: 204 });
  };
  await api().payExpense('a/b', { ...payload, amount: 200 }, 'token');
});
test('erros preservam status e rede indica resultado incerto', async () => {
  for (const status of [400, 404, 500]) {
    global.fetch = async () => new Response(null, { status });
    await assert.rejects(api().payExpense('e', payload, 't'), error => error.status === status);
  }
  global.fetch = async () => { throw new Error('offline'); };
  await assert.rejects(api().payExpense('e', payload, 't'), /atualiz/i);
});
test('situação prevalece sobre inferência antiga e resumo parcial não quita', () => {
  assert.equal(helper().expensePaymentFields({ paymentStatus: 'PARTIALLY_PAID', isPaid: true, payment: { paidFromAccountId: 'a' } }).isPaid, false);
  assert.equal(helper().expensePaymentFields({ paymentStatus: 'PAID', payment: null }).isPaid, true);
  assert.equal(helper().expensePaymentFields({ paymentDate: '2026-10-12' }).isPaid, true);
  assert.equal(helper().expensePaymentFields({}).canPay, false);
  assert.equal(helper().expensePaymentFields({ payment: { movementId: 'm' } }).paymentMovementId, undefined);
});
test('valida data real, forma e conta corrente ativa sem bloquear saldo negativo', () => {
  const accounts = [{ accountId: 'a', accountType: 'CHECKING_ACCOUNT', active: true, balance: -20 }];
  assert.equal(helper().validateExpensePayment(payload, accounts), '');
  for (const change of [{ paymentDate: '2026-02-30' }, { paymentDate: '0000-01-01' }, { paymentMethod: '' }, { paidFromAccountId: 'other' }]) assert.ok(helper().validateExpensePayment({ ...payload, ...change }, accounts));
  assert.ok(helper().validateExpensePayment(payload, [{ ...accounts[0], active: false }]));
  assert.ok(helper().validateExpensePayment(payload, [{ ...accounts[0], accountType: 'FIXED_BILL' }]));
});
