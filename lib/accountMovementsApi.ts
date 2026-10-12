import { accountsApiUrl } from './config';
import type { AccountSummary } from '../types/account';
import type { AccountMovement } from '../types/accountMovement';

export class AccountMovementsApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function request(path: string, token: string, signal?: AbortSignal) {
  let response: Response;
  try {
    response = await fetch(`${accountsApiUrl}${path}`, {
      method: 'GET', headers: { Authorization: `Bearer ${token}` }, signal, cache: 'no-store',
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
  }
  if (!response.ok) {
    const messages: Record<number, string> = {
      400: 'A consulta exige uma conta corrente válida.',
      401: 'Sua sessão expirou. Entre novamente.',
      403: 'Você não tem permissão para consultar esta conta.',
      404: 'Esta conta não está mais disponível.',
    };
    throw new AccountMovementsApiError(response.status, messages[response.status] ?? 'Não foi possível consultar os dados. Tente novamente.');
  }
  return response.json();
}

export function listMovementAccounts(token: string, signal?: AbortSignal): Promise<AccountSummary[]> {
  return request('', token, signal);
}

export function listAccountMovements(id: string, token: string, signal?: AbortSignal): Promise<AccountMovement[]> {
  return request(`/${encodeURIComponent(id)}/movements`, token, signal);
}

export function latestMovements(items: AccountMovement[]): AccountMovement[] {
  // Reverse first so stable sorting preserves the inverse API order for equal dates.
  return [...items].reverse().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
}
