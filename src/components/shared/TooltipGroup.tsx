// Grupo com uma dica que desliza entre os botões ("Tooltip open/close remix",
// transitions.dev). Marque cada botão com `data-tooltip="texto"`. Aparece com o
// mouse e com o teclado (Tab); no toque não aparece, para não ficar presa na tela.
import React, { useEffect, useId, useRef } from 'react';
import './TooltipGroup.css';

interface Props {
  children: React.ReactNode;
  className?: string;
  /** esconde a dica (ex.: quando um menu do grupo está aberto) */
  suppressed?: boolean;
}

export default function TooltipGroup({ children, className = '', suppressed }: Props) {
  const groupRef = useRef<HTMLDivElement>(null);
  const tipRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const tipId = useId();

  useEffect(() => {
    const group = groupRef.current;
    const tip = tipRef.current;
    const text = textRef.current;
    if (!group || !tip || !text) return;
    let current: HTMLElement | null = null;

    const hide = () => {
      if (current) current.removeAttribute('aria-describedby');
      current = null;
      tip.setAttribute('data-show', 'false');
      tip.setAttribute('aria-hidden', 'true');
    };
    const place = (trigger: HTMLElement) => {
      const label = trigger.getAttribute('data-tooltip') || '';
      if (!label) return hide();
      const showing = tip.getAttribute('data-show') === 'true';
      text.textContent = label;
      const cs = getComputedStyle(tip);
      const width = Math.ceil(text.scrollWidth + parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight));
      const g = group.getBoundingClientRect();
      const r = trigger.getBoundingClientRect();
      // centrada no botão, sem passar da borda direita da tela
      const maxX = window.innerWidth - 8 - g.left - width;
      const x = Math.min(r.left - g.left + r.width / 2 - width / 2, maxX);
      if (!showing) {
        // ajusta a posição escondida, para só a entrada animar
        tip.style.transition = 'none';
        tip.style.width = `${width}px`;
        tip.style.setProperty('--p17-x', `${x}px`);
        void tip.offsetWidth;
        tip.style.transition = '';
      } else {
        tip.style.width = `${width}px`;
        tip.style.setProperty('--p17-x', `${x}px`);
      }
      if (current && current !== trigger) current.removeAttribute('aria-describedby');
      current = trigger;
      trigger.setAttribute('aria-describedby', tipId);
      tip.setAttribute('data-show', 'true');
      tip.setAttribute('aria-hidden', 'false');
    };
    const triggerOf = (t: EventTarget | null) => {
      const el = (t as HTMLElement | null)?.closest?.('[data-tooltip]') as HTMLElement | null;
      return el && group.contains(el) ? el : null;
    };

    const onOver = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      const t = triggerOf(e.target);
      if (t) place(t);
    };
    const onFocusIn = (e: FocusEvent) => {
      const t = triggerOf(e.target);
      if (t && t.matches(':focus-visible')) place(t);
    };
    const onFocusOut = () => hide();
    const onDown = () => hide();

    group.addEventListener('pointerover', onOver);
    group.addEventListener('pointerleave', hide);
    group.addEventListener('pointerdown', onDown);
    group.addEventListener('focusin', onFocusIn);
    group.addEventListener('focusout', onFocusOut);
    return () => {
      group.removeEventListener('pointerover', onOver);
      group.removeEventListener('pointerleave', hide);
      group.removeEventListener('pointerdown', onDown);
      group.removeEventListener('focusin', onFocusIn);
      group.removeEventListener('focusout', onFocusOut);
    };
  }, [tipId]);

  useEffect(() => {
    if (suppressed) {
      tipRef.current?.setAttribute('data-show', 'false');
      tipRef.current?.setAttribute('aria-hidden', 'true');
    }
  }, [suppressed]);

  return (
    <div ref={groupRef} className={`p17-group ${className}`}>
      {children}
      <span ref={tipRef} id={tipId} className="p17-tooltip" role="tooltip" aria-hidden="true" data-show="false">
        <span ref={textRef} className="p17-tooltip-text" />
      </span>
    </div>
  );
}
