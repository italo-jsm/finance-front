"use client";

import type { MenuItem } from "@/types/menu";
import { useAuth } from "@/components/AuthProvider";

type HeaderProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  activeMenu: MenuItem;
};

export function Header({ sidebarOpen, setSidebarOpen, activeMenu }: HeaderProps) {
  const { isAuthenticated, logout, profile, tokenParsed } = useAuth();
  const titleMap: Record<MenuItem, string> = {
    overview: "Dashboard Financeiro",
    transactions: "Gerenciar Despesas",
    expenseHistory: "Histórico de Despesas",
    accounts: "Cadastrar Contas",
    reports: "Relatórios",
  };
  const displayName =
    profile?.firstName ||
    profile?.username ||
    tokenParsed?.preferred_username ||
    tokenParsed?.name ||
    "Usuário";

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 sm:hidden"
        >
          {sidebarOpen ? "Ocultar" : "Mostrar"} menu
        </button>
        <h1 className="text-xl font-semibold">{titleMap[activeMenu]}</h1>
      </div>
      {isAuthenticated ? (
        <div className="flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{displayName}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{profile?.email ?? tokenParsed?.email ?? "Sessao ativa"}</p>
          </div>
          <button
            onClick={() => void logout()}
            className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-300"
          >
            Sair
          </button>
        </div>
      ) : null}
    </header>
  );
}
