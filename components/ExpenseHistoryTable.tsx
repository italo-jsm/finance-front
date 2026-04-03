"use client";

import { useState } from "react";
import type { AccountSummary } from "@/types/account";
import { Expense, expenseCategoryOptions } from "@/types/expense";

export type ExpenseHistoryFilters = {
  dateFrom: string;
  dateTo: string;
  category: string;
  accountId: string;
};

type ExpenseHistoryTableProps = {
  expenses: Expense[];
  accounts: AccountSummary[];
  isLoading: boolean;
  error: string;
  hasSearched: boolean;
  onSearch: (filters: ExpenseHistoryFilters) => void;
  onEdit: (expenseId: string) => void;
};

type SortField = "date" | "description" | "category" | "account" | "value";
type SortDirection = "asc" | "desc";

function formatDate(value: string) {
  if (!value) return "-";

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("pt-BR");
}

export function ExpenseHistoryTable({
  expenses,
  accounts,
  isLoading,
  error,
  hasSearched,
  onSearch,
  onEdit,
}: ExpenseHistoryTableProps) {
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState("");
  const [accountId, setAccountId] = useState("");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const filteredExpenses = expenses.filter((expense) => {
    if (dateFrom && expense.date < dateFrom) return false;
    if (dateTo && expense.date > dateTo) return false;
    if (category && expense.category !== category) return false;
    if (accountId && expense.accountId !== accountId) return false;

    return true;
  });

  const sortedExpenses = [...filteredExpenses].sort((left, right) => {
    const leftCategory = expenseCategoryOptions.find((option) => option.value === left.category)?.label ?? "Outros";
    const rightCategory = expenseCategoryOptions.find((option) => option.value === right.category)?.label ?? "Outros";

    const comparisonMap: Record<SortField, number> = {
      date: left.date.localeCompare(right.date),
      description: left.description.localeCompare(right.description, "pt-BR"),
      category: leftCategory.localeCompare(rightCategory, "pt-BR"),
      account: (left.accountName || "").localeCompare(right.accountName || "", "pt-BR"),
      value: left.value - right.value,
    };

    const result = comparisonMap[sortField];
    return sortDirection === "asc" ? result : result * -1;
  });

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="mb-4 flex flex-col gap-1">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Todas as despesas</h2>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Preencha os filtros e clique em buscar para carregar a lista.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label htmlFor="history-date-from" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Data inicial
            </label>
            <input
              id="history-date-from"
              type="date"
              value={dateFrom}
              onChange={(event) => setDateFrom(event.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="history-date-to" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Data final
            </label>
            <input
              id="history-date-to"
              type="date"
              value={dateTo}
              onChange={(event) => setDateTo(event.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />
          </div>

          <div>
            <label htmlFor="history-category" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Categoria
            </label>
            <select
              id="history-category"
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Todas</option>
              {expenseCategoryOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="history-account" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Conta
            </label>
            <select
              id="history-account"
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="">Todos</option>
              {accounts.map((account) => (
                <option key={account.accountId} value={account.accountId}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-950">
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <div>
              <label htmlFor="history-sort-field" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Ordenar por
              </label>
              <select
                id="history-sort-field"
                value={sortField}
                onChange={(event) => setSortField(event.target.value as SortField)}
                className="mt-1 block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                <option value="date">Data</option>
                <option value="description">Descricao</option>
                <option value="category">Categoria</option>
                <option value="account">Conta</option>
                <option value="value">Valor</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setSortDirection((current) => (current === "asc" ? "desc" : "asc"))}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              {sortDirection === "desc" ? "Mais recentes/maiores" : "Mais antigos/menores"}
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onSearch({ dateFrom, dateTo, category, accountId })}
            className="rounded-md bg-cyan-500 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Buscar
          </button>
          <button
            type="button"
            onClick={() => {
              setDateFrom("");
              setDateTo("");
              setCategory("");
              setAccountId("");
            }}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            Limpar filtros
          </button>
        </div>
      </div>

      {isLoading ? <p className="text-sm text-slate-500 dark:text-slate-300">Carregando histórico de despesas...</p> : null}
      {error ? <p className="text-sm text-red-600 dark:text-red-300">{error}</p> : null}
      {!hasSearched && !isLoading && !error ? (
        <p className="text-sm text-slate-500 dark:text-slate-300">Use os filtros acima e clique em buscar para carregar as despesas.</p>
      ) : null}

      {hasSearched && !isLoading && !error && sortedExpenses.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-300">Nenhuma despesa encontrada com os filtros atuais.</p>
      ) : null}

      {hasSearched && !isLoading && !error && sortedExpenses.length > 0 ? (
        <>
          <div className="space-y-3 md:hidden">
            {sortedExpenses.map((expense, index) => (
              <article
                key={expense.expenseId ?? `${expense.date}-${expense.description}-${index}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{formatDate(expense.date)}</p>
                    <h3 className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{expense.description}</h3>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">R$ {expense.value.toFixed(2)}</p>
                </div>

                <dl className="mt-4 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400">Categoria</dt>
                    <dd className="text-right text-slate-800 dark:text-slate-200">
                      {expenseCategoryOptions.find((option) => option.value === expense.category)?.label ?? "Outros"}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-500 dark:text-slate-400">Conta</dt>
                    <dd className="text-right text-slate-800 dark:text-slate-200">{expense.accountName || "-"}</dd>
                  </div>
                </dl>

                <div className="mt-4 flex justify-end">
                  {expense.expenseId ? (
                    <button
                      type="button"
                      onClick={() => onEdit(expense.expenseId as string)}
                      className="rounded-md border border-blue-500 px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-200 dark:hover:bg-blue-900/60"
                    >
                      Editar
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400">Sem acao</span>
                  )}
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-950 md:block">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Data</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Descricao</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Categoria</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">Conta</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Valor</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-slate-500">Acao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {sortedExpenses.map((expense, index) => (
                    <tr key={expense.expenseId ?? `${expense.date}-${expense.description}-${index}`} className="hover:bg-slate-50 dark:hover:bg-slate-900/70">
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{formatDate(expense.date)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-slate-900 dark:text-slate-100">{expense.description}</td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">
                        {expenseCategoryOptions.find((option) => option.value === expense.category)?.label ?? "Outros"}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700 dark:text-slate-300">{expense.accountName || "-"}</td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-slate-900 dark:text-slate-100">
                        R$ {expense.value.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {expense.expenseId ? (
                          <button
                            type="button"
                            onClick={() => onEdit(expense.expenseId as string)}
                            className="rounded-md border border-blue-500 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-200 dark:hover:bg-blue-900/60"
                          >
                            Editar
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Sem acao</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
