// Resumo da semana (bloco largo do Painel): horas de foco, questões, revisões, temas novos e dias estudados (segunda até hoje).
// No domingo vira o "Fechamento" da semana.
import React, { useMemo } from 'react';
import { CalendarRange, Lightbulb } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { overdueDays, ymd } from '../../data/blockReview';
import { dueReviewQueue } from '../../data/studyMethod';
import { buildWeekSummary, fmtFocus, fmtFocusDelta } from '../../data/weekSummary';
import { CountUp } from '../shared/CountUp';
import { WidgetCard } from './ui';
import { fmtPct, goalTone } from './dashboardData';

// Números lado a lado, separados por linhas finas (sem caixinhas)
const Stat: React.FC<{ id: string; label: string; value: React.ReactNode; sub?: React.ReactNode }> = ({ id, label, value, sub }) => (
  <div id={id} className="min-w-0 py-2.5 md:py-0 md:px-4 md:first:pl-0 md:border-l md:first:border-l-0 border-slate-100 dark:border-slate-800">
    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">{label}</p>
    <p className="mt-1 text-2xl md:text-[1.75rem] font-black leading-none tracking-tight tabular-nums text-slate-900 dark:text-white">{value}</p>
    {sub && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">{sub}</p>}
  </div>
);

export const WeekSummaryCard: React.FC = () => {
  const { studySessions, questionLogs, topicBlocks, subjects, exams, userProfile } = useApp();
  const today = ymd(new Date());
  const goal = userProfile.goalReviewPct ?? 70;

  const w = useMemo(() => {
    const overdue = dueReviewQueue(topicBlocks, subjects, today, exams).filter((b) => overdueDays(b, today) > 0).length;
    return buildWeekSummary({ studySessions, questionLogs, topicBlocks, overdue, today });
  }, [studySessions, questionLogs, topicBlocks, subjects, exams, today]);

  const delta = w.minutes - w.lastWeekMinutes;

  return (
    <WidgetCard
      id="week-summary-card"
      title={w.isSunday ? 'Resumo da semana' : 'Sua semana até aqui'}
      icon={CalendarRange}
      color="#0ea5e9"
      action={
        w.isSunday ? (
          <span className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300">
            Fechamento
          </span>
        ) : undefined
      }
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 md:gap-x-0">
        <Stat
          id="week-summary-focus"
          label="Horas de foco"
          value={<CountUp value={w.minutes} format={fmtFocus} />}
          sub={
            w.minutes === 0 && w.lastWeekMinutes === 0 ? undefined : (
              <span className={delta > 0 ? 'font-bold text-emerald-600 dark:text-emerald-400' : delta < 0 ? 'font-bold text-rose-600 dark:text-rose-400' : ''}>
                {fmtFocusDelta(w.minutes, w.lastWeekMinutes)}
              </span>
            )
          }
        />
        <Stat
          id="week-summary-questions"
          label="Questões"
          value={<CountUp value={w.questions} />}
          sub={w.accuracy !== undefined ? <span className={`font-bold ${goalTone(w.accuracy, goal)}`}>{fmtPct(w.accuracy)} de acertos</span> : 'Nenhuma ainda'}
        />
        <Stat
          id="week-summary-reviews"
          label="Revisões feitas"
          value={<CountUp value={w.reviewsDone} />}
          sub={
            w.overdue > 0 ? (
              <span className="font-bold text-rose-600 dark:text-rose-400">{w.overdue === 1 ? '1 atrasada' : `${w.overdue} atrasadas`}</span>
            ) : (
              'Nenhuma atrasada'
            )
          }
        />
        <Stat id="week-summary-new" label="Temas novos" value={<CountUp value={w.newTopics} />} sub={w.newTopics === 1 ? 'fechado' : 'fechados'} />
      </div>

      <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center gap-3 md:gap-6">
        <div id="week-summary-days" className="shrink-0 md:w-56">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dias estudados</p>
            <p className="text-xs font-black text-slate-900 dark:text-white tabular-nums">
              {w.daysStudied} <span className="font-bold text-slate-400 dark:text-slate-500">de 7</span>
            </p>
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-1">
            {w.days.map((d) => (
              <div key={d.date} className="flex flex-col items-center gap-1">
                <span
                  aria-hidden
                  className={`h-3 w-3 rounded-full ${
                    d.studied ? 'bg-emerald-500' : d.future ? 'border border-dashed border-slate-300 dark:border-slate-700' : 'bg-slate-200 dark:bg-slate-700'
                  } ${d.today ? 'ring-2 ring-sky-500/60 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : ''}`}
                />
                <span className={`text-[10px] font-bold ${d.today ? 'text-sky-700 dark:text-sky-300' : 'text-slate-400 dark:text-slate-500'}`}>{d.label}</span>
              </div>
            ))}
          </div>
          <p className="sr-only">
            {w.days
              .filter((d) => !d.future)
              .map((d) => `${d.label}: ${d.studied ? 'estudou' : 'não estudou'}`)
              .join('. ')}
          </p>
        </div>

        <div id="week-summary-feedback" className="min-w-0 flex-1 flex items-start gap-2">
          <Lightbulb className="h-4 w-4 shrink-0 mt-0.5 text-sky-500" />
          <p className="min-w-0 text-[11px] text-slate-700 dark:text-slate-200">{w.feedback}</p>
        </div>
      </div>
    </WidgetCard>
  );
};
