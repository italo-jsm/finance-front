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
    { key: "overview", label: "Visão geral" },
    { key: "transactions", label: "Transações" },
    { key: "accounts", label: "Contas" },
    { key: "reports", label: "Relatórios" },
  ];

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
