import { incomeSourcesApiUrl } from './config';
import type { IncomeSource, SaveIncomeSourcePayload } from '../types/incomeSource';

export class IncomeSourceApiError extends Error {
  constructor(public status: number, public code: string, message: string) { super(message); }
}
async function request(token: string, id = '', options: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(`${incomeSourcesApiUrl}${id ? `/${encodeURIComponent(id)}` : ''}`, {
      ...options, headers: { Authorization: `Bearer ${token}`, ...(options.body ? { 'Content-Type': 'application/json' } : {}) },
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const messages: Record<number, string> = {
      400: 'Confira o nome, o tipo, o dia previsto e o valor estimado da fonte de renda.',
      401: 'Sua sessão expirou. Entre novamente.', 403: 'Você não tem permissão para esta operação.',
      404: 'Esta fonte de renda não está mais disponível.', 409: 'Já existe uma fonte de renda com esse nome.',
    };
    const validationMessages: Record<string, string> = {
      INCOME_SOURCE_EXPECTED_DAY_REQUIRED: 'Informe o dia previsto do recebimento.',
      INCOME_SOURCE_EXPECTED_DAY_INVALID: 'O dia previsto deve ser um inteiro entre 1 e 31.',
      INCOME_SOURCE_ESTIMATED_AMOUNT_REQUIRED: 'Informe o valor estimado da renda.',
      INCOME_SOURCE_ESTIMATED_AMOUNT_INVALID: 'O valor estimado deve ser positivo e ter até duas casas decimais.',
    };
    const message = (response.status === 400 ? validationMessages[payload?.code] : undefined) ?? messages[response.status] ?? 'Não foi possível concluir a operação. Tente novamente.';
    throw new IncomeSourceApiError(response.status, payload?.code ?? '', message);
  }
  return response;
}
export async function listIncomeSources(token: string, signal?: AbortSignal): Promise<IncomeSource[]> {
  return (await request(token, '', { signal })).json();
}
export async function getIncomeSource(id: string, token: string, signal?: AbortSignal): Promise<IncomeSource> {
  return (await request(token, id, { signal })).json();
}
export async function createIncomeSource(payload: SaveIncomeSourcePayload, token: string): Promise<void> {
  await request(token, '', { method: 'POST', body: JSON.stringify(payload) });
}
export async function updateIncomeSource(id: string, payload: SaveIncomeSourcePayload, token: string): Promise<IncomeSource> {
  return (await request(token, id, { method: 'PUT', body: JSON.stringify(payload) })).json();
}
