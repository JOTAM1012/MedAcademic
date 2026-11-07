// Checklist diário do guia (7 hábitos). Alguns o site marca sozinho quando percebe
// (revisões feitas, questões registradas, Pomodoro...); o aluno marca os outros à mão.
import React, { useState } from 'react';
import { Check, ChevronDown, ListChecks } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DAILY_HABITS } from '../../data/studyMethod';
import { todayYMD, useDailyHabits } from '../../hooks/useStudyPlan';

interface DailyHabitsCardProps {
  date?: string;
  /** Resumo em 1 linha com os 7 hábitos tocáveis (Painel) */
  compact?: boolean;
  /** Pode recolher (visão Hoje no celular) */
  collapsible?: boolean;
  defaultOpen?: boolean;
  className?: string;
}

export const DailyHabitsCard: React.FC<DailyHabitsCardProps> = ({ date, compact, collapsible, defaultOpen = true, className = '' }) => {
  const { toggleHabit, openPlannerToday, showNotification } = useApp();
  const d = date || todayYMD();
  const { auto, checked } = useDailyHabits(d);
  const [open, setOpen] = useState(defaultOpen);
  const count = DAILY_HABITS.filter((h) => checked.has(h.id)).length;
  const total = DAILY_HABITS.length;
  const pct = Math.round((count / total) * 100);
  const allDone = count === total;
  // O 3º parâmetro diz se o site marcou o hábito sozinho (para desmarcar de verdade)
  const toggle = (id: string) => toggleHabit(d, id, auto.has(id));

  if (compact) {
    return (
      <div id="habits-compact" className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 ${className}`}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-8 w-8 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ListChecks className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                Checklist do dia <span className="text-emerald-600 dark:text-emerald-400">{count}/{total}</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{allDone ? 'Dia completo. Agora é descansar e dormir bem.' : 'Os 7 hábitos do guia. Toque para marcar.'}</p>
            </div>
          </div>
          <button
            type="button"
            id="habits-open-planner"
            onClick={() => openPlannerToday()}
            className="shrink-0 min-h-[36px] px-3 rounded-xl text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
          >
            Ver no Planner →
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {DAILY_HABITS.map((h) => {
            const on = checked.has(h.id);
            return (
              <button
                key={h.id}
                type="button"
                id={`habit-dot-${h.id}`}
                onClick={() => {
                  toggle(h.id);
                  // Só emojis na fileira: o aviso diz qual hábito mudou
                  showNotification(on ? `Desmarcado: ${h.label}` : `✓ ${h.label}`, on ? 'info' : 'success');
                }}
                title={`${h.label}${auto.has(h.id) ? ' (o site marcou)' : ''}`}
                aria-label={h.label}
                aria-pressed={on}
                className={`relative min-h-[40px] aspect-square max-h-14 rounded-xl border flex items-center justify-center text-base transition-all ${
                  on
                    ? 'bg-emerald-50 dark:bg-emerald-500/15 border-emerald-300 dark:border-emerald-500/40'
                    : 'bg-slate-50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 grayscale opacity-70 hover:opacity-100'
                }`}
              >
                <span aria-hidden>{h.emoji}</span>
                {on && (
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow">
                    <Check className="h-2.5 w-2.5" strokeWidth={3} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div id="habits-card" className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs ${className}`}>
      <button
        type="button"
        onClick={() => collapsible && setOpen((o) => !o)}
        aria-expanded={open}
        className={`w-full flex items-center justify-between gap-3 p-4 text-left ${collapsible ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="h-9 w-9 shrink-0 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ListChecks className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-white">Checklist do dia</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Os 7 hábitos do guia científico</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            id="habits-count"
            className={`text-[11px] font-black px-2 py-0.5 rounded-full border ${
              allDone
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:border-emerald-500/30'
            }`}
          >
            {count}/{total}
          </span>
          {collapsible && <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />}
        </div>
      </button>

      <div className="px-4">
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${Math.max(pct, 3)}%` }} />
        </div>
      </div>

      {open && (
        <div className="p-4 pt-3">
          <ul className="space-y-1.5">
            {DAILY_HABITS.map((h) => {
              const on = checked.has(h.id);
              const byApp = on && auto.has(h.id);
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    id={`habit-${h.id}`}
                    onClick={() => toggle(h.id)}
                    aria-pressed={on}
                    className={`w-full min-h-[48px] flex items-center gap-3 rounded-2xl border px-3 py-2 text-left transition-colors ${
                      on
                        ? 'bg-emerald-50/70 dark:bg-emerald-500/[0.07] border-emerald-200 dark:border-emerald-500/25'
                        : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <span
                      className={`h-6 w-6 shrink-0 rounded-lg border-2 flex items-center justify-center transition-colors ${
                        on ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {on && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span className="text-base leading-none shrink-0" aria-hidden>
                      {h.emoji}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13px] font-bold leading-snug ${on ? 'text-slate-500 dark:text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{h.label}</span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">{h.hint}</span>
                    </span>
                    {byApp && (
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/10 dark:text-sky-300 dark:border-sky-500/30 whitespace-nowrap">
                        o site marcou
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
            Não é prova: é um espelho do dia. Recuperação ativa, revisões antes do novo e sono regular são o que mais pesa.
          </p>
        </div>
      )}
    </div>
  );
};
