"use client";

import { Expense, expenseCategoryOptions } from "../types/expense";
import { AccountSummary } from "../types/account";

type ExpenseFormProps = {
  expense: Expense;
  setExpense: (value: Expense) => void;
  isEditing: boolean;
  accounts: AccountSummary[];
  isLoadingAccounts: boolean;
  accountsError: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function ExpenseForm({
  expense,
  setExpense,
  isEditing,
  accounts,
  isLoadingAccounts,
  accountsError,
  onSubmit,
  onCancel,
}: ExpenseFormProps) {
  const availableExpenseAccounts =
    expense.installments > 1
      ? accounts.filter((account) => account.accountType === "CREDIT_CARD")
      : accounts;
  const hasCurrentSelection = availableExpenseAccounts.some((account) => account.accountId === expense.accountId);
  const paymentAccounts = accounts.filter((account) => account.accountType === "CHECKING_ACCOUNT");
  const hasCurrentPaymentSelection = paymentAccounts.some((account) => account.accountId === expense.paidFromAccountId);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Data
          </label>
          <input
            id="date"
            type="date"
            value={expense.date}
            onChange={(e) => setExpense({ ...expense, date: e.target.value })}
            className="mt-1 block w-full min-w-0 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label htmlFor="installments" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Parcelas
          </label>
          <input
            id="installments"
            type="number"
            min="1"
            value={expense.installments}
            onChange={(e) => setExpense({ ...expense, installments: Number(e.target.value) || 1 })}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Use `1` para despesa a vista.
          </p>
        </div>

        <div>
          <label htmlFor="value" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Valor
          </label>
          <input
            id="value"
            type="number"
            step="0.01"
            value={expense.value || ""}
            onChange={(e) => setExpense({ ...expense, value: Number(e.target.value) })}
            placeholder="0.00"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>

        <div>
          <label htmlFor="accountId" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Conta
          </label>
          <select
            id="accountId"
            value={expense.accountId}
            onChange={(e) => {
              const selectedAccount = availableExpenseAccounts.find((account) => account.accountId === e.target.value);
              setExpense({
                ...expense,
                accountId: e.target.value,
                accountName: selectedAccount?.name ?? "",
              });
            }}
            disabled={isLoadingAccounts || availableExpenseAccounts.length === 0}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">
              {isLoadingAccounts
                ? "Carregando contas..."
                : availableExpenseAccounts.length
                  ? "Selecione uma conta"
                  : expense.installments > 1
                    ? "Nenhum cartao de credito disponivel"
                    : "Nenhuma conta disponivel"}
            </option>
            {!hasCurrentSelection && expense.accountId && (
              <option value={expense.accountId}>{expense.accountName || "Conta atual"}</option>
            )}
            {availableExpenseAccounts.map((account) => (
              <option key={account.accountId} value={account.accountId}>
                {account.name}
              </option>
            ))}
          </select>
          {accountsError && <p className="mt-2 text-sm text-red-600 dark:text-red-300">{accountsError}</p>}
          {!accountsError && !isLoadingAccounts && availableExpenseAccounts.length === 0 && (
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {expense.installments > 1
                ? "Despesas parceladas exigem uma conta do tipo cartao de credito."
                : "Cadastre ao menos uma conta para vincular a despesa."}
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Descrição
          </label>
          <input
            id="description"
            type="text"
            value={expense.description}
            onChange={(e) => setExpense({ ...expense, description: e.target.value })}
            placeholder="Ex: Conta de luz"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-700 dark:bg-slate-900/60">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Categoria</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Escolha uma categoria para facilitar relatórios e comparativos.
            </p>
          </div>
          <span className="rounded-full bg-cyan-100 px-3 py-1 text-xs font-semibold text-cyan-900 dark:bg-cyan-950 dark:text-cyan-200">
            {expenseCategoryOptions.find((option) => option.value === expense.category)?.label}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-4">
          {expenseCategoryOptions.map((option) => {
            const selected = option.value === expense.category;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setExpense({ ...expense, category: option.value })}
                className={`rounded-xl border px-3 py-2 text-left text-sm font-medium transition ${
                  selected
                    ? "border-cyan-500 bg-cyan-500 text-slate-950 shadow-sm"
                    : "border-slate-200 bg-white text-slate-700 hover:border-cyan-300 hover:bg-cyan-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-cyan-700 dark:hover:bg-slate-800"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={expense.isPaid}
            onChange={(e) =>
              setExpense({
                ...expense,
                isPaid: e.target.checked,
                paidFromAccountId: e.target.checked ? expense.paidFromAccountId : "",
              })
            }
            className="mt-1 h-4 w-4 rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
          />
          <div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200">Despesa paga</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Marque se a despesa ja foi quitada e vincule a conta de onde saiu o pagamento.
            </p>
          </div>
        </label>

        {expense.isPaid && (
          <div className="mt-4">
            <label htmlFor="paidFromAccountId" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Conta de pagamento
            </label>
            <select
              id="paidFromAccountId"
              value={expense.paidFromAccountId}
              onChange={(e) => setExpense({ ...expense, paidFromAccountId: e.target.value })}
              disabled={paymentAccounts.length === 0}
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <option value="">
                {paymentAccounts.length ? "Selecione a conta de pagamento" : "Nenhuma conta corrente disponivel"}
              </option>
              {!hasCurrentPaymentSelection && expense.paidFromAccountId && (
                <option value={expense.paidFromAccountId}>Conta atual</option>
              )}
              {paymentAccounts.map((account) => (
                <option key={account.accountId} value={account.accountId}>
                  {account.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Apenas contas correntes podem ser usadas como origem do pagamento.
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          {isEditing ? "Atualizar" : "Salvar despesa"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
