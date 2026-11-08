import React, { useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ExamLink } from '../../types';

interface ExamSubjectPickerProps {
  value: ExamLink | undefined;
  onChange: (link: ExamLink | undefined) => void;
  autoFocus?: boolean;
}

const KIND_LABEL: Record<ExamLink['kind'], string> = {
  subject: 'Disciplina',
  module: 'Módulo',
  area: 'Grande área',
  project: 'Estudo pessoal',
  manual: 'Digitado',
};

const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

// Disciplina da prova: escolher do que já existe (Disciplinas, módulos, grandes áreas, Estudos pessoais) ou digitar
export const ExamSubjectPicker: React.FC<ExamSubjectPickerProps> = ({ value, onChange, autoFocus }) => {
  const { subjects, studyMethod } = useApp();
  const [open, setOpen] = useState(false);
  const blurTimer = useRef<number | undefined>(undefined);
  const text = value?.label || '';

  const options = useMemo(() => {
    const list: Array<ExamLink & { hint?: string }> = [];
    subjects.forEach((s) =>
      list.push({ kind: 'subject', id: s.id, label: s.name, hint: [s.universitySubject, s.majorArea].filter((x) => x && x !== s.name).join(' · ') })
    );
    Array.from(new Set<string>(subjects.map((s) => (s.universitySubject || '').trim()).filter(Boolean)))
      .filter((m) => !subjects.some((s) => s.name === m))
      .forEach((m) => list.push({ kind: 'module', id: m, label: m }));
    Array.from(new Set<string>(subjects.map((s) => (s.majorArea || '').trim()).filter(Boolean))).forEach((a) => list.push({ kind: 'area', id: a, label: a }));
    (studyMethod.projects || [])
      .filter((p) => !p.archived)
      .forEach((p) => list.push({ kind: 'project', id: p.id, label: p.title, hint: p.emoji }));
    return list;
  }, [subjects, studyMethod.projects]);

  const q = norm(value?.kind === 'manual' ? text : '');
  const filtered = options.filter((o) => !q || norm(o.label).includes(q) || norm(o.hint || '').includes(q)).slice(0, 40);
  const groups = (['subject', 'module', 'area', 'project'] as const)
    .map((k) => ({ kind: k, items: filtered.filter((o) => o.kind === k) }))
    .filter((g) => g.items.length);

  const linked = value && value.kind !== 'manual';

  return (
    <div className="relative">
      {linked ? (
        <div className="flex items-center gap-2 rounded-xl border border-sky-300 dark:border-sky-800 bg-sky-50/70 dark:bg-sky-950/30 pl-3 pr-1 min-h-10">
          <span className="min-w-0 flex-1 text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{value!.label}</span>
          <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-900">
            {KIND_LABEL[value!.kind]}
          </span>
          <button
            type="button"
            onClick={() => {
              onChange(undefined);
              setOpen(true);
            }}
            className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            aria-label="Trocar disciplina"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <input
          id="exam-subject"
          type="text"
          autoComplete="off"
          autoFocus={autoFocus}
          placeholder="Escolha ou digite: Cardiologia, Anatomia II…"
          value={text}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            blurTimer.current = window.setTimeout(() => setOpen(false), 150);
          }}
          onChange={(e) => {
            const v = e.target.value;
            onChange(v ? { kind: 'manual', label: v } : undefined);
            setOpen(true);
          }}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
        />
      )}

      {open && !linked && groups.length > 0 && (
        <div
          id="exam-subject-options"
          className="absolute z-20 left-0 right-0 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1"
          onMouseDown={(e) => e.preventDefault()}
        >
          {groups.map((g) => (
            <div key={g.kind} className="py-0.5">
              <p className="px-2 pt-1.5 pb-0.5 text-[10px] font-black uppercase tracking-wider text-slate-400">{KIND_LABEL[g.kind]}</p>
              {g.items.map((o) => (
                <button
                  key={`${o.kind}-${o.id}`}
                  type="button"
                  onClick={() => {
                    window.clearTimeout(blurTimer.current);
                    onChange({ kind: o.kind, id: o.id, label: o.label });
                    setOpen(false);
                  }}
                  className="w-full min-h-10 px-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
                >
                  <span className="min-w-0 flex-1 text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{o.label}</span>
                  {o.hint && <span className="shrink-0 max-w-[45%] text-[10px] text-slate-400 truncate">{o.hint}</span>}
                </button>
              ))}
            </div>
          ))}
          {value?.kind === 'manual' && text.trim() && (
            <p className="px-2 py-1.5 text-[10px] text-slate-400">Ou continue digitando para usar “{text.trim()}”.</p>
          )}
        </div>
      )}
    </div>
  );
};
