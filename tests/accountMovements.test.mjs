import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS } }).outputText, filename);
const api = () => require('../lib/accountMovementsApi.ts');
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
test('consultas usam GET, token, sinal e conta escapada sem parâmetros inventados', async () => {
  const signal = new AbortController().signal;
  const paths = [];
  global.fetch = async (url, options) => {
    paths.push(new URL(url).pathname);
    assert.equal(options.headers.Authorization, 'Bearer token');
    assert.equal(options.signal, signal);
    assert.equal(options.method, 'GET');
    assert.equal(new URL(url).search, '');
    return Response.json([]);
  };
  assert.deepEqual(await api().listMovementAccounts('token', signal), []);
  assert.deepEqual(await api().listAccountMovements('a/b', 'token', signal), []);
  assert.deepEqual(paths, ['/accounts', '/accounts/a%2Fb/movements']);
});
test('seleciona 10 por data decrescente, empata invertendo resposta e não altera entrada', () => {
  const items = Array.from({ length: 12 }, (_, i) => ({ id: String(i), date: i < 2 ? '2026-09-30' : '2026-10-01', amount: i }));
  const copy = structuredClone(items);
  assert.deepEqual(api().latestMovements(items).map(x => x.id), ['11','10','9','8','7','6','5','4','3','2']);
  assert.deepEqual(items, copy);
  assert.deepEqual(api().latestMovements([]), []);
  assert.equal(api().latestMovements(items.slice(0, 3)).length, 3);
});
test('saldo vem do servidor independente do total das movimentações', async () => {
  global.fetch = async () => Response.json([{ accountId: 'a', balance: -200 }]);
  assert.equal((await api().listMovementAccounts('token'))[0].balance, -200);
});
test('falhas HTTP preservam status e rede oferece nova tentativa', async () => {
  for (const status of [400, 401, 403, 404, 502]) {
    global.fetch = async () => new Response('upstream', { status });
    await assert.rejects(api().listAccountMovements('a', 'token'), error => error.status === status && error.message.length > 0);
  }
  global.fetch = async () => { throw new TypeError('offline'); };
  await assert.rejects(api().listMovementAccounts('token'), /conectar/);
});

test('estorno usa descrição do débito original mesmo fora das últimas dez e não expõe ID técnico', () => {
  const debit = { id: 'debit', accountId: 'a', origin: 'PAYMENT', date: '2026-09-01', amount: -454, description: 'Compras do mercado' };
  const reversal = { id: 'reversal', accountId: 'a', origin: 'REVERSAL', originId: 'debit', date: '2026-10-12', amount: 454, description: 'Estorno da transação debit' };
  const movements = [debit, ...Array.from({ length: 10 }, (_, i) => ({ ...debit, id: `other-${i}`, date: '2026-10-01' })), reversal];
  const items = api().latestMovements(movements);
  assert.equal(items.length, 10); assert.equal(items[0].description, 'Estorno de "Compras do mercado"');
  assert.equal(reversal.description, 'Estorno da transação debit');
  assert.equal(api().latestMovements([{ ...reversal, originId: 'missing' }])[0].description, 'Estorno');
  assert.equal(api().latestMovements([{ ...debit, accountId: 'b' }, reversal])[0].description, 'Estorno');
});
