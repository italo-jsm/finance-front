import type { Expense } from '../types/expense';
import type { AccountSummary } from '../types/account';
import { canPayExpense, paymentMethods } from '../lib/expensePayment';
export type ExpensePaymentProps = {
  onPay?: (expense: Expense) => void;
  paymentBlockedIds?: Set<string>;
  paymentBusy?: boolean;
  paymentAccounts?: AccountSummary[];
};
export function ExpensePaymentAction({ expense, accounts = [], onPay, blocked = false }: {
  expense: Expense; accounts?: AccountSummary[]; onPay?: (expense: Expense) => void; blocked?: boolean;
}) {
  const labels = { PENDING: 'Pendente', PAID: 'Paga', PARTIALLY_PAID: 'Parcialmente paga', REVERSED: 'Estornada' };
  const status = expense.reversedDate ? 'REVERSED' : expense.paymentStatus;
  const payment = expense.payment;
  const source = accounts.find(a => a.accountId === payment?.paidFromAccountId);
  return <div className="flex flex-wrap items-center gap-2 text-sm">
    <span>{status ? labels[status] : expense.isPaid ? 'Paga' : 'Pendente'}{expense.reversedDate ? ` em ${expense.reversedDate.split('-').reverse().join('/')}` : ''}</span>
    {payment && <span>{payment.paymentDate.split('-').reverse().join('/')} • {paymentMethods[payment.paymentMethod] ?? payment.paymentMethod}{source ? ` • ${source.name}` : ''}</span>}
    {onPay && canPayExpense(expense) && <button type="button" disabled={blocked} onClick={() => onPay(expense)}
      className="rounded-md border border-emerald-600 px-3 py-1 text-xs font-semibold text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60 dark:text-emerald-200">
      Marcar como paga
    </button>}
  </div>;
}
