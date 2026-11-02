import React, { useMemo, useState } from 'react';
import { Plus, Clock, MapPin, Trash2, Edit2, CalendarDays, CalendarCheck, Timer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ScheduleClass } from '../types';
import { AddScheduleModal } from './modals/AddScheduleModal';
import {
  ACTIVITY_CATEGORIES,
  WEEK_DAYS,
  durationHours,
  formatDateBR,
  getActivityCategory,
  toYMD,
} from '../data/planning';

interface ScheduleViewProps {
  onOpenAddSchedule?: (dayNum?: number) => void;
}

type ModalState = { open: boolean; item?: ScheduleClass | null; day?: number; category?: string };

const QUICK_ADD = ['aula', 'academia', 'simposio', 'liga', 'congresso'];

export const ScheduleView: React.FC<ScheduleViewProps> = () => {
  const { schedule, subjects, deleteScheduleClass } = useApp();
  const [modal, setModal] = useState<ModalState>({ open: false });
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const todayStr = toYMD(new Date());
  const todayNum = ((new Date().getDay() + 6) % 7) + 1;

  const titleOf = (sc: ScheduleClass) => {
    if (sc.title) return sc.title;
    const sub = sc.subjectId ? subjects.find((s) => s.id === sc.subjectId) : undefined;
    return sub?.universitySubject || sub?.name || 'Atividade';
  };

  const matchesFilter = (sc: ScheduleClass) => categoryFilter === 'all' || getActivityCategory(sc).id === categoryFilter;

  const weekly = useMemo(() => schedule.filter((s) => !s.date), [schedule]);
  const events = useMemo(
    () =>
      schedule
        .filter((s) => s.date && s.date >= todayStr)
        .sort((a, b) => (a.date! + a.startTime).localeCompare(b.date! + b.startTime)),
    [schedule, todayStr]
  );

  const weeklyHours = weekly.reduce((acc, s) => acc + durationHours(s.startTime, s.endTime), 0);
  // Datas desta semana (segunda a domingo), para encaixar os eventos de data única
  const weekDates = WEEK_DAYS.map((d) => {
    const date = new Date();
    date.setDate(date.getDate() + (d.num - todayNum));
    return toYMD(date);
  });
  const perDay = WEEK_DAYS.map((d, idx) => {
    const items = schedule
      .filter((s) => (s.date ? s.date === weekDates[idx] : s.dayOfWeek === d.num) && matchesFilter(s))
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
    return { ...d, items, hours: items.reduce((acc, s) => acc + durationHours(s.startTime, s.endTime), 0) };
  });
  const busiest = [...perDay].sort((a, b) => b.hours - a.hours)[0];

  const categoryCounts = useMemo(() => {
    const map = new Map<string, number>();
    schedule.forEach((s) => {
      const id = getActivityCategory(s).id;
      map.set(id, (map.get(id) || 0) + 1);
    });
    return map;
  }, [schedule]);

  const handleDelete = (sc: ScheduleClass) => {
    if (window.confirm(`Remover "${titleOf(sc)}"?`)) deleteScheduleClass(sc.id);
  };

  const renderCard = (sc: ScheduleClass, showDate = false) => {
    const cat = getActivityCategory(sc);
    const color = sc.color || cat.color;
    const place = sc.location || sc.room;
    return (
      <div
        key={sc.id}
        onClick={() => setModal({ open: true, item: sc })}
        className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 pl-3 cursor-pointer hover:shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-all overflow-hidden"
      >
        <span className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />
        <div className="flex items-start justify-between gap-1">
          <span
            className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
            style={{ backgroundColor: `${color}1f`, color }}
          >
            {cat.emoji} {cat.label}
          </span>
          <div className="flex gap-0.5 opacity-100 xl:opacity-0 xl:group-hover:opacity-100 transition-opacity">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setModal({ open: true, item: sc });
              }}
              className="p-1 rounded-md text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Editar atividade"
            >
              <Edit2 className="h-3 w-3" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleDelete(sc);
              }}
              className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Remover atividade"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
        <h4 className="text-xs font-bold text-slate-900 dark:text-white mt-1 leading-snug break-words">{titleOf(sc)}</h4>
        <div className="mt-1 space-y-0.5 text-[10px] text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1 font-mono font-semibold">
            <Clock className="h-3 w-3 shrink-0" />
            {showDate && <span className="font-sans">{formatDateBR(sc.date)} ·</span>}
            {sc.startTime}–{sc.endTime}
          </div>
          {place && (
            <div className="flex items-center gap-1 min-w-0">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">{place}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-5 pb-12 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Grade de Horários</h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monte sua semana: aulas, academia, ligas, simpósios, congressos e o que mais fizer parte da rotina.
          </p>
        </div>
        <button
          id="schedule-add-btn"
          onClick={() => setModal({ open: true, item: null })}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
        >
          <Plus className="h-4 w-4" /> Adicionar
        </button>
      </div>

      {/* Atalhos de categoria */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {QUICK_ADD.map((id) => {
          const c = ACTIVITY_CATEGORIES.find((x) => x.id === id)!;
          return (
            <button
              key={id}
              onClick={() => setModal({ open: true, item: null, category: id })}
              className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5 text-left hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs transition-all"
            >
              <span className="w-8 h-8 shrink-0 rounded-xl flex items-center justify-center text-base" style={{ backgroundColor: `${c.color}1f` }}>
                {c.emoji}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{c.label}</span>
                <span className="block text-[10px] text-slate-500">+ adicionar</span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <Timer className="h-4 w-4 text-sky-500" /> Horas/semana
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">{weeklyHours.toFixed(1).replace('.', ',')}h</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <CalendarDays className="h-4 w-4 text-emerald-500" /> Fixas
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1">{weekly.length}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 sm:p-4 min-w-0">
          <div className="flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <CalendarCheck className="h-4 w-4 text-violet-500" /> Dia mais cheio
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white mt-1 truncate">
            {busiest && busiest.hours > 0 ? busiest.short : '—'}
          </div>
        </div>
      </div>

      {/* Filtro por categoria */}
      {schedule.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold ${
              categoryFilter === 'all'
                ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            Tudo
          </button>
          {ACTIVITY_CATEGORIES.filter((c) => categoryCounts.get(c.id)).map((c) => {
            const active = categoryFilter === c.id;
            return (
              <button
                key={c.id}
                onClick={() => setCategoryFilter(active ? 'all' : c.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border ${
                  active ? 'text-white' : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                }`}
                style={active ? { backgroundColor: c.color, borderColor: c.color } : undefined}
              >
                {c.emoji} {c.label}
                <span className="opacity-70">{categoryCounts.get(c.id)}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Semana */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-2.5">
        {perDay.map((d) => (
          <section
            key={d.num}
            className={`rounded-2xl border p-2 min-w-0 flex flex-col ${
              d.num === todayNum
                ? 'border-sky-300 dark:border-sky-700 bg-sky-50/60 dark:bg-sky-950/20'
                : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40'
            }`}
          >
            <div className="flex items-center justify-between px-1 pb-2">
              <div>
                <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  {d.short}
                  {d.num === todayNum && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-sky-600 text-white">HOJE</span>}
                </h3>
                <p className="text-[10px] text-slate-500">{d.hours > 0 ? `${d.hours.toFixed(1).replace('.', ',')}h` : 'livre'}</p>
              </div>
              <button
                onClick={() => setModal({ open: true, item: null, day: d.num })}
                className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-800"
                title={`Adicionar na ${d.name}`}
                aria-label={`Adicionar na ${d.name}`}
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-1.5 flex-1">
              {d.items.length === 0 ? (
                <button
                  onClick={() => setModal({ open: true, item: null, day: d.num })}
                  className="w-full h-full min-h-14 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-[10px] font-semibold text-slate-400 hover:text-sky-600 hover:border-sky-400"
                >
                  + adicionar
                </button>
              ) : (
                d.items.map((sc) => renderCard(sc, Boolean(sc.date)))
              )}
            </div>
          </section>
        ))}
      </div>

      {/* Eventos de data única */}
      <section className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div>
            <h2 className="text-sm font-black text-slate-900 dark:text-white">Próximos eventos</h2>
            <p className="text-[11px] text-slate-500">Simpósios, congressos e atividades com data única. Também aparecem no Planner.</p>
          </div>
          <button
            onClick={() => setModal({ open: true, item: null, category: 'congresso' })}
            className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-100/70 dark:bg-sky-950/60"
          >
            <Plus className="h-3 w-3" /> Evento
          </button>
        </div>
        {events.filter(matchesFilter).length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">Nenhum evento futuro.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">{events.filter(matchesFilter).map((sc) => renderCard(sc, true))}</div>
        )}
      </section>

      <AddScheduleModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false })}
        editingItem={modal.item}
        defaultDay={modal.day}
        defaultCategory={modal.category}
      />
    </div>
  );
};
