import { incomeSourceTypeLabels, type IncomeSource, type IncomeSourceFormValues, type SaveIncomeSourcePayload } from '../types/incomeSource';

export function buildIncomeSourcePayload(values: IncomeSourceFormValues): SaveIncomeSourcePayload {
  if (!values.name.trim() || !values.type || !(values.type in incomeSourceTypeLabels)) {
    throw new Error('Informe o nome e selecione um tipo válido.');
  }
  const day = values.expectedDay.trim();
  const expectedDay = Number(day);
  if (!/^\d+$/.test(day) || !Number.isInteger(expectedDay) || expectedDay < 1 || expectedDay > 31) {
    throw new Error('Informe um dia previsto inteiro entre 1 e 31.');
  }
  const amount = values.estimatedAmount.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    throw new Error('Informe um valor estimado positivo com até duas casas decimais.');
  }
  // Compare cents before and after conversion to avoid silently losing money in JSON numbers.
  const [whole, fraction = ''] = amount.split('.');
  const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0'));
  const estimatedAmount = Number(amount);
  const serialized = JSON.stringify(estimatedAmount);
  const [serializedWhole, serializedFraction = ''] = serialized.split('.');
  const serializedCents = /^\d+(\.\d{1,2})?$/.test(serialized)
    ? BigInt(serializedWhole) * BigInt(100) + BigInt(serializedFraction.padEnd(2, '0'))
    : null;
  if (cents <= BigInt(0) || cents > BigInt(Number.MAX_SAFE_INTEGER) || serializedCents !== cents) {
    throw new Error('Informe um valor estimado válido que possa ser representado sem perda de centavos.');
  }
  return { name: values.name.trim(), type: values.type, description: values.description.trim() ? values.description : null, expectedDay, estimatedAmount };
}

export function incomeSourceToForm(source: IncomeSource): IncomeSourceFormValues {
  return {
    name: source.name, type: source.type, description: source.description ?? '',
    expectedDay: source.expectedDay == null ? '' : String(source.expectedDay),
    estimatedAmount: source.estimatedAmount == null ? '' : String(source.estimatedAmount),
  };
}
