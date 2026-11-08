// Constância da semana: em quais dias você estudou e quantos blocos de foco (≈ 25 min) fez.
// Mais simples que horas por dia: o que importa é aparecer todo dia.
import React, { useMemo } from 'react';
import { CalendarCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { addDaysYMD, ymd } from '../../data/blockReview';
import { WidgetCard } from './ui';
import { plural } from './dashboardData';

const LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export const StudyTimeWidget: React.FC = () => {
  const { studySessions, questionLogs } = useApp();
  const today = ymd(new Date());

  const { days, studied, blocks, lastWeekDays } = useMemo(() => {
    const minutes = new Map<string, number>();
    studySessions.forEach((s) => {
      const k = ymd(new Date(s.timestamp));
      minutes.set(k, (minutes.get(k) || 0) + (s.durationMinutes || 0));
    });
    const withQuestions = new Set(questionLogs.map((q) => q.date));
    const dow = (new Date().getDay() + 6) % 7; // segunda = 0
    const monday = addDaysYMD(-dow, today);
    const dayInfo = (k: string) => {
      const m = minutes.get(k) || 0;
      return { date: k, blocks: Math.round(m / 25), active: m > 0 || withQuestions.has(k), future: k > today };
    };
    const days = Array.from({ length: 7 }, (_, i) => dayInfo(addDaysYMD(i, monday)));
    const lastWeek = Array.from({ length: 7 }, (_, i) => dayInfo(addDaysYMD(i - 7, monday)));
    return {
      days,
      studied: days.filter((d) => d.active).length,
      blocks: days.reduce((a, d) => a + d.blocks, 0),
      lastWeekDays: lastWeek.filter((d) => d.active).length,
    };
  }, [studySessions, questionLogs, today]);

  return (
    <WidgetCard id="dash-study-time" title="Constância da semana" icon={CalendarCheck} color="#10b981">
      <div className="flex items-end gap-3">
        <p className="text-3xl font-black leading-none text-slate-900 dark:text-white">
          {studied}
          <span className="text-lg text-slate-400 dark:text-slate-500">/7</span>
        </p>
        <p className="pb-0.5 text-[11px] text-slate-500 dark:text-slate-400">dias com estudo · {plural(blocks, 'bloco de foco', 'blocos de foco')}</p>
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((d, i) => (
          <div key={d.date} className="flex flex-col items-center gap-1">
            <span
              title={d.future ? '' : d.active ? `${d.blocks} blocos de foco` : 'sem estudo'}
              className={`h-9 w-full max-w-[44px] rounded-xl flex items-center justify-center text-[11px] font-black ${
                d.future
                  ? 'border border-dashed border-slate-200 dark:border-slate-800'
                  : d.active
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-400 dark:text-slate-500'
              } ${d.date === today ? 'ring-2 ring-sky-500/60' : ''}`}
            >
              {d.active ? d.blocks || '✓' : ''}
            </span>
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{LETTERS[i]}</span>
          </div>
        ))}
      </div>
      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-auto">Semana passada: {plural(lastWeekDays, 'dia', 'dias')} com estudo.</p>
    </WidgetCard>
  );
};
