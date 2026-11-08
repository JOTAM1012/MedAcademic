// Contas dos cartões do Painel: agrupar disciplinas (grande área ou módulo), progresso e acertos.
import type { QuestionLog, Subject, Topic, TopicBlock } from '../../types';
import type { StudyPhase } from '../../data/studyMethod';
import { MEDICAL_AREAS, OTHER_AREA } from '../../data/areas';
import { areaOfSubject } from '../../data/dashboardMetrics';
import { FORMAT_ORDER, SUBJECT_FORMATS, getSubjectFormat, subjectFormatOf } from '../../data/subjectFormats';
import { isTopicSeen } from '../../data/blockReview';

export type GroupMode = 'area' | 'module';
export type GroupPref = 'auto' | 'area' | 'module' | undefined;

export const slug = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** 'auto': grandes áreas no clínico/internato (se as disciplinas tiverem área), módulos no básico */
export const resolveGroupMode = (pref: GroupPref, phase: StudyPhase, subjects: Subject[]): GroupMode => {
  if (pref === 'area' || pref === 'module') return pref;
  if (phase === 'ciclo_basico') return 'module';
  if (subjects.length && !subjects.some((s) => areaOfSubject(s).id !== OTHER_AREA.id)) return 'module';
  return 'area';
};

export interface SubjectGroup {
  key: string;
  label: string;
  emoji?: string;
  color: string;
  subjects: Subject[];
  other?: boolean;
}

/** Grupos na ordem da aba Disciplinas (vazios incluídos; quem usa decide se mostra) */
export const groupSubjects = (subjects: Subject[], mode: GroupMode, phase: StudyPhase): SubjectGroup[] => {
  if (mode === 'area') {
    return [...MEDICAL_AREAS, OTHER_AREA].map((a) => ({
      key: a.id,
      label: a.id === OTHER_AREA.id ? 'Outras disciplinas' : a.id,
      color: a.color,
      subjects: subjects.filter((s) => areaOfSubject(s).id === a.id),
      other: a.id === OTHER_AREA.id,
    }));
  }
  const order = phase === 'internato' ? SUBJECT_FORMATS.map((f) => f.id) : FORMAT_ORDER[phase];
  return order.map((id) => {
    const f = getSubjectFormat(id);
    return {
      key: f.id,
      label: f.id === 'personalizada' ? 'Disciplinas' : f.label,
      emoji: f.emoji,
      color: f.color,
      subjects: subjects.filter((s) => subjectFormatOf(s).id === f.id),
    };
  });
};


export interface Progress {
  topics: number;
  seen: number;
  blocks: number;
  blocksDone: number;
  pct: number;
}

const pctOf = (p: Omit<Progress, 'pct'>) => {
  const total = p.topics + p.blocks;
  return total ? Math.round(((p.seen + p.blocksDone) / total) * 100) : 0;
};

/** Progresso = (assuntos vistos + blocos concluídos/em revisão) ÷ (assuntos + blocos) */
export const subjectProgress = (sub: Subject, topics: Topic[], blocks: TopicBlock[]): Progress => {
  const ts = topics.filter((t) => t.subjectId === sub.id);
  const bs = blocks.filter((b) => b.subjectId === sub.id);
  const p = { topics: ts.length, seen: ts.filter(isTopicSeen).length, blocks: bs.length, blocksDone: bs.filter((b) => b.reviewStatus !== 'estudando').length };
  return { ...p, pct: pctOf(p) };
};

export const sumProgress = (list: Progress[]): Progress => {
  const p = list.reduce((a, x) => ({ topics: a.topics + x.topics, seen: a.seen + x.seen, blocks: a.blocks + x.blocks, blocksDone: a.blocksDone + x.blocksDone }), {
    topics: 0,
    seen: 0,
    blocks: 0,
    blocksDone: 0,
  });
  return { ...p, pct: pctOf(p) };
};

/** Disciplina de um registro de questões (direta ou pelo bloco) */
export const subjectOfLogFactory = (subjects: Subject[], blocks: TopicBlock[]) => {
  const subById = new Map(subjects.map((s) => [s.id, s]));
  const blockById = new Map(blocks.map((b) => [b.id, b]));
  return (q: QuestionLog) => subById.get(q.subjectId || (q.blockId ? blockById.get(q.blockId)?.subjectId || '' : ''));
};

export const sumLogs = (arr: QuestionLog[]) => arr.reduce((a, q) => ({ t: a.t + (q.total || 0), c: a.c + (q.correct || 0) }), { t: 0, c: 0 });

export const fmtPct = (v?: number) => (v === undefined ? '—' : `${Math.round(v)}%`);

/** Cor do % de acerto em relação à meta */
export const goalTone = (v: number | undefined, goal: number) =>
  v === undefined
    ? 'text-slate-400 dark:text-slate-500'
    : v >= goal
      ? 'text-emerald-600 dark:text-emerald-400'
      : v >= goal - 15
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-rose-600 dark:text-rose-400';

export const goalBar = (v: number | undefined, goal: number) => (v === undefined ? '#94a3b8' : v >= goal ? '#10b981' : v >= goal - 15 ? '#f59e0b' : '#f43f5e');

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
