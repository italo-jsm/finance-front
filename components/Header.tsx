"use client";

import type { MenuItem } from "@/types/menu";
import { useAuth } from "@/components/AuthProvider";

type HeaderProps = {
  sidebarOpen: boolean;
  setSidebarOpen: (value: boolean) => void;
  activeMenu: MenuItem;
};

const pageTitles: Record<MenuItem, string> = {
  overview: "Visão geral",
  transactions: "Despesas",
  expenseHistory: "Histórico de Despesas",
  accounts: "Contas",
  incomeSources: "Fontes de renda",
  incomes: "Recebimentos",
};

const focusStyle = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 dark:focus-visible:outline-blue-400";
const avatarStyle = "grid shrink-0 place-items-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-200";
const logoutStyle = "min-h-11 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800";

function getInitials(name: string) {
  const words = name.trim().split(/\s+/);
  const first = Array.from(words[0])[0] ?? "U";
  const last = words.length > 1 ? Array.from(words[words.length - 1])[0] : "";
  return (first + last).toLocaleUpperCase("pt-BR");
}

export function Header({ sidebarOpen, setSidebarOpen, activeMenu }: HeaderProps) {
  const { isAuthenticated, logout, profile, tokenParsed } = useAuth();
  const displayName =
    profile?.firstName?.trim() ||
    profile?.username?.trim() ||
    tokenParsed?.preferred_username?.trim() ||
    tokenParsed?.name?.trim() ||
    "Usuário";
  const profileName = [profile?.firstName, profile?.lastName].filter(Boolean).join(" ").trim();
  const initials = getInitials(profileName || tokenParsed?.name || displayName);
  const email = profile?.email ?? tokenParsed?.email;

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 dark:border-slate-700 dark:bg-slate-900 sm:h-[72px] sm:px-6 lg:px-10">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label={sidebarOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={sidebarOpen}
          aria-controls="finance-sidebar"
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`grid size-11 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800 sm:hidden ${focusStyle}`}
        >
          <svg aria-hidden="true" className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
            <path d={sidebarOpen ? "m6 6 12 12M6 18 18 6" : "M4 6h16M4 12h16M4 18h16"} />
          </svg>
        </button>
        <h1 className="min-w-0 truncate text-base font-semibold text-slate-900 dark:text-slate-100 sm:text-[15px] sm:text-slate-700 sm:dark:text-slate-200">
          {activeMenu === "overview" ? <><span className="font-bold sm:hidden">Finance</span><span className="hidden sm:inline">Visão geral</span></> : pageTitles[activeMenu]}
        </h1>
      </div>
      {isAuthenticated && (
        <>
          <div className="hidden min-w-0 shrink-0 items-center gap-3 sm:flex">
            <span aria-hidden="true" className={`size-[38px] ${avatarStyle}`}>{initials}</span>
            <span className="max-w-24 truncate text-sm font-semibold text-slate-900 dark:text-slate-100 lg:max-w-40">{displayName}</span>
            <button type="button" onClick={() => void logout()} className={`ml-3 px-2 ${logoutStyle} ${focusStyle}`}>
              Sair
            </button>
          </div>
          <button
            type="button"
            aria-label={`Opções da conta de ${displayName}`}
            popoverTarget="header-account-popover"
            className={`size-11 hover:bg-blue-200 dark:hover:bg-blue-900 sm:hidden ${avatarStyle} ${focusStyle}`}
          >
            <span aria-hidden="true">{initials}</span>
          </button>
          <div
            id="header-account-popover"
            popover="auto"
            className="fixed inset-auto top-[3.75rem] right-4 m-0 w-60 max-w-[calc(100vw-2rem)] rounded-xl border border-slate-200 bg-white p-3 text-slate-900 shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:hidden"
          >
            <p className="break-words px-2 text-sm font-semibold">{displayName}</p>
            {email && <p className="break-words px-2 text-xs text-slate-600 dark:text-slate-300">{email}</p>}
            <button type="button" onClick={() => void logout()} className={`mt-2 w-full px-2 text-left ${logoutStyle} ${focusStyle}`}>
              Sair
            </button>
          </div>
        </>
      )}
    </header>
  );
}
