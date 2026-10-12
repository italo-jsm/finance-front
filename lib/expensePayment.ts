import type { Expense } from '../types/expense';
import type { AccountSummary } from '../types/account';

export type ExpensePaymentPayload = { paidFromAccountId: string; paymentDate: string; paymentMethod: string };
export const paymentMethods: Record<string, string> = { PIX: 'PIX', DEBIT: 'Débito', CASH: 'Dinheiro', TRANSFER: 'Transferência' };
export function localToday() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function expensePaymentFields(item: Omit<Partial<Expense>, 'paidFromAccountId'> & { paidFromAccountId?: string | null; paymentDate?: string | null }) {
  return {
    paymentStatus: item.paymentStatus,
    canPay: item.canPay === true,
    totalPaid: item.totalPaid,
    payment: item.payment ?? null,
    reversedDate: item.reversedDate ?? null,
    canReverse: item.canReverse === true,
    isPaid: item.paymentStatus ? item.paymentStatus === 'PAID' : item.isPaid ?? Boolean(item.paymentDate || item.paidFromAccountId),
    paidFromAccountId: item.payment?.paidFromAccountId ?? item.paidFromAccountId ?? '',
    paymentMethod: item.payment?.paymentMethod ?? item.paymentMethod ?? null,
  };
}
export function canPayExpense(expense: Expense) {
  return Boolean(expense.expenseId && expense.canPay === true && !expense.reversedDate);
}
export function validateExpensePayment(payload: ExpensePaymentPayload, accounts: AccountSummary[]) {
  if (!accounts.some(a => a.accountId === payload.paidFromAccountId && a.accountType === 'CHECKING_ACCOUNT' && a.active !== false)) return 'Escolha uma conta corrente ativa.';
  const date = new Date(`${payload.paymentDate}T12:00:00Z`);
  if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(payload.paymentDate) || payload.paymentDate.startsWith('0000') || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== payload.paymentDate) return 'Informe uma data de pagamento válida.';
  if (!Object.hasOwn(paymentMethods, payload.paymentMethod)) return 'Escolha a forma de pagamento.';
  return '';
}
