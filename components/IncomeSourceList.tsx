'use client';
import { incomeSourceTypeLabels, type IncomeSource } from '@/types/incomeSource';
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
type Props = { sources: IncomeSource[]; loading: boolean; error: string; onRetry: () => void; onEdit: (id: string) => void };
export function IncomeSourceList({ sources, loading, error, onRetry, onEdit }: Props) {
  if (loading) return <p role="status" className="py-6">Carregando fontes de renda...</p>;
  if (error) return <div role="alert" className="space-y-3 py-4"><p className="text-red-700 dark:text-red-300">{error}</p><button type="button" onClick={onRetry} className="rounded-lg border px-4 py-2">Tentar novamente</button></div>;
  if (!sources.length) return <p className="py-6 text-slate-600 dark:text-slate-300">Nenhuma fonte de renda cadastrada.</p>;
  return <ul className="mt-4 space-y-3">{sources.map(source => <li key={source.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-start sm:justify-between">
    <div className="min-w-0"><h3 className="break-words font-semibold">{source.name}</h3><p className="text-sm text-slate-600 dark:text-slate-300">{incomeSourceTypeLabels[source.type] ?? source.type}</p><dl className="mt-2 flex flex-wrap gap-x-6 gap-y-2 text-sm">
      <div><dt className="text-slate-600 dark:text-slate-300">Dia previsto</dt><dd>{source.expectedDay == null ? 'Não informado' : `Dia ${source.expectedDay}`}</dd></div>
      <div><dt className="text-slate-600 dark:text-slate-300">Valor estimado</dt><dd>{source.estimatedAmount == null ? 'Não informado' : currency.format(source.estimatedAmount)}</dd></div>
    </dl>{source.description && <p className="mt-2 whitespace-pre-wrap break-words text-sm">{source.description}</p>}</div>
    <button type="button" onClick={() => onEdit(source.id)} aria-label={`Editar ${source.name}`} className="shrink-0 rounded-md border border-blue-500 px-3 py-2 text-sm text-blue-700 dark:text-blue-200">Editar</button>
  </li>)}</ul>;
}
