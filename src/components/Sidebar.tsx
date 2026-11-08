import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  LayoutDashboard,
  LogOut,
  Layers,
  Repeat,
  Stethoscope,
  Timer,
  GraduationCap,
  Calendar,
  Sparkles,
  User,
  SlidersHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  ListChecks,
  Crown,
  Rocket,
} from 'lucide-react';
import { useAccess } from '../context/AccessContext';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { OwnerName } from './OwnerName';
import { CARTOON_AVATARS } from '../data/avatars';
import { daysBetween } from '../data/blockReview';
import { daysUntil, periodProgress, semesterBounds } from '../data/academicCalendar';
import { todayYMD, useDayPlan, useDueReviewCount } from '../hooks/useStudyPlan';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, setIsMobileOpen }) => {
  const {
    currentTab,
    setCurrentTab,
    openPlannerToday,
    exams,
    checklist,
    currentSemester,
    userProfile,
    cloudSyncStatus,
  } = useApp();
  const pendingChecklistCount = checklist.filter((i) => !i.done).length;
  const { isAdmin, isOwner } = useAccess();
  const { logout } = useAuth();

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
  const isExpanded = !isCollapsed || isHovered || isMobileOpen;

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('medstudy_sidebar_collapsed', String(next));
      } catch (e) {}
      return next;
    });
  };

  // Revisões vencidas (mesma regra da aba Revisões, data local)
  const todayStr = todayYMD();
  const dueTopicsCount = useDueReviewCount();

  // Tarefas do plano de hoje que ainda faltam
  const dayPlan = useDayPlan();
  const planLeft = Math.max(0, dayPlan.totalCount - dayPlan.doneCount);
  // Com tarefas pendentes (selo ativo), o Planner abre direto no Hoje
  const navTo = (id: string) => (id === 'calendar' && planLeft > 0 ? openPlannerToday() : setCurrentTab(id));

  // Upcoming exams in 14 days
  const upcomingExamsCount = exams.filter((e) => {
    if (!e.date || e.grade !== undefined) return false;
    const diff = daysBetween(todayStr, e.date);
    return diff >= 0 && diff <= 14;
  }).length;

  // Semestre atual (mesmas contas do cartão do semestre): % que já passou e dias que faltam
  const semBounds = currentSemester ? semesterBounds(currentSemester) : undefined;
  const semNotStarted = !!semBounds && todayStr < semBounds.start;
  const semPct = semBounds ? (semNotStarted ? 0 : periodProgress(semBounds, todayStr)) : 0;
  const semLeft = semBounds ? Math.max(0, daysUntil(todayStr, semBounds.end)) : 0;
  const semName = (currentSemester?.name || '').split(/s+[-–·]s+/)[0] || 'Semestre';
  const semLeftLabel = !semBounds
    ? ''
    : semNotStarted
    ? `começa em ${daysUntil(todayStr, semBounds.start)} dias`
    : todayStr > semBounds.end
    ? 'terminou'
    : semLeft === 0
    ? 'último dia'
    : `faltam ${semLeft} dias`;

  // Abas antigas que agora moram em outra (links antigos continuam funcionando)
  const activeTab = currentTab === 'grades' || currentTab === 'schedule' ? 'semester' : currentTab === 'history' ? 'profile' : currentTab;

  const academicItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: null,
    },
    {
      id: 'calendar',
      label: 'Planner',
      icon: Calendar,
      badge: planLeft > 0 ? `faltam ${planLeft}` : null,
      badgeColor: 'bg-violet-500/20 text-violet-300 border border-violet-400/30',
    },
    {
      id: 'semester',
      label: 'Semestre',
      icon: GraduationCap,
      badge: upcomingExamsCount > 0 ? `${upcomingExamsCount} próx.` : null,
      badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-400/30',
    },
  ];

  const toolsItems = [
    {
      id: 'structure',
      label: 'Disciplinas & assuntos',
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
      id: 'personal',
      label: 'Estudos pessoais',
      icon: Rocket,
      badge: null,
    },
    {
      id: 'stopwatch',
      label: 'Pomodoro',
      icon: Timer,
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

  const aiItems: Array<{
    id: string;
    label: string;
    icon: any;
    badge: string | null;
    badgeColor?: string;
  }> = [
    {
      id: 'profile',
      label: 'Perfil',
      icon: User,
      badge: null,
    },
    {
      id: 'customize',
      label: 'Personalizar',
      icon: SlidersHorizontal,
      badge: null,
    },
    ...(isAdmin ? [{ id: 'admin', label: 'Painel do Dono', icon: Crown, badge: '👑', badgeColor: 'bg-amber-500/20 text-amber-300 border border-amber-400/40' }] : []),
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-[68] bg-slate-950/70 backdrop-blur-xs lg:hidden"
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
        className={`fixed top-0 bottom-0 left-0 z-[70] flex shrink-0 flex-col bg-slate-900 border-r border-slate-800 text-slate-300 transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
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
          {/* Rotina */}
          <div>
            {isExpanded && (
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider px-2 mb-1.5 animate-in fade-in duration-150">Rotina</div>
            )}
            <div className="space-y-1">
              {academicItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    title={!isExpanded ? item.label : undefined}
                    onClick={() => {
                      navTo(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg text-xs transition-colors relative group overflow-hidden ${
                      isExpanded ? 'justify-between px-3 py-3 lg:py-2 gap-3 text-sm lg:text-xs' : 'justify-center p-2.5'
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
                        className={`h-5 w-5 lg:h-4 lg:w-4 shrink-0 transition-colors ${
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
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider px-2 mb-1.5 animate-in fade-in duration-150">
                Ferramentas de estudo
              </div>
            ) : (
              <div className="w-8 mx-auto border-t border-slate-800/80 my-2" />
            )}
            <div className="space-y-1">
              {toolsItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    title={!isExpanded ? item.label : undefined}
                    onClick={() => {
                      navTo(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg text-xs transition-colors relative group overflow-hidden ${
                      isExpanded ? 'justify-between px-3 py-3 lg:py-2 gap-3 text-sm lg:text-xs' : 'justify-center p-2.5'
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
                        className={`h-5 w-5 lg:h-4 lg:w-4 shrink-0 transition-colors ${
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
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider px-2 mb-1.5 animate-in fade-in duration-150">Configurações</div>
            ) : (
              <div className="w-8 mx-auto border-t border-slate-800/80 my-2" />
            )}
            <div className="space-y-1">
              {aiItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isGemini = item.id === 'gemini_tutor';
                return (
                  <button
                    key={item.id}
                    id={`sidebar-nav-${item.id}`}
                    title={!isExpanded ? item.label : undefined}
                    onClick={() => {
                      navTo(item.id);
                      setIsMobileOpen(false);
                    }}
                    className={`flex w-full items-center rounded-lg text-xs transition-all group ${
                      isExpanded ? 'justify-between px-3 py-3 lg:py-2 gap-3 text-sm lg:text-xs' : 'justify-center p-2.5'
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

        {/* Semestre atual (abre a aba Semestre) */}
        {semBounds &&
          (isExpanded ? (
            <button
              id="sidebar-semester-card"
              type="button"
              onClick={() => {
                setCurrentTab('semester');
                setIsMobileOpen(false);
              }}
              className="mt-auto m-3 p-3.5 text-left bg-slate-800/40 hover:bg-slate-800/70 rounded-xl border border-slate-700/50 transition-colors animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-200 truncate">{semName}</span>
                <span className="text-xs font-bold text-blue-400 shrink-0">{semPct}%</span>
              </div>
              <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full transition-all duration-500 rounded-full" style={{ width: `${semPct}%` }} />
              </div>
              <div className="mt-2 text-[10px] text-slate-400">{semLeftLabel}</div>
            </button>
          ) : (
            <button
              type="button"
              className="mt-auto p-2 mx-2 mb-3 bg-slate-800/40 rounded-lg border border-slate-700/50 flex flex-col items-center justify-center hover:bg-slate-800/80 transition-colors"
              title={`${semName}: ${semPct}% · ${semLeftLabel}`}
              aria-label={`${semName}: ${semPct}%, ${semLeftLabel}`}
              onClick={() => setCurrentTab('semester')}
            >
              <span className="text-[10px] font-bold text-blue-400">{semPct}%</span>
              <div className="w-6 bg-slate-700 h-1 rounded-full overflow-hidden mt-1">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${semPct}%` }} />
              </div>
            </button>
          ))}

        {/* Conta: foto (bolinha = estado da nuvem, sincroniza sozinha), nome e Sair */}
        {isExpanded ? (
          <div
            id="sidebar-account-card"
            className={`${semBounds ? '' : 'mt-auto '}mx-3 mb-3 -mt-1 flex items-center gap-2.5 rounded-xl border border-slate-700/50 bg-slate-800/40 p-2.5`}
          >
            <button
              type="button"
              id="sidebar-account-profile"
              onClick={() => {
                setCurrentTab('profile');
                setIsMobileOpen(false);
              }}
              className="flex min-w-0 flex-1 items-center gap-2.5 text-left group"
              title={`Perfil de ${userProfile.name}`}
            >
              <span className="relative shrink-0">
                <span
                  className={`block h-9 w-9 overflow-hidden rounded-full bg-blue-950 ${isOwner ? 'owner-gold-frame owner-gold-frame--sm' : 'user-blue-frame user-blue-frame--sm'}`}
                >
                  <img src={userProfile.avatarUrl || CARTOON_AVATARS[0].url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                </span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${
                    cloudSyncStatus === 'synced' ? 'bg-emerald-500' : cloudSyncStatus === 'syncing' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'
                  }`}
                  title={cloudSyncStatus === 'synced' ? 'Salvo na nuvem' : cloudSyncStatus === 'syncing' ? 'Salvando…' : 'Offline: salvo neste aparelho'}
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-slate-100 group-hover:text-sky-300">
                  <OwnerName name={userProfile.name.split(' ')[0]} crown={false} />
                </span>
              </span>
            </button>
            <button
              type="button"
              id="dock-logout-btn"
              onClick={logout}
              className="flex h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-bold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
              title="Sair da conta"
              aria-label="Sair da conta"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        ) : (
          <button
            type="button"
            id="sidebar-account-profile-mini"
            onClick={() => setCurrentTab('profile')}
            className={`${semBounds ? '' : 'mt-auto '}relative mx-auto mb-3 h-9 w-9 shrink-0`}
            title={`Perfil de ${userProfile.name}`}
            aria-label="Abrir Perfil"
          >
            <span className={`block h-9 w-9 overflow-hidden rounded-full bg-blue-950 ${isOwner ? 'owner-gold-frame owner-gold-frame--sm' : 'user-blue-frame user-blue-frame--sm'}`}>
              <img src={userProfile.avatarUrl || CARTOON_AVATARS[0].url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
            </span>
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-slate-900 ${
                cloudSyncStatus === 'synced' ? 'bg-emerald-500' : cloudSyncStatus === 'syncing' ? 'bg-amber-400' : 'bg-rose-500'
              }`}
            />
          </button>
        )}
      </aside>
    </>
  );
};

