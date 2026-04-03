"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AccountForm } from "@/components/AccountForm";
import type { Expense } from "@/types/expense";
import type { MenuItem } from "@/types/menu";
import { emptyAccountForm, type AccountFormValues, type AccountSummary } from "@/types/account";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { ExpenseHistoryTable, type ExpenseHistoryFilters } from "@/components/ExpenseHistoryTable";
import { accountsApiUrl, expensesApiUrl } from "@/lib/config";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

function getDateOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function buildRecentExpensesUrl() {
  const searchParams = new URLSearchParams({
    beginDate: getDateOffset(-5),
    endDate: getTodayDate(),
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

const emptyExpense: Expense = {
  date: getTodayDate(),
  description: "",
  value: 0,
  category: "OTHER",
  installments: 1,
  accountId: "",
  accountName: "",
  isPaid: false,
  paidFromAccountId: "",
};

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
}>;

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

function normalizeExpense(apiExpense: ExpenseApiItem, accounts: AccountSummary[]): Expense {
  const accountId = apiExpense.accountId ?? "";
  const matchingAccount = accounts.find((account) => account.accountId === accountId);
  const amount = apiExpense.amount ?? apiExpense.value ?? 0;
  const paymentSource = apiExpense.paidFromAccountId ?? "";

  return {
    expenseId: apiExpense.expenseId ?? apiExpense.id,
    date: apiExpense.expenseDate ?? apiExpense.eventDate ?? apiExpense.date ?? "",
    description: apiExpense.description ?? "",
    value: typeof amount === "number" ? amount : Number(amount) || 0,
    category: apiExpense.category ?? "OTHER",
    installments: apiExpense.installments ?? 1,
    accountId,
    accountName: apiExpense.accountName ?? matchingAccount?.name ?? "",
    isPaid: apiExpense.isPaid ?? Boolean(apiExpense.paymentDate || paymentSource),
    paidFromAccountId: paymentSource,
    paymentMethod: apiExpense.paymentMethod ?? null,
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
  const { status, error, login, configured, profile, tokenParsed, getAccessToken } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuItem>("overview");
  const [expense, setExpense] = useState<Expense>(emptyExpense);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isEditingIndex, setIsEditingIndex] = useState<number | null>(null);
  const [isSubmittingExpense, setIsSubmittingExpense] = useState(false);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(false);
  const [expensesError, setExpensesError] = useState("");
  const [expenseHistory, setExpenseHistory] = useState<Expense[]>([]);
  const [isLoadingExpenseHistory, setIsLoadingExpenseHistory] = useState(false);
  const [expenseHistoryError, setExpenseHistoryError] = useState("");
  const [hasSearchedExpenseHistory, setHasSearchedExpenseHistory] = useState(false);
  const [account, setAccount] = useState<AccountFormValues>(emptyAccountForm);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [accountSubmitError, setAccountSubmitError] = useState("");
  const [accountSubmitSuccess, setAccountSubmitSuccess] = useState("");
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState("");

  const fetchAccounts = useCallback(async (accessToken: string) => {
    setIsLoadingAccounts(true);
    setAccountsError("");

    const response = await fetch(accountsApiUrl, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const responseText = await response.text();
      throw new Error(responseText || "Nao foi possivel carregar as contas.");
    }

    const data = (await response.json()) as AccountSummary[];
    setAccounts(data);
    return data;
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

  const refreshRecentExpenses = useCallback(async () => {
    if (status !== "authenticated") return;

    setIsLoadingExpenses(true);
    setExpensesError("");

    try {
      const accessToken = await getAccessToken();
      const data = await fetchExpenses(accessToken, buildRecentExpensesUrl(), accounts);
      setExpenses(data);
    } catch (refreshError) {
      setExpenses([]);
      setExpensesError(
        refreshError instanceof Error ? refreshError.message : "Ocorreu um erro ao carregar as despesas.",
      );
    } finally {
      setIsLoadingExpenses(false);
    }
  }, [accounts, fetchExpenses, getAccessToken, status]);

  const searchExpenseHistory = useCallback(async (filters: ExpenseHistoryFilters) => {
    if (status !== "authenticated") return;

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
      setExpenseHistory(filteredData);
    } catch (refreshError) {
      setExpenseHistory([]);
      setExpenseHistoryError(
        refreshError instanceof Error ? refreshError.message : "Ocorreu um erro ao carregar o histórico de despesas.",
      );
    } finally {
      setIsLoadingExpenseHistory(false);
    }
  }, [accounts, fetchExpenses, getAccessToken, status]);

  useEffect(() => {
    if (status !== "authenticated") {
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
      return;
    }

    let active = true;

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
          const data = await fetchExpenses(accessToken, buildRecentExpensesUrl(), loadedAccounts);
          setExpenses(data);
        } catch (expensesLoadError) {
          if (!active) return;
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
          setIsLoadingExpenses(false);
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

  const resetForm = () => {
    setExpense(emptyExpense);
    setIsEditingIndex(null);
  };

  const isEditingExpense = Boolean(expense.expenseId);

  const validateExpense = (item: Expense) => {
    if (!item.date) return "Escolha a data da despesa.";
    if (!item.description.trim() || item.description.trim().length < 3) return "Descrição precisa ter ao menos 3 caracteres.";
    if (!(item.value > 0)) return "Valor precisa ser maior que zero.";
    if (!item.accountId) return "Escolha uma conta.";
    if (!Number.isInteger(item.installments) || item.installments < 1) return "Parcelas deve ser 1 ou maior.";
    if (item.isPaid && !item.paidFromAccountId) return "Escolha a conta de pagamento.";

    const selectedAccount = accounts.find((account) => account.accountId === item.accountId);
    if (item.installments > 1 && selectedAccount?.accountType !== "CREDIT_CARD") {
      return "Despesas parceladas so podem ser lancadas em cartao de credito.";
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setExpensesError("");
    const error = validateExpense(expense);
    if (error) {
      alert(error);
      return;
    }

    setIsSubmittingExpense(true);
    try {
      const accessToken = await getAccessToken();
      const expenseId = expense.expenseId;
      const isEditing = Boolean(expenseId);
      const response = await fetch(isEditing ? `${expensesApiUrl}/${expenseId}` : expensesApiUrl, {
        method: isEditing ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(buildExpensePayload(expense)),
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(responseText || "Nao foi possivel salvar a despesa.");
      }

      const data = await fetchExpenses(accessToken, buildRecentExpensesUrl(), accounts);
      setExpenses(data);
      resetForm();
    } catch (submitError) {
      alert(submitError instanceof Error ? submitError.message : "Ocorreu um erro ao salvar a despesa.");
    } finally {
      setIsSubmittingExpense(false);
    }
  };

  const handleEdit = (index: number) => {
    const current = expenses[index];
    setExpense(current);
    setIsEditingIndex(index);
    setActiveMenu("transactions");
  };

  const handleEditExpenseById = (expenseId: string) => {
    const currentExpense =
      expenseHistory.find((item) => item.expenseId === expenseId) ?? expenses.find((item) => item.expenseId === expenseId);

    if (!currentExpense) {
      alert("Nao foi possivel localizar a despesa selecionada.");
      return;
    }

    setExpense(currentExpense);
    setIsEditingIndex(null);
    setActiveMenu("transactions");
  };

  const handleDelete = (index: number) => {
    const currentExpense = expenses[index];
    if (!currentExpense?.expenseId) {
      alert("Nao foi possivel identificar a despesa para exclusao.");
      return;
    }

    if (!window.confirm("Remover esta despesa?")) return;

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
          const responseText = await response.text();
          throw new Error(responseText || "Nao foi possivel remover a despesa.");
        }

        const data = await fetchExpenses(accessToken, buildRecentExpensesUrl(), accounts);
        setExpenses(data);
        if (expense.expenseId === currentExpense.expenseId || isEditingIndex === index) {
          resetForm();
        }
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

  const handleAccountSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAccountSubmitError("");
    setAccountSubmitSuccess("");

    const validationError = validateAccount(account);
    if (validationError) {
      setAccountSubmitError(validationError);
      return;
    }

    setIsSubmittingAccount(true);

    try {
      const accessToken = await getAccessToken();

      const response = await fetch(accountsApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          name: account.name.trim(),
          accountType: account.accountType,
          closingDay: account.accountType === "CREDIT_CARD" ? Number(account.closingDay) : null,
          dueDay:
            account.accountType === "CREDIT_CARD" || account.accountType === "FIXED_BILL"
              ? Number(account.dueDay)
              : null,
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(responseText || "Nao foi possivel salvar a conta.");
      }

      await fetchAccounts(accessToken);
      setAccount(emptyAccountForm);
      setAccountSubmitSuccess("Conta salva com sucesso.");
    } catch (submitError) {
      setAccountSubmitError(
        submitError instanceof Error ? submitError.message : "Ocorreu um erro ao salvar a conta.",
      );
    } finally {
      setIsSubmittingAccount(false);
      setIsLoadingAccounts(false);
    }
  };

  const userName =
    profile?.firstName ||
    profile?.username ||
    tokenParsed?.preferred_username ||
    tokenParsed?.name ||
    "usuário";

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-white">
        <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Finance Front</p>
          <h1 className="mt-4 text-3xl font-semibold">Validando sua sessão</h1>
          <p className="mt-3 text-sm text-slate-300">Estamos conferindo se você já tem uma autenticação ativa no Keycloak.</p>
        </div>
      </div>
    );
  }

  if (status === "unauthenticated" || status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#164e63,_#0f172a_42%,_#020617_100%)] px-4 py-10 text-white">
        <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-950/70 p-8 shadow-2xl backdrop-blur">
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Finance Front</p>
          <h1 className="mt-4 text-4xl font-semibold leading-tight">Acesse seu painel com Keycloak</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            O dashboard agora exige autenticacao centralizada. Entre com sua conta para visualizar e gerenciar suas despesas.
          </p>
          <div className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">
            {status === "error"
              ? error
              : "Use o mesmo usuario provisionado no realm configurado para esta aplicacao."}
          </div>
          <button
            onClick={() => void login()}
            disabled={!configured}
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-300"
          >
            Entrar com Keycloak
          </button>
          <p className="mt-4 text-xs text-slate-400">
            Configure as variaveis em <code>.env.local</code> usando o arquivo <code>.env.example</code>.
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    if (activeMenu === "transactions") {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-2xl font-bold">{isEditingExpense ? "Editar despesa" : "Cadastrar despesa"}</h2>
          <ExpenseForm
            expense={expense}
            setExpense={setExpense}
            isEditing={isEditingExpense}
            isSubmitting={isSubmittingExpense}
            accounts={accounts}
            isLoadingAccounts={isLoadingAccounts}
            accountsError={accountsError}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
          <ExpenseList
            expenses={expenses}
            isLoading={isLoadingExpenses}
            error={expensesError}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        </div>
      );
    }

    if (activeMenu === "expenseHistory") {
      return (
        <ExpenseHistoryTable
          expenses={expenseHistory}
          accounts={accounts}
          isLoading={isLoadingExpenseHistory}
          error={expenseHistoryError}
          hasSearched={hasSearchedExpenseHistory}
          onSearch={searchExpenseHistory}
          onEdit={handleEditExpenseById}
        />
      );
    }

    if (activeMenu === "reports") {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="text-2xl font-bold">Relatórios</h2>
          <p className="mt-2 text-slate-600 dark:text-slate-300">Em breve teremos dados de relatórios aqui.</p>
        </div>
      );
    }

    if (activeMenu === "accounts") {
      return (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
          <h2 className="mb-4 text-2xl font-bold">Cadastrar conta</h2>
          <AccountForm
            account={account}
            setAccount={setAccount}
            isSubmitting={isSubmittingAccount}
            submitError={accountSubmitError}
            submitSuccess={accountSubmitSuccess}
            onSubmit={handleAccountSubmit}
          />
        </div>
      );
    }

    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-800">
        <h2 className="text-2xl font-bold">Bem-vindo ao seu painel, {userName}</h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Sua sessao com Keycloak esta ativa. O menu lateral continua responsivo, com botao de toggle para esconder e exibir em telas pequenas.
        </p>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-screen-xl">
        <Sidebar
          activeMenu={activeMenu}
          setActiveMenu={setActiveMenu}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />

        <div className="flex flex-1 flex-col sm:ml-64">
          <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} activeMenu={activeMenu} />

          <main className="p-4 sm:p-6">{renderContent()}</main>
        </div>
      </div>
    </div>
  );
}
