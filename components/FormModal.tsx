"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";

type FormModalProps = {
  open: boolean;
  title: string;
  confirmDiscard?: boolean;
  wide?: boolean;
  initialField?: string;
  saving?: boolean;
  onRequestDismiss: () => void;
  onContinueEditing?: () => void;
  onDismiss?: () => void;
  children: ReactNode;
};

const secondaryButton = "min-h-11 rounded-lg border border-slate-400 px-3 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800";

export function FormModal({ open, title, confirmDiscard, wide = false, saving, onRequestDismiss, onContinueEditing, onDismiss, children, initialField = "input:not([type=hidden]), select, textarea" }: FormModalProps) {
  const labelId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const continueButton = useRef<HTMLButtonElement>(null);
  const dismissTrigger = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    const trigger = document.activeElement;
    element.showModal();
    element.querySelector<HTMLInputElement>(initialField)?.focus();
    return () => {
      element.close();
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open, initialField]);

  useEffect(() => {
    if (confirmDiscard) continueButton.current?.focus();
  }, [confirmDiscard]);

  function dismiss() {
    if (saving) return;
    dismissTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    onRequestDismiss();
  }

  function continueEditing() {
    onContinueEditing?.();
    requestAnimationFrame(() => {
      const target = dismissTrigger.current ?? dialog.current?.querySelector<HTMLInputElement>(initialField);
      target?.focus();
    });
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={confirmDiscard ? `${labelId}-discard` : labelId}
      aria-describedby={confirmDiscard ? `${labelId}-description` : undefined}
      onCancel={(event) => {
        event.preventDefault();
        if (confirmDiscard) continueEditing();
        else dismiss();
      }}
      className={`fixed inset-x-0 m-0 mx-auto w-full max-w-none overflow-y-auto overscroll-contain rounded-t-2xl bg-white text-slate-900 shadow-xl backdrop:bg-slate-950/50 dark:bg-slate-900 dark:text-slate-100 ${confirmDiscard
        ? "inset-y-0 my-auto h-fit max-w-[calc(100%-2rem)] rounded-2xl sm:max-w-md"
        : "top-auto bottom-0 h-[calc(100dvh-4rem)] max-h-[calc(100dvh-1.5rem)] sm:inset-y-0 sm:my-auto sm:h-fit sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl"} ${confirmDiscard ? "" : wide ? "sm:max-w-3xl" : "sm:max-w-xl"}`}
    >
      <div className={confirmDiscard ? "hidden" : "flex min-h-full flex-col"} onFocusCapture={(event) => { dismissTrigger.current = event.target; }}>
        <header className="sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-5 py-3 sm:px-7 dark:border-slate-700 dark:bg-slate-900">
          <h2 id={labelId} className="text-2xl font-bold tracking-tight">{title}</h2>
          <button type="button" aria-label="Fechar" disabled={saving} onClick={dismiss}
            className="size-11 rounded-lg text-2xl text-slate-600 hover:bg-slate-100 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800">
            ×
          </button>
        </header>
        {children}
      </div>
      {confirmDiscard && (
        <section className="space-y-4 p-5 sm:p-6">
          <h2 id={`${labelId}-discard`} className="text-xl font-bold">Descartar alterações?</h2>
          <p id={`${labelId}-description`} className="text-sm text-slate-600 dark:text-slate-300">Os dados preenchidos serão perdidos.</p>
          <div className="flex flex-wrap gap-2">
            <button ref={continueButton} type="button" className={`grow ${secondaryButton}`} onClick={continueEditing}>Continuar editando</button>
            <button type="button" onClick={onDismiss ?? onRequestDismiss} className="min-h-11 grow rounded-lg bg-red-700 px-3 font-semibold text-white hover:bg-red-800">Descartar</button>
          </div>
        </section>
      )}
    </dialog>
  );
}

type RecordFormModalProps = {
  title: string;
  dirty: boolean;
  saving: boolean;
  onDismiss: () => void;
  children: (cancel: () => void) => ReactNode;
};

export function RecordFormModal({ title, dirty, saving, onDismiss, children }: RecordFormModalProps) {
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  function cancel() {
    if (saving) return;
    if (dirty) setConfirmDiscard(true);
    else onDismiss();
  }

  return <FormModal open title={title} saving={saving} confirmDiscard={confirmDiscard}
    onRequestDismiss={cancel} onContinueEditing={() => setConfirmDiscard(false)} onDismiss={onDismiss}>
    <div className="px-5 py-4 sm:px-7">{children(cancel)}</div>
  </FormModal>;
}
