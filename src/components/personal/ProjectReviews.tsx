// "Revisões dos estudos pessoais": itens com revisão hoje, a técnica da etapa com passos e Difícil/Médio/Fácil.
import React, { useMemo } from 'react';
import { Play, RotateCcw } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { PersonalProject, PersonalProjectItem, TopicDifficulty } from '../../types';
import { PROJECT_KINDS, difficultyLabel, isItemReviewDue, projectReviewTechnique, reviewProjectItemResult } from '../../data/studyMethod';
import { formatDM } from '../../data/blockReview';

const RATING_STYLE: Record<TopicDifficulty, string> = {
  dificil: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 dark:hover:bg-rose-950/70 border-rose-200 dark:border-rose-900/40',
  medio: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/70 border-amber-200 dark:border-amber-900/40',
  facil: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-950/70 border-emerald-200 dark:border-emerald-900/40',
};
const RATINGS: TopicDifficulty[] = ['dificil', 'medio', 'facil'];

interface DueEntry {
  project: PersonalProject;
  item: PersonalProjectItem;
}

/** Itens de estudos pessoais com revisão vencida (hoje ou antes), mais antigos primeiro */
export const dueProjectItems = (projects: PersonalProject[], today: string): DueEntry[] =>
  projects
    .filter((p) => !p.archived)
    .flatMap((p) => p.items.filter((it) => isItemReviewDue(it, today)).map((item) => ({ project: p, item })))
    .sort((a, b) => (a.item.nextReviewDate || '').localeCompare(b.item.nextReviewDate || ''));

/** Próximas revisões (amanhã em diante, até 7 dias) para a linha "a seguir" */
export const upcomingProjectReviews = (projects: PersonalProject[], today: string, until: string) =>
  projects
    .filter((p) => !p.archived)
    .flatMap((p) => p.items.filter((it) => it.inReview && it.nextReviewDate && it.nextReviewDate > today && it.nextReviewDate <= until))
    .length;

export const ProjectReviews: React.FC<{ projects: PersonalProject[]; today: string; upcoming: number }> = ({ projects, today, upcoming }) => {
  const { reviewProjectItem, startTask, studyPrefs } = useApp();
  const due = useMemo(() => dueProjectItems(projects, today), [projects, today]);

  if (due.length === 0) {
    if (upcoming === 0) return null;
    return (
      <section id="personal-reviews" className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-3">
        <RotateCcw className="h-4 w-4 shrink-0 text-sky-500" />
        <p className="text-xs text-slate-600 dark:text-slate-300">
          <b>Revisões dos estudos pessoais em dia.</b>{' '}
          <span className="text-slate-500 dark:text-slate-400">
            {upcoming} {upcoming === 1 ? 'revisão chega' : 'revisões chegam'} nos próximos 7 dias.
          </span>
        </p>
      </section>
    );
  }

  return (
    <section id="personal-reviews" aria-labelledby="personal-reviews-title" className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 id="personal-reviews-title" className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
            <RotateCcw className="h-4 w-4 text-sky-500" /> Revisões dos estudos pessoais
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tente lembrar antes de olhar. Elas também aparecem no seu plano do dia.</p>
        </div>
        <span className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300">
          {due.length} hoje
        </span>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {due.map(({ project: p, item }) => {
          const n = (item.reviewsDone || 0) + 1;
          const tech = projectReviewTechnique(n, p.kind);
          const color = p.color || PROJECT_KINDS[p.kind]?.color || tech.color;
          const late = item.nextReviewDate && item.nextReviewDate < today;
          return (
            <article
              key={`${p.id}:${item.id}`}
              id={`personal-review-${item.id}`}
              className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col"
            >
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 rounded-2xl flex items-center justify-center text-lg" style={{ backgroundColor: `${color}1f` }} aria-hidden="true">
                  {p.emoji || tech.emoji}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white break-words leading-snug">{item.title}</h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">Estudo pessoal · {p.title}</p>
                </div>
                <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ink" style={{ '--ink': tech.color, backgroundColor: `${tech.color}14` } as React.CSSProperties}>
                  {tech.emoji} {tech.badge}
                </span>
              </div>

              <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 px-3 py-3 flex-1">
                <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{tech.label}</div>
                <ol className="mt-1.5 space-y-1">
                  {tech.steps.map((s, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <span
                        className="h-4 w-4 shrink-0 mt-px rounded-full text-[9px] font-black flex items-center justify-center text-white"
                        style={{ backgroundColor: tech.color }}
                      >
                        {i + 1}
                      </span>
                      <span className="min-w-0">{s}</span>
                    </li>
                  ))}
                </ol>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Sugestão: 1 bloco de 25 min</span>
                  {tech.questions ? <span>· cerca de {tech.questions} questões</span> : null}
                  {late && <span>· remarcada, desde {formatDM(item.nextReviewDate)}</span>}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    startTask({
                      title: `${tech.badge}: ${item.title}`,
                      kind: 'project_review',
                      projectId: p.id,
                      itemId: item.id,
                      minutes: studyPrefs.shortFocusMinutes, breakMinutes: studyPrefs.shortBreakMinutes,
                      steps: tech.steps,
                    })
                  }
                  className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs"
                >
                  <Play className="h-3.5 w-3.5" fill="currentColor" /> Começar
                </button>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">ou, se já fez, como foi?</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2" role="group" aria-label="Como foi a revisão">
                {RATINGS.map((d) => {
                  const nextDate = reviewProjectItemResult(item, d, { today, restDay: studyPrefs.restDay, longTerm: studyPrefs.longTermGoal }).nextReviewDate;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => reviewProjectItem(p.id, item.id, d)}
                      className={`min-h-12 rounded-xl border px-2 py-1.5 text-center transition-colors ${RATING_STYLE[d]}`}
                    >
                      <span className="block text-xs font-black">{difficultyLabel[d]}</span>
                      <span className="block text-[10px] font-semibold opacity-80">volta {formatDM(nextDate)}</span>
                    </button>
                  );
                })}
              </div>
            </article>
          );
        })}
      </div>
      {upcoming > 0 && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Depois destas, {upcoming} {upcoming === 1 ? 'revisão chega' : 'revisões chegam'} nos próximos 7 dias.
        </p>
      )}
    </section>
  );
};

export default ProjectReviews;
