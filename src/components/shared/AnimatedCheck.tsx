// Visto animado: só o visual (um <span>). Fica dentro do botão que já existe,
// então id, aria-pressed, aria-label e onClick continuam no botão.
// Ao marcar, o "visto" se desenha e a caixinha pulsa. Ao montar, não anima.
import React, { useLayoutEffect, useRef, useState } from 'react';
import './check.css';

interface AnimatedCheckProps {
  checked: boolean;
  /** Cor da caixinha marcada (e do pulso) */
  color?: string;
  shape?: 'round' | 'square';
  /** Lado da caixinha em px */
  size?: number;
  /** Espessura do traço do visto (viewBox 24) */
  stroke?: number;
  /** Classes sempre aplicadas (margens, borda, etc.) */
  className?: string;
  /** Classes só quando desmarcado (borda cinza, tracejado...) */
  offClassName?: string;
  /** Estilo só quando desmarcado */
  offStyle?: React.CSSProperties;
  /** Conteúdo quando desmarcado (ex.: número do passo) */
  children?: React.ReactNode;
}

export const AnimatedCheck: React.FC<AnimatedCheckProps> = ({
  checked,
  color = '#10b981',
  shape = 'square',
  size = 20,
  stroke = 3.2,
  className = '',
  offClassName = '',
  offStyle,
  children,
}) => {
  const prev = useRef(checked);
  const [pop, setPop] = useState(false);

  // Antes de pintar: evita mostrar o visto pronto e depois redesenhar
  useLayoutEffect(() => {
    if (checked && !prev.current) setPop(true);
    if (!checked) setPop(false);
    prev.current = checked;
  }, [checked]);

  const radius = shape === 'round' ? '9999px' : `${Math.max(4, Math.round(size * 0.28))}px`;
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: radius,
    ['--ac-color' as string]: color,
    ...(checked ? { backgroundColor: color, borderColor: color, color: '#fff' } : offStyle),
  };
  const tick = Math.round(size * 0.68);

  return (
    <span
      aria-hidden
      className={`ac-box ${pop ? 'ac-pop' : ''} ${className} ${checked ? '' : offClassName}`}
      style={style}
      onAnimationEnd={(e) => {
        if (e.animationName === 'ac-ring') setPop(false);
      }}
    >
      {checked ? (
        <svg className="ac-tick" width={tick} height={tick} viewBox="0 0 24 24" fill="none">
          <path d="M5 12.5l4.5 4.5L19 7.5" stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        children
      )}
    </span>
  );
};
