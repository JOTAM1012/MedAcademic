// Provas de semestres passados: organização pessoal (assuntos para revisar e questões para tirar dúvida)
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText,
  X,
  Plus,
  Trash2,
  ChevronDown,
  Check,
  HelpCircle,
  ListChecks,
  Pencil,
  CheckCircle2,
  Circle,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PastExam } from '../../types';

export interface PastExamsModalProps {
  open: boolean;
  onClose: () => void;
}

const EXAM_TYPES = ['P1', 'P2', 'P3', 'Prova final', 'Prova prática', 'Substitutiva'];

const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

const inputCls =
  'w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500';
const areaCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500';
const labelCls = 'block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1';

interface HeaderDraft {
  moduleName: string;
  examType: string;
  semesterLabel: string;
}
const emptyHeader: HeaderDraft = { moduleName: '', examType: '', semesterLabel: '' };

export const PastExamsModal: React.FC<PastExamsModalProps> = ({ open, onClose }) => {
  const { studyMethod, addPastExam, updatePastExam, deletePastExam, showNotification } = useApp();
  const exams = studyMethod.pastExams || [];
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [header, setHeader] = useState<HeaderDraft>(emptyHeader);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFormOpen(exams.length === 0);
    setEditingId(null);
    setHeader(emptyHeader);
    setError(null);
    setConfirmDelete(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onClose]);

  // Mais recentes primeiro
  const ordered = useMemo(() => [...exams].sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [exams]);

  if (!open) return null;

  const startNew = () => {
    setEditingId(null);
    setHeader(emptyHeader);
    setError(null);
    setFormOpen(true);
  };
  const startEdit = (p: PastExam) => {
    setEditingId(p.id);
    setHeader({ moduleName: p.moduleName, examType: p.examType, semesterLabel: p.semesterLabel });
    setError(null);
    setFormOpen(true);
  };
  const saveHeader = () => {
    const moduleName = header.moduleName.trim();
    if (!moduleName) return setError('Informe o nome do módulo.');
    const data = { moduleName, examType: header.examType.trim() || 'Prova', semesterLabel: header.semesterLabel.trim() };
    if (editingId) {
      updatePastExam(editingId, data);
    } else {
      const id = addPastExam({ ...data, topics: [], questions: [] });
      setExpanded(id);
      showNotification('Prova adicionada. Agora liste os assuntos e as questões.', 'success');
    }
    setFormOpen(false);
    setEditingId(null);
    setHeader(emptyHeader);
  };

  return createPortal(
    <div className="app-modal fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in" onClick={onClose}>
      <div
        id="pastexam-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pastexam-modal-title"
        className="app-modal-panel relative w-full max-w-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 shrink-0">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 id="pastexam-modal-title" className="text-base font-black text-slate-900 dark:text-white truncate">
                Provas anteriores
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Guarde os assuntos para revisar e as dúvidas para levar ao professor.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Formulário da prova */}
        {formOpen ? (
          <form
            id="pastexam-form"
            className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3 sm:p-4 space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              saveHeader();
            }}
          >
            <p className="text-xs font-black text-slate-900 dark:text-white">{editingId ? 'Editar prova' : 'Nova prova'}</p>
            <div>
              <label htmlFor="pastexam-module" className={labelCls}>
                Nome do módulo *
              </label>
              <input
                id="pastexam-module"
                value={header.moduleName}
                onChange={(e) => {
                  setHeader({ ...header, moduleName: e.target.value });
                  setError(null);
                }}
                placeholder="Ex.: Sistema Cardiovascular"
                className={inputCls}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="pastexam-type" className={labelCls}>
                Tipo de prova
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {EXAM_TYPES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setHeader({ ...header, examType: t })}
                    className={`h-10 px-3 rounded-full text-[11px] font-bold border transition-colors ${
                      header.examType === t
                        ? 'bg-sky-600 border-sky-600 text-white'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-400'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                id="pastexam-type"
                value={header.examType}
                onChange={(e) => setHeader({ ...header, examType: e.target.value })}
                placeholder="Ou escreva: Teórica, OSCE, Tutoria…"
                className={inputCls}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="pastexam-semester" className={labelCls}>
                Semestre / data da prova
              </label>
              <input
                id="pastexam-semester"
                value={header.semesterLabel}
                onChange={(e) => setHeader({ ...header, semesterLabel: e.target.value })}
                placeholder="Ex.: 2º semestre · 2025.2 · 12/05/2025"
                className={inputCls}
                autoComplete="off"
              />
            </div>
            {error && (
              <p role="alert" className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}
            <div className="flex items-center justify-end gap-2">
              {(exams.length > 0 || editingId) && (
                <button
                  type="button"
                  onClick={() => {
                    setFormOpen(false);
                    setEditingId(null);
                  }}
                  className="h-11 px-4 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancelar
                </button>
              )}
              <button type="submit" id="pastexam-save" className="h-11 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold">
                {editingId ? 'Salvar' : 'Adicionar prova'}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            id="pastexam-add"
            onClick={startNew}
            className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold"
          >
            <Plus className="h-4 w-4" /> Adicionar prova
          </button>
        )}

        {/* Lista */}
        {ordered.length === 0 && !formOpen && (
          <p className="text-xs text-slate-500 text-center py-4">Nenhuma prova anterior registrada.</p>
        )}
        {ordered.length === 0 && formOpen && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Comece pela prova que você quer revisar. Depois é só listar os assuntos que caíram e as questões que ficaram com dúvida.
          </p>
        )}
        <ul id="pastexam-list" className="space-y-2">
          {ordered.map((p) => (
            <PastExamItem
              key={p.id}
              exam={p}
              open={expanded === p.id}
              onToggle={() => setExpanded(expanded === p.id ? null : p.id)}
              onEdit={() => startEdit(p)}
              confirming={confirmDelete === p.id}
              onAskDelete={() => setConfirmDelete(p.id)}
              onCancelDelete={() => setConfirmDelete(null)}
              onDelete={() => {
                deletePastExam(p.id);
                setConfirmDelete(null);
              }}
              onChange={(changes) => updatePastExam(p.id, changes)}
            />
          ))}
        </ul>
      </div>
    </div>,
    document.body
  );
};

// Anotação salva ao sair do campo (evita gravar a cada tecla)
const NoteField: React.FC<{ value: string; onCommit: (v: string) => void }> = ({ value, onCommit }) => {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  return (
    <textarea
      value={text}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => text.trim() !== value.trim() && onCommit(text.trim())}
      rows={1}
      placeholder="Anotação / resposta do professor"
      aria-label="Anotação da questão"
      className={`${areaCls} mt-2 text-xs`}
    />
  );
};

interface ItemProps {
  exam: PastExam;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  confirming: boolean;
  onAskDelete: () => void;
  onCancelDelete: () => void;
  onDelete: () => void;
  onChange: (changes: Partial<PastExam>) => void;
}

const PastExamItem: React.FC<ItemProps> = ({ exam, open, onToggle, onEdit, confirming, onAskDelete, onCancelDelete, onDelete, onChange }) => {
  const [topicText, setTopicText] = useState('');
  const [qOpen, setQOpen] = useState(false);
  const [qText, setQText] = useState('');
  const [qOptions, setQOptions] = useState('');
  const [qNote, setQNote] = useState('');

  const topics = exam.topics || [];
  const questions = exam.questions || [];
  const topicsDone = topics.filter((t) => t.done).length;
  const qResolved = questions.filter((q) => q.resolved).length;

  const addTopic = () => {
    const titles = topicText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    if (!titles.length) return;
    onChange({ topics: [...topics, ...titles.map((title) => ({ id: uid('pastexam-t'), title, done: false }))] });
    setTopicText('');
  };
  const addQuestion = () => {
    if (!qText.trim()) return;
    onChange({
      questions: [
        ...questions,
        { id: uid('pastexam-q'), text: qText.trim(), options: qOptions.trim() || undefined, note: qNote.trim() || undefined, resolved: false },
      ],
    });
    setQText('');
    setQOptions('');
    setQNote('');
    setQOpen(false);
  };

  return (
    <li id={`pastexam-item-${exam.id}`} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
      <div className="flex items-center gap-1 pr-1">
        <button type="button" onClick={onToggle} aria-expanded={open} className="flex-1 min-w-0 flex items-center gap-3 p-3 text-left">
          <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{exam.moduleName}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-700 dark:text-violet-300">{exam.examType}</span>
              {exam.semesterLabel && <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{exam.semesterLabel}</span>}
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                · {topicsDone}/{topics.length} assuntos · {qResolved}/{questions.length} dúvidas
              </span>
            </div>
          </div>
        </button>
        {!confirming && (
          <>
            <button
              type="button"
              onClick={onEdit}
              aria-label={`Editar ${exam.moduleName}`}
              className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={onAskDelete}
              aria-label={`Excluir ${exam.moduleName}`}
              className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {confirming && (
        <div className="mx-3 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-3 py-2">
          <span className="text-xs font-bold text-rose-700 dark:text-rose-300">Excluir esta prova e tudo dentro dela?</span>
          <div className="flex gap-2">
            <button type="button" onClick={onCancelDelete} className="h-10 px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button type="button" onClick={onDelete} className="h-10 px-3 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white">
              Excluir
            </button>
          </div>
        </div>
      )}

      {open && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-3 space-y-4">
          {/* Assuntos */}
          <section className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-500">
              <ListChecks className="h-3.5 w-3.5 text-emerald-500" /> Assuntos que caíram
            </h4>
            {topics.length === 0 && <p className="text-xs text-slate-400">Liste os assuntos da prova para ir marcando conforme revisa.</p>}
            <ul className="space-y-1">
              {topics.map((t) => (
                <li key={t.id} className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onChange({ topics: topics.map((x) => (x.id === t.id ? { ...x, done: !x.done } : x)) })}
                    aria-pressed={!!t.done}
                    className="flex-1 min-w-0 min-h-10 flex items-center gap-2.5 px-2 rounded-xl text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                  >
                    <span
                      className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center ${
                        t.done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {t.done && <Check className="h-3.5 w-3.5" />}
                    </span>
                    <span className={`text-sm truncate ${t.done ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>{t.title}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ topics: topics.filter((x) => x.id !== t.id) })}
                    aria-label={`Remover ${t.title}`}
                    className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-slate-300 dark:text-slate-600 hover:text-rose-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input
                id={`pastexam-topic-input-${exam.id}`}
                value={topicText}
                onChange={(e) => setTopicText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTopic();
                  }
                }}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text');
                  if (text.includes('\n')) {
                    e.preventDefault();
                    setTopicText(text);
                  }
                }}
                placeholder="Novo assunto (Enter para adicionar)"
                className={`${inputCls} flex-1 min-w-0`}
              />
              <button
                type="button"
                id={`pastexam-topic-add-${exam.id}`}
                onClick={addTopic}
                aria-label="Adicionar assunto"
                className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-sky-600 hover:bg-sky-500 text-white"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
          </section>

          {/* Questões */}
          <section className="space-y-2">
            <h4 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-slate-500">
              <HelpCircle className="h-3.5 w-3.5 text-amber-500" /> Questões para revisar ou tirar dúvida
            </h4>
            {questions.length === 0 && !qOpen && (
              <p className="text-xs text-slate-400">Guarde as questões que você errou ou quer perguntar ao professor.</p>
            )}
            <ul className="space-y-2">
              {questions.map((q, i) => (
                <li
                  key={q.id}
                  className={`rounded-xl border p-2.5 ${
                    q.resolved ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20' : 'border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[11px] font-black text-slate-400 pt-0.5 shrink-0">Q{i + 1}</span>
                    <p className="flex-1 min-w-0 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">{q.text}</p>
                    <button
                      type="button"
                      onClick={() => onChange({ questions: questions.filter((x) => x.id !== q.id) })}
                      aria-label="Remover questão"
                      className="h-10 w-10 -mt-2 -mr-1 shrink-0 flex items-center justify-center rounded-xl text-slate-300 dark:text-slate-600 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  {q.options && (
                    <p className="mt-1.5 ml-6 text-xs text-slate-600 dark:text-slate-400 whitespace-pre-wrap break-words">{q.options}</p>
                  )}
                  <NoteField
                    value={q.note || ''}
                    onCommit={(note) => onChange({ questions: questions.map((x) => (x.id === q.id ? { ...x, note: note || undefined } : x)) })}
                  />
                  <button
                    type="button"
                    onClick={() => onChange({ questions: questions.map((x) => (x.id === q.id ? { ...x, resolved: !x.resolved } : x)) })}
                    aria-pressed={!!q.resolved}
                    className={`mt-1.5 min-h-10 inline-flex items-center gap-1.5 px-2 rounded-xl text-xs font-bold ${
                      q.resolved ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400 hover:text-emerald-600'
                    }`}
                  >
                    {q.resolved ? <CheckCircle2 className="h-4 w-4" /> : <Circle className="h-4 w-4" />}
                    {q.resolved ? 'Resolvida' : 'Marcar como resolvida'}
                  </button>
                </li>
              ))}
            </ul>

            {qOpen ? (
              <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-2.5 space-y-2">
                <div>
                  <span className={labelCls}>Questão *</span>
                  <textarea
                    id={`pastexam-q-text-${exam.id}`}
                    value={qText}
                    onChange={(e) => setQText(e.target.value)}
                    rows={3}
                    placeholder="Enunciado da questão"
                    aria-label="Enunciado da questão"
                    className={areaCls}
                  />
                </div>
                <div>
                  <span className={labelCls}>Alternativas</span>
                  <textarea
                    value={qOptions}
                    onChange={(e) => setQOptions(e.target.value)}
                    rows={4}
                    placeholder={'a) ...\nb) ...\nc) ...\nd) ...'}
                    aria-label="Alternativas"
                    className={areaCls}
                  />
                </div>
                <div>
                  <span className={labelCls}>Anotação</span>
                  <input
                    value={qNote}
                    onChange={(e) => setQNote(e.target.value)}
                    placeholder="Ex.: marquei b, gabarito diz d — perguntar por quê"
                    aria-label="Anotação"
                    className={inputCls}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setQOpen(false)}
                    className="h-10 px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    id={`pastexam-q-save-${exam.id}`}
                    onClick={addQuestion}
                    disabled={!qText.trim()}
                    className="h-10 px-4 rounded-xl text-xs font-bold bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white"
                  >
                    Salvar questão
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                id={`pastexam-q-add-${exam.id}`}
                onClick={() => setQOpen(true)}
                className="w-full h-10 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-600"
              >
                <Plus className="h-4 w-4" /> Adicionar questão
              </button>
            )}
          </section>
        </div>
      )}
    </li>
  );
};
