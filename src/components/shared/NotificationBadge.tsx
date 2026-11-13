// Selo com o número de avisos, no canto do sino. Aparece com deslize + quique e some encolhendo.
// O número fica guardado durante a saída, para o selo não "piscar" vazio.
import React, { useEffect, useRef, useState } from 'react';
import './notificationBadge.css';

export const NotificationBadge: React.FC<{ count: number; max?: number }> = ({ count, max = 9 }) => {
  const open = count > 0;
  const last = useRef(count);
  if (open) last.current = count;
  // Ao trocar o número com o selo aberto, refaz a entrada (chama atenção para o aviso novo)
  const [key, setKey] = useState(0);
  const prev = useRef(count);
  useEffect(() => {
    if (count > prev.current && prev.current > 0) setKey((k) => k + 1);
    prev.current = count;
  }, [count]);
  const shown = last.current > max ? `${max}+` : String(last.current);
  return (
    <span key={key} className="notif-badge" data-open={open ? 'true' : 'false'} aria-hidden="true">
      <span className="notif-badge-inner">{shown}</span>
    </span>
  );
};
