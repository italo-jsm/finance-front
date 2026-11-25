"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Expense, expenseCategoryOptions } from "../types/expense";
import { AccountSummary } from "../types/account";
import { getSuggestedFixedDueDate } from "../lib/dueDatesApi";

export type ExpenseField = "value" | "description" | "accountId" | "date" | "installments" | "paidFromAccountId";
export type ExpenseFieldErrors = Partial<Record<ExpenseField, string>>;

type ExpenseFormProps = {
  expense: Expense;
  setExpense: (value: Expense) => void;
  isEditing: boolean;
  submission: "idle" | "saving" | "slow" | "error" | "uncertain";
  submitError: string;
  fieldErrors: ExpenseFieldErrors;
  accounts: AccountSummary[];
  isLoadingAccounts: boolean;
  accountsError: string;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
  reviewByDate: boolean;
  onReviewRecent: () => void;
  onResume: () => void;
};

const inputClass = "block min-h-11 w-full min-w-0 rounded-lg border border-slate-400 bg-white px-3 py-2 text-base text-slate-900 placeholder:text-slate-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-70 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-400 aria-invalid:border-red-600";
const buttonClass = "min-h-11 rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:bg-blue-100 disabled:text-blue-900 dark:disabled:bg-slate-700 dark:disabled:text-slate-200";

function Field({ id, label, error, children }: { id: string; label: string; error?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">{label}</label>
      {children}
      {error && <p id={`${id}-error`} className="mt-1 text-sm font-medium text-red-700 dark:text-red-300">{error}</p>}
    </div>
  );
}

const amountFormat = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, useGrouping: false });

function parseAmount(input: string) {
  const value = input.trim();
  if (!/^(?:\d{1,3}(?:\.\d{3})+,\d{1,2}|\d+(?:[,.]\d{1,2})?)$/.test(value)) return NaN;
  return Number(value.includes(",") ? value.replaceAll(".", "").replace(",", ".") : value);
}

export function ExpenseForm({
  expense, setExpense, isEditing, submission, submitError, fieldErrors, accounts, isLoadingAccounts,
  accountsError, onSubmit, onCancel, reviewByDate, onReviewRecent, onResume,
}: ExpenseFormProps) {
  const [amount, setAmount] = useState(() => expense.value ? amountFormat.format(expense.value) : "");
  const [detailsOpen, setDetailsOpen] = useState(expense.isPaid || expense.installments > 1);
  const selectedAccount = accounts.find((account) => account.accountId === expense.accountId);
  const isFixed = selectedAccount?.accountType === "FIXED_BILL";
  const suggestedDueDate = isFixed ? getSuggestedFixedDueDate(expense.date, selectedAccount.dueDay) : "";
  const isCreditCard = selectedAccount?.accountType === "CREDIT_CARD";
  const paymentAccounts = accounts.filter((account) => account.accountType === "CHECKING_ACCOUNT" && (account.active !== false || account.accountId === expense.paidFromAccountId));
  const isSubmitting = submission === "saving" || submission === "slow";
  const uncertain = submission === "uncertain";
  const lockFields = isSubmitting || uncertain;

  function fieldProps(field: ExpenseField) {
    return {
      id: `expense-${field}`,
      className: inputClass,
      "aria-invalid": Boolean(fieldErrors[field]),
      "aria-describedby": fieldErrors[field] ? `expense-${field}-error` : undefined,
    };
  }

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-1 flex-col gap-4 pt-4">
      {(submission === "error" || uncertain) && (
        <div className={`mx-5 rounded-lg p-3 text-sm sm:mx-7 ${uncertain ? "bg-blue-50 text-blue-950 dark:bg-blue-950 dark:text-blue-100" : "bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100"}`}>
          <p role="alert" className="font-semibold">{uncertain ? "Salvamento ainda não confirmado" : submitError}</p>
          <p className="mt-1">{uncertain ? "Confira se a despesa aparece na lista antes de tentar novamente. Seus dados continuam aqui." : "Seus dados continuam preenchidos. Tente novamente."}</p>
        </div>
      )}
      <fieldset disabled={lockFields} className="min-w-0 space-y-4 px-5 sm:px-7">
        <Field id="expense-value" label="Valor" error={fieldErrors.value}>
          <div className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute top-2.5 left-3 text-slate-600 dark:text-slate-300">R$</span>
            <input {...fieldProps("value")} className={`${inputClass} pl-10`} required type="text" inputMode="decimal" placeholder="0,00" value={amount}
              onChange={(event) => {
                const input = event.target.value;
                setAmount(input);
                setExpense({ ...expense, value: parseAmount(input) });
              }} />
          </div>
        </Field>

        <Field id="expense-description" label="Descrição" error={fieldErrors.description}>
          <input {...fieldProps("description")} required type="text" placeholder="Ex.: compras da semana" value={expense.description}
            onChange={(event) => setExpense({ ...expense, description: event.target.value })} />
        </Field>

        <Field id="expense-accountId" label="Conta" error={fieldErrors.accountId}>
          <select {...fieldProps("accountId")} required value={expense.accountId} disabled={isLoadingAccounts || (!accounts.length && !expense.accountId)}
            onChange={(event) => {
              const account = accounts.find((item) => item.accountId === event.target.value);
              if (account?.accountType === "CREDIT_CARD") setDetailsOpen(true);
              setExpense({
                ...expense,
                accountId: event.target.value,
                accountName: account?.name ?? "",
                dueDate: null,
                installments: account?.accountType === "CREDIT_CARD" ? expense.installments : 1,
              });
            }}>
            <option value="">{isLoadingAccounts ? "Carregando contas…" : accounts.length ? "Selecione uma conta" : "Nenhuma conta disponível"}</option>
            {expense.accountId && !selectedAccount && <option value={expense.accountId}>{expense.accountName || "Conta atual"}</option>}
            {accounts.filter((account) => account.active !== false || account.accountId === expense.accountId).map((account) => <option key={account.accountId} value={account.accountId}>{account.name}</option>)}
          </select>
          {accountsError && <p className="mt-1 text-sm text-red-700 dark:text-red-300">{accountsError}</p>}
          {!accountsError && !isLoadingAccounts && !accounts.length && !expense.accountId && (
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Cadastre uma conta para vincular a despesa.</p>
          )}
        </Field>

        <div className="grid gap-4 min-[380px]:grid-cols-2">
          <Field id="expense-date" label={isFixed ? "Data do lançamento" : "Data"} error={fieldErrors.date}>
            <input {...fieldProps("date")} required type="date" value={expense.date} onChange={(event) => setExpense({ ...expense, date: event.target.value })} />
          </Field>
          <Field id="expense-category" label="Categoria (opcional)">
            <select id="expense-category" className={inputClass} value={expense.category}
              onChange={(event) => setExpense({ ...expense, category: event.target.value as Expense["category"] })}>
              {expenseCategoryOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
            </select>
          </Field>
        </div>

        {isFixed && (
          <Field id="expense-dueDate" label="Vencimento">
            <input id="expense-dueDate" type="date" className={inputClass}
              value={expense.dueDate ?? (isEditing ? expense.effectiveDueDate : null) ?? suggestedDueDate} disabled={isEditing}
              onChange={(event) => setExpense({ ...expense, dueDate: event.target.value || null })} />
            {!isEditing && (expense.dueDate ? (
              <button type="button" className="mt-1 min-h-11 text-sm font-semibold underline"
                onClick={() => setExpense({ ...expense, dueDate: null })}>
                Usar vencimento da conta
              </button>
            ) : (
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Usa o vencimento da conta. Escolha outra data para esta cobrança.</p>
            ))}
          </Field>
        )}

        <div className="rounded-lg bg-blue-50 dark:bg-slate-800">
          <button type="button" aria-expanded={detailsOpen || Boolean(fieldErrors.installments || fieldErrors.paidFromAccountId)} aria-controls="expense-payment-details"
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-semibold text-blue-800 dark:text-blue-200"
            onClick={() => setDetailsOpen((open) => !open)}>
            <span aria-hidden="true">{detailsOpen || fieldErrors.installments || fieldErrors.paidFromAccountId ? "▾" : "›"}</span>
            {isCreditCard ? "Pagamento e parcelas" : "Pagamento"}
          </button>
          <div id="expense-payment-details" hidden={!detailsOpen && !fieldErrors.installments && !fieldErrors.paidFromAccountId} className="space-y-3 px-3 pb-3">
            {isCreditCard && (
              <Field id="expense-installments" label="Parcelas" error={fieldErrors.installments}>
                <input {...fieldProps("installments")} type="number" min="1" step="1" value={expense.installments || ""}
                  onChange={(event) => setExpense({ ...expense, installments: event.target.valueAsNumber })} />
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Use 1 para pagamento à vista.</p>
              </Field>
            )}
            <label className="flex min-h-11 items-center gap-2 text-sm font-semibold">
              <input type="checkbox" className="size-4 accent-blue-700" checked={expense.isPaid}
                onChange={(event) => setExpense({ ...expense, isPaid: event.target.checked, paidFromAccountId: event.target.checked ? expense.paidFromAccountId : "" })} />
              Despesa paga
            </label>
            {expense.isPaid && (
              <Field id="expense-paidFromAccountId" label="Conta de pagamento" error={fieldErrors.paidFromAccountId}>
                <select {...fieldProps("paidFromAccountId")} required value={expense.paidFromAccountId}
                  onChange={(event) => setExpense({ ...expense, paidFromAccountId: event.target.value })}>
                  <option value="">{paymentAccounts.length ? "Selecione uma conta corrente" : "Nenhuma conta corrente disponível"}</option>
                  {expense.paidFromAccountId && !paymentAccounts.some((account) => account.accountId === expense.paidFromAccountId) &&
                    <option value={expense.paidFromAccountId}>Conta atual</option>}
                  {paymentAccounts.map((account) => <option key={account.accountId} value={account.accountId}>{account.name}</option>)}
                </select>
              </Field>
            )}
          </div>
        </div>
      </fieldset>

      <footer className="sticky bottom-0 z-10 mt-auto shrink-0 space-y-2 border-t border-slate-200 bg-white px-5 py-4 sm:px-7 dark:border-slate-700 dark:bg-slate-900">
        {uncertain ? (
          <div className="grid gap-2">
            <button type="button" className={buttonClass} onClick={onReviewRecent}>{reviewByDate ? "Ver despesas da data" : "Ver despesas recentes"}</button>
            <button type="button" className="min-h-11 rounded-lg border border-slate-400 px-3 text-sm font-semibold" onClick={onResume}>Já conferi, voltar ao formulário</button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={isSubmitting} onClick={onCancel} className="min-h-11 rounded-lg border border-slate-400 px-4 font-semibold disabled:opacity-60">Cancelar</button>
            <button type="submit" className={`grow ${buttonClass}`}
              disabled={isSubmitting || isLoadingAccounts || (!accounts.length && !expense.accountId) || (!isEditing && !amount && !expense.description && !expense.accountId)}>
              {isSubmitting ? "Salvando…" : submission === "error" ? "Tentar novamente" : isEditing ? "Atualizar despesa" : "Salvar despesa"}
            </button>
          </div>
        )}
        <p role="status" className="text-center text-sm text-slate-600 empty:hidden dark:text-slate-300">
          {submission === "slow" ? "Ainda salvando. Seus dados continuam aqui." : submission === "saving" ? "Aguardando a confirmação do salvamento." : ""}
        </p>
      </footer>
    </form>
  );
}
