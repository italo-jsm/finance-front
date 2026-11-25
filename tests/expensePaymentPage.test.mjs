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

test('salvamento confirma após o POST, mesmo com a atualização da lista pendente ou indisponível', async () => {
  let completeSave;
  let completeRecent;
  let saves = 0;
  global.fetch = async (url, options) => {
    if (options?.method === 'POST') {
      saves++;
      return new Promise(resolve => { completeSave = resolve; });
    }
    if (url.includes('/expenses')) {
      if (saves) return new Promise(resolve => { completeRecent = resolve; });
      return Response.json({ expenses: [bill] });
    }
    return Response.json([account(1000)]);
  };

  const previousWindow = global.window;
  global.window = { setTimeout, clearTimeout };
  try {
    const r = runtime(); await r.settle(); r.menu('transactions'); await r.settle();
    assert.equal(r.props('ExpenseModal'), undefined);
    const filters = { ...r.props('ExpenseList').filters, accountId: 'a' };
    r.props('ExpenseList').onApplyFilters(filters);
    r.props('ExpenseList').onNewExpense();
    r.render();
    assert.equal(r.props('ExpenseModal').open, true);
    const form = r.props('ExpenseForm');
    form.setExpense({ ...form.expense, description: 'Mercado', value: 12.90, accountId: 'a' });
    r.render();
    const event = { preventDefault() {} };
    const submit = r.props('ExpenseForm').onSubmit;
    const saving = submit(event);
    await submit(event);
    assert.equal(saves, 1);
    r.render();
    assert.equal(r.props('ExpenseForm').submission, 'saving');

    completeSave(new Response(null, { status: 204 }));
    await saving;
    r.render();
    assert.equal(r.props('ExpenseForm'), undefined);
    assert.equal(r.props('ExpenseModal'), undefined);
    assert.equal(r.props('ExpenseList').feedback.props.children.props.children[0].props.children, 'Despesa salva');
    assert.deepEqual(r.props('ExpenseList').filters, filters);
    assert.equal(r.props('ExpenseList').isLoading, true);
    assert.equal(r.props('ExpenseList').expenses.length, 1);

    completeRecent(new Response(null, { status: 503 }));
    await r.settle();
    assert.equal(r.props('ExpenseForm'), undefined);
    assert.match(r.props('ExpenseList').error, /atualizar/);
    assert.equal(r.props('ExpenseList').expenses.length, 1);
    r.unmount();
  } finally {
    global.window = previousWindow;
  }
});

test('rejeição e resultado incerto preservam o formulário e o resultado incerto bloqueia reenvio direto', async () => {
  const previousWindow = global.window;
  global.window = { setTimeout, clearTimeout };
  let saves = 0;
  global.fetch = async (url, options) => {
    if (options?.method === 'POST') {
      if (++saves === 1) return Response.json({ message: 'Conta indisponível' }, { status: 422 });
      throw new TypeError('Conexão interrompida');
    }
    return Response.json(url.includes('/expenses') ? { expenses: [] } : [account(1000)]);
  };

  try {
    const r = runtime(); await r.settle(); r.menu('transactions'); await r.settle();
    assert.equal(r.props('ExpenseModal'), undefined);
    r.props('ExpenseList').onNewExpense();
    r.render();
    assert.equal(r.props('ExpenseModal').open, true);
    const form = r.props('ExpenseForm');
    const draft = { ...form.expense, description: 'Mercado', value: 12.90, accountId: 'a' };
    form.setExpense(draft);
    const event = { preventDefault() {} };
    r.render();
    await r.props('ExpenseForm').onSubmit(event);
    r.render();
    assert.equal(r.props('ExpenseForm').submission, 'error');
    assert.equal(r.props('ExpenseForm').submitError, 'Conta indisponível');
    assert.deepEqual(r.props('ExpenseForm').expense, draft);

    await r.props('ExpenseForm').onSubmit(event);
    r.render();
    assert.equal(r.props('ExpenseForm').submission, 'uncertain');
    assert.deepEqual(r.props('ExpenseForm').expense, draft);
    await r.props('ExpenseForm').onSubmit(event);
    assert.equal(saves, 2);
    r.props('ExpenseForm').onReviewRecent();
    r.render();
    assert.equal(r.props('ExpenseModal').open, false);
    assert.equal(r.props('ExpenseList').reviewDate, draft.date);
    r.props('ExpenseList').onReturnToDraft();
    r.render();
    assert.equal(r.props('ExpenseModal').open, true);
    assert.deepEqual(r.props('ExpenseForm').expense, draft);
    r.unmount();
  } finally {
    global.window = previousWindow;
  }
});

test('alterar o período preserva a lista durante a consulta e descarta respostas de filtros anteriores', async () => {
  const pending = new Map();
  global.fetch = async (url) => {
    if (!url.includes('/expenses')) return Response.json([account(1000)]);
    const from = new URL(url).searchParams.get('beginDate');
    if (from === '2020-01-01' || from === '2021-01-01') {
      return new Promise(resolve => pending.set(from, { url, resolve }));
    }
    return Response.json({ expenses: [bill] });
  };

  const r = runtime();
  await r.settle();
  r.menu('transactions');
  await r.settle();
  const original = r.props('ExpenseList');
  original.onApplyFilters({ ...original.filters, dateFrom: '2020-01-01', dateTo: '2020-01-15' });
  await r.settle();
  assert.equal(r.props('ExpenseList').isLoading, true);
  assert.equal(r.props('ExpenseList').expenses[0].expenseId, bill.id);

  const list = r.props('ExpenseList');
  list.onApplyFilters({ ...list.filters, dateFrom: '2021-01-01', dateTo: '2021-01-15', accountId: 'a' });
  await r.settle();
  const latest = pending.get('2021-01-01');
  assert.equal(new URL(latest.url).searchParams.get('endDate'), '2021-01-15');
  latest.resolve(Response.json({ expenses: [{ ...bill, id: 'latest-period', accountId: 'a' }] }));
  await r.settle();
  pending.get('2020-01-01').resolve(Response.json({ expenses: [{ ...bill, id: 'old-period' }] }));
  await r.settle();
  assert.equal(r.props('ExpenseList').expenses[0].expenseId, 'latest-period');
  assert.equal(r.props('ExpenseList').filters.accountId, 'a');
  r.unmount();
});

test('o modal cancela um formulário vazio e só descarta um rascunho preenchido após confirmação', async () => {
  global.fetch = async url => Response.json(url.includes('/expenses') ? { expenses: [bill] } : [account(1000)]);
  const r = runtime();
  await r.settle();
  r.menu('transactions');
  await r.settle();
  const list = r.props('ExpenseList');
  const filters = { ...list.filters, accountId: 'a' };
  list.onApplyFilters(filters);
  list.onNewExpense();
  r.render();
  r.props('ExpenseModal').onRequestDismiss();
  r.render();
  assert.equal(r.props('ExpenseModal'), undefined);

  r.props('ExpenseList').onNewExpense();
  r.render();
  const form = r.props('ExpenseForm');
  form.setExpense({ ...form.expense, description: 'Rascunho' });
  r.render();
  r.props('ExpenseForm').onCancel();
  r.render();
  assert.equal(r.props('ExpenseModal').confirmDiscard, true);
  r.props('ExpenseModal').onContinueEditing();
  r.render();
  assert.equal(r.props('ExpenseForm').expense.description, 'Rascunho');
  r.props('ExpenseModal').onRequestDismiss();
  r.render();
  r.props('ExpenseModal').onDismiss();
  r.render();
  assert.equal(r.props('ExpenseModal'), undefined);
  assert.deepEqual(r.props('ExpenseList').filters, filters);

  r.props('ExpenseList').onEdit(0);
  r.render();
  assert.equal(r.props('ExpenseModal').title, 'Editar despesa');
  assert.equal(r.props('ExpenseForm').expense.expenseId, bill.id);
  r.unmount();
});

test('nova conta usa o modal e confirma a gravação enquanto a lista atualiza em segundo plano', async () => {
  let finishRefresh;
  let saved = false;
  global.fetch = async (url, options) => {
    if (url.includes('/expenses')) return Response.json({ expenses: [] });
    if (options?.method === 'POST') {
      saved = true;
      assert.equal(JSON.parse(options.body).name, 'Nova conta');
      return new Response(null, { status: 204 });
    }
    return saved ? new Promise(resolve => { finishRefresh = resolve; }) : Response.json([account(1000)]);
  };

  const r = runtime();
  await r.settle();
  r.menu('accounts');
  await r.settle();
  assert.equal(r.props('RecordFormModal'), undefined);
  r.props('AccountList').onCreate();
  r.render();
  const modal = r.props('RecordFormModal');
  assert.equal(modal.title, 'Nova conta');
  modal.children(modal.onDismiss).props.setAccount({ name: 'Nova conta', accountType: 'CHECKING_ACCOUNT', initialBalance: '0', closingDay: '', dueDay: '' });
  r.render();
  assert.equal(r.props('RecordFormModal').dirty, true);
  const form = r.props('RecordFormModal').children(() => {});
  await form.props.onSubmit({ preventDefault() {} });
  r.render();
  assert.equal(r.props('RecordFormModal'), undefined);
  assert.match(r.props('AccountList').success, /Conta salva/);
  assert.equal(r.props('AccountList').isLoading, true);
  assert.equal(r.props('AccountList').accounts.length, 1);
  finishRefresh(Response.json([account(1000)]));
  await r.settle();
  r.unmount();
});

test('salvar conta fixa fora do período inclui a despesa na consulta e abre o mês em Vencimentos', async () => {
  const previousWindow = global.window;
  global.window = { setTimeout, clearTimeout };
  const fixed = { accountId: 'f', name: 'Luz', accountType: 'FIXED_BILL', dueDay: 15 };
  let saved = false;
  global.fetch = async (url, options) => {
    if (options?.method === 'POST') {
      assert.equal(JSON.parse(options.body).dueDate, '2026-12-10');
      assert.equal(JSON.parse(options.body).eventDate, bill.expenseDate);
      saved = true;
      return new Response(null, { status: 201 });
    }
    if (url.endsWith('/accounts')) return Response.json([fixed]);
    const query = new URL(url).searchParams;
    const includesDate = query.get('beginDate') <= bill.expenseDate && query.get('endDate') >= bill.expenseDate;
    return Response.json({ expenses: saved && includesDate ? [bill] : [] });
  };

  try {
    const r = runtime();
    await r.settle();
    r.menu('transactions');
    await r.settle();
    const filters = { ...r.props('ExpenseList').filters, dateFrom: '2026-11-01', dateTo: '2026-11-07' };
    r.props('ExpenseList').onApplyFilters(filters);
    r.props('ExpenseList').onNewExpense();
    r.render();
    const form = r.props('ExpenseForm');
    form.setExpense({ ...form.expense, date: bill.expenseDate, dueDate: '2026-12-10', description: bill.description, value: bill.amount, accountId: fixed.accountId });
    r.render();
    await r.props('ExpenseForm').onSubmit({ preventDefault() {} });
    await r.settle();

    assert.deepEqual(r.props('ExpenseList').expenses.map(expense => expense.expenseId), [bill.id]);
    assert.deepEqual(r.props('ExpenseList').filters, { ...filters, dateFrom: bill.expenseDate });
    r.menu('dueDates');
    assert.deepEqual(r.props('DueDatesSection').initialPeriod, { start: '2026-12-01', end: '2026-12-31' });
    r.unmount();
  } finally {
    global.window = previousWindow;
  }
});
