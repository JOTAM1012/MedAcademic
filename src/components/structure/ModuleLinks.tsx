// Módulo da faculdade: o que está vinculado a ele (disciplinas, outros módulos e assuntos/blocos de outras
// disciplinas), com progresso, e um seletor com busca para vincular/desvincular.
import React, { useMemo, useState } from 'react';
import IconSwap from '../shared/IconSwap';
import { Check, ChevronRight, Link2, Plus, Search, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Subject, TopicBlock } from '../../types';
import { Bar, Ring, isModule, subjectColor, subjectName, topicStats } from './shared';

export const ModuleLinks: React.FC<{ module: Subject; onOpenSubject: (id: string) => void }> = ({ module, onOpenSubject }) => {
  const { subjects, topicBlocks, topics, currentSemester, updateSubject } = useApp();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');

  const pool = useMemo(
    () => subjects.filter((s) => s.id !== module.id && (!s.semesterId || !currentSemester || s.semesterId === currentSemester.id)),
    [subjects, module.id, currentSemester]
  );
  const linkedSubjects = (module.linkedSubjectIds || []).map((id) => subjects.find((s) => s.id === id)).filter(Boolean) as Subject[];
  const linkedBlocks = (module.linkedBlockIds || []).map((id) => topicBlocks.find((b) => b.id === id)).filter(Boolean) as TopicBlock[];
  const subSet = new Set(linkedSubjects.map((s) => s.id));
  const blockSet = new Set(linkedBlocks.map((b) => b.id));

  const toggleSubject = (id: string) => {
    const next = subSet.has(id) ? linkedSubjects.filter((s) => s.id !== id).map((s) => s.id) : [...linkedSubjects.map((s) => s.id), id];
    updateSubject(module.id, { linkedSubjectIds: next.length ? next : undefined }, { silent: true });
  };
  const toggleBlock = (id: string) => {
    const next = blockSet.has(id) ? linkedBlocks.filter((b) => b.id !== id).map((b) => b.id) : [...linkedBlocks.map((b) => b.id), id];
    updateSubject(module.id, { linkedBlockIds: next.length ? next : undefined }, { silent: true });
  };

  const term = q.trim().toLowerCase();
  const match = (txt: string) => !term || txt.toLowerCase().includes(term);
  const subjectHits = pool.filter((s) => match(`${subjectName(s)} ${s.majorArea || ''}`)).slice(0, 40);
  const blockHits = topicBlocks
    .filter((b) => pool.some((s) => s.id === b.subjectId))
    .filter((b) => match(`${b.name} ${subjectName(pool.find((s) => s.id === b.subjectId)!)}`))
    .slice(0, 60);

  const total = linkedSubjects.length + linkedBlocks.length;

  return (
    <section id="module-links" className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Link2 className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Vinculados a este módulo
          </h2>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Disciplinas, outros módulos e assuntos que fazem parte deste módulo. O progresso deles aparece aqui.
          </p>
        </div>
        <button
          type="button"
          id="module-link-btn"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="shrink-0 min-h-[40px] px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black inline-flex items-center gap-1.5"
        >
          <IconSwap swapped={open} from={<Plus className="h-4 w-4" />} to={<Check className="h-4 w-4" />} /> {open ? 'Pronto' : 'Vincular'}
        </button>
      </div>

      {/* Vinculados */}
      {total === 0 && !open && (
        <p className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-3 text-[12px] text-slate-500 dark:text-slate-400">
          Nada vinculado ainda. Toque em "Vincular" para ligar disciplinas, módulos ou assuntos.
        </p>
      )}
      {linkedSubjects.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {linkedSubjects.map((s) => {
            const st = topicStats(topics.filter((t) => t.subjectId === s.id));
            return (
              <div key={s.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5">
                <button type="button" onClick={() => onOpenSubject(s.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left">
                  <Ring pct={st.pct} color={subjectColor(s)} size={36} />
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-slate-900 dark:text-white truncate">{subjectName(s)}</span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {isModule(s) ? 'Módulo' : s.majorArea || 'Disciplina'} · {st.seen}/{st.total}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" />
                </button>
                <button type="button" aria-label={`Desvincular ${subjectName(s)}`} onClick={() => toggleSubject(s.id)} className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                  <X className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
      {linkedBlocks.length > 0 && (
        <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {linkedBlocks.map((b) => {
            const sub = subjects.find((s) => s.id === b.subjectId);
            const st = topicStats(topics.filter((t) => t.blockId === b.id));
            return (
              <li key={b.id} className="flex items-center gap-2 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{b.name}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                    {sub ? subjectName(sub) : ''} · {b.reviewStatus === 'estudando' ? 'em estudo' : 'em revisão'} · {st.seen}/{st.total}
                  </p>
                  <Bar pct={st.pct} color={sub ? subjectColor(sub) : '#0ea5e9'} className="mt-1" />
                </div>
                <button type="button" aria-label={`Desvincular ${b.name}`} onClick={() => toggleBlock(b.id)} className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10">
                  <X className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Seletor */}
      {open && (
        <div id="module-link-picker" className="rounded-2xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/50 dark:bg-sky-500/5 p-3 space-y-3">
          <label className="relative block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="module-link-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar disciplina, módulo ou assunto…"
              className="w-full min-w-0 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
            />
          </label>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Disciplinas e módulos</p>
            {subjectHits.length === 0 ? (
              <p className="text-[12px] text-slate-500 dark:text-slate-400">Nada encontrado.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {subjectHits.map((s) => {
                  const on = subSet.has(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      id={`module-link-subject-${s.id}`}
                      aria-pressed={on}
                      onClick={() => toggleSubject(s.id)}
                      className={`min-h-[36px] max-w-full px-3 rounded-full border text-[12px] font-bold inline-flex items-center gap-1.5 transition-colors ${
                        on ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:border-sky-400'
                      }`}
                    >
                      {on && <Check className="h-3.5 w-3.5 shrink-0" />}
                      <span className="truncate">{subjectName(s)}</span>
                      {isModule(s) && <span className={`text-[10px] ${on ? 'text-sky-100' : 'text-slate-400'}`}>módulo</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          <div>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Assuntos (blocos)</p>
            {blockHits.length === 0 ? (
              <p className="text-[12px] text-slate-500 dark:text-slate-400">Nada encontrado.</p>
            ) : (
              <ul className="max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800">
                {blockHits.map((b) => {
                  const on = blockSet.has(b.id);
                  const sub = pool.find((s) => s.id === b.subjectId);
                  return (
                    <li key={b.id}>
                      <button
                        type="button"
                        id={`module-link-block-${b.id}`}
                        aria-pressed={on}
                        onClick={() => toggleBlock(b.id)}
                        className="w-full min-h-[44px] flex items-center gap-2.5 px-3 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <span className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center ${on ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                          {on && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[13px] font-bold text-slate-900 dark:text-white truncate">{b.name}</span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">{sub ? subjectName(sub) : ''}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      )}
    </section>
  );
};
