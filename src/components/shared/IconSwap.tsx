// "Icon swap" (transitions.dev): troca dois ícones com fade + desfoque + escala.
// Use em botões que alternam entre dois estados (abrir/fechar, mostrar/esconder, copiar/copiado...).
import React from 'react';
import './IconSwap.css';

interface Props {
  /** false mostra `from`; true mostra `to` */
  swapped: boolean;
  from: React.ReactNode;
  to: React.ReactNode;
  className?: string;
}

export default function IconSwap({ swapped, from, to, className = '' }: Props) {
  return (
    <span className={`icon-swap ${className}`.trim()} data-animated={swapped ? 'true' : 'false'} aria-hidden="true">
      <span className="icon-swap__icon icon-swap__from">{from}</span>
      <span className="icon-swap__icon icon-swap__to">{to}</span>
    </span>
  );
}
