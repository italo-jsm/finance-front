'use client';
import { useState, type FormEvent } from 'react';
import type { Expense } from '../types/expense';
import type { AccountSummary } from '../types/account';
import { localToday, paymentMethods, validateExpensePayment, type ExpensePaymentPayload } from '../lib/expensePayment';
export function ExpensePaymentForm({ expense, accounts, busy, error, onSubmit, onCancel }: {
  expense: Expense; accounts: AccountSummary[]; busy: boolean; error: string;
  onSubmit: (payload: ExpensePaymentPayload) => void; onCancel: () => void;
}) {
  const [payload, setPayload] = useState<ExpensePaymentPayload>({ paidFromAccountId: '', paymentDate: localToday(), paymentMethod: '' });
  const [validation, setValidation] = useState('');
  const available = accounts.filter(a => a.accountType === 'CHECKING_ACCOUNT' && a.active !== false);
  function submit(event: FormEvent) {
    event.preventDefault();
    const message = validateExpensePayment(payload, accounts); setValidation(message);
    if (!message && !busy) onSubmit(payload);
  }
  const inputClass = 'mt-1 w-full rounded-md border border-slate-400 bg-white p-2 text-slate-900 dark:bg-slate-900 dark:text-slate-100';
  return <section aria-label="Registrar pagamento" className="mb-6 rounded-xl border border-emerald-600 bg-white p-4 dark:bg-slate-800">
    <h2 className="text-lg font-semibold">Registrar pagamento — {expense.description}</h2>
    <p>Valor integral: {expense.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
    <form onSubmit={submit} className="mt-4 space-y-3">
      <fieldset disabled={busy} className="space-y-3">
        <label className="block">Conta corrente<select required className={inputClass} value={payload.paidFromAccountId} onChange={e => setPayload({ ...payload, paidFromAccountId: e.target.value })}>
          <option value="">Selecione a conta</option>{available.map(a => <option key={a.accountId} value={a.accountId}>{a.name}</option>)}
        </select></label>
        {!available.length && <p role="alert">Para pagar, cadastre ou ative uma conta corrente.</p>}
        <label className="block">Data do pagamento<input required type="date" min="0001-01-01" max="9999-12-31" className={inputClass} value={payload.paymentDate} onChange={e => setPayload({ ...payload, paymentDate: e.target.value })} /></label>
        <label className="block">Forma de pagamento<select required className={inputClass} value={payload.paymentMethod} onChange={e => setPayload({ ...payload, paymentMethod: e.target.value })}>
          <option value="">Selecione a forma</option>{Object.entries(paymentMethods).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select></label>
      </fieldset>
      {(validation || error) && <p role="alert" className="text-red-700 dark:text-red-300">{validation || error}</p>}
      <div className="flex gap-3">
        <button type="submit" disabled={busy || !available.length} className="rounded-md bg-emerald-700 px-4 py-2 text-white disabled:opacity-60">{busy ? 'Registrando pagamento…' : 'Confirmar pagamento'}</button>
        <button type="button" disabled={busy} onClick={onCancel} className="rounded-md border px-4 py-2 disabled:opacity-60">Cancelar</button>
      </div>
    </form>
  </section>;
}
