"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useExpenseReversal } from "@/hooks/useExpenseReversal";
import { useAuth } from "@/components/AuthProvider";
import { AuthScreen } from "@/components/AuthScreen";
import { Dashboard } from "@/components/Dashboard";
import { IncomesSection } from "@/components/IncomesSection";
import { IncomeSourcesSection } from "@/components/IncomeSourcesSection";
import { RecordFormModal } from "@/components/FormModal";
import { AccountForm } from "@/components/AccountForm";
import { AccountList } from "@/components/AccountList";
import type { Expense } from "@/types/expense";
import { emptyRecentExpenseFilters, type RecentExpenseFilters } from "@/lib/recentExpenseFilters";
import type { MenuItem } from "@/types/menu";
import { emptyAccountForm, type AccountFormValues, type AccountSummary, type AccountType } from "@/types/account";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ExpenseForm, type ExpenseFieldErrors } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { ExpenseModal } from "@/components/ExpenseModal";
import { ExpenseHistoryTable, type ExpenseHistoryFilters } from "@/components/ExpenseHistoryTable";
import { buildAccountPayload } from "@/lib/accountForm";
import { accountsApiUrl, expensesApiUrl } from "@/lib/config";

import { expensePaymentFields } from '@/lib/expensePayment';
import { useExpensePayment } from '@/hooks/useExpensePayment';
import { ExpensePaymentForm } from '@/components/ExpensePaymentForm';

function getTodayDate() {
  return getDateOffset(0);
}

function getDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 10);
}

function defaultRecentPeriod() {
  return { dateFrom: getDateOffset(-6), dateTo: getTodayDate() };
}

function buildRecentExpensesUrl(filters: RecentExpenseFilters, reviewDate: string) {
  const defaults = defaultRecentPeriod();
  const searchParams = new URLSearchParams({
    beginDate: reviewDate || filters.dateFrom || defaults.dateFrom,
    endDate: reviewDate || filters.dateTo || defaults.dateTo,
  });
  return `${expensesApiUrl}?${searchParams.toString()}`;
}

function buildExpenseHistoryUrl(filters: ExpenseHistoryFilters) {
  const searchParams = new URLSearchParams({
    beginDate: filters.dateFrom || getDateOffset(-3650),
    endDate: filters.dateTo || getTodayDate(),
  });

  return `${expensesApiUrl}?${searchParams.toString()}`;
}

const createEmptyExpense = (): Expense => ({
  date: getTodayDate(),
  description: "",
  value: 0,
  category: "OTHER",
  installments: 1,
  accountId: "",
  accountName: "",
  isPaid: false,
  paidFromAccountId: "",
});

type ExpenseApiItem = Partial<{
  expenseId: string;
  id: string;
  description: string;
  amount: number;
  value: number;
  eventDate: string;
  expenseDate: string;
  date: string;
  category: Expense["category"];
  accountId: string;
  accountName: string;
  installments: number;
  paymentMethod: string | null;
  paymentDate: string | null;
  paidFromAccountId: string | null;
  isPaid: boolean;
  paymentStatus: Expense['paymentStatus'];
  canPay: boolean;
  totalPaid: number;
  payment: Expense['payment'];
  reversedDate: string | null;
  canReverse: boolean;
}>;

type AccountApiItem = Partial<{
  accountId: string;
  id: string;
  name: string;
  accountType: AccountType;
  closingDay: number | string | null;
  dueDay: number | string | null;
  active: boolean;
  balance: number | null;
}>;

function toOptionalDay(value: number | string | null | undefined) {
  if (value === null || value === undefined || value === "") return null;

  const parsedValue = Number(value);
  return Number.isInteger(parsedValue) ? parsedValue : null;
}

function extractMessageFromPayload(payload: unknown) {
  if (!payload || typeof payload !== "object") {
    return "";
  }

  const record = payload as Record<string, unknown>;
  const candidates = [record.message, record.error, record.detail, record.title];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim()) {
      return candidate.trim();
    }
  }

  if (Array.isArray(record.errors)) {
    const firstMessage = record.errors.find((item) => typeof item === "string");
    if (typeof firstMessage === "string" && firstMessage.trim()) {
      return firstMessage.trim();
    }
  }

  return "";
}

async function getApiErrorMessage(response: Response, fallbackMessage: string, clientErrorFallback?: string) {
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const payload = (await response.clone().json().catch(() => null)) as unknown;
    const message = extractMessageFromPayload(payload);

    if (message) {
      return message;
    }
  }

  const responseText = (await response.text().catch(() => "")).trim();
  if (responseText) {
    return responseText;
  }

  if (response.status >= 400 && response.status < 500 && clientErrorFallback) {
    return clientErrorFallback;
  }

  return fallbackMessage;
}

function extractExpenseList(payload: unknown): ExpenseApiItem[] {
  if (Array.isArray(payload)) {
    return payload as ExpenseApiItem[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.data)) {
      return record.data as ExpenseApiItem[];
    }

    if (Array.isArray(record.items)) {
      return record.items as ExpenseApiItem[];
    }

    if (Array.isArray(record.content)) {
      return record.content as ExpenseApiItem[];
    }

    if (Array.isArray(record.expenses)) {
      return record.expenses as ExpenseApiItem[];
    }

    if ("expenseId" in record || "id" in record) {
      return [record as ExpenseApiItem];
    }
  }

  return [];
}

function extractAccountList(payload: unknown): AccountApiItem[] {
  if (Array.isArray(payload)) {
    return payload as AccountApiItem[];
  }

  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;

    if (Array.isArray(record.data)) {
      return record.data as AccountApiItem[];
    }

    if (Array.isArray(record.items)) {
      return record.items as AccountApiItem[];
    }

    if (Array.isArray(record.content)) {
      return record.content as AccountApiItem[];
    }

    if (Array.isArray(record.accounts)) {
      return record.accounts as AccountApiItem[];
    }

    if ("accountId" in record || "id" in record) {
      return [record as AccountApiItem];
    }
  }

  return [];
}

function normalizeAccount(apiAccount: AccountApiItem): AccountSummary | null {
  const accountId = apiAccount.accountId ?? apiAccount.id;
  const accountType = apiAccount.accountType;

  if (!accountId || !apiAccount.name || !accountType) {
    return null;
  }

  return {
    accountId,
    name: apiAccount.name,
    accountType,
    closingDay: toOptionalDay(apiAccount.closingDay),
    dueDay: toOptionalDay(apiAccount.dueDay),
    active: apiAccount.active ?? true,
    balance: apiAccount.balance,
  };
}

function normalizeExpense(apiExpense: ExpenseApiItem, accounts: AccountSummary[]): Expense {
  const accountId = apiExpense.accountId ?? "";
  const matchingAccount = accounts.find((account) => account.accountId === accountId);
  const amount = apiExpense.amount ?? apiExpense.value ?? 0;

  return {
    expenseId: apiExpense.expenseId ?? apiExpense.id,
    date: apiExpense.expenseDate ?? apiExpense.eventDate ?? apiExpense.date ?? "",
    description: apiExpense.description ?? "",
    value: typeof amount === "number" ? amount : Number(amount) || 0,
    category: apiExpense.category ?? "OTHER",
    installments: apiExpense.installments ?? 1,
    accountId,
    accountName: apiExpense.accountName ?? matchingAccount?.name ?? "",
    ...expensePaymentFields(apiExpense),
  };
}

function buildExpensePayload(expense: Expense) {
  return {
    description: expense.description.trim(),
    amount: expense.value,
    eventDate: expense.date,
    category: expense.category,
    accountId: expense.accountId,
    installments: expense.installments,
    paymentMethod: expense.isPaid ? "TRANSFER" : null,
    paymentDate: expense.isPaid ? expense.date : null,
    paidFromAccountId: expense.isPaid ? expense.paidFromAccountId : null,
  };
}

export default function Home() {
  const { status, getAccessToken } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuItem>("overview");
  const [expense, setExpense] = useState<Expense>(createEmptyExpense);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [expenseFormKey, setExpenseFormKey] = useState(0);
  const [expenseFormOpen, setExpenseFormOpen] = useState(false);
  const [expenseDraftDirty, setExpenseDraftDirty] = useState(false);
  const [confirmExpenseDiscard, setConfirmExpenseDiscard] = useState(false);
  const [expenseSubmission, setExpenseSubmission] = useState<"idle" | "saving" | "slow" | "error" | "uncertain">("idle");
  const [expenseSubmitError, setExpenseSubmitError] = useState("");
  const [expenseFieldErrors, setExpenseFieldErrors] = useState<ExpenseFieldErrors>({});
  const [savedExpense, setSavedExpense] = useState<Expense | null>(null);
  const pendingExpense = useRef<AbortController | null>(null);
  const reviewRecent = useRef<HTMLHeadingElement>(null);
  const [expenseReviewDate, setExpenseReviewDate] = useState("");
  const [recentFilters, setRecentFilters] = useState(emptyRecentExpenseFilters);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [expensesError, setExpensesError] = useState("");
  const [expenseHistory, setExpenseHistory] = useState<Expense[]>([]);
  const [isLoadingExpenseHistory, setIsLoadingExpenseHistory] = useState(false);
  const [expenseHistoryError, setExpenseHistoryError] = useState("");
  const [hasSearchedExpenseHistory, setHasSearchedExpenseHistory] = useState(false);
  const [accountFormOpen, setAccountFormOpen] = useState(false);
  const [accountDraftDirty, setAccountDraftDirty] = useState(false);
  const pendingAccountSave = useRef(false);
  const [account, setAccount] = useState<AccountFormValues>(emptyAccountForm);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [accountSubmitError, setAccountSubmitError] = useState("");
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState("");
  const [accountListFeedbackError, setAccountListFeedbackError] = useState("");
  const [accountListFeedbackSuccess, setAccountListFeedbackSuccess] = useState("");
  const [updatingAccountStatusId, setUpdatingAccountStatusId] = useState<string | null>(null);
  const [paymentDataVersion, setPaymentDataVersion] = useState(0);
  const historyFilters = useRef<ExpenseHistoryFilters | null>(null);
  const recentVersion = useRef(0);
  const recentQuery = useRef({ filters: emptyRecentExpenseFilters, reviewDate: "" });
  const historyVersion = useRef(0);
  const accountVersion = useRef(0);
  const sessionVersion = useRef(0);
  const activeAccounts = accounts.filter((item) => item.active !== false);

  const fetchAccounts = useCallback(async (accessToken: string, signal?: AbortSignal) => {
    const version = ++accountVersion.current;
    const session = sessionVersion.current;
    const isCurrent = () => !signal?.aborted && session === sessionVersion.current && version === accountVersion.current;
    setIsLoadingAccounts(true);
    setAccountsError("");
    try {
      const response = await fetch(accountsApiUrl, {
        cache: "no-store", signal,
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) throw new Error(await getApiErrorMessage(response, "Não foi possível carregar as contas."));
      const payload = await response.json();
      const data = extractAccountList(payload)
        .map((item) => normalizeAccount(item))
        .filter((item): item is AccountSummary => item !== null);
      if (isCurrent()) setAccounts(data);
      return data;
    } catch (error) {
      if (isCurrent()) {
        setAccounts(items => items.map(item => ({ ...item, balance: null })));
        setAccountsError("Não foi possível atualizar os saldos. Acesse Contas novamente para tentar atualizar.");
      }
      throw error;
    } finally {
      if (session === sessionVersion.current && version === accountVersion.current) setIsLoadingAccounts(false);
    }
  }, []);

  const fetchExpenses = useCallback(async (accessToken: string, requestUrl: string, availableAccounts: AccountSummary[]) => {
    const response = await fetch(requestUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(responseText || "Nao foi possivel carregar as despesas.");
    }

    const payload = await response.json();
    const data = extractExpenseList(payload);
    return data.map((item) => normalizeExpense(item, availableAccounts));
  }, []);

  const refreshRecentExpenses = useCallback(async (knownToken?: string) => {
    if (status !== "authenticated") return;

    const version = ++recentVersion.current;
    const { filters, reviewDate } = recentQuery.current;
    const url = buildRecentExpensesUrl(filters, reviewDate);
    setIsLoadingExpenses(true);
    setExpensesError("");

    try {
      const accessToken = knownToken ?? await getAccessToken();
      const data = await fetchExpenses(accessToken, url, accounts);
      if (version === recentVersion.current) setExpenses(data);
    } catch {
      if (version !== recentVersion.current) return;
      setExpensesError(
        "Não foi possível atualizar as despesas recentes.",
      );
    } finally {
      if (version === recentVersion.current) setIsLoadingExpenses(false);
    }
  }, [accounts, fetchExpenses, getAccessToken, status]);

  const searchExpenseHistory = useCallback(async (filters: ExpenseHistoryFilters) => {
    if (status !== "authenticated") return;

    historyFilters.current = filters;
    const version = ++historyVersion.current;
    setIsLoadingExpenseHistory(true);
    setExpenseHistoryError("");
    setHasSearchedExpenseHistory(true);

    try {
      const accessToken = await getAccessToken();
      const data = await fetchExpenses(accessToken, buildExpenseHistoryUrl(filters), accounts);
      const filteredData = data.filter((expense) => {
        if (filters.category && expense.category !== filters.category) return false;
        if (filters.accountId && expense.accountId !== filters.accountId) return false;

        return true;
      });
      if (version === historyVersion.current) setExpenseHistory(filteredData);
    } catch (refreshError) {
      if (version !== historyVersion.current) return;
      setExpenseHistory([]);
      setExpenseHistoryError(
        refreshError instanceof Error ? refreshError.message : "Ocorreu um erro ao carregar o histórico de despesas.",
      );
    } finally {
      if (version === historyVersion.current) setIsLoadingExpenseHistory(false);
    }
  }, [accounts, fetchExpenses, getAccessToken, status]);

  const refreshAfterReversal = async () => {
    setPaymentDataVersion(value => value + 1);
    const session = sessionVersion.current;
    const recent = ++recentVersion.current;
    const recentUrl = buildRecentExpensesUrl(recentQuery.current.filters, recentQuery.current.reviewDate);
    const history = ++historyVersion.current;
    const filters = historyFilters.current;
    setIsLoadingExpenses(true);
    setExpensesError("");
    if (filters) {
      setIsLoadingExpenseHistory(true);
      setExpenseHistoryError("");
    }
    const failures: string[] = [];
    try {
      let token: string;
      try {
        token = await getAccessToken();
      } catch (error) {
        if (session === sessionVersion.current) {
          setAccounts(items => items.map(item => ({ ...item, balance: null })));
          setAccountsError("Não foi possível atualizar os saldos. Atualize os dados novamente.");
          if (recent === recentVersion.current) setExpensesError("Não foi possível atualizar as despesas. Verifique sua sessão.");
          if (filters) setExpenseHistoryError("Não foi possível atualizar o histórico. Verifique sua sessão.");
        }
        throw error;
      }
      if (session !== sessionVersion.current) throw new Error("Sessão encerrada.");
      await Promise.allSettled([
        (async () => {
          try { await fetchAccounts(token); }
          catch {
            if (session !== sessionVersion.current) return;
            failures.push("contas");
            setAccountsError("Não foi possível atualizar os saldos. Atualize os dados novamente.");
            setAccounts(items => items.map(item => ({ ...item, balance: null })));
          } finally {
            if (session === sessionVersion.current) setIsLoadingAccounts(false);
          }
        })(),
        (async () => {
          try {
            const data = await fetchExpenses(token, recentUrl, accounts);
            if (recent === recentVersion.current) setExpenses(data);
          } catch {
            if (recent !== recentVersion.current) return;
            failures.push("despesas");
            setExpensesError("Não foi possível atualizar as despesas.");
          }
        })(),
        ...(filters ? [(async () => {
          try {
            const data = await fetchExpenses(token, buildExpenseHistoryUrl(filters), accounts);
            if (history === historyVersion.current) setExpenseHistory(data.filter(item =>
              (!filters.category || item.category === filters.category) && (!filters.accountId || item.accountId === filters.accountId)));
          } catch {
            if (history !== historyVersion.current) return;
            failures.push("histórico");
            setExpenseHistoryError("Não foi possível atualizar o histórico.");
          }
        })()] : []),
      ]);
      if (session !== sessionVersion.current || failures.length) throw new Error("Não foi possível atualizar todos os dados.");
    } finally {
      if (recent === recentVersion.current) setIsLoadingExpenses(false);
      if (filters && history === historyVersion.current) setIsLoadingExpenseHistory(false);
    }
  };
  const payment = useExpensePayment(getAccessToken, refreshAfterReversal, status);
  const paymentProps = {
    onPay: payment.open, paymentAccounts: accounts,
    paymentBusy: payment.busy, paymentBlockedIds: payment.blockedIds,
  };
  const reversal = useExpenseReversal(getAccessToken, refreshAfterReversal, status);
  const reversalProps = {
    onReverse: (item: Expense) => { void reversal.reverse(item); },
    reversingId: reversal.busyId,
    reversalBlockedIds: reversal.blockedIds,
  };
  const reversalFeedback = (
    <div className="mt-4 flex flex-wrap items-center gap-3">
      {reversal.message ? <p role="status" className="text-sm">{reversal.message}</p> : null}
      <button type="button" disabled={reversal.updating || reversal.busyId !== null} onClick={() => { void reversal.reload(); }}
        className="rounded-md border border-slate-400 px-3 py-2 text-sm disabled:opacity-60">
        {reversal.updating ? "Atualizando…" : "Atualizar dados"}
      </button>
    </div>
  );

  useEffect(() => {
    sessionVersion.current++;
    recentVersion.current++;
    historyVersion.current++;
    accountVersion.current++;
    if (status !== "authenticated") {
      pendingExpense.current?.abort();
      pendingExpense.current = null;
      setExpense(createEmptyExpense());
      setExpenseFormKey((key) => key + 1);
      setExpenseFormOpen(false);
      setExpenseDraftDirty(false);
      setConfirmExpenseDiscard(false);
      setExpenseSubmission("idle");
      setExpenseSubmitError("");
      setExpenseFieldErrors({});
      setSavedExpense(null);
      setExpenseReviewDate("");
      setRecentFilters(emptyRecentExpenseFilters);
      recentQuery.current = { filters: emptyRecentExpenseFilters, reviewDate: "" };
      historyFilters.current = null;
      setExpenses([]);
      setExpensesError("");
      setIsLoadingExpenses(false);
      setExpenseHistory([]);
      setExpenseHistoryError("");
      setIsLoadingExpenseHistory(false);
      setHasSearchedExpenseHistory(false);
      setAccounts([]);
      setAccountsError("");
      setIsLoadingAccounts(false);
      setAccountFormOpen(false);
      setAccountDraftDirty(false);
      pendingAccountSave.current = false;
      setIsSubmittingAccount(false);
      setAccount(emptyAccountForm);
      setEditingAccountId(null);
      setAccountSubmitError("");
      setAccountListFeedbackError("");
      setAccountListFeedbackSuccess("");
      setUpdatingAccountStatusId(null);
      return;
    }

    let active = true;
    const recent = recentVersion.current;

    async function bootstrapData() {
      let loadedAccounts: AccountSummary[] = [];

      try {
        const accessToken = await getAccessToken();
        if (!active) return;

        try {
          loadedAccounts = await fetchAccounts(accessToken);
        } catch (accountsLoadError) {
          if (!active) return;
          loadedAccounts = [];
          setAccounts([]);
          setAccountsError(
            accountsLoadError instanceof Error
              ? accountsLoadError.message
              : "Ocorreu um erro ao carregar as contas.",
          );
        }

        try {
          const data = await fetchExpenses(accessToken, buildRecentExpensesUrl(recentQuery.current.filters, recentQuery.current.reviewDate), loadedAccounts);
          if (active && recent === recentVersion.current) setExpenses(data);
        } catch (expensesLoadError) {
          if (!active || recent !== recentVersion.current) return;
          setExpenses([]);
          setExpensesError(
            expensesLoadError instanceof Error
              ? expensesLoadError.message
              : "Ocorreu um erro ao carregar as despesas.",
          );
        }
      } catch (bootstrapError) {
        if (!active) return;
        const message =
          bootstrapError instanceof Error
            ? bootstrapError.message
            : "Ocorreu um erro ao inicializar os dados do painel.";
        setAccounts([]);
        setExpenses([]);
        setExpenseHistory([]);
        setAccountsError(message);
        setExpensesError(message);
      } finally {
        if (active) {
          if (recent === recentVersion.current) setIsLoadingExpenses(false);
          setIsLoadingAccounts(false);
        }
      }
    }

    setIsLoadingAccounts(true);
    void bootstrapData();

    return () => {
      active = false;
    };
  }, [fetchAccounts, fetchExpenses, getAccessToken, status]);

  useEffect(() => {
    setExpenses((currentExpenses) =>
      currentExpenses.map((currentExpense) => {
        const matchingAccount = accounts.find((item) => item.accountId === currentExpense.accountId);
        return matchingAccount
          ? {
              ...currentExpense,
              accountName: matchingAccount.name,
            }
          : currentExpense;
      }),
    );
    setExpenseHistory((currentExpenses) =>
      currentExpenses.map((currentExpense) => {
        const matchingAccount = accounts.find((item) => item.accountId === currentExpense.accountId);
        return matchingAccount
          ? {
              ...currentExpense,
              accountName: matchingAccount.name,
            }
          : currentExpense;
      }),
    );
  }, [accounts]);

  useEffect(() => {
    if (activeMenu !== "transactions") return;

    void refreshRecentExpenses();
  }, [activeMenu, refreshRecentExpenses]);

  useEffect(() => {
    if (expenseReviewDate && activeMenu === "transactions") reviewRecent.current?.focus();
  }, [activeMenu, expenseReviewDate]);

  useEffect(() => {
    if (activeMenu !== "accounts" || status !== "authenticated") return;
    let active = true;
    void (async () => {
      setIsLoadingAccounts(true);
      try {
        const token = await getAccessToken();
        if (active) await fetchAccounts(token);
      } catch {
        if (active) {
          setAccounts(items => items.map(item => ({ ...item, balance: null })));
          setAccountsError("Não foi possível atualizar os saldos. Acesse Contas novamente para tentar atualizar.");
        }
      } finally {
        if (active) setIsLoadingAccounts(false);
      }
    })();
    return () => { active = false; };
  }, [activeMenu, status, getAccessToken, fetchAccounts]);

  const loadExpenseForm = (item: Expense) => {
    setExpense(item);
    setExpenseDraftDirty(false);
    setConfirmExpenseDiscard(false);
    setExpenseFormKey((key) => key + 1);
    setExpenseSubmission("idle");
    setExpenseSubmitError("");
    setExpenseFieldErrors({});
    setSavedExpense(null);
  };

  const applyRecentFilters = (filters: RecentExpenseFilters) => {
    const previous = recentQuery.current.filters;
    recentQuery.current.filters = filters;
    setRecentFilters(filters);
    if (filters.dateFrom !== previous.dateFrom || filters.dateTo !== previous.dateTo || expensesError) {
      void refreshRecentExpenses();
    }
  };

  const setRecentReviewDate = (date: string) => {
    if (date !== recentQuery.current.reviewDate) setExpenses([]);
    recentQuery.current.reviewDate = date;
    setExpenseReviewDate(date);
    void refreshRecentExpenses();
  };

  const closeExpenseForm = () => {
    setExpenseFormOpen(false);
    loadExpenseForm(createEmptyExpense());
    if (expenseReviewDate) setRecentReviewDate("");
  };

  const openExpenseForm = (item: Expense) => {
    if (expenseFormOpen || pendingExpense.current) return;
    loadExpenseForm(item);
    setExpenseFormOpen(true);
  };

  const requestExpenseClose = () => {
    if (pendingExpense.current) return;
    if (expenseDraftDirty) setConfirmExpenseDiscard(true);
    else closeExpenseForm();
  };

  const isEditingExpense = Boolean(expense.expenseId);
  const isSavingExpense = expenseSubmission === "saving" || expenseSubmission === "slow";
  const expenseFormLocked = isSavingExpense || expenseSubmission === "uncertain";

  const validateExpense = (item: Expense): ExpenseFieldErrors => {
    const errors: ExpenseFieldErrors = {};
    if (!Number.isFinite(item.value) || item.value <= 0) errors.value = "Informe um valor maior que R$ 0,00, com até duas casas decimais.";
    if (item.description.trim().length < 3) errors.description = "Informe uma descrição com ao menos 3 caracteres.";
    if (!item.accountId) errors.accountId = "Escolha uma conta.";
    if (!item.date) errors.date = "Escolha a data da despesa.";

    const selectedAccount = accounts.find((account) => account.accountId === item.accountId);
    if (selectedAccount?.accountType === "CREDIT_CARD" && (!Number.isInteger(item.installments) || item.installments < 1)) {
      errors.installments = "Informe um número inteiro de parcelas, a partir de 1.";
    }
    if (selectedAccount?.accountType !== "CREDIT_CARD" && item.installments > 1) {
      errors.accountId = "Escolha um cartão de crédito para manter o parcelamento.";
    }
    if (item.isPaid && !item.paidFromAccountId) errors.paidFromAccountId = "Escolha a conta de pagamento.";
    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!expenseFormOpen || confirmExpenseDiscard || pendingExpense.current || expenseSubmission === "uncertain") return;

    const errors = validateExpense(expense);
    setExpenseFieldErrors(errors);
    setExpenseSubmitError("");
    if (Object.keys(errors).length) {
      setExpenseSubmission("idle");
      const form = event.currentTarget;
      window.requestAnimationFrame(() => {
        form?.querySelector<HTMLElement>(`#expense-${Object.keys(errors)[0]}`)?.focus();
      });
      return;
    }

    const controller = new AbortController();
    pendingExpense.current = controller;
    const session = sessionVersion.current;
    const isCurrent = () => session === sessionVersion.current && pendingExpense.current === controller;
    const slowTimer = window.setTimeout(() => {
      if (isCurrent()) setExpenseSubmission("slow");
    }, 4000);
    let requestTimer: number | undefined;
    let requestStarted = false;
    setExpenseSubmission("saving");

    try {
      const accessToken = await getAccessToken();
      if (!isCurrent()) return;
      const { expenseId } = expense;
      requestTimer = window.setTimeout(() => controller.abort(), 20000);
      requestStarted = true;
      const response = await fetch(expenseId ? `${expensesApiUrl}/${expenseId}` : expensesApiUrl, {
        method: expenseId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(buildExpensePayload(expense)),
        signal: controller.signal,
      });

      if (!isCurrent()) return;
      if (!response.ok) {
        if (response.status >= 500 || response.status === 408) {
          setExpenseSubmission("uncertain");
        } else {
          const message = await getApiErrorMessage(response, "Não foi possível salvar a despesa.");
          if (!isCurrent()) return;
          setExpenseSubmitError(message);
          setExpenseSubmission("error");
        }
        return;
      }

      closeExpenseForm();
      setSavedExpense(expense);
      void refreshRecentExpenses(accessToken);
    } catch {
      if (!isCurrent()) return;
      if (requestStarted) {
        setExpenseSubmission("uncertain");
      } else {
        setExpenseSubmitError("Não foi possível acessar sua sessão para salvar a despesa.");
        setExpenseSubmission("error");
      }
    } finally {
      window.clearTimeout(slowTimer);
      window.clearTimeout(requestTimer);
      if (isCurrent()) pendingExpense.current = null;
    }
  };

  const handleEdit = (index: number) => {
    if (expenseFormLocked || pendingExpense.current) return;
    const current = expenses[index];
    if (!current) return;
    openExpenseForm(current);
    setActiveMenu("transactions");
  };

  const handleEditExpenseById = (expenseId: string) => {
    if (expenseFormLocked || pendingExpense.current) {
      setActiveMenu("transactions");
      return;
    }
    const currentExpense =
      expenseHistory.find((item) => item.expenseId === expenseId) ?? expenses.find((item) => item.expenseId === expenseId);

    if (!currentExpense) {
      alert("Não foi possível localizar a despesa selecionada.");
      return;
    }

    openExpenseForm(currentExpense);
    setActiveMenu("transactions");
  };

  const handleDelete = (index: number) => {
    const currentExpense = expenses[index];
    if (expenseFormLocked || pendingExpense.current) return;
    if (!currentExpense?.expenseId) {
      alert("Nao foi possivel identificar a despesa para exclusao.");
      return;
    }

    if (!window.confirm("Remover esta despesa?")) return;

    const session = sessionVersion.current;
    void (async () => {
      setExpensesError("");

      try {
        const accessToken = await getAccessToken();
        const response = await fetch(`${expensesApiUrl}/${currentExpense.expenseId}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(await getApiErrorMessage(response, "Nao foi possivel remover a despesa."));
        }

        if (session !== sessionVersion.current) return;
        setExpenses((items) => items.filter((item) => item.expenseId !== currentExpense.expenseId));
        if (expense.expenseId === currentExpense.expenseId && !pendingExpense.current) closeExpenseForm();
        void refreshRecentExpenses(accessToken);
      } catch (deleteError) {
        alert(deleteError instanceof Error ? deleteError.message : "Ocorreu um erro ao remover a despesa.");
      }
    })();
  };

  const validateDay = (value: string, fieldLabel: string) => {
    const parsedValue = Number(value);
    if (!Number.isInteger(parsedValue) || parsedValue < 1 || parsedValue > 31) {
      return `${fieldLabel} precisa estar entre 1 e 31.`;
    }

    return "";
  };

  const validateAccount = (item: AccountFormValues) => {
    if (!item.name.trim() || item.name.trim().length < 3) {
      return "Nome da conta precisa ter ao menos 3 caracteres.";
    }

    if (item.accountType === "CREDIT_CARD") {
      const closingDayError = validateDay(item.closingDay, "Dia do fechamento");
      if (closingDayError) return closingDayError;

      const dueDayError = validateDay(item.dueDay, "Dia do vencimento");
      if (dueDayError) return dueDayError;
    }

    if (item.accountType === "FIXED_BILL") {
      const dueDayError = validateDay(item.dueDay, "Dia do vencimento");
      if (dueDayError) return dueDayError;
    }

    return "";
  };

  const resetAccountForm = () => {
    setAccountFormOpen(false);
    setAccountDraftDirty(false);
    setAccountSubmitError("");
    setAccount(emptyAccountForm);
    setEditingAccountId(null);
  };

  const handleEditAccount = (accountId: string) => {
    const selectedAccount = accounts.find((item) => item.accountId === accountId);

    if (!selectedAccount) {
      setAccountListFeedbackError("Nao foi possivel localizar a conta selecionada.");
      setAccountListFeedbackSuccess("");
      return;
    }

    setAccount({
      name: selectedAccount.name,
      accountType: selectedAccount.accountType,
      closingDay: selectedAccount.closingDay ? String(selectedAccount.closingDay) : "",
      dueDay: selectedAccount.dueDay ? String(selectedAccount.dueDay) : "",
      initialBalance: "",
    });
    setEditingAccountId(accountId);
    setAccountDraftDirty(false);
    setAccountFormOpen(true);
    setAccountSubmitError("");
    setAccountListFeedbackError("");
    setAccountListFeedbackSuccess("");
  };

  const handleToggleAccountStatus = (accountId: string) => {
    const selectedAccount = accounts.find((item) => item.accountId === accountId);

    if (!selectedAccount) {
      setAccountListFeedbackError("Nao foi possivel identificar a conta selecionada.");
      setAccountListFeedbackSuccess("");
      return;
    }

    const isActive = selectedAccount.active !== false;
    const actionLabel = isActive ? "desativar" : "reativar";

    if (!window.confirm(`${isActive ? "Desativar" : "Reativar"} a conta "${selectedAccount.name}"?`)) {
      return;
    }

    void (async () => {
      setUpdatingAccountStatusId(accountId);
      setAccountListFeedbackError("");
      setAccountListFeedbackSuccess("");
      setAccountSubmitError("");

      try {
        const accessToken = await getAccessToken();
        const response = await fetch(`${accountsApiUrl}/${accountId}/${isActive ? "deactivate" : "reactivate"}`, {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(
            await getApiErrorMessage(
              response,
              `Nao foi possivel ${actionLabel} a conta.`,
              isActive
                ? "A conta nao pode ser desativada porque ainda possui vinculos ou nao atende as regras do backend."
                : "A conta nao pode ser reativada no momento.",
            ),
          );
        }

        await fetchAccounts(accessToken);

        if (editingAccountId === accountId) {
          resetAccountForm();
        }

        setAccountListFeedbackSuccess(`Conta ${isActive ? "desativada" : "reativada"} com sucesso.`);
      } catch (deleteError) {
        setAccountListFeedbackError(
          deleteError instanceof Error
            ? deleteError.message
            : `Ocorreu um erro ao ${isActive ? "desativar" : "reativar"} a conta.`,
        );
      } finally {
        setUpdatingAccountStatusId(null);
        setIsLoadingAccounts(false);
      }
    })();
  };

  const handleAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!accountFormOpen || pendingAccountSave.current) return;
    setAccountSubmitError("");
    setAccountListFeedbackError("");
    setAccountListFeedbackSuccess("");

    const validationError = validateAccount(account);
    if (validationError) {
      setAccountSubmitError(validationError);
      return;
    }

    pendingAccountSave.current = true;
    setIsSubmittingAccount(true);
    const session = sessionVersion.current;

    try {
      const accessToken = await getAccessToken();
      if (session !== sessionVersion.current) return;
      const isEditingAccount = Boolean(editingAccountId);

      const response = await fetch(isEditingAccount ? `${accountsApiUrl}/${editingAccountId}` : accountsApiUrl, {
        method: isEditingAccount ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(buildAccountPayload(account, isEditingAccount)),
      });

      if (!response.ok) {
        throw new Error(await getApiErrorMessage(response, "Nao foi possivel salvar a conta."));
      }

      if (session !== sessionVersion.current) return;
      resetAccountForm();
      setAccountListFeedbackSuccess(isEditingAccount ? "Conta atualizada com sucesso." : "Conta salva com sucesso.");
      void fetchAccounts(accessToken).catch(() => {
        // fetchAccounts publishes loading errors for the current request.
      });
    } catch (submitError) {
      if (session !== sessionVersion.current) return;
      setAccountSubmitError(
        submitError instanceof Error ? submitError.message : "Ocorreu um erro ao salvar a conta.",
      );
    } finally {
      if (session === sessionVersion.current) {
        pendingAccountSave.current = false;
        setIsSubmittingAccount(false);
      }
    }
  };

  async function retryDashboardAccounts() {
    setIsLoadingAccounts(true);
    try {
      await fetchAccounts(await getAccessToken());
    } catch {
      setAccountsError("Não foi possível carregar as contas.");
    } finally {
      setIsLoadingAccounts(false);
    }
  }

  if (status !== "authenticated") {
    return (
      <AuthScreen
        failed={status === "error"}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const renderContent = () => {
    const isEditingAccount = Boolean(editingAccountId);

    if (activeMenu === "transactions") {
      return (
        <div className="space-y-6">
          {expenseFormOpen && (
            <ExpenseModal
              open={!expenseReviewDate}
              title={isEditingExpense ? "Editar despesa" : "Nova despesa"}
              saving={isSavingExpense}
              confirmDiscard={confirmExpenseDiscard}
              onRequestDismiss={requestExpenseClose}
              onContinueEditing={() => setConfirmExpenseDiscard(false)}
              onDismiss={closeExpenseForm}
            >
              <ExpenseForm
                key={expenseFormKey}
                expense={expense}
                setExpense={(updatedExpense) => {
                  setExpense(updatedExpense);
                  setExpenseDraftDirty(true);
                  setExpenseFieldErrors((errors) => Object.fromEntries(
                    Object.entries(errors).filter(([field]) => Object.is(expense[field as keyof ExpenseFieldErrors], updatedExpense[field as keyof ExpenseFieldErrors])),
                  ));
                }}
                isEditing={isEditingExpense}
                submission={expenseSubmission}
                submitError={expenseSubmitError}
                fieldErrors={expenseFieldErrors}
                accounts={isEditingExpense ? accounts : activeAccounts}
                isLoadingAccounts={isLoadingAccounts}
                accountsError={accountsError}
                onSubmit={handleSubmit}
                onCancel={requestExpenseClose}
                reviewByDate
                onReviewRecent={() => setRecentReviewDate(expense.date)}
                onResume={() => setExpenseSubmission("idle")}
              />
            </ExpenseModal>
          )}
          {reversalFeedback}
          <ExpenseList
            {...paymentProps}
            expenses={expenses}
            isLoading={isLoadingExpenses}
            error={expensesError}
            onEdit={handleEdit}
            onDelete={handleDelete}
            editDisabled={expenseFormLocked}
            headingRef={reviewRecent}
            reviewDate={expenseReviewDate}
            accounts={accounts}
            filters={recentFilters}
            defaultPeriod={defaultRecentPeriod()}
            onApplyFilters={applyRecentFilters}
            onRetry={() => void refreshRecentExpenses()}
            onNewExpense={() => openExpenseForm(createEmptyExpense())}
            onViewHistory={() => setActiveMenu("expenseHistory")}
            onReturnToDraft={expenseFormOpen ? () => setRecentReviewDate("") : undefined}
            feedback={(
              <div role="status" className="rounded-lg bg-green-50 p-3 text-sm text-green-900 empty:hidden dark:bg-green-950 dark:text-green-100">
                {savedExpense && (
                  <>
                    <p className="font-semibold">{savedExpense.expenseId ? "Despesa atualizada" : "Despesa salva"}</p>
                    <p className="break-words">{savedExpense.description} · {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(savedExpense.value)}</p>
                  </>
                )}
              </div>
            )}
            {...reversalProps}
          />
        </div>
      );
    }

    if (activeMenu === "expenseHistory") {
      return (
        <div className="space-y-4">
          <button type="button" onClick={() => setActiveMenu("transactions")} className="min-h-11 text-sm font-semibold text-blue-800 hover:underline dark:text-blue-200">
            Voltar para despesas recentes
          </button>
          {reversalFeedback}
          <ExpenseHistoryTable
            {...paymentProps}
            expenses={expenseHistory}
            accounts={accounts}
            isLoading={isLoadingExpenseHistory}
            error={expenseHistoryError}
            hasSearched={hasSearchedExpenseHistory}
            onSearch={searchExpenseHistory}
            onEdit={handleEditExpenseById}
            {...reversalProps}
          />
        </div>
      );
    }

    if (activeMenu === "incomes") {
      return <IncomesSection accounts={accounts} accountsLoading={isLoadingAccounts} accountsError={accountsError}
        onAccountsChange={async () => {
          try { await fetchAccounts(await getAccessToken()); }
          catch (error) {
            setAccountsError("Não foi possível atualizar as contas. Recarregue a página para consultar o saldo atual.");
            throw error;
          } finally { setIsLoadingAccounts(false); }
        }} />;
    }

    if (activeMenu === "incomeSources") return <IncomeSourcesSection />;

    if (activeMenu === "accounts") {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 dark:border-slate-700 dark:bg-slate-900">
          {accountFormOpen && <RecordFormModal title={isEditingAccount ? "Editar conta" : "Nova conta"} dirty={accountDraftDirty} saving={isSubmittingAccount} onDismiss={resetAccountForm}>
            {(cancel) => <AccountForm
              account={account}
              setAccount={(values) => { setAccount(values); setAccountDraftDirty(true); }}
              isEditing={isEditingAccount}
              isSubmitting={isSubmittingAccount}
              submitError={accountSubmitError}
              onSubmit={handleAccountSubmit}
              onCancelEdit={cancel}
            />}
          </RecordFormModal>}
          <AccountList key={paymentDataVersion}
            getAccessToken={getAccessToken}
            accounts={accounts}
            isLoading={isLoadingAccounts}
            error={accountListFeedbackError || accountsError}
            success={accountListFeedbackSuccess}
            updatingAccountStatusId={updatingAccountStatusId}
            editingAccountId={editingAccountId}
            onCreate={() => {
              resetAccountForm();
              setAccountListFeedbackSuccess("");
              setAccountFormOpen(true);
            }}
            onTransferred={(token) => {
              setAccountListFeedbackError("");
              setAccountListFeedbackSuccess("Transferência realizada.");
              void fetchAccounts(token).catch(() => {
                // fetchAccounts publishes loading errors for the current request.
              });
            }}
            onRetry={() => {
              setAccountListFeedbackError("");
              void retryDashboardAccounts();
            }}
            onEdit={handleEditAccount}
            onToggleStatus={handleToggleAccountStatus}
            loadAccounts={fetchAccounts}
          />
        </div>
      );
    }

    return (
      <Dashboard
        accounts={accounts}
        accountsLoading={isLoadingAccounts}
        accountsError={accountsError}
        getAccessToken={getAccessToken}
        onViewAccounts={() => setActiveMenu("accounts")}
        onRetryAccounts={() => void retryDashboardAccounts()}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen max-w-screen-2xl">
        <Sidebar
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <div className="flex min-w-0 flex-1 flex-col">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} activeMenu={activeMenu} />

          <main className="p-4 sm:p-6">{payment.message && <div role="status" className="mb-4 rounded-md border p-3">
              <p>{payment.message}</p>
              <button type="button" disabled={payment.busy} onClick={() => { void payment.reload(); }} className="mt-2 rounded-md border px-3 py-2 disabled:opacity-60">Atualizar dados</button>
            </div>}
            {payment.selected && <ExpensePaymentForm key={payment.selected.expenseId} expense={payment.selected} accounts={accounts} busy={payment.busy} error={payment.message} onSubmit={payload => { void payment.submit(payload); }} onCancel={payment.cancel} />}
            {renderContent()}</main>
        </div>
      </div>
    </div>
  );
}
