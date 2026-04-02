export type ExpenseCategory =
  | "GROCERIES"
  | "HOUSING"
  | "TRANSPORT"
  | "FUEL"
  | "SUBSCRIPTION"
  | "LEISURE"
  | "RESTAURANT"
  | "EDUCATION"
  | "ELECTRONICS"
  | "HEALTH"
  | "MOTORCYCLE"
  | "SUPERMARKET"
  | "OTHER";

export type Expense = {
  expenseId?: string;
  date: string;
  description: string;
  value: number;
  category: ExpenseCategory;
  installments: number;
  accountId: string;
  accountName: string;
  isPaid: boolean;
  paidFromAccountId: string;
};

export const expenseCategoryOptions: Array<{ value: ExpenseCategory; label: string }> = [
  { value: "GROCERIES", label: "Mercearia" },
  { value: "HOUSING", label: "Moradia" },
  { value: "TRANSPORT", label: "Transporte" },
  { value: "FUEL", label: "Combustivel" },
  { value: "SUBSCRIPTION", label: "Assinaturas" },
  { value: "LEISURE", label: "Lazer" },
  { value: "RESTAURANT", label: "Restaurante" },
  { value: "EDUCATION", label: "Educacao" },
  { value: "ELECTRONICS", label: "Eletronicos" },
  { value: "HEALTH", label: "Saude" },
  { value: "MOTORCYCLE", label: "Moto" },
  { value: "SUPERMARKET", label: "Supermercado" },
  { value: "OTHER", label: "Outros" },
];
