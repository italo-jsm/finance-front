import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
const React = require('react');
const originalLoad = Module._load, originalFetch = global.fetch;
afterEach(() => { Module._load = originalLoad; global.fetch = originalFetch; });
const item = { expenseId: 'e', eventDate: '2026-10-10', description: 'Mercado', amount: 200, category: 'OTHER', accountId: 'a', reversedDate: '2026-10-12', canReverse: false };
function runtime() {
  const slots = []; const effects = []; let cursor; let refresh; let getToken = async () => 'token';
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; },
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useCallback(fn) { return fn; }, useEffect(fn) { effects.push(fn); },
  };
  Module._load = function(id, ...args) {
    if (id === 'react') return { ...React, ...hooks };
    if (id === '@/components/AuthProvider') return { useAuth: () => ({ status: 'authenticated', getAccessToken: () => getToken(), profile: null, tokenParsed: null }) };
    if (id === '@/hooks/useExpenseReversal') return { useExpenseReversal: (_, fn) => { refresh = fn; return { blockedIds: new Set(), message: '', busyId: null, reload: fn, reverse() {} }; } };
    if (id.startsWith('@/components/')) { const name = id.split('/').at(-1); return { [name]: name }; }
    if (id.startsWith('@/')) return require(`../${id.slice(2)}`);
    return originalLoad.call(this, id, ...args);
  };
  const path = require.resolve('../app/page.tsx'); delete require.cache[path]; const Home = require(path).default;
  const find = (node, type) => {
    if (!node || typeof node !== 'object') return;
    if (node.type === type) return node;
    for (const child of [node.props?.children].flat(Infinity)) { const match = find(child, type); if (match) return match; }
  };
  return {
    enterAccounts() { this.screen('accounts', 'AccountList'); return effects.at(-1)(); },
    setGetter(fn) { getToken = fn; },
    render() { cursor = 0; effects.length = 0; return Home(); },
    screen(menu, type) { let tree = this.render(); find(tree, 'Sidebar').props.setActiveMenu(menu); tree = this.render(); return find(tree, type).props; },
    refresh() { this.render(); return refresh(); },
  };
}
test('reconciliação consulta contas e recentes, sem histórico não solicitado, e preserva campos', async () => {
  const calls = [];
  global.fetch = async url => { calls.push(url); return Response.json(url.endsWith('/accounts') ? [{ accountId: 'a', name: 'Banco', accountType: 'CHECKING_ACCOUNT', balance: 1000 }] : [item]); };
  const app = runtime(); await app.refresh();
  assert.equal(calls.length, 2);
  const list = app.screen('transactions', 'ExpenseList'); assert.equal(list.expenses[0].reversedDate, '2026-10-12'); assert.equal(list.expenses[0].canReverse, false);
  assert.equal(app.screen('accounts', 'AccountList').accounts[0].balance, 1000);
});
test('histórico consultado mantém período/categoria/conta, ignora resposta antiga e falha parcial não inventa saldo', async () => {
  const app = runtime(); const filters = { dateFrom: '2026-10-01', dateTo: '2026-10-12', category: 'OTHER', accountId: 'a' };
  let old; global.fetch = () => new Promise(resolve => { old = resolve; });
  const pending = app.screen('expenseHistory', 'ExpenseHistoryTable').onSearch(filters);
  await new Promise(resolve => setImmediate(resolve));
  const calls = [];
  global.fetch = async url => {
    calls.push(url);
    return url.endsWith('/accounts') ? new Response(null, { status: 500 }) : Response.json([item, { ...item, expenseId: 'other', category: 'HEALTH' }]);
  };
  await assert.rejects(app.refresh(), /atualizar/);
  old(Response.json([{ ...item, reversedDate: null, canReverse: true }])); await pending;
  const history = app.screen('expenseHistory', 'ExpenseHistoryTable'); assert.equal(history.expenses.length, 1); assert.equal(history.expenses[0].reversedDate, '2026-10-12');
  assert.ok(calls.some(url => url.includes('beginDate=2026-10-01') && url.includes('endDate=2026-10-12')));
  assert.match(app.screen('accounts', 'AccountList').error, /saldos/);
});

test('falha ao obter token após estorno invalida saldo anterior e informa falha', async () => {
  global.fetch = async url => Response.json(url.endsWith('/accounts') ? [{ accountId: 'a', name: 'Banco', accountType: 'CHECKING_ACCOUNT', balance: 800 }] : [item]);
  const app = runtime(); await app.refresh();
  assert.equal(app.screen('accounts', 'AccountList').accounts[0].balance, 800);
  app.setGetter(async () => { throw new Error('sessão expirada'); });
  await assert.rejects(app.refresh());
  const accounts = app.screen('accounts', 'AccountList');
  assert.equal(accounts.accounts[0].balance, null); assert.match(accounts.error, /saldos/);
});

test('entrar em Contas atualiza saldo do card antes de abrir extrato; consulta compartilhada mantém card sincronizado', async () => {
  let balance = 576, calls = 0;
  global.fetch = async (url, options) => {
    if (url.endsWith('/accounts')) { calls++; assert.equal(options.cache, 'no-store'); return Response.json([{ accountId: 'a', name: 'Banco', accountType: 'CHECKING_ACCOUNT', balance }]); }
    return Response.json([item]);
  };
  const app = runtime(); await app.refresh(); balance = 1030;
  const cleanup = app.enterAccounts(); await new Promise(resolve => setImmediate(resolve));
  const cards = app.screen('accounts', 'AccountList'); assert.equal(cards.accounts[0].balance, 1030); assert.equal(calls, 2);
  balance = 900; await cards.loadAccounts('token'); assert.equal(app.screen('accounts', 'AccountList').accounts[0].balance, 900);
  cleanup?.();
});
test('falha ao entrar em Contas não apresenta saldo anterior como atual', async () => {
  global.fetch = async url => Response.json(url.endsWith('/accounts') ? [{ accountId: 'a', name: 'Banco', accountType: 'CHECKING_ACCOUNT', balance: 576 }] : [item]);
  const app = runtime(); await app.refresh();
  global.fetch = async () => { throw new TypeError('offline'); };
  const cleanup = app.enterAccounts(); await new Promise(resolve => setImmediate(resolve));
  const cards = app.screen('accounts', 'AccountList'); assert.equal(cards.accounts[0].balance, null); assert.match(cards.error, /saldos/); cleanup?.();
});

test('consulta antiga do extrato não sobrescreve saldo de consulta mais recente da página', async () => {
  const account = { accountId: 'a', name: 'Banco', accountType: 'CHECKING_ACCOUNT', balance: 1030 };
  global.fetch = async url => Response.json(url.endsWith('/accounts') ? [account] : [item]);
  const app = runtime(); await app.refresh();
  let old;
  global.fetch = () => new Promise(resolve => { old = resolve; });
  const pending = app.screen('accounts', 'AccountList').loadAccounts('token');
  global.fetch = async url => Response.json(url.endsWith('/accounts') ? [{ ...account, balance: 1200 }] : [item]);
  await app.refresh(); old(Response.json([{ ...account, balance: 576 }])); await pending;
  assert.equal(app.screen('accounts', 'AccountList').accounts[0].balance, 1200);
});
