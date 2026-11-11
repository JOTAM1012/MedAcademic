import React, { useMemo, useState } from 'react';
import { Clock, MapPin, Edit2, Trash2, PenLine, CheckCircle2, AlertCircle, ListChecks, ChevronDown, GraduationCap, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Exam } from '../../types';
import { TutoriaGradesSection, moduleTutoriaAverage } from '../TutoriaGradesSection';
import { examFormat, getExamKind, getExamShift } from '../../data/planning';
import { examProgress } from '../../data/examTopics';
import { daysBetween, parseYMD, ymd } from '../../data/blockReview';
import { ExamTopicsChecklist } from './ExamTopicsChecklist';
import { MONTHS, MONTHS_SHORT, examMainTitle, examSubtitle, examTimeRange } from './semesterUtils';
import { EmptyState } from '../shared/EmptyState';

interface ExamGradesListProps {
  onEdit: (exam: Exam, opts?: { focusResult?: boolean; focusTopics?: boolean }) => void;
  onNew: () => void;
}

type StatusFilter = 'todas' | 'proximas' | 'pendentes' | 'com_nota';

const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const to10 = (value: number, max: number) => (max > 0 ? (value / max) * 10 : value);
const weightedAverage = (list: Exam[], pick: (e: Exam) => number | undefined) => {
  let sum = 0;
  let weights = 0;
  list.forEach((e) => {
    const v = pick(e);
    if (v === undefined) return;
    const w = e.weight > 0 ? e.weight : 1;
    sum += to10(v, e.maxGrade || 10) * w;
    weights += w;
  });
  return weights > 0 ? sum / weights : undefined;
};
const fmt = (n?: number) => (n === undefined ? '—' : n.toFixed(1).replace('.', ','));

// Provas e notas do semestre (lista abaixo do calendário)
export const ExamGradesList: React.FC<ExamGradesListProps> = ({ onEdit, onNew }) => {
  const { exams, subjects, updateExam, deleteExam, currentSemester } = useApp();
  const [status, setStatus] = useState<StatusFilter>('todas');
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, string>>({});
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [openTopics, setOpenTopics] = useState<string | null>(null);
  const today = ymd(new Date());

  const semesterExams = useMemo(
    () =>
      exams
        .filter((e) => !e.semesterId || !currentSemester || e.semesterId === currentSemester.id)
        .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || '')),
    [exams, currentSemester]
  );

  const filtered = semesterExams.filter((e) => {
    if (status === 'proximas') return e.date >= today && e.grade === undefined;
    if (status === 'pendentes') return e.date <= today && e.grade === undefined;
    if (status === 'com_nota') return e.grade !== undefined;
    return true;
  });

  // Tutorias (Básico/Clínico): cada módulo entra na média lançada com a média das tutorias
  const tutoriaModules = subjects.filter(
    (s) => s.format === 'tutoria' && (s.tutorials || []).length > 0 && (!s.semesterId || !currentSemester || s.semesterId === currentSemester.id)
  );
  const tutoriaAverages = tutoriaModules.map(moduleTutoriaAverage).filter((v): v is number => v !== undefined);
  const releasedAvg = (() => {
    let sum = 0;
    let w = 0;
    semesterExams.forEach((e) => {
      if (e.grade === undefined) return;
      const wt = e.weight > 0 ? e.weight : 1;
      sum += to10(e.grade, e.maxGrade || 10) * wt;
      w += wt;
    });
    tutoriaAverages.forEach((v) => {
      sum += v;
      w += 1;
    });
    return w > 0 ? sum / w : undefined;
  })();
  const expectedAvg = weightedAverage(semesterExams, (e) => e.expectedGrade);
  const pending = semesterExams.filter((e) => e.date <= today && e.grade === undefined);

  const byMonth = useMemo(() => {
    const groups: Array<{ key: string; label: string; items: Exam[] }> = [];
    filtered.forEach((e) => {
      const d = parseYMD(e.date);
      const key = `${d.getFullYear()}-${d.getMonth()}`;
      let g = groups.find((x) => x.key === key);
      if (!g) {
        g = { key, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, items: [] };
        groups.push(g);
      }
      g.items.push(e);
    });
    return groups;
  }, [filtered]);

  const commitGrade = (exam: Exam) => {
    const raw = gradeDrafts[exam.id];
    if (raw === undefined) return;
    setGradeDrafts(({ [exam.id]: _drop, ...rest }) => rest);
    const trimmed = raw.trim();
    if (trimmed === '') {
      if (exam.grade !== undefined) updateExam(exam.id, { grade: undefined });
      return;
    }
    const val = Number(trimmed.replace(',', '.'));
    const max = exam.maxGrade || 10;
    if (!Number.isFinite(val) || val < 0 || val > max) return;
    if (val !== exam.grade) updateExam(exam.id, { grade: val });
  };

  const gradeTone = (exam: Exam) => {
    if (exam.grade === undefined) return 'text-slate-400';
    if (exam.expectedGrade === undefined) return 'text-slate-900 dark:text-white';
    return exam.grade >= exam.expectedGrade ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';
  };

  const formatDetail = (exam: Exam) => {
    const f = examFormat(exam.type);
    if (f === 'questions' && exam.totalQuestions) {
      return `${exam.totalQuestions}Q${exam.minCorrect !== undefined ? ` · meta ${exam.minCorrect}` : ''}${
        exam.correctAnswers !== undefined ? ` · acertou ${exam.correctAnswers}` : ''
      }`;
    }
    if (f === 'mixed' && (exam.objectiveQuestions || exam.writtenPointsMax)) {
      return [exam.objectiveQuestions ? `${exam.objectiveQuestions} obj.` : '', exam.writtenQuestions ? `${exam.writtenQuestions} disc.` : ''].filter(Boolean).join(' · ');
    }
    return '';
  };

  const renderRow = (exam: Exam) => {
    const kind = getExamKind(exam.type);
    const shift = getExamShift(exam);
    const d = parseYMD(exam.date);
    const diff = daysBetween(today, exam.date);
    const past = diff < 0;
    const sub = examSubtitle(exam, subjects);
    const time = examTimeRange(exam);
    const detail = formatDetail(exam);
    const hasTopics = (exam.examTopics || []).length > 0;
    const p = examProgress(exam);
    const topicsOpen = openTopics === exam.id;
    return (
      <div
        key={exam.id}
        id={`sem-exam-${exam.id}`}
        className={`rounded-2xl border bg-white dark:bg-slate-900 p-3 ${
          diff <= 0 && exam.grade === undefined ? 'border-amber-300/70 dark:border-amber-500/30' : 'border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className="w-11 shrink-0 text-center rounded-xl border border-slate-200 dark:border-slate-800 py-1">
            <div className="text-[9px] font-bold text-slate-400">{WEEKDAYS_SHORT[d.getDay()]}</div>
            <div className="text-base font-black leading-none text-slate-900 dark:text-white">{d.getDate()}</div>
            <div className="text-[9px] font-bold text-slate-400 uppercase">{MONTHS_SHORT[d.getMonth()]}</div>
          </div>

          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{examMainTitle(exam, subjects)}</h3>
            {sub && <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{sub}</p>}
            <div className="mt-1 flex items-center gap-x-2 gap-y-0.5 flex-wrap text-[10px] text-slate-500 dark:text-slate-400">
              <span className="font-black tracking-wide" style={{ color: kind.color }}>
                {kind.short}
              </span>
              {(time || shift) && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" /> {time || shift?.label}
                </span>
              )}
              {exam.location && (
                <span className="flex items-center gap-1 min-w-0">
                  <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate max-w-[9rem]">{exam.location}</span>
                </span>
              )}
              {exam.weight !== 1 && <span>Peso {String(exam.weight).replace('.', ',')}</span>}
              {detail && <span>{detail}</span>}
              {!past && exam.grade === undefined && diff <= 14 && (
                <span className="font-bold text-rose-600 dark:text-rose-400">{diff === 0 ? 'hoje' : diff === 1 ? 'amanhã' : `em ${diff} dias`}</span>
              )}
            </div>
          </div>

          {/* Notas */}
          <div className="flex items-stretch gap-1 shrink-0">
            <div className="w-12 rounded-xl border border-slate-200 dark:border-slate-800 px-1 py-1 text-center">
              <div className="text-[8px] font-bold uppercase text-slate-400">Meta</div>
              <div className="text-xs font-black text-slate-700 dark:text-slate-200">{fmt(exam.expectedGrade)}</div>
            </div>
            <label
              className={`w-12 rounded-xl px-1 py-1 text-center cursor-text border focus-within:border-sky-500 ${
                exam.grade === undefined && diff <= 0 ? 'border-dashed border-amber-400 dark:border-amber-500/60' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="text-[8px] font-bold uppercase text-slate-400">Nota</div>
              <input
                aria-label={`Nota de ${examMainTitle(exam, subjects)}`}
                inputMode="decimal"
                placeholder="—"
                value={gradeDrafts[exam.id] ?? (exam.grade !== undefined ? String(exam.grade).replace('.', ',') : '')}
                onChange={(e) => setGradeDrafts((g) => ({ ...g, [exam.id]: e.target.value }))}
                onBlur={() => commitGrade(exam)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                }}
                className={`w-full bg-transparent text-center text-xs font-black focus:outline-hidden placeholder:text-slate-400 ${gradeTone(exam)}`}
              />
            </label>
          </div>
        </div>

        {/* Ações */}
        <div className="mt-2 flex items-center gap-1.5 flex-wrap">
          {exam.grade === undefined ? (
            diff <= 0 ? (
              <button
                id={`sem-exam-result-${exam.id}`}
                onClick={() => onEdit(exam, { focusResult: true })}
                className="min-h-10 px-3 rounded-xl text-[11px] font-black bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5"
              >
                <PenLine className="h-3.5 w-3.5" /> Lançar resultado
              </button>
            ) : null
          ) : (
            <button
              onClick={() => onEdit(exam, { focusResult: true })}
              className="min-h-10 px-3 rounded-xl text-[11px] font-bold text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-1"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Resultado
            </button>
          )}
          {!past &&
            (hasTopics ? (
              <button
                id={`sem-exam-topics-${exam.id}`}
                onClick={() => setOpenTopics(topicsOpen ? null : exam.id)}
                aria-expanded={topicsOpen}
                className="min-h-10 px-3 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 flex items-center gap-1"
              >
                <ListChecks className="h-3.5 w-3.5" /> Assuntos {p.pct}%
                <ChevronDown className={`h-3 w-3 transition-transform ${topicsOpen ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <button
                onClick={() => onEdit(exam, { focusTopics: true })}
                className="min-h-10 px-3 rounded-xl text-[11px] font-bold text-slate-500 dark:text-slate-400 border border-dashed border-slate-300 dark:border-slate-700 flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Assuntos
              </button>
            ))}
          <div className="ml-auto flex items-center gap-0.5">
            {confirmDelete === exam.id ? (
              <>
                <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mr-1">Excluir?</span>
                <button
                  id={`sem-exam-delete-confirm-${exam.id}`}
                  onClick={() => {
                    deleteExam(exam.id);
                    setConfirmDelete(null);
                  }}
                  className="min-h-10 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold"
                >
                  Sim
                </button>
                <button onClick={() => setConfirmDelete(null)} className="min-h-10 px-3 rounded-xl text-[11px] font-semibold text-slate-500">
                  Não
                </button>
              </>
            ) : (
              <>
                <button onClick={() => onEdit(exam)} className="h-10 w-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Editar prova">
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setConfirmDelete(exam.id)}
                  className="h-10 w-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Excluir prova"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            )}
          </div>
        </div>

        {topicsOpen && (
          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <ExamTopicsChecklist exam={exam} compact />
          </div>
        )}
      </div>
    );
  };

  const FILTERS: Array<{ id: StatusFilter; label: string }> = [
    { id: 'todas', label: 'Todas' },
    { id: 'proximas', label: 'Próximas' },
    { id: 'pendentes', label: 'Sem resultado' },
    { id: 'com_nota', label: 'Com nota' },
  ];

  return (
    <section id="sem-exams" className="space-y-3">
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-base font-black text-slate-900 dark:text-white">Provas e notas</h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {semesterExams.length} prova{semesterExams.length === 1 ? '' : 's'} · meta {fmt(expectedAvg)} · média {fmt(releasedAvg)}
          </p>
        </div>
      </div>

      {pending.length > 0 && (
        <div id="exam-pending-banner" className="flex items-center gap-2 rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="min-w-0 flex-1 text-xs font-bold text-amber-900 dark:text-amber-200">
            {pending.length === 1 ? '1 prova esperando o resultado' : `${pending.length} provas esperando o resultado`}
          </p>
          <button
            id="exam-pending-launch"
            onClick={() => onEdit(pending[0], { focusResult: true })}
            className="shrink-0 min-h-10 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black"
          >
            Lançar
          </button>
        </div>
      )}

      <TutoriaGradesSection modules={tutoriaModules} />

      {semesterExams.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              id={`sem-exams-filter-${f.id}`}
              onClick={() => setStatus(f.id)}
              className={`min-h-10 px-3 rounded-full text-[11px] font-bold border ${
                status === f.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {semesterExams.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          tone="rose"
          title="Nenhuma prova ainda"
          text="Adicione as provas do semestre. Elas aparecem no calendário e no Planner."
          actionLabel="Adicionar prova"
          actionIcon={Plus}
          onAction={onNew}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          tone="slate"
          size="sm"
          title="Nenhuma prova aqui"
          text="Nenhuma prova com este filtro."
          actionLabel="Ver todas"
          onAction={() => setStatus('todas')}
        />
      ) : (
        <div className="space-y-4">
          {byMonth.map((g) => (
            <div key={g.key}>
              <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5">{g.label}</h3>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-2">{g.items.map(renderRow)}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
