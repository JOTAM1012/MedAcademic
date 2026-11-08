// Cartão do painel: % médio nas provas de concurso + mini gráfico de evolução + atalho para a ferramenta
import React, { useMemo, useState } from 'react';
import { Trophy, ChevronRight } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, YAxis } from 'recharts';
import { useApp } from '../../context/AppContext';
import { ContestsModal } from './ContestsModal';
import { contestPct, contestStats, pctTone, sortContestsAsc } from './contestUtils';

export const ContestsSummaryCard: React.FC = () => {
  const { studyMethod } = useApp();
  const contests = studyMethod.contests || [];
  const [open, setOpen] = useState(false);
  const stats = useMemo(() => contestStats(contests), [contests]);
  const data = useMemo(() => sortContestsAsc(contests).map((c, i) => ({ i, pct: contestPct(c) })), [contests]);
  const last = data.length ? data[data.length - 1].pct : undefined;
  const prev = data.length > 1 ? data[data.length - 2].pct : undefined;
  const delta = last !== undefined && prev !== undefined ? last - prev : undefined;

  return (
    <div id="contest-summary-card" className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col gap-3 min-w-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
            <Trophy className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">Provas de concurso</h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
              {stats.count ? `${stats.count} ${stats.count === 1 ? 'prova registrada' : 'provas registradas'}` : 'Nenhuma prova registrada'}
            </p>
          </div>
        </div>
        <button
          type="button"
          id="contest-summary-open"
          onClick={() => setOpen(true)}
          className="h-10 px-3 shrink-0 flex items-center gap-1 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
        >
          Abrir <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {stats.count === 0 ? (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Registre as provas de residência que você fizer fora daqui para acompanhar sua evolução.
        </p>
      ) : (
        <div className="flex items-end gap-4">
          <div className="shrink-0">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Média de acerto</div>
            <div className={`text-3xl font-black leading-tight ${pctTone(stats.avg)}`}>{stats.avg}%</div>
            {delta !== undefined && (
              <div className={`text-[11px] font-bold ${delta >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {delta >= 0 ? '▲' : '▼'} {Math.abs(delta)} pts na última
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0 h-16">
            {data.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <YAxis hide domain={[0, 100]} />
                  <Line type="monotone" dataKey="pct" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 2.5, fill: '#0284c7' }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-[11px] text-slate-400 h-full flex items-end">Com 2 provas aparece a linha de evolução.</p>
            )}
          </div>
        </div>
      )}

      <ContestsModal open={open} onClose={() => setOpen(false)} />
    </div>
  );
};
