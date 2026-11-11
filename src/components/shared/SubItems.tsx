// Subtópicos ("Título: descrição"), como no plano de ensino da faculdade.
// Opcional: usado nos tópicos dos blocos e nos itens do Checklist.
// Aceita colar uma lista inteira: cada linha vira um subtópico (marcadores •, ○, -, 1. são limpos).
import React, { useRef, useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { Check, GripVertical, Pencil, Plus, X } from 'lucide-react';
import type { SubItem } from '../../types';
import { AnimatedCheck } from './AnimatedCheck';

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** "○ Título: descrição" → { title, text } */
export const parseSubItemLine = (line: string): Omit<SubItem, 'id'> | null => {
  const clean = line
    .replace(/^\s*(?:[•○●◦▪■□\-–—*]+|\d+[.)]|[a-zA-Z][.)]|o\t)\s*/, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return null;
  const i = clean.indexOf(':');
  if (i > 0 && i < 120) {
    const title = clean.slice(0, i).trim();
    const text = clean.slice(i + 1).trim();
    return text ? { title, text } : { title };
  }
  return { title: clean };
};

// Marcadores de lista (o "o" + tab é o marcador de 2º nível que o Word copia)
const BULLET = /^\s*(?:[•○●◦▪■□\-–—*]+\s*|\d+[.)]\s+|[a-zA-Z][.)]\s+|o\t)/;
/**
 * Texto colado de PDF/Word quebra uma frase em várias linhas. Junta as linhas que são
 * continuação: com marcadores na lista, linha sem marcador continua a anterior; sem marcadores,
 * continua quando a anterior não termina em ponto final e a nova começa com letra minúscula.
 */
export const joinWrappedLines = (raw: string): string[] => {
  const lines = raw.split(/\r?\n/).map((l) => l.replace(/\s+$/, '')).filter((l) => l.trim());
  const hasBullets = lines.some((l) => BULLET.test(l));
  const out: string[] = [];
  lines.forEach((l) => {
    const prev = out[out.length - 1];
    const t = l.trim();
    const cont =
      prev !== undefined &&
      (hasBullets ? !BULLET.test(l) : !/[.;!?:]$/.test(prev.trim()) && /^[a-zà-ú(,]/.test(t));
    if (cont) out[out.length - 1] = `${prev.trim()} ${t}`;
    else out.push(t);
  });
  return out;
};

export const subItemsProgress =(items?: SubItem[]) => {
  const list = items || [];
  return { done: list.filter((s) => s.done).length, total: list.length };
};

/** Uma linha: alça para arrastar, bolinha, texto (toque edita) e X */
const SubRow: React.FC<{
  s: SubItem;
  color: string;
  idPrefix: string;
  editing: { id: string; value: string } | null;
  setEditing: (v: { id: string; value: string } | null) => void;
  saveEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onDragEnd: () => void;
  canDrag: boolean;
  editMode: boolean;
}> = ({ s, color, idPrefix, editing, setEditing, saveEdit, onToggle, onDelete, onDragEnd, canDrag, editMode }) => {
  const controls = useDragControls();
  return (
    <Reorder.Item
      as="li"
      value={s}
      dragListener={false}
      dragControls={controls}
      onDragEnd={onDragEnd}
      whileDrag={{ scale: 1.02, boxShadow: '0 8px 24px rgba(0,0,0,0.25)' }}
      className="group/sub relative flex items-start gap-1.5 rounded-lg bg-white dark:bg-slate-900"
    >
      {editMode && canDrag && (
        <span
          id={`${idPrefix}-sub-drag-${s.id}`}
          onPointerDown={(e) => controls.start(e)}
          style={{ touchAction: 'none' }}
          className="-ml-1 h-6 w-4 shrink-0 grid place-items-center cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-slate-500"
          aria-label={`Arrastar ${s.title} para mudar a ordem`}
          title="Arraste para mudar a ordem"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </span>
      )}
      <button
        type="button"
        id={`${idPrefix}-sub-${s.id}`}
        onClick={onToggle}
        className="mt-[3px] h-4 w-4 shrink-0 rounded-full grid place-items-center"
        aria-label={s.done ? `Desmarcar ${s.title}` : `Marcar ${s.title} como visto`}
      >
        <AnimatedCheck checked={!!s.done} color={color} shape="round" size={16} stroke={4} className="border-2" offStyle={{ borderColor: '#94a3b8', backgroundColor: 'transparent' }} />
      </button>
      {editing?.id === s.id ? (
        <input
          autoFocus
          value={editing.value}
          onChange={(e) => setEditing({ id: s.id, value: e.target.value })}
          onBlur={saveEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveEdit();
            if (e.key === 'Escape') setEditing(null);
          }}
          className="flex-1 min-w-0 bg-transparent text-xs text-slate-900 dark:text-white border-b border-sky-500 focus:outline-hidden"
        />
      ) : editMode ? (
        <button
          type="button"
          onClick={() => setEditing({ id: s.id, value: s.text ? `${s.title}: ${s.text}` : s.title })}
          className={`ml-0.5 flex-1 min-w-0 text-left text-xs leading-relaxed break-words transition-colors duration-200 ${s.done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}
          title="Toque para editar"
        >
          <em className={`font-semibold ${s.done ? '' : 'text-slate-900 dark:text-white'}`}>{s.title}</em>
          {s.text && <span>: {s.text}</span>}
        </button>
      ) : (
        <span className={`ml-0.5 flex-1 min-w-0 text-xs leading-relaxed break-words transition-colors duration-200 ${s.done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}>
          <em className={`font-semibold ${s.done ? '' : 'text-slate-900 dark:text-white'}`}>{s.title}</em>
          {s.text && <span>: {s.text}</span>}
        </span>
      )}
      {editMode && <button
        type="button"
        onClick={onDelete}
        className="h-6 w-6 -mt-0.5 shrink-0 grid place-items-center rounded-md text-slate-400 dark:text-slate-500 hover:text-rose-500"
        aria-label={`Excluir ${s.title}`}
      >
        <X className="h-3.5 w-3.5" />
      </button>}
    </Reorder.Item>
  );
};

interface Props {
  items: SubItem[] | undefined;
  onChange: (items: SubItem[] | undefined) => void;
  /** Cor da bolinha marcada */
  color?: string;
  idPrefix: string;
  /** Botão discreto para esconder a lista */
  onHide?: () => void;
}

export const SubItemsEditor: React.FC<Props> = ({ items, onChange, color = '#10b981', idPrefix, onHide }) => {
  const list = items || [];
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState<{ id: string; value: string } | null>(null);
  // Ordem durante o arrasto; salva só ao soltar
  const [order, setOrderState] = useState<SubItem[] | null>(null);
  const orderRef = useRef<SubItem[] | null>(null);
  const setOrder = (o: SubItem[] | null) => {
    orderRef.current = o;
    setOrderState(o);
  };
  // Modo edição: adicionar, arrastar, editar e apagar. Lista vazia já começa editando
  const [editMode, setEditMode] = useState(list.length === 0);
  const shown = order || list;

  const save = (next: SubItem[]) => onChange(next.length ? next : undefined);
  const add = (raw: string) => {
    const parsed = joinWrappedLines(raw)
      .map(parseSubItemLine)
      .filter((x): x is Omit<SubItem, 'id'> => !!x);
    if (!parsed.length) return;
    save([...list, ...parsed.map((p) => ({ id: uid(), ...p }))]);
    setDraft('');
  };
  const saveEdit = () => {
    if (!editing) return;
    const p = parseSubItemLine(editing.value);
    save(p ? list.map((s) => (s.id === editing.id ? { ...s, title: p.title, text: p.text } : s)) : list.filter((s) => s.id !== editing.id));
    setEditing(null);
  };

  return (
    <div className="mt-2 ml-2 pl-3 border-l-2 border-slate-200 dark:border-slate-700 space-y-1">
      {list.length > 0 && (
        <Reorder.Group as="ul" axis="y" values={shown} onReorder={setOrder} className="space-y-1">
          {shown.map((s) => (
            <SubRow
              key={s.id}
              s={s}
              color={color}
              idPrefix={idPrefix}
              editing={editing}
              setEditing={setEditing}
              saveEdit={saveEdit}
              canDrag={list.length > 1}
              editMode={editMode}
              onToggle={() => save(list.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
              onDelete={() => save(list.filter((x) => x.id !== s.id))}
              onDragEnd={() => {
                if (orderRef.current) save(orderRef.current);
                setOrder(null);
              }}
            />
          ))}
        </Reorder.Group>
      )}
      {editMode && (
        <div className="flex items-start gap-2 rounded-lg border border-dashed border-slate-200 dark:border-slate-700 px-2">
          <Plus className="h-3.5 w-3.5 shrink-0 text-slate-400 mt-[9px]" />
          <textarea
            id={`${idPrefix}-sub-input`}
            rows={1}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onPaste={(e) => {
              const text = e.clipboardData.getData('text');
              if (/\r?\n/.test(text.trim())) {
                e.preventDefault();
                add(text);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                add(draft);
              }
            }}
            placeholder="Subtópico: descrição (Enter)"
            title="Dica: cole uma lista inteira e cada linha vira um subtópico"
            className="flex-1 min-w-0 min-h-[34px] py-2 resize-none bg-transparent text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden"
            aria-label="Adicionar subtópico"
          />
        </div>
      )}
      <div className="flex justify-end">
        {editMode ? (
          <button
            type="button"
            id={`${idPrefix}-sub-ok`}
            onClick={() => {
              if (draft.trim()) add(draft);
              setEditing(null);
              setEditMode(false);
            }}
            className="min-h-[30px] inline-flex items-center gap-1 px-2.5 rounded-lg text-[11px] font-black bg-sky-600 hover:bg-sky-500 text-white"
          >
            <Check className="h-3.5 w-3.5" /> OK
          </button>
        ) : (
          <button
            type="button"
            id={`${idPrefix}-sub-edit`}
            onClick={() => setEditMode(true)}
            className="min-h-[28px] inline-flex items-center gap-1 px-1.5 rounded-md text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <Pencil className="h-3 w-3" /> Editar
          </button>
        )}
      </div>
    </div>
  );
};
