import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(
  readFileSync(filename, 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText, filename);

const { getCurrentDuePeriod, getSuggestedFixedDueDate, loadDueItems } = require('../lib/dueDatesApi.ts');
const { payInvoice } = require('../lib/invoicesApi.ts');

test('mês inicial inclui o último dia do calendário, inclusive em ano bissexto', () => {
  assert.deepEqual(getCurrentDuePeriod('2028-02-03'), { start: '2028-02-01', end: '2028-02-29' });
  assert.equal(getSuggestedFixedDueDate('2028-02-03', 31), '2028-02-29');
  assert.equal(getSuggestedFixedDueDate('2027-02-03', 31), '2027-02-28');
});

test('combina faturas e cobranças pelas datas de vencimento e calcula pagamentos em centavos', async t => {
  const accounts = [
    { accountId: 'cartao', name: 'Cartão', accountType: 'CREDIT_CARD', dueDay: 2 },
    { accountId: 'internet', name: 'Internet', accountType: 'FIXED_BILL', dueDay: 5 },
    { accountId: 'ignorada', name: 'Aluguel', accountType: 'FIXED_BILL', dueDay: 15 },
    { accountId: 'corrente', name: 'Corrente', accountType: 'CHECKING_ACCOUNT' },
  ];
  const { signal } = new AbortController();
  const queries = [];
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    assert.equal(init.headers.Authorization, 'Bearer token');
    assert.equal(init.signal, signal);
    const { pathname, searchParams } = new URL(url);
    if (pathname === '/invoices') {
      const month = searchParams.get('competence');
      queries.push(month);
      assert.equal(searchParams.get('accountId'), 'cartao');
      return Response.json({ dueDate: `${month}-02`, total: { currentTotal: 51.09 }, paid: true });
    }

    assert.equal(pathname, '/expenses/by-due-date');
    assert.equal(searchParams.get('beginDate'), '2028-02-29');
    assert.equal(searchParams.get('endDate'), '2028-03-02');
    return Response.json([
      { id: 'a', description: 'Material', accountId: 'internet', amount: 9.99, expenseDate: '2028-01-05', effectiveDueDate: '2028-02-29', totalPaid: 4.15, paymentStatus: 'PARTIALLY_PAID' },
      { id: 'b', description: 'Estornada', accountId: 'internet', amount: 12, effectiveDueDate: '2028-02-29', paymentStatus: 'REVERSED' },
      { id: 'c', description: 'Despesa comum', accountId: 'corrente', amount: 10, effectiveDueDate: '2028-02-29' },
    ]);
  });
  assert.deepEqual(await loadDueItems(accounts, { start: '2028-02-29', end: '2028-03-02' }, 'token', signal), [
    { id: 'a', name: 'Material', accountName: 'Internet', type: 'fixed', due: '2028-02-29', amount: 999, paid: 415 },
    { id: 'cartao:2028-03', name: 'Cartão', type: 'card', due: '2028-03-02', amount: 5109, paid: 5109 },
  ]);
  assert.deepEqual(queries.sort(), ['2028-02', '2028-03']);
});

test('mantém a competência original da fatura e o ID da despesa para registrar pagamentos', async t => {
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    const { pathname } = new URL(url);
    if (init.method === 'POST') {
      assert.equal(pathname, '/invoices/cartao/2028-03/pay');
      assert.equal(init.headers.Authorization, 'Bearer token');
      assert.deepEqual(JSON.parse(init.body), { paidFromAccountId: 'corrente', paymentDate: '2028-02-29' });
      return Response.json({});
    }
    if (pathname === '/invoices') {
      return Response.json({ dueDate: '2028-03-02', total: { currentTotal: 50 } });
    }
    assert.equal(pathname, '/expenses/by-due-date');
    return Response.json([
      { id: 'parcela', accountId: 'conta-fixa', effectiveDueDate: '2028-03-02', amount: 20, canPay: true },
      { id: 'parcial', accountId: 'conta-fixa', effectiveDueDate: '2028-03-02', amount: 30, totalPaid: 10, canPay: false },
    ]);
  });
  const items = await loadDueItems([
    { accountId: 'cartao', name: 'Cartão', accountType: 'CREDIT_CARD' },
    { accountId: 'conta-fixa', name: 'Internet', accountType: 'FIXED_BILL', dueDay: 2 },
  ], { start: '2028-03-01', end: '2028-03-31' }, 'token', new AbortController().signal);
  assert.deepEqual(items.find(item => item.id === 'parcela').paymentTarget, { type: 'fixed', expenseId: 'parcela' });
  assert.equal(items.find(item => item.id === 'parcial').paymentTarget, undefined);
  const target = items.find(item => item.type === 'card').paymentTarget;
  await payInvoice(target.accountId, target.competence, { paidFromAccountId: 'corrente', paymentDate: '2028-02-29', paymentMethod: '' }, 'token');
});

test('falha de consulta não produz totais parciais', async t => {
  t.mock.method(globalThis, 'fetch', async () => new Response(null, { status: 503 }));
  await assert.rejects(loadDueItems(
    [{ accountId: 'cartao', name: 'Cartão', accountType: 'CREDIT_CARD' }],
    { start: '2026-11-01', end: '2026-11-30' }, 'token', new AbortController().signal,
  ), /carregar a fatura/);
});
