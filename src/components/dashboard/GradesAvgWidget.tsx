// Média em provas: média das notas lançadas (nota ÷ nota máxima) no período escolhido.
import React, { useMemo } from 'react';
import { Award } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { areaOfSubject, rangeFor, type PeriodFilter } from '../../data/dashboardMetrics';
import { formatDM } from '../../data/blockReview';
import { examDisplayTitle } from '../../data/planning';
import { EmptyNote, LinkButton, WidgetCard } from './ui';
import { fmtPct, goalTone, plural } from './dashboardData';

export const GradesAvgWidget: React.FC<{ period: PeriodFilter; periodLabel: string; area: string }> = ({ period, periodLabel, area }) => {
  const { exams, subjects, currentSemester, userProfile, setCurrentTab } = useApp();
  const goal = userProfile.goalExamPct ?? 70;

  const graded = useMemo(() => {
    const r = rangeFor(period, currentSemester || undefined);
    return exams
      .filter((e) => e.grade !== undefined && e.maxGrade > 0 && !!e.date && (!r.start || e.date >= r.start) && e.date <= r.end)
      .filter((e) => area === 'all' || (!!e.subjectId && areaOfSubject(subjects.find((s) => s.id === e.subjectId)).id === area))
      .map((e) => ({ e, pct: ((e.grade as number) / e.maxGrade) * 100 }))
      .sort((a, b) => b.e.date.localeCompare(a.e.date));
  }, [exams, subjects, currentSemester, period, area]);

  const avg = graded.length ? graded.reduce((a, x) => a + x.pct, 0) / graded.length : undefined;

  return (
    <WidgetCard
      id="dash-grades-avg"
      title="Média em provas"
      icon={Award}
      color="#6366f1"
      action={<LinkButton id="dash-grades-open" onClick={() => setCurrentTab('semester')}>Ver semestre</LinkButton>}
    >
      <div>
        <p className={`text-3xl font-black leading-none ${goalTone(avg, goal)}`}>{fmtPct(avg)}</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          {plural(graded.length, 'prova com nota', 'provas com nota')} · {periodLabel} · meta {goal}%
        </p>
      </div>
      {graded.length === 0 ? (
        <EmptyNote>Nenhuma nota lançada neste período.</EmptyNote>
      ) : (
        <ul className="space-y-1">
          {graded.slice(0, 3).map(({ e, pct }) => (
            <li key={e.id} className="flex items-center gap-2 min-w-0 text-xs">
              <span className="shrink-0 w-10 text-[10px] text-slate-500 dark:text-slate-400">{formatDM(e.date)}</span>
              <span className="min-w-0 flex-1 truncate font-bold text-slate-700 dark:text-slate-200">{examDisplayTitle(e)}</span>
              <span className={`shrink-0 font-black ${goalTone(pct, goal)}`}>{fmtPct(pct)}</span>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
};
