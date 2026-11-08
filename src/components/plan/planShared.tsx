// Peças compartilhadas do Plano do dia / Planner (grupo B): tamanho das tarefas, "Começar",
// armazenamento local seguro e a moldura das janelas (modais) do plano.
import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { formatTaskSize, type PlanTask, type DayKind } from '../../data/studyMethod';
import type { FocusTask } from '../../context/AppContext';

/** "2 × 25 min", "1 × 60 min" ou "10 min" (no bloco que o aluno escolheu) */
export const taskSizeLabel = (t: Pick<PlanTask, 'pomodoros' | 'focus' | 'kind'>) => {
  if (!t.pomodoros) return t.kind === 'weekly_planning' ? 'leve' : '10 min';
  return formatTaskSize(t.pomodoros, t.focus);
};

/** Minutos do 1º foco ao apertar "Começar" */
export const taskStartMinutes = (t: Pick<PlanTask, 'pomodoros' | 'focus' | 'kind'>) => {
  if (t.kind === 'weekly_planning') return 20;
  if (!t.pomodoros) return 10;
  return t.focus;
};

/**
 * "Começar" uma tarefa do plano: mesmo tempo, passos e ligações em todas as telas
 * (Plano do dia, Revisões, fim da sessão guiada). `free` = cronômetro livre com alarme.
 */
export const startPlanTask = (
  t: PlanTask,
  ctx: { startTask: (task: FocusTask & { minutes?: number; free?: boolean }) => void },
  opts?: { free?: boolean }
) =>
  ctx.startTask({
    title: t.title,
    kind: t.kind,
    subjectId: t.subjectId,
    blockId: t.blockId,
    projectId: t.projectId,
    itemId: t.itemId,
    topicId: t.topicIds?.[0],
    steps: t.steps,
    minutes: taskStartMinutes(t),
    breakMinutes: t.pomodoros ? t.breakMin : undefined,
    free: opts?.free,
  });

/** Tarefas que se marcam sozinhas quando o aluno registra a revisão / fecha o tema */
export const AUTO_KINDS: PlanTask['kind'][] = ['review', 'project_review', 'new_block', 'new_topics'];

/** Tarefas que contam como "reais" (o resto é rotina fixa do dia) */
export const isRealTask = (t: PlanTask) => t.kind !== 'blank_page' && t.kind !== 'flashcards' && t.kind !== 'summary';

/** Rótulo curto e neutro do tipo do dia (selo da Semana, Planejar semana) */
export const DAY_KIND_INFO: Record<DayKind, { label: string; emoji: string; cls: string }> = {
  normal: { label: 'Dia normal', emoji: '📚', cls: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
  mixed: { label: 'Misturadas', emoji: '🔀', cls: 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-500/10 dark:text-pink-300 dark:border-pink-500/30' },
  rest: { label: 'Descanso', emoji: '😌', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30' },
  low_energy: { label: 'Dia difícil', emoji: '🌧️', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-300 dark:border-indigo-500/30' },
  plantao: { label: 'Plantão', emoji: '🏥', cls: 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30' },
  pos_plantao: { label: 'Pós-plantão', emoji: '😴', cls: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30' },
  prova: { label: 'Prova hoje', emoji: '📝', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30' },
  pos_prova: { label: 'Pós-prova', emoji: '🛋️', cls: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-500/10 dark:text-teal-300 dark:border-teal-500/30' },
};

/** Blocos de 25 min → "1h40" (tempo de foco) */
export const blocksToHours = (blocks: number) => {
  const min = blocks * 25;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

// ---------- localStorage com try/catch (modo privado / bloqueado) ----------
export const readLocal = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
export const writeLocal = (key: string, value: string | null) => {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* sem armazenamento: segue sem lembrar */
  }
};
/** Chave local por usuário (e-mail do perfil) */
export const userLocalKey = (name: string, email?: string) => `medacademic_${name}_${(email || 'default').trim().toLowerCase()}`;

// ---------- Moldura das janelas do plano ----------
interface PlanModalProps {
  id?: string;
  open: boolean;
  onClose: () => void;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  /** Janela por cima de outra janela */
  stacked?: boolean;
}

export const PlanModal: React.FC<PlanModalProps> = ({ id, open, onClose, title, subtitle, icon, children, footer, maxWidth = 'max-w-lg', stacked }) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      // Com uma janela por cima, o Esc fecha só a de cima
      if (e.key === 'Escape' && (stacked || !document.querySelector('[data-plan-stacked="true"]'))) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, stacked]);

  if (!open) return null;
  return (
    <div
      data-plan-stacked={stacked ? 'true' : undefined}
      className={`app-modal fixed inset-0 ${stacked ? 'z-[70]' : 'z-[60]'} flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs`}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id={id}
        role="dialog"
        aria-modal="true"
        className={`app-modal-panel relative w-full ${maxWidth} overflow-x-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl text-slate-800 dark:text-slate-100`}
      >
        <div className="flex items-start justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-start gap-3 min-w-0">
            {icon && <div className="shrink-0 h-11 w-11 rounded-2xl flex items-center justify-center bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 text-xl">{icon}</div>}
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white leading-snug">{title}</h2>
              {subtitle && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="shrink-0 h-10 w-10 -mr-1 -mt-1 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="pt-4">{children}</div>
        {footer && <div className="app-modal-footer mt-5 pt-3 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
};

/** Botão de opção (chips grandes das janelas de rotina) */
export const OptionChip: React.FC<{
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  id?: string;
  className?: string;
  disabled?: boolean;
  title?: string;
}> = ({ active, onClick, children, id, className = '', disabled, title }) => (
  <button
    type="button"
    id={id}
    title={title}
    disabled={disabled}
    onClick={onClick}
    aria-pressed={active}
    className={`min-h-[40px] px-3 rounded-xl border text-xs font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
      active
        ? 'bg-sky-600 border-sky-600 text-white shadow-xs'
        : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-600'
    } ${className}`}
  >
    {children}
  </button>
);
