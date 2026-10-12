import { expensesApiUrl } from './config';

export class ExpenseReversalApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function reverseExpense(id: string, token: string): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${expensesApiUrl}/${encodeURIComponent(id)}/reverse`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('Não foi possível confirmar o resultado do estorno. Atualize os dados antes de tentar novamente.');
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: 'A despesa já foi estornada ou não está disponível para estorno.',
      404: 'A despesa não está disponível para estorno.',
      401: 'Sua sessão expirou. Entre novamente.',
      403: 'Você não tem permissão para estornar esta despesa.',
    };
    throw new ExpenseReversalApiError(response.status, messages[response.status] ?? 'Não foi possível confirmar o estorno. Atualize os dados antes de tentar novamente.');
  }
}
