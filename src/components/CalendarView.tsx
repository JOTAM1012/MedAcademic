import React, { useState } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Repeat,
  Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

export const CalendarView: React.FC = () => {
  const { exams, topics, subjects } = useApp();
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  const jumpToday = () => setCurrentDate(new Date());

  const getSubject = (subjectId: string) => subjects.find((s) => s.id === subjectId);

  // Generate calendar day cells
  const calendarDays = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push({ day: null, isCurrentMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    calendarDays.push({ day: d, isCurrentMonth: true });
  }

  const today = new Date();
  const isToday = (d: number) =>
    today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Calendário Acadêmico
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
              {monthNames[month]} {year}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Visão consolidada de provas, revisões programadas e entregas acadêmicas.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={jumpToday}
            className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            Hoje
          </button>
          <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5">
            <button
              onClick={prevMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={nextMonth}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Monthly Calendar Grid */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 text-center py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50 dark:bg-slate-950/40">
          <div>Dom</div>
          <div>Seg</div>
          <div>Ter</div>
          <div>Qua</div>
          <div>Qui</div>
          <div>Sex</div>
          <div>Sáb</div>
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/60 border-b border-slate-100 dark:border-slate-800">
          {calendarDays.map((item, idx) => {
            if (!item.day) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[100px] p-2 bg-slate-50/30 dark:bg-slate-950/20"
                />
              );
            }

            const dayDateStr = `${year}-${(month + 1).toString().padStart(2, '0')}-${item.day
              .toString()
              .padStart(2, '0')}`;

            const dayExams = exams.filter((e) => e.date === dayDateStr);
            const dayTopics = topics.filter(
              (t) => t.inSpacedRepetition !== false && t.nextReviewDate === dayDateStr
            );

            return (
              <div
                key={`day-${item.day}`}
                className={`min-h-[105px] p-2 transition-colors ${
                  isToday(item.day)
                    ? 'bg-sky-50/60 dark:bg-sky-950/30 font-bold'
                    : 'hover:bg-slate-50/50 dark:hover:bg-slate-950/20'
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-xs inline-flex items-center justify-center h-6 w-6 rounded-full ${
                      isToday(item.day)
                        ? 'bg-sky-600 text-white font-black shadow-xs'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {item.day}
                  </span>
                </div>

                <div className="space-y-1">
                  {dayExams.map((exam) => {
                    const sub = getSubject(exam.subjectId);
                    return (
                      <div
                        key={exam.id}
                        className="p-1 rounded-md text-[10px] font-bold text-white truncate shadow-xs"
                        style={{ backgroundColor: sub?.color || '#e11d48' }}
                        title={`${exam.title} - ${sub?.name}`}
                      >
                        📝 {exam.title}
                      </div>
                    );
                  })}

                  {dayTopics.length > 0 && (
                    <div className="p-0.5 px-1 rounded-md text-[9px] font-semibold bg-sky-100 dark:bg-sky-950/60 text-sky-800 dark:text-sky-300 truncate">
                      🔄 {dayTopics.length} {dayTopics.length === 1 ? 'assunto p/ revisar' : 'assuntos p/ revisar'}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
