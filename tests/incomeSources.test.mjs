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
  const payload = { name: 'Salário', type: 'SALARY', description: null, expectedDay: 10, estimatedAmount: 7500.25 };
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
  const source = { id: 'abc', name: 'Salário', type: 'SALARY', description: null, expectedDay: 10, estimatedAmount: 7500.25 };
  global.fetch = async (url) => Response.json(url.endsWith('/abc') ? source : [source]);
  assert.deepEqual(await api().listIncomeSources('token'), [source]);
  assert.deepEqual(await api().getIncomeSource('abc', 'token'), source);
});
test('edição permite limpar descrição', async () => {
  const payload = { name: 'Salário', type: 'SALARY', description: null, expectedDay: 10, estimatedAmount: 7500.25 };
  global.fetch = async (url, options) => {
    assert.equal(options.method, 'PUT');
    assert.equal(JSON.parse(options.body).description, null);
    assert.equal(JSON.parse(options.body).expectedDay, 10);
    assert.equal(JSON.parse(options.body).estimatedAmount, 7500.25);
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

const form = () => require('../lib/incomeSourceForm.ts');
const validForm = { name: ' Salário ', type: 'SALARY', description: '', expectedDay: '10', estimatedAmount: '7500,25' };
test('formulário produz dia e valor numéricos e mantém centavos', () => {
  assert.deepEqual(form().buildIncomeSourcePayload(validForm), {
    name: 'Salário', type: 'SALARY', description: null, expectedDay: 10, estimatedAmount: 7500.25,
  });
  assert.equal(form().buildIncomeSourcePayload({ ...validForm, estimatedAmount: '0.01' }).estimatedAmount, 0.01);
});
test('dia previsto aceita limites 1 e 31 e rejeita ausência e valores inválidos', () => {
  for (const day of ['1', '31']) assert.equal(form().buildIncomeSourcePayload({ ...validForm, expectedDay: day }).expectedDay, Number(day));
  for (const day of ['', '0', '32', '-1', '1.5', '1e1', 'abc']) {
    assert.throws(() => form().buildIncomeSourcePayload({ ...validForm, expectedDay: day }), /dia/i);
  }
});
test('valor estimado rejeita ausência, zero, negativos e precisão inválida', () => {
  for (const amount of ['', '0', '0,00', '-1', '1.234', '1,234', 'Infinity', '1e3', '1.000,50', '9007199254740992', '90071992547400.09']) {
    assert.throws(() => form().buildIncomeSourcePayload({ ...validForm, estimatedAmount: amount }), /valor/i);
  }
});
test('edição preenche os campos recebidos e preserva registros antigos sem estimativa', () => {
  assert.deepEqual(form().incomeSourceToForm({ id: 'abc', name: 'Salário', type: 'SALARY', description: null, expectedDay: 31, estimatedAmount: 1234.56 }), {
    name: 'Salário', type: 'SALARY', description: '', expectedDay: '31', estimatedAmount: '1234.56',
  });
  const legacy = form().incomeSourceToForm({ id: 'abc', name: 'Salário', type: 'SALARY', description: null, expectedDay: null, estimatedAmount: null });
  assert.equal(legacy.expectedDay, ''); assert.equal(legacy.estimatedAmount, '');
});
test('servidor identifica erros de dia e valor com mensagens específicas', async () => {
  for (const code of ['INCOME_SOURCE_EXPECTED_DAY_REQUIRED', 'INCOME_SOURCE_EXPECTED_DAY_INVALID', 'INCOME_SOURCE_ESTIMATED_AMOUNT_REQUIRED', 'INCOME_SOURCE_ESTIMATED_AMOUNT_INVALID']) {
    global.fetch = async () => Response.json({ code }, { status: 400 });
    await assert.rejects(api().createIncomeSource({}, 'token'), error => error.code === code && (code.includes('DAY') ? /dia/i : /valor/i).test(error.message));
  }
});
