import { invoicesApiUrl } from "./config";

type InvoiceExpense = {
  description: string;
  expenseDate: string;
  amount: number;
};

type ExpenseTotal = { currentTotal: number };

export type Invoice = {
  dueDate: string;
  paid?: boolean;
  payment?: { amount: number; paymentDate: string } | null;
  total: ExpenseTotal;
  totalSingle: ExpenseTotal;
  totalInstallments: ExpenseTotal;
  singleExpenses: InvoiceExpense[];
  installmentsExpenses: InvoiceExpense[];
};

export async function getInvoice(accountId: string, competence: string, token: string, signal: AbortSignal): Promise<Invoice> {
  const query = new URLSearchParams({ accountId, competence });
  const response = await fetch(`${invoicesApiUrl}?${query}`, {
    cache: "no-store",
    signal,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Não foi possível carregar a fatura.");
  return response.json();
}
