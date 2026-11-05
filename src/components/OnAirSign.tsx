import React from 'react';
import { Settings } from 'lucide-react';

interface OnAirSignProps {
  maintenance: boolean;
  onClick?: () => void;
}

// Placa luminosa de estúdio: "NO AR" (vermelho aceso, pulsando) ou "EM MANUTENÇÃO" (engrenagens girando)
export const OnAirSign: React.FC<OnAirSignProps> = ({ maintenance, onClick }) => (
  <button
    type="button"
    id="site-status-sign"
    onClick={onClick}
    title={maintenance ? 'Site em manutenção — clique para gerenciar' : 'Site no ar — clique para gerenciar'}
    className={`onair-sign ${maintenance ? 'onair-sign--maint' : 'onair-sign--live'}`}
  >
    <span className="onair-screws" aria-hidden>
      <i />
      <i />
      <i />
      <i />
    </span>
    {maintenance ? (
      <span className="flex items-center gap-2.5">
        <span className="relative h-8 w-9 shrink-0" aria-hidden>
          <Settings className="onair-gear absolute left-0 top-0 h-6 w-6" />
          <Settings className="onair-gear onair-gear--rev absolute right-0 bottom-0 h-4 w-4" />
        </span>
        <span className="flex flex-col items-start leading-none">
          <span className="onair-text text-[15px]">MANUTENÇÃO</span>
          <span className="text-[9px] font-bold tracking-[0.25em] text-amber-200/70 mt-1">SÓ VOCÊ ENTRA</span>
        </span>
      </span>
    ) : (
      <span className="flex items-center gap-2.5">
        <span className="onair-dot" aria-hidden />
        <span className="flex flex-col items-start leading-none">
          <span className="onair-text text-[20px]">NO AR</span>
          <span className="text-[9px] font-bold tracking-[0.25em] text-rose-200/70 mt-1">AO VIVO</span>
        </span>
      </span>
    )}
  </button>
);
