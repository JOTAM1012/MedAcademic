// Aba "Estudos pessoais": projetos do aluno fora da grade (residência, liga, idioma, curso, leitura, pesquisa),
// com metas pequenas por semana e o mesmo método (recuperação ativa + revisões espaçadas).
import React, { useMemo, useState } from 'react';
import { Archive, ChevronDown, Lightbulb, Plus, ShieldCheck, Sparkles, Target } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { PersonalProject } from '../types';
import { PHASE_INFO, PROJECT_KINDS, projectWeekPomodoros, weekStart } from '../data/studyMethod';
import { addDaysYMD, parseYMD } from '../data/blockReview';
import { todayYMD, useWeekLoad } from '../hooks/useStudyPlan';
import { NewProjectModal } from './personal/NewProjectModal';
import { ProjectCard } from './personal/ProjectCard';
import { ProjectReviews, upcomingProjectReviews } from './personal/ProjectReviews';
import { SUGGESTED_PRESETS, effectiveGoal, fmtMinutes, type ProjectPreset } from './personal/shared';
import { EmptyState } from './shared/EmptyState';

const PHASE_TIP: Record<string, string> = {
  ciclo_basico: 'Ciclo Básico: comece pequeno. Um projeto (liga ou idioma) com 2 blocos por semana já faz diferença.',
  ciclo_clinico: 'Ciclo Clínico: um curso prático (ECG, USG) ou a liga combinam com o que você vê no hospital.',
  internato: 'Internato: a residência vira o eixo. Blocos curtos de questões e o caderno de erros rendem mais que aulas longas.',
};

export const PersonalStudiesView: React.FC = () => {
  const { studyMethod, studySessions, studyPhase, residencyPrep } = useApp();
  const today = todayYMD();
  const projects = studyMethod.projects || [];
  const active = projects.filter((p) => !p.archived);
  const archived = projects.filter((p) => p.archived);
  const phase = PHASE_INFO[studyPhase];

  const [modal, setModal] = useState<{ open: boolean; editing?: PersonalProject | null; preset?: ProjectPreset | null }>({ open: false });
  const [showArchived, setShowArchived] = useState(false);

  // Semana pesada (dias cheios, plantão, dia difícil): a meta dos estudos pessoais é ajustada, sem cobrança
  const monday = weekStart(today);
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysYMD(i, monday)), [monday]);
  const weekLoad = useWeekLoad(weekDates);
  const heavyWeek = useMemo(
    () => weekLoad.filter((d) => d.overloaded || d.dayKind === 'low_energy' || d.dayKind === 'plantao' || d.dayKind === 'pos_plantao' || d.dayKind === 'prova' || d.dayKind === 'pos_prova').length >= 2,
    [weekLoad]
  );

  const weekDone = useMemo(() => {
    const out: Record<string, number> = {};
    projects.forEach((p) => (out[p.id] = projectWeekPomodoros(p, studySessions, today)));
    return out;
  }, [projects, studySessions, today]);

  const dow = parseYMD(today).getDay();
  const isTodayDay = (p: PersonalProject) => !!p.days?.length && p.days.includes(dow);
  const sortedActive = useMemo(
    () => [...active].sort((a, b) => Number(isTodayDay(b)) - Number(isTodayDay(a)) || (a.createdAt || '').localeCompare(b.createdAt || '')),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [projects, dow]
  );

  const totalDone = active.reduce((acc, p) => acc + (weekDone[p.id] || 0), 0);
  const totalGoal = active.reduce((acc, p) => acc + p.weeklyPomodoros, 0);
  const totalTarget = active.reduce((acc, p) => acc + effectiveGoal(p, heavyWeek), 0);
  const itemsThisWeek = active.reduce((acc, p) => acc + p.items.filter((i) => i.done && i.doneAt && i.doneAt >= monday).length, 0);
  const todayProjects = sortedActive.filter(isTodayDay);
  const upcoming = upcomingProjectReviews(projects, today, addDaysYMD(7, today));
  const pct = totalTarget > 0 ? Math.min(100, Math.round((totalDone / totalTarget) * 100)) : 0;

  const openNew = (preset?: ProjectPreset) => setModal({ open: true, preset: preset || null, editing: null });
  const openEdit = (p: PersonalProject) => setModal({ open: true, editing: p, preset: null });
  const closeModal = () => setModal({ open: false });

  const phaseTip = residencyPrep
    ? 'Preparação para a residência: as questões do dia já entram no seu plano, como eixo principal.'
    : PHASE_TIP[studyPhase] || phase.priority;

  return (
    <div id="personal-studies-view" className="tab-root space-y-5 pb-12 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Estudos pessoais</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Seus projetos fora da grade, com metas pequenas por semana.</p>
        </div>
        <button
          id="personal-new-btn"
          type="button"
          onClick={() => openNew()}
          className="h-11 px-4 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs shrink-0"
        >
          <Plus className="h-4 w-4" /> Novo estudo pessoal
        </button>
      </div>

      {active.length === 0 ? (
        /* Estado vazio acolhedor */
        <section id="personal-empty" className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7">
          <EmptyState
            framed={false}
            className="py-2! sm:py-4!"
            icon={Target}
            tone="sky"
            title="Que tal começar com algo pequeno?"
            text="Um curso, inglês, a liga ou um livro. Poucos blocos por semana já fazem diferença."
            actionLabel="Criar estudo pessoal"
            actionIcon={Plus}
            onAction={() => openNew()}
          />

          <p className="mt-5 text-[11px] font-bold uppercase tracking-wide text-slate-400 text-center sm:text-left">Ou comece por um modelo</p>
          <div className="mt-2 grid gap-2.5 sm:grid-cols-3">
            {SUGGESTED_PRESETS.map((pr) => {
              const k = PROJECT_KINDS[pr.kind];
              return (
                <button
                  key={pr.kind}
                  id={`personal-template-${pr.kind}`}
                  type="button"
                  onClick={() => openNew(pr)}
                  className="group text-left rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all flex items-center gap-3 sm:block"
                  style={{ backgroundColor: `${k.color}0a` }}
                >
                  <span
                    className="h-11 w-11 shrink-0 rounded-xl flex items-center justify-center text-2xl sm:mb-3 transition-transform group-hover:scale-110"
                    style={{ backgroundColor: `${k.color}1f` }}
                    aria-hidden="true"
                  >
                    {k.emoji}
                  </span>
                  <span className="min-w-0 block">
                    <span className="block text-sm font-black text-slate-900 dark:text-white">{pr.title || k.label}</span>
                    <span className="block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{pr.blurb || k.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <button type="button" onClick={() => openNew()} className="mt-3 h-10 px-1 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline">
            Ver todos os modelos →
          </button>

          <ol className="mt-4 grid gap-2 sm:grid-cols-3 border-t border-slate-100 dark:border-slate-800 pt-4">
            {[
              ['1', 'Meta pequena', 'Poucos blocos de 25 min por semana, nos dias que você escolher.'],
              ['2', 'Aperte Começar', 'O Pomodoro abre já ligado ao projeto e ao próximo item.'],
              ['3', 'Lembre e revise', 'Item feito: folha em branco de 5 min e, se quiser, entra nas revisões.'],
            ].map(([n, t, d]) => (
              <li key={n} className="flex gap-2.5">
                <span className="h-6 w-6 shrink-0 rounded-full bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 text-[11px] font-black flex items-center justify-center">{n}</span>
                <span className="min-w-0">
                  <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">{t}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400">{d}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : (
        /* Resumo da semana */
        <section id="personal-week-summary" className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">Esta semana</div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-3xl font-black text-slate-900 dark:text-white leading-none">{totalDone}</span>
                <span className="text-sm font-bold text-slate-400">/ {totalTarget} blocos</span>
              </div>
              <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                ≈ {fmtMinutes(totalDone * 25)} de foco
                {itemsThisWeek > 0 && ` · ${itemsThisWeek} ${itemsThisWeek === 1 ? 'item concluído' : 'itens concluídos'}`}
              </div>
            </div>
            {heavyWeek && totalTarget < totalGoal && (
              <span className="rounded-full px-2.5 py-1 text-[11px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300" title={`Meta normal: ${totalGoal} blocos`}>
                Semana pesada: meta ajustada
              </span>
            )}
            {totalDone >= totalTarget && totalTarget > 0 && (
              <span className="rounded-full px-2.5 py-1 text-[11px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                Meta da semana feita ✨
              </span>
            )}
          </div>
          <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-sky-500 transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>

          {todayProjects.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Hoje é dia de:</span>
              {todayProjects.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => document.getElementById(`personal-project-${p.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className="h-8 rounded-full px-2.5 text-[11px] font-bold truncate max-w-[200px] ink"
                  style={{ '--ink': p.color, backgroundColor: `${p.color}14` } as React.CSSProperties}
                >
                  {p.emoji} {p.title}
                </button>
              ))}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
            <p id="personal-phase-tip" className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300">
              <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: phase.color }} />
              <span className="min-w-0">
                <span aria-hidden="true">{phase.emoji} </span>
                {phaseTip}
              </span>
            </p>
            <p className="flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 mt-0.5 shrink-0 text-emerald-500" />
              <span className="min-w-0">A faculdade vem primeiro no plano do dia, mas 1 bloco do estudo pessoal fica protegido nos dias que você escolheu.</span>
            </p>
          </div>
        </section>
      )}

      {active.length === 0 && (
        <p id="personal-phase-tip" className="flex items-start gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: phase.color }} />
          <span className="min-w-0">
            {phaseTip} Estudo pessoal fica abaixo da faculdade no plano, mas 1 bloco fica protegido nos dias escolhidos.
          </span>
        </p>
      )}

      {/* Revisões dos estudos pessoais */}
      <ProjectReviews projects={projects} today={today} upcoming={upcoming} />

      {/* Projetos */}
      {sortedActive.length > 0 && (
        <section id="personal-projects" aria-label="Seus estudos pessoais" className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-slate-900 dark:text-white">
              Seus estudos <span className="text-slate-400 font-bold">({sortedActive.length})</span>
            </h2>
            {sortedActive.length >= 4 && (
              <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                <Sparkles className="h-3 w-3" /> Muitos projetos ao mesmo tempo? Arquive os que podem esperar.
              </span>
            )}
          </div>
          <div className="grid gap-3 md:grid-cols-2 items-start">
            {sortedActive.map((p) => (
              <ProjectCard key={p.id} project={p} today={today} weekDone={weekDone[p.id] || 0} heavyWeek={heavyWeek} onEdit={openEdit} />
            ))}
          </div>
        </section>
      )}

      {/* Arquivados */}
      {archived.length > 0 && (
        <section id="personal-archived" className="space-y-3">
          <button
            type="button"
            onClick={() => setShowArchived((v) => !v)}
            className="h-10 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            aria-expanded={showArchived}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${showArchived ? '' : '-rotate-90'}`} />
            <Archive className="h-3.5 w-3.5" /> Arquivados ({archived.length})
          </button>
          {showArchived && (
            <div className="grid gap-3 md:grid-cols-2 items-start">
              {archived.map((p) => (
                <ProjectCard key={p.id} project={p} today={today} weekDone={weekDone[p.id] || 0} heavyWeek={heavyWeek} onEdit={openEdit} />
              ))}
            </div>
          )}
        </section>
      )}

      <NewProjectModal open={modal.open} onClose={closeModal} editing={modal.editing} preset={modal.preset} />
    </div>
  );
};

export default PersonalStudiesView;
