'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { createIncomeSource, getIncomeSource, listIncomeSources, updateIncomeSource } from '@/lib/incomeSourcesApi';
import type { IncomeSource, SaveIncomeSourcePayload } from '@/types/incomeSource';

export function useIncomeSources() {
  const { getAccessToken } = useAuth();
  const tokenGetter = useRef(getAccessToken);
  useEffect(() => { tokenGetter.current = getAccessToken; }, [getAccessToken]);
  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const active = useRef(false);
  const request = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true); setError('');
    try {
      const token = await tokenGetter.current();
      if (controller.signal.aborted) return;
      const items = await listIncomeSources(token, controller.signal);
      if (active.current && !controller.signal.aborted) setSources([...items].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
    } catch (error) {
      if (active.current && !controller.signal.aborted) {
        setSources([]);
        setError(error instanceof Error ? error.message : 'Não foi possível carregar as fontes de renda.');
      }
    } finally {
      if (active.current && !controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    active.current = true;
    void reload();
    return () => { active.current = false; request.current?.abort(); };
  }, [reload]);
  return {
    sources, loading, error, reload,
    get: async (id: string, signal: AbortSignal) => getIncomeSource(id, await tokenGetter.current(), signal),
    create: async (payload: SaveIncomeSourcePayload) => createIncomeSource(payload, await tokenGetter.current()),
    update: async (id: string, payload: SaveIncomeSourcePayload) => updateIncomeSource(id, payload, await tokenGetter.current()),
  };
}
