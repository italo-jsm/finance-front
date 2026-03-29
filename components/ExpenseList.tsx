"use client";

import { Expense } from "../types/expense";

type ExpenseListProps = {
  expenses: Expense[];
  onEdit: (index: number) => void;
  onDelete: (index: number) => void;
};

export function ExpenseList({ expenses, onEdit, onDelete }: ExpenseListProps) {
  if (!expenses.length) {
    return <p className="mt-6 text-sm text-slate-500 dark:text-slate-300">Nenhuma despesa cadastrada ainda.</p>;
  }

  return (
    <section className="mt-6">
      <h3 className="text-lg font-semibold">Últimas despesas</h3>
      <ul className="mt-3 space-y-2">
        {expenses.map((item, index) => (
          <li key={`${item.date}-${item.description}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900">
            <div className="flex w-full items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm text-slate-600 dark:text-slate-300">{item.date} • {item.paymentMethod}</p>
                <p className="font-medium break-words">{item.description}</p>
                <p className="text-base font-bold">R$ {item.value.toFixed(2)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => onEdit(index)}
                  className="rounded-md border border-blue-500 px-3 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-200 dark:hover:bg-blue-900/60"
                >
                  Editar
                </button>
                <button
                  type="button"
                  onClick={() => onDelete(index)}
                  className="rounded-md border border-red-500 px-3 py-1 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-400 dark:text-red-200 dark:hover:bg-red-900/60"
                >
                  Excluir
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
