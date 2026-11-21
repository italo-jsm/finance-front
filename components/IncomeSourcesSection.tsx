'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useIncomeSources } from '@/hooks/useIncomeSources';
import { IncomeSourceApiError } from '@/lib/incomeSourcesApi';
import { emptyIncomeSourceForm, incomeSourceTypeLabels, type IncomeSourceFormValues } from '@/types/incomeSource';
import { buildIncomeSourcePayload, incomeSourceToForm } from '@/lib/incomeSourceForm';
import { IncomeSourceList } from './IncomeSourceList';
import { IncomeSourceForm } from './IncomeSourceForm';
import { ListToolbar } from './ListToolbar';
import { RecordFormModal } from './FormModal';

const defaults = { name: '', type: '' };
const fields = [
  { name: 'name', label: 'Nome' },
  { name: 'type', label: 'Tipo', options: [{ value: '', label: 'Todos os tipos' }, ...Object.entries(incomeSourceTypeLabels).map(([value, label]) => ({ value, label }))] },
];

export function IncomeSourcesSection() {
  const api = useIncomeSources();
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
  const [filters, setFilters] = useState(defaults);
  const [dirty, setDirty] = useState(false);
  const [id, setId] = useState('');
  const [values, setValues] = useState<IncomeSourceFormValues>(emptyIncomeSourceForm);
  const [submitting, setSubmitting] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const editRequest = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const saving = useRef(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; editRequest.current?.abort(); }; }, []);
  function cancel() {
    editRequest.current?.abort(); setLoadingEdit(false); setMode('list'); setId(''); setError(''); setDirty(false);
  }
  async function edit(sourceId: string) {
    if (loadingEdit || saving.current) return;
    editRequest.current?.abort();
    const controller = new AbortController(); editRequest.current = controller;
    setLoadingEdit(true); setError(''); setSuccess('');
    try {
      const source = await api.get(sourceId, controller.signal);
      if (controller.signal.aborted || !mounted.current) return;
      setId(source.id); setValues(incomeSourceToForm(source)); setDirty(false); setMode('edit');
    } catch (error) {
      if (!controller.signal.aborted && mounted.current) {
        setError(error instanceof Error ? error.message : 'Não foi possível carregar a fonte de renda.');
        if (error instanceof IncomeSourceApiError && error.status === 404) void api.reload();
      }
    } finally { if (!controller.signal.aborted && mounted.current) setLoadingEdit(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mode === 'list' || saving.current) return;
    try {
      const payload = buildIncomeSourcePayload(values);
      saving.current = true; setSubmitting(true); setError('');
      if (mode === 'edit') await api.update(id, payload); else await api.create(payload);
      if (!mounted.current) return;
      setMode('list'); setId(''); setValues(emptyIncomeSourceForm); setSuccess('Fonte de renda salva com sucesso.');
      void api.reload();
    } catch (error) {
      if (mounted.current) {
        setError(error instanceof Error ? error.message : 'Não foi possível salvar a fonte de renda.');
        if (error instanceof IncomeSourceApiError && error.status === 404) void api.reload();
      }
    } finally { saving.current = false; if (mounted.current) setSubmitting(false); }
  }
  const sources = api.sources.filter((source) =>
    source.name.toLocaleLowerCase('pt-BR').includes(filters.name.trim().toLocaleLowerCase('pt-BR')) &&
    (!filters.type || source.type === filters.type));

  return <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
    <ListToolbar title="Fontes de renda" createLabel="Nova fonte de renda" disabled={loadingEdit || submitting}
      fields={fields} filters={filters} defaults={defaults} onApply={setFilters}
      onCreate={() => { setValues(emptyIncomeSourceForm); setError(''); setSuccess(''); setDirty(false); setMode('create'); }} />
    {success && <p role="status" className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">{success}</p>}
    {mode === 'list' && error && <p role="alert" className="mt-4 text-red-700 dark:text-red-300">{error}</p>}
    {loadingEdit && <div className="mt-4 flex flex-wrap items-center gap-3">
      <p role="status">Carregando fonte de renda…</p>
      <button type="button" onClick={cancel} className="min-h-11 rounded-lg border px-4">Cancelar</button>
    </div>}
    <IncomeSourceList sources={sources} loading={api.loading} error={api.error} onRetry={() => void api.reload()}
      onEdit={(sourceId) => void edit(sourceId)} filtered={Boolean(filters.name || filters.type)} editDisabled={loadingEdit} />
    {mode !== 'list' && <RecordFormModal title={mode === 'edit' ? 'Editar fonte de renda' : 'Nova fonte de renda'} dirty={dirty} saving={submitting} onDismiss={cancel}>
      {(requestClose) => <IncomeSourceForm values={values} onChange={(next) => { setValues(next); setDirty(true); }}
        onSubmit={submit} onCancel={requestClose} editing={mode === 'edit'} submitting={submitting} error={error} />}
    </RecordFormModal>}
  </section>;
}
