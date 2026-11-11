// "Meu método de estudo": os passos do 1º contato (tema novo) e do 2º contato (1ª revisão, 24 h depois).
// O aluno escolhe um modelo pronto ou escreve os próprios passos (um por linha).
import React from 'react';
import { METHOD_PRESETS } from '../../data/studyMethod';

interface Props {
  first: string[] | undefined;
  second: string[] | undefined;
  onChange: (first: string[] | undefined, second: string[] | undefined) => void;
}

const same = (a: string[] | undefined, b: string[]) => !!a && a.length === b.length && a.every((x, i) => x === b[i]);
const toLines = (v: string) =>
  v
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-•])\s*/, '').trim())
    .filter(Boolean);

export const MethodEditor: React.FC<Props> = ({ first, second, onChange }) => {
  const guide = METHOD_PRESETS[0];
  const active = !first && !second ? 'guia' : METHOD_PRESETS.find((p) => p.id !== 'guia' && same(first, p.first) && same(second, p.second))?.id || 'meu';
  const f = first || guide.first;
  const s = second || guide.second;
  const area =
    'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2 text-sm leading-relaxed text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-sky-500';

  return (
    <div id="routine-method" className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-1.5">
        {METHOD_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            id={`method-preset-${p.id}`}
            aria-pressed={active === p.id}
            onClick={() => (p.id === 'guia' ? onChange(undefined, undefined) : onChange([...p.first], [...p.second]))}
            className={`min-h-[52px] rounded-xl border px-3 py-2 text-left transition-colors ${
              active === p.id ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400'
            }`}
          >
            <span className="block text-xs font-black">{p.label}</span>
            <span className={`block text-[11px] ${active === p.id ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>{p.hint}</span>
          </button>
        ))}
        <span
          className={`min-h-[52px] rounded-xl border px-3 py-2 ${active === 'meu' ? 'bg-sky-600 border-sky-600 text-white' : 'border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
        >
          <span className="block text-xs font-black">Do meu jeito</span>
          <span className="block text-[11px]">Edite os passos abaixo</span>
        </span>
      </div>

      <label className="block">
        <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">🌱 1º contato com o tema (tema novo)</span>
        <textarea
          id="method-first"
          rows={Math.max(4, f.length + 1)}
          value={f.join('\n')}
          onChange={(e) => onChange(toLines(e.target.value).length ? e.target.value.split(/\r?\n/) : undefined, second)}
          onBlur={(e) => onChange(toLines(e.target.value).length ? toLines(e.target.value) : undefined, second)}
          className={area}
        />
      </label>
      <label className="block">
        <span className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1">📝 2º contato (1ª revisão, 24 h depois)</span>
        <textarea
          id="method-second"
          rows={Math.max(3, s.length + 1)}
          value={s.join('\n')}
          onChange={(e) => onChange(first, toLines(e.target.value).length ? e.target.value.split(/\r?\n/) : undefined)}
          onBlur={(e) => onChange(first, toLines(e.target.value).length ? toLines(e.target.value) : undefined)}
          className={area}
        />
      </label>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Um passo por linha. Esses passos aparecem no plano do dia e no tema, com um quadradinho para marcar cada um. As revisões seguintes (7 dias, 30 dias…) continuam com questões.
      </p>
    </div>
  );
};
