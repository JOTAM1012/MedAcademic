// "Minha semana por turnos": manhã, tarde e noite de cada dia como livre, ocupado ou descanso.
// Tocar no quadrado troca o estado. O plano do dia usa isso para saber quanto cabe em cada dia.
import React, { useMemo } from 'react';
import { BookOpen, Briefcase, CalendarCheck, Eraser, Leaf } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ExamShift, TurnState } from '../../types';
import { TURN_KEYS, TURN_LABELS, WEEKDAY_SHORT, emptyWeekTurns, turnOfTime } from '../../data/studyMethod';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const NEXT: Record<TurnState, TurnState> = { livre: 'ocupado', ocupado: 'descanso', descanso: 'livre' };

const STYLE: Record<TurnState, { cell: string; label: string; Icon: React.FC<{ className?: string }> }> = {
  livre: {
    cell: 'bg-emerald-500/15 border-emerald-500/50 text-emerald-700 dark:text-emerald-300',
    label: 'Livre',
    Icon: BookOpen,
  },
  ocupado: {
    cell: 'bg-slate-200/70 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300',
    label: 'Ocupado',
    Icon: Briefcase,
  },
  descanso: {
    cell: 'bg-violet-500/15 border-violet-500/50 text-violet-700 dark:text-violet-300',
    label: 'Descanso',
    Icon: Leaf,
  },
};

interface Props {
  value: TurnState[][] | undefined;
  onChange: (v: TurnState[][] | undefined) => void;
  bestTurn?: ExamShift;
  onBestTurn: (v: ExamShift | undefined) => void;
}

export const WeekTurnsEditor: React.FC<Props> = ({ value, onChange, bestTurn, onBestTurn }) => {
  const { schedule, currentSemester } = useApp();
  const grid = value || emptyWeekTurns();

  // Turnos com atividade na grade do semestre (para o botão "Usar minha grade" e o pontinho)
  const fromGrade = useMemo(() => {
    const busy = emptyWeekTurns().map((d) => d.map(() => false));
    schedule
      .filter((s) => !s.date && (!s.semesterId || !currentSemester || s.semesterId === currentSemester.id))
      .forEach((s) => {
        const dow = s.dayOfWeek === 7 ? 0 : s.dayOfWeek;
        const a = turnOfTime(s.startTime);
        const b = turnOfTime(s.endTime, true);
        for (let i = a; i <= Math.max(a, b); i++) busy[dow][i] = true;
      });
    return busy;
  }, [schedule, currentSemester]);
  const hasGrade = fromGrade.some((d) => d.some(Boolean));

  const setCell = (dow: number, i: number) => {
    const next = grid.map((d) => [...d]);
    next[dow][i] = NEXT[next[dow][i]];
    onChange(next);
  };
  const useGrade = () => onChange(fromGrade.map((d, dow) => d.map((b, i) => (b ? 'ocupado' : grid[dow][i] === 'descanso' ? 'descanso' : 'livre'))));

  const freeTotal = grid.reduce((n, d) => n + d.filter((t) => t === 'livre').length, 0);

  return (
    <div id="routine-week-turns" className="space-y-3">
      {/* Grade: dias em colunas, turnos em linhas */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="grid grid-cols-[64px_repeat(7,minmax(38px,1fr))] gap-1.5 min-w-[360px]">
          <span />
          {WEEK_ORDER.map((d) => (
            <span key={d} className="text-center text-xs font-black text-slate-600 dark:text-slate-300">
              {WEEKDAY_SHORT[d]}
            </span>
          ))}
          {TURN_KEYS.map((key, i) => (
            <React.Fragment key={key}>
              <span className="self-center text-xs font-bold text-slate-500 dark:text-slate-400">{TURN_LABELS[i]}</span>
              {WEEK_ORDER.map((d) => {
                const st = grid[d][i];
                const s = STYLE[st];
                return (
                  <button
                    key={d}
                    type="button"
                    id={`turn-${d}-${key}`}
                    onClick={() => setCell(d, i)}
                    aria-label={`${WEEKDAY_SHORT[d]}, ${TURN_LABELS[i]}: ${s.label}. Tocar para trocar.`}
                    title={`${s.label}${fromGrade[d][i] ? ' · tem atividade na grade' : ''}`}
                    className={`relative h-11 rounded-xl border text-base grid place-items-center transition-colors ${s.cell}`}
                  >
                    <s.Icon className="h-4 w-4" />
                    {fromGrade[d][i] && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Legenda */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
        {(['livre', 'ocupado', 'descanso'] as TurnState[]).map((k) => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className={`h-5 w-5 rounded-md border grid place-items-center ${STYLE[k].cell}`}>{React.createElement(STYLE[k].Icon, { className: 'h-3 w-3' })}</span> {STYLE[k].label}
          </span>
        ))}
        {hasGrade && (
          <span className="inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden /> tem aula na grade
          </span>
        )}
        <span>· Toque para trocar.</span>
      </div>

      <div className="flex flex-wrap gap-2">
        {hasGrade && (
          <button
            type="button"
            id="routine-turns-from-grade"
            onClick={useGrade}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold bg-sky-600/10 text-sky-700 dark:text-sky-300 border border-sky-500/30 hover:bg-sky-600/15"
          >
            <CalendarCheck className="h-4 w-4" /> Marcar ocupado onde tenho aula
          </button>
        )}
        {value && (
          <button
            type="button"
            id="routine-turns-clear"
            onClick={() => onChange(undefined)}
            className="min-h-[40px] inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <Eraser className="h-4 w-4" /> Não usar turnos
          </button>
        )}
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        {value
          ? freeTotal === 0
            ? 'Nenhum turno livre: o plano fica só com revisões curtas.'
            : 'O dia com mais turnos livres recebe todo o seu tempo de foco. Dias com menos turnos livres recebem menos. Dia todo em descanso vira dia de descanso.'
          : 'Sem turnos marcados, todo dia de estudo recebe o mesmo tempo de foco.'}
      </p>

      {/* Melhor turno */}
      <div>
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5">Em qual turno você rende mais?</p>
        <div className="grid grid-cols-4 gap-1.5">
          {TURN_KEYS.map((k, i) => (
            <button
              key={k}
              type="button"
              id={`routine-best-${k}`}
              onClick={() => onBestTurn(k)}
              aria-pressed={bestTurn === k}
              className={`min-h-[40px] rounded-xl border text-xs font-bold transition-colors ${
                bestTurn === k ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400'
              }`}
            >
              {TURN_LABELS[i]}
            </button>
          ))}
          <button
            type="button"
            id="routine-best-none"
            onClick={() => onBestTurn(undefined)}
            aria-pressed={!bestTurn}
            className={`min-h-[40px] rounded-xl border text-xs font-bold transition-colors ${
              !bestTurn ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400'
            }`}
          >
            Tanto faz
          </button>
        </div>
        <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">O plano sugere fazer o tema novo nesse turno, quando ele estiver livre.</p>
      </div>
    </div>
  );
};
