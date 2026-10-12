import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
const originalLoad = Module._load, originalFetch = global.fetch, originalWindow = global.window;
afterEach(() => { Module._load = originalLoad; global.fetch = originalFetch; global.window = originalWindow; });
test('POST sem corpo usa ID da despesa, token e aceita 204 vazio', async () => {
  global.fetch = async (url, options) => {
    assert.ok(url.endsWith('/expenses/a%2Fb/reverse'));
    assert.equal(options.method, 'POST'); assert.equal(options.headers.Authorization, 'Bearer token'); assert.equal(options.body, undefined);
    return new Response(null, { status: 204 });
  };
  await require('../lib/expenseReversalApi.ts').reverseExpense('a/b', 'token');
});
test('HTTP mantém status e falha de rede exige atualização', async () => {
  const { reverseExpense } = require('../lib/expenseReversalApi.ts');
  for (const status of [400, 404, 401, 500]) {
    global.fetch = async () => new Response(null, { status });
    await assert.rejects(reverseExpense('a', 't'), e => e.status === status);
  }
  global.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(reverseExpense('a', 't'), /Atualize/);
});
const expense = { expenseId: 'e', description: 'Mercado', value: 200, canReverse: true };
function runtime(refresh = async () => {}) {
  const slots = []; let cursor;
  const hooks = {
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], v => { slots[i] = typeof v === 'function' ? v(slots[i]) : v; }]; },
    useRef(initial) { return slots[cursor++] ??= { current: initial }; },
    useEffect() {},
  };
  Module._load = function(id, ...args) { return id === 'react' ? hooks : originalLoad.call(this, id, ...args); };
  const path = require.resolve('../hooks/useExpenseReversal.ts'); delete require.cache[path];
  const hook = require(path).useExpenseReversal;
  global.window = { confirm: () => true };
  return () => { cursor = 0; return hook(async () => 'token', refresh); };
}
test('inelegíveis e cancelamento não enviam POST', async () => {
  let calls = 0; global.fetch = async () => { calls++; return new Response(null, { status: 204 }); };
  const render = runtime();
  for (const change of [{ canReverse: false }, { canReverse: undefined }, { expenseId: undefined }, { reversedDate: '2026-10-12' }]) await render().reverse({ ...expense, ...change });
  global.window.confirm = () => false; await render().reverse(expense); assert.equal(calls, 0);
});
test('bloqueia clique síncrono duplicado e estorno confirmado mesmo com consulta falhando', async () => {
  let calls = 0, refreshes = 0, finish;
  global.fetch = () => { calls++; return new Promise(resolve => { finish = resolve; }); };
  const render = runtime(async () => { refreshes++; throw new Error('consulta'); });
  const first = render().reverse(expense); const duplicate = render().reverse(expense);
  await new Promise(resolve => setImmediate(resolve)); assert.equal(calls, 1); assert.equal(render().busyId, 'e');
  finish(new Response(null, { status: 204 })); await Promise.all([first, duplicate]);
  assert.match(render().message, /concluído.*atualiz/); assert.ok(render().blockedIds.has('e'));
  await render().reload(); await render().reverse(expense); assert.equal(calls, 1); assert.equal(refreshes, 2);
});
test('400/404 reconciliam e erro de rede bloqueia até consulta bem-sucedida', async () => {
  for (const status of [400, 404]) {
    let refreshes = 0; global.fetch = async () => new Response(null, { status });
    const render = runtime(async () => { refreshes++; }); await render().reverse(expense);
    assert.equal(refreshes, 1); assert.match(render().message, /estornada|disponível/);
  }
  let fail = true, calls = 0;
  global.fetch = async () => { calls++; throw new TypeError('offline'); };
  const render = runtime(async () => { if (fail) throw new Error('offline'); });
  await render().reverse(expense); assert.ok(render().blockedIds.has('e'));
  await render().reload(); assert.ok(render().blockedIds.has('e'));
  await render().reverse(expense); assert.equal(calls, 1);
  fail = false; await render().reload(); assert.equal(render().blockedIds.has('e'), false);
});
