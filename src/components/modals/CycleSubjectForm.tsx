import React from 'react';
import { Check, ListChecks, Layers } from 'lucide-react';
import type { SubjectFormat, SubjectOrganization } from '../../types';
import { DISCIPLINE_SUGGESTIONS, FORMAT_ORDER, getSubjectFormat } from '../../data/subjectFormats';

interface Props {
  cycle: 'ciclo_basico' | 'ciclo_clinico';
  format: SubjectFormat | null;
  onFormat: (f: SubjectFormat) => void;
  name: string;
  onName: (n: string) => void;
  organization: SubjectOrganization;
  onOrganization: (o: SubjectOrganization) => void;
  tutorialCount?: number;
  onTutorialCount?: (n: number) => void;
}

const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5';

// Campos do cadastro de disciplina no Básico/Clínico: Formato → Nome → Como organizar
export const CycleSubjectForm: React.FC<Props> = ({ cycle, format, onFormat, name, onName, organization, onOrganization, tutorialCount, onTutorialCount }) => {
  const isTutoria = format === 'tutoria';
  const info = format ? getSubjectFormat(format) : null;
  const suggestions = format === 'personalizada' ? DISCIPLINE_SUGGESTIONS[cycle] : [];

  return (
    <div className="space-y-4">
      {/* 1. Formato */}
      <div>
        <label className={labelCls}>
          1. Formato na sua faculdade <span className="text-rose-500">*</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label="Formato da disciplina">
          {FORMAT_ORDER[cycle].map((id) => {
            const f = getSubjectFormat(id);
            const on = format === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={on}
                id={`subject-format-${id}`}
                onClick={() => onFormat(id)}
                className={`relative text-left rounded-2xl border p-2.5 transition-all ${
                  on ? 'ring-2 shadow-xs' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
                style={on ? { borderColor: f.color, backgroundColor: `${f.color}14`, ['--tw-ring-color' as any]: `${f.color}55` } : undefined}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{f.emoji}</span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">{f.label}</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">{f.hint}</p>
                {on && (
                  <span className="absolute top-2 right-2 h-4 w-4 rounded-full text-white flex items-center justify-center" style={{ backgroundColor: f.color }}>
                    <Check className="h-2.5 w-2.5" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Nome */}
      <div>
        <label className={labelCls} htmlFor="subject-name">
          2. {format === 'personalizada' ? 'Qual disciplina?' : isTutoria ? 'Módulo' : 'Nome'} <span className="text-rose-500">*</span>
        </label>
        <input
          id="subject-name"
          type="text"
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder={info?.namePlaceholder || 'Escolha o formato primeiro'}
          className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 font-medium"
          required
        />
        {suggestions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onName(s)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
                  name === s
                    ? 'border-indigo-500 bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-bold'
                    : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {isTutoria && organization === 'checklist' && onTutorialCount && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-violet-300/60 dark:border-violet-500/30 bg-violet-50 dark:bg-violet-500/10 px-3 py-2.5">
          <span className="text-xs font-bold text-violet-800 dark:text-violet-200">Quantas tutorias tem o módulo?</span>
          <input
            id="subject-tutorial-count"
            type="number"
            min={1}
            max={20}
            value={tutorialCount ?? 5}
            onChange={(e) => onTutorialCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
            className="w-16 rounded-lg border border-violet-300 dark:border-violet-500/40 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-center font-black"
          />
        </div>
      )}

      {/* 3. Organização */}
      <div>
        <label className={labelCls}>3. Como você quer organizar?</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(
            [
              {
                id: 'checklist' as const,
                icon: ListChecks,
                title: isTutoria ? 'Tutorias' : 'Checklist',
                tag: 'Recomendado',
                desc: isTutoria
                  ? 'Cada tutoria com abertura (nota 0–5 + objetivos) e fechamento (nota 0–5), total 0–10, e o botão de cabide.'
                  : `${info?.group || 'Matéria'} → ${info?.items || 'tópicos'}. Marque como visto, deixe para ver depois ou programe uma data no Planner.`,
              },
              {
                id: 'blocos' as const,
                icon: Layers,
                title: 'Por blocos',
                tag: 'Igual ao Internato',
                desc: 'Ao ver todos os tópicos de um bloco, ele entra sozinho nas Revisões espaçadas (R1, R2...).',
              },
            ]
          ).map((o) => {
            const on = organization === o.id;
            const Icon = o.icon;
            return (
              <button
                key={o.id}
                type="button"
                id={`subject-org-${o.id}`}
                onClick={() => onOrganization(o.id)}
                className={`text-left rounded-2xl border p-3 transition-all ${
                  on
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 ring-2 ring-sky-500/25'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-black text-slate-900 dark:text-white">
                    <Icon className="h-4 w-4 text-sky-500" /> {o.title}
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-200/70 dark:bg-slate-800 text-slate-500">{o.tag}</span>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 leading-snug">{o.desc}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
