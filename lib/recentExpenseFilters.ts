import type { Expense, ExpenseCategory } from "../types/expense";

export type RecentExpenseFilters = {
  dateFrom: string;
  dateTo: string;
  accountId: string;
  category: ExpenseCategory | "";
  paymentStatus: NonNullable<Expense["paymentStatus"]> | "";
  minimumAmount: number | null;
};

export const emptyRecentExpenseFilters: RecentExpenseFilters = {
  dateFrom: "",
  dateTo: "",
  accountId: "",
  category: "",
  paymentStatus: "",
  minimumAmount: null,
};

export const expenseStatusLabels = {
  PENDING: "Pendente",
  PAID: "Paga",
  PARTIALLY_PAID: "Parcialmente paga",
  REVERSED: "Estornada",
};

export function getExpenseStatus(expense: Expense): NonNullable<Expense["paymentStatus"]> {
  if (expense.reversedDate) return "REVERSED";
  return expense.paymentStatus ?? (expense.isPaid ? "PAID" : "PENDING");
}

export function filterRecentExpenses(expenses: Expense[], filters: RecentExpenseFilters) {
  return expenses
    .map((expense, index) => ({ expense, index }))
    .filter(({ expense }) =>
      (!filters.accountId || expense.accountId === filters.accountId) &&
      (!filters.category || expense.category === filters.category) &&
      (!filters.paymentStatus || getExpenseStatus(expense) === filters.paymentStatus) &&
      (filters.minimumAmount === null || expense.value >= filters.minimumAmount),
    )
    .sort((left, right) => right.expense.date.localeCompare(left.expense.date));
}
