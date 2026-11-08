// Ajudantes da aba Semestre (provas + grade de horários)
import { Exam, ScheduleClass, Subject } from '../../types';
import { WEEK_DAYS, examDisplayTitle, getExamSubjectName } from '../../data/planning';

/** Horário de término da prova (campo extra salvo junto da prova; `time` continua sendo o início "HH:MM") */
export type ExamWithEnd = Exam & { endTime?: string };
export const examEndTime = (exam: Exam) => (exam as ExamWithEnd).endTime;

/** "08:00–10:00", "08:00" ou "" */
export const examTimeRange = (exam: Exam) => {
  const end = examEndTime(exam);
  if (!exam.time) return '';
  return end ? `${exam.time}–${end}` : exam.time;
};

/** Título automático antigo ("Prova Escrita · Cardiologia") não conta como nome dado pelo aluno */
const isAutoTitle = (exam: Exam) => {
  const t = (exam.title || '').trim();
  if (!t) return true;
  const subj = (exam.subjectName || exam.link?.label || '').trim();
  return t === `${exam.type} · ${subj}` || t === subj;
};

/** Nome principal da prova: o que o aluno deu; senão a disciplina */
export const examMainTitle = (exam: Exam, subjects: Subject[]) =>
  isAutoTitle(exam) ? getExamSubjectName(exam, subjects).replace('Sem disciplina', '') || examDisplayTitle({ ...exam, title: '' }) : examDisplayTitle(exam);

/** Subtítulo: a disciplina (só quando o aluno deu um nome próprio à prova) */
export const examSubtitle = (exam: Exam, subjects: Subject[]) => {
  if (isAutoTitle(exam)) return '';
  const s = getExamSubjectName(exam, subjects);
  return s === 'Sem disciplina' ? '' : s;
};

/** "toda segunda", "todo sábado" */
export const everyWeekdayLabel = (dayNum: number) => {
  const d = WEEK_DAYS.find((w) => w.num === dayNum);
  if (!d) return 'toda semana';
  const name = d.name.replace('-feira', '').toLowerCase();
  return dayNum >= 6 ? `todo ${name}` : `toda ${name}`;
};

/** Tipo de repetição de uma atividade */
export const activityKind = (sc: ScheduleClass): 'weekly' | 'once' | 'period' =>
  sc.date ? (sc.endDate && sc.endDate > sc.date ? 'period' : 'once') : 'weekly';

export const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
