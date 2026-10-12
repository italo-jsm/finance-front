'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useIncomeSources } from '@/hooks/useIncomeSources';
import { IncomeSourceApiError } from '@/lib/incomeSourcesApi';
import { emptyIncomeSourceForm, incomeSourceTypeLabels, type IncomeSourceFormValues } from '@/types/incomeSource';
import { IncomeSourceList } from './IncomeSourceList';
import { IncomeSourceForm } from './IncomeSourceForm';

export function IncomeSourcesSection() {
  const api = useIncomeSources();
  const [mode, setMode] = useState<'list' | 'create' | 'edit'>('list');
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
    editRequest.current?.abort(); setLoadingEdit(false); setMode('list'); setId(''); setError('');
  }
  async function edit(sourceId: string) {
    editRequest.current?.abort();
    const controller = new AbortController(); editRequest.current = controller;
    setLoadingEdit(true); setError(''); setSuccess('');
    try {
      const source = await api.get(sourceId, controller.signal);
      if (controller.signal.aborted || !mounted.current) return;
      setId(source.id); setValues({ name: source.name, type: source.type, description: source.description ?? '' }); setMode('edit');
    } catch (error) {
      if (!controller.signal.aborted && mounted.current) {
        setError(error instanceof Error ? error.message : 'Não foi possível carregar a fonte de renda.');
        if (error instanceof IncomeSourceApiError && error.status === 404) void api.reload();
      }
    } finally { if (!controller.signal.aborted && mounted.current) setLoadingEdit(false); }
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    if (!values.name.trim() || !values.type || !(values.type in incomeSourceTypeLabels)) { setError('Informe o nome e selecione um tipo válido.'); return; }
    saving.current = true; setSubmitting(true); setError('');
    const payload = { name: values.name.trim(), type: values.type, description: values.description.trim() ? values.description : null };
    try {
      if (mode === 'edit') await api.update(id, payload); else await api.create(payload);
      if (!mounted.current) return;
      setMode('list'); setId(''); setValues(emptyIncomeSourceForm); setSuccess('Fonte de renda salva com sucesso.');
      await api.reload();
    } catch (error) {
      if (mounted.current) {
        setError(error instanceof Error ? error.message : 'Não foi possível salvar a fonte de renda.');
        if (error instanceof IncomeSourceApiError && error.status === 404) { setMode('list'); setId(''); void api.reload(); }
      }
    } finally { saving.current = false; if (mounted.current) setSubmitting(false); }
  }
  return <section className="rounded-xl border border-slate-200 bg-white p-4 text-slate-900 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-2xl font-bold">{mode === 'list' ? 'Fontes de renda' : mode === 'edit' ? 'Editar fonte de renda' : 'Cadastrar fonte de renda'}</h2>{mode === 'list' && !loadingEdit && <button type="button" onClick={() => { setValues(emptyIncomeSourceForm); setError(''); setSuccess(''); setMode('create'); }} className="rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700">Nova fonte de renda</button>}</div>
    {success && <p role="status" className="mt-4 text-emerald-700 dark:text-emerald-300">{success}</p>}
    {mode === 'list' && error && <p role="alert" className="mt-4 text-red-700 dark:text-red-300">{error}</p>}
    {loadingEdit ? <div className="mt-4"><p role="status">Carregando fonte de renda...</p><button type="button" onClick={cancel} className="mt-3 rounded-lg border px-4 py-2">Cancelar</button></div> : mode === 'list' ? <IncomeSourceList sources={api.sources} loading={api.loading} error={api.error} onRetry={() => void api.reload()} onEdit={sourceId => void edit(sourceId)} /> : <IncomeSourceForm values={values} onChange={setValues} onSubmit={submit} onCancel={cancel} editing={mode === 'edit'} submitting={submitting} error={error} />}
  </section>;
}
