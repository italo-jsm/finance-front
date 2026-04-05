"use client";

import { accountTypeOptions, type AccountSummary } from "@/types/account";

type AccountListProps = {
  accounts: AccountSummary[];
  isLoading: boolean;
  error: string;
  success: string;
  updatingAccountStatusId: string | null;
  editingAccountId: string | null;
  onEdit: (accountId: string) => void;
  onToggleStatus: (accountId: string) => void;
};

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

  return details.join(" • ");
}

export function AccountList({
  accounts,
  isLoading,
  error,
  success,
  updatingAccountStatusId,
  editingAccountId,
  onEdit,
  onToggleStatus,
}: AccountListProps) {
  const activeAccounts = accounts.filter((account) => account.active !== false);
  const inactiveAccounts = accounts.filter((account) => account.active === false);

  return (
    <section className="mt-8">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">Contas cadastradas</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Edite os dados da conta e desative itens que nao estao mais em uso.
        </p>
      </div>

      {error ? (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
          {error}
        </div>
      ) : null}

      {success ? (
        <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200">
          {success}
        </div>
      ) : null}

      {isLoading ? <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">Carregando contas...</p> : null}

      {!isLoading && accounts.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">Nenhuma conta cadastrada ainda.</p>
      ) : null}

      {!isLoading && accounts.length > 0 ? (
        <div className="mt-4 space-y-6">
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Ativas</h4>
            {activeAccounts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">Nenhuma conta ativa no momento.</p>
            ) : (
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
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Desativadas</h4>
            {inactiveAccounts.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-300">Nenhuma conta desativada.</p>
            ) : (
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
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
