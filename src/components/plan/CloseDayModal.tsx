// "Encerrar o dia": depois de estudar, o aluno diz o que não deu e decide cada tarefa que ficou
// sem marcar: Feito (esqueceu de marcar), Amanhã, Escolher dia ou Tirar. O site não decide por ele.
import React, { useState } from 'react';
import { CalendarDays, Check, CornerDownRight, MoonStar, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { addDaysYMD, formatDM } from '../../data/blockReview';
import type { PlanTask } from '../../data/studyMethod';
import { useDayPlan, useDayThemes } from '../../hooks/useStudyPlan';
import { AUTO_KINDS, PlanModal, taskSizeLabel } from './planShared';

interface CloseDayModalProps {
  open: boolean;
  onClose: () => void;
}

const domId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '-');

export const CloseDayModal: React.FC<CloseDayModalProps> = ({ open, onClose }) => {
  const { toggleTaskDone, skipTask, removeCustomTask, moveTaskToDate, moveTaskToTomorrow, setDayPlanState } = useApp();
  const plan = useDayPlan();
  const date = plan.date;
  const { removeTheme } = useDayThemes(date);
  const [pickFor, setPickFor] = useState<string | null>(null);
  const tomorrow = addDaysYMD(1, date);

  const pending = plan.tasks.filter((t) => !t.done && t.kind !== 'weekly_planning');
  const doneCount = plan.tasks.filter((t) => t.done).length;

  const remove = (t: PlanTask) => {
    if (t.kind === 'new_block' && t.blockId) removeTheme(t.blockId);
    else if (t.kind === 'custom' && t.customId) removeCustomTask(date, t.customId);
    else skipTask(date, t.id);
  };

  const finish = () => {
    setDayPlanState(date, (s) => ({ ...s, closed: true }));
    setPickFor(null);
    onClose();
  };

  const btn =
    'min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-600 inline-flex items-center gap-1.5 transition-colors';

  return (
    <PlanModal
      id="close-day-modal"
      open={open}
      onClose={onClose}
      icon={<MoonStar className="h-5 w-5" />}
      title="Encerrar o dia"
      subtitle="Acabou por hoje? Diga o que fazer com o que ficou sem marcar. Você decide, sem culpa."
      maxWidth="max-w-xl"
      footer={
        <button type="button" id="close-day-done" onClick={finish} className="min-h-[40px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black">
          {pending.length === 0 ? 'Encerrar o dia' : 'Pronto por hoje'}
        </button>
      }
    >
      <div className="space-y-3">
        <p id="close-day-summary" className="text-[12px] text-slate-600 dark:text-slate-300">
          {doneCount} tarefa{doneCount === 1 ? '' : 's'} feita{doneCount === 1 ? '' : 's'} hoje
          {pending.length > 0 ? ` · ${pending.length} sem marcar` : ''}.
        </p>
        {pending.length === 0 ? (
          <div className="rounded-2xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/[0.06] p-5 text-center">
            <p className="text-2xl" aria-hidden>
              🌙
            </p>
            <p className="mt-1 text-sm font-black text-slate-900 dark:text-white">Tudo decidido</p>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Nada ficou para trás. Bom descanso!</p>
          </div>
        ) : (
          <ul id="close-day-list" className="space-y-2">
            {pending.map((t) => {
              const canDone = !AUTO_KINDS.includes(t.kind);
              const picking = pickFor === t.id;
              return (
                <li key={t.id} id={`close-day-task-${domId(t.id)}`} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
                  <div className="flex items-start gap-2.5">
                    <span className="shrink-0 h-8 w-8 rounded-lg grid place-items-center text-base" style={{ backgroundColor: `${t.color}1f` }} aria-hidden>
                      {t.emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold text-slate-900 dark:text-white leading-snug line-clamp-2">{t.title}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {taskSizeLabel(t)}
                        {t.subtitle ? ` · ${t.subtitle}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    {canDone && (
                      <button type="button" id={`close-day-done-${domId(t.id)}`} onClick={() => toggleTaskDone(date, t.id)} className={btn}>
                        <Check className="h-3.5 w-3.5 text-emerald-500" /> Feito
                      </button>
                    )}
                    {t.movable && (
                      <>
                        <button type="button" id={`close-day-tomorrow-${domId(t.id)}`} onClick={() => moveTaskToTomorrow(t)} className={btn}>
                          <CornerDownRight className="h-3.5 w-3.5" /> Amanhã
                        </button>
                        <button type="button" id={`close-day-pick-${domId(t.id)}`} aria-expanded={picking} onClick={() => setPickFor(picking ? null : t.id)} className={btn}>
                          <CalendarDays className="h-3.5 w-3.5" /> Escolher dia
                        </button>
                      </>
                    )}
                    <button type="button" id={`close-day-remove-${domId(t.id)}`} onClick={() => remove(t)} className={`${btn} !text-slate-500 dark:!text-slate-400`}>
                      <X className="h-3.5 w-3.5" /> Tirar
                    </button>
                  </div>
                  {picking && (
                    <label className="mt-2 flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
                      Para qual dia?
                      <input
                        type="date"
                        id={`close-day-date-${domId(t.id)}`}
                        min={tomorrow}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v || v <= date) return;
                          moveTaskToDate(t, date, v);
                          setPickFor(null);
                        }}
                        className="min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-xs font-bold text-slate-800 dark:text-slate-100"
                      />
                    </label>
                  )}
                  {!t.movable && (
                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {canDone ? 'Tarefa da rotina: amanhã ela volta sozinha.' : 'Marca sozinha quando você registra.'}
                    </p>
                  )}
                  {t.movable && !canDone && (
                    <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {t.kind === 'review' || t.kind === 'project_review' ? 'Já fez? Registre a revisão para ela contar.' : 'Já estudou? Feche o tema em Disciplinas para ele contar.'}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {pending.length > 0 && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            O que você não decidir fica como está: revisões continuam na fila e temas voltam como sugestão. Amanhã é {formatDM(tomorrow)}.
          </p>
        )}
      </div>
    </PlanModal>
  );
};
