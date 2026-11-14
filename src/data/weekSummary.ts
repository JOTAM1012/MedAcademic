// Resumo da semana (segunda até hoje): horas de foco, questões, revisões, temas novos e dias estudados.
// Função pura: quem chama passa os dados e o número de revisões atrasadas.
import type { QuestionLog, StudySession, TopicBlock } from '../types';
import { addDaysYMD, daysBetween, ymd } from './blockReview';
import { sessionDate, weekStart } from './studyMethod';

export interface WeekDay {
  date: string;
  label: string;
  studied: boolean;
  future: boolean;
  today: boolean;
}

export interface WeekSummary {
  start: string;
  today: string;
  isSunday: boolean;
  minutes: number;
  /** Minutos da semana passada, nos mesmos dias (seg até o mesmo dia da semana) */
  lastWeekMinutes: number;
  questions: number;
  correct: number;
  /** % de acertos (undefined se não fez questões) */
  accuracy?: number;
  reviewsDone: number;
  overdue: number;
  newTopics: number;
  days: WeekDay[];
  daysStudied: number;
  feedback: string;
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

/** 250 → "4h10"; 40 → "40 min"; 120 → "2h" */
export const fmtFocus = (min: number) => {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`;
};

/** Diferença com a semana passada: "+1h20 que a semana passada", "−40 min que a semana passada" */
export const fmtFocusDelta = (cur: number, prev: number) => {
  const d = Math.round(cur - prev);
  if (d === 0) return 'Igual à semana passada';
  return `${d > 0 ? '+' : '−'}${fmtFocus(Math.abs(d))} que a semana passada`;
};

const inWeek = (d: string | undefined, start: string, end: string) => !!d && d >= start && d <= end;

export const buildWeekSummary = (input: {
  studySessions: StudySession[];
  questionLogs: QuestionLog[];
  topicBlocks: TopicBlock[];
  overdue: number;
  today?: string;
}): WeekSummary => {
  const today = input.today || ymd(new Date());
  const start = weekStart(today);
  const elapsed = daysBetween(start, today); // 0 = segunda
  const prevStart = addDaysYMD(-7, start);
  const prevEnd = addDaysYMD(elapsed, prevStart);

  // Minutos por dia (igual ao cartão "Constância da semana")
  const minutesByDay = new Map<string, number>();
  input.studySessions.forEach((s) => {
    const k = sessionDate(s);
    minutesByDay.set(k, (minutesByDay.get(k) || 0) + (s.durationMinutes || 0));
  });
  let minutes = 0;
  let lastWeekMinutes = 0;
  minutesByDay.forEach((m, k) => {
    if (inWeek(k, start, today)) minutes += m;
    else if (inWeek(k, prevStart, prevEnd)) lastWeekMinutes += m;
  });

  const weekLogs = input.questionLogs.filter((q) => inWeek(q.date, start, today));
  const questions = weekLogs.reduce((a, q) => a + (q.total || 0), 0);
  const correct = weekLogs.reduce((a, q) => a + (q.correct || 0), 0);
  const accuracy = questions ? (correct / questions) * 100 : undefined;
  const questionDays = new Set(weekLogs.map((q) => q.date));

  let reviewsDone = 0;
  let newTopics = 0;
  input.topicBlocks.forEach((b) => {
    reviewsDone += (b.reviewLog || []).filter((r) => inWeek(r.date, start, today)).length;
    if (inWeek(b.completedDate, start, today)) newTopics += 1;
  });

  const days: WeekDay[] = DAY_LABELS.map((label, i) => {
    const date = addDaysYMD(i, start);
    return {
      date,
      label,
      studied: date <= today && ((minutesByDay.get(date) || 0) > 0 || questionDays.has(date)),
      future: date > today,
      today: date === today,
    };
  });
  const daysStudied = days.filter((d) => d.studied).length;
  const isSunday = elapsed === 6;

  const nothing = minutes === 0 && questions === 0 && reviewsDone === 0 && newTopics === 0;
  let feedback: string;
  if (nothing) feedback = 'A semana ainda está em branco. Comece por uma revisão curta.';
  else if (input.overdue > 0)
    feedback = input.overdue === 1 ? 'Você tem 1 revisão atrasada. Comece por ela.' : `Você tem ${input.overdue} revisões atrasadas. Comece por elas.`;
  else if (accuracy !== undefined && questions >= 10 && accuracy < 60) feedback = 'Os acertos estão abaixo de 60%. Revise os erros antes de seguir.';
  else if (daysStudied >= Math.max(1, Math.ceil((elapsed + 1) * 0.7)) && minutes >= lastWeekMinutes)
    feedback = isSunday ? 'Boa semana. Descanse e planeje a próxima.' : 'Boa semana. Mantenha o ritmo.';
  else if (lastWeekMinutes - minutes >= 30) feedback = 'Semana mais leve que a passada. Um bloco de foco já ajuda.';
  else feedback = 'Bom começo. Tente estudar um pouco todo dia.';

  return {
    start,
    today,
    isSunday,
    minutes,
    lastWeekMinutes,
    questions,
    correct,
    accuracy,
    reviewsDone,
    overdue: input.overdue,
    newTopics,
    days,
    daysStudied,
    feedback,
  };
};
