import { Topic, TopicStatus } from '../types';

// Fluxo do assunto:
//   Não iniciado → Visto (1º contato, entra nas Revisões) → Em revisão (1/4…3/4) → Dominado (após a 4ª revisão)
export const REVIEWS_TO_MASTER = 4;

export const TOPIC_STATUS_INFO: Record<TopicStatus, { label: string; filterLabel: string; badgeClass: string }> = {
  nao_iniciado: {
    label: 'Não iniciado',
    filterLabel: 'Não iniciados',
    badgeClass: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
  },
  em_andamento: {
    label: 'Visto',
    filterLabel: 'Vistos',
    badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
  },
  revisado: {
    label: 'Em revisão',
    filterLabel: 'Em revisão',
    badgeClass: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-500/30',
  },
  dominado: {
    label: 'Dominado',
    filterLabel: 'Dominados',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  },
};

// Revisões espaçadas já feitas (0–4). Tópicos antigos, sem o campo, são estimados pelo status/ciclo.
export const getReviewsDone = (t: Topic): number => {
  if (typeof t.reviewsDone === 'number') return Math.min(REVIEWS_TO_MASTER, Math.max(0, t.reviewsDone));
  if (t.status === 'dominado') return REVIEWS_TO_MASTER;
  if (t.status === 'revisado') return Math.min(REVIEWS_TO_MASTER - 1, Math.max(1, (t.cycleStep || 2) - 1));
  return 0;
};

// "Realizado" = já teve o 1º contato (qualquer status além de Não iniciado)
export const isTopicDone = (t: Topic) => t.status !== 'nao_iniciado';

export const topicStatusLabel = (t: Topic): string => {
  if (t.status === 'revisado') return `Em revisão ${getReviewsDone(t)}/${REVIEWS_TO_MASTER}`;
  return TOPIC_STATUS_INFO[t.status].label;
};
