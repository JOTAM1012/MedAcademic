import React, { useMemo, useState } from 'react';
import { History, BookOpen, Layers, ClipboardCheck, Clock, Repeat, GraduationCap, Printer, Award } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Exam, Semester } from '../types';
import { SemesterStatusCard } from './SemesterStatusCard';
import { getMedicalArea, getSpecialty } from '../data/areas';
import { inPeriod, semesterBounds } from '../data/academicCalendar';
import { getExamKind, getExamSubjectName } from '../data/planning';
import { formatDM, isTopicSeen, ymd } from '../data/blockReview';

const fmt = (n?: number) => (n === undefined ? '—' : n.toFixed(1).replace('.', ','));
const to10 = (v: number, max: number) => (max > 0 ? (v / max) * 10 : v);
const weighted = (list: Exam[], pick: (e: Exam) => number | undefined) => {
  let sum = 0;
  let w = 0;
  list.forEach((e) => {
    const v = pick(e);
    if (v === undefined) return;
    const wt = e.weight > 0 ? e.weight : 1;
    sum += to10(v, e.maxGrade || 10) * wt;
    w += wt;
  });
  return w > 0 ? sum / w : undefined;
};

// Histórico: resumo de cada semestre (disciplinas, tópicos, blocos, questões, horas, revisões) e boletim
export const SemesterHistoryView: React.FC = () => {
  const { semesters, currentSemester, subjects, topics, topicBlocks, questionLogs, studySessions, exams } = useApp();

  const periodOfSem = (s: Semester) => semesterBounds(s);
  const ordered = useMemo(
    () => [...semesters].sort((a, b) => periodOfSem(b).code.localeCompare(periodOfSem(a).code) || b.id.localeCompare(a.id)),
    [semesters]
  );
  const [selectedId, setSelectedId] = useState<string>(currentSemester?.id || ordered[0]?.id || '');
  const sel = semesters.find((s) => s.id === selectedId) || currentSemester;

  const data = useMemo(() => {
    if (!sel) return null;
    const p = periodOfSem(sel);
    const isCurrent = sel.id === currentSemester?.id;
    const subs = subjects.filter((s) => s.semesterId === sel.id || (!s.semesterId && isCurrent));
    const subIds = new Set(subs.map((s) => s.id));
    const tps = topics.filter((t) => subIds.has(t.subjectId));
    const blks = topicBlocks.filter((b) => subIds.has(b.subjectId));
    const qs = questionLogs.filter((q) => q.semesterId === sel.id || (!q.semesterId && inPeriod(p, q.date)));
    const qTotal = qs.reduce((a, q) => a + q.total, 0);
    const qCorrect = qs.reduce((a, q) => a + q.correct, 0);
    const minutes = studySessions.filter((s) => inPeriod(p, s.timestamp.slice(0, 10))).reduce((a, s) => a + s.durationMinutes, 0);
    const reviews = topicBlocks.reduce((a, b) => a + (b.reviewLog || []).filter((r) => inPeriod(p, r.date)).length, 0);
    const exs = exams.filter((e) => e.semesterId === sel.id || (!e.semesterId && isCurrent));
    return { p, isCurrent, subs, tps, blks, qTotal, qCorrect, minutes, reviews, exs, qs };
  }, [sel, subjects, topics, topicBlocks, questionLogs, studySessions, exams, currentSemester]);

  // Boletim: provas agrupadas por disciplina
  const report = useMemo(() => {
    if (!data) return [];
    const map = new Map<string, Exam[]>();
    data.exs.forEach((e) => {
      const name = getExamSubjectName(e, subjects);
      map.set(name, [...(map.get(name) || []), e]);
    });
    return Array.from(map.entries())
      .map(([name, list]) => ({
        name,
        list: list.sort((a, b) => a.date.localeCompare(b.date)),
        grade: weighted(list, (e) => e.grade),
        expected: weighted(list, (e) => e.expectedGrade),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [data, subjects]);

  if (!sel || !data) {
    return <p className="text-sm text-slate-500">Nenhum semestre cadastrado.</p>;
  }

  const overall = weighted(data.exs, (e) => e.grade);
  const overallExpected = weighted(data.exs, (e) => e.expectedGrade);
  const pct = data.qTotal ? Math.round((data.qCorrect / data.qTotal) * 100) : undefined;
  const seen = data.tps.filter(isTopicSeen).length;
  const mastered = data.blks.filter((b) => b.reviewStatus !== 'estudando' && b.reviewsDone >= 4).length;
  const gradeTone = (g?: number, target?: number) =>
    g === undefined ? 'text-slate-400' : target !== undefined ? (g >= target ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400') : g >= 7 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400';

  const metrics = [
    { icon: BookOpen, label: 'Disciplinas', value: data.subs.length, sub: `${data.blks.length} blocos`, color: 'text-sky-500' },
    { icon: Layers, label: 'Tópicos vistos', value: `${seen}/${data.tps.length}`, sub: `${mastered} blocos dominados`, color: 'text-violet-500' },
    { icon: ClipboardCheck, label: 'Questões', value: data.qTotal, sub: pct !== undefined ? `${pct}% de acertos` : 'nenhuma registrada', color: 'text-emerald-500' },
    { icon: Clock, label: 'Horas de estudo', value: `${(data.minutes / 60).toFixed(1).replace('.', ',')}h`, sub: 'Pomodoro e cronômetro', color: 'text-amber-500' },
    { icon: Repeat, label: 'Revisões feitas', value: data.reviews, sub: 'revisões de blocos', color: 'text-rose-500' },
    { icon: GraduationCap, label: 'Média lançada', value: fmt(overall), sub: overallExpected !== undefined ? `esperada ${fmt(overallExpected)}` : `${data.exs.length} provas`, color: 'text-blue-500' },
  ];

  return (
    <div className="space-y-5 pb-12 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <History className="h-6 w-6 text-sky-500" /> Histórico de semestres
          </h1>
        </div>
      </div>

      <SemesterStatusCard compact />

      {/* Semestres */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {ordered.map((s) => {
          const p = periodOfSem(s);
          const active = s.id === sel.id;
          return (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`shrink-0 text-left px-3.5 py-2 rounded-2xl border transition-colors ${
                active ? 'bg-sky-600 border-sky-600 text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200'
              }`}
            >
              <div className="text-xs font-black">{s.name}</div>
              <div className={`text-[10px] font-semibold ${active ? 'text-sky-100' : 'text-slate-500'}`}>
                {p.code}
                {s.id === currentSemester?.id ? ' · atual' : ''}
              </div>
            </button>
          );
        })}
      </div>

      {/* Resumo */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">Resumo · {sel.name}</h2>
            <p className="text-xs text-slate-500">
              {data.p.code} · {formatDM(data.p.start)}/{data.p.start.slice(0, 4)} a {formatDM(data.p.end)}/{data.p.end.slice(0, 4)}
              {sel.customDates ? ' · datas personalizadas' : ''}
            </p>
          </div>
          {data.isCurrent && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-600 dark:text-sky-400">Em andamento</span>}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {metrics.map((m) => {
            const Icon = m.icon;
            return (
              <div key={m.label} className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-3">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  <Icon className={`h-3.5 w-3.5 ${m.color}`} /> {m.label}
                </div>
                <div className="text-xl font-black text-slate-900 dark:text-white mt-1">{m.value}</div>
                <div className="text-[10px] text-slate-500">{m.sub}</div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Disciplinas */}
        <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-3">Disciplinas e assuntos</h2>
          {data.subs.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhuma disciplina neste semestre.</p>
          ) : (
            <ul className="space-y-3">
              {data.subs.map((s) => {
                const color = getSpecialty(s.specialty)?.color || getMedicalArea(s.majorArea).color;
                const subTopics = data.tps.filter((t) => t.subjectId === s.id);
                const subBlocks = data.blks.filter((b) => b.subjectId === s.id);
                const subSeen = subTopics.filter(isTopicSeen).length;
                const subQ = data.qs.filter((q) => q.subjectId === s.id);
                const qT = subQ.reduce((a, q) => a + q.total, 0);
                const qC = subQ.reduce((a, q) => a + q.correct, 0);
                return (
                  <li key={s.id}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-sm font-bold text-slate-900 dark:text-white truncate">{s.universitySubject || s.name}</span>
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 shrink-0">
                        {subSeen}/{subTopics.length} tópicos · {qT ? `${qT}Q (${Math.round((qC / qT) * 100)}%)` : '0Q'}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${subTopics.length ? (subSeen / subTopics.length) * 100 : 0}%`, backgroundColor: color }} />
                    </div>
                    {subBlocks.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {subBlocks.map((b) => (
                          <span
                            key={b.id}
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${
                              b.reviewStatus === 'dominado'
                                ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                                : b.reviewStatus === 'revisao'
                                ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                            }`}
                          >
                            {b.reviewStatus === 'dominado' ? '🏆 ' : ''}
                            {b.name}
                            {b.reviewStatus === 'revisao' ? ` · R${b.reviewsDone + 1}` : ''}
                          </span>
                        ))}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Boletim */}
        <section id="semester-report-card" className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1.5">
              <Award className="h-4 w-4 text-blue-500" /> Boletim
            </h2>
            {report.length > 0 && (
              <button onClick={() => window.print()} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-sky-600">
                <Printer className="h-3.5 w-3.5" /> Imprimir
              </button>
            )}
          </div>
          {report.length === 0 ? (
            <p className="text-xs text-slate-400">Sem provas neste semestre. Adicione provas e notas na Grade de Semestre para montar o boletim.</p>
          ) : (
            <div className="space-y-3">
              {report.map((r) => (
                <div key={r.name} className="rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 bg-slate-50 dark:bg-slate-950/60">
                    <span className="text-xs font-black text-slate-900 dark:text-white truncate">{r.name}</span>
                    <span className="text-[11px] shrink-0">
                      <span className="text-slate-500">esperada {fmt(r.expected)} · </span>
                      <strong className={gradeTone(r.grade, r.expected)}>média {fmt(r.grade)}</strong>
                    </span>
                  </div>
                  <table className="w-full text-[11px]">
                    <tbody>
                      {r.list.map((e) => {
                        const kind = getExamKind(e.type);
                        return (
                          <tr key={e.id} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-1.5 text-slate-500 w-12">{formatDM(e.date)}</td>
                            <td className="px-1 py-1.5">
                              <span className="font-bold" style={{ color: kind.color }}>
                                {kind.short}
                              </span>{' '}
                              <span className="text-slate-600 dark:text-slate-300">{e.title}</span>
                            </td>
                            <td className="px-1 py-1.5 text-right text-slate-500 whitespace-nowrap">esp. {fmt(e.expectedGrade)}</td>
                            <td className={`px-3 py-1.5 text-right font-black whitespace-nowrap ${gradeTone(e.grade, e.expectedGrade)}`}>{fmt(e.grade)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ))}
              <div className="flex items-center justify-between rounded-2xl bg-sky-50 dark:bg-sky-950/30 px-3 py-2.5">
                <span className="text-xs font-black text-slate-900 dark:text-white">Média geral do semestre</span>
                <span className="text-sm font-black">
                  <span className="text-slate-500 text-[11px] font-semibold">esperada {fmt(overallExpected)} · </span>
                  <span className={gradeTone(overall, overallExpected)}>{fmt(overall)}</span>
                </span>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
