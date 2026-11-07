import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  CalendarRange,
  Settings2,
  HelpCircle,
  ChevronDown,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getActivityCategory, getExamKind, getExamSubjectName, getExamShift, occursOn } from '../data/planning';
import { Exam, ScheduleClass, Topic, Subject, ChecklistItem, TopicBlock } from '../types';
import { BLOCK_REVIEWS_TO_MASTER, cycleDay, formatDM, isTopicSeen } from '../data/blockReview';
import { reviewTechnique } from '../data/studyMethod';
import { useWeekLoad } from '../hooks/useStudyPlan';
import { DatePickerField } from './DatePickerField';
import { TodayPlanPanel } from './plan/TodayPlanPanel';
import { DailyHabitsCard } from './plan/DailyHabitsCard';
import { WeeklyPlanModal } from './plan/WeeklyPlanModal';
import { StudyRoutineModal } from './plan/StudyRoutineModal';
import { DAY_KIND_INFO, blocksToHours, readLocal, userLocalKey, writeLocal } from './plan/planShared';

interface CalendarViewProps {
  onOpenAddExam?: (date?: string) => void;
  onOpenAddSchedule?: (dayNum?: number, date?: string) => void;
  onOpenAddTopic?: (subjectId?: string) => void;
}

type FilterType = 'all' | 'classes' | 'reviews' | 'exams' | 'personal';
type ViewMode = 'today' | 'daily' | 'weekly' | 'monthly';
const VIEW_KEY = 'medacademic_planner_view';
const readView = (): ViewMode => {
  const v = readLocal(VIEW_KEY);
  // A visão "Dia" saiu do Planner (Hoje / Semana / Mês); quem estava nela volta para Hoje
  return v === 'weekly' || v === 'monthly' || v === 'today' ? v : 'today';
};

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
  today: { title: 'Meu plano de hoje', live: 'Hoje', prev: '', next: '' },
  daily: { title: 'Meu dia', live: 'Hoje', prev: 'Dia Anterior', next: 'Próximo Dia' },
  weekly: { title: 'Minha semana', live: 'Semana Atual', prev: 'Semana Anterior', next: 'Próxima Semana' },
  monthly: { title: 'Meu mês', live: 'Mês Atual', prev: 'Mês Anterior', next: 'Próximo Mês' },
};

// Selos dos cards: tons escuros no modo claro, claros no escuro (legíveis nos dois)
const BADGE_CLS: Record<'amber' | 'blue' | 'rose' | 'emerald' | 'purple', string> = {
  amber: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/30',
  blue: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-500/15 dark:text-sky-400 dark:border-sky-500/30',
  rose: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/15 dark:text-rose-400 dark:border-rose-500/30',
  purple: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/15 dark:text-purple-400 dark:border-purple-500/30',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-400 dark:border-emerald-500/30',
};

interface UnifiedCalendarItem {
  id: string;
  sourceType: 'schedule' | 'exam' | 'topic' | 'task' | 'block' | 'blockstudy';
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
  accentColor?: string;
  originalData: ScheduleClass | Exam | Topic | ChecklistItem | TopicBlock;
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
    topicBlocks,
    markTopicSeen,
    deleteExam,
    checklist,
    checklistBlocks,
    toggleChecklistItem,
    deleteChecklistItem,
    setTimerMode,
    setCurrentTab,
    showNotification,
    updateExam,
    updateChecklistItem,
    updateTopicBlock,
    openMethodGuide,
    openReviews,
    studyMethod,
    userProfile,
    isInitialLoadComplete,
    methodGuideSeen,
    methodGuide,
    plannerRequest,
    clearPlannerRequest,
  } = useApp();

  // Visão: "Hoje" é a padrão; a escolhida fica lembrada neste aparelho
  const [viewMode, setViewModeState] = useState<ViewMode>(readView);
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    writeLocal(VIEW_KEY, mode);
  };
  const [weekPlanOpen, setWeekPlanOpen] = useState(false);
  const [routineOpen, setRoutineOpen] = useState<null | 'full' | 'first'>(null);
  const [agendaOpen, setAgendaOpen] = useState(true);

  // Atalhos "Planner › Hoje" (Início, guia, menu): cai sempre na visão Hoje e, se pedido, abre Minha rotina
  useEffect(() => {
    if (!plannerRequest) return;
    setViewMode('today');
    if (plannerRequest.routine) setRoutineOpen('full');
    clearPlannerRequest();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plannerRequest]);

  // Mini-configuração da rotina: abre sozinha na 1ª visita ao Hoje se o aluno nunca escolheu nada
  useEffect(() => {
    if (viewMode !== 'today' || !isInitialLoadComplete || !methodGuideSeen || methodGuide.open) return;
    const prefs = studyMethod.prefs;
    if (prefs && Object.keys(prefs).length > 0) return;
    const key = userLocalKey('routine_setup_shown', userProfile.email);
    if (readLocal(key) === '1') return;
    writeLocal(key, '1');
    setRoutineOpen('first');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, isInitialLoadComplete, studyMethod.prefs, userProfile.email, methodGuideSeen, methodGuide.open]);
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
  const todayInfo = makeDayInfo(new Date());
  const rangeDays = useMemo(() => {
    if (viewMode === 'today') return [makeDayInfo(new Date())];
    if (viewMode === 'daily') return [activeDay];
    if (viewMode === 'monthly') return monthGrid.filter((c) => c.inMonth);
    return weekDays;
  }, [viewMode, activeDay, monthGrid, weekDays]);

  // Navigation handlers (step depends on the active view)
  const shiftPeriod = (direction: 1 | -1) => {
    if (viewMode === 'today') return;
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

  // Tocar num dia do mês: hoje abre o plano do dia; outro dia abre a semana dele
  const openDay = (date: Date) => {
    setCurrentWeekDate(new Date(date));
    const d = new Date(date);
    const now = new Date();
    const isToday = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    setViewMode(isToday ? 'today' : 'weekly');
  };

  // Period description header
  const weekRangeLabel = useMemo(() => {
    if (viewMode === 'today') {
      const t = makeDayInfo(new Date());
      return `${t.long}, ${t.dayNumber} de ${MONTH_NAMES[t.date.getMonth()]}`;
    }
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

  // Carga de cada dia da semana (revisões + temas × capacidade) e tipo do dia
  const weekLoadList = useWeekLoad(viewMode === 'weekly' ? weekDays.map((d) => d.dateStr) : []);
  const weekLoadByDate = useMemo(() => new Map(weekLoadList.map((l) => [l.date, l])), [weekLoadList]);

  // ---------- D0 e arrastar cards entre dias ----------
  // Dia de estudo de um bloco em estudo: data planejada ou o 1º contato agendado mais cedo dos tópicos
  const studyDateOf = (bk: TopicBlock) => {
    if (bk.plannedDate) return bk.plannedDate;
    const dates = topics
      .filter((t) => t.blockId === bk.id && t.scheduleFirstContact && t.firstContactDate && t.status === 'nao_iniciado')
      .map((t) => t.firstContactDate!)
      .sort();
    return dates[0];
  };

  const isMovable = (item: UnifiedCalendarItem) =>
    item.sourceType === 'schedule' ? !!(item.originalData as ScheduleClass).date : true;

  const moveItemToDate = (item: UnifiedCalendarItem, date: string) => {
    const label = formatDM(date);
    switch (item.sourceType) {
      case 'block': {
        const bk = item.originalData as TopicBlock;
        updateTopicBlock(bk.id, { nextReviewDate: date });
        showNotification(`Revisão R${bk.reviewsDone + 1} de "${bk.name}" movida para ${label}.`, 'success');
        break;
      }
      case 'blockstudy': {
        const bk = item.originalData as TopicBlock;
        updateTopicBlock(bk.id, { plannedDate: date });
        topics
          .filter((t) => t.blockId === bk.id && t.scheduleFirstContact && t.status === 'nao_iniciado')
          .forEach((t) => updateTopic(t.id, { firstContactDate: date }));
        showNotification(`Estudo do bloco "${bk.name}" movido para ${label}.`, 'success');
        break;
      }
      case 'exam':
        updateExam((item.originalData as Exam).id, { date });
        showNotification(`Prova movida para ${label}.`, 'success');
        break;
      case 'task':
        updateChecklistItem((item.originalData as ChecklistItem).id, { dueDate: date });
        showNotification(`Tarefa movida para ${label}.`, 'success');
        break;
      case 'topic':
        updateTopic((item.originalData as Topic).id, { firstContactDate: date });
        showNotification(`Estudo movido para ${label}.`, 'success');
        break;
      case 'schedule': {
        const sc = item.originalData as ScheduleClass;
        if (!sc.date) return;
        const wd = new Date(date + 'T12:00:00').getDay();
        updateScheduleClass(sc.id, { date, dayOfWeek: (wd === 0 ? 7 : wd) as ScheduleClass['dayOfWeek'] });
        showNotification(`"${item.title}" movido para ${label}.`, 'success');
        break;
      }
    }
  };

  // Atalhos: hoje, amanhã, próximo sábado e +7 dias
  const quickMoveTargets = () => {
    const base = new Date();
    const add = (n: number) => {
      const d = new Date(base);
      d.setDate(d.getDate() + n);
      return formatToYMD(d);
    };
    const toSat = (6 - base.getDay() + 7) % 7 || 7;
    return [
      { label: 'Hoje', date: add(0) },
      { label: 'Amanhã', date: add(1) },
      { label: `Sábado (${formatDM(add(toSat))})`, date: add(toSat) },
      { label: '+7 dias', date: add(7) },
    ];
  };

  const [drag, setDrag] = useState<{ item: UnifiedCalendarItem; x: number; y: number } | null>(null);
  const [dropDate, setDropDate] = useState<string | null>(null);
  const dropDateRef = useRef<string | null>(null);
  const suppressClickRef = useRef(false);
  const pendingRef = useRef<{ item: UnifiedCalendarItem; x: number; y: number; timer?: number; started: boolean } | null>(null);

  // Rola a tela sozinho quando o card arrastado chega perto da borda (dias empilhados no celular)
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const autoScrollRef = useRef<number | null>(null);
  const startAutoScroll = () => {
    if (autoScrollRef.current) return;
    autoScrollRef.current = window.setInterval(() => {
      const p = lastPosRef.current;
      const main = document.querySelector('main');
      if (!p || !main) return;
      const edge = 110;
      const h = window.innerHeight;
      const dy = p.y < edge ? -Math.ceil((edge - p.y) / 6) : p.y > h - edge ? Math.ceil((p.y - (h - edge)) / 6) : 0;
      if (dy) {
        main.scrollBy(0, dy);
        updateHover(p.x, p.y);
      }
    }, 16);
  };
  const stopAutoScroll = () => {
    if (autoScrollRef.current) window.clearInterval(autoScrollRef.current);
    autoScrollRef.current = null;
    lastPosRef.current = null;
  };

  const updateHover = (x: number, y: number) => {
    lastPosRef.current = { x, y };
    const el = document.elementFromPoint(x, y)?.closest('[data-drop-date]') as HTMLElement | null;
    const d = el?.dataset.dropDate || null;
    dropDateRef.current = d;
    setDropDate(d);
  };
  const beginDrag = (x: number, y: number) => {
    const p = pendingRef.current;
    if (!p || p.started) return;
    p.started = true;
    setDrag({ item: p.item, x, y });
    updateHover(x, y);
    startAutoScroll();
    if (navigator.vibrate) try { navigator.vibrate(15); } catch {}
  };
  const finishDrag = () => {
    stopAutoScroll();
    const p = pendingRef.current;
    if (p?.timer) window.clearTimeout(p.timer);
    if (p?.started) {
      const target = dropDateRef.current;
      if (target) moveItemToDate(p.item, target);
      suppressClickRef.current = true;
      window.setTimeout(() => (suppressClickRef.current = false), 50);
    }
    pendingRef.current = null;
    dropDateRef.current = null;
    setDrag(null);
    setDropDate(null);
  };

  // Mouse / caneta: arrasta depois de mover alguns pixels
  const startDrag = (e: React.PointerEvent, item: UnifiedCalendarItem) => {
    if (e.pointerType === 'touch' || e.button !== 0 || !isMovable(item)) return;
    if ((e.target as HTMLElement).closest('button')) return;
    pendingRef.current = { item, x: e.clientX, y: e.clientY, started: false };
    const move = (ev: PointerEvent) => {
      const p = pendingRef.current;
      if (!p) return;
      if (!p.started && Math.hypot(ev.clientX - p.x, ev.clientY - p.y) > 6) beginDrag(ev.clientX, ev.clientY);
      if (p.started) {
        ev.preventDefault();
        setDrag((d) => (d ? { ...d, x: ev.clientX, y: ev.clientY } : d));
        updateHover(ev.clientX, ev.clientY);
      }
    };
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      finishDrag();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
  };

  // Toque: segurar ~0,35s e arrastar (rolar a tela continua funcionando)
  const startTouchDrag = (e: React.TouchEvent, item: UnifiedCalendarItem) => {
    if (!isMovable(item) || e.touches.length !== 1) return;
    if ((e.target as HTMLElement).closest('button')) return;
    const t = e.touches[0];
    pendingRef.current = { item, x: t.clientX, y: t.clientY, started: false };
    pendingRef.current.timer = window.setTimeout(() => {
      const p = pendingRef.current;
      if (p) beginDrag(p.x, p.y);
    }, 350);
    const move = (ev: TouchEvent) => {
      const p = pendingRef.current;
      if (!p) return;
      const tt = ev.touches[0];
      if (!p.started) {
        if (Math.hypot(tt.clientX - p.x, tt.clientY - p.y) > 10) {
          // é rolagem: cancela o arrastar
          cleanup();
          pendingRef.current = null;
          if (p.timer) window.clearTimeout(p.timer);
        }
        return;
      }
      ev.preventDefault();
      setDrag((d) => (d ? { ...d, x: tt.clientX, y: tt.clientY } : d));
      updateHover(tt.clientX, tt.clientY);
    };
    const end = () => {
      cleanup();
      finishDrag();
    };
    const cleanup = () => {
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', end);
      window.removeEventListener('touchcancel', end);
    };
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', end);
    window.addEventListener('touchcancel', end);
  };

  useEffect(() => () => {
    if (pendingRef.current?.timer) window.clearTimeout(pendingRef.current.timer);
    if (autoScrollRef.current) window.clearInterval(autoScrollRef.current);
  }, []);

  // Generate unified items for a specific day of the week
  const getItemsForDay = (dayInfo: { dateStr: string; dayNum: number }, opts?: { noFilter?: boolean }) => {
    const items: UnifiedCalendarItem[] = [];

    // 1. Schedule Classes & Commitments (Recurring by dayOfWeek or matches day)
    schedule
      .filter((s) => occursOn(s, dayInfo.dateStr, dayInfo.dayNum))
      .forEach((sc) => {
        const sub = getSubject(sc.subjectId);
        const cat = getActivityCategory(sc);
        const mainTitle = sc.title || sub?.universitySubject || sub?.name || cat.label;
        const badgeColor: UnifiedCalendarItem['badgeColor'] =
          cat.id === 'aula' ? 'amber' : cat.id === 'plantao' ? 'rose' : cat.id === 'estudo' ? 'blue' : cat.id === 'academia' || cat.id === 'liga' ? 'emerald' : 'purple';

        items.push({
          id: `sc-${sc.id}`,
          sourceType: 'schedule',
          time: sc.startTime || '--:--',
          badge: cat.label.split(' ')[0].toUpperCase(),
          badgeColor,
          title: mainTitle,
          subtitle: sc.endTime ? `${sc.startTime}–${sc.endTime}` : undefined,
          locationOrRoom: sc.location || sc.room,
          bottomLeftLabel: sc.date ? 'Data única' : 'Toda semana',
          bottomLeftIcon: sc.date ? 'calendar' : 'repeat',
          statusLabel: sc.isCompleted ? 'Concluído' : 'Pendente',
          isCompleted: !!sc.isCompleted,
          subject: sub,
          accentColor: sc.color || cat.color,
          originalData: sc,
        });
      });

    // 2. Provas da Grade de Semestre nesta data
    exams
      .filter((e) => e.date === dayInfo.dateStr)
      .forEach((exam) => {
        const kind = getExamKind(exam.type);
        const shift = getExamShift(exam);

        items.push({
          id: `exam-${exam.id}`,
          sourceType: 'exam',
          time: exam.time || '--:--',
          badge: kind.short,
          badgeColor: 'rose',
          title: getExamSubjectName(exam, subjects),
          subtitle: [exam.title, shift ? `${shift.emoji} ${shift.label}` : ''].filter(Boolean).join(' · '),
          locationOrRoom: exam.location,
          bottomLeftLabel: exam.expectedGrade !== undefined ? `Meta: ${exam.expectedGrade.toFixed(1)}` : 'Prova',
          bottomLeftIcon: 'exam',
          statusLabel: exam.grade !== undefined ? `Nota: ${exam.grade.toFixed(1)}` : 'Pendente',
          isCompleted: exam.grade !== undefined,
          accentColor: kind.color,
          originalData: exam,
        });
      });

    // 2b. Itens do Checklist com data
    checklist
      .filter((i) => i.dueDate === dayInfo.dateStr)
      .forEach((task) => {
        const block = checklistBlocks.find((b) => b.id === task.blockId);
        items.push({
          id: `task-${task.id}`,
          sourceType: 'task',
          time: '--:--',
          badge: task.important ? '★ TAREFA' : 'TAREFA',
          badgeColor: 'emerald',
          title: task.text,
          subtitle: block ? `${block.emoji || ''} ${block.name}`.trim() : 'Checklist',
          bottomLeftLabel: 'Checklist',
          bottomLeftIcon: 'calendar',
          statusLabel: task.done ? 'Feito' : 'Pendente',
          isCompleted: task.done,
          accentColor: block?.color,
          originalData: task,
        });
      });

    // 3a. Blocos em estudo (D0): um card por bloco, com a % de tópicos vistos.
    // O D0 que passou da data sobe para hoje com selo neutro ("remarcado").
    const todayStr = formatToYMD(new Date());
    const isTodayCol = dayInfo.dateStr === todayStr;
    topicBlocks
      .filter((bk) => {
        if (bk.reviewStatus !== 'estudando') return false;
        const sd = studyDateOf(bk);
        return !!sd && (sd === dayInfo.dateStr || (isTodayCol && sd < todayStr));
      })
      .forEach((bk) => {
        const sub = getSubject(bk.subjectId);
        const list = topics.filter((t) => t.blockId === bk.id);
        const seen = list.filter(isTopicSeen).length;
        const pct = list.length ? Math.round((seen / list.length) * 100) : 0;
        const sd = studyDateOf(bk)!;
        const late = sd < dayInfo.dateStr;
        items.push({
          id: `blockstudy-${bk.id}`,
          sourceType: 'blockstudy',
          time: '--:--',
          badge: late ? 'D0 · remarcado' : 'D0',
          badgeColor: 'blue',
          title: bk.name,
          subtitle: sub?.universitySubject || sub?.name,
          bottomLeftLabel: late ? `Estava para ${formatDM(sd)} · ${seen}/${list.length} tópicos` : `${seen}/${list.length} tópicos`,
          bottomLeftIcon: 'brain',
          statusLabel: `${pct}%`,
          progressPercent: pct,
          isCompleted: false,
          isFirstContact: true,
          subject: sub,
          accentColor: sub?.color || '#6366f1',
          originalData: bk,
        });
      });

    // 3b. 1º contato agendado para este dia (tópicos soltos, fora de um bloco em estudo)
    topics
      .filter(
        (t) =>
          t.scheduleFirstContact &&
          !!t.firstContactDate &&
          (t.firstContactDate === dayInfo.dateStr || (isTodayCol && t.firstContactDate < todayStr)) &&
          t.status === 'nao_iniciado' &&
          !t.cabide &&
          !topicBlocks.some((bk) => bk.id === t.blockId && bk.reviewStatus === 'estudando')
      )
      .forEach((topic) => {
        const sub = getSubject(topic.subjectId);
        const block = topicBlocks.find((bk) => bk.id === topic.blockId);
        const late = (topic.firstContactDate || '') < dayInfo.dateStr;
        items.push({
          id: `topic-${topic.id}`,
          sourceType: 'topic',
          time: topic.studyTime || '--:--',
          badge: late ? '1º CONTATO · remarcado' : '1º CONTATO',
          badgeColor: 'blue',
          title: topic.title,
          subtitle: block?.name || sub?.universitySubject || sub?.name,
          bottomLeftLabel: late ? `Estava para ${formatDM(topic.firstContactDate)}` : '1º Contato',
          bottomLeftIcon: 'brain',
          statusLabel: 'A estudar',
          isCompleted: false,
          isFirstContact: true,
          subject: sub,
          originalData: topic,
        });
      });

    // 4. Revisões de bloco com a técnica da etapa (as atrasadas sobem para hoje como "remarcada")
    topicBlocks
      .filter(
        (bk) =>
          bk.reviewStatus === 'revisao' &&
          !!bk.nextReviewDate &&
          subjects.some((s) => s.id === bk.subjectId) &&
          (bk.nextReviewDate === dayInfo.dateStr || (isTodayCol && bk.nextReviewDate < todayStr))
      )
      .forEach((bk) => {
        const sub = getSubject(bk.subjectId);
        const tech = reviewTechnique(bk, sub?.format);
        const day = cycleDay(bk, bk.nextReviewDate);
        const late = !!bk.nextReviewDate && bk.nextReviewDate < dayInfo.dateStr;
        items.push({
          id: `block-${bk.id}`,
          sourceType: 'block',
          time: '--:--',
          badge: late ? `R${tech.reviewNumber} · remarcada` : `R${tech.reviewNumber}${bk.star ? ' ⭐' : ''}`,
          badgeColor: 'blue',
          title: `${tech.emoji} ${tech.short}: ${bk.name}`,
          subtitle: `${sub?.universitySubject || sub?.name || 'Bloco'} · ${tech.label}`,
          bottomLeftLabel: late ? `${tech.short} · desde ${formatDM(bk.nextReviewDate)}` : `${tech.badge}${day !== undefined ? ` · Dia ${day}` : ''}`,
          bottomLeftIcon: 'brain',
          statusLabel: `${Math.round(((bk.reviewsDone % BLOCK_REVIEWS_TO_MASTER) / BLOCK_REVIEWS_TO_MASTER) * 100)}%`,
          progressPercent: Math.round(((bk.reviewsDone % BLOCK_REVIEWS_TO_MASTER) / BLOCK_REVIEWS_TO_MASTER) * 100),
          isCompleted: false,
          subject: sub,
          accentColor: tech.color,
          originalData: bk,
        });
      });

    // Sort items by time (e.g. 08:00, 14:00, 18:30, --:--)
    return items
      .filter((item) => {
        if (opts?.noFilter) return true;
        // Filter by category
        const isClass = item.sourceType === 'schedule' && getActivityCategory(item.originalData as ScheduleClass).id === 'aula';
        if (filterType === 'classes' && !isClass) {
          return false;
        }
        if (filterType === 'personal' && (isClass || (item.sourceType !== 'schedule' && item.sourceType !== 'task'))) {
          return false;
        }
        if (filterType === 'exams' && item.sourceType !== 'exam') {
          return false;
        }
        if (filterType === 'reviews' && item.sourceType !== 'topic' && item.sourceType !== 'block' && item.sourceType !== 'blockstudy') {
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
    } else if (item.sourceType === 'task') {
      toggleChecklistItem((item.originalData as ChecklistItem).id);
    } else if (item.sourceType === 'block') {
      // A revisão do bloco é feita na aba Revisões (técnica da etapa + avaliação), já no card do bloco
      const bk = item.originalData as TopicBlock;
      openReviews({ blockId: bk.id, tab: bk.nextReviewDate && bk.nextReviewDate <= formatToYMD(new Date()) ? 'hoje' : 'agenda' });
    } else if (item.sourceType === 'blockstudy') {
      setCurrentTab('structure');
    } else if (item.sourceType === 'topic') {
      const top = item.originalData as Topic;
      // 1º contato → Visto; revisão agendada → conclui a revisão (dominado após a 4ª)
      if (top.status === 'nao_iniciado') markTopicSeen(top.id);
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
      else if (item.sourceType === 'schedule' || item.sourceType === 'task') classes++;
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
      reviewsCount += items.filter((i) => i.sourceType === 'topic' || i.sourceType === 'block' || i.sourceType === 'blockstudy').length;
    });

    return { totalItems, completedItems, examsCount, reviewsCount };
  }, [rangeDays, schedule, exams, topics, topicBlocks, subjects, checklist, checklistBlocks, filterType, searchQuery]);

  // Item card shared by the weekly columns (compact) and the daily board
  const renderItemCard = (item: UnifiedCalendarItem, compact = false) => (
    <div
      key={item.id}
      data-planner-item={item.id}
      onClick={() => {
        if (suppressClickRef.current) return;
        setSelectedItem(item);
      }}
      onPointerDown={(e) => startDrag(e, item)}
      onTouchStart={(e) => startTouchDrag(e, item)}
      onContextMenu={(e) => isMovable(item) && e.preventDefault()}
      style={isMovable(item) ? { WebkitTouchCallout: 'none' } : undefined}
      title={isMovable(item) ? 'Clique para detalhes · arraste para outro dia' : undefined}
      className={`group relative min-w-0 rounded-2xl border transition-all select-none ${isMovable(item) ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${
        drag?.item.id === item.id ? 'opacity-40 ring-2 ring-sky-500/60' : ''
      } ${compact ? 'p-2' : 'p-3'} ${
        item.isCompleted
          ? 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/50 opacity-65 hover:opacity-100'
          : 'bg-slate-50 dark:bg-slate-950/80 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-950 shadow-xs'
      }`}
    >
      {item.accentColor && (
        <span className="absolute left-0 top-2.5 bottom-2.5 w-1 rounded-r-full" style={{ backgroundColor: item.accentColor }} />
      )}
      {/* Top Line: Time on Left, Badge on Right */}
      <div className="flex items-center justify-between gap-1 mb-1.5">
        <span className="text-[11px] font-mono font-bold text-slate-600 dark:text-slate-300 flex items-center gap-1">
          <Clock className="h-3 w-3 text-slate-500 dark:text-slate-400" />
          {item.time}
        </span>

        {/* Pill Badge */}
        <span
          className={`text-[9px] font-black px-2 py-0.5 rounded-md border tracking-wider uppercase truncate max-w-[70%] ${BADGE_CLS[item.badgeColor]}`}
        >
          {item.badge}
        </span>
      </div>

      {/* Middle: Prominent Title */}
      <h3
        className={`font-black text-slate-900 dark:text-white leading-snug line-clamp-2 uppercase tracking-tight break-words ${
          compact ? 'text-[11px]' : 'text-xs'
        }`}
      >
        {item.title}
      </h3>

      {/* Optional Subtitle / Room */}
      {(item.subtitle || item.locationOrRoom) && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-1 min-w-0">
          {item.locationOrRoom && <MapPin className="h-2.5 w-2.5 shrink-0" />}
          <span className="truncate">{item.subtitle || item.locationOrRoom}</span>
        </p>
      )}

      {/* Blocos (D0 / revisões): % de conclusão com barra */}
      {item.progressPercent !== undefined && (item.sourceType === 'block' || item.sourceType === 'blockstudy') ? (
        <div className="mt-2">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">{item.bottomLeftLabel}</span>
            <span className="text-sm font-black text-slate-900 dark:text-white shrink-0">{item.progressPercent}%</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${Math.max(item.progressPercent, 2)}%`, backgroundColor: item.accentColor || '#0ea5e9' }}
            />
          </div>
        </div>
      ) : (
      /* Bottom Line: Recurrence/Type and Status (stacked in the narrow weekly columns) */
      <div
        className={`border-t border-slate-200 dark:border-slate-800/60 flex text-[10px] ${
          compact ? 'mt-2 pt-1.5 flex-col items-start gap-1' : 'mt-2.5 pt-2 items-center justify-between gap-2'
        }`}
      >
        <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400 font-medium min-w-0">
          {item.bottomLeftIcon === 'repeat' && <Repeat className="h-3 w-3 text-slate-500 dark:text-slate-400 shrink-0" />}
          {item.bottomLeftIcon === 'brain' && <Brain className="h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />}
          {item.bottomLeftIcon === 'exam' && <GraduationCap className="h-3 w-3 text-rose-600 dark:text-rose-400 shrink-0" />}
          <span className="truncate">{item.bottomLeftLabel}</span>
        </div>

        <button
          type="button"
          onClick={(e) => handleToggleItemStatus(item, e)}
          className={`flex items-center gap-1 font-bold transition-colors shrink-0 ${
            item.isCompleted
              ? 'text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300'
              : item.sourceType === 'exam'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300'
          }`}
        >
          {item.isCompleted ? <CheckCircle2 className="h-3 w-3" /> : <AlertCircle className="h-3 w-3" />}
          <span>{item.statusLabel}</span>
        </button>
      </div>
      )}
    </div>
  );

  return (
    <div className="space-y-5 pb-16 max-w-full">
      {/* Top Header & Navigation Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3 sm:gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-8 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarDays className="h-6 w-6 text-sky-600 dark:text-sky-400" />
              <span>Planner</span>
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/15 dark:text-sky-300 dark:border-sky-500/30">
              {VIEW_LABELS[viewMode].title}
            </span>
            {isCurrentLiveWeek && viewMode !== 'today' && (
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                {VIEW_LABELS[viewMode].live}
              </span>
            )}
          </div>
          <p className="hidden sm:block text-sm text-slate-500 dark:text-slate-400 mt-1">
            {viewMode === 'today'
              ? 'O que fazer agora, na ordem certa: revisões primeiro, depois questões e conteúdo novo.'
              : 'Seu dia, semana e mês em um só lugar: aulas, provas, revisões, estudos e tudo o que você quiser adicionar.'}
          </p>
          {/* Atalhos do método */}
          <div className="mt-2 sm:mt-3 flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              id="planner-plan-week-btn"
              onClick={() => setWeekPlanOpen(true)}
              className="min-h-[40px] px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black inline-flex items-center gap-1.5 shadow-xs"
            >
              <CalendarRange className="h-4 w-4" /> Planejar semana
            </button>
            <button
              type="button"
              id="planner-routine-btn"
              onClick={() => setRoutineOpen('full')}
              className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-600 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Settings2 className="h-4 w-4 text-sky-600 dark:text-sky-400" /><span className="sm:hidden">Rotina</span><span className="hidden sm:inline">Minha rotina</span>
            </button>
            <button
              type="button"
              id="planner-how-btn"
              aria-label="Como funciona?"
              title="Como funciona?"
              onClick={() => openMethodGuide(4)}
              className="min-h-[40px] min-w-[40px] justify-center px-2.5 sm:px-3 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <HelpCircle className="h-4 w-4" /><span className="hidden sm:inline">Como funciona?</span>
            </button>
          </div>
        </div>

        {/* Action Controls & Navigation Buttons */}
        <div className="relative z-10 flex items-center gap-2.5 flex-wrap">
          {/* View Mode Switcher (Hoje / Dia / Semana / Mês) */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-inner">
            {([
              { mode: 'today', label: 'Hoje' },
              { mode: 'weekly', label: 'Semana' },
              { mode: 'monthly', label: 'Mês' },
            ] as const).map(({ mode, label }) => (
              <button
                key={mode}
                id={`calendar-view-${mode}`}
                onClick={() => setViewMode(mode)}
                aria-pressed={viewMode === mode}
                className={`min-h-[36px] px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${
                  viewMode === mode
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Period Paging Buttons */}
          {viewMode !== 'today' && (
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl p-1 shadow-inner">
            <button
              onClick={() => shiftPeriod(-1)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={VIEW_LABELS[viewMode].prev}
              aria-label={VIEW_LABELS[viewMode].prev}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>

            <button
              onClick={jumpToToday}
              className="px-3 py-1.5 rounded-xl text-xs font-black text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Hoje
            </button>

            <button
              onClick={() => shiftPeriod(1)}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title={VIEW_LABELS[viewMode].next}
              aria-label={VIEW_LABELS[viewMode].next}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          )}

          {/* Quick Add Menu (no Hoje do celular fica só o "Adicionar na agenda de hoje" mais abaixo) */}
          <div className={`items-center gap-1.5 ${viewMode === 'today' ? 'hidden sm:flex' : 'flex'}`}>
            {onOpenAddSchedule && (
              <button
                onClick={() => onOpenAddSchedule((viewMode === 'today' ? todayInfo : activeDay).dayNum, (viewMode === 'today' ? todayInfo : activeDay).dateStr)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs font-bold border border-slate-300 dark:border-slate-700 transition-all shadow-xs"
              >
                <Plus className="h-3.5 w-3.5 text-amber-500" />
                <span>+ Atividade</span>
              </button>
            )}

            {onOpenAddExam && (
              <button
                onClick={() => onOpenAddExam(viewMode === 'daily' ? activeDay.dateStr : viewMode === 'today' ? todayInfo.dateStr : undefined)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>+ Prova</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Week Title & Filter Toolbar */}
      {viewMode !== 'today' && (
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-3 shadow-xs">
        {/* Range Label */}
        <div className="flex items-center gap-2 px-1">
          <div className="h-2 w-2 rounded-full bg-sky-500" />
          <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
            {weekRangeLabel}
          </span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">
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
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Tudo ({weeklyStats.totalItems})
          </button>
          <button
            onClick={() => setFilterType('classes')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterType === 'classes'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Aulas
          </button>
          <button
            onClick={() => setFilterType('personal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterType === 'personal'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Atividades & tarefas
          </button>
          <button
            onClick={() => setFilterType('reviews')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterType === 'reviews'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Revisões Espaçadas ({weeklyStats.reviewsCount})
          </button>
          <button
            onClick={() => setFilterType('exams')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filterType === 'exams'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Avaliações ({weeklyStats.examsCount})
          </button>
        </div>
      </div>
      )}

      {/* TODAY: plano do dia + checklist + agenda (2 colunas no desktop, empilhado no celular) */}
      {viewMode === 'today' && (() => {
        const agenda = getItemsForDay(todayInfo, { noFilter: true }).filter((i) => i.sourceType === 'schedule' || i.sourceType === 'exam' || i.sourceType === 'task');
        return (
          <div id="planner-today-view" className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] gap-4 items-start">
            <div className="min-w-0">
              <TodayPlanPanel onOpenWeekPlan={() => setWeekPlanOpen(true)} />
            </div>
            <div className="min-w-0 space-y-3 lg:sticky lg:top-4">
              {/* Agenda do dia: aulas, provas e tarefas com data */}
              <div id="planner-today-agenda" className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
                <button
                  type="button"
                  onClick={() => setAgendaOpen((o) => !o)}
                  aria-expanded={agendaOpen}
                  className="w-full min-h-[52px] flex items-center justify-between gap-2 p-4 text-left"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="h-9 w-9 shrink-0 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center">
                      <CalendarDays className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-black text-slate-900 dark:text-white">Agenda de hoje</span>
                      <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">Aulas, provas e tarefas com data</span>
                    </span>
                  </span>
                  <span className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30">
                      {agenda.length}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${agendaOpen ? 'rotate-180' : ''}`} />
                  </span>
                </button>
                {agendaOpen && (
                  <div className="px-3 pb-3 space-y-1.5">
                    {agenda.length === 0 ? (
                      <p className="px-1 pb-1 text-xs text-slate-500 dark:text-slate-400">Nada na agenda hoje. Bom dia para seguir o plano com calma.</p>
                    ) : (
                      agenda.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedItem(item)}
                          className={`w-full min-h-[48px] flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-3 py-2 text-left hover:border-slate-300 dark:hover:border-slate-700 transition-colors ${
                            item.isCompleted ? 'opacity-60' : ''
                          }`}
                        >
                          <span className="h-8 w-1 rounded-full shrink-0" style={{ backgroundColor: item.accentColor || '#94a3b8' }} />
                          <span className="w-11 shrink-0 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">{item.time === '--:--' ? '—' : item.time}</span>
                          <span className="min-w-0 flex-1">
                            <span className={`block text-[13px] font-bold truncate ${item.isCompleted ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
                              {item.title}
                            </span>
                            {(item.subtitle || item.locationOrRoom) && (
                              <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.subtitle || item.locationOrRoom}</span>
                            )}
                          </span>
                          <span className={`shrink-0 text-[9px] font-black px-1.5 py-0.5 rounded-md border uppercase ${BADGE_CLS[item.badgeColor]}`}>{item.badge}</span>
                        </button>
                      ))
                    )}
                    {onOpenAddSchedule && (
                      <button
                        type="button"
                        onClick={() => onOpenAddSchedule(todayInfo.dayNum, todayInfo.dateStr)}
                        className="w-full min-h-[40px] rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center justify-center gap-1.5"
                      >
                        <Plus className="h-3.5 w-3.5" /> Adicionar na agenda de hoje
                      </button>
                    )}
                  </div>
                )}
              </div>

              <DailyHabitsCard collapsible defaultOpen={typeof window !== 'undefined' && !!window.matchMedia?.('(min-width: 1024px)').matches} />
            </div>
          </div>
        );
      })()}

      {/* Card sendo arrastado */}
      {drag && (
        <div
          id="planner-drag-ghost"
          className="fixed z-[100] pointer-events-none w-44 rounded-2xl border border-sky-400/60 bg-white dark:bg-slate-900/95 p-2.5 shadow-2xl shadow-sky-950/60 rotate-3"
          style={{ left: drag.x - 40, top: drag.y - 24 }}
        >
          <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase line-clamp-2">{drag.item.title}</p>
          <div className="mt-1 flex items-center justify-between">
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40">{drag.item.badge}</span>
            <span className="text-[10px] font-bold text-sky-700 dark:text-sky-300">{dropDate ? `→ ${formatDM(dropDate)}` : 'solte num dia'}</span>
          </div>
        </div>
      )}

      {(viewMode === 'weekly' || viewMode === 'monthly') && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-2 px-1">
          💡 Não conseguiu fazer? <strong className="text-slate-600 dark:text-slate-300">Arraste o card</strong> para outro dia (no celular, segure o card e arraste) ou toque nele e use “Mover para”.
        </p>
      )}

      {/* 7-COLUMN WEEKLY BOARD */}
      {viewMode === 'weekly' && (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-2.5 items-stretch">
        {weekDays.map((day) => {
          const dayItems = getItemsForDay(day);

          return (
            <div
              key={day.dateStr}
              data-drop-date={day.dateStr}
              className={`flex flex-col min-w-0 min-h-[150px] sm:min-h-[360px] rounded-2xl border transition-all ${
                dropDate === day.dateStr && drag ? '!border-sky-400 !bg-sky-950/40 ring-2 ring-sky-400/60 scale-[1.01]' : ''
              } ${
                day.isToday
                  ? 'bg-white dark:bg-slate-900/95 border-sky-500/50 shadow-lg shadow-sky-950/40 ring-1 ring-sky-500/30'
                  : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800/80 hover:border-slate-300 dark:hover:border-slate-700 shadow-md'
              } p-2 relative overflow-hidden`}
            >
              {/* Day Column Header */}
              <div className="pb-2 mb-2 px-1 border-b border-slate-200 dark:border-slate-800/80">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black text-slate-500 dark:text-slate-400 tracking-wider uppercase">
                    {day.name}
                  </span>

                  {day.isToday && (
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40 uppercase">
                      Hoje
                    </span>
                  )}
                </div>

                <div className="mt-0.5 flex items-baseline justify-between">
                  <span
                    className={`text-2xl font-black ${
                      day.isToday ? 'text-sky-600 dark:text-sky-400' : 'text-slate-900 dark:text-white'
                    }`}
                  >
                    {day.dayNumber}
                  </span>

                  <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {dayItems.length} {dayItems.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>

                {/* Tipo do dia + carga de estudo (revisões e temas × capacidade) */}
                {(() => {
                  const load = weekLoadByDate.get(day.dateStr);
                  if (!load) return null;
                  const kindInfo = DAY_KIND_INFO[load.dayKind];
                  const past = day.dateStr < todayInfo.dateStr;
                  const pctLoad = load.capacity > 0 ? Math.min(100, Math.round((load.demand / load.capacity) * 100)) : 0;
                  return (
                    <div className="mt-1.5 space-y-1" data-planner-load={day.dateStr}>
                      {load.dayKind !== 'normal' && (
                        <span className={`inline-flex max-w-full items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${kindInfo.cls}`}>
                          <span aria-hidden>{kindInfo.emoji}</span>
                          <span className="truncate">{kindInfo.label}</span>
                        </span>
                      )}
                      {!past && (
                        <div title={`Estudo previsto: ${blocksToHours(load.demand)} de ${blocksToHours(load.capacity)} · ${load.reviews} revisões · ${load.newTopics} temas novos`}>
                          <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${load.overloaded ? 'bg-amber-500' : 'bg-sky-500'}`}
                              style={{ width: `${load.demand > 0 ? Math.max(pctLoad, 6) : 0}%` }}
                            />
                          </div>
                          <p className={`mt-0.5 text-[9px] font-bold ${load.overloaded ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'}`}>
                            {load.overloaded ? 'Dia cheio · ' : ''}
                            {blocksToHours(load.demand)}/{blocksToHours(load.capacity)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Day Items List */}
              <div className="flex-1 space-y-2">
                {dayItems.length === 0 ? (
                  <div className="h-28 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-xl flex flex-col items-center justify-center p-2 text-center bg-slate-50 dark:bg-slate-950/20">
                    <CalendarIcon className="h-6 w-6 text-slate-700 mb-1.5" />
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">Livre</p>
                    <button
                      onClick={() => onOpenAddSchedule && onOpenAddSchedule(day.dayNum, day.dateStr)}
                      className="mt-2 text-[10px] font-bold text-sky-700 dark:text-sky-400 hover:text-sky-800 dark:hover:text-sky-300 transition-colors"
                    >
                      + Adicionar
                    </button>
                  </div>
                ) : (
                  dayItems.map((item) => renderItemCard(item, true))
                )}
              </div>

              {/* Column Footer Quick Add */}
              <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenAddSchedule && onOpenAddSchedule(day.dayNum, day.dateStr)}
                  title={`Adicionar na ${day.short}`}
                  className="w-full py-1.5 px-2 rounded-xl bg-slate-50 dark:bg-slate-950/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800/70 text-[10px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center justify-center gap-1 whitespace-nowrap"
                >
                  <Plus className="h-3 w-3 text-sky-600 dark:text-sky-400 shrink-0" />
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
          { label: 'Revisões espaçadas', value: summary.reviews, icon: <Repeat className="h-4 w-4" />, color: 'text-sky-700 dark:text-sky-400 bg-sky-500/10 border-sky-500/30' },
          { label: '1º contato', value: summary.firstContacts, icon: <Brain className="h-4 w-4" />, color: 'text-violet-700 dark:text-violet-400 bg-violet-500/10 border-violet-500/30' },
          { label: 'Avaliações', value: summary.exams, icon: <GraduationCap className="h-4 w-4" />, color: 'text-rose-700 dark:text-rose-400 bg-rose-500/10 border-rose-500/30' },
          { label: 'Aulas & atividades', value: summary.classes, icon: <BookOpen className="h-4 w-4" />, color: 'text-amber-700 dark:text-amber-400 bg-amber-500/10 border-amber-500/30' },
        ];

        return (
          <div
            id="calendar-daily-board"
            className={`rounded-3xl border p-4 sm:p-6 shadow-md ${
              activeDay.isToday
                ? 'bg-white dark:bg-slate-900/95 border-sky-500/50 ring-1 ring-sky-500/30'
                : 'bg-white dark:bg-slate-900/70 border-slate-200 dark:border-slate-800/80'
            }`}
          >
            {/* Day header */}
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800/80">
              <div className="flex items-baseline gap-3">
                <span className={`text-5xl font-black ${activeDay.isToday ? 'text-sky-600 dark:text-sky-400' : 'text-slate-900 dark:text-white'}`}>
                  {activeDay.dayNumber}
                </span>
                <div>
                  <p className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wide">{activeDay.long}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {MONTH_NAMES[activeDay.date.getMonth()]} de {activeDay.date.getFullYear()} • {dayItems.length}{' '}
                    {dayItems.length === 1 ? 'atividade' : 'atividades'} ({summary.completed} concluídas)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onOpenAddSchedule && onOpenAddSchedule(activeDay.dayNum, activeDay.dateStr)}
                className="self-start sm:self-auto flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white transition-colors"
              >
                <Plus className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                <span>Adicionar neste dia</span>
              </button>
            </div>

            {/* Summary tiles */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-5">
              {summaryTiles.map((tile) => (
                <div key={tile.label} className={`rounded-2xl border p-3 flex items-center gap-3 ${tile.color}`}>
                  {tile.icon}
                  <div>
                    <p className="text-xl font-black text-slate-900 dark:text-white leading-none">{tile.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wide mt-1">{tile.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Activities (ordered by time) */}
            {dayItems.length === 0 ? (
              <div className="h-48 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-950/20">
                <CalendarIcon className="h-7 w-7 text-slate-700 mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Nenhuma atividade neste dia.</p>
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
        <div id="calendar-monthly-board" className="rounded-3xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/70 p-3 sm:p-4 shadow-md">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-2">
            {DAY_NAMES.map((d) => (
              <div key={d.dayNum} className="text-center text-[10px] sm:text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
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
                  data-drop-date={cell.dateStr}
                  onClick={() => openDay(cell.date)}
                  title={`Abrir ${cell.long}, ${cell.dayNumber}/${cell.monthNumber}`}
                  className={`min-h-[92px] sm:min-h-[128px] rounded-xl sm:rounded-2xl border p-1.5 sm:p-2 text-left flex flex-col gap-1 transition-all hover:border-sky-500/60 ${
                    dropDate === cell.dateStr && drag ? 'ring-2 ring-sky-400' : ''
                  } ${
                    cell.isToday
                      ? 'border-sky-500/60 bg-sky-50 dark:bg-sky-950/30 ring-1 ring-sky-500/30'
                      : cell.inMonth
                      ? 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60'
                      : 'border-slate-200 dark:border-slate-900 bg-slate-50 dark:bg-slate-950/20 opacity-45'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-xs sm:text-sm font-black ${cell.isToday ? 'text-sky-600 dark:text-sky-400' : 'text-slate-800 dark:text-white'}`}>
                      {cell.dayNumber}
                    </span>
                    {cellItems.length > 0 && (
                      <span className="text-[9px] font-bold text-slate-500 dark:text-slate-400">{cellItems.length}</span>
                    )}
                  </div>

                  {/* Category counters */}
                  <div className="flex flex-wrap gap-0.5 sm:gap-1">
                    {s.reviews > 0 && (
                      <span className="text-[9px] font-black px-1 sm:px-1.5 rounded bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300" title="Revisões espaçadas">
                        {s.reviews} rev
                      </span>
                    )}
                    {s.firstContacts > 0 && (
                      <span className="text-[9px] font-black px-1 sm:px-1.5 rounded bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300" title="Estudos de 1º contato">
                        {s.firstContacts} 1º
                      </span>
                    )}
                    {s.exams > 0 && (
                      <span className="text-[9px] font-black px-1 sm:px-1.5 rounded bg-rose-100 text-rose-800 dark:bg-rose-500/15 dark:text-rose-300" title="Avaliações">
                        {s.exams} prova{s.exams > 1 ? 's' : ''}
                      </span>
                    )}
                    {s.classes > 0 && (
                      <span className="text-[9px] font-black px-1 sm:px-1.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300" title="Aulas & atividades">
                        {s.classes} ativ.
                      </span>
                    )}
                  </div>

                  {/* Subjects summary (hidden on very small screens) */}
                  <div className="hidden sm:flex flex-col gap-0.5 mt-auto">
                    {subjectLines.slice(0, 3).map((line) => (
                      <span
                        key={`${line.kind}-${line.label}`}
                        className="text-[10px] text-slate-600 dark:text-slate-300 truncate flex items-center gap-1"
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
          <div className="flex flex-wrap items-center gap-3 mt-3 px-1 text-[10px] text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-sky-400" />Revisão espaçada</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-violet-400" />1º contato</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-rose-400" />Avaliação</span>
            <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-amber-400" />Aulas & atividades</span>
            <span className="ml-auto">Clique em um dia para ver todas as atividades</span>
          </div>
        </div>
      )}

      {/* Selected Item Detail & Quick Actions Modal */}
      {selectedItem && (
        <div className="app-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/80 backdrop-blur-xs animate-in fade-in">
          <div className="app-modal-panel relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div
                  className={`p-2.5 rounded-2xl ${
                    selectedItem.badgeColor === 'amber'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      : selectedItem.badgeColor === 'blue'
                      ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400'
                      : selectedItem.badgeColor === 'rose'
                      ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400'
                  }`}
                >
                  {selectedItem.sourceType === 'schedule' && <Clock className="h-5 w-5" />}
                  {(selectedItem.sourceType === 'topic' || selectedItem.sourceType === 'block' || selectedItem.sourceType === 'blockstudy') && <Brain className="h-5 w-5" />}
                  {selectedItem.sourceType === 'exam' && <GraduationCap className="h-5 w-5" />}
                  {selectedItem.sourceType === 'task' && <Check className="h-5 w-5" />}
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                      {selectedItem.badge}
                    </span>
                    <span className="text-xs font-mono text-slate-500 dark:text-slate-400">
                      Horário: {selectedItem.time}
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white mt-1">
                    {selectedItem.title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              {selectedItem.subtitle && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">
                    {selectedItem.sourceType === 'schedule' ? 'Horário:' : selectedItem.sourceType === 'task' ? 'Bloco:' : 'Detalhes:'}
                  </span>
                  <span className="font-bold text-slate-900 dark:text-white text-right">{selectedItem.subtitle}</span>
                </div>
              )}

              {selectedItem.locationOrRoom && (
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Sala / Local:</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedItem.locationOrRoom}</span>
                </div>
              )}

              <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 flex items-center justify-between">
                <span className="text-slate-500 dark:text-slate-400">Status Atual:</span>
                <span
                  className={`font-black ${
                    selectedItem.isCompleted ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'
                  }`}
                >
                  {selectedItem.statusLabel}
                </span>
              </div>
            </div>

            {isMovable(selectedItem) && (
              <div id="planner-move-to" className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 space-y-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Não deu hoje? Mover para</p>
                <div className="flex flex-wrap items-center gap-1.5">
                  {quickMoveTargets().map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      onClick={() => {
                        moveItemToDate(selectedItem, t.date);
                        setSelectedItem(null);
                      }}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:bg-sky-600 hover:text-white transition-colors"
                    >
                      {t.label}
                    </button>
                  ))}
                  <DatePickerField
                    id="planner-move-date"
                    value=""
                    onChange={(v) => {
                      if (!v) return;
                      moveItemToDate(selectedItem, v);
                      setSelectedItem(null);
                    }}
                    placeholder="Outra data…"
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-200"
                  />
                </div>
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="pt-2 flex items-center justify-between gap-2 border-t border-slate-200 dark:border-slate-800">
              {/* Delete button */}
              <button
                type="button"
                onClick={() => {
                  if (selectedItem.sourceType === 'schedule') {
                    deleteScheduleClass((selectedItem.originalData as ScheduleClass).id);
                  } else if (selectedItem.sourceType === 'exam') {
                    deleteExam((selectedItem.originalData as Exam).id);
                  } else if (selectedItem.sourceType === 'task') {
                    deleteChecklistItem((selectedItem.originalData as ChecklistItem).id);
                    showNotification('Item removido do checklist.', 'info');
                  }
                  setSelectedItem(null);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Excluir</span>
              </button>

              <div className="flex items-center gap-2">
                {/* Start Study Timer button */}
                {(selectedItem.sourceType === 'topic' || selectedItem.subject) && (
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
                )}

                {/* Toggle Completed (provas são concluídas ao lançar a nota na Grade de Semestre) */}
                {selectedItem.sourceType === 'exam' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedItem(null);
                      setCurrentTab('grades');
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors"
                  >
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Abrir Avaliações</span>
                  </button>
                ) : (
                <button
                  type="button"
                  onClick={() => {
                    handleToggleItemStatus(selectedItem);
                    setSelectedItem(null);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>{selectedItem.sourceType === 'block' ? 'Revisar agora' : selectedItem.sourceType === 'blockstudy' ? 'Abrir bloco' : selectedItem.isCompleted ? 'Marcar Pendente' : 'Marcar Concluído'}</span>
                </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Janelas do método: planejar semana e minha rotina */}
      <WeeklyPlanModal open={weekPlanOpen} onClose={() => setWeekPlanOpen(false)} />
      <StudyRoutineModal open={routineOpen !== null} firstTime={routineOpen === 'first'} onClose={() => setRoutineOpen(null)} />
    </div>
  );
};
