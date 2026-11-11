import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  LayoutDashboard,
  Calendar,
  GraduationCap,
  Layers,
  Repeat,
  Timer,
  ListChecks,
  User,
  LayoutGrid,
  Rocket,
  X,
  SlidersHorizontal,
} from 'lucide-react';
import { resolveMobileTabs } from './navTabs';
import { useApp } from '../context/AppContext';
import { daysBetween } from '../data/blockReview';
import { todayYMD, useDayPlan, useDueReviewCount } from '../hooks/useStudyPlan';
import { useAccess } from '../context/AccessContext';
import { Crown } from 'lucide-react';

type NavItem = { id: string; label: string; short: string; icon: React.ElementType; color: string; badge?: string | null };

// Barra de abas fixa no rodapé (celular / app instalado) + painel "Mais" com todas as funções
export const MobileTabBar: React.FC = () => {
  const { currentTab: rawTab, setCurrentTab, openPlannerToday, exams, checklist, studyMethod } = useApp();
  // Abas antigas que agora moram em outra (links antigos continuam funcionando)
  const currentTab = rawTab === 'grades' || rawTab === 'schedule' ? 'semester' : rawTab === 'history' ? 'profile' : rawTab;
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const { isAdmin } = useAccess();

  const todayStr = todayYMD();
  // Mesma contagem da aba Revisões (data local, só disciplinas que existem)
  const dueCount = useDueReviewCount();
  // Tarefas do plano de hoje que faltam
  const dayPlan = useDayPlan();
  const planLeft = Math.max(0, dayPlan.totalCount - dayPlan.doneCount);
  const pendingChecklist = checklist.filter((i) => !i.done).length;
  const upcomingExams = exams.filter((e) => {
    if (!e.date || e.grade !== undefined) return false;
    const diff = daysBetween(todayStr, e.date);
    return diff >= 0 && diff <= 14;
  }).length;

  const all: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', short: 'Início', icon: LayoutDashboard, color: 'from-blue-500 to-blue-700' },
    { id: 'calendar', label: 'Planner', short: 'Planner', icon: Calendar, color: 'from-violet-500 to-violet-700', badge: planLeft ? String(planLeft) : null },
    { id: 'semester', label: 'Semestre', short: 'Semestre', icon: GraduationCap, color: 'from-rose-500 to-rose-700', badge: upcomingExams ? String(upcomingExams) : null },
    { id: 'structure', label: 'Disciplinas & assuntos', short: 'Disciplinas', icon: Layers, color: 'from-indigo-500 to-indigo-700' },
    { id: 'spaced_repetition', label: 'Revisões', short: 'Revisões', icon: Repeat, color: 'from-sky-500 to-sky-700', badge: dueCount ? String(dueCount) : null },
    { id: 'personal', label: 'Estudos pessoais', short: 'Pessoais', icon: Rocket, color: 'from-fuchsia-500 to-fuchsia-700' },
    { id: 'stopwatch', label: 'Pomodoro', short: 'Pomodoro', icon: Timer, color: 'from-orange-500 to-orange-700' },
    { id: 'checklist', label: 'Checklist', short: 'Checklist', icon: ListChecks, color: 'from-emerald-500 to-emerald-700', badge: pendingChecklist ? String(pendingChecklist) : null },
    { id: 'profile', label: 'Perfil', short: 'Perfil', icon: User, color: 'from-slate-500 to-slate-700' },
    { id: 'customize', label: 'Personalizar', short: 'Personalizar', icon: SlidersHorizontal, color: 'from-cyan-500 to-cyan-700' },
    ...(isAdmin ? [{ id: 'admin', label: 'Painel do Dono', short: 'Dono', icon: Crown, color: 'from-amber-400 to-amber-600' }] : []),
  ];
  const byId = (id: string) => all.find((i) => i.id === id)!;
  // As abas da barra são escolhidas em Personalizar (padrão: Início, Planner, Revisões, Pomodoro)
  const primary = resolveMobileTabs(studyMethod.mobileTabs).map(byId).filter(Boolean);
  const moreActive = !primary.some((p) => p.id === currentTab);
  const moreBadge = all.filter((i) => !primary.includes(i) && i.badge).length > 0;

  useEffect(() => {
    if (!isMoreOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsMoreOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMoreOpen]);

  const go = (id: string) => {
    // Com tarefas pendentes, o Planner abre direto no Hoje
    if (id === 'calendar' && planLeft > 0) openPlannerToday();
    else setCurrentTab(id);
    setIsMoreOpen(false);
  };

  const currentMore = moreActive ? all.find((i) => i.id === currentTab) : undefined;

  return (
    <>
      {/* Painel com todas as funções */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              key="more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreOpen(false)}
              className="fixed inset-0 z-[43] bg-slate-950/70 backdrop-blur-xs lg:hidden"
            />
            <motion.div
              key="more-sheet"
              id="mobile-more-sheet"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 380, damping: 36 }}
              className="fixed inset-x-0 bottom-0 z-[44] lg:hidden rounded-t-3xl border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 pt-3 shadow-2xl"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 92px)' }}
            >
              <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-slate-900 dark:text-white">Todas as funções</p>
                <button onClick={() => setIsMoreOpen(false)} className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2.5">
                {all.map((item) => {
                  const Icon = item.icon;
                  const active = currentTab === item.id;
                  return (
                    <button
                      key={item.id}
                      id={`mobile-more-${item.id}`}
                      onClick={() => go(item.id)}
                      className={`relative flex flex-col items-center gap-2 rounded-2xl border p-3 transition-colors ${
                        active
                          ? 'border-blue-500/60 bg-blue-50 dark:bg-blue-950/40'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 active:bg-slate-100 dark:active:bg-slate-800'
                      }`}
                    >
                      <span className={`flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${item.color} text-white shadow-md`}>
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className={`text-[11px] font-bold leading-tight text-center ${active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                        {item.label}
                      </span>
                      {item.badge && (
                        <span className="absolute top-1.5 right-1.5 min-w-5 h-5 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black flex items-center justify-center">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Barra de abas */}
      <nav
        id="mobile-tab-bar"
        className="glass-bar fixed inset-x-0 bottom-0 z-[45] lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="grid grid-cols-5 h-[68px] px-1 max-w-2xl mx-auto">
          {[...primary, null].map((item) => {
            const isMore = item === null;
            const active = isMore ? isMoreOpen || moreActive : currentTab === item.id && !isMoreOpen;
            const Icon = isMore ? currentMore?.icon || LayoutGrid : item.icon;
            const label = isMore ? (currentMore && !isMoreOpen ? currentMore.short : 'Mais') : item.short;
            const badge = isMore ? moreBadge : !!item.badge;
            return (
              <button
                key={isMore ? 'more' : item.id}
                id={isMore ? 'mobile-tab-more' : `mobile-tab-${item.id}`}
                onClick={() => (isMore ? setIsMoreOpen((o) => !o) : go(item.id))}
                className="relative flex flex-col items-center justify-center gap-1"
                aria-label={isMore ? 'Mais funções' : item.label}
              >
                <span
                  className={`relative flex h-9 w-14 items-center justify-center rounded-2xl transition-colors duration-200 ${
                    active ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="mobile-tab-pill"
                      className="absolute inset-0 rounded-2xl bg-blue-600 shadow-lg shadow-blue-600/30"
                      transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                    />
                  )}
                  <Icon className="relative h-5 w-5" />
                  {badge && <span className="absolute top-1 right-3 h-2.5 w-2.5 rounded-full bg-rose-500 ring-2 ring-white dark:ring-slate-900" />}
                </span>
                <span className={`text-[11px] leading-none truncate max-w-full px-0.5 ${active ? 'font-black text-blue-600 dark:text-blue-400' : 'font-semibold text-slate-500 dark:text-slate-400'}`}>
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
};
