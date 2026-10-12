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
const account = { accountId: 'a', name: 'Banco A', accountType: 'CHECKING_ACCOUNT', balance: 1300 };
const movement = { id: 'm', accountId: 'a', date: '2026-10-12', amount: -200, origin: 'PAYMENT', originId: null };
const state = { account, movements: [movement], loading: false, balanceError: '', movementsError: '', unavailable: false, reload() {} };
function markup(overrides = {}) {
  Module._load = function(id, ...args) {
    if (id.endsWith('/useAccountMovements')) return { useAccountMovements: () => ({ ...state, ...overrides }) };
    return originalLoad.call(this, id, ...args);
  };
  const path = require.resolve('../components/AccountMovementsSection.tsx');
  delete require.cache[path];
  return renderToStaticMarkup(React.createElement(require(path).AccountMovementsSection, { account, getAccessToken: async () => 'token', onClose() {} }));
}
test('seção mostra saldo do servidor, data, origem, saída e controles', () => {
  const html = markup();
  for (const text of ['Banco A', '1.300,00', '12/10/2026', 'Pagamento', '200,00', 'Atualizar', 'Fechar', 'Últimas 10 movimentações']) assert.ok(html.includes(text), text);
  assert.match(html, /−/);
});
test('saldo inicial zero/negativo e recebimento positivo preservam sinais', () => {
  for (const amount of [0, -30, 500]) {
    const html = markup({ movements: [{ ...movement, amount, origin: amount === 500 ? 'RECEIPT' : 'OPENING' }] });
    assert.ok(html.includes(amount === 500 ? 'Recebimento' : 'Saldo inicial'));
    if (amount < 0) assert.match(html, /−/);
    if (amount > 0) assert.match(html, /\+/);
  }
});
test('vazio, carregamento e erro parcial são distintos sem saldo zero fictício', () => {
  assert.match(markup({ movements: [] }), /Nenhuma movimentação encontrada/);
  const loading = markup({ loading: true, account: null, movements: [] });
  assert.match(loading, /Carregando/); assert.match(loading, /disabled=""/); assert.doesNotMatch(loading, /Nenhuma movimentação/);
  const failed = markup({ account: null, balanceError: 'Falha no saldo' });
  assert.match(failed, /Falha no saldo/); assert.match(failed, /Pagamento/); assert.doesNotMatch(failed, /Saldo atual:.*0,00/);
  assert.doesNotMatch(markup({ movementsError: 'Falha nas movimentações', movements: [] }), /Nenhuma movimentação/);
  const unavailable = markup({ unavailable: true });
  assert.match(unavailable, /não está mais disponível/); assert.doesNotMatch(unavailable, /Pagamento|1.300,00/);
});

// Controlled hook runtime: run effects/cleanup explicitly and inspect async state without a DOM dependency.
function hookRuntime(loadAccounts) {
  const slots = []; let cursor = 0; const effects = []; const cleanups = [];
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial }; },
    useCallback(fn) { return fn; },
    useEffect(fn) { effects.push(fn); },
  };
  Module._load = function(id, ...args) { return id === 'react' ? hooks : originalLoad.call(this, id, ...args); };
  const path = require.resolve('../hooks/useAccountMovements.ts'); delete require.cache[path];
  const runHook = require(path).useAccountMovements;
  let currentAccount = account; let getter = async () => 'token';
  return {
    render() { cursor = 0; effects.length = 0; return runHook(currentAccount, getter, loadAccounts); },
    mount() { const result = this.render(); effects.forEach(fn => cleanups.push(fn())); return result; },
    unmount() { cleanups.splice(0).forEach(fn => fn?.()); },
    setGetter(fn) { getter = fn; },
  };
}
const flush = async () => { await new Promise(resolve => setImmediate(resolve)); };
test('hook preserva saldo do servidor, aceita falha parcial e bloqueia reload duplicado', async () => {
  let resolveMovements; let calls = 0;
  global.fetch = async url => {
    calls++;
    if (url.endsWith('/movements')) return new Promise(resolve => { resolveMovements = resolve; });
    return Response.json([account]);
  };
  const runtime = hookRuntime(); runtime.mount(); await flush();
  runtime.render().reload(); runtime.render().reload(); await flush(); assert.equal(calls, 2);
  resolveMovements(new Response(null, { status: 500 })); await flush();
  const result = runtime.render(); assert.equal(result.account.balance, 1300); assert.match(result.movementsError, /consultar/); assert.equal(result.loading, false);
  runtime.unmount();
});
test('fechamento cancela requests e ignora resposta tardia; nova conta usa estado novo', async () => {
  let late; let lateAccounts; let signal;
  global.fetch = async (url, options) => { signal = options.signal; return new Promise(resolve => { if (url.endsWith('/movements')) late = resolve; else lateAccounts = resolve; }); };
  const old = hookRuntime(); old.mount(); await flush(); old.unmount(); assert.equal(signal.aborted, true);
  global.fetch = async url => Response.json(url.endsWith('/movements') ? [movement] : [account]);
  const fresh = hookRuntime(); fresh.mount(); await flush();
  lateAccounts(Response.json([account])); late(Response.json([{ ...movement, amount: 9999 }])); await flush();
  assert.equal(fresh.render().movements[0].amount, -200); assert.equal(old.render().movements.length, 0);
  fresh.unmount();
});
test('conta ausente ou 404 encerra os dados; cancelamento durante token evita fetch', async () => {
  for (const missing of [true, false]) {
    global.fetch = async url => url.endsWith('/movements') ? (missing ? Response.json([]) : new Response(null, { status: 404 })) : Response.json(missing ? [] : [account]);
    const runtime = hookRuntime(); runtime.mount(); await flush(); assert.equal(runtime.render().unavailable, true); assert.equal(runtime.render().account, null); runtime.unmount();
  }
  let resolveToken; let calls = 0;
  const runtime = hookRuntime(); runtime.setGetter(() => new Promise(resolve => { resolveToken = resolve; }));
  global.fetch = async () => { calls++; return Response.json([]); };
  runtime.mount(); await flush(); runtime.unmount(); resolveToken('token'); await flush(); assert.equal(calls, 0);
});

test('falha no saldo preserva movimentações sem reaproveitar saldo anterior', async () => {
  global.fetch = async url => url.endsWith('/movements') ? Response.json([movement]) : new Response(null, { status: 502 });
  const runtime = hookRuntime(); runtime.mount(); await flush();
  const result = runtime.render(); assert.equal(result.account, null); assert.match(result.balanceError, /Saldo:/); assert.equal(result.movements.length, 1); assert.equal(result.movementsError, ''); runtime.unmount();
});
test('lista oferece Ver movimentações somente para conta corrente', () => {
  Module._load = function(id, ...args) {
    if (id === '@/types/account') return require('../types/account.ts');
    return originalLoad.call(this, id, ...args);
  };
  const html = renderToStaticMarkup(React.createElement(require('../components/AccountList.tsx').AccountList, {
    accounts: [account, { ...account, accountId: 'card', accountType: 'CREDIT_CARD' }, { ...account, accountId: 'inactive', active: false }],
    getAccessToken: async () => 'token', isLoading: false, error: '', success: '', updatingAccountStatusId: null, editingAccountId: null, onEdit() {}, onToggleStatus() {},
  }));
  assert.equal((html.match(/Ver movimentações/g) ?? []).length, 1);
});

test('lista encerra seção quando atualização confirma conta desativada ou ausente', () => {
  Module._load = function(id, ...args) {
    if (id === '@/types/account') return require('../types/account.ts');
    if (id === 'react') return { ...React, useState: () => [account, () => {}] };
    return originalLoad.call(this, id, ...args);
  };
  const path = require.resolve('../components/AccountList.tsx'); delete require.cache[path];
  const Component = require(path).AccountList;
  for (const accounts of [[], [{ ...account, active: false }]]) {
    const html = renderToStaticMarkup(React.createElement(Component, { accounts, getAccessToken: async () => 'token', isLoading: false, error: '', success: '', onEdit() {}, onToggleStatus() {} }));
    assert.match(html, /visualização foi encerrada/);
    assert.doesNotMatch(html, /Últimas 10 movimentações/);
  }
});

test('seção apresenta estorno com descrição e fallback traduzido, preservando crédito', () => {
  const reversal = { ...movement, origin: 'REVERSAL', amount: 454, description: 'Estorno de "Compras do mercado"' };
  const html = markup({ movements: [reversal] });
  assert.match(html, /Estorno de &quot;Compras do mercado&quot;/); assert.match(html, /\+/); assert.match(html, /454,00/); assert.doesNotMatch(html, /REVERSAL/);
  assert.match(markup({ movements: [{ ...reversal, description: undefined }] }), /Estorno/);
});

test('extrato usa consulta compartilhada de contas com sinal e ignora resultado após fechamento', async () => {
  let calls = 0;
  const loader = async (token, signal) => {
    calls++; assert.equal(token, 'token'); assert.ok(signal instanceof AbortSignal);
    return [{ ...account, balance: 1030 }];
  };
  global.fetch = async () => Response.json([movement]);
  const runtime = hookRuntime(loader); runtime.mount(); await flush();
  assert.equal(calls, 1); assert.equal(runtime.render().account.balance, 1030); runtime.unmount();
  let finish; let signal;
  const closed = hookRuntime((token, requestSignal) => { signal = requestSignal; return new Promise(resolve => { finish = resolve; }); });
  closed.mount(); await flush(); closed.unmount(); assert.equal(signal.aborted, true);
  finish([{ ...account, balance: 1030 }]); await flush(); assert.equal(closed.render().account, null);
});
