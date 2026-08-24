import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  GraduationCap,
  Plus,
  MapPin,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Repeat,
  Sparkles,
  Filter,
  CalendarDays,
  Brain,
  LayoutGrid,
  Columns,
  Check,
  Trash2,
  Play,
  Flame,
  Search,
  Building2,
  FolderPlus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Exam, ScheduleClass, Topic, Subject } from '../types';

interface CalendarViewProps {
  onOpenAddExam?: (subjectId?: string) => void;
  onOpenAddSchedule?: (dayNum?: number) => void;
  onOpenAddTopic?: (subjectId?: string) => void;
}

type FilterType = 'all' | 'classes' | 'reviews' | 'exams' | 'personal';

interface UnifiedCalendarItem {
  id: string;
  sourceType: 'schedule' | 'exam' | 'topic';
  time: string;
  badge: string;
  badgeColor: 'amber' | 'blue' | 'rose' | 'emerald' | 'purple';
  title: string;
  subtitle?: string;
  locationOrRoom?: string;
  bottomLeftLabel: string;
  bottomLeftIcon?: 'repeat' | 'calendar' | 'brain' | 'exam';
  statusLabel: string;
  isCompleted: boolean;
  progressPercent?: number;
  subject?: Subject;
  originalData: ScheduleClass | Exam | Topic;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  onOpenAddExam,
  onOpenAddSchedule,
  onOpenAddTopic,
}) => {
  const {
    exams,
    topics,
    subjects,
    schedule,
    updateScheduleClass,
    deleteScheduleClass,
    updateTopic,
    reviewTopicSpacedRepetition,
    deleteExam,
    setTimerMode,
    setCurrentTab,
    showNotification,
  } = useApp();

  // Calendar View State: default to 'weekly' as requested
  const [viewMode, setViewMode] = useState<'weekly' | 'monthly'>('weekly');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Weekly Navigation State: track current week reference date (defaults to today)
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(new Date());
  
  // Selected Item Modal State
  const [selectedItem, setSelectedItem] = useState<UnifiedCalendarItem | null>(null);

  // Helper: Get subject by ID
  const getSubject = (subjectId?: string) => {
    if (!subjectId) return undefined;
    return subjects.find((s) => s.id === subjectId);
  };

  // Helper: Format date to YYYY-MM-DD
  const formatToYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Helper: Get Monday of the current week
  const getMonday = (d: Date) => {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(date.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday;
  };

  const monday = useMemo(() => getMonday(currentWeekDate), [currentWeekDate]);

  // Compute the 7 days of the active week (Segunda to Domingo)
  const weekDays = useMemo(() => {
    const days = [];
    const dayNames = [
      { name: 'SEGUNDA', short: 'Seg', dayNum: 1 },
      { name: 'TERÇA', short: 'Ter', dayNum: 2 },
      { name: 'QUARTA', short: 'Qua', dayNum: 3 },
      { name: 'QUINTA', short: 'Qui', dayNum: 4 },
      { name: 'SEXTA', short: 'Sex', dayNum: 5 },
      { name: 'SÁBADO', short: 'Sáb', dayNum: 6 },
      { name: 'DOMINGO', short: 'Dom', dayNum: 7 },
    ];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const ymd = formatToYMD(d);
      const isToday = formatToYMD(new Date()) === ymd;

      days.push({
        date: d,
        dateStr: ymd,
        dayNumber: d.getDate(),
        monthNumber: d.getMonth() + 1,
        name: dayNames[i].name,
        short: dayNames[i].short,
        dayNum: dayNames[i].dayNum,
        isToday,
      });
    }
    return days;
  }, [monday]);

  // Navigation handlers
  const prevWeek = () => {
    const d = new Date(monday);
    d.setDate(monday.getDate() - 7);
    setCurrentWeekDate(d);
  };

  const nextWeek = () => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + 7);
    setCurrentWeekDate(d);
  };

  const jumpToToday = () => {
    setCurrentWeekDate(new Date());
  };

  // Week description header
  const weekRangeLabel = useMemo(() => {
    if (weekDays.length < 7) return '';
    const start = weekDays[0].date;
    const end = weekDays[6].date;
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

    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} a ${end.getDate()} de ${monthNames[start.getMonth()]} de ${start.getFullYear()}`;
    }
    return `${start.getDate()} de ${monthNames[start.getMonth()]} a ${end.getDate()} de ${monthNames[end.getMonth()]} de ${end.getFullYear()}`;
  }, [weekDays]);

  // Check if current view is the current live week
  const isCurrentLiveWeek = useMemo(() => {
    const todayYMD = formatToYMD(new Date());
    return weekDays.some((d) => d.dateStr === todayYMD);
  }, [weekDays]);

  // Generate unified items for a specific day of the week
  const getItemsForDay = (dayInfo: { dateStr: string; dayNum: number }) => {
    const items: UnifiedCalendarItem[] = [];

    // 1. Schedule Classes & Commitments (Recurring by dayOfWeek or matches day)
    schedule
      .filter((s) => s.dayOfWeek === dayInfo.dayNum)
      .forEach((sc) => {
        const sub = getSubject(sc.subjectId);
        const isCommitment = !sc.subjectId;
        const mainTitle = isCommitment ? sc.title || 'COMPROMISSO' : sub?.universitySubject || sub?.name || sc.title || 'FACULDADE';
        
        let badgeText = 'TAREFA';
        let badgeColor: UnifiedCalendarItem['badgeColor'] = 'amber';

        if (sc.type?.toLowerCase().includes('plantão')) {
          badgeText = 'PLANTÃO';
          badgeColor = 'rose';
        } else if (sc.type?.toLowerCase().includes('prática') || sc.type?.toLowerCase().includes('ambulatório')) {
          badgeText = 'PRÁTICA';
          badgeColor = 'purple';
        } else if (sc.type?.toLowerCase().includes('estudo')) {
          badgeText = 'ESTUDO';
          badgeColor = 'blue';
        } else if (!isCommitment) {
          badgeText = 'AULA';
          badgeColor = 'amber';
        } else {
          badgeText = 'TAREFA';
          badgeColor = 'amber';
        }

        items.push({
          id: `sc-${sc.id}`,
          sourceType: 'schedule',
          time: sc.startTime || '--:--',
          badge: badgeText,
          badgeColor,
          title: mainTitle,
          subtitle: isCommitment ? sc.room || sc.location : sub?.name,
          locationOrRoom: sc.room || sc.location,
          bottomLeftLabel: 'Recorrente',
          bottomLeftIcon: 'repeat',
          statusLabel: sc.isCompleted ? 'Concluído' : 'Pendente',
          isCompleted: !!sc.isCompleted,
          subject: sub,
          originalData: sc,
        });
      });

    // 2. Exams & Assessments on this specific date
    exams
      .filter((e) => e.date === dayInfo.dateStr)
      .forEach((exam) => {
        const sub = getSubject(exam.subjectId);
        const subName = sub?.universitySubject || sub?.name || 'Geral';

        items.push({
          id: `exam-${exam.id}`,
          sourceType: 'exam',
          time: exam.time || '--:--',
          badge: exam.type || 'PROVA',
          badgeColor: 'rose',
          title: exam.title,
          subtitle: `Disciplina: ${subName}`,
          locationOrRoom: exam.location,
          bottomLeftLabel: `Peso: ${exam.weight}`,
          bottomLeftIcon: 'exam',
          statusLabel: exam.grade !== undefined ? `Nota: ${exam.grade.toFixed(1)}` : 'Pendente',
          isCompleted: exam.grade !== undefined,
          subject: sub,
          originalData: exam,
        });
      });

    // 3. Spaced Repetition Study Topics (due on this date or first contact scheduled on this date)
    topics
      .filter((t) => {
        const isNextReview = t.inSpacedRepetition !== false && t.nextReviewDate === dayInfo.dateStr;
        const isFirstContact = t.scheduleFirstContact && t.firstContactDate === dayInfo.dateStr;
        return isNextReview || isFirstContact;
      })
      .forEach((topic) => {
        const sub = getSubject(topic.subjectId);
        const isFirst = topic.firstContactDate === dayInfo.dateStr && (!topic.cycleStep || topic.cycleStep === 0);
        
        let cycleBadge = 'D0';
        if (topic.cycleStep === 1) cycleBadge = 'D1';
        else if (topic.cycleStep === 2) cycleBadge = 'D7';
        else if (topic.cycleStep === 3) cycleBadge = 'D15';
        else if (topic.cycleStep === 4) cycleBadge = 'D30';
        else if (topic.cycleStep && topic.cycleStep > 4) cycleBadge = 'D60';

        if (isFirst) {
          cycleBadge = 'D0';
        }

        const isDone = topic.status === 'revisado' || topic.status === 'dominado';
        const progress = topic.status === 'dominado' ? 100 : topic.status === 'revisado' ? 75 : topic.status === 'em_andamento' ? 40 : 0;

        items.push({
          id: `topic-${topic.id}`,
          sourceType: 'topic',
          time: topic.studyTime || '--:--',
          badge: cycleBadge,
          badgeColor: 'blue',
          title: topic.title,
          subtitle: sub?.universitySubject || sub?.name || topic.moduleName,
          bottomLeftLabel: isFirst ? '1º Contato' : 'Revisão Espaçada',
          bottomLeftIcon: 'brain',
          statusLabel: `${progress}%`,
          progressPercent: progress,
          isCompleted: isDone,
          subject: sub,
          originalData: topic,
        });
      });

    // Sort items by time (e.g. 08:00, 14:00, 18:30, --:--)
    return items
      .filter((item) => {
        // Filter by category
        if (filterType === 'classes' && (item.sourceType !== 'schedule' || !(item.originalData as ScheduleClass).subjectId)) {
          return false;
        }
        if (filterType === 'personal' && (item.sourceType !== 'schedule' || !!(item.originalData as ScheduleClass).subjectId)) {
          return false;
        }
        if (filterType === 'exams' && item.sourceType !== 'exam') {
          return false;
        }
        if (filterType === 'reviews' && item.sourceType !== 'topic') {
          return false;
        }

        // Filter by search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(q);
          const matchSub = item.subtitle?.toLowerCase().includes(q);
          const matchLoc = item.locationOrRoom?.toLowerCase().includes(q);
          return matchTitle || matchSub || matchLoc;
        }

        return true;
      })
      .sort((a, b) => {
        if (a.time === '--:--') return 1;
        if (b.time === '--:--') return -1;
        return a.time.localeCompare(b.time);
      });
  };

  // Quick Action Handlers
  const handleToggleItemStatus = (item: UnifiedCalendarItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();

    if (item.sourceType === 'schedule') {
      const sc = item.originalData as ScheduleClass;
      updateScheduleClass(sc.id, { isCompleted: !sc.isCompleted });
      showNotification(!sc.isCompleted ? 'Atividade concluída com sucesso!' : 'Atividade marcada como pendente.', 'success');
    } else if (item.sourceType === 'topic') {
      const top = item.originalData as Topic;
      const nextStatus = top.status === 'dominado' || top.status === 'revisado' ? 'em_andamento' : 'revisado';
      updateTopic(top.id, { status: nextStatus });
      showNotification(`Assunto "${top.title}" marcado como ${nextStatus}!`, 'success');
    }
  };

  const handleStartStudyTimer = (item: UnifiedCalendarItem) => {
    if (item.sourceType === 'topic') {
      const top = item.originalData as Topic;
      setTimerMode('pomodoro', top.subjectId, top.id);
      setCurrentTab('stopwatch');
      showNotification(`Cronômetro Pomodoro iniciado para "${top.title}"!`, 'info');
    } else if (item.subject) {
      setTimerMode('pomodoro', item.subject.id);
      setCurrentTab('stopwatch');
      showNotification(`Cronômetro iniciado para "${item.subject.name}"!`, 'info');
    }
  };

  // Count total stats for the active week
  const weeklyStats = useMemo(() => {
    let totalItems = 0;
    let completedItems = 0;
    let examsCount = 0;
    let reviewsCount = 0;

    weekDays.forEach((d) => {
      const items = getItemsForDay(d);
      totalItems += items.length;
      completedItems += items.filter((i) => i.isCompleted).length;
      examsCount += items.filter((i) => i.sourceType === 'exam').length;
      reviewsCount += items.filter((i) => i.sourceType === 'topic').length;
    });

    return { totalItems, completedItems, examsCount, reviewsCount };
  }, [weekDays, schedule, exams, topics, filterType, searchQuery]);

  return (
    <div className="space-y-5 pb-16 max-w-full">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-sky-400" />
              <span>Programação Semanal</span>
            </h1>
            {isCurrentLiveWeek && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Semana Atual
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Visualização integrada de aulas da faculdade, revisões espaçadas, avaliações e compromissos.
          </p>
        </div>

        {/* Action Controls & Navigation Buttons */}
        <div className="relative z-10 flex items-center gap-2.5 flex-wrap">
          {/* Week Paging Buttons */}
          <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-2xl p-1 shadow-inner">
            <button
              onClick={prevWeek}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Semana Anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={jumpToToday}
              className="px-3 py-1.5 rounded-xl text-xs font-black text-slate-200 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Hoje
            </button>

            <button
              onClick={nextWeek}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title="Próxima Semana"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Quick Add Menu */}
          <div className="flex items-center gap-1.5">
            {onOpenAddSchedule && (
              <button
                onClick={() => onOpenAddSchedule()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold border border-slate-700 transition-all shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 text-amber-400" />
                <span>+ Atividade</span>
              </button>
            )}

            {onOpenAddExam && (
              <button
                onClick={() => onOpenAddExam()}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Avaliação</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Week Title & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3 shadow-xs">
        {/* Range Label */}
        <div className="flex items-center gap-2 px-1">
          <div className="h-2 w-2 rounded-full bg-sky-500" />
          <span className="text-xs sm:text-sm font-bold text-slate-200 uppercase tracking-wide">
            {weekRangeLabel}
          </span>
          <span className="text-[11px] text-slate-400">
            • {weeklyStats.totalItems} atividades ({weeklyStats.completedItems} concluídas)
          </span>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterType === 'all'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            Tudo ({weeklyStats.totalItems})
          </button>
          <button
            onClick={() => setFilterType('classes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterType === 'classes'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            Aulas & Faculdade
          </button>
          <button
            onClick={() => setFilterType('reviews')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterType === 'reviews'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            Revisões Espaçadas ({weeklyStats.reviewsCount})
          </button>
          <button
            onClick={() => setFilterType('exams')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterType === 'exams'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
            }`}
          >
            Avaliações ({weeklyStats.examsCount})
          </button>
        </div>
      </div>

      {/* 7-COLUMN WEEKLY BOARD (Exact layout matching the photo) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3.5 items-start">
        {weekDays.map((day) => {
          const dayItems = getItemsForDay(day);

          return (
            <div
              key={day.dateStr}
              className={`flex flex-col min-h-[580px] rounded-3xl border transition-all ${
                day.isToday
                  ? 'bg-slate-900/95 border-sky-500/50 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/30'
                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 shadow-md'
              } p-3 sm:p-3.5 relative overflow-hidden`}
            >
              {/* Day Column Header */}
              <div className="pb-3 mb-3 border-b border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-400 tracking-wider uppercase">
                    {day.name}
                  </span>

                  {day.isToday && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300 border border-sky-500/40 uppercase">
                      Hoje
                    </span>
                  )}
                </div>

                <div className="mt-0.5 flex items-baseline justify-between">
                  <span
                    className={`text-2xl sm:text-3xl font-black ${
                      day.isToday ? 'text-sky-400' : 'text-white'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  <span className="text-[10px] font-semibold text-slate-400">
                    {dayItems.length} {dayItems.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
              </div>

              {/* Day Items List */}
              <div className="flex-1 space-y-2.5">
                {dayItems.length === 0 ? (
                  <div className="h-44 border border-dashed border-slate-800/80 rounded-2xl flex flex-col items-center justify-center p-3 text-center bg-slate-950/20">
                    <CalendarIcon className="h-6 w-6 text-slate-700 mb-1.5" />
                    <p className="text-[11px] text-slate-400 font-medium">Livre</p>
                    <button
                      onClick={() => onOpenAddSchedule && onOpenAddSchedule(day.dayNum)}
                      className="mt-2 text-[10px] font-bold text-sky-400 hover:text-sky-300 transition-colors"
                    >
                      + Adicionar
                    </button>
                  </div>
                ) : (
                  dayItems.map((item) => {
                    const isSchedule = item.sourceType === 'schedule';
                    const isTopic = item.sourceType === 'topic';
                    const isExam = item.sourceType === 'exam';

                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`group relative rounded-2xl border transition-all cursor-pointer p-3 ${
                          item.isCompleted
                            ? 'bg-slate-950/40 border-slate-800/50 opacity-65 hover:opacity-100'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-950 shadow-xs'
                        }`}
                      >
                        {/* Top Line: Time on Left, Badge on Right */}
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className="text-[11px] font-mono font-bold text-slate-300 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-400" />
                            {item.time}
                          </span>

                          {/* Pill Badge */}
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 rounded-md border tracking-wider uppercase ${
                              item.badgeColor === 'amber'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                : item.badgeColor === 'blue'
                                ? 'bg-sky-500/15 text-sky-400 border-sky-500/30'
                                : item.badgeColor === 'rose'
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                                : item.badgeColor === 'purple'
                                ? 'bg-purple-500/15 text-purple-400 border-purple-500/30'
                                : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            {item.badge}
                          </span>
                        </div>

                        {/* Middle: Prominent Title */}
                        <h3 className="text-xs font-black text-white leading-snug line-clamp-2 uppercase tracking-tight">
                          {item.title}
                        </h3>

                        {/* Optional Subtitle / Room */}
                        {(item.subtitle || item.locationOrRoom) && (
                          <p className="text-[10px] text-slate-400 mt-1 line-clamp-1 flex items-center gap-1">
                            {item.locationOrRoom && <MapPin className="h-2.5 w-2.5 shrink-0" />}
                            <span>{item.subtitle || item.locationOrRoom}</span>
                          </p>
                        )}

                        {/* Bottom Line: Recurrence/Type on Left, Status on Right */}
                        <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
                          {/* Left: Type / Recurrence */}
                          <div className="flex items-center gap-1 text-slate-400 font-medium">
                            {item.bottomLeftIcon === 'repeat' && <Repeat className="h-3 w-3 text-slate-400" />}
                            {item.bottomLeftIcon === 'brain' && <Brain className="h-3 w-3 text-sky-400" />}
                            {item.bottomLeftIcon === 'exam' && <GraduationCap className="h-3 w-3 text-rose-400" />}
                            <span>{item.bottomLeftLabel}</span>
                          </div>

                          {/* Right: Status / Progress / Toggle */}
                          <button
                            type="button"
                            onClick={(e) => handleToggleItemStatus(item, e)}
                            className={`flex items-center gap-1 font-bold transition-colors ${
                              item.isCompleted
                                ? 'text-emerald-400 hover:text-emerald-300'
                                : item.sourceType === 'exam'
                                ? 'text-rose-400'
                                : 'text-amber-400 hover:text-amber-300'
                            }`}
                          >
                            {item.isCompleted ? (
                              <>
                                <CheckCircle2 className="h-3 w-3" />
                                <span>{item.statusLabel}</span>
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3" />
                                <span>{item.statusLabel}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Column Footer Quick Add */}
              <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenAddSchedule && onOpenAddSchedule(day.dayNum)}
                  className="w-full py-1.5 px-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/70 text-[10px] font-bold text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1"
                >
                  <Plus className="h-3 w-3 text-sky-400" />
                  <span>Adicionar na {day.short}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Item Detail & Quick Actions Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="relative w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2.5 rounded-2xl ${
                    selectedItem.badgeColor === 'amber'
                      ? 'bg-amber-500/10 text-amber-400'
                      : selectedItem.badgeColor === 'blue'
                      ? 'bg-sky-500/10 text-sky-400'
                      : selectedItem.badgeColor === 'rose'
                      ? 'bg-rose-500/10 text-rose-400'
                      : 'bg-purple-500/10 text-purple-400'
                  }`}
                >
                  {selectedItem.sourceType === 'schedule' && <Clock className="h-5 w-5" />}
                  {selectedItem.sourceType === 'topic' && <Brain className="h-5 w-5" />}
                  {selectedItem.sourceType === 'exam' && <GraduationCap className="h-5 w-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 uppercase">
                      {selectedItem.badge}
                    </span>
                    <span className="text-xs font-mono text-slate-400">
                      Horário: {selectedItem.time}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-white mt-1">
                    {selectedItem.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-2.5 text-xs text-slate-300">
              {selectedItem.subtitle && (
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400">Disciplina / Módulo:</span>
                  <span className="font-bold text-white">{selectedItem.subtitle}</span>
                </div>
              )}

              {selectedItem.locationOrRoom && (
                <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400">Sala / Local:</span>
                  <span className="font-bold text-white">{selectedItem.locationOrRoom}</span>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-400">Status Atual:</span>
                <span
                  className={`font-black ${
                    selectedItem.isCompleted ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {selectedItem.statusLabel}
                </span>
              </div>
            </div>

            {/* Footer Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-800">
              {/* Delete button */}
              <button
                type="button"
                onClick={() => {
                  if (selectedItem.sourceType === 'schedule') {
                    deleteScheduleClass((selectedItem.originalData as ScheduleClass).id);
                  } else if (selectedItem.sourceType === 'exam') {
                    deleteExam((selectedItem.originalData as Exam).id);
                  }
                  setSelectedItem(null);
                  showNotification('Item removido com sucesso!', 'info');
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Excluir</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Start Study Timer button */}
                <button
                  type="button"
                  onClick={() => {
                    handleStartStudyTimer(selectedItem);
                    setSelectedItem(null);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-colors"
                >
                  <Play className="h-3.5 w-3.5" />
                  <span>Estudar Agora</span>
                </button>

                {/* Toggle Completed */}
                <button
                  type="button"
                  onClick={() => {
                    handleToggleItemStatus(selectedItem);
                    setSelectedItem(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{selectedItem.isCompleted ? 'Marcar Pendente' : 'Marcar Concluído'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
