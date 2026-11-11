import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, BookOpen, Plus, Trophy, FileClock, LayoutGrid, FolderTree } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Subject } from '../types';
import { CLINICA_MEDICA_SPECIALTIES, OTHER_AREA } from '../data/areas';
import { CYCLE_INFO } from '../data/subjectFormats';
import { EditSubjectModal } from './modals/EditSubjectModal';
import { FOCUS_SUBJECT_KEY } from './TutoriaGradesSection';
import { ContestsModal } from './contests/ContestsModal';
import { PastExamsModal } from './contests/PastExamsModal';
import { Bar, Ring, hasArea, moduleOf, topicStats } from './structure/shared';
import { AreaGrid, groupByArea } from './structure/AreaGrid';
import { ModuleGrid, ModuleList } from './structure/ModuleList';
import { ModuleLinks } from './structure/ModuleLinks';
import { Trash2 } from 'lucide-react';
import { SubjectSection } from './structure/SubjectSection';
import { SubjectGrid } from './structure/SubjectGrid';
import { ymd } from '../data/blockReview';

interface AcademicStructureViewProps {
  onOpenAddSubject: () => void;
  onOpenAddTopic?: (subjectId?: string) => void;
}

type ViewMode = 'area' | 'module';
type Detail = { kind: 'area'; id: string } | { kind: 'subject'; id: string; fromArea?: string } | null;

const VIEW_KEY = 'medacademic_struct_view';

const specialtyOrder = (s: Subject) => {
  const i = CLINICA_MEDICA_SPECIALTIES.findIndex((sp) => sp.id === s.specialty);
  return i < 0 ? CLINICA_MEDICA_SPECIALTIES.length : i;
};

// Disciplinas & assuntos (todos os ciclos): visão por grandes áreas ou por módulo da faculdade
export const AcademicStructureView: React.FC<AcademicStructureViewProps> = ({ onOpenAddSubject }) => {
  const { currentSemester, subjects: allSubjects, topics, topicBlocks, studyPhase, contestsActive, deleteSubjects } = useApp();
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false);
  // Só as disciplinas do semestre atual (as anteriores ficam no Histórico)
  const subjects = useMemo(
    () => allSubjects.filter((s) => !s.semesterId || !currentSemester || s.semesterId === currentSemester.id),
    [allSubjects, currentSemester]
  );
  const isBasic = studyPhase === 'ciclo_basico';
  const cycleInfo = CYCLE_INFO[studyPhase];

  const [view, setView] = useState<ViewMode>(() => {
    if (isBasic) return 'module';
    try {
      const saved = localStorage.getItem(VIEW_KEY);
      if (saved === 'area' || saved === 'module') return saved;
    } catch {
      /* sem armazenamento */
    }
    return studyPhase === 'internato' || subjects.some(hasArea) ? 'area' : 'module';
  });
  const mode: ViewMode = isBasic ? 'module' : view;
  const changeView = (v: ViewMode) => {
    setView(v);
    setDetail(null);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* sem armazenamento */
    }
  };

  // vindo de Avaliações (seta do módulo): abre direto naquela disciplina
  const [detail, setDetail] = useState<Detail>(() => {
    try {
      const id = sessionStorage.getItem(FOCUS_SUBJECT_KEY);
      sessionStorage.removeItem(FOCUS_SUBJECT_KEY);
      return id ? { kind: 'subject', id } : null;
    } catch {
      return null;
    }
  });
  // vindo da busca do topo: abre a disciplina pedida (também se esta tela já estiver aberta)
  useEffect(() => {
    const OPEN_KEY = 'medacademic_open_subject';
    const openFrom = (d?: { subjectId?: string } | null) => {
      if (d?.subjectId) setDetail({ kind: 'subject', id: d.subjectId });
    };
    try {
      const raw = sessionStorage.getItem(OPEN_KEY);
      sessionStorage.removeItem(OPEN_KEY);
      if (raw) openFrom(JSON.parse(raw));
    } catch {
      /* sem armazenamento */
    }
    const onOpen = (e: Event) => {
      try {
        sessionStorage.removeItem(OPEN_KEY);
        sessionStorage.removeItem(FOCUS_SUBJECT_KEY);
      } catch {
        /* sem armazenamento */
      }
      openFrom((e as CustomEvent).detail);
    };
    window.addEventListener('medacademic:open-subject', onOpen);
    return () => window.removeEventListener('medacademic:open-subject', onOpen);
  }, []);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [contestsOpen, setContestsOpen] = useState(false);
  const [pastOpen, setPastOpen] = useState(false);

  // disciplina recém-criada já abre na tela dela
  const knownIds = useRef<Set<string> | null>(null);
  useEffect(() => {
    const ids = new Set(subjects.map((x) => x.id));
    if (knownIds.current) {
      const added = subjects.find((x) => !knownIds.current!.has(x.id));
      if (added) setDetail({ kind: 'subject', id: added.id });
    }
    knownIds.current = ids;
  }, [subjects]);

  // volta ao topo ao entrar/sair do detalhe
  useEffect(() => {
    try {
      window.scrollTo({ top: 0 });
    } catch {
      /* ignore */
    }
  }, [detail?.kind, detail?.id]);

  const areaGroups = useMemo(() => groupByArea(subjects), [subjects]);
  const stats = topicStats(topics.filter((t) => subjects.some((s) => s.id === t.subjectId)));

  const showContests = contestsActive;
  const showPastTop = isBasic;
  const showPastDiscreet = !isBasic && contestsActive;

  const modals = (
    <>
      <EditSubjectModal isOpen={!!editing} subject={editing} onClose={() => setEditing(null)} />
      <ContestsModal open={contestsOpen} onClose={() => setContestsOpen(false)} />
      <PastExamsModal open={pastOpen} onClose={() => setPastOpen(false)} />
    </>
  );

  const backBar = (label: string, to: Detail = null) => (
    <button
      type="button"
      id="struct-back"
      onClick={() => setDetail(to)}
      className="h-11 inline-flex items-center gap-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-black transition-colors"
    >
      <ArrowLeft className="h-5 w-5" /> {label}
    </button>
  );

  // ===== Detalhe: uma disciplina =====
  const detailSubject = detail?.kind === 'subject' ? subjects.find((s) => s.id === detail.id) : undefined;
  if (detailSubject) {
    return (
      <div className="space-y-4 pb-12 max-w-4xl">
        {detail?.kind === 'subject' && detail.fromArea
          ? backBar(detail.fromArea === OTHER_AREA.id ? 'Sem grande área' : detail.fromArea, { kind: 'area', id: detail.fromArea })
          : backBar('Disciplinas')}
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 sm:p-6">
          <SubjectSection subject={detailSubject} standalone allowLinking={mode === 'module' && !isBasic} onEdit={setEditing} />
        </div>
        {detailSubject.kind === 'module' && <ModuleLinks module={detailSubject} onOpenSubject={(id) => setDetail({ kind: 'subject', id })} />}
        {modals}
      </div>
    );
  }

  // ===== Detalhe: uma grande área =====
  const detailArea = detail?.kind === 'area' ? areaGroups.find((g) => g.area.id === detail.id) : undefined;
  if (detailArea) {
    const { area } = detailArea;
    const items = [...detailArea.items].sort((a, b) => specialtyOrder(a) - specialtyOrder(b));
    const ids = new Set(items.map((s) => s.id));
    const st = topicStats(topics.filter((t) => ids.has(t.subjectId)));
    const isOther = area.id === OTHER_AREA.id;
    return (
      <div className="space-y-4 pb-12">
        {backBar('Grandes áreas')}
        <div className="flex items-center gap-4">
          <span className="h-14 w-14 shrink-0 rounded-2xl grid place-items-center text-sm font-black" style={{ backgroundColor: `${area.color}1a`, color: area.color }}>
            {isOther ? '•••' : area.short}
          </span>
          <div className="min-w-0 flex-1">
            <h1 id="struct-area-title" className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
              {isOther ? 'Sem grande área' : area.id}
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {items.length} disciplina{items.length === 1 ? '' : 's'} · {st.seen}/{st.total} assuntos vistos · {st.pct}%
            </p>
            <Bar pct={st.pct} color={area.color} className="mt-2 max-w-xs" />
          </div>
        </div>
        {isOther && <p className="text-[11px] text-slate-500 dark:text-slate-400">Use “Editar disciplina” no menu ⋯ para escolher a grande área.</p>}
        <SubjectGrid
          subjects={items}
          topics={topics}
          topicBlocks={topicBlocks}
          today={ymd(new Date())}
          onOpen={(id) => setDetail({ kind: 'subject', id, fromArea: area.id })}
          onAdd={onOpenAddSubject}
        />
        {modals}
      </div>
    );
  }

  // ===== Visão geral =====
  return (
    <div className="space-y-6 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Disciplinas & assuntos</h1>
            <span id="cycle-structure-badge" className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${cycleInfo.color}1a`, color: cycleInfo.color }}>
              {cycleInfo.label}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {isBasic ? 'Seus módulos e disciplinas, com os assuntos de cada um.' : 'Organize por grande área ou pelo módulo da sua faculdade.'}
          </p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:items-center sm:shrink-0">
          {showContests && (
            <button
              id="struct-contests-btn"
              type="button"
              onClick={() => setContestsOpen(true)}
              className="h-10 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold"
            >
              <Trophy className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Provas de concurso</span>
            </button>
          )}
          {showPastTop && (
            <button
              id="struct-past-exams-btn"
              type="button"
              onClick={() => setPastOpen(true)}
              className="h-10 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold"
            >
              <FileClock className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Provas anteriores</span>
            </button>
          )}
          <button
            id="academic-add-subject-btn"
            onClick={onOpenAddSubject}
            className={`h-10 inline-flex items-center justify-center gap-1.5 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold ${
              showContests || showPastTop ? '' : 'col-span-2'
            }`}
          >
            <Plus className="h-3.5 w-3.5 shrink-0" /> Nova disciplina
          </button>
        </div>
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center space-y-3">
          <BookOpen className="h-9 w-9 mx-auto text-slate-300 dark:text-slate-700" />
          <div>
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">Monte o seu {cycleInfo.label}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Cadastre as disciplinas do semestre e coloque os assuntos dentro delas.</p>
          </div>
          <button onClick={onOpenAddSubject} className="h-10 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold">
            + Primeira disciplina
          </button>
        </div>
      ) : (
        <>
          {/* Resumo + seletor de visão */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Ring pct={stats.pct} color={cycleInfo.color} size={44} />
              <div className="min-w-0">
                <p className="text-sm font-black text-slate-900 dark:text-white">
                  {stats.seen}/{stats.total} assuntos vistos
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {subjects.length} disciplina{subjects.length === 1 ? '' : 's'}
                  {stats.pending > 0 ? ` · ${stats.pending} para ver depois` : ' · tudo em dia'}
                </p>
              </div>
            </div>
            {!isBasic && (
              <div role="tablist" aria-label="Organizar por" className="grid grid-cols-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-800/70 sm:w-80">
                {(
                  [
                    { id: 'area', label: 'Grandes áreas', Icon: LayoutGrid },
                    { id: 'module', label: 'Módulos', Icon: FolderTree },
                  ] as const
                ).map(({ id, label, Icon }) => (
                  <button
                    key={id}
                    id={`struct-view-${id}`}
                    type="button"
                    role="tab"
                    aria-selected={mode === id}
                    onClick={() => changeView(id)}
                    className={`h-10 inline-flex items-center justify-center gap-1.5 rounded-xl text-xs font-bold transition-colors ${
                      mode === id ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {mode === 'area' ? (
            <AreaGrid groups={areaGroups} topics={topics} onOpen={(id) => setDetail({ kind: 'area', id })} onAdd={onOpenAddSubject} />
          ) : (
            <>
              {!isBasic && subjects.some(hasArea) && (
                <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-2">
                  Abra uma disciplina para vincular assuntos das grandes áreas e estudar as duas coisas juntas.
                </p>
              )}
              {/* Módulos da faculdade (tipo próprio) em quadrados */}
              <div className="space-y-2">
                <h3 className="px-1 text-xs font-bold text-slate-500 dark:text-slate-400">Módulos da faculdade</h3>
                <ModuleGrid
                  modules={subjects.filter((s) => s.kind === 'module')}
                  topics={topics}
                  onOpen={(id) => setDetail({ kind: 'subject', id })}
                  onAdd={onOpenAddSubject}
                />
              </div>
              {subjects.some((s) => s.kind !== 'module') && (
                <div className="space-y-2">
                  <h3 className="px-1 text-xs font-bold text-slate-500 dark:text-slate-400">Disciplinas</h3>
                  <ModuleList subjects={subjects.filter((s) => s.kind !== 'module')} topics={topics} topicBlocks={topicBlocks} onOpen={(id) => setDetail({ kind: 'subject', id })} />
                </div>
              )}
            </>
          )}
        </>
      )}

      {showPastDiscreet && (
        <div className="flex justify-end pt-6">
          <button
            id="struct-past-exams-btn"
            type="button"
            onClick={() => setPastOpen(true)}
            className="h-10 inline-flex items-center gap-1 px-2 rounded-lg text-[11px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <FileClock className="h-3 w-3" /> Provas anteriores
          </button>
        </div>
      )}
      {modals}
    </div>
  );
};
