"use client";

import { useId, useRef, useState, type ReactNode } from "react";

type FilterField = {
  name: string;
  label: string;
  type?: "text" | "month";
  options?: { value: string; label: string }[];
};

type Props<T extends Record<string, string>> = {
  title: string;
  createLabel: string;
  onCreate: () => void;
  disabled?: boolean;
  actions?: ReactNode;
  fields: FilterField[];
  filters: T;
  defaults: T;
  onApply: (values: T) => void;
};

const secondary = "min-h-11 rounded-lg border border-slate-400 px-3 text-sm font-semibold text-blue-800 hover:bg-slate-100 dark:text-blue-200 dark:hover:bg-slate-800";
const primary = "min-h-11 rounded-lg bg-blue-700 px-4 font-semibold text-white hover:bg-blue-800 disabled:opacity-60";

export function ListToolbar<T extends Record<string, string>>({ title, createLabel, onCreate, disabled, actions, fields, filters, defaults, onApply }: Props<T>) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(filters);
  const active = fields.filter(({ name }) => filters[name] !== defaults[name]);
  return <>
    <header className="flex flex-wrap items-start justify-between gap-3">
      <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      <div className="flex flex-wrap gap-2">
        <button type="button" disabled={disabled} onClick={() => { setDraft(filters); dialog.current?.showModal(); }} className={`${secondary} disabled:opacity-60`}>
          Filtros{active.length > 0 && ` (${active.length})`}
        </button>
        {actions}
        <button type="button" disabled={disabled} onClick={onCreate} className={primary}><span aria-hidden="true">+ </span>{createLabel}</button>
      </div>
    </header>
    {active.length > 0 && <div className="mt-4 flex flex-wrap items-center gap-2" aria-label="Filtros ativos">
      {active.map(({ name, label, options, type }) => {
        const value = filters[name];
        const display = options?.find((option) => option.value === value)?.label ?? (type === "month" ? value.split("-").reverse().join("/") : value);
        return <span key={name} className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-900 dark:bg-blue-950 dark:text-blue-100">{label}: {display}</span>;
      })}
      <button type="button" className="min-h-11 px-2 text-sm font-semibold text-blue-800 hover:underline disabled:opacity-60 dark:text-blue-200" disabled={disabled} onClick={() => onApply(defaults)}>Limpar filtros</button>
    </div>}
    <dialog ref={dialog} aria-labelledby={titleId} className="fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none bg-white text-slate-900 backdrop:bg-slate-950/35 sm:left-auto sm:max-w-md dark:bg-slate-900 dark:text-slate-100">
      <form className="flex min-h-full flex-col" onSubmit={(event) => { event.preventDefault(); onApply(draft); dialog.current?.close(); }}>
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-700">
          <h3 id={titleId} className="text-xl font-bold">Filtros</h3>
          <button type="button" aria-label="Fechar filtros" className="size-11 rounded-lg text-2xl hover:bg-slate-100 dark:hover:bg-slate-800" onClick={() => dialog.current?.close()}>×</button>
        </header>
        <div className="flex-1 space-y-4 p-5">
          {fields.map(({ name, label, options, type }) => {
            const className = "mt-1 block min-h-11 w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-base dark:border-slate-500 dark:bg-slate-950";
            const onChange = (value: string) => setDraft((current) => ({ ...current, [name]: value }));
            return <label key={name} className="block text-sm font-semibold">{label}
              {options ? <select className={className} value={draft[name]} onChange={(event) => onChange(event.target.value)}>
                {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select> : <input className={className} type={type ?? "text"} required={type === "month"} min={type === "month" ? "0001-01" : undefined} max={type === "month" ? "9999-12" : undefined}
                value={draft[name]} onChange={(event) => onChange(event.target.value)} />}
            </label>;
          })}
        </div>
        <footer className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white p-5 dark:border-slate-700 dark:bg-slate-900">
          <button type="button" className={secondary} onClick={() => setDraft(defaults)}>Limpar</button>
          <button type="submit" className={`flex-1 ${primary}`}>Aplicar filtros</button>
        </footer>
      </form>
    </dialog>
  </>;
}
