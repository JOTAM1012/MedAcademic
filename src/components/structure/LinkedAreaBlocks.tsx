import React, { useMemo, useState } from 'react';
import { Link2, Plus, Search, X, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Subject, TopicBlock } from '../../types';
import { getMedicalArea } from '../../data/areas';
import { hasArea, subjectColor, subjectName, topicStats } from './shared';

// Visão por módulo: liga assuntos (blocos) das grandes áreas a um bloco da faculdade
export const LinkedAreaBlocks: React.FC<{ block: TopicBlock; subject: Subject }> = ({ block, subject }) => {
  const { subjects, topicBlocks, topics, currentSemester, updateTopicBlock } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const areaSubjects = useMemo(
    () =>
      subjects.filter(
        (s) => s.id !== subject.id && hasArea(s) && (!s.semesterId || !currentSemester || s.semesterId === currentSemester.id)
      ),
    [subjects, subject.id, currentSemester]
  );
  const candidates = useMemo(() => {
    const ids = new Set(areaSubjects.map((s) => s.id));
    return topicBlocks.filter((b) => ids.has(b.subjectId) && b.id !== block.id);
  }, [topicBlocks, areaSubjects, block.id]);

  if (candidates.length === 0) return null;

  const linked = (block.linkedAreaBlockIds || [])
    .map((id) => topicBlocks.find((b) => b.id === id))
    .filter(Boolean) as TopicBlock[];
  const linkedSet = new Set(linked.map((b) => b.id));
  const toggle = (id: string) => {
    const next = linkedSet.has(id) ? linked.filter((b) => b.id !== id).map((b) => b.id) : [...linked.map((b) => b.id), id];
    updateTopicBlock(block.id, { linkedAreaBlockIds: next.length ? next : undefined });
  };

  const subOf = (b: TopicBlock) => areaSubjects.find((s) => s.id === b.subjectId);
  const term = q.trim().toLowerCase();
  const filtered = candidates.filter((b) => {
    if (!term) return true;
    const s = subOf(b);
    return b.name.toLowerCase().includes(term) || (s ? subjectName(s).toLowerCase().includes(term) : false);
  });

  return (
    <div className="mt-3">
      {linked.length > 0 && (
        <div className="mb-2 space-y-1">
          <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Estudar junto (grandes áreas)</p>
          <ul className="flex flex-wrap gap-1.5">
            {linked.map((b) => {
              const s = subOf(b);
              const color = s ? subjectColor(s) : '#64748b';
              const st = topicStats(topics.filter((t) => t.blockId === b.id));
              return (
                <li key={b.id} className="inline-flex items-center gap-1 max-w-full rounded-full pl-2.5 pr-1 h-8 text-[11px] font-bold" style={{ backgroundColor: `${color}14`, color }}>
                  <span className="truncate">{b.name}</span>
                  <span className="shrink-0 text-slate-500 dark:text-slate-400 font-semibold">
                    {st.seen}/{st.total}
                  </span>
                  <button type="button" onClick={() => toggle(b.id)} className="h-7 w-7 shrink-0 grid place-items-center rounded-full hover:bg-white/60 dark:hover:bg-slate-900/60" aria-label={`Desvincular ${b.name}`}>
                    <X className="h-3 w-3" />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      <button
        type="button"
        id={`struct-link-${block.id}`}
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="h-10 inline-flex items-center gap-1.5 px-2 rounded-xl text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-sky-600 dark:hover:text-sky-400"
      >
        <Link2 className="h-3.5 w-3.5" /> Vincular assunto das grandes áreas
      </button>
      {open && (
        <div className="mt-1 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar assunto ou disciplina"
              className="w-full h-10 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 pl-8 pr-3 text-xs text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-sky-500"
            />
          </div>
          <ul className="max-h-60 overflow-y-auto space-y-0.5">
            {filtered.map((b) => {
              const s = subOf(b);
              const on = linkedSet.has(b.id);
              const color = s ? subjectColor(s) : '#64748b';
              return (
                <li key={b.id}>
                  <button
                    type="button"
                    onClick={() => toggle(b.id)}
                    aria-pressed={on}
                    className="w-full min-h-[44px] flex items-center gap-2.5 rounded-xl px-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{b.name}</span>
                      <span className="block text-[10px] text-slate-500 truncate">
                        {s ? `${getMedicalArea(s.majorArea).id} · ${subjectName(s)}` : ''}
                      </span>
                    </span>
                    <span className={`h-6 w-6 shrink-0 rounded-full grid place-items-center ${on ? 'bg-sky-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}>
                      {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                    </span>
                  </button>
                </li>
              );
            })}
            {filtered.length === 0 && <li className="text-[11px] text-slate-500 px-2 py-2">Nada encontrado.</li>}
          </ul>
        </div>
      )}
    </div>
  );
};
