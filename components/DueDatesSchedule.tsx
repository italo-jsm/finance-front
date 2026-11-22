"use client";

import { useState, type ReactNode } from "react";

import type { DueItem as Item, DuePeriod } from "@/lib/dueDatesApi";

const currency = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const money = (cents: number) => currency.format(cents / 100);
const dateLabel = (iso: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { ...options, timeZone: "UTC" }).format(new Date(iso + "T00:00:00Z"));
const shortDate = (date: string) => dateLabel(date, { day: "2-digit", month: "2-digit" });
const fullDate = (date: string) => dateLabel(date, { dateStyle: "short" });
const outstanding = (item: Item) => item.amount - item.paid;
const isOverdue = (item: Item, today: string) => item.due < today && outstanding(item) > 0;

const paths = {
  calendar: "M7 3v4m10-4v4M4 10h16M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z",
  card: "M3 8h18M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm2 9h4",
  bill: "M6 3h12v18l-3-2-3 2-3-2-3 2V3Zm3 5h6m-6 4h6",
  alert: "M12 8v4m0 4h.01M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z",
  check: "m5 12 4 4 10-10",
  chevron: "m9 5 7 7-7 7",
};

function Icon({ name, className = "size-5" }: { name: keyof typeof paths; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={paths[name]} /></svg>;
}

const panel = "rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900";
const control = "min-h-11 min-w-0 rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:[color-scheme:dark]";
const section = (item: Item, today: string) => outstanding(item) === 0 ? "Pagos" : isOverdue(item, today) ? "Vencidos" : "A vencer";
const typeLabel = (item: Item) => item.type === "card" ? "Fatura de cartão" : "Conta fixa";

function Status({ item, today }: { item: Item; today: string }) {
  const state = section(item, today);
  const text = state === "Pagos" ? "Pago" : isOverdue(item, today) ? "Vencido" : item.paid ? "Parcialmente pago" : "Pendente";
  const color = state === "Pagos" ? "bg-emerald-50 text-emerald-800" : isOverdue(item, today) ? "bg-red-50 text-red-800" : "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100";
  return <span className={`inline-block w-fit rounded-full px-2.5 py-1 text-xs font-semibold ${color}`}>{text}</span>;
}

type ScheduleProps = {
  items: readonly Item[];
  today: string;
  period: DuePeriod;
  onPeriodChange: (period: DuePeriod) => void;
  loading?: boolean;
  loadError?: string;
  onRetry?: () => void;
  paymentNotice?: { text: string; error?: boolean } | null;
  renderPayment?: (item: Item) => ReactNode;
};

export function DueDatesSchedule({
  items, today, period, onPeriodChange, loading = false, loadError, onRetry, paymentNotice, renderPayment,
}: ScheduleProps) {
  const [draft, setDraft] = useState(period);
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");
  const [error, setError] = useState("");
  const inPeriod = items.filter(item => item.due >= period.start && item.due <= period.end);
  const pending = inPeriod.filter(item => outstanding(item) > 0);
  const overdue = pending.filter(item => isOverdue(item, today));
  const total = pending.reduce((sum, item) => sum + outstanding(item), 0);
  const paid = inPeriod.reduce((sum, item) => sum + item.paid, 0);
  const lateTotal = overdue.reduce((sum, item) => sum + outstanding(item), 0);
  const visible = inPeriod.filter(item => (type === "all" || item.type === type) &&
    (status === "all" || section(item, today) === status)).sort((a, b) => a.due.localeCompare(b.due));

  return (
    <div className="@container min-w-0 [&_:focus-visible]:outline-2 [&_:focus-visible]:outline-offset-2 [&_:focus-visible]:outline-blue-600">
      <h2 className="text-3xl font-bold tracking-tight @min-[650px]:text-4xl">Vencimentos</h2>
      <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 @min-[650px]:text-base">Acompanhe faturas de cartão e contas fixas por data de vencimento.</p>

      <form className={`mt-6 flex flex-wrap items-end gap-3 p-4 ${panel}`} onSubmit={event => {
        event.preventDefault();
        if (draft.start > draft.end) {
          setError("A data final precisa ser igual ou posterior à data inicial.");
          return;
        }
        setError("");
        console.info("[Vencimentos] Aplicando filtro de período", { start: draft.start, end: draft.end });
        onPeriodChange(draft);
      }}>
        <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-medium @min-[650px]:max-w-48">Data inicial
          <input required type="date" min="0001-01-01" max="9999-12-31" className={control} value={draft.start} aria-invalid={!!error} aria-describedby={error ? "date-error" : undefined} onChange={event => setDraft({ ...draft, start: event.target.value })} />
        </label>
        <label className="grid min-w-0 flex-1 gap-1.5 text-sm font-medium @min-[650px]:max-w-48">Data final
          <input required type="date" min="0001-01-01" max="9999-12-31" className={control} value={draft.end} aria-invalid={!!error} aria-describedby={error ? "date-error" : undefined} onChange={event => setDraft({ ...draft, end: event.target.value })} />
        </label>
        <button type="submit" className="min-h-11 w-full rounded-lg bg-blue-700 px-4 text-sm font-semibold text-white hover:bg-blue-800 @min-[650px]:w-auto">Aplicar período</button>
        {error && <p id="date-error" role="alert" className="w-full text-sm text-red-800 dark:text-red-300">{error}</p>}
      </form>

      {paymentNotice && <p role={paymentNotice.error ? "alert" : "status"}
        className={`mt-4 text-sm font-semibold ${paymentNotice.error ? "text-red-700 dark:text-red-300" : "text-emerald-700 dark:text-emerald-300"}`}>
        {paymentNotice.text}
      </p>}
      {(loading || loadError) && <div className={`mt-5 p-5 ${panel}`}>
        <p role={loading ? "status" : "alert"} className="text-sm">{loading ? "Carregando vencimentos…" : loadError}</p>
        {!loading && loadError && onRetry && <button type="button" onClick={onRetry} className="mt-2 min-h-11 rounded-lg px-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 dark:text-blue-300 dark:hover:bg-slate-800">Tentar novamente</button>}
      </div>}
      {!loading && !loadError && <>
        <section aria-label="Resumo do período" className="my-5 grid gap-3 @min-[650px]:grid-cols-3" aria-live="polite">
          <div className="rounded-2xl bg-blue-900 p-5 text-white">
            <div className="flex items-center justify-between gap-2 text-sm font-medium text-blue-100">Total em aberto <Icon name="calendar" /></div>
            <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{money(total)}</p>
            <p className="mt-1 text-xs text-blue-100">{pending.length} em aberto · inclui vencidos</p>
          </div>
          <div className={`p-5 ${panel}`}>
            <div className="flex items-center justify-between gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">Em atraso <Icon name="alert" className="size-5 text-red-700" /></div>
            <p className="mt-2 text-2xl font-bold tracking-tight text-red-800 tabular-nums dark:text-red-300">{money(lateTotal)}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{overdue.length} {overdue.length === 1 ? "item vencido" : "itens vencidos"}</p>
          </div>
          <div className={`p-5 ${panel}`}>
            <div className="flex items-center justify-between gap-2 text-sm font-medium text-slate-600 dark:text-slate-300">Total pago <Icon name="check" className="size-5 text-emerald-700" /></div>
            <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{money(paid)}</p>
            <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">Inclui pagamentos parciais</p>
          </div>
        </section>

        <section aria-labelledby="due-list" className={panel}>
          <div className="flex flex-wrap items-end justify-between gap-4 px-4 py-5 @min-[650px]:px-5">
            <div>
              <h3 id="due-list" className="text-lg font-bold">Agenda de pagamentos</h3>
              <p role="status" className="mt-1 text-sm text-slate-600 dark:text-slate-300">{shortDate(period.start)} a {fullDate(period.end)} · {visible.length} de {inPeriod.length} {inPeriod.length === 1 ? "item" : "itens"}</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Tipo
                <select className={control} value={type} onChange={event => setType(event.target.value)}>
                  <option value="all">Todos os tipos</option><option value="card">Faturas de cartão</option><option value="fixed">Contas fixas</option>
                </select>
              </label>
              <label className="grid gap-1 text-xs font-semibold text-slate-600 dark:text-slate-300">Situação
                <select className={control} value={status} onChange={event => setStatus(event.target.value)}>
                  <option value="all">Todas</option><option>A vencer</option><option>Vencidos</option><option>Pagos</option>
                </select>
              </label>
            </div>
          </div>
          {visible.length === 0 && <div className="border-t border-slate-200 dark:border-slate-700 px-5 py-10 text-center">
            <h4 className="font-semibold">{inPeriod.length ? "Nenhum item com esses filtros" : "Nenhum vencimento neste período"}</h4>
            {inPeriod.length > 0 ? <button className="mt-2 min-h-11 px-2 text-sm font-semibold text-blue-700 underline dark:text-blue-300" onClick={() => { setType("all"); setStatus("all"); }}>Limpar filtros</button> : <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Selecione outro intervalo para consultar a agenda.</p>}
          </div>}
          {["Vencidos", "A vencer", "Pagos"].map(group => {
            const items = visible.filter(item => section(item, today) === group);
            if (!items.length) return null;
            return <section key={group} aria-label={group}>
              <h4 className="border-y border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-4 py-2.5 text-xs font-bold tracking-wide text-slate-700 dark:text-slate-200 @min-[650px]:px-5">{group} <span className="ml-1 font-medium text-slate-500 dark:text-slate-400">· {items.length}</span></h4>
              <ul className="divide-y divide-slate-100 dark:divide-slate-700">
                {items.map(item => <li key={item.id}>
                  <details className="group">
                    <summary className="grid cursor-pointer list-none grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-2 px-4 py-3 hover:bg-blue-50/40 dark:hover:bg-slate-800 @min-[650px]:grid-cols-[auto_minmax(0,1fr)_150px_128px_16px] @min-[650px]:px-5 [&::-webkit-details-marker]:hidden">
                      <time dateTime={item.due} className="grid min-w-12 justify-items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-1.5 py-1 text-sm font-bold tabular-nums">
                        {item.due.slice(-2)}<span className="text-xs font-medium text-slate-600 dark:text-slate-300">{dateLabel(item.due, { month: "short" }).replace(".", "")}</span>
                      </time>
                      <span className="flex min-w-0 items-center gap-2.5">
                        <span className="hidden size-9 shrink-0 place-items-center rounded-lg bg-blue-50 text-blue-700 @min-[650px]:grid"><Icon name={item.type === "card" ? "card" : "bill"} /></span>
                        <span className="min-w-0"><span className="block break-words text-sm font-bold">{item.name}</span><span className="block break-words text-xs text-slate-600 dark:text-slate-300">{typeLabel(item)}{item.accountName && item.accountName !== item.name ? ` · ${item.accountName}` : ""}</span></span>
                      </span>
                      <span className="col-start-2 row-start-2 @min-[650px]:col-auto @min-[650px]:row-auto"><Status item={item} today={today} /></span>
                      <span className="col-start-3 row-start-1 text-right text-sm font-bold tabular-nums @min-[650px]:col-auto @min-[650px]:row-auto">
                        {money(outstanding(item) || item.paid)}<span className="block text-xs font-normal text-slate-600 dark:text-slate-300">{outstanding(item) ? "em aberto" : "pago"}</span>
                      </span>
                      <Icon name="chevron" className="col-start-3 row-start-2 size-4 justify-self-end text-slate-500 dark:text-slate-400 group-open:rotate-90 @min-[650px]:col-auto @min-[650px]:row-auto" />
                    </summary>
                    <dl className="grid grid-cols-2 gap-3 border-t border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-800 px-4 py-4 text-sm @min-[650px]:grid-cols-4 @min-[650px]:px-5">
                      {[["Vencimento", fullDate(item.due)], ["Valor total", money(item.amount)], ["Valor pago", money(item.paid)], ["Saldo em aberto", money(outstanding(item))]].map(([label, value]) =>
                        <div key={label}><dt className="text-xs text-slate-600 dark:text-slate-300">{label}</dt><dd className="mt-1 font-semibold tabular-nums">{value}</dd></div>)}
                    </dl>
                    {item.paymentTarget && renderPayment && <div className="border-t border-slate-100 px-4 py-3 dark:border-slate-700 @min-[650px]:px-5">
                      {renderPayment(item)}
                    </div>}
                  </details>
                </li>)}
              </ul>
            </section>;
          })}
        </section>
        </>}
    </div>
  );
}
