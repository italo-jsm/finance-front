'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AccountSummary } from '../types/account';
import type { AccountMovement } from '../types/accountMovement';
import { AccountMovementsApiError, latestMovements, listAccountMovements, listMovementAccounts } from '../lib/accountMovementsApi';

type State = {
  account: AccountSummary | null;
  movements: AccountMovement[];
  loading: boolean;
  balanceError: string;
  movementsError: string;
  unavailable: boolean;
};
const emptyState: State = { account: null, movements: [], loading: true, balanceError: '', movementsError: '', unavailable: false };
const message = (error: unknown) => error instanceof Error ? error.message : 'Tente novamente.';

export function useAccountMovements(selected: AccountSummary, getAccessToken: () => Promise<string>) {
  const [state, setState] = useState<State>(emptyState);
  const request = useRef<AbortController | null>(null);
  const tokenGetter = useRef(getAccessToken);
  useEffect(() => { tokenGetter.current = getAccessToken; }, [getAccessToken]);

  const reload = useCallback(async () => {
    if (request.current && !request.current.signal.aborted) return;
    const controller = new AbortController();
    request.current = controller;
    setState(emptyState);
    try {
      const token = await tokenGetter.current();
      if (controller.signal.aborted) return;
      const [accounts, movements] = await Promise.allSettled([
        listMovementAccounts(token, controller.signal),
        listAccountMovements(selected.accountId, token, controller.signal),
      ]);
      if (controller.signal.aborted) return;
      const account = accounts.status === 'fulfilled'
        ? accounts.value.find(item => item.accountId === selected.accountId && item.accountType === 'CHECKING_ACCOUNT' && item.active !== false) ?? null
        : null;
      const unavailable = (accounts.status === 'fulfilled' && !account) ||
        [accounts, movements].some(result => result.status === 'rejected' && result.reason instanceof AccountMovementsApiError && result.reason.status === 404);
      setState({
        account: unavailable ? null : account,
        movements: unavailable || movements.status === 'rejected' ? [] : latestMovements(movements.value),
        loading: false,
        balanceError: accounts.status === 'rejected' ? `Saldo: ${message(accounts.reason)}` : '',
        movementsError: movements.status === 'rejected' ? `Movimentações: ${message(movements.reason)}` : '',
        unavailable,
      });
    } catch (error) {
      if (!controller.signal.aborted) setState({ ...emptyState, loading: false, balanceError: `Saldo: ${message(error)}`, movementsError: `Movimentações: ${message(error)}` });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }, [selected.accountId]);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => { if (active) void reload(); });
    return () => { active = false; request.current?.abort(); };
  }, [reload]);

  return { ...state, reload };
}
