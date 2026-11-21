'use client';

import type { AccountSummary } from '@/types/account';
import type { IncomeSource } from '@/types/incomeSource';
import type { Income } from '@/types/income';

type Props = {
  incomes: Income[];
  accounts: AccountSummary[];
  sources: IncomeSource[];
  loading: boolean;
  error: string;
  receivingId: string | null;
  disabled: boolean;
  onReceive: (income: Income) => void;
  onEdit: (income: Income) => void;
  filtered?: boolean;
  onRetry?: () => void;
};
function displayDate(date: string) { return date.split('-').reverse().join('/'); }

export function IncomeList({ incomes, accounts, sources, loading, error, receivingId, disabled, onReceive, onEdit, filtered, onRetry }: Props) {
  return (
    <>
      {loading && <p role="status" className="mt-4 text-sm">{incomes.length ? 'Atualizando recebimentos…' : 'Carregando recebimentos…'}</p>}
      {error && <div className="mt-4 space-y-2">
        <p role="alert" className="text-red-700 dark:text-red-300">{error}</p>
        {onRetry && <button type="button" disabled={loading} onClick={onRetry} className="min-h-11 rounded-lg border px-3">Tentar novamente</button>}
      </div>}
      {!loading && !error && !incomes.length && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{filtered ? 'Nenhum recebimento encontrado com esses filtros.' : 'Nenhum recebimento previsto neste mês.'}</p>}
      {incomes.length > 0 && <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">{incomes.length} {incomes.length === 1 ? 'recebimento' : 'recebimentos'}</p>}
      {incomes.length > 0 && (
        <ul className="mt-4 space-y-3">
          {incomes.map(income => {
            const received = income.receivedDate !== null || income.status === 'RECEIVED';
            const receiving = receivingId === income.id;
            const sourceName = sources.find(source => source.id === income.incomeSourceId)?.name ?? 'Fonte indisponível';
            const accountName = accounts.find(account => account.accountId === income.accountId)?.name ?? 'Conta indisponível';
            return (
              <li key={income.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900">
                <div className="flex flex-col justify-between gap-4 sm:flex-row">
                  <div className="min-w-0">
                    <p className="break-words font-semibold">{sourceName} — {income.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    <p className="mt-1 text-sm">Competência: {displayDate(income.competence)} • Previsão: {displayDate(income.expectedDate)}</p>
                    <p className="mt-1 text-sm">Conta: {accountName}</p>
                    <p className="mt-1 text-sm">{received ? `Recebido${income.receivedDate ? ` em ${displayDate(income.receivedDate)}` : ''}` : 'Pendente'}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={received} disabled={received || disabled || receiving}
                        aria-label={`Recebido: ${sourceName}, ${displayDate(income.expectedDate)}, ${income.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                        onChange={event => { if (event.target.checked) onReceive(income); }} className="h-4 w-4" />
                      {receiving ? 'Confirmando...' : 'Recebido'}
                    </label>
                    {!received && <button type="button" disabled={disabled || receiving} onClick={() => onEdit(income)} className="rounded-md border border-blue-500 px-3 py-1 text-sm text-blue-600 disabled:opacity-60 dark:text-blue-200">Editar</button>}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
