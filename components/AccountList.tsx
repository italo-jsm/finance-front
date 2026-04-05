"use client";

import { accountTypeOptions, type AccountSummary } from "@/types/account";

type AccountListProps = {
  accounts: AccountSummary[];
  isLoading: boolean;
  error: string;
  success: string;
  deletingAccountId: string | null;
  editingAccountId: string | null;
  onEdit: (accountId: string) => void;
  onDelete: (accountId: string) => void;
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
  deletingAccountId,
  editingAccountId,
  onEdit,
  onDelete,
}: AccountListProps) {
  return (
    <section className="mt-8">
      <div className="flex flex-col gap-1">
        <h3 className="text-lg font-semibold">Contas ativas</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Edite os dados da conta ou remova itens que nao estao mais em uso.
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
        <p className="mt-4 text-sm text-slate-500 dark:text-slate-300">Nenhuma conta ativa cadastrada ainda.</p>
      ) : null}

      {!isLoading && accounts.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {accounts.map((account) => {
            const isDeleting = deletingAccountId === account.accountId;
            const isEditing = editingAccountId === account.accountId;

            return (
              <li
                key={account.accountId}
                className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 break-words dark:text-slate-100">{account.name}</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{buildDetails(account)}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onEdit(account.accountId)}
                      disabled={isDeleting}
                      className="rounded-md border border-blue-500 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-400 dark:text-blue-200 dark:hover:bg-blue-900/60"
                    >
                      {isEditing ? "Editando" : "Editar"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(account.accountId)}
                      disabled={isDeleting}
                      className="rounded-md border border-red-500 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-red-400 dark:text-red-200 dark:hover:bg-red-900/60"
                    >
                      {isDeleting ? "Excluindo..." : "Excluir"}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </section>
  );
}
