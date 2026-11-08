// Progresso das disciplinas: um quadro por grande área (clínico/internato) ou por módulo (básico),
// com a % geral e as disciplinas dentro (abre e fecha). Combina com a aba Disciplinas.
import React, { useMemo, useState } from 'react';
import { ChevronDown, Layers, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Subject } from '../../types';
import { Bar, EmptyNote, GroupToggle, LinkButton, WidgetCard, softBtn } from './ui';
import { GroupMode, groupSubjects, plural, slug, subjectProgress, sumProgress } from './dashboardData';

export const ProgressWidget: React.FC<{ subjects: Subject[]; mode: GroupMode; onModeChange: (m: GroupMode) => void; areaFiltered: boolean }> = ({
  subjects,
  mode,
  onModeChange,
  areaFiltered,
}) => {
  const { topics, topicBlocks, studyPhase, setCurrentTab } = useApp();
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const groups = useMemo(() => {
    return groupSubjects(subjects, mode, studyPhase).map((g) => {
      const subs = g.subjects
        .map((s) => ({ sub: s, p: subjectProgress(s, topics, topicBlocks) }))
        .sort((a, b) => (a.sub.universitySubject || a.sub.name).localeCompare(b.sub.universitySubject || b.sub.name, 'pt-BR'));
      return { ...g, subs, p: sumProgress(subs.map((x) => x.p)) };
    });
  }, [subjects, mode, studyPhase, topics, topicBlocks]);

  const filled = groups.filter((g) => g.subs.length > 0);
  const emptyAreas = mode === 'area' && !areaFiltered ? groups.filter((g) => g.subs.length === 0 && !g.other) : [];
  const total = sumProgress(filled.map((g) => g.p));
  const groupWord = mode === 'area' ? ['área', 'áreas'] : ['módulo', 'módulos'];

  return (
    <WidgetCard
      id="dash-progress"
      title="Progresso das disciplinas"
      icon={Layers}
      color="#0ea5e9"
      action={<LinkButton id="dash-progress-open" onClick={() => setCurrentTab('structure')}>Disciplinas</LinkButton>}
    >
      {subjects.length === 0 ? (
        <EmptyNote
          action={
            <button type="button" onClick={() => setCurrentTab('structure')} className={softBtn}>
              <Plus className="h-4 w-4 text-sky-500" /> Cadastrar disciplina
            </button>
          }
        >
          {areaFiltered ? 'Nenhuma disciplina nesta grande área.' : 'Cadastre suas disciplinas para ver o progresso aqui.'}
        </EmptyNote>
      ) : (
        <>
          {/* Total do semestre */}
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <p className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                {total.pct}
                <span className="text-lg text-slate-400 dark:text-slate-500">%</span>
              </p>
              <p id="dash-progress-total" className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                {plural(filled.length, groupWord[0], groupWord[1])} · {plural(subjects.length, 'disciplina', 'disciplinas')} · {plural(total.topics, 'assunto', 'assuntos')}
              </p>
            </div>
            <GroupToggle id="dash-progress-mode" value={mode} onChange={onModeChange} />
          </div>
          <Bar pct={total.pct} color="#0ea5e9" />

          {/* Quadros por grupo */}
          <ul className="grid grid-cols-1 lg:grid-cols-2 gap-2 items-start">
            {filled.map((g) => {
              const isOpen = !!open[g.key];
              return (
                <li key={g.key} id={`dash-progress-group-${slug(g.key)}`} className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/30">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))}
                    className="w-full min-h-[56px] px-3 py-2.5 text-left flex flex-col gap-2"
                  >
                    <span className="w-full flex items-center gap-2 min-w-0">
                      {g.emoji ? (
                        <span className="text-sm shrink-0" aria-hidden>
                          {g.emoji}
                        </span>
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-black text-slate-800 dark:text-slate-100 truncate">{g.label}</span>
                        <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                          {plural(g.subs.length, 'disciplina', 'disciplinas')} · {plural(g.p.topics, 'assunto', 'assuntos')}
                        </span>
                      </span>
                      <span className="text-sm font-black text-slate-900 dark:text-white shrink-0">{g.p.pct}%</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </span>
                    <Bar pct={g.p.pct} color={g.color} thin />
                  </button>
                  {isOpen && (
                    <ul className="px-3 pb-3 pt-1 space-y-1 border-t border-slate-100 dark:border-slate-800">
                      {g.subs.map(({ sub, p }) => (
                        <li key={sub.id}>
                          <button
                            type="button"
                            id={`dash-progress-subject-${sub.id}`}
                            onClick={() => setCurrentTab('structure')}
                            className="w-full min-h-[44px] py-1.5 text-left flex flex-col gap-1 rounded-lg hover:bg-white dark:hover:bg-slate-900 px-1.5"
                          >
                            <span className="w-full flex items-center gap-2 min-w-0 text-[11px]">
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: sub.color }} />
                              <span className="min-w-0 flex-1 truncate font-bold text-slate-700 dark:text-slate-200">{sub.universitySubject || sub.name}</span>
                              <span className="shrink-0 text-slate-500 dark:text-slate-400">
                                {p.topics ? `${p.seen}/${p.topics}` : 'sem assuntos'}
                              </span>
                              <span className="shrink-0 w-9 text-right font-black text-slate-700 dark:text-slate-200">{p.pct}%</span>
                            </span>
                            <Bar pct={p.pct} color={sub.color || g.color} thin />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          {emptyAreas.length > 0 && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">Sem disciplinas: {emptyAreas.map((g) => g.label).join(', ')}.</p>
          )}
        </>
      )}
    </WidgetCard>
  );
};
