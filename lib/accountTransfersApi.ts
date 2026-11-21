import { accountsApiUrl } from "./config";

const uncertainMessage = "Não foi possível confirmar a transferência. Confira as movimentações das contas antes de tentar novamente.";
const errorMessages: Record<string, string> = {
  TRANSFER_SAME_ACCOUNT: "Escolha contas diferentes para a origem e o destino.",
  TRANSFER_AMOUNT_INVALID: "Informe um valor positivo com até 13 dígitos inteiros e duas casas decimais.",
  TRANSFER_ACCOUNT_TYPE_INVALID: "Escolha duas contas correntes.",
  INACTIVE_ACCOUNT: "Uma das contas não está mais ativa.",
  INSUFFICIENT_BALANCE: "Saldo insuficiente na conta de origem.",
  ACCOUNT_NOT_FOUND: "Uma das contas não está mais disponível.",
};

export class TransferResultUnknownError extends Error {
  constructor() {
    super(uncertainMessage);
  }
}

export async function transferBetweenAccounts(
  sourceAccountId: string,
  payload: { destinationAccountId: string; amount: number },
  token: string,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${accountsApiUrl}/${encodeURIComponent(sourceAccountId)}/transfers`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new TransferResultUnknownError();
  }

  if (response.status === 201) return;
  if (response.status >= 500 || response.ok) throw new TransferResultUnknownError();

  const body = await response.json().catch(() => null);
  const fallback: Record<number, string> = {
    401: "Sua sessão expirou. Entre novamente.",
    403: "Você não tem permissão para transferir entre essas contas.",
    404: errorMessages.ACCOUNT_NOT_FOUND,
  };
  const message = typeof body?.code === "string" && Object.hasOwn(errorMessages, body.code)
    ? errorMessages[body.code]
    : fallback[response.status];
  throw new Error(message ?? "Não foi possível registrar a transferência. Confira os dados e tente novamente.");
}
