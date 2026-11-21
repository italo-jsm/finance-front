"use client";

import type { MenuItem } from "@/types/menu";

type SidebarProps = {
  activeMenu: MenuItem;
  setActiveMenu: (next: MenuItem) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export function Sidebar({ activeMenu, setActiveMenu, sidebarOpen, setSidebarOpen }: SidebarProps) {
  const items: Array<{ key: MenuItem; label: string }> = [
    { key: "transactions", label: "Despesas" },
    { key: "overview", label: "Visão geral" },
    { key: "accounts", label: "Contas" },
    { key: "incomeSources", label: "Fontes de renda" },
    { key: "incomes", label: "Recebimentos" },
  ];
  return (
    <aside
      id="finance-sidebar"
      className={`fixed inset-y-0 left-0 z-30 w-60 shrink-0 transform overflow-y-auto border-r border-slate-200 bg-white shadow-xl transition-[transform,visibility] duration-300 ease-in-out dark:border-slate-700 dark:bg-slate-900 sm:visible sm:relative sm:translate-x-0 sm:shadow-none ${
        sidebarOpen ? "visible translate-x-0" : "invisible -translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
        <h2 className="text-lg font-bold">Finance</h2>
        <button
          type="button"
          aria-label="Fechar menu"
          onClick={() => setSidebarOpen(false)}
          className="rounded-md bg-slate-100 p-2 text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:hidden"
        >
          <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d="m6 6 12 12M6 18 18 6" />
          </svg>
        </button>
      </div>
      <nav className="space-y-1 p-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Finanças</p>
          <ul className="space-y-1">
            {items.map((item) => {
              const current = activeMenu === item.key || (item.key === "transactions" && activeMenu === "expenseHistory");
              return (
                <li key={item.key}>
                  <button
                    aria-current={current ? "page" : undefined}
                    onClick={() => {
                      setActiveMenu(item.key);
                      setSidebarOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                      current
                        ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
                        : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
