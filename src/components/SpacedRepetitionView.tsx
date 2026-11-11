import React, { useEffect, useMemo, useState } from 'react';
import { BookmarkCheck, CalendarDays, CheckCircle2, ClipboardCheck, HelpCircle, Play, Search, Sparkles, Undo2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { TopicBlock } from '../types';
import { SpacedRepetitionRulesCard } from './SpacedRepetitionRulesCard';
import { QuestionLogModal } from './modals/QuestionLogModal';
import { BLOCK_REVIEWS_TO_MASTER, addDaysYMD, isBlockDue, isTopicPending } from '../data/blockReview';
import { dueReviewQueue, isErrorDue, isItemReviewDue, reviewTechnique } from '../data/studyMethod';
import { todayYMD, useDayPlan } from '../hooks/useStudyPlan';
import { ReviewCard } from './review/ReviewCard';
import { UpcomingExamTopics } from './semester/UpcomingExamTopics';
import { ProjectReviewCard, projectReviewKey } from './review/ProjectReviewCard';
import { ReviewAgenda } from './review/ReviewAgenda';
import { ErrorNotebook, type ErrorFilter } from './review/ErrorNotebook';
import { GuidedReviewSession, guidedStorageKey, loadGuided, saveGuided, type GuidedState, type QueueEntry } from './review/GuidedReviewSession';
import { subjectLabel, taskDuration } from './review/reviewShared';
import { startPlanTask } from './plan/planShared';
import { EmptyState } from './shared/EmptyState';

interface SpacedRepetitionViewProps {
  onOpenAddTopic?: () => void;
}

type ReviewTab = 'hoje' | 'agenda' | 'todos' | 'erros';
const TABS: ReviewTab[] = ['hoje', 'agenda', 'todos', 'erros'];
type AllFilter = 'all' | 'due' | 'upcoming' | 'star' | 'consolidated';

// Aba Revisões: o lugar onde o aluno faz cada revisão do jeito certo (técnica da etapa,
// erros do caderno, registro em 1 toque), vê a agenda e treina o caderno de erros.
export const SpacedRepetitionView: React.FC<SpacedRepetitionViewProps> = () => {
  const {
    topicBlocks,
    topics,
    subjects,
    exams,
    studyMethod,
    setCurrentTab,
    markTopicSeen,
    openMethodGuide,
    reviewFocus,
    clearReviewFocus,
    replanOverdueReviews,
    undoBlockReview,
    startTask,
    userProfile,
  } = useApp();
  const today = todayYMD();
  const plan = useDayPlan();

  const [tab, setTab] = useState<ReviewTab>('hoje');
  const [errFilter, setErrFilter] = useState<{ f?: ErrorFilter; n: number }>({ n: 0 });
  const [isQuestionLogOpen, setIsQuestionLogOpen] = useState(false);
  // Sessão guiada: estado inicial (a fila em andamento fica salva na sessão do navegador)
  const guidedKey = guidedStorageKey(userProfile.email);
  const [session, setSession] = useState<{ initial: GuidedState; n: number } | null>(null);
  const [savedSession, setSavedSession] = useState<GuidedState | null>(() => loadGuided(guidedKey));
  const [highlightId, setHighlightId] = useState<string | null>(null);
  /** Hoje: card aberto (undefined = o primeiro da fila; null = todos fechados) */
  const [todayOpen, setTodayOpen] = useState<string | null | undefined>(undefined);
  const [allOpen, setAllOpen] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [allFilter, setAllFilter] = useState<AllFilter>('all');
  const [search, setSearch] = useState('');
  const [confirmUndo, setConfirmUndo] = useState<string | null>(null);

  // Ao terminar a revisão de um tema com pendências, pergunta se os tópicos "ver depois" já foram vistos
  const [pendingPromptBlock, setPendingPromptBlock] = useState<string | null>(null);
  const [pendingAnswers, setPendingAnswers] = useState<Record<string, 'sim' | 'nao'>>({});
  const handleReviewed = (blockId: string) => {
    setTodayOpen(undefined);
    if (topics.some((t) => t.blockId === blockId && isTopicPending(t))) {
      setPendingAnswers({});
      setPendingPromptBlock(blockId);
    }
  };

  // ---------------- Dados ----------------
  const subjectIds = useMemo(() => new Set(subjects.map((s) => s.id)), [subjects]);
  const cycleBlocks = useMemo(() => topicBlocks.filter((b) => b.reviewStatus !== 'estudando' && subjectIds.has(b.subjectId)), [topicBlocks, subjectIds]);
  const studyingCount = topicBlocks.filter((b) => b.reviewStatus === 'estudando' && subjectIds.has(b.subjectId)).length;
  const dueBlocks = useMemo(() => dueReviewQueue(topicBlocks, subjects, today, exams), [topicBlocks, subjects, today, exams]);
  const projects = useMemo(() => (studyMethod.projects || []).filter((p) => !p.archived), [studyMethod.projects]);
  const dueProjectItems = useMemo(
    () =>
      projects.flatMap((p) =>
        p.items
          .filter((it) => isItemReviewDue(it, today))
          .sort((a, b) => (a.nextReviewDate || '').localeCompare(b.nextReviewDate || ''))
          .map((it) => ({ project: p, item: it, key: projectReviewKey(p.id, it.id) }))
      ),
    [projects, today]
  );
  const todayQueue: QueueEntry[] = useMemo(
    () => [
      ...dueBlocks.map((b) => ({ key: b.id, blockId: b.id })),
      ...dueProjectItems.map((x) => ({ key: x.key, projectId: x.project.id, itemId: x.item.id })),
    ],
    [dueBlocks, dueProjectItems]
  );
  const doneTodayBlocks = cycleBlocks.filter((b) => b.lastReviewDate === today);
  const doneTodayItems = projects.reduce((a, p) => a + p.items.filter((it) => it.inReview && it.lastReviewDate === today).length, 0);
  const doneToday = doneTodayBlocks.length + doneTodayItems;

  const in7 = addDaysYMD(7, today);
  const next7 =
    cycleBlocks.filter((b) => b.reviewStatus === 'revisao' && b.nextReviewDate && b.nextReviewDate > today && b.nextReviewDate <= in7).length +
    projects.reduce((a, p) => a + p.items.filter((it) => it.inReview && it.nextReviewDate && it.nextReviewDate > today && it.nextReviewDate <= in7).length, 0);
  const errorsDue = (studyMethod.errorNotes || []).filter((n) => isErrorDue(n, today, topicBlocks)).length;
  const isConsolidated = (b: TopicBlock) => b.reviewStatus === 'dominado' || b.reviewsDone >= BLOCK_REVIEWS_TO_MASTER;
  const consolidated = cycleBlocks.filter(isConsolidated).length;

  // ---------------- Sessão guiada: começar, retomar, encerrar ----------------
  /** Marca como feitas as revisões registradas fora da sessão e põe o foco (se houver) como a atual */
  const reconcile = (s: GuidedState, focusKey?: string): GuidedState => {
    const doneSet = new Set(s.done);
    s.order.forEach((e) => {
      if (e.blockId) {
        const b = topicBlocks.find((x) => x.id === e.blockId);
        if (b && b.lastReviewDate === today && !isBlockDue(b, today)) doneSet.add(e.key);
      } else {
        const it = projects.find((p) => p.id === e.projectId)?.items.find((x) => x.id === e.itemId);
        if (it && it.lastReviewDate === today && !isItemReviewDue(it, today)) doneSet.add(e.key);
      }
    });
    const order = [...s.order];
    let idx = Math.min(s.idx, order.length);
    let skipped = s.skipped.filter((k) => !doneSet.has(k));
    if (focusKey) {
      const i = order.findIndex((e) => e.key === focusKey);
      if (i >= 0 && !doneSet.has(focusKey)) {
        const [e] = order.splice(i, 1);
        if (i < idx) idx -= 1;
        order.splice(idx, 0, e);
        skipped = skipped.filter((k) => k !== focusKey);
      }
    }
    while (idx < order.length && doneSet.has(order[idx].key)) idx += 1;
    return { ...s, order, idx, done: [...doneSet], skipped };
  };
  const remainingOf = (s: GuidedState | null) => {
    if (!s) return 0;
    const r = reconcile(s);
    return r.order.filter((e) => !r.done.includes(e.key)).length;
  };
  const openSession = (s: GuidedState) => {
    saveGuided(guidedKey, s);
    setSavedSession(null);
    setSession((cur) => ({ initial: s, n: (cur?.n || 0) + 1 }));
    setTab('hoje');
  };
  const startSession = () => openSession({ date: today, order: todayQueue, idx: 0, done: [], skipped: [] });
  const resumeSession = () => {
    const s = loadGuided(guidedKey);
    if (s) openSession(reconcile(s));
    else setSavedSession(null);
  };
  const closeSession = () => {
    saveGuided(guidedKey, null);
    setSavedSession(null);
    setSession(null);
  };
  const savedRemaining = !session ? remainingOf(savedSession) : 0;

  // ---------------- Foco vindo de outra tela (openReviews) ----------------
  useEffect(() => {
    if (!reviewFocus) return;
    const { tab: wanted, blockId } = reviewFocus;
    // Voltou do Pomodoro com um tema da sessão guiada: a sessão continua dele
    const saved = blockId ? loadGuided(guidedKey) : null;
    if (blockId && saved) {
      const r = reconcile(saved, blockId);
      if (r.order.some((e) => e.key === blockId && !r.done.includes(e.key))) {
        openSession(r);
        clearReviewFocus();
        return;
      }
    }
    let next = TABS.includes(wanted as ReviewTab) ? (wanted as ReviewTab) : undefined;
    if (blockId) {
      const b = topicBlocks.find((x) => x.id === blockId);
      const due = !!b && isBlockDue(b, today);
      if (!next || next === 'agenda' || (next === 'hoje' && !due)) next = due ? 'hoje' : 'todos';
      if (next === 'hoje') setTodayOpen(blockId);
      else {
        setAllFilter('all');
        setSubjectFilter('all');
        setSearch('');
        setAllOpen(blockId);
      }
      setSession(null);
      setSavedSession(loadGuided(guidedKey));
      setHighlightId(blockId);
    }
    if (next) setTab(next);
    clearReviewFocus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewFocus]);

  useEffect(() => {
    if (!highlightId) return;
    const raf = requestAnimationFrame(() =>
      setTimeout(() => document.getElementById(`review-card-${highlightId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    );
    const t = setTimeout(() => setHighlightId(null), 2800);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t);
    };
  }, [highlightId, tab]);

  const openBlockInAll = (blockId: string) => {
    setAllFilter('all');
    setSubjectFilter('all');
    setSearch('');
    setAllOpen(blockId);
    setTab('todos');
    setHighlightId(blockId);
  };

  // ---------------- Todos ----------------
  const blockTopicsOf = (b: TopicBlock) => topics.filter((t) => t.blockId === b.id);
  const filteredBlocks = cycleBlocks
    .filter((b) => {
      if (subjectFilter !== 'all' && b.subjectId !== subjectFilter) return false;
      if (allFilter === 'due' && !isBlockDue(b, today)) return false;
      if (allFilter === 'upcoming' && !(b.reviewStatus === 'revisao' && b.nextReviewDate && b.nextReviewDate > today)) return false;
      if (allFilter === 'star' && !b.star) return false;
      if (allFilter === 'consolidated' && !isConsolidated(b)) return false;
      const q = search.trim().toLowerCase();
      if (q) {
        const sub = subjects.find((s) => s.id === b.subjectId);
        return b.name.toLowerCase().includes(q) || subjectLabel(sub).toLowerCase().includes(q) || blockTopicsOf(b).some((t) => t.title.toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      if (a.reviewStatus === 'dominado' && b.reviewStatus !== 'dominado') return 1;
      if (a.reviewStatus !== 'dominado' && b.reviewStatus === 'dominado') return -1;
      return (a.nextReviewDate || '9999').localeCompare(b.nextReviewDate || '9999');
    });
  const subjectsInCycle = subjects.filter((s) => cycleBlocks.some((b) => b.subjectId === s.id));

  const effectiveTodayOpen = todayOpen === undefined ? todayQueue[0]?.key : todayOpen;

  const startNextPlanTask = () => {
    const t = plan.next;
    if (!t) return;
    startPlanTask(t, { startTask });
  };

  // ---------------- Render ----------------
  const metrics: Array<{ id: string; label: string; value: number; hint: string; tone: string; onClick: () => void }> = [
    {
      id: 'review-metric-today',
      label: 'Para hoje',
      value: todayQueue.length,
      hint: doneToday > 0 ? `${doneToday} feita${doneToday > 1 ? 's' : ''} hoje` : 'revisões',
      tone: 'text-sky-600 dark:text-sky-400',
      onClick: () => setTab('hoje'),
    },
    { id: 'review-metric-week', label: 'Próximos 7 dias', value: next7, hint: 'agendadas', tone: 'text-indigo-600 dark:text-indigo-400', onClick: () => setTab('agenda') },
    {
      id: 'review-metric-errors',
      label: 'Erros para refazer',
      value: errorsDue,
      hint: 'do caderno',
      tone: 'text-amber-600 dark:text-amber-400',
      onClick: () => {
        setErrFilter((e) => ({ f: 'hoje', n: e.n + 1 }));
        setTab('erros');
      },
    },
    {
      id: 'review-metric-consolidated',
      label: 'Consolidados',
      value: consolidated,
      hint: 'temas com R4 ou mais',
      tone: 'text-emerald-600 dark:text-emerald-400',
      onClick: () => {
        setAllFilter('consolidated');
        setTab('todos');
      },
    },
  ];

  const tabs: Array<{ id: ReviewTab; label: string; count?: number }> = [
    { id: 'hoje', label: 'Hoje', count: todayQueue.length },
    { id: 'agenda', label: 'Agenda' },
    { id: 'todos', label: 'Todos', count: cycleBlocks.length },
    { id: 'erros', label: 'Caderno de erros', count: errorsDue || undefined },
  ];

  return (
    <div id="tour-spaced-repetition" className="space-y-5 pb-16">
      {/* Cabeçalho */}
      <div id="review-header" className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Revisões</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Revisar é tentar lembrar, não reler.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="review-how-btn"
            type="button"
            onClick={() => openMethodGuide(2)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-500/20 text-xs font-bold"
          >
            <HelpCircle className="h-4 w-4" /> Como funciona
          </button>
          <button
            id="open-question-log-btn"
            type="button"
            onClick={() => setIsQuestionLogOpen(true)}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black shadow-sm"
          >
            <ClipboardCheck className="h-4 w-4" /> Registrar questões
          </button>
        </div>
      </div>

      {/* Bem-vindo de volta */}
      {plan.overflowReviews > 0 && (
        <div
          id="review-welcome-banner"
          className="rounded-3xl border border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-r from-indigo-50 to-sky-50 dark:from-indigo-950/40 dark:to-sky-950/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
        >
          <div className="flex items-start gap-3 min-w-0">
            <span className="text-2xl leading-none" aria-hidden>
              👋
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-black text-slate-900 dark:text-white">Bem-vindo de volta!</p>
              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
                Algumas revisões ficaram para trás, e tudo bem. São {plan.overflowReviews} a mais do que cabe hoje: espalhamos pelos próximos dias, as mais importantes primeiro.
              </p>
            </div>
          </div>
          <button
            id="review-replan-btn"
            type="button"
            onClick={() => replanOverdueReviews()}
            className="shrink-0 inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-black shadow-sm"
          >
            <Sparkles className="h-4 w-4" /> Replanejar
          </button>
        </div>
      )}

      {/* Métricas */}
      <div id="review-metrics" className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {metrics.map((m) => (
          <button
            key={m.id}
            id={m.id}
            type="button"
            onClick={m.onClick}
            className="text-left p-3.5 sm:p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700 transition-colors min-w-0"
          >
            <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">{m.label}</div>
            <div className={`text-2xl sm:text-3xl font-black mt-0.5 tabular-nums ${m.tone}`}>{m.value}</div>
            <div className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{m.hint}</div>
          </button>
        ))}
      </div>

      {/* Sub-abas */}
      <div className="sticky top-0 z-20 -mx-4 px-4 sm:mx-0 sm:px-0 py-1 bg-[#F8FAFC]/90 dark:bg-slate-950/90 backdrop-blur-sm">
        <div role="tablist" aria-label="Revisões" className="flex gap-1 p-1 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              id={`review-tab-${t.id}`}
              role="tab"
              type="button"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 shrink-0 inline-flex items-center justify-center gap-1.5 min-h-[40px] px-3 rounded-xl text-xs sm:text-[13px] font-bold whitespace-nowrap transition-colors ${
                tab === t.id ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {t.label}
              {t.count !== undefined && t.count > 0 && (
                <span
                  className={`text-[10px] font-black px-1.5 py-0.5 rounded-full tabular-nums ${
                    tab === t.id ? 'bg-sky-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {t.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ---------------- HOJE ---------------- */}
      {tab === 'hoje' &&
        (session ? (
          <GuidedReviewSession key={session.n} initial={session.initial} storageKey={guidedKey} onClose={closeSession} onReviewed={handleReviewed} />
        ) : (
          <div id="review-today" className="space-y-4">
            {/* Assuntos das próximas provas (check list ligado ao Semestre) */}
            <UpcomingExamTopics withinDays={30} compact />
            {savedRemaining > 0 && (
              <div
                id="review-resume-session"
                className="rounded-3xl border border-sky-300 dark:border-sky-700 bg-sky-50 dark:bg-sky-950/40 p-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-black text-slate-900 dark:text-white">Sua sessão guiada está pausada</p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Continue de onde parou.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    id="review-resume-session-btn"
                    onClick={resumeSession}
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black"
                  >
                    <Play className="h-4 w-4 fill-current shrink-0" /> Continuar sessão guiada (faltam {savedRemaining})
                  </button>
                  <button
                    type="button"
                    id="review-resume-session-end"
                    onClick={closeSession}
                    aria-label="Encerrar a sessão guiada"
                    title="Encerrar a sessão guiada"
                    className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            )}
            {todayQueue.length > 0 ? (
              <>
                <div className="rounded-3xl border border-sky-200 dark:border-sky-900/60 bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
                  <div className="min-w-0">
                    <p className="text-[15px] font-black text-slate-900 dark:text-white">
                      {todayQueue.length} revis{todayQueue.length === 1 ? 'ão' : 'ões'} para hoje
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                      Na ordem certa: as remarcadas primeiro, depois as que caem muito e as que você mais erra.
                    </p>
                  </div>
                  <button
                    id="review-start-session"
                    type="button"
                    onClick={startSession}
                    className="shrink-0 inline-flex items-center justify-center gap-2 min-h-[48px] px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black shadow-md"
                  >
                    <Play className="h-4 w-4 fill-current" /> Fazer as revisões de hoje
                  </button>
                </div>

                <div id="review-today-list" className="space-y-3">
                  {todayQueue.map((e) => {
                    if (e.blockId) {
                      const b = topicBlocks.find((x) => x.id === e.blockId);
                      if (!b) return null;
                      return (
                        <ReviewCard
                          key={e.key}
                          block={b}
                          expanded={effectiveTodayOpen === e.key}
                          onToggle={() => setTodayOpen(effectiveTodayOpen === e.key ? null : e.key)}
                          highlight={highlightId === e.key}
                          onReviewed={handleReviewed}
                        />
                      );
                    }
                    const x = dueProjectItems.find((p) => p.key === e.key);
                    if (!x) return null;
                    return (
                      <ProjectReviewCard
                        key={e.key}
                        project={x.project}
                        item={x.item}
                        expanded={effectiveTodayOpen === e.key}
                        onToggle={() => setTodayOpen(effectiveTodayOpen === e.key ? null : e.key)}
                        onReviewed={() => setTodayOpen(undefined)}
                      />
                    );
                  })}
                </div>
              </>
            ) : (
              <EmptyState
                id="review-today-empty"
                icon={CheckCircle2}
                tone="emerald"
                title={doneToday > 0 ? 'Revisões de hoje feitas' : 'Nenhuma revisão para hoje'}
                text={
                  cycleBlocks.length === 0
                    ? 'Termine o estudo de um tema. A 1ª revisão aparece aqui no dia seguinte.'
                    : 'Tudo em dia. Volte amanhã.'
                }
                actionLabel={cycleBlocks.length === 0 ? 'Abrir disciplinas' : plan.next && plan.next.kind !== 'review' ? undefined : 'Ver a agenda'}
                onAction={cycleBlocks.length === 0 ? () => setCurrentTab('structure') : () => setTab('agenda')}
                actionIcon={cycleBlocks.length === 0 ? undefined : CalendarDays}
                secondaryLabel={cycleBlocks.length === 0 || (plan.next && plan.next.kind !== 'review') ? 'Ver a agenda' : undefined}
                onSecondary={() => setTab('agenda')}
                secondaryIcon={CalendarDays}
              >
                {plan.next && plan.next.kind !== 'review' && (
                  <div className="max-w-md mx-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3 flex items-center gap-3 text-left">
                    <span className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: plan.next.color + '1a' }}>
                      {plan.next.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Próximo passo</p>
                      <p className="text-[13px] font-black text-slate-900 dark:text-white truncate">{plan.next.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{taskDuration(plan.next)}</p>
                    </div>
                    <button
                      id="review-next-step-start"
                      type="button"
                      onClick={startNextPlanTask}
                      className="shrink-0 inline-flex items-center gap-1.5 min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Começar
                    </button>
                  </div>
                )}
              </EmptyState>
            )}

            {/* Feitas hoje (com desfazer) */}
            {doneTodayBlocks.length > 0 && (
              <div id="review-done-today" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5">
                <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5">Feitas hoje</p>
                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {doneTodayBlocks.map((b) => {
                    const done = reviewTechnique({ reviewsDone: Math.max(0, b.reviewsDone - 1) }, subjects.find((s) => s.id === b.subjectId)?.format);
                    return (
                      <li key={b.id} className="py-2">
                        <div className="flex items-center gap-2.5">
                          <span className="text-emerald-500 text-sm" aria-hidden>
                            ✓
                          </span>
                          <button type="button" onClick={() => openBlockInAll(b.id)} className="min-w-0 flex-1 text-left">
                            <span className="block text-[13px] font-bold text-slate-800 dark:text-slate-100 truncate">
                              {done.badge} · {b.name}
                            </span>
                          </button>
                          {confirmUndo !== b.id && (
                            <button
                              type="button"
                              onClick={() => setConfirmUndo(b.id)}
                              className="shrink-0 inline-flex items-center gap-1 min-h-[36px] px-2 text-[11px] font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                            >
                              <Undo2 className="h-3.5 w-3.5" /> Desfazer
                            </button>
                          )}
                        </div>
                        {confirmUndo === b.id && (
                          <div className="mt-2 flex flex-wrap items-center gap-2 pl-6">
                            <span className="text-xs text-slate-600 dark:text-slate-300">Desfazer esta revisão?</span>
                            <button
                              type="button"
                              onClick={() => {
                                undoBlockReview(b.id);
                                setConfirmUndo(null);
                              }}
                              className="min-h-[36px] px-3 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-[11px] font-black"
                            >
                              Sim, desfazer
                            </button>
                            <button type="button" onClick={() => setConfirmUndo(null)} className="min-h-[36px] px-3 rounded-lg text-[11px] font-bold text-slate-500">
                              Cancelar
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </div>
        ))}

      {/* ---------------- AGENDA ---------------- */}
      {tab === 'agenda' && <ReviewAgenda onOpenBlock={openBlockInAll} onOpenPersonal={() => setCurrentTab('personal')} onOpenStructure={() => setCurrentTab('structure')} />}

      {/* ---------------- TODOS ---------------- */}
      {tab === 'todos' && (
        <div id="review-all" className="space-y-3">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2.5">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  id="review-search"
                  type="search"
                  placeholder="Buscar tema ou tópico..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full min-h-[42px] text-sm pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
                />
              </div>
              <select
                id="review-subject-filter"
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="min-h-[42px] text-xs font-semibold px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 sm:w-56"
              >
                <option value="all">Todas as disciplinas</option>
                {subjectsInCycle.map((s) => (
                  <option key={s.id} value={s.id}>
                    {subjectLabel(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 pb-0.5">
              {(
                [
                  ['all', `Todos · ${cycleBlocks.length}`],
                  ['due', `Para hoje · ${dueBlocks.length}`],
                  ['upcoming', 'Próximas'],
                  ['star', '⭐ Cai muito'],
                  ['consolidated', `Consolidados · ${consolidated}`],
                ] as Array<[AllFilter, string]>
              ).map(([id, label]) => (
                <button
                  key={id}
                  id={`review-filter-${id}`}
                  type="button"
                  onClick={() => setAllFilter(id)}
                  className={`shrink-0 min-h-[36px] px-3 rounded-full text-xs font-bold transition-colors ${
                    allFilter === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {filteredBlocks.length === 0 ? (
            cycleBlocks.length === 0 ? (
              <EmptyState
                icon={BookmarkCheck}
                title="Nenhum tema nas revisões ainda"
                text="Marque todos os tópicos de um tema como vistos. A 1ª revisão aparece no dia seguinte."
                actionLabel="Abrir disciplinas"
                onAction={() => setCurrentTab('structure')}
              />
            ) : (
              <EmptyState
                icon={Search}
                tone="slate"
                size="sm"
                title="Nenhum tema neste filtro"
                text="Tente outro filtro ou limpe a busca."
                actionLabel="Ver todos"
                onAction={() => {
                  setAllFilter('all');
                  setSearch('');
                  setSubjectFilter('all');
                }}
              />
            )
          ) : (
            <div id="review-all-list" className="space-y-3">
              {filteredBlocks.map((b) => (
                <ReviewCard
                  key={b.id}
                  block={b}
                  expanded={allOpen === b.id}
                  onToggle={() => setAllOpen(allOpen === b.id ? null : b.id)}
                  highlight={highlightId === b.id}
                  onReviewed={handleReviewed}
                />
              ))}
            </div>
          )}
          {studyingCount > 0 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1">
              + {studyingCount} tema{studyingCount > 1 ? 's' : ''} ainda no estudo inicial (aba Disciplinas). Entra{studyingCount > 1 ? 'm' : ''} aqui quando você fechar o Dia 0.
            </p>
          )}
        </div>
      )}

      {/* ---------------- CADERNO DE ERROS ---------------- */}
      {tab === 'erros' && <ErrorNotebook key={errFilter.n} initialFilter={errFilter.f} />}

      <SpacedRepetitionRulesCard initialExpanded={false} />

      <QuestionLogModal isOpen={isQuestionLogOpen} onClose={() => setIsQuestionLogOpen(false)} />

      {pendingPromptBlock &&
        (() => {
          const block = topicBlocks.find((x) => x.id === pendingPromptBlock);
          // mantém na lista os que acabaram de ser respondidos (para mostrar o resultado)
          const items = topics.filter((t) => t.blockId === pendingPromptBlock && (isTopicPending(t) || pendingAnswers[t.id]));
          if (!block || items.length === 0) return null;
          const allAnswered = items.every((t) => pendingAnswers[t.id]);
          return (
            <div className="app-modal fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
              <div
                id="pending-topics-prompt"
                className="app-modal-panel w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4"
              >
                <div>
                  <p className="text-[10px] font-black uppercase tracking-wider text-amber-600 dark:text-amber-400">Assuntos para ver depois</p>
                  <h2 className="text-base font-black text-slate-900 dark:text-white">{block.name}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Revisão registrada! Você já viu estes assuntos que estavam para ver depois?</p>
                </div>
                <ul className="space-y-2">
                  {items.map((t) => {
                    const ans = pendingAnswers[t.id];
                    return (
                      <li
                        key={t.id}
                        className={`rounded-xl border p-2.5 ${
                          ans === 'sim' ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/60 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/30'
                        }`}
                      >
                        <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 break-words">{t.title}</span>
                        {ans ? (
                          <p className={`text-[11px] mt-1 font-semibold ${ans === 'sim' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            {ans === 'sim' ? 'Marcado como visto.' : 'Continua para ver depois: pergunto de novo na próxima revisão.'}
                          </p>
                        ) : (
                          <div className="flex gap-1.5 mt-2">
                            <button
                              type="button"
                              onClick={() => {
                                markTopicSeen(t.id);
                                setPendingAnswers((a) => ({ ...a, [t.id]: 'sim' }));
                              }}
                              className="min-h-[36px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold"
                            >
                              ✓ Sim, já vi
                            </button>
                            <button
                              type="button"
                              onClick={() => setPendingAnswers((a) => ({ ...a, [t.id]: 'nao' }))}
                              className="min-h-[36px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                            >
                              Ainda não
                            </button>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <button
                  type="button"
                  onClick={() => setPendingPromptBlock(null)}
                  className={`w-full min-h-[44px] px-4 rounded-xl text-xs font-bold ${
                    allAnswered ? 'bg-sky-600 hover:bg-sky-500 text-white' : 'border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {allAnswered ? 'Concluir' : 'Responder depois'}
                </button>
              </div>
            </div>
          );
        })()}
    </div>
  );
};
