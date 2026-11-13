// Itens da barra lateral e a personalização (ordem, esconder, ícones, seções).
// A Sidebar desenha; o Personalizar edita. Fica salvo na conta (studyMethod.sidebar).
import {
  Calendar,
  Crown,
  GraduationCap,
  Layers,
  LayoutDashboard,
  ListChecks,
  Repeat,
  Rocket,
  SlidersHorizontal,
  Timer,
  User,
  type LucideIcon,
} from 'lucide-react';
import type { SidebarPrefs } from '../types';

export type SidebarSection = 'rotina' | 'ferramentas' | 'config';

export interface SidebarItemDef {
  id: string;
  label: string;
  icon: LucideIcon;
  section: SidebarSection;
  /** não pode ser escondido (senão não dá para voltar ao Personalizar) */
  locked?: boolean;
  adminOnly?: boolean;
}

export const SIDEBAR_SECTIONS: { id: SidebarSection; label: string }[] = [
  { id: 'rotina', label: 'Rotina' },
  { id: 'ferramentas', label: 'Ferramentas de estudo' },
  { id: 'config', label: 'Configurações' },
];

export const SIDEBAR_ITEMS: SidebarItemDef[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, section: 'rotina' },
  { id: 'calendar', label: 'Planner', icon: Calendar, section: 'rotina' },
  { id: 'semester', label: 'Semestre', icon: GraduationCap, section: 'rotina' },
  { id: 'structure', label: 'Disciplinas & assuntos', icon: Layers, section: 'ferramentas' },
  { id: 'spaced_repetition', label: 'Revisões', icon: Repeat, section: 'ferramentas' },
  { id: 'personal', label: 'Estudos pessoais', icon: Rocket, section: 'ferramentas' },
  { id: 'stopwatch', label: 'Pomodoro', icon: Timer, section: 'ferramentas' },
  { id: 'checklist', label: 'Checklist', icon: ListChecks, section: 'ferramentas' },
  { id: 'profile', label: 'Perfil', icon: User, section: 'config' },
  { id: 'customize', label: 'Personalizar', icon: SlidersHorizontal, section: 'config', locked: true },
  { id: 'admin', label: 'Painel do Dono', icon: Crown, section: 'config', adminOnly: true },
];

/** Itens na ordem escolhida (os que não estão na lista salva entram no lugar padrão, no fim). */
export function orderedSidebarItems(prefs: SidebarPrefs | undefined, isAdmin: boolean): SidebarItemDef[] {
  const base = SIDEBAR_ITEMS.filter((i) => !i.adminOnly || isAdmin);
  const order = prefs?.order || [];
  const pos = (id: string) => {
    const i = order.indexOf(id);
    return i < 0 ? order.length + SIDEBAR_ITEMS.findIndex((x) => x.id === id) : i;
  };
  return [...base].sort((a, b) => pos(a.id) - pos(b.id));
}

export const isSidebarItemHidden = (prefs: SidebarPrefs | undefined, item: SidebarItemDef) =>
  !item.locked && !!prefs?.hidden?.includes(item.id);

export const isDefaultSidebar = (prefs: SidebarPrefs | undefined) =>
  !prefs || (!prefs.order?.length && !prefs.hidden?.length && !prefs.hideIcons && !prefs.flat);
