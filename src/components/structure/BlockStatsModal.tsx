import React, { useEffect, useMemo, useState } from 'react';
import { Check, Clock, Plus, Trash2, X, CalendarDays, Target, Lightbulb } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { BlockStudyDay, TopicBlock } from '../../types';
import { DatePickerField } from '../DatePickerField';
import { addDaysYMD, formatDM, ymd } from '../../data/blockReview';
import { formatMin } from './shared';

type Activity = NonNullable<TopicBlock['activities']>[number];

interface DayDraft {
  key: string;
  date: string;
  hours: string;
  mins: string;
  /** undefined = ainda não respondeu; false = não fez */
  did?: boolean;
  questions: string;
  correct: string;
}

const DEFAULT_ACTIVITIES = ['Assistir aula', 'Fazer resumo', 'Mapa mental'];
const ACTIVITY_SUGGESTIONS = ['Assistir aula', 'Fazer resumo', 'Mapa mental', 'Flashcards', 'Ler livro/apostila'];

const newKey = () => Math.random().toString(36).slice(2, 9);
const num = (s: string) => {
  const n = Number(String(s).replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : 0;
};
const dayMinutes = (d: DayDraft) => Math.round(num(d.hours) * 60 + num(d.mins));
const dayQuestions = (d: DayDraft) => (d.did ? Math.round(num(d.questions)) : 0);
const dayCorrect = (d: DayDraft) => (d.did ? Math.min(Math.round(num(d.correct)), dayQuestions(d)) : 0);

const toDraft = (d: BlockStudyDay): DayDraft => ({
  key: newKey(),
  date: d.date,
  hours: d.minutes ? String(Math.floor(d.minutes / 60) || '') : '',
  mins: d.minutes ? String(d.minutes % 60 || '') : '',
  did: d.didQuestions,
  questions: d.questions ? String(d.questions) : '',
  correct: d.correct !== undefined && d.questions ? String(d.correct) : '',
});

const sumDays = (days: BlockStudyDay[] = []) => ({
  minutes: days.reduce((a, d) => a + (d.minutes || 0), 0),
  questions: days.reduce((a, d) => a + (d.didQuestions ? d.questions || 0 : 0), 0),
  correct: days.reduce((a, d) => a + (d.didQuestions ? d.correct || 0 : 0), 0),
});

interface Props {
  open: boolean;
  blockId: string;
  onClose: () => void;
  /** Aberto ao fechar o tema (todos os tópicos marcados): mostra a comemoração */
  celebrate?: boolean;
}

const inputCls =
  'w-full h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500';

// Janela de estatísticas do tema: dias de estudo (tempo + questões por dia), total e atividades do bloco
export const BlockStatsModal: React.FC<Props> = ({ open, blockId, onClose, celebrate }) => {
  const { topicBlocks, updateTopicBlock, logStudySession, addQuestionLog, showNotification } = useApp();
  const block = topicBlocks.find((b) => b.id === blockId);

  const [days, setDays] = useState<DayDraft[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [newActivity, setNewActivity] = useState('');

  // carrega o que já foi salvo cada vez que a janela abre
  useEffect(() => {
    if (!open || !block) return;
    const today = ymd(new Date());
    if (block.studyDays && block.studyDays.length) setDays(block.studyDays.map(toDraft));
    else if (block.studyMinutes)
      setDays([toDraft({ date: block.completedDate || today, minutes: block.studyMinutes })]);
    else setDays([toDraft({ date: block.completedDate || today })]);
    setActivities(
      block.activities ?? DEFAULT_ACTIVITIES.map((title) => ({ id: 'act-' + newKey(), title, done: false }))
    );
    setNewActivity('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, blockId]);

  const totals = useMemo(() => {
    const minutes = days.reduce((a, d) => a + dayMinutes(d), 0);
    const questions = days.reduce((a, d) => a + dayQuestions(d), 0);
    const correct = days.reduce((a, d) => a + dayCorrect(d), 0);
    return { minutes, questions, correct, pct: questions ? Math.round((correct / questions) * 100) : 0 };
  }, [days]);

  if (!open || !block) return null;

  const setDay = (key: string, changes: Partial<DayDraft>) => setDays((ds) => ds.map((d) => (d.key === key ? { ...d, ...changes } : d)));

  const addDay = () => {
    const today = ymd(new Date());
    const used = new Set(days.map((d) => d.date));
    let date = today;
    if (used.has(today)) {
      const last = [...days].map((d) => d.date).sort().pop() || today;
      date = addDaysYMD(1, last);
    }
    setDays((ds) => [...ds, toDraft({ date })]);
  };

  const addActivity = (title: string) => {
    const t = title.trim();
    if (!t || activities.some((a) => a.title.toLowerCase() === t.toLowerCase())) return;
    setActivities((as) => [...as, { id: 'act-' + newKey(), title: t, done: false }]);
    setNewActivity('');
  };

  const noQuestions = totals.questions === 0;

  const save = () => {
    const studyDays: BlockStudyDay[] = days
      .filter((d) => d.date)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        date: d.date,
        minutes: dayMinutes(d) || undefined,
        didQuestions: d.did,
        questions: d.did ? dayQuestions(d) : undefined,
        correct: d.did ? dayCorrect(d) : undefined,
      }));
    // só o que é novo entra nas métricas (abrir de novo e salvar não duplica)
    const before = block.studyDays && block.studyDays.length ? sumDays(block.studyDays) : { minutes: block.studyMinutes || 0, questions: 0, correct: 0 };
    const now = sumDays(studyDays);
    const dMin = now.minutes - before.minutes;
    const dQ = now.questions - before.questions;
    const dC = Math.max(0, Math.min(dQ, now.correct - before.correct));

    updateTopicBlock(block.id, {
      studyDays,
      activities,
      studyMinutes: now.minutes || undefined,
      // gatilho do método: nenhuma questão no tema → as revisões cobram questões
      needsQuestions: now.questions === 0 && !(block.reviewLog || []).some((r) => r.questions) ? true : undefined,
    });
    if (dMin > 0) {
      logStudySession({
        subjectId: block.subjectId,
        blockId: block.id,
        durationMinutes: dMin,
        type: 'stopwatch',
        notes: `Estudo do tema · ${block.name}`,
        xpEarned: 0,
      });
    }
    if (dQ > 0) addQuestionLog({ kind: 'block', subjectId: block.subjectId, blockId: block.id, total: dQ, correct: dC, mode: 'tema' });
    else showNotification(dMin > 0 ? `⏱ ${formatMin(dMin)} de estudo registrados.` : 'Estudo do tema salvo.', 'success');
    onClose();
  };

  return (
    <div className="app-modal fixed inset-0 z-[90] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in">
      <div
        id="struct-stats-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="struct-stats-title"
        className="app-modal-panel w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl"
      >
        <div className="sticky top-0 z-10 flex items-start gap-3 px-5 pt-5 pb-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 truncate">{celebrate ? 'Tema estudado 🎉' : 'Registrar estudo'}</p>
            <h2 id="struct-stats-title" className="text-base font-black text-slate-900 dark:text-white truncate">
              {block.name}
            </h2>
            {celebrate && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">A 1ª revisão é amanhã (24 h). Conte como foi.</p>}
          </div>
          <button onClick={onClose} className="h-10 w-10 shrink-0 grid place-items-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 pb-5 space-y-5">
          {/* Dias de estudo */}
          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <CalendarDays className="h-3.5 w-3.5" /> Dias em que você viu o tema
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {days.map((d, i) => (
                <div key={d.key} id={`struct-stats-day-${i}`} className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 p-3 space-y-2.5">
                  <div className="flex items-center gap-2">
                    <DatePickerField
                      id={`struct-stats-date-${i}`}
                      value={d.date}
                      onChange={(v) => setDay(d.key, { date: v || d.date })}
                      className="flex-1 min-w-0 h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-xs font-black text-slate-800 dark:text-slate-100"
                    />
                    {days.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setDays((ds) => ds.filter((x) => x.key !== d.key))}
                        className="h-10 w-10 shrink-0 grid place-items-center rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                        aria-label={`Remover o dia ${formatDM(d.date)}`}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      placeholder="0"
                      value={d.hours}
                      onChange={(e) => setDay(d.key, { hours: e.target.value })}
                      className={inputCls}
                      aria-label="Horas de estudo"
                    />
                    <span className="text-[11px] font-bold text-slate-500">h</span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min="0"
                      max="59"
                      placeholder="0"
                      value={d.mins}
                      onChange={(e) => setDay(d.key, { mins: e.target.value })}
                      className={inputCls}
                      aria-label="Minutos de estudo"
                    />
                    <span className="text-[11px] font-bold text-slate-500">min</span>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">Fez questões?</p>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => setDay(d.key, { did: true })}
                        aria-pressed={d.did === true}
                        className={`h-10 rounded-xl text-xs font-bold transition-colors ${
                          d.did === true ? 'bg-sky-600 text-white' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Sim
                      </button>
                      <button
                        type="button"
                        onClick={() => setDay(d.key, { did: false, questions: '', correct: '' })}
                        aria-pressed={d.did === false}
                        className={`h-10 rounded-xl text-xs font-bold transition-colors ${
                          d.did === false ? 'bg-slate-700 dark:bg-slate-200 text-white dark:text-slate-900' : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        Não fiz
                      </button>
                    </div>
                    {d.did && (
                      <div className="mt-2 grid grid-cols-2 gap-1.5">
                        <label className="text-[10px] font-semibold text-slate-500">
                          Total
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={d.questions}
                            onChange={(e) => setDay(d.key, { questions: e.target.value })}
                            className={inputCls + ' mt-0.5'}
                          />
                        </label>
                        <label className="text-[10px] font-semibold text-slate-500">
                          Acertos
                          <input
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={d.correct}
                            onChange={(e) => setDay(d.key, { correct: e.target.value })}
                            className={inputCls + ' mt-0.5'}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              <button
                type="button"
                id="struct-stats-add-day"
                onClick={addDay}
                className="min-h-[96px] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-sky-600 hover:border-sky-400 flex flex-col items-center justify-center gap-1"
              >
                <Plus className="h-4 w-4" /> Adicionar outro dia
              </button>
            </div>
          </section>

          {/* Total */}
          <section className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-3">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-[10px] font-semibold text-slate-500">Tempo</div>
                <div className="text-sm font-black text-slate-900 dark:text-white">{totals.minutes ? formatMin(totals.minutes) : '—'}</div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-slate-500">Questões</div>
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {totals.correct}/{totals.questions}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-semibold text-slate-500">Acertos</div>
                <div className="text-sm font-black text-slate-900 dark:text-white">{totals.questions ? `${totals.pct}%` : '—'}</div>
              </div>
            </div>
            {noQuestions && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
                <Lightbulb className="h-3.5 w-3.5 shrink-0 mt-px" /> Sem questões: elas vão entrar nas suas revisões.
              </p>
            )}
          </section>

          {/* Atividades do bloco */}
          <section className="space-y-2">
            <h3 className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
              <Target className="h-3.5 w-3.5" /> Atividades do tema
            </h3>
            <ul className="space-y-1">
              {activities.map((a) => (
                <li key={a.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setActivities((as) => as.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)))}
                    aria-pressed={!!a.done}
                    className="flex-1 min-w-0 min-h-[40px] flex items-center gap-2.5 rounded-xl px-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <span
                      className={`h-5 w-5 shrink-0 rounded-md border-2 grid place-items-center ${
                        a.done ? 'bg-emerald-500 border-emerald-500' : 'border-slate-300 dark:border-slate-600'
                      }`}
                      aria-hidden
                    >
                      {a.done && <Check className="h-3 w-3 text-white" strokeWidth={4} />}
                    </span>
                    <span className={`text-xs font-semibold truncate ${a.done ? 'text-slate-400 line-through' : 'text-slate-800 dark:text-slate-100'}`}>{a.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setActivities((as) => as.filter((x) => x.id !== a.id))}
                    className="h-10 w-10 shrink-0 grid place-items-center rounded-xl text-slate-300 dark:text-slate-600 hover:text-rose-500"
                    aria-label={`Remover ${a.title}`}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addActivity(newActivity);
              }}
              className="flex items-center gap-2"
            >
              <input
                value={newActivity}
                onChange={(e) => setNewActivity(e.target.value)}
                placeholder="+ adicionar atividade"
                className="flex-1 min-w-0 h-10 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 bg-transparent px-3 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
                aria-label="Nova atividade"
              />
              <button type="submit" disabled={!newActivity.trim()} className="h-10 px-3 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 disabled:opacity-40">
                Adicionar
              </button>
            </form>
            {ACTIVITY_SUGGESTIONS.some((s) => !activities.some((a) => a.title.toLowerCase() === s.toLowerCase())) && (
              <div className="flex flex-wrap gap-1.5">
                {ACTIVITY_SUGGESTIONS.filter((s) => !activities.some((a) => a.title.toLowerCase() === s.toLowerCase())).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => addActivity(s)}
                    className="h-8 px-2.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-sky-600"
                  >
                    + {s}
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="app-modal-footer sticky bottom-0 flex items-center justify-end gap-2 px-5 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur border-t border-slate-100 dark:border-slate-800">
          <button onClick={onClose} className="h-10 px-4 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            {celebrate ? 'Pular' : 'Cancelar'}
          </button>
          <button id="struct-stats-save" onClick={save} className="h-10 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold">
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};
