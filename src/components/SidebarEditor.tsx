// Personalizar → Barra lateral: ordem das abas, esconder abas, ícones e títulos das seções.
import React from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, PanelLeft, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAccess } from '../context/AccessContext';
import BounceSwitch from './shared/BounceSwitch';
import IconSwap from './shared/IconSwap';
import { SIDEBAR_SECTIONS, isDefaultSidebar, isSidebarItemHidden, orderedSidebarItems, type SidebarItemDef } from './sidebarItems';
import type { SidebarPrefs } from '../types';

export const SidebarEditor: React.FC = () => {
  const { studyMethod, setSidebarPrefs } = useApp();
  const { isAdmin } = useAccess();
  const prefs = studyMethod.sidebar;
  const items = orderedSidebarItems(prefs, isAdmin);
  const flat = !!prefs?.flat;

  const save = (patch: Partial<SidebarPrefs>) => {
    const next: SidebarPrefs = { ...(prefs || {}), ...patch };
    setSidebarPrefs(isDefaultSidebar(next) ? null : next);
  };

  // Sobe/desce: com seções, troca só com o vizinho da mesma seção
  const move = (item: SidebarItemDef, dir: -1 | 1) => {
    const ids = items.map((i) => i.id);
    const pool = flat ? items : items.filter((i) => i.section === item.section);
    const k = pool.findIndex((i) => i.id === item.id);
    const other = pool[k + dir];
    if (!other) return;
    const a = ids.indexOf(item.id);
    const b = ids.indexOf(other.id);
    [ids[a], ids[b]] = [ids[b], ids[a]];
    save({ order: ids });
  };

  const toggleHidden = (item: SidebarItemDef) => {
    const hidden = new Set<string>(prefs?.hidden || []);
    if (hidden.has(item.id)) hidden.delete(item.id);
    else hidden.add(item.id);
    save({ hidden: [...hidden] });
  };

  const iconBtn =
    'h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent';

  const row = (item: SidebarItemDef, pool: SidebarItemDef[]) => {
    const k = pool.findIndex((i) => i.id === item.id);
    const hidden = isSidebarItemHidden(prefs, item);
    const Icon = item.icon;
    return (
      <li key={item.id} id={`customize-sidebar-${item.id}`} className={`flex items-center gap-1.5 px-2.5 py-1 transition-opacity ${hidden ? 'opacity-50' : ''}`}>
        {!prefs?.hideIcons && <Icon className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />}
        <span className={`flex-1 min-w-0 text-sm font-bold truncate ${hidden ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>{item.label}</span>
        <button type="button" aria-label={`Subir ${item.label}`} disabled={k === 0} onClick={() => move(item, -1)} className={iconBtn}>
          <ArrowUp className="h-4 w-4" />
        </button>
        <button type="button" aria-label={`Descer ${item.label}`} disabled={k === pool.length - 1} onClick={() => move(item, 1)} className={iconBtn}>
          <ArrowDown className="h-4 w-4" />
        </button>
        <button
          type="button"
          id={`customize-sidebar-hide-${item.id}`}
          disabled={item.locked}
          onClick={() => toggleHidden(item)}
          aria-label={hidden ? `Mostrar ${item.label}` : `Esconder ${item.label}`}
          title={item.locked ? 'Esta aba fica sempre, para você voltar aqui' : hidden ? 'Mostrar na barra' : 'Esconder da barra'}
          className={iconBtn}
        >
          <IconSwap swapped={hidden} from={<Eye className="h-4 w-4" />} to={<EyeOff className="h-4 w-4" />} />
        </button>
      </li>
    );
  };

  const toggleRow = (id: string, label: string, hint: string, checked: boolean, onChange: () => void) => (
    <label htmlFor={id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 px-3 py-2.5 cursor-pointer">
      <span className="min-w-0">
        <span className="block text-sm font-bold text-slate-900 dark:text-white">{label}</span>
        <span className="block text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
      <BounceSwitch id={id} checked={checked} onChange={onChange} ariaLabel={label} />
    </label>
  );

  return (
    <section id="customize-sidebar" className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <PanelLeft className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Barra lateral
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Mude a ordem das abas, esconda as que não usa e escolha se quer ícones.</p>
        </div>
        <button
          type="button"
          id="customize-sidebar-reset"
          disabled={isDefaultSidebar(prefs)}
          onClick={() => setSidebarPrefs(null)}
          className="shrink-0 min-h-[36px] px-2.5 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 inline-flex items-center gap-1.5"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Padrão
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {toggleRow('customize-sidebar-icons', 'Mostrar ícones', 'Com a barra recolhida, os ícones sempre aparecem.', !prefs?.hideIcons, () => save({ hideIcons: !prefs?.hideIcons }))}
        {toggleRow('customize-sidebar-sections', 'Separar por seções', 'Desligue para uma lista única, na ordem que quiser.', !flat, () => save({ flat: !flat }))}
      </div>

      {flat ? (
        <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">{items.map((i) => row(i, items))}</ul>
      ) : (
        <div className="space-y-3">
          {SIDEBAR_SECTIONS.map((sec) => {
            const pool = items.filter((i) => i.section === sec.id);
            if (!pool.length) return null;
            return (
              <div key={sec.id}>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">{sec.label}</p>
                <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">{pool.map((i) => row(i, pool))}</ul>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
