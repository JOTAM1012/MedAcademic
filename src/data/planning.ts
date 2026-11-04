// Catálogos compartilhados pela Grade de Semestre, Grade de Horários, Planner e Checklist.
import { Exam, ExamShift, ScheduleClass, Subject } from '../types';

// ---------- Grade de Semestre (provas) ----------

export const EXAM_KINDS = [
  { id: 'Prova Escrita', short: 'ESCRITA', color: '#2563eb' },
  { id: 'Prova Objetiva', short: 'OBJETIVA', color: '#0891b2' },
  { id: 'Escrita/Objetiva', short: 'MISTA', color: '#4f46e5' },
  { id: 'OSCE', short: 'OSCE', color: '#e11d48' },
  { id: 'Anatomia', short: 'ANATOMIA', color: '#ea580c' },
  { id: 'Simulado', short: 'SIMULADO', color: '#7c3aed' },
  { id: 'Multimídia', short: 'MULTIMÍDIA', color: '#db2777' },
  { id: 'Formativa', short: 'FORMATIVA', color: '#059669' },
] as const;

const LEGACY_EXAM_COLOR = '#64748b';

export type ExamFormat = 'questions' | 'grade' | 'mixed';

/** Como a prova é personalizada: por questões (objetiva, anatomia, simulado, multimídia),
 *  só nota (escrita, OSCE, formativa) ou mista (questões objetivas + discursivas) */
export const examFormat = (type?: string): ExamFormat => {
  const t = (type || '').toLowerCase();
  if (t.includes('/') || t.includes('mista')) return 'mixed';
  if (t.includes('objetiva') || t.includes('anatomia') || t.includes('simulado') || t.includes('multim')) return 'questions';
  return 'grade';
};

export const getExamKind = (type?: string) => {
  const found = EXAM_KINDS.find((k) => k.id.toLowerCase() === (type || '').toLowerCase());
  if (found) return found;
  const t = (type || '').toLowerCase();
  const byId = (id: string) => EXAM_KINDS.find((k) => k.id === id)!;
  if (t.includes('osce')) return byId('OSCE');
  if (t.includes('simulado')) return byId('Simulado');
  if (t.includes('objetiva')) return byId('Prova Objetiva');
  return { id: type || 'Prova', short: (type || 'PROVA').toUpperCase(), color: LEGACY_EXAM_COLOR };
};

export const EXAM_SHIFTS: Array<{ id: ExamShift; label: string; emoji: string; range: string }> = [
  { id: 'manha', label: 'Manhã', emoji: '🌅', range: '06h–12h' },
  { id: 'tarde', label: 'Tarde', emoji: '☀️', range: '12h–18h' },
  { id: 'noite', label: 'Noite', emoji: '🌙', range: '18h–24h' },
];

// Horário padrão de cada turno ao escolher o turno na Grade de Horários
export const SHIFT_DEFAULT_TIMES: Record<ExamShift, { start: string; end: string }> = {
  manha: { start: '07:00', end: '12:00' },
  tarde: { start: '13:00', end: '18:00' },
  noite: { start: '19:00', end: '22:00' },
};

export const shiftFromTime = (time?: string): ExamShift | undefined => {
  if (!time) return undefined;
  const h = Number(time.split(':')[0]);
  if (Number.isNaN(h)) return undefined;
  if (h < 12) return 'manha';
  if (h < 18) return 'tarde';
  return 'noite';
};

export const getExamShift = (exam: Pick<Exam, 'shift' | 'time'>) =>
  EXAM_SHIFTS.find((s) => s.id === (exam.shift || shiftFromTime(exam.time)));

/** Nome da disciplina da prova: texto livre (novo) ou disciplina cadastrada (legado) */
export const getExamSubjectName = (exam: Exam, subjects: Subject[]) => {
  if (exam.subjectName?.trim()) return exam.subjectName.trim();
  const sub = exam.subjectId ? subjects.find((s) => s.id === exam.subjectId) : undefined;
  return sub?.universitySubject || sub?.name || 'Sem disciplina';
};

// ---------- Grade de Horários (aulas e atividades) ----------

export const ACTIVITY_CATEGORIES = [
  { id: 'aula', label: 'Aula', emoji: '📚', color: '#2563eb' },
  { id: 'academia', label: 'Academia', emoji: '🏋️', color: '#16a34a' },
  { id: 'simposio', label: 'Simpósio', emoji: '🎤', color: '#9333ea' },
  { id: 'liga', label: 'Liga Acadêmica', emoji: '🩺', color: '#0d9488' },
  { id: 'congresso', label: 'Congresso', emoji: '🏛️', color: '#db2777' },
  { id: 'estudo', label: 'Estudo', emoji: '🧠', color: '#0284c7' },
  { id: 'plantao', label: 'Plantão / Estágio', emoji: '🏥', color: '#e11d48' },
  { id: 'outro', label: 'Outro', emoji: '📌', color: '#f59e0b' },
] as const;

export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

/** Categoria de uma atividade; itens antigos são inferidos pelo campo "type" */
export const getActivityCategory = (sc: Pick<ScheduleClass, 'category' | 'type' | 'subjectId'>): ActivityCategory => {
  const byId = ACTIVITY_CATEGORIES.find((c) => c.id === sc.category);
  if (byId) return byId;
  const t = (sc.type || '').toLowerCase();
  if (t.includes('plantão') || t.includes('internato') || t.includes('prática') || t.includes('ambulat')) return ACTIVITY_CATEGORIES[6];
  if (t.includes('estudo')) return ACTIVITY_CATEGORIES[5];
  if (t.includes('compromisso')) return ACTIVITY_CATEGORIES[7];
  return ACTIVITY_CATEGORIES[0];
};

export const WEEK_DAYS = [
  { num: 1, name: 'Segunda-feira', short: 'Seg' },
  { num: 2, name: 'Terça-feira', short: 'Ter' },
  { num: 3, name: 'Quarta-feira', short: 'Qua' },
  { num: 4, name: 'Quinta-feira', short: 'Qui' },
  { num: 5, name: 'Sexta-feira', short: 'Sex' },
  { num: 6, name: 'Sábado', short: 'Sáb' },
  { num: 7, name: 'Domingo', short: 'Dom' },
] as const;

/** 1 = segunda ... 7 = domingo, a partir de uma data YYYY-MM-DD */
export const dayOfWeekFromDate = (ymd: string) => {
  const [y, m, d] = ymd.split('-').map(Number);
  const js = new Date(y, m - 1, d).getDay();
  return (js === 0 ? 7 : js) as ScheduleClass['dayOfWeek'];
};

/** Atividade acontece nesta data? Recorrentes pelo dia da semana; data única só no dia */
export const occursOn = (sc: ScheduleClass, ymd: string, dayNum: number) =>
  sc.date ? sc.date === ymd : sc.dayOfWeek === dayNum;

export const durationHours = (start: string, end: string) => {
  const [h1, m1] = (start || '0:0').split(':').map(Number);
  const [h2, m2] = (end || '0:0').split(':').map(Number);
  return Math.max(0, (h2 * 60 + m2 - (h1 * 60 + m1)) / 60);
};

export const formatDateBR = (ymd?: string) => {
  if (!ymd) return '';
  const [y, m, d] = ymd.split('-');
  return d && m ? `${d}/${m}${y ? '/' + y : ''}` : ymd;
};

export const toYMD = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// ---------- Checklist ----------

export const CHECKLIST_COLORS = [
  '#2563eb',
  '#0d9488',
  '#16a34a',
  '#f59e0b',
  '#ea580c',
  '#e11d48',
  '#db2777',
  '#9333ea',
  '#64748b',
];

export const CHECKLIST_TEMPLATES: Array<{ name: string; emoji: string; color: string; items: string[] }> = [
  {
    name: 'Mala do plantão',
    emoji: '🎒',
    color: '#e11d48',
    items: ['Estetoscópio', 'Jaleco limpo', 'Crachá', 'Lanterna clínica', 'Carregador', 'Lanche e garrafa de água'],
  },
  {
    name: 'Véspera de prova',
    emoji: '📝',
    color: '#2563eb',
    items: ['Revisar resumos', 'Fazer questões antigas', 'Separar documento e caneta', 'Dormir cedo'],
  },
  {
    name: 'Rotina do dia',
    emoji: '☀️',
    color: '#f59e0b',
    items: ['Revisões do dia', 'Pomodoros de estudo', 'Atividade física', 'Organizar o planner de amanhã'],
  },
  {
    name: 'Temas para estudar',
    emoji: '📚',
    color: '#0d9488',
    items: [],
  },
];
