// Provas de concurso (residência): registrar provas feitas fora da plataforma e acompanhar a evolução
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Trophy, X, Plus, Trash2, Pencil, Clock, Calendar, ArrowLeft, Save, Target, ListChecks } from 'lucide-react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { useApp } from '../../context/AppContext';
import { ContestExam } from '../../types';
import { DatePickerField } from '../DatePickerField';
import { todayYMD } from '../../hooks/useStudyPlan';
import {
  CONTEST_AREAS,
  contestArea,
  contestPct,
  contestStats,
  formatDateBR,
  formatMinutes,
  pctTone,
  sortContestsAsc,
} from './contestUtils';

export interface ContestsModalProps {
  open: boolean;
  onClose: () => void;
}

interface AreaDraft {
  area: string;
  total: string;
  correct: string;
}

interface Draft {
  name: string;
  year: string;
  date: string;
  totalQuestions: string;
  correct: string;
  minutes: string;
  notes: string;
  areas: AreaDraft[];
}

const emptyDraft = (): Draft => ({
  name: '',
  year: String(new Date().getFullYear()),
  date: todayYMD(),
  totalQuestions: '',
  correct: '',
  minutes: '',
  notes: '',
  areas: [],
});

const toDraft = (c: ContestExam): Draft => ({
  name: c.name,
  year: String(c.year || ''),
  date: c.date || '',
  totalQuestions: String(c.totalQuestions ?? ''),
  correct: String(c.correct ?? ''),
  minutes: c.minutes ? String(c.minutes) : '',
  notes: c.notes || '',
  areas: (c.areas || []).map((a) => ({ area: a.area, total: a.total !== undefined ? String(a.total) : '', correct: a.correct !== undefined ? String(a.correct) : '' })),
});

const num = (s: string) => (s.trim() === '' ? NaN : Number(s));
const inputCls =
  'w-full h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500';
const labelCls = 'block text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1';

export const ContestsModal: React.FC<ContestsModalProps> = ({ open, onClose }) => {
  const { studyMethod, addContest, updateContest, deleteContest, showNotification, isDarkMode } = useApp();
  const contests = studyMethod.contests || [];
  const [mode, setMode] = useState<'list' | 'form'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [pickArea, setPickArea] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setMode(contests.length ? 'list' : 'form');
    setEditingId(null);
    setDraft(emptyDraft());
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

  const ordered = useMemo(() => sortContestsAsc(contests), [contests]);
  const stats = useMemo(() => contestStats(contests), [contests]);
  const chartData = useMemo(
    () => ordered.map((c, i) => ({ key: c.id, label: `${i + 1}`, name: c.name, date: formatDateBR(c.date), pct: contestPct(c) })),
    [ordered]
  );

  const remainingAreas = CONTEST_AREAS.filter((a) => !draft.areas.some((x) => x.area === a.id));
  useEffect(() => {
    if (!remainingAreas.some((a) => a.id === pickArea)) setPickArea(remainingAreas[0]?.id || '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.areas.length]);

  if (!open) return null;

  const set = (patch: Partial<Draft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setError(null);
  };
  const setArea = (area: string, patch: Partial<AreaDraft>) =>
    set({ areas: draft.areas.map((a) => (a.area === area ? { ...a, ...patch } : a)) });

  const startNew = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setError(null);
    setMode('form');
  };
  const startEdit = (c: ContestExam) => {
    setEditingId(c.id);
    setDraft(toDraft(c));
    setError(null);
    setMode('form');
  };
  const cancelForm = () => {
    if (contests.length) setMode('list');
    else onClose();
  };

  const save = () => {
    const name = draft.name.trim();
    const year = num(draft.year);
    const total = num(draft.totalQuestions);
    const correct = num(draft.correct);
    const minutes = num(draft.minutes);
    if (!name) return setError('Dê um nome para a prova.');
    if (!Number.isInteger(year) || year < 1990 || year > 2100) return setError('Informe o ano de aplicação (ex.: 2026).');
    if (!draft.date) return setError('Escolha a data em que você fez a prova.');
    if (!Number.isFinite(total) || total <= 0) return setError('Informe o total de questões.');
    if (!Number.isFinite(correct) || correct < 0) return setError('Informe quantas questões você acertou.');
    if (correct > total) return setError('Os acertos não podem passar do total de questões.');
    if (!Number.isFinite(minutes) || minutes <= 0) return setError('Informe o tempo de prova em minutos.');
    const areas: NonNullable<ContestExam['areas']> = [];
    for (const a of draft.areas) {
      const t = num(a.total);
      const k = num(a.correct);
      if (Number.isFinite(t) && Number.isFinite(k) && k > t) return setError(`${a.area}: os acertos passaram do total.`);
      if (!Number.isFinite(t) && !Number.isFinite(k)) continue;
      areas.push({ area: a.area, total: Number.isFinite(t) ? t : undefined, correct: Number.isFinite(k) ? k : undefined });
    }
    const data = {
      name,
      year,
      date: draft.date,
      totalQuestions: Math.round(total),
      correct: Math.round(correct),
      minutes: Math.round(minutes),
      areas: areas.length ? areas : undefined,
      notes: draft.notes.trim() || undefined,
    };
    if (editingId) {
      updateContest(editingId, data);
      showNotification('Prova atualizada.', 'success');
    } else {
      addContest(data);
      showNotification('Prova registrada!', 'success');
    }
    setEditingId(null);
    setDraft(emptyDraft());
    setMode('list');
  };

  const grid = isDarkMode ? '#1e293b' : '#e2e8f0';
  const tick = isDarkMode ? '#94a3b8' : '#64748b';
  const formPct = (() => {
    const t = num(draft.totalQuestions);
    const k = num(draft.correct);
    return Number.isFinite(t) && t > 0 && Number.isFinite(k) && k <= t ? Math.round((k / t) * 100) : undefined;
  })();

  return createPortal(
    <div className="app-modal fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in" onClick={onClose}>
      <div
        id="contest-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="contest-modal-title"
        className="app-modal-panel relative w-full max-w-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {mode === 'form' && contests.length > 0 ? (
              <button
                type="button"
                onClick={() => setMode('list')}
                aria-label="Voltar para a lista de provas"
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : (
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
                <Trophy className="h-5 w-5" />
              </div>
            )}
            <div className="min-w-0">
              <h2 id="contest-modal-title" className="text-base font-black text-slate-900 dark:text-white truncate">
                {mode === 'list' ? 'Provas de concurso' : editingId ? 'Editar prova' : 'Cadastrar prova externa'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mode === 'list'
                  ? 'Acompanhe sua preparação para a residência.'
                  : 'Registre uma prova que você fez fora da plataforma. Os dados por grande área são opcionais.'}
              </p>
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

        {mode === 'list' ? (
          <>
            {contests.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center space-y-3">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                  <Trophy className="h-6 w-6" />
                </div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">Nenhuma prova registrada ainda</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                  Fez uma prova de residência ou um simulado fora daqui? Registre o resultado para ver sua evolução ao longo do tempo.
                </p>
              </div>
            ) : (
              <>
                {/* Resumo */}
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Média</div>
                    <div className={`text-xl font-black mt-0.5 ${pctTone(stats.avg)}`}>{stats.avg ?? '—'}%</div>
                    <div className="text-[10px] text-slate-500">de acerto</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Provas</div>
                    <div className="text-xl font-black mt-0.5 text-slate-900 dark:text-white">{stats.count}</div>
                    <div className="text-[10px] text-slate-500 truncate">{stats.total} questões</div>
                  </div>
                  <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/60 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Melhor</div>
                    <div className={`text-xl font-black mt-0.5 ${pctTone(stats.best)}`}>{stats.best ?? '—'}%</div>
                    <div className="text-[10px] text-slate-500">resultado</div>
                  </div>
                </div>

                {/* Evolução */}
                <section id="contest-evolution" className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2">Evolução do % de acerto</h3>
                  {chartData.length < 2 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">Registre mais uma prova para ver a linha de evolução.</p>
                  ) : (
                    <div className="h-44 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 8, right: 10, left: -22, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
                          <XAxis dataKey="label" stroke={tick} fontSize={11} tickLine={false} axisLine={{ stroke: grid }} />
                          <YAxis stroke={tick} fontSize={11} tickLine={false} axisLine={false} domain={[0, 100]} unit="%" />
                          <Tooltip
                            content={({ active, payload }) => {
                              if (!active || !payload?.length) return null;
                              const p = payload[0].payload as (typeof chartData)[number];
                              return (
                                <div className="max-w-[220px] bg-slate-900 border border-slate-700 text-white rounded-xl p-2.5 shadow-2xl text-xs">
                                  <p className="font-bold truncate">{p.name}</p>
                                  <p className="text-slate-400">{p.date}</p>
                                  <p className="font-black text-sky-400 mt-0.5">{p.pct}% de acerto</p>
                                </div>
                              );
                            }}
                          />
                          <Line type="monotone" dataKey="pct" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3.5, fill: '#0284c7' }} activeDot={{ r: 5 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </section>

                {/* Por grande área */}
                {stats.byArea.length > 0 && (
                  <section id="contest-areas" className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-4 space-y-2.5">
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Acerto por grande área (todas as provas)</h3>
                    {stats.byArea.map((a) => (
                      <div key={a.id}>
                        <div className="flex items-center justify-between gap-2 text-xs mb-1">
                          <span className="font-bold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                            {a.id}
                          </span>
                          <span className="shrink-0 text-slate-500">
                            {a.correct}/{a.total} · <strong className={pctTone(a.pct)}>{a.pct}%</strong>
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${a.pct}%`, backgroundColor: a.color }} />
                        </div>
                      </div>
                    ))}
                  </section>
                )}

                {/* Lista */}
                <section className="space-y-2">
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Provas feitas</h3>
                  <ul id="contest-list" className="space-y-2">
                    {[...ordered].reverse().map((c) => {
                      const p = contestPct(c);
                      const confirming = confirmDelete === c.id;
                      return (
                        <li key={c.id} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
                          <div className="flex items-start gap-3">
                            <div className={`shrink-0 w-14 text-center rounded-xl bg-slate-50 dark:bg-slate-950/60 py-1.5 font-black text-base ${pctTone(p)}`}>{p}%</div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">{c.name}</p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                <span>{c.year}</span>
                                <span className="inline-flex items-center gap-1">
                                  <Calendar className="h-3 w-3" /> {formatDateBR(c.date)}
                                </span>
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" /> {formatMinutes(c.minutes)}
                                </span>
                                <span>
                                  {c.correct}/{c.totalQuestions} acertos
                                </span>
                              </div>
                              {(c.areas || []).length > 0 && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {(c.areas || []).map((a) => {
                                    const info = contestArea(a.area);
                                    const ap = a.total ? Math.round(((a.correct || 0) / a.total) * 100) : undefined;
                                    return (
                                      <span
                                        key={a.area}
                                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                        style={{ backgroundColor: `${info.color}1f`, color: info.color }}
                                      >
                                        {info.short}
                                        {ap !== undefined ? ` ${ap}%` : ''}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                            {!confirming && (
                              <div className="flex shrink-0">
                                <button
                                  type="button"
                                  onClick={() => startEdit(c)}
                                  aria-label={`Editar ${c.name}`}
                                  className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-sky-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(c.id)}
                                  aria-label={`Excluir ${c.name}`}
                                  className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            )}
                          </div>
                          {confirming && (
                            <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 px-3 py-2">
                              <span className="text-xs font-bold text-rose-700 dark:text-rose-300">Excluir esta prova?</span>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => setConfirmDelete(null)}
                                  className="h-10 px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800"
                                >
                                  Cancelar
                                </button>
                                <button
                                  type="button"
                                  id={`contest-delete-${c.id}`}
                                  onClick={() => {
                                    deleteContest(c.id);
                                    setConfirmDelete(null);
                                  }}
                                  className="h-10 px-3 rounded-xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white"
                                >
                                  Excluir
                                </button>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </section>
              </>
            )}

            <button
              type="button"
              id="contest-add"
              onClick={startNew}
              className="w-full h-11 flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold"
            >
              <Plus className="h-4 w-4" /> Registrar prova
            </button>
          </>
        ) : (
          /* Formulário */
          <form
            id="contest-form"
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <div>
              <label htmlFor="contest-name" className={labelCls}>
                Nome da prova *
              </label>
              <input
                id="contest-name"
                value={draft.name}
                onChange={(e) => set({ name: e.target.value })}
                placeholder="Ex.: Prova Residência Médica - HC-FMRP"
                className={inputCls}
                autoComplete="off"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="contest-year" className={labelCls}>
                  Ano de aplicação *
                </label>
                <input
                  id="contest-year"
                  type="number"
                  inputMode="numeric"
                  value={draft.year}
                  onChange={(e) => set({ year: e.target.value })}
                  placeholder="2026"
                  className={inputCls}
                />
              </div>
              <div className="min-w-0">
                <span className={labelCls}>Data de realização *</span>
                <DatePickerField id="contest-date" value={draft.date} onChange={(v) => set({ date: v })} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              <div>
                <label htmlFor="contest-total" className={labelCls}>
                  Total de questões *
                </label>
                <input
                  id="contest-total"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={draft.totalQuestions}
                  onChange={(e) => set({ totalQuestions: e.target.value })}
                  placeholder="100"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="contest-correct" className={labelCls}>
                  Acertos geral *
                </label>
                <input
                  id="contest-correct"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={draft.correct}
                  onChange={(e) => set({ correct: e.target.value })}
                  placeholder="72"
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="contest-minutes" className={labelCls}>
                  Tempo (min) *
                </label>
                <input
                  id="contest-minutes"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  value={draft.minutes}
                  onChange={(e) => set({ minutes: e.target.value })}
                  placeholder="240"
                  className={inputCls}
                />
              </div>
            </div>
            {formPct !== undefined && (
              <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-sky-500" /> Resultado: <strong className={pctTone(formPct)}>{formPct}% de acerto</strong>
              </p>
            )}

            {/* Por grande área */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <ListChecks className="h-3.5 w-3.5" /> Questões por grande área (opcional)
              </div>
              {remainingAreas.length > 0 ? (
                <div className="flex gap-2">
                  <select
                    id="contest-area-select"
                    value={pickArea}
                    onChange={(e) => setPickArea(e.target.value)}
                    className={`${inputCls} flex-1 min-w-0`}
                    aria-label="Escolher grande área"
                  >
                    {remainingAreas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.id}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    id="contest-area-add"
                    onClick={() => pickArea && set({ areas: [...draft.areas, { area: pickArea, total: '', correct: '' }] })}
                    aria-label="Adicionar área"
                    className="h-11 w-11 shrink-0 flex items-center justify-center rounded-xl bg-sky-600 hover:bg-sky-500 text-white"
                  >
                    <Plus className="h-5 w-5" />
                  </button>
                </div>
              ) : (
                <div id="contest-area-add" className="h-11 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-950/60 text-xs font-bold text-slate-500">
                  Todas as áreas adicionadas
                </div>
              )}

              {draft.areas.map((a) => {
                const info = contestArea(a.area);
                return (
                  <div key={a.area} className="rounded-xl border border-slate-200 dark:border-slate-800 p-2.5" style={{ borderLeft: `4px solid ${info.color}` }}>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-black text-slate-900 dark:text-white truncate">{a.area}</span>
                      <button
                        type="button"
                        onClick={() => set({ areas: draft.areas.filter((x) => x.area !== a.area) })}
                        aria-label={`Remover ${a.area}`}
                        className="h-10 w-10 -my-2 -mr-1 shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className={labelCls}>Total de questões</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={a.total}
                          onChange={(e) => setArea(a.area, { total: e.target.value })}
                          aria-label={`Total de questões de ${a.area}`}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <span className={labelCls}>Acertos</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          min={0}
                          value={a.correct}
                          onChange={(e) => setArea(a.area, { correct: e.target.value })}
                          aria-label={`Acertos de ${a.area}`}
                          className={inputCls}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div>
              <label htmlFor="contest-notes" className={labelCls}>
                Anotações (opcional)
              </label>
              <textarea
                id="contest-notes"
                value={draft.notes}
                onChange={(e) => set({ notes: e.target.value })}
                rows={2}
                placeholder="Ex.: faltou tempo no fim, revisar Pediatria"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500"
              />
            </div>

            {error && (
              <p role="alert" className="text-xs font-bold text-rose-600 dark:text-rose-400">
                {error}
              </p>
            )}

            <div className="app-modal-footer flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                id="contest-cancel"
                onClick={cancelForm}
                className="h-11 px-4 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                id="contest-save"
                className="h-11 px-5 flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold"
              >
                <Save className="h-4 w-4" /> Salvar prova
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
};
