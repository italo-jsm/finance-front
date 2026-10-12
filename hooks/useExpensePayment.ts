import { useEffect, useRef, useState } from 'react';
import type { Expense } from '../types/expense';
import { canPayExpense, type ExpensePaymentPayload } from '../lib/expensePayment';
import { payExpense, ExpensePaymentApiError } from '../lib/expensePaymentApi';

export function useExpensePayment(getAccessToken: () => Promise<string>, refresh: () => Promise<void>, sessionKey: string) {
  const lock = useRef(false);
  const generation = useRef(0);
  const selectedRef = useRef<Expense | null>(null);
  const confirmed = useRef(new Set<string>());
  const uncertain = useRef(new Set<string>());
  const [selected, setSelected] = useState<Expense | null>(null);
  const [busy, setBusy] = useState(false);
  const [blockedIds, setBlockedIds] = useState(new Set<string>());
  const [message, setMessage] = useState('');
  useEffect(() => {
    const current = generation.current;
    confirmed.current.clear(); uncertain.current.clear(); selectedRef.current = null;
    void Promise.resolve().then(() => {
      if (current !== generation.current) return;
      setSelected(null); setBusy(false); setBlockedIds(new Set()); setMessage('');
    });
    return () => { generation.current = current + 1; };
  }, [sessionKey]);
  function updateBlocked() { setBlockedIds(new Set([...confirmed.current, ...uncertain.current])); }
  function open(expense: Expense) {
    if (sessionKey !== 'authenticated' || lock.current || !canPayExpense(expense) || confirmed.current.has(expense.expenseId!) || uncertain.current.has(expense.expenseId!)) return;
    selectedRef.current = expense; setSelected(expense); setMessage('');
  }
  function cancel() {
    if (lock.current) return;
    selectedRef.current = null; setSelected(null);
  }
  async function reload() {
    if (sessionKey !== 'authenticated' || lock.current) return;
    lock.current = true; setBusy(true);
    const current = generation.current;
    try {
      await refresh();
      if (current !== generation.current) return;
      uncertain.current.clear(); updateBlocked(); setMessage('Dados atualizados.');
      selectedRef.current = null; setSelected(null);
    } catch {
      if (current === generation.current) setMessage('Não foi possível atualizar os dados. Tente atualizar novamente.');
    } finally {
      lock.current = false; if (current === generation.current) setBusy(false);
    }
  }
  async function submit(payload: ExpensePaymentPayload) {
    const expense = selectedRef.current;
    const id = expense?.expenseId;
    if (sessionKey !== 'authenticated' || lock.current || !expense || !id || !canPayExpense(expense) || confirmed.current.has(id) || uncertain.current.has(id)) return;
    lock.current = true; setBusy(true); setMessage('');
    const current = generation.current; let sent = false;
    try {
      const token = await getAccessToken();
      if (current !== generation.current) return;
      sent = true;
      await payExpense(id, payload, token);
      if (current !== generation.current) return;
      confirmed.current.add(id); updateBlocked(); selectedRef.current = null; setSelected(null);
      try {
        await refresh();
        if (current === generation.current) setMessage('Pagamento registrado. Dados atualizados.');
      } catch {
        if (current === generation.current) setMessage('Pagamento registrado, mas não foi possível atualizar os dados.');
      }
    } catch (error) {
      if (current !== generation.current) return;
      setMessage(error instanceof Error ? error.message : 'Não foi possível registrar o pagamento.');
      if (sent) {
        uncertain.current.add(id); updateBlocked(); selectedRef.current = null; setSelected(null);
        if (error instanceof ExpensePaymentApiError && [400, 404].includes(error.status)) {
          try {
            await refresh();
            if (current !== generation.current) return;
            uncertain.current.delete(id); updateBlocked();
          } catch {
            if (current === generation.current) setMessage(`${error.message} Não foi possível atualizar os dados.`);
          }
        }
      }
    } finally {
      lock.current = false; if (current === generation.current) setBusy(false);
    }
  }
  return { selected, busy, blockedIds, message, open, cancel, submit, reload };
}
