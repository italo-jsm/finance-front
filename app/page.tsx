"use client";

import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { AccountForm } from "@/components/AccountForm";
import type { Expense } from "@/types/expense";
import type { MenuItem } from "@/types/menu";
import { emptyAccountForm, type AccountFormValues, type AccountSummary } from "@/types/account";
import { useExpenses } from "@/hooks/useExpenses";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";
import { ExpenseForm } from "@/components/ExpenseForm";
import { ExpenseList } from "@/components/ExpenseList";
import { accountsApiUrl, expensesApiUrl } from "@/lib/config";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
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

export default function Home() {
  const { status, error, login, configured, profile, tokenParsed, getAccessToken } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState<MenuItem>("overview");
  const [expense, setExpense] = useState<Expense>(emptyExpense);
  const [isEditingIndex, setIsEditingIndex] = useState<number | null>(null);
  const [account, setAccount] = useState<AccountFormValues>(emptyAccountForm);
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false);
  const [accountSubmitError, setAccountSubmitError] = useState("");
  const [accountSubmitSuccess, setAccountSubmitSuccess] = useState("");
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);
  const [accountsError, setAccountsError] = useState("");

  const { expenses, addExpense, updateExpense, deleteExpense } = useExpenses();

  async function fetchAccounts(accessToken: string) {
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
  }

  useEffect(() => {
    if (status !== "authenticated") {
      setAccounts([]);
      setAccountsError("");
      setIsLoadingAccounts(false);
      return;
    }

    let active = true;

    async function bootstrapAccounts() {
      try {
        const accessToken = await getAccessToken();
        if (!active) return;
        await fetchAccounts(accessToken);
      } catch (loadError) {
        if (!active) return;

        setAccounts([]);
        setAccountsError(
          loadError instanceof Error ? loadError.message : "Ocorreu um erro ao carregar as contas.",
        );
      } finally {
        if (active) {
          setIsLoadingAccounts(false);
        }
      }
    }

    void bootstrapAccounts();

    return () => {
      active = false;
    };
  }, [getAccessToken, status]);

  const resetForm = () => {
    setExpense(emptyExpense);
    setIsEditingIndex(null);
  };

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
    const error = validateExpense(expense);
    if (error) {
      alert(error);
      return;
    }

    if (isEditingIndex !== null) {
      updateExpense(isEditingIndex, expense);
      resetForm();
      return;
    }

    try {
      const accessToken = await getAccessToken();

      const response = await fetch(expensesApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          description: expense.description.trim(),
          amount: expense.value,
          eventDate: expense.date,
          category: expense.category,
          accountId: expense.accountId,
          installments: expense.installments,
          paymentMethod: expense.isPaid ? "TRANSFER" : null,
          paymentDate: expense.isPaid ? expense.date : null,
          paidFromAccountId: expense.isPaid ? expense.paidFromAccountId : null,
        }),
      });

      if (!response.ok) {
        const responseText = await response.text();
        throw new Error(responseText || "Nao foi possivel salvar a despesa.");
      }

      addExpense(expense);
      resetForm();
    } catch (submitError) {
      alert(submitError instanceof Error ? submitError.message : "Ocorreu um erro ao salvar a despesa.");
    }
  };

  const handleEdit = (index: number) => {
    const current = expenses[index];
    setExpense(current);
    setIsEditingIndex(index);
    setActiveMenu("transactions");
  };

  const handleDelete = (index: number) => {
    if (!window.confirm("Remover esta despesa?")) return;
    deleteExpense(index);
    if (isEditingIndex === index) {
      resetForm();
    }
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
          <h2 className="text-2xl font-bold mb-4">{isEditingIndex !== null ? "Editar despesa" : "Cadastrar despesa"}</h2>
          <ExpenseForm
            expense={expense}
            setExpense={setExpense}
            isEditing={isEditingIndex !== null}
            accounts={accounts}
            isLoadingAccounts={isLoadingAccounts}
            accountsError={accountsError}
            onSubmit={handleSubmit}
            onCancel={resetForm}
          />
          <ExpenseList expenses={expenses} onEdit={handleEdit} onDelete={handleDelete} />
        </div>
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
