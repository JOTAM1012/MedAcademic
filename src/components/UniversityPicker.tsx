import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check, GraduationCap, PenLine, Search, X } from 'lucide-react';
import { CATEGORY_STYLE, schoolByCode, searchSchools } from '../data/medicalSchools';

export interface UniversityValue {
  /** o que aparece no perfil: a sigla (ou o nome digitado em "Outra") */
  university: string;
  universityCode?: string;
  universityName?: string;
}

interface Props {
  value: UniversityValue;
  onChange: (v: UniversityValue) => void;
  autoFocus?: boolean;
}

// Faculdade: busca na lista do e-MEC por nome ou sigla; "Outra" para quem não encontrar a sua
export const UniversityPicker: React.FC<Props> = ({ value, onChange, autoFocus }) => {
  const selected = schoolByCode(value.universityCode);
  const isOther = !selected && !!value.university;
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [otherMode, setOtherMode] = useState(isOther);
  const [otherName, setOtherName] = useState(isOther ? value.universityName || value.university : '');
  const [otherSigla, setOtherSigla] = useState(isOther && value.universityName ? value.university : '');
  const [highlight, setHighlight] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => searchSchools(query, 8), [query]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const pick = (code: string) => {
    const s = schoolByCode(code);
    if (!s) return;
    onChange({ university: s.sigla.toUpperCase(), universityCode: s.code, universityName: s.name });
    setQuery('');
    setOpen(false);
    setOtherMode(false);
  };

  const applyOther = (name: string, sigla: string) => {
    const n = name.trim();
    const sg = sigla.trim();
    onChange({ university: (sg || n).toUpperCase(), universityCode: undefined, universityName: n || undefined });
  };

  const inputCls =
    'w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 transition-colors';

  if (otherMode) {
    return (
      <div id="university-other" className="space-y-2.5 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5 text-xs font-black text-amber-300">
            <PenLine className="h-3.5 w-3.5" /> Outra faculdade
          </span>
          <button
            type="button"
            onClick={() => {
              setOtherMode(false);
              onChange({ university: '', universityCode: undefined, universityName: undefined });
            }}
            className="text-[11px] font-bold text-sky-400 hover:underline"
          >
            Voltar para a lista
          </button>
        </div>
        <input
          id="university-other-name"
          value={otherName}
          onChange={(e) => {
            setOtherName(e.target.value);
            applyOther(e.target.value, otherSigla);
          }}
          placeholder="Nome da sua faculdade"
          className={inputCls}
          autoFocus
        />
        <input
          id="university-other-sigla"
          value={otherSigla}
          onChange={(e) => {
            const v = e.target.value.toUpperCase();
            setOtherSigla(v);
            applyOther(otherName, v);
          }}
          placeholder="Sigla (opcional) — é o que aparece no seu perfil"
          className={inputCls}
          maxLength={24}
        />
      </div>
    );
  }

  return (
    <div ref={boxRef} className="relative space-y-2">
      {selected ? (
        <div id="university-selected" className="flex items-center gap-3 rounded-2xl border border-sky-500/60 bg-sky-950/40 px-4 py-3">
          <div className="h-9 w-9 shrink-0 rounded-xl bg-sky-500/20 text-sky-300 grid place-items-center">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-black text-white">{selected.sigla.toUpperCase()}</div>
            <div className="text-[11px] text-slate-400 truncate">{selected.name}</div>
          </div>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${CATEGORY_STYLE[selected.category]}`}>{selected.category}</span>
          <button
            type="button"
            onClick={() => {
              onChange({ university: '', universityCode: undefined, universityName: undefined });
              setOpen(true);
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            aria-label="Trocar faculdade"
            title="Trocar faculdade"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="relative">
          <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-500" />
          <input
            id="university-search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
              setHighlight(0);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setHighlight((h) => Math.min(h + 1, results.length - 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setHighlight((h) => Math.max(h - 1, 0));
              } else if (e.key === 'Enter' && results[highlight]) {
                e.preventDefault();
                pick(results[highlight].code);
              }
            }}
            placeholder="Digite a sigla ou o nome (ex: UFPA, USP, Estado do Pará...)"
            className={`${inputCls} pl-11`}
            autoFocus={autoFocus}
            autoComplete="off"
          />
        </div>
      )}

      {!selected && open && query.trim() && (
        <div id="university-results" className="absolute left-0 right-0 top-[3.4rem] z-30 rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl overflow-hidden">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-400">Nenhuma faculdade encontrada com "{query}".</div>
          ) : (
            results.map((s, i) => (
              <button
                key={s.code}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(s.code)}
                className={`university-option w-full text-left flex items-center gap-3 px-4 py-2.5 ${i === highlight ? 'bg-slate-800' : ''}`}
              >
                <span className="w-24 shrink-0 text-xs font-black text-sky-300 truncate">{s.sigla.toUpperCase()}</span>
                <span className="flex-1 min-w-0 text-xs text-slate-200 truncate">{s.name}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${CATEGORY_STYLE[s.category]}`}>{s.category}</span>
                {value.universityCode === s.code && <Check className="h-3.5 w-3.5 text-sky-400" />}
              </button>
            ))
          )}
          <button
            type="button"
            onClick={() => {
              setOtherMode(true);
              setOtherName(query);
              applyOther(query, '');
              setOpen(false);
            }}
            className="w-full text-left flex items-center gap-2 px-4 py-2.5 border-t border-slate-800 text-xs font-bold text-amber-300 hover:bg-slate-800"
          >
            <PenLine className="h-3.5 w-3.5" /> Não encontrei: digitar outra faculdade
          </button>
        </div>
      )}

      {!selected && (
        <button
          type="button"
          id="university-other-btn"
          onClick={() => {
            setOtherMode(true);
            setOtherName(query);
            if (query) applyOther(query, '');
          }}
          className="text-[11px] font-bold text-slate-400 hover:text-amber-300"
        >
          Minha faculdade não está na lista → <span className="underline">Outra</span>
        </button>
      )}
    </div>
  );
};
