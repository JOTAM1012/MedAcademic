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
type ViewMode = 'daily' | 'weekly' | 'monthly';

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const DAY_NAMES = [
  { name: 'SEGUNDA', short: 'Seg', long: 'Segunda-feira', dayNum: 1 },
  { name: 'TERÇA', short: 'Ter', long: 'Terça-feira', dayNum: 2 },
  { name: 'QUARTA', short: 'Qua', long: 'Quarta-feira', dayNum: 3 },
  { name: 'QUINTA', short: 'Qui', long: 'Quinta-feira', dayNum: 4 },
  { name: 'SEXTA', short: 'Sex', long: 'Sexta-feira', dayNum: 5 },
  { name: 'SÁBADO', short: 'Sáb', long: 'Sábado', dayNum: 6 },
  { name: 'DOMINGO', short: 'Dom', long: 'Domingo', dayNum: 7 },
];

const VIEW_LABELS: Record<ViewMode, { title: string; live: string; prev: string; next: string }> = {
  daily: { title: 'Programação Diária', live: 'Hoje', prev: 'Dia Anterior', next: 'Próximo Dia' },
  weekly: { title: 'Programação Semanal', live: 'Semana Atual', prev: 'Semana Anterior', next: 'Próxima Semana' },
  monthly: { title: 'Programação Mensal', live: 'Mês Atual', prev: 'Mês Anterior', next: 'Próximo Mês' },
};

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
  isFirstContact?: boolean;
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

  // Calendar View State: default to 'weekly'
  const [viewMode, setViewMode] = useState<ViewMode>('weekly');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Navigation State: reference date of the active day / week / month (defaults to today)
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

  // Day descriptor shared by the daily, weekly and monthly views
  const makeDayInfo = (source: Date) => {
    const d = new Date(source);
    d.setHours(0, 0, 0, 0);
    const ymd = formatToYMD(d);
    const names = DAY_NAMES[(d.getDay() + 6) % 7]; // getDay(): 0 = Domingo
    return {
      date: d,
      dateStr: ymd,
      dayNumber: d.getDate(),
      monthNumber: d.getMonth() + 1,
      name: names.name,
      short: names.short,
      long: names.long,
      dayNum: names.dayNum,
      isToday: formatToYMD(new Date()) === ymd,
    };
  };

  // Compute the 7 days of the active week (Segunda to Domingo)
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      return makeDayInfo(d);
    });
  }, [monday]);

  // Active day for the daily view
  const activeDay = useMemo(() => makeDayInfo(currentWeekDate), [currentWeekDate]);

  // Monthly grid: full weeks (Segunda a Domingo) covering the active month
  const monthGrid = useMemo(() => {
    const firstOfMonth = new Date(currentWeekDate.getFullYear(), currentWeekDate.getMonth(), 1);
    const lastOfMonth = new Date(currentWeekDate.getFullYear(), currentWeekDate.getMonth() + 1, 0);
    const gridStart = getMonday(firstOfMonth);
    const cells = [];
    const cursor = new Date(gridStart);
    while (cursor <= lastOfMonth || cells.length % 7 !== 0) {
      cells.push({ ...makeDayInfo(cursor), inMonth: cursor.getMonth() === firstOfMonth.getMonth() });
      cursor.setDate(cursor.getDate() + 1);
    }
    return cells;
  }, [currentWeekDate]);

  // Days covered by the active view (used for the stats and filter counters)
  const rangeDays = useMemo(() => {
    if (viewMode === 'daily') return [activeDay];
    if (viewMode === 'monthly') return monthGrid.filter((c) => c.inMonth);
    return weekDays;
  }, [viewMode, activeDay, monthGrid, weekDays]);

  // Navigation handlers (step depends on the active view)
  const shiftPeriod = (direction: 1 | -1) => {
    const d = new Date(currentWeekDate);
    if (viewMode === 'daily') {
      d.setDate(d.getDate() + direction);
    } else if (viewMode === 'weekly') {
      d.setDate(d.getDate() + 7 * direction);
    } else {
      d.setDate(1); // avoid month overflow (ex: 31 -> next month)
      d.setMonth(d.getMonth() + direction);
    }
    setCurrentWeekDate(d);
  };

  const jumpToToday = () => {
    setCurrentWeekDate(new Date());
  };

  const openDay = (date: Date) => {
    setCurrentWeekDate(new Date(date));
    setViewMode('daily');
  };

  // Period description header
  const weekRangeLabel = useMemo(() => {
    if (viewMode === 'daily') {
      return `${activeDay.long}, ${activeDay.dayNumber} de ${MONTH_NAMES[activeDay.date.getMonth()]} de ${activeDay.date.getFullYear()}`;
    }
    if (viewMode === 'monthly') {
      return `${MONTH_NAMES[currentWeekDate.getMonth()]} de ${currentWeekDate.getFullYear()}`;
    }
    const start = weekDays[0].date;
    const end = weekDays[6].date;
    if (start.getMonth() === end.getMonth()) {
      return `${start.getDate()} a ${end.getDate()} de ${MONTH_NAMES[start.getMonth()]} de ${start.getFullYear()}`;
    }
    return `${start.getDate()} de ${MONTH_NAMES[start.getMonth()]} a ${end.getDate()} de ${MONTH_NAMES[end.getMonth()]} de ${end.getFullYear()}`;
  }, [viewMode, activeDay, weekDays, currentWeekDate]);

  // Check if the active view contains today
  const isCurrentLiveWeek = useMemo(() => {
    const todayYMD = formatToYMD(new Date());
    return rangeDays.some((d) => d.dateStr === todayYMD);
  }, [rangeDays]);

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
        // First contact = the day the topic is scheduled to be studied for the first time
        const isFirst =
          !!topic.scheduleFirstContact &&
          topic.firstContactDate === dayInfo.dateStr &&
          topic.nextReviewDate !== dayInfo.dateStr;
        
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
          isFirstContact: isFirst,
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

  // Per-day summary: counts by category and spaced-review subjects (used by the daily & monthly views)
  const summarizeItems = (items: UnifiedCalendarItem[]) => {
    const reviewsBySubject = new Map<string, { label: string; color?: string; count: number }>();
    const firstBySubject = new Map<string, { label: string; color?: string; count: number }>();
    let reviews = 0;
    let firstContacts = 0;
    let exams = 0;
    let classes = 0;

    items.forEach((item) => {
      if (item.sourceType === 'exam') exams++;
      else if (item.sourceType === 'schedule') classes++;
      else {
        const map = item.isFirstContact ? firstBySubject : reviewsBySubject;
        if (item.isFirstContact) firstContacts++;
        else reviews++;
        const key = item.subject?.id || item.subtitle || 'geral';
        const entry = map.get(key) || {
          label: item.subject?.name || item.subtitle || 'Geral',
          color: item.subject?.color,
          count: 0,
        };
        entry.count++;
        map.set(key, entry);
      }
    });

    return {
      reviews,
      firstContacts,
      exams,
      classes,
      completed: items.filter((i) => i.isCompleted).length,
      reviewsBySubject: Array.from(reviewsBySubject.values()),
      firstBySubject: Array.from(firstBySubject.values()),
    };
  };

  // Count total stats for the active period
  const weeklyStats = useMemo(() => {
    let totalItems = 0;
    let completedItems = 0;
    let examsCount = 0;
    let reviewsCount = 0;

    rangeDays.forEach((d) => {
      const items = getItemsForDay(d);
      totalItems += items.length;
      completedItems += items.filter((i) => i.isCompleted).length;
      examsCount += items.filter((i) => i.sourceType === 'exam').length;
      reviewsCount += items.filter((i) => i.sourceType === 'topic').length;
    });

    return { totalItems, completedItems, examsCount, reviewsCount };
  }, [rangeDays, schedule, exams, topics, subjects, filterType, searchQuery]);

  // Item card shared by the weekly columns (compact) and the daily board
  const renderItemCard = (item: UnifiedCalendarItem, compact = false) => (
    <div
      key={item.id}
      onClick={() => setSelectedItem(item)}
      className={`group relative min-w-0 rounded-2xl border transition-all cursor-pointer ${compact ? 'p-2' : 'p-3'} ${
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
      <h3
        className={`font-black text-white leading-snug line-clamp-2 uppercase tracking-tight break-words ${
          compact ? 'text-[11px]' : 'text-xs'
        }`}
      >
        {item.title}
      </h3>

      {/* Optional Subtitle / Room */}
      {(item.subtitle || item.locationOrRoom) && (
        <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 min-w-0">
          {item.locationOrRoom && <MapPin className="h-2.5 w-2.5 shrink-0" />}
          <span className="truncate">{item.subtitle || item.locationOrRoom}</span>
        </p>
      )}

      {/* Bottom Line: Recurrence/Type and Status (stacked in the narrow weekly columns) */}
      <div
        className={`border-t border-slate-800/60 flex text-[10px] ${
          compact ? 'mt-2 pt-1.5 flex-col items-start gap-1' : 'mt-2.5 pt-2 items-center justify-between gap-2'
        }`}
      >
        <div className="flex items-center gap-1 text-slate-400 font-medium min-w-0">
          {item.bottomLeftIcon === 'repeat' && <Repeat className="h-3 w-3 text-slate-400 shrink-0" />}
          {item.bottomLeftIcon === 'brain' && <Brain className="h-3 w-3 text-sky-400 shrink-0" />}
          {item.bottomLeftIcon === 'exam' && <GraduationCap className="h-3 w-3 text-rose-400 shrink-0" />}
          <span className="truncate">{item.bottomLeftLabel}</span>
        </div>

        <button
          type="button"
          onClick={(e) => handleToggleItemStatus(item, e)}
          className={`flex items-center gap-1 font-bold transition-colors shrink-0 ${
            item.isCompleted
              ? 'text-emerald-400 hover:text-emerald-300'
              : item.sourceType === 'exam'
              ? 'text-rose-400'
              : 'text-amber-400 hover:text-amber-300'
          }`}
        >
          {item.isCompleted ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          <span>{item.statusLabel}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-5 pb-16 max-w-full">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-sky-400" />
              <span>{VIEW_LABELS[viewMode].title}</span>
            </h1>
            {isCurrentLiveWeek && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {VIEW_LABELS[viewMode].live}
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Visualização integrada de aulas da faculdade, revisões espaçadas, avaliações e compromissos.
          </p>
        </div>

        {/* Action Controls & Navigation Buttons */}
        <div className="relative z-10 flex items-center gap-2.5 flex-wrap">
          {/* View Mode Switcher (Dia / Semana / Mês) */}
          <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-2xl p-1 shadow-inner">
            {([
              { mode: 'daily', label: 'Dia' },
              { mode: 'weekly', label: 'Semana' },
              { mode: 'monthly', label: 'Mês' },
            ] as const).map(({ mode, label }) => (
              <button
                key={mode}
                id={`calendar-view-${mode}`}
                onClick={() => setViewMode(mode)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${
                  viewMode === mode
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Period Paging Buttons */}
          <div className="flex items-center gap-1 bg-slate-950/80 border border-slate-800 rounded-2xl p-1 shadow-inner">
            <button
              onClick={() => shiftPeriod(-1)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title={VIEW_LABELS[viewMode].prev}
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
              onClick={() => shiftPeriod(1)}
              className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title={VIEW_LABELS[viewMode].next}
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

      {/* 7-COLUMN WEEKLY BOARD */}
      {viewMode === 'weekly' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2.5 items-stretch">
        {weekDays.map((day) => {
          const dayItems = getItemsForDay(day);

          return (
            <div
              key={day.dateStr}
              className={`flex flex-col min-w-0 min-h-[360px] rounded-2xl border transition-all ${
                day.isToday
                  ? 'bg-slate-900/95 border-sky-500/50 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/30'
                  : 'bg-slate-900/70 border-slate-800/80 hover:border-slate-700 shadow-md'
              } p-2 relative overflow-hidden`}
            >
              {/* Day Column Header */}
              <div className="pb-2 mb-2 px-1 border-b border-slate-800/80">
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
                    className={`text-2xl font-black ${
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
              <div className="flex-1 space-y-2">
                {dayItems.length === 0 ? (
                  <div className="h-28 border border-dashed border-slate-800/80 rounded-xl flex flex-col items-center justify-center p-2 text-center bg-slate-950/20">
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
                  dayItems.map((item) => renderItemCard(item, true))
                )}
              </div>

              {/* Column Footer Quick Add */}
              <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenAddSchedule && onOpenAddSchedule(day.dayNum)}
                  title={`Adicionar na ${day.short}`}
                  className="w-full py-1.5 px-2 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/70 text-[10px] font-bold text-slate-400 hover:text-white transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  <Plus className="h-3 w-3 text-sky-400 shrink-0" />
                  <span>Adicionar</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* DAILY BOARD: a single panel with every activity of the day */}
      {viewMode === 'daily' && (() => {
        const dayItems = getItemsForDay(activeDay);
        const summary = summarizeItems(dayItems);
        const summaryTiles = [
          { label: 'Revisões espaçadas', value: summary.reviews, icon: <Repeat className="h-4 w-4" />, color: 'text-sky-400 bg-sky-500/10 border-sky-500/30' },
          { label: '1º contato', value: summary.firstContacts, icon: <Brain className="h-4 w-4" />, color: 'text-violet-400 bg-violet-500/10 border-violet-500/30' },
          { label: 'Avaliações', value: summary.exams, icon: <GraduationCap className="h-4 w-4" />, color: 'text-rose-400 bg-rose-500/10 border-rose-500/30' },
          { label: 'Aulas & compromissos', value: summary.classes, icon: <BookOpen className="h-4 w-4" />, color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
        ];

        return (
          <div
            id="calendar-daily-board"
            className={`rounded-3xl border p-4 sm:p-6 shadow-md ${
              activeDay.isToday
                ? 'bg-slate-900/95 border-sky-500/50 ring-1 ring-sky-500/30'
                : 'bg-slate-900/70 border-slate-800/80'
            }`}
          >
            {/* Day header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 mb-4 border-b border-slate-800/80">
              <div className="flex items-baseline gap-3">
                <span className={`text-5xl font-black ${activeDay.isToday ? 'text-sky-400' : 'text-white'}`}>
                  {activeDay.dayNumber}
                </span>
                <div>
                  <p className="text-sm font-black text-white uppercase tracking-wide">{activeDay.long}</p>
                  <p className="text-xs text-slate-400">
                    {MONTH_NAMES[activeDay.date.getMonth()]} de {activeDay.date.getFullYear()} • {dayItems.length}{' '}
                    {dayItems.length === 1 ? 'atividade' : 'atividades'} ({summary.completed} concluídas)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenAddSchedule && onOpenAddSchedule(activeDay.dayNum)}
                className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-white transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-sky-400" />
                <span>Adicionar neste dia</span>
              </button>
            </div>

            {/* Summary tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
              {summaryTiles.map((tile) => (
                <div key={tile.label} className={`rounded-2xl border p-3 flex items-center gap-3 ${tile.color}`}>
                  {tile.icon}
                  <div>
                    <p className="text-xl font-black text-white leading-none">{tile.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide mt-1">{tile.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Activities (ordered by time) */}
            {dayItems.length === 0 ? (
              <div className="h-48 border border-dashed border-slate-800/80 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-950/20">
                <CalendarIcon className="h-7 w-7 text-slate-700 mb-2" />
                <p className="text-xs text-slate-400 font-medium">Nenhuma atividade neste dia.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {dayItems.map((item) => renderItemCard(item))}
              </div>
            )}
          </div>
        );
      })()}

      {/* MONTHLY BOARD: one square per day with the study summary */}
      {viewMode === 'monthly' && (
        <div id="calendar-monthly-board" className="rounded-3xl border border-slate-800/80 bg-slate-900/70 p-3 sm:p-4 shadow-md">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
            {DAY_NAMES.map((d) => (
              <div key={d.dayNum} className="text-center text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-wider">
                {d.short}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {monthGrid.map((cell) => {
              const cellItems = getItemsForDay(cell);
              const s = summarizeItems(cellItems);
              const subjectLines = [
                ...s.reviewsBySubject.map((r) => ({ ...r, kind: 'review' as const })),
                ...s.firstBySubject.map((r) => ({ ...r, kind: 'first' as const })),
              ];

              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => openDay(cell.date)}
                  title={`Abrir ${cell.long}, ${cell.dayNumber}/${cell.monthNumber}`}
                  className={`min-h-[92px] sm:min-h-[128px] rounded-xl sm:rounded-2xl border p-1.5 sm:p-2 text-left flex flex-col gap-1 transition-all hover:border-sky-500/60 ${
                    cell.isToday
                      ? 'border-sky-500/60 bg-sky-950/30 ring-1 ring-sky-500/30'
                      : cell.inMonth
                      ? 'border-slate-800 bg-slate-950/60'
                      : 'border-slate-900 bg-slate-950/20 opacity-45'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs sm:text-sm font-black ${cell.isToday ? 'text-sky-400' : 'text-white'}`}>
                      {cell.dayNumber}
                    </span>
                    {cellItems.length > 0 && (
                      <span className="text-[9px] font-bold text-slate-400">{cellItems.length}</span>
                    )}
                  </div>

                  {/* Category counters */}
                  <div className="flex flex-wrap gap-0.5 sm:gap-1">
                    {s.reviews > 0 && (
                      <span className="text-[9px] font-black px-1 sm:px-1.5 rounded bg-sky-500/15 text-sky-300" title="Revisões espaçadas">
                        {s.reviews} rev
                      </span>
                    )}
                    {s.firstContacts > 0 && (
                      <span className="text-[9px] font-black px-1 sm:px-1.5 rounded bg-violet-500/15 text-violet-300" title="Estudos de 1º contato">
                        {s.firstContacts} 1º
                      </span>
                    )}
                    {s.exams > 0 && (
                      <span className="text-[9px] font-black px-1 sm:px-1.5 rounded bg-rose-500/15 text-rose-300" title="Avaliações">
                        {s.exams} prova{s.exams > 1 ? 's' : ''}
                      </span>
                    )}
                    {s.classes > 0 && (
                      <span className="text-[9px] font-black px-1 sm:px-1.5 rounded bg-amber-500/15 text-amber-300" title="Aulas & compromissos">
                        {s.classes} aula{s.classes > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Subjects summary (hidden on very small screens) */}
                  <div className="hidden sm:flex flex-col gap-0.5 mt-auto">
                    {subjectLines.slice(0, 3).map((line) => (
                      <span
                        key={`${line.kind}-${line.label}`}
                        className="text-[10px] text-slate-300 truncate flex items-center gap-1"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full shrink-0 ${line.kind === 'first' ? 'bg-violet-400' : 'bg-sky-400'}`}
                        />
                        <span className="truncate">{line.label}</span>
                        {line.count > 1 && <span className="text-slate-500">×{line.count}</span>}
                      </span>
                    ))}
                    {subjectLines.length > 3 && (
                      <span className="text-[9px] text-slate-500">+{subjectLines.length - 3} disciplinas</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 mt-3 px-1 text-[10px] text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" />Revisão espaçada</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" />1º contato</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" />Avaliação</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Aulas & compromissos</span>
            <span className="ml-auto">Clique em um dia para ver todas as atividades</span>
          </div>
        </div>
      )}

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
