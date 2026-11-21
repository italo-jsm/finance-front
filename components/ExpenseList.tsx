"use client";

import type { ReactNode, Ref } from "react";
import type { AccountSummary } from "../types/account";
import { Expense, expenseCategoryOptions } from "../types/expense";
import { emptyRecentExpenseFilters, expenseStatusLabels, filterRecentExpenses, getExpenseStatus, type RecentExpenseFilters } from "../lib/recentExpenseFilters";
import { ExpensePaymentAction, type ExpensePaymentProps } from "./ExpensePaymentAction";
import { ExpenseReversalAction, reversedExpenseClass, type ExpenseReversalProps } from "./ExpenseReversalAction";
import { RecentExpenseFilterPanel } from "./RecentExpenseFilterPanel";

type ExpenseListProps = ExpenseReversalProps & ExpensePaymentProps & {
  expenses: Expense[];
  isLoading: boolean;
  error: string;
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
  editDisabled?: boolean;
  reviewDate?: string;
  headingRef?: Ref<HTMLHeadingElement>;
  accounts?: AccountSummary[];
  filters?: RecentExpenseFilters;
  defaultPeriod?: { dateFrom: string; dateTo: string };
  onApplyFilters?: (filters: RecentExpenseFilters) => void;
  onRetry?: () => void;
  onNewExpense?: () => void;
  onViewHistory?: () => void;
  onReturnToDraft?: () => void;
  feedback?: ReactNode;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const statusColors = {
  PAID: "bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200",
  PENDING: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  PARTIALLY_PAID: "bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200",
  REVERSED: "bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200",
};
const rowGrid = "lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,0.8fr)_minmax(0,1.25fr)_minmax(0,1.25fr)_minmax(0,1.15fr)_minmax(0,0.9fr)] lg:items-center lg:gap-3";
const actionClass = "min-h-9 rounded-md border border-slate-400 px-3 text-xs font-semibold hover:bg-slate-100 disabled:opacity-50 dark:hover:bg-slate-800";

function formatDate(date: string, year = false) {
  const parts = date.split("-");
  if (parts.length !== 3) return date || "—";
  return year ? parts.reverse().join("/") : parts.slice(1).reverse().join("/");
}

export function ExpenseList({
  expenses, isLoading, error, onEdit, onDelete, editDisabled, onPay, paymentAccounts, paymentBlockedIds, paymentBusy,
  onReverse, reversingId, reversalBlockedIds, accounts = [], filters = emptyRecentExpenseFilters,
  defaultPeriod, onApplyFilters, onRetry, headingRef, reviewDate, onNewExpense, onViewHistory, onReturnToDraft, feedback,
}: ExpenseListProps) {
  const applied = reviewDate ? emptyRecentExpenseFilters : filters;
  const items = filterRecentExpenses(expenses, applied);
  const dateFrom = applied.dateFrom || defaultPeriod?.dateFrom;
  const dateTo = applied.dateTo || defaultPeriod?.dateTo;
  const chips = [
    applied.dateFrom && `${formatDate(applied.dateFrom, true)} a ${formatDate(applied.dateTo, true)}`,
    applied.accountId && (accounts.find((account) => account.accountId === applied.accountId)?.name || "Conta selecionada"),
    applied.category && expenseCategoryOptions.find((category) => category.value === applied.category)?.label,
    applied.paymentStatus && expenseStatusLabels[applied.paymentStatus],
    applied.minimumAmount !== null && `A partir de ${currency.format(applied.minimumAmount)}`,
  ].filter(Boolean);

  return (
    <section aria-labelledby="recent-expenses-title" className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 sm:p-6 dark:border-slate-700 dark:bg-slate-900">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="recent-expenses-title" tabIndex={-1} ref={headingRef} className="text-2xl font-bold tracking-tight sm:text-3xl">
            {reviewDate ? `Despesas de ${formatDate(reviewDate, true)}` : "Despesas recentes"}
          </h2>
          {!reviewDate && dateFrom && dateTo && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatDate(dateFrom, true)} a {formatDate(dateTo, true)}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {!reviewDate && defaultPeriod && onApplyFilters && (
            <RecentExpenseFilterPanel accounts={accounts} filters={filters} defaultPeriod={defaultPeriod} count={chips.length} onApply={onApplyFilters} />
          )}
          {reviewDate && onReturnToDraft && (
            <button type="button" onClick={onReturnToDraft} className="min-h-11 rounded-lg bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800">Voltar ao formulário</button>
          )}
          {!reviewDate && onNewExpense && (
            <button type="button" onClick={onNewExpense} className="min-h-11 rounded-lg bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800">
              <span aria-hidden="true" className="mr-1">+</span> Nova despesa
            </button>
          )}
        </div>
      </header>
      {!reviewDate && onViewHistory && (
        <button type="button" onClick={onViewHistory} className="min-h-11 text-sm font-semibold text-blue-800 hover:underline dark:text-blue-200">
          Ver histórico de despesas
        </button>
      )}
      {feedback}
      {chips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
          {chips.map((label, index) => <span key={index} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-100">{label}</span>)}
          {onApplyFilters && <button type="button" className="min-h-11 px-2 text-sm font-semibold text-blue-800 hover:underline dark:text-blue-200" onClick={() => onApplyFilters(emptyRecentExpenseFilters)}>Limpar filtros</button>}
        </div>
      )}

      <div role="status" className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-300">
        {isLoading ? <span>Atualizando despesas…</span> : !error && <span>{items.length} {items.length === 1 ? "despesa" : "despesas"}</span>}
        {items.length > 0 && !error && <span>Mais recentes primeiro</span>}
      </div>
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-900 dark:bg-red-950 dark:text-red-100">
          <p role="alert" className="font-semibold">{error}</p>
          {items.length > 0 && <p className="mt-1">As despesas abaixo são da última consulta concluída.</p>}
          {onRetry && <button type="button" className={`mt-2 ${actionClass}`} onClick={onRetry}>Tentar novamente</button>}
        </div>
      )}
      {!isLoading && !error && !items.length && (
        <div className="rounded-lg border border-slate-200 p-6 text-center dark:border-slate-700">
          <p className="font-semibold">Nenhuma despesa encontrada</p>
          {chips.length > 0 && <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ajuste o período ou remova algum filtro.</p>}
        </div>
      )}
      {items.length > 0 && (
        <div className="lg:rounded-xl lg:border lg:border-slate-200 lg:dark:border-slate-700">
          <div aria-hidden="true" className={`hidden rounded-t-xl bg-slate-50 px-4 py-3 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-200 ${rowGrid}`}>
            <span>Despesa</span><span>Data</span><span>Conta</span><span>Categoria</span><span>Situação</span><span className="text-right">Valor</span>
          </div>
          <ul className="space-y-2 lg:space-y-0">
            {items.map(({ expense: item, index }) => {
              const status = getExpenseStatus(item);
              return (
                <li key={item.expenseId ?? `${item.date}-${item.description}-${index}`} className={`rounded-xl border p-3 lg:rounded-none lg:border-0 lg:border-t lg:px-4 ${item.reversedDate ? reversedExpenseClass : "border-slate-200 dark:border-slate-700"}`}>
                  <div className={`grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 text-sm ${rowGrid}`}>
                    <span className="break-words font-semibold">
                      {item.description}
                      {item.installments > 1 && <span className="block text-xs font-normal text-slate-600 dark:text-slate-300">{item.installments} parcelas</span>}
                    </span>
                    <span className="col-start-1 row-start-2 text-slate-600 lg:col-auto lg:row-auto dark:text-slate-300"><span className="sr-only">Data: </span>{formatDate(item.date)}</span>
                    <span className="col-start-1 row-start-3 break-words text-slate-600 lg:col-auto lg:row-auto dark:text-slate-300"><span className="sr-only">Conta: </span>{item.accountName || "Conta não informada"}</span>
                    <span className="col-start-1 row-start-4 break-words text-slate-600 lg:col-auto lg:row-auto dark:text-slate-300"><span className="sr-only">Categoria: </span>{expenseCategoryOptions.find((option) => option.value === item.category)?.label ?? "Outros"}</span>
                    <span className={`col-start-2 row-start-4 justify-self-end rounded-full px-2 py-1 text-center text-xs font-semibold lg:col-auto lg:row-auto lg:justify-self-start ${statusColors[status]}`}><span className="sr-only">Situação: </span>{expenseStatusLabels[status]}{item.reversedDate && <span className="block">{formatDate(item.reversedDate, true)}</span>}</span>
                    <span className="col-start-2 row-start-1 text-right font-semibold tabular-nums lg:col-auto lg:row-auto"><span className="sr-only">Valor: </span>{currency.format(item.value)}</span>
                  </div>
                  <details className="mt-2 text-right text-xs">
                    <summary className="inline-flex min-h-9 cursor-pointer items-center rounded-md px-2 font-semibold text-blue-800 hover:bg-slate-100 dark:text-blue-200 dark:hover:bg-slate-800" aria-label={`Ações para ${item.description}`}>Ações <span aria-hidden="true" className="ml-1">⌄</span></summary>
                    <div className="mt-1 flex flex-wrap justify-end gap-2">
                      <ExpensePaymentAction expense={item} accounts={paymentAccounts} onPay={onPay} blocked={paymentBusy || paymentBlockedIds?.has(item.expenseId ?? "")} />
                      <ExpenseReversalAction expense={item} busy={reversingId === item.expenseId} blocked={reversalBlockedIds.has(item.expenseId ?? "")} onReverse={onReverse} />
                      <button type="button" disabled={editDisabled} onClick={() => onEdit(index)} className={`${actionClass} text-blue-800 dark:text-blue-200`}>Editar</button>
                      <button type="button" disabled={editDisabled} onClick={() => onDelete(index)} className={`${actionClass} text-red-700 dark:text-red-300`}>Excluir</button>
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
