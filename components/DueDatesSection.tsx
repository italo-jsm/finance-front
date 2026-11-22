"use client";

import { useState } from "react";
import { DueDatesSchedule } from "./DueDatesSchedule";
import { useDueItems } from "@/hooks/useDueItems";
import { getCurrentDuePeriod, type DuePeriod } from "@/lib/dueDatesApi";
import { getLocalDate } from "@/lib/incomeForm";
import type { AccountSummary } from "@/types/account";

type DueDatesSectionProps = {
  accounts: AccountSummary[];
  accountsLoading: boolean;
  accountsError: string;
  getAccessToken: () => Promise<string>;
  onRetryAccounts: () => void;
};

export function DueDatesSection({
  accounts, accountsLoading, accountsError, getAccessToken, onRetryAccounts,
}: DueDatesSectionProps) {
  const [period, setPeriod] = useState(getCurrentDuePeriod);
  const { result, retry } = useDueItems(accounts, period, !accountsLoading && !accountsError, getAccessToken);
  const error = accountsError ? "Não foi possível carregar as contas para consultar os vencimentos." :
    result?.error ? "Não foi possível carregar todos os vencimentos do período." : "";

  function applyPeriod(nextPeriod: DuePeriod) {
    setPeriod({ ...nextPeriod });
    if (accountsError && !accountsLoading) onRetryAccounts();
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
    />
  );
}
