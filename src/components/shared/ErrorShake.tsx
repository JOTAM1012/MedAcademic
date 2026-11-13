// Tremor de erro nos campos: shakeElement(el) balança um elemento; shakeField('nome') balança o
// bloco marcado com data-shake-field="nome" e põe o foco no campo dele. FieldError mostra a
// mensagem embaixo do campo, com fade. O erro some quando a pessoa corrige o campo.
import React, { useRef } from 'react';
import './errorShake.css';

/** Duração total do tremor: 80 + 80 + 60 + 60 ms */
export const SHAKE_MS = 80 * 2 + 60 * 2;
const timers = new WeakMap<Element, number>();

export const shakeElement = (el: Element | null | undefined) => {
  if (!el) return;
  // Reinicia a animação: tira a classe, força o navegador a recalcular e põe de novo
  el.classList.remove('is-shaking');
  void (el as HTMLElement).offsetWidth;
  el.classList.add('is-shaking');
  const old = timers.get(el);
  if (old) window.clearTimeout(old);
  timers.set(
    el,
    window.setTimeout(() => el.classList.remove('is-shaking'), SHAKE_MS + 20)
  );
};

/** Balança o campo marcado com data-shake-field. delay: espera a tela trocar (ex.: voltou um passo) */
export const shakeField = (name: string, delay = 0, focus = true) => {
  window.setTimeout(() => {
    const el = document.querySelector(`[data-shake-field="${name}"]`);
    shakeElement(el);
    if (focus) (el?.querySelector('input, select, textarea') as HTMLElement | null)?.focus({ preventScroll: false });
  }, delay);
};

/** Mensagem de erro embaixo do campo (fica no lugar durante o fade de saída) */
export const FieldError: React.FC<{ message?: string | null; id?: string }> = ({ message, id }) => {
  const last = useRef<string>('');
  if (message) last.current = message;
  return (
    <p id={id} role={message ? 'alert' : undefined} aria-live="polite" className={`field-error-msg ${message ? 'is-visible' : ''}`}>
      {message || last.current}
    </p>
  );
};
