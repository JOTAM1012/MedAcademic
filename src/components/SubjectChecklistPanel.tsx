import React, { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  Clock3,
  CalendarDays,
  ClipboardPaste,
  MoreHorizontal,
  Pencil,
  Plus,
  Repeat,
  Search,
  Trash2,
  Trophy,
  X,
  ListPlus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Subject, Topic } from '../types';
import { DatePickerField } from './DatePickerField';
import { formatDM, isBlockDue, isTopicPending, isTopicResolved, isTopicSeen, ymd } from '../data/blockReview';
import { subjectFormatOf } from '../data/subjectFormats';
import { reviewTechnique } from '../data/studyMethod';
import { ReorderList } from './shared/ReorderList';

interface Props {
  subject: Subject;
}

const GERAL = 'Geral';

// Checklist do Básico/Clínico: Matéria → Tópico, com Visto / Ver depois / Programar data.
// Quando a matéria inteira estiver vista, ela pode ir para as Revisões (vira um bloco).
export const SubjectChecklistPanel: React.FC<Props> = ({ subject }) => {
  const {
    topics,
    topicBlocks,
    addTopicsBulk,
    updateTopic,
    deleteTopic,
    markTopicSeen,
    markTopicPending,
    resetTopicProgress,
    updateSubject,
    sendModuleToReview,
    openReviews,
    reorderTopics,
  } = useApp();
  const fmt = subjectFormatOf(subject);
  const accent = fmt.color;
  const todayStr = ymd(new Date());

  const [search, setSearch] = useState('');
  const [onlyOpen, setOnlyOpen] = useState(false);
  const [newModule, setNewModule] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pasteFor, setPasteFor] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ from: string; to: string } | null>(null);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [seqCount, setSeqCount] = useState(fmt.sequence?.count || 6);

  const subjectTopics = useMemo(() => topics.filter((t) => t.subjectId === subject.id), [topics, subject.id]);

  // Matérias: ordem salva + as que só existem nos tópicos
  const modules = useMemo(() => {
    const order = [...(subject.checklistModules || [])];
    subjectTopics.forEach((t) => {
      const m = t.moduleName || GERAL;
      if (!order.includes(m)) order.push(m);
    });
    return order;
  }, [subject.checklistModules, subjectTopics]);

  const seen = subjectTopics.filter(isTopicSeen).length;
  const pending = subjectTopics.filter(isTopicPending).length;
  const scheduled = subjectTopics.filter((t) => !isTopicSeen(t) && t.scheduleFirstContact && t.firstContactDate && t.firstContactDate >= todayStr).length;
  const pct = subjectTopics.length ? Math.round((seen / subjectTopics.length) * 100) : 0;

  const saveModules = (list: string[]) => updateSubject(subject.id, { checklistModules: list }, { silent: true });

  const addModules = (names: string[]) => {
    const clean = names.map((n) => n.trim()).filter((n) => n && !modules.includes(n));
    if (!clean.length) return;
    saveModules([...modules, ...clean]);
    setCollapsed((c) => ({ ...c, ...Object.fromEntries(clean.map((n) => [n, false])) }));
  };

  const addTopics = (module: string, titles: string[]) => {
    const clean = titles.map((t) => t.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean);
    if (!clean.length) return;
    if (!modules.includes(module)) saveModules([...modules, module]);
    addTopicsBulk(
      clean.map((title) => ({
        subjectId: subject.id,
        moduleName: module,
        title,
        status: 'nao_iniciado',
        priority: 'media',
        tags: [module],
      }))
    );
  };

  const renameModule = (from: string, to: string) => {
    const name = to.trim();
    setRenaming(null);
    if (!name || name === from || modules.includes(name)) return;
    saveModules(modules.map((m) => (m === from ? name : m)));
    subjectTopics.filter((t) => (t.moduleName || GERAL) === from).forEach((t) => updateTopic(t.id, { moduleName: name }));
  };

  const removeModule = (m: string) => {
    const list = subjectTopics.filter((t) => (t.moduleName || GERAL) === m);
    if (list.length && !window.confirm(`Excluir "${m}" e seus ${list.length} ${fmt.items}?`)) return;
    list.forEach((t) => deleteTopic(t.id));
    saveModules(modules.filter((x) => x !== m));
  };

  const toggleSeen = (t: Topic) => (isTopicSeen(t) ? resetTopicProgress(t.id) : markTopicSeen(t.id));
  const togglePending = (t: Topic) => (isTopicPending(t) ? resetTopicProgress(t.id) : markTopicPending(t.id));
  const schedule = (t: Topic, date: string) => {
    updateTopic(t.id, date ? { firstContactDate: date, scheduleFirstContact: true } : { scheduleFirstContact: false, firstContactDate: undefined });
    setScheduling(null);
  };

  const q = search.trim().toLowerCase();

  return (
    <div className="mt-4 space-y-3" onClick={() => menuFor && setMenuFor(null)}>
      {/* Resumo */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3 space-y-2.5">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-semibold text-slate-500">
            <span className="px-2 py-0.5 rounded-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              {modules.length} {modules.length === 1 ? fmt.group.toLowerCase() : fmt.groups.toLowerCase()}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
              ✓ {seen}/{subjectTopics.length} vistos
            </span>
            {pending > 0 && <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400">⏳ {pending} ver depois</span>}
            {scheduled > 0 && <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-400">📅 {scheduled} programados</span>}
          </div>
          <span className="text-sm font-black" style={{ color: accent }}>
            {pct}%
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: accent }} />
        </div>
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Buscar ${fmt.items}...`}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-3 py-1.5 text-xs focus:outline-hidden focus:border-sky-500"
            />
          </div>
          <button
            type="button"
            onClick={() => setOnlyOpen((v) => !v)}
            className={`shrink-0 px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-colors ${
              onlyOpen ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'border-slate-200 dark:border-slate-800 text-slate-500'
            }`}
          >
            Só o que falta
          </button>
        </div>
      </div>

      {/* Nova matéria */}
      <div className="flex items-center gap-2">
        <input
          id="checklist-new-module"
          value={newModule}
          onChange={(e) => setNewModule(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              addModules([newModule]);
              setNewModule('');
            }
          }}
          placeholder={`Novo ${fmt.group.toLowerCase()} — ${fmt.groupPlaceholder.replace(/^Ex:\s*/, 'ex: ')}`}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs focus:outline-hidden focus:border-sky-500"
        />
        <button
          type="button"
          id="checklist-add-module"
          onClick={() => {
            addModules([newModule]);
            setNewModule('');
          }}
          disabled={!newModule.trim()}
          className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-xl text-white text-xs font-bold disabled:opacity-40"
          style={{ backgroundColor: accent }}
        >
          <Plus className="h-3.5 w-3.5" /> {fmt.group.split(' ')[0]}
        </button>
      </div>

      {/* Atalho: sequência pronta (Problema 1..N) */}
      {modules.length === 0 && fmt.sequence && (
        <div className="rounded-2xl border border-dashed p-4 text-center space-y-2" style={{ borderColor: `${accent}66` }}>
          <p className="text-xs text-slate-500">
            Comece rápido: crie os {fmt.groups.toLowerCase()} já numerados e depois só preencha os {fmt.items}.
          </p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
              {fmt.sequence.prefix} 1 a
            </span>
            <input
              type="number"
              min={1}
              max={30}
              value={seqCount}
              onChange={(e) => setSeqCount(Math.max(1, Math.min(30, Number(e.target.value) || 1)))}
              className="w-16 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-center"
            />
            <button
              type="button"
              id="checklist-create-sequence"
              onClick={() => addModules(Array.from({ length: seqCount }, (_, i) => `${fmt.sequence!.prefix} ${i + 1}`))}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-bold"
              style={{ backgroundColor: accent }}
            >
              <ListPlus className="h-3.5 w-3.5" /> Criar
            </button>
          </div>
        </div>
      )}
      {modules.length === 0 && !fmt.sequence && (
        <p className="text-center text-xs text-slate-500 py-6">
          Crie o primeiro {fmt.group.toLowerCase()} acima e adicione os {fmt.items} para marcar como visto.
        </p>
      )}

      {/* Matérias */}
      <div className="space-y-2.5">
        {modules.map((m) => {
          const all = subjectTopics.filter((t) => (t.moduleName || GERAL) === m);
          const list = all.filter((t) => (!q || t.title.toLowerCase().includes(q)) && (!onlyOpen || !isTopicSeen(t)));
          if ((q || onlyOpen) && list.length === 0) return null;
          const seenM = all.filter(isTopicSeen).length;
          const done = all.length > 0 && all.every(isTopicResolved);
          const block = topicBlocks.find((b) => b.subjectId === subject.id && all.some((t) => t.blockId === b.id));
          const unsent = all.filter((t) => !t.blockId).length;
          const isCollapsed = collapsed[m] ?? false;
          const mPct = all.length ? Math.round((seenM / all.length) * 100) : 0;
          return (
            <div key={m} className="checklist-module rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [m]: !isCollapsed }))}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={isCollapsed ? 'Abrir' : 'Fechar'}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {/* anel de progresso */}
                <div
                  className="h-7 w-7 shrink-0 rounded-full grid place-items-center text-[9px] font-black"
                  style={{ background: `conic-gradient(${accent} ${mPct * 3.6}deg, rgba(148,163,184,0.25) 0deg)` }}
                >
                  <span className="h-5 w-5 rounded-full bg-white dark:bg-slate-900 grid place-items-center text-slate-600 dark:text-slate-300">
                    {done ? <Check className="h-3 w-3 text-emerald-500" /> : mPct}
                  </span>
                </div>
                {renaming?.from === m ? (
                  <input
                    autoFocus
                    value={renaming.to}
                    onChange={(e) => setRenaming({ from: m, to: e.target.value })}
                    onBlur={() => renameModule(m, renaming.to)}
                    onKeyDown={(e) => e.key === 'Enter' && renameModule(m, renaming.to)}
                    className="flex-1 min-w-0 rounded-lg border border-sky-500 bg-transparent px-2 py-1 text-xs font-bold"
                  />
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-slate-900 dark:text-white truncate">{m}</div>
                    <div className="text-[10px] text-slate-500">
                      Vistos: {seenM}/{all.length}
                    </div>
                  </div>
                )}

                {block ? (
                  block.reviewStatus === 'dominado' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Trophy className="h-3 w-3" /> Dominado
                    </span>
                  ) : (
                    (() => {
                      const tech = reviewTechnique(block, subject.format);
                      const due = isBlockDue(block, todayStr);
                      return (
                        <button
                          type="button"
                          onClick={() => openReviews({ blockId: block.id, tab: 'hoje' })}
                          className="flex items-center gap-1 min-w-0 max-w-[45%] sm:max-w-none text-[10px] font-bold px-2 py-0.5 rounded-full border"
                          style={{ color: tech.color, backgroundColor: `${tech.color}14`, borderColor: `${tech.color}40` }}
                          title={`Abrir Revisões · ${tech.label}`}
                        >
                          <span aria-hidden>{tech.emoji}</span>
                          <span className="truncate">{tech.badge}</span>
                          <span className="shrink-0 text-slate-600 dark:text-slate-300 font-semibold">· {due ? 'hoje' : formatDM(block.nextReviewDate)}</span>
                        </button>
                      );
                    })()
                  )
                ) : (
                  done && (
                    <button
                      type="button"
                      onClick={() => sendModuleToReview(subject.id, m)}
                      className="checklist-send-review flex items-center gap-1 text-left leading-tight text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-600 text-white hover:bg-emerald-500 shadow-xs"
                      title="Estudei: enviar para as revisões (1ª amanhã)"
                    >
                      <Repeat className="h-3 w-3 shrink-0" />
                      <span className="sm:hidden">Estudei · revisar</span>
                      <span className="hidden sm:inline">Estudei: enviar para as revisões (1ª amanhã)</span>
                    </button>
                  )
                )}

                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuFor(menuFor === m ? null : m);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Mais opções"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuFor === m && (
                    <div className="absolute right-0 top-8 z-20 w-48 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1 text-xs">
                      <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setRenaming({ from: m, to: m })}>
                        <Pencil className="h-3.5 w-3.5" /> Renomear
                      </button>
                      <button
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() => {
                          setPasteFor(m);
                          setCollapsed((c) => ({ ...c, [m]: false }));
                        }}
                      >
                        <ClipboardPaste className="h-3.5 w-3.5" /> Colar lista de {fmt.items}
                      </button>
                      {block && unsent > 0 && (
                        <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => sendModuleToReview(subject.id, m)}>
                          <Repeat className="h-3.5 w-3.5" /> Enviar novos para Revisões
                        </button>
                      )}
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => removeModule(m)}>
                        <Trash2 className="h-3.5 w-3.5" /> Excluir {fmt.group.toLowerCase()}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {!isCollapsed && (
                <div className="border-t border-slate-100 dark:border-slate-800 px-3 py-2 space-y-1">
                  <ReorderList<Topic>
                    items={list}
                    onCommit={reorderTopics}
                    as="div"
                    itemAs="div"
                    className="space-y-1"
                    itemProps={() => ({ className: 'checklist-topic group rounded-lg bg-white dark:bg-slate-900' })}
                    renderItem={(t, handle) => {
                    const isSeen = isTopicSeen(t);
                    const isPend = isTopicPending(t);
                    const sched = !isSeen && t.scheduleFirstContact && t.firstContactDate;
                    return (
                      <>
                        <div className="flex items-center gap-2 py-1">
                          {handle({ id: `checklist-topic-drag-${t.id}`, disabled: !!q || onlyOpen, disabledTitle: 'Limpe o filtro para reordenar', className: 'h-7 w-5 -ml-1.5 -mr-1' })}
                          <button
                            type="button"
                            onClick={() => toggleSeen(t)}
                            className={`checklist-seen h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
                              isSeen ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                            }`}
                            aria-label={isSeen ? 'Desmarcar visto' : 'Marcar como visto'}
                            title={isSeen ? 'Visto — clique para desmarcar' : 'Marcar como visto'}
                          >
                            {isSeen && <Check className="h-3.5 w-3.5" />}
                          </button>
                          <span className={`flex-1 min-w-0 text-xs ${isSeen ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>{t.title}</span>
                          {sched && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400">📅 {formatDM(t.firstContactDate)}</span>
                          )}
                          {!isSeen && (
                            <>
                              <button
                                type="button"
                                onClick={() => togglePending(t)}
                                className={`checklist-later p-1 rounded-md transition-colors ${
                                  isPend ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'
                                }`}
                                title={isPend ? 'Ver depois — clique para tirar' : 'Ver depois'}
                                aria-label="Ver depois"
                              >
                                <Clock3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setScheduling(scheduling === t.id ? null : t.id)}
                                className={`checklist-schedule p-1 rounded-md transition-colors ${sched ? 'text-sky-500' : 'text-slate-300 dark:text-slate-600 hover:text-sky-500'}`}
                                title="Programar data (aparece no Planner)"
                                aria-label="Programar data"
                              >
                                <CalendarDays className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => deleteTopic(t.id)}
                            className="p-1 rounded-md text-slate-400 dark:text-slate-300/70 hover:text-rose-500 can-hover:opacity-0 can-hover:group-hover:opacity-100 transition-opacity"
                            aria-label="Excluir"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                        {scheduling === t.id && (
                          <div className="flex items-center gap-2 pl-7 pb-1.5">
                            <DatePickerField value={t.firstContactDate || ''} onChange={(d) => schedule(t, d)} placeholder="Escolher dia" className="text-xs" />
                            {sched && (
                              <button type="button" onClick={() => schedule(t, '')} className="text-[11px] font-bold text-rose-500 hover:underline">
                                Tirar data
                              </button>
                            )}
                          </div>
                        )}
                      </>
                    );
                    }}
                  />
                  {all.length === 0 && <p className="text-[11px] text-slate-400 py-1">Nenhum {fmt.item.toLowerCase()} ainda.</p>}

                  {pasteFor === m ? (
                    <div className="pt-1.5 space-y-1.5">
                      <textarea
                        autoFocus
                        value={pasteText}
                        onChange={(e) => setPasteText(e.target.value)}
                        rows={4}
                        placeholder={`Cole um ${fmt.item.toLowerCase()} por linha (do cronograma da faculdade, por exemplo)`}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs focus:outline-hidden focus:border-sky-500"
                      />
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => { setPasteFor(null); setPasteText(''); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500">
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            addTopics(m, pasteText.split(/\r?\n/));
                            setPasteFor(null);
                            setPasteText('');
                          }}
                          className="px-3 py-1.5 rounded-lg text-white text-xs font-bold"
                          style={{ backgroundColor: accent }}
                        >
                          Adicionar {pasteText.split(/\r?\n/).filter((l) => l.trim()).length || ''}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="pt-2 space-y-1">
                      <div
                        className="flex items-center gap-1.5 rounded-xl border-2 border-dashed bg-white dark:bg-slate-950/60 pl-2.5 pr-1 py-1 transition-colors focus-within:border-solid"
                        style={{ borderColor: (drafts[m] || '').trim() ? accent : `${accent}66` }}
                      >
                        <Plus className="h-4 w-4 shrink-0" style={{ color: accent }} />
                        <input
                          value={drafts[m] || ''}
                          onChange={(e) => setDrafts((d) => ({ ...d, [m]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              addTopics(m, [drafts[m] || '']);
                              setDrafts((d) => ({ ...d, [m]: '' }));
                            }
                          }}
                          onPaste={(e) => {
                            const txt = e.clipboardData.getData('text');
                            if (txt.includes('\n')) {
                              e.preventDefault();
                              addTopics(m, txt.split(/\r?\n/));
                            }
                          }}
                          placeholder={`Escreva ${fmt.item === 'Estrutura' || fmt.item === 'Prática / Estação' ? 'uma' : 'um'} ${fmt.item.toLowerCase()} — ${fmt.itemPlaceholder.replace(/^Ex:\s*/, 'ex: ')}`}
                          className="checklist-add-topic flex-1 min-w-0 bg-transparent py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            addTopics(m, [drafts[m] || '']);
                            setDrafts((d) => ({ ...d, [m]: '' }));
                          }}
                          disabled={!(drafts[m] || '').trim()}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[11px] font-black disabled:opacity-40"
                          style={{ backgroundColor: accent }}
                        >
                          <Plus className="h-3.5 w-3.5" /> Adicionar
                        </button>
                      </div>
                      <div className="flex items-center justify-between gap-2 px-1">
                        <span className="text-[10px] text-slate-400">Enter também adiciona · quantos quiser</span>
                        <button type="button" onClick={() => setPasteFor(m)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-sky-500">
                          <ClipboardPaste className="h-3 w-3" /> Colar lista
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
