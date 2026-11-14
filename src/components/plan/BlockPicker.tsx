// Escolha do "meu bloco" de foco: atalhos comuns (25, 30, 40, 45, 50, 60 min) ou outro tempo (10 a 120 min).
// Usado em Minha rotina (bloco longo e bloco curto).
import React, { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { OptionChip } from './planShared';

export const BLOCK_PRESETS: Array<{ focus: number; rest: number; hint: string }> = [
  { focus: 25, rest: 5, hint: 'Pomodoro clássico' },
  { focus: 30, rest: 5, hint: 'recomendado' },
  { focus: 40, rest: 10, hint: 'médio' },
  { focus: 45, rest: 15, hint: 'pausa maior' },
  { focus: 50, rest: 10, hint: 'imersão' },
  { focus: 60, rest: 10, hint: 'foco longo' },
];

export const FOCUS_MIN = 10;
export const FOCUS_MAX = 120;
export const REST_MAX = 60;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Math.round(v) || lo));

interface BlockPickerProps {
  idPrefix: string;
  focus: number;
  rest: number;
  onChange: (focus: number, rest: number) => void;
  /** Atalhos a mostrar (padrão: todos) */
  presets?: typeof BLOCK_PRESETS;
}

export const BlockPicker: React.FC<BlockPickerProps> = ({ idPrefix, focus, rest, onChange, presets = BLOCK_PRESETS }) => {
  const isPreset = presets.some((p) => p.focus === focus && p.rest === rest);
  const [custom, setCustom] = useState(!isPreset);
  const [f, setF] = useState(String(focus));
  const [r, setR] = useState(String(rest));

  useEffect(() => {
    setF(String(focus));
    setR(String(rest));
  }, [focus, rest]);

  const applyCustom = (nf: string, nr: string) => {
    setF(nf);
    setR(nr);
    const fv = Number(nf);
    const rv = Number(nr);
    if (nf !== '' && nr !== '' && !Number.isNaN(fv) && !Number.isNaN(rv)) onChange(clamp(fv, FOCUS_MIN, FOCUS_MAX), clamp(rv, 0, REST_MAX));
  };

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
        {presets.map((p) => {
          const active = !custom && p.focus === focus && p.rest === rest;
          return (
            <OptionChip
              key={`${p.focus}-${p.rest}`}
              id={`${idPrefix}-${p.focus}-${p.rest}`}
              active={active}
              onClick={() => {
                setCustom(false);
                onChange(p.focus, p.rest);
              }}
              className="min-h-[48px] text-left"
            >
              <span className="block text-sm">
                {p.focus}/{p.rest}
              </span>
              <span className={`block text-[10px] font-semibold ${active ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>{p.hint}</span>
            </OptionChip>
          );
        })}
        <OptionChip id={`${idPrefix}-custom`} active={custom} onClick={() => setCustom(true)} className="min-h-[48px] text-left">
          <span className="flex items-center gap-1 text-sm">
            <Pencil className="h-3.5 w-3.5" /> Outro
          </span>
          <span className={`block text-[10px] font-semibold ${custom ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>
            {custom ? `${focus}/${rest}` : 'você escolhe'}
          </span>
        </OptionChip>
      </div>
      {custom && (
        <div className="mt-2 grid grid-cols-2 gap-2">
          <label className="block">
            <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Foco (min)</span>
            <input
              id={`${idPrefix}-custom-focus`}
              type="number"
              inputMode="numeric"
              min={FOCUS_MIN}
              max={FOCUS_MAX}
              value={f}
              onChange={(e) => applyCustom(e.target.value, r)}
              onBlur={() => applyCustom(String(clamp(Number(f), FOCUS_MIN, FOCUS_MAX)), r)}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </label>
          <label className="block">
            <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1">Pausa (min)</span>
            <input
              id={`${idPrefix}-custom-rest`}
              type="number"
              inputMode="numeric"
              min={0}
              max={REST_MAX}
              value={r}
              onChange={(e) => applyCustom(f, e.target.value)}
              onBlur={() => applyCustom(f, String(clamp(Number(r), 0, REST_MAX)))}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </label>
          <p className="col-span-2 text-[11px] text-slate-500 dark:text-slate-400">
            De {FOCUS_MIN} a {FOCUS_MAX} min de foco. O que funciona para você é o certo: o guia é um modelo, não regra.
          </p>
        </div>
      )}
    </div>
  );
};
