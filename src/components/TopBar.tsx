import React, { useState, useEffect } from 'react';
import {
  Menu,
  Moon,
  Sun,
  Bell,
  X,
  Cloud,
  CloudOff,
  RefreshCw,
  Compass,
  Smartphone,
  Repeat,
  NotebookPen,
  GraduationCap,
  BookOpen,
  ChevronRight,
  Maximize2,
  Minimize2,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useSidebarCollapsed, useWideLayout } from '../hooks/useWideLayout';
import { useApp } from '../context/AppContext';
import TooltipGroup from './shared/TooltipGroup';
import SquishSwitch from './shared/SquishSwitch';
import { NotificationBadge } from './shared/NotificationBadge';
import { GlobalSearch } from './GlobalSearch';
import { openInstallGuide, usePwaInstall } from '../lib/pwaInstall';
import { daysBetween, formatDM } from '../data/blockReview';
import { isErrorDue } from '../data/studyMethod';
import { examReminderText, examReminderToday } from '../data/examTopics';
import { todayYMD, useDueReviewCount } from '../hooks/useStudyPlan';

interface TopBarProps {
  onToggleMobileMenu: () => void;
  onOpenTour?: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMobileMenu, onOpenTour }) => {
  const [wideLayout, toggleWide] = useWideLayout();
  const [sidebarCollapsed, toggleSidebar] = useSidebarCollapsed();
  const { isInstalled: isAppInstalled } = usePwaInstall();
  const {
    setCurrentTab,
    isDarkMode,
    toggleDarkMode,
    exams,
    cloudSyncStatus,
    forceCloudSync,
    topicBlocks,
    studyMethod,
    openReviews,
    openMethodGuide,
    methodGuideSeen,
  } = useApp();

  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isTopBarPop, setIsTopBarPop] = useState(false);
  const prevTopBarSyncRef = React.useRef(cloudSyncStatus);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (
      cloudSyncStatus === 'synced' &&
      (prevTopBarSyncRef.current === 'offline' || prevTopBarSyncRef.current === 'syncing')
    ) {
      setIsTopBarPop(true);
      timer = setTimeout(() => {
        setIsTopBarPop(false);
      }, 1500);
    }
    prevTopBarSyncRef.current = cloudSyncStatus;
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [cloudSyncStatus]);

  // Notifications (datas locais)
  const today = todayYMD();
  const upcomingExamsList = exams
    .filter((e) => {
      if (!e.date || e.grade !== undefined) return false;
      const diffDays = daysBetween(today, e.date);
      return diffDays >= 0 && diffDays <= 10;
    })
    .sort((a, b) => a.date.localeCompare(b.date));
  const dueReviews = useDueReviewCount();
  const dueErrors = React.useMemo(
    () => (studyMethod.errorNotes || []).filter((n) => isErrorDue(n, today, topicBlocks)).length,
    [studyMethod.errorNotes, topicBlocks, today]
  );
  // Lembretes de prova: 30/15/7/3/1 dias antes, se o aluno ainda não começou os assuntos
  const examReminders = exams
    .map((e) => ({ e, left: examReminderToday(e, today) }))
    .filter((x) => x.left !== undefined)
    .map(({ e, left }) => ({ id: e.id, text: examReminderText(e, left as number) }));
  const hasAlerts = upcomingExamsList.length > 0 || dueReviews > 0 || dueErrors > 0 || examReminders.length > 0;
  // Número no selo do sino: provas próximas + revisões e erros para hoje + lembretes de prova
  const alertCount = upcomingExamsList.length + dueReviews + dueErrors + examReminders.length;
  const examWhen = (date: string) => {
    const d = daysBetween(today, date);
    return d === 0 ? 'hoje' : d === 1 ? 'amanhã' : `em ${d} dias · ${formatDM(date)}`;
  };
  const closeAnd = (fn: () => void) => () => {
    setIsNotificationsOpen(false);
    fn();
  };

  return (
    <header
      id="tour-topbar"
      className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-8 transition-colors shrink-0"
    >
      {/* Left section: Hamburger (mobile) + Search */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 mr-3">
        <button
          id="topbar-mobile-menu-btn"
          onClick={onToggleMobileMenu}
          className="rounded-xl p-2 bg-blue-600 text-white shadow-md shadow-blue-600/30 hover:bg-blue-700 lg:hidden shrink-0"
          aria-label="Abrir Menu Lateral"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Abre/recolhe a barra lateral (computador) */}
        <button
          id="sidebar-toggle-collapse-btn"
          type="button"
          onClick={toggleSidebar}
          aria-pressed={!sidebarCollapsed}
          aria-label={sidebarCollapsed ? 'Abrir barra lateral' : 'Recolher barra lateral'}
          title={sidebarCollapsed ? 'Abrir barra lateral' : 'Recolher barra lateral'}
          className="hidden lg:flex h-10 w-10 shrink-0 -mr-1 items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
        >
          {sidebarCollapsed ? <PanelLeftOpen className="h-[18px] w-[18px]" /> : <PanelLeftClose className="h-[18px] w-[18px]" />}
        </button>

        {/* Global Search Bar */}
        <GlobalSearch />
      </div>

      {/* Right section: Cloud Sync, Notifications & Dark Mode */}
      <TooltipGroup className="flex items-center gap-0.5 sm:gap-1 shrink-0" suppressed={isNotificationsOpen}>
        {/* Instalar como aplicativo (some quando já está instalado) */}
        {!isAppInstalled && (
          <button
            id="topbar-install-btn"
            type="button"
            onClick={openInstallGuide}
            className="relative h-10 shrink-0 flex items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
            aria-label="Instalar o MedAcademic como aplicativo"
            data-tooltip="Instalar como aplicativo"
          >
            <Smartphone className="h-4 w-4" />
            <span className="hidden md:inline">Instalar app</span>
          </button>
        )}

        {/* Notification Bell */}
        <div className="relative">
          <button
            id="topbar-notifications-btn"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
            aria-label={hasAlerts ? `Notificações: ${alertCount} aviso${alertCount === 1 ? '' : 's'}` : 'Notificações'}
            aria-expanded={isNotificationsOpen}
            data-tooltip={hasAlerts ? `${alertCount} aviso${alertCount === 1 ? '' : 's'}` : 'Avisos'}
          >
            <Bell className="h-4 w-4" />
            <NotificationBadge count={alertCount} />
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsNotificationsOpen(false)} aria-hidden="true" />
              <div
                id="topbar-notifications-dropdown"
                className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl z-50"
              >
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Lembretes de hoje</span>
                  <button
                    onClick={() => setIsNotificationsOpen(false)}
                    className="p-1.5 -m-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Fechar lembretes"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="py-2 space-y-2 max-h-[60vh] sm:max-h-80 overflow-y-auto">
                  {dueReviews > 0 && (
                    <button
                      type="button"
                      id="topbar-notif-reviews"
                      onClick={closeAnd(() => openReviews({ tab: 'hoje' }))}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/30 border border-sky-100 dark:border-sky-900/40 text-left hover:bg-sky-100/70 dark:hover:bg-sky-900/30 transition-colors"
                    >
                      <span className="p-1.5 rounded-lg bg-sky-600 text-white shrink-0">
                        <Repeat className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-sky-900 dark:text-sky-100">
                          {dueReviews} {dueReviews === 1 ? 'revisão' : 'revisões'} para hoje
                        </span>
                        <span className="block text-[11px] text-sky-800/80 dark:text-sky-300/80">Revisões vêm antes de conteúdo novo</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                    </button>
                  )}

                  {examReminders.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      id={`topbar-notif-exam-reminder-${r.id}`}
                      onClick={closeAnd(() => setCurrentTab('semester'))}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-left hover:bg-indigo-100/70 dark:hover:bg-indigo-900/30 transition-colors"
                    >
                      <span className="p-1.5 rounded-lg bg-indigo-600 text-white shrink-0 text-xs leading-none">📅</span>
                      <span className="min-w-0 flex-1 block text-[11px] font-semibold text-indigo-900 dark:text-indigo-100">{r.text}</span>
                      <ChevronRight className="h-4 w-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    </button>
                  ))}

                  {dueErrors > 0 && (
                    <button
                      type="button"
                      id="topbar-notif-errors"
                      onClick={closeAnd(() => openReviews({ tab: 'erros' }))}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 text-left hover:bg-amber-100/70 dark:hover:bg-amber-900/30 transition-colors"
                    >
                      <span className="p-1.5 rounded-lg bg-amber-500 text-slate-950 shrink-0">
                        <NotebookPen className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-amber-900 dark:text-amber-100">
                          {dueErrors} {dueErrors === 1 ? 'erro' : 'erros'} para refazer
                        </span>
                        <span className="block text-[11px] text-amber-800/80 dark:text-amber-300/80">Tente lembrar a regra antes de olhar</span>
                      </span>
                      <ChevronRight className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                    </button>
                  )}

                  {upcomingExamsList.map((exam) => (
                    <button
                      type="button"
                      key={exam.id}
                      onClick={closeAnd(() => setCurrentTab('semester'))}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-left hover:bg-rose-100/60 dark:hover:bg-rose-900/20 transition-colors"
                    >
                      <span className="p-1.5 rounded-lg bg-rose-500 text-white shrink-0">
                        <GraduationCap className="h-3.5 w-3.5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-bold text-rose-900 dark:text-rose-100 truncate">{exam.title}</span>
                        <span className="block text-[11px] text-rose-800/80 dark:text-rose-300/80 truncate">
                          Prova {examWhen(exam.date)}
                          {exam.location ? ` · ${exam.location}` : ''}
                        </span>
                      </span>
                    </button>
                  ))}

                  {!hasAlerts && (
                    <div className="text-center py-4 text-xs text-slate-500 dark:text-slate-400">Tudo em dia por aqui: sem revisões, erros ou provas urgentes. 🎉</div>
                  )}
                </div>

              </div>
            </>
          )}
        </div>

        {/* Tour guiado pelo site (a ajuda de cada aba fica dentro da própria aba) */}
        {onOpenTour && (
          <button
            id="topbar-help-btn"
            type="button"
            onClick={onOpenTour}
            aria-label="Tour guiado pelo site"
            data-tooltip="Tour guiado pelo site"
            className="h-10 shrink-0 flex items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition-colors text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100"
          >
            <Compass className="h-4 w-4" />
            <span className="hidden md:inline">Tour guiado</span>
          </button>
        )}

        {/* Layout largo x padrão (só em telas grandes) */}
        <button
          id="topbar-wide-layout-btn"
          type="button"
          onClick={toggleWide}
          aria-pressed={wideLayout}
          aria-label={wideLayout ? 'Voltar ao layout padrão' : 'Usar layout largo'}
          data-tooltip={wideLayout ? 'Voltar ao layout padrão' : 'Usar layout largo'}
          className={`hidden xl:flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 ${wideLayout ? 'text-sky-600 dark:text-sky-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100'}`}
        >
          {wideLayout ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </button>

        {/* Dark Mode Toggle */}
        <span className="inline-flex" data-tooltip={isDarkMode ? 'Mudar para o modo claro' : 'Mudar para o modo escuro'}>
        <SquishSwitch
          id="topbar-theme-toggle-btn"
          checked={isDarkMode}
          onChange={() => toggleDarkMode()}
          ariaLabel={isDarkMode ? 'Ativar modo claro' : 'Ativar modo escuro'}
          width={50}
          height={28}
          radius={14}
          trackColor="#e2e8f0"
          trackOnColor="#1e293b"
          thumbColor="#ffffff"
          thumbOnColor="#0f172a"
          className="shrink-0 ml-1"
          thumbIcon={isDarkMode ? <Moon className="h-3 w-3 text-sky-300" /> : <Sun className="h-3 w-3 text-amber-500" />}
        />
        </span>
      </TooltipGroup>
    </header>
  );
};
