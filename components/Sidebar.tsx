"use client";

import { useEffect, useState } from "react";
import type { MenuItem } from "@/types/menu";

const TRANSACTIONS_MENU_STORAGE_KEY = "finance-front-transactions-menu-open";

type SidebarProps = {
  activeMenu: MenuItem;
  setActiveMenu: (next: MenuItem) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
};

export function Sidebar({ activeMenu, setActiveMenu, sidebarOpen, setSidebarOpen }: SidebarProps) {
  const items: Array<{ key: MenuItem; label: string }> = [
    { key: "overview", label: "Visão geral" },
    { key: "accounts", label: "Contas" },
    { key: "reports", label: "Relatórios" },
  ];
  const transactionsSectionActive = activeMenu === "transactions" || activeMenu === "expenseHistory";
  const [transactionsOpen, setTransactionsOpen] = useState(false);

  useEffect(() => {
    const storedValue = window.localStorage.getItem(TRANSACTIONS_MENU_STORAGE_KEY);
    if (storedValue === null) {
      setTransactionsOpen(transactionsSectionActive);
      return;
    }

    setTransactionsOpen(storedValue === "true");
  }, [transactionsSectionActive]);

  useEffect(() => {
    if (transactionsSectionActive) {
      setTransactionsOpen(true);
    }
  }, [transactionsSectionActive]);

  useEffect(() => {
    window.localStorage.setItem(TRANSACTIONS_MENU_STORAGE_KEY, String(transactionsOpen));
  }, [transactionsOpen]);

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-30 w-64 transform bg-white shadow-xl transition-transform duration-300 ease-in-out dark:bg-slate-900 sm:relative sm:translate-x-0 ${
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-700">
        <h2 className="text-lg font-bold">Menu</h2>
        <button
          onClick={() => setSidebarOpen(false)}
          className="rounded-md bg-slate-100 px-3 py-1 text-sm font-medium text-slate-800 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:hidden"
        >
          Fechar
        </button>
      </div>
      <nav className="space-y-1 p-4">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Finanças</p>
          <ul className="space-y-1">
            <li className="space-y-1">
              <button
                onClick={() => {
                  setTransactionsOpen((current) => !current);
                }}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                  transactionsSectionActive
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
                    : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                }`}
              >
                <span className="flex items-center justify-between gap-3">
                  <span>Transações</span>
                  <span className="text-xs">{transactionsOpen ? "▲" : "▼"}</span>
                </span>
              </button>
              {transactionsOpen ? (
                <div className="ml-3 space-y-1 border-l border-slate-200 pl-3 dark:border-slate-700">
                  <button
                    onClick={() => {
                      setActiveMenu("transactions");
                      setSidebarOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      activeMenu === "transactions"
                        ? "bg-cyan-50 font-medium text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    Nova
                  </button>
                  <button
                    onClick={() => {
                      setActiveMenu("expenseHistory");
                      setSidebarOpen(false);
                    }}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                      activeMenu === "expenseHistory"
                        ? "bg-cyan-50 font-medium text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-200"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`}
                  >
                    Todas as despesas
                  </button>
                </div>
              ) : null}
            </li>
            {items.map((item) => (
              <li key={item.key}>
                <button
                  onClick={() => {
                    setActiveMenu(item.key);
                    setSidebarOpen(false);
                  }}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium ${
                    activeMenu === item.key
                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-200"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
    </aside>
  );
}
