// "Check" com mola (baseado no SpringCheck do React Bits). Mesmo movimento do original: mola de
// 0,2 s, o preenchimento cresce do centro com leve quique, o risco desenha e a linha atravessa o texto.
// Com "reduzir movimento", troca na hora. Adaptado: ícone de check do lucide (sem pacote novo).
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react';
import './SpringCheck.css';

const VISUAL_DURATION = 0.2;
const RULE_END = 0.84;
const SWELL = 0.35;
/** Risco do check (lucide "check", 24×24) */
const TICK_PATH = 'M20 6 9 17l-5-5';
const ORIGIN = { left: 'left center', center: 'center', right: 'right center', none: 'left center' } as const;

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const zetaOf = (bounce: number) => (bounce <= 0 ? 1 : -Math.log(bounce) / Math.sqrt(Math.PI ** 2 + Math.log(bounce) ** 2));

const readings = (t: number, doneOpacity: number, strikeLag: number) => {
  const held = clamp01(t);
  return {
    fill: `scale(${Math.max(t, 0)})`,
    box: `scale(${1 + SWELL * Math.max(0, t - 1)})`,
    tick: 1 - held,
    word: 1 - (1 - doneOpacity) * held,
    rule: `scaleX(${clamp01((held - strikeLag) / (RULE_END - strikeLag))})`,
  };
};

interface Props {
  label: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  color?: string;
  fillColor?: string;
  checkColor?: string;
  boxSize?: number;
  boxRadius?: number;
  fontSize?: number;
  bounce?: number;
  strikeLag?: number;
  doneOpacity?: number;
  strike?: keyof typeof ORIGIN;
  ariaLabel?: string;
  className?: string;
  id?: string;
}

export default function SpringCheck({
  label,
  checked,
  defaultChecked = false,
  onChange,
  disabled = false,
  color = 'currentColor',
  fillColor = '#0ea5e9',
  checkColor = '#ffffff',
  boxSize = 20,
  boxRadius = 6,
  fontSize = 14,
  bounce = 0.2,
  strikeLag = 0.12,
  doneOpacity = 0.42,
  strike = 'left',
  ariaLabel,
  className = '',
  id,
}: Props) {
  const controlled = checked !== undefined;
  const [inner, setInner] = useState(defaultChecked);
  const on = controlled ? !!checked : inner;
  const reduce = useReducedMotion();

  const t = useMotionValue(on ? 1 : 0);
  const viaPointer = useRef(false);
  const instant = useRef(false);
  const rowRef = useRef<HTMLButtonElement>(null);
  const boxRef = useRef<HTMLSpanElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  const tickRef = useRef<SVGPathElement>(null);
  const wordRef = useRef<HTMLSpanElement>(null);
  const ruleRef = useRef<HTMLSpanElement>(null);
  const cfg = useRef({ doneOpacity, strikeLag });
  cfg.current = { doneOpacity, strikeLag };

  const write = (value: number) => {
    const r = readings(value, cfg.current.doneOpacity, cfg.current.strikeLag);
    if (fillRef.current) fillRef.current.style.transform = r.fill;
    if (boxRef.current) boxRef.current.style.transform = r.box;
    if (tickRef.current) tickRef.current.style.strokeDashoffset = String(r.tick);
    if (wordRef.current) wordRef.current.style.opacity = String(r.word);
    if (ruleRef.current) ruleRef.current.style.transform = r.rule;
  };
  useMotionValueEvent(t, 'change', write);
  useLayoutEffect(() => {
    write(t.get());
  });

  useEffect(() => {
    const target = on ? 1 : 0;
    if (reduce || instant.current) {
      instant.current = false;
      t.jump(target);
      return undefined;
    }
    if (t.get() === target && t.getVelocity() === 0) return undefined;
    const controls = animate(t, target, { type: 'spring', visualDuration: VISUAL_DURATION, bounce: 1 - zetaOf(bounce) });
    return () => controls.stop();
  }, [on, reduce, bounce, t]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0 || disabled) return;
    viaPointer.current = true;
    if (!reduce && rowRef.current) rowRef.current.dataset.pressed = '';
  };
  const handlePointerUp = () => {
    if (rowRef.current) delete rowRef.current.dataset.pressed;
  };
  const handlePointerCancel = () => {
    viaPointer.current = false;
    handlePointerUp();
  };
  const toggle = () => {
    if (disabled) return;
    instant.current = !viaPointer.current;
    viaPointer.current = false;
    const next = !on;
    if (!controlled) setInner(next);
    onChange?.(next);
  };

  const r = readings(t.get(), doneOpacity, strikeLag);
  const ring = boxSize >= 24 ? 2 : 1.5;
  const gap = Math.min(16, Math.max(8, Math.round(boxSize * 0.43)));
  const ruleHeight = Math.max(1.5, Math.round(fontSize / 6) / 2);

  return (
    <button
      ref={rowRef}
      id={id}
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={ariaLabel}
      disabled={disabled}
      className={`spring-check${className ? ` ${className}` : ''}`}
      style={
        {
          '--sc-ink': color,
          '--sc-fill': fillColor,
          '--sc-check': checkColor,
          '--sc-box': `${boxSize}px`,
          '--sc-radius': `${boxRadius}px`,
          '--sc-font': `${fontSize}px`,
          '--sc-ring': `${ring}px`,
          '--sc-gap': `${gap}px`,
          '--sc-row': `${Math.max(36, boxSize + 16)}px`,
          '--sc-rule': `${ruleHeight}px`,
          '--sc-origin': ORIGIN[strike] || ORIGIN.left,
        } as React.CSSProperties
      }
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerCancel}
      onClick={toggle}
    >
      <span className="spring-check__press">
        <span ref={boxRef} className="spring-check__box" style={{ transform: r.box }}>
          <span className="spring-check__ring" aria-hidden="true" />
          <span ref={fillRef} className="spring-check__fill" style={{ transform: r.fill }} />
          <svg className="spring-check__tick" viewBox="0 0 24 24" aria-hidden="true">
            <path ref={tickRef} d={TICK_PATH} pathLength={1} strokeDasharray={1} style={{ strokeDashoffset: r.tick }} />
          </svg>
        </span>
      </span>
      <span className="spring-check__label">
        <span ref={wordRef} className="spring-check__word" style={{ opacity: r.word }}>
          {label}
        </span>
        {strike !== 'none' ? <span ref={ruleRef} className="spring-check__rule" aria-hidden="true" style={{ transform: r.rule }} /> : null}
      </span>
    </button>
  );
}
