export type AccountMovement = {
  id: string;
  accountId: string;
  amount: number;
  date: string;
  origin: 'OPENING' | 'RECEIPT' | 'PAYMENT' | 'REVERSAL' | 'TRANSFER';
  originId: string | null;
  description?: string | null;
};
