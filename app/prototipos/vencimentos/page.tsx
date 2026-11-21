"use client";

import { useState } from "react";
import { DueDatesSchedule } from "@/components/DueDatesSchedule";

const accounts = [
  { id: 1, name: "Internet residencial", type: "fixed", due: "2026-11-19", amount: 12990, paid: 0 },
  { id: 2, name: "Nubank", type: "card", due: "2026-11-23", amount: 126075, paid: 0 },
  { id: 3, name: "Energia elétrica", type: "fixed", due: "2026-11-25", amount: 18460, paid: 0 },
  { id: 4, name: "Inter", type: "card", due: "2026-11-28", amount: 74230, paid: 0 },
  { id: 5, name: "Condomínio", type: "fixed", due: "2026-11-30", amount: 46500, paid: 16500 },
  { id: 6, name: "Aluguel", type: "fixed", due: "2026-11-05", amount: 155000, paid: 155000 },
  { id: 7, name: "Seguro residencial", type: "fixed", due: "2026-12-05", amount: 8590, paid: 0 },
] as const;

const today = "2026-11-21";

export default function DueDatesPrototype() {
  const [period, setPeriod] = useState({ start: "2026-11-01", end: "2026-11-30" });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-4 sm:px-8">
          <strong className="text-lg">Finance</strong>
          <p className="text-right text-xs font-medium text-slate-600 dark:text-slate-300">
            Protótipo · dados fictícios<br />Data de referência 21/11/2026
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-7 sm:px-8 sm:py-10">
        <DueDatesSchedule items={accounts} today={today} period={period} onPeriodChange={setPeriod} />
      </main>
    </div>
  );
}
