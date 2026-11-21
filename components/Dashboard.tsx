"use client";

import { useState } from "react";
import { useDashboardInvoices } from "@/hooks/useDashboardInvoices";
import type { Invoice } from "@/lib/invoicesApi";
import type { AccountSummary } from "@/types/account";

type Props = {
  accounts: AccountSummary[];
  accountsLoading: boolean;
  accountsError: string;
  getAccessToken: () => Promise<string>;
  onViewAccounts: () => void;
  onRetryAccounts: () => void;
};

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const monthFormat = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const dayFormat = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
const panel = "rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800";
const muted = "text-slate-600 dark:text-slate-300";
const action = "inline-flex min-h-11 items-center gap-1 rounded-md font-semibold text-blue-700 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:text-blue-300";

function currentMonth() {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(value: string) {
  const label = monthFormat.format(new Date(`${value}-01T00:00:00Z`));
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function shortDate(value: string) {
  return dayFormat.format(new Date(`${value}T00:00:00Z`));
}

function sumMoney(values: number[]) {
  return values.reduce((sum, value) => sum + Math.round(value * 100), 0) / 100;
}

function Icon({ kind }: { kind: "account" | "card" }) {
  return (
    <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {kind === "card" ? <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M3 10h18M7 15h3" /></> :
        <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="M21 10h-5a2 2 0 0 0 0 4h5" /></>}
    </svg>
  );
}

function MonthSelect({ month, onChange }: { month: string; onChange: (month: string) => void }) {
  const year = Number(month.slice(0, 4));
  return (
    <select aria-label="Mês das faturas" value={month} onChange={event => onChange(event.target.value)}
      className="min-h-11 w-fit max-w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:border-slate-600 dark:bg-slate-800">
      {[year - 1, year, year + 1].filter(value => value >= 1 && value <= 9999).map(value => (
        <optgroup key={value} label={String(value)}>
          {Array.from({ length: 12 }, (_, index) => {
            const option = `${String(value).padStart(4, "0")}-${String(index + 1).padStart(2, "0")}`;
            return <option key={option} value={option}>{monthLabel(option)}</option>;
          })}
        </optgroup>
      ))}
    </select>
  );
}

function InvoiceCard({ card, invoice }: { card: AccountSummary; invoice: Invoice | null }) {
  return (
    <li className={`${panel} p-4`}>
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Icon kind="card" /></span>
        <div className="min-w-0 grow">
          <h3 className="break-words text-sm font-bold sm:text-base">{card.name}</h3>
          {invoice && <p className={`mt-0.5 text-xs ${muted}`}>Vencimento: <time dateTime={invoice.dueDate}>{shortDate(invoice.dueDate)}</time></p>}
        </div>
        {invoice && <p className="shrink-0 text-right text-sm font-bold tabular-nums sm:text-base">{currency.format(invoice.total.currentTotal)}</p>}
      </div>
      {invoice ? (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-sm dark:border-slate-700">
            <div><dt className={`text-xs ${muted}`}>À vista</dt><dd className="font-semibold tabular-nums">{currency.format(invoice.totalSingle.currentTotal)}</dd></div>
            <div><dt className={`text-xs ${muted}`}>Parceladas</dt><dd className="font-semibold tabular-nums">{currency.format(invoice.totalInstallments.currentTotal)}</dd></div>
          </dl>
          <details className="mt-1">
            <summary className={`${action} ml-auto flex w-fit cursor-pointer text-sm`} aria-label={`Ver fatura de ${card.name}`}>
              Ver fatura <span aria-hidden="true">→</span>
            </summary>
            {([
              ["Compras à vista", invoice.singleExpenses],
              ["Compras parceladas", invoice.installmentsExpenses],
            ] as const).map(([title, expenses]) => (
              <div className="space-y-2 border-t border-slate-200 py-3 text-sm dark:border-slate-700" key={title}>
                <h4 className="font-semibold">{title}</h4>
                {expenses.length ? <ul className="space-y-2">
                  {expenses.map((expense, index) => (
                    <li className="flex items-baseline justify-between gap-3" key={index}>
                      <span className="min-w-0 break-words">{expense.description} <time className={`text-xs ${muted}`} dateTime={expense.expenseDate}>{shortDate(expense.expenseDate)}</time></span>
                      <span className="shrink-0 tabular-nums">{currency.format(expense.amount)}</span>
                    </li>
                  ))}
                </ul> : <p className={muted}>Nenhuma compra.</p>}
              </div>
            ))}
          </details>
        </>
      ) : <p className={`mt-3 text-sm ${muted}`}>Fatura indisponível para este mês.</p>}
    </li>
  );
}

export function Dashboard({ accounts, accountsLoading, accountsError, getAccessToken, onViewAccounts, onRetryAccounts }: Props) {
  const [month, setMonth] = useState(currentMonth);
  const checking = accounts.filter(account => account.active !== false && account.accountType === "CHECKING_ACCOUNT");
  const cards = accounts.filter(account => account.active !== false && account.accountType === "CREDIT_CARD");
  const { invoices, retry } = useDashboardInvoices(cards.map(card => card.accountId), month, getAccessToken);
  const orderedCards = cards.map(card => ({ card, invoice: invoices?.[card.accountId] ?? null }))
    .sort((a, b) => (a.invoice?.dueDate ?? "9999").localeCompare(b.invoice?.dueDate ?? "9999") ||
      a.card.name.localeCompare(b.card.name, "pt-BR"));
  const loaded = orderedCards.flatMap(item => item.invoice ? [item.invoice] : []);
  const missingInvoices = invoices !== null && loaded.length < cards.length;
  const invoicesLoading = accountsLoading || (cards.length > 0 && invoices === null);
  const invoiceTotalsUnavailable = accountsError || (missingInvoices && loaded.length === 0);
  const firstDue = loaded.find(invoice => invoice.total.currentTotal > 0)?.dueDate;
  const balances = checking.flatMap(account => typeof account.balance === "number" ? [account.balance] : []);
  const completeBalance = !accountsError && balances.length === checking.length;

  return (
    <div className="grid gap-x-6 gap-y-5 lg:grid-cols-[minmax(0,5fr)_minmax(0,2fr)_minmax(0,5fr)] lg:items-start lg:gap-y-6">
      <div className="min-w-0 lg:col-span-2 lg:col-start-1 lg:row-start-1">
        <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Dashboard financeiro</h2>
        <p className={`mt-1.5 hidden text-sm sm:block ${muted}`}>Saldos das suas contas e faturas dos seus cartões.</p>
      </div>

      <section aria-labelledby="total-balance" className="flex min-h-36 flex-col rounded-2xl bg-blue-900 p-5 text-white lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:self-stretch">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 id="total-balance" className="text-sm font-semibold">Saldo total em contas</h3>
            <p className="mt-1 break-words text-3xl font-bold tabular-nums sm:text-4xl" aria-live="polite">
              {accountsLoading ? "…" : completeBalance ? currency.format(sumMoney(balances)) : "Indisponível"}
            </p>
          </div>
          <span className="hidden size-11 shrink-0 place-items-center rounded-xl bg-blue-700 sm:grid"><Icon kind="account" /></span>
        </div>
        <p className="mt-auto pt-3 text-sm text-blue-100">
          {accountsLoading ? "Carregando saldos…" : accountsError ? "Não foi possível carregar os saldos." :
            !completeBalance ? "Há contas com saldo indisponível." :
            checking.length === 1 ? "Saldo de 1 conta corrente" : `Soma de ${checking.length} contas correntes`}
        </p>
      </section>

      <section aria-labelledby="checking-title" className="min-w-0 lg:col-start-1 lg:row-start-3">
        <div className="mb-2 flex min-h-11 flex-wrap items-center justify-between gap-x-3">
          <h3 id="checking-title" className="text-lg font-bold sm:text-xl">Minhas contas</h3>
          <button type="button" className={`${action} text-sm`} onClick={onViewAccounts}>Ver contas <span aria-hidden="true">→</span></button>
        </div>
        {accountsLoading || accountsError || !checking.length ? (
          <div className={`${panel} p-4 text-sm ${muted}`} role="status">
            {accountsLoading ? "Carregando contas…" : accountsError ? (
              <>Não foi possível carregar as contas. <button type="button" className={action} onClick={onRetryAccounts}>Tentar novamente</button></>
            ) : "Nenhuma conta corrente ativa."}
          </div>
        ) : (
          <ul className={`${panel} divide-y divide-slate-200 px-4 dark:divide-slate-700`}>
            {checking.map(account => (
              <li key={account.accountId} className="flex min-h-16 items-center gap-3 py-3 sm:min-h-[72px]">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200"><Icon kind="account" /></span>
                <div className="min-w-0 grow">
                  <h4 className="break-words text-sm font-bold">{account.name}</h4>
                  <p className={`text-xs ${muted}`}>Conta corrente</p>
                </div>
                <span className="shrink-0 text-right text-sm font-bold tabular-nums">
                  {typeof account.balance === "number" ? currency.format(account.balance) : "Indisponível"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h3 id="invoices-title" className="mt-1 text-lg font-bold sm:text-xl lg:col-span-2 lg:col-start-2 lg:row-start-3 lg:mt-0 lg:flex lg:min-h-11 lg:items-center">Faturas dos cartões</h3>
      <div className="-mt-2 lg:col-start-3 lg:row-start-1 lg:mt-0 lg:self-center lg:justify-self-end">
        <MonthSelect month={month} onChange={setMonth} />
      </div>

      <section aria-labelledby="invoice-total" className={`${panel} flex min-h-36 flex-col p-5 lg:col-start-3 lg:row-start-2 lg:self-stretch`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h4 id="invoice-total" className={`text-sm font-semibold ${muted}`}>{missingInvoices && loaded.length > 0 ? "Total parcial das faturas" : "Total das faturas do mês"}</h4>
            <p className="mt-1 break-words text-3xl font-bold tabular-nums" aria-live="polite">
              {invoiceTotalsUnavailable ? "Indisponível" : invoicesLoading ? "…" :
                currency.format(sumMoney(loaded.map(invoice => invoice.total.currentTotal)))}
            </p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"><Icon kind="card" /></span>
        </div>
        {!invoiceTotalsUnavailable && !invoicesLoading && (
          <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-200 pt-2 dark:border-slate-700">
            <div className="min-w-0">
              <dt className={`text-xs ${muted}`}>Compras à vista</dt>
              <dd className="break-words text-sm font-semibold tabular-nums">
                {currency.format(sumMoney(loaded.map(invoice => invoice.totalSingle.currentTotal)))}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className={`text-xs ${muted}`}>Compras parceladas</dt>
              <dd className="break-words text-sm font-semibold tabular-nums">
                {currency.format(sumMoney(loaded.map(invoice => invoice.totalInstallments.currentTotal)))}
              </dd>
            </div>
          </dl>
        )}
        <p className={`mt-auto pt-3 text-sm ${muted}`}>
          {accountsError ? "Não foi possível consultar seus cartões." : invoicesLoading ? "Carregando faturas…" :
            missingInvoices ? `${loaded.length} de ${cards.length} faturas carregadas` :
            `${cards.length} ${cards.length === 1 ? "cartão" : "cartões"}${firstDue ? ` · primeiro vencimento em ${shortDate(firstDue)}` : ""}`}
        </p>
      </section>

      <section aria-labelledby="invoices-title" className="min-w-0 space-y-3 lg:col-span-2 lg:col-start-2 lg:row-start-3 lg:mt-[52px]">
        {accountsLoading || accountsError || !cards.length || invoices === null ? (
          <p className={`${panel} p-4 text-sm ${muted}`} role="status">
            {accountsError ? "Atualize as contas para consultar as faturas." : accountsLoading || (cards.length > 0 && invoices === null)
              ? "Carregando faturas…" : "Nenhum cartão de crédito ativo."}
          </p>
        ) : (
          <>
            {missingInvoices && <div className={`${panel} flex flex-wrap items-center justify-between gap-x-2 px-4 text-sm ${muted}`} role="status">
              <span>Algumas faturas não puderam ser carregadas.</span>
              <button type="button" className={action} onClick={retry}>Tentar novamente</button>
            </div>}
            <ul className="space-y-3">
              {orderedCards.map(({ card, invoice }) => <InvoiceCard key={`${card.accountId}-${month}`} card={card} invoice={invoice} />)}
            </ul>
          </>
        )}
      </section>
    </div>
  );
}
