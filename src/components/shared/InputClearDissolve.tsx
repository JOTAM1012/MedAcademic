// Campo de texto que, ao limpar, faz o texto cair e se dissolver com um brilho
// suave embaixo de cada palavra, enquanto o texto de exemplo desce de cima.
// Baseado em "Input clear with dissolve" (transitions.dev). Com "reduzir
// movimento", limpa na hora.
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import './InputClearDissolve.css';

export interface InputClearDissolveHandle {
  /** Limpa o campo com a animação */
  clear: () => void;
  focus: () => void;
  blur: () => void;
  input: HTMLInputElement | null;
}

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'placeholder'>;

interface Props extends InputProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  /** Classes do invólucro (tamanho e posição) */
  wrapperClassName?: string;
  /** Classes de texto da cópia (mesma fonte do campo) */
  textClassName?: string;
  /** Classes do texto de exemplo */
  placeholderClassName?: string;
  /** Chamado quando a animação de limpar termina */
  onCleared?: () => void;
}

// lê uma variável do CSS; tempos viram milissegundos (o build troca "1000ms" por "1s")
const num = (name: string, fb: number) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const v = parseFloat(raw);
  if (!Number.isFinite(v)) return fb;
  return /\ds$/.test(raw) && !raw.endsWith('ms') ? v * 1000 : v;
};

// amostrador de cubic-bezier para o JS seguir a mesma curva do CSS
function bezier(str: string) {
  const m = String(str).replace(/\s+/g, '').match(/cubic-bezier\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+)\)/);
  if (!m) return (t: number) => t;
  const [x1, y1, x2, y2] = m.slice(1).map(parseFloat);
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    let s = t;
    for (let i = 0; i < 8; i++) {
      const dx = ((ax * s + bx) * s + cx) * s - t;
      const d = (3 * ax * s + 2 * bx) * s + cx;
      if (Math.abs(dx) < 1e-6 || d === 0) break;
      s -= dx / d;
    }
    return ((ay * s + by) * s + cy) * s;
  };
}

const nbsp = (s: string) => s.replace(/ /g, ' ');

const InputClearDissolve = forwardRef<InputClearDissolveHandle, Props>(function InputClearDissolve(
  { value, onValueChange, placeholder = '', wrapperClassName = '', textClassName = '', placeholderClassName = '', onCleared, className = '', ...inputProps },
  ref
) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mirrorRef = useRef<HTMLDivElement>(null);
  const pholdRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const [frozen, setFrozen] = useState<string | null>(null);
  const clearingRef = useRef(false);

  const buildGlow = (text: string) => {
    const input = inputRef.current;
    const wrap = wrapRef.current;
    if (!input || !wrap) return '';
    const ctx = document.createElement('canvas').getContext('2d');
    if (!ctx) return '';
    ctx.font = getComputedStyle(input).font;
    const isDark = document.documentElement.classList.contains('dark');
    const rgb = isDark ? '255,255,255' : '0,0,0';
    const w = wrap.clientWidth || 280;
    const padLeft = (input.offsetLeft || 0) + (parseFloat(getComputedStyle(input).paddingLeft) || 0);
    const spread = num('--glow-spread', 1.5);
    const layers: string[] = [];
    let x = 0;
    text.split(/(\s+)/).forEach((seg) => {
      const segW = ctx.measureText(seg).width;
      if (seg.trim()) {
        const cx = padLeft + x + segW / 2;
        const hw = Math.max(segW * 0.45, 8) * spread;
        (
          [
            [0, 0.8, 7, 0.22],
            [hw * 0.45, 0.55, 8, 0.18],
            [-hw * 0.4, 0.65, 6, 0.16],
            [hw * 0.15, 0.9, 5, 0.14],
          ] as const
        ).forEach(([dx, rwm, rh, a]) => {
          const lx = (((cx + dx) / w) * 100).toFixed(2);
          layers.push(`radial-gradient(ellipse ${Math.max(hw * rwm, 2).toFixed(1)}px ${rh}px at ${lx}% 100%, rgba(${rgb},${a}), transparent)`);
        });
      }
      x += segW;
    });
    return layers.join(', ');
  };

  const clear = () => {
    const input = inputRef.current;
    const mirror = mirrorRef.current;
    const phold = pholdRef.current;
    const glow = glowRef.current;
    if (clearingRef.current || !value) return;
    const keepFocus = document.activeElement === input;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !mirror || !phold || !glow) {
      onValueChange('');
      onCleared?.();
      if (keepFocus) input?.focus({ preventScroll: true });
      return;
    }
    clearingRef.current = true;
    const text = value;
    setFrozen(text);
    onValueChange('');

    const root = getComputedStyle(document.documentElement);
    const total = num('--clear-dur', 1000);
    const outDur = num('--clear-out-dur', 400);
    const inDur = num('--clear-in-dur', 400);
    const outFly = num('--clear-out-fly', 12);
    const inFly = num('--clear-in-fly', 12);
    const blur = num('--clear-blur', 2);
    const delay = num('--glow-delay', 50);
    const peakAt = num('--glow-peak-at', 0.15);
    const gOp = num('--glow-opacity', 0.42);
    const easeOut = bezier(root.getPropertyValue('--clear-out-ease'));
    const easeIn = bezier(root.getPropertyValue('--clear-in-ease'));

    glow.style.background = buildGlow(text);
    glow.style.opacity = '0';
    phold.style.transform = `translateY(-${inFly}px)`;
    phold.style.opacity = '0.9';
    phold.style.filter = `blur(${blur}px)`;

    const t0 = performance.now();
    const tick = (now: number) => {
      const el = now - t0;
      const eo = easeOut(Math.min(1, el / outDur));
      mirror.style.transform = `translateY(${(eo * outFly).toFixed(1)}px)`;
      mirror.style.opacity = (1 - eo).toFixed(3);
      mirror.style.filter = `blur(${(eo * blur).toFixed(1)}px)`;

      const ei = easeIn(Math.min(1, el / inDur));
      phold.style.transform = `translateY(${(-inFly + ei * inFly).toFixed(1)}px)`;
      phold.style.opacity = (0.9 + ei * 0.1).toFixed(3);
      phold.style.filter = `blur(${(blur - ei * blur).toFixed(1)}px)`;

      let g = 0;
      if (el > delay) {
        const gp = Math.min(1, (el - delay) / Math.max(1, total - delay));
        g = gp < peakAt ? gp / peakAt : 1 - (gp - peakAt) / (1 - peakAt);
      }
      glow.style.opacity = (g * gOp).toFixed(3);

      if (el < total) {
        requestAnimationFrame(tick);
      } else {
        mirror.style.transform = mirror.style.opacity = mirror.style.filter = '';
        phold.style.transform = phold.style.opacity = phold.style.filter = '';
        glow.style.opacity = '0';
        glow.style.background = '';
        clearingRef.current = false;
        setFrozen(null);
        onCleared?.();
        if (keepFocus) requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
      }
    };
    requestAnimationFrame(tick);
  };

  useImperativeHandle(ref, () => ({
    clear,
    focus: () => inputRef.current?.focus(),
    blur: () => inputRef.current?.blur(),
    get input() {
      return inputRef.current;
    },
  }));

  const clearing = frozen !== null;
  const mirrorText = clearing ? frozen : value;

  return (
    <div ref={wrapRef} className={`t-clear${value ? ' has-value' : ''}${clearing ? ' is-clearing' : ''} ${wrapperClassName}`}>
      <input
        ref={inputRef}
        {...inputProps}
        aria-label={inputProps['aria-label'] ?? (placeholder || undefined)}
        value={value}
        onChange={(e) => {
          // digitar no meio da animação: a cópia passa a mostrar o novo texto
          if (clearingRef.current) setFrozen(null);
          onValueChange(e.target.value);
        }}
        className={className}
      />
      <div ref={mirrorRef} className={`t-clear-mirror ${textClassName}`} aria-hidden="true">
        {nbsp(mirrorText)}
      </div>
      <div ref={pholdRef} className={`t-clear-placeholder ${placeholderClassName}`} aria-hidden="true">
        {placeholder}
      </div>
      <div ref={glowRef} className="t-clear-glow" aria-hidden="true" />
    </div>
  );
});

export default InputClearDissolve;
