'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useIncomeSources } from '@/hooks/useIncomeSources';
import { IncomeForm } from '@/components/IncomeForm';
import { IncomeList } from '@/components/IncomeList';
import { buildIncomePayload, getLocalDate, incomeToForm, isValidMonth } from '@/lib/incomeForm';
import { createIncome, listIncomes, receiveIncome, updateIncome } from '@/lib/incomesApi';
import { emptyIncomeForm, type Income } from '@/types/income';
import type { AccountSummary } from '@/types/account';

type Props = {
  accounts: AccountSummary[];
  accountsLoading: boolean;
  accountsError: string;
  onAccountsChange: () => Promise<void>;
};
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Não foi possível concluir a operação.';

export function IncomesSection({ accounts, accountsLoading, accountsError, onAccountsChange }: Props) {
  const { getAccessToken } = useAuth();
  const { sources, loading: sourcesLoading, error: sourcesError } = useIncomeSources();
  const tokenGetter = useRef(getAccessToken);
  useEffect(() => { tokenGetter.current = getAccessToken; }, [getAccessToken]);
  const [month, setMonth] = useState(() => getLocalDate().slice(0, 7));
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [values, setValues] = useState(emptyIncomeForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [receivingId, setReceivingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const busy = useRef(false);
  const formRef = useRef<HTMLDivElement>(null);
  const mutationInProgress = submitting || receivingId !== null;
  const checkingAccounts = accounts.filter(account => account.accountType === 'CHECKING_ACCOUNT');
  const prerequisitesMissing = sourcesLoading || accountsLoading || Boolean(sourcesError || accountsError) || !sources.length || !checkingAccounts.length;

  const reload = useCallback(async (selectedMonth: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setListError(''); setIncomes([]);
    try {
      const token = await tokenGetter.current();
      if (controller.signal.aborted) return;
      const items = await listIncomes(selectedMonth, token, controller.signal);
      if (mounted.current && !controller.signal.aborted) setIncomes(items);
    } catch (error) {
      if (mounted.current && !controller.signal.aborted) setListError(errorMessage(error));
    } finally {
      if (mounted.current && !controller.signal.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mounted.current = true;
    void reload(month);
    return () => { mounted.current = false; request.current?.abort(); };
  }, [month, reload]);

  function resetForm() { setValues(emptyIncomeForm); setEditingId(null); }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || prerequisitesMissing) return;
    setError(''); setSuccess('');
    busy.current = true; setSubmitting(true);
    try {
      const payload = buildIncomePayload(values);
      if (!sources.some(source => source.id === payload.incomeSourceId) || !checkingAccounts.some(account => account.accountId === payload.accountId)) {
        throw new Error('Selecione uma fonte e uma conta corrente disponíveis.');
      }
      const token = await tokenGetter.current();
      if (!mounted.current) return;
      if (editingId) await updateIncome(editingId, payload, token);
      else await createIncome(payload, token);
      if (!mounted.current) return;
      // A successful write stays successful even if the following query fails.
      resetForm();
      setSuccess(editingId ? 'Recebimento atualizado com sucesso.' : 'Recebimento cadastrado como pendente.');
      const savedMonth = payload.expectedDate.slice(0, 7);
      if (savedMonth === month) await reload(month);
      else setMonth(savedMonth);
    } catch (error) {
      if (mounted.current) setError(errorMessage(error));
    } finally {
      busy.current = false;
      if (mounted.current) setSubmitting(false);
    }
  }

  async function receive(income: Income) {
    if (busy.current || loading || income.receivedDate !== null || income.status === 'RECEIVED') return;
    busy.current = true; setReceivingId(income.id); setError(''); setSuccess('');
    // Cancel an older list request so it cannot restore a pending copy after success.
    request.current?.abort();
    try {
      const token = await tokenGetter.current();
      if (!mounted.current) return;
      const received = await receiveIncome(income.id, getLocalDate(), token);
      if (!mounted.current) return;
      setIncomes(current => current.map(item => item.id === received.id ? received : item));
      if (editingId === income.id) resetForm();
      setSuccess('Recebimento confirmado com sucesso.');
      try { await onAccountsChange(); }
      catch {
        if (mounted.current) setError('Recebimento confirmado, mas não foi possível atualizar o saldo. Recarregue a página para consultar o saldo atual.');
      }
    } catch (error) {
      if (mounted.current) setError(errorMessage(error));
    } finally {
      busy.current = false;
      if (mounted.current) setReceivingId(null);
    }
  }

  function edit(income: Income) {
    if (busy.current || income.receivedDate !== null || income.status === 'RECEIVED') return;
    setValues(incomeToForm(income)); setEditingId(income.id); setError(''); setSuccess('');
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
      <div ref={formRef}>
        <h2 className="text-2xl font-bold">{editingId ? 'Editar recebimento' : 'Cadastrar recebimento'}</h2>
        {(accountsLoading || sourcesLoading) && <p role="status" className="mt-3 text-sm">Carregando fontes e contas...</p>}
        {(sourcesError || accountsError) && <p role="alert" className="mt-3 text-red-700 dark:text-red-300">{sourcesError || accountsError}</p>}
        {!sourcesLoading && !sourcesError && !sources.length && <p className="mt-3 text-sm">Cadastre uma fonte de renda em Fontes de renda para continuar.</p>}
        {!accountsLoading && !accountsError && !checkingAccounts.length && <p className="mt-3 text-sm">Cadastre uma conta corrente em Contas para continuar.</p>}
        <IncomeForm values={values} accounts={accounts} sources={sources} editing={Boolean(editingId)} disabled={mutationInProgress || prerequisitesMissing} submitting={submitting} error={error}
          onChange={setValues} onSubmit={save} onCancel={() => { if (!busy.current) { resetForm(); setError(''); } }} />
        {success && <p role="status" className="mt-4 text-emerald-700 dark:text-emerald-300">{success}</p>}
      </div>
      <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-700">
        <h3 className="text-lg font-semibold">Recebimentos previstos</h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Ao marcar Recebido, a confirmação usa a data de hoje e não poderá ser desfeita.</p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div>
            <label htmlFor="income-month" className="block text-sm font-medium">Mês da data prevista</label>
            <input id="income-month" type="month" min="0001-01" max="9999-12" value={month} disabled={mutationInProgress}
              onChange={event => { if (!busy.current && isValidMonth(event.target.value)) setMonth(event.target.value); }}
              className="mt-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100" />
          </div>
          <button type="button" disabled={loading || mutationInProgress} onClick={() => { void reload(month); }} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-60 dark:border-slate-700">Atualizar lista</button>
        </div>
        <IncomeList incomes={incomes} accounts={accounts} sources={sources} loading={loading} error={listError} receivingId={receivingId} disabled={mutationInProgress} onReceive={receive} onEdit={edit} />
      </div>
    </section>
  );
}
