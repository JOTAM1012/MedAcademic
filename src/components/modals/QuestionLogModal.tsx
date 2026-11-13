import React, { useEffect, useMemo, useState } from 'react';
import { X, ClipboardCheck, NotebookPen, Trash2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDM } from '../../data/blockReview';
import type { QuestionMode } from '../../types';
import { ErrorNoteModal } from '../review/ErrorNoteModal';

interface QuestionLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultBlockId?: string;
}

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500';

// Tipo do bloco de questões (método de questões do guia)
const MODES: Array<{ id: QuestionMode; label: string; emoji: string; hint: string }> = [
  { id: 'tema', label: 'Do tema', emoji: '🎯', hint: 'Questões só de um tema' },
  { id: 'misturadas', label: 'Misturadas', emoji: '🔀', hint: 'Vários temas juntos' },
  { id: 'simulado', label: 'Simulado', emoji: '⏱️', hint: 'Com tempo, como na prova' },
  { id: 'pre_teste', label: 'Pré-teste', emoji: '🌱', hint: 'Antes de estudar (errar é normal)' },
];
const MODE_LABEL: Record<QuestionMode, string> = { tema: 'Do tema', misturadas: 'Misturadas', simulado: 'Simulado', pre_teste: 'Pré-teste', erros: 'Refazer erros' };

// Registro de questões feitas: por bloco ou por tópico. Soma no Dashboard (semestre).
export const QuestionLogModal: React.FC<QuestionLogModalProps> = ({ isOpen, onClose, defaultBlockId }) => {
  const { topicBlocks, topics, subjects, questionLogs, addQuestionLog, deleteQuestionLog } = useApp();
  const [kind, setKind] = useState<'block' | 'topic'>('block');
  const [blockId, setBlockId] = useState('');
  const [topicId, setTopicId] = useState('');
  const [total, setTotal] = useState('');
  const [correct, setCorrect] = useState('');
  const [mode, setMode] = useState<QuestionMode>('tema');
  /** Depois de salvar com erros: atalho para anotar no caderno */
  const [savedErrors, setSavedErrors] = useState<{ count: number; blockId?: string; subjectId?: string } | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setKind('block');
    setBlockId(defaultBlockId || '');
    setTopicId('');
    setTotal('');
    setCorrect('');
    setMode('tema');
    setSavedErrors(null);
    setNoteOpen(false);
  }, [isOpen, defaultBlockId]);

  const subjectName = (id?: string) => {
    const s = subjects.find((x) => x.id === id);
    return s ? s.universitySubject || s.name : 'Sem disciplina';
  };

  // Blocos agrupados por disciplina; tópicos agrupados por bloco
  const blockGroups = useMemo(
    () =>
      subjects
        .map((s) => ({ label: s.universitySubject || s.name, items: topicBlocks.filter((b) => b.subjectId === s.id) }))
        .filter((g) => g.items.length > 0),
    [subjects, topicBlocks]
  );
  const topicGroups = useMemo(
    () =>
      topicBlocks
        .map((b) => ({ label: `${b.name} · ${subjectName(b.subjectId)}`, items: topics.filter((t) => t.blockId === b.id) }))
        .filter((g) => g.items.length > 0),
    [topicBlocks, topics, subjects]
  );

  if (!isOpen) return null;

  const t = Number(total) || 0;
  const c = Math.min(Number(correct) || 0, t);
  const pct = t > 0 && correct !== '' ? Math.round((c / t) * 100) : undefined;
  const target = kind === 'block' ? blockId : topicId;
  // Misturadas e simulado podem não ter um tema só
  const targetOptional = mode === 'misturadas' || mode === 'simulado';
  const canSave = (!!target || targetOptional) && t > 0 && correct !== '' && Number(correct) <= t;

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSave) return;
    let linkBlock: string | undefined;
    let linkSubject: string | undefined;
    if (kind === 'block') {
      const b = topicBlocks.find((x) => x.id === blockId);
      linkBlock = b?.id;
      linkSubject = b?.subjectId;
      addQuestionLog({ kind, blockId: blockId || undefined, subjectId: b?.subjectId, total: t, correct: c, mode });
    } else {
      const tp = topics.find((x) => x.id === topicId);
      linkBlock = tp?.blockId;
      linkSubject = tp?.subjectId;
      addQuestionLog({ kind, topicId: topicId || undefined, blockId: tp?.blockId, subjectId: tp?.subjectId, total: t, correct: c, mode });
    }
    setSavedErrors(t - c > 0 ? { count: t - c, blockId: linkBlock, subjectId: linkSubject } : null);
    setTotal('');
    setCorrect('');
  };

  const labelOf = (logBlockId?: string, logTopicId?: string, logKind?: string, logMode?: QuestionMode) => {
    if (logKind === 'topic') return topics.find((x) => x.id === logTopicId)?.title || (logTopicId ? 'Tópico removido' : 'Questões');
    if (!logBlockId) return logMode ? `Questões · ${MODE_LABEL[logMode]}` : 'Questões';
    return topicBlocks.find((x) => x.id === logBlockId)?.name || 'Bloco removido';
  };

  const pctColor = pct === undefined ? 'text-slate-400' : pct >= 80 ? 'text-emerald-500' : pct >= 60 ? 'text-amber-500' : 'text-rose-500';

  return (
    <div className="app-modal fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in" onClick={onClose}>
      <div
        id="question-log-modal"
        className="app-modal-panel relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Registrar questões</h2>
              <p className="text-xs text-slate-500">Soma no Dashboard as questões do semestre</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={save} className="space-y-3">
          <div>
            <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">Tipo de bloco</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5" role="radiogroup" aria-label="Tipo de bloco">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  id={`question-log-mode-${m.id}`}
                  type="button"
                  role="radio"
                  aria-checked={mode === m.id}
                  onClick={() => setMode(m.id)}
                  title={m.hint}
                  className={`min-h-[40px] px-2 py-1.5 rounded-xl border text-xs font-bold transition-colors ${
                    mode === m.id
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  {m.emoji} {m.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              {MODES.find((m) => m.id === mode)?.hint}
              {targetOptional ? ' · escolher o tema é opcional' : ''}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 dark:bg-slate-950/70 p-1">
            {(['block', 'topic'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                className={`px-2 py-2 rounded-lg text-xs font-bold transition-colors ${
                  kind === k ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs' : 'text-slate-500'
                }`}
              >
                {k === 'block' ? 'Questões do bloco' : 'Questões dos tópicos'}
              </button>
            ))}
          </div>

          {kind === 'block' ? (
            <select id="question-log-block" value={blockId} onChange={(e) => setBlockId(e.target.value)} className={inputCls} aria-label="Bloco">
              <option value="">{targetOptional ? 'Vários temas (opcional)' : 'Escolha o bloco...'}</option>
              {blockGroups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          ) : (
            <select id="question-log-topic" value={topicId} onChange={(e) => setTopicId(e.target.value)} className={inputCls} aria-label="Tópico">
              <option value="">{targetOptional ? 'Vários tópicos (opcional)' : 'Escolha o tópico...'}</option>
              {topicGroups.map((g) => (
                <optgroup key={g.label} label={g.label}>
                  {g.items.map((tp) => (
                    <option key={tp.id} value={tp.id}>
                      {tp.title}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          )}

          <div className="grid grid-cols-3 gap-2 items-end">
            <label>
              <span className="block text-[11px] font-bold text-slate-500 mb-1">Feitas</span>
              <input id="question-log-total" type="number" min="1" placeholder="30" value={total} onChange={(e) => setTotal(e.target.value)} className={inputCls} />
            </label>
            <label>
              <span className="block text-[11px] font-bold text-slate-500 mb-1">Acertos</span>
              <input id="question-log-correct" type="number" min="0" placeholder="25" value={correct} onChange={(e) => setCorrect(e.target.value)} className={inputCls} />
            </label>
            <div className="text-center pb-1.5">
              <div className={`text-2xl font-black ${pctColor}`}>{pct !== undefined ? `${pct}%` : '—'}</div>
              <div className="text-[10px] text-slate-500">acertos</div>
            </div>
          </div>
          {correct !== '' && Number(correct) > t && t > 0 && <p className="text-[11px] text-rose-500">Os acertos não podem passar do total.</p>}

          <button
            type="submit"
            disabled={!canSave}
            className="w-full px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold"
          >
            Salvar questões
          </button>
        </form>

        {savedErrors && (
          <div id="question-log-errors-hint" className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 p-3.5 space-y-2">
            <p className="text-xs text-slate-700 dark:text-slate-200">
              Salvo! Foram <strong>{savedErrors.count} erro{savedErrors.count > 1 ? 's' : ''}</strong>. Anote no caderno enquanto está fresco: o tipo do erro e a regra certa em 1 linha.
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                id="question-log-add-error"
                type="button"
                onClick={() => setNoteOpen(true)}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black"
              >
                <NotebookPen className="h-4 w-4" /> Anotar erro no caderno
              </button>
              <button type="button" onClick={() => setSavedErrors(null)} className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200">
                Agora não
              </button>
            </div>
          </div>
        )}

        {questionLogs.length > 0 && (
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">Últimos registros</p>
            <ul className="space-y-1.5">
              {questionLogs.slice(0, 6).map((q) => {
                const p = Math.round((q.correct / q.total) * 100);
                return (
                  <li key={q.id} className="group flex items-center gap-2 text-xs">
                    <span className="text-[10px] font-bold text-slate-400 w-10 shrink-0">{formatDM(q.date)}</span>
                    <span className="flex-1 min-w-0 truncate font-semibold text-slate-700 dark:text-slate-200">
                      {labelOf(q.blockId, q.topicId, q.kind, q.mode)}
                      {q.mode && q.mode !== 'tema' && q.blockId && <span className="ml-1 text-[10px] font-bold text-slate-400">· {MODE_LABEL[q.mode]}</span>}
                    </span>
                    <span className="shrink-0 text-slate-500">
                      {q.correct}/{q.total}
                    </span>
                    <span className={`shrink-0 font-black ${p >= 80 ? 'text-emerald-500' : p >= 60 ? 'text-amber-500' : 'text-rose-500'}`}>{p}%</span>
                    <button
                      onClick={() => deleteQuestionLog(q.id)}
                      className="p-0.5 text-slate-400 hover:text-rose-500 opacity-100 can-hover:opacity-0 can-hover:group-hover:opacity-100"
                      aria-label="Excluir registro"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        <ErrorNoteModal isOpen={noteOpen} onClose={() => setNoteOpen(false)} defaultBlockId={savedErrors?.blockId} defaultSubjectId={savedErrors?.subjectId} />
      </div>
    </div>
  );
};
