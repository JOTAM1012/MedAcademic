// Revisões: o que vence hoje (com as atrasadas), o que vem nos próximos 7 dias e o ponto fraco.
import React, { useMemo } from 'react';
import { AlertTriangle, Repeat } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { addDaysYMD, overdueDays, ymd } from '../../data/blockReview';
import { dueReviewQueue, reviewableBlocks } from '../../data/studyMethod';
import { buildDashboard } from '../../data/dashboardMetrics';
import { EmptyNote, LinkButton, WidgetCard } from './ui';
import { plural } from './dashboardData';

export const ReviewsWidget: React.FC = () => {
  const { subjects, topicBlocks, exams, questionLogs, studySessions, currentSemester, userProfile, setCurrentTab } = useApp();
  const today = ymd(new Date());
  const goal = userProfile.goalReviewPct ?? 70;

  const { queue, late, next7, weak } = useMemo(() => {
    const queue = dueReviewQueue(topicBlocks, subjects, today, exams);
    const late = queue.filter((b) => overdueDays(b, today) > 0).length;
    const limit = addDaysYMD(7, today);
    const next7 = reviewableBlocks(topicBlocks, subjects).filter(
      (b) => b.reviewStatus === 'revisao' && !!b.nextReviewDate && b.nextReviewDate > today && b.nextReviewDate <= limit
    ).length;
    const weak = buildDashboard({ subjects, topicBlocks, questionLogs, exams, studySessions, currentSemester: currentSemester || undefined }, '30d', 'all', {
      exam: userProfile.goalExamPct ?? 70,
      review: goal,
    }).weakPoint;
    return { queue, late, next7, weak };
  }, [topicBlocks, subjects, today, exams, questionLogs, studySessions, currentSemester, goal, userProfile.goalExamPct]);

  const subName = (id: string) => {
    const s = subjects.find((x) => x.id === id);
    return { name: s?.universitySubject || s?.name || '', color: s?.color || '#94a3b8' };
  };

  return (
    <WidgetCard
      id="dash-reviews"
      title="Revisões"
      icon={Repeat}
      color="#8b5cf6"
      action={<LinkButton id="dash-reviews-open" onClick={() => setCurrentTab('spaced_repetition')}>Abrir</LinkButton>}
    >
      <div className="flex items-end gap-3">
        <p className="text-3xl font-black leading-none text-slate-900 dark:text-white">{queue.length}</p>
        <div className="pb-0.5 min-w-0">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">{queue.length === 1 ? 'revisão para hoje' : 'revisões para hoje'}</p>
          {late > 0 && (
            <span className="inline-flex mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-300">
              {plural(late, 'atrasada', 'atrasadas')}
            </span>
          )}
        </div>
      </div>

      {queue.length === 0 ? (
        <EmptyNote>{next7 > 0 ? `Tudo em dia. ${plural(next7, 'revisão chega', 'revisões chegam')} nos próximos 7 dias.` : 'Tudo em dia por aqui.'}</EmptyNote>
      ) : (
        <ul className="space-y-1">
          {queue.slice(0, 3).map((b) => {
            const s = subName(b.subjectId);
            const od = overdueDays(b, today);
            return (
              <li key={b.id} className="flex items-center gap-2 min-w-0 text-xs min-h-[32px]">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-slate-700 dark:text-slate-200">{b.name}</span>
                  <span className="block truncate text-[10px] text-slate-500 dark:text-slate-400">{s.name}</span>
                </span>
                <span className={`shrink-0 text-[10px] font-bold ${od > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>
                  {od > 0 ? `${od} d de atraso` : 'hoje'}
                </span>
              </li>
            );
          })}
          {queue.length > 3 && <li className="text-[11px] text-slate-400 dark:text-slate-500">+ {queue.length - 3} na fila</li>}
          {next7 > 0 && <li className="text-[11px] text-slate-400 dark:text-slate-500">Próximos 7 dias: {next7}</li>}
        </ul>
      )}

      {weak && (
        <div id="dash-weak-point" className="mt-auto rounded-2xl bg-amber-50 dark:bg-amber-500/[0.07] border border-amber-200/70 dark:border-amber-500/20 px-3 py-2 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-amber-500" />
          <p className="text-[11px] text-slate-700 dark:text-slate-200 min-w-0">
            Ponto fraco: <strong>{weak.subject.universitySubject || weak.subject.name}</strong> com <strong className="text-rose-600 dark:text-rose-400">{weak.pct}%</strong> de acerto.
            {weak.block ? <> Vale revisar <strong>{weak.block.name}</strong>.</> : ' Vale reforçar.'}
          </p>
        </div>
      )}
    </WidgetCard>
  );
};
