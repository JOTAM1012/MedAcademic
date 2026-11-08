import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, GraduationCap, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Exam, ScheduleClass } from '../../types';
import { WEEK_DAYS, getActivityCategory, getExamKind, occursOn } from '../../data/planning';
import { addDaysYMD, parseYMD, ymd } from '../../data/blockReview';
import { MONTHS, MONTHS_SHORT, examMainTitle, examTimeRange } from './semesterUtils';

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
  const today = ymd(new Date());
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
          className="w-full min-h-10 text-left rounded-xl border px-2 py-1.5 flex items-start gap-1.5 bg-white dark:bg-slate-900 hover:shadow-sm"
          style={{ borderColor: `${k.color}80` }}
        >
          <GraduationCap className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: k.color }} />
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-black text-slate-900 dark:text-white truncate">{examMainTitle(en.exam, subjects)}</span>
            <span className="block text-[10px] font-semibold truncate" style={{ color: k.color }}>
              {k.short}
              {time ? ` · ${time}` : ''}
            </span>
          </span>
        </button>
      );
    }
    const cat = getActivityCategory(en.sc);
    const color = en.sc.color || cat.color;
    const place = en.sc.location || en.sc.room;
    return (
      <button
        key={en.key}
        type="button"
        onClick={() => onOpenActivity(en.sc, date)}
        className="relative w-full min-h-10 text-left rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-2.5 pr-2 py-1.5 overflow-hidden hover:border-slate-300 dark:hover:border-slate-700"
      >
        <span className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: color }} />
        <span className="block text-[11px] font-bold text-slate-800 dark:text-slate-100 truncate">{titleOf(en.sc)}</span>
        <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">
          {en.sc.startTime}–{en.sc.endTime}
          {place ? ` · ${place}` : ''}
        </span>
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
        <div id="sem-week" className="grid grid-cols-1 lg:grid-cols-7 gap-1.5">
          {weekDates.map((date, i) => {
            const entries = entriesOn(date);
            const isToday = date === today;
            const x = parseYMD(date);
            return (
              <section
                key={date}
                className={`rounded-2xl border p-2 min-w-0 flex gap-2 lg:flex-col ${
                  isToday ? 'border-sky-300 dark:border-sky-800 bg-sky-50/50 dark:bg-sky-950/20' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="w-11 shrink-0 lg:w-auto flex lg:items-center lg:justify-between flex-col lg:flex-row">
                  <div className="text-center lg:text-left lg:flex lg:items-baseline lg:gap-1">
                    <p className={`text-[10px] font-bold uppercase ${isToday ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}`}>{WEEK_DAYS[i].short}</p>
                    <p className={`text-lg lg:text-sm font-black leading-none ${isToday ? 'text-sky-700 dark:text-sky-300' : 'text-slate-800 dark:text-slate-100'}`}>{x.getDate()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddOnDate(date)}
                    className="hidden lg:flex h-8 w-8 rounded-lg items-center justify-center text-slate-300 hover:text-sky-600 hover:bg-white dark:hover:bg-slate-800"
                    aria-label={`Adicionar em ${WEEK_DAYS[i].name}`}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  {entries.length === 0 ? (
                    <button
                      type="button"
                      onClick={() => onAddOnDate(date)}
                      className="w-full min-h-10 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-[10px] font-semibold text-slate-400 hover:text-sky-600 hover:border-sky-400"
                    >
                      livre
                    </button>
                  ) : (
                    entries.map((en) => renderEntry(en, date))
                  )}
                </div>
              </section>
            );
          })}
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
