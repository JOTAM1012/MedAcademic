// Peças pequenas usadas pela aba Revisões (cards, caderno de erros, sessão guiada).
import React from 'react';
import { Minus, Plus } from 'lucide-react';
import type { Subject, TopicDifficulty } from '../../types';
import { getMedicalArea, getSpecialty } from '../../data/areas';
import { daysBetween, formatDM, parseYMD } from '../../data/blockReview';
import { WEEKDAY_SHORT } from '../../data/studyMethod';

/** Cor da disciplina (especialidade > área > cor própria) */
export const subjectColor = (sub?: Subject) => {
  if (!sub) return '#0284c7';
  return getSpecialty(sub.specialty)?.color || (sub.majorArea ? getMedicalArea(sub.majorArea).color : sub.color) || sub.color || '#0284c7';
};

export const subjectLabel = (sub?: Subject) => (sub ? sub.universitySubject || sub.name : 'Sem disciplina');

/** "sex 07/11" */
export const weekdayDM = (date: string) => `${WEEKDAY_SHORT[parseYMD(date).getDay()].toLowerCase()} ${formatDM(date)}`;

/** "hoje", "amanhã", "em 3 dias" */
export const relativeDay = (today: string, date?: string) => {
  if (!date) return '';
  const d = daysBetween(today, date);
  if (d === 0) return 'hoje';
  if (d === 1) return 'amanhã';
  if (d === -1) return 'ontem';
  return d > 0 ? `em ${d} dias` : `há ${-d} dias`;
};

export const formatMinutes = (m: number) => {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h} h ${r} min` : `${h} h`;
};

export const DIFF_UI: Record<TopicDifficulty, { label: string; emoji: string; cls: string; ring: string; hint: string }> = {
  dificil: {
    label: 'Difícil',
    emoji: '🔴',
    cls: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900/50 hover:bg-rose-100 dark:hover:bg-rose-950/70',
    ring: 'ring-rose-500',
    hint: 'Esqueci muito',
  },
  medio: {
    label: 'Médio',
    emoji: '🟡',
    cls: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-950/70',
    ring: 'ring-amber-500',
    hint: 'Lembrei com esforço',
  },
  facil: {
    label: 'Fácil',
    emoji: '🟢',
    cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50 hover:bg-emerald-100 dark:hover:bg-emerald-950/70',
    ring: 'ring-emerald-500',
    hint: 'Lembrei quase tudo',
  },
};
export const DIFF_ORDER: TopicDifficulty[] = ['dificil', 'medio', 'facil'];

export const pctClass = (p: number) =>
  p >= 80 ? 'text-emerald-600 dark:text-emerald-400' : p >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';

/** Contador − n + (alvos de toque de 36–40 px) */
export const Counter: React.FC<{
  label: React.ReactNode;
  value: number;
  onChange: (n: number) => void;
  hint?: React.ReactNode;
  color?: string;
  id?: string;
}> = ({ label, value, onChange, hint, color, id }) => (
  <div id={id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/60 p-2.5 min-w-0">
    <div className="flex items-center justify-between gap-2">
      <span className={`text-[11px] font-bold leading-tight min-w-0 ${color ? 'ink' : 'text-slate-700 dark:text-slate-200'}`} style={color ? ({ '--ink': color } as React.CSSProperties) : undefined}>
        {label}
      </span>
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          disabled={value <= 0}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
          aria-label="Diminuir"
        >
          <Minus className="h-3.5 w-3.5" />
        </button>
        <span className="w-6 text-center text-sm font-black text-slate-900 dark:text-white tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Aumentar"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
    {hint && <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{hint}</p>}
  </div>
);

/** Lista numerada de passos com marcação visual (só local, não salva) */
export const StepList: React.FC<{ steps: string[]; color: string; done: Set<number>; onToggle: (i: number) => void; idPrefix?: string }> = ({
  steps,
  color,
  done,
  onToggle,
  idPrefix,
}) => (
  <ol className="space-y-1.5">
    {steps.map((s, i) => {
      const on = done.has(i);
      return (
        <li key={i}>
          <button
            type="button"
            id={idPrefix ? `${idPrefix}-${i}` : undefined}
            onClick={() => onToggle(i)}
            className="w-full flex items-start gap-2.5 text-left rounded-xl px-2 py-1.5 -mx-2 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors min-h-[40px]"
            aria-pressed={on}
          >
            <span
              className={`mt-0.5 h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[11px] font-black border transition-colors ${
                on ? 'text-white border-transparent' : 'bg-white dark:bg-slate-900 ink'
              }`}
              style={on ? { backgroundColor: color } : ({ borderColor: color + '66', '--ink': color } as React.CSSProperties)}
            >
              {on ? '✓' : i + 1}
            </span>
            <span className={`text-[13px] leading-snug pt-0.5 ${on ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{s}</span>
          </button>
        </li>
      );
    })}
  </ol>
);

/** Rótulo de formato de Pomodoro de um PlanTask (regra do contrato) */
export const taskDuration = (t: { pomodoros: number; focus: 25 | 50 }) =>
  t.pomodoros <= 0 ? '10 min' : t.focus === 50 ? `${Math.max(1, Math.round(t.pomodoros / 2))} × 50 min` : `${t.pomodoros} × 25 min`;
