import React, { useMemo, useState } from 'react';
import { Plus, Search, ChevronDown, Check, Trash2, Clock3, MoreHorizontal, Pencil, RotateCcw, Repeat, Trophy, Layers, X, Star, Play, Lightbulb, Gift, BarChart3, ListTree } from 'lucide-react';
import { SubItemsEditor, subItemsProgress } from './shared/SubItems';
import { useApp } from '../context/AppContext';
import { Subject, Topic, TopicBlock } from '../types';
import { SPECIALTY_BLOCK_SUGGESTIONS } from '../data/areas';
import { BLOCK_REVIEWS_TO_MASTER, cycleDay, formatDM, isBlockDue, isTopicPending, isTopicResolved, isTopicSeen, ymd } from '../data/blockReview';
import { TECHNIQUES, reviewTechnique } from '../data/studyMethod';
import { Bar, InlineConfirm, countsInProgress, subjectColor, topicStats, formatMin } from './structure/shared';
import { BlockStatsModal } from './structure/BlockStatsModal';
import { PlanBlockButton } from './structure/PlanBlockButton';
import { LinkedAreaBlocks } from './structure/LinkedAreaBlocks';

/** Índice do passo "Feynman" no checklist do estudo inicial */
const FEYNMAN_STEP = '2';
const INITIAL_STEPS = TECHNIQUES.estudo_inicial.steps;
const BONUS = '#f97316';

/** "Pré-teste: tente 3 a 5..." → ["Pré-teste", "tente 3 a 5..."] */
const splitStep = (s: string): [string, string] => {
  const i = s.indexOf(':');
  return i > 0 && i < 24 ? [s.slice(0, i), s.slice(i + 1).trim()] : [s, ''];
};

interface SubjectBlocksPanelProps {
  subject: Subject;
  /** Visão por módulo: permite ligar assuntos das grandes áreas aos blocos */
  allowLinking?: boolean;
}

// Blocos da disciplina (ex.: Endocrinologia → Diabetes, Tireoide) com seus tópicos para marcar "visto"
export const SubjectBlocksPanel: React.FC<SubjectBlocksPanelProps> = ({ subject, allowLinking }) => {
  const {
    topics,
    topicBlocks,
    addTopic,
    updateTopic,
    deleteTopic,
    markTopicSeen,
    resetTopicProgress,
    markTopicPending,
    addTopicBlock,
    renameTopicBlock,
    deleteTopicBlock,
    restartBlockReviews,
    toggleInitialStep,
    setBlockStar,
    startTask,
    studyPrefs,
    openReviews,
  } = useApp();

  const [search, setSearch] = useState('');
  const [stepsOpen, setStepsOpen] = useState<Record<string, boolean>>({});
  // Tema fechado (último tópico marcado) sem o passo Feynman: aviso leve, não bloqueia
  const [closedNoFeynman, setClosedNoFeynman] = useState<Record<string, boolean>>({});
  const [newBlockOpen, setNewBlockOpen] = useState(false);
  const [newBlockName, setNewBlockName] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  // Subtópicos abertos por tópico (com subtópicos, começa aberto)
  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ kind: 'block' | 'restart' | 'topic'; id: string } | null>(null);
  const [statsFor, setStatsFor] = useState<string | null>(null);

  const todayStr = ymd(new Date());
  const accent = subjectColor(subject);

  const blocks = useMemo(
    () => topicBlocks.filter((b) => b.subjectId === subject.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [topicBlocks, subject.id]
  );
  const subjectTopics = topics.filter((t) => t.subjectId === subject.id);
  const subjectStats = topicStats(subjectTopics);
  const inReview = blocks.filter((b) => b.reviewStatus === 'revisao').length;
  const mastered = blocks.filter((b) => b.reviewStatus !== 'estudando' && b.reviewsDone >= BLOCK_REVIEWS_TO_MASTER).length;

  const suggestions = (SPECIALTY_BLOCK_SUGGESTIONS[subject.specialty || ''] || []).filter(
    (s) => !blocks.some((b) => b.name.toLowerCase() === s.toLowerCase())
  );

  const createBlock = (name: string) => {
    if (!name.trim()) return;
    const id = addTopicBlock(subject.id, name);
    setCollapsed((c) => ({ ...c, [id]: false }));
    setNewBlockName('');
    setNewBlockOpen(true); // continua aberto para criar vários blocos em sequência
  };

  const addTopicTo = (block: TopicBlock) => {
    const title = (drafts[block.id] || '').trim();
    if (!title) return;
    addTopic({
      subjectId: subject.id,
      blockId: block.id,
      moduleName: block.name,
      title,
      status: 'nao_iniciado',
      priority: 'media',
      specialty: subject.specialty,
      tags: [block.name],
    });
    setDrafts((d) => ({ ...d, [block.id]: '' }));
  };

  // Se este clique fecha o tema (último tópico) e o Feynman não foi feito, mostra um aviso leve
  const willCloseBlock = (t: Topic) => {
    const block = blocks.find((b) => b.id === t.blockId);
    if (!block || block.reviewStatus !== 'estudando') return undefined;
    const others = subjectTopics.filter((x) => x.blockId === block.id && x.id !== t.id);
    return others.every(isTopicResolved) ? block : undefined;
  };
  const noteClosing = (t: Topic) => {
    if (isTopicResolved(t)) return;
    const block = willCloseBlock(t);
    if (block && !(block.initialSteps || []).includes(FEYNMAN_STEP)) setClosedNoFeynman((c) => ({ ...c, [block.id]: true }));
  };

  // Concluído / Ver depois / Aula bônus: clicar de novo no ativo volta para "não iniciado"
  const toggleSeen = (t: Topic) => {
    if (t.bonus) return updateTopic(t.id, { bonus: false }); // vira um tópico normal, continua visto
    if (isTopicSeen(t)) return resetTopicProgress(t.id);
    noteClosing(t);
    markTopicSeen(t.id);
  };
  const togglePending = (t: Topic) => {
    if (isTopicPending(t)) return resetTopicProgress(t.id);
    noteClosing(t);
    markTopicPending(t.id);
    if (t.bonus) updateTopic(t.id, { bonus: false });
  };
  // Aula bônus: fica visto e ok, mas fora da conta do bloco e do "ver depois"
  const toggleBonus = (t: Topic) => {
    if (t.bonus) return updateTopic(t.id, { bonus: false, status: 'nao_iniciado' });
    noteClosing(t);
    if (isTopicSeen(t)) updateTopic(t.id, { bonus: true });
    else updateTopic(t.id, { bonus: true, status: 'em_andamento' });
  };

  const startInitialStudy = (block: TopicBlock) =>
    startTask({
      title: `Tema novo: ${block.name}`,
      kind: 'new_block',
      subjectId: subject.id,
      blockId: block.id,
      steps: INITIAL_STEPS,
      minutes: studyPrefs.focusMinutes,
      breakMinutes: studyPrefs.breakMinutes,
    });

  const renderStatus = (block: TopicBlock, seen: number, total: number) => {
    if (block.reviewStatus === 'dominado') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
          <Trophy className="h-3 w-3" /> Dominado
        </span>
      );
    }
    if (block.reviewStatus === 'revisao') {
      const due = isBlockDue(block, todayStr);
      const tech = reviewTechnique(block, subject.format);
      const late = due && !!block.nextReviewDate && block.nextReviewDate < todayStr;
      return (
        <span
          className="inline-flex items-center gap-1 min-w-0 max-w-full text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ color: tech.color, backgroundColor: `${tech.color}14` }}
          title={`${tech.label}: ${tech.steps.join(' · ')}`}
        >
          <span aria-hidden>{tech.emoji}</span>
          <span className="truncate">{tech.badge}</span>
          <span className="shrink-0 text-slate-500 dark:text-slate-400 font-semibold">
            · {due ? (late ? `desde ${formatDM(block.nextReviewDate)}` : 'hoje') : formatDM(block.nextReviewDate)}
          </span>
        </span>
      );
    }
    return (
      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
        Em estudo · {seen}/{total}
      </span>
    );
  };

  const q = search.trim().toLowerCase();
  const menuBtn = 'w-full min-h-[40px] flex items-center gap-2 px-2.5 rounded-lg text-xs font-semibold';

  return (
    <div className="mt-4 space-y-3" onClick={() => menuFor && setMenuFor(null)}>
      {/* Resumo + ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          {blocks.length} bloco{blocks.length === 1 ? '' : 's'} · {subjectStats.seen}/{subjectStats.total} tópicos vistos
          {inReview > 0 && <span className="text-sky-600 dark:text-sky-400"> · {inReview} em revisão</span>}
          {mastered > 0 && <span className="text-emerald-600 dark:text-emerald-400"> · {mastered} dominado{mastered === 1 ? '' : 's'}</span>}
        </p>
        <div className="flex items-center gap-2">
          {blocks.length > 0 && (
            <div className="relative flex-1 sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filtrar tópicos"
                className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 pl-8 pr-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
              />
            </div>
          )}
          <button
            id="subject-new-block-btn"
            onClick={() => setNewBlockOpen((o) => !o)}
            className="shrink-0 h-10 flex items-center gap-1.5 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
          >
            <Plus className="h-3.5 w-3.5" /> Novo bloco
          </button>
        </div>
      </div>

      {/* Criar bloco */}
      {(newBlockOpen || blocks.length === 0) && (
        <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/40 p-3 space-y-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createBlock(newBlockName);
            }}
            className="flex items-center gap-2"
          >
            <Layers className="h-4 w-4 shrink-0" style={{ color: accent }} />
            <input
              id="subject-new-block-input"
              autoFocus={newBlockOpen}
              value={newBlockName}
              onChange={(e) => setNewBlockName(e.target.value)}
              placeholder={subject.specialty ? `Nome do bloco (ex: ${(SPECIALTY_BLOCK_SUGGESTIONS[subject.specialty] || ['Diabetes'])[0]})` : 'Nome do bloco (ex: Neonatologia 1)'}
              className="flex-1 min-w-0 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
            />
            <button type="submit" disabled={!newBlockName.trim()} className="h-10 px-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold disabled:opacity-40">
              Criar
            </button>
            {blocks.length > 0 && (
              <button type="button" onClick={() => setNewBlockOpen(false)} className="h-10 w-10 grid place-items-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
          {suggestions.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500">Sugestões:</span>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => createBlock(s)}
                  className="h-8 px-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-sky-400"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
          {blocks.length === 0 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Organize a disciplina em blocos (temas) e coloque os tópicos dentro deles. Quando todos os tópicos de um bloco forem marcados, ele entra nas Revisões: a 1ª é amanhã (24 h).
            </p>
          )}
        </div>
      )}

      {/* Blocos */}
      {blocks.map((block) => {
        const list = subjectTopics.filter((t) => t.blockId === block.id);
        const shown = q ? list.filter((t) => t.title.toLowerCase().includes(q)) : list;
        if (q && shown.length === 0 && !block.name.toLowerCase().includes(q)) return null;
        const st = topicStats(list);
        const counted = list.filter(countsInProgress);
        const resolved = counted.filter(isTopicResolved).length;
        const isCollapsed = collapsed[block.id] ?? false;
        const due = isBlockDue(block, todayStr);
        const acts = block.activities || [];
        const actsDone = acts.filter((a) => a.done).length;
        const studiedMin = (block.studyDays || []).reduce((a, d) => a + (d.minutes || 0), 0) || block.studyMinutes || 0;

        return (
          <section key={block.id} id={`struct-block-${block.id}`} className="rounded-2xl bg-slate-50/70 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800/80">
            <header className="flex items-start gap-1.5 px-2 sm:px-3 pt-2.5 pb-2">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [block.id]: !isCollapsed }))}
                className="h-10 w-8 shrink-0 grid place-items-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label={isCollapsed ? 'Expandir bloco' : 'Recolher bloco'}
                aria-expanded={!isCollapsed}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
              <div className="min-w-0 flex-1 pt-2">
                {renaming === block.id ? (
                  <input
                    autoFocus
                    defaultValue={block.name}
                    onBlur={(e) => {
                      renameTopicBlock(block.id, e.target.value);
                      setRenaming(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                      if (e.key === 'Escape') setRenaming(null);
                    }}
                    className="w-full bg-transparent text-sm font-black text-slate-900 dark:text-white border-b border-sky-500 focus:outline-hidden"
                  />
                ) : (
                  <h3 className="text-sm font-black text-slate-900 dark:text-white truncate" onDoubleClick={() => setRenaming(block.id)}>
                    {block.name}
                  </h3>
                )}
                <Bar pct={st.pct} color={accent} className="mt-1.5" />
                <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {renderStatus(block, st.seen, st.total)}
                  {block.star && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">⭐ cai muito</span>}
                  {acts.length > 0 && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                      {actsDone}/{acts.length} atividades
                    </span>
                  )}
                  {block.needsQuestions && (
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-300">faltam questões</span>
                  )}
                </div>
                {block.completedDate && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">
                    Estudado em <strong className="text-slate-700 dark:text-slate-300">{formatDM(block.completedDate)}</strong>
                    {studiedMin > 0 && <> · {formatMin(studiedMin)}</>}
                    {block.reviewStatus === 'revisao' && block.nextReviewDate && (
                      <>
                        {' '}· próxima: <strong className="text-slate-700 dark:text-slate-300">R{block.reviewsDone + 1} em {formatDM(block.nextReviewDate)}</strong> (Dia {cycleDay(block, block.nextReviewDate)})
                      </>
                    )}
                  </p>
                )}
                {due && (
                  <button
                    id={`block-review-btn-${block.id}`}
                    onClick={() => openReviews({ blockId: block.id, tab: 'hoje' })}
                    className="mt-2 h-10 inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold"
                  >
                    <Repeat className="h-3.5 w-3.5" /> Revisar agora
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setBlockStar(block.id, !block.star)}
                aria-pressed={!!block.star}
                aria-label={block.star ? `Tirar "${block.name}" de cai muito` : `Marcar "${block.name}" como tema que cai muito`}
                title={block.star ? 'Cai muito na prova (sobe na fila de revisões)' : 'Marcar como tema que cai muito na prova'}
                className={`shrink-0 h-10 w-10 grid place-items-center rounded-xl transition-colors ${
                  block.star ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'
                }`}
              >
                <Star className={`h-4 w-4 ${block.star ? 'fill-current' : ''}`} />
              </button>
              <div className="relative shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setMenuFor(menuFor === block.id ? null : block.id);
                  }}
                  className="h-10 w-10 grid place-items-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label={`Opções do bloco ${block.name}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menuFor === block.id && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-11 z-20 w-52 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1.5">
                    <button
                      onClick={() => {
                        setRenaming(block.id);
                        setMenuFor(null);
                      }}
                      className={`${menuBtn} text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800`}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Renomear
                    </button>
                    {block.reviewStatus !== 'estudando' && (
                      <button
                        onClick={() => {
                          setMenuFor(null);
                          setConfirm({ kind: 'restart', id: block.id });
                        }}
                        className={`${menuBtn} text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800`}
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Recomeçar revisões
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMenuFor(null);
                        setConfirm({ kind: 'block', id: block.id });
                      }}
                      className={`${menuBtn} text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40`}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir bloco
                    </button>
                  </div>
                )}
              </div>
            </header>

            {confirm?.id === block.id && confirm.kind !== 'topic' && (
              <div className="px-3 pb-2">
                <InlineConfirm
                  text={confirm.kind === 'block' ? `Excluir "${block.name}" e seus ${list.length} tópicos?` : `Recomeçar as revisões de "${block.name}"?`}
                  yesLabel={confirm.kind === 'block' ? 'Excluir' : 'Recomeçar'}
                  onNo={() => setConfirm(null)}
                  onYes={() => {
                    if (confirm.kind === 'block') deleteTopicBlock(block.id);
                    else restartBlockReviews(block.id);
                    setConfirm(null);
                  }}
                />
              </div>
            )}

            {!isCollapsed && (
              <div className="px-2 sm:px-3 pb-3">
                {block.reviewStatus === 'estudando' &&
                  (() => {
                    const done = new Set(block.initialSteps || []);
                    const doneCount = INITIAL_STEPS.filter((_, i) => done.has(String(i))).length;
                    const open = stepsOpen[block.id] ?? false;
                    const left = counted.length - resolved;
                    const feynmanDone = done.has(FEYNMAN_STEP);
                    return (
                      <>
                        <div id={`block-initial-steps-${block.id}`} className="mb-2 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/15">
                          <div className="flex items-center gap-2 px-2.5 py-1.5">
                            <button
                              type="button"
                              onClick={() => setStepsOpen((s) => ({ ...s, [block.id]: !open }))}
                              aria-expanded={open}
                              className="flex-1 min-w-0 flex items-center gap-2 text-left min-h-[40px]"
                            >
                              <span aria-hidden className="text-sm">🌱</span>
                              <span className="min-w-0">
                                <span className="block text-[11px] font-bold text-emerald-800 dark:text-emerald-300 truncate">
                                  Estudo inicial · {doneCount}/{INITIAL_STEPS.length} passos
                                </span>
                                <span className="flex gap-0.5 mt-1" aria-hidden>
                                  {INITIAL_STEPS.map((_, i) => (
                                    <span key={i} className={`h-1 w-5 rounded-full ${done.has(String(i)) ? 'bg-emerald-500' : 'bg-emerald-500/20'}`} />
                                  ))}
                                </span>
                              </span>
                              <ChevronDown className={`h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                            </button>
                            <button
                              type="button"
                              id={`block-start-btn-${block.id}`}
                              onClick={() => startInitialStudy(block)}
                              className="shrink-0 h-10 inline-flex items-center gap-1 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold"
                              title={`Abre o Pomodoro de ${studyPrefs.focusMinutes} min com os passos deste tema`}
                            >
                              <Play className="h-3 w-3 fill-current" /> Começar
                            </button>
                          </div>
                          {open && (
                            <ol className="px-2.5 pb-2.5 space-y-1">
                              {INITIAL_STEPS.map((s, i) => {
                                const checked = done.has(String(i));
                                const [head, rest] = splitStep(s);
                                return (
                                  <li key={i}>
                                    <button
                                      type="button"
                                      onClick={() => toggleInitialStep(block.id, String(i))}
                                      aria-pressed={checked}
                                      className={`w-full min-h-[40px] flex items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                                        checked ? 'bg-emerald-500/10' : 'bg-white/70 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-900'
                                      }`}
                                    >
                                      <span
                                        className={`mt-0.5 h-4 w-4 shrink-0 rounded-md border-2 flex items-center justify-center ${
                                          checked ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'
                                        }`}
                                        aria-hidden
                                      >
                                        {checked && <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
                                      </span>
                                      <span className={`text-[11px] leading-snug ${checked ? 'text-slate-500 dark:text-slate-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                        <strong className={checked ? 'line-through' : 'text-slate-900 dark:text-white'}>
                                          {i + 1}. {head}
                                        </strong>
                                        {rest && <span>: {rest}</span>}
                                      </span>
                                    </button>
                                  </li>
                                );
                              })}
                            </ol>
                          )}
                        </div>
                        {counted.length > 0 && left > 0 && left <= 2 && !feynmanDone && (
                          <p className="mb-2 flex items-start gap-1.5 px-1 text-[11px] text-slate-600 dark:text-slate-300">
                            <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-px" />
                            <span>Antes de fechar o tema, explique de memória em voz alta (Feynman). É o passo 3 do estudo inicial.</span>
                          </p>
                        )}
                      </>
                    );
                  })()}
                {closedNoFeynman[block.id] && block.reviewStatus !== 'estudando' && (
                  <div className="mb-2 flex items-start gap-2 rounded-xl bg-amber-50 dark:bg-amber-950/20 px-2.5 py-2 text-[11px] text-amber-900 dark:text-amber-200">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-px text-amber-500" />
                    <span className="flex-1">Tema fechado sem o Feynman. Tudo bem: na 1ª revisão (amanhã), comece explicando o tema em voz alta, sem consultar.</span>
                    <button
                      type="button"
                      onClick={() => setClosedNoFeynman((c) => ({ ...c, [block.id]: false }))}
                      className="h-8 w-8 -m-1 grid place-items-center rounded-lg text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                      aria-label="Dispensar aviso"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {shown.length === 0 && !q && <p className="text-[11px] text-slate-400 px-1 pb-1">Nenhum tópico ainda. Adicione abaixo.</p>}
                <ul className="space-y-1.5">
                  {shown.map((t) => {
                    const isBonus = !!t.bonus;
                    const isSeen = isTopicSeen(t) && !isBonus;
                    const isPending = isTopicPending(t);
                    const dot = isBonus ? BONUS : isSeen ? '#10b981' : isPending ? '#e11d48' : undefined;
                    const pill = 'h-10 sm:h-8 min-w-0 inline-flex items-center justify-center gap-1 px-2 sm:px-2.5 rounded-lg text-[11px] font-bold transition-colors';
                    return (
                      <li key={t.id} className="group rounded-xl bg-white dark:bg-slate-900 px-2.5 py-2">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex items-center gap-2.5 min-w-0 flex-1">
                            <span
                              className="h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center"
                              style={{ borderColor: dot || '#cbd5e1', backgroundColor: dot || 'transparent' }}
                              aria-hidden
                            >
                              {(isSeen || isBonus) && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                              {isPending && <X className="h-3 w-3 text-white" strokeWidth={3} />}
                            </span>
                            <span
                              className={`min-w-0 flex-1 text-xs break-words ${
                                isSeen ? 'text-slate-400 line-through' : isPending ? 'text-rose-700 dark:text-rose-300 font-semibold' : isBonus ? 'text-slate-600 dark:text-slate-300 font-semibold' : 'text-slate-800 dark:text-slate-100 font-semibold'
                              }`}
                            >
                              {t.title}
                              {isBonus && (
                                <span className="ml-1.5 align-middle inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-bold no-underline" style={{ color: BONUS, backgroundColor: `${BONUS}1a` }}>
                                  <Gift className="h-2.5 w-2.5" /> bônus
                                </span>
                              )}
                            </span>
                            {(() => {
                              const pr = subItemsProgress(t.details);
                              const open = !!detailsOpen[t.id];
                              return (
                                <button
                                  type="button"
                                  id={`struct-details-${t.id}`}
                                  onClick={() => setDetailsOpen((o) => ({ ...o, [t.id]: !open }))}
                                  aria-expanded={open}
                                  className={`h-8 shrink-0 inline-flex items-center gap-1 px-1.5 rounded-lg text-[11px] font-bold transition-colors sm:order-last ${
                                    open || pr.total ? 'text-sky-600 dark:text-sky-400 hover:bg-sky-500/10' : 'text-slate-300 dark:text-slate-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:text-sky-500'
                                  }`}
                                  aria-label={open ? `Esconder subtópicos de ${t.title}` : `Subtópicos de ${t.title}`}
                                  title={pr.total ? 'Subtópicos' : 'Adicionar subtópicos (opcional)'}
                                >
                                  {pr.total > 0 ? (
                                    <>
                                      <span>{pr.done}/{pr.total}</span>
                                      <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                                    </>
                                  ) : (
                                    <ListTree className="h-3.5 w-3.5" />
                                  )}
                                </button>
                              );
                            })()}
                            <button
                              onClick={() => setConfirm({ kind: 'topic', id: t.id })}
                              className="h-8 w-8 shrink-0 grid place-items-center rounded-lg text-slate-300 dark:text-slate-600 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 hover:text-rose-500 sm:order-last"
                              aria-label={`Excluir ${t.title}`}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                          <div className="grid grid-cols-3 gap-1 sm:flex sm:shrink-0">
                            <button
                              onClick={() => toggleSeen(t)}
                              aria-pressed={isSeen}
                              className={`${pill} ${isSeen ? 'bg-emerald-500 text-white' : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20'}`}
                              aria-label={isSeen ? `Desmarcar ${t.title}` : `Marcar ${t.title} como concluído`}
                              title={isSeen ? 'Concluído (toque para desfazer)' : 'Já estudei este tópico'}
                            >
                              <Check className="h-3 w-3 shrink-0" strokeWidth={3} /> <span className="truncate">Concluído</span>
                            </button>
                            <button
                              onClick={() => togglePending(t)}
                              aria-pressed={isPending}
                              className={`${pill} ${isPending ? 'bg-rose-600 text-white' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20'}`}
                              aria-label={isPending ? `Tirar ${t.title} de ver depois` : `Marcar ${t.title} para ver depois`}
                              title={isPending ? 'Pendente (toque para desfazer)' : 'Ainda não vi: o bloco entra nas revisões com esta pendência'}
                            >
                              <Clock3 className="h-3 w-3 shrink-0" /> <span className="truncate">Ver depois</span>
                            </button>
                            <button
                              id={`struct-bonus-${t.id}`}
                              onClick={() => toggleBonus(t)}
                              aria-pressed={isBonus}
                              className={`${pill} ${isBonus ? 'text-white' : 'hover:brightness-95'}`}
                              style={isBonus ? { backgroundColor: BONUS } : { backgroundColor: `${BONUS}1a`, color: BONUS }}
                              aria-label={isBonus ? `Tirar ${t.title} de aula bônus` : `Marcar ${t.title} como aula bônus`}
                              title="Aula bônus (assunto extra): fica como visto, mas não conta no bloco"
                            >
                              <Gift className="h-3 w-3 shrink-0" /> <span className="truncate sm:hidden">Bônus</span>
                              <span className="hidden sm:inline">Aula bônus</span>
                            </button>
                          </div>
                        </div>
                        {detailsOpen[t.id] && (
                          <SubItemsEditor idPrefix={`topic-${t.id}`} items={t.details} onChange={(d) => updateTopic(t.id, { details: d })} color="#10b981" />
                        )}
                        {confirm?.kind === 'topic' && confirm.id === t.id && (
                          <div className="mt-2">
                            <InlineConfirm
                              text={`Excluir o tópico "${t.title}"?`}
                              onNo={() => setConfirm(null)}
                              onYes={() => {
                                deleteTopic(t.id);
                                setConfirm(null);
                              }}
                            />
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addTopicTo(block);
                  }}
                  className="mt-2 flex items-center gap-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 px-2.5"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  <input
                    value={drafts[block.id] || ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [block.id]: e.target.value }))}
                    placeholder="Adicionar tópico e apertar Enter"
                    className="flex-1 min-w-0 h-10 bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden"
                    aria-label={`Adicionar tópico em ${block.name}`}
                  />
                </form>
                {st.pending > 0 && (
                  <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 mt-1.5 px-1">
                    {st.pending} para ver depois: ao terminar cada revisão o app pergunta se você já viu.
                  </p>
                )}
                {block.reviewStatus === 'estudando' && counted.length > 0 && resolved < counted.length && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 px-1">
                    Faltam {counted.length - resolved} tópico{counted.length - resolved > 1 ? 's' : ''} para o tema entrar nas revisões. A 1ª é em 24 h.
                  </p>
                )}

                {/* Ações do tema */}
                <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                  {(() => {
                    const statsBtn = (
                      <button
                        type="button"
                        id={`struct-stats-btn-${block.id}`}
                        onClick={() => setStatsFor(block.id)}
                        className="min-w-0 h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700"
                      >
                        <BarChart3 className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">Registrar estudo</span>
                      </button>
                    );
                    return block.reviewStatus === 'estudando' ? <PlanBlockButton block={block} leading={statsBtn} /> : statsBtn;
                  })()}
                </div>
                {allowLinking && <LinkedAreaBlocks block={block} subject={subject} />}
              </div>
            )}
          </section>
        );
      })}

      {statsFor && <BlockStatsModal open blockId={statsFor} onClose={() => setStatsFor(null)} />}
    </div>
  );
};
