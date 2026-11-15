// Dia das misturadas: lista dos temas estudados na semana, o total de questões e o ajuste de
// questões por tema (5 a 10). O ajuste fica salvo no plano do dia (DayPlanState.mixedPerTheme).
import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MIXED_PER_THEME_MAX, MIXED_PER_THEME_MIN, clampPerTheme, type PlanTask } from '../../data/studyMethod';

interface Props {
  task: PlanTask;
  date: string;
  /** Sem borda (dentro do passo a passo de outro cartão) */
  bare?: boolean;
}

export const MixedThemesCard: React.FC<Props> = ({ task, date, bare }) => {
  const { setDayPlanState } = useApp();
  const themes = task.mixThemes || [];
  if (themes.length === 0) return null;
  const per = clampPerTheme(task.perTheme);
  const stepPer = (delta: 1 | -1) =>
    // Guarda sempre o número (mesmo o 5): assim a volta ao padrão também vale nos outros aparelhos
    setDayPlanState(date, (s) => ({ ...s, mixedPerTheme: clampPerTheme(clampPerTheme(s.mixedPerTheme) + delta) }));
  const btn =
    'h-10 w-10 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-sky-400 disabled:opacity-40 disabled:cursor-not-allowed';
  return (
    <div
      id={`mixed-themes-${date}`}
      onClick={(e) => e.stopPropagation()}
      className={bare ? 'space-y-2' : 'rounded-2xl border border-pink-200 dark:border-pink-500/30 bg-pink-50/60 dark:bg-pink-500/10 p-3 space-y-2'}
    >
      <p id={`mixed-themes-total-${date}`} className="text-[12px] font-black text-slate-900 dark:text-white">
        {themes.length} tema{themes.length > 1 ? 's' : ''} · {per * themes.length} questões
      </p>
      <ul className="flex flex-wrap gap-1.5">
        {themes.map((t) => (
          <li
            key={t.blockId}
            className="max-w-full inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200"
          >
            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} aria-hidden />
            <span className="truncate">{t.name}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <button type="button" id={`mixed-per-minus-${date}`} aria-label="Menos 1 questão por tema" disabled={per <= MIXED_PER_THEME_MIN} onClick={() => stepPer(-1)} className={btn}>
          <Minus className="h-4 w-4" />
        </button>
        <p className="flex-1 text-center text-[12px] text-slate-700 dark:text-slate-200">
          <span id={`mixed-per-value-${date}`} className="text-base font-black text-slate-900 dark:text-white">{per}</span> questões por tema
        </p>
        <button type="button" id={`mixed-per-plus-${date}`} aria-label="Mais 1 questão por tema" disabled={per >= MIXED_PER_THEME_MAX} onClick={() => stepPer(1)} className={btn}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">Temas que você estudou ou revisou desde domingo. De 5 a 10 questões de cada.</p>
    </div>
  );
};
