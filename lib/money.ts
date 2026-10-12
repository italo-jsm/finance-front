// Validate the decimal before converting to the JSON number expected by the API.
export function parseMoney(value: string, allowNonPositive: boolean): number {
  const decimal = value.trim().replace(',', '.');
  const message = allowNonPositive
    ? 'Informe um saldo inicial com até 13 dígitos inteiros e duas casas decimais.'
    : 'Informe um valor positivo com até 13 dígitos inteiros e duas casas decimais.';
  if (!/^-?\d+(\.\d{1,2})?$/.test(decimal)) throw new Error(message);
  const toCents = (text: string) => {
    const negative = text.startsWith('-');
    const [whole, fraction = ''] = text.replace(/^-/, '').split('.');
    const cents = BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, '0'));
    return negative ? -cents : cents;
  };
  const cents = toCents(decimal);
  const amount = Number(decimal);
  const serialized = JSON.stringify(amount);
  if (Math.abs(amount) >= 10000000000000 || (!allowNonPositive && cents <= BigInt(0)) ||
      !/^-?\d+(\.\d{1,2})?$/.test(serialized) || toCents(serialized) !== cents) {
    throw new Error(message);
  }
  return amount;
}
