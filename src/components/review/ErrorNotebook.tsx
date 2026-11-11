// Caderno de erros: lista com filtros, modo "Revisar caderno" (cartão a cartão, regra escondida)
// e anotar / editar / excluir erros.
import React, { useMemo, useState } from 'react';
import { BookOpenCheck, Eye, NotebookPen, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ErrorNote } from '../../types';
import { formatDM } from '../../data/blockReview';
import { CERTAINTY_INFO, ERROR_TYPES, ERROR_TYPE_ORDER, isErrorDue, nextErrorRedo } from '../../data/studyMethod';
import { todayYMD } from '../../hooks/useStudyPlan';
import { ErrorNoteModal } from './ErrorNoteModal';
import { subjectLabel } from './reviewShared';
import { EmptyState } from '../shared/EmptyState';

export type ErrorFilter = 'hoje' | 'abertos' | 'resolvidos' | 'todos';

interface ErrorNotebookProps {
  initialFilter?: ErrorFilter;
}

export const ErrorNotebook: React.FC<ErrorNotebookProps> = ({ initialFilter }) => {
  const { studyMethod, topicBlocks, subjects, deleteErrorNote, redoErrorNote } = useApp();
  const today = todayYMD();
  const notes = studyMethod.errorNotes || [];
  const dueNotes = useMemo(() => notes.filter((n) => isErrorDue(n, today, topicBlocks)), [notes, today, topicBlocks]);
  const openNotes = notes.filter((n) => n.status !== 'resolvido');
  const resolved = notes.filter((n) => n.status === 'resolvido');

  const [filter, setFilter] = useState<ErrorFilter>(initialFilter || (dueNotes.length > 0 ? 'hoje' : 'abertos'));
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [modal, setModal] = useState<{ open: boolean; note?: ErrorNote }>({ open: false });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // Modo revisão
  const [reviewIds, setReviewIds] = useState<string[] | null>(null);
  const [reviewIdx, setReviewIdx] = useState(0);
  const [ruleShown, setRuleShown] = useState(false);
  const [results, setResults] = useState({ right: 0, wrong: 0 });

  const blockOf = (n: ErrorNote) => (n.blockId ? topicBlocks.find((b) => b.id === n.blockId) : undefined);
  const subjectOf = (n: ErrorNote) => subjects.find((s) => s.id === (n.subjectId || blockOf(n)?.subjectId));

  const subjectOptions = useMemo(() => {
    const ids = new Set(notes.map((n) => n.subjectId || blockOf(n)?.subjectId).filter(Boolean) as string[]);
    return subjects.filter((s) => ids.has(s.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, subjects, topicBlocks]);

  const base = filter === 'hoje' ? dueNotes : filter === 'abertos' ? openNotes : filter === 'resolvidos' ? resolved : notes;
  const list = base
    .filter((n) => subjectFilter === 'all' || (n.subjectId || blockOf(n)?.subjectId) === subjectFilter)
    .sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === 'aberto' ? -1 : 1));

  const whenBack = (n: ErrorNote) => {
    if (n.status === 'resolvido') return '✓ Resolvido';
    const b = blockOf(n);
    if (b && b.reviewStatus !== 'estudando') {
      return b.nextReviewDate && b.nextReviewDate <= today ? 'Volta na revisão do tema de hoje' : `Volta na próxima revisão do tema${b.nextReviewDate ? ` (${formatDM(b.nextReviewDate)})` : ''}`;
    }
    const next = nextErrorRedo(n);
    if (!next) return '';
    return next <= today ? 'Para refazer hoje' : `Volta em ${formatDM(next)}`;
  };

  const startReview = (ids: string[]) => {
    if (ids.length === 0) return;
    setReviewIds(ids);
    setReviewIdx(0);
    setRuleShown(false);
    setResults({ right: 0, wrong: 0 });
  };

  const answer = (right: boolean) => {
    if (!reviewIds) return;
    redoErrorNote(reviewIds[reviewIdx], right);
    setResults((r) => ({ right: r.right + (right ? 1 : 0), wrong: r.wrong + (right ? 0 : 1) }));
    setRuleShown(false);
    setReviewIdx((i) => i + 1);
  };

  // ---------------- Modo "Revisar caderno" ----------------
  if (reviewIds) {
    const current = notes.find((n) => n.id === reviewIds[reviewIdx]);
    const finished = reviewIdx >= reviewIds.length || !current;
    const progress = Math.min(100, Math.round((reviewIdx / reviewIds.length) * 100));
    return (
      <div id="err-review-mode" className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-amber-600 dark:text-amber-400">Revisar caderno</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {finished ? 'Terminou!' : `Erro ${reviewIdx + 1} de ${reviewIds.length}`} · tente lembrar a regra antes de olhar
            </p>
          </div>
          <button
            id="err-review-exit"
            type="button"
            onClick={() => setReviewIds(null)}
            className="inline-flex items-center gap-1 min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" /> Sair
          </button>
        </div>
        <div className="h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${finished ? 100 : progress}%` }} />
        </div>

        {finished || !current ? (
          <div className="rounded-3xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/60 dark:bg-emerald-950/20 p-6 text-center space-y-3">
            <p className="text-3xl">📒✨</p>
            <h3 className="text-base font-black text-slate-900 dark:text-white">Caderno revisado!</h3>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              {results.right} acerto{results.right === 1 ? '' : 's'} · {results.wrong} para treinar de novo. Os que você errou voltam daqui a alguns dias.
            </p>
            <button
              type="button"
              onClick={() => setReviewIds(null)}
              className="min-h-[44px] px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black"
            >
              Voltar ao caderno
            </button>
          </div>
        ) : (
          (() => {
            const info = ERROR_TYPES[current.type];
            const sub = subjectOf(current);
            return (
              <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-lg space-y-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border ink" style={{ '--ink': info.color, backgroundColor: info.color + '14', borderColor: info.color + '40' } as React.CSSProperties}>
                    {info.emoji} {info.label}
                  </span>
                  {sub && <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 truncate">{subjectLabel(sub)}</span>}
                </div>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white leading-snug break-words">{current.theme}</h3>
                  {current.why && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 break-words">Por que errei: {current.why}</p>}
                </div>
                {ruleShown ? (
                  <>
                    <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900 p-4">
                      <p className="text-[11px] font-black uppercase tracking-wide text-sky-700 dark:text-sky-300 mb-1">Regra</p>
                      <p className="text-[15px] font-semibold text-slate-900 dark:text-white break-words">{current.rule}</p>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Você lembrou a regra?</p>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        id="err-review-right"
                        type="button"
                        onClick={() => answer(true)}
                        className="min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black"
                      >
                        ✓ Acertei
                      </button>
                      <button
                        id="err-review-wrong"
                        type="button"
                        onClick={() => answer(false)}
                        className="min-h-[48px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-sm font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        Errei de novo
                      </button>
                    </div>
                  </>
                ) : (
                  <button
                    id="err-review-show"
                    type="button"
                    onClick={() => setRuleShown(true)}
                    className="w-full min-h-[48px] rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-sm font-black inline-flex items-center justify-center gap-2"
                  >
                    <Eye className="h-4 w-4" /> Mostrar regra
                  </button>
                )}
                <button type="button" onClick={() => { setRuleShown(false); setReviewIdx((i) => i + 1); }} className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-h-[36px]">
                  Pular este
                </button>
              </div>
            );
          })()
        )}
      </div>
    );
  }

  // ---------------- Lista ----------------
  const chips: Array<[ErrorFilter, string, number]> = [
    ['hoje', 'Para refazer hoje', dueNotes.length],
    ['abertos', 'Abertos', openNotes.length],
    ['resolvidos', 'Resolvidos', resolved.length],
    ['todos', 'Todos', notes.length],
  ];

  return (
    <div id="err-notebook" className="space-y-4">
      {/* Ações */}
      <div className="rounded-3xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-900 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div className="min-w-0">
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
              <span>📒</span> Caderno de erros
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
              {dueNotes.length > 0
                ? `${dueNotes.length} erro${dueNotes.length > 1 ? 's' : ''} para refazer hoje. Errar e corrigir é como se aprende.`
                : openNotes.length > 0
                  ? 'Nada para refazer hoje. Os erros voltam sozinhos na data certa.'
                  : 'Anote aqui cada questão errada: tema, por que errou e a regra certa.'}
            </p>
          </div>
          <div className="flex flex-col min-[400px]:flex-row gap-2 shrink-0">
            <button
              id="err-review-start"
              type="button"
              onClick={() => startReview((dueNotes.length > 0 ? dueNotes : openNotes).map((n) => n.id))}
              disabled={openNotes.length === 0}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 disabled:cursor-not-allowed text-slate-950 text-xs font-black"
            >
              <BookOpenCheck className="h-4 w-4" /> {dueNotes.length > 0 ? `Revisar caderno (${dueNotes.length})` : 'Revisar abertos'}
            </button>
            <button
              id="err-add-btn"
              type="button"
              onClick={() => setModal({ open: true })}
              className="inline-flex items-center justify-center gap-2 min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" /> Anotar erro
            </button>
          </div>
        </div>
        <button type="button" onClick={() => setHelpOpen((h) => !h)} className="mt-2 text-[11px] font-bold text-amber-800 dark:text-amber-300 min-h-[32px]" aria-expanded={helpOpen}>
          {helpOpen ? 'Fechar' : 'Como funciona o caderno?'}
        </button>
        {helpOpen && (
          <div className="mt-1 space-y-2 text-xs text-slate-600 dark:text-slate-300">
            <p>Erro de um tema das revisões volta dentro da próxima revisão desse tema. Erro sem tema volta em 7 e 30 dias. Acertou 2 vezes seguidas? Resolvido.</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {ERROR_TYPE_ORDER.map((k) => (
                <li key={k} className="rounded-lg px-2.5 py-1.5 bg-white/70 dark:bg-slate-900/70 border border-slate-200/70 dark:border-slate-800">
                  <strong className="ink" style={{ '--ink': ERROR_TYPES[k].color } as React.CSSProperties}>
                    {ERROR_TYPES[k].emoji} {ERROR_TYPES[k].label}:
                  </strong>{' '}
                  {ERROR_TYPES[k].action.toLowerCase()}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Filtros */}
      {notes.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-between">
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            {chips.map(([id, label, count]) => (
              <button
                key={id}
                id={`err-filter-${id}`}
                type="button"
                onClick={() => setFilter(id)}
                className={`shrink-0 min-h-[36px] px-3 rounded-full text-xs font-bold transition-colors ${
                  filter === id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {label} · {count}
              </button>
            ))}
          </div>
          {subjectOptions.length > 0 && (
            <select
              id="err-filter-subject"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
              className="min-h-[40px] text-xs font-semibold px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 sm:w-56"
            >
              <option value="all">Todas as disciplinas</option>
              {subjectOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {subjectLabel(s)}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {/* Lista */}
      {list.length === 0 ? (
        notes.length === 0 ? (
          <EmptyState
            icon={NotebookPen}
            tone="violet"
            title="Seu caderno ainda está vazio"
            text="Errou uma questão? Anote o tipo do erro e a regra certa em 1 linha."
            actionLabel="Anotar erro"
            actionIcon={Plus}
            onAction={() => setModal({ open: true })}
          />
        ) : filter === 'hoje' ? (
          <EmptyState
            icon={BookOpenCheck}
            tone="emerald"
            title="Nada para refazer hoje"
            text="Tudo em dia. Os erros voltam sozinhos na data certa."
            actionLabel="Ver erros abertos"
            onAction={() => setFilter('abertos')}
          />
        ) : (
          <EmptyState
            icon={NotebookPen}
            tone="slate"
            size="sm"
            title="Nenhum erro neste filtro"
            text="Os erros voltam sozinhos na data certa."
            actionLabel="Ver todos"
            onAction={() => {
              setFilter('todos');
              setSubjectFilter('all');
            }}
          />
        )
      ) : (
        <ul className="space-y-2.5">
          {list.map((n) => {
            const info = ERROR_TYPES[n.type];
            const sub = subjectOf(n);
            const block = blockOf(n);
            const due = dueNotes.some((d) => d.id === n.id);
            return (
              <li
                key={n.id}
                id={`err-note-${n.id}`}
                className={`rounded-2xl border bg-white dark:bg-slate-900 p-4 ${
                  n.status === 'resolvido' ? 'border-slate-200 dark:border-slate-800 opacity-75' : due ? 'border-amber-300 dark:border-amber-800' : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full border whitespace-nowrap ink" style={{ '--ink': info.color, backgroundColor: info.color + '14', borderColor: info.color + '40' } as React.CSSProperties}>
                        {info.emoji} {info.label}
                      </span>
                      {n.certainty && (
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 whitespace-nowrap">
                          {CERTAINTY_INFO[n.certainty].emoji} {CERTAINTY_INFO[n.certainty].label}
                        </span>
                      )}
                      {n.flashcard && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 whitespace-nowrap">🃏 Flashcard</span>}
                    </div>
                    <p className="text-[14px] font-black text-slate-900 dark:text-white leading-snug break-words">{n.theme}</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {[block ? block.name : null, sub ? subjectLabel(sub) : null].filter(Boolean).join(' · ') || 'Sem tema ligado'}
                    </p>
                    {n.why && <p className="text-xs text-slate-600 dark:text-slate-300 break-words">Por que errei: {n.why}</p>}
                    <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100 rounded-xl px-3 py-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-100 dark:border-slate-800 break-words">
                      {n.rule}
                    </p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      <span style={{ '--ink': info.color } as React.CSSProperties} className="font-semibold ink">
                        {info.action}
                      </span>
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Anotado {formatDM(n.createdAt)}</span>
                      <span className={`font-bold ${n.status === 'resolvido' ? 'text-emerald-600 dark:text-emerald-400' : due ? 'text-amber-700 dark:text-amber-400' : ''}`}>{whenBack(n)}</span>
                      {n.status !== 'resolvido' && n.redoneCount > 0 && <span>{n.redoneCount} de 2 acertos</span>}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0 -mr-1">
                    <button
                      type="button"
                      onClick={() => setModal({ open: true, note: n })}
                      className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label="Editar erro"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(n.id)}
                      className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      aria-label="Excluir erro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {confirmDelete === n.id && (
                  <div className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 p-3 flex flex-col min-[400px]:flex-row min-[400px]:items-center gap-2 justify-between">
                    <p className="text-xs text-slate-700 dark:text-slate-200">Excluir este erro do caderno?</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          deleteErrorNote(n.id);
                          setConfirmDelete(null);
                        }}
                        className="min-h-[40px] px-4 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-black"
                      >
                        Excluir
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(null)}
                        className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <ErrorNoteModal isOpen={modal.open} note={modal.note} onClose={() => setModal({ open: false })} />
    </div>
  );
};
