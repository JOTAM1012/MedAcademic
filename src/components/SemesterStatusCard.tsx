import React from 'react';
import { GraduationCap, Palmtree, ArrowRight, History } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { daysUntil, isVacation, nextPeriod, nextSemesterName, periodByCode, periodForDate, periodProgress } from '../data/academicCalendar';
import { formatDM, ymd } from '../data/blockReview';

interface SemesterStatusCardProps {
  compact?: boolean;
}

// Em qual semestre o usuário está (período, progresso, férias) e convite para virar o semestre
export const SemesterStatusCard: React.FC<SemesterStatusCardProps> = ({ compact = false }) => {
  const { currentSemester, startNextSemester, setCurrentTab } = useApp();
  if (!currentSemester) return null;

  const today = ymd(new Date());
  const period = periodByCode(currentSemester.period) || periodForDate(currentSemester.startDate || today);
  const ended = today > period.end;
  const vacation = isVacation(today);
  const upcoming = nextPeriod(period);
  const nextName = nextSemesterName(currentSemester.name);

  const confirmTurnover = () => {
    if (
      window.confirm(
        `Iniciar o ${nextName}? O ${currentSemester.name} vai para o Histórico com disciplinas, provas, questões e grade de horários. As revisões dos blocos continuam.`
      )
    ) {
      startNextSemester();
    }
  };

  // Semestre terminou: férias de julho ou já começou o próximo
  if (ended) {
    return (
      <div
        id="semester-turnover-card"
        className={`rounded-2xl border p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
          vacation ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/70 dark:bg-emerald-950/30' : 'border-amber-300 dark:border-amber-600/50 bg-amber-50/70 dark:bg-amber-950/30'
        }`}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-xl text-white ${vacation ? 'bg-emerald-500' : 'bg-amber-500'}`}>
            {vacation ? <Palmtree className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
          </div>
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">
              {vacation ? '🌴 Férias de julho!' : `O ${currentSemester.name} terminou em ${formatDM(period.end)}`}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-300">
              {vacation
                ? `O ${currentSemester.name} (${period.code}) foi encerrado. O próximo semestre (${upcoming.code}) começa em 01/08.`
                : `Comece o ${nextName}: o semestre anterior fica guardado no Histórico.`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setCurrentTab('history')} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800">
            <History className="h-3.5 w-3.5" /> Histórico
          </button>
          <button
            id="start-next-semester-btn"
            onClick={confirmTurnover}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold ${vacation ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`}
          >
            Iniciar {nextName} <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  const progress = periodProgress(period, today);
  const left = Math.max(0, daysUntil(today, period.end));

  return (
    <div id="semester-status-card" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-white truncate">
              {currentSemester.name} <span className="text-sky-600 dark:text-sky-400">· {period.code}</span>
            </p>
            <p className="text-[11px] text-slate-500">
              {formatDM(period.start)} a {formatDM(period.end)} · {left === 0 ? 'último dia' : `faltam ${left} dias`}
              {period.half === 1 ? ' · férias em julho' : ''}
            </p>
          </div>
        </div>
        {!compact && (
          <button onClick={() => setCurrentTab('history')} className="flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline">
            <History className="h-3.5 w-3.5" /> Histórico de semestres
          </button>
        )}
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-1 text-[10px] text-slate-400 text-right">{progress}% do semestre</div>
    </div>
  );
};
