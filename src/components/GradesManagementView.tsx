import React, { useState } from 'react';
import {
  GraduationCap,
  Plus,
  Award,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Edit2,
  Trash2,
  BookOpen,
  FolderPlus,
  Settings,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Exam, Subject } from '../types';
import { EditSubjectModal } from './modals/EditSubjectModal';

interface GradesManagementViewProps {
  onOpenAddExam: (subjectId?: string) => void;
  onOpenAddSubject?: () => void;
}

export const GradesManagementView: React.FC<GradesManagementViewProps> = ({
  onOpenAddExam,
  onOpenAddSubject,
}) => {
  const { exams, updateExam, deleteExam, subjects, deleteSubject, currentSemester } = useApp();
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState<string>('');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Helper to compute weighted average for a subject
  const computeSubjectAverage = (subjectId: string) => {
    const subjectExams = exams.filter((e) => e.subjectId === subjectId && e.grade !== undefined);
    if (subjectExams.length === 0) return null;

    const totalWeight = subjectExams.reduce((acc, e) => acc + e.weight, 0);
    if (totalWeight === 0) return null;

    const weightedSum = subjectExams.reduce((acc, e) => acc + (e.grade || 0) * e.weight, 0);
    return Number((weightedSum / totalWeight).toFixed(1));
  };

  const handleSaveGrade = (examId: string) => {
    const val = parseFloat(gradeInput);
    if (!isNaN(val) && val >= 0 && val <= 10) {
      updateExam(examId, { grade: val });
    }
    setEditingExamId(null);
    setGradeInput('');
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const parts = dateStr.split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    } catch {
      // ignore
    }
    return dateStr;
  };

  const getDisplayName = (sub: Subject) => {
    return sub.universitySubject || sub.name;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Gestão de Notas & Rendimento
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
              Controle de Médias
            </span>
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              {currentSemester?.name || 'Semestre Atual'}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Cadastre avaliações (P1, P2, OSCE, Práticas) e acompanhe a média ponderada por disciplina da faculdade.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onOpenAddSubject && (
            <button
              onClick={onOpenAddSubject}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-2xs transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
              <span>+ Nova Disciplina</span>
            </button>
          )}
          <button
            onClick={() => onOpenAddExam()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Agendar Nova Avaliação</span>
          </button>
        </div>
      </div>

      {/* Subjects Grid */}
      {subjects.length === 0 ? (
        <div className="p-8 rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-950/30">
          <BookOpen className="h-8 w-8 mx-auto text-slate-400 mb-2" />
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Nenhuma disciplina cadastrada ainda
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Cadastre as disciplinas da sua faculdade neste semestre para gerenciar notas, provas e médias.
          </p>
          {onOpenAddSubject && (
            <button
              onClick={onOpenAddSubject}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 shadow-xs"
            >
              <Plus className="h-4 w-4" />
              <span>Cadastrar Primeira Disciplina</span>
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subjects.map((sub) => {
            const avg = computeSubjectAverage(sub.id);
            const subjectExams = exams.filter((e) => e.subjectId === sub.id);
            const gradedExams = subjectExams.filter((e) => e.grade !== undefined);
            const pendingExams = subjectExams.filter((e) => e.grade === undefined);
            const isPassing = avg !== null && avg >= (sub.targetGrade || 7.0);
            const displayName = getDisplayName(sub);

            return (
              <div
                key={sub.id}
                className="relative flex flex-col justify-between rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4.5 shadow-xs overflow-hidden transition-all hover:border-slate-300 dark:hover:border-slate-700 group"
              >
                {/* Left Colored Accent Stripe */}
                <div
                  className="absolute top-0 left-0 bottom-0 w-1.5"
                  style={{ backgroundColor: sub.color || '#0284c7' }}
                />

                <div className="pl-1">
                  <div className="flex items-center justify-between mb-1.5 gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 truncate">
                      {currentSemester?.name || 'Semestre Vigente'}
                    </span>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          avg === null
                            ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                            : isPassing
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                        }`}
                      >
                        {avg === null ? 'Sem Notas' : isPassing ? 'Aprovado' : 'Em Atenção'}
                      </span>

                      {/* Edit discipline button */}
                      <button
                        onClick={() => setEditingSubject(sub)}
                        className="p-1 rounded-md text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Editar / Renomear disciplina"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>

                      {/* Delete discipline button */}
                      <button
                        onClick={() => {
                          if (window.confirm(`Deseja excluir a disciplina "${displayName}" e suas avaliações?`)) {
                            deleteSubject(sub.id);
                          }
                        }}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                        title="Excluir disciplina"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">
                    {displayName}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Meta da Disciplina: {sub.targetGrade || 7.0}
                  </p>

                  {/* Grade Average Display */}
                  <div className="my-3.5 flex items-center justify-between bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div>
                      <div className="text-[10px] font-bold uppercase text-slate-400">
                        MÉDIA PONDERADA
                      </div>
                      <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {avg !== null ? avg.toFixed(1) : '--'}
                      </div>
                    </div>
                    <div className="text-right text-[11px] text-slate-500">
                      <div>{gradedExams.length} nota(s) lançadas</div>
                      <div>{pendingExams.length} prova(s) a realizar</div>
                    </div>
                  </div>
                </div>

                {/* Add Exam Quick Button */}
                <button
                  onClick={() => onOpenAddExam(sub.id)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Lançar Avaliação</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Detailed Exams & Assessments List */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Todas as Provas e Avaliações Cadastradas
            </h2>
          </div>
          <span className="text-xs text-slate-400">Total: {exams.length} avaliações</span>
        </div>

        <div className="space-y-3">
          {exams.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              Nenhuma avaliação cadastrada. Clique em "Agendar Nova Avaliação" acima.
            </div>
          ) : (
            exams.map((exam) => {
              const sub = subjects.find((s) => s.id === exam.subjectId);
              const subName = sub ? getDisplayName(sub) : 'Geral';
              const isEditing = editingExamId === exam.id;

              return (
                <div
                  key={exam.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-2 h-12 rounded-full shrink-0"
                      style={{ backgroundColor: sub?.color || '#0284c7' }}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-white">
                          {exam.title}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-800 dark:text-sky-300">
                          {exam.type}
                        </span>
                        <span className="text-[10px] text-slate-400">Peso: {exam.weight}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        <strong className="text-slate-700 dark:text-slate-300 font-semibold">{subName}</strong> • Data: {formatDateDisplay(exam.date)} {exam.time ? `às ${exam.time}` : ''} {exam.location ? `• Local: ${exam.location}` : ''}
                      </p>
                    </div>
                  </div>

                  {/* Grade Action / Input */}
                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="10"
                          placeholder="0-10"
                          value={gradeInput}
                          onChange={(e) => setGradeInput(e.target.value)}
                          className="w-16 rounded-lg border border-sky-500 bg-white dark:bg-slate-900 px-2 py-1 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveGrade(exam.id)}
                          className="px-2.5 py-1 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700"
                        >
                          Salvar
                        </button>
                        <button
                          onClick={() => setEditingExamId(null)}
                          className="px-2 py-1 text-xs text-slate-400 hover:text-slate-600"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {exam.grade !== undefined ? (
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-sm font-black px-2.5 py-1 rounded-xl ${
                                exam.grade >= (sub?.targetGrade || 7.0)
                                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                              }`}
                            >
                              Nota: {exam.grade.toFixed(1)}
                            </span>
                            <button
                              onClick={() => {
                                setEditingExamId(exam.id);
                                setGradeInput(exam.grade?.toString() || '');
                              }}
                              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                              title="Alterar nota"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingExamId(exam.id);
                              setGradeInput('');
                            }}
                            className="px-3 py-1.5 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-bold hover:bg-sky-100 transition-colors"
                          >
                            Lançar Nota
                          </button>
                        )}
                        <button
                          onClick={() => deleteExam(exam.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                          title="Excluir prova"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Edit Subject Modal */}
      <EditSubjectModal
        isOpen={!!editingSubject}
        onClose={() => setEditingSubject(null)}
        subject={editingSubject}
      />
    </div>
  );
};
