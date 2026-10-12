import type { Income, IncomeFormValues, SaveIncomePayload } from '../types/income';
import { parseMoney } from './money';

export function getLocalDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function isValidMonth(value: string): boolean {
  return /^(?!0000)\d{4}-(0[1-9]|1[0-2])$/.test(value);
}
export function buildIncomePayload(values: IncomeFormValues): SaveIncomePayload {
  if (!values.incomeSourceId) throw new Error('Selecione uma fonte de renda.');
  if (!values.accountId) throw new Error('Selecione uma conta corrente de destino.');
  if (!isValidMonth(values.competence)) throw new Error('Informe uma competência válida com mês e ano.');
  const date = new Date(`${values.expectedDate}T12:00:00Z`);
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(values.expectedDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== values.expectedDate) {
    throw new Error('Informe uma data prevista válida.');
  }
  return {
    incomeSourceId: values.incomeSourceId, accountId: values.accountId,
    competence: values.competence, amount: parseMoney(values.amount, false), expectedDate: values.expectedDate,
  };
}
export function incomeToForm(income: Income): IncomeFormValues {
  return { incomeSourceId: income.incomeSourceId, accountId: income.accountId, competence: income.competence, amount: String(income.amount), expectedDate: income.expectedDate };
}
