import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire(import.meta.url);
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
const realReact = require('react');
const originalLoad = Module._load; const originalFetch = global.fetch;
afterEach(() => { Module._load = originalLoad; global.fetch = originalFetch; });
const bill = { id: 'e', description: 'Luz', amount: 200, expenseDate: '2026-10-12', category: 'HOUSING', accountId: 'f', paymentStatus: 'PENDING', canPay: true };
const account = balance => ({ accountId: 'a', name: 'Banco', accountType: 'CHECKING_ACCOUNT', active: true, balance });
function find(node, name) {
  if (!node || typeof node !== 'object') return null;
  if (node.type?.name === name) return node;
  for (const child of [node.props?.children].flat(Infinity)) { const value = find(child, name); if (value) return value; }
  return null;
}
function runtime() {
  const slots = []; let cursor = 0; let scheduled = [];
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(fn, deps) { const i = cursor++; const previous = slots[i]; if (!previous || deps.some((x, j) => x !== previous.deps[j])) slots[i] = { fn, deps }; return slots[i].fn; },
    useEffect(fn, deps) { const i = cursor++; const previous = slots[i]; if (!previous || deps.some((x, j) => x !== previous.deps[j])) { slots[i] = { deps, cleanup: previous?.cleanup }; scheduled.push(() => { slots[i].cleanup?.(); slots[i].cleanup = fn(); }); } },
  };
  Module._load = function(id, ...args) {
    if (id === 'react') return { ...realReact, ...hooks };
    if (id === '@/components/AuthProvider') return { useAuth: () => auth };
    if (id.startsWith('@/')) return originalLoad.call(this, path.resolve(id.slice(2)), ...args);
    return originalLoad.call(this, id, ...args);
  };
  const auth = { status: 'authenticated', profile: {}, tokenParsed: {}, getAccessToken: async () => 'token' };
  for (const file of ['../app/page.tsx', '../hooks/useExpensePayment.ts']) delete require.cache[require.resolve(file)];
  const Home = require('../app/page.tsx').default;
  let tree;
  return {
    render() { cursor = 0; scheduled = []; tree = Home(); scheduled.forEach(fn => fn()); return tree; },
    async settle() { for (let i = 0; i < 5; i++) { this.render(); await new Promise(resolve => setImmediate(resolve)); } },
    props(name) { return find(tree, name)?.props; },
    node(name) { return find(tree, name); },
    menu(name) { this.props('Sidebar').setActiveMenu(name); this.render(); },
    unmount() { slots.forEach(slot => slot?.cleanup?.()); },
  };
}
test('consulta de conta anterior ao pagamento não restaura saldo antigo e movimentações são invalidadas', async () => {
  let paid = false; let lateAccount;
  global.fetch = async url => {
    if (url.includes('/expenses')) return Response.json({ expenses: [{ ...bill, paymentStatus: paid ? 'PAID' : 'PENDING', canPay: !paid }] });
    return Response.json([account(paid ? 800 : 1000)]);
  };
  const r = runtime(); await r.settle();
  r.menu('incomes');
  const late = r.props('IncomesSection').onAccountsChange();
  // Wait for token; capture the old balance response before it arrives.
  const previousFetch = global.fetch;
  global.fetch = async url => url.endsWith('/accounts') ? new Promise(resolve => { lateAccount = resolve; }) : previousFetch(url);
  await new Promise(resolve => setImmediate(resolve));
  r.menu('transactions'); await r.settle();
  const item = r.props('ExpenseList').expenses[0]; r.props('ExpenseList').onPay(item); r.render();
  r.menu('accounts'); const keyBefore = r.node('AccountList').key;
  global.fetch = async (url, options) => {
    if (options?.method === 'POST') { paid = true; return new Response(null, { status: 204 }); }
    return previousFetch(url, options);
  };
  r.props('ExpensePaymentForm').onSubmit({ paidFromAccountId: 'a', paymentDate: '2026-10-12', paymentMethod: 'PIX' });
  await r.settle();
  assert.notEqual(r.node('AccountList').key, keyBefore, 'invalida visualização de movimentações aberta');
  lateAccount(Response.json([account(1000)])); await late; await r.settle();
  assert.equal(r.props('AccountList').accounts[0].balance, 800); r.unmount();
});
test('pagamento preserva filtros de histórico e ignora consulta pendente anterior', async () => {
  let paid = false; let lateHistory; let delay = false; const urls = [];
  const filters = { dateFrom: '2026-10-01', dateTo: '2026-10-31', category: 'HOUSING', accountId: 'f' };
  global.fetch = async (url, options) => {
    urls.push(url);
    if (options?.method === 'POST') { paid = true; delay = false; return new Response(null, { status: 204 }); }
    if (url.includes('/expenses')) {
      if (delay && url.includes('beginDate=2026-10-01')) return new Promise(resolve => { lateHistory = resolve; });
      return Response.json({ expenses: [{ ...bill, paymentStatus: paid ? 'PAID' : 'PENDING', canPay: !paid }, { ...bill, id: 'other', category: 'OTHER' }] });
    }
    return Response.json([account(paid ? 800 : 1000)]);
  };
  const r = runtime(); await r.settle(); r.menu('transactions'); await r.settle();
  r.props('ExpenseList').onPay(r.props('ExpenseList').expenses[0]); r.render(); r.menu('expenseHistory');
  delay = true; const pending = r.props('ExpenseHistoryTable').onSearch(filters); await new Promise(resolve => setImmediate(resolve));
  r.props('ExpensePaymentForm').onSubmit({ paidFromAccountId: 'a', paymentDate: '2026-11-05', paymentMethod: 'TRANSFER' }); await r.settle();
  assert.deepEqual(r.props('ExpenseHistoryTable').expenses.map(x => [x.expenseId, x.paymentStatus]), [['e', 'PAID']]);
  lateHistory(Response.json({ expenses: [bill] })); await pending; await r.settle();
  assert.equal(r.props('ExpenseHistoryTable').expenses[0].paymentStatus, 'PAID');
  assert.equal(urls.filter(url => url.includes('beginDate=2026-10-01') && url.includes('endDate=2026-10-31')).length, 2); r.unmount();
});
test('sem busca anterior não consulta histórico após pagamento', async () => {
  const urls = [];
  global.fetch = async (url, options) => { urls.push(url); return options?.method === 'POST' ? new Response(null, { status: 204 }) : Response.json(url.includes('/expenses') ? { expenses: [bill] } : [account(1000)]); };
  const r = runtime(); await r.settle(); r.menu('transactions'); await r.settle();
  r.props('ExpenseList').onPay(r.props('ExpenseList').expenses[0]); r.render(); urls.length = 0;
  r.props('ExpensePaymentForm').onSubmit({ paidFromAccountId: 'a', paymentDate: '2026-10-12', paymentMethod: 'CASH' }); await r.settle();
  const dates = urls.filter(url => url.includes('beginDate=')).map(url => new URL(url).searchParams.get('beginDate'));
  assert.ok(dates.length > 0); assert.equal(new Set(dates).size, 1); r.unmount();
});
