"use client";

import { accountTypeOptions, AccountFormValues } from "@/types/account";

type AccountFormProps = {
  account: AccountFormValues;
  setAccount: (value: AccountFormValues) => void;
  isEditing: boolean;
  isSubmitting: boolean;
  submitError: string;
  submitSuccess: string;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancelEdit: () => void;
};

export function AccountForm({
  account,
  setAccount,
  isEditing,
  isSubmitting,
  submitError,
  submitSuccess,
  onSubmit,
  onCancelEdit,
}: AccountFormProps) {
  const selectedType = accountTypeOptions.find((option) => option.value === account.accountType);
  const showClosingDay = account.accountType === "CREDIT_CARD";
  const showDueDay = account.accountType === "CREDIT_CARD" || account.accountType === "FIXED_BILL";

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="account-name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Nome da conta
        </label>
        <input
          id="account-name"
          type="text"
          value={account.name}
          onChange={(event) => setAccount({ ...account, name: event.target.value })}
          placeholder="Ex: Nubank Platinum"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div>
        <label htmlFor="account-type" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Tipo de conta
        </label>
        <select
          id="account-type"
          value={account.accountType}
          onChange={(event) =>
            setAccount({
              ...account,
              accountType: event.target.value as AccountFormValues["accountType"],
              closingDay: event.target.value === "CREDIT_CARD" ? account.closingDay : "",
              dueDay:
                event.target.value === "CREDIT_CARD" || event.target.value === "FIXED_BILL"
                  ? account.dueDay
                  : "",
            })
          }
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          {accountTypeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{selectedType?.helperText}</p>
      </div>

      {showClosingDay ? (
        <div>
          <label htmlFor="closing-day" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Dia do fechamento
          </label>
          <input
            id="closing-day"
            type="number"
            min="1"
            max="31"
            value={account.closingDay}
            onChange={(event) => setAccount({ ...account, closingDay: event.target.value })}
            placeholder="Ex: 10"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      ) : null}

      {showDueDay ? (
        <div>
          <label htmlFor="due-day" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Dia do vencimento
          </label>
          <input
            id="due-day"
            type="number"
            min="1"
            max="31"
            value={account.dueDay}
            onChange={(event) => setAccount({ ...account, dueDay: event.target.value })}
            placeholder="Ex: 15"
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
          />
        </div>
      ) : null}

      {submitError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {submitError}
        </div>
      ) : null}

      {submitSuccess ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {submitSuccess}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          >
            {isSubmitting ? "Salvando..." : isEditing ? "Salvar alteracoes" : "Salvar conta"}
          </button>
          {isEditing ? (
            <button
              type="button"
              onClick={onCancelEdit}
              disabled={isSubmitting}
              className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Cancelar edicao
            </button>
          ) : null}
        </div>
      </div>
    </form>
  );
}
