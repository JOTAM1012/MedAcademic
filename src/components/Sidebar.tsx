import React, { useState } from 'react';
import { motion } from 'motion/react';
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
  PanelLeftClose,
  PanelLeftOpen,
  ListChecks,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const {
    currentTab,
    setCurrentTab,
    userProfile,
    topics,
    exams,
    studySessions,
    checklist,
  } = useApp();
  const pendingChecklistCount = checklist.filter((i) => !i.done).length;

  // Collapsed sidebar state with localStorage persistence
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem('medstudy_sidebar_collapsed') === 'true';
    } catch {
      return false;
    }
  });
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Computed expanded state: if not collapsed OR when hovered while collapsed
  const isExpanded = !isCollapsed || isHovered;

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('medstudy_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

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
      id: 'profile',
      label: 'Perfil & metas',
      icon: User,
      badge: null,
    },
    {
      id: 'checklist',
      label: 'Checklist',
      icon: ListChecks,
      badge: pendingChecklistCount > 0 ? String(pendingChecklistCount) : null,
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30',
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

      {/* Main Sidebar Container with Hover-to-Expand and Smooth Width Transition */}
      <aside
        id="tour-sidebar"
        onMouseEnter={() => {
          if (isCollapsed) setIsHovered(true);
        }}
        onMouseLeave={() => {
          if (isCollapsed) setIsHovered(false);
        }}
        className={`fixed top-0 bottom-0 left-0 z-50 flex shrink-0 flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          isExpanded ? 'w-64' : 'w-[72px]'
        } ${isCollapsed && isHovered ? 'shadow-2xl shadow-slate-950/80 ring-1 ring-blue-500/20' : ''}`}
      >
        {/* Brand Header & Discreet Collapse Toggle Button */}
        <div
          className={`p-4 flex items-center border-b border-slate-800/80 transition-all duration-300 ${
            isExpanded ? 'justify-between' : 'justify-center relative'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20 text-white shrink-0">
              <Stethoscope className="w-5 h-5" />
            </div>
            {isExpanded && (
              <div className="overflow-hidden whitespace-nowrap animate-in fade-in duration-200">
                <span className="font-bold text-lg tracking-tight text-white block leading-tight">
                  Med<span className="text-blue-500">Academic</span>
                </span>
              </div>
            )}
          </div>

          {/* Discrete Toggle Button in Top Right Corner */}
          <button
            id="sidebar-toggle-collapse-btn"
            onClick={toggleCollapse}
            title={
              isCollapsed
                ? 'Fixar barra lateral aberta (Expandir)'
                : 'Minimizar barra lateral (Manter apenas ícones)'
            }
            aria-label={isCollapsed ? 'Expandir barra lateral' : 'Minimizar barra lateral'}
            className={`flex items-center justify-center rounded-lg transition-all duration-200 shrink-0 cursor-pointer ${
              isExpanded
                ? 'p-1.5 bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 shadow-xs'
                : 'absolute right-1.5 top-2 p-1 bg-blue-600/90 hover:bg-blue-500 text-white border border-blue-400/40 shadow-sm'
            }`}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden py-4 space-y-4 ${isExpanded ? 'px-3' : 'px-2'}`}>
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
                    title={!isExpanded ? item.label : undefined}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg text-xs transition-colors relative group overflow-hidden ${
                      isExpanded ? 'justify-between px-3 py-2 gap-3' : 'justify-center p-2.5'
                    } ${
                      isActive
                        ? 'text-blue-400 font-bold'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebarActiveHighlight"
                        className="absolute inset-0 bg-blue-600/15 border border-blue-500/30 rounded-lg pointer-events-none"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <div className="flex items-center gap-3 min-w-0 z-10">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      {isExpanded && <span className="truncate whitespace-nowrap">{item.label}</span>}
                    </div>

                    {/* Badge when expanded */}
                    {isExpanded && item.badge && (
                      <span
                        className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full z-10 ${
                          item.badgeColor || 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {/* Dot badge when collapsed */}
                    {!isExpanded && item.badge && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-slate-900 z-10" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Ferramentas Section */}
          <div>
            {isExpanded ? (
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-2 mb-1.5 animate-in fade-in duration-150">
                Ferramentas
              </div>
            ) : (
              <div className="w-8 mx-auto border-t border-slate-800/80 my-2" />
            )}
            <div className="space-y-1">
              {toolsItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    title={!isExpanded ? item.label : undefined}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg text-xs transition-colors relative group overflow-hidden ${
                      isExpanded ? 'justify-between px-3 py-2 gap-3' : 'justify-center p-2.5'
                    } ${
                      isActive
                        ? 'text-blue-400 font-bold'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebarActiveHighlight"
                        className="absolute inset-0 bg-blue-600/15 border border-blue-500/30 rounded-lg pointer-events-none"
                        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                      />
                    )}
                    <div className="flex items-center gap-3 min-w-0 z-10">
                      <Icon
                        className={`h-4 w-4 shrink-0 transition-colors ${
                          isActive ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      {isExpanded && <span className="truncate whitespace-nowrap">{item.label}</span>}
                    </div>

                    {isExpanded && item.badge && (
                      <span
                        className={`shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full z-10 ${
                          item.badgeColor || 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}

                    {!isExpanded && item.badge && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-slate-900 z-10" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* AI & Profile Section */}
          <div>
            {isExpanded ? (
              <div className="w-full" />
            ) : (
              <div className="w-8 mx-auto border-t border-slate-800/80 my-2" />
            )}
            <div className="space-y-1">
              {aiItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                const isGemini = item.id === 'gemini_tutor';
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    title={!isExpanded ? item.label : undefined}
                    onClick={() => {
                      setCurrentTab(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg text-xs transition-all group ${
                      isExpanded ? 'justify-between px-3 py-2 gap-3' : 'justify-center p-2.5'
                    } ${
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
                            ? 'text-indigo-400 group-hover:text-indigo-300'
                            : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      {isExpanded && <span className="truncate whitespace-nowrap">{item.label}</span>}
                    </div>

                    {isExpanded && item.badge && (
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

        {/* Bottom Weekly Goal Card */}
        {isExpanded ? (
          <div className="mt-auto p-4 bg-slate-800/40 m-3 rounded-xl border border-slate-700/50 animate-in fade-in duration-200">
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
        ) : (
          <div
            className="mt-auto p-2 mx-2 mb-3 bg-slate-800/40 rounded-lg border border-slate-700/50 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-800/80 transition-colors"
            title={`Meta Semanal: ${weeklyGoalPercent}% (${totalHoursStudiedWeek}h de ${weeklyGoalTarget}h)`}
            onClick={() => setIsHovered(true)}
          >
            <span className="text-[10px] font-bold text-blue-400">{weeklyGoalPercent}%</span>
            <div className="w-6 bg-slate-700 h-1 rounded-full overflow-hidden mt-1">
              <div
                className="bg-blue-500 h-full rounded-full"
                style={{ width: `${weeklyGoalPercent}%` }}
              />
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

