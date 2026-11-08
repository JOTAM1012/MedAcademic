import React from 'react';
import { Check, Play } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Exam } from '../../types';
import { DEFAULT_TOPIC_QUESTIONS, EXAM_TASKS, examProgress, examTaskKinds, isExamTopicDone, nextExamStep } from '../../data/examTopics';
import { examDisplayTitle } from '../../data/planning';

interface ExamTopicsChecklistProps {
  exam: Exam;
  /** Versão enxuta (Planner, Revisões) */
  compact?: boolean;
}

// Check list dos assuntos de uma prova: cada assunto com as tarefas escolhidas, progresso e "Começar" no próximo passo
export const ExamTopicsChecklist: React.FC<ExamTopicsChecklistProps> = ({ exam: examProp, compact = false }) => {
  const { exams, toggleExamTopicTask, startTask, studyPrefs } = useApp();
  // Sempre a versão mais nova da prova (as marcações mudam no contexto)
  const exam = exams.find((e) => e.id === examProp.id) || examProp;
  const topics = exam.examTopics || [];
  const kinds = examTaskKinds(exam);
  const progress = examProgress(exam);
  const next = nextExamStep(exam);

  if (topics.length === 0) {
    return (
      <p id={`examtopics-empty-${exam.id}`} className="text-[11px] text-slate-500 dark:text-slate-400">
        Liste os assuntos para o site encaixar na rotina.
      </p>
    );
  }

  const start = () => {
    if (!next) return;
    const task = EXAM_TASKS[next.task];
    startTask({
      title: `${next.topic.title} · ${task.label}`,
      kind: 'exam_topic',
      subjectId: exam.subjectId,
      steps: [task.step(next.topic.title, next.topic.questions), `Prova: ${examDisplayTitle(exam)}`],
      minutes: studyPrefs.shortFocusMinutes,
      breakMinutes: studyPrefs.shortBreakMinutes,
    });
  };

  return (
    <div id={`examtopics-${exam.id}`} className="space-y-2.5">
      {/* Progresso */}
      <div>
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="font-bold text-slate-700 dark:text-slate-200">
            {progress.topicsDone} de {progress.topics} assunto{progress.topics > 1 ? 's' : ''} prontos
          </span>
          <span className="font-black text-slate-900 dark:text-white">{progress.pct}%</span>
        </div>
        <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${progress.pct}%` }} />
        </div>
      </div>

      {/* Próximo passo */}
      {next ? (
        <div className="flex items-center gap-2 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 p-2">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wide text-sky-700 dark:text-sky-300">Próximo passo</p>
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 line-clamp-2">
              {EXAM_TASKS[next.task].emoji} {EXAM_TASKS[next.task].step(next.topic.title, next.topic.questions)}
            </p>
          </div>
          <button
            id={`examtopics-start-${exam.id}`}
            type="button"
            onClick={start}
            className="shrink-0 h-10 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Play className="h-3.5 w-3.5" /> Começar
          </button>
        </div>
      ) : (
        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Tudo marcado. Agora é revisar com calma.</p>
      )}

      {/* Assuntos */}
      <ul className="space-y-1.5">
        {topics.map((t) => {
          const done = isExamTopicDone(exam, t);
          return (
            <li
              key={t.id}
              id={`examtopics-topic-${t.id}`}
              className={`rounded-xl border p-2 ${
                done ? 'border-emerald-200 dark:border-emerald-900/60 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <p className={`text-xs font-bold truncate ${done ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-100'}`}>
                {done && <Check className="inline h-3.5 w-3.5 mr-1 -mt-0.5" />}
                {t.title}
              </p>
              <div className={`mt-1.5 flex flex-wrap gap-1 ${compact ? '' : 'sm:gap-1.5'}`}>
                {kinds.map((k) => {
                  const on = !!t.done?.[k];
                  const label = k === 'questoes' ? `${t.questions || DEFAULT_TOPIC_QUESTIONS} questões` : compact ? EXAM_TASKS[k].short : EXAM_TASKS[k].label;
                  return (
                    <button
                      key={k}
                      id={`examtopics-task-${t.id}-${k}`}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleExamTopicTask(exam.id, t.id, k)}
                      className={`min-h-10 px-2.5 rounded-full text-[11px] font-bold border flex items-center gap-1 transition-colors ${
                        on
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                      }`}
                    >
                      {on ? <Check className="h-3 w-3" /> : <span aria-hidden>{EXAM_TASKS[k].emoji}</span>}
                      {label}
                    </button>
                  );
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
