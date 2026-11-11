// Revisões (bloco pequeno): quantas vencem hoje, atrasadas, o ponto fraco e, em "Ver detalhes", a fila.
import React, { useMemo } from 'react';
import { AlertTriangle, Repeat } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { addDaysYMD, overdueDays, ymd } from '../../data/blockReview';
import { dueReviewQueue, reviewableBlocks } from '../../data/studyMethod';
import { buildDashboard } from '../../data/dashboardMetrics';
import { CountUp } from '../shared/CountUp';
import { BigNumber, Details, LinkButton, StatBody, StatLabel, StatNote, WidgetCard } from './ui';
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
  const weakName = weak ? weak.subject.universitySubject || weak.subject.name : '';

  return (
    <WidgetCard
      id="dash-reviews"
      title="Revisões"
      icon={Repeat}
      color="#8b5cf6"
      action={
        <LinkButton id="dash-reviews-open" compact onClick={() => setCurrentTab('spaced_repetition')}>
          Abrir
        </LinkButton>
      }
    >
      <StatBody>
        <BigNumber>
          <CountUp value={queue.length} />
        </BigNumber>
        <StatLabel>{queue.length === 1 ? 'revisão para hoje' : 'revisões para hoje'}</StatLabel>
        <StatNote className="mt-0.5">
          {late > 0 ? (
            <span className="font-bold text-rose-600 dark:text-rose-400">{plural(late, 'atrasada', 'atrasadas')}</span>
          ) : queue.length === 0 ? (
            next7 > 0 ? `Tudo em dia. ${next7} nos próximos 7 dias.` : 'Tudo em dia por aqui.'
          ) : (
            'Nenhuma atrasada'
          )}
        </StatNote>
        {weak && (
          <StatNote id="dash-weak-point" className="mt-1 flex items-center gap-1" title={`Ponto fraco: ${weakName} com ${weak.pct}% de acerto`}>
            <AlertTriangle className="h-3 w-3 shrink-0 text-amber-500" />
            <span className="truncate">
              Ponto fraco: <strong className="text-slate-700 dark:text-slate-200">{weakName}</strong>{' '}
              <strong className="text-rose-600 dark:text-rose-400">{weak.pct}%</strong>
            </span>
          </StatNote>
        )}
      </StatBody>

      {(queue.length > 0 || weak) && (
        <Details id="dash-reviews-details">
          {queue.length > 0 && (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {queue.slice(0, 3).map((b) => {
                const s = subName(b.subjectId);
                const od = overdueDays(b, today);
                return (
                  <li key={b.id} className="flex items-center gap-2 min-w-0 text-xs min-h-[40px] py-1">
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
            </ul>
          )}
          {queue.length > 3 && <p className="text-[11px] text-slate-400 dark:text-slate-500">+ {queue.length - 3} na fila</p>}
          {queue.length > 0 && next7 > 0 && <p className="text-[11px] text-slate-400 dark:text-slate-500">Próximos 7 dias: {next7}</p>}
          {weak && (
            <p className="text-[11px] text-slate-600 dark:text-slate-300">
              Ponto fraco: <strong>{weakName}</strong> com <strong className="text-rose-600 dark:text-rose-400">{weak.pct}%</strong> de acerto.
              {weak.block ? <> Vale revisar <strong>{weak.block.name}</strong>.</> : ' Vale reforçar.'}
            </p>
          )}
        </Details>
      )}
    </WidgetCard>
  );
};
