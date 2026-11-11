// Disciplinas de uma grande área em quadrados (mesmo visual dos cards de área). Tocar abre a disciplina.
import React from 'react';
import { Plus } from 'lucide-react';
import type { Subject, Topic, TopicBlock } from '../../types';
import { formatDM } from '../../data/blockReview';
import { Bar, Ring, subjectColor, subjectName, topicStats } from './shared';
import { DeleteSubjectButton } from './DeleteSubjectButton';
import { QuickShareButton } from './ShareSubject';

interface Props {
  subjects: Subject[];
  topics: Topic[];
  topicBlocks: TopicBlock[];
  onOpen: (subjectId: string) => void;
  onAdd: () => void;
  today: string;
}

export const SubjectGrid: React.FC<Props> = ({ subjects, topics, topicBlocks, onOpen, onAdd, today }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
    {subjects.map((s) => {
      const st = topicStats(topics.filter((t) => t.subjectId === s.id));
      const color = subjectColor(s);
      const blocks = topicBlocks.filter((b) => b.subjectId === s.id);
      const studying = blocks.filter((b) => b.reviewStatus === 'estudando').length;
      const nextReview = blocks
        .filter((b) => b.reviewStatus !== 'estudando' && b.nextReviewDate && !b.paused)
        .map((b) => b.nextReviewDate as string)
        .sort()[0];
      const status = nextReview
        ? nextReview <= today
          ? 'Revisão hoje'
          : `Revisão ${formatDM(nextReview)}`
        : studying
          ? `${studying} bloco${studying > 1 ? 's' : ''} em estudo`
          : blocks.length
            ? `${blocks.length} bloco${blocks.length > 1 ? 's' : ''}`
            : 'Sem blocos ainda';
      return (
        <div key={s.id} className="relative">
        <button
          type="button"
          id={`struct-subject-${s.id}`}
          onClick={() => onOpen(s.id)}
          className="group relative overflow-hidden w-full h-full text-left rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 p-5 transition-colors"
          style={{ backgroundImage: `radial-gradient(70% 90% at 0% 0%, ${color}17 0%, transparent 70%)` }}
        >
          <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[3px]" style={{ background: `linear-gradient(90deg, ${color}, ${color}33)` }} />
          <div className="flex items-start gap-3">
            <Ring pct={st.pct} color={color} size={44} />
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-slate-900 dark:text-white line-clamp-2 leading-snug">{subjectName(s)}</h3>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                {st.total} assunto{st.total === 1 ? '' : 's'} · {status}
              </p>
            </div>
            <span className="w-16 shrink-0" aria-hidden="true" />
          </div>
          <div className="mt-4 flex items-end justify-between gap-3">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {st.seen}/{st.total} vistos{st.pending > 0 ? ` · ${st.pending} ver depois` : ''}
            </span>
          </div>
          <Bar pct={st.pct} color={color} className="mt-2" />
        </button>
        <QuickShareButton subject={s} />
        <DeleteSubjectButton subject={s} className="!top-3 !bottom-auto" />
        </div>
      );
    })}
    <button
      type="button"
      onClick={onAdd}
      className="min-h-[132px] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 hover:text-sky-600 hover:border-sky-400 flex flex-col items-center justify-center gap-1.5"
    >
      <Plus className="h-5 w-5" /> Nova disciplina
    </button>
  </div>
);
