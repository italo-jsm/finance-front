'use client';

import type { AccountSummary } from '../types/account';
import { useAccountMovements } from '../hooks/useAccountMovements';

const origins = { OPENING: 'Saldo inicial', RECEIPT: 'Recebimento', PAYMENT: 'Pagamento' };
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const buttonClass = 'rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600';

type Props = { account: AccountSummary; getAccessToken: () => Promise<string>; onClose: () => void };

export function AccountMovementsSection({ account, getAccessToken, onClose }: Props) {
  const state = useAccountMovements(account, getAccessToken);
  return (
    <section aria-label={`Movimentações de ${account.name}`} className="mt-6 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold">{state.account?.name ?? account.name}</h3>
          <h4 className="mt-1 font-medium">Últimas 10 movimentações</h4>
        </div>
        <div className="flex gap-2">
          {!state.unavailable && <button type="button" className={buttonClass} disabled={state.loading} onClick={() => { void state.reload(); }}>Atualizar</button>}
          <button type="button" className={buttonClass} onClick={onClose}>Fechar</button>
        </div>
      </div>
      {state.unavailable ? <p role="alert" className="mt-4">Esta conta não está mais disponível. A visualização foi encerrada.</p> : <>
        {state.loading && <p role="status" className="mt-4">Carregando saldo e movimentações...</p>}
        {state.balanceError && <p role="alert" className="mt-4 text-red-700 dark:text-red-300">{state.balanceError}</p>}
        {!state.loading && state.account && <p className="mt-4 font-semibold">Saldo atual: {typeof state.account.balance === 'number' ? money(state.account.balance) : 'Indisponível'}</p>}
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">O saldo atual considera todo o histórico, não apenas as movimentações exibidas.</p>
        {state.movementsError && <p role="alert" className="mt-4 text-red-700 dark:text-red-300">{state.movementsError}</p>}
        {!state.loading && !state.movementsError && (state.movements.length ? <ul className="mt-4 divide-y divide-slate-200 dark:divide-slate-700">
          {state.movements.map(item => <li key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div>
              <p className="font-medium">{origins[item.origin] ?? item.origin}</p>
              <time dateTime={item.date} className="text-sm text-slate-500 dark:text-slate-400">{item.date.split('-').reverse().join('/')}</time>
            </div>
            <span className="font-semibold tabular-nums">{item.amount > 0 ? '+' : item.amount < 0 ? '−' : ''}{money(Math.abs(item.amount))}</span>
          </li>)}
        </ul> : <p className="mt-4 text-sm">Nenhuma movimentação encontrada</p>)}
      </>}
    </section>
  );
}
