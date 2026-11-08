// Personalizar o Painel: mostrar/esconder cartões e mudar a ordem (setas), com "Restaurar padrão".
import React from 'react';
import { ArrowDown, ArrowUp, Check, Eye, EyeOff, RotateCcw } from 'lucide-react';
import type { DashboardPrefs, DashboardWidgetId } from '../../types';
import { WIDGETS } from './dashboardPrefs';

type Widgets = DashboardPrefs['widgets'];

export const DashboardEditor: React.FC<{
  widgets: Widgets;
  /** Cartões que não existem nesta fase (ex.: concursos no ciclo básico) */
  unavailable: DashboardWidgetId[];
  onChange: (w: Widgets) => void;
  onReset: () => void;
  onDone: () => void;
}> = ({ widgets, unavailable, onChange, onReset, onDone }) => {
  const list = widgets.filter((w) => !unavailable.includes(w.id));

  // Move entre os cartões visíveis na lista (os indisponíveis ficam onde estão)
  const move = (id: DashboardWidgetId, dir: -1 | 1) => {
    const li = list.findIndex((w) => w.id === id);
    const other = list[li + dir];
    if (!other) return;
    const next = [...widgets];
    const a = next.findIndex((w) => w.id === id);
    const b = next.findIndex((w) => w.id === other.id);
    [next[a], next[b]] = [next[b], next[a]];
    onChange(next);
  };
  const toggle = (id: DashboardWidgetId) => onChange(widgets.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));

  const iconBtn =
    'h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div id="dash-editor" className="rounded-3xl border border-sky-200 dark:border-sky-900/60 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-900 dark:text-white">Personalizar o painel</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Escolha o que aparece e a ordem. Vale para todos os seus semestres.</p>
        </div>
        <button
          type="button"
          id="dash-edit-done"
          onClick={onDone}
          className="shrink-0 min-h-[40px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold inline-flex items-center gap-1.5"
        >
          <Check className="h-4 w-4" /> Pronto
        </button>
      </div>

      <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
        {list.map((w, i) => {
          const meta = WIDGETS[w.id];
          return (
            <li key={w.id} id={`dash-edit-row-${w.id}`} className="flex items-center gap-1 py-1.5 border-b border-slate-100 dark:border-slate-800 min-w-0">
              <button
                type="button"
                id={`dash-edit-toggle-${w.id}`}
                aria-pressed={w.visible}
                onClick={() => toggle(w.id)}
                className="min-w-0 flex-1 min-h-[44px] flex items-center gap-2.5 text-left rounded-xl px-1.5 hover:bg-slate-50 dark:hover:bg-slate-800/60"
              >
                <span
                  className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${
                    w.visible ? 'bg-sky-500/10 text-sky-600 dark:text-sky-400' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {w.visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                </span>
                <span className="min-w-0">
                  <span className={`block text-xs font-bold truncate ${w.visible ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 dark:text-slate-500 line-through'}`}>
                    {meta.label}
                  </span>
                  <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">{meta.hint}</span>
                </span>
              </button>
              <button type="button" id={`dash-edit-up-${w.id}`} aria-label={`Subir ${meta.label}`} disabled={i === 0} onClick={() => move(w.id, -1)} className={iconBtn}>
                <ArrowUp className="h-4 w-4" />
              </button>
              <button
                type="button"
                id={`dash-edit-down-${w.id}`}
                aria-label={`Descer ${meta.label}`}
                disabled={i === list.length - 1}
                onClick={() => move(w.id, 1)}
                className={iconBtn}
              >
                <ArrowDown className="h-4 w-4" />
              </button>
            </li>
          );
        })}
      </ul>

      <button
        type="button"
        id="dash-edit-reset"
        onClick={onReset}
        className="mt-3 min-h-[40px] px-2 -ml-2 rounded-xl text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 inline-flex items-center gap-1.5"
      >
        <RotateCcw className="h-3.5 w-3.5" /> Restaurar padrão
      </button>
    </div>
  );
};
