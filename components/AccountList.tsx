"use client";

import { useState } from "react";
import { ListToolbar } from "./ListToolbar";
import { FormModal } from "./FormModal";
import { AccountMovementsSection } from "./AccountMovementsSection";
import { accountTypeOptions, type AccountSummary } from "@/types/account";

type AccountListProps = {
  accounts: AccountSummary[];
  getAccessToken: () => Promise<string>;
  isLoading: boolean;
  error: string;
  success: string;
  updatingAccountStatusId: string | null;
  editingAccountId: string | null;
  onCreate?: () => void;
  onRetry?: () => void;
  onEdit: (accountId: string) => void;
  onToggleStatus: (accountId: string) => void;
  loadAccounts?: (token: string, signal?: AbortSignal) => Promise<AccountSummary[]>;
};

const accountFilters = { name: "", type: "", status: "" };
const fields = [
  { name: "name", label: "Nome" },
  { name: "type", label: "Tipo", options: [{ value: "", label: "Todos os tipos" }, ...accountTypeOptions] },
  { name: "status", label: "Situação", options: [{ value: "", label: "Todas" }, { value: "active", label: "Ativa" }, { value: "inactive", label: "Inativa" }] },
];

function getTypeLabel(accountType: AccountSummary["accountType"]) {
  return accountTypeOptions.find((option) => option.value === accountType)?.label ?? accountType;
}

function buildDetails(account: AccountSummary) {
  const details: string[] = [getTypeLabel(account.accountType)];

  if (typeof account.closingDay === "number") {
    details.push(`Fecha dia ${account.closingDay}`);
  }

  if (typeof account.dueDay === "number") {
    details.push(`Vence dia ${account.dueDay}`);
  }

  if (account.accountType === "CHECKING_ACCOUNT" && typeof account.balance === "number") {
    details.push(`Saldo atual: ${account.balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`);
  }

  return details.join(" • ");
}

export function AccountList({
  accounts,
  getAccessToken,
  isLoading,
  error,
  success,
  updatingAccountStatusId,
  editingAccountId,
  onCreate,
  onRetry,
  onEdit,
  onToggleStatus,
  loadAccounts,
}: AccountListProps) {
  const [selectedAccount, setSelectedAccount] = useState<AccountSummary | null>(null);
  const [filters, setFilters] = useState(accountFilters);
  const visibleAccounts = accounts.filter((account) =>
    account.name.toLocaleLowerCase("pt-BR").includes(filters.name.trim().toLocaleLowerCase("pt-BR")) &&
    (!filters.type || account.accountType === filters.type) &&
    (!filters.status || filters.status === (account.active === false ? "inactive" : "active")));
  const activeAccounts = visibleAccounts.filter((account) => account.active !== false);
  const inactiveAccounts = visibleAccounts.filter((account) => account.active === false);

  return (
    <section className="space-y-4">
      {onCreate && <ListToolbar title="Contas" createLabel="Nova conta" onCreate={onCreate} disabled={Boolean(updatingAccountStatusId)}
        fields={fields} filters={filters} defaults={accountFilters} onApply={setFilters} />}

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          <p role="alert">{error}</p>
          {onRetry && <button type="button" onClick={onRetry} className="mt-2 min-h-11 rounded-lg border px-3 font-semibold">Tentar novamente</button>}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          <p role="status">{success}</p>
        </div>
      ) : null}

      {isLoading ? <p role="status" className="mt-4 text-sm text-slate-500 dark:text-slate-300">{accounts.length ? "Atualizando contas…" : "Carregando contas…"}</p> : null}

      {!isLoading && !error && visibleAccounts.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">{accounts.length ? "Nenhuma conta encontrada com esses filtros." : "Nenhuma conta cadastrada ainda."}</p>
      ) : null}

      {visibleAccounts.length > 0 && <p className="text-sm text-slate-600 dark:text-slate-300">{visibleAccounts.length} {visibleAccounts.length === 1 ? "conta" : "contas"}</p>}
      {visibleAccounts.length > 0 ? (
        <div className="mt-4 space-y-6">
          {activeAccounts.length > 0 && <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ativas</h3>
              <ul className="mt-3 space-y-3">
                {activeAccounts.map((account) => {
                  const isUpdatingStatus = updatingAccountStatusId === account.accountId;
                  const isEditing = editingAccountId === account.accountId;

                  return (
                    <li
                      key={account.accountId}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-slate-900 dark:text-slate-100">{account.name}</p>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{buildDetails(account)}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {account.accountType === "CHECKING_ACCOUNT" && <button
                            type="button"
                            onClick={() => setSelectedAccount(account)}
                            className="rounded-md border border-slate-400 px-3 py-1 text-xs font-semibold"
                          >Ver movimentações</button>}
                          <button
                            type="button"
                            onClick={() => onEdit(account.accountId)}
                            disabled={isUpdatingStatus}
                            className="rounded-md border border-blue-500 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-400 dark:text-blue-200 dark:hover:bg-blue-900/60"
                          >
                            {isEditing ? "Editando" : "Editar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleStatus(account.accountId)}
                            disabled={isUpdatingStatus}
                            className="rounded-md border border-amber-500 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-400 dark:text-amber-200 dark:hover:bg-amber-900/40"
                          >
                            {isUpdatingStatus ? "Desativando..." : "Desativar"}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
          </div>}
          {inactiveAccounts.length > 0 && <div>
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Desativadas</h3>
              <ul className="mt-3 space-y-3">
                {inactiveAccounts.map((account) => {
                  const isUpdatingStatus = updatingAccountStatusId === account.accountId;
                  const isEditing = editingAccountId === account.accountId;

                  return (
                    <li
                      key={account.accountId}
                      className="rounded-xl border border-slate-200 bg-slate-50 p-4 opacity-80 dark:border-slate-700 dark:bg-slate-900"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="break-words font-semibold text-slate-900 dark:text-slate-100">{account.name}</p>
                            <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                              Inativa
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{buildDetails(account)}</p>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onEdit(account.accountId)}
                            disabled={isUpdatingStatus}
                            className="rounded-md border border-blue-500 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-400 dark:text-blue-200 dark:hover:bg-blue-900/60"
                          >
                            {isEditing ? "Editando" : "Editar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => onToggleStatus(account.accountId)}
                            disabled={isUpdatingStatus}
                            className="rounded-md border border-emerald-500 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-emerald-400 dark:text-emerald-200 dark:hover:bg-emerald-900/40"
                          >
                            {isUpdatingStatus ? "Reativando..." : "Reativar"}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
          </div>}
        </div>
      ) : null}
      {selectedAccount && (
        <FormModal open wide title="Movimentações" initialField="button[aria-label='Fechar']" onRequestDismiss={() => setSelectedAccount(null)}>
          {!isLoading && !error && !accounts.some(item => item.accountId === selectedAccount.accountId && item.active !== false && item.accountType === "CHECKING_ACCOUNT")
            ? <p role="alert" className="p-5 sm:p-7">A conta {selectedAccount.name} não está mais disponível.</p>
            : <AccountMovementsSection key={selectedAccount.accountId} account={selectedAccount}
                getAccessToken={getAccessToken} loadAccounts={loadAccounts} />}
        </FormModal>
      )}
    </section>
  );
}
