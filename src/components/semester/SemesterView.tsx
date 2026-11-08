import React, { useState } from 'react';
import { Plus, GraduationCap, CalendarDays, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Exam, ScheduleClass } from '../../types';
import { SemesterStatusCard } from '../SemesterStatusCard';
import { AddExamModal } from '../modals/AddExamModal';
import { AddScheduleModal } from '../modals/AddScheduleModal';
import { formatDateBR } from '../../data/planning';
import { ymd } from '../../data/blockReview';
import { SemesterCalendar, CalendarView } from './SemesterCalendar';
import { ExamGradesList } from './ExamGradesList';
import { ActivitySheet } from './ActivitySheet';

type ExamModal = { open: boolean; exam?: Exam | null; date?: string; focusResult?: boolean; focusTopics?: boolean };
type ScheduleModal = { open: boolean; item?: ScheduleClass | null; date?: string };

const VIEW_KEY = 'medacademic_semester_view';

// Aba Semestre: calendário (semana/mês) com aulas, atividades e provas + lista de provas e notas
export const SemesterView: React.FC = () => {
  const { subjects } = useApp();
  const [view, setView] = useState<CalendarView>(() => {
    try {
      return localStorage.getItem(VIEW_KEY) === 'month' ? 'month' : 'week';
    } catch {
      return 'week';
    }
  });
  const [examModal, setExamModal] = useState<ExamModal>({ open: false });
  const [scheduleModal, setScheduleModal] = useState<ScheduleModal>({ open: false });
  const [sheet, setSheet] = useState<{ item: ScheduleClass; date: string } | null>(null);
  const [addOn, setAddOn] = useState<string | null>(null);

  const changeView = (v: CalendarView) => {
    setView(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* sem armazenamento: só não lembra */
    }
  };

  const titleOf = (sc: ScheduleClass) => {
    if (sc.title) return sc.title;
    const sub = sc.subjectId ? subjects.find((s) => s.id === sc.subjectId) : undefined;
    return sub?.universitySubject || sub?.name || 'Atividade';
  };

  const openExam = (exam: Exam) => {
    const today = ymd(new Date());
    setExamModal({ open: true, exam, focusResult: exam.date <= today && exam.grade === undefined });
  };

  return (
    <div id="sem-root" className="space-y-5 pb-12 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Semestre</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Suas aulas, atividades e provas num lugar só.</p>
        </div>
        <div className="grid grid-cols-2 sm:flex gap-2">
          <button
            id="sem-add-exam"
            onClick={() => setExamModal({ open: true, exam: null })}
            className="min-h-10 px-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Prova
          </button>
          <button
            id="sem-add-activity"
            onClick={() => setScheduleModal({ open: true, item: null })}
            className="min-h-10 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5"
          >
            <Plus className="h-4 w-4" /> Atividade
          </button>
        </div>
      </div>

      <SemesterStatusCard compact />

      {/* Calendário */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-black text-slate-900 dark:text-white">Agenda</h2>
          <div role="tablist" aria-label="Ver por" className="flex rounded-xl border border-slate-200 dark:border-slate-800 p-0.5">
            {(['week', 'month'] as const).map((v) => (
              <button
                key={v}
                id={`sem-view-${v}`}
                role="tab"
                aria-selected={view === v}
                onClick={() => changeView(v)}
                className={`min-h-10 px-4 rounded-lg text-xs font-bold ${
                  view === v ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {v === 'week' ? 'Semana' : 'Mês'}
              </button>
            ))}
          </div>
        </div>
        <SemesterCalendar
          view={view}
          onOpenActivity={(item, date) => setSheet({ item, date })}
          onOpenExam={openExam}
          onAddOnDate={(date) => setAddOn(date)}
        />
      </section>

      <ExamGradesList onEdit={(exam, opts) => setExamModal({ open: true, exam, ...opts })} onNew={() => setExamModal({ open: true, exam: null })} />

      {/* Adicionar num dia: prova ou atividade */}
      {addOn && (
        <div className="app-modal fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 bg-slate-900/50 backdrop-blur-xs" onClick={() => setAddOn(null)}>
          <div
            id="sem-add-on-day"
            onClick={(e) => e.stopPropagation()}
            className="app-modal-panel w-full max-w-xs rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xl space-y-2"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm font-black text-slate-900 dark:text-white">Adicionar em {formatDateBR(addOn).slice(0, 5)}</p>
              <button onClick={() => setAddOn(null)} className="h-10 w-10 -mr-2 flex items-center justify-center rounded-lg text-slate-400" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              id="sem-add-on-day-exam"
              onClick={() => {
                setExamModal({ open: true, exam: null, date: addOn });
                setAddOn(null);
              }}
              className="w-full min-h-12 rounded-xl border border-slate-200 dark:border-slate-800 px-3 text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <GraduationCap className="h-4 w-4 text-rose-500" /> Prova
            </button>
            <button
              id="sem-add-on-day-activity"
              onClick={() => {
                setScheduleModal({ open: true, item: null, date: addOn });
                setAddOn(null);
              }}
              className="w-full min-h-12 rounded-xl border border-slate-200 dark:border-slate-800 px-3 text-left text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2"
            >
              <CalendarDays className="h-4 w-4 text-sky-500" /> Aula ou atividade
            </button>
          </div>
        </div>
      )}

      {sheet && (
        <ActivitySheet
          item={sheet.item}
          date={sheet.date}
          title={titleOf(sheet.item)}
          onClose={() => setSheet(null)}
          onEdit={() => {
            setScheduleModal({ open: true, item: sheet.item });
            setSheet(null);
          }}
        />
      )}

      <AddExamModal
        isOpen={examModal.open}
        onClose={() => setExamModal({ open: false })}
        editingExam={examModal.exam}
        defaultDate={examModal.date}
        focusResult={examModal.focusResult}
        focusTopics={examModal.focusTopics}
      />
      <AddScheduleModal
        isOpen={scheduleModal.open}
        onClose={() => setScheduleModal({ open: false })}
        editingItem={scheduleModal.item}
        defaultDate={scheduleModal.date}
      />
    </div>
  );
};
