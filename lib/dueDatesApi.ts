import { expensesApiUrl } from "./config";
import { getInvoice } from "./invoicesApi";
import { getLocalDate } from "./incomeForm";
import type { AccountSummary } from "@/types/account";
import type { Expense } from "@/types/expense";

export type DuePeriod = { start: string; end: string };
export type DueItem = {
  id: string | number;
  name: string;
  accountName?: string;
  type: "fixed" | "card";
  due: string;
  amount: number;
  paid: number;
  paymentTarget?: { type: "fixed"; expenseId: string } | { type: "card"; accountId: string; competence: string };
};

type FixedExpense = {
  id: string;
  description: string;
  accountId: string;
  amount: number;
  totalPaid?: number;
  canPay?: boolean;
  paymentStatus?: Expense["paymentStatus"];
  payment?: Expense["payment"];
  reversedDate?: string | null;
};

function lastDayOfMonth(month: string) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + 1, 0);
  return date.toISOString().slice(0, 10);
}

function monthsBetween(period: DuePeriod) {
  const months = [];
  for (let month = period.start.slice(0, 7); month <= period.end.slice(0, 7);) {
    months.push(month);
    if (month === period.end.slice(0, 7)) break;
    const next = new Date(`${month}-01T00:00:00Z`);
    next.setUTCMonth(next.getUTCMonth() + 1);
    month = next.toISOString().slice(0, 7);
  }
  return months;
}

export function getCurrentDuePeriod(today = getLocalDate()): DuePeriod {
  const month = today.slice(0, 7);
  return { start: `${month}-01`, end: lastDayOfMonth(month) };
}

const toCents = (value: number) => Math.round(value * 100);

export async function loadDueItems(
  accounts: AccountSummary[], period: DuePeriod, token: string, signal: AbortSignal,
): Promise<DueItem[]> {
  const fixed = accounts.filter(account => account.accountType === "FIXED_BILL");
  const cards = accounts.filter(account => account.accountType === "CREDIT_CARD");
  const contains = (date: string) => date >= period.start && date <= period.end;
  const jobs: Array<() => Promise<DueItem[]>> = [];

  for (const month of monthsBetween(period)) {
    const lastDay = Number(lastDayOfMonth(month).slice(-2));
    const dueDates = new Map<string, { due: string; name: string }>();

    for (const account of fixed) {
      if (!account.dueDay || account.dueDay < 1 || account.dueDay > 31) {
        throw new Error("Conta fixa sem dia de vencimento válido.");
      }
      const day = String(Math.min(account.dueDay, lastDay)).padStart(2, "0");
      const due = `${month}-${day}`;
      if (contains(due)) dueDates.set(account.accountId, { due, name: account.name });
    }

    if (dueDates.size) jobs.push(async () => {
      const [year, number] = month.split("-");
      const query = new URLSearchParams({ year, month: number });
      for (const id of dueDates.keys()) query.append("accountId", id);
      const response = await fetch(`${expensesApiUrl}/by-competence?${query}`, {
        cache: "no-store", signal, headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Não foi possível carregar as contas fixas.");
      const { singleExpenses, installmentExpenses }: {
        singleExpenses: FixedExpense[]; installmentExpenses: FixedExpense[];
      } = await response.json();
      return [...singleExpenses, ...installmentExpenses].flatMap(expense => {
        const account = dueDates.get(expense.accountId);
        const amount = toCents(expense.amount);
        if (!account || expense.reversedDate || expense.paymentStatus === "REVERSED" || amount <= 0) return [];
        const paid = expense.paymentStatus === "PAID" ? amount :
          Math.min(amount, Math.max(0, toCents(expense.totalPaid ?? expense.payment?.amount ?? 0)));
        return [{ id: expense.id, name: expense.description || account.name, accountName: account.name,
          type: "fixed", due: account.due, amount, paid,
          ...(expense.canPay === true && paid < amount ? { paymentTarget: { type: "fixed", expenseId: expense.id } } : {}),
        }];
      });
    });

    for (const card of cards) {
      jobs.push(async () => {
        const invoice = await getInvoice(card.accountId, month, token, signal);
        const amount = toCents(invoice.total.currentTotal);
        if (!contains(invoice.dueDate) || amount <= 0) return [];
        const paid = invoice.paid || invoice.payment ? amount : 0;
        return [{ id: `${card.accountId}:${month}`, name: card.name, type: "card", due: invoice.dueDate, amount, paid,
          ...(paid === 0 ? { paymentTarget: { type: "card", accountId: card.accountId, competence: month } } : {}),
        }];
      });
    }
  }

  const items: DueItem[] = [];
  console.info("[Vencimentos] Requisições ao Finance planejadas", { requests: jobs.length });
  let next = 0;
  let failed = false;
  // Limit concurrent requests when the period crosses several months.
  await Promise.all(Array.from({ length: Math.min(jobs.length, 6) }, async () => {
    while (!failed && next < jobs.length) {
      signal.throwIfAborted();
      try {
        items.push(...await jobs[next++]());
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }));
  return items.sort((a, b) => a.due.localeCompare(b.due) || a.name.localeCompare(b.name, "pt-BR") ||
    String(a.id).localeCompare(String(b.id)));
}
