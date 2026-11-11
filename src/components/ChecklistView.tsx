import React, { useMemo, useState } from 'react';
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
import { AnimatedCheck } from './shared/AnimatedCheck';
import { useApp } from '../context/AppContext';
import { ChecklistItem } from '../types';
import { CHECKLIST_COLORS, CHECKLIST_TEMPLATES, formatDateBR, toYMD } from '../data/planning';

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

  const renderItem = (item: ChecklistItem, color: string, showBlock = false) => {
    const overdue = !item.done && item.dueDate && item.dueDate < todayStr;
    const block = showBlock ? blockById(ownerOf(item)) : undefined;
    return (
      <li key={item.id} className="group flex flex-wrap items-start gap-x-2.5 rounded-xl px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/50">
        <button
          onClick={() => toggleItem(item)}
          className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded-md flex items-center justify-center"
          aria-label={item.done ? 'Desmarcar' : 'Marcar como feito'}
        >
          <AnimatedCheck checked={item.done} color={color} size={18} className="border-2" offStyle={{ borderColor: color, backgroundColor: 'transparent' }} />
        </button>

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
            <span
              onDoubleClick={() => setEditingItem({ id: item.id, text: item.text })}
              className={`block text-sm break-words transition-colors duration-200 ${
                item.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'
              }`}
              title="Clique duas vezes para editar"
            >
              {item.text}
            </span>
          )}
          {(item.dueDate || block) && (
            <div className="flex items-center gap-2 mt-0.5 text-[10px] font-semibold">
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

        <div className="flex items-center gap-0.5 shrink-0">
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
                  open || pr.total ? 'text-sky-500' : 'text-slate-300 dark:text-slate-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-sky-500'
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
              item.important ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-amber-500'
            }`}
            aria-label={item.important ? 'Remover dos essenciais' : 'Marcar como essencial'}
            title="Essencial"
          >
            <Star className="h-3.5 w-3.5" fill={item.important ? 'currentColor' : 'none'} />
          </button>
          <label
            className={`relative p-1 rounded-md cursor-pointer transition-colors ${
              item.dueDate ? 'text-sky-500' : 'text-slate-300 dark:text-slate-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-sky-500'
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
            onClick={() => deleteChecklistItem(item.id)}
            className="p-1 rounded-md text-slate-300 dark:text-slate-600 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 hover:text-rose-500"
            aria-label="Excluir item"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
        {detailsOpen[item.id] && (
          <div className="basis-full pl-5">
            <SubItemsEditor idPrefix={`check-${item.id}`} items={item.details} onChange={(d) => updateChecklistItem(item.id, { details: d })} color={color} />
          </div>
        )}
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
      <section key={block.id} className="flex flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="h-1.5" style={{ backgroundColor: block.color }} />
        <header className="px-4 pt-3 pb-2">
          <div className="flex items-start justify-between gap-2">
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
              <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white min-w-0">
                <span className="text-base leading-none">{block.emoji}</span>
                <span className="truncate">{block.name}</span>
              </h2>
            )}
            <div className="relative flex items-center gap-1.5 shrink-0">
              <span className="text-[11px] font-bold text-slate-500">
                {done.length}/{items.length}
              </span>
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
          <div className="mt-2 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: block.color }} />
          </div>
        </header>

        <div className="px-2 flex-1">
          {pending.length === 0 && done.length === 0 ? (
            <p className="text-xs text-slate-400 px-2 py-3">Nenhum item ainda.</p>
          ) : pending.length === 0 ? (
            <p className="text-xs font-semibold px-2 py-3" style={{ color: block.color }}>
              Tudo feito! ✨
            </p>
          ) : (
            <ul>{pending.map((i) => renderItem(i, block.color))}</ul>
          )}
          {done.length > 0 && (
            <div className="px-2 pb-1">
              <button
                onClick={() => setOpenDone((o) => ({ ...o, [block.id]: !o[block.id] }))}
                className="flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 py-1"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${openDone[block.id] ? '' : '-rotate-90'}`} />
                Concluídos ({done.length})
              </button>
              {openDone[block.id] && <ul className="-mx-2">{done.map((i) => renderItem(i, block.color))}</ul>}
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitItem(block.id);
          }}
          className="flex items-center gap-2 border-t border-slate-100 dark:border-slate-800 px-3 py-2"
        >
          <Plus className="h-4 w-4 shrink-0" style={{ color: block.color }} />
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
    <div className="space-y-5 pb-12 max-w-6xl mx-auto" onClick={() => menuFor && setMenuFor(null)}>
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Checklist</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize o que é essencial em blocos com nome e cor. Marque ⭐ para destacar e 📅 para levar ao Planner.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {total > 0 && (
            <div className="text-right">
              <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{percent}%</div>
              <div className="text-[10px] text-slate-500">
                {doneCount} de {total} feitos
              </div>
            </div>
          )}
          <button
            id="checklist-new-block-btn"
            onClick={(e) => {
              e.stopPropagation();
              setCreator((c) => ({ ...c, open: !c.open }));
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
          >
            <Plus className="h-4 w-4" /> Novo bloco
          </button>
        </div>
      </div>

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
        <section className="rounded-3xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 p-3 sm:p-4">
          <h2 className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-amber-700 dark:text-amber-300 px-2 mb-1">
            <Target className="h-4 w-4" /> Foco agora
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/15">{focus.length}</span>
          </h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
            {focus.slice(0, 8).map((i) => renderItem(i, blockById(ownerOf(i))?.color || '#64748b', true))}
          </ul>
        </section>
      )}

      {blocks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-start">{blocks.map(renderBlock)}</div>
      ) : (
        <div className="text-center py-6 text-slate-400">
          <ListChecks className="h-8 w-8 mx-auto mb-2" />
          <p className="text-xs">Seus blocos aparecem aqui.</p>
        </div>
      )}
    </div>
  );
};
