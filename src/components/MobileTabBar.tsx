import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import './mobile-tab-bar.css';
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
  const reduceMotion = useReducedMotion();
  // Marca quando o painel foi arrastado (para não abrir uma função sem querer)
  const draggedRef = useRef(false);

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
      {/* Painel com todas as funções: vidro que sobe; arraste para baixo ou toque fora para fechar */}
      <AnimatePresence>
        {isMoreOpen && (
          <>
            <motion.div
              key="more-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduceMotion ? 0 : 0.2 }}
              onClick={() => setIsMoreOpen(false)}
              className="more-sheet-backdrop fixed inset-0 z-[43] lg:hidden"
            />
            <motion.div
              key="more-sheet"
              id="mobile-more-sheet"
              role="dialog"
              aria-label="Todas as funções"
              initial={reduceMotion ? { opacity: 0 } : { y: '100%' }}
              animate={reduceMotion ? { opacity: 1 } : { y: 0 }}
              exit={reduceMotion ? { opacity: 0 } : { y: '100%' }}
              transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 520, damping: 42, mass: 0.9 }}
              drag="y"
              dragConstraints={{ top: 0, bottom: 0 }}
              dragElastic={{ top: 0.04, bottom: 0.7 }}
              dragMomentum={false}
              onPointerDownCapture={() => {
                draggedRef.current = false;
              }}
              onDragStart={() => {
                draggedRef.current = true;
              }}
              onDragEnd={(_, info) => {
                if (info.offset.y > 90 || info.velocity.y > 500) setIsMoreOpen(false);
              }}
              onClickCapture={(e) => {
                // Depois de arrastar, o toque não abre a função embaixo do dedo
                if (draggedRef.current) {
                  e.stopPropagation();
                  e.preventDefault();
                  draggedRef.current = false;
                }
              }}
              className="glass-sheet fixed inset-x-0 bottom-0 z-[44] lg:hidden px-4 pt-2.5 touch-none select-none"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 96px)' }}
            >
              <div className="flex justify-center py-1.5 cursor-grab active:cursor-grabbing" aria-hidden>
                <span className="glass-sheet-handle" />
              </div>
              <div className="flex items-center justify-between mb-3 mt-1">
                <p className="text-sm font-black text-slate-900 dark:text-white">Todas as funções</p>
                <button
                  onClick={() => setIsMoreOpen(false)}
                  className="h-8 w-8 flex items-center justify-center rounded-full bg-slate-900/5 dark:bg-white/[0.07] text-slate-500 dark:text-slate-300 active:bg-slate-900/10 dark:active:bg-white/15"
                  aria-label="Fechar"
                >
                  <X className="h-4 w-4" />
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
                      className={`glass-sheet-tile relative flex flex-col items-center gap-2 rounded-2xl border p-3 transition-colors duration-150 ${
                        active ? 'is-active' : ''
                      }`}
                    >
                      <span className={`flex h-11 w-11 items-center justify-center rounded-[14px] bg-gradient-to-br ${item.color} text-white shadow-md ring-1 ring-inset ring-white/20`}>
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
