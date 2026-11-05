import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

type Unit = 'min' | 'h';

const QUICK: Array<{ label: string; minutes: number }> = [
  { label: '25 min', minutes: 25 },
  { label: '50 min', minutes: 50 },
  { label: '1h', minutes: 60 },
  { label: '1h30', minutes: 90 },
  { label: '2h', minutes: 120 },
  { label: '3h', minutes: 180 },
];

export const formatMinutes = (m: number) => {
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  if (h === 0) return `${r} min`;
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`;
};

// Aba de conclusão: ao fechar um bloco (Dia 0) ou concluir uma revisão, pergunta quanto tempo durou o estudo
export const StudyTimeModal: React.FC = () => {
  const { studyTimePrompt, completeStudyTimePrompt } = useApp();
  const [value, setValue] = useState('');
  const [unit, setUnit] = useState<Unit>('min');

  useEffect(() => {
    setValue('');
    setUnit('min');
  }, [studyTimePrompt?.blockId, studyTimePrompt?.kind, studyTimePrompt?.reviewNumber]);

  if (!studyTimePrompt) return null;
  const p = studyTimePrompt;
  const num = Number(value.replace(',', '.'));
  const minutes = num > 0 ? Math.round(unit === 'h' ? num * 60 : num) : 0;

  const title = p.kind === 'block' ? 'Bloco concluído! 🎉' : `Revisão R${p.reviewNumber} concluída! ✅`;
  const subtitle =
    p.kind === 'block'
      ? 'Hoje é o Dia 0 deste bloco. Quanto tempo você estudou para fechá-lo?'
      : 'Quanto tempo durou esta revisão?';

  return (
    <div className="app-modal fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div id="study-time-modal" className="app-modal-panel w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 shrink-0">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Conclusão · {p.name}</p>
              <h2 className="text-base font-black text-slate-900 dark:text-white">{title}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
          <button onClick={() => completeStudyTimePrompt(0)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-2">
          <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-500" htmlFor="study-time-value">
            Tempo de estudo
          </label>
          <div className="flex items-stretch gap-2">
            <div className="relative flex-1">
              <Clock className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="study-time-value"
                type="number"
                inputMode="decimal"
                min="0"
                step={unit === 'h' ? '0.25' : '5'}
                autoFocus
                placeholder={unit === 'h' ? 'Ex: 1,5' : 'Ex: 50'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && minutes > 0 && completeStudyTimePrompt(minutes)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
              />
            </div>
            <div className="flex rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden text-xs font-bold">
              {(['min', 'h'] as Unit[]).map((u) => (
                <button
                  key={u}
                  id={`study-time-unit-${u}`}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`px-3.5 ${unit === u ? 'bg-sky-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  {u === 'min' ? 'Minutos' : 'Horas'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  if (q.minutes % 60 === 0 || q.minutes > 60) {
                    setUnit('h');
                    setValue(String(q.minutes / 60));
                  } else {
                    setUnit('min');
                    setValue(String(q.minutes));
                  }
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950"
              >
                {q.label}
              </button>
            ))}
          </div>
          {minutes > 0 && (
            <p className="text-[11px] text-slate-500">
              Vai entrar nas suas horas de estudo: <strong className="text-slate-800 dark:text-slate-100">{formatMinutes(minutes)}</strong>
            </p>
          )}
        </div>

        <div className="app-modal-footer flex items-center justify-end gap-2">
          <button onClick={() => completeStudyTimePrompt(0)} className="px-3 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            Pular
          </button>
          <button
            id="study-time-save"
            onClick={() => completeStudyTimePrompt(minutes)}
            disabled={minutes <= 0}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-bold"
          >
            Salvar tempo
          </button>
        </div>
      </div>
    </div>
  );
};
