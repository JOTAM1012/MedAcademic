// Próximas provas: data, nome que o aluno deu, dias que faltam e % dos assuntos já estudados.
import React, { useMemo } from 'react';
import { GraduationCap, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { daysBetween, parseYMD, ymd } from '../../data/blockReview';
import { examProgress, upcomingExams } from '../../data/examTopics';
import { examDisplayTitle, getExamKind, getExamSubjectName } from '../../data/planning';
import { Bar, EmptyNote, LinkButton, WidgetCard, softBtn } from './ui';

const WEEK = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export const UpcomingExamsWidget: React.FC = () => {
  const { exams, subjects, setCurrentTab } = useApp();
  const today = ymd(new Date());
  const list = useMemo(() => upcomingExams(exams, today, 60).slice(0, 4), [exams, today]);

  const leftLabel = (n: number) => (n === 0 ? 'hoje' : n === 1 ? 'amanhã' : `em ${n} dias`);

  return (
    <WidgetCard
      id="dash-exams"
      title="Próximas provas"
      icon={GraduationCap}
      color="#6366f1"
      action={<LinkButton id="dash-exams-open" onClick={() => setCurrentTab('semester')}>Ver semestre</LinkButton>}
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
        <ul className="space-y-2">
          {list.map((e) => {
            const left = daysBetween(today, e.date);
            const prog = examProgress(e);
            const d = parseYMD(e.date);
            const sub = getExamSubjectName(e, subjects);
            const title = examDisplayTitle(e);
            return (
              <li key={e.id} id={`dash-exam-${e.id}`} className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 w-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 py-1 text-center">
                  <div className="text-sm font-black text-slate-900 dark:text-white leading-none">{String(d.getDate()).padStart(2, '0')}</div>
                  <div className="text-[9px] uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-0.5">{WEEK[d.getDay()]}</div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <p className="min-w-0 flex-1 truncate text-xs font-bold text-slate-800 dark:text-slate-100">{title}</p>
                    <span className={`shrink-0 text-[10px] font-bold ${left <= 3 ? 'text-rose-600 dark:text-rose-400' : left <= 7 ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'}`}>
                      {leftLabel(left)}
                    </span>
                  </div>
                  <p className="truncate text-[10px] text-slate-500 dark:text-slate-400">
                    {[sub !== title && sub !== 'Sem disciplina' ? sub : '', getExamKind(e.type).short].filter(Boolean).join(' · ')}
                  </p>
                  {prog.topics > 0 && (
                    <div className="mt-1 flex items-center gap-2">
                      <div className="flex-1">
                        <Bar pct={prog.pct} color="#6366f1" thin />
                      </div>
                      <span className="shrink-0 text-[10px] font-bold text-slate-500 dark:text-slate-400">{prog.pct}% dos assuntos</span>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </WidgetCard>
  );
};
