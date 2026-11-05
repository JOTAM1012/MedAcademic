import React, { useMemo, useState } from 'react';
import {
  GraduationCap,
  Plus,
  CalendarClock,
  Target,
  Award,
  ListOrdered,
  LayoutGrid,
  MapPin,
  Clock,
  Edit2,
  Trash2,
  TrendingUp,
  TrendingDown,
  ClipboardList,
  PenLine,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Exam } from '../types';
import { AddExamModal } from './modals/AddExamModal';
import { EXAM_KINDS, examFormat, getExamKind, getExamShift, getExamSubjectName, toYMD } from '../data/planning';

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTHS_SHORT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

type StatusFilter = 'todas' | 'proximas' | 'com_nota' | 'sem_nota' | 'pendentes';

const parseYMD = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

const daysUntil = (ymd: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((parseYMD(ymd).getTime() - today.getTime()) / 86400000);
};

/** Notas sempre comparadas na escala 0–10 */
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

export const SemesterGridView: React.FC = () => {
  const { exams, subjects, updateExam, deleteExam, currentSemester } = useApp();

  const [viewMode, setViewMode] = useState<'timeline' | 'subjects'>('timeline');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todas');
  const [modal, setModal] = useState<{ open: boolean; exam?: Exam | null; subjectName?: string; focusResult?: boolean }>({ open: false });
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, string>>({});

  const todayStr = toYMD(new Date());

  // Provas deste semestre (as antigas, sem semestre, aparecem em todos)
  const semesterExams = useMemo(
    () =>
      exams
        .filter((e) => !e.semesterId || !currentSemester || e.semesterId === currentSemester.id)
        .sort((a, b) => (a.date || '').localeCompare(b.date || '') || (a.time || '').localeCompare(b.time || '')),
    [exams, currentSemester]
  );

  const filtered = semesterExams.filter((e) => {
    if (kindFilter !== 'all' && getExamKind(e.type).id !== kindFilter) return false;
    if (statusFilter === 'proximas') return e.date >= todayStr && e.grade === undefined;
    if (statusFilter === 'com_nota') return e.grade !== undefined;
    if (statusFilter === 'sem_nota') return e.grade === undefined;
    if (statusFilter === 'pendentes') return e.date <= todayStr && e.grade === undefined;
    return true;
  });

  const releasedAvg = weightedAverage(semesterExams, (e) => e.grade);
  const expectedAvg = weightedAverage(semesterExams, (e) => e.expectedGrade);
  const gradedCount = semesterExams.filter((e) => e.grade !== undefined).length;
  // provas que já aconteceram (ou são hoje) e ainda não têm resultado
  const pendingResults = semesterExams.filter((e) => e.date <= todayStr && e.grade === undefined);
  const nextExam = semesterExams.find((e) => e.date >= todayStr && e.grade === undefined);

  const kindCounts = useMemo(() => {
    const map = new Map<string, number>();
    semesterExams.forEach((e) => {
      const k = getExamKind(e.type).id;
      map.set(k, (map.get(k) || 0) + 1);
    });
    return map;
  }, [semesterExams]);

  // Linha do tempo agrupada por mês
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

  // Agrupado por disciplina (nome livre)
  const bySubject = useMemo(() => {
    const map = new Map<string, Exam[]>();
    filtered.forEach((e) => {
      const name = getExamSubjectName(e, subjects);
      map.set(name, [...(map.get(name) || []), e]);
    });
    return Array.from(map.entries())
      .map(([name, list]) => ({
        name,
        list,
        released: weightedAverage(list, (e) => e.grade),
        expected: weightedAverage(list, (e) => e.expectedGrade),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered, subjects]);

  const commitGrade = (exam: Exam) => {
    const raw = gradeDrafts[exam.id];
    if (raw === undefined) return;
    setGradeDrafts(({ [exam.id]: _, ...rest }) => rest);
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

  const openNew = (subjectName?: string) => setModal({ open: true, exam: null, subjectName });

  const renderGradeBox = (exam: Exam) => (
    <div className="flex items-stretch gap-1.5 shrink-0">
      <div className="w-16 rounded-xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 px-2 py-1.5 text-center">
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Esperada</div>
        <div className="text-sm font-black text-slate-700 dark:text-slate-200">{fmt(exam.expectedGrade)}</div>
      </div>
      <label
        className={`w-16 rounded-xl px-2 py-1.5 text-center focus-within:border-sky-500 cursor-text border ${
          exam.grade === undefined && exam.date <= todayStr
            ? 'bg-amber-50 dark:bg-amber-500/10 border-dashed border-amber-400 dark:border-amber-500/60'
            : 'bg-slate-50 dark:bg-slate-950/70 border-slate-200 dark:border-slate-800'
        }`}
      >
        <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Lançada</div>
        <input
          aria-label={`Nota lançada de ${exam.title}`}
          inputMode="decimal"
          placeholder={exam.grade === undefined && exam.date <= todayStr ? 'Nota' : '—'}
          value={gradeDrafts[exam.id] ?? (exam.grade !== undefined ? String(exam.grade).replace('.', ',') : '')}
          onChange={(e) => setGradeDrafts((d) => ({ ...d, [exam.id]: e.target.value }))}
          onBlur={() => commitGrade(exam)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          className={`w-full bg-transparent text-center text-sm font-black focus:outline-hidden placeholder:text-slate-400 ${gradeTone(exam)}`}
        />
      </label>
    </div>
  );

  // Questões / acertos conforme o tipo da prova
  const renderFormatDetail = (exam: Exam) => {
    const fmtType = examFormat(exam.type);
    const pctOf = (c?: number, t?: number) => (c !== undefined && t ? Math.round((c / t) * 100) : undefined);
    if (fmtType === 'questions' && exam.totalQuestions) {
      const p = pctOf(exam.correctAnswers, exam.totalQuestions);
      return (
        <span className="font-semibold">
          {exam.totalQuestions}Q{exam.minCorrect !== undefined && ` · meta ${exam.minCorrect} acertos`}
          {exam.correctAnswers !== undefined && (
            <strong className={exam.minCorrect !== undefined ? (exam.correctAnswers >= exam.minCorrect ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400') : ''}>
              {' '}· acertou {exam.correctAnswers} ({p}%)
            </strong>
          )}
        </span>
      );
    }
    if (fmtType === 'mixed' && (exam.objectiveQuestions || exam.writtenPointsMax)) {
      return (
        <span className="font-semibold">
          {exam.objectiveQuestions ? `Obj. ${exam.objectiveCorrect !== undefined ? `${exam.objectiveCorrect}/` : ''}${exam.objectiveQuestions}` : ''}
          {exam.writtenPointsMax !== undefined &&
            ` · Disc. ${exam.writtenPointsEarned !== undefined ? `${String(exam.writtenPointsEarned).replace('.', ',')}/` : ''}${String(exam.writtenPointsMax).replace('.', ',')} pts`}
          {exam.writtenQuestions ? ` (${exam.writtenQuestions} disc.)` : ''}
        </span>
      );
    }
    return null;
  };

  const renderExamRow = (exam: Exam, showSubject = true) => {
    const kind = getExamKind(exam.type);
    const shift = getExamShift(exam);
    const d = parseYMD(exam.date);
    const diff = daysUntil(exam.date);
    const isPast = diff < 0;
    return (
      <div
        key={exam.id}
        className={`group relative flex flex-col sm:flex-row sm:items-center gap-3 rounded-2xl border bg-white dark:bg-slate-900 p-3 pl-4 transition-colors overflow-hidden ${
          isPast && exam.grade === undefined
            ? 'border-amber-300/60 dark:border-amber-500/30'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
        }`}
      >
        <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: kind.color }} />

        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-12 shrink-0 text-center rounded-xl border border-slate-200 dark:border-slate-800 py-1">
            <div className="text-[9px] font-bold text-slate-400">{WEEKDAYS_SHORT[d.getDay()]}</div>
            <div className="text-lg font-black leading-none text-slate-900 dark:text-white">{d.getDate()}</div>
            <div className="text-[9px] font-bold text-slate-400">{MONTHS_SHORT[d.getMonth()]}</div>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="text-[9px] font-black px-1.5 py-0.5 rounded-md text-white tracking-wider"
                style={{ backgroundColor: kind.color }}
              >
                {kind.short}
              </span>
              {shift && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  {shift.emoji} {shift.label}
                </span>
              )}
              {!isPast && exam.grade === undefined && diff <= 14 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                  {diff === 0 ? 'Hoje' : diff === 1 ? 'Amanhã' : `em ${diff} dias`}
                </span>
              )}
              {isPast && exam.grade === undefined && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  Lançar nota
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate mt-0.5">
              {showSubject ? getExamSubjectName(exam, subjects) : exam.title}
            </h3>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-x-3 gap-y-0.5 flex-wrap">
              {showSubject && <span className="truncate">{exam.title}</span>}
              {exam.time && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {exam.time}
                </span>
              )}
              {exam.location && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="h-3 w-3" />
                  {exam.location}
                </span>
              )}
              {exam.weight !== 1 && <span>Peso {exam.weight}</span>}
              {renderFormatDetail(exam)}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-2 flex-wrap">
          {exam.grade === undefined ? (
            <button
              onClick={() => setModal({ open: true, exam, focusResult: true })}
              className={`exam-result-cta shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all ${
                diff <= 0
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md shadow-amber-500/30 animate-[pulse_2.4s_ease-in-out_infinite]'
                  : 'border border-sky-300 dark:border-sky-700/70 text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50'
              }`}
              title="Lançar nota, questões e acertos"
            >
              <PenLine className="h-3.5 w-3.5" />
              Lançar resultado
            </button>
          ) : (
            <button
              onClick={() => setModal({ open: true, exam, focusResult: true })}
              className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
              title="Ver ou editar o resultado"
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Resultado lançado
            </button>
          )}
          {renderGradeBox(exam)}
          <div className="flex sm:flex-col gap-1">
            <button
              onClick={() => setModal({ open: true, exam })}
              className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800"
              title="Editar prova"
              aria-label="Editar prova"
            >
              <Edit2 className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                if (window.confirm(`Excluir "${exam.title}"?`)) deleteExam(exam.id);
              }}
              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800"
              title="Excluir prova"
              aria-label="Excluir prova"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  const avgDelta = releasedAvg !== undefined && expectedAvg !== undefined ? releasedAvg - expectedAvg : undefined;

  return (
    <div className="space-y-5 pb-12 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Avaliações do semestre</h1>
            {currentSemester && (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                {currentSemester.name}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Suas provas do semestre com data, turno, nota esperada e nota lançada.
          </p>
        </div>
        <button
          id="semester-add-exam-btn"
          onClick={() => openNew()}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors"
        >
          <Plus className="h-4 w-4" />
          Nova prova
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <ClipboardList className="h-4 w-4 text-sky-500" /> Provas
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{semesterExams.length}</div>
          <div className="text-[11px] text-slate-500">{gradedCount} com nota lançada</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 min-w-0">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <CalendarClock className="h-4 w-4 text-rose-500" /> Próxima
          </div>
          {nextExam ? (
            <>
              <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
                {daysUntil(nextExam.date) === 0 ? 'Hoje' : `${daysUntil(nextExam.date)}d`}
              </div>
              <div className="text-[11px] text-slate-500 truncate">
                {getExamSubjectName(nextExam, subjects)} · {getExamKind(nextExam.type).id}
              </div>
            </>
          ) : (
            <>
              <div className="text-2xl font-black text-slate-300 dark:text-slate-600 mt-1">—</div>
              <div className="text-[11px] text-slate-500">Nenhuma prova agendada</div>
            </>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <Target className="h-4 w-4 text-violet-500" /> Média esperada
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{fmt(expectedAvg)}</div>
          <div className="text-[11px] text-slate-500">Ponderada pelo peso</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <Award className="h-4 w-4 text-emerald-500" /> Média lançada
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{fmt(releasedAvg)}</div>
          <div
            className={`text-[11px] font-semibold flex items-center gap-1 ${
              avgDelta === undefined ? 'text-slate-500' : avgDelta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {avgDelta === undefined ? (
              'Lance notas para comparar'
            ) : (
              <>
                {avgDelta >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {avgDelta >= 0 ? '+' : ''}
                {fmt(avgDelta)} vs esperada
              </>
            )}
          </div>
        </div>
      </div>

      {pendingResults.length > 0 && (
        <div id="exam-pending-banner" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-amber-300 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 shrink-0 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-amber-900 dark:text-amber-200">
                {pendingResults.length === 1 ? '1 avaliação aguardando resultado' : `${pendingResults.length} avaliações aguardando resultado`}
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-200/70">
                Lance a nota, as questões e os acertos para manter suas médias e gráficos em dia.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {statusFilter !== 'pendentes' && pendingResults.length > 1 && (
              <button
                onClick={() => setStatusFilter('pendentes')}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-amber-400/60 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-500/20"
              >
                Ver pendentes
              </button>
            )}
            <button
              id="exam-pending-launch"
              onClick={() => setModal({ open: true, exam: pendingResults[0], focusResult: true })}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md shadow-amber-500/30"
            >
              <PenLine className="h-3.5 w-3.5" /> Lançar agora
            </button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            onClick={() => setKindFilter('all')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              kindFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Todos os tipos
          </button>
          {EXAM_KINDS.map((k) => {
            const active = kindFilter === k.id;
            const count = kindCounts.get(k.id) || 0;
            return (
              <button
                key={k.id}
                onClick={() => setKindFilter(active ? 'all' : k.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  active ? 'text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
                style={active ? { backgroundColor: k.color, borderColor: k.color } : undefined}
              >
                {!active && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: k.color }} />}
                {k.id}
                {count > 0 && <span className="opacity-70">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-hidden"
            aria-label="Filtrar por situação"
          >
            <option value="todas">Todas</option>
            <option value="proximas">Próximas</option>
            <option value="pendentes">Aguardando resultado</option>
            <option value="sem_nota">Sem nota</option>
            <option value="com_nota">Com nota</option>
          </select>
          <div className="flex items-center gap-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-1">
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                viewMode === 'timeline' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <ListOrdered className="h-3.5 w-3.5" /> Linha do tempo
            </button>
            <button
              onClick={() => setViewMode('subjects')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                viewMode === 'subjects' ? 'bg-sky-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" /> Por disciplina
            </button>
          </div>
        </div>
      </div>

      {/* Conteúdo */}
      {semesterExams.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-10 text-center">
          <GraduationCap className="h-10 w-10 mx-auto text-sky-500 mb-3" />
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Monte a grade de provas do semestre</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
            Digite o nome da disciplina, escolha o tipo (OSCE, Anatomia, Simulado, Escrita, Objetiva, Multimídia ou Formativa), a data e o
            turno. Depois é só lançar a nota quando sair.
          </p>
          <button
            onClick={() => openNew()}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
          >
            <Plus className="h-4 w-4" /> Adicionar primeira prova
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center text-sm text-slate-500">
          Nenhuma prova com esses filtros.
        </div>
      ) : viewMode === 'timeline' ? (
        <div className="space-y-6">
          {byMonth.map((g) => (
            <section key={g.key}>
              <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2 flex items-center gap-2">
                {g.label}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">{g.items.length}</span>
              </h2>
              <div className="space-y-2">{g.items.map((e) => renderExamRow(e))}</div>
            </section>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {bySubject.map((s) => (
            <section key={s.name} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-slate-900 dark:text-white truncate">{s.name}</h2>
                  <p className="text-[11px] text-slate-500">
                    {s.list.length} prova{s.list.length > 1 ? 's' : ''} · esperada {fmt(s.expected)} · lançada{' '}
                    <strong
                      className={
                        s.released === undefined || s.expected === undefined
                          ? ''
                          : s.released >= s.expected
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-600 dark:text-rose-400'
                      }
                    >
                      {fmt(s.released)}
                    </strong>
                  </p>
                </div>
                <button
                  onClick={() => openNew(s.name === 'Sem disciplina' ? undefined : s.name)}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-950/60 hover:bg-sky-100"
                >
                  <Plus className="h-3 w-3" /> Prova
                </button>
              </div>
              <div className="space-y-2">{s.list.map((e) => renderExamRow(e, false))}</div>
            </section>
          ))}
        </div>
      )}

      <AddExamModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false })}
        editingExam={modal.exam}
        defaultSubjectName={modal.subjectName}
        focusResult={modal.focusResult}
      />
    </div>
  );
};
