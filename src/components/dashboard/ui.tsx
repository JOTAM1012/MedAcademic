// Peças visuais comuns aos cartões do Painel (casca do cartão, link, seletor e barra).
import React from 'react';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import type { GroupMode } from './dashboardData';

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
    className={`h-full min-w-0 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-5 flex flex-col gap-3 ${className}`}
  >
    <header className="flex items-center justify-between gap-2 min-h-[32px]">
      <h3 className="min-w-0 text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
        <Icon className="h-4 w-4 shrink-0" style={{ color }} />
        <span className="truncate">{title}</span>
      </h3>
      {action}
    </header>
    {children}
  </section>
);

export const LinkButton: React.FC<{ id?: string; onClick: () => void; children: React.ReactNode }> = ({ id, onClick, children }) => (
  <button
    type="button"
    id={id}
    onClick={onClick}
    className="shrink-0 min-h-[40px] -my-1.5 -mr-2 px-2 rounded-xl text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 inline-flex items-center gap-1"
  >
    {children}
    <ArrowRight className="h-3.5 w-3.5" />
  </button>
);

/** "Grandes áreas | Módulos" */
export const GroupToggle: React.FC<{ id: string; value: GroupMode; onChange: (m: GroupMode) => void }> = ({ id, value, onChange }) => (
  <div id={id} role="group" aria-label="Agrupar por" className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-0.5">
    {(
      [
        ['area', 'Grandes áreas'],
        ['module', 'Módulos'],
      ] as const
    ).map(([m, label]) => (
      <button
        key={m}
        type="button"
        id={`${id}-${m}`}
        aria-pressed={value === m}
        onClick={() => onChange(m)}
        className={`min-h-[40px] px-2.5 rounded-lg text-[11px] font-bold transition-colors ${
          value === m
            ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
            : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
        }`}
      >
        {label}
      </button>
    ))}
  </div>
);

export const Bar: React.FC<{ pct: number; color: string; goal?: number; thin?: boolean }> = ({ pct, color, goal, thin }) => (
  <div className={`relative w-full rounded-full bg-slate-100 dark:bg-slate-800 ${thin ? 'h-1' : 'h-1.5'}`}>
    <div className="h-full rounded-full transition-[width] duration-500" style={{ width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }} />
    {goal !== undefined && (
      <span className="absolute -top-0.5 -bottom-0.5 w-0.5 rounded bg-slate-400/70 dark:bg-slate-500" style={{ left: `${goal}%` }} title={`Meta ${goal}%`} />
    )}
  </div>
);

export const EmptyNote: React.FC<{ children: React.ReactNode; action?: React.ReactNode }> = ({ children, action }) => (
  <div className="flex-1 flex flex-col items-start justify-center gap-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-4">
    <p className="text-xs text-slate-500 dark:text-slate-400">{children}</p>
    {action}
  </div>
);

export const softBtn =
  'min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-600 text-xs font-bold inline-flex items-center gap-1.5';
