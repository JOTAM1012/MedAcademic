import React, { useEffect, useState } from 'react';
import { X, CalendarDays, Repeat, CalendarCheck, CalendarRange, Shuffle, Plus, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DatePickerField } from '../DatePickerField';
import { ExamShift, ScheduleClass } from '../../types';
import {
  ACTIVITY_CATEGORIES,
  CHECKLIST_COLORS,
  EXAM_SHIFTS,
  SHIFT_DEFAULT_TIMES,
  WEEK_DAYS,
  dayOfWeekFromDate,
  getActivityCategory,
  shiftFromTime,
} from '../../data/planning';
import { addDaysYMD } from '../../data/blockReview';

type Mode = 'weekly' | 'once' | 'period' | 'rotation';

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDay?: number; // 1-7
  /** Abre em "data única" já nesta data (usado pelo Planner e pelo Semestre) */
  defaultDate?: string;
  editingItem?: ScheduleClass | null;
  defaultCategory?: string;
  defaultMode?: Mode;
}

const PLACEHOLDERS: Record<string, string> = {
  aula: 'Ex: Semiologia, Anatomia II, Farmacologia',
  academia: 'Ex: Treino de força, Corrida',
  simposio: 'Ex: Simpósio de Cardiologia',
  liga: 'Ex: Liga de Emergência, reunião',
  congresso: 'Ex: Congresso Brasileiro de Clínica Médica',
  estudo: 'Ex: Bloco de questões, Revisão de ECG',
  plantao: 'Ex: Plantão UPA, Estágio Ambulatório',
  outro: 'Ex: Monitoria, Consulta, Compromisso',
};

const MODES: Array<{ id: Mode; label: string; icon: React.ElementType }> = [
  { id: 'weekly', label: 'Toda semana', icon: Repeat },
  { id: 'once', label: 'Data única', icon: CalendarCheck },
  { id: 'period', label: 'Vários dias', icon: CalendarRange },
  { id: 'rotation', label: 'Rodízio', icon: Shuffle },
];

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500';
const labelCls = 'block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wide';
const ghostBtn =
  'min-h-10 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-sky-600 hover:border-sky-400 flex items-center gap-1';

interface RotationRow {
  key: string;
  place: string;
  days: number[];
  shift: ExamShift;
  start: string;
  end: string;
  teacher: string;
}

const newRow = (shift: ExamShift = 'manha'): RotationRow => ({
  key: Math.random().toString(36).slice(2, 8),
  place: '',
  days: [],
  shift,
  start: SHIFT_DEFAULT_TIMES[shift].start,
  end: SHIFT_DEFAULT_TIMES[shift].end,
  teacher: '',
});

/** Turno + começa/termina (reaproveitado no formulário e em cada linha do rodízio) */
const ShiftTimes: React.FC<{
  idPrefix: string;
  shift?: ExamShift;
  start: string;
  end: string;
  onChange: (v: { shift?: ExamShift; start: string; end: string }) => void;
  small?: boolean;
}> = ({ idPrefix, shift, start, end, onChange, small }) => (
  <div className="space-y-2">
    <div id={`${idPrefix}-shift`} className="grid grid-cols-3 gap-1.5">
      {EXAM_SHIFTS.map((sh) => (
        <button
          key={sh.id}
          type="button"
          onClick={() => onChange({ shift: sh.id, start: SHIFT_DEFAULT_TIMES[sh.id].start, end: SHIFT_DEFAULT_TIMES[sh.id].end })}
          className={`min-h-10 px-1 py-1.5 rounded-xl border text-xs font-bold transition-all ${
            shift === sh.id ? 'bg-sky-600 border-sky-600 text-white shadow-sm' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
          }`}
        >
          {sh.emoji} {sh.label}
          {!small && <span className={`block text-[9px] font-semibold ${shift === sh.id ? 'text-sky-100' : 'text-slate-400'}`}>{sh.range}</span>}
        </button>
      ))}
    </div>
    <div className="grid grid-cols-2 gap-2">
      <label className="block">
        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Começa</span>
        <input
          id={`${idPrefix}-start`}
          type="time"
          value={start}
          onChange={(e) => onChange({ shift: shiftFromTime(e.target.value) || shift, start: e.target.value, end })}
          className={inputCls}
          required
        />
      </label>
      <label className="block">
        <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Termina</span>
        <input id={`${idPrefix}-end`} type="time" value={end} onChange={(e) => onChange({ shift, start, end: e.target.value })} className={inputCls} required />
      </label>
    </div>
  </div>
);

const DayPicker: React.FC<{ days: number[]; onToggle: (n: number) => void; idPrefix: string }> = ({ days, onToggle, idPrefix }) => (
  <div className="grid grid-cols-7 gap-1">
    {WEEK_DAYS.map((d) => (
      <button
        key={d.num}
        id={`${idPrefix}-day-${d.num}`}
        type="button"
        onClick={() => onToggle(d.num)}
        title={d.name}
        aria-pressed={days.includes(d.num)}
        className={`min-h-10 rounded-lg text-[11px] font-bold border transition-colors ${
          days.includes(d.num) ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-transparent' : 'border-slate-200 dark:border-slate-800 text-slate-500'
        }`}
      >
        {d.short}
      </button>
    ))}
  </div>
);

export const AddScheduleModal: React.FC<AddScheduleModalProps> = ({
  isOpen,
  onClose,
  defaultDay,
  defaultDate,
  editingItem,
  defaultCategory,
  defaultMode,
}) => {
  const { addScheduleClass, addScheduleClasses, updateScheduleClass, showNotification } = useApp();

  const [category, setCategory] = useState<string>('aula');
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<Mode>('weekly');
  const [days, setDays] = useState<number[]>([1]);
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [validFrom, setValidFrom] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [showValidity, setShowValidity] = useState(false);
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('12:00');
  const [shift, setShift] = useState<ExamShift | undefined>('manha');
  const [location, setLocation] = useState('');
  const [showLocation, setShowLocation] = useState(false);
  const [teacher, setTeacher] = useState('');
  const [showTeacher, setShowTeacher] = useState(false);
  const [color, setColor] = useState<string>(ACTIVITY_CATEGORIES[0].color);
  const [showColor, setShowColor] = useState(false);
  const [rows, setRows] = useState<RotationRow[]>([newRow()]);

  useEffect(() => {
    if (!isOpen) return;
    const it = editingItem;
    const cat = it ? getActivityCategory(it) : ACTIVITY_CATEGORIES.find((c) => c.id === defaultCategory) || ACTIVITY_CATEGORIES[0];
    setCategory(cat.id);
    setTitle(it?.title || '');
    const itMode: Mode | undefined = it ? (it.date ? (it.endDate && it.endDate > it.date ? 'period' : 'once') : 'weekly') : undefined;
    // Simpósio e congresso costumam durar alguns dias
    const autoMode: Mode = defaultMode || (defaultDate ? 'once' : cat.id === 'simposio' || cat.id === 'congresso' ? 'period' : 'weekly');
    setMode(itMode || autoMode);
    setDays([it?.dayOfWeek || defaultDay || (defaultDate ? dayOfWeekFromDate(defaultDate) : 1)]);
    setDate(it?.date || defaultDate || '');
    setEndDate(it?.date ? it.endDate || '' : '');
    setValidFrom(!it?.date ? it?.startDate || '' : '');
    setValidUntil(!it?.date ? it?.endDate || '' : '');
    setShowValidity(!!it && !it.date && !!(it.startDate || it.endDate));
    const st = it?.startTime || '08:00';
    setStartTime(st);
    setEndTime(it?.endTime || '12:00');
    setShift(it?.shift || shiftFromTime(st));
    setLocation(it?.location || it?.room || '');
    setShowLocation(!!(it?.location || it?.room));
    setTeacher(it?.teacher || '');
    setShowTeacher(!!it?.teacher);
    setColor(it?.color || cat.color);
    setShowColor(!!it?.color && it.color !== cat.color);
    setRows([newRow()]);
  }, [isOpen, editingItem, defaultDay, defaultDate, defaultCategory, defaultMode]);

  if (!isOpen) return null;

  const cat = ACTIVITY_CATEGORIES.find((c) => c.id === category) || ACTIVITY_CATEGORIES[0];

  const selectCategory = (id: string) => {
    const next = ACTIVITY_CATEGORIES.find((c) => c.id === id)!;
    // Acompanha a cor da categoria, a não ser que o aluno tenha escolhido outra
    if (color === cat.color) setColor(next.color);
    setCategory(id);
  };

  const toggleDay = (num: number) => {
    if (editingItem) {
      setDays([num]);
      return;
    }
    setDays((prev) => (prev.includes(num) ? (prev.length > 1 ? prev.filter((d) => d !== num) : prev) : [...prev, num].sort()));
  };

  const updateRow = (key: string, patch: Partial<RotationRow>) => setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const base = () => ({
    title: title.trim(),
    startTime,
    endTime,
    shift: shift || shiftFromTime(startTime),
    location: location.trim() || undefined,
    teacher: teacher.trim() || undefined,
    room: '',
    type: cat.label,
    category: cat.id,
    color,
  });

  const saveRotation = () => {
    if (!date || !endDate) {
      showNotification('Escolha quando o rodízio começa e termina.', 'warning');
      return false;
    }
    if (endDate < date) {
      showNotification('O fim do rodízio precisa ser depois do começo.', 'warning');
      return false;
    }
    const valid = rows.filter((r) => r.days.length > 0);
    if (!valid.length) {
      showNotification('Marque pelo menos um dia em uma linha do rodízio.', 'warning');
      return false;
    }
    if (valid.some((r) => r.end <= r.start)) {
      showNotification('Confira os horários: o término vem depois do começo.', 'warning');
      return false;
    }
    const list: Omit<ScheduleClass, 'id'>[] = [];
    valid.forEach((r) =>
      r.days.forEach((d) =>
        list.push({
          title: r.place.trim() || title.trim() || cat.label,
          dayOfWeek: d as ScheduleClass['dayOfWeek'],
          startTime: r.start,
          endTime: r.end,
          shift: r.shift,
          location: r.place.trim() || undefined,
          teacher: r.teacher.trim() || undefined,
          room: '',
          type: cat.label,
          category: cat.id,
          color,
          startDate: date,
          endDate,
        })
      )
    );
    addScheduleClasses(list, { name: title.trim() || undefined });
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'rotation') {
      if (saveRotation()) onClose();
      return;
    }
    if (!title.trim()) {
      showNotification('Dê um nome para a atividade.', 'warning');
      return;
    }
    if (endTime <= startTime) {
      showNotification('O horário de término precisa ser depois do início.', 'warning');
      return;
    }
    if ((mode === 'once' || mode === 'period') && !date) {
      showNotification('Escolha a data.', 'warning');
      return;
    }
    if (mode === 'period' && (!endDate || endDate <= date)) {
      showNotification('Escolha o último dia (depois do primeiro).', 'warning');
      return;
    }
    if (mode === 'weekly' && validFrom && validUntil && validUntil < validFrom) {
      showNotification('O fim precisa ser depois do começo.', 'warning');
      return;
    }
    const b = base();
    const dated = mode === 'once' || mode === 'period';
    const when = {
      date: dated ? date : undefined,
      endDate: mode === 'period' ? endDate : mode === 'weekly' ? validUntil || undefined : undefined,
      startDate: mode === 'weekly' ? validFrom || undefined : undefined,
    };

    if (editingItem) {
      updateScheduleClass(editingItem.id, {
        ...b,
        ...when,
        subjectId: undefined,
        dayOfWeek: (dated ? dayOfWeekFromDate(date) : days[0]) as ScheduleClass['dayOfWeek'],
      });
    } else if (dated) {
      addScheduleClass({ ...b, ...when, dayOfWeek: dayOfWeekFromDate(date) });
    } else {
      days.forEach((d) => addScheduleClass({ ...b, ...when, dayOfWeek: d as ScheduleClass['dayOfWeek'] }));
    }
    onClose();
  };

  const rotationCount = rows.reduce((a, r) => a + r.days.length, 0);
  const submitLabel = editingItem
    ? 'Salvar'
    : mode === 'rotation'
    ? rotationCount > 0
      ? `Salvar rodízio (${rotationCount})`
      : 'Salvar rodízio'
    : mode === 'weekly' && days.length > 1
    ? `Adicionar em ${days.length} dias`
    : 'Adicionar';

  return (
    <div className="app-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="app-modal-panel relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{editingItem ? 'Editar atividade' : 'Nova aula ou atividade'}</h2>
              <p className="text-xs text-slate-500">Entra no Semestre e no Planner</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* 1. Tipo */}
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
                    className={`min-h-12 flex flex-col items-center justify-center gap-0.5 px-1 py-1.5 rounded-xl border text-[10px] font-bold leading-tight transition-all ${
                      active ? 'text-white shadow-sm' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                    style={active ? { backgroundColor: c.color, borderColor: c.color } : undefined}
                  >
                    <span className="text-base leading-none">{c.emoji}</span>
                    <span className="text-center line-clamp-2">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Quando */}
          <div>
            <span className={labelCls}>Quando</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {MODES.filter((m) => !editingItem || m.id !== 'rotation').map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    id={`activity-mode-${m.id}`}
                    type="button"
                    onClick={() => setMode(m.id)}
                    className={`min-h-10 flex items-center justify-center gap-1.5 px-2 rounded-xl border text-xs font-bold ${
                      mode === m.id ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {m.label}
                  </button>
                );
              })}
            </div>
            {editingItem?.rotationId && (
              <p className="text-[11px] text-slate-500 mt-1.5">Faz parte do rodízio{editingItem.rotationName ? ` “${editingItem.rotationName}”` : ''}. A mudança vale só para esta linha.</p>
            )}
          </div>

          {/* 3. Nome */}
          <div>
            <label className={labelCls} htmlFor="activity-title">
              {mode === 'rotation' ? 'Nome do rodízio (opcional)' : category === 'aula' ? 'Nome da aula' : 'Nome da atividade'}
            </label>
            <input
              id="activity-title"
              type="text"
              placeholder={mode === 'rotation' ? 'Ex: Rodízio de Clínica Médica' : PLACEHOLDERS[category]}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              autoFocus={!editingItem}
            />
          </div>

          {/* Detalhes do "quando" */}
          {mode === 'weekly' && (
            <div className="space-y-2">
              <DayPicker days={days} onToggle={toggleDay} idPrefix="activity" />
              {!editingItem && <p className="text-[10px] text-slate-500">Marque um ou mais dias.</p>}
              {showValidity ? (
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Vale a partir de</span>
                    <DatePickerField id="activity-valid-from" value={validFrom} onChange={setValidFrom} className={inputCls} placeholder="Sempre" />
                  </label>
                  <label className="block">
                    <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">Até</span>
                    <DatePickerField id="activity-valid-until" value={validUntil} onChange={setValidUntil} className={inputCls} placeholder="Sem fim" />
                  </label>
                </div>
              ) : (
                <button type="button" onClick={() => setShowValidity(true)} className={ghostBtn}>
                  <Plus className="h-3 w-3" /> Começo e fim
                </button>
              )}
            </div>
          )}

          {mode === 'once' && <DatePickerField id="activity-date" value={date} onChange={setDate} className={inputCls} placeholder="Escolher a data" />}

          {(mode === 'period' || mode === 'rotation') && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">{mode === 'rotation' ? 'Começa em' : 'Primeiro dia'}</span>
                <DatePickerField id="activity-date" value={date} onChange={setDate} className={inputCls} placeholder="Escolher" />
              </label>
              <label className="block">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-0.5">{mode === 'rotation' ? 'Termina em' : 'Último dia'}</span>
                <DatePickerField id="activity-end-date" value={endDate} onChange={setEndDate} className={inputCls} placeholder="Escolher" />
              </label>
              {mode === 'rotation' && date && !endDate && (
                <div className="col-span-2 flex flex-wrap gap-1.5">
                  {[4, 8, 12].map((w) => (
                    <button key={w} type="button" onClick={() => setEndDate(addDaysYMD(w * 7 - 1, date))} className={ghostBtn}>
                      {w} semanas
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Rodízio: várias linhas de uma vez */}
          {mode === 'rotation' ? (
            <div id="activity-rotation" className="space-y-2">
              <p className="text-[11px] text-slate-500">Monte a semana do rodízio. Cada linha é um lugar com seus dias e horário.</p>
              {rows.map((r, i) => (
                <div key={r.key} id={`activity-rotation-row-${i}`} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={r.place}
                      onChange={(e) => updateRow(r.key, { place: e.target.value })}
                      placeholder="Local. Ex: Hospital X, Ambulatório"
                      aria-label={`Local da linha ${i + 1}`}
                      className={inputCls}
                    />
                    {rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setRows((prev) => prev.filter((x) => x.key !== r.key))}
                        className="shrink-0 h-10 w-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label={`Tirar linha ${i + 1}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  <DayPicker
                    days={r.days}
                    idPrefix={`activity-rotation-${i}`}
                    onToggle={(n) => updateRow(r.key, { days: r.days.includes(n) ? r.days.filter((d) => d !== n) : [...r.days, n].sort() })}
                  />
                  <ShiftTimes
                    idPrefix={`activity-rotation-${i}`}
                    small
                    shift={r.shift}
                    start={r.start}
                    end={r.end}
                    onChange={(v) => updateRow(r.key, { shift: v.shift || r.shift, start: v.start, end: v.end })}
                  />
                  <input
                    type="text"
                    value={r.teacher}
                    onChange={(e) => updateRow(r.key, { teacher: e.target.value })}
                    placeholder="Professor(a) (opcional)"
                    aria-label={`Professor da linha ${i + 1}`}
                    className={inputCls}
                  />
                </div>
              ))}
              <button
                type="button"
                id="activity-rotation-add-row"
                onClick={() => setRows((prev) => [...prev, newRow(prev[prev.length - 1]?.shift === 'manha' ? 'tarde' : 'manha')])}
                className={`${ghostBtn} w-full justify-center`}
              >
                <Plus className="h-3.5 w-3.5" /> Outra linha (mesmo lugar em outro turno, ou outro lugar)
              </button>
              <p className="text-[10px] text-slate-500">Precisa de algo fora do rodízio? Salve e adicione avulso em “Toda semana” ou “Data única”.</p>
            </div>
          ) : (
            <>
              <div>
                <span className={labelCls}>Turno e horário</span>
                <ShiftTimes
                  idPrefix="activity"
                  shift={shift}
                  start={startTime}
                  end={endTime}
                  onChange={(v) => {
                    setShift(v.shift);
                    setStartTime(v.start);
                    setEndTime(v.end);
                  }}
                />
              </div>

              {(showLocation || showTeacher) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {showLocation && (
                    <label className="block">
                      <span className={labelCls}>Local</span>
                      <input id="activity-location" type="text" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Ex: Bloco C, Hospital X" className={inputCls} />
                    </label>
                  )}
                  {showTeacher && (
                    <label className="block">
                      <span className={labelCls}>Professor(a)</span>
                      <input id="activity-teacher" type="text" value={teacher} onChange={(e) => setTeacher(e.target.value)} placeholder="Ex: Dra. Ana" className={inputCls} />
                    </label>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex flex-wrap gap-1.5">
            {mode !== 'rotation' && !showLocation && (
              <button type="button" id="activity-add-location" onClick={() => setShowLocation(true)} className={ghostBtn}>
                <Plus className="h-3 w-3" /> Local
              </button>
            )}
            {mode !== 'rotation' && !showTeacher && (
              <button type="button" id="activity-add-teacher" onClick={() => setShowTeacher(true)} className={ghostBtn}>
                <Plus className="h-3 w-3" /> Professor
              </button>
            )}
            {!showColor && (
              <button type="button" onClick={() => setShowColor(true)} className={ghostBtn}>
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} /> Cor
              </button>
            )}
          </div>

          {showColor && (
            <div>
              <span className={labelCls}>Cor</span>
              <div className="flex items-center gap-1 flex-wrap">
                {Array.from(new Set([cat.color, ...CHECKLIST_COLORS])).map((hex) => (
                  <button key={hex} type="button" onClick={() => setColor(hex)} className="h-10 w-10 flex items-center justify-center" aria-label={`Cor ${hex}`}>
                    <span
                      className={`w-7 h-7 rounded-full transition-transform ${color === hex ? 'ring-2 ring-offset-2 ring-sky-500 dark:ring-offset-slate-900 scale-110' : ''}`}
                      style={{ backgroundColor: hex }}
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="app-modal-footer pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="min-h-10 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button type="submit" className="min-h-10 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs">
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

