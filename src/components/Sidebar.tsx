import React from 'react';
import {
  LayoutDashboard,
  Layers,
  Repeat,
  Stethoscope,
  Timer,
  GraduationCap,
  CalendarDays,
  Calendar,
  Sparkles,
  User,
  ChevronDown,
  Flame,
  Award,
  BookOpen,
  Users,
  LogOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const { openAuthModal, logout } = useAuth();
  const {
    currentTab,
    setCurrentTab,
    semesters,
    currentSemester,
    setCurrentSemesterId,
    userProfile,
    topics,
    exams,
    studySessions,
  } = useApp();

  // Due topics count for spaced repetition
  const todayStr = new Date().toISOString().split('T')[0];
  const dueTopicsCount = topics.filter(
    (t) => t.inSpacedRepetition !== false && t.status !== 'dominado' && (!t.nextReviewDate || t.nextReviewDate <= todayStr)
  ).length;

  // Upcoming exams in 14 days
  const upcomingExamsCount = exams.filter((e) => {
    if (!e.date || e.grade !== undefined) return false;
    const diff = (new Date(e.date).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return diff >= 0 && diff <= 14;
  }).length;

  // Study hours this week
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const recentSessions = studySessions.filter((s) => new Date(s.timestamp) >= sevenDaysAgo);
  const totalMinutesStudiedWeek = recentSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalHoursStudiedWeek = (totalMinutesStudiedWeek / 60).toFixed(1);
  const weeklyGoalTarget = userProfile.weeklyTargetHours || 30;
  const weeklyGoalPercent = Math.min(100, Math.round((Number(totalHoursStudiedWeek) / weeklyGoalTarget) * 100));

  const academicItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'structure',
      label: 'Grade de disciplinas',
      icon: Layers,
      badge: null,
    },
    {
      id: 'spaced_repetition',
      label: 'Revisões',
      icon: Repeat,
      badge: dueTopicsCount > 0 ? `${dueTopicsCount} hoje` : null,
      badgeColor: 'bg-blue-500/20 text-blue-300 border border-blue-400/30',
    },
    {
      id: 'med_revision',
      label: 'MedRevision',
      icon: Stethoscope,
      badge: null,
    },
  ];

  const toolsItems = [
    {
      id: 'stopwatch',
      label: 'Pomodoro',
      icon: Timer,
      badge: null,
    },
    {
      id: 'grades',
      label: 'Gestão de atividades',
      icon: GraduationCap,
      badge: null,
    },
    {
      id: 'schedule',
      label: 'Grade de horarios',
      icon: CalendarDays,
      badge: null,
    },
    {
      id: 'calendar',
      label: 'Calendario',
      icon: Calendar,
      badge: upcomingExamsCount > 0 ? `${upcomingExamsCount} próx.` : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-400/30',
    },
  ];

  const aiItems: Array<{
    id: string;
    label: string;
    icon: any;
    badge: string | null;
    badgeColor?: string;
  }> = [
    {
      id: 'gemini_tutor',
      label: 'Tutor',
      icon: Sparkles,
      badge: null,
    },
    {
      id: 'profile',
      label: 'Perfil & metas',
      icon: User,
      badge: null,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-40 bg-slate-950/70 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Main Sidebar Container - Sleek Dark Slate */}
      <aside
        id="app-main-sidebar"
        className={`fixed top-0 bottom-0 left-0 z-50 flex w-64 shrink-0 flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-800/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white block leading-tight">
                MED<span className="text-blue-500">.STUDY</span>
              </span>
            </div>
          </div>
        </div>

        {/* Semester Selector Dropdown */}
        <div className="px-4 pt-3 pb-1">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
            Semestre Letivo
          </div>
          <div className="relative">
            <select
              id="sidebar-semester-select"
              value={currentSemester?.id || ''}
              onChange={(e) => setCurrentSemesterId(e.target.value)}
              aria-label="Selecionar Semestre Ativo"
              className="w-full appearance-none rounded-lg border border-slate-800 bg-slate-800/60 py-2 pl-3 pr-8 text-xs font-semibold text-slate-200 shadow-xs focus:border-blue-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500 transition-all cursor-pointer"
            >
              {semesters.map((sem) => (
                <option key={sem.id} value={sem.id} className="bg-slate-900 text-slate-200">
                  {sem.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
          {/* First Section */}
          <div>
            <div className="space-y-1">
              {academicItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs transition-all ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20 shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-blue-400' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          item.badgeColor || 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ferramentas Section */}
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1.5">
              Ferramentas
            </div>
            <div className="space-y-1">
              {toolsItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs transition-all ${
                      isActive
                        ? 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20 shadow-xs'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive ? 'text-blue-400' : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          item.badgeColor || 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI & Profile Section */}
          <div>
            <div className="space-y-1">
              {aiItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                const isGemini = item.id === 'gemini_tutor';
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`flex w-full items-center justify-between gap-3 px-3 py-2 rounded-lg text-xs transition-all ${
                      isActive
                        ? isGemini
                          ? 'bg-indigo-600/20 text-indigo-300 font-semibold border border-indigo-500/30 shadow-xs'
                          : 'bg-blue-600/15 text-blue-400 font-semibold border border-blue-500/20 shadow-xs'
                        : isGemini
                        ? 'hover:bg-indigo-600/20 text-indigo-300 border border-indigo-500/0 hover:border-indigo-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`h-4 w-4 shrink-0 ${
                          isActive
                            ? isGemini
                              ? 'text-indigo-400'
                              : 'text-blue-400'
                            : isGemini
                            ? 'text-indigo-400'
                            : 'text-slate-400'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          item.badgeColor || 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </nav>

        {/* Bottom Weekly Goal Card (from Sleek Interface design) */}
        <div className="mt-auto p-4 bg-slate-800/40 m-3 rounded-xl border border-slate-700/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-300">Meta Semanal</span>
            <span className="text-xs font-bold text-blue-400">{weeklyGoalPercent}%</span>
          </div>
          <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-blue-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${weeklyGoalPercent}%` }}
            />
          </div>
          <div className="mt-2.5 text-[10px] text-slate-400 flex justify-between">
            <span>{totalHoursStudiedWeek}h estudados</span>
            <span>meta de {weeklyGoalTarget}h</span>
          </div>
        </div>

        {/* User Mini Profile Bar */}
        <div className="px-3 pb-3 flex items-center gap-2">
          <button
            id="sidebar-profile-footer-btn"
            onClick={() => {
              setCurrentTab('profile');
              setIsMobileOpen(false);
            }}
            className="flex flex-1 items-center gap-3 rounded-xl p-2 text-left bg-slate-800/20 hover:bg-slate-800/60 border border-slate-800 transition-colors min-w-0"
          >
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-950 border border-slate-700 overflow-hidden shrink-0">
              <img
                src={userProfile.avatarUrl}
                alt={userProfile.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-200 truncate">
                {userProfile.name}
              </p>
              <p className="text-[10px] text-emerald-400 truncate flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                Nv. {userProfile.level} • {userProfile.currentStreakDays}d streak
              </p>
            </div>
          </button>
          <button
            id="sidebar-logout-btn"
            onClick={() => {
              setIsMobileOpen(false);
              logout();
            }}
            className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/20 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            title="Sair da Conta (Logout)"
            aria-label="Sair da Conta"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </aside>
    </>
  );
};
