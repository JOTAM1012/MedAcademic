// Personalizar: o painel (cartões e ordem) e a barra de baixo do celular/tablet.
// Tudo fica salvo na conta e vale para todos os semestres.
import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, CalendarClock, Check, LayoutGrid, RotateCcw, Smartphone, SlidersHorizontal } from 'lucide-react';
import { StudyRoutineModal } from './plan/StudyRoutineModal';
import { blocksToHours } from './plan/planShared';
import { TURN_LABELS, WEEKDAY_SHORT } from '../data/studyMethod';
import { useApp } from '../context/AppContext';
import type { DashboardPrefs, DashboardWidgetId } from '../types';
import { DashboardEditor } from './dashboard/DashboardEditor';
import { SidebarEditor } from './SidebarEditor';
import { DEFAULT_WIDGETS, resolveWidgets } from './dashboard/dashboardPrefs';
import { DEFAULT_MOBILE_TABS, MOBILE_TAB_OPTIONS, MOBILE_TABS_MAX, resolveMobileTabs } from './navTabs';

export const CustomizeView: React.FC = () => {
  const { studyMethod, studyPrefs, setDashboardPrefs, setMobileTabs, contestsActive, setCurrentTab, showNotification } = useApp();
  const [routineOpen, setRoutineOpen] = useState(false);
  const freeTurns = studyPrefs.weekTurns ? studyPrefs.weekTurns.reduce((n, d) => n + d.filter((t) => t === 'livre').length, 0) : null;
  const bestIdx = studyPrefs.bestTurn ? ['manha', 'tarde', 'noite'].indexOf(studyPrefs.bestTurn) : -1;

  // ---------- Painel ----------
  const prefs = studyMethod.dashboard;
  const widgets = useMemo(() => resolveWidgets(prefs), [prefs]);
  const unavailable: DashboardWidgetId[] = contestsActive ? [] : ['concursos'];
  const saveWidgets = (w: DashboardPrefs['widgets']) => setDashboardPrefs({ ...(prefs || {}), widgets: w });
  const resetWidgets = () => {
    const keep = { progressGroup: prefs?.progressGroup, questionsGroup: prefs?.questionsGroup };
    if (!keep.progressGroup && !keep.questionsGroup) setDashboardPrefs(null);
    else setDashboardPrefs({ widgets: DEFAULT_WIDGETS.map((w) => ({ ...w })), ...keep });
  };

  // ---------- Barra do celular ----------
  const tabs = resolveMobileTabs(studyMethod.mobileTabs);
  const isDefaultTabs = !studyMethod.mobileTabs?.length;
  const toggleTab = (id: string) => {
    if (tabs.includes(id)) {
      if (tabs.length <= 1) return;
      setMobileTabs(tabs.filter((t) => t !== id));
      return;
    }
    if (tabs.length >= MOBILE_TABS_MAX) {
      showNotification(`A barra tem espaço para ${MOBILE_TABS_MAX} abas. Tire uma para colocar outra.`, 'info');
      return;
    }
    setMobileTabs([...tabs, id]);
  };
  const moveTab = (id: string, dir: -1 | 1) => {
    const i = tabs.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= tabs.length) return;
    const next = [...tabs];
    [next[i], next[j]] = [next[j], next[i]];
    setMobileTabs(next);
  };

  const iconBtn =
    'h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div className="tab-root space-y-5 pb-12 max-w-3xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <SlidersHorizontal className="h-6 w-6 text-sky-600 dark:text-sky-400" /> Personalizar
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Deixe o site do seu jeito. Fica salvo na sua conta e vale para todos os semestres.</p>
      </div>

      {/* 0. Minha rotina (a mesma do Planner) */}
      <section id="customize-routine" className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Minha rotina
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Tempo por dia, turnos da semana, descanso e blocos de foco. O plano do dia segue isto.</p>
          </div>
          <button
            type="button"
            id="customize-routine-btn"
            onClick={() => setRoutineOpen(true)}
            className="min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black"
          >
            Ajustar rotina
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">{blocksToHours(studyPrefs.dailyPomodoros)} de foco/dia</span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">
            {freeTurns === null ? 'Turnos: todos iguais' : `${freeTurns} turno${freeTurns === 1 ? '' : 's'} livre${freeTurns === 1 ? '' : 's'} na semana`}
          </span>
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">
            Descanso: {studyPrefs.restDay === null ? 'nenhum' : WEEKDAY_SHORT[studyPrefs.restDay]}
          </span>
          {bestIdx >= 0 && <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">Rende mais: {TURN_LABELS[bestIdx].toLowerCase()}</span>}
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold">Bloco {studyPrefs.focusMinutes}/{studyPrefs.breakMinutes}</span>
        </div>
        <StudyRoutineModal open={routineOpen} onClose={() => setRoutineOpen(false)} />
      </section>

      {/* 1. Painel */}
      <section id="customize-dashboard" className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Painel (Dashboard)
          </h2>
          <button type="button" onClick={() => setCurrentTab('dashboard')} className="min-h-[36px] text-xs font-bold text-sky-700 dark:text-sky-400 hover:underline">
            Ver o painel →
          </button>
        </div>
        <DashboardEditor widgets={widgets} unavailable={unavailable} onChange={saveWidgets} onReset={resetWidgets} onDone={() => setCurrentTab('dashboard')} />
      </section>

      {/* Barra lateral (computador) */}
      <SidebarEditor />

      {/* 2. Barra de baixo no celular/tablet */}
      <section id="customize-mobile-tabs" className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Barra de baixo no celular e tablet
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Escolha até {MOBILE_TABS_MAX} abas e a ordem. O botão "Mais" fica sempre no fim, com todas as outras.
            </p>
          </div>
          <button
            type="button"
            id="customize-tabs-reset"
            disabled={isDefaultTabs}
            onClick={() => setMobileTabs(null)}
            className="shrink-0 min-h-[36px] px-2.5 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Padrão
          </button>
        </div>

        {/* Prévia da barra */}
        <div id="customize-tabs-preview" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-2 flex items-center justify-around">
          {[...tabs.map((id) => MOBILE_TAB_OPTIONS.find((o) => o.id === id)!), { id: 'more', short: 'Mais', icon: LayoutGrid, label: 'Mais' }].map((o) => {
            const Icon = o.icon;
            return (
              <span key={o.id} className="flex flex-col items-center gap-0.5 min-w-0 px-1">
                <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[64px]">{o.short}</span>
              </span>
            );
          })}
        </div>

        {/* Escolhidas (com ordem) */}
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
            Na barra ({tabs.length}/{MOBILE_TABS_MAX})
          </p>
          <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
            {tabs.map((id, i) => {
              const o = MOBILE_TAB_OPTIONS.find((x) => x.id === id)!;
              const Icon = o.icon;
              return (
                <li key={id} id={`customize-tab-${id}`} className="flex items-center gap-2 px-2.5 py-1.5">
                  <Icon className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
                  <span className="flex-1 min-w-0 text-sm font-bold text-slate-900 dark:text-white truncate">{o.label}</span>
                  <button type="button" aria-label={`Subir ${o.label}`} disabled={i === 0} onClick={() => moveTab(id, -1)} className={iconBtn}>
                    <ArrowUp className="h-4 w-4" />
                  </button>
                  <button type="button" aria-label={`Descer ${o.label}`} disabled={i === tabs.length - 1} onClick={() => moveTab(id, 1)} className={iconBtn}>
                    <ArrowDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    id={`customize-tab-remove-${id}`}
                    disabled={tabs.length <= 1}
                    onClick={() => toggleTab(id)}
                    className="min-h-[36px] px-2.5 rounded-xl text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 disabled:opacity-30"
                  >
                    Tirar
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Disponíveis */}
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Outras abas (ficam no "Mais")</p>
          <div className="flex flex-wrap gap-1.5">
            {MOBILE_TAB_OPTIONS.filter((o) => !tabs.includes(o.id)).map((o) => {
              const Icon = o.icon;
              const full = tabs.length >= MOBILE_TABS_MAX;
              return (
                <button
                  key={o.id}
                  type="button"
                  id={`customize-tab-add-${o.id}`}
                  onClick={() => toggleTab(o.id)}
                  className={`min-h-[40px] px-3 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
                    full
                      ? 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                      : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-600'
                  }`}
                  title={full ? `Tire uma aba da barra para colocar ${o.label}` : `Colocar ${o.label} na barra`}
                >
                  <Icon className="h-4 w-4" /> {o.label}
                  {!full && <span className="text-sky-600 dark:text-sky-400">+</span>}
                </button>
              );
            })}
          </div>
          {tabs.length >= MOBILE_TABS_MAX && (
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Check className="h-3.5 w-3.5 text-emerald-500" /> Barra cheia. Para trocar, tire uma aba acima.
            </p>
          )}
          {isDefaultTabs && <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Padrão: {DEFAULT_MOBILE_TABS.map((id) => MOBILE_TAB_OPTIONS.find((o) => o.id === id)?.short).join(', ')}.</p>}
        </div>
      </section>
    </div>
  );
};
