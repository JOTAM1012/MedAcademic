import React from 'react';
import { ChevronRight, ArrowRight, Link2 } from 'lucide-react';
import type { Subject, Topic, TopicBlock } from '../../types';
import { Ring, moduleOf, subjectColor, subjectContext, subjectName, topicStats } from './shared';


const NO_MODULE = '__none__';

export const groupByModule = (subjects: Subject[]) => {
  const map = new Map<string, Subject[]>();
  subjects.forEach((s) => {
    const k = moduleOf(s) || NO_MODULE;
    map.set(k, [...(map.get(k) || []), s]);
  });
  return [...map.entries()]
    .sort(([a], [b]) => (a === NO_MODULE ? 1 : b === NO_MODULE ? -1 : a.localeCompare(b, 'pt-BR')))
    .map(([key, items]) => ({ module: key === NO_MODULE ? null : key, items }));
};

interface Props {
  subjects: Subject[];
  topics: Topic[];
  topicBlocks: TopicBlock[];
  onOpen: (subjectId: string) => void;
}

// Visão por módulo/matéria da faculdade: "Módulo → Disciplina"
export const ModuleList: React.FC<Props> = ({ subjects, topics, topicBlocks, onOpen }) => {
  const groups = groupByModule(subjects);
  const onlyNoModule = groups.length === 1 && !groups[0].module;
  return (
    <div className="space-y-6">
      {groups.map(({ module, items }) => (
        <div key={module || 'none'} className="space-y-2">
          {!onlyNoModule && (
            <h3 className="px-1 text-xs font-bold text-slate-500 dark:text-slate-400 truncate">{module || 'Sem módulo definido'}</h3>
          )}
          <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
            {items.map((s) => {
              const st = topicStats(topics.filter((t) => t.subjectId === s.id));
              const color = subjectColor(s);
              const links = topicBlocks
                .filter((b) => b.subjectId === s.id)
                .reduce((a, b) => a + (b.linkedAreaBlockIds?.length || 0), 0);
              return (
                <button
                  key={s.id}
                  type="button"
                  id={`struct-module-subject-${s.id}`}
                  onClick={() => onOpen(s.id)}
                  className="cycle-subject-card w-full text-left flex items-center gap-3 px-4 py-3.5 min-h-[64px] hover:bg-slate-50 dark:hover:bg-slate-800/40 first:rounded-t-3xl last:rounded-b-3xl transition-colors"
                >
                  <Ring pct={st.pct} color={color} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-1 min-w-0 text-sm font-black text-slate-900 dark:text-white">
                      {module && (
                        <>
                          <span className="truncate font-semibold text-slate-500 dark:text-slate-400 max-w-[45%]">{module}</span>
                          <ArrowRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                        </>
                      )}
                      <span className="truncate">{subjectName(s)}</span>
                    </p>
                    <p className="mt-0.5 text-[11px] truncate">
                      <span className="font-semibold" style={{ color }}>
                        {subjectContext(s)}
                      </span>
                      <span className="text-slate-400 dark:text-slate-500">
                        {' '}· {st.seen}/{st.total}
                        {st.pending > 0 ? ` · ${st.pending} ver depois` : ''}
                      </span>
                    </p>
                  </div>
                  {links > 0 && (
                    <span className="shrink-0 inline-flex items-center gap-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400" title="Assuntos das grandes áreas vinculados">
                      <Link2 className="h-3 w-3" />
                      {links}
                    </span>
                  )}
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
