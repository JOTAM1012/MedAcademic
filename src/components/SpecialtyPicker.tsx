import React from 'react';
import { CLINICA_MEDICA_SPECIALTIES } from '../data/areas';

interface SpecialtyPickerProps {
  value: string;
  onChange: (specialty: string) => void;
}

// Especialidades da Clínica Médica (aparece quando a grande área é Clínica Médica)
export const SpecialtyPicker: React.FC<SpecialtyPickerProps> = ({ value, onChange }) => (
  <div className="rounded-2xl border border-blue-200/70 dark:border-blue-900/60 bg-blue-50/50 dark:bg-blue-950/20 p-3 animate-in fade-in">
    <div className="flex items-center justify-between mb-2">
      <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Especialidade</label>
      {value && (
        <button type="button" onClick={() => onChange('')} className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
          Limpar
        </button>
      )}
    </div>
    <div id="subject-specialty-picker" className="grid grid-cols-2 sm:grid-cols-3 gap-1.5" role="radiogroup" aria-label="Especialidade">
      {CLINICA_MEDICA_SPECIALTIES.map((sp) => {
        const selected = value === sp.id;
        return (
          <button
            key={sp.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(selected ? '' : sp.id)}
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[11px] font-bold text-left transition-all min-w-0 ${
              selected
                ? 'text-white shadow-xs'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            style={selected ? { backgroundColor: sp.color, borderColor: sp.color } : undefined}
          >
            <span className="text-sm leading-none shrink-0">{sp.emoji}</span>
            <span className="truncate">{sp.id}</span>
          </button>
        );
      })}
    </div>
    <p className="text-[10px] text-slate-500 mt-2">Opcional. O nome da disciplina é preenchido com a especialidade, e você pode editá-lo.</p>
  </div>
);
