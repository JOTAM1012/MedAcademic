// Subtópicos ("Título: descrição"), como no plano de ensino da faculdade.
// Opcional: usado nos tópicos dos blocos e nos itens do Checklist.
// Aceita colar uma lista inteira: cada linha vira um subtópico (marcadores •, ○, -, 1. são limpos).
import React, { useState } from 'react';
import { Check, ChevronUp, Plus, X } from 'lucide-react';
import type { SubItem } from '../../types';

const uid = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** "○ Título: descrição" → { title, text } */
export const parseSubItemLine = (line: string): Omit<SubItem, 'id'> | null => {
  const clean = line
    .replace(/^\s*(?:[•○●◦▪■□\-–—*]+|\d+[.)]|[a-zA-Z][.)])\s*/, '')
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

export const subItemsProgress = (items?: SubItem[]) => {
  const list = items || [];
  return { done: list.filter((s) => s.done).length, total: list.length };
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

  const save = (next: SubItem[]) => onChange(next.length ? next : undefined);
  const add = (raw: string) => {
    const parsed = raw
      .split(/\r?\n/)
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
        <ul className="space-y-1">
          {list.map((s) => (
            <li key={s.id} className="group/sub flex items-start gap-2">
              <button
                type="button"
                id={`${idPrefix}-sub-${s.id}`}
                onClick={() => save(list.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)))}
                className="mt-[3px] h-4 w-4 shrink-0 rounded-full border-2 grid place-items-center transition-colors"
                style={{ borderColor: s.done ? color : '#94a3b8', backgroundColor: s.done ? color : 'transparent' }}
                aria-label={s.done ? `Desmarcar ${s.title}` : `Marcar ${s.title} como visto`}
              >
                {s.done && <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} />}
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
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing({ id: s.id, value: s.text ? `${s.title}: ${s.text}` : s.title })}
                  className={`flex-1 min-w-0 text-left text-xs leading-relaxed break-words ${s.done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-700 dark:text-slate-200'}`}
                  title="Toque para editar"
                >
                  <em className={`font-semibold ${s.done ? '' : 'text-slate-900 dark:text-white'}`}>{s.title}</em>
                  {s.text && <span>: {s.text}</span>}
                </button>
              )}
              <button
                type="button"
                onClick={() => save(list.filter((x) => x.id !== s.id))}
                className="h-6 w-6 -mt-0.5 shrink-0 grid place-items-center rounded-md text-slate-300 dark:text-slate-600 sm:opacity-0 sm:group-hover/sub:opacity-100 focus:opacity-100 hover:text-rose-500"
                aria-label={`Excluir ${s.title}`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
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
      {onHide && (
        <div className="flex justify-end">
          <button
            type="button"
            id={`${idPrefix}-sub-hide`}
            onClick={onHide}
            className="min-h-[28px] inline-flex items-center gap-1 px-1.5 rounded-md text-[11px] font-semibold text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <ChevronUp className="h-3.5 w-3.5" /> Esconder
          </button>
        </div>
      )}
    </div>
  );
};
