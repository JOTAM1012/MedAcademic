// Passo "Rotina" do cadastro: perguntas rápidas, só de tocar, para o Planner já nascer montado.
// Visual escuro da tela de cadastro. As respostas viram studyPrefs (routineAnswersToPrefs).
import React from 'react';
import { CalendarClock } from 'lucide-react';
import { TURN_KEYS, TURN_LABELS, WEEKDAY_SHORT } from '../../data/studyMethod';
import type { ExamShift } from '../../types';
import { ROUTINE_FOCUS_OPTIONS, ROUTINE_HOURS_OPTIONS, ROUTINE_WEEK_ORDER, type RoutineAnswers } from './routineSetup';

const chip = (active: boolean) =>
  `min-h-[44px] rounded-xl border px-3 py-2 text-xs font-bold transition-colors cursor-pointer ${
    active ? 'border-sky-500 bg-sky-950/50 text-sky-200 ring-2 ring-sky-500/30' : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
  }`;

const Q: React.FC<{ n: number; children: React.ReactNode }> = ({ n, children }) => (
  <p className="text-xs font-bold text-slate-200 mb-2 flex items-center gap-2">
    <span className="shrink-0 h-5 w-5 rounded-full bg-sky-600 text-white text-[10px] font-black grid place-items-center">{n}</span>
    {children}
  </p>
);

export const SignupRoutineStep: React.FC<{ value: RoutineAnswers; onChange: (v: RoutineAnswers) => void }> = ({ value, onChange }) => {
  const set = <K extends keyof RoutineAnswers>(k: K, v: RoutineAnswers[K]) => onChange({ ...value, [k]: v });
  const toggleTurn = (k: 'weekdayFree' | 'weekendFree', t: ExamShift) => {
    const list = value[k] || [];
    set(k, list.includes(t) ? list.filter((x) => x !== t) : [...list, t]);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-bold border border-sky-500/20 mb-2">
          <CalendarClock className="h-3.5 w-3.5" />
          <span>Sua rotina</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">Como é a sua semana?</h2>
        <p className="text-xs sm:text-sm text-slate-400 mt-1">Toque nas respostas. O Planner já começa montado do seu jeito. Dá para mudar depois.</p>
      </div>

      <section id="signup-routine-hours">
        <Q n={1}>Quanto tempo por dia você consegue estudar?</Q>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ROUTINE_HOURS_OPTIONS.map((o) => (
            <button key={o.blocks} type="button" id={`signup-routine-hours-${o.blocks}`} aria-pressed={value.hoursBlocks === o.blocks} onClick={() => set('hoursBlocks', o.blocks)} className={`${chip(value.hoursBlocks === o.blocks)} text-left`}>
              <span className="block">{o.label}</span>
              <span className="block text-[10px] font-medium text-slate-500">{o.hint}</span>
            </button>
          ))}
        </div>
      </section>

      <section id="signup-routine-focus">
        <Q n={2}>Tamanho do bloco de foco</Q>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {ROUTINE_FOCUS_OPTIONS.map((o) => {
            const on = value.focus.focus === o.focus && value.focus.rest === o.rest;
            return (
              <button key={o.focus} type="button" id={`signup-routine-focus-${o.focus}`} aria-pressed={on} onClick={() => set('focus', o)} className={chip(on)}>
                <span className="block">{o.focus} min</span>
                <span className="block text-[10px] font-medium text-slate-500">{o.focus === 30 ? 'padrão' : `pausa ${o.rest}`}</span>
              </button>
            );
          })}
        </div>
      </section>

      <section id="signup-routine-weekday">
        <Q n={3}>De segunda a sexta, quais turnos ficam livres?</Q>
        <div className="grid grid-cols-4 gap-2">
          {TURN_KEYS.map((k, i) => (
            <button key={k} type="button" id={`signup-routine-wd-${k}`} aria-pressed={!!value.weekdayFree?.includes(k)} onClick={() => toggleTurn('weekdayFree', k)} className={chip(!!value.weekdayFree?.includes(k))}>
              {TURN_LABELS[i]}
            </button>
          ))}
          <button type="button" id="signup-routine-wd-none" aria-pressed={value.weekdayFree?.length === 0} onClick={() => set('weekdayFree', [])} className={chip(value.weekdayFree?.length === 0)}>
            Nenhum
          </button>
        </div>
      </section>

      <section id="signup-routine-weekend">
        <Q n={4}>E no fim de semana?</Q>
        <div className="grid grid-cols-4 gap-2">
          {TURN_KEYS.map((k, i) => (
            <button key={k} type="button" id={`signup-routine-we-${k}`} aria-pressed={!!value.weekendFree?.includes(k)} onClick={() => toggleTurn('weekendFree', k)} className={chip(!!value.weekendFree?.includes(k))}>
              {TURN_LABELS[i]}
            </button>
          ))}
          <button type="button" id="signup-routine-we-none" aria-pressed={value.weekendFree?.length === 0} onClick={() => set('weekendFree', [])} className={chip(value.weekendFree?.length === 0)}>
            Nenhum
          </button>
        </div>
      </section>

      <section id="signup-routine-rest">
        <Q n={5}>Qual dia é de descanso?</Q>
        <div className="flex flex-wrap gap-1.5">
          {ROUTINE_WEEK_ORDER.map((d) => (
            <button key={d} type="button" id={`signup-routine-rest-${d}`} aria-pressed={value.restDay === d} onClick={() => set('restDay', d)} className={`${chip(value.restDay === d)} min-w-[52px]`}>
              {WEEKDAY_SHORT[d]}
            </button>
          ))}
          <button type="button" id="signup-routine-rest-none" aria-pressed={value.restDay === null} onClick={() => set('restDay', null)} className={chip(value.restDay === null)}>
            Não tenho
          </button>
        </div>
      </section>

      <section id="signup-routine-best">
        <Q n={6}>Em qual turno você rende mais?</Q>
        <div className="grid grid-cols-4 gap-2">
          {TURN_KEYS.map((k, i) => (
            <button key={k} type="button" id={`signup-routine-best-${k}`} aria-pressed={value.bestTurn === k} onClick={() => set('bestTurn', k)} className={chip(value.bestTurn === k)}>
              {TURN_LABELS[i]}
            </button>
          ))}
          <button type="button" id="signup-routine-best-none" aria-pressed={value.bestTurn === null} onClick={() => set('bestTurn', null)} className={chip(value.bestTurn === null)}>
            Tanto faz
          </button>
        </div>
        <p className="mt-1.5 text-[11px] text-slate-500">O plano coloca o tema novo nesse turno.</p>
      </section>
    </div>
  );
};
