import { useEffect, useRef, useState } from 'react';
import type { Expense } from '../types/expense';
import { ExpenseReversalApiError, reverseExpense } from '../lib/expenseReversalApi';

export function useExpenseReversal(getAccessToken: () => Promise<string>, refresh: () => Promise<void>, sessionKey = 'authenticated') {
  const lock = useRef(false);
  const confirmed = useRef(new Set<string>());
  const uncertain = useRef(new Set<string>());
  const generation = useRef(0);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const [blockedIds, setBlockedIds] = useState(new Set<string>());
  const [message, setMessage] = useState('');
  useEffect(() => {
    confirmed.current.clear();
    uncertain.current.clear();
    const current = generation.current;
    void Promise.resolve().then(() => {
      if (current !== generation.current) return;
      setBlockedIds(new Set());
      setBusyId(null);
      setUpdating(false);
      setMessage('');
    });
    return () => { generation.current = current + 1; };
  }, [sessionKey]);

  async function reload() {
    if (lock.current || sessionKey !== 'authenticated') return;
    lock.current = true;
    const current = generation.current;
    setUpdating(true);
    try {
      await refresh();
      if (current !== generation.current) return;
      uncertain.current.clear();
      setBlockedIds(new Set(confirmed.current));
      setMessage('Dados atualizados.');
    } catch {
      if (current === generation.current) setMessage('Não foi possível atualizar todos os dados. Tente atualizar novamente.');
    } finally {
      lock.current = false;
      if (current === generation.current) setUpdating(false);
    }
  }

  async function reverse(expense: Expense) {
    const id = expense.expenseId;
    if (sessionKey !== 'authenticated' || lock.current || !id || expense.canReverse !== true || expense.reversedDate || confirmed.current.has(id) || uncertain.current.has(id)) return;
    if (!window.confirm(`Estornar “${expense.description}” (${expense.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})? O valor integral será devolvido à conta relacionada.`)) return;
    lock.current = true;
    const current = generation.current;
    setBusyId(id);
    setMessage('');
    let sent = false;
    try {
      const token = await getAccessToken();
      if (current !== generation.current) return;
      sent = true;
      await reverseExpense(id, token);
      if (current !== generation.current) return;
      confirmed.current.add(id);
      setBlockedIds(new Set([...confirmed.current, ...uncertain.current]));
      try {
        await refresh();
        if (current === generation.current) setMessage('Estorno concluído. Dados atualizados.');
      } catch {
        if (current === generation.current) setMessage('Estorno concluído, mas não foi possível atualizar todos os dados. Atualize os dados novamente.');
      }
    } catch (error) {
      if (current !== generation.current) return;
      setMessage(error instanceof Error ? error.message : 'Não foi possível estornar a despesa.');
      if (sent) {
        uncertain.current.add(id);
        setBlockedIds(new Set([...confirmed.current, ...uncertain.current]));
        if (error instanceof ExpenseReversalApiError && (error.status === 400 || error.status === 404)) {
          try {
            await refresh();
            if (current !== generation.current) return;
            uncertain.current.delete(id);
            setBlockedIds(new Set([...confirmed.current, ...uncertain.current]));
          } catch {
            if (current === generation.current) setMessage(`${error.message} Não foi possível atualizar os dados; tente atualizar novamente.`);
          }
        }
      }
    } finally {
      lock.current = false;
      if (current === generation.current) setBusyId(null);
    }
  }

  return { busyId, updating, blockedIds, message, reverse, reload };
}
