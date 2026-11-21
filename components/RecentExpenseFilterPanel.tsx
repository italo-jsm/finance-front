"use client";

import { useRef, useState, type FormEvent } from "react";
import type { AccountSummary } from "../types/account";
import { expenseCategoryOptions } from "../types/expense";
import { emptyRecentExpenseFilters, expenseStatusLabels, type RecentExpenseFilters } from "../lib/recentExpenseFilters";

const inputClass = "mt-1 min-h-11 w-full min-w-0 rounded-lg border border-slate-400 bg-white px-3 py-2 text-base dark:border-slate-500 dark:bg-slate-950";
const secondaryClass = "min-h-11 rounded-lg border border-slate-400 px-3 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800";

type Props = {
  accounts: AccountSummary[];
  filters: RecentExpenseFilters;
  defaultPeriod: { dateFrom: string; dateTo: string };
  count: number;
  onApply: (filters: RecentExpenseFilters) => void;
};

function last30Days(end: string) {
  const date = new Date(`${end}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() - 29);
  return date.toISOString().slice(0, 10);
}

export function RecentExpenseFilterPanel({ accounts, filters, defaultPeriod, count, onApply }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const startDate = useRef<HTMLInputElement>(null);
  const amountInput = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(filters);
  const [amount, setAmount] = useState("");
  const [errors, setErrors] = useState({ date: "", amount: "" });
  const [period, setPeriod] = useState<"week" | "month" | "custom">("week");

  function open() {
    setDraft({ ...filters, dateFrom: filters.dateFrom || defaultPeriod.dateFrom, dateTo: filters.dateTo || defaultPeriod.dateTo });
    setAmount(filters.minimumAmount === null ? "" : String(filters.minimumAmount).replace(".", ","));
    setErrors({ date: "", amount: "" });
    setPeriod(!filters.dateFrom ? "week" :
      filters.dateTo === defaultPeriod.dateTo && filters.dateFrom === last30Days(defaultPeriod.dateTo) ? "month" : "custom");
    dialog.current?.showModal();
  }

  function choosePeriod(next: "week" | "month" | "custom") {
    setPeriod(next);
    setErrors((current) => ({ ...current, date: "" }));
    if (next === "custom") {
      startDate.current?.focus();
    } else {
      setDraft({
        ...draft,
        dateFrom: next === "week" ? defaultPeriod.dateFrom : last30Days(defaultPeriod.dateTo),
        dateTo: defaultPeriod.dateTo,
      });
    }
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const invalidDate = !draft.dateFrom || !draft.dateTo
      ? "Informe a data inicial e a data final."
      : draft.dateFrom > draft.dateTo ? "A data inicial deve ser anterior ou igual à final." : "";
    const amountText = amount.trim();
    const parsed = Number(amountText.replace(",", "."));
    const invalidAmount = amountText && (!/^\d+(?:[,.]\d{1,2})?$/.test(amountText) || !Number.isFinite(parsed))
      ? "Informe um valor válido com até duas casas decimais." : "";
    setErrors({ date: invalidDate, amount: invalidAmount });
    if (invalidDate || invalidAmount) {
      (invalidDate ? startDate : amountInput).current?.focus();
      return;
    }
    const isDefault = draft.dateFrom === defaultPeriod.dateFrom && draft.dateTo === defaultPeriod.dateTo;
    onApply({
      ...draft,
      dateFrom: isDefault ? "" : draft.dateFrom,
      dateTo: isDefault ? "" : draft.dateTo,
      minimumAmount: amountText ? parsed : null,
    });
    dialog.current?.close();
  }

  return (
    <>
      <button type="button" className={`${secondaryClass} text-blue-800 dark:text-blue-200`} onClick={open}>
        Filtros{count > 0 && ` (${count})`}
      </button>
      <dialog ref={dialog} aria-labelledby="recent-filters-title" className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-white text-slate-900 backdrop:bg-slate-950/35 sm:left-auto sm:w-full sm:max-w-md dark:bg-slate-900 dark:text-slate-100">
        <form noValidate onSubmit={apply} className="flex min-h-full flex-col">
          <header className="flex items-center justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
            <h3 id="recent-filters-title" className="text-xl font-bold">Filtros</h3>
            <button type="button" aria-label="Fechar filtros" className="size-11 rounded-lg text-2xl hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => dialog.current?.close()}>×</button>
          </header>
          <div className="flex-1 space-y-4 p-5">
            <fieldset>
              <legend className="mb-2 text-sm font-semibold">Período</legend>
              <div className="flex flex-wrap gap-1.5">
                {([["week", "Últimos 7 dias"], ["month", "Últimos 30 dias"], ["custom", "Personalizado"]] as const).map(([key, label]) => (
                  <button key={key} type="button" aria-pressed={period === key} onClick={() => choosePeriod(key)}
                    className="min-h-11 rounded-full bg-slate-100 px-2.5 text-xs font-semibold text-slate-700 aria-pressed:bg-blue-100 aria-pressed:text-blue-900 dark:bg-slate-800 dark:text-slate-200 dark:aria-pressed:bg-blue-200">
                    {label}
                  </button>
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <label className="min-w-0 text-sm font-semibold">Data inicial
                  <input ref={startDate} type="date" required value={draft.dateFrom} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? "recent-date-error" : undefined}
                    onChange={(event) => { setPeriod("custom"); setDraft({ ...draft, dateFrom: event.target.value }); }} className={inputClass} />
                </label>
                <label className="min-w-0 text-sm font-semibold">Data final
                  <input type="date" required value={draft.dateTo} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? "recent-date-error" : undefined}
                    onChange={(event) => { setPeriod("custom"); setDraft({ ...draft, dateTo: event.target.value }); }} className={inputClass} />
                </label>
              </div>
              {errors.date && <p id="recent-date-error" role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{errors.date}</p>}
            </fieldset>
            <label className="block text-sm font-semibold">Conta
              <select value={draft.accountId} onChange={(event) => setDraft({ ...draft, accountId: event.target.value })} className={inputClass}>
                <option value="">Todas as contas</option>
                {draft.accountId && !accounts.some((account) => account.accountId === draft.accountId) && <option value={draft.accountId}>Conta selecionada</option>}
                {accounts.map((account) => <option key={account.accountId} value={account.accountId}>{account.name}</option>)}
              </select>
            </label>
            <label className="block text-sm font-semibold">Categoria
              <select value={draft.category} onChange={(event) => setDraft({ ...draft, category: event.target.value as RecentExpenseFilters["category"] })} className={inputClass}>
                <option value="">Todas as categorias</option>
                {expenseCategoryOptions.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <fieldset className="rounded-lg bg-blue-50 p-3 dark:bg-slate-800">
              <legend className="sr-only">Situação e valor</legend>
              <div className="grid grid-cols-2 gap-3">
                <label className="min-w-0 text-sm font-semibold">Situação
                  <select value={draft.paymentStatus} onChange={(event) => setDraft({ ...draft, paymentStatus: event.target.value as RecentExpenseFilters["paymentStatus"] })} className={inputClass}>
                    <option value="">Todas</option>
                    {Object.entries(expenseStatusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>
                <label className="min-w-0 text-sm font-semibold">Valor mínimo
                  <input ref={amountInput} value={amount} inputMode="decimal" placeholder="R$ 0,00" aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? "recent-amount-error" : undefined}
                    onChange={(event) => setAmount(event.target.value)} className={inputClass} />
                </label>
              </div>
              {errors.amount && <p id="recent-amount-error" role="alert" className="mt-2 text-sm text-red-700 dark:text-red-300">{errors.amount}</p>}
            </fieldset>
          </div>
          <footer className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
            <button type="button" className={secondaryClass} onClick={() => {
              setDraft({ ...emptyRecentExpenseFilters, ...defaultPeriod });
              setAmount("");
              setPeriod("week");
              setErrors({ date: "", amount: "" });
            }}>Limpar</button>
            <button type="submit" className="min-h-11 flex-1 rounded-lg bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800">Aplicar filtros</button>
          </footer>
        </form>
      </dialog>
    </>
  );
}
