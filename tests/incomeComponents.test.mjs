import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import ts from 'typescript';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
require.extensions['.tsx'] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
const { createElement } = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const accounts = [{ accountId: 'checking', name: 'Corrente', accountType: 'CHECKING_ACCOUNT' }, { accountId: 'card', name: 'Cartão', accountType: 'CREDIT_CARD' }];
const sources = [{ id: 'source', name: 'Salário' }];
const pending = { id: 'pending', incomeSourceId: 'source', accountId: 'checking', competence: '2026-09', amount: 500, expectedDate: '2026-10-05', receivedDate: null, status: 'PENDING' };
const list = props => renderToStaticMarkup(createElement(require('../components/IncomeList.tsx').IncomeList, { incomes: [pending], accounts, sources, loading: false, error: '', receivingId: null, disabled: false, onReceive() {}, onEdit() {}, ...props }));
test('listagem apresenta competência, previsão, saldo de renda e checkbox pendente', () => {
  const html = list({});
  assert.match(html, /09\/2026/); assert.match(html, /05\/10\/2026/); assert.match(html, /Salário/); assert.match(html, /Corrente/);
  assert.match(html, /type="checkbox"/); assert.doesNotMatch(html, /checked=""/);
  assert.match(html, /Editar/); assert.match(html, /Pendente/);
});
test('recebido permanece marcado, desabilitado e sem botão editar', () => {
  const html = list({ incomes: [{ ...pending, receivedDate: '2026-10-12', status: 'RECEIVED' }] });
  assert.match(html, /checked=""/); assert.match(html, /disabled=""/); assert.doesNotMatch(html, />Editar</);
  assert.match(html, /12\/10\/2026/);
});
test('requisição em andamento desabilita checkbox sem marcar antecipadamente', () => {
  const html = list({ receivingId: 'pending', disabled: true });
  assert.match(html, /disabled=""/); assert.doesNotMatch(html, /checked=""/); assert.match(html, /Confirmando/);
});
test('listagem informa carregamento, falha e ausência de registros', () => {
  assert.match(list({ incomes: [], loading: true }), /Carregando/);
  assert.match(list({ incomes: [], error: 'Falha na consulta' }), /role="alert"/);
  assert.match(list({ incomes: [] }), /Nenhum recebimento/);
});
test('formulário oferece apenas conta corrente e mantém campos obrigatórios', () => {
  const html = renderToStaticMarkup(createElement(require('../components/IncomeForm.tsx').IncomeForm, {
    values: { incomeSourceId: '', accountId: '', competence: '', amount: '', expectedDate: '' },
    accounts, sources, editing: false, disabled: false, submitting: false, error: '', onChange() {}, onSubmit() {}, onCancel() {},
  }));
  assert.match(html, /Corrente/); assert.doesNotMatch(html, /Cartão/);
  assert.equal((html.match(/required=""/g) ?? []).length, 5);
  assert.match(html, /Salvar recebimento/);
});
