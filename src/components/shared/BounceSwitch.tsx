// Interruptor com quique duplo ("Toggle remix", transitions.dev). A animação só
// roda depois da primeira troca, nunca ao abrir a tela. Use `decorative` quando o
// interruptor fica dentro de um botão maior (a linha inteira é o botão).
import React, { useEffect, useRef, useState } from 'react';
import './BounceSwitch.css';

interface Props {
  checked: boolean;
  onChange?: (checked: boolean) => void;
  id?: string;
  ariaLabel?: string;
  disabled?: boolean;
  className?: string;
  /** só o desenho, sem botão (para usar dentro de outro botão) */
  decorative?: boolean;
}

export default function BounceSwitch({ checked, onChange, id, ariaLabel, disabled, className = '', decorative }: Props) {
  const [init, setInit] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setInit(true);
  }, [checked]);

  const cls = `p27-switch${init ? ' is-init' : ''}${className ? ` ${className}` : ''}`;
  if (decorative) {
    return (
      <span className={cls} data-on={checked ? 'true' : 'false'} aria-hidden="true">
        <span className="p27-thumb" />
      </span>
    );
  }
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      data-on={checked ? 'true' : 'false'}
      className={cls}
      onClick={() => onChange?.(!checked)}
    >
      <span className="p27-thumb" aria-hidden="true" />
    </button>
  );
}
