// Revisão de um item de Estudos pessoais (mesmo ritmo R1–R4, técnica sem banco de questões).
import React, { useEffect, useState } from 'react';
import { ChevronDown, Play } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { PersonalProject, PersonalProjectItem, TopicDifficulty } from '../../types';
import { daysBetween, formatDM, nextIntervalDays, scheduleReviewDate } from '../../data/blockReview';
import { projectReviewTechnique } from '../../data/studyMethod';
import { todayYMD } from '../../hooks/useStudyPlan';
import { DIFF_ORDER, DIFF_UI, StepList } from './reviewShared';

interface ProjectReviewCardProps {
  project: PersonalProject;
  item: PersonalProjectItem;
  expanded?: boolean;
  onToggle?: () => void;
  onReviewed?: (key: string) => void;
  variant?: 'list' | 'session';
}

export const projectReviewKey = (projectId: string, itemId: string) => `p:${projectId}:${itemId}`;

export const ProjectReviewCard: React.FC<ProjectReviewCardProps> = ({ project, item, expanded = true, onToggle, onReviewed, variant = 'list' }) => {
  const { studyPrefs, reviewProjectItem, startTask } = useApp();
  const today = todayYMD();
  const n = (item.reviewsDone || 0) + 1;
  const tech = projectReviewTechnique(n, project.kind);
  const color = project.color || tech.color;
  const late = item.nextReviewDate && item.nextReviewDate < today ? item.nextReviewDate : undefined;
  const [stepsDone, setStepsDone] = useState<Set<number>>(new Set());
  useEffect(() => setStepsDone(new Set()), [item.id, item.reviewsDone]);
  const open = expanded || !onToggle;

  const preview = (level: TopicDifficulty) => {
    const days = nextIntervalDays(level, n, studyPrefs.longTermGoal);
    const d = daysBetween(today, scheduleReviewDate(days, { from: today, restDay: studyPrefs.restDay }));
    return d === 1 ? 'amanhã' : `em ${d} dias`;
  };

  const conclude = (level: TopicDifficulty) => {
    reviewProjectItem(project.id, item.id, level);
    onReviewed?.(projectReviewKey(project.id, item.id));
  };

  return (
    <div
      id={`review-card-${projectReviewKey(project.id, item.id)}`}
      className={`rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs scroll-mt-24 ${variant === 'session' ? 'shadow-lg' : ''}`}
    >
      <div
        className={`p-4 sm:p-5 ${onToggle ? 'cursor-pointer select-none' : ''}`}
        onClick={onToggle}
        role={onToggle ? 'button' : undefined}
        tabIndex={onToggle ? 0 : undefined}
        aria-expanded={onToggle ? open : undefined}
        onKeyDown={(e) => {
          if (onToggle && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="flex items-start gap-3">
          <span className="h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center text-xl border" style={{ backgroundColor: color + '14', borderColor: color + '33' }} aria-hidden>
            {project.emoji || tech.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap ink" style={{ '--ink': tech.color, backgroundColor: tech.color + '14', borderColor: tech.color + '40' } as React.CSSProperties}>
                {tech.badge}
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate min-w-0">Estudo pessoal · {project.title}</span>
            </div>
            <h3 className={`font-black text-slate-900 dark:text-white leading-snug mt-1 break-words ${variant === 'session' ? 'text-lg sm:text-xl' : 'text-[15px] sm:text-base'}`}>{item.title}</h3>
            <span
              className={`inline-flex mt-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                late
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  : 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800'
              }`}
            >
              {late ? `Remarcada · desde ${formatDM(late)}` : 'Para hoje'}
            </span>
          </div>
          {onToggle && <ChevronDown className={`h-5 w-5 mt-1 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-4 -mt-1">
          <div className="rounded-2xl border p-3.5 sm:p-4 space-y-3" style={{ borderColor: tech.color + '33', backgroundColor: tech.color + '0a' }}>
            <div>
              <p className="text-[13px] font-black ink" style={{ '--ink': tech.color } as React.CSSProperties}>
                {tech.label}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">{tech.why}</p>
            </div>
            <StepList
              steps={tech.steps}
              color={tech.color}
              done={stepsDone}
              onToggle={(i) =>
                setStepsDone((s) => {
                  const x = new Set(s);
                  if (x.has(i)) x.delete(i);
                  else x.add(i);
                  return x;
                })
              }
            />
            <p className="text-[11px] text-slate-500 dark:text-slate-400">sugestão: 1 × 25 min</p>
          </div>

          <button
            type="button"
            onClick={() =>
              startTask({ title: `${tech.badge}: ${item.title}`, kind: 'project_review', projectId: project.id, itemId: item.id, steps: tech.steps, minutes: studyPrefs.shortFocusMinutes, breakMinutes: studyPrefs.shortBreakMinutes })
            }
            className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black shadow-sm w-full sm:w-auto"
          >
            <Play className="h-4 w-4 fill-current" /> {variant === 'session' ? 'Começar foco' : 'Começar'}
          </button>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3.5 sm:p-4 space-y-2">
            <p className="text-[13px] font-black text-slate-900 dark:text-white">Terminou? Como foi a R{n}?</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Lembrou quase tudo? Fácil. Com esforço? Médio. Esqueceu muito? Difícil.</p>
            <div className="grid grid-cols-3 gap-2">
              {DIFF_ORDER.map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => conclude(level)}
                  className={`flex flex-col items-center justify-center min-h-[56px] px-1.5 py-2 rounded-xl border font-bold transition-all ${DIFF_UI[level].cls}`}
                >
                  <span className="text-[13px]">
                    {DIFF_UI[level].emoji} {DIFF_UI[level].label}
                  </span>
                  <span className="text-[10px] font-semibold opacity-80">
                    R{n + 1} {preview(level)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
