// Número que "conta" de 0 até o valor quando aparece na tela (uma vez).
// Sem pulo de layout: a largura final fica reservada (camada invisível) e os dígitos são tabulares.
import React, { useEffect, useRef, useState } from 'react';

export const prefersReducedMotion = () => {
  try {
    return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    return false;
  }
};

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

interface CountUpProps {
  value: number;
  /** Como mostrar o número (padrão: inteiro arredondado) */
  format?: (n: number) => string;
  /** Duração em ms (máx. 700) */
  duration?: number;
  className?: string;
  id?: string;
}

export const CountUp: React.FC<CountUpProps> = ({ value, format = (n) => String(Math.round(n)), duration = 650, className = '', id }) => {
  const ref = useRef<HTMLSpanElement>(null);
  const safe = Number.isFinite(value) ? value : 0;
  const [shown, setShown] = useState(() => (prefersReducedMotion() ? safe : 0));
  const started = useRef(false);
  const from = useRef(0);
  const ms = Math.min(700, Math.max(0, duration));

  useEffect(() => {
    const el = ref.current;
    if (prefersReducedMotion() || !el) {
      setShown(safe);
      started.current = true;
      return;
    }
    let raf = 0;
    const run = (start: number, len: number) => {
      const t0 = performance.now();
      const tick = (now: number) => {
        const t = len ? Math.min(1, (now - t0) / len) : 1;
        setShown(start + (safe - start) * easeOut(t));
        if (t < 1) raf = requestAnimationFrame(tick);
        else from.current = safe;
      };
      raf = requestAnimationFrame(tick);
    };

    // Valor mudou depois da primeira contagem: transição curta a partir do valor anterior
    if (started.current) {
      run(from.current, 260);
      return () => cancelAnimationFrame(raf);
    }

    if (typeof IntersectionObserver === 'undefined') {
      started.current = true;
      run(0, ms);
      return () => cancelAnimationFrame(raf);
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        started.current = true;
        run(0, ms);
      },
      { threshold: 0.2 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [safe, ms]);

  const finalText = format(safe);
  return (
    <span ref={ref} id={id} className={`inline-grid tabular-nums ${className}`}>
      <span aria-hidden className="invisible col-start-1 row-start-1">
        {finalText}
      </span>
      <span aria-hidden className="col-start-1 row-start-1">
        {format(shown)}
      </span>
      <span className="sr-only">{finalText}</span>
    </span>
  );
};

/**
 * Valor que começa em 0 e vai para `target` no quadro seguinte (para transições CSS de barras e anéis).
 * Com movimento reduzido, já começa no valor final.
 */
export const useGrowFromZero = (target: number) => {
  const [v, setV] = useState(() => (prefersReducedMotion() ? target : 0));
  useEffect(() => {
    let r2 = 0;
    const r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(() => setV(target));
    });
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
    };
  }, [target]);
  return v;
};
