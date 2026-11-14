// Constância da semana (bloco pequeno): em quantos dias você estudou e quantos blocos de foco (no tamanho do bloco do aluno) fez.
// Mais simples que horas por dia: o que importa é aparecer todo dia.
import React, { useMemo } from 'react';
import { CalendarCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { addDaysYMD, ymd } from '../../data/blockReview';
import { CountUp } from '../shared/CountUp';
import { BigNumber, StatBody, StatLabel, StatNote, Trend, Unit, WidgetCard } from './ui';
import { plural } from './dashboardData';

const LETTERS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];

export const StudyTimeWidget: React.FC = () => {
  const { studySessions, questionLogs, studyPrefs } = useApp();
  const blockMin = Math.max(5, studyPrefs.focusMinutes || 30);
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
      return { date: k, blocks: Math.round(m / blockMin), active: m > 0 || withQuestions.has(k), future: k > today };
    };
    const days = Array.from({ length: 7 }, (_, i) => dayInfo(addDaysYMD(i, monday)));
    const lastWeek = Array.from({ length: 7 }, (_, i) => dayInfo(addDaysYMD(i - 7, monday)));
    return {
      days,
      studied: days.filter((d) => d.active).length,
      blocks: days.reduce((a, d) => a + d.blocks, 0),
      lastWeekDays: lastWeek.filter((d) => d.active).length,
    };
  }, [studySessions, questionLogs, today, blockMin]);

  const delta = studied - lastWeekDays;

  return (
    <WidgetCard id="dash-study-time" title="Constância da semana" icon={CalendarCheck} color="#10b981">
      <StatBody>
        <BigNumber>
          <CountUp value={studied} />
          <Unit>/7</Unit>
        </BigNumber>
        <StatLabel>dias com estudo · {plural(blocks, 'bloco de foco', 'blocos de foco')}</StatLabel>
        <StatNote className="mt-0.5">
          {delta !== 0 ? (
            <>
              <Trend delta={delta} suffix={Math.abs(delta) === 1 ? 'dia' : 'dias'} /> vs semana passada
            </>
          ) : (
            `Semana passada: ${plural(lastWeekDays, 'dia', 'dias')}`
          )}
        </StatNote>
      </StatBody>
      {/* Mini semana: um traço por dia */}
      <div className="grid grid-cols-7 gap-1" aria-hidden>
        {days.map((d, i) => (
          <div key={d.date} className="flex flex-col items-center gap-1" title={d.future ? '' : d.active ? `${d.blocks} bloco${d.blocks === 1 ? '' : 's'} de ${blockMin} min` : 'sem estudo'}>
            <span
              className={`h-1.5 w-full rounded-full ${
                d.future ? 'bg-slate-100 dark:bg-slate-800/60' : d.active ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'
              }`}
            />
            <span className={`text-[10px] font-bold ${d.date === today ? 'text-sky-700 dark:text-sky-300' : 'text-slate-400 dark:text-slate-500'}`}>{LETTERS[i]}</span>
          </div>
        ))}
      </div>
      <p className="sr-only">
        {days
          .filter((d) => !d.future)
          .map((d, i) => `${LETTERS[i]}: ${d.active ? `estudou, ${d.blocks} blocos` : 'sem estudo'}`)
          .join('. ')}
      </p>
    </WidgetCard>
  );
};
