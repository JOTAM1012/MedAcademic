import React, { useState } from 'react';
import { ChevronDown, GraduationCap, ListPlus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Exam } from '../../types';
import { examProgress, upcomingExams } from '../../data/examTopics';
import { daysBetween, ymd } from '../../data/blockReview';
import { formatDateBR, getExamKind } from '../../data/planning';
import { AddExamModal } from '../modals/AddExamModal';
import { ExamTopicsChecklist } from './ExamTopicsChecklist';
import { examMainTitle } from './semesterUtils';

interface UpcomingExamTopicsProps {
  /** Até quantos dias à frente (padrão 30) */
  withinDays?: number;
  compact?: boolean;
}

const whenLabel = (left: number) => (left === 0 ? 'hoje' : left === 1 ? 'amanhã' : `em ${left} dias`);

// Provas que vêm por aí: as que têm assuntos mostram o check list (recolhível); as outras pedem a lista de assuntos
export const UpcomingExamTopics: React.FC<UpcomingExamTopicsProps> = ({ withinDays = 30, compact = false }) => {
  const { exams, subjects } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const [editing, setEditing] = useState<Exam | null>(null);
  const today = ymd(new Date());
  const list = upcomingExams(exams, today, withinDays);
  if (list.length === 0) return null;

  const withTopics = list.filter((e) => (e.examTopics || []).length > 0);
  const without = list.filter((e) => (e.examTopics || []).length === 0);

  return (
    <div id="examtopics-upcoming" className="space-y-2">
      {withTopics.map((exam, i) => {
        const left = daysBetween(today, exam.date);
        const p = examProgress(exam);
        const isOpen = open === exam.id || (open === null && i === 0 && !compact);
        const color = getExamKind(exam.type).color;
        return (
          <div key={exam.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            <button
              id={`examtopics-toggle-${exam.id}`}
              type="button"
              onClick={() => setOpen(isOpen ? '' : exam.id)}
              aria-expanded={isOpen}
              className="w-full min-h-12 flex items-center gap-2.5 px-3 py-2 text-left"
            >
              <span className="h-8 w-8 shrink-0 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}1a`, color }}>
                <GraduationCap className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">{examMainTitle(exam, subjects)}</span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  {formatDateBR(exam.date).slice(0, 5)} · {whenLabel(left)} · {p.pct}% feito
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="px-3 pb-3">
                <ExamTopicsChecklist exam={exam} compact={compact} />
              </div>
            )}
          </div>
        );
      })}

      {without.length > 0 && (
        <div id="examtopics-missing" className="rounded-2xl border border-dashed border-amber-300 dark:border-amber-500/40 bg-amber-50/60 dark:bg-amber-500/5 p-3">
          <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Liste os assuntos para o site encaixar na rotina</p>
          <ul className="mt-2 space-y-1">
            {without.map((exam) => (
              <li key={exam.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 text-[11px] text-slate-700 dark:text-slate-300 truncate">
                  <strong>{examMainTitle(exam, subjects)}</strong> · {whenLabel(daysBetween(today, exam.date))}
                </span>
                <button
                  id={`examtopics-add-${exam.id}`}
                  type="button"
                  onClick={() => setEditing(exam)}
                  className="shrink-0 min-h-10 px-3 rounded-xl text-[11px] font-bold text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-500/40 hover:bg-amber-100 dark:hover:bg-amber-500/10 flex items-center gap-1"
                >
                  <ListPlus className="h-3.5 w-3.5" /> Listar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AddExamModal isOpen={!!editing} onClose={() => setEditing(null)} editingExam={editing} focusTopics />
    </div>
  );
};
