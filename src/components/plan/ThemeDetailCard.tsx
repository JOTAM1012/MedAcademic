// "Planejar dia" (Detalhado): o aluno escolhe, para cada tema do dia, o tempo, quantas questões,
// os tópicos que vai ver (o site sugere os ainda não vistos) e as atividades. Vira o passo a passo da tarefa.
import React from 'react';
import { Lightbulb, Minus, Plus, RotateCcw } from 'lucide-react';
import type { DayTaskDetail, Topic } from '../../types';
import { DAY_ACTIVITIES, formatMinutes, type PlanTask } from '../../data/studyMethod';
import { isTopicSeen } from '../../data/blockReview';
import { OptionChip } from './planShared';

interface ThemeDetailCardProps {
  task: PlanTask;
  detail?: DayTaskDetail;
  /** Tópicos do tema (vazio = sem escolha de tópicos) */
  topics: Topic[];
  /** Bloco de foco do aluno (min): passo do − / + do tempo */
  focusMinutes: number;
  onChange: (next: DayTaskDetail | undefined) => void;
}

const SUGGEST_TOPICS = 3;

const stepBtn =
  'h-10 w-10 shrink-0 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-sky-400 disabled:opacity-40 disabled:cursor-not-allowed';

export const ThemeDetailCard: React.FC<ThemeDetailCardProps> = ({ task, detail, topics, focusMinutes, onChange }) => {
  const d = detail || {};
  const domId = task.id.replace(/[^a-zA-Z0-9_-]/g, '-');
  // Limpa campos vazios: sem nada escolhido, a tarefa volta ao automático
  const patch = (changes: Partial<DayTaskDetail>) => {
    const next: DayTaskDetail = { ...d, ...changes };
    (Object.keys(next) as Array<keyof DayTaskDetail>).forEach((k) => {
      const v = next[k];
      if (v === undefined || v === 0 || (Array.isArray(v) && v.length === 0)) delete next[k];
    });
    onChange(Object.keys(next).length ? next : undefined);
  };

  const minutes = task.minutes || Math.round(task.pomodoros * 25);
  const step = Math.max(5, focusMinutes || 25);
  const minusMin = Math.max(step, Math.ceil(minutes / step - 1e-6) * step - step);
  const plusMin = Math.min(480, Math.floor(minutes / step + 1e-6) * step + step);
  const questions = d.questions || 0;
  const picked = new Set(d.topicIds || []);
  const unseen = topics.filter((t) => !isTopicSeen(t));
  const suggestion = unseen.filter((t) => !picked.has(t.id)).slice(0, SUGGEST_TOPICS);
  const acts = new Set(d.activities || []);
  const toggleTopic = (id: string) => {
    const set = new Set(picked);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    // Mantém a ordem do caderno
    patch({ topicIds: topics.filter((t) => set.has(t.id)).map((t) => t.id) });
  };
  const toggleAct = (id: string) => {
    const set = new Set(acts);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    patch({ activities: DAY_ACTIVITIES.filter((a) => set.has(a.id)).map((a) => a.id) });
  };
  const label = 'text-[11px] font-bold text-slate-500 dark:text-slate-400';

  return (
    <div id={`dayplan-detail-${domId}`} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-3 min-w-0">
      <div className="flex items-center gap-2 min-w-0">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: task.color }} aria-hidden />
        <p className="min-w-0 flex-1 text-[13px] font-black text-slate-900 dark:text-white truncate">{task.title.replace(/^Tema novo: /, '')}</p>
      </div>

      {/* Tempo e questões */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className={label}>Tempo</p>
          <div className="mt-1 flex items-center gap-2">
            <button type="button" className={stepBtn} aria-label={`Menos ${step} minutos`} disabled={minusMin >= minutes} onClick={() => patch({ minutes: minusMin })}>
              <Minus className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0 text-center">
              <p id={`dayplan-detail-min-${domId}`} className="text-base font-black text-slate-900 dark:text-white leading-none">{formatMinutes(minutes)}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{d.minutes ? 'você escolheu' : 'automático'}</p>
            </div>
            <button type="button" className={stepBtn} aria-label={`Mais ${step} minutos`} disabled={plusMin <= minutes} onClick={() => patch({ minutes: plusMin })}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {d.minutes ? (
            <button type="button" onClick={() => patch({ minutes: undefined })} className="mt-1 min-h-[32px] text-[11px] font-bold text-sky-700 dark:text-sky-300 inline-flex items-center gap-1 hover:underline">
              <RotateCcw className="h-3 w-3" /> Voltar ao automático
            </button>
          ) : null}
        </div>
        <div>
          <p className={label}>Questões</p>
          <div className="mt-1 flex items-center gap-2">
            <button type="button" className={stepBtn} aria-label="Menos 5 questões" disabled={questions <= 0} onClick={() => patch({ questions: Math.max(0, questions - 5) })}>
              <Minus className="h-4 w-4" />
            </button>
            <div className="flex-1 min-w-0 text-center">
              <p id={`dayplan-detail-q-${domId}`} className="text-base font-black text-slate-900 dark:text-white leading-none">{questions || 'Nenhuma'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">{questions ? 'questões' : 'toque em +'}</p>
            </div>
            <button type="button" className={stepBtn} aria-label="Mais 5 questões" disabled={questions >= 200} onClick={() => patch({ questions: Math.min(200, questions + 5) })}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Tópicos */}
      {topics.length > 0 && (
        <div>
          <p className={label}>
            Tópicos de hoje{picked.size ? ` · ${picked.size}` : ''}
          </p>
          {suggestion.length > 0 && (
            <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-slate-600 dark:text-slate-300">
              <span className="min-w-0 flex gap-1.5">
                <Lightbulb className="h-3.5 w-3.5 mt-px text-amber-500 shrink-0" />
                <span>Sugestão, ainda não vistos: {suggestion.map((t) => t.title).join(', ')}.</span>
              </span>
              <button
                type="button"
                id={`dayplan-detail-suggest-${domId}`}
                onClick={() => patch({ topicIds: topics.filter((t) => picked.has(t.id) || suggestion.some((s) => s.id === t.id)).map((t) => t.id) })}
                className="min-h-[32px] px-2.5 rounded-lg border border-dashed border-sky-300 dark:border-sky-700 font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10"
              >
                Usar sugestão
              </button>
            </div>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
            {topics.map((t) => (
              <OptionChip key={t.id} active={picked.has(t.id)} onClick={() => toggleTopic(t.id)} className="max-w-full text-left">
                <span className="block truncate">
                  {picked.has(t.id) ? '✓ ' : ''}
                  {t.title}
                  {!isTopicSeen(t) && !picked.has(t.id) ? <span className="font-semibold text-slate-400 dark:text-slate-500"> · não visto</span> : null}
                </span>
              </OptionChip>
            ))}
          </div>
        </div>
      )}

      {/* Atividades */}
      <div>
        <p className={label}>Atividades{acts.size ? ` · ${acts.size}` : ''}</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {DAY_ACTIVITIES.map((a) => (
            <OptionChip key={a.id} id={`dayplan-act-${domId}-${a.id}`} active={acts.has(a.id)} onClick={() => toggleAct(a.id)}>
              {acts.has(a.id) ? '✓ ' : ''}
              {a.label}
            </OptionChip>
          ))}
        </div>
        <p className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Vira o passo a passo da tarefa no plano de hoje.</p>
      </div>
    </div>
  );
};
