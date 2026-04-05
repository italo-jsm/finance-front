export type AccountType = "CREDIT_CARD" | "CHECKING_ACCOUNT" | "FIXED_BILL";

export type AccountSummary = {
  accountId: string;
  name: string;
  accountType: AccountType;
  closingDay?: number | null;
  dueDay?: number | null;
  active?: boolean;
};

export type AccountTypeOption = {
  value: AccountType;
  label: string;
  helperText: string;
};

export type AccountFormValues = {
  name: string;
  accountType: AccountType;
  closingDay: string;
  dueDay: string;
};

export const accountTypeOptions: AccountTypeOption[] = [
  {
    value: "CREDIT_CARD",
    label: "Cartao de credito",
    helperText: "Permite informar dia de fechamento e vencimento.",
  },
  {
    value: "CHECKING_ACCOUNT",
    label: "Conta corrente",
    helperText: "Conta para saldo e movimentacoes do dia a dia.",
  },
  {
    value: "FIXED_BILL",
    label: "Conta fixa",
    helperText: "Ideal para despesas recorrentes com vencimento mensal.",
  },
];

export const emptyAccountForm: AccountFormValues = {
  name: "",
  accountType: "CHECKING_ACCOUNT",
  closingDay: "",
  dueDay: "",
};
