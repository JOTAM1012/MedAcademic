// Anotar (ou editar) um erro no caderno: tema, tipo do erro, certeza, por que errei e a regra em 1 linha.
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { NotebookPen, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Certainty, ErrorNote, ErrorType } from '../../types';
import { CERTAINTY_INFO, CERTAINTY_ORDER, ERROR_TYPES, ERROR_TYPE_ORDER } from '../../data/studyMethod';
import { subjectLabel } from './reviewShared';

interface ErrorNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Editar um erro existente */
  note?: ErrorNote;
  /** Já ligado a um tema das revisões (bloco) */
  defaultBlockId?: string;
  defaultSubjectId?: string;
  defaultTheme?: string;
}

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm font-semibold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-hidden focus:border-sky-500';

export const ErrorNoteModal: React.FC<ErrorNoteModalProps> = ({ isOpen, onClose, note, defaultBlockId, defaultSubjectId, defaultTheme }) => {
  const { topicBlocks, subjects, addErrorNote, updateErrorNote } = useApp();
  const [blockId, setBlockId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [theme, setTheme] = useState('');
  const [type, setType] = useState<ErrorType | ''>('');
  const [certainty, setCertainty] = useState<Certainty | ''>('');
  const [why, setWhy] = useState('');
  const [rule, setRule] = useState('');
  const [flashcard, setFlashcard] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [tried, setTried] = useState(false);
  /** Tema preenchido automaticamente (nome do bloco): não conta como texto digitado */
  const [baseTheme, setBaseTheme] = useState('');
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const reset = (keepLink: boolean) => {
    if (!keepLink) {
      const b = topicBlocks.find((x) => x.id === (note?.blockId || defaultBlockId));
      setBlockId(b?.id || '');
      setSubjectId(note?.subjectId || b?.subjectId || defaultSubjectId || '');
      const t = note?.theme || defaultTheme || b?.name || '';
      setTheme(t);
      setBaseTheme(t);
    } else {
      // Próximo erro do mesmo tema: mantém o vínculo e volta o nome do tema ao do bloco
      const t = topicBlocks.find((x) => x.id === blockId)?.name || '';
      setTheme(t);
      setBaseTheme(t);
    }
    setConfirmDiscard(false);
    setType(note?.type || '');
    setCertainty(note?.certainty || '');
    setWhy(note?.why || '');
    setRule(note?.rule || '');
    setFlashcard(!!note?.flashcard);
    setTried(false);
  };

  useEffect(() => {
    if (!isOpen) return;
    reset(false);
    setSavedCount(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, note?.id, defaultBlockId, defaultSubjectId, defaultTheme]);

  // Algo digitado (tema, por quê ou regra) que ainda não foi salvo
  const dirty =
    theme.trim() !== baseTheme.trim() || why.trim() !== (note?.why || '').trim() || rule.trim() !== (note?.rule || '').trim();
  /** Fechar sem perder o texto: com algo digitado, pergunta antes */
  const requestClose = () => {
    if (dirty) setConfirmDiscard(true);
    else onClose();
  };
  const closeRef = useRef(requestClose);
  closeRef.current = requestClose;

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (confirmDiscard) setConfirmDiscard(false);
      else closeRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, confirmDiscard]);

  const blockGroups = useMemo(
    () =>
      subjects
        .map((s) => ({ label: subjectLabel(s), items: topicBlocks.filter((b) => b.subjectId === s.id) }))
        .filter((g) => g.items.length > 0),
    [subjects, topicBlocks]
  );

  if (!isOpen) return null;

  const valid = theme.trim().length > 0 && !!type && rule.trim().length > 0;
  const linkedBlock = topicBlocks.find((b) => b.id === blockId);

  const save = (again: boolean) => {
    setTried(true);
    if (!valid || !type) return;
    const data = {
      theme: theme.trim(),
      type,
      rule: rule.trim(),
      blockId: blockId || undefined,
      subjectId: subjectId || undefined,
      certainty: certainty || undefined,
      why: why.trim() || undefined,
      flashcard: flashcard || undefined,
    };
    if (note) {
      updateErrorNote(note.id, data);
      onClose();
      return;
    }
    addErrorNote(data);
    if (again) {
      setSavedCount((n) => n + 1);
      reset(true);
    } else onClose();
  };

  const pickBlock = (id: string) => {
    const b = topicBlocks.find((x) => x.id === id);
    const prevBlockName = linkedBlock?.name;
    setBlockId(id);
    if (b) {
      setSubjectId(b.subjectId);
      if (!theme.trim() || theme === prevBlockName) setTheme(b.name);
    }
  };

  const typeInfo = type ? ERROR_TYPES[type] : undefined;

  return (
    <div
      className="app-modal fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in"
      // Só fecha no toque que começa no fundo (arrastar uma seleção para fora não fecha)
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        id="err-note-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="err-note-modal-title"
        className="app-modal-panel relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 shrink-0">
              <NotebookPen className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="err-note-modal-title" className="text-base font-black text-slate-900 dark:text-white">
                {note ? 'Editar erro' : 'Anotar erro no caderno'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tema, por que errou e a regra certa em 1 linha</p>
            </div>
          </div>
          <button type="button" onClick={requestClose} className="h-10 w-10 -mr-2 -mt-1 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        {savedCount > 0 && (
          <p className="text-[12px] font-semibold rounded-xl px-3 py-2 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
            ✓ {savedCount} erro{savedCount > 1 ? 's' : ''} anotado{savedCount > 1 ? 's' : ''}. Pode anotar o próximo.
          </p>
        )}

        {/* Tema */}
        <div className="space-y-2">
          <label className="block">
            <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Tema da questão</span>
            <input
              id="err-note-theme"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="Ex.: Critérios de Jones na febre reumática"
              className={inputCls}
              maxLength={120}
            />
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <label className="block min-w-0">
              <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Tema das revisões (opcional)</span>
              <select id="err-note-block" value={blockId} onChange={(e) => pickBlock(e.target.value)} className={inputCls + ' text-xs'}>
                <option value="">Nenhum</option>
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
            </label>
            <label className="block min-w-0">
              <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Disciplina</span>
              <select
                id="err-note-subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                disabled={!!linkedBlock}
                className={inputCls + ' text-xs disabled:opacity-60'}
              >
                <option value="">Sem disciplina</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {subjectLabel(s)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
            {linkedBlock
              ? 'Ligado ao tema: este erro volta dentro da próxima revisão dele.'
              : 'Sem tema das revisões: o erro volta para você refazer em 7 e 30 dias.'}
          </p>
        </div>

        {/* Tipo */}
        <div>
          <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">Por que foi? (tipo do erro)</span>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo do erro">
            {ERROR_TYPE_ORDER.map((id) => {
              const info = ERROR_TYPES[id];
              const on = type === id;
              return (
                <button
                  key={id}
                  id={`err-note-type-${id}`}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={info.label}
                  onClick={() => setType(id)}
                  className={`text-left rounded-2xl border p-3 min-h-[84px] transition-all ${
                    on ? 'shadow-sm' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                  style={on ? { borderColor: info.color, backgroundColor: info.color + '14', boxShadow: `0 0 0 1px ${info.color}` } : undefined}
                >
                  <span className="text-xl leading-none">{info.emoji}</span>
                  <span className="block text-[13px] font-black text-slate-900 dark:text-white mt-1 leading-tight">{info.label}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-snug mt-0.5">{info.example}</span>
                </button>
              );
            })}
          </div>
          {typeInfo ? (
            <p className="text-[12px] mt-2 rounded-xl px-3 py-2 font-semibold ink" style={{ '--ink': typeInfo.color, backgroundColor: typeInfo.color + '12' } as React.CSSProperties}>
              O que fazer: {typeInfo.action}.
            </p>
          ) : (
            tried && <p className="text-[11px] mt-1.5 text-rose-600 dark:text-rose-400 font-semibold">Escolha o tipo do erro.</p>
          )}
        </div>

        {/* Certeza */}
        <div>
          <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">Quanta certeza você tinha? (opcional)</span>
          <div className="grid grid-cols-3 gap-2">
            {CERTAINTY_ORDER.map((c) => {
              const info = CERTAINTY_INFO[c];
              const on = certainty === c;
              return (
                <button
                  key={c}
                  id={`err-note-certainty-${c}`}
                  type="button"
                  onClick={() => setCertainty(on ? '' : c)}
                  aria-pressed={on}
                  className={`rounded-xl border px-2 py-2 min-h-[44px] text-center transition-colors ${
                    on
                      ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <span className="block text-xs font-bold">
                    {info.emoji} {info.label}
                  </span>
                  <span className="block text-[10px] opacity-75">{info.hint}</span>
                </button>
              );
            })}
          </div>
          {certainty === 'certeza' && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5">Errar com certeza é o erro mais importante de anotar: era uma ideia errada fixada.</p>
          )}
        </div>

        {/* Por que errei / regra */}
        <label className="block">
          <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Por que errei (opcional)</span>
          <input id="err-note-why" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="Ex.: confundi com a artrite reativa" className={inputCls} maxLength={160} />
        </label>
        <label className="block">
          <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Regra correta em 1 linha</span>
          <textarea
            id="err-note-rule"
            value={rule}
            onChange={(e) => setRule(e.target.value)}
            rows={2}
            placeholder="Ex.: Jones = 2 maiores, ou 1 maior + 2 menores, com prova de estreptococo"
            className={inputCls + ' resize-none'}
            maxLength={240}
          />
          {tried && !rule.trim() && <span className="block text-[11px] mt-1 text-rose-600 dark:text-rose-400 font-semibold">Escreva a regra certa: é ela que você vai treinar depois.</span>}
          {tried && !theme.trim() && <span className="block text-[11px] mt-1 text-rose-600 dark:text-rose-400 font-semibold">Dê um nome ao tema.</span>}
        </label>

        <label className="flex items-center gap-2.5 min-h-[40px] cursor-pointer select-none">
          <input
            id="err-note-flashcard"
            type="checkbox"
            checked={flashcard}
            onChange={(e) => setFlashcard(e.target.checked)}
            className="h-5 w-5 rounded-md accent-sky-600"
          />
          <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">🃏 Virou flashcard</span>
        </label>

        <div className="app-modal-footer flex flex-col-reverse sm:flex-row gap-2 pt-1">
          {!note && (
            <button
              id="err-note-save-again"
              type="button"
              onClick={() => save(true)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Salvar e anotar outro
            </button>
          )}
          <button
            id="err-note-save"
            type="button"
            onClick={() => save(false)}
            className={`flex-1 px-4 py-3 rounded-xl text-white text-xs font-black transition-colors ${valid ? 'bg-sky-600 hover:bg-sky-500' : 'bg-sky-600/50'}`}
          >
            {note ? 'Salvar alterações' : 'Salvar no caderno'}
          </button>
        </div>

        {/* Confirmação antes de perder o texto (fica visível no rodapé da janela) */}
        {confirmDiscard && (
          <div
            id="err-note-discard"
            role="alertdialog"
            aria-labelledby="err-note-discard-title"
            className="sticky bottom-0 -mx-5 -mb-5 px-5 py-4 border-t border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-slate-950 rounded-b-3xl space-y-2.5"
          >
            <p id="err-note-discard-title" className="text-[13px] font-black text-slate-900 dark:text-white">
              Descartar este erro?
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-300">O que você escreveu ainda não foi salvo.</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                id="err-note-discard-yes"
                type="button"
                onClick={onClose}
                className="min-h-[44px] rounded-xl border border-rose-300 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-black hover:bg-rose-50 dark:hover:bg-rose-950/40"
              >
                Descartar
              </button>
              <button
                id="err-note-discard-no"
                type="button"
                autoFocus
                onClick={() => setConfirmDiscard(false)}
                className="min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black"
              >
                Continuar editando
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
