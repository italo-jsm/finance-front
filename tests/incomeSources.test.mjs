import { test, afterEach } from 'node:test';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
};
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const api = () => require('../lib/incomeSourcesApi.ts');
test('cadastro aceita 201 sem corpo e envia autenticação e payload', async () => {
  const payload = { name: 'Salário', type: 'SALARY', description: null };
  global.fetch = async (url, options) => {
    assert.ok(url.endsWith('/income-sources'));
    assert.equal(options.headers.Authorization, 'Bearer token');
    assert.deepEqual(JSON.parse(options.body), payload);
    assert.equal(options.method, 'POST');
    return new Response(null, { status: 201 });
  };
  await api().createIncomeSource(payload, 'token');
});
test('listagem e consulta retornam dados do servidor', async () => {
  const source = { id: 'abc', name: 'Salário', type: 'SALARY', description: null };
  global.fetch = async (url) => Response.json(url.endsWith('/abc') ? source : [source]);
  assert.deepEqual(await api().listIncomeSources('token'), [source]);
  assert.deepEqual(await api().getIncomeSource('abc', 'token'), source);
});
test('edição permite limpar descrição', async () => {
  const payload = { name: 'Salário', type: 'SALARY', description: null };
  global.fetch = async (url, options) => {
    assert.equal(options.method, 'PUT');
    assert.equal(JSON.parse(options.body).description, null);
    return Response.json({ id: 'abc', ...payload });
  };
  assert.equal((await api().updateIncomeSource('abc', payload, 'token')).description, null);
});
test('conflito preserva status e traduz mensagem', async () => {
  global.fetch = async () => Response.json({ code: 'INCOME_SOURCE_NAME_CONFLICT' }, { status: 409 });
  await assert.rejects(api().createIncomeSource({}, 'token'), error => error.status === 409 && /Já existe/.test(error.message));
});
test('erro não JSON recebe mensagem útil', async () => {
  global.fetch = async () => new Response('upstream error', { status: 502 });
  await assert.rejects(api().listIncomeSources('token'), /Não foi possível/);
});
test('fonte indisponível e sessão expirada preservam status', async () => {
  for (const status of [400, 401, 403, 404]) {
    global.fetch = async () => new Response(null, { status });
    await assert.rejects(api().getIncomeSource('abc', 'token'), error => error.status === status);
  }
});
