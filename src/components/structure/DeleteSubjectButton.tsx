// Lixeira no canto do quadrado da disciplina/módulo: um toque pergunta "Excluir?" e outro confirma.
import React, { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Subject } from '../../types';

export const DeleteSubjectButton: React.FC<{ subject: Subject; className?: string; compact?: boolean }> = ({ subject, className = '', compact }) => {
  const { deleteSubjects } = useApp();
  const [confirm, setConfirm] = useState(false);
  const label = subject.kind === 'module' ? 'módulo' : 'disciplina';

  if (confirm && compact)
    return (
      <div
        role="alertdialog"
        aria-label={`Excluir ${subject.name}?`}
        onClick={(e) => e.stopPropagation()}
        className="absolute inset-0 z-10 bg-white/95 dark:bg-slate-900/95 flex items-center justify-between gap-2 px-4"
      >
        <p className="min-w-0 truncate text-sm font-black text-slate-900 dark:text-white">Excluir "{subject.name}"?</p>
        <div className="flex shrink-0 gap-1.5">
          <button type="button" onClick={() => setConfirm(false)} className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
            Cancelar
          </button>
          <button
            type="button"
            id={`struct-delete-yes-${subject.id}`}
            onClick={() => deleteSubjects([subject.id])}
            className="min-h-[40px] px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black inline-flex items-center gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </button>
        </div>
      </div>
    );

  if (confirm)
    return (
      <div
        role="alertdialog"
        aria-label={`Excluir ${subject.name}?`}
        onClick={(e) => e.stopPropagation()}
        className={`absolute inset-0 z-10 rounded-3xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs flex flex-col items-center justify-center gap-3 p-4 text-center`}
      >
        <p className="text-sm font-black text-slate-900 dark:text-white">Excluir {label} "{subject.name}"?</p>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">Os assuntos, blocos e revisões dela também saem. Não dá para desfazer.</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => setConfirm(false)} className="min-h-[40px] px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800">
            Cancelar
          </button>
          <button
            type="button"
            id={`struct-delete-yes-${subject.id}`}
            onClick={() => deleteSubjects([subject.id])}
            className="min-h-[40px] px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black inline-flex items-center gap-1.5"
          >
            <Trash2 className="h-4 w-4" /> Excluir
          </button>
        </div>
      </div>
    );

  return (
    <button
      type="button"
      id={`struct-delete-${subject.id}`}
      aria-label={`Excluir ${label} ${subject.name}`}
      title={`Excluir ${label}`}
      onClick={(e) => {
        e.stopPropagation();
        setConfirm(true);
      }}
      className={`absolute bottom-3 right-3 z-10 h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:text-rose-400 dark:hover:bg-rose-500/10 transition-colors ${className}`}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
};
