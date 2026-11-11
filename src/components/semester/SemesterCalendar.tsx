import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Clock, Coffee, GraduationCap, MapPin, Plus, User as UserIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Exam, ScheduleClass } from '../../types';
import { WEEK_DAYS, durationHours, getActivityCategory, getExamKind, occursOn } from '../../data/planning';
import { addDaysYMD, parseYMD, ymd } from '../../data/blockReview';
import { MONTHS, MONTHS_SHORT, examEndTime, examMainTitle, examTimeRange } from './semesterUtils';

/** "HH:MM" → minutos do dia */
const toMin = (t?: string) => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};
const hhmm = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Grade de horas da semana (telas grandes)
const HOUR_PX = 44; // altura de 1 hora
const MIN_CARD_PX = 30; // altura mínima do cartão: o título continua legível
const PX_PER_MIN = HOUR_PX / 60;
const MIN_VISUAL_MIN = Math.ceil(MIN_CARD_PX / PX_PER_MIN); // minutos que o cartão mínimo ocupa na tela

interface TimedItem {
  key: string;
  start: number;
  end: number;
  entry: DayEntry;
}
interface PlacedItem extends TimedItem {
  col: number;
  cols: number;
}

/** Linha "agora" da lista do dia (celular e tablet) */
const NowMarker: React.FC<{ time: string }> = ({ time }) => (
  <div className="flex items-center gap-1.5 py-0.5" role="img" aria-label={`Agora, ${time}`}>
    <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
    <span className="h-0.5 flex-1 rounded-full bg-rose-500" />
    <span className="shrink-0 text-[10px] font-black tabular-nums text-rose-600 dark:text-rose-400">Agora · {time}</span>
  </div>
);

const LG_QUERY = '(min-width: 1024px)';
/** Tela grande (lg+): mostra a grade de horas em vez da lista. Só um dos dois fica na página (ids únicos). */
const useIsLg = () => {
  const [isLg, setIsLg] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(LG_QUERY).matches);
  useEffect(() => {
    const mq = window.matchMedia?.(LG_QUERY);
    if (!mq) return;
    const on = () => setIsLg(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return isLg;
};

/** Itens com horário: agrupa os que se cruzam (pela altura na tela) e divide a largura lado a lado */
const layoutDay = (items: TimedItem[]): PlacedItem[] => {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const out: PlacedItem[] = [];
  let cluster: PlacedItem[] = [];
  let colEnds: number[] = [];
  let clusterEnd = -1;
  const flush = () => {
    const cols = colEnds.length || 1;
    cluster.forEach((c) => out.push({ ...c, cols }));
    cluster = [];
    colEnds = [];
  };
  sorted.forEach((it) => {
    const visualEnd = Math.max(it.end, it.start + MIN_VISUAL_MIN);
    if (it.start >= clusterEnd && cluster.length) flush();
    let col = colEnds.findIndex((e) => e <= it.start);
    if (col === -1) {
      col = colEnds.length;
      colEnds.push(visualEnd);
    } else colEnds[col] = visualEnd;
    cluster.push({ ...it, col, cols: 1 });
    clusterEnd = Math.max(cluster.length === 1 ? -1 : clusterEnd, visualEnd);
  });
  if (cluster.length) flush();
  return out;
};

export type CalendarView = 'week' | 'month';

interface SemesterCalendarProps {
  view: CalendarView;
  onOpenActivity: (sc: ScheduleClass, date: string) => void;
  onOpenExam: (exam: Exam) => void;
  onAddOnDate: (date: string) => void;
}

type DayEntry =
  | { kind: 'exam'; key: string; time: string; exam: Exam }
  | { kind: 'activity'; key: string; time: string; sc: ScheduleClass };

/** Segunda-feira da semana de uma data */
const mondayOf = (date: string) => {
  const js = parseYMD(date).getDay();
  return addDaysYMD(-((js + 6) % 7), date);
};

// Calendário do Semestre: semana (padrão) e mês, com aulas, atividades, eventos e provas
export const SemesterCalendar: React.FC<SemesterCalendarProps> = ({ view, onOpenActivity, onOpenExam, onAddOnDate }) => {
  const { schedule, exams, subjects, currentSemester } = useApp();
  // Relógio da linha "agora": atualiza a cada minuto, na virada do minuto
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    if (view !== 'week') return;
    setNow(new Date());
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      setNow(new Date());
      interval = setInterval(() => setNow(new Date()), 60_000);
    }, 60_000 - (Date.now() % 60_000));
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [view]);
  const isLg = useIsLg();
  const today = ymd(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const [anchor, setAnchor] = useState(today);
  const [selected, setSelected] = useState(today);

  const semExams = useMemo(
    () => exams.filter((e) => e.date && (!e.semesterId || !currentSemester || e.semesterId === currentSemester.id)),
    [exams, currentSemester]
  );

  const titleOf = (sc: ScheduleClass) => {
    if (sc.title) return sc.title;
    const sub = sc.subjectId ? subjects.find((s) => s.id === sc.subjectId) : undefined;
    return sub?.universitySubject || sub?.name || 'Atividade';
  };

  const entriesOn = (date: string): DayEntry[] => {
    const js = parseYMD(date).getDay();
    const dayNum = js === 0 ? 7 : js;
    const list: DayEntry[] = [
      ...semExams.filter((e) => e.date === date).map((e) => ({ kind: 'exam' as const, key: `e-${e.id}`, time: e.time || '00:00', exam: e })),
      ...schedule.filter((sc) => occursOn(sc, date, dayNum)).map((sc) => ({ kind: 'activity' as const, key: `a-${sc.id}`, time: sc.startTime, sc })),
    ];
    return list.sort((a, b) => a.time.localeCompare(b.time) || (a.kind === 'exam' ? -1 : 1));
  };

  // ---- navegação ----
  const anchorDate = parseYMD(anchor);
  const weekStart = mondayOf(anchor);
  const weekDates = Array.from({ length: 7 }, (_, i) => addDaysYMD(i, weekStart));
  const monthFirst = ymd(new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1));
  const monthLast = ymd(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 0));
  const gridStart = mondayOf(monthFirst);
  const gridDays: string[] = [];
  for (let d = gridStart; d <= monthLast || gridDays.length % 7 !== 0; d = addDaysYMD(1, d)) gridDays.push(d);

  const move = (dir: 1 | -1) => {
    if (view === 'week') {
      const next = addDaysYMD(7 * dir, anchor);
      setAnchor(next);
      setSelected(next);
    } else {
      const next = ymd(new Date(anchorDate.getFullYear(), anchorDate.getMonth() + dir, 1));
      setAnchor(next);
      setSelected(next);
    }
  };
  const goToday = () => {
    setAnchor(today);
    setSelected(today);
  };

  const fmtShort = (d: string) => {
    const x = parseYMD(d);
    return `${x.getDate()} ${MONTHS_SHORT[x.getMonth()]}`;
  };
  const label =
    view === 'week'
      ? `${fmtShort(weekDates[0])} – ${fmtShort(weekDates[6])}`
      : `${MONTHS[anchorDate.getMonth()]} ${anchorDate.getFullYear()}`;
  const showingToday = view === 'week' ? weekDates.includes(today) : today >= monthFirst && today <= monthLast;

  // ---- cartões ----
  const renderEntry = (en: DayEntry, date: string) => {
    if (en.kind === 'exam') {
      const k = getExamKind(en.exam.type);
      const time = examTimeRange(en.exam);
      return (
        <button
          key={en.key}
          id={`sem-cal-exam-${en.exam.id}`}
          type="button"
          onClick={() => onOpenExam(en.exam)}
          className="w-full text-left rounded-xl border-2 px-2.5 py-2 bg-white dark:bg-slate-900 hover:shadow-md transition-shadow"
          style={{ borderColor: `${k.color}99`, backgroundImage: `linear-gradient(135deg, ${k.color}1f, transparent 70%)` }}
        >
          <span className="flex items-center gap-1.5">
            <span className="h-6 w-6 shrink-0 rounded-lg flex items-center justify-center text-white" style={{ backgroundColor: k.color }}>
              <GraduationCap className="h-3.5 w-3.5" />
            </span>
            <span className="text-[10px] font-black uppercase tracking-wide ink" style={{ '--ink': k.color } as React.CSSProperties}>
              <span className="lg:hidden 2xl:inline">Prova · </span>{k.short}
            </span>
          </span>
          <span className="mt-1 block text-[12px] font-black text-slate-900 dark:text-white leading-snug line-clamp-2">{examMainTitle(en.exam, subjects)}</span>
          {time && (
            <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <Clock className="h-3 w-3 shrink-0" /> {time}
            </span>
          )}
        </button>
      );
    }
    const cat = getActivityCategory(en.sc);
    const color = en.sc.color || cat.color;
    const place = en.sc.location || en.sc.room;
    const hours = durationHours(en.sc.startTime, en.sc.endTime);
    return (
      <button
        key={en.key}
        type="button"
        onClick={() => onOpenActivity(en.sc, date)}
        className="relative w-full text-left rounded-xl border border-slate-200/70 dark:border-slate-700/60 pl-3 pr-2 py-2 overflow-hidden hover:shadow-md hover:-translate-y-px transition-all"
        style={{ backgroundColor: `${color}14` }}
      >
        <span className="absolute left-0 top-0 bottom-0 w-1 rounded-r" style={{ backgroundColor: color }} />
        <span className="flex items-center gap-1.5">
          <span className="text-[13px] leading-none shrink-0" aria-hidden="true">{cat.emoji}</span>
          <span className="text-[10px] font-black uppercase tracking-wide truncate ink lg:hidden 2xl:inline" style={{ '--ink': color } as React.CSSProperties}>
            {cat.label}
          </span>
          {hours > 0 && (
            <span className="ml-auto shrink-0 text-[10px] font-bold text-slate-500 dark:text-slate-400">{hours % 1 === 0 ? hours : hours.toFixed(1).replace('.', ',')}h</span>
          )}
        </span>
        <span className="mt-1 block text-[12px] font-black text-slate-900 dark:text-white leading-snug line-clamp-2">{titleOf(en.sc)}</span>
        <span className="mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
          <Clock className="h-3 w-3 shrink-0" /> {en.sc.startTime}–{en.sc.endTime}
        </span>
        {(place || en.sc.teacher) && (
          <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">
            {place ? (
              <>
                <MapPin className="h-3 w-3 shrink-0" /> <span className="truncate">{place}</span>
              </>
            ) : (
              <>
                <UserIcon className="h-3 w-3 shrink-0" /> <span className="truncate">{en.sc.teacher}</span>
              </>
            )}
          </span>
        )}
      </button>
    );
  };

  // ---- horários (linha do tempo) ----
  /** Início em minutos; null = prova sem horário (fica no "dia todo") */
  const entryStartMin = (en: DayEntry): number | null => {
    if (en.kind === 'activity') return toMin(en.sc.startTime);
    return en.exam.time ? toMin(en.exam.time) : null;
  };
  const entryEndMin = (en: DayEntry): number | null => {
    if (en.kind === 'activity') return toMin(en.sc.endTime);
    if (!en.exam.time) return null;
    const end = examEndTime(en.exam);
    return end ? toMin(end) : toMin(en.exam.time) + 60;
  };

  /** Cartão na grade de horas: posição e altura pelo horário; lado a lado quando se cruzam */
  const renderGridCard = (p: PlacedItem, date: string, rangeStart: number, isToday: boolean) => {
    const top = (p.start - rangeStart) * PX_PER_MIN;
    const height = Math.max(MIN_CARD_PX, (p.end - p.start) * PX_PER_MIN) - 2;
    const pos: React.CSSProperties = {
      top: top + 1,
      height,
      left: `calc(${(p.col / p.cols) * 100}% + 2px)`,
      width: `calc(${100 / p.cols}% - 4px)`,
    };
    const tiny = height < 40; // uma linha só
    const roomy = height >= 76;
    const past = date < today || (isToday && p.end <= nowMin);
    const en = p.entry;

    if (en.kind === 'exam') {
      const k = getExamKind(en.exam.type);
      const title = examMainTitle(en.exam, subjects);
      return (
        <button
          key={p.key}
          id={`sem-cal-exam-${en.exam.id}`}
          type="button"
          onClick={() => onOpenExam(en.exam)}
          title={`${title} · ${examTimeRange(en.exam)}`}
          className={`absolute z-10 rounded-lg border-2 px-1.5 text-left overflow-hidden bg-white dark:bg-slate-900 hover:z-20 hover:shadow-md focus-visible:z-20 transition-shadow ${
            tiny ? 'py-0 flex items-center gap-1' : 'py-1'
          } ${past ? 'opacity-60' : ''}`}
          style={{ ...pos, borderColor: `${k.color}b3`, backgroundImage: `linear-gradient(${k.color}26, ${k.color}26)` }}
        >
          {tiny ? (
            <>
              <GraduationCap className="h-3 w-3 shrink-0" style={{ color: k.color }} />
              <span className="min-w-0 truncate text-[10px] font-black text-slate-900 dark:text-white">{title}</span>
            </>
          ) : (
            <>
              <span className="flex items-center gap-1 text-[9px] font-black uppercase tracking-wide ink" style={{ '--ink': k.color } as React.CSSProperties}>
                <GraduationCap className="h-3 w-3 shrink-0" /> <span className="truncate">{k.short}</span>
              </span>
              <span className={`block text-[11px] font-black leading-tight text-slate-900 dark:text-white ${roomy ? 'line-clamp-2' : 'truncate'}`}>{title}</span>
              {height >= 54 && <span className="block text-[10px] font-semibold tabular-nums text-slate-600 dark:text-slate-300 truncate">{examTimeRange(en.exam)}</span>}
            </>
          )}
        </button>
      );
    }

    const cat = getActivityCategory(en.sc);
    const color = en.sc.color || cat.color;
    const place = en.sc.location || en.sc.room;
    const title = titleOf(en.sc);
    return (
      <button
        key={p.key}
        type="button"
        onClick={() => onOpenActivity(en.sc, date)}
        title={`${title} · ${en.sc.startTime}–${en.sc.endTime}${place ? ` · ${place}` : ''}`}
        className={`absolute z-10 rounded-lg border border-slate-200/80 dark:border-slate-700/70 pl-2 pr-1 text-left overflow-hidden bg-white dark:bg-slate-900 hover:z-20 hover:shadow-md focus-visible:z-20 transition-shadow ${
          tiny ? 'py-0 flex items-center gap-1' : 'py-1'
        } ${past ? 'opacity-60' : ''}`}
        style={{ ...pos, backgroundImage: `linear-gradient(${color}24, ${color}24)` }}
      >
        <span className="absolute left-0 inset-y-0 w-1" style={{ backgroundColor: color }} aria-hidden="true" />
        {tiny ? (
          <>
            <span className="shrink-0 text-[10px] font-bold tabular-nums text-slate-500 dark:text-slate-400">{en.sc.startTime}</span>
            <span className="min-w-0 truncate text-[10px] font-black text-slate-900 dark:text-white">{title}</span>
          </>
        ) : (
          <>
            <span className={`block text-[11px] font-black leading-tight text-slate-900 dark:text-white ${roomy ? 'line-clamp-2' : 'truncate'}`}>{title}</span>
            <span className="block text-[10px] font-semibold tabular-nums text-slate-600 dark:text-slate-300 truncate">
              {en.sc.startTime}–{en.sc.endTime}
            </span>
            {roomy && (place || en.sc.teacher) && (
              <span className="mt-0.5 flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 min-w-0">
                {place ? <MapPin className="h-3 w-3 shrink-0" /> : <UserIcon className="h-3 w-3 shrink-0" />}
                <span className="truncate">{place || en.sc.teacher}</span>
              </span>
            )}
          </>
        )}
      </button>
    );
  };

  const dayAgenda = (date: string) => {
    const entries = entriesOn(date);
    const x = parseYMD(date);
    return (
      <div id="sem-day-agenda" className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-black text-slate-900 dark:text-white">
            {WEEK_DAYS[(x.getDay() + 6) % 7].name}, {x.getDate()} de {MONTHS[x.getMonth()].toLowerCase()}
            {date === today && <span className="ml-1.5 text-[10px] font-bold text-sky-600 dark:text-sky-400">hoje</span>}
          </p>
          <button
            type="button"
            onClick={() => onAddOnDate(date)}
            className="shrink-0 h-10 w-10 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Adicionar neste dia"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {entries.length === 0 ? (
          <p className="text-[11px] text-slate-400">Dia livre.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">{entries.map((en) => renderEntry(en, date))}</div>
        )}
      </div>
    );
  };

  return (
    <div id="sem-calendar" className="space-y-3">
      {/* Navegação */}
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => move(-1)} className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Anterior">
          <ChevronLeft className="h-4 w-4" />
        </button>
        <p className="min-w-0 flex-1 text-center text-sm font-black text-slate-900 dark:text-white truncate">{label}</p>
        <button type="button" onClick={() => move(1)} className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Próximo">
          <ChevronRight className="h-4 w-4" />
        </button>
        {!showingToday && (
          <button
            id="sem-cal-today"
            type="button"
            onClick={goToday}
            className="shrink-0 min-h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-600 dark:text-slate-300"
          >
            Hoje
          </button>
        )}
      </div>

      {view === 'week' ? (
        <div className="space-y-3">
          {/* Resumo da semana */}
          {(() => {
            const all = weekDates.flatMap((d) => entriesOn(d));
            const acts = all.filter((e) => e.kind === 'activity') as Extract<DayEntry, { kind: 'activity' }>[];
            const examsN = all.filter((e) => e.kind === 'exam').length;
            const hours = acts.reduce((a, e) => a + durationHours(e.sc.startTime, e.sc.endTime), 0);
            const busiest = weekDates
              .map((d, i) => ({ i, h: (entriesOn(d).filter((e) => e.kind === 'activity') as Extract<DayEntry, { kind: 'activity' }>[]).reduce((a, e) => a + durationHours(e.sc.startTime, e.sc.endTime), 0) }))
              .sort((a, b) => b.h - a.h)[0];
            const chip = 'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-bold';
            return (
              <div id="sem-week-summary" className="flex flex-wrap gap-1.5">
                <span className={`${chip} bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300`}>📚 {acts.length} atividade{acts.length === 1 ? '' : 's'}</span>
                <span className={`${chip} bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200`}>
                  <Clock className="h-3.5 w-3.5" /> {Math.round(hours * 10) / 10}h na semana
                </span>
                {examsN > 0 && (
                  <span className={`${chip} bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300`}>
                    <GraduationCap className="h-3.5 w-3.5" /> {examsN} prova{examsN > 1 ? 's' : ''}
                  </span>
                )}
                {busiest && busiest.h > 0 && (
                  <span className={`${chip} bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300`}>Dia mais cheio: {WEEK_DAYS[busiest.i].short}</span>
                )}
              </div>
            );
          })()}

          <div id="sem-week">
            {/* Celular e tablet: lista por dia */}
            {!isLg && (
            <div className="grid grid-cols-1 gap-2 lg:hidden">
              {weekDates.map((date, i) => {
                const entries = entriesOn(date);
                const isToday = date === today;
                const isPast = date < today;
                const x = parseYMD(date);
                const dayHours = (entries.filter((e) => e.kind === 'activity') as Extract<DayEntry, { kind: 'activity' }>[]).reduce(
                  (a, e) => a + durationHours(e.sc.startTime, e.sc.endTime),
                  0
                );
                // Hoje: marcador "agora" antes da primeira atividade que ainda vai começar
                let nowIdx = -1;
                if (isToday && entries.length > 0) {
                  const idx = entries.findIndex((en) => {
                    const s = entryStartMin(en);
                    return s !== null && s > nowMin;
                  });
                  nowIdx = idx === -1 ? entries.length : idx;
                }
                return (
                  <section
                    key={date}
                    className={`rounded-2xl border p-2.5 min-w-0 flex gap-2.5 transition-colors ${
                      isToday
                        ? 'border-sky-400 dark:border-sky-600 bg-sky-50/70 dark:bg-sky-950/30 shadow-sm shadow-sky-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/30'
                    } ${isPast && !isToday ? 'opacity-70' : ''}`}
                  >
                    {/* Cabeçalho do dia */}
                    <div className="w-14 shrink-0 flex flex-col items-center gap-1">
                      <span
                        className={`h-10 w-10 rounded-xl flex flex-col items-center justify-center leading-none ${
                          isToday ? 'bg-sky-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        <span className="text-[9px] font-black uppercase">{WEEK_DAYS[i].short}</span>
                        <span className="text-base font-black">{x.getDate()}</span>
                      </span>
                      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 text-center">
                        {isToday ? <span className="text-sky-600 dark:text-sky-400">Hoje</span> : dayHours > 0 ? `${Math.round(dayHours * 10) / 10}h` : ''}
                        {isToday && dayHours > 0 ? <span className="block">· {Math.round(dayHours * 10) / 10}h</span> : null}
                      </span>
                    </div>

                    {/* Atividades e provas */}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      {entries.length === 0 ? (
                        <button
                          type="button"
                          onClick={() => onAddOnDate(date)}
                          className="w-full min-h-[44px] rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-400 hover:text-sky-600 hover:border-sky-400 flex items-center justify-center gap-1.5"
                        >
                          <Coffee className="h-4 w-4" /> Dia livre
                        </button>
                      ) : (
                        entries.map((en, idx) => {
                          const end = entryEndMin(en);
                          const done = isToday && end !== null && end <= nowMin;
                          return (
                            <React.Fragment key={en.key}>
                              {idx === nowIdx && <NowMarker time={hhmm(nowMin)} />}
                              <div className={done ? 'opacity-60' : undefined}>{renderEntry(en, date)}</div>
                            </React.Fragment>
                          );
                        })
                      )}
                      {nowIdx === entries.length && entries.length > 0 && <NowMarker time={hhmm(nowMin)} />}
                    </div>
                  </section>
                );
              })}
            </div>
            )}

            {/* Telas grandes: agenda com linha do tempo */}
            {isLg && (() => {
              const days = weekDates.map((date) => {
                const entries = entriesOn(date);
                const allDay = entries.filter((en) => en.kind === 'exam' && !en.exam.time) as Extract<DayEntry, { kind: 'exam' }>[];
                const timed: TimedItem[] = [];
                entries.forEach((en) => {
                  const start = entryStartMin(en);
                  if (start === null) return;
                  const end = entryEndMin(en) ?? start + 60;
                  timed.push({ key: en.key, start, end: end > start ? end : start + 30, entry: en });
                });
                return { date, entries, allDay, timed };
              });
              const allTimed = days.flatMap((d) => d.timed);
              // Eixo: da 1ª à última atividade da semana, entre 07:00 e 23:00 (sem esconder nada fora disso)
              const earliest = allTimed.length ? Math.min(...allTimed.map((t) => t.start)) : 8 * 60;
              const latest = allTimed.length ? Math.max(...allTimed.map((t) => Math.max(t.end, t.start + MIN_VISUAL_MIN))) : 18 * 60;
              let startH = Math.max(7, Math.floor(earliest / 60));
              let endH = Math.min(23, Math.ceil(latest / 60));
              if (earliest < startH * 60) startH = Math.floor(earliest / 60);
              if (latest > endH * 60) endH = Math.min(24, Math.ceil(latest / 60));
              // Pelo menos 6 horas visíveis
              while (endH - startH < 6) {
                if (endH < 23) endH++;
                else if (startH > 7) startH--;
                else break;
              }
              const rangeStart = startH * 60;
              const totalH = (endH - startH) * HOUR_PX;
              const hours = Array.from({ length: endH - startH + 1 }, (_, i) => startH + i);
              const showNow = weekDates.includes(today) && nowMin >= rangeStart && nowMin <= endH * 60;
              const nowTop = (nowMin - rangeStart) * PX_PER_MIN;
              const hasAllDay = days.some((d) => d.allDay.length > 0);
              const cols = { gridTemplateColumns: '3.25rem repeat(7, minmax(0, 1fr))' } as React.CSSProperties;

              return (
                <div id="sem-week-grid" className="hidden lg:block rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                  {/* Cabeçalho: dias */}
                  <div className="grid border-b border-slate-200 dark:border-slate-800" style={cols}>
                    <div />
                    {days.map(({ date, entries }, i) => {
                      const isToday = date === today;
                      const x = parseYMD(date);
                      const dayHours = (entries.filter((e) => e.kind === 'activity') as Extract<DayEntry, { kind: 'activity' }>[]).reduce(
                        (a, e) => a + durationHours(e.sc.startTime, e.sc.endTime),
                        0
                      );
                      return (
                        <div
                          key={date}
                          className={`min-w-0 border-l border-slate-100 dark:border-slate-800 px-2 py-2 flex items-center gap-2 ${
                            isToday ? 'bg-sky-50/80 dark:bg-sky-950/30' : date < today ? 'opacity-70' : ''
                          }`}
                        >
                          <span
                            className={`h-10 w-10 shrink-0 rounded-xl flex flex-col items-center justify-center leading-none ${
                              isToday ? 'bg-sky-600 text-white' : 'bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800'
                            }`}
                          >
                            <span className="text-[9px] font-black uppercase">{WEEK_DAYS[i].short}</span>
                            <span className="text-base font-black">{x.getDate()}</span>
                          </span>
                          <span className="min-w-0 flex-1 text-[10px] font-bold leading-tight text-slate-500 dark:text-slate-400">
                            {isToday && <span className="block text-sky-600 dark:text-sky-400">Hoje</span>}
                            {dayHours > 0 ? `${Math.round(dayHours * 10) / 10}h` : isToday ? '' : 'Livre'}
                          </span>
                          <button
                            type="button"
                            onClick={() => onAddOnDate(date)}
                            className="shrink-0 h-8 w-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                            aria-label={`Adicionar em ${WEEK_DAYS[i].name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Dia todo: provas sem horário */}
                  {hasAllDay && (
                    <div className="grid border-b border-slate-200 dark:border-slate-800" style={cols}>
                      <div className="px-1 py-2 text-right text-[9px] font-bold uppercase leading-tight text-slate-400">Dia todo</div>
                      {days.map(({ date, allDay }) => (
                        <div key={date} className={`min-w-0 border-l border-slate-100 dark:border-slate-800 p-1 space-y-1 ${date === today ? 'bg-sky-50/80 dark:bg-sky-950/30' : ''}`}>
                          {allDay.map((en) => {
                            const k = getExamKind(en.exam.type);
                            return (
                              <button
                                key={en.key}
                                id={`sem-cal-exam-${en.exam.id}`}
                                type="button"
                                onClick={() => onOpenExam(en.exam)}
                                title={examMainTitle(en.exam, subjects)}
                                className="w-full min-h-7 rounded-full border px-2 py-0.5 flex items-center gap-1 text-left bg-white dark:bg-slate-900 hover:shadow-sm transition-shadow"
                                style={{ borderColor: `${k.color}99`, backgroundImage: `linear-gradient(${k.color}1f, ${k.color}1f)` }}
                              >
                                <GraduationCap className="h-3 w-3 shrink-0" style={{ color: k.color }} />
                                <span className="min-w-0 truncate text-[10px] font-black text-slate-900 dark:text-white">{examMainTitle(en.exam, subjects)}</span>
                              </button>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Corpo: eixo de horas + colunas */}
                  <div className="relative grid my-2" style={cols}>
                    {/* Linhas das horas (atrás de tudo) */}
                    <div className="pointer-events-none absolute inset-y-0 right-0 left-[3.25rem]" aria-hidden="true">
                      {hours.map((h) => (
                        <div key={h} className="absolute inset-x-0 border-t border-slate-100 dark:border-slate-800/70" style={{ top: (h - startH) * HOUR_PX }} />
                      ))}
                    </div>

                    {/* Eixo */}
                    <div className="relative" style={{ height: totalH }} aria-hidden="true">
                      {hours.map((h) => (
                        <span
                          key={h}
                          className="absolute right-2 text-[10px] font-semibold tabular-nums leading-none text-slate-400 dark:text-slate-500"
                          style={{ top: (h - startH) * HOUR_PX - 5 }}
                        >
                          {String(h).padStart(2, '0')}:00
                        </span>
                      ))}
                      {showNow && (
                        <span
                          className="absolute right-1 z-10 rounded px-1 text-[10px] font-black tabular-nums leading-[14px] bg-rose-500 text-white"
                          style={{ top: nowTop - 7 }}
                        >
                          {hhmm(nowMin)}
                        </span>
                      )}
                    </div>

                    {/* Colunas dos dias */}
                    {days.map(({ date, timed }) => {
                      const isToday = date === today;
                      const placed = layoutDay(timed);
                      return (
                        <div
                          key={date}
                          className={`relative min-w-0 border-l border-slate-100 dark:border-slate-800 ${isToday ? 'bg-sky-50/50 dark:bg-sky-950/20' : ''}`}
                          style={{ height: totalH }}
                        >
                          {/* Clique no espaço vazio: adicionar neste dia (no teclado, use o + do cabeçalho) */}
                          <button
                            type="button"
                            tabIndex={-1}
                            aria-hidden="true"
                            onClick={() => onAddOnDate(date)}
                            className="absolute inset-0 w-full cursor-copy hover:bg-sky-500/5 dark:hover:bg-sky-400/5 transition-colors"
                          />
                          {timed.length === 0 && (
                            <span className="pointer-events-none absolute inset-x-0 top-3 flex flex-col items-center gap-1 text-[10px] font-semibold text-slate-300 dark:text-slate-600">
                              <Coffee className="h-4 w-4" /> Dia livre
                            </span>
                          )}
                          {placed.map((p) => renderGridCard(p, date, rangeStart, isToday))}
                          {isToday && showNow && (
                            <div className="pointer-events-none absolute inset-x-0 z-30" style={{ top: nowTop }} role="img" aria-label={`Agora, ${hhmm(nowMin)}`}>
                              <span className="absolute -left-[5px] -top-[4px] h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />
                              <span className="block h-0.5 -mt-px bg-rose-500" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      ) : (
        <div id="sem-month" className="space-y-3">
          <div className="grid grid-cols-7 gap-0.5 sm:gap-1">
            {WEEK_DAYS.map((d) => (
              <p key={d.num} className="text-center text-[10px] font-bold uppercase text-slate-400 py-1">
                {d.short}
              </p>
            ))}
            {gridDays.map((date) => {
              const entries = entriesOn(date);
              const inMonth = date >= monthFirst && date <= monthLast;
              const isToday = date === today;
              const isSel = date === selected;
              const examsHere = entries.filter((e) => e.kind === 'exam') as Extract<DayEntry, { kind: 'exam' }>[];
              const acts = entries.filter((e) => e.kind === 'activity') as Extract<DayEntry, { kind: 'activity' }>[];
              return (
                <button
                  key={date}
                  type="button"
                  onClick={() => setSelected(date)}
                  aria-pressed={isSel}
                  aria-label={`Dia ${parseYMD(date).getDate()}${examsHere.length ? ', tem prova' : ''}`}
                  className={`min-h-12 lg:min-h-24 rounded-lg sm:rounded-xl border p-1 text-left flex flex-col gap-0.5 min-w-0 overflow-hidden ${
                    isSel
                      ? 'border-sky-500 ring-1 ring-sky-500'
                      : examsHere.length
                      ? 'border-rose-300 dark:border-rose-900/70'
                      : 'border-slate-200 dark:border-slate-800'
                  } ${inMonth ? 'bg-white dark:bg-slate-900' : 'bg-slate-50 dark:bg-slate-950/40 opacity-60'}`}
                >
                  <span
                    className={`text-[11px] font-black leading-none ${
                      isToday ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-sky-600 text-white' : 'text-slate-700 dark:text-slate-200'
                    }`}
                  >
                    {parseYMD(date).getDate()}
                  </span>
                  {/* celular: pontinhos; telas grandes: nomes */}
                  <span className="flex flex-wrap gap-0.5 lg:hidden">
                    {examsHere.slice(0, 2).map((e) => (
                      <GraduationCap key={e.key} className="h-3 w-3" style={{ color: getExamKind(e.exam.type).color }} />
                    ))}
                    {acts.slice(0, 3).map((a) => (
                      <span key={a.key} className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: a.sc.color || getActivityCategory(a.sc).color }} />
                    ))}
                  </span>
                  <span className="hidden lg:flex flex-col gap-0.5 min-w-0">
                    {entries.slice(0, 3).map((en) =>
                      en.kind === 'exam' ? (
                        <span key={en.key} className="text-[10px] font-black truncate rounded px-1" style={{ color: getExamKind(en.exam.type).color, backgroundColor: `${getExamKind(en.exam.type).color}14` }}>
                          🎓 {examMainTitle(en.exam, subjects)}
                        </span>
                      ) : (
                        <span key={en.key} className="text-[10px] text-slate-600 dark:text-slate-300 truncate flex items-center gap-1">
                          <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: en.sc.color || getActivityCategory(en.sc).color }} />
                          {titleOf(en.sc)}
                        </span>
                      )
                    )}
                    {entries.length > 3 && <span className="text-[9px] font-bold text-slate-400">+{entries.length - 3}</span>}
                  </span>
                </button>
              );
            })}
          </div>
          {dayAgenda(selected)}
        </div>
      )}
    </div>
  );
};
