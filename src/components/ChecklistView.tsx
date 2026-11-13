import IconSwap from './shared/IconSwap';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Plus,
  Trash2,
  Star,
  CalendarDays,
  ListChecks,
  MoreHorizontal,
  ChevronDown,
  X,
  Pencil,
  Eraser,
  Target,
  ListTree,
} from 'lucide-react';
import { SubItemsEditor, subItemsProgress } from './shared/SubItems';
import { ShareChecklistButton } from './shared/ShareChecklistButton';
import { useApp } from '../context/AppContext';
import SwipeRow from './shared/SwipeRow';
import SpringCheck from './shared/SpringCheck';
import { ChecklistItem } from '../types';
import { CHECKLIST_COLORS, CHECKLIST_TEMPLATES, formatDateBR, toYMD } from '../data/planning';
import './checklist/notebook.css';

const ACCENT = '#0284c7';
const RINGS = Array.from({ length: 11 });

/** 1 coluna no celular, 2 no tablet (md), 3 em telas largas (xl) */
const useColumnCount = () => {
  const get = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return 1;
    if (window.matchMedia('(min-width: 1280px)').matches) return 3;
    if (window.matchMedia('(min-width: 768px)').matches) return 2;
    return 1;
  };
  const [count, setCount] = useState(get);
  useEffect(() => {
    if (!window.matchMedia) return;
    const queries = [window.matchMedia('(min-width: 1280px)'), window.matchMedia('(min-width: 768px)')];
    const update = () => setCount(get());
    queries.forEach((q) => q.addEventListener('change', update));
    return () => queries.forEach((q) => q.removeEventListener('change', update));
  }, []);
  return count;
};

/** Fileira de argolas de espiral no topo do bloco */
const NotebookRings: React.FC = () => (
  <div className="nb-rings" aria-hidden="true">
    {RINGS.map((_, i) => (
      <span key={i} className="nb-ring" />
    ))}
  </div>
);

const EMOJIS = ['📋', '📚', '🩺', '🏥', '📝', '🎒', '☀️', '🎯', '💊', '🧠', '🏋️', '⭐'];
const GENERAL_ID = 'geral';

interface BlockView {
  id: string;
  name: string;
  color: string;
  emoji?: string;
  virtual?: boolean;
}

const sortItems = (a: ChecklistItem, b: ChecklistItem) =>
  Number(!!b.important) - Number(!!a.important) ||
  (a.dueDate || '9999').localeCompare(b.dueDate || '9999') ||
  b.createdAt.localeCompare(a.createdAt);

export const ChecklistView: React.FC = () => {
  const {
    checklist,
    checklistBlocks,
    addChecklistItem,
    updateChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    clearCompletedChecklist,
    addChecklistBlock,
    updateChecklistBlock,
    deleteChecklistBlock,
  } = useApp();

  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [openDone, setOpenDone] = useState<Record<string, boolean>>({});
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [editingBlock, setEditingBlock] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: string; text: string } | null>(null);
  const [detailsOpen, setDetailsOpen] = useState<Record<string, boolean>>({});
  // Item recém-marcado fica um instante no lugar para o "visto" aparecer, depois vai para Concluídos
  const [settling, setSettling] = useState<Record<string, boolean>>({});
  const toggleItem = (item: ChecklistItem) => {
    if (!item.done) {
      setSettling((s) => ({ ...s, [item.id]: true }));
      window.setTimeout(() => {
        setSettling((s) => {
          const next = { ...s };
          delete next[item.id];
          return next;
        });
      }, 420);
    }
    toggleChecklistItem(item.id);
  };
  const [creator, setCreator] = useState<{ open: boolean; name: string; color: string; emoji: string }>({
    open: false,
    name: '',
    color: CHECKLIST_COLORS[0],
    emoji: EMOJIS[0],
  });

  const todayStr = toYMD(new Date());
  const blockIds = new Set(checklistBlocks.map((b) => b.id));
  const ownerOf = (item: ChecklistItem) => (item.blockId && blockIds.has(item.blockId) ? item.blockId : GENERAL_ID);

  // Itens sem bloco (versão antiga do checklist) ficam em "Geral"
  const blocks: BlockView[] = useMemo(() => {
    const list: BlockView[] = [...checklistBlocks];
    if (checklist.some((i) => !i.blockId || !blockIds.has(i.blockId))) {
      list.unshift({ id: GENERAL_ID, name: 'Geral', color: '#64748b', emoji: '📋', virtual: true });
    }
    return list;
  }, [checklistBlocks, checklist]);

  const blockById = (id: string) => blocks.find((b) => b.id === id);

  // Masonry: distribui os blocos na coluna mais "baixa" (estimativa pela quantidade de itens)
  const columnCount = useColumnCount();
  const masonry = useMemo(() => {
    const cols: BlockView[][] = Array.from({ length: columnCount }, () => []);
    const heights = new Array(columnCount).fill(0);
    blocks.forEach((b) => {
      // Usa o total (não só pendentes) para os blocos não pularem de coluna ao marcar itens
      const h = 4 + checklist.filter((i) => ownerOf(i) === b.id).length * 0.6;
      const target = heights.indexOf(Math.min(...heights));
      cols[target].push(b);
      heights[target] += h;
    });
    return cols;
  }, [blocks, checklist, columnCount]);

  const total = checklist.length;
  const doneCount = checklist.filter((i) => i.done).length;
  const percent = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  const focus = checklist
    .filter((i) => (!i.done || settling[i.id]) && (i.important || (i.dueDate && i.dueDate <= todayStr)))
    .sort(sortItems);

  const submitItem = (blockId: string) => {
    const text = (drafts[blockId] || '').trim();
    if (!text) return;
    addChecklistItem(text, blockId === GENERAL_ID ? undefined : blockId);
    setDrafts((d) => ({ ...d, [blockId]: '' }));
  };

  const createBlock = (template?: (typeof CHECKLIST_TEMPLATES)[number]) => {
    if (template) {
      addChecklistBlock({ name: template.name, color: template.color, emoji: template.emoji }, template.items);
    } else {
      if (!creator.name.trim()) return;
      addChecklistBlock({ name: creator.name, color: creator.color, emoji: creator.emoji });
    }
    setCreator({ open: false, name: '', color: CHECKLIST_COLORS[(checklistBlocks.length + 1) % CHECKLIST_COLORS.length], emoji: EMOJIS[0] });
  };

  // "Geral" não é um bloco salvo: excluir apaga os itens antigos que estão nele
  const removeBlock = (block: BlockView, count: number) => {
    const msg = count > 0 ? `Excluir o bloco "${block.name}" e seus ${count} ${count === 1 ? 'item' : 'itens'}?` : `Excluir o bloco "${block.name}"?`;
    if (!window.confirm(msg)) return;
    if (block.virtual) {
      checklist.filter((i) => ownerOf(i) === GENERAL_ID).forEach((i) => deleteChecklistItem(i.id));
    } else {
      deleteChecklistBlock(block.id);
    }
  };

  const saveItemText = () => {
    if (!editingItem) return;
    const text = editingItem.text.trim();
    if (text) updateChecklistItem(editingItem.id, { text });
    setEditingItem(null);
  };

  const [moreOpen, setMoreOpen] = useState<Record<string, boolean>>({});

  // A cor do bloco fica só no título/progresso; checkbox e subitens usam o azul do site
  const renderItem = (item: ChecklistItem, _color: string, showBlock = false) => {
    const overdue = !item.done && item.dueDate && item.dueDate < todayStr;
    const block = showBlock ? blockById(ownerOf(item)) : undefined;
    // No toque: as ações sem uso ficam atrás do "⋯" (linha compacta)
    const more = !!moreOpen[item.id];
    const touchHide = more ? '' : 'no-hover:hidden';
    return (
      <li key={item.id} className="list-none">
      <SwipeRow
        label={item.text}
        actions={[{ id: 'delete', label: 'Excluir' }]}
        onCommit={() => deleteChecklistItem(item.id, { undo: true })}
        radius={8}
        actionWidth={76}
        rowColor="var(--nb-paper)"
        surfaceClassName="nb-row group flex flex-wrap items-start gap-x-2 px-2 transition-colors"
      >
        <div className="min-w-0 flex-1">
          {editingItem?.id === item.id ? (
            <input
              autoFocus
              value={editingItem.text}
              onChange={(e) => setEditingItem({ id: item.id, text: e.target.value })}
              onBlur={saveItemText}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveItemText();
                if (e.key === 'Escape') setEditingItem(null);
              }}
              className="w-full bg-transparent text-sm text-slate-900 dark:text-white border-b border-sky-500 focus:outline-hidden"
            />
          ) : (
            <SpringCheck
              id={`check-item-${item.id}`}
              label={item.text}
              checked={item.done}
              onChange={() => toggleItem(item)}
              fillColor={ACCENT}
              checkColor="#ffffff"
              boxSize={18}
              boxRadius={6}
              fontSize={14}
              className="text-slate-800 dark:text-slate-100"
            />
          )}
          {(item.dueDate || block) && (
            <div className="flex items-center gap-2 -mt-1 mb-1 pl-[26px] text-[10px] font-semibold">
              {block && (
                <span className="flex items-center gap-1 text-slate-500">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: block.color }} />
                  {block.name}
                </span>
              )}
              {item.dueDate && (
                <span className={overdue ? 'text-rose-500' : item.dueDate === todayStr ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500'}>
                  {item.dueDate === todayStr ? 'Hoje' : formatDateBR(item.dueDate).slice(0, 5)}
                  {overdue && ' · atrasado'}
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0 pt-1">
          <button
            type="button"
            id={`check-more-${item.id}`}
            onClick={() => setMoreOpen((o) => ({ ...o, [item.id]: !more }))}
            aria-expanded={more}
            aria-label={more ? 'Esconder ações' : 'Mais ações'}
            className="can-hover:hidden order-last h-7 w-7 grid place-items-center rounded-md text-slate-400 dark:text-slate-300/80 hover:text-sky-500"
          >
            <IconSwap swapped={more} from={<MoreHorizontal className="h-4 w-4" />} to={<X className="h-4 w-4" />} />
          </button>
          <button
            type="button"
            id={`check-edit-${item.id}`}
            onClick={() => setEditingItem({ id: item.id, text: item.text })}
            className={`p-1 rounded-md text-slate-400 dark:text-slate-300/70 ${touchHide} can-hover:opacity-0 can-hover:group-hover:opacity-100 hover:text-sky-500`}
            aria-label="Editar item"
            title="Editar"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {(() => {
            const pr = subItemsProgress(item.details);
            const open = !!detailsOpen[item.id];
            return (
              <button
                type="button"
                id={`check-details-${item.id}`}
                onClick={() => setDetailsOpen((o) => ({ ...o, [item.id]: !open }))}
                aria-expanded={open}
                className={`p-1 rounded-md inline-flex items-center gap-0.5 text-[10px] font-bold transition-colors ${
                  open || pr.total ? 'text-sky-500' : `text-slate-400 dark:text-slate-300/70 ${touchHide} can-hover:opacity-0 can-hover:group-hover:opacity-100 hover:text-sky-500`
                }`}
                aria-label={open ? 'Esconder subitens' : 'Subitens'}
                title={pr.total ? 'Subitens' : 'Adicionar subitens (opcional)'}
              >
                {pr.total > 0 ? (
                  <>
                    <span>{pr.done}/{pr.total}</span>
                    <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                  </>
                ) : (
                  <ListTree className="h-3.5 w-3.5" />
                )}
              </button>
            );
          })()}
          <button
            onClick={() => updateChecklistItem(item.id, { important: !item.important })}
            className={`p-1 rounded-md transition-colors ${
              item.important ? 'text-amber-500' : `text-slate-400 dark:text-slate-300/70 ${touchHide} can-hover:opacity-0 can-hover:group-hover:opacity-100 hover:text-amber-500`
            }`}
            aria-label={item.important ? 'Remover dos essenciais' : 'Marcar como essencial'}
            title="Essencial"
          >
            <Star className="h-3.5 w-3.5" fill={item.important ? 'currentColor' : 'none'} />
          </button>
          <label
            className={`relative p-1 rounded-md cursor-pointer transition-colors ${
              item.dueDate ? 'text-sky-500' : `text-slate-400 dark:text-slate-300/70 ${touchHide} can-hover:opacity-0 can-hover:group-hover:opacity-100 hover:text-sky-500`
            }`}
            title="Definir data (aparece no Planner)"
          >
            <CalendarDays className="h-3.5 w-3.5" />
            <input
              type="date"
              value={item.dueDate || ''}
              onChange={(e) => updateChecklistItem(item.id, { dueDate: e.target.value || undefined })}
              className="absolute inset-0 opacity-0 cursor-pointer"
              aria-label="Data do item"
            />
          </label>
          <button
            onClick={() => deleteChecklistItem(item.id, { undo: true })}
            className={`p-1 rounded-md text-slate-400 dark:text-slate-300/70 ${touchHide} can-hover:opacity-0 can-hover:group-hover:opacity-100 hover:text-rose-500`}
            aria-label="Excluir item"
            title="Excluir (ou deslize o item para a esquerda)"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {detailsOpen[item.id] && (
          <div className="basis-full pl-5 pb-1.5">
            <SubItemsEditor idPrefix={`check-${item.id}`} items={item.details} onChange={(d) => updateChecklistItem(item.id, { details: d })} color={ACCENT} />
          </div>
        )}
      </SwipeRow>
      </li>
    );
  };

  const renderBlock = (block: BlockView) => {
    const items = checklist.filter((i) => ownerOf(i) === block.id);
    const pending = items.filter((i) => !i.done || settling[i.id]).sort(sortItems);
    const done = items.filter((i) => i.done && !settling[i.id]);
    const pct = items.length > 0 ? Math.round((done.length / items.length) * 100) : 0;
    const isEditing = editingBlock === block.id;

    return (
      <section key={block.id} className="nb flex flex-col break-inside-avoid mb-6">
        <NotebookRings />
        <header className="px-3.5 pt-5 pb-1.5">
          <div className="flex items-center justify-between gap-2">
            {isEditing ? (
              <input
                autoFocus
                defaultValue={block.name}
                onBlur={(e) => {
                  if (e.target.value.trim()) updateChecklistBlock(block.id, { name: e.target.value.trim() });
                  setEditingBlock(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                  if (e.key === 'Escape') setEditingBlock(null);
                }}
                className="flex-1 min-w-0 text-sm font-black bg-transparent border-b border-sky-500 text-slate-900 dark:text-white focus:outline-hidden"
              />
            ) : (
              <h2 className="flex items-center gap-1.5 min-w-0 text-[13px] font-black uppercase tracking-wide text-slate-800 dark:text-slate-100">
                <span className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: block.color }} aria-hidden="true" />
                <span className="text-base leading-none normal-case">{block.emoji}</span>
                <span className="truncate">{block.name}</span>
                <span className="shrink-0 text-[11px] font-bold tracking-normal text-slate-400 dark:text-slate-500">
                  ({done.length}/{items.length})
                </span>
              </h2>
            )}
            <div className="relative flex items-center gap-0.5 shrink-0">
              {!block.virtual && <ShareChecklistButton block={block} />}
              {!block.virtual && (
                <button
                  onClick={() => setMenuFor(menuFor === block.id ? null : block.id)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  aria-label="Opções do bloco"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              )}
              <button
                id={`checklist-delete-block-${block.id}`}
                onClick={() => removeBlock(block, items.length)}
                className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                aria-label={`Excluir bloco ${block.name}`}
                title="Excluir bloco"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {menuFor === block.id && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-7 z-20 w-52 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-2 space-y-1">
                  <button
                    onClick={() => {
                      setEditingBlock(block.id);
                      setMenuFor(null);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Renomear
                  </button>
                  <div className="px-2 py-1">
                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Cor</div>
                    <div className="flex flex-wrap gap-1.5">
                      {CHECKLIST_COLORS.map((c) => (
                        <button
                          key={c}
                          onClick={() => updateChecklistBlock(block.id, { color: c })}
                          className={`w-5 h-5 rounded-full ${block.color === c ? 'ring-2 ring-offset-1 ring-sky-500 dark:ring-offset-slate-900' : ''}`}
                          style={{ backgroundColor: c }}
                          aria-label={`Cor ${c}`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="px-2 py-1">
                    <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Ícone</div>
                    <div className="flex flex-wrap gap-1">
                      {EMOJIS.map((em) => (
                        <button
                          key={em}
                          onClick={() => updateChecklistBlock(block.id, { emoji: em })}
                          className={`w-6 h-6 rounded-md text-sm ${block.emoji === em ? 'bg-slate-100 dark:bg-slate-800' : ''}`}
                        >
                          {em}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      clearCompletedChecklist(block.id);
                      setMenuFor(null);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Eraser className="h-3.5 w-3.5" /> Limpar concluídos
                  </button>
                  <button
                    onClick={() => {
                      setMenuFor(null);
                      removeBlock(block, items.length);
                    }}
                    className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir bloco
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="nb-progress mt-1.5" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`Progresso de ${block.name}`}>
            <span style={{ width: `${pct}%`, backgroundColor: block.color }} />
          </div>
        </header>

        <div className="px-1.5 flex-1">
          {pending.length === 0 && done.length === 0 ? (
            <p className="text-xs text-slate-400 px-2 py-2.5 border-b border-[var(--nb-line)]">Nenhum item ainda.</p>
          ) : pending.length === 0 ? (
            <p className="text-xs font-semibold px-2 py-2.5 border-b border-[var(--nb-line)] text-sky-600 dark:text-sky-400">
              Tudo feito! ✨
            </p>
          ) : (
            <ul className="nb-ruled">{pending.map((i) => renderItem(i, block.color))}</ul>
          )}
          {done.length > 0 && (
            <div className="border-b border-[var(--nb-line)]">
              <button
                onClick={() => setOpenDone((o) => ({ ...o, [block.id]: !o[block.id] }))}
                aria-expanded={!!openDone[block.id]}
                className="flex items-center gap-1 px-2 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1.5"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform motion-reduce:transition-none ${openDone[block.id] ? '' : '-rotate-90'}`} />
                Concluídos ({done.length})
              </button>
              {openDone[block.id] && (
                <ul className="nb-ruled opacity-80 [&>li:last-child]:border-b-0">{done.map((i) => renderItem(i, block.color))}</ul>
              )}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitItem(block.id);
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 mb-1"
        >
          <Plus className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />
          <input
            value={drafts[block.id] || ''}
            onChange={(e) => setDrafts((d) => ({ ...d, [block.id]: e.target.value }))}
            placeholder="Adicionar item..."
            className="flex-1 min-w-0 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden py-1"
            aria-label={`Adicionar item em ${block.name}`}
          />
        </form>
      </section>
    );
  };

  return (
    <div className="tab-root space-y-5 pb-12 max-w-6xl mx-auto" onClick={() => menuFor && setMenuFor(null)}>
      {/* Cabeçalho */}
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Checklist</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Blocos de anotação. ⭐ destaca, 📅 leva ao Planner.
          </p>
          {total > 0 && (
            <div className="flex items-center gap-2 mt-2">
              <div
                className="w-24 sm:w-32 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Progresso geral do checklist"
              >
                <div className="h-full rounded-full bg-sky-600 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${percent}%` }} />
              </div>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                <span className="font-black text-slate-800 dark:text-slate-100">{percent}%</span> · {doneCount} de {total} feitos
              </span>
            </div>
          )}
        </div>
        <button
          id="checklist-new-block-btn"
          onClick={(e) => {
            e.stopPropagation();
            setCreator((c) => ({ ...c, open: !c.open }));
          }}
          aria-expanded={creator.open}
          className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
        >
          <Plus className="h-4 w-4" /> Novo bloco
        </button>
      </header>

      {/* Criar bloco */}
      {(creator.open || blocks.length === 0) && (
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-slate-900 dark:text-white">
              {blocks.length === 0 ? 'Crie seu primeiro bloco' : 'Novo bloco'}
            </h2>
            {blocks.length > 0 && (
              <button onClick={() => setCreator((c) => ({ ...c, open: false }))} className="p-1 rounded-lg text-slate-400 hover:text-slate-600" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createBlock();
            }}
            className="flex flex-col md:flex-row md:items-center gap-3"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3">
              <span className="text-lg">{creator.emoji}</span>
              <input
                id="checklist-block-name"
                autoFocus
                value={creator.name}
                onChange={(e) => setCreator((c) => ({ ...c, name: e.target.value }))}
                placeholder="Nome do bloco (ex: Revisar para OSCE)"
                className="flex-1 min-w-0 bg-transparent py-2.5 text-sm text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              {CHECKLIST_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCreator((s) => ({ ...s, color: c }))}
                  className={`w-6 h-6 rounded-full transition-transform ${creator.color === c ? 'ring-2 ring-offset-2 ring-sky-500 dark:ring-offset-slate-900 scale-110' : ''}`}
                  style={{ backgroundColor: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
            <button
              type="submit"
              disabled={!creator.name.trim()}
              className="px-4 py-2.5 rounded-xl text-white text-xs font-bold disabled:opacity-40"
              style={{ backgroundColor: creator.color }}
            >
              Criar bloco
            </button>
          </form>
          <div className="flex items-center gap-1 flex-wrap mt-3">
            {EMOJIS.map((em) => (
              <button
                key={em}
                type="button"
                onClick={() => setCreator((c) => ({ ...c, emoji: em }))}
                className={`w-8 h-8 rounded-lg text-base ${creator.emoji === em ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
              >
                {em}
              </button>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">Ou comece com um modelo</div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
              {CHECKLIST_TEMPLATES.map((t) => (
                <button
                  key={t.name}
                  onClick={() => createBlock(t)}
                  className="text-left rounded-2xl border border-slate-200 dark:border-slate-800 p-3 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${t.color}22` }}>
                      {t.emoji}
                    </span>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{t.name}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1.5 line-clamp-2">
                    {t.items.length > 0 ? t.items.join(' · ') : 'Bloco vazio para listar os temas que quer estudar'}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Foco: essenciais e itens com data para hoje/atrasados */}
      {focus.length > 0 && (
        <section className="nb nb--focus px-1.5 pt-3 pb-2">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 px-2 mb-1">
            <Target className="h-4 w-4" /> Foco agora
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15">{focus.length}</span>
          </h2>
          <ul className="nb-ruled grid grid-cols-1 md:grid-cols-2 gap-x-4">
            {focus.slice(0, 8).map((i) => renderItem(i, blockById(ownerOf(i))?.color || '#64748b', true))}
          </ul>
        </section>
      )}

      {blocks.length > 0 ? (
        <div className="flex items-start gap-5 pt-1">
          {masonry.map((col, ci) => (
            <div key={ci} className="flex-1 min-w-0 flex flex-col">
              {col.map(renderBlock)}
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-6 text-slate-400">
          <ListChecks className="h-8 w-8 mx-auto mb-2" />
          <p className="text-xs">Seus blocos aparecem aqui.</p>
        </div>
      )}
    </div>
  );
};
