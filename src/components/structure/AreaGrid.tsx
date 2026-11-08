import React from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import type { Subject, Topic } from '../../types';
import { MEDICAL_AREAS, OTHER_AREA, getMedicalArea, type MedicalArea } from '../../data/areas';
import { Bar, topicStats } from './shared';

export const areaSlug = (id: string) =>
  id
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-');

export interface AreaGroup {
  area: MedicalArea;
  items: Subject[];
}

/** Disciplinas agrupadas pelas grandes áreas, sempre na mesma ordem ("Outras" no fim) */
export const groupByArea = (subjects: Subject[]): AreaGroup[] =>
  [...MEDICAL_AREAS, OTHER_AREA]
    .map((area) => ({ area, items: subjects.filter((s) => s.kind !== 'module' && getMedicalArea(s.majorArea).id === area.id) }))
    .filter((g) => g.items.length > 0);

interface Props {
  groups: AreaGroup[];
  topics: Topic[];
  onOpen: (areaId: string) => void;
  onAdd: () => void;
}

// Visão por grandes áreas: um card grande por área (disciplinas, assuntos e % de conclusão)
export const AreaGrid: React.FC<Props> = ({ groups, topics, onOpen, onAdd }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
    {groups.map(({ area, items }) => {
      const ids = new Set(items.map((s) => s.id));
      const st = topicStats(topics.filter((t) => ids.has(t.subjectId)));
      const isOther = area.id === OTHER_AREA.id;
      return (
        <button
          key={area.id}
          type="button"
          id={`struct-area-${areaSlug(area.id)}`}
          onClick={() => onOpen(area.id)}
          className="group text-left rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 p-5 transition-colors"
        >
          <div className="flex items-start gap-3">
            <span
              className="h-11 w-11 shrink-0 rounded-2xl grid place-items-center text-[11px] font-black"
              style={{ backgroundColor: `${area.color}1a`, color: area.color }}
            >
              {isOther ? '•••' : area.short}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white truncate">{isOther ? 'Sem grande área' : area.id}</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {items.length} disciplina{items.length === 1 ? '' : 's'} · {st.total} assunto{st.total === 1 ? '' : 's'}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 mt-1 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 transition-colors" />
          </div>
          <div className="mt-5 flex items-end justify-between gap-3">
            <span className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              {st.pct}
              <span className="text-sm text-slate-400">%</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {st.seen}/{st.total} vistos{st.pending > 0 ? ` · ${st.pending} ver depois` : ''}
            </span>
          </div>
          <Bar pct={st.pct} color={area.color} className="mt-2" />
        </button>
      );
    })}
    <button
      type="button"
      onClick={onAdd}
      className="min-h-[140px] rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-400 hover:text-sky-600 hover:border-sky-400 flex flex-col items-center justify-center gap-1.5"
    >
      <Plus className="h-5 w-5" /> Nova disciplina
    </button>
  </div>
);
