'use client';
import { incomeSourceTypeLabels, type IncomeSource } from '@/types/incomeSource';
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
type Props = { sources: IncomeSource[]; loading: boolean; error: string; onRetry: () => void; onEdit: (id: string) => void; filtered?: boolean; editDisabled?: boolean };
export function IncomeSourceList({ sources, loading, error, onRetry, onEdit, filtered, editDisabled }: Props) {
  return <>
    {loading && <p role="status" className="pt-4 text-sm">Atualizando fontes de renda…</p>}
    {error && <div role="alert" className="space-y-3 py-4"><p className="text-red-700 dark:text-red-300">{error}</p><button type="button" onClick={onRetry} className="min-h-11 rounded-lg border px-4">Tentar novamente</button></div>}
    {!loading && !error && !sources.length && <p className="py-6 text-slate-600 dark:text-slate-300">{filtered ? 'Nenhuma fonte encontrada com esses filtros.' : 'Nenhuma fonte de renda cadastrada.'}</p>}
    {sources.length > 0 && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{sources.length} {sources.length === 1 ? 'fonte de renda' : 'fontes de renda'}</p>}
    {sources.length > 0 && <ul className="mt-4 space-y-3">{sources.map(source => <li key={source.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0"><h3 className="break-words font-semibold">{source.name}</h3><p className="text-sm text-slate-600 dark:text-slate-300">{incomeSourceTypeLabels[source.type] ?? source.type}</p><dl className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <div><dt className="text-slate-600 dark:text-slate-300">Dia previsto</dt><dd>{source.expectedDay == null ? 'Não informado' : `Dia ${source.expectedDay}`}</dd></div>
      <div><dt className="text-slate-600 dark:text-slate-300">Valor estimado</dt><dd>{source.estimatedAmount == null ? 'Não informado' : currency.format(source.estimatedAmount)}</dd></div>
    </dl>{source.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{source.description}</p>}</div>
    <button type="button" aria-disabled={editDisabled} onClick={() => onEdit(source.id)} aria-label={`Editar ${source.name}`} className="shrink-0 rounded-md border border-blue-500 px-3 py-2 text-sm text-blue-700 aria-disabled:opacity-60 dark:text-blue-200">Editar</button>
  </li>)}</ul>}
  </>;
}
