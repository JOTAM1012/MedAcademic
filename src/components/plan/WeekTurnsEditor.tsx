// "Minha semana por turnos": manhã, tarde e noite de cada dia como livre, ocupado ou descanso.
// Tocar no quadrado troca o estado. O plano do dia usa isso para saber quanto cabe em cada dia.
import React, { useMemo, useState } from 'react';
import { BookOpen, Briefcase, CalendarCheck, Eraser, Leaf } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ExamShift, TurnPlan, TurnState } from '../../types';
import { TURN_KEYS, TURN_LABELS, TURN_METHODS, WEEKDAY_NAMES, WEEKDAY_SHORT, emptyWeekTurns, turnKey, turnOfTime } from '../../data/studyMethod';

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
  /** Modo detalhado: cada turno livre com matéria, assunto e forma de estudo */
  detailed?: boolean;
  onDetailed: (v: boolean) => void;
  turnPlans?: Record<string, TurnPlan>;
  onTurnPlans: (v: Record<string, TurnPlan> | undefined) => void;
}

export const WeekTurnsEditor: React.FC<Props> = ({ value, onChange, bestTurn, onBestTurn, detailed, onDetailed, turnPlans, onTurnPlans }) => {
  const { schedule, currentSemester, subjects, topics } = useApp();
  const grid = value || emptyWeekTurns();
  const [sel, setSel] = useState<{ dow: number; i: number } | null>(null);
  const semSubjects = useMemo(
    () => subjects.filter((s) => !s.semesterId || !currentSemester || s.semesterId === currentSemester.id).sort((a, b) => a.name.localeCompare(b.name)),
    [subjects, currentSemester]
  );
  const planOf = (dow: number, i: number) => turnPlans?.[turnKey(dow, TURN_KEYS[i])];
  const setPlan = (dow: number, i: number, patch: Partial<TurnPlan> | null) => {
    const key = turnKey(dow, TURN_KEYS[i]);
    const next = { ...(turnPlans || {}) };
    if (patch === null) delete next[key];
    else next[key] = { ...(next[key] || {}), ...patch };
    onTurnPlans(Object.keys(next).length ? next : undefined);
  };
  const setState = (dow: number, i: number, st: TurnState) => {
    const next = grid.map((d) => [...d]);
    next[dow][i] = st;
    onChange(next);
  };

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
      {/* Simples (só livre/ocupado/descanso) ou Detalhado (o que fazer em cada turno) */}
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/70" role="tablist">
        {([
          [false, 'Simples', 'Livre, ocupado ou descanso'],
          [true, 'Detalhado', 'Matéria e forma de estudo'],
        ] as const).map(([d, label, hint]) => (
          <button
            key={label}
            type="button"
            role="tab"
            id={`routine-turns-mode-${d ? 'detailed' : 'simple'}`}
            aria-selected={!!detailed === d}
            onClick={() => {
              onDetailed(d);
              setSel(null);
            }}
            className={`min-h-[44px] rounded-lg px-2 text-left transition-colors ${!!detailed === d ? 'bg-white dark:bg-slate-900 shadow-sm' : 'hover:bg-white/50 dark:hover:bg-slate-900/40'}`}
          >
            <span className={`block text-xs font-black ${!!detailed === d ? 'text-sky-700 dark:text-sky-300' : 'text-slate-600 dark:text-slate-300'}`}>{label}</span>
            <span className="block text-[10.5px] text-slate-500 dark:text-slate-400 truncate">{hint}</span>
          </button>
        ))}
      </div>

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
                const tp = detailed && st === 'livre' ? planOf(d, i) : undefined;
                const subj = tp?.subjectId ? subjects.find((x) => x.id === tp.subjectId) : undefined;
                const m = tp?.method ? TURN_METHODS.find((x) => x.id === tp.method) : undefined;
                const isSel = detailed && sel?.dow === d && sel?.i === i;
                return (
                  <button
                    key={d}
                    type="button"
                    id={`turn-${d}-${key}`}
                    onClick={() => (detailed ? setSel(isSel ? null : { dow: d, i }) : setCell(d, i))}
                    aria-label={`${WEEKDAY_SHORT[d]}, ${TURN_LABELS[i]}: ${s.label}${subj ? `, ${subj.name}` : ''}${m ? `, ${m.label}` : ''}. ${detailed ? 'Tocar para planejar.' : 'Tocar para trocar.'}`}
                    title={`${s.label}${subj ? ` · ${subj.name}` : ''}${m ? ` · ${m.label}` : ''}${fromGrade[d][i] ? ' · tem atividade na grade' : ''}`}
                    style={subj ? { borderColor: subj.color, backgroundColor: `${subj.color}26` } : undefined}
                    className={`relative h-11 rounded-xl border text-base grid place-items-center transition-colors ${s.cell} ${isSel ? 'ring-2 ring-sky-500 ring-offset-1 ring-offset-white dark:ring-offset-slate-900' : ''}`}
                  >
                    {m ? <span aria-hidden className="text-sm">{m.emoji}</span> : subj ? <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subj.color }} /> : <s.Icon className="h-4 w-4" />}
                    {fromGrade[d][i] && <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-sky-500" aria-hidden />}
                  </button>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Modo detalhado: editor do turno escolhido */}
      {detailed && !sel && <p className="text-[11px] font-bold text-sky-700 dark:text-sky-300">Toque num turno para dizer o que fazer nele.</p>}
      {detailed && sel && (() => {
        const st = grid[sel.dow][sel.i];
        const tp = planOf(sel.dow, sel.i) || {};
        const subjTopics = tp.subjectId ? topics.filter((t) => t.subjectId === tp.subjectId) : [];
        const field = 'w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-800 dark:text-slate-100';
        return (
          <div id="turn-editor" className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {WEEKDAY_NAMES[sel.dow]} · {TURN_LABELS[sel.i]}
              </p>
              <button type="button" onClick={() => setSel(null)} className="min-h-[36px] px-2 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-white">
                Pronto
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {(['livre', 'ocupado', 'descanso'] as TurnState[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  id={`turn-editor-state-${k}`}
                  onClick={() => setState(sel.dow, sel.i, k)}
                  aria-pressed={st === k}
                  className={`min-h-[40px] rounded-xl border text-xs font-bold inline-flex items-center justify-center gap-1.5 ${st === k ? STYLE[k].cell + ' ring-1 ring-current' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'}`}
                >
                  {React.createElement(STYLE[k].Icon, { className: 'h-3.5 w-3.5' })} {STYLE[k].label}
                </button>
              ))}
            </div>
            {st === 'livre' ? (
              <>
                <div className="grid sm:grid-cols-2 gap-2">
                  <label className="block">
                    <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Matéria</span>
                    <select
                      id="turn-editor-subject"
                      value={tp.subjectId || ''}
                      onChange={(e) => setPlan(sel.dow, sel.i, { subjectId: e.target.value || undefined, topicId: undefined })}
                      className={field}
                    >
                      <option value="">Qualquer uma (o plano escolhe)</option>
                      {semSubjects.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Assunto (opcional)</span>
                    <select
                      id="turn-editor-topic"
                      value={tp.topicId || ''}
                      disabled={!tp.subjectId || subjTopics.length === 0}
                      onChange={(e) => setPlan(sel.dow, sel.i, { topicId: e.target.value || undefined })}
                      className={`${field} disabled:opacity-50`}
                    >
                      <option value="">{!tp.subjectId ? 'Escolha a matéria antes' : subjTopics.length ? 'Qualquer assunto' : 'Sem assuntos cadastrados'}</option>
                      {subjTopics.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Forma de estudo</span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    {TURN_METHODS.map((mm) => (
                      <button
                        key={mm.id}
                        type="button"
                        id={`turn-editor-method-${mm.id}`}
                        onClick={() => setPlan(sel.dow, sel.i, { method: tp.method === mm.id ? undefined : mm.id })}
                        aria-pressed={tp.method === mm.id}
                        className={`min-h-[40px] rounded-xl border px-2 text-xs font-bold inline-flex items-center gap-1.5 ${tp.method === mm.id ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400'}`}
                      >
                        <span aria-hidden>{mm.emoji}</span> {mm.label}
                      </button>
                    ))}
                  </div>
                </div>
                <label className="block">
                  <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Anotação (opcional)</span>
                  <input
                    id="turn-editor-note"
                    value={tp.note || ''}
                    maxLength={80}
                    onChange={(e) => setPlan(sel.dow, sel.i, { note: e.target.value || undefined })}
                    placeholder="Ex.: capítulo 3 do livro, lista da monitoria"
                    className={field}
                  />
                </label>
                {(tp.subjectId || tp.method || tp.note) && (
                  <button type="button" id="turn-editor-clear" onClick={() => setPlan(sel.dow, sel.i, null)} className="min-h-[36px] text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline">
                    Limpar este turno
                  </button>
                )}
              </>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400">Turno {st === 'ocupado' ? 'ocupado' : 'de descanso'}: o plano não coloca estudo aqui.</p>
            )}
          </div>
        );
      })()}

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
        {!detailed && <span>· Toque para trocar.</span>}
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
