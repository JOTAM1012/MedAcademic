import React, { useEffect, useMemo, useState } from 'react';
import { Crown, Sparkles, Plus, Stethoscope, HelpCircle, Pencil } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OwnerName } from './OwnerName';
import { useAccess } from '../context/AccessContext';
import { CARTOON_AVATARS } from '../data/avatars';
import { InstallAppBanner } from './InstallAppGuide';
import { SemesterStatusCard } from './SemesterStatusCard';
import { DailyHabitsCard } from './plan/DailyHabitsCard';
import { TodayPlanPanel } from './plan/TodayPlanPanel';
import { ContestsSummaryCard } from './contests/ContestsSummaryCard';
import type { DashboardPrefs, DashboardWidgetId } from '../types';
import { MEDICAL_AREAS, OTHER_AREA } from '../data/areas';
import { PERIOD_OPTIONS, areaOfSubject, type PeriodFilter } from '../data/dashboardMetrics';
import { DEFAULT_WIDGETS, WIDGETS, resolveWidgets } from './dashboard/dashboardPrefs';
import { GroupMode, resolveGroupMode } from './dashboard/dashboardData';
import { DashboardEditor } from './dashboard/DashboardEditor';
import { ProgressWidget } from './dashboard/ProgressWidget';
import { QuestionsWidget } from './dashboard/QuestionsWidget';
import { ReviewsWidget } from './dashboard/ReviewsWidget';
import { UpcomingExamsWidget } from './dashboard/UpcomingExamsWidget';
import { StudyTimeWidget } from './dashboard/StudyTimeWidget';
import { GradesAvgWidget } from './dashboard/GradesAvgWidget';
import { WeekSummaryCard } from './dashboard/WeekSummaryCard';

// Filtros do painel (período e grande área): conveniência deste aparelho
const FILTER_KEY = 'medacademic_dashboard_filters';
const readFilters = (): { period: PeriodFilter; area: string } => {
  try {
    const f = JSON.parse(localStorage.getItem(FILTER_KEY) || '{}');
    return { period: PERIOD_OPTIONS.some((p) => p.id === f.period) ? f.period : '30d', area: typeof f.area === 'string' ? f.area : 'all' };
  } catch {
    return { period: '30d', area: 'all' };
  }
};

export const DashboardView: React.FC = () => {
  const {
    currentSemester,
    subjects,
    userProfile,
    setCurrentTab,
    setIsOnboardingOpen,
    updateUserProfile,
    openMethodGuide,
    studyMethod,
    setDashboardPrefs,
    studyPhase,
    contestsActive,
  } = useApp();

  const { isOwner: isOwnerAccount } = useAccess();
  const isReturning = userProfile.onboardingCompleted;
  // Tratamento automático: escolha do perfil → avatar escolhido (médico/médica) → pergunta rápida
  const avatarGender = CARTOON_AVATARS.find((a) => a.url === userProfile.avatarUrl)?.gender;
  const greetingGender = userProfile.greetingGender || (avatarGender === 'female' ? 'feminino' : avatarGender === 'male' ? 'masculino' : undefined);
  const welcome = greetingGender === 'feminino' ? 'bem-vinda' : greetingGender === 'masculino' ? 'bem-vindo' : 'bem-vindo(a)';
  const askGreeting = !greetingGender;
  const firstName = userProfile.name.split(' ')[0];
  const GREETING_SUBTITLE = 'Cada dia de estudo é um passo a mais rumo ao profissional que você deseja ser.';

  // ---------- Cartões (ordem/visibilidade salvas na nuvem) ----------
  const prefs = studyMethod.dashboard;
  const widgets = useMemo(() => resolveWidgets(prefs), [prefs]);
  const [editing, setEditing] = useState(false);
  const unavailable: DashboardWidgetId[] = contestsActive ? [] : ['concursos'];
  const shown = widgets.filter((w) => w.visible && !unavailable.includes(w.id));
  const isShown = (id: DashboardWidgetId) => shown.some((w) => w.id === id);

  const savePrefs = (patch: Partial<DashboardPrefs>) => setDashboardPrefs({ ...(prefs || {}), widgets, ...patch });
  const resetPrefs = () => {
    const keep = { progressGroup: prefs?.progressGroup, questionsGroup: prefs?.questionsGroup };
    if (!keep.progressGroup && !keep.questionsGroup) setDashboardPrefs(null);
    else setDashboardPrefs({ widgets: DEFAULT_WIDGETS.map((w) => ({ ...w })), ...keep });
  };

  // ---------- Filtros ----------
  const semesterSubjects = useMemo(
    () => subjects.filter((s) => !s.semesterId || s.semesterId === currentSemester?.id),
    [subjects, currentSemester?.id]
  );
  const [{ period, area: savedArea }, setFilters] = useState(readFilters);
  const areaOptions = useMemo(() => {
    const present = new Set(semesterSubjects.map((s) => areaOfSubject(s).id));
    return [...MEDICAL_AREAS, OTHER_AREA].filter((a) => present.has(a.id));
  }, [semesterSubjects]);
  // Área salva que não existe neste semestre volta para "todas"
  const area = areaOptions.some((a) => a.id === savedArea) ? savedArea : 'all';
  useEffect(() => {
    try {
      localStorage.setItem(FILTER_KEY, JSON.stringify({ period, area: savedArea }));
    } catch {
      /* sem armazenamento: segue sem lembrar */
    }
  }, [period, savedArea]);
  const periodLabel = period === 'all' ? 'desde o início' : period === 'semester' ? 'no semestre' : `últimos ${PERIOD_OPTIONS.find((p) => p.id === period)?.label}`;
  const showPeriod = isShown('questions') || isShown('grades_avg');
  const showArea = areaOptions.length > 1 && studyPhase !== 'ciclo_basico' && (isShown('progress') || isShown('questions') || isShown('grades_avg'));
  const progressSubjects = area === 'all' ? semesterSubjects : semesterSubjects.filter((s) => areaOfSubject(s).id === area);

  const progressMode = resolveGroupMode(prefs?.progressGroup, studyPhase, semesterSubjects);
  const questionsMode = resolveGroupMode(prefs?.questionsGroup, studyPhase, semesterSubjects);
  const setMode = (key: 'progressGroup' | 'questionsGroup') => (m: GroupMode) => savePrefs({ [key]: m });

  const renderWidget = (id: DashboardWidgetId): React.ReactNode => {
    switch (id) {
      case 'semester':
        return <SemesterStatusCard variant="widget" />;
      case 'plan':
        return <TodayPlanPanel compact />;
      case 'habits':
        return <DailyHabitsCard compact className="h-full" />;
      case 'progress':
        return <ProgressWidget subjects={progressSubjects} mode={progressMode} onModeChange={setMode('progressGroup')} areaFiltered={area !== 'all'} />;
      case 'questions':
        return <QuestionsWidget period={period} periodLabel={periodLabel} area={area} mode={questionsMode} onModeChange={setMode('questionsGroup')} />;
      case 'reviews':
        return <ReviewsWidget />;
      case 'exams_upcoming':
        return <UpcomingExamsWidget />;
      case 'study_time':
        return <StudyTimeWidget />;
      case 'grades_avg':
        return <GradesAvgWidget period={period} periodLabel={periodLabel} area={area} />;
      case 'concursos':
        return contestsActive ? <ContestsSummaryCard /> : null;
      default:
        return null;
    }
  };

  const chip = (active: boolean) =>
    `min-h-[40px] px-3 rounded-lg text-[11px] font-bold transition-colors ${
      active ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
    }`;

  return (
    <div id="tour-dashboard" className="space-y-5 pb-12">
      <InstallAppBanner />
      {/* Primeiros passos (sem disciplinas) */}
      {subjects.length === 0 && (
        <div className="rounded-3xl border border-sky-200 dark:border-sky-800/80 bg-sky-50/70 dark:bg-slate-900 p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shrink-0">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  Seja {welcome} {isReturning ? 'novamente' : 'ao MedAcademic'}, <OwnerName name={firstName} />{' '}
                  {isOwnerAccount ? (
                    <Crown className="inline h-[1em] w-[1em] -mt-1 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]" aria-label="Dono" />
                  ) : (
                    '🩺'
                  )}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
                  {isReturning
                    ? GREETING_SUBTITLE
                    : 'Seu painel começa limpo. Cadastre suas disciplinas ou veja o tutorial com tudo o que dá para fazer.'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                id="dashboard-tutorial-btn"
                onClick={() => setIsOnboardingOpen(true)}
                className="min-h-[40px] px-3.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Ver tutorial</span>
              </button>
              <button
                onClick={() => setCurrentTab('structure')}
                className="min-h-[40px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar disciplina</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {subjects.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
              Seja {welcome} novamente, <OwnerName name={firstName} />{' '}
              {isOwnerAccount ? (
                <Crown
                  id="greeting-owner-crown"
                  className="inline h-[1em] w-[1em] -mt-1 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
                  aria-label="Dono"
                />
              ) : (
                <Stethoscope className="inline h-[0.9em] w-[0.9em] -mt-1 text-sky-500" aria-hidden />
              )}
            </h1>
            <p className="hidden sm:block text-xs text-slate-500 dark:text-slate-400 mt-0.5">{GREETING_SUBTITLE}</p>
            {askGreeting && (
              <div id="greeting-quick-choice" className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
                <span className="text-slate-500 dark:text-slate-400">Como prefere ser saudado(a)?</span>
                <button
                  id="greeting-quick-masculino"
                  onClick={() => updateUserProfile({ greetingGender: 'masculino' })}
                  className="min-h-[40px] px-2.5 rounded-lg font-bold bg-sky-500/10 text-sky-600 dark:text-sky-300 border border-sky-500/30 hover:bg-sky-500/20"
                >
                  Bem-vindo
                </button>
                <button
                  id="greeting-quick-feminino"
                  onClick={() => updateUserProfile({ greetingGender: 'feminino' })}
                  className="min-h-[40px] px-2.5 rounded-lg font-bold bg-pink-500/10 text-pink-600 dark:text-pink-300 border border-pink-500/30 hover:bg-pink-500/20"
                >
                  Bem-vinda
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 shrink-0">
            <button
              id="dashboard-method-btn"
              onClick={() => openMethodGuide(0)}
              className="flex items-center justify-center gap-1.5 px-3 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-600 text-xs font-bold transition-all cursor-pointer"
            >
              <HelpCircle className="w-4 h-4 shrink-0 text-sky-500" />
              <span className="sm:hidden">O método</span>
              <span className="hidden sm:inline">Como funciona o método?</span>
            </button>
            <button
              id="dashboard-how-to-use-btn"
              onClick={() => setIsOnboardingOpen(true)}
              className="flex items-center justify-center gap-1.5 px-3 min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-600 text-xs font-bold transition-all cursor-pointer"
            >
              <Sparkles className="w-4 h-4 shrink-0 text-sky-500" />
              <span className="sm:hidden">Como usar</span>
              <span className="hidden sm:inline">Como usar a plataforma</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------- Filtros + lápis ---------- */}
      <div id="dash-toolbar" className="flex flex-wrap items-center justify-between gap-2">
        <div id="dash-filters" className="flex flex-wrap items-center gap-2 min-w-0">
          {showPeriod && (
            <div role="group" aria-label="Período" className="inline-flex rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-0.5">
              {PERIOD_OPTIONS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  id={`dash-period-${p.id}`}
                  aria-pressed={period === p.id}
                  onClick={() => setFilters((f) => ({ ...f, period: p.id }))}
                  className={chip(period === p.id)}
                >
                  {p.label}
                </button>
              ))}
            </div>
          )}
          {showArea && (
            <select
              id="dash-area"
              value={area}
              onChange={(e) => setFilters((f) => ({ ...f, area: e.target.value }))}
              className="min-h-[40px] max-w-[200px] rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-[11px] font-bold text-slate-700 dark:text-slate-200"
              aria-label="Grande área (vale para progresso e acertos)"
              title="Vale para progresso e acertos"
            >
              <option value="all">Todas as áreas</option>
              {areaOptions.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.id === OTHER_AREA.id ? 'Outras disciplinas' : a.id}
                </option>
              ))}
            </select>
          )}
          {(period !== '30d' || area !== 'all') && (showPeriod || showArea) && (
            <button
              type="button"
              id="dash-filters-clear"
              onClick={() => setFilters({ period: '30d', area: 'all' })}
              className="min-h-[40px] px-2 rounded-xl text-[11px] font-bold text-slate-400 dark:text-slate-500 hover:text-sky-600 dark:hover:text-sky-400"
            >
              Limpar
            </button>
          )}
        </div>
        {!editing && (
          <button
            type="button"
            id="dash-edit-btn"
            onClick={() => setEditing(true)}
            className="ml-auto min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:border-sky-400 dark:hover:border-sky-600 hover:text-sky-700 dark:hover:text-sky-300 text-xs font-bold inline-flex items-center gap-1.5"
            aria-label="Personalizar o painel"
            title="Personalizar o painel"
          >
            <Pencil className="h-4 w-4" />
            <span>Personalizar</span>
          </button>
        )}
      </div>

      {editing && (
        <DashboardEditor
          widgets={widgets}
          unavailable={unavailable}
          onChange={(w) => savePrefs({ widgets: w })}
          onReset={resetPrefs}
          onDone={() => setEditing(false)}
        />
      )}

      {/* ---------- Resumo da semana ---------- */}
      {subjects.length > 0 && !editing && <WeekSummaryCard />}

      {/* ---------- Cartões ---------- */}
      {shown.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">Todos os cartões estão escondidos.</p>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="mt-2 min-h-[40px] px-3 rounded-xl text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40"
          >
            Escolher cartões
          </button>
        </div>
      ) : (
        <div id="dash-grid" className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 md:grid-flow-row-dense">
          {shown.map((w) => {
            const node = renderWidget(w.id);
            if (!node) return null;
            return (
              <div key={w.id} id={`dash-widget-${w.id}`} className={`min-w-0 ${WIDGETS[w.id].span}`}>
                {node}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
