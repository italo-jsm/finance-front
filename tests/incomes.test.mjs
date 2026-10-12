import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
require.extensions['.ts'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, filename);
const originalFetch = global.fetch;
afterEach(() => { global.fetch = originalFetch; });
const form = () => require('../lib/incomeForm.ts');
const api = () => require('../lib/incomesApi.ts');
const values = { incomeSourceId: 'source-id', competence: '2026-09', amount: '500,25', expectedDate: '2026-10-05', accountId: 'account-id' };
test('renda mantém competência independente e envia apenas os cinco campos', () => {
  assert.deepEqual(form().buildIncomePayload({ ...values, receivedDate: '2026-10-12' }), { ...values, amount: 500.25 });
});
test('renda valida campos obrigatórios, calendário e valor positivo', () => {
  for (const field of Object.keys(values)) assert.throws(() => form().buildIncomePayload({ ...values, [field]: '' }));
  for (const expectedDate of ['2026-02-29', '2026-04-31', '2026-1-01', '0000-01-01']) assert.throws(() => form().buildIncomePayload({ ...values, expectedDate }));
  for (const competence of ['2026-13', '0000-01', '2026-1']) assert.throws(() => form().buildIncomePayload({ ...values, competence }));
  for (const amount of ['0', '-1', '1.234', '10000000000000']) assert.throws(() => form().buildIncomePayload({ ...values, amount }));
  assert.equal(form().buildIncomePayload({ ...values, expectedDate: '2028-02-29' }).expectedDate, '2028-02-29');
});
test('data de recebimento usa calendário local, mesmo após virada UTC', () => {
  const previousTZ = process.env.TZ;
  try {
    process.env.TZ = 'America/Sao_Paulo';
    assert.equal(form().getLocalDate(new Date('2026-10-13T01:30:00Z')), '2026-10-12');
  } finally { if (previousTZ === undefined) delete process.env.TZ; else process.env.TZ = previousTZ; }
});
test('cadastro de renda aceita 201 vazio com token e sem receivedDate', async () => {
  const payload = form().buildIncomePayload(values);
  global.fetch = async (url, options) => {
    assert.ok(url.endsWith('/incomes')); assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer token');
    assert.deepEqual(JSON.parse(options.body), payload);
    return new Response(null, { status: 201 });
  };
  await api().createIncome(payload, 'token');
});
test('consulta filtra mês previsto e propaga sinal de cancelamento', async () => {
  const controller = new AbortController();
  global.fetch = async (url, options) => {
    assert.equal(new URL(url).searchParams.get('month'), '2026-10');
    assert.equal(options.signal, controller.signal);
    return Response.json([{ id: 'income-id' }]);
  };
  assert.deepEqual(await api().listIncomes('2026-10', 'token', controller.signal), [{ id: 'income-id' }]);
});
test('edição usa PUT e receive envia somente a data informada', async () => {
  const payload = form().buildIncomePayload(values);
  let calls = 0;
  global.fetch = async (url, options) => {
    calls++;
    assert.equal(options.headers.Authorization, 'Bearer token');
    if (url.endsWith('/receive')) {
      assert.equal(options.method, 'POST'); assert.deepEqual(JSON.parse(options.body), { receivedDate: '2026-10-12' });
    } else { assert.ok(url.endsWith('/income-id')); assert.equal(options.method, 'PUT'); assert.deepEqual(JSON.parse(options.body), payload); }
    return Response.json({ id: 'income-id', ...payload, receivedDate: calls === 2 ? '2026-10-12' : null, status: calls === 2 ? 'RECEIVED' : 'PENDING' });
  };
  await api().updateIncome('income-id', payload, 'token');
  assert.equal((await api().receiveIncome('income-id', '2026-10-12', 'token')).status, 'RECEIVED');
  assert.equal(calls, 2);
});
test('falhas de receive, sessão e servidor são apresentadas sem resultado confirmado', async () => {
  for (const status of [400, 401, 403, 404, 500]) {
    global.fetch = async () => Response.json({ code: 'INCOME_ALREADY_RECEIVED' }, { status });
    await assert.rejects(api().receiveIncome('income-id', '2026-10-12', 'token'), error => error.status === status);
  }
  global.fetch = async () => new Response('upstream error', { status: 502 });
  await assert.rejects(api().listIncomes('2026-10', 'token'), /Não foi possível/);
  global.fetch = async () => { throw new TypeError('network'); };
  await assert.rejects(api().listIncomes('2026-10', 'token'), /conectar/);
});
