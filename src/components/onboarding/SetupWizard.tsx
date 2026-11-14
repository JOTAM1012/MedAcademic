// Assistente "Deixe o site do seu jeito": roteiro curto, só com toques, para configurar cada parte do site.
// Abre depois do cadastro (antes do tour) e pode ser refeito em Personalizar › Refazer configuração.
// Cada passo salva no lugar que já existe (setters do AppContext) ao tocar em "Continuar"; "Pular" não muda nada.
import React, { useEffect, useMemo, useState } from 'react';
import { Check, LayoutGrid, Monitor, Moon, PanelLeft, Repeat, Smartphone, Sparkles, Sun, Wand2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAccess } from '../../context/AccessContext';
import Stepper, { Step } from '../shared/Stepper';
import BounceSwitch from '../shared/BounceSwitch';
import { OptionChip, PlanModal } from '../plan/planShared';
import { WIDGETS, resolveWidgets } from '../dashboard/dashboardPrefs';
import { isDefaultSidebar, orderedSidebarItems } from '../sidebarItems';
import { DEFAULT_MOBILE_TABS, MOBILE_TAB_OPTIONS, MOBILE_TABS_MAX, resolveMobileTabs } from '../navTabs';
import { useWideLayout } from '../../hooks/useWideLayout';
import type { DashboardPrefs, DashboardWidgetId, SidebarPrefs, StudyPlanPrefs } from '../../types';

type MethodDraft = Pick<StudyPlanPrefs, 'usesFlashcards' | 'readsSummary' | 'longTermGoal' | 'newTopicsPerDay'>;

const TOTAL = 6;

const Intro: React.FC<{ icon: React.ReactNode; title: string; hint: string }> = ({ icon, title, hint }) => (
  <div className="flex items-start gap-3 mb-4">
    <span className="shrink-0 h-9 w-9 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20 grid place-items-center">{icon}</span>
    <div className="min-w-0">
      <p className="text-sm font-black text-slate-900 dark:text-white">{title}</p>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">{hint}</p>
    </div>
  </div>
);

const ToggleRow: React.FC<{ id: string; label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }> = ({ id, label, hint, checked, onChange, disabled }) => (
  <label
    htmlFor={id}
    className={`flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-2 min-h-[48px] ${disabled ? 'opacity-60' : 'cursor-pointer hover:border-sky-400 dark:hover:border-sky-700'} transition-colors`}
  >
    <span className="min-w-0">
      <span className="block text-sm font-bold text-slate-900 dark:text-white truncate">{label}</span>
      {hint && <span className="block text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>}
    </span>
    <BounceSwitch id={id} checked={checked} onChange={onChange} ariaLabel={label} disabled={disabled} />
  </label>
);

interface SetupWizardProps {
  open: boolean;
  onClose: () => void;
  /** 'first' = depois do cadastro; 'redo' = aberto em Personalizar */
  mode?: 'first' | 'redo';
}

export const SetupWizard: React.FC<SetupWizardProps> = ({ open, onClose, mode = 'redo' }) => {
  const {
    studyMethod,
    studyPrefs,
    setDashboardPrefs,
    setSidebarPrefs,
    setMobileTabs,
    updateStudyPrefs,
    isDarkMode,
    toggleDarkMode,
    contestsActive,
    setCurrentTab,
    showNotification,
  } = useApp();
  const { isAdmin } = useAccess();
  const [wideLayout, toggleWideLayout] = useWideLayout();
  const [step, setStep] = useState(1);

  // Rascunhos de cada passo (salvos só no "Continuar")
  const [widgets, setWidgets] = useState<DashboardPrefs['widgets']>([]);
  const [sidebarHidden, setSidebarHidden] = useState<string[]>([]);
  const [sidebarIcons, setSidebarIcons] = useState(true);
  const [tabs, setTabs] = useState<string[]>([]);
  const [method, setMethod] = useState<MethodDraft>({ usesFlashcards: false, readsSummary: true, longTermGoal: false, newTopicsPerDay: 1 });

  useEffect(() => {
    if (!open) return;
    setStep(1);
    setWidgets(resolveWidgets(studyMethod.dashboard));
    setSidebarHidden(studyMethod.sidebar?.hidden || []);
    setSidebarIcons(!studyMethod.sidebar?.hideIcons);
    setTabs(resolveMobileTabs(studyMethod.mobileTabs));
    setMethod({
      usesFlashcards: studyPrefs.usesFlashcards,
      readsSummary: studyPrefs.readsSummary !== false,
      longTermGoal: studyPrefs.longTermGoal,
      newTopicsPerDay: studyPrefs.newTopicsPerDay,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const unavailable: DashboardWidgetId[] = contestsActive ? [] : ['concursos'];
  const sidebarItems = useMemo(() => orderedSidebarItems(studyMethod.sidebar, isAdmin), [studyMethod.sidebar, isAdmin]);

  /** Salva o passo atual no lugar de sempre (só se mudou algo) */
  const commit = (n: number) => {
    if (n === 1) {
      const saved = resolveWidgets(studyMethod.dashboard);
      if (JSON.stringify(saved) !== JSON.stringify(widgets)) setDashboardPrefs({ ...(studyMethod.dashboard || {}), widgets });
    } else if (n === 2) {
      const next: SidebarPrefs = { ...(studyMethod.sidebar || {}), hidden: sidebarHidden, hideIcons: !sidebarIcons || undefined };
      if (!next.hidden?.length) delete next.hidden;
      setSidebarPrefs(isDefaultSidebar(next) ? null : next);
    } else if (n === 3) {
      const same = tabs.length === DEFAULT_MOBILE_TABS.length && tabs.every((t, i) => t === DEFAULT_MOBILE_TABS[i]);
      if (JSON.stringify(tabs) !== JSON.stringify(resolveMobileTabs(studyMethod.mobileTabs))) setMobileTabs(same ? null : tabs);
    } else if (n === 4) {
      const changes: Partial<StudyPlanPrefs> = {};
      if (method.usesFlashcards !== studyPrefs.usesFlashcards) changes.usesFlashcards = method.usesFlashcards;
      if (method.readsSummary !== (studyPrefs.readsSummary !== false)) changes.readsSummary = method.readsSummary;
      if (method.longTermGoal !== studyPrefs.longTermGoal) changes.longTermGoal = method.longTermGoal;
      if (method.newTopicsPerDay !== studyPrefs.newTopicsPerDay) changes.newTopicsPerDay = method.newTopicsPerDay;
      if (Object.keys(changes).length) updateStudyPrefs(changes);
    }
    // passo 5 (aparência) muda na hora
  };

  const close = (finished: boolean) => {
    if (finished && mode === 'first') setCurrentTab('dashboard');
    if (finished) showNotification('Pronto! O site ficou do seu jeito. Para mudar, use Personalizar.', 'success');
    else if (mode === 'first') showNotification('Sem problema. Quando quiser, use Personalizar › Refazer configuração.', 'info');
    onClose();
  };

  const skip = () => (step >= TOTAL ? close(true) : setStep(step + 1));

  const toggleWidget = (id: DashboardWidgetId) => setWidgets((w) => w.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)));
  const toggleSidebar = (id: string) => setSidebarHidden((h) => (h.includes(id) ? h.filter((x) => x !== id) : [...h, id]));
  const toggleTab = (id: string) => {
    if (tabs.includes(id)) {
      if (tabs.length > 1) setTabs(tabs.filter((t) => t !== id));
      return;
    }
    if (tabs.length >= MOBILE_TABS_MAX) {
      showNotification(`Cabem ${MOBILE_TABS_MAX} abas. Tire uma para colocar outra.`, 'info');
      return;
    }
    setTabs([...tabs, id]);
  };

  const visibleCount = widgets.filter((w) => w.visible && !unavailable.includes(w.id)).length;

  return (
    <PlanModal
      id="setup-wizard"
      open={open}
      onClose={() => close(false)}
      maxWidth="max-w-2xl"
      icon={<Wand2 className="h-5 w-5" />}
      title="Deixe o site do seu jeito"
      subtitle="Poucos toques por passo. Pule o que quiser e mude depois em Personalizar."
      footer={
        step < TOTAL ? (
          <button
            type="button"
            id="setup-skip"
            onClick={skip}
            className="mr-auto min-h-[40px] px-4 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Pular
          </button>
        ) : undefined
      }
    >
      <Stepper
        id="setup-stepper"
        step={step}
        onStepChange={setStep}
        onFinalStepCompleted={() => close(true)}
        linear
        completeButtonText="Concluir"
        nextButtonProps={{
          id: step === TOTAL ? 'setup-finish' : 'setup-next',
          onClick: () => commit(step),
        }}
      >
        {/* 1. Painel */}
        <Step title="Painel">
          <Intro icon={<LayoutGrid className="h-4 w-4" />} title="O que aparece no seu painel?" hint={`Ligue os cartões que você quer ver. ${visibleCount} ligado${visibleCount === 1 ? '' : 's'}.`} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {widgets
              .filter((w) => !unavailable.includes(w.id))
              .map((w) => (
                <ToggleRow key={w.id} id={`setup-widget-${w.id}`} label={WIDGETS[w.id].label} hint={WIDGETS[w.id].hint} checked={w.visible} onChange={() => toggleWidget(w.id)} />
              ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">A ordem dos cartões você muda em Personalizar.</p>
        </Step>

        {/* 2. Barra lateral */}
        <Step title="Barra lateral">
          <Intro icon={<PanelLeft className="h-4 w-4" />} title="Quais abas você usa?" hint="As desligadas saem da barra lateral do computador. Dá para voltar depois." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              const on = item.locked || !sidebarHidden.includes(item.id);
              return (
                <label
                  key={item.id}
                  htmlFor={`setup-sidebar-${item.id}`}
                  className={`flex items-center gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-2 min-h-[48px] ${item.locked ? 'opacity-60' : 'cursor-pointer hover:border-sky-400 dark:hover:border-sky-700'}`}
                  title={item.locked ? 'Esta aba fica sempre, para você voltar aqui' : undefined}
                >
                  {sidebarIcons && <Icon className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400" />}
                  <span className="flex-1 min-w-0 text-sm font-bold text-slate-900 dark:text-white truncate">{item.label}</span>
                  <BounceSwitch id={`setup-sidebar-${item.id}`} checked={on} onChange={() => toggleSidebar(item.id)} ariaLabel={`Mostrar ${item.label}`} disabled={item.locked} />
                </label>
              );
            })}
          </div>
          <div className="mt-3">
            <ToggleRow id="setup-sidebar-icons" label="Mostrar ícones" hint="Com a barra recolhida, os ícones sempre aparecem." checked={sidebarIcons} onChange={setSidebarIcons} />
          </div>
        </Step>

        {/* 3. Barra do celular */}
        <Step title="Celular">
          <Intro icon={<Smartphone className="h-4 w-4" />} title="Barra de baixo no celular" hint={`Escolha até ${MOBILE_TABS_MAX} abas. O "Mais" fica sempre no fim, com as outras.`} />
          <div id="setup-tabs-preview" className="mb-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 py-2 flex items-center justify-around">
            {[...tabs.map((id) => MOBILE_TAB_OPTIONS.find((o) => o.id === id)!).filter(Boolean), { id: 'more', short: 'Mais', icon: LayoutGrid, label: 'Mais' }].map((o) => {
              const Icon = o.icon;
              return (
                <span key={o.id} className="flex flex-col items-center gap-0.5 min-w-0 px-1">
                  <Icon className="h-5 w-5 text-slate-600 dark:text-slate-300" />
                  <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate max-w-[64px]">{o.short}</span>
                </span>
              );
            })}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {MOBILE_TAB_OPTIONS.map((o) => {
              const Icon = o.icon;
              const on = tabs.includes(o.id);
              return (
                <OptionChip key={o.id} id={`setup-tab-${o.id}`} active={on} onClick={() => toggleTab(o.id)} className="inline-flex items-center gap-1.5 min-h-[44px] text-sm">
                  <Icon className="h-4 w-4" /> {o.label}
                </OptionChip>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
            Na barra: {tabs.length}/{MOBILE_TABS_MAX}. A ordem segue a ordem em que você tocou.
          </p>
        </Step>

        {/* 4. Revisões e método */}
        <Step title="Método">
          <Intro icon={<Repeat className="h-4 w-4" />} title="Como você revisa?" hint="O plano do dia usa estas escolhas." />
          <div className="space-y-2">
            <ToggleRow id="setup-flashcards" label="Uso flashcards" hint="Anki ou cartões: entram como 1º passo do dia" checked={method.usesFlashcards} onChange={(v) => setMethod((m) => ({ ...m, usesFlashcards: v }))} />
            <ToggleRow id="setup-summary" label="Leio meu resumo" hint="Leitura ativa: tente lembrar antes de ler" checked={method.readsSummary !== false} onChange={(v) => setMethod((m) => ({ ...m, readsSummary: v }))} />
            <ToggleRow id="setup-longterm" label="Foco de longo prazo" hint="Residência ou internato: revisões com intervalos maiores" checked={method.longTermGoal} onChange={(v) => setMethod((m) => ({ ...m, longTermGoal: v }))} />
          </div>
          <p className="mt-4 mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Temas novos por dia</p>
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((n) => (
              <OptionChip key={n} id={`setup-new-${n}`} active={method.newTopicsPerDay === n} onClick={() => setMethod((m) => ({ ...m, newTopicsPerDay: n }))} className="min-h-[44px] text-sm">
                {n}
              </OptionChip>
            ))}
          </div>
        </Step>

        {/* 5. Aparência */}
        <Step title="Aparência">
          <Intro icon={<Sun className="h-4 w-4" />} title="Como o site fica na tela?" hint="Muda na hora. Toque e veja." />
          <p className="mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Tema</p>
          <div className="grid grid-cols-2 gap-2">
            <OptionChip id="setup-theme-light" active={!isDarkMode} onClick={() => isDarkMode && toggleDarkMode()} className="min-h-[48px] text-sm inline-flex items-center justify-center gap-2">
              <Sun className="h-4 w-4" /> Claro
            </OptionChip>
            <OptionChip id="setup-theme-dark" active={isDarkMode} onClick={() => !isDarkMode && toggleDarkMode()} className="min-h-[48px] text-sm inline-flex items-center justify-center gap-2">
              <Moon className="h-4 w-4" /> Escuro
            </OptionChip>
          </div>
          <p className="mt-4 mb-2 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Largura (computador)</p>
          <div className="grid grid-cols-2 gap-2">
            <OptionChip id="setup-layout-normal" active={!wideLayout} onClick={() => wideLayout && toggleWideLayout()} className="min-h-[48px] text-sm inline-flex items-center justify-center gap-2">
              <Monitor className="h-4 w-4" /> Normal
            </OptionChip>
            <OptionChip id="setup-layout-wide" active={wideLayout} onClick={() => !wideLayout && toggleWideLayout()} className="min-h-[48px] text-sm inline-flex items-center justify-center gap-2">
              <LayoutGrid className="h-4 w-4" /> Largo
            </OptionChip>
          </div>
          <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Largo usa mais da tela em monitores grandes. Vale para este aparelho.</p>
        </Step>

        {/* 6. Pronto */}
        <Step title="Pronto">
          <div className="text-center py-4">
            <span className="mx-auto h-14 w-14 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 grid place-items-center">
              <Sparkles className="h-7 w-7" />
            </span>
            <p className="mt-3 text-lg font-black text-slate-900 dark:text-white">Tudo pronto!</p>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">O site já está do seu jeito. Para mudar algo, é só abrir Personalizar.</p>
            <ul className="mt-4 inline-flex flex-col items-start gap-1.5 text-left text-xs text-slate-600 dark:text-slate-300">
              {['Painel com os seus cartões', 'Barras com as abas que você usa', 'Plano do dia com o seu método', 'Tema e largura escolhidos'].map((t) => (
                <li key={t} className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-emerald-500" /> {t}
                </li>
              ))}
            </ul>
          </div>
        </Step>
      </Stepper>
    </PlanModal>
  );
};
