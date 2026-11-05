import React, { useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, CalendarDays, Clock3, Edit2, Layers, ListChecks, Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Subject } from '../types';
import { EditSubjectModal } from './modals/EditSubjectModal';
import { SubjectBlocksPanel } from './SubjectBlocksPanel';
import { SubjectChecklistPanel } from './SubjectChecklistPanel';
import { TutoriaPanel } from './TutoriaPanel';
import { FOCUS_SUBJECT_KEY } from './TutoriaGradesSection';
import { CYCLE_INFO, FORMAT_ORDER, getSubjectFormat, subjectFormatOf, subjectOrganization } from '../data/subjectFormats';
import { formatDM, isTopicPending, isTopicSeen, ymd } from '../data/blockReview';

interface Props {
  cycle: 'ciclo_basico' | 'ciclo_clinico';
  subjects: Subject[];
  onOpenAddSubject: () => void;
}

const Ring: React.FC<{ pct: number; color: string; size?: number }> = ({ pct, color, size = 40 }) => (
  <div
    className="shrink-0 rounded-full grid place-items-center"
    style={{ width: size, height: size, background: `conic-gradient(${color} ${pct * 3.6}deg, rgba(148,163,184,0.22) 0deg)` }}
  >
    <span
      className="rounded-full bg-white dark:bg-slate-900 grid place-items-center text-[10px] font-black text-slate-700 dark:text-slate-200"
      style={{ width: size - 8, height: size - 8 }}
    >
      {pct}%
    </span>
  </div>
);

// Disciplinas & assuntos no Ciclo Básico e no Ciclo Clínico: agrupadas pelo formato do componente
export const CycleStructureView: React.FC<Props> = ({ cycle, subjects, onOpenAddSubject }) => {
  const { topics, deleteSubject, setCurrentTab } = useApp();
  const [formatFilter, setFormatFilter] = useState<string>('all');
  // vindo de Avaliações (seta do módulo): abre direto naquele módulo
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    try {
      const id = sessionStorage.getItem(FOCUS_SUBJECT_KEY);
      sessionStorage.removeItem(FOCUS_SUBJECT_KEY);
      return id;
    } catch {
      return null;
    }
  });
  const [editing, setEditing] = useState<Subject | null>(null);
  const todayStr = ymd(new Date());
  const cycleInfo = CYCLE_INFO[cycle];

  // componente recém-criado já abre selecionado
  const knownIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(subjects.map((x) => x.id));
    if (knownIds.current) {
      const added = subjects.find((x) => !knownIds.current!.has(x.id));
      if (added) {
        setSelectedId(added.id);
        setFormatFilter('all');
      }
    }
    knownIds.current = ids;
  }, [subjects]);

  const statsOf = (s: Subject) => {
    const list = topics.filter((t) => t.subjectId === s.id);
    const seen = list.filter(isTopicSeen).length;
    return {
      total: list.length,
      seen,
      pending: list.filter(isTopicPending).length,
      pct: list.length ? Math.round((seen / list.length) * 100) : 0,
    };
  };

  const groups = useMemo(
    () =>
      FORMAT_ORDER[cycle]
        .map((id) => ({ format: getSubjectFormat(id), items: subjects.filter((s) => subjectFormatOf(s).id === id) }))
        .filter((g) => g.items.length > 0),
    [cycle, subjects]
  );
  const visibleGroups = formatFilter === 'all' ? groups : groups.filter((g) => g.format.id === formatFilter);
  const visible = visibleGroups.flatMap((g) => g.items);
  const active = (selectedId && subjects.find((s) => s.id === selectedId)) || visible[0];

  // Resumo do ciclo
  const ids = new Set(subjects.map((s) => s.id));
  const cycleTopics = topics.filter((t) => ids.has(t.subjectId));
  const cycleSeen = cycleTopics.filter(isTopicSeen).length;
  const cyclePct = cycleTopics.length ? Math.round((cycleSeen / cycleTopics.length) * 100) : 0;
  const cyclePending = cycleTopics.filter(isTopicPending).length;
  const upcoming = cycleTopics
    .filter((t) => !isTopicSeen(t) && t.scheduleFirstContact && t.firstContactDate && t.firstContactDate >= todayStr)
    .sort((a, b) => a.firstContactDate!.localeCompare(b.firstContactDate!))
    .slice(0, 3);

  return (
    <div className="space-y-5 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Disciplinas & assuntos</h1>
            <span
              id="cycle-structure-badge"
              className="text-xs font-bold px-2 py-0.5 rounded-full text-white"
              style={{ backgroundColor: cycleInfo.color }}
            >
              {cycleInfo.label}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Organize cada componente do jeito que sua faculdade funciona: tutoria, aulas, morfo, anatomia, práticas e disciplinas.
          </p>
        </div>
        <button
          id="academic-add-subject-btn"
          onClick={onOpenAddSubject}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar componente
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-8 text-center space-y-4">
          <BookOpen className="h-9 w-9 mx-auto text-slate-300 dark:text-slate-700" />
          <div>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">Monte o seu {cycleInfo.label}</p>
            <p className="text-xs text-slate-500 mt-1">Escolha o formato de cada componente e se prefere organizar por checklist ou por blocos.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {FORMAT_ORDER[cycle].map((id) => {
              const f = getSubjectFormat(id);
              return (
                <span key={id} className="text-[11px] font-bold px-2.5 py-1 rounded-lg border" style={{ borderColor: `${f.color}55`, color: f.color }}>
                  {f.emoji} {f.label}
                </span>
              );
            })}
          </div>
          <button onClick={onOpenAddSubject} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black">
            + Adicionar primeiro componente
          </button>
        </div>
      ) : (
        <>
          {/* Resumo do ciclo */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
              <Ring pct={cyclePct} color={cycleInfo.color} size={48} />
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Visto no ciclo</div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {cycleSeen}/{cycleTopics.length} tópicos
                </div>
                <div className="text-[11px] text-slate-500">
                  {subjects.length} componente{subjects.length === 1 ? '' : 's'}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/15 text-amber-500 grid place-items-center">
                <Clock3 className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ver depois</div>
                <div className="text-sm font-black text-slate-900 dark:text-white">{cyclePending} pendência{cyclePending === 1 ? '' : 's'}</div>
                <div className="text-[11px] text-slate-500">{cyclePending ? 'Não esqueça de voltar nelas' : 'Tudo em dia'}</div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
              <div className="flex items-center justify-between">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
                  <CalendarDays className="h-3.5 w-3.5" /> Próximos programados
                </div>
                <button onClick={() => setCurrentTab('calendar')} className="text-[10px] font-bold text-sky-600 dark:text-sky-400 hover:underline">
                  Planner →
                </button>
              </div>
              {upcoming.length === 0 ? (
                <p className="text-[11px] text-slate-500 mt-2">Use 📅 num tópico para programar o dia de estudar.</p>
              ) : (
                <ul className="mt-1.5 space-y-1">
                  {upcoming.map((t) => (
                    <li key={t.id} className="flex items-center gap-2 text-[11px]">
                      <span className="font-black text-sky-600 dark:text-sky-400 w-10 shrink-0">{formatDM(t.firstContactDate)}</span>
                      <span className="truncate text-slate-700 dark:text-slate-300">{t.title}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Filtro por formato */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setFormatFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold ${
                formatFilter === 'all' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}
            >
              Todos ({subjects.length})
            </button>
            {groups.map(({ format: f, items }) => {
              const on = formatFilter === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFormatFilter(on ? 'all' : f.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                    on ? 'text-white' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                  style={on ? { backgroundColor: f.color, borderColor: f.color } : undefined}
                >
                  <span>{f.emoji}</span> {f.label} <span className={on ? 'text-white/80' : 'text-slate-400'}>{items.length}</span>
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Lista por formato */}
            <div className="lg:col-span-4 space-y-5">
              {visibleGroups.map(({ format: f, items }) => (
                <div key={f.id} className="space-y-2">
                  <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider px-1" style={{ color: f.color }}>
                    <span>{f.emoji}</span> {f.label === 'Disciplina' ? 'Disciplinas' : f.label}
                    <span className="text-slate-400">({items.length})</span>
                  </h3>
                  {items.map((s) => {
                    const st = statsOf(s);
                    const org = subjectOrganization(s);
                    const on = active?.id === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedId(s.id)}
                        className={`cycle-subject-card w-full text-left relative overflow-hidden rounded-2xl border p-3.5 flex items-center gap-3 transition-all ${
                          on ? 'shadow-xs' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                        style={on ? { borderColor: f.color, backgroundColor: `${f.color}12` } : undefined}
                      >
                        <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: f.color }} />
                        <Ring pct={st.pct} color={f.color} />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-black text-slate-900 dark:text-white truncate">{s.universitySubject || s.name}</div>
                          <div className="mt-1 flex items-center gap-1.5 flex-wrap text-[10px] font-bold">
                            <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                              {org === 'checklist' ? <ListChecks className="h-3 w-3" /> : <Layers className="h-3 w-3" />}
                              {org === 'blocos' ? 'Blocos' : f.id === 'tutoria' ? 'Tutorias' : 'Checklist'}
                            </span>
                            <span className="text-slate-400">
                              {st.seen}/{st.total}
                            </span>
                            {st.pending > 0 && <span className="text-amber-600 dark:text-amber-400">⏳ {st.pending}</span>}
                            {st.total > 0 && st.seen === st.total && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Detalhe */}
            <div className="lg:col-span-8">
              {active && (
                <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
                  {(() => {
                    const f = subjectFormatOf(active);
                    const org = subjectOrganization(active);
                    return (
                      <>
                        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="h-11 w-11 shrink-0 rounded-xl grid place-items-center text-xl" style={{ backgroundColor: `${f.color}22` }}>
                              {f.emoji}
                            </div>
                            <div className="min-w-0">
                              <h2 id="cycle-subject-title" className="text-base font-bold text-slate-900 dark:text-white truncate">
                                {active.universitySubject || active.name}
                              </h2>
                              <p className="text-xs font-semibold" style={{ color: f.color }}>
                                {f.label} · {org === 'blocos' ? 'Por blocos com revisão espaçada' : f.id === 'tutoria' ? `${(active.tutorials || []).length} tutorias · abertura e fechamento` : `Checklist (${f.group} → ${f.item})`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setEditing(active)}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                              title="Editar formato, nome e organização"
                              aria-label="Editar componente"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (window.confirm(`Excluir "${active.universitySubject || active.name}"?`)) deleteSubject(active.id);
                              }}
                              className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                              title="Excluir"
                              aria-label="Excluir componente"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                        {org === 'blocos' ? (
                          <SubjectBlocksPanel subject={active} />
                        ) : f.id === 'tutoria' ? (
                          <TutoriaPanel subject={active} />
                        ) : (
                          <SubjectChecklistPanel subject={active} />
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <EditSubjectModal isOpen={!!editing} subject={editing} onClose={() => setEditing(null)} />
    </div>
  );
};
