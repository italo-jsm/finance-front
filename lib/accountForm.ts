import type { AccountFormValues } from '../types/account';
import { parseMoney } from './money';

export function buildAccountPayload(values: AccountFormValues, editing: boolean) {
  return {
    name: values.name.trim(),
    accountType: values.accountType,
    closingDay: values.accountType === 'CREDIT_CARD' ? Number(values.closingDay) : null,
    dueDay: values.accountType === 'CREDIT_CARD' || values.accountType === 'FIXED_BILL' ? Number(values.dueDay) : null,
    ...(!editing && values.accountType === 'CHECKING_ACCOUNT' ? { initialBalance: parseMoney(values.initialBalance, true) } : {}),
  };
}
