"use client";

import { useRef, useState } from "react";
import { DueDatesSchedule } from "./DueDatesSchedule";
import { ExpensePaymentForm } from "./ExpensePaymentForm";
import { useDueItems } from "@/hooks/useDueItems";
import { getCurrentDuePeriod, type DueItem, type DuePeriod } from "@/lib/dueDatesApi";
import { type ExpensePaymentPayload } from "@/lib/expensePayment";
import { payExpense } from "@/lib/expensePaymentApi";
import { getLocalDate } from "@/lib/incomeForm";
import { payInvoice } from "@/lib/invoicesApi";
import type { AccountSummary } from "@/types/account";

type DueDatesSectionProps = {
  initialPeriod?: DuePeriod;
  accounts: AccountSummary[];
  accountsLoading: boolean;
  accountsError: string;
  getAccessToken: () => Promise<string>;
  onRetryAccounts: () => void;
};

export function DueDatesSection({
  initialPeriod, accounts, accountsLoading, accountsError, getAccessToken, onRetryAccounts,
}: DueDatesSectionProps) {
  const [period, setPeriod] = useState(() => initialPeriod ?? getCurrentDuePeriod());
  const [selected, setSelected] = useState<DueItem | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);
  const submitting = useRef(false);
  const { result, retry } = useDueItems(accounts, period, !accountsLoading && !accountsError, getAccessToken);
  const error = accountsError ? "Não foi possível carregar as contas para consultar os vencimentos." :
    result?.error ? "Não foi possível carregar todos os vencimentos do período." : "";

  function applyPeriod(nextPeriod: DuePeriod) {
    setSelected(null);
    setPeriod({ ...nextPeriod });
    if (accountsError && !accountsLoading) onRetryAccounts();
  }

  async function submitPayment(item: DueItem, payload: ExpensePaymentPayload) {
    const target = item.paymentTarget;
    if (!target || submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setNotice(null);
    try {
      const token = await getAccessToken();
      if (target.type === "fixed") await payExpense(target.expenseId, payload, token);
      else await payInvoice(target.accountId, target.competence, payload, token);
      setNotice({ text: "Pagamento registrado." });
      onRetryAccounts();
    } catch (error) {
      setNotice({
        text: error instanceof Error ? error.message : "Não foi possível registrar o pagamento.",
        error: true,
      });
      retry();
    } finally {
      setSelected(null);
      submitting.current = false;
      setBusy(false);
    }
  }

  return (
    <DueDatesSchedule
      items={result?.items ?? []}
      today={getLocalDate()}
      period={period}
      onPeriodChange={applyPeriod}
      loading={accountsLoading || (!error && !result)}
      loadError={error}
      onRetry={accountsError ? onRetryAccounts : retry}
      paymentNotice={notice}
      renderPayment={item => {
        if (!item.paymentTarget) return null;
        if (selected?.id === item.id) return <ExpensePaymentForm
          expense={{ description: item.name, value: (item.amount - item.paid) / 100 }}
          accounts={accounts}
          busy={busy}
          invoice={item.paymentTarget.type === "card"}
          onSubmit={payload => void submitPayment(item, payload)}
          onCancel={() => setSelected(null)}
        />;
        return <button type="button" disabled={busy} onClick={() => { setNotice(null); setSelected(item); }}
          className="min-h-11 rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60">
          Registrar pagamento
        </button>;
      }}
    />
  );
}
