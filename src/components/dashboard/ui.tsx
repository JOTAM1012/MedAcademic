// Peças visuais comuns aos cartões do Painel (casca do cartão, link, seletor, barra e peças dos blocos "bento").
// Regra: nada de transform/filter nas cascas (modais e menus dentro dos cartões usam position: fixed).
import React, { useId, useState } from 'react';
import { ArrowRight, ChevronDown, TrendingDown, TrendingUp, type LucideIcon } from 'lucide-react';
import type { GroupMode } from './dashboardData';
import { useGrowFromZero } from '../shared/CountUp';
import Segmented from '../shared/Segmented';

export const WidgetCard: React.FC<{
  id?: string;
  title: string;
  icon: LucideIcon;
  color: string;
  action?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}> = ({ id, title, icon: Icon, color, action, className = '', children }) => (
  <section
    id={id}
    className={`bento-card h-full min-w-0 rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 md:p-5 flex flex-col gap-3 ${className}`}
  >
    <header className="flex items-center justify-between gap-2 min-h-[32px]">
      <h3 className="min-w-0 text-[13px] font-bold text-slate-600 dark:text-slate-300 flex items-center gap-2">
        <span className="h-7 w-7 shrink-0 rounded-lg grid place-items-center" style={{ backgroundColor: `${color}1f` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </span>
        <span className="truncate">{title}</span>
      </h3>
      {action}
    </header>
    {children}
  </section>
);

/** Link do cabeçalho. `compact`: no tablet/desktop mostra só a seta (o texto fica para leitores de tela) */
export const LinkButton: React.FC<{ id?: string; onClick: () => void; compact?: boolean; children: React.ReactNode }> = ({ id, onClick, compact, children }) => (
  <button
    type="button"
    id={id}
    onClick={onClick}
    className={`shrink-0 min-h-[40px] -my-1.5 -mr-2 px-2 rounded-xl text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 inline-flex items-center gap-1 ${
      compact ? 'md:min-w-[40px] md:justify-center' : ''
    }`}
  >
    <span className={compact ? 'md:sr-only' : ''}>{children}</span>
    <ArrowRight className="h-3.5 w-3.5" />
  </button>
);

/** "Grandes áreas | Módulos" */
export const GroupToggle: React.FC<{ id: string; value: GroupMode; onChange: (m: GroupMode) => void }> = ({ id, value, onChange }) => (
  <div id={id}>
    <Segmented
      ariaLabel="Agrupar por"
      options={[
        { id: 'area', label: 'Grandes áreas' },
        { id: 'module', label: 'Módulos' },
      ]}
      value={value}
      onChange={onChange}
      idFor={(m) => `${id}-${m}`}
      fontSize={11}
    />
  </div>
);

export const Bar: React.FC<{ pct: number; color: string; goal?: number; thin?: boolean }> = ({ pct, color, goal, thin }) => {
  const shown = useGrowFromZero(Math.max(0, Math.min(100, Number.isFinite(pct) ? pct : 0)));
  return (
    <div className={`relative w-full rounded-full bg-slate-100 dark:bg-slate-800 ${thin ? 'h-1' : 'h-1.5'}`}>
      <div className="h-full rounded-full transition-[width] duration-700 ease-out motion-reduce:transition-none" style={{ width: `${shown}%`, backgroundColor: color }} />
      {goal !== undefined && (
        <span className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded bg-slate-400/70 dark:bg-slate-500" style={{ left: `${goal}%` }} title={`Meta ${goal}%`} />
      )}
    </div>
  );
};

/** Aviso de vazio: só texto e espaço, sem caixa dentro da caixa */
export const EmptyNote: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div className="flex-1 flex flex-col items-start justify-center gap-2 py-1">
    <p className="text-xs text-slate-500 dark:text-slate-400">{children}</p>
    {action}
  </div>
);

export const softBtn =
  'min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-600 text-xs font-bold inline-flex items-center gap-1.5';

// ---------- Blocos "bento" ----------

/** O número grande do bloco */
export const BigNumber: React.FC<{ id?: string; className?: string; children: React.ReactNode }> = ({ id, className = 'text-slate-900 dark:text-white', children }) => (
  <p id={id} className={`text-4xl md:text-[2.6rem] font-black leading-none tracking-tight tabular-nums ${className}`}>
    {children}
  </p>
);

/** Sufixo menor ao lado do número ("%", "/7") */
export const Unit: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="ml-0.5 text-lg md:text-xl font-black text-slate-400 dark:text-slate-500">{children}</span>
);

/** Rótulo curto embaixo do número */
export const StatLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="mt-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">{children}</p>
);

/** Linha pequena de detalhe/tendência */
export const StatNote: React.FC<{ id?: string; className?: string; title?: string; children: React.ReactNode }> = ({ id, className = '', title, children }) => (
  <p id={id} title={title} className={`text-[11px] text-slate-500 dark:text-slate-400 truncate ${className}`}>
    {children}
  </p>
);

/** "+5 pontos" / "−3 pontos" com seta */
export const Trend: React.FC<{ delta?: number; suffix: string }> = ({ delta, suffix }) => {
  if (delta === undefined || delta === 0) return null;
  const up = delta > 0;
  return (
    <span className={`inline-flex items-center gap-1 font-bold ${up ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
      {up ? <TrendingUp className="h-3 w-3 shrink-0" /> : <TrendingDown className="h-3 w-3 shrink-0" />}
      {up ? '+' : '−'}
      {Math.abs(delta)} {suffix}
    </span>
  );
};

/** Corpo do bloco pequeno: empurra o número para baixo do cabeçalho */
export const StatBody: React.FC<{ children: React.ReactNode }> = ({ children }) => <div className="mt-auto min-w-0 flex flex-col">{children}</div>;

/** "Ver detalhes": mostra a lista completa dentro do próprio bloco, separada por uma linha fina */
export const Details: React.FC<{ id: string; label?: string; children: React.ReactNode }> = ({ id, label = 'Ver detalhes', children }) => {
  const [open, setOpen] = useState(false);
  const panelId = `${id}-${useId().replace(/:/g, '')}`;
  return (
    <div className="border-t border-slate-100 dark:border-slate-800 -mb-1.5">
      <button
        type="button"
        id={`${id}-toggle`}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="w-full min-h-[40px] flex items-center justify-between gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-sky-700 dark:hover:text-sky-300"
      >
        <span>{open ? 'Esconder detalhes' : label}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition-transform duration-200 motion-reduce:transition-none ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div id={panelId} className="bento-fade pb-3 flex flex-col gap-2">
          {children}
        </div>
      )}
    </div>
  );
};
