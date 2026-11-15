// Horas livres por dia da semana (opcional) + dica da meta semanal + questionário de horário.
// Usado na "Minha rotina" (StudyRoutineModal) e no passo Rotina do cadastro (variant="signup", visual escuro).
// Nada é aplicado sozinho: a dica só muda as horas se o aluno tocar em "Aplicar sugestão".
import React, { useState } from 'react';
import { Lightbulb, Minus, Plus, X } from 'lucide-react';
import {
  HOURS_MAX_MIN,
  HOURS_STEP_MIN,
  WEEKDAY_SHORT,
  formatFreeHours,
  freeMinutesToUnits,
  turnTip,
  unitsToFreeMinutes,
  weeklyHoursTip,
} from '../../data/studyMethod';
import type { StudyPlanPrefs } from '../../types';
import { blocksToHours } from './planShared';

type Variant = 'app' | 'signup';
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

const css = (variant: Variant) =>
  variant === 'signup'
    ? {
        box: 'rounded-2xl border border-slate-800 bg-slate-950/60',
        row: 'border-slate-800',
        text: 'text-slate-200',
        muted: 'text-slate-500',
        btn: 'border-slate-700 bg-slate-900 text-slate-200 hover:border-sky-500',
        link: 'text-sky-400',
        tip: 'border-sky-500/30 bg-sky-500/10 text-slate-200',
        apply: 'bg-sky-600 hover:bg-sky-500 text-white',
        input: 'border-slate-700 bg-slate-900 text-slate-100 [color-scheme:dark]',
      }
    : {
        box: 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50',
        row: 'border-slate-200 dark:border-slate-800',
        text: 'text-slate-900 dark:text-white',
        muted: 'text-slate-500 dark:text-slate-400',
        btn: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-sky-400',
        link: 'text-sky-700 dark:text-sky-400',
        tip: 'border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-slate-700 dark:text-slate-200',
        apply: 'bg-sky-600 hover:bg-sky-500 text-white',
        input: 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-white dark:[color-scheme:dark]',
      };

interface WeekHoursProps {
  idPrefix: string;
  /** Minutos livres por dia (0 = domingo). undefined = não preenchido */
  value?: number[];
  onChange: (v: number[] | undefined) => void;
  /** Dias de descanso (ficam em 0) */
  restDays: number[];
  /** Meta semanal em horas (perfil) */
  targetHours?: number;
  /** Tempo de foco por dia atual (unidades de 25 min), para começar o preenchimento */
  defaultUnits: number;
  variant?: Variant;
}

export const WeekHoursEditor: React.FC<WeekHoursProps> = ({ idPrefix, value, onChange, restDays, targetHours, defaultUnits, variant = 'app' }) => {
  const c = css(variant as Variant);
  const [lastDay, setLastDay] = useState<number | null>(null);
  const isRest = (d: number) => restDays.includes(d);

  if (!value) {
    return (
      <div className={`${c.box} border-dashed p-3`}>
        <p className={`text-[12px] ${c.muted}`}>Opcional. Diga quantas horas livres você tem em cada dia. O Planner usa isso como o tempo do dia.</p>
        <button
          type="button"
          id={`${idPrefix}-fill`}
          onClick={() => {
            const base = unitsToFreeMinutes(defaultUnits);
            onChange(Array.from({ length: 7 }, (_, d) => (isRest(d) ? 0 : base)));
          }}
          className={`mt-2 min-h-[40px] px-3 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 ${c.btn}`}
        >
          <Plus className="h-3.5 w-3.5" /> Preencher minhas horas
        </button>
      </div>
    );
  }

  const hours = value.map((x, d) => (isRest(d) ? 0 : x));
  const setDay = (d: number, min: number) => {
    const next = [...hours];
    next[d] = Math.min(HOURS_MAX_MIN, Math.max(0, min));
    setLastDay(d);
    onChange(next);
  };
  const refDay = lastDay !== null && !isRest(lastDay) ? lastDay : WEEK_ORDER.find((d) => !isRest(d)) ?? 1;
  const sameEveryDay = () => onChange(hours.map((_, d) => (isRest(d) ? 0 : hours[refDay])));
  const allSame = WEEK_ORDER.filter((d) => !isRest(d)).every((d) => hours[d] === hours[refDay]);
  const tip = weeklyHoursTip(hours, targetHours, restDays);

  return (
    <div className="space-y-2">
      <ul id={`${idPrefix}-list`} className={`${c.box} divide-y ${variant === 'signup' ? 'divide-slate-800' : 'divide-slate-200 dark:divide-slate-800'} overflow-hidden`}>
        {WEEK_ORDER.map((d) => {
          const rest = isRest(d);
          const v = hours[d];
          return (
            <li key={d} className="flex items-center gap-2 px-2.5 py-1.5">
              <span className={`w-10 shrink-0 text-[12px] font-black ${c.text}`}>{WEEKDAY_SHORT[d]}</span>
              {rest ? (
                <span className={`flex-1 text-center text-[12px] font-bold ${c.muted}`}>Descanso · 0h</span>
              ) : (
                <>
                  <button
                    type="button"
                    id={`${idPrefix}-minus-${d}`}
                    aria-label={`Menos 30 minutos na ${WEEKDAY_SHORT[d]}`}
                    disabled={v <= 0}
                    onClick={() => setDay(d, v - HOURS_STEP_MIN)}
                    className={`h-9 w-9 shrink-0 rounded-lg border flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${c.btn}`}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="flex-1 min-w-0 text-center leading-tight">
                    <span id={`${idPrefix}-value-${d}`} className={`block text-sm font-black ${c.text}`}>{formatFreeHours(v)}</span>
                    <span className={`block text-[10px] ${c.muted}`}>{v > 0 ? `≈ ${blocksToHours(freeMinutesToUnits(v))} de foco` : 'só revisões curtas'}</span>
                  </span>
                  <button
                    type="button"
                    id={`${idPrefix}-plus-${d}`}
                    aria-label={`Mais 30 minutos na ${WEEKDAY_SHORT[d]}`}
                    disabled={v >= HOURS_MAX_MIN}
                    onClick={() => setDay(d, v + HOURS_STEP_MIN)}
                    className={`h-9 w-9 shrink-0 rounded-lg border flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed ${c.btn}`}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          id={`${idPrefix}-same`}
          disabled={allSame}
          onClick={sameEveryDay}
          className={`min-h-[40px] px-3 rounded-xl border text-xs font-bold disabled:opacity-40 disabled:cursor-not-allowed ${c.btn}`}
        >
          Igual todo dia ({formatFreeHours(hours[refDay])})
        </button>
        <button type="button" id={`${idPrefix}-clear`} onClick={() => onChange(undefined)} className={`min-h-[40px] px-2 text-xs font-bold hover:underline ${c.link}`}>
          Não usar horas por dia
        </button>
      </div>
      <div id={`${idPrefix}-tip`} className={`rounded-xl border px-3 py-2.5 ${c.tip}`}>
        <p className="text-[12px] leading-relaxed flex gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
          <span>{tip.text}</span>
        </p>
        {tip.suggestion && (
          <button type="button" id={`${idPrefix}-apply`} onClick={() => onChange(tip.suggestion!)} className={`mt-2 min-h-[36px] px-3 rounded-lg text-xs font-black ${c.apply}`}>
            Aplicar sugestão
          </button>
        )}
      </div>
    </div>
  );
};

type Times = Pick<StudyPlanPrefs, 'wakeTime' | 'sleepTime' | 'lunchTime' | 'dinnerTime'>;
const TIME_FIELDS: Array<{ key: keyof Times; label: string }> = [
  { key: 'wakeTime', label: 'Acordo às' },
  { key: 'sleepTime', label: 'Durmo às' },
  { key: 'lunchTime', label: 'Almoço' },
  { key: 'dinnerTime', label: 'Jantar' },
];

interface TimesProps {
  idPrefix: string;
  value: Times;
  onChange: (key: keyof Times, v: string | undefined) => void;
  bestTurn?: StudyPlanPrefs['bestTurn'];
  variant?: Variant;
}

/** Questionário de horário (opcional): acordar, dormir, almoço e jantar. Mostra a dica de turno */
export const DayTimesEditor: React.FC<TimesProps> = ({ idPrefix, value, onChange, bestTurn, variant = 'app' }) => {
  const c = css(variant as Variant);
  const tip = turnTip({ ...value, bestTurn });
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {TIME_FIELDS.map((f) => (
          <label key={f.key} className="block min-w-0">
            <span className={`block text-[11px] font-bold mb-1 ${c.muted}`}>{f.label}</span>
            <span className="flex items-center gap-1">
              <input
                type="time"
                id={`${idPrefix}-${f.key}`}
                value={value[f.key] || ''}
                onChange={(e) => onChange(f.key, e.target.value || undefined)}
                className={`min-w-0 w-full min-h-[44px] rounded-xl border px-2.5 text-sm font-bold ${c.input}`}
              />
              {value[f.key] && (
                <button
                  type="button"
                  aria-label={`Limpar ${f.label.toLowerCase()}`}
                  onClick={() => onChange(f.key, undefined)}
                  className={`h-9 w-9 shrink-0 rounded-lg flex items-center justify-center ${c.muted} hover:text-rose-500`}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </span>
          </label>
        ))}
      </div>
      <p className={`text-[11px] ${c.muted}`}>Pode deixar em branco. O plano não sugere estudo na hora das refeições nem depois da hora de dormir.</p>
      {tip && (
        <p id={`${idPrefix}-tip`} className={`rounded-xl border px-3 py-2 text-[12px] flex gap-1.5 ${c.tip}`}>
          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
          <span>{tip}</span>
        </p>
      )}
    </div>
  );
};
