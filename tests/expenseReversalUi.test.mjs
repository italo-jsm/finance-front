import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire, Module } from 'node:module';
import ts from 'typescript';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
for (const ext of ['.ts', '.tsx']) require.extensions[ext] = (module, filename) => module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText, filename);
const React = require('react'); const { renderToStaticMarkup } = require('react-dom/server');
const originalLoad = Module._load;
afterEach(() => { Module._load = originalLoad; });
const expense = { expenseId: 'e', date: '2026-10-10', description: 'Mercado', value: 200, category: 'OTHER', installments: 1, accountId: 'a', accountName: 'Banco', canReverse: true };
function markup(history, changes = {}, props = {}) {
  Module._load = function(id, ...args) {
    if (id.startsWith('@/')) return require(`../${id.slice(2)}`);
    if (id === 'react' && history) {
      let index = 0;
      return { ...React, useState: initial => [index++ === 4 ? 'asc' : initial, () => {}] };
    }
    return originalLoad.call(this, id, ...args);
  };
  const path = require.resolve(history ? '../components/ExpenseHistoryTable.tsx' : '../components/ExpenseList.tsx'); delete require.cache[path];
  const C = history ? require(path).ExpenseHistoryTable : require(path).ExpenseList;
  return renderToStaticMarkup(React.createElement(C, { expenses: [{ ...expense, ...changes }], accounts: [], isLoading: false, error: '', hasSearched: true, onSearch() {}, onEdit() {}, onDelete() {}, onReverse() {}, reversingId: null, reversalBlockedIds: new Set(), ...props }));
}
test('as duas listas oferecem ação apenas para elegíveis; histórico cobre cartões e tabela', () => {
  for (const history of [false, true]) {
    assert.equal((markup(history).match(/>Estornar</g) ?? []).length, history ? 2 : 1);
    for (const changes of [{ canReverse: false }, { canReverse: undefined }, { expenseId: undefined }]) assert.doesNotMatch(markup(history, changes), />Estornar</);
  }
});
test('estornadas mostram data sem fuso, destaque claro/escuro e valor original', () => {
  for (const history of [false, true]) {
    const html = markup(history, { reversedDate: '2026-10-12', canReverse: false });
    assert.match(html, /Estornada em 12\/10\/2026/); assert.match(html, /bg-amber-50/); assert.match(html, /dark:bg-amber-950/); assert.match(html, /200.00/); assert.doesNotMatch(html, />Estornar</);
  }
});
test('processamento e reconciliação bloqueiam controles sem inventar data de estorno', () => {
  for (const history of [false, true]) {
    assert.match(markup(history, {}, { reversingId: 'e' }), /Estornando…/);
    const blocked = markup(history, {}, { reversalBlockedIds: new Set(['e']) });
    assert.match(blocked, /disabled=""/); assert.doesNotMatch(blocked, /Estornada em/);
  }
});
