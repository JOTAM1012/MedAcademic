// Próximas provas (bloco largo): quantos dias faltam para a próxima e a lista com data, nome e % dos assuntos já estudados.
import React, { useMemo } from 'react';
import { GraduationCap, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { daysBetween, parseYMD, ymd } from '../../data/blockReview';
import { examProgress, upcomingExams } from '../../data/examTopics';
import { examDisplayTitle, getExamKind, getExamSubjectName } from '../../data/planning';
import { CountUp } from '../shared/CountUp';
import { Bar, BigNumber, EmptyNote, LinkButton, StatLabel, WidgetCard, softBtn } from './ui';

const WEEK = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export const UpcomingExamsWidget: React.FC = () => {
  const { exams, subjects, setCurrentTab } = useApp();
  const today = ymd(new Date());
  const list = useMemo(() => upcomingExams(exams, today, 60).slice(0, 4), [exams, today]);

  const leftLabel = (n: number) => (n === 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`);
  const leftTone = (n: number) => (n <= 3 ? 'text-rose-600 dark:text-rose-400' : n <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400');
  const first = list[0];
  const firstLeft = first ? daysBetween(today, first.date) : 0;

  return (
    <WidgetCard
      id="dash-exams"
      title="Próximas provas"
      icon={GraduationCap}
      color="#6366f1"
      action={
        <LinkButton id="dash-exams-open" onClick={() => setCurrentTab('semester')}>
          Ver semestre
        </LinkButton>
      }
    >
      {list.length === 0 ? (
        <EmptyNote
          action={
            <button type="button" id="dash-exams-add" onClick={() => setCurrentTab('semester')} className={softBtn}>
              <Plus className="h-4 w-4 text-indigo-500" /> Adicionar prova
            </button>
          }
        >
          Nenhuma prova nos próximos 60 dias.
        </EmptyNote>
      ) : (
        <>
          {/* Destaque: a próxima prova */}
          <div className="min-w-0">
            <BigNumber className={firstLeft <= 3 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}>
              {firstLeft === 0 ? 'Hoje' : firstLeft === 1 ? 'Amanhã' : <CountUp value={firstLeft} />}
              {firstLeft > 1 && <span className="ml-1.5 text-lg md:text-xl font-black text-slate-400 dark:text-slate-500">dias</span>}
            </BigNumber>
            <StatLabel>
              {firstLeft > 1 ? `para ${examDisplayTitle(first)}` : examDisplayTitle(first)}
            </StatLabel>
          </div>

          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-x-6">
            {list.map((e) => {
              const left = daysBetween(today, e.date);
              const prog = examProgress(e);
              const d = parseYMD(e.date);
              const sub = getExamSubjectName(e, subjects);
              const title = examDisplayTitle(e);
              return (
                <li key={e.id} id={`dash-exam-${e.id}`} className="flex items-center gap-3 min-w-0 border-t border-slate-100 dark:border-slate-800 py-2.5">
                  <div className="shrink-0 w-10 text-center">
                    <div className="text-base font-black text-slate-900 dark:text-white leading-none tabular-nums">{String(d.getDate()).padStart(2, '0')}</div>
                    <div className="text-[9px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-0.5">{WEEK[d.getDay()]}</div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800 dark:text-slate-100">{title}</p>
                      <span className={`shrink-0 text-[10px] font-bold ${leftTone(left)}`}>{leftLabel(left)}</span>
                    </div>
                    <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                      {[sub !== title && sub !== 'Sem disciplina' ? sub : '', getExamKind(e.type).short].filter(Boolean).join(' · ')}
                    </p>
                    {prog.topics > 0 && (
                      <div className="mt-1 flex items-center gap-2">
                        <div className="flex-1">
                          <Bar pct={prog.pct} color="#6366f1" thin />
                        </div>
                        <span className="shrink-0 text-[10px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">{prog.pct}% dos assuntos</span>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </WidgetCard>
  );
};
