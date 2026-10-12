import { expensesApiUrl } from './config';
import type { ExpensePaymentPayload } from './expensePayment';
export class ExpensePaymentApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}
export async function payExpense(id: string, payload: ExpensePaymentPayload, token: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${expensesApiUrl}/${encodeURIComponent(id)}/pay`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ paidFromAccountId: payload.paidFromAccountId, paymentDate: payload.paymentDate, paymentMethod: payload.paymentMethod }),
    });
  } catch {
    throw new Error('Não foi possível confirmar o resultado do pagamento. Atualize os dados antes de tentar novamente.');
  }
  if (!response.ok) throw new ExpensePaymentApiError(response.status === 400 || response.status === 404
    ? 'Pagamento não disponível ou dados inválidos. Atualize os dados e confira a despesa e a conta escolhida.'
    : 'Não foi possível registrar o pagamento. Atualize os dados antes de tentar novamente.', response.status);
}
