// Assuntos da prova: check list por assunto (questões, ler/fazer resumo, aula, revisar), progresso
// e lembretes (30/15/7/3/1 dias antes) quando o aluno ainda não começou.
import type { Exam, ExamTaskKind, ExamTopic, Subject, Topic, TopicBlock, PersonalProject } from '../types';
import { addDaysYMD, daysBetween, ymd } from './blockReview';

export const EXAM_TASKS: Record<ExamTaskKind, { label: string; short: string; emoji: string; step: (topic: string, q?: number) => string }> = {
  questoes: { label: 'Questões', short: 'Questões', emoji: '🎯', step: (t, q) => `Fazer ${q || 10} questões de ${t}, sem consultar` },
  ler_resumo: { label: 'Ler o resumo', short: 'Ler resumo', emoji: '📖', step: (t) => `Ler o resumo de ${t} tentando lembrar antes de cada parte` },
  fazer_resumo: { label: 'Fazer o resumo', short: 'Fazer resumo', emoji: '✍️', step: (t) => `Fazer o resumo de ${t} com as próprias palavras` },
  aula: { label: 'Assistir aula', short: 'Aula', emoji: '🎬', step: (t) => `Assistir a aula de ${t}, pausando para anotar de memória` },
  revisar: { label: 'Revisar', short: 'Revisar', emoji: '🔁', step: (t) => `Revisar ${t}: folha em branco e conferir` },
};
export const EXAM_TASK_ORDER: ExamTaskKind[] = ['aula', 'fazer_resumo', 'ler_resumo', 'questoes', 'revisar'];
export const DEFAULT_EXAM_TASKS: ExamTaskKind[] = ['ler_resumo', 'questoes', 'revisar'];
export const DEFAULT_TOPIC_QUESTIONS = 10;

/** Dias antes da prova em que o site lembra (se ainda não começou) */
export const EXAM_REMINDER_DAYS = [30, 15, 7, 3, 1];

export const newExamTopicId = () => 'etp-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

export const examTaskKinds = (exam: Pick<Exam, 'topicTasks'>): ExamTaskKind[] =>
  exam.topicTasks && exam.topicTasks.length ? EXAM_TASK_ORDER.filter((k) => exam.topicTasks!.includes(k)) : DEFAULT_EXAM_TASKS;

/** Um assunto está feito quando todas as tarefas escolhidas estão marcadas */
export const isExamTopicDone = (exam: Pick<Exam, 'topicTasks'>, t: ExamTopic) => examTaskKinds(exam).every((k) => !!t.done?.[k]);

/** Progresso da prova: tarefas feitas / total */
export const examProgress = (exam: Pick<Exam, 'topicTasks' | 'examTopics'>) => {
  const kinds = examTaskKinds(exam);
  const topics = exam.examTopics || [];
  const total = topics.length * kinds.length;
  const done = topics.reduce((a, t) => a + kinds.filter((k) => t.done?.[k]).length, 0);
  const topicsDone = topics.filter((t) => isExamTopicDone(exam, t)).length;
  return { total, done, pct: total ? Math.round((done / total) * 100) : 0, topics: topics.length, topicsDone };
};

/** Já começou a estudar para a prova? (alguma tarefa marcada) */
export const examStarted = (exam: Pick<Exam, 'topicTasks' | 'examTopics'>) => examProgress(exam).done > 0;

/** Próximo assunto e tarefa a fazer (na ordem: aula → fazer resumo → ler → questões → revisar) */
export const nextExamStep = (exam: Exam): { topic: ExamTopic; task: ExamTaskKind } | undefined => {
  const kinds = examTaskKinds(exam);
  for (const k of kinds) {
    const t = (exam.examTopics || []).find((x) => !x.done?.[k]);
    if (t) return { topic: t, task: k };
  }
  return undefined;
};

/** Provas futuras (sem nota) ordenadas pela data */
export const upcomingExams = (exams: Exam[], today = ymd(new Date()), withinDays = 60) =>
  exams
    .filter((e) => e.grade === undefined && e.date >= today && daysBetween(today, e.date) <= withinDays)
    .sort((a, b) => a.date.localeCompare(b.date));

/**
 * Lembrete de hoje para uma prova: se faltam 30/15/7/3/1 dias (ou menos de 7 e nada feito) e o aluno
 * ainda não começou os assuntos. Devolve os dias que faltam ou undefined.
 */
export const examReminderToday = (exam: Exam, today = ymd(new Date())): number | undefined => {
  if (exam.remindersOff || exam.grade !== undefined || exam.date < today) return undefined;
  const left = daysBetween(today, exam.date);
  if (examStarted(exam)) return undefined;
  if (EXAM_REMINDER_DAYS.includes(left)) return left;
  return undefined;
};

/** Texto curto do lembrete */
export const examReminderText = (exam: Exam, left: number) => {
  const when = left === 0 ? 'hoje' : left === 1 ? 'amanhã' : `em ${left} dias`;
  const hasTopics = (exam.examTopics || []).length > 0;
  return hasTopics
    ? `Prova ${when}: ${exam.title || exam.subjectName || 'prova'}. Você ainda não marcou nenhum assunto. Que tal começar hoje?`
    : `Prova ${when}: ${exam.title || exam.subjectName || 'prova'}. Liste os assuntos para o site montar o check list e encaixar na rotina.`;
};

/**
 * Assuntos a partir de um vínculo com Disciplinas: disciplina → blocos (ou matérias do checklist);
 * bloco → tópicos; tópico → ele mesmo; estudo pessoal → itens.
 */
export const topicsFromSource = (
  source: NonNullable<ExamTopic['source']>,
  data: { subjects: Subject[]; topicBlocks: TopicBlock[]; topics: Topic[]; projects: PersonalProject[] }
): ExamTopic[] => {
  const mk = (title: string, src: ExamTopic['source']): ExamTopic => ({ id: newExamTopicId() + Math.random().toString(36).slice(2, 4), title, source: src });
  if (source.kind === 'subject') {
    const s = data.subjects.find((x) => x.id === source.id);
    if (!s) return [];
    const blocks = data.topicBlocks.filter((b) => b.subjectId === s.id);
    if (blocks.length) return blocks.map((b) => mk(b.name, { kind: 'block', id: b.id }));
    const mods = Array.from(new Set(data.topics.filter((t) => t.subjectId === s.id).map((t) => t.moduleName || '').filter(Boolean)));
    if (mods.length) return mods.map((m) => mk(m, { kind: 'subject', id: s.id }));
    return data.topics.filter((t) => t.subjectId === s.id).map((t) => mk(t.title, { kind: 'topic', id: t.id }));
  }
  if (source.kind === 'block') {
    const b = data.topicBlocks.find((x) => x.id === source.id);
    if (!b) return [];
    const ts = data.topics.filter((t) => t.blockId === b.id);
    return ts.length ? ts.map((t) => mk(t.title, { kind: 'topic', id: t.id })) : [mk(b.name, { kind: 'block', id: b.id })];
  }
  if (source.kind === 'topic') {
    const t = data.topics.find((x) => x.id === source.id);
    return t ? [mk(t.title, { kind: 'topic', id: t.id })] : [];
  }
  if (source.kind === 'project') {
    const p = data.projects.find((x) => x.id === source.id);
    return p ? p.items.map((i) => mk(i.title, { kind: 'project', id: p.id })) : [];
  }
  return [];
};

/** Data limite sugerida para terminar os assuntos (2 dias antes da prova, para revisar) */
export const examTopicsDeadline = (exam: Pick<Exam, 'date'>) => addDaysYMD(-2, exam.date);
