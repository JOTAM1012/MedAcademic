// Abas que podem ir na barra de baixo do celular/tablet (o "Mais" fica sempre no fim)
import { Calendar, GraduationCap, Layers, LayoutDashboard, ListChecks, Repeat, Rocket, Timer, User, type LucideIcon } from 'lucide-react';

export interface MobileTabOption {
  id: string;
  label: string;
  short: string;
  icon: LucideIcon;
}

export const MOBILE_TAB_OPTIONS: MobileTabOption[] = [
  { id: 'dashboard', label: 'Dashboard', short: 'Início', icon: LayoutDashboard },
  { id: 'calendar', label: 'Planner', short: 'Planner', icon: Calendar },
  { id: 'semester', label: 'Semestre', short: 'Semestre', icon: GraduationCap },
  { id: 'structure', label: 'Disciplinas & assuntos', short: 'Disciplinas', icon: Layers },
  { id: 'spaced_repetition', label: 'Revisões', short: 'Revisões', icon: Repeat },
  { id: 'personal', label: 'Estudos pessoais', short: 'Pessoais', icon: Rocket },
  { id: 'stopwatch', label: 'Pomodoro', short: 'Pomodoro', icon: Timer },
  { id: 'checklist', label: 'Checklist', short: 'Checklist', icon: ListChecks },
  { id: 'profile', label: 'Perfil', short: 'Perfil', icon: User },
];

export const MOBILE_TABS_MAX = 4;
export const DEFAULT_MOBILE_TABS = ['dashboard', 'calendar', 'spaced_repetition', 'stopwatch'];

/** Abas escolhidas válidas (completa com o padrão se faltar) */
export const resolveMobileTabs = (saved?: string[]): string[] => {
  const valid = (saved || []).filter((id, i, arr) => MOBILE_TAB_OPTIONS.some((o) => o.id === id) && arr.indexOf(id) === i).slice(0, MOBILE_TABS_MAX);
  return valid.length ? valid : DEFAULT_MOBILE_TABS;
};
