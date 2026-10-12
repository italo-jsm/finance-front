export type Income = {
  id: string;
  incomeSourceId: string;
  competence: string;
  amount: number;
  expectedDate: string;
  accountId: string;
  receivedDate: string | null;
  status: 'PENDING' | 'RECEIVED';
};
export type SaveIncomePayload = Pick<Income, 'incomeSourceId' | 'competence' | 'amount' | 'expectedDate' | 'accountId'>;
export type IncomeFormValues = Omit<SaveIncomePayload, 'amount'> & { amount: string };
export const emptyIncomeForm: IncomeFormValues = {
  incomeSourceId: '', competence: '', amount: '', expectedDate: '', accountId: '',
};
