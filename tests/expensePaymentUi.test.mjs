import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const originalLoad = Module._load;
const originalFetch = global.fetch;
afterEach(() => { Module._load = originalLoad; global.fetch = originalFetch; });
const expense = { expenseId: 'e', date: '2026-10-12', description: 'Luz', value: 200, category: 'HOUSING', installments: 1, accountId: 'f', accountName: 'Energia', isPaid: false, paidFromAccountId: '', canPay: true, paymentStatus: 'PENDING' };
const account = { accountId: 'a', name: 'Banco', accountType: 'CHECKING_ACCOUNT', active: true };
const markup = (component, props) => renderToStaticMarkup(React.createElement(component, props));
test('ação exige elegibilidade e identifica pagamento sem confundir legado parcial', () => {
  const { ExpensePaymentAction } = require('../components/ExpensePaymentAction.tsx');
  const props = { expense, accounts: [account], onPay() {}, blocked: false };
  assert.match(markup(ExpensePaymentAction, props), /Marcar como paga/);
  for (const change of [{ canPay: false }, { canPay: undefined }, { expenseId: undefined }, { reversedDate: '2026-10-12' }]) assert.doesNotMatch(markup(ExpensePaymentAction, { ...props, expense: { ...expense, ...change } }), /Marcar como paga/);
  const paid = markup(ExpensePaymentAction, { ...props, expense: { ...expense, canPay: false, paymentStatus: 'PAID', payment: { paymentDate: '2026-10-12', paymentMethod: 'PIX', paidFromAccountId: 'a' } } });
  for (const text of ['Paga', '12/10/2026', 'PIX', 'Banco']) assert.ok(paid.includes(text));
  assert.match(markup(ExpensePaymentAction, { ...props, expense: { ...expense, canPay: false, paymentStatus: 'PARTIALLY_PAID', payment: null } }), /Parcialmente paga/);
  assert.match(markup(ExpensePaymentAction, { ...props, blocked: true }), /disabled=""/);
});
test('formulário só oferece correntes ativas, não permite valor editável e desabilita sem conta', () => {
  const { ExpensePaymentForm } = require('../components/ExpensePaymentForm.tsx');
  const props = { expense, accounts: [account, { ...account, accountId: 'x', name: 'Inativa', active: false }, { ...account, accountId: 'f', name: 'Fixa', accountType: 'FIXED_BILL' }], busy: false, error: '', onSubmit() {}, onCancel() {} };
  const html = markup(ExpensePaymentForm, props);
  assert.match(html, /Banco/); assert.doesNotMatch(html, /Inativa|>Fixa</); assert.match(html, /200,00/);
  assert.match(markup(ExpensePaymentForm, { ...props, accounts: [] }), /cadastre ou ative/i);
});
function runtime(refresh = async () => {}) {
  const slots = []; let cursor = 0; const effects = []; const cleanups = [];
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useEffect(fn) { effects.push(fn); },
  };
  Module._load = function(id, ...args) { return id === 'react' ? hooks : originalLoad.call(this, id, ...args); };
  const path = require.resolve('../hooks/useExpensePayment.ts'); delete require.cache[path];
  const hook = require(path).useExpensePayment;
  let getter = async () => 'token';
  return {
    render() { cursor = 0; effects.length = 0; return hook(getter, refresh, 'authenticated'); },
    mount() { const value = this.render(); effects.forEach(fn => cleanups.push(fn())); return value; },
    unmount() { cleanups.forEach(fn => fn?.()); },
    setGetter(fn) { getter = fn; },
  };
}
const payload = { paidFromAccountId: 'a', paymentDate: '2026-10-12', paymentMethod: 'PIX' };
const flush = () => new Promise(resolve => setImmediate(resolve));
test('hook bloqueia envio concorrente e confirmação permanece bloqueada após refresh falho', async () => {
  let finish; let calls = 0;
  global.fetch = async () => { calls++; return new Promise(resolve => { finish = resolve; }); };
  const r = runtime(async () => { throw new Error('consulta'); }); r.mount(); await flush();
  r.render().open(expense); const first = r.render().submit(payload); await flush();
  await r.render().submit(payload); assert.equal(calls, 1);
  finish(new Response(null, { status: 204 })); await first;
  assert.ok(r.render().blockedIds.has('e')); assert.match(r.render().message, /registrado.*atualizar/i);
  r.render().open(expense); await r.render().submit(payload); assert.equal(calls, 1);
  r.unmount();
});
test('rede incerta exige consulta antes de reabrir e não repete POST', async () => {
  let calls = 0;
  global.fetch = async () => { calls++; throw new Error('offline'); };
  const r = runtime(); r.mount(); await flush(); r.render().open(expense); await r.render().submit(payload);
  assert.ok(r.render().blockedIds.has('e')); r.render().open(expense); await r.render().submit(payload); assert.equal(calls, 1);
  await r.render().reload(); assert.equal(r.render().blockedIds.has('e'), false); assert.equal(calls, 1); r.unmount();
});
test('sessão encerrada enquanto aguarda token impede envio', async () => {
  let token; let calls = 0; global.fetch = async () => { calls++; return new Response(null, { status: 204 }); };
  const r = runtime(); r.setGetter(() => new Promise(resolve => { token = resolve; })); r.mount(); await flush();
  r.render().open(expense); const pending = r.render().submit(payload); r.unmount(); token('t'); await pending; assert.equal(calls, 0);
});
test('listagens exibem ação compartilhada inclusive tabela e cartões do histórico', () => {
  const props = { expenses: [expense], accounts: [account], paymentAccounts: [account], reversalBlockedIds: new Set(), reversingId: null, onReverse() {}, isLoading: false, error: '', hasSearched: true, onSearch() {}, onEdit() {}, onDelete() {}, onPay() {} };
  const { ExpenseList } = require('../components/ExpenseList.tsx');
  const { ExpenseHistoryTable } = require('../components/ExpenseHistoryTable.tsx');
  assert.match(markup(ExpenseList, props), /Marcar como paga/);
  assert.equal((markup(ExpenseHistoryTable, props).match(/Marcar como paga/g) ?? []).length, 2);
});
test('400 e 404 reconciliam sem repetição e cancelamento não envia', async () => {
  for (const status of [400, 404]) {
    let calls = 0; let refreshed = 0;
    global.fetch = async () => { calls++; return new Response(null, { status }); };
    const r = runtime(async () => { refreshed++; }); r.mount(); await flush();
    r.render().open(expense); r.render().cancel(); await r.render().submit(payload); assert.equal(calls, 0);
    r.render().open(expense); await r.render().submit(payload); assert.equal(calls, 1); assert.equal(refreshed, 1);
    assert.equal(r.render().blockedIds.has('e'), false); assert.match(r.render().message, /inválidos/); r.unmount();
  }
});
test('sucesso atualiza uma vez e sessão encerrada ignora POST tardio', async () => {
  let refreshed = 0;
  global.fetch = async () => new Response(null, { status: 204 });
  const r = runtime(async () => { refreshed++; }); r.mount(); await flush(); r.render().open(expense); await r.render().submit(payload);
  assert.equal(refreshed, 1); assert.ok(r.render().blockedIds.has('e')); assert.equal(r.render().selected, null); r.unmount();
  let finish; global.fetch = async () => new Promise(resolve => { finish = resolve; });
  const old = runtime(async () => { refreshed++; }); old.mount(); await flush(); old.render().open(expense); const pending = old.render().submit(payload); await flush(); old.unmount(); finish(new Response(null, { status: 204 })); await pending;
  assert.equal(refreshed, 1); assert.equal(old.render().blockedIds.size, 0);
});
