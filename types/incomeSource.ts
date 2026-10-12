export type IncomeSourceType = 'SALARY' | 'SERVICES' | 'RENT' | 'BENEFIT_OR_PENSION' | 'INVESTMENT_RETURNS' | 'OTHER';
export type IncomeSource = { id: string; name: string; type: IncomeSourceType; description: string | null; expectedDay: number | null; estimatedAmount: number | null };
export type IncomeSourceFormValues = { name: string; type: IncomeSourceType | ''; description: string; expectedDay: string; estimatedAmount: string };
export type SaveIncomeSourcePayload = { name: string; type: IncomeSourceType; description: string | null; expectedDay: number; estimatedAmount: number };
export const emptyIncomeSourceForm: IncomeSourceFormValues = { name: '', type: '', description: '', expectedDay: '', estimatedAmount: '' };
export const incomeSourceTypeLabels: Record<IncomeSourceType, string> = {
  SALARY: 'Salário', SERVICES: 'Prestação de serviços', RENT: 'Aluguel',
  BENEFIT_OR_PENSION: 'Benefício ou pensão', INVESTMENT_RETURNS: 'Rendimentos de investimentos', OTHER: 'Outros',
};
