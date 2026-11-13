import React, { useState } from 'react';
import { useSidebarCollapsed } from '../hooks/useWideLayout';
import { motion, useReducedMotion } from 'motion/react';
import './sidebar.css';
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
  const reduceMotion = useReducedMotion();

  // Recolhida ou aberta: o botão fica na barra do topo, ao lado da pesquisa
  const [isCollapsed] = useSidebarCollapsed();
  const isExpanded = !isCollapsed || isMobileOpen;

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

  type SideItem = { id: string; label: string; icon: any; badge: string | null; badgeColor?: string };

  // Um item da navegação: ícone + nome; o item ativo ganha a pílula que desliza entre os itens
  const renderItem = (item: SideItem, dotColor: string) => {
    const Icon = item.icon;
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        id={`sidebar-nav-${item.id}`}
        title={!isExpanded ? item.label : undefined}
        aria-current={isActive ? 'page' : undefined}
        onClick={() => {
          navTo(item.id);
          setIsMobileOpen(false);
        }}
        className={`sb-item group relative flex w-full items-center rounded-xl transition-colors duration-150 ${
          isExpanded ? 'justify-between gap-2.5 px-2.5 py-2.5 lg:py-[7px] text-sm lg:text-[13px]' : 'justify-center h-10'
        } ${isActive ? 'text-white font-semibold' : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.04]'}`}
      >
        {isActive && (
          <motion.span
            layoutId="sidebar-active-pill"
            className="sb-pill absolute inset-0 rounded-xl pointer-events-none"
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 480, damping: 38 }}
          />
        )}
        <span className="relative flex min-w-0 items-center gap-2.5">
          <span
            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors duration-150 ${
              isActive ? 'text-sky-300' : 'text-slate-500 group-hover:text-slate-200'
            }`}
          >
            <Icon className="h-[18px] w-[18px] lg:h-4 lg:w-4" />
          </span>
          {isExpanded && <span className="truncate whitespace-nowrap">{item.label}</span>}
        </span>

        {isExpanded && item.badge && (
          <span
            className={`relative shrink-0 text-[10px] font-semibold px-1.5 py-px rounded-full ${item.badgeColor || 'bg-slate-800 text-slate-400'}`}
          >
            {item.badge}
          </span>
        )}

        {!isExpanded && item.badge && (
          <span className={`absolute top-1.5 right-2.5 w-2 h-2 rounded-full ${dotColor} ring-2 ring-slate-950`} />
        )}
      </button>
    );
  };

  const sectionLabel = (text: string, first = false) =>
    isExpanded ? (
      <div className={`sb-label px-2.5 mb-1 ${first ? '' : 'mt-1'} animate-in fade-in duration-150`}>{text}</div>
    ) : first ? null : (
      <div className="w-6 mx-auto border-t border-white/[0.06] my-2" />
    );

  const syncDot =
    cloudSyncStatus === 'synced' ? 'bg-emerald-500' : cloudSyncStatus === 'syncing' ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          id="sidebar-mobile-backdrop"
          onClick={() => setIsMobileOpen(false)}
          className="fixed inset-0 z-[68] bg-slate-950/60 backdrop-blur-xs lg:hidden"
        />
      )}

      {/* Barra lateral: recolhida mostra só ícones */}
      <aside
        id="tour-sidebar"
        className={`sb-root fixed top-0 bottom-0 left-0 z-[70] flex shrink-0 flex-col text-slate-300 transition-[width,transform,box-shadow] duration-200 ease-out motion-reduce:transition-none lg:static lg:translate-x-0 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isExpanded ? 'w-60' : 'w-[68px]'}`}
      >
        {/* Marca */}
        <div className={`flex items-center px-3.5 h-16 shrink-0 ${isExpanded ? 'justify-between' : 'justify-center'}`}>
          <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center shadow-lg shadow-sky-600/25 ring-1 ring-inset ring-white/20 text-white shrink-0">
              <Stethoscope className="w-[18px] h-[18px]" />
            </div>
            {isExpanded && (
              <span className="overflow-hidden whitespace-nowrap font-bold text-[15px] tracking-tight text-white animate-in fade-in duration-200">
                Med<span className="text-sky-400">Academic</span>
              </span>
            )}
          </div>

        </div>

        {/* Navegação */}
        <nav className={`flex-1 overflow-y-auto overflow-x-hidden pt-1 pb-3 space-y-3 ${isExpanded ? 'px-2.5' : 'px-2'}`}>
          <div>
            {sectionLabel('Rotina', true)}
            <div className="space-y-0.5">{academicItems.map((item) => renderItem(item, 'bg-sky-400'))}</div>
          </div>
          <div>
            {sectionLabel('Ferramentas de estudo')}
            <div className="space-y-0.5">{toolsItems.map((item) => renderItem(item, 'bg-rose-500'))}</div>
          </div>
          <div>
            {sectionLabel('Configurações')}
            <div className="space-y-0.5">{aiItems.map((item) => renderItem(item, 'bg-amber-400'))}</div>
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
              className="sb-glass mt-auto mx-2.5 mb-2 p-3 text-left rounded-2xl animate-in fade-in duration-200"
            >
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-semibold text-slate-200 truncate">{semName}</span>
                <span className="text-xs font-bold text-sky-300 shrink-0 tabular-nums">{semPct}%</span>
              </div>
              <div className="w-full bg-white/[0.07] h-1 rounded-full overflow-hidden">
                <div className="bg-gradient-to-r from-sky-500 to-blue-500 h-full transition-[width] duration-300 rounded-full" style={{ width: `${semPct}%` }} />
              </div>
              <div className="mt-1.5 text-[10px] text-slate-500">{semLeftLabel}</div>
            </button>
          ) : (
            <button
              type="button"
              className="sb-glass mt-auto mx-2 mb-2 py-2 rounded-xl flex flex-col items-center justify-center"
              title={`${semName}: ${semPct}% · ${semLeftLabel}`}
              aria-label={`${semName}: ${semPct}%, ${semLeftLabel}`}
              onClick={() => setCurrentTab('semester')}
            >
              <span className="text-[10px] font-bold text-sky-300 tabular-nums">{semPct}%</span>
              <div className="w-6 bg-white/[0.08] h-1 rounded-full overflow-hidden mt-1">
                <div className="bg-sky-500 h-full rounded-full" style={{ width: `${semPct}%` }} />
              </div>
            </button>
          ))}

        {/* Conta: foto (bolinha = estado da nuvem, sincroniza sozinha), nome e Sair */}
        {isExpanded ? (
          <div
            id="sidebar-account-card"
            className={`${semBounds ? '' : 'mt-auto '}sb-glass mx-2.5 mb-3 flex items-center gap-2 rounded-2xl p-2`}
          >
            <button
              type="button"
              id="sidebar-account-profile"
              onClick={() => {
                setCurrentTab('profile');
                setIsMobileOpen(false);
              }}
              className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-0.5 text-left group"
              title={`Perfil de ${userProfile.name}`}
            >
              <span className="relative shrink-0">
                <span
                  className={`block h-8 w-8 overflow-hidden rounded-full bg-blue-950 ${isOwner ? 'owner-gold-frame owner-gold-frame--sm' : 'user-blue-frame user-blue-frame--sm'}`}
                >
                  <img src={userProfile.avatarUrl || CARTOON_AVATARS[0].url} alt="" referrerPolicy="no-referrer" className="h-full w-full object-cover" />
                </span>
                <span
                  className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-slate-900 ${syncDot} ${
                    cloudSyncStatus === 'syncing' ? 'animate-pulse motion-reduce:animate-none' : ''
                  }`}
                  title={cloudSyncStatus === 'synced' ? 'Salvo na nuvem' : cloudSyncStatus === 'syncing' ? 'Salvando…' : 'Offline: salvo neste aparelho'}
                />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-slate-100 group-hover:text-sky-300 transition-colors">
                  <OwnerName name={userProfile.name.split(' ')[0]} crown={false} />
                </span>
              </span>
            </button>
            <button
              type="button"
              id="dock-logout-btn"
              onClick={logout}
              className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold text-slate-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
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
            <span className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-slate-900 ${syncDot}`} />
          </button>
        )}
      </aside>
    </>
  );
};
