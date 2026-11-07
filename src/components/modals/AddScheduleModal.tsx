import React, { useEffect, useState } from 'react';
import { X, CalendarDays, Clock, Repeat, CalendarCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DatePickerField } from '../DatePickerField';
import { ScheduleClass } from '../../types';
import { ACTIVITY_CATEGORIES, CHECKLIST_COLORS, EXAM_SHIFTS, SHIFT_DEFAULT_TIMES, WEEK_DAYS, dayOfWeekFromDate, getActivityCategory, shiftFromTime } from '../../data/planning';
import { ExamShift } from '../../types';

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDay?: number; // 1-7
  /** Abre em "data única" já nesta data (usado pelo Planner) */
  defaultDate?: string;
  editingItem?: ScheduleClass | null;
  defaultCategory?: string;
}

const PLACEHOLDERS: Record<string, string> = {
  aula: 'Ex: Semiologia, Anatomia II, Farmacologia',
  academia: 'Ex: Treino de força, Corrida',
  simposio: 'Ex: Simpósio de Cardiologia',
  liga: 'Ex: Liga de Emergência — reunião',
  congresso: 'Ex: Congresso Brasileiro de Clínica Médica',
  estudo: 'Ex: Bloco de questões, Revisão de ECG',
  plantao: 'Ex: Plantão UPA, Estágio Ambulatório',
  outro: 'Ex: Monitoria, Consulta, Compromisso',
};

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500';
const labelCls = 'block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wide';

export const AddScheduleModal: React.FC<AddScheduleModalProps> = ({
  isOpen,
  onClose,
  defaultDay,
  defaultDate,
  editingItem,
  defaultCategory,
}) => {
  const { addScheduleClass, updateScheduleClass, showNotification } = useApp();

  const [category, setCategory] = useState<string>('aula');
  const [title, setTitle] = useState('');
  const [repeatMode, setRepeatMode] = useState<'weekly' | 'once'>('weekly');
  const [days, setDays] = useState<number[]>([1]);
  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [location, setLocation] = useState('');
  const [shift, setShift] = useState<ExamShift | undefined>('manha');
  const [color, setColor] = useState<string>(ACTIVITY_CATEGORIES[0].color);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const it = editingItem;
    const cat = it
      ? getActivityCategory(it)
      : ACTIVITY_CATEGORIES.find((c) => c.id === defaultCategory) || ACTIVITY_CATEGORIES[0];
    setCategory(cat.id);
    setTitle(it?.title || '');
    // Simpósio e congresso costumam ser eventos de data única
    const onceByDefault = Boolean(defaultDate) || cat.id === 'simposio' || cat.id === 'congresso';
    setRepeatMode(it ? (it.date ? 'once' : 'weekly') : onceByDefault ? 'once' : 'weekly');
    setDays([it?.dayOfWeek || defaultDay || 1]);
    setDate(it?.date || defaultDate || '');
    setStartTime(it?.startTime || '08:00');
    setEndTime(it?.endTime || '10:00');
    setLocation(it?.location || it?.room || '');
    setShift(it?.shift || shiftFromTime(it?.startTime || '08:00'));
    setColor(it?.color || cat.color);
    setNotes(it?.notes || '');
  }, [isOpen, editingItem, defaultDay, defaultDate, defaultCategory]);

  if (!isOpen) return null;

  const selectCategory = (id: string) => {
    const prev = ACTIVITY_CATEGORIES.find((c) => c.id === category);
    const next = ACTIVITY_CATEGORIES.find((c) => c.id === id)!;
    // Acompanha a cor da categoria, a não ser que o usuário tenha escolhido outra
    if (!prev || color === prev.color) setColor(next.color);
    setCategory(id);
  };

  const toggleDay = (num: number) => {
    if (editingItem) {
      setDays([num]);
      return;
    }
    setDays((prev) => (prev.includes(num) ? (prev.length > 1 ? prev.filter((d) => d !== num) : prev) : [...prev, num].sort()));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    if (endTime <= startTime) {
      showNotification('O horário de término precisa ser depois do início.', 'warning');
      return;
    }
    if (repeatMode === 'once' && !date) {
      showNotification('Escolha a data do evento.', 'warning');
      return;
    }
    const cat = ACTIVITY_CATEGORIES.find((c) => c.id === category)!;
    const base = {
      title: title.trim(),
      startTime,
      shift: shift || shiftFromTime(startTime),
      endTime,
      location: location.trim() || undefined,
      room: '',
      type: cat.label,
      category: cat.id,
      color,
      notes: notes.trim() || undefined,
    };

    if (editingItem) {
      updateScheduleClass(editingItem.id, {
        ...base,
        subjectId: undefined,
        date: repeatMode === 'once' ? date : undefined,
        dayOfWeek: (repeatMode === 'once' ? dayOfWeekFromDate(date) : days[0]) as ScheduleClass['dayOfWeek'],
      });
    } else if (repeatMode === 'once') {
      addScheduleClass({ ...base, date, dayOfWeek: dayOfWeekFromDate(date) });
    } else {
      days.forEach((d) => addScheduleClass({ ...base, dayOfWeek: d as ScheduleClass['dayOfWeek'] }));
    }
    onClose();
  };

  return (
    <div className="app-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="app-modal-panel relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingItem ? 'Editar atividade' : 'Nova aula ou atividade'}
              </h2>
              <p className="text-xs text-slate-500">Entra na Grade de Horários e no Planner</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <span className={labelCls}>Tipo</span>
            <div className="grid grid-cols-4 gap-1.5">
              {ACTIVITY_CATEGORIES.map((c) => {
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCategory(c.id)}
                    className={`flex flex-col items-center gap-0.5 px-1 py-2 rounded-xl border text-[10px] font-bold leading-tight transition-all ${
                      active ? 'text-white shadow-sm' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                    style={active ? { backgroundColor: c.color, borderColor: c.color } : undefined}
                  >
                    <span className="text-base leading-none">{c.emoji}</span>
                    <span className="text-center">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="activity-title">
              {category === 'aula' ? 'Nome da aula' : 'Nome da atividade'}
            </label>
            <input
              id="activity-title"
              type="text"
              placeholder={PLACEHOLDERS[category]}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              required
              autoFocus={!editingItem}
            />
          </div>

          <div>
            <span className={labelCls}>Quando</span>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => setRepeatMode('weekly')}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-bold ${
                  repeatMode === 'weekly' ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <Repeat className="h-3.5 w-3.5" /> Toda semana
              </button>
              <button
                type="button"
                onClick={() => setRepeatMode('once')}
                className={`flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl border text-xs font-bold ${
                  repeatMode === 'once' ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                <CalendarCheck className="h-3.5 w-3.5" /> Data única
              </button>
            </div>
            {repeatMode === 'weekly' ? (
              <div className="grid grid-cols-7 gap-1">
                {WEEK_DAYS.map((d) => (
                  <button
                    key={d.num}
                    type="button"
                    onClick={() => toggleDay(d.num)}
                    title={d.name}
                    className={`py-2 rounded-lg text-[11px] font-bold border transition-colors ${
                      days.includes(d.num)
                        ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent'
                        : 'border-slate-200 dark:border-slate-800 text-slate-500'
                    }`}
                  >
                    {d.short}
                  </button>
                ))}
              </div>
            ) : (
              <DatePickerField id="activity-date" value={date} onChange={setDate} className={inputCls} placeholder="Escolher a data do evento" />
            )}
            {repeatMode === 'weekly' && !editingItem && (
              <p className="text-[10px] text-slate-500 mt-1">Selecione um ou mais dias.</p>
            )}
          </div>

          <div>
            <span className={labelCls}>Turno</span>
            <div id="activity-shift" className="grid grid-cols-3 gap-1.5">
              {EXAM_SHIFTS.map((sh) => (
                <button
                  key={sh.id}
                  type="button"
                  onClick={() => {
                    setShift(sh.id);
                    // ao trocar de turno, sugere o horário padrão dele (dá para ajustar abaixo)
                    if (shiftFromTime(startTime) !== sh.id) {
                      setStartTime(SHIFT_DEFAULT_TIMES[sh.id].start);
                      setEndTime(SHIFT_DEFAULT_TIMES[sh.id].end);
                    }
                  }}
                  className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all ${
                    shift === sh.id
                      ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {sh.emoji} {sh.label}
                  <span className={`block text-[9px] font-semibold ${shift === sh.id ? 'text-sky-100' : 'text-slate-400'}`}>{sh.range}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="activity-start">
                <Clock className="inline h-3 w-3 mr-1 -mt-0.5" />Começa
              </label>
              <input
                id="activity-start"
                type="time"
                value={startTime}
                onChange={(e) => {
                  setStartTime(e.target.value);
                  const auto = shiftFromTime(e.target.value);
                  if (auto) setShift(auto);
                }}
                className={inputCls}
                required
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="activity-end">
                <Clock className="inline h-3 w-3 mr-1 -mt-0.5" />Termina
              </label>
              <input id="activity-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} required />
            </div>
          </div>

          <div>
            <span className={labelCls}>Cor</span>
            <div className="flex items-center gap-2 flex-wrap">
              {Array.from(new Set([ACTIVITY_CATEGORIES.find((c) => c.id === category)!.color, ...CHECKLIST_COLORS])).map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => setColor(hex)}
                  className={`w-7 h-7 rounded-full transition-transform ${color === hex ? 'ring-2 ring-offset-2 ring-sky-500 dark:ring-offset-slate-900 scale-110' : 'hover:scale-110'}`}
                  style={{ backgroundColor: hex }}
                  aria-label={`Cor ${hex}`}
                />
              ))}
            </div>
          </div>

          <div className="app-modal-footer pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs">
              {editingItem ? 'Salvar alterações' : repeatMode === 'weekly' && days.length > 1 ? `Adicionar em ${days.length} dias` : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
