// Revisões por BLOCO. Quando todos os tópicos de um bloco são vistos, aquele dia é o Dia 0 e a
// 1ª revisão fica para o Dia 7. Depois de cada revisão o usuário avalia (Difícil/Médio/Fácil):
// a avaliação define a data da próxima revisão e o plano sugerido para esse dia.
// As revisões seguem em ciclos de 4 (R1–R4, R5–R8, ...): não há fim, a cada ciclo o intervalo é o maior.
import { Topic, TopicBlock, TopicDifficulty } from '../types';

/** Tamanho de cada ciclo de revisões (R1–R4, R5–R8...) */
export const BLOCK_REVIEWS_TO_MASTER = 4;
export const REVIEW_GROUP_SIZE = BLOCK_REVIEWS_TO_MASTER;

/** Bloco que já completou pelo menos um ciclo de 4 revisões */
export const isBlockMastered = (b: { reviewsDone: number; reviewStatus: string }) =>
  b.reviewStatus !== 'estudando' && b.reviewsDone >= BLOCK_REVIEWS_TO_MASTER;

/** Ciclos completos de 4 revisões */
export const completedCycles = (b: { reviewsDone: number }) => Math.floor(b.reviewsDone / BLOCK_REVIEWS_TO_MASTER);

/** 1ª revisão (índice 0) do ciclo em que está a próxima revisão */
export const currentGroupStart = (done: number) => Math.floor(done / BLOCK_REVIEWS_TO_MASTER) * BLOCK_REVIEWS_TO_MASTER;
export const FIRST_REVIEW_DAY = 7;

// Dias até a revisão nº (feitas + 1). A 1ª é sempre no Dia 7; as seguintes dependem da avaliação.
export const REVIEW_INTERVALS: Record<TopicDifficulty, number[]> = {
  dificil: [FIRST_REVIEW_DAY, 3, 7, 15],
  medio: [FIRST_REVIEW_DAY, 7, 15, 30],
  facil: [FIRST_REVIEW_DAY, 15, 30, 60],
};

/** Dias até a próxima revisão depois de concluir `done` revisões com esta avaliação */
export const nextIntervalDays = (difficulty: TopicDifficulty, done: number) =>
  REVIEW_INTERVALS[difficulty][Math.min(done, BLOCK_REVIEWS_TO_MASTER - 1)];

export interface ReviewPlan {
  id: TopicDifficulty;
  label: string;
  emoji: string;
  color: string;
  questions: number;
  steps: string[];
}

// Plano sugerido para a revisão agendada, conforme a avaliação da revisão anterior
export const REVIEW_PLANS: Record<TopicDifficulty, ReviewPlan> = {
  facil: { id: 'facil', label: 'Fácil', emoji: '🟢', color: '#16a34a', questions: 15, steps: ['15 questões'] },
  medio: { id: 'medio', label: 'Médio', emoji: '🟡', color: '#d97706', questions: 20, steps: ['Ler o resumo', '20 questões'] },
  dificil: {
    id: 'dificil',
    label: 'Difícil',
    emoji: '🔴',
    color: '#e11d48',
    questions: 30,
    steps: ['Revisar o resumo', 'Videoaula rápida', '30 questões'],
  },
};

export const PLAN_ORDER: TopicDifficulty[] = ['dificil', 'medio', 'facil'];

/** Plano da próxima revisão: só existe depois da 1ª avaliação (a revisão do Dia 7 é livre) */
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
