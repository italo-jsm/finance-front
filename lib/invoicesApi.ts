import { invoicesApiUrl } from "./config";
import type { ExpensePaymentPayload } from "./expensePayment";

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

export async function payInvoice(
  accountId: string, competence: string, { paidFromAccountId, paymentDate }: ExpensePaymentPayload, token: string,
): Promise<void> {
  const response = await fetch(`${invoicesApiUrl}/${encodeURIComponent(accountId)}/${encodeURIComponent(competence)}/pay`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ paidFromAccountId, paymentDate }),
  }).catch(() => {
    throw new Error("Não foi possível confirmar o resultado do pagamento da fatura. Confira os dados atualizados antes de tentar novamente.");
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    if (error?.code === "INVOICE_ALREADY_PAID") throw new Error("Esta fatura já foi paga.");
    if (error?.code === "INVOICE_HAS_INDIVIDUAL_PAYMENTS") throw new Error("Esta fatura tem pagamentos individuais e não pode ser quitada em lote.");
    throw new Error("Não foi possível registrar o pagamento da fatura. Confira os dados atualizados antes de tentar novamente.");
  }
}
