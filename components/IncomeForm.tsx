'use client';

import type { FormEvent } from 'react';
import type { AccountSummary } from '@/types/account';
import type { IncomeSource } from '@/types/incomeSource';
import type { IncomeFormValues } from '@/types/income';

type Props = {
  values: IncomeFormValues;
  accounts: AccountSummary[];
  sources: IncomeSource[];
  editing: boolean;
  disabled: boolean;
  submitting: boolean;
  error: string;
  onChange: (values: IncomeFormValues) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};
const fieldClass = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';

export function IncomeForm({ values, accounts, sources, editing, disabled, submitting, error, onChange, onSubmit, onCancel }: Props) {
  const checkingAccounts = accounts.filter(account => account.accountType === 'CHECKING_ACCOUNT');
  return (
    <form onSubmit={onSubmit} className="mt-4 space-y-4">
      <fieldset disabled={disabled} className="space-y-4 disabled:opacity-70">
        <div>
          <label htmlFor="income-source" className="block text-sm font-medium">Fonte de renda *</label>
          <select required id="income-source" value={values.incomeSourceId} onChange={event => onChange({ ...values, incomeSourceId: event.target.value })} className={fieldClass}>
            <option value="">Selecione</option>
            {sources.map(source => <option key={source.id} value={source.id}>{source.name}</option>)}
          </select>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="income-competence" className="block text-sm font-medium">Competência *</label>
            <input required id="income-competence" type="month" min="0001-01" max="9999-12" value={values.competence} onChange={event => onChange({ ...values, competence: event.target.value })} className={fieldClass} />
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Período ao qual a renda se refere, independente da previsão.</p>
          </div>
          <div>
            <label htmlFor="income-amount" className="block text-sm font-medium">Valor (R$) *</label>
            <input required id="income-amount" type="text" inputMode="decimal" value={values.amount} aria-describedby="income-amount-help" onChange={event => onChange({ ...values, amount: event.target.value })} placeholder="Ex: 500,00" className={fieldClass} />
            <p id="income-amount-help" className="mt-1 text-sm text-slate-500 dark:text-slate-400">Use vírgula ou ponto decimal, sem separadores de milhar.</p>
          </div>
          <div>
            <label htmlFor="income-expected-date" className="block text-sm font-medium">Data prevista *</label>
            <input required id="income-expected-date" type="date" min="0001-01-01" max="9999-12-31" value={values.expectedDate} onChange={event => onChange({ ...values, expectedDate: event.target.value })} className={fieldClass} />
          </div>
          <div>
            <label htmlFor="income-account" className="block text-sm font-medium">Conta corrente de destino *</label>
            <select required id="income-account" value={values.accountId} onChange={event => onChange({ ...values, accountId: event.target.value })} className={fieldClass}>
              <option value="">Selecione</option>
              {checkingAccounts.map(account => <option key={account.accountId} value={account.accountId}>{account.name}{account.active === false ? ' (inativa)' : ''}</option>)}
            </select>
          </div>
        </div>
      </fieldset>
      {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={disabled} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{submitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar recebimento'}</button>
        {editing && <button type="button" disabled={submitting} onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 dark:border-slate-700 disabled:opacity-60">Cancelar edição</button>}
      </div>
    </form>
  );
}
