import React, { useState } from 'react';
import {
  Menu,
  Search,
  Moon,
  Sun,
  Bell,
  Play,
  Pause,
  Timer,
  Film,
  Sparkles,
  Flame,
  Award,
  X,
  BookOpen,
  Users,
  LogOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

interface TopBarProps {
  onToggleMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onToggleMobileMenu }) => {
  const { openAuthModal, logout } = useAuth();
  const {
    currentTab,
    currentSemester,
    timer,
    startTimer,
    pauseTimer,
    setCurrentTab,
    isDarkMode,
    toggleDarkMode,
    setIsOnboardingOpen,
    userProfile,
    searchQuery,
    setSearchQuery,
    subjects,
    topics,
    exams,
  } = useApp();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Format seconds mm:ss
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

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

  // Notifications
  const upcomingExamsList = exams.filter((e) => {
    if (!e.date || e.grade !== undefined) return false;
    const diffDays = Math.ceil((new Date(e.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24));
    return diffDays >= 0 && diffDays <= 10;
  });

  return (
    <header
      id="app-topbar"
      className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-8 transition-colors shrink-0"
    >
      {/* Left section: Hamburger (mobile) + Search */}
      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0 mr-3">
        <button
          id="topbar-mobile-menu-btn"
          onClick={onToggleMobileMenu}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden shrink-0"
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
                        Avaliações ({filteredExams.length})
                      </div>
                      <div className="space-y-1">
                        {filteredExams.map((e) => (
                          <div
                            key={e.id}
                            onClick={() => {
                              setCurrentTab('grades');
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

      {/* Right section: Sleek Pomodoro Badge + Actions + User Status */}
      <div className="flex items-center gap-3 sm:gap-5 shrink-0">
        {/* Sleek Live Timer Pill (from design) */}
        <div
          id="topbar-timer-widget"
          className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-full px-3 py-1.5 gap-2 border border-slate-200 dark:border-slate-700 shadow-xs"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              timer.isRunning ? 'bg-red-500 animate-pulse' : 'bg-slate-400'
            }`}
          />
          <button
            onClick={() => setCurrentTab('stopwatch')}
            className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            title="Abrir Cronômetro"
          >
            {timer.mode === 'stopwatch'
              ? formatTime(timer.elapsedSeconds)
              : formatTime(timer.timeLeftSeconds)}
          </button>
          <button
            id="topbar-timer-play-pause-btn"
            onClick={timer.isRunning ? pauseTimer : startTimer}
            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
            aria-label={timer.isRunning ? 'Pausar' : 'Iniciar'}
          >
            {timer.isRunning ? (
              <Pause className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Tutorial / Como Usar Button */}
        <button
          id="topbar-onboarding-btn"
          onClick={() => setIsOnboardingOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-sky-200 dark:border-sky-800/80 bg-sky-50 dark:bg-sky-950/40 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 transition-colors cursor-pointer"
          title="Guia Prático: Como Usar o Site"
        >
          <Sparkles className="h-3.5 w-3.5 text-sky-500" />
          <span className="hidden sm:inline">Como Usar</span>
          <span className="sm:hidden text-[11px]">Guia</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            id="topbar-notifications-btn"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="relative rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
            {upcomingExamsList.length > 0 && (
              <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {isNotificationsOpen && (
            <div
              id="topbar-notifications-dropdown"
              className="absolute right-0 top-full mt-2 w-80 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xl z-50"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Lembretes e Alertas
                </span>
                <button
                  onClick={() => setIsNotificationsOpen(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="py-2 space-y-2 max-h-64 overflow-y-auto">
                {upcomingExamsList.length === 0 ? (
                  <div className="text-center py-4 text-xs text-slate-400">
                    Nenhuma prova urgente nos próximos 10 dias. 🎉
                  </div>
                ) : (
                  upcomingExamsList.map((exam) => (
                    <div
                      key={exam.id}
                      onClick={() => {
                        setCurrentTab('grades');
                        setIsNotificationsOpen(false);
                      }}
                      className="p-2.5 rounded-lg bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 cursor-pointer hover:opacity-90"
                    >
                      <div className="flex items-center justify-between text-xs font-semibold text-rose-900 dark:text-rose-200">
                        <span>{exam.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-200/60 dark:bg-rose-900/60 text-rose-800 dark:text-rose-300">
                          {exam.date}
                        </span>
                      </div>
                      <p className="text-[11px] text-rose-700/80 dark:text-rose-400 mt-0.5">
                        Peso: {exam.weight} | Local: {exam.location || 'A definir'}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Dark Mode Toggle */}
        <button
          id="topbar-theme-toggle-btn"
          onClick={toggleDarkMode}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label={isDarkMode ? 'Ativar Modo Claro' : 'Ativar Modo Escuro'}
        >
          {isDarkMode ? (
            <Sun className="h-4 w-4 text-amber-400" />
          ) : (
            <Moon className="h-4 w-4 text-slate-600" />
          )}
        </button>

        {/* User Profile & Account Switcher */}
        <div className="flex items-center gap-2 border-l pl-3 sm:pl-4 border-slate-200 dark:border-slate-800">
          <button
            id="topbar-user-avatar-btn"
            onClick={() => setCurrentTab('profile')}
            className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-950 border-2 border-white dark:border-slate-800 shadow-xs flex items-center justify-center overflow-hidden transition-transform hover:scale-105 cursor-pointer"
            title={`Perfil de ${userProfile.name}`}
          >
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </button>
          <button
            id="topbar-logout-btn"
            onClick={logout}
            className="rounded-lg p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
            title="Sair da Conta (Logout)"
            aria-label="Sair da Conta"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Sair</span>
          </button>
        </div>
      </div>
    </header>
  );
};
