import React, { useMemo, useState } from 'react';
import { X, Clock, MapPin, User, Edit2, Trash2, Shuffle, Replace } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ScheduleClass } from '../../types';
import { formatDateBR, getActivityCategory } from '../../data/planning';
import { parseYMD } from '../../data/blockReview';
import { activityKind, everyWeekdayLabel } from './semesterUtils';

interface ActivitySheetProps {
  item: ScheduleClass;
  /** Data que o aluno está vendo (para "só deste dia") */
  date: string;
  title: string;
  onClose: () => void;
  onEdit: () => void;
}

const WD = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];

const optionCls =
  'w-full min-h-10 px-3 rounded-xl text-left text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2';

// Detalhes de uma atividade num dia, com editar e as opções discretas de excluir/substituir
export const ActivitySheet: React.FC<ActivitySheetProps> = ({ item, date, title, onClose, onEdit }) => {
  const { schedule, deleteScheduleClass, excludeScheduleOnDate, replaceScheduleOnDate, deleteRotation } = useApp();
  const [step, setStep] = useState<'view' | 'delete' | 'replace'>('view');
  const [confirmRotation, setConfirmRotation] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [start, setStart] = useState(item.startTime);
  const [end, setEnd] = useState(item.endTime);
  const cat = getActivityCategory(item);
  const color = item.color || cat.color;
  const kind = activityKind(item);
  const d = parseYMD(date);
  const dayLabel = `${WD[d.getDay()]}, ${formatDateBR(date).slice(0, 5)}`;

  // Sugestões para substituir: outras atividades já cadastradas
  const suggestions = useMemo(
    () => Array.from(new Set(schedule.map((s) => (s.title || '').trim()).filter((t) => t && t !== item.title))).slice(0, 30),
    [schedule, item.title]
  );

  const done = (fn: () => void) => {
    fn();
    onClose();
  };

  const replace = () => {
    const t = newTitle.trim();
    if (!t || end <= start) return;
    const like = schedule.find((s) => (s.title || '').trim() === t);
    const { id: _id, exceptions: _e, rotationId: _r, rotationName: _rn, startDate: _s, endDate: _ed, ...rest } = like || item;
    replaceScheduleOnDate(item.id, date, {
      ...rest,
      title: t,
      startTime: start,
      endTime: end,
      location: like ? like.location : undefined,
      teacher: like ? like.teacher : undefined,
      date,
    });
    onClose();
  };

  return (
    <div className="app-modal fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs" onClick={onClose}>
      <div
        id="sem-activity-sheet"
        onClick={(e) => e.stopPropagation()}
        className="app-modal-panel w-full max-w-sm rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-2xl space-y-3"
      >
        <div className="flex items-start gap-2">
          <span className="mt-1 h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {cat.emoji} {cat.label} · {dayLabel}
            </p>
            <h3 className="text-sm font-black text-slate-900 dark:text-white break-words">{title}</h3>
          </div>
          <button onClick={onClose} className="h-10 w-10 -mr-2 -mt-2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-1 text-[11px] text-slate-600 dark:text-slate-300">
          <p className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-slate-400" /> {item.startTime}–{item.endTime}
            {kind === 'weekly' && <span className="text-slate-400">· {everyWeekdayLabel(item.dayOfWeek)}</span>}
            {kind === 'period' && <span className="text-slate-400">· {formatDateBR(item.date).slice(0, 5)} a {formatDateBR(item.endDate).slice(0, 5)}</span>}
          </p>
          {(item.location || item.room) && (
            <p className="flex items-center gap-1.5 min-w-0">
              <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" /> <span className="truncate">{item.location || item.room}</span>
            </p>
          )}
          {item.teacher && (
            <p className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" /> {item.teacher}
            </p>
          )}
          {item.rotationId && (
            <p className="flex items-center gap-1.5">
              <Shuffle className="h-3.5 w-3.5 text-slate-400" /> Rodízio{item.rotationName ? ` ${item.rotationName}` : ''}
              {item.startDate && item.endDate && ` · ${formatDateBR(item.startDate).slice(0, 5)} a ${formatDateBR(item.endDate).slice(0, 5)}`}
            </p>
          )}
        </div>

        {step === 'view' && (
          <div className="flex gap-2">
            <button
              id="sem-activity-edit"
              onClick={onEdit}
              className="flex-1 min-h-10 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-center gap-1.5"
            >
              <Edit2 className="h-3.5 w-3.5" /> Editar
            </button>
            <button
              id="sem-activity-delete"
              onClick={() => setStep('delete')}
              className="flex-1 min-h-10 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center justify-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" /> Excluir
            </button>
          </div>
        )}

        {step === 'delete' && (
          <div className="space-y-1.5">
            {kind === 'weekly' ? (
              <>
                <button id="sem-delete-day" className={optionCls} onClick={() => done(() => excludeScheduleOnDate(item.id, date))}>
                  Excluir só deste dia <span className="ml-auto text-[10px] font-semibold text-slate-400">{formatDateBR(date).slice(0, 5)}</span>
                </button>
                <button id="sem-delete-weekday" className={optionCls} onClick={() => done(() => deleteScheduleClass(item.id))}>
                  Excluir de {everyWeekdayLabel(item.dayOfWeek)}
                </button>
                <button id="sem-replace-day" className={optionCls} onClick={() => setStep('replace')}>
                  <Replace className="h-3.5 w-3.5 text-slate-400" /> Substituir neste dia
                </button>
                {item.rotationId &&
                  (confirmRotation ? (
                    <div className="flex items-center gap-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 p-2">
                      <span className="flex-1 text-[11px] font-semibold text-rose-700 dark:text-rose-300">Apagar todas as aulas do rodízio?</span>
                      <button
                        id="sem-delete-rotation-confirm"
                        className="min-h-10 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold"
                        onClick={() => done(() => deleteRotation(item.rotationId!))}
                      >
                        Apagar
                      </button>
                    </div>
                  ) : (
                    <button id="sem-delete-rotation" className={`${optionCls} text-rose-600 dark:text-rose-400`} onClick={() => setConfirmRotation(true)}>
                      Excluir o rodízio todo
                    </button>
                  ))}
              </>
            ) : (
              <button id="sem-delete-event" className={`${optionCls} text-rose-600 dark:text-rose-400`} onClick={() => done(() => deleteScheduleClass(item.id))}>
                <Trash2 className="h-3.5 w-3.5" /> Excluir {kind === 'period' ? 'todos os dias' : ''}
              </button>
            )}
            <button onClick={() => setStep('view')} className="w-full min-h-10 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
              Voltar
            </button>
          </div>
        )}

        {step === 'replace' && (
          <div className="space-y-2">
            <p className="text-[11px] text-slate-500">Só em {dayLabel}. Nas outras semanas continua igual.</p>
            <input
              id="sem-replace-title"
              type="text"
              list="sem-replace-suggestions"
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="O que vai ter no lugar?"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            />
            <datalist id="sem-replace-suggestions">
              {suggestions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                aria-label="Começa"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200"
              />
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                aria-label="Termina"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs text-slate-800 dark:text-slate-200"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep('delete')} className="flex-1 min-h-10 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                Voltar
              </button>
              <button
                id="sem-replace-save"
                disabled={!newTitle.trim() || end <= start}
                onClick={replace}
                className="flex-1 min-h-10 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-bold"
              >
                Substituir
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
