// Confirmação dentro do site (no lugar do window.confirm, que alguns aparelhos e o app instalado bloqueiam).
// Uso: if (!(await confirmDialog({ title: 'Excluir?', message: '...', confirmLabel: 'Excluir' }))) return;
import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** vermelho para exclusões (padrão); 'primary' para ações comuns */
  tone?: 'danger' | 'primary';
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

let push: ((p: Pending) => void) | null = null;

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    if (!push) {
      // host ainda não montado: melhor não apagar nada sem perguntar
      resolve(false);
      return;
    }
    push({ ...opts, resolve });
  });
}

export const ConfirmHost: React.FC = () => {
  const [current, setCurrent] = useState<Pending | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    push = (p) =>
      setCurrent((prev) => {
        prev?.resolve(false);
        return p;
      });
    return () => {
      push = null;
    };
  }, []);

  const close = (ok: boolean) => {
    current?.resolve(ok);
    setCurrent(null);
  };

  useEffect(() => {
    if (!current) return;
    // foco no "Cancelar" em exclusões, para Enter não apagar sem querer
    (current.tone === 'primary' ? confirmRef : cancelRef).current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        close(false);
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  if (!current) return null;
  const danger = current.tone !== 'primary';

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-150" onClick={() => close(false)} />
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={current.message ? 'confirm-dialog-message' : undefined}
        className="relative w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl p-5 animate-in fade-in zoom-in-95 duration-150 motion-reduce:animate-none"
      >
        <div className="flex items-start gap-3">
          <span className={`h-10 w-10 shrink-0 rounded-2xl grid place-items-center ${danger ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400' : 'bg-sky-500/10 text-sky-600 dark:text-sky-400'}`}>
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="min-w-0 pt-0.5">
            <h2 id="confirm-dialog-title" className="text-base font-black text-slate-900 dark:text-white">
              {current.title}
            </h2>
            {current.message && (
              <p id="confirm-dialog-message" className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                {current.message}
              </p>
            )}
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            ref={cancelRef}
            id="confirm-dialog-cancel"
            type="button"
            onClick={() => close(false)}
            className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700"
          >
            {current.cancelLabel || 'Cancelar'}
          </button>
          <button
            ref={confirmRef}
            id="confirm-dialog-ok"
            type="button"
            onClick={() => close(true)}
            className={`min-h-[44px] px-4 rounded-xl text-sm font-black text-white ${danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-sky-600 hover:bg-sky-500'}`}
          >
            {current.confirmLabel || (danger ? 'Excluir' : 'Confirmar')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
