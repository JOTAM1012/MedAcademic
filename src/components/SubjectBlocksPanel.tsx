import React, { useMemo, useState } from 'react';
import { Plus, Search, ChevronDown, Check, Trash2, Clock3, MoreHorizontal, Pencil, RotateCcw, Repeat, Trophy, Layers, X, Star, Play, Lightbulb } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Subject, Topic, TopicBlock } from '../types';
import { DatePickerField } from './DatePickerField';
import { SPECIALTY_BLOCK_SUGGESTIONS, getMedicalArea, getSpecialty } from '../data/areas';
import { BLOCK_REVIEWS_TO_MASTER, cycleDay, formatDM, isBlockDue, isTopicPending, isTopicResolved, isTopicSeen, ymd } from '../data/blockReview';
import { TECHNIQUES, reviewTechnique } from '../data/studyMethod';

/** Índice do passo "Feynman" no checklist do estudo inicial */
const FEYNMAN_STEP = '2';
const INITIAL_STEPS = TECHNIQUES.estudo_inicial.steps;

/** "Pré-teste: tente 3 a 5..." → ["Pré-teste", "tente 3 a 5..."] */
const splitStep = (s: string): [string, string] => {
  const i = s.indexOf(':');
  return i > 0 && i < 24 ? [s.slice(0, i), s.slice(i + 1).trim()] : [s, ''];
};

interface SubjectBlocksPanelProps {
  subject: Subject;
}

const formatShort = (iso?: string) => {
  if (!iso) return '';
  const [, m, d] = iso.split('-');
  return `${d}/${m}`;
};

// Blocos da disciplina (ex.: Endocrinologia → Diabetes, Tireoide) com seus tópicos para marcar "visto"
export const SubjectBlocksPanel: React.FC<SubjectBlocksPanelProps> = ({ subject }) => {
  const {
    topics,
    topicBlocks,
    addTopic,
    deleteTopic,
    markTopicSeen,
    resetTopicProgress,
    markTopicPending,
    addTopicBlock,
    renameTopicBlock,
    deleteTopicBlock,
    restartBlockReviews,
    updateTopicBlock,
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const todayStr = ymd(new Date());
  const accent = getSpecialty(subject.specialty)?.color || getMedicalArea(subject.majorArea).color;

  const blocks = useMemo(
    () => topicBlocks.filter((b) => b.subjectId === subject.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [topicBlocks, subject.id]
  );
  const subjectTopics = topics.filter((t) => t.subjectId === subject.id);
  const seenCount = subjectTopics.filter(isTopicSeen).length;
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

  // Concluído (verde) e Ver depois (vermelho): clicar de novo no ativo volta para "não iniciado"
  // Se este clique fecha o tema (último tópico) e o Feynman não foi feito, mostra um aviso leve
  const willCloseBlock = (t: Topic) => {
    const block = blocks.find((b) => b.id === t.blockId);
    if (!block || block.reviewStatus !== 'estudando') return undefined;
    const list = subjectTopics.filter((x) => x.blockId === block.id);
    const others = list.filter((x) => x.id !== t.id);
    return others.every(isTopicResolved) ? block : undefined;
  };
  const noteClosing = (t: Topic) => {
    const block = willCloseBlock(t);
    if (block && !(block.initialSteps || []).includes(FEYNMAN_STEP)) setClosedNoFeynman((c) => ({ ...c, [block.id]: true }));
  };
  const toggleSeen = (t: Topic) => {
    if (isTopicSeen(t)) return resetTopicProgress(t.id);
    noteClosing(t);
    markTopicSeen(t.id);
  };
  const togglePending = (t: Topic) => {
    if (isTopicPending(t)) return resetTopicProgress(t.id);
    noteClosing(t);
    markTopicPending(t.id);
  };

  const startInitialStudy = (block: TopicBlock) =>
    startTask({
      title: `Tema novo: ${block.name}`,
      kind: 'new_block',
      subjectId: subject.id,
      blockId: block.id,
      steps: INITIAL_STEPS,
      minutes: studyPrefs.focusMinutes,
    });

  const renderStatus = (block: TopicBlock, seen: number, total: number) => {
    if (block.reviewStatus === 'dominado') {
      return (
        <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
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
          className="flex items-center gap-1 min-w-0 max-w-full text-[10px] font-bold px-2 py-0.5 rounded-full border"
          style={{ color: tech.color, backgroundColor: `${tech.color}14`, borderColor: `${tech.color}40` }}
          title={`${tech.label}: ${tech.steps.join(' · ')}`}
        >
          <span aria-hidden>{tech.emoji}</span>
          <span className="truncate">{tech.badge}</span>
          <span className="shrink-0 text-slate-600 dark:text-slate-300 font-semibold">
            · {due ? (late ? `desde ${formatShort(block.nextReviewDate)}` : 'hoje') : formatShort(block.nextReviewDate)}
          </span>
        </span>
      );
    }
    return (
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
        Em estudo · {seen}/{total}
      </span>
    );
  };

  const q = search.trim().toLowerCase();

  return (
    <div className="mt-4 space-y-3" onClick={() => menuFor && setMenuFor(null)}>
      {/* Resumo + ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold text-slate-500">
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">{blocks.length} blocos</span>
          <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800">
            {seenCount}/{subjectTopics.length} tópicos vistos
          </span>
          {inReview > 0 && <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400">{inReview} em revisão</span>}
          {mastered > 0 && <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">{mastered} dominados</span>}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filtrar tópicos..."
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-1.5 pl-8 pr-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            />
          </div>
          <button
            id="subject-new-block-btn"
            onClick={() => setNewBlockOpen((o) => !o)}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white text-xs font-bold"
            style={{ backgroundColor: accent }}
          >
            <Plus className="h-3.5 w-3.5" /> Novo bloco
          </button>
        </div>
      </div>

      {/* Criar bloco */}
      {(newBlockOpen || blocks.length === 0) && (
        <div className="rounded-2xl border border-dashed p-3 space-y-2" style={{ borderColor: accent + '66', backgroundColor: accent + '0d' }}>
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
              className="flex-1 min-w-0 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
            />
            <button type="submit" disabled={!newBlockName.trim()} className="px-3 py-2 rounded-lg text-white text-xs font-bold disabled:opacity-40" style={{ backgroundColor: accent }}>
              Criar
            </button>
            {blocks.length > 0 && (
              <button type="button" onClick={() => setNewBlockOpen(false)} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            )}
          </form>
          {suggestions.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Sugestões:</span>
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => createBlock(s)}
                  className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-[11px] font-semibold text-slate-700 dark:text-slate-200 hover:border-slate-400"
                >
                  + {s}
                </button>
              ))}
            </div>
          )}
          {blocks.length === 0 && (
            <p className="text-[11px] text-slate-500">
              Organize a disciplina em blocos (temas) e coloque os tópicos dentro deles. Quando todos os tópicos de um bloco forem vistos, ele entra nas Revisões: a 1ª é amanhã (24 h).
            </p>
          )}
        </div>
      )}

      {/* Blocos */}
      {blocks.map((block) => {
        const list = subjectTopics.filter((t) => t.blockId === block.id);
        const shown = q ? list.filter((t) => t.title.toLowerCase().includes(q)) : list;
        if (q && shown.length === 0 && !block.name.toLowerCase().includes(q)) return null;
        const seen = list.filter(isTopicSeen).length;
        const pendingCount = list.filter(isTopicPending).length;
        const resolved = list.filter(isTopicResolved).length;
        const pct = list.length ? Math.round((seen / list.length) * 100) : 0;
        const isCollapsed = collapsed[block.id] ?? false;
        const due = isBlockDue(block, todayStr);

        return (
          <section key={block.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 overflow-hidden">
            <header className="flex items-center gap-2 px-3 py-2.5">
              <button
                onClick={() => setCollapsed((c) => ({ ...c, [block.id]: !isCollapsed }))}
                className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                aria-label={isCollapsed ? 'Expandir bloco' : 'Recolher bloco'}
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
              </button>
              <span className="w-1.5 self-stretch rounded-full" style={{ backgroundColor: accent }} />
              <div className="min-w-0 flex-1">
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
                <div className="mt-1 h-1 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: accent }} />
                </div>
                {block.completedDate && (
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1">
                    Estudado em <strong className="text-slate-700 dark:text-slate-300">{formatDM(block.completedDate)}</strong> (Dia 0)
                    {block.reviewStatus === 'revisao' && block.nextReviewDate && (
                      <>
                        {' '}· próxima: <strong className="text-slate-700 dark:text-slate-300">R{block.reviewsDone + 1} em {formatDM(block.nextReviewDate)}</strong> (Dia{' '}
                        {cycleDay(block, block.nextReviewDate)})
                      </>
                    )}
                  </p>
                )}
                <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                  {renderStatus(block, seen, list.length)}
                  {block.star && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">⭐ cai muito</span>
                  )}
                  {due && (
                    <button
                      id={`block-review-btn-${block.id}`}
                      onClick={() => openReviews({ blockId: block.id, tab: 'hoje' })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-bold"
                    >
                      <Repeat className="h-3 w-3" /> Revisar
                    </button>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBlockStar(block.id, !block.star)}
                aria-pressed={!!block.star}
                aria-label={block.star ? `Tirar "${block.name}" de cai muito` : `Marcar "${block.name}" como tema que cai muito`}
                title={block.star ? 'Cai muito na prova (sobe na fila de revisões)' : 'Marcar como tema que cai muito na prova'}
                className={`shrink-0 h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${
                  block.star ? 'text-amber-500 bg-amber-500/10' : 'text-slate-400 hover:text-amber-500 hover:bg-slate-100 dark:hover:bg-slate-800'
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
                  className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label={`Opções do bloco ${block.name}`}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
                {menuFor === block.id && (
                  <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-9 z-20 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1.5">
                    <button
                      onClick={() => {
                        setRenaming(block.id);
                        setMenuFor(null);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Renomear
                    </button>
                    {block.reviewStatus !== 'estudando' && (
                      <button
                        onClick={() => {
                          setMenuFor(null);
                          if (window.confirm(`Recomeçar as revisões de "${block.name}"?`)) restartBlockReviews(block.id);
                        }}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Recomeçar revisões
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setMenuFor(null);
                        if (window.confirm(`Excluir o bloco "${block.name}" e seus ${list.length} tópicos?`)) deleteTopicBlock(block.id);
                      }}
                      className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Excluir bloco
                    </button>
                  </div>
                )}
              </div>
            </header>

            {!isCollapsed && (
              <div className="px-3 pb-3">
                {block.reviewStatus === 'estudando' && (() => {
                  const done = new Set(block.initialSteps || []);
                  const doneCount = INITIAL_STEPS.filter((_, i) => done.has(String(i))).length;
                  const open = stepsOpen[block.id] ?? false;
                  const left = list.length - resolved;
                  const feynmanDone = done.has(FEYNMAN_STEP);
                  return (
                    <>
                      <div
                        id={`block-initial-steps-${block.id}`}
                        className="mb-2 rounded-xl border border-emerald-500/25 bg-emerald-50/60 dark:bg-emerald-950/15"
                      >
                        <div className="flex items-center gap-2 px-2.5 py-2">
                          <button
                            type="button"
                            onClick={() => setStepsOpen((s) => ({ ...s, [block.id]: !open }))}
                            aria-expanded={open}
                            className="flex-1 min-w-0 flex items-center gap-2 text-left min-h-[32px]"
                          >
                            <span aria-hidden className="text-sm">🌱</span>
                            <span className="min-w-0">
                              <span className="block text-[11px] font-black text-emerald-800 dark:text-emerald-300 truncate">
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
                            className="shrink-0 inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold"
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
                                    className={`w-full flex items-start gap-2 rounded-lg px-2 py-1.5 text-left border transition-colors ${
                                      checked
                                        ? 'border-emerald-500/30 bg-emerald-500/10'
                                        : 'border-transparent bg-white/70 dark:bg-slate-900/60 hover:border-emerald-500/30'
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
                      {list.length > 0 && left > 0 && left <= 2 && !feynmanDone && (
                        <p className="mb-2 flex items-start gap-1.5 px-1 text-[11px] text-slate-600 dark:text-slate-300">
                          <Lightbulb className="h-3.5 w-3.5 shrink-0 text-amber-500 mt-px" />
                          <span>
                            Antes de fechar o tema, explique de memória em voz alta (Feynman) e marque onde travou. É o passo 3 do estudo inicial.
                          </span>
                        </p>
                      )}
                    </>
                  );
                })()}
                {closedNoFeynman[block.id] && block.reviewStatus !== 'estudando' && (
                  <div className="mb-2 flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/20 px-2.5 py-2 text-[11px] text-amber-900 dark:text-amber-200">
                    <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-px text-amber-500" />
                    <span className="flex-1">
                      Tema fechado sem o Feynman. Tudo bem: na 1ª revisão (amanhã), comece explicando o tema em voz alta, sem consultar.
                    </span>
                    <button
                      type="button"
                      onClick={() => setClosedNoFeynman((c) => ({ ...c, [block.id]: false }))}
                      className="p-1 -m-1 rounded text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                      aria-label="Dispensar aviso"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                {shown.length === 0 && !q && (
                  <p className="text-[11px] text-slate-400 px-1 pb-1">Nenhum tópico ainda. Adicione abaixo.</p>
                )}
                <ul className="space-y-1">
                  {shown.map((t) => {
                    const isSeen = isTopicSeen(t);
                    const isPending = isTopicPending(t);
                    return (
                      <li
                        key={t.id}
                        className={`group flex items-center gap-2.5 rounded-lg px-2 py-1.5 border ${
                          isPending
                            ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                            : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
                        }`}
                      >
                        <span
                          className="h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center"
                          style={{
                            borderColor: isSeen ? '#10b981' : isPending ? '#e11d48' : '#cbd5e1',
                            backgroundColor: isSeen ? '#10b981' : isPending ? '#e11d48' : 'transparent',
                          }}
                          aria-hidden
                        >
                          {isSeen && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          {isPending && <X className="h-3 w-3 text-white" strokeWidth={3} />}
                        </span>
                        <span
                          className={`flex-1 min-w-0 text-xs break-words ${
                            isSeen ? 'text-slate-400 line-through' : isPending ? 'text-rose-700 dark:text-rose-300 font-semibold' : 'text-slate-800 dark:text-slate-100 font-semibold'
                          }`}
                        >
                          {t.title}
                        </span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => toggleSeen(t)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                              isSeen
                                ? 'bg-emerald-500 border-emerald-500 text-white'
                                : 'border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
                            }`}
                            aria-label={isSeen ? `Desmarcar ${t.title}` : `Marcar ${t.title} como concluído`}
                            title={isSeen ? 'Concluído (clique para desfazer)' : 'Já estudei este tópico'}
                          >
                            <Check className="h-3 w-3" strokeWidth={3} /> Concluído
                          </button>
                          <button
                            onClick={() => togglePending(t)}
                            className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-bold border transition-colors ${
                              isPending
                                ? 'bg-rose-600 border-rose-600 text-white'
                                : 'border-rose-300 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
                            }`}
                            aria-label={isPending ? `Tirar ${t.title} de ver depois` : `Marcar ${t.title} para ver depois`}
                            title={isPending ? 'Pendente (clique para desfazer)' : 'Ainda não vi: o bloco entra nas revisões com esta pendência'}
                          >
                            <Clock3 className="h-3 w-3" /> Ver depois
                          </button>
                        </div>
                        <button
                          onClick={() => {
                            if (window.confirm(`Excluir o tópico "${t.title}"?`)) deleteTopic(t.id);
                          }}
                          className="p-1 rounded text-slate-300 dark:text-slate-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-500 shrink-0"
                          aria-label={`Excluir ${t.title}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    addTopicTo(block);
                  }}
                  className="mt-2 flex items-center gap-2 rounded-lg border border-dashed border-slate-300 dark:border-slate-700 px-2 py-1"
                >
                  <Plus className="h-3.5 w-3.5 shrink-0" style={{ color: accent }} />
                  <input
                    value={drafts[block.id] || ''}
                    onChange={(e) => setDrafts((d) => ({ ...d, [block.id]: e.target.value }))}
                    placeholder="Adicionar tópico e apertar Enter..."
                    className="flex-1 min-w-0 bg-transparent py-1 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden"
                    aria-label={`Adicionar tópico em ${block.name}`}
                  />
                </form>
                {pendingCount > 0 && (
                  <p className="text-[10px] font-semibold text-rose-600 dark:text-rose-400 mt-1.5 px-1">
                    ⚠ {pendingCount} pendência{pendingCount > 1 ? 's' : ''}: ao terminar cada revisão o app pergunta se você já viu.
                  </p>
                )}
                {block.reviewStatus === 'estudando' && (
                  <div className="mt-2 px-1 flex items-center gap-2 flex-wrap text-[10px]" onClick={(e) => e.stopPropagation()}>
                    <span className="font-bold text-slate-500">📅 Estudar no dia (D0 no Planner):</span>
                    <DatePickerField
                      id={'block-plan-' + block.id}
                      value={block.plannedDate || ''}
                      onChange={(v) => updateTopicBlock(block.id, { plannedDate: v || undefined })}
                      placeholder="Planejar data"
                      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 text-[11px] font-bold text-slate-700 dark:text-slate-200"
                    />
                  </div>
                )}
                {block.reviewStatus === 'estudando' && list.length > 0 && resolved < list.length && (
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 mt-1.5 px-1">
                    Faltam {list.length - resolved} tópico{list.length - resolved > 1 ? 's' : ''} para o tema entrar nas revisões (marque como concluído ou ver depois). A 1ª revisão é em 24 h.
                  </p>
                )}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
};
