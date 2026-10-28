import React, { useState } from 'react';
import { Check, Plus, X, ListChecks } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ChecklistItem } from '../types';

export const ChecklistView: React.FC = () => {
  const { checklist, addChecklistItem, toggleChecklistItem, deleteChecklistItem, clearCompletedChecklist } = useApp();
  const [text, setText] = useState('');

  const pending = checklist.filter((i) => !i.done);
  const done = checklist.filter((i) => i.done);
  const percent = checklist.length > 0 ? Math.round((done.length / checklist.length) * 100) : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    addChecklistItem(text);
    setText('');
  };

  const renderItem = (item: ChecklistItem) => (
    <li
      key={item.id}
      className="group flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 last:border-b-0"
    >
      <button
        type="button"
        onClick={() => toggleChecklistItem(item.id)}
        aria-label={item.done ? `Desmarcar ${item.text}` : `Marcar ${item.text}`}
        className={`h-5 w-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
          item.done
            ? 'bg-emerald-500 border-emerald-500 text-white'
            : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
        }`}
      >
        {item.done && <Check className="h-3 w-3" strokeWidth={3} />}
      </button>

      <span
        onClick={() => toggleChecklistItem(item.id)}
        className={`flex-1 min-w-0 text-sm cursor-pointer select-none break-words ${
          item.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-800 dark:text-slate-100'
        }`}
      >
        {item.text}
      </span>

      <button
        type="button"
        onClick={() => deleteChecklistItem(item.id)}
        aria-label={`Remover ${item.text}`}
        title="Remover"
        className="p-1 rounded-md text-slate-400 hover:text-rose-500 opacity-60 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition-opacity"
      >
        <X className="h-4 w-4" />
      </button>
    </li>
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Checklist</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          Anote os temas que você quer estudar e marque conforme for concluindo.
        </p>
      </div>

      {/* Add */}
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          id="checklist-input"
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Novo tema... (ex: Insuficiência cardíaca)"
          maxLength={200}
          className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          aria-label="Adicionar tema"
          className="h-10 w-10 shrink-0 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:hover:bg-sky-600 text-white flex items-center justify-center transition-colors"
        >
          <Plus className="h-5 w-5" />
        </button>
      </form>

      {checklist.length === 0 ? (
        <div className="py-14 text-center">
          <ListChecks className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Sua lista está vazia.</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Digite um tema acima e pressione Enter.</p>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {done.length} de {checklist.length} concluídos
              </span>
              <span className="font-semibold">{percent}%</span>
            </div>
            <div className="h-1 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
              <div className="h-full bg-emerald-500 transition-all duration-300" style={{ width: `${percent}%` }} />
            </div>
          </div>

          {/* Pending */}
          {pending.length > 0 && (
            <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              {pending.map(renderItem)}
            </ul>
          )}

          {/* Done */}
          {done.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Concluídos ({done.length})
                </span>
                <button
                  type="button"
                  onClick={clearCompletedChecklist}
                  className="text-xs text-slate-400 hover:text-rose-500 transition-colors"
                >
                  Limpar concluídos
                </button>
              </div>
              <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/50 overflow-hidden">
                {done.map(renderItem)}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};
