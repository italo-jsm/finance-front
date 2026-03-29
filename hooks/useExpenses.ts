import { useEffect, useState } from "react";
import { Expense } from "../types/expense";

const STORAGE_KEY = "finance-frontend-expenses";

export function useExpenses() {
  const [expenses, setExpenses] = useState<Expense[]>(() => {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    try {
      return JSON.parse(stored) as Expense[];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  }, [expenses]);

  const addExpense = (expense: Expense) => setExpenses((prev) => [expense, ...prev]);

  const updateExpense = (idx: number, updated: Expense) =>
    setExpenses((prev) => prev.map((item, index) => (index === idx ? updated : item)));

  const deleteExpense = (idx: number) =>
    setExpenses((prev) => prev.filter((_, index) => index !== idx));

  return { expenses, addExpense, updateExpense, deleteExpense };
}
