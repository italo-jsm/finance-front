import type { Expense } from '../types/expense';

export type ExpenseReversalProps = {
  onReverse: (expense: Expense) => void;
  reversingId: string | null;
  reversalBlockedIds: Set<string>;
};

export const reversedExpenseClass = 'border-amber-400 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/40';

export function ExpenseReversalAction({ expense, busy, blocked, onReverse }: {
  expense: Expense; busy: boolean; blocked: boolean; onReverse: (expense: Expense) => void;
}) {
  if (expense.reversedDate) return (
    <span className="text-sm font-semibold text-amber-900 dark:text-amber-200">
      {`Estornada em ${expense.reversedDate.split('-').reverse().join('/')}`}
    </span>
  );
  if (!expense.expenseId || expense.canReverse !== true) return null;
  return (
    <button type="button" disabled={busy || blocked} onClick={() => onReverse(expense)}
      className="rounded-md border border-amber-600 px-3 py-1 text-xs font-semibold text-amber-900 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-amber-400 dark:text-amber-200 dark:hover:bg-amber-900/60">
      {busy ? 'Estornando…' : 'Estornar'}
    </button>
  );
}
