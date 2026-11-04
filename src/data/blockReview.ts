// Revisões por BLOCO: o bloco (ex.: "Diabetes", "Neonatologia 1") entra nas revisões quando todos os
// seus tópicos forem marcados como vistos. São 4 revisões espaçadas; na 4ª o bloco fica dominado.
import { Topic, TopicBlock, TopicDifficulty } from '../types';

export const BLOCK_REVIEWS_TO_MASTER = 4;
export const BLOCK_REVIEW_BASE_INTERVALS = [1, 7, 15, 30]; // dias até a revisão nº (feitas + 1)
export const DIFFICULTY_FACTOR: Record<TopicDifficulty, number> = { dificil: 0.5, medio: 1, facil: 1.5 };

export interface ReviewPlan {
  id: TopicDifficulty;
  label: string;
  emoji: string;
  color: string;
  questions: number;
  steps: string[];
}

// Plano sugerido para a revisão, conforme a dificuldade do bloco
export const REVIEW_PLANS: Record<TopicDifficulty, ReviewPlan> = {
  facil: {
    id: 'facil',
    label: 'Fácil',
    emoji: '🟢',
    color: '#16a34a',
    questions: 15,
    steps: ['Fazer 15 questões'],
  },
  medio: {
    id: 'medio',
    label: 'Médio',
    emoji: '🟡',
    color: '#d97706',
    questions: 20,
    steps: ['Ler o resumo', 'Fazer 20 questões'],
  },
  dificil: {
    id: 'dificil',
    label: 'Difícil',
    emoji: '🔴',
    color: '#e11d48',
    questions: 30,
    steps: ['Revisar o resumo', 'Videoaula rápida', 'Fazer 30 questões'],
  },
};

export const PLAN_ORDER: TopicDifficulty[] = ['facil', 'medio', 'dificil'];

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

export const addDaysYMD = (days: number, from = new Date()) => {
  const d = new Date(from);
  d.setDate(d.getDate() + days);
  return ymd(d);
};

export const isTopicSeen = (t: Topic) => t.status !== 'nao_iniciado';

export const blockTopics = (block: TopicBlock, topics: Topic[]) => topics.filter((t) => t.blockId === block.id);

export const isBlockDue = (block: TopicBlock, todayStr = ymd(new Date())) =>
  block.reviewStatus === 'revisao' && !!block.nextReviewDate && block.nextReviewDate <= todayStr;

export const blockStatusLabel = (block: TopicBlock) => {
  if (block.reviewStatus === 'dominado') return 'Dominado';
  if (block.reviewStatus === 'revisao') return `Revisão ${Math.min(BLOCK_REVIEWS_TO_MASTER, block.reviewsDone + 1)}/${BLOCK_REVIEWS_TO_MASTER}`;
  return 'Em estudo';
};
