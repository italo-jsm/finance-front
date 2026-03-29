"use client";

import { Expense } from "../types/expense";

type ExpenseFormProps = {
  expense: Expense;
  setExpense: (value: Expense) => void;
  isEditing: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

export function ExpenseForm({ expense, setExpense, isEditing, onSubmit, onCancel }: ExpenseFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label htmlFor="date" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Data
        </label>
        <input
          id="date"
          type="date"
          value={expense.date}
          onChange={(e) => setExpense({ ...expense, date: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Descrição
        </label>
        <input
          id="description"
          type="text"
          value={expense.description}
          onChange={(e) => setExpense({ ...expense, description: e.target.value })}
          placeholder="Ex: Conta de luz"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div>
        <label htmlFor="value" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Valor
        </label>
        <input
          id="value"
          type="number"
          step="0.01"
          value={expense.value || ""}
          onChange={(e) => setExpense({ ...expense, value: Number(e.target.value) })}
          placeholder="0.00"
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        />
      </div>

      <div>
        <label htmlFor="paymentMethod" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
          Forma de pagamento
        </label>
        <select
          id="paymentMethod"
          value={expense.paymentMethod}
          onChange={(e) => setExpense({ ...expense, paymentMethod: e.target.value })}
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        >
          <option value="">Selecione</option>
          <option value="Dinheiro">Dinheiro</option>
          <option value="Cartão de crédito">Cartão de crédito</option>
          <option value="Cartão de débito">Cartão de débito</option>
          <option value="PIX">PIX</option>
          <option value="Outro">Outro</option>
        </select>
      </div>

      <div className="flex items-center justify-between gap-2">
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700"
        >
          {isEditing ? "Atualizar" : "Salvar"}
        </button>
        {isEditing && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}
