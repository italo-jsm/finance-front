'use client';
import type { FormEvent } from 'react';
import { incomeSourceTypeLabels, type IncomeSourceFormValues } from '@/types/incomeSource';
type Props = { values: IncomeSourceFormValues; onChange: (values: IncomeSourceFormValues) => void; onSubmit: (event: FormEvent<HTMLFormElement>) => void; onCancel: () => void; editing: boolean; submitting: boolean; error: string };
const fieldClass = 'mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100';
export function IncomeSourceForm({ values, onChange, onSubmit, onCancel, editing, submitting, error }: Props) {
  return <form onSubmit={onSubmit} className="mt-4 space-y-4">
    <fieldset disabled={submitting} className="space-y-4 disabled:opacity-70">
      <div><label htmlFor="income-source-name" className="block text-sm font-medium">Nome *</label><input required id="income-source-name" value={values.name} onChange={event => onChange({ ...values, name: event.target.value })} placeholder="Ex: Salário PJ" className={fieldClass} /></div>
      <div><label htmlFor="income-source-type" className="block text-sm font-medium">Tipo *</label><select required id="income-source-type" value={values.type} onChange={event => onChange({ ...values, type: event.target.value as IncomeSourceFormValues['type'] })} className={fieldClass}><option value="">Selecione</option>{Object.entries(incomeSourceTypeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="income-source-day" className="block text-sm font-medium">Dia previsto do recebimento *</label>
          <input required id="income-source-day" type="number" min={1} max={31} step={1} value={values.expectedDay} onChange={event => onChange({ ...values, expectedDay: event.target.value })} placeholder="Ex: 10" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="income-source-amount" className="block text-sm font-medium">Valor estimado (R$) *</label>
          <input required id="income-source-amount" type="text" inputMode="decimal" aria-describedby="income-source-amount-help" value={values.estimatedAmount} onChange={event => onChange({ ...values, estimatedAmount: event.target.value })} placeholder="Ex: 7500,00" className={fieldClass} />
          <p id="income-source-amount-help" className="mt-1 text-sm text-slate-600 dark:text-slate-300">Use vírgula ou ponto decimal, sem separadores de milhar. Ex: 7500,00.</p>
        </div>
      </div>
      <div><label htmlFor="income-source-description" className="block text-sm font-medium">Descrição (opcional)</label><textarea id="income-source-description" rows={3} value={values.description} onChange={event => onChange({ ...values, description: event.target.value })} className={fieldClass} /></div>
    </fieldset>
    {error && <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>}
    <div className="flex flex-wrap gap-2"><button type="submit" disabled={submitting} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{submitting ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar fonte de renda'}</button><button type="button" disabled={submitting} onClick={onCancel} className="rounded-lg border border-slate-300 px-4 py-2 dark:border-slate-700 disabled:opacity-60">Cancelar</button></div>
  </form>;
}
