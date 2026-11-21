"use client";

import { useRef, useState, type FormEvent } from "react";
import { FormModal } from "./FormModal";
import { transferBetweenAccounts, TransferResultUnknownError } from "../lib/accountTransfersApi";
import { parseMoney } from "../lib/money";
import type { AccountSummary } from "@/types/account";

type Props = {
  accounts: AccountSummary[];
  getAccessToken: () => Promise<string>;
  onDismiss: () => void;
  onTransferred: (token: string) => void;
};

const inputClass = "block min-h-11 w-full min-w-0 rounded-lg border border-slate-400 bg-white px-3 py-2 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-70 dark:border-slate-500 dark:bg-slate-900 dark:text-slate-100";

export function AccountTransferModal({ accounts, getAccessToken, onDismiss, onTransferred }: Props) {
  const [sourceId, setSourceId] = useState("");
  const [destinationId, setDestinationId] = useState("");
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const pending = useRef(false);
  const source = accounts.find(account => account.accountId === sourceId);
  const balance = source?.balance;
  const destinations = accounts.filter(account => account.accountId !== sourceId);

  function cancel() {
    if (pending.current) return;
    if (sourceId || destinationId || value) setConfirmDiscard(true);
    else onDismiss();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || uncertain) return;
    setError("");
    if (!source || !destinations.some(account => account.accountId === destinationId)) {
      setError("Escolha duas contas correntes ativas e diferentes.");
      return;
    }

    let amount: number;
    try {
      const input = value.trim();
      const decimal = /^\d{1,3}(\.\d{3})+(,\d{1,2})?$/.test(input) ? input.replaceAll(".", "") : input;
      amount = parseMoney(decimal, false);
    } catch (error) {
      if (error instanceof Error) setError(error.message);
      return;
    }

    if (typeof balance === "number" && amount > balance) {
      setError("Saldo insuficiente na conta de origem.");
      return;
    }

    pending.current = true;
    setSaving(true);
    let token: string;
    try {
      token = await getAccessToken();
      await transferBetweenAccounts(sourceId, { destinationAccountId: destinationId, amount }, token);
    } catch (error) {
      setUncertain(error instanceof TransferResultUnknownError);
      setError(error instanceof Error ? error.message : "Não foi possível registrar a transferência.");
      return;
    } finally {
      pending.current = false;
      setSaving(false);
    }
    onTransferred(token);
  }

  return <FormModal open title="Transferir entre contas" initialField="#transfer-source" saving={saving}
    confirmDiscard={confirmDiscard} onRequestDismiss={cancel} onContinueEditing={() => setConfirmDiscard(false)} onDismiss={onDismiss}>
    <form onSubmit={submit} className="flex flex-1 flex-col gap-4 pt-4">
      {error && <p role="alert" className={`mx-5 rounded-lg p-3 text-sm font-semibold sm:mx-7 ${uncertain
        ? "bg-blue-50 text-blue-950 dark:bg-blue-950 dark:text-blue-100"
        : "bg-red-50 text-red-900 dark:bg-red-950 dark:text-red-100"}`}>{error}</p>}
      <fieldset disabled={saving || uncertain} className="min-w-0 space-y-4 px-5 sm:px-7">
        <div>
          <label htmlFor="transfer-source" className="mb-1 block text-sm font-semibold">Conta de origem</label>
          <select id="transfer-source" className={inputClass} required value={sourceId}
            aria-describedby={source ? "transfer-balance" : undefined}
            onChange={event => {
              const nextSource = event.target.value;
              setSourceId(nextSource);
              if (nextSource === destinationId) setDestinationId("");
              setError("");
            }}>
            <option value="">Selecione a origem</option>
            {accounts.map(account => <option key={account.accountId} value={account.accountId}>{account.name}</option>)}
          </select>
          {source && <p id="transfer-balance" className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Saldo disponível: {typeof balance === "number" ? balance.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "Indisponível"}
          </p>}
        </div>
        <div>
          <label htmlFor="transfer-destination" className="mb-1 block text-sm font-semibold">Conta de destino</label>
          <select id="transfer-destination" className={inputClass} required value={destinationId}
            onChange={event => { setDestinationId(event.target.value); setError(""); }}>
            <option value="">Selecione o destino</option>
            {destinations.map(account => <option key={account.accountId} value={account.accountId}>{account.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="transfer-amount" className="mb-1 block text-sm font-semibold">Valor</label>
          <div className="relative">
            <span aria-hidden="true" className="pointer-events-none absolute top-2.5 left-3 text-slate-600 dark:text-slate-300">R$</span>
            <input id="transfer-amount" className={`${inputClass} pl-10`} required type="text" inputMode="decimal"
              placeholder="0,00" value={value} onChange={event => { setValue(event.target.value); setError(""); }} />
          </div>
        </div>
      </fieldset>
      <footer className="sticky bottom-0 z-10 mt-auto flex shrink-0 flex-wrap gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:px-7 dark:border-slate-700 dark:bg-slate-900">
        <button type="button" onClick={uncertain ? onDismiss : cancel} disabled={saving}
          className="min-h-11 rounded-lg border border-slate-400 px-4 font-semibold disabled:opacity-60">
          {uncertain ? "Fechar" : "Cancelar"}
        </button>
        {!uncertain && <button type="submit" disabled={saving}
          className="min-h-11 grow rounded-lg bg-blue-700 px-4 py-2 font-semibold text-white hover:bg-blue-800 disabled:bg-blue-100 disabled:text-blue-900 dark:disabled:bg-slate-700 dark:disabled:text-slate-200">
          {saving ? "Transferindo…" : "Confirmar transferência"}
        </button>}
      </footer>
    </form>
  </FormModal>;
}
