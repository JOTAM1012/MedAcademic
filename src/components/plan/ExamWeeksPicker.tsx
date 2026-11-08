// Semanas de prova: o aluno marca as semanas em que o estudo fica intensificado (+50% de foco,
// prioridade para as matérias da prova). As semanas com prova cadastrada aparecem com selo.
import React, { useMemo } from 'react';
import { useApp } from '../../context/AppContext';

const pad = (n: number) => String(n).padStart(2, '0');
const ymdOf = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const ExamWeeksPicker: React.FC<{ value?: string[]; onChange: (v: string[] | undefined) => void }> = ({ value, onChange }) => {
  const { exams } = useApp();
  const weeks = useMemo(() => {
    const now = new Date();
    const mon = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    mon.setDate(mon.getDate() - ((mon.getDay() + 6) % 7));
    return Array.from({ length: 10 }, (_, k) => {
      const a = new Date(mon);
      a.setDate(mon.getDate() + k * 7);
      const b = new Date(a);
      b.setDate(a.getDate() + 6);
      const start = ymdOf(a);
      const end = ymdOf(b);
      const n = exams.filter((e) => e.grade === undefined && e.date >= start && e.date <= end).length;
      const label = a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${MONTHS[a.getMonth()]}` : `${a.getDate()} ${MONTHS[a.getMonth()]}–${b.getDate()} ${MONTHS[b.getMonth()]}`;
      return { start, label, n, current: k === 0 };
    });
  }, [exams]);
  const set = new Set(value || []);
  const toggle = (w: string) => {
    const next = new Set(set);
    if (next.has(w)) next.delete(w);
    else next.add(w);
    const arr = Array.from(next).sort();
    onChange(arr.length ? arr : undefined);
  };
  const withExam = weeks.filter((w) => w.n > 0 && !set.has(w.start));

  return (
    <div id="routine-exam-weeks" className="space-y-2">
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
        {weeks.map((w) => {
          const on = set.has(w.start);
          return (
            <button
              key={w.start}
              type="button"
              id={`exam-week-${w.start}`}
              onClick={() => toggle(w.start)}
              aria-pressed={on}
              className={`min-h-[52px] rounded-xl border px-2 py-1.5 text-left transition-colors ${
                on ? 'bg-amber-500 border-amber-500 text-slate-950' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-amber-400'
              }`}
            >
              <span className="block text-xs font-black">{w.current ? 'Esta semana' : w.label}</span>
              <span className={`block text-[10.5px] ${on ? 'text-slate-900/80' : 'text-slate-500 dark:text-slate-400'}`}>
                {w.n > 0 ? `📝 ${w.n} prova${w.n > 1 ? 's' : ''}` : w.current ? w.label : 'sem prova'}
              </span>
            </button>
          );
        })}
      </div>
      {withExam.length > 0 && (
        <button
          type="button"
          id="exam-weeks-auto"
          onClick={() => onChange(Array.from(new Set([...(value || []), ...withExam.map((w) => w.start)])).sort())}
          className="min-h-[40px] text-xs font-bold text-amber-700 dark:text-amber-300 hover:underline"
        >
          Marcar as semanas que têm prova ({withExam.length})
        </button>
      )}
    </div>
  );
};
