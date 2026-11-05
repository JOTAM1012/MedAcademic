import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Subject, TutorialSession } from '../types';
import { HangerIcon } from './TutoriaPanel';
import { getSubjectFormat } from '../data/subjectFormats';

const fmtG = (n?: number) => (n === undefined ? '—' : String(Math.round(n * 10) / 10).replace('.', ','));
export const tutorialTotal = (t: TutorialSession) =>
  t.openingGrade === undefined && t.closingGrade === undefined ? undefined : (t.openingGrade || 0) + (t.closingGrade || 0);
/** média (0–10) das tutorias com nota de um módulo */
export const moduleTutoriaAverage = (s: Subject) => {
  const l = (s.tutorials || []).map(tutorialTotal).filter((v): v is number => v !== undefined);
  return l.length ? l.reduce((a, b) => a + b, 0) / l.length : undefined;
};
export const FOCUS_SUBJECT_KEY = 'medacademic_focus_subject';

interface Props {
  modules: Subject[];
}

// Avaliações: notas das tutorias (abertura + fechamento) de cada módulo, editáveis aqui mesmo
export const TutoriaGradesSection: React.FC<Props> = ({ modules }) => {
  const { updateSubject, setCurrentTab } = useApp();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const color = getSubjectFormat('tutoria').color;
  if (modules.length === 0) return null;

  const commit = (s: Subject, t: TutorialSession, key: 'openingGrade' | 'closingGrade') => {
    const k = `${t.id}-${key}`;
    const raw = drafts[k];
    if (raw === undefined) return;
    setDrafts(({ [k]: _, ...rest }) => rest);
    const v = raw.trim() === '' ? undefined : Number(raw.replace(',', '.'));
    if (v !== undefined && (!Number.isFinite(v) || v < 0 || v > 5)) return;
    if (v === t[key]) return;
    updateSubject(s.id, { tutorials: (s.tutorials || []).map((x) => (x.id === t.id ? { ...x, [key]: v } : x)) }, { silent: true });
  };

  const open = (s: Subject) => {
    try {
      sessionStorage.setItem(FOCUS_SUBJECT_KEY, s.id);
    } catch {
      /* ignore */
    }
    setCurrentTab('structure');
  };

  const cell = (s: Subject, t: TutorialSession, key: 'openingGrade' | 'closingGrade') => {
    const k = `${t.id}-${key}`;
    return (
      <input
        inputMode="decimal"
        aria-label={`${key === 'openingGrade' ? 'Abertura' : 'Fechamento'} de ${t.name}`}
        placeholder="—"
        value={drafts[k] ?? (t[key] !== undefined ? fmtG(t[key]) : '')}
        onChange={(e) => setDrafts((d) => ({ ...d, [k]: e.target.value }))}
        onBlur={() => commit(s, t, key)}
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
        className="tutoria-grade-cell w-12 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/70 py-1 text-center text-xs font-black text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
      />
    );
  };

  return (
    <div id="tutoria-grades-section" className="space-y-3">
      <h2 className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
        <span className="text-base">🧩</span> Tutorias do semestre
        <span className="text-[11px] font-semibold text-slate-500">abertura + fechamento (0–10) · entram na média lançada</span>
      </h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {modules.map((s) => {
          const avg = moduleTutoriaAverage(s);
          const tuts = s.tutorials || [];
          const missing = tuts.filter((t) => t.closingGrade === undefined).length;
          return (
            <div key={s.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800" style={{ borderLeft: `4px solid ${color}` }}>
                <div className="min-w-0">
                  <div className="text-sm font-black text-slate-900 dark:text-white truncate">{s.universitySubject || s.name}</div>
                  <div className="text-[11px] text-slate-500">
                    {tuts.length} tutorias{missing ? ` · ${missing} sem fechamento` : ' · todas fechadas'}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <div className="text-[9px] font-black uppercase tracking-wider text-slate-400">Média</div>
                    <div className="text-lg font-black leading-none" style={{ color }}>
                      {fmtG(avg)}
                      <span className="text-[10px] text-slate-400">/10</span>
                    </div>
                  </div>
                  <button
                    onClick={() => open(s)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800"
                    title="Abrir em Disciplinas & assuntos"
                    aria-label="Abrir módulo"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="px-4 py-2">
                <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-3 gap-y-1.5 text-[11px]">
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400">Tutoria</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 text-center w-12">Abert.</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 text-center w-12">Fech.</span>
                  <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 text-right w-12">Total</span>
                  {tuts.map((t) => {
                    const total = tutorialTotal(t);
                    return (
                      <React.Fragment key={t.id}>
                        <span className="flex items-center gap-1.5 min-w-0 font-bold text-slate-700 dark:text-slate-200">
                          <span className="truncate">{t.name}</span>
                          {t.cabide && (
                            <span className="text-rose-500 shrink-0" title="Ficou de cabide">
                              <HangerIcon className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </span>
                        {cell(s, t, 'openingGrade')}
                        {cell(s, t, 'closingGrade')}
                        <span className={`text-right w-12 text-xs font-black ${total === undefined ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}>{fmtG(total)}</span>
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
