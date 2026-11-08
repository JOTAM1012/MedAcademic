import React, { useState } from 'react';
import { CalendarPlus, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { TopicBlock } from '../../types';
import { DatePickerField } from '../DatePickerField';
import { addDaysYMD, formatDM, ymd } from '../../data/blockReview';

// "Adicionar no Planner": Hoje, Amanhã ou outra data para estudar o tema (plannedDate = D0 no Planner)
export const PlanBlockButton: React.FC<{ block: TopicBlock; leading?: React.ReactNode }> = ({ block, leading }) => {
  const { updateTopicBlock, openPlannerToday, showNotification } = useApp();
  const [open, setOpen] = useState(false);
  const today = ymd(new Date());
  const tomorrow = addDaysYMD(1);
  const planned = block.plannedDate;
  const label = !planned ? null : planned === today ? 'Hoje' : planned === tomorrow ? 'Amanhã' : formatDM(planned);

  const plan = (date: string | undefined) => {
    updateTopicBlock(block.id, { plannedDate: date });
    setOpen(false);
    if (date) showNotification(`📅 "${block.name}" no Planner: ${date === today ? 'hoje' : date === tomorrow ? 'amanhã' : formatDM(date)}.`, 'success');
  };

  const chip = (on: boolean) =>
    `h-10 px-3.5 rounded-xl text-xs font-bold transition-colors ${
      on ? 'bg-sky-600 text-white' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400'
    }`;

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
      {leading}
      <button
        type="button"
        id={`struct-plan-${block.id}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`min-w-0 h-10 inline-flex items-center justify-center gap-1.5 px-3 rounded-xl text-xs font-bold transition-colors ${
          planned ? 'bg-sky-500/10 text-sky-700 dark:text-sky-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
      >
        <CalendarPlus className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{label ? `Planner · ${label}` : 'Adicionar no Planner'}</span>
      </button>
      </div>
      {open && (
        <div className="mt-2 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 p-2.5 space-y-2">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Quando você vai estudar este tema?</p>
          <div className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => plan(today)} className={chip(planned === today)}>
              Hoje
            </button>
            <button type="button" onClick={() => plan(tomorrow)} className={chip(planned === tomorrow)}>
              Amanhã
            </button>
            <DatePickerField
              id={`struct-plan-date-${block.id}`}
              value={planned && planned !== today && planned !== tomorrow ? planned : ''}
              onChange={(v) => plan(v || undefined)}
              placeholder="Outra data"
              className="h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-700 dark:text-slate-200"
            />
          </div>
          <div className="flex items-center justify-between gap-2">
            {planned ? (
              <button type="button" onClick={() => plan(undefined)} className="h-9 inline-flex items-center gap-1 px-2 rounded-lg text-[11px] font-bold text-slate-500 hover:text-rose-600">
                <X className="h-3.5 w-3.5" /> Tirar do Planner
              </button>
            ) : (
              <span />
            )}
            {planned === today && (
              <button type="button" onClick={() => openPlannerToday()} className="h-9 px-2 rounded-lg text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline">
                Ver no Planner →
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
