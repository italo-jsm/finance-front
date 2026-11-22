import { useEffect, useMemo, useState } from "react";
import { loadDueItems, type DueItem, type DuePeriod } from "@/lib/dueDatesApi";
import type { AccountSummary } from "@/types/account";

type Result = { request: object; items: DueItem[]; error: boolean };

export function useDueItems(
  accounts: AccountSummary[], period: DuePeriod, enabled: boolean, getAccessToken: () => Promise<string>,
) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const request = useMemo(() => ({ accounts, period, enabled, getAccessToken, attempt }),
    [accounts, period, enabled, getAccessToken, attempt]);

  useEffect(() => {
    if (!request.enabled) {
      console.info("[Vencimentos] Consulta aguardando contas carregadas sem erro");
      return;
    }
    const controller = new AbortController();
    void (async () => {
      try {
        const token = await request.getAccessToken();
        if (controller.signal.aborted) return;
        const items = await loadDueItems(request.accounts, request.period, token, controller.signal);
        if (!controller.signal.aborted) {
          console.info("[Vencimentos] Consulta concluída", { items: items.length });
          setResult({ request, items, error: false });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error("[Vencimentos] Falha ao consultar vencimentos", error);
          controller.abort();
          setResult({ request, items: [], error: true });
        }
      }
    })();
    return () => controller.abort();
  }, [request]);

  return { result: result?.request === request ? result : null, retry: () => setAttempt(value => value + 1) };
}
