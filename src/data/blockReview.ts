// Revisões por BLOCO (tema), seguindo o Guia Científico de Estudo:
// Dia 0 = estudo inicial (todos os tópicos vistos) → R1 em 24 h → R2 no dia 7 → R3 no dia 30 →
// R4 por volta do dia 75 → depois a cada poucos meses. Foi mal: o próximo intervalo encurta;
// foi muito bem: alonga. Cada etapa tem uma técnica de recuperação ativa (ver studyMethod.ts).
import { Topic, TopicBlock, TopicDifficulty } from '../types';

/** A partir da R4 o tema está consolidado ("dominado"), mas continua em manutenção */
export const BLOCK_REVIEWS_TO_MASTER = 4;
export const REVIEW_GROUP_SIZE = BLOCK_REVIEWS_TO_MASTER;

/** Bloco que já fez as 4 revisões iniciais (R1–R4) */
export const isBlockMastered = (b: { reviewsDone: number; reviewStatus: string }) =>
  b.reviewStatus !== 'estudando' && b.reviewsDone >= BLOCK_REVIEWS_TO_MASTER;

/** Ciclos completos de 4 revisões */
export const completedCycles = (b: { reviewsDone: number }) => Math.floor(b.reviewsDone / BLOCK_REVIEWS_TO_MASTER);

/** 1ª revisão (índice 0) do ciclo em que está a próxima revisão */
export const currentGroupStart = (done: number) => Math.floor(done / BLOCK_REVIEWS_TO_MASTER) * BLOCK_REVIEWS_TO_MASTER;

/** 1ª revisão: 24 h depois do estudo inicial (a mais valiosa, segundo a curva do esquecimento) */
export const FIRST_REVIEW_DAY = 1;

/** Dia (contado do Dia 0) em que cada revisão cai quando tudo vai "Médio": R1 1, R2 7, R3 30, R4 75 */
export const REVIEW_TARGET_DAYS = [1, 7, 30, 75];

/** Intervalo base até a próxima revisão depois de concluir `done` revisões (done = 0 é o Dia 0) */
export const baseIntervalDays = (done: number, longTerm = false) => {
  if (done <= 0) return 1;
  if (done === 1) return 6;
  if (done === 2) return 23;
  if (done === 3) return 45;
  const cap = longTerm ? 180 : 120;
  return Math.min(cap, Math.round(45 * Math.pow(2, done - 3)));
};

/** Fator pelo desempenho: Difícil encurta, Fácil alonga */
export const DIFFICULTY_FACTOR: Record<TopicDifficulty, number> = { dificil: 0.5, medio: 1, facil: 1.4 };

/** Dias até a próxima revisão depois de concluir `done` revisões com esta avaliação */
export const nextIntervalDays = (difficulty: TopicDifficulty, done: number, longTerm = false) =>
  Math.min(longTerm ? 180 : 120, Math.max(1, Math.round(baseIntervalDays(done, longTerm) * DIFFICULTY_FACTOR[difficulty])));

/** Tabela para mostrar ao aluno: intervalo após R1, R2, R3 e R4 por avaliação (sem a 1ª, que é sempre 24 h) */
export const REVIEW_INTERVALS: Record<TopicDifficulty, number[]> = {
  dificil: [FIRST_REVIEW_DAY, nextIntervalDays('dificil', 1), nextIntervalDays('dificil', 2), nextIntervalDays('dificil', 3)],
  medio: [FIRST_REVIEW_DAY, nextIntervalDays('medio', 1), nextIntervalDays('medio', 2), nextIntervalDays('medio', 3)],
  facil: [FIRST_REVIEW_DAY, nextIntervalDays('facil', 1), nextIntervalDays('facil', 2), nextIntervalDays('facil', 3)],
};

/**
 * Data da próxima revisão. Se cair no dia de descanso, vai para o dia seguinte
 * (revisar um pouco tarde rende mais do que revisar cedo demais).
 */
export const scheduleReviewDate = (days: number, opts: { from?: Date | string; restDay?: number | null } = {}) => {
  const d = opts.from ? (typeof opts.from === 'string' ? parseYMD(opts.from) : new Date(opts.from)) : new Date();
  d.setDate(d.getDate() + days);
  if (opts.restDay !== undefined && opts.restDay !== null && d.getDay() === opts.restDay) d.setDate(d.getDate() + 1);
  return ymd(d);
};

export interface ReviewPlan {
  id: TopicDifficulty;
  label: string;
  emoji: string;
  color: string;
  questions: number;
  steps: string[];
}

// Avaliação da revisão (Difícil / Médio / Fácil). Os passos são sempre de recuperação ativa (nunca reler).
export const REVIEW_PLANS: Record<TopicDifficulty, ReviewPlan> = {
  facil: { id: 'facil', label: 'Fácil', emoji: '🟢', color: '#16a34a', questions: 15, steps: ['15 questões'] },
  medio: { id: 'medio', label: 'Médio', emoji: '🟡', color: '#d97706', questions: 20, steps: ['Folha em branco do tema', '20 questões'] },
  dificil: {
    id: 'dificil',
    label: 'Difícil',
    emoji: '🔴',
    color: '#e11d48',
    questions: 30,
    steps: ['Reexplique o mecanismo que travou (Feynman)', '30 questões'],
  },
};

export const PLAN_ORDER: TopicDifficulty[] = ['dificil', 'medio', 'facil'];

/** @deprecated use reviewTechnique() de studyMethod.ts. Mantido para telas antigas. */
export const suggestedPlan = (block: TopicBlock): ReviewPlan | undefined =>
  block.reviewsDone > 0 && block.difficulty ? REVIEW_PLANS[block.difficulty] : undefined;

/** Sugestão de dificuldade pelo desempenho nas questões */
export const difficultyFromScore = (correct: number, total: number): TopicDifficulty | undefined => {
  if (!total || total <= 0) return undefined;
  const pct = correct / total;
  if (pct >= 0.8) return 'facil';
  if (pct >= 0.6) return 'medio';
  return 'dificil';
};

export const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const addDaysYMD = (days: number, from: Date | string = new Date()) => {
  const d = typeof from === 'string' ? parseYMD(from) : new Date(from);
  d.setDate(d.getDate() + days);
  return ymd(d);
};

export const parseYMD = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
};

/** Dias de b menos a (YYYY-MM-DD) */
export const daysBetween = (a: string, b: string) => Math.round((parseYMD(b).getTime() - parseYMD(a).getTime()) / 86400000);

export const formatDM = (s?: string) => {
  if (!s) return '';
  const [, m, d] = s.split('-');
  return `${d}/${m}`;
};

/** Dia do ciclo (Dia 0 = conclusão do bloco) em que cai uma data */
export const cycleDay = (block: TopicBlock, date?: string) =>
  block.completedDate && date ? Math.round((parseYMD(date).getTime() - parseYMD(block.completedDate).getTime()) / 86400000) : undefined;

export const isTopicSeen = (t: Topic) => t.status !== 'nao_iniciado';

/** Pendente ("ver depois"): ainda não visto, mas não segura o bloco fora das revisões */
export const isTopicPending = (t: Topic) => !!t.pending && !isTopicSeen(t);

/** Visto ou marcado para ver depois: é o que fecha o bloco (Dia 0) */
export const isTopicResolved = (t: Topic) => isTopicSeen(t) || isTopicPending(t);

export const isBlockDue = (block: TopicBlock, todayStr = ymd(new Date())) =>
  block.reviewStatus === 'revisao' && !!block.nextReviewDate && block.nextReviewDate <= todayStr;

/** Dias de atraso de uma revisão (0 = hoje ou ainda não venceu) */
export const overdueDays = (block: TopicBlock, todayStr = ymd(new Date())) =>
  block.reviewStatus === 'revisao' && block.nextReviewDate && block.nextReviewDate < todayStr ? daysBetween(block.nextReviewDate, todayStr) : 0;
