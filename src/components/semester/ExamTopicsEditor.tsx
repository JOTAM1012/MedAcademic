import React, { useMemo, useState } from 'react';
import { Bell, BellOff, Link2, Plus, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ExamTaskKind, ExamTopic } from '../../types';
import { DEFAULT_TOPIC_QUESTIONS, EXAM_TASKS, EXAM_TASK_ORDER, newExamTopicId, topicsFromSource } from '../../data/examTopics';

interface ExamTopicsEditorProps {
  topics: ExamTopic[];
  onTopicsChange: (t: ExamTopic[]) => void;
  tasks: ExamTaskKind[];
  onTasksChange: (t: ExamTaskKind[]) => void;
  remindersOff: boolean;
  onRemindersOffChange: (v: boolean) => void;
  /** Disciplina ligada à prova: sugere puxar os assuntos dela */
  suggestedSource?: { kind: 'subject' | 'project'; id: string; label: string };
}

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500';

type SourceKey = string; // "subject:id" | "block:id" | "topic:id" | "project:id"

// Montar os assuntos da prova: à mão ou puxando de Disciplinas / Estudos pessoais; escolher as tarefas e os lembretes
export const ExamTopicsEditor: React.FC<ExamTopicsEditorProps> = ({
  topics,
  onTopicsChange,
  tasks,
  onTasksChange,
  remindersOff,
  onRemindersOffChange,
  suggestedSource,
}) => {
  const { subjects, topicBlocks, topics: allTopics, studyMethod } = useApp();
  const projects = useMemo(() => (studyMethod.projects || []).filter((p) => !p.archived), [studyMethod.projects]);
  const [draft, setDraft] = useState('');
  const [linking, setLinking] = useState(false);
  const [source, setSource] = useState<SourceKey>('');
  const [preview, setPreview] = useState<ExamTopic[]>([]);
  const [picked, setPicked] = useState<Record<string, boolean>>({});

  const data = { subjects, topicBlocks, topics: allTopics, projects };

  const addManual = () => {
    const t = draft.trim();
    if (!t) return;
    onTopicsChange([...topics, { id: newExamTopicId(), title: t, source: { kind: 'manual' } }]);
    setDraft('');
  };

  const loadSource = (key: SourceKey) => {
    setSource(key);
    if (!key) {
      setPreview([]);
      return;
    }
    const [kind, id] = key.split(':') as [NonNullable<ExamTopic['source']>['kind'], string];
    const list = topicsFromSource({ kind, id }, data);
    setPreview(list);
    setPicked(Object.fromEntries(list.map((t) => [t.id, true])));
  };

  const addPicked = () => {
    const existing = new Set(topics.map((t) => t.title.toLowerCase()));
    const add = preview.filter((t) => picked[t.id] && !existing.has(t.title.toLowerCase()));
    onTopicsChange([...topics, ...add]);
    setPreview([]);
    setSource('');
    setLinking(false);
  };

  const toggleTask = (k: ExamTaskKind) => {
    const next = tasks.includes(k) ? tasks.filter((x) => x !== k) : [...tasks, k];
    if (next.length === 0) return;
    onTasksChange(EXAM_TASK_ORDER.filter((x) => next.includes(x)));
  };

  const subjectLabel = (id: string) => {
    const s = subjects.find((x) => x.id === id);
    return s ? s.name : '';
  };

  return (
    <div id="exam-topics-editor" className="space-y-3">
      {/* Tarefas */}
      <div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">O que fazer em cada assunto:</p>
        <div className="flex flex-wrap gap-1.5">
          {EXAM_TASK_ORDER.map((k) => {
            const on = tasks.includes(k);
            return (
              <button
                key={k}
                id={`exam-task-${k}`}
                type="button"
                aria-pressed={on}
                onClick={() => toggleTask(k)}
                className={`min-h-10 px-3 rounded-full text-[11px] font-bold border transition-colors ${
                  on ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                }`}
              >
                {EXAM_TASKS[k].emoji} {k === 'questoes' ? 'X questões' : EXAM_TASKS[k].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Lista */}
      {topics.length > 0 && (
        <ul className="space-y-1.5">
          {topics.map((t) => (
            <li key={t.id} className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 px-2.5 py-1.5">
              <span className="min-w-0 flex-1 text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">{t.title}</span>
              {tasks.includes('questoes') && (
                <label className="shrink-0 flex items-center gap-1 text-[10px] text-slate-500">
                  <input
                    type="number"
                    min={1}
                    inputMode="numeric"
                    aria-label={`Questões de ${t.title}`}
                    value={t.questions ?? DEFAULT_TOPIC_QUESTIONS}
                    onChange={(e) => {
                      const n = Math.max(1, Number(e.target.value) || DEFAULT_TOPIC_QUESTIONS);
                      onTopicsChange(topics.map((x) => (x.id === t.id ? { ...x, questions: n } : x)));
                    }}
                    className="w-14 h-9 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-center text-xs font-bold text-slate-800 dark:text-slate-100"
                  />
                  questões
                </label>
              )}
              <button
                type="button"
                onClick={() => onTopicsChange(topics.filter((x) => x.id !== t.id))}
                className="shrink-0 h-9 w-9 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={`Tirar ${t.title}`}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Adicionar à mão */}
      <div className="flex gap-2">
        <input
          id="exam-topic-input"
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addManual();
            }
          }}
          placeholder="Ex: Insuficiência cardíaca"
          className={inputCls}
        />
        <button
          type="button"
          onClick={addManual}
          className="shrink-0 h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Pôr
        </button>
      </div>

      {/* Vincular */}
      {!linking ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestedSource && (
            <button
              type="button"
              onClick={() => {
                setLinking(true);
                loadSource(`${suggestedSource.kind}:${suggestedSource.id}`);
              }}
              className="min-h-10 px-3 rounded-xl text-[11px] font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 flex items-center gap-1"
            >
              <Link2 className="h-3.5 w-3.5" /> Puxar de {suggestedSource.label}
            </button>
          )}
          <button
            id="exam-topics-link"
            type="button"
            onClick={() => setLinking(true)}
            className="min-h-10 px-3 rounded-xl text-[11px] font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 flex items-center gap-1"
          >
            <Link2 className="h-3.5 w-3.5" /> Puxar de Disciplinas
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5 space-y-2">
          <select
            id="exam-topics-source"
            value={source}
            onChange={(e) => loadSource(e.target.value)}
            className={inputCls}
            aria-label="Puxar assuntos de"
          >
            <option value="">Escolha disciplina, bloco ou assunto…</option>
            {subjects.length > 0 && (
              <optgroup label="Disciplinas">
                {subjects.map((s) => (
                  <option key={s.id} value={`subject:${s.id}`}>
                    {s.name}
                  </option>
                ))}
              </optgroup>
            )}
            {topicBlocks.length > 0 && (
              <optgroup label="Blocos">
                {topicBlocks.map((b) => (
                  <option key={b.id} value={`block:${b.id}`}>
                    {subjectLabel(b.subjectId) ? `${subjectLabel(b.subjectId)} › ` : ''}
                    {b.name}
                  </option>
                ))}
              </optgroup>
            )}
            {allTopics.length > 0 && allTopics.length <= 300 && (
              <optgroup label="Assuntos">
                {allTopics.map((t) => (
                  <option key={t.id} value={`topic:${t.id}`}>
                    {subjectLabel(t.subjectId) ? `${subjectLabel(t.subjectId)} › ` : ''}
                    {t.title}
                  </option>
                ))}
              </optgroup>
            )}
            {projects.length > 0 && (
              <optgroup label="Estudos pessoais">
                {projects.map((p) => (
                  <option key={p.id} value={`project:${p.id}`}>
                    {p.emoji} {p.title}
                  </option>
                ))}
              </optgroup>
            )}
          </select>
          {source && preview.length === 0 && <p className="text-[11px] text-slate-500">Nada cadastrado aí ainda. Digite os assuntos acima.</p>}
          {preview.length > 0 && (
            <ul className="max-h-44 overflow-y-auto space-y-0.5">
              {preview.map((t) => (
                <li key={t.id}>
                  <label className="min-h-10 flex items-center gap-2 px-1 text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!picked[t.id]}
                      onChange={() => setPicked((p) => ({ ...p, [t.id]: !p[t.id] }))}
                      className="h-4 w-4 accent-sky-600"
                    />
                    <span className="truncate">{t.title}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setLinking(false);
                setPreview([]);
                setSource('');
              }}
              className="min-h-10 px-3 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={!preview.some((t) => picked[t.id])}
              onClick={addPicked}
              className="min-h-10 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-bold"
            >
              Pôr {preview.filter((t) => picked[t.id]).length || ''} assunto{preview.filter((t) => picked[t.id]).length === 1 ? '' : 's'}
            </button>
          </div>
        </div>
      )}

      {/* Lembretes */}
      <button
        id="exam-reminders-toggle"
        type="button"
        role="switch"
        aria-checked={!remindersOff}
        onClick={() => onRemindersOffChange(!remindersOff)}
        className="w-full min-h-10 flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 px-3 py-2 text-left"
      >
        {remindersOff ? <BellOff className="h-4 w-4 text-slate-400 shrink-0" /> : <Bell className="h-4 w-4 text-sky-500 shrink-0" />}
        <span className="min-w-0 flex-1 text-xs font-semibold text-slate-700 dark:text-slate-200">Lembretes antes da prova (30, 15, 7, 3 e 1 dia)</span>
        <span className={`shrink-0 relative h-6 w-10 rounded-full transition-colors ${remindersOff ? 'bg-slate-300 dark:bg-slate-700' : 'bg-sky-600'}`}>
          <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${remindersOff ? 'left-0.5' : 'left-[18px]'}`} />
        </span>
      </button>
    </div>
  );
};
