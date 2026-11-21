import { useEffect, useState } from "react";
import { getInvoice, type Invoice } from "@/lib/invoicesApi";

type InvoiceResult = Record<string, Invoice | null>;

export function useDashboardInvoices(
  cardIds: string[],
  competence: string,
  getAccessToken: () => Promise<string>,
) {
  const cardsKey = JSON.stringify([...cardIds].sort());
  const [attempt, setAttempt] = useState(0);
  const requestKey = JSON.stringify([cardsKey, competence, attempt]);
  const [result, setResult] = useState<{ key: string; invoices: InvoiceResult } | null>(null);

  useEffect(() => {
    const ids: string[] = JSON.parse(cardsKey);
    if (!ids.length) return;
    const controller = new AbortController();

    async function load() {
      let results: [string, Invoice | null][];
      try {
        const token = await getAccessToken();
        if (controller.signal.aborted) return;
        results = await Promise.all(ids.map(async id => {
          try {
            return [id, await getInvoice(id, competence, token, controller.signal)];
          } catch {
            return [id, null];
          }
        }));
      } catch {
        results = ids.map(id => [id, null]);
      }

      if (!controller.signal.aborted) {
        setResult({ key: requestKey, invoices: Object.fromEntries(results) });
      }
    }

    void load();
    return () => controller.abort();
  }, [cardsKey, competence, getAccessToken, requestKey]);

  return {
    invoices: result?.key === requestKey ? result.invoices : null,
    retry: () => setAttempt(current => current + 1),
  };
}
