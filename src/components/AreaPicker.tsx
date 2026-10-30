import React from 'react';
import { Check } from 'lucide-react';
import { MEDICAL_AREAS } from '../data/areas';

interface AreaPickerProps {
  value: string | null;
  onChange: (areaId: string) => void;
  label?: string;
}

// Escolha da grande área (define o grupo e a cor da disciplina)
export const AreaPicker: React.FC<AreaPickerProps> = ({ value, onChange, label = 'Grande Área' }) => (
  <div>
    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
      {label} <span className="text-rose-500">*</span>
    </label>
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2" role="radiogroup" aria-label={label}>
      {MEDICAL_AREAS.map((area) => {
        const selected = value === area.id;
        return (
          <button
            key={area.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(area.id)}
            className={`flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left text-xs font-bold transition-all ${
              selected
                ? 'text-white shadow-xs'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
            style={selected ? { backgroundColor: area.color, borderColor: area.color } : undefined}
          >
            <span
              className="h-3 w-3 shrink-0 rounded-full flex items-center justify-center"
              style={{ backgroundColor: selected ? 'rgba(255,255,255,0.9)' : area.color }}
            >
              {selected && <Check className="h-2 w-2" style={{ color: area.color }} strokeWidth={4} />}
            </span>
            <span className="truncate">{area.id}</span>
          </button>
        );
      })}
    </div>
  </div>
);
