'use client';

import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { useIncomeSources } from '@/hooks/useIncomeSources';
import { IncomeForm } from '@/components/IncomeForm';
import { IncomeList } from '@/components/IncomeList';
import { ListToolbar } from './ListToolbar';
import { RecordFormModal } from './FormModal';
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
  const defaultFilters = { month: getLocalDate().slice(0, 7), account: '', source: '', status: '' };
  const [filters, setFilters] = useState(defaultFilters);
  const { month } = filters;
  const [loadedMonth, setLoadedMonth] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
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
  const mutationInProgress = submitting || receivingId !== null;
  const checkingAccounts = accounts.filter(account => account.accountType === 'CHECKING_ACCOUNT');
  const prerequisitesMissing = sourcesLoading || accountsLoading || Boolean(sourcesError || accountsError) || !sources.length || !checkingAccounts.length;

  const reload = useCallback(async (selectedMonth: string) => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setListError('');
    try {
      const token = await tokenGetter.current();
      if (controller.signal.aborted) return;
      const items = await listIncomes(selectedMonth, token, controller.signal);
      if (mounted.current && !controller.signal.aborted) {
        setIncomes(items);
        setLoadedMonth(selectedMonth);
      }
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

  function resetForm() {
    setFormOpen(false); setDirty(false); setValues(emptyIncomeForm); setEditingId(null); setError('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formOpen || busy.current || prerequisitesMissing) return;
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
      const savedMonth = payload.expectedDate.slice(0, 7);
      const confirmation = editingId ? 'Recebimento atualizado com sucesso.' : 'Recebimento cadastrado como pendente.';
      setSuccess(savedMonth === month ? confirmation : `${confirmation} Veja o mês ${savedMonth.split('-').reverse().join('/')} nos filtros.`);
      void reload(month);
    } catch (error) {
      if (mounted.current) setError(errorMessage(error));
    } finally {
      busy.current = false;
      if (mounted.current) setSubmitting(false);
    }
  }

  async function receive(income: Income) {
    if (busy.current || loading || loadedMonth !== month || income.receivedDate !== null || income.status === 'RECEIVED') return;
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
    if (busy.current || loadedMonth !== month || income.receivedDate !== null || income.status === 'RECEIVED') return;
    setValues(incomeToForm(income)); setEditingId(income.id); setError(''); setSuccess('');
    setDirty(false); setFormOpen(true);
  }

  const visibleIncomes = incomes.filter((income) => {
    const status = income.receivedDate !== null || income.status === 'RECEIVED' ? 'RECEIVED' : 'PENDING';
    return (!filters.account || income.accountId === filters.account) &&
      (!filters.source || income.incomeSourceId === filters.source) &&
      (!filters.status || status === filters.status);
  });
  const fields = [
    { name: 'month', label: 'Mês da data prevista', type: 'month' as const },
    { name: 'account', label: 'Conta', options: [{ value: '', label: 'Todas as contas' }, ...checkingAccounts.map((account) => ({ value: account.accountId, label: account.name }))] },
    { name: 'source', label: 'Fonte de renda', options: [{ value: '', label: 'Todas as fontes' }, ...sources.map((source) => ({ value: source.id, label: source.name }))] },
    { name: 'status', label: 'Situação', options: [{ value: '', label: 'Todas' }, { value: 'PENDING', label: 'Pendente' }, { value: 'RECEIVED', label: 'Recebido' }] },
  ];

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
      <ListToolbar title="Recebimentos" createLabel="Novo recebimento" disabled={mutationInProgress} fields={fields} filters={filters} defaults={defaultFilters}
        onApply={(next) => { if (!busy.current && isValidMonth(next.month)) setFilters(next); }}
        onCreate={() => { resetForm(); setSuccess(''); setFormOpen(true); }} />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600 dark:text-slate-300">
        <p>Previsão: {month.split('-').reverse().join('/')}</p>
        {!listError && <button type="button" disabled={loading || mutationInProgress} onClick={() => void reload(month)}
          className="min-h-11 px-2 font-semibold text-blue-800 hover:underline disabled:opacity-60 dark:text-blue-200">Atualizar lista</button>}
      </div>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Ao marcar Recebido, a confirmação usa a data de hoje e não poderá ser desfeita.</p>
      {success && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">{success}</p>}
      {!formOpen && error && <p role="alert" className="mt-3 text-red-700 dark:text-red-300">{error}</p>}
      {(loading || listError) && loadedMonth && loadedMonth !== month && visibleIncomes.length > 0 && (
        <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">Exibindo o resultado anterior de {loadedMonth.split('-').reverse().join('/')}.</p>
      )}
      <IncomeList incomes={visibleIncomes} accounts={accounts} sources={sources} loading={loading} error={listError} receivingId={receivingId}
        disabled={mutationInProgress || loading || loadedMonth !== month} onReceive={receive} onEdit={edit}
        filtered={Boolean(filters.account || filters.source || filters.status)} onRetry={() => void reload(month)} />
      {formOpen && <RecordFormModal title={editingId ? 'Editar recebimento' : 'Novo recebimento'} dirty={dirty} saving={submitting} onDismiss={resetForm}>
        {(cancel) => <>
          {(accountsLoading || sourcesLoading) && <p role="status" className="text-sm">Carregando fontes e contas…</p>}
          {(sourcesError || accountsError) && <p role="alert" className="text-red-700 dark:text-red-300">{sourcesError || accountsError}</p>}
          {!sourcesLoading && !sourcesError && !sources.length && <p className="text-sm">Cadastre uma fonte de renda em Fontes de renda para continuar.</p>}
          {!accountsLoading && !accountsError && !checkingAccounts.length && <p className="text-sm">Cadastre uma conta corrente em Contas para continuar.</p>}
          <IncomeForm values={values} accounts={accounts} sources={sources} editing={Boolean(editingId)} disabled={mutationInProgress || prerequisitesMissing} submitting={submitting} error={error}
            onChange={(next) => { setValues(next); setDirty(true); }} onSubmit={save} onCancel={cancel} />
        </>}
      </RecordFormModal>}
    </section>
  );
}
