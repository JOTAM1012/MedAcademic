import React, { useEffect, useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
  ReferenceLine,
  LabelList,
} from 'recharts';
import {
  Zap,
  Target,
  Award,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  BarChart3,
  ChevronRight,
  ChevronDown,
  Repeat,
  GraduationCap,
  AlertTriangle,
  Flame,
  Pencil,
  Check,
  X,
  Filter,
  CalendarDays,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AREA_OPTIONS, PERIOD_OPTIONS, PeriodFilter, buildDashboard } from '../../data/dashboardMetrics';
import { formatDM, isBlockDue, ymd } from '../../data/blockReview';
import { getActivityCategory, getExamKind, getExamSubjectName, occursOn, toYMD } from '../../data/planning';

const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs';
const fmtPct = (v?: number) => (v === undefined ? '—' : `${(Math.round(v * 10) / 10).toString().replace('.', ',')}%`);
const pctColor = (v: number | undefined, goal: number) =>
  v === undefined ? 'text-slate-400' : v >= goal ? 'text-emerald-600 dark:text-emerald-400' : v >= goal - 15 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400';

const FILTER_KEY = 'medacademic_dashboard_filters';
const readFilters = (): { period: PeriodFilter; area: string } => {
  try {
    const f = JSON.parse(localStorage.getItem(FILTER_KEY) || '{}');
    return { period: f.period || '30d', area: f.area || 'all' };
  } catch {
    return { period: '30d', area: 'all' };
  }
};

// Editor das metas de acertos do mês (usado no Dashboard e no Perfil)
export const GoalsEditor: React.FC<{ compact?: boolean; onDone?: () => void }> = ({ compact, onDone }) => {
  const { userProfile, updateUserProfile } = useApp();
  const [exam, setExam] = useState(String(userProfile.goalExamPct ?? 70));
  const [review, setReview] = useState(String(userProfile.goalReviewPct ?? 70));
  const clamp = (v: string) => Math.min(100, Math.max(1, Math.round(Number(v) || 70)));
  const save = () => {
    updateUserProfile({ goalExamPct: clamp(exam), goalReviewPct: clamp(review) });
    onDone?.();
  };
  const input = 'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-sm font-black text-slate-900 dark:text-white';
  return (
    <div id="goals-editor" className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Provas (%)</span>
          <input id="goal-exam-input" type="number" min="1" max="100" value={exam} onChange={(e) => setExam(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Revisões (%)</span>
          <input id="goal-review-input" type="number" min="1" max="100" value={review} onChange={(e) => setReview(e.target.value)} className={input} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        {onDone && (
          <button onClick={onDone} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cancelar">
            <X className="h-4 w-4" />
          </button>
        )}
        <button id="goals-save" onClick={save} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
          <Check className="h-3.5 w-3.5" /> Salvar metas
        </button>
      </div>
    </div>
  );
};

const GoalRing: React.FC<{ value?: number; goal: number; label: string }> = ({ value, goal, label }) => {
  const r = 26;
  const c = 2 * Math.PI * r;
  const p = value === undefined ? 0 : Math.min(1, value / 100);
  const ok = value !== undefined && value >= goal;
  const stroke = value === undefined ? '#94a3b8' : ok ? '#10b981' : value >= goal - 15 ? '#f59e0b' : '#f43f5e';
  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <div className="relative h-16 w-16">
        <svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90">
          <circle cx="32" cy="32" r={r} fill="none" stroke="currentColor" strokeWidth="6" className="text-slate-100 dark:text-slate-800" />
          <circle cx="32" cy="32" r={r} fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - p)} />
          {/* marca da meta */}
          <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="8" strokeDasharray={`1.5 ${c}`} strokeDashoffset={-c * (goal / 100)} />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-[13px] font-black text-slate-900 dark:text-white">
          {value === undefined ? '—' : `${Math.round(value)}%`}
        </span>
      </div>
      <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</span>
      <span className="text-[10px] text-slate-400">meta {goal}%</span>
    </div>
  );
};

export const DashboardInsights: React.FC = () => {
  const app = useApp();
  const { subjects, topicBlocks, questionLogs, exams, studySessions, currentSemester, userProfile, isDarkMode, setCurrentTab, schedule } = app;
  const [{ period, area }, setFilters] = useState(readFilters);
  const [editingGoals, setEditingGoals] = useState(false);
  const [openRows, setOpenRows] = useState<Record<string, boolean>>({});
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({ period, area }));
    } catch {}
  }, [period, area]);
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const goals = { exam: userProfile.goalExamPct ?? 70, review: userProfile.goalReviewPct ?? 70 };
  const data = useMemo(
    () => buildDashboard({ subjects, topicBlocks, questionLogs, exams, studySessions, currentSemester }, period, area, goals),
    [subjects, topicBlocks, questionLogs, exams, studySessions, currentSemester, period, area, goals.exam, goals.review]
  );

  const axis = isDarkMode ? '#64748b' : '#94a3b8';
  const grid = isDarkMode ? '#1e293b' : '#e2e8f0';
  const tooltipStyle = {
    backgroundColor: isDarkMode ? '#0f172a' : '#ffffff',
    border: `1px solid ${isDarkMode ? '#334155' : '#e2e8f0'}`,
    borderRadius: 12,
    fontSize: 12,
    color: isDarkMode ? '#e2e8f0' : '#0f172a',
  };
  const periodLabel = PERIOD_OPTIONS.find((p) => p.id === period)?.label.toLowerCase();
  const filtered = period !== '30d' || area !== 'all';

  // ---------- Hoje ----------
  const todayStr = ymd(new Date());
  const dueBlocks = topicBlocks.filter((b) => isBlockDue(b, todayStr)).slice(0, 4);
  const dueCount = topicBlocks.filter((b) => isBlockDue(b, todayStr)).length;
  const nextExam = exams
    .filter((e) => e.date && e.grade === undefined && new Date(`${e.date}T${e.time || '08:00'}:00`).getTime() >= now.getTime() - 3 * 3600000)
    .sort((a, b) => `${a.date}${a.time || ''}`.localeCompare(`${b.date}${b.time || ''}`))[0];
  const countdown = (() => {
    if (!nextExam) return null;
    const ms = Math.max(0, new Date(`${nextExam.date}T${nextExam.time || '08:00'}:00`).getTime() - now.getTime());
    return { d: Math.floor(ms / 86400000), h: Math.floor((ms % 86400000) / 3600000), m: Math.floor((ms % 3600000) / 60000), s: Math.floor((ms % 60000) / 1000) };
  })();
  const dow = now.getDay() === 0 ? 7 : now.getDay();
  const todaysClasses = schedule.filter((sc) => occursOn(sc, toYMD(now), dow as any)).sort((a, b) => a.startTime.localeCompare(b.startTime));

  const delta = data.questions.hasPrev ? data.questions.total - data.questions.prevTotal : undefined;

  return (
    <div className="space-y-6">
      {/* ---------- Filtros ---------- */}
      <div id="dashboard-filters" className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1 text-[11px] font-black uppercase tracking-widest text-slate-400 mr-1">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </span>
          <div className="flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
            {PERIOD_OPTIONS.map((p) => (
              <button
                key={p.id}
                id={`dash-period-${p.id}`}
                onClick={() => setFilters((f) => ({ ...f, period: p.id }))}
                className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                  period === p.id ? 'bg-sky-600 text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
          <select
            id="dash-area"
            value={area}
            onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}
            className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-[11px] font-bold text-slate-700 dark:text-slate-200"
            aria-label="Grande área"
          >
            {AREA_OPTIONS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.id === 'all' ? 'Todas as grandes áreas' : a.short}
              </option>
            ))}
          </select>
        </div>
        {filtered && (
          <button onClick={() => setFilters({ period: '30d', area: 'all' })} className="self-start md:self-auto text-[11px] font-bold text-slate-400 hover:text-sky-500">
            Limpar filtros
          </button>
        )}
      </div>

      {/* ---------- 4 cartões ---------- */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 sm:gap-4">
        <div id="kpi-questions" className={`${card} p-4 sm:p-5 min-w-0`}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Questões respondidas</p>
            <span className="hidden sm:inline-flex p-2 rounded-xl bg-sky-500/10 text-sky-500">
              <Zap className="h-5 w-5" />
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1">{data.questions.total.toLocaleString('pt-BR')}</p>
          <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1">
            {delta !== undefined && delta !== 0 && (
              <span className={`flex items-center gap-0.5 font-bold ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
                {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {delta > 0 ? '+' : ''}
                {delta}
              </span>
            )}
            {period === 'all' ? 'total acumulado' : `nos últimos ${periodLabel}`.replace('últimos semestre', 'semestre')}
            {delta !== undefined && ' · vs período anterior'}
          </p>
        </div>

        <div id="kpi-review-pct" className={`${card} p-4 sm:p-5 min-w-0`}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Acertos em revisões e questões</p>
            <span className="hidden sm:inline-flex p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <Target className="h-5 w-5" />
            </span>
          </div>
          <p className={`text-2xl sm:text-3xl font-black mt-1 ${pctColor(data.questions.pct, goals.review)}`}>{fmtPct(data.questions.pct)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {data.questions.total ? `${data.questions.correct} acertos de ${data.questions.total}` : 'Registre questões na aba Revisões'}
          </p>
        </div>

        <div id="kpi-exam-avg" className={`${card} p-4 sm:p-5 min-w-0`}>
          <div className="flex items-start justify-between gap-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Média em provas</p>
            <span className="hidden sm:inline-flex p-2 rounded-xl bg-indigo-500/10 text-indigo-500">
              <Award className="h-5 w-5" />
            </span>
          </div>
          <p className={`text-2xl sm:text-3xl font-black mt-1 ${pctColor(data.exams.avg, goals.exam)}`}>{fmtPct(data.exams.avg)}</p>
          <p className="text-[11px] text-slate-500 mt-1">
            {data.exams.count ? `${data.exams.count} prova${data.exams.count > 1 ? 's' : ''} com nota (nota ÷ nota máx.)` : 'Nenhuma prova com nota lançada'}
          </p>
        </div>

        <div id="kpi-goals" className={`${card} p-4 sm:p-5 col-span-2 xl:col-span-1`}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500">Metas do mês</p>
            {!editingGoals && (
              <button id="edit-goals-btn" onClick={() => setEditingGoals(true)} className="p-1.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Editar metas">
                <Pencil className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {editingGoals ? (
            <GoalsEditor compact onDone={() => setEditingGoals(false)} />
          ) : (
            <div className="flex items-center justify-around gap-2">
              <GoalRing value={data.goals.examPct} goal={goals.exam} label="Provas" />
              <div className="h-14 w-px bg-slate-200 dark:bg-slate-800" />
              <GoalRing value={data.goals.reviewPct} goal={goals.review} label="Revisões" />
            </div>
          )}
        </div>
      </div>

      {/* ---------- Hoje ---------- */}
      <div id="dashboard-today" className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className={`${card} p-4 flex flex-col`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Repeat className="h-4 w-4 text-sky-500" /> Revisões de hoje
            </p>
            <span className={`text-[11px] font-black px-2 py-0.5 rounded-md ${dueCount ? 'bg-rose-500/15 text-rose-600 dark:text-rose-300' : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300'}`}>
              {dueCount ? `${dueCount} pendente${dueCount > 1 ? 's' : ''}` : 'Em dia ✓'}
            </span>
          </div>
          {dueBlocks.length === 0 ? (
            <p className="text-xs text-slate-500 flex-1">Nenhum bloco para revisar hoje. Bom trabalho! 🎉</p>
          ) : (
            <ul className="space-y-1.5 flex-1">
              {dueBlocks.map((b) => (
                <li key={b.id} className="flex items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{b.name}</span>
                  <span className="shrink-0 text-[10px] font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    R{b.reviewsDone + 1}
                    {b.nextReviewDate && b.nextReviewDate < todayStr ? ' · atrasada' : ''}
                  </span>
                </li>
              ))}
              {dueCount > dueBlocks.length && <li className="text-[11px] text-slate-400">+{dueCount - dueBlocks.length} blocos</li>}
            </ul>
          )}
          <button onClick={() => setCurrentTab('spaced_repetition')} className="mt-3 w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold">
            <Repeat className="h-3.5 w-3.5" /> {dueCount ? 'Revisar agora' : 'Abrir revisões'}
          </button>
        </div>

        <div className="rounded-2xl p-4 text-white bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-900/20 flex flex-col">
          <p className="text-[10px] font-black uppercase tracking-widest text-blue-100/90 flex items-center gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" /> Próxima avaliação
          </p>
          {nextExam && countdown ? (
            <>
              <p className="text-lg font-black mt-1 truncate">{nextExam.title || getExamSubjectName(nextExam, subjects)}</p>
              <p className="text-xs text-blue-100 truncate">
                {getExamSubjectName(nextExam, subjects)} · {getExamKind(nextExam.type).short}
              </p>
              <div className="grid grid-cols-4 gap-1.5 mt-3">
                {[
                  [countdown.d, 'dias'],
                  [countdown.h, 'horas'],
                  [countdown.m, 'min'],
                  [countdown.s, 'seg'],
                ].map(([v, l]) => (
                  <div key={l as string} className="rounded-xl bg-white/15 py-2 text-center">
                    <div className="text-lg font-black leading-none">{v as number}</div>
                    <div className="text-[9px] uppercase tracking-wide text-blue-100 mt-1">{l as string}</div>
                  </div>
                ))}
              </div>
              <button onClick={() => setCurrentTab('grades')} className="mt-auto pt-3 text-[11px] font-bold underline text-left">
                {formatDM(nextExam.date)} {nextExam.time ? `às ${nextExam.time}` : ''} · ver em Avaliações
              </button>
            </>
          ) : (
            <p className="text-xs text-blue-100 mt-2 flex-1">
              Nenhuma prova marcada.{' '}
              <button onClick={() => setCurrentTab('grades')} className="underline font-bold">
                Adicionar em Avaliações
              </button>
            </p>
          )}
        </div>

        <div className={`${card} p-4 flex flex-col`}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-violet-500" /> Hoje na sua grade
            </p>
            <button onClick={() => setCurrentTab('schedule')} className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline">
              Grade →
            </button>
          </div>
          {todaysClasses.length === 0 ? (
            <p className="text-xs text-slate-500 flex-1">Nada na grade hoje.</p>
          ) : (
            <ul className="space-y-1.5">
              {todaysClasses.slice(0, 4).map((sc) => {
                const cat = getActivityCategory(sc);
                return (
                  <li key={sc.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: sc.color || cat.color }} />
                      <span className="font-bold text-slate-700 dark:text-slate-200 truncate">{sc.title || cat.label}</span>
                    </span>
                    <span className="font-mono text-[11px] text-slate-500 shrink-0">
                      {sc.startTime}–{sc.endTime}
                    </span>
                  </li>
                );
              })}
              {todaysClasses.length > 4 && <li className="text-[11px] text-slate-400">+{todaysClasses.length - 4} atividades</li>}
            </ul>
          )}
        </div>
      </div>

      {/* ---------- Ponto fraco ---------- */}
      {data.weakPoint && (
        <div id="weak-point-card" className="rounded-2xl border border-amber-300/60 dark:border-amber-700/50 bg-amber-50/70 dark:bg-amber-950/20 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="p-2 rounded-xl bg-amber-500 text-white shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-700 dark:text-amber-400">Ponto fraco da semana</p>
              <p className="text-sm text-slate-800 dark:text-slate-100">
                <strong>{data.weakPoint.subject.universitySubject || data.weakPoint.subject.name}</strong> está em{' '}
                <strong className="text-rose-600 dark:text-rose-400">{data.weakPoint.pct}%</strong> de acertos ({data.weakPoint.total} questões, meta {data.weakPoint.goal}%).
                {data.weakPoint.block ? (
                  <>
                    {' '}
                    Que tal revisar o bloco <strong>{data.weakPoint.block.name}</strong>?
                  </>
                ) : (
                  ' Que tal reforçar esse conteúdo?'
                )}
              </p>
            </div>
          </div>
          <button onClick={() => setCurrentTab('spaced_repetition')} className="shrink-0 flex items-center gap-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black">
            Revisar <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ---------- Evolução ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {(
          [
            ['exam', 'Evolução de acertos em provas', data.examEvolution, data.examHits, goals.exam, '#6366f1', 'Nenhuma prova com nota ainda. Lance as notas em Avaliações.'],
            ['review', 'Evolução de acertos em revisões', data.reviewEvolution, data.reviewHits, goals.review, '#f59e0b', 'Registre questões nas revisões para ver sua evolução.'],
          ] as const
        ).map(([id, title, series, h, goal, color, empty]) => (
          <div key={id} id={`evolution-${id}`} className={`${card} p-5`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" style={{ color }} /> {title}
                </p>
                <p className="text-[11px] text-slate-500">Desempenho mensal × meta de {goal}%</p>
              </div>
              {h.of > 0 && (
                <span className="text-[10px] font-black px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                  Meta em {h.hit} de {h.of} {h.of === 1 ? 'mês' : 'meses'}
                </span>
              )}
            </div>
            {h.of === 0 ? (
              <div className="h-52 flex items-center justify-center text-xs text-slate-400 text-center px-6">{empty}</div>
            ) : (
              <div className="h-52 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={series as any} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                    <defs>
                      <linearGradient id={`grad-${id}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={color} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={color} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                    <XAxis dataKey="label" stroke={axis} fontSize={10} tickLine={false} />
                    <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} stroke={axis} fontSize={10} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={tooltipStyle} formatter={(v: any, n: any) => [v === null ? '—' : `${v}%`, n === 'goal' ? 'Meta' : 'Seu desempenho']} />
                    <Area type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} fill={`url(#grad-${id})`} connectNulls dot={{ r: 4, fill: color, strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    <Line type="monotone" dataKey="goal" stroke="#10b981" strokeDasharray="5 5" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ---------- Área + horas ---------- */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <div id="area-bars" className={`${card} p-5`}>
          <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-500" /> Acertos por grande área
          </p>
          <p className="text-[11px] text-slate-500">Questões registradas · {periodLabel}</p>
          {data.areaBars.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-slate-400">Nenhuma questão no período.</div>
          ) : (
            <div className="h-56 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.areaBars} margin={{ top: 16, right: 10, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                  <XAxis dataKey="label" stroke={axis} fontSize={10} tickLine={false} interval={0} />
                  <YAxis domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} stroke={axis} fontSize={10} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: isDarkMode ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.15)' }}
                    formatter={(v: any, _n: any, p: any) => [`${v}% (${p.payload.c}/${p.payload.t})`, 'Acertos']}
                  />
                  <ReferenceLine y={goals.review} stroke="#10b981" strokeDasharray="5 5" />
                  <Bar dataKey="value" radius={[10, 10, 0, 0]} maxBarSize={64} isAnimationActive={false}>
                    {data.areaBars.map((a) => (
                      <Cell key={a.id} fill={a.color} />
                    ))}
                    <LabelList dataKey="value" position="top" fill={axis} fontSize={11} fontWeight={700} formatter={(v: any) => `${String(v).replace('.', ',')}%`} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div id="hours-chart" className={`${card} p-5`}>
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-500" /> Horas de estudo por {data.hoursSeries.length && data.hoursSeries[0].label.startsWith('sem') ? 'semana' : 'dia'}
              </p>
              <p className="text-[11px] text-slate-500">Pomodoro + tempo informado ao concluir blocos e revisões</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Média/dia estudado</p>
              <p className="text-xl font-black text-slate-900 dark:text-white">{(Math.round(data.avgHoursPerStudiedDay * 10) / 10).toString().replace('.', ',')}h</p>
            </div>
          </div>
          {data.totalHours === 0 ? (
            <div className="h-52 flex items-center justify-center text-xs text-slate-400 text-center px-6">Nenhuma hora registrada no período. Use o Pomodoro ou informe o tempo ao concluir uma revisão.</div>
          ) : (
            <div className="h-52 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.hoursSeries} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="grad-hours" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fbbf24" stopOpacity={1} />
                      <stop offset="100%" stopColor="#d97706" stopOpacity={0.55} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                  <XAxis dataKey="label" stroke={axis} fontSize={10} tickLine={false} minTickGap={18} />
                  <YAxis stroke={axis} fontSize={10} tickFormatter={(v) => `${v}h`} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    cursor={{ fill: isDarkMode ? 'rgba(148,163,184,0.08)' : 'rgba(148,163,184,0.15)' }}
                    formatter={(v: any) => [`${String(v).replace('.', ',')}h`, 'Estudo']}
                  />
                  {data.avgHoursPerStudiedDay > 0 && (
                    <ReferenceLine
                      y={Math.round(data.avgHoursPerStudiedDay * 10) / 10}
                      stroke="#94a3b8"
                      strokeDasharray="4 4"
                      label={{ value: 'média', fill: '#94a3b8', fontSize: 10, position: 'insideTopRight' }}
                    />
                  )}
                  <Bar dataKey="hours" fill="url(#grad-hours)" radius={[6, 6, 0, 0]} maxBarSize={28} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Tabela por grande área ---------- */}
      <div id="area-table" className={`${card} overflow-hidden`}>
        <div className="p-5 pb-3">
          <p className="text-sm font-black text-slate-900 dark:text-white">Análise por grande área</p>
          <p className="text-[11px] text-slate-500">Toque para abrir: grande área → especialidade/disciplina → bloco · {periodLabel}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[560px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-slate-400 border-y border-slate-100 dark:border-slate-800">
                <th className="px-5 py-2 font-black">Tema</th>
                <th className="px-3 py-2 font-black text-center">Revisões</th>
                <th className="px-3 py-2 font-black text-center">% acertos</th>
                <th className="px-3 py-2 font-black text-center">Questões</th>
                <th className="px-3 py-2 font-black text-center">% última</th>
              </tr>
            </thead>
            <tbody>
              {data.table.map((a) => {
                const rows: Array<{ row: typeof a; depth: number; parentOpen: boolean }> = [];
                const walk = (row: any, depth: number) => {
                  rows.push({ row, depth, parentOpen: true });
                  if (openRows[row.key] && row.children) row.children.forEach((c: any) => walk(c, depth + 1));
                };
                walk(a, 0);
                return rows.map(({ row, depth }) => {
                  const p = row.t ? (row.c / row.t) * 100 : undefined;
                  const hasKids = !!row.children && row.children.length > 0;
                  return (
                    <tr key={`${depth}-${row.key}`} className={`border-b border-slate-100 dark:border-slate-800/70 ${depth === 0 ? '' : 'bg-slate-50/60 dark:bg-slate-950/40'}`}>
                      <td className="px-5 py-2.5">
                        <button
                          onClick={() => hasKids && setOpenRows((o) => ({ ...o, [row.key]: !o[row.key] }))}
                          className={`flex items-center gap-1.5 text-left ${hasKids ? 'cursor-pointer' : 'cursor-default'}`}
                          style={{ paddingLeft: depth * 18 }}
                        >
                          {hasKids ? (
                            openRows[row.key] ? <ChevronDown className="h-3.5 w-3.5 text-slate-400" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                          ) : (
                            <span className="w-3.5" />
                          )}
                          {depth === 0 && <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.color }} />}
                          <span className={`${depth === 0 ? 'font-black uppercase text-slate-900 dark:text-white' : depth === 1 ? 'font-bold text-slate-700 dark:text-slate-200' : 'text-slate-600 dark:text-slate-300'}`}>
                            {row.label}
                          </span>
                        </button>
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.reviews}</td>
                      <td className={`px-3 py-2.5 text-center font-bold ${pctColor(p, goals.review)}`}>{fmtPct(p)}</td>
                      <td className="px-3 py-2.5 text-center text-slate-600 dark:text-slate-300">{row.t}</td>
                      <td className={`px-3 py-2.5 text-center ${pctColor(row.lastPct, goals.review)}`}>{fmtPct(row.lastPct)}</td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ---------- Calendário de constância ---------- */}
      <div id="study-heatmap" className={`${card} p-5`}>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-500" /> Calendário de constância
            </p>
            <p className="text-[11px] text-slate-500">Dias em que você estudou nos últimos 6 meses</p>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
              <Flame className="h-4 w-4 text-orange-500" /> {userProfile.currentStreakDays || 0} dias seguidos
            </span>
            <span className="text-slate-500">recorde {userProfile.bestStreakDays || 0}</span>
            <span className="text-slate-500">{data.activeDays90} dias ativos em 90</span>
          </div>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1">
          <div className="flex flex-col gap-1 pr-1 text-[9px] text-slate-400 shrink-0">
            {['S', 'T', 'Q', 'Q', 'S', 'S', 'D'].map((d, i) => (
              <span key={i} className="flex-1 flex items-center min-h-[14px]">
                {i % 2 === 0 ? d : ''}
              </span>
            ))}
          </div>
          {data.heatWeeks.map((week, w) => (
            <div key={w} className="flex flex-col gap-1 flex-1 min-w-[14px] max-w-[30px]">
              {week.map((day) => {
                const m = day.minutes;
                const level = day.future ? -1 : m <= 0 ? 0 : m < 30 ? 1 : m < 90 ? 2 : m < 180 ? 3 : 4;
                const cls =
                  level === -1
                    ? 'bg-transparent'
                    : level === 0
                    ? 'bg-slate-100 dark:bg-slate-800/70'
                    : level === 1
                    ? 'bg-emerald-200 dark:bg-emerald-900'
                    : level === 2
                    ? 'bg-emerald-400 dark:bg-emerald-700'
                    : level === 3
                    ? 'bg-emerald-500 dark:bg-emerald-500'
                    : 'bg-emerald-700 dark:bg-emerald-300';
                return (
                  <span
                    key={day.date}
                    className={`w-full aspect-square rounded-[4px] ${cls} ${day.date === todayStr ? 'ring-1 ring-sky-500' : ''}`}
                    title={day.future ? '' : `${formatDM(day.date)}: ${m >= 1 ? `${Math.round(m)} min` : m > 0 ? 'questões registradas' : 'sem estudo'}`}
                  />
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-1 mt-2 text-[9px] text-slate-400">
          menos
          {['bg-slate-100 dark:bg-slate-800/70', 'bg-emerald-200 dark:bg-emerald-900', 'bg-emerald-400 dark:bg-emerald-700', 'bg-emerald-500', 'bg-emerald-700 dark:bg-emerald-300'].map((c) => (
            <span key={c} className={`h-2.5 w-2.5 rounded-[3px] ${c}`} />
          ))}
          mais
        </div>
      </div>
    </div>
  );
};
