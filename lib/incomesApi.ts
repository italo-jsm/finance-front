import { incomesApiUrl } from './config';
import type { Income, SaveIncomePayload } from '../types/income';

export class IncomeApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
async function request(path: string, token: string, options: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(`${incomesApiUrl}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
  }
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const messages: Record<number, string> = {
      400: 'Confira os campos do recebimento.', 401: 'Sua sessão expirou. Entre novamente.',
      403: 'Você não tem permissão para esta operação.', 404: 'O recebimento, a fonte ou a conta não está mais disponível.',
    };
    const codes: Record<string, string> = {
      INCOME_ALREADY_RECEIVED: 'Este recebimento já foi confirmado. Atualize a lista.',
      INCOME_RECEIVED_DATE_REQUIRED: 'Informe a data do recebimento.',
      INCOME_RECEIVED_DATE_INVALID: 'A data do recebimento não pode estar no futuro. Confira a data do seu dispositivo.',
      INCOME_ACCOUNT_TYPE_INVALID: 'Selecione uma conta corrente de destino.',
      INCOME_AMOUNT_INVALID: 'Informe um valor positivo com até duas casas decimais.',
      INCOME_COMPETENCE_INVALID: 'Informe uma competência válida com mês e ano.',
    };
    throw new IncomeApiError(response.status, body?.code ?? '', (response.status === 400 ? codes[body?.code] : undefined) ?? messages[response.status] ?? 'Não foi possível concluir a operação. Tente novamente.');
  }
  return response;
}
export async function listIncomes(month: string, token: string, signal?: AbortSignal): Promise<Income[]> {
  return (await request(`?${new URLSearchParams({ month })}`, token, { signal })).json();
}
export async function createIncome(payload: SaveIncomePayload, token: string): Promise<void> {
  await request('', token, { method: 'POST', body: JSON.stringify(payload) });
}
export async function updateIncome(id: string, payload: SaveIncomePayload, token: string): Promise<Income> {
  return (await request(`/${encodeURIComponent(id)}`, token, { method: 'PUT', body: JSON.stringify(payload) })).json();
}
export async function receiveIncome(id: string, receivedDate: string, token: string): Promise<Income> {
  return (await request(`/${encodeURIComponent(id)}/receive`, token, { method: 'POST', body: JSON.stringify({ receivedDate }) })).json();
}
