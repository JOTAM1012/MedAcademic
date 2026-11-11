import React from 'react';
import { motion, useReducedMotion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';

export type EmptyStateTone = 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' | 'slate';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  text?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  /** Ícone do botão principal (opcional) */
  actionIcon?: LucideIcon;
  actionId?: string;
  /** Segundo botão, mais discreto */
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryIcon?: LucideIcon;
  tone?: EmptyStateTone;
  /** 'md' para telas e seções; 'sm' para blocos menores (um dia, um filtro) */
  size?: 'sm' | 'md';
  /** Moldura da seção (borda e fundo). Use false quando já está dentro de um card. */
  framed?: boolean;
  id?: string;
  className?: string;
  /** Conteúdo extra abaixo do texto (ex.: próximo passo) */
  children?: React.ReactNode;
}

const TONES: Record<EmptyStateTone, { halo: string; disc: string; icon: string; dot: string; btn: string; frame: string }> = {
  sky: {
    halo: 'bg-sky-100/70 dark:bg-sky-500/10',
    disc: 'bg-sky-50 ring-sky-200/80 dark:bg-sky-500/15 dark:ring-sky-400/20',
    icon: 'text-sky-600 dark:text-sky-300',
    dot: 'bg-sky-300 dark:bg-sky-400/60',
    btn: 'bg-sky-600 hover:bg-sky-500 text-white focus-visible:ring-sky-500',
    frame: 'border-slate-200 dark:border-slate-800',
  },
  emerald: {
    halo: 'bg-emerald-100/70 dark:bg-emerald-500/10',
    disc: 'bg-emerald-50 ring-emerald-200/80 dark:bg-emerald-500/15 dark:ring-emerald-400/20',
    icon: 'text-emerald-600 dark:text-emerald-300',
    dot: 'bg-emerald-300 dark:bg-emerald-400/60',
    btn: 'bg-emerald-600 hover:bg-emerald-500 text-white focus-visible:ring-emerald-500',
    frame: 'border-emerald-200/80 dark:border-emerald-900/50',
  },
  amber: {
    halo: 'bg-amber-100/70 dark:bg-amber-500/10',
    disc: 'bg-amber-50 ring-amber-200/80 dark:bg-amber-500/15 dark:ring-amber-400/20',
    icon: 'text-amber-600 dark:text-amber-300',
    dot: 'bg-amber-300 dark:bg-amber-400/60',
    btn: 'bg-amber-600 hover:bg-amber-500 text-white focus-visible:ring-amber-500',
    frame: 'border-slate-200 dark:border-slate-800',
  },
  rose: {
    halo: 'bg-rose-100/70 dark:bg-rose-500/10',
    disc: 'bg-rose-50 ring-rose-200/80 dark:bg-rose-500/15 dark:ring-rose-400/20',
    icon: 'text-rose-600 dark:text-rose-300',
    dot: 'bg-rose-300 dark:bg-rose-400/60',
    btn: 'bg-rose-600 hover:bg-rose-500 text-white focus-visible:ring-rose-500',
    frame: 'border-slate-200 dark:border-slate-800',
  },
  violet: {
    halo: 'bg-violet-100/70 dark:bg-violet-500/10',
    disc: 'bg-violet-50 ring-violet-200/80 dark:bg-violet-500/15 dark:ring-violet-400/20',
    icon: 'text-violet-600 dark:text-violet-300',
    dot: 'bg-violet-300 dark:bg-violet-400/60',
    btn: 'bg-violet-600 hover:bg-violet-500 text-white focus-visible:ring-violet-500',
    frame: 'border-slate-200 dark:border-slate-800',
  },
  slate: {
    halo: 'bg-slate-100 dark:bg-slate-800/60',
    disc: 'bg-white ring-slate-200 dark:bg-slate-800 dark:ring-slate-700',
    icon: 'text-slate-500 dark:text-slate-300',
    dot: 'bg-slate-300 dark:bg-slate-600',
    btn: 'bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:hover:bg-slate-100 dark:text-slate-900 focus-visible:ring-slate-500',
    frame: 'border-slate-200 dark:border-slate-800',
  },
};

// Estado vazio calmo: ícone num círculo suave, título curto, uma linha de ajuda e um botão claro
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  text,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  actionId,
  secondaryLabel,
  onSecondary,
  secondaryIcon: SecondaryIcon,
  tone = 'sky',
  size = 'md',
  framed = true,
  id,
  className = '',
  children,
}) => {
  const t = TONES[tone];
  const reduce = useReducedMotion();
  const sm = size === 'sm';

  return (
    <div
      id={id}
      className={`text-center ${sm ? 'px-4 py-6' : 'px-5 py-8 sm:py-10'} ${
        framed ? `rounded-3xl border bg-white dark:bg-slate-900 ${t.frame}` : ''
      } ${className}`}
    >
      {/* Ícone: halo + disco + dois pontinhos (só formas simples) */}
      <motion.div
        aria-hidden="true"
        initial={reduce ? false : { opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
        className={`relative mx-auto ${sm ? 'h-14 w-14' : 'h-20 w-20'}`}
      >
        <span className={`absolute inset-0 rounded-full ${t.halo}`} />
        <span className={`absolute rounded-full ring-1 flex items-center justify-center ${t.disc} ${sm ? 'inset-2' : 'inset-3'}`}>
          <Icon className={`${t.icon} ${sm ? 'h-5 w-5' : 'h-6 w-6'}`} strokeWidth={2} />
        </span>
        <span className={`absolute rounded-full ${t.dot} ${sm ? 'h-1.5 w-1.5 right-0.5 top-1.5' : 'h-2 w-2 right-1 top-2'}`} />
        <span className={`absolute rounded-full opacity-60 ${t.dot} ${sm ? 'h-1 w-1 left-1 bottom-2' : 'h-1.5 w-1.5 left-1.5 bottom-3'}`} />
      </motion.div>

      <h3 className={`${sm ? 'mt-3 text-sm' : 'mt-4 text-base'} font-black text-slate-900 dark:text-white`}>{title}</h3>
      {text && <p className={`mt-1 mx-auto max-w-sm text-slate-500 dark:text-slate-400 ${sm ? 'text-xs' : 'text-sm'}`}>{text}</p>}

      {children && <div className="mt-4">{children}</div>}

      {((actionLabel && onAction) || (secondaryLabel && onSecondary)) && (
        <div className={`${sm ? 'mt-3' : 'mt-5'} flex flex-wrap items-center justify-center gap-2`}>
          {actionLabel && onAction && (
            <button
              id={actionId}
              type="button"
              onClick={onAction}
              className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl text-xs font-black transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900 ${t.btn}`}
            >
              {ActionIcon && <ActionIcon className="h-4 w-4" />}
              {actionLabel}
            </button>
          )}
          {secondaryLabel && onSecondary && (
            <button
              type="button"
              onClick={onSecondary}
              className="inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {SecondaryIcon && <SecondaryIcon className="h-4 w-4" />}
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
