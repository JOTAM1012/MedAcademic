// Cálculos do Dashboard (só dados reais: questões registradas, provas da Grade de Semestre,
// revisões dos blocos e sessões de estudo), com filtros de período e grande área.
import { Exam, QuestionLog, Semester, StudySession, Subject, TopicBlock } from '../types';
import { getMedicalArea, getSpecialty, MEDICAL_AREAS, OTHER_AREA } from './areas';
import { semesterBounds } from './academicCalendar';
import { addDaysYMD, ymd } from './blockReview';

export type PeriodFilter = '7d' | '30d' | 'semester' | 'all';
export const PERIOD_OPTIONS: Array<{ id: PeriodFilter; label: string }> = [
  { id: '7d', label: '7 dias' },
  { id: '30d', label: '30 dias' },
  { id: 'semester', label: 'Semestre' },
  { id: 'all', label: 'Sempre' },
];
export const AREA_OPTIONS = [{ id: 'all', short: 'Todas', color: '#64748b' }, ...MEDICAL_AREAS.map((a) => ({ id: a.id, short: a.id, color: a.color }))];

export interface DashboardData {
  subjects: Subject[];
  topicBlocks: TopicBlock[];
  questionLogs: QuestionLog[];
  exams: Exam[];
  studySessions: StudySession[];
  currentSemester?: Semester;
}

export interface Range {
  start: string | null; // YYYY-MM-DD inclusive
  end: string; // YYYY-MM-DD inclusive
  prevStart: string | null;
  prevEnd: string | null;
}

export const rangeFor = (period: PeriodFilter, sem?: Semester): Range => {
  const today = ymd(new Date());
  const diff = (a: string, b: string) => Math.round((new Date(b + 'T12:00').getTime() - new Date(a + 'T12:00').getTime()) / 86400000);
  if (period === '7d' || period === '30d') {
    const n = period === '7d' ? 7 : 30;
    const start = addDaysYMD(-(n - 1), today);
    return { start, end: today, prevStart: addDaysYMD(-n, start), prevEnd: addDaysYMD(-1, start) };
  }
  if (period === 'semester' && sem) {
    const b = semesterBounds(sem);
    const end = today < b.end ? today : b.end;
    const len = Math.max(1, diff(b.start, end) + 1);
    return { start: b.start, end, prevStart: addDaysYMD(-len, b.start), prevEnd: addDaysYMD(-1, b.start) };
  }
  return { start: null, end: today, prevStart: null, prevEnd: null };
};

const inRange = (date: string | undefined, start: string | null, end: string | null) =>
  !!date && (!start || date >= start) && (!end || date <= end);

/** Grande área de uma disciplina (id de MEDICAL_AREAS ou "Outras") */
export const areaOfSubject = (sub?: Subject) => (sub ? getMedicalArea(sub.majorArea) : OTHER_AREA);

/** Nome da subcategoria: especialidade (Clínica Médica) ou a própria disciplina */
export const groupOfSubject = (sub: Subject) => {
  const spec = getSpecialty(sub.specialty);
  return spec ? `${spec.emoji} ${spec.id}` : sub.universitySubject || sub.name;
};

const pct = (c: number, t: number) => (t > 0 ? (c / t) * 100 : undefined);
const sessionDate = (s: StudySession) => ymd(new Date(s.timestamp));

export const buildDashboard = (d: DashboardData, period: PeriodFilter, area: string, goals: { exam: number; review: number }) => {
  const r = rangeFor(period, d.currentSemester);
  const subById = new Map(d.subjects.map((s) => [s.id, s]));
  const blockById = new Map(d.topicBlocks.map((b) => [b.id, b]));
  const subOfLog = (q: QuestionLog) => subById.get(q.subjectId || (q.blockId ? blockById.get(q.blockId)?.subjectId || '' : ''));
  const areaOk = (sub?: Subject) => area === 'all' || areaOfSubject(sub).id === area;

  const logsAll = d.questionLogs.filter((q) => areaOk(subOfLog(q)));
  const logs = logsAll.filter((q) => inRange(q.date, r.start, r.end));
  const prevLogs = r.prevStart ? logsAll.filter((q) => inRange(q.date, r.prevStart, r.prevEnd)) : [];
  const sum = (arr: QuestionLog[]) => arr.reduce((a, q) => ({ t: a.t + q.total, c: a.c + q.correct }), { t: 0, c: 0 });
  const cur = sum(logs);
  const prev = sum(prevLogs);

  const examPct = (e: Exam) => (e.grade !== undefined && e.maxGrade ? (e.grade / e.maxGrade) * 100 : undefined);
  const examsAll = d.exams.filter((e) => (area === 'all' ? true : !!e.subjectId && areaOk(subById.get(e.subjectId))));
  const examsDone = examsAll.filter((e) => examPct(e) !== undefined && inRange(e.date, r.start, r.end));
  const examAvg = examsDone.length ? examsDone.reduce((a, e) => a + examPct(e)!, 0) / examsDone.length : undefined;

  // ---- Metas do mês (mês atual) ----
  const monthKey = ymd(new Date()).slice(0, 7);
  const monthLogs = sum(logsAll.filter((q) => q.date.startsWith(monthKey)));
  const monthExams = examsAll.filter((e) => examPct(e) !== undefined && (e.date || '').startsWith(monthKey));
  const monthExamAvg = monthExams.length ? monthExams.reduce((a, e) => a + examPct(e)!, 0) / monthExams.length : undefined;

  // ---- Evolução mensal (últimos 6 meses com o mês atual) ----
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const m = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}`);
  }
  const MONTHS_PT = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const monthLabel = (k: string) => `${MONTHS_PT[Number(k.slice(5, 7)) - 1]}/${k.slice(2, 4)}`;
  const reviewEvolution = months
    .map((k) => {
      const s = sum(logsAll.filter((q) => q.date.startsWith(k)));
      return { key: k, label: monthLabel(k), value: s.t ? Math.round((s.c / s.t) * 1000) / 10 : null, total: s.t, goal: goals.review };
    })
    .filter((m, i, arr) => m.value !== null || arr.slice(0, i).some((x) => x.value !== null) || i === arr.length - 1);
  const examEvolution = months
    .map((k) => {
      const es = examsAll.filter((e) => examPct(e) !== undefined && (e.date || '').startsWith(k));
      return { key: k, label: monthLabel(k), value: es.length ? Math.round((es.reduce((a, e) => a + examPct(e)!, 0) / es.length) * 10) / 10 : null, total: es.length, goal: goals.exam };
    })
    .filter((m, i, arr) => m.value !== null || arr.slice(0, i).some((x) => x.value !== null) || i === arr.length - 1);
  const hits = (arr: Array<{ value: number | null; goal: number }>) => {
    const withData = arr.filter((m) => m.value !== null);
    return { hit: withData.filter((m) => (m.value as number) >= m.goal).length, of: withData.length, lastHit: withData.length ? (withData[withData.length - 1].value as number) >= withData[withData.length - 1].goal : undefined };
  };

  // ---- % por grande área (período) ----
  const areaMap = new Map<string, { id: string; label: string; color: string; t: number; c: number }>();
  logs.forEach((q) => {
    const a = areaOfSubject(subOfLog(q));
    const e = areaMap.get(a.id) || { id: a.id, label: a.id, color: a.color, t: 0, c: 0 };
    e.t += q.total;
    e.c += q.correct;
    areaMap.set(a.id, e);
  });
  const areaBars = [...areaMap.values()].map((a) => ({ ...a, value: Math.round((a.c / a.t) * 1000) / 10 })).sort((a, b) => b.t - a.t);

  // ---- Horas por dia ----
  const sessions = d.studySessions.filter((s) => (area === 'all' ? true : !!s.subjectId && areaOk(subById.get(s.subjectId))));
  const minutesByDay = new Map<string, number>();
  sessions.forEach((s) => minutesByDay.set(sessionDate(s), (minutesByDay.get(sessionDate(s)) || 0) + s.durationMinutes));
  const hoursSeries: Array<{ key: string; label: string; hours: number }> = [];
  const firstSession = [...minutesByDay.keys()].sort()[0];
  const hStart = r.start || (firstSession && firstSession > addDaysYMD(-89) ? firstSession : addDaysYMD(-29));
  const span = Math.round((new Date(r.end + 'T12:00').getTime() - new Date(hStart + 'T12:00').getTime()) / 86400000) + 1;
  if (span <= 45) {
    for (let i = 0; i < span; i++) {
      const k = addDaysYMD(i, hStart);
      hoursSeries.push({ key: k, label: `${k.slice(8, 10)}/${k.slice(5, 7)}`, hours: Math.round(((minutesByDay.get(k) || 0) / 60) * 10) / 10 });
    }
  } else {
    // períodos longos: soma por semana
    for (let i = 0; i < span; i += 7) {
      const k = addDaysYMD(i, hStart);
      let m = 0;
      for (let j = 0; j < 7; j++) m += minutesByDay.get(addDaysYMD(i + j, hStart)) || 0;
      hoursSeries.push({ key: k, label: `sem ${k.slice(8, 10)}/${k.slice(5, 7)}`, hours: Math.round((m / 60) * 10) / 10 });
    }
  }
  const studiedDays = [...minutesByDay.entries()].filter(([k, m]) => m > 0 && inRange(k, hStart, r.end));
  const totalMinutes = studiedDays.reduce((a, [, m]) => a + m, 0);
  const avgHoursPerStudiedDay = studiedDays.length ? totalMinutes / 60 / studiedDays.length : 0;

  // ---- Tabela por grande área → subcategoria → bloco ----
  type Row = { key: string; label: string; color?: string; reviews: number; t: number; c: number; lastPct?: number; lastDate?: string; children?: Row[] };
  const reviewsOfBlock = (b: TopicBlock) => (b.reviewLog || []).filter((x) => inRange(x.date, r.start, r.end)).length;
  const lastOf = (arr: QuestionLog[]) => {
    const l = [...arr].sort((a, b) => a.date.localeCompare(b.date)).pop();
    return l ? { lastPct: pct(l.correct, l.total), lastDate: l.date } : {};
  };
  const tableAreas = (area === 'all' ? MEDICAL_AREAS : MEDICAL_AREAS.filter((a) => a.id === area)).map((a) => {
    const subs = d.subjects.filter((s) => areaOfSubject(s).id === a.id && (!d.currentSemester || period !== 'semester' || !s.semesterId || s.semesterId === d.currentSemester.id));
    const groups = new Map<string, Subject[]>();
    subs.forEach((s) => groups.set(groupOfSubject(s), [...(groups.get(groupOfSubject(s)) || []), s]));
    const children: Row[] = [...groups.entries()].map(([g, list]) => {
      const ids = new Set(list.map((s) => s.id));
      const gl = logs.filter((q) => ids.has(subOfLog(q)?.id || ''));
      const blocks = d.topicBlocks.filter((b) => ids.has(b.subjectId));
      const bRows: Row[] = blocks.map((b) => {
        const bl = logs.filter((q) => q.blockId === b.id);
        const s = sum(bl);
        return { key: b.id, label: b.name, reviews: reviewsOfBlock(b), t: s.t, c: s.c, ...lastOf(bl) };
      });
      const s = sum(gl);
      return { key: g, label: g, reviews: blocks.reduce((x, b) => x + reviewsOfBlock(b), 0), t: s.t, c: s.c, ...lastOf(gl), children: bRows };
    });
    const al = logs.filter((q) => areaOfSubject(subOfLog(q)).id === a.id);
    const s = sum(al);
    return { key: a.id, label: a.id, color: a.color, reviews: children.reduce((x, c) => x + c.reviews, 0), t: s.t, c: s.c, ...lastOf(al), children } as Row;
  });

  // ---- Ponto fraco (≥ 10 questões no período; senão nos últimos 60 dias) ----
  const weakSource = cur.t >= 10 ? logs : logsAll.filter((q) => q.date >= addDaysYMD(-59));
  const bySub = new Map<string, { sub: Subject; t: number; c: number }>();
  weakSource.forEach((q) => {
    const s = subOfLog(q);
    if (!s) return;
    const e = bySub.get(s.id) || { sub: s, t: 0, c: 0 };
    e.t += q.total;
    e.c += q.correct;
    bySub.set(s.id, e);
  });
  const weakest = [...bySub.values()].filter((x) => x.t >= 10).sort((a, b) => a.c / a.t - b.c / b.t)[0];
  let weakPoint: { subject: Subject; pct: number; total: number; block?: TopicBlock; goal: number } | undefined;
  if (weakest && (weakest.c / weakest.t) * 100 < goals.review) {
    const blocks = d.topicBlocks.filter((b) => b.subjectId === weakest.sub.id && b.reviewStatus !== 'estudando');
    const blockPct = (b: TopicBlock) => {
      const s = sum(weakSource.filter((q) => q.blockId === b.id));
      return s.t ? s.c / s.t : 1;
    };
    const block = [...blocks].sort((a, b) => blockPct(a) - blockPct(b) || (a.nextReviewDate || '9').localeCompare(b.nextReviewDate || '9'))[0];
    weakPoint = { subject: weakest.sub, pct: Math.round((weakest.c / weakest.t) * 100), total: weakest.t, block, goal: goals.review };
  }

  // ---- Constância: últimas 26 semanas ----
  const activity = new Map<string, number>(minutesByDay);
  d.questionLogs.forEach((q) => activity.set(q.date, (activity.get(q.date) || 0) + 0.0001)); // dia com questões conta como estudado
  const heatWeeks: Array<Array<{ date: string; minutes: number; future: boolean }>> = [];
  const today = ymd(new Date());
  const dow = (new Date().getDay() + 6) % 7; // segunda = 0
  const startHeat = addDaysYMD(-(25 * 7 + dow), today);
  for (let w = 0; w < 26; w++) {
    const col = [];
    for (let i = 0; i < 7; i++) {
      const k = addDaysYMD(w * 7 + i, startHeat);
      col.push({ date: k, minutes: activity.get(k) || 0, future: k > today });
    }
    heatWeeks.push(col);
  }
  const activeDays90 = [...activity.entries()].filter(([k, m]) => m > 0 && k >= addDaysYMD(-89, today)).length;

  return {
    range: r,
    questions: { total: cur.t, correct: cur.c, pct: pct(cur.c, cur.t), prevTotal: prev.t, prevPct: pct(prev.c, prev.t), hasPrev: !!r.prevStart },
    exams: { avg: examAvg, count: examsDone.length },
    goals: { reviewPct: pct(monthLogs.c, monthLogs.t), examPct: monthExamAvg, review: goals.review, exam: goals.exam },
    reviewEvolution,
    examEvolution,
    reviewHits: hits(reviewEvolution),
    examHits: hits(examEvolution),
    areaBars,
    hoursSeries,
    avgHoursPerStudiedDay,
    totalHours: totalMinutes / 60,
    table: tableAreas,
    weakPoint,
    heatWeeks,
    activeDays90,
  };
};

export type Dashboard = ReturnType<typeof buildDashboard>;
