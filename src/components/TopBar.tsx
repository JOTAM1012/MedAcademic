import React, { useState, useEffect } from 'react';
import {
  Menu,
  Search,
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
} from 'lucide-react';
import { useApp } from '../context/AppContext';
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
  const { isInstalled: isAppInstalled } = usePwaInstall();
  const {
    setCurrentTab,
    isDarkMode,
    toggleDarkMode,
    searchQuery,
    setSearchQuery,
    subjects,
    topics,
    exams,
    cloudSyncStatus,
    forceCloudSync,
    topicBlocks,
    studyMethod,
    openReviews,
    openMethodGuide,
    methodGuideSeen,
  } = useApp();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
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

  // Search Results
  const filteredSubjects = searchQuery.trim()
    ? subjects.filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const filteredTopics = searchQuery.trim()
    ? topics.filter((t) => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
    : [];

  const filteredExams = searchQuery.trim()
    ? exams.filter((e) => e.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

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

        {/* Global Search Bar */}
        <div className="relative w-full max-w-sm sm:max-w-md">
          <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
            <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
            <input
              id="topbar-global-search-input"
              type="text"
              placeholder="Buscar matérias, tópicos clínicos, ECG..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsSearchOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {isSearchOpen && searchQuery.trim().length > 0 && (
            <div
              id="topbar-search-dropdown"
              className="absolute left-0 right-0 top-full mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl z-50"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Resultados
                </span>
                <button
                  onClick={() => setIsSearchOpen(false)}
                  className="text-xs text-slate-400 hover:text-slate-600"
                >
                  Fechar
                </button>
              </div>

              {filteredSubjects.length === 0 && filteredTopics.length === 0 && filteredExams.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-500">
                  Nenhum resultado para "{searchQuery}".
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredSubjects.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 mb-1">
                        Disciplinas ({filteredSubjects.length})
                      </div>
                      <div className="space-y-1">
                        {filteredSubjects.map((s) => (
                          <div
                            key={s.id}
                            onClick={() => {
                              setCurrentTab('structure');
                              setIsSearchOpen(false);
                            }}
                            className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs font-medium text-slate-800 dark:text-slate-200"
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                            <span>{s.name}</span>
                            <span className="text-[10px] text-slate-400 ml-auto">{s.code}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredTopics.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase text-emerald-600 dark:text-emerald-400 mb-1">
                        Tópicos ({filteredTopics.length})
                      </div>
                      <div className="space-y-1">
                        {filteredTopics.map((t) => (
                          <div
                            key={t.id}
                            onClick={() => {
                              setCurrentTab('structure');
                              setIsSearchOpen(false);
                            }}
                            className="p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs text-slate-800 dark:text-slate-200"
                          >
                            <div className="font-semibold">{t.title}</div>
                            {t.description && (
                              <div className="text-[11px] text-slate-500 truncate">{t.description}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredExams.length > 0 && (
                    <div>
                      <div className="text-[10px] font-bold uppercase text-rose-600 dark:text-rose-400 mb-1">
                        Provas ({filteredExams.length})
                      </div>
                      <div className="space-y-1">
                        {filteredExams.map((e) => (
                          <div
                            key={e.id}
                            onClick={() => {
                              setCurrentTab('semester');
                              setIsSearchOpen(false);
                            }}
                            className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer text-xs text-slate-800 dark:text-slate-200"
                          >
                            <span className="font-semibold">{e.title}</span>
                            <span className="text-[10px] text-slate-400">{e.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right section: Cloud Sync, Notifications & Dark Mode */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        {/* Instalar como aplicativo (some quando já está instalado) */}
        {!isAppInstalled && (
          <button
            id="topbar-install-btn"
            type="button"
            onClick={openInstallGuide}
            className="relative h-10 shrink-0 flex items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
            aria-label="Instalar o MedAcademic como aplicativo"
            title="Instalar como aplicativo"
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
            aria-label={hasAlerts ? 'Notificações (há lembretes)' : 'Notificações'}
            aria-expanded={isNotificationsOpen}
          >
            <Bell className="h-4 w-4" />
            {hasAlerts && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                {upcomingExamsList.length > 0 && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>}
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
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
            title="Tour guiado: onde fica cada coisa, passo a passo"
            className="h-10 shrink-0 flex items-center justify-center gap-1.5 rounded-xl px-2.5 text-xs font-bold transition-colors text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100"
          >
            <Compass className="h-4 w-4" />
            <span className="hidden md:inline">Tour guiado</span>
          </button>
        )}

        {/* Dark Mode Toggle */}
        <button
          id="topbar-theme-toggle-btn"
          onClick={toggleDarkMode}
          className="relative h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-800 dark:hover:text-slate-100 transition-colors"
          aria-label={isDarkMode ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
        >
          {isDarkMode ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </button>
      </div>
    </header>
  );
};
