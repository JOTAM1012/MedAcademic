import React, { useMemo, useState } from 'react';
import { CalendarDays, Check, ChevronDown, ClipboardPaste, Clock3, MoreHorizontal, Pencil, Plus, Repeat, Trash2, Trophy, X, ListPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Subject, Topic, TutorialSession } from '../types';
import { DatePickerField } from './DatePickerField';
import { formatDM, isBlockDue, isTopicPending, isTopicResolved, isTopicSeen, ymd } from '../data/blockReview';
import { subjectFormatOf } from '../data/subjectFormats';

interface Props {
  subject: Subject;
}

/** Ícone de cabide (não existe no pacote de ícones) */
export const HangerIcon: React.FC<{ className?: string }> = ({ className = 'h-4 w-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    <path d="M12 7.5a2.25 2.25 0 1 0-2.25-2.25" />
    <path d="M12 7.5v1.2l8.6 6.2a1.6 1.6 0 0 1-.94 2.9H4.34a1.6 1.6 0 0 1-.94-2.9L12 8.7" />
  </svg>
);

const fmtGrade = (n?: number) => (n === undefined ? '—' : String(Math.round(n * 10) / 10).replace('.', ','));
const parseGrade = (raw: string, max: number) => {
  const v = Number(raw.replace(',', '.'));
  if (raw.trim() === '' || !Number.isFinite(v)) return undefined;
  return Math.min(max, Math.max(0, v));
};
const totalOf = (t: TutorialSession) =>
  t.openingGrade === undefined && t.closingGrade === undefined ? undefined : (t.openingGrade || 0) + (t.closingGrade || 0);

// Tutoria (PBL/APG): módulo com N tutorias; cada uma tem Abertura (nota 0–5 + objetivos para estudar)
// e Fechamento (nota 0–5); total 0–10. "Cabide": o que ficou para estudar/revisar depois.
export const TutoriaPanel: React.FC<Props> = ({ subject }) => {
  const {
    topics,
    topicBlocks,
    addTopicsBulk,
    updateTopic,
    deleteTopic,
    markTopicSeen,
    markTopicPending,
    resetTopicProgress,
    updateSubject,
    sendModuleToReview,
    setCurrentTab,
  } = useApp();
  const accent = subjectFormatOf(subject).color;
  const todayStr = ymd(new Date());
  const tutorials = subject.tutorials || [];

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [gradeDrafts, setGradeDrafts] = useState<Record<string, string>>({});
  const [pasteFor, setPasteFor] = useState<string | null>(null);
  const [pasteText, setPasteText] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ id: string; to: string } | null>(null);
  const [scheduling, setScheduling] = useState<string | null>(null);
  const [count, setCount] = useState(5);

  const subjectTopics = useMemo(() => topics.filter((t) => t.subjectId === subject.id), [topics, subject.id]);

  const save = (list: TutorialSession[]) => updateSubject(subject.id, { tutorials: list }, { silent: true });
  const patch = (id: string, changes: Partial<TutorialSession>) => save(tutorials.map((t) => (t.id === id ? { ...t, ...changes } : t)));

  const createTutorials = (n: number) => {
    const start = tutorials.length;
    const stamp = Date.now();
    save([
      ...tutorials,
      ...Array.from({ length: n }, (_, i) => ({ id: `tut-${stamp}-${i}`, name: `Tutoria ${start + i + 1}` })),
    ]);
  };

  const addTopics = (tut: TutorialSession, titles: string[], cabide = false) => {
    const clean = titles.map((t) => t.replace(/^[-•*\d.)\s]+/, '').trim()).filter(Boolean);
    if (!clean.length) return;
    addTopicsBulk(
      clean.map((title) => ({
        subjectId: subject.id,
        moduleName: tut.name,
        title,
        status: 'nao_iniciado',
        priority: cabide ? 'alta' : 'media',
        tags: cabide ? [tut.name, 'cabide'] : [tut.name],
        cabide: cabide || undefined,
      }))
    );
  };

  const rename = (tut: TutorialSession, to: string) => {
    setRenaming(null);
    const name = to.trim();
    if (!name || name === tut.name || tutorials.some((t) => t.name === name)) return;
    patch(tut.id, { name });
    subjectTopics.filter((t) => t.moduleName === tut.name).forEach((t) => updateTopic(t.id, { moduleName: name }));
  };

  const remove = (tut: TutorialSession) => {
    const list = subjectTopics.filter((t) => t.moduleName === tut.name);
    if (!window.confirm(`Excluir "${tut.name}"${list.length ? ` e seus ${list.length} tópicos` : ''}?`)) return;
    list.forEach((t) => deleteTopic(t.id));
    save(tutorials.filter((t) => t.id !== tut.id));
  };

  const commitGrade = (tut: TutorialSession, key: 'openingGrade' | 'closingGrade') => {
    const draftKey = `${tut.id}-${key}`;
    const raw = gradeDrafts[draftKey];
    if (raw === undefined) return;
    setGradeDrafts(({ [draftKey]: _, ...rest }) => rest);
    const v = parseGrade(raw, 5);
    if (v !== tut[key]) patch(tut.id, { [key]: v });
  };

  // Resumo do módulo
  const totals = tutorials.map(totalOf).filter((v): v is number => v !== undefined);
  const avg = totals.length ? totals.reduce((a, b) => a + b, 0) / totals.length : undefined;
  const avgOpen = (() => {
    const l = tutorials.map((t) => t.openingGrade).filter((v): v is number => v !== undefined);
    return l.length ? l.reduce((a, b) => a + b, 0) / l.length : undefined;
  })();
  const avgClose = (() => {
    const l = tutorials.map((t) => t.closingGrade).filter((v): v is number => v !== undefined);
    return l.length ? l.reduce((a, b) => a + b, 0) / l.length : undefined;
  })();
  const closed = tutorials.filter((t) => t.closingGrade !== undefined).length;
  const objectives = subjectTopics.filter((t) => !t.cabide);
  const cabideTopics = subjectTopics.filter((t) => t.cabide);
  const cabideOpen = cabideTopics.filter((t) => !isTopicSeen(t)).length;

  const toggleSeen = (t: Topic) => (isTopicSeen(t) ? resetTopicProgress(t.id) : markTopicSeen(t.id));
  const togglePending = (t: Topic) => (isTopicPending(t) ? resetTopicProgress(t.id) : markTopicPending(t.id));
  const schedule = (t: Topic, date: string) => {
    updateTopic(t.id, date ? { firstContactDate: date, scheduleFirstContact: true } : { scheduleFirstContact: false, firstContactDate: undefined });
    setScheduling(null);
  };

  const gradeInput = (tut: TutorialSession, key: 'openingGrade' | 'closingGrade', label: string) => {
    const draftKey = `${tut.id}-${key}`;
    return (
      <label className="flex items-center gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">{label}</span>
        <span className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1 focus-within:border-sky-500">
          <input
            inputMode="decimal"
            aria-label={`${label} de ${tut.name}`}
            className={`tutoria-grade w-9 bg-transparent text-center text-sm font-black focus:outline-hidden ${tut[key] === undefined ? 'text-slate-400' : 'text-slate-900 dark:text-white'}`}
            placeholder="—"
            value={gradeDrafts[draftKey] ?? (tut[key] !== undefined ? fmtGrade(tut[key]) : '')}
            onChange={(e) => setGradeDrafts((d) => ({ ...d, [draftKey]: e.target.value }))}
            onBlur={() => commitGrade(tut, key)}
            onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          />
          <span className="text-[11px] font-bold text-slate-400">/5</span>
        </span>
      </label>
    );
  };

  const topicRow = (t: Topic) => {
    const isSeen = isTopicSeen(t);
    const isPend = isTopicPending(t);
    const sched = !isSeen && t.scheduleFirstContact && t.firstContactDate;
    return (
      <div key={t.id} className="group">
        <div className="flex items-center gap-2 py-1">
          <button
            type="button"
            onClick={() => toggleSeen(t)}
            className={`h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center transition-colors ${
              isSeen ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
            }`}
            aria-label={isSeen ? 'Desmarcar estudado' : 'Marcar como estudado'}
          >
            {isSeen && <Check className="h-3.5 w-3.5" />}
          </button>
          <span className={`flex-1 min-w-0 text-xs ${isSeen ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-200'}`}>{t.title}</span>
          {sched && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-600 dark:text-sky-400">📅 {formatDM(t.firstContactDate)}</span>}
          {!isSeen && (
            <>
              <button
                type="button"
                onClick={() => togglePending(t)}
                className={`p-1 rounded-md ${isPend ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'text-slate-300 dark:text-slate-600 hover:text-amber-500'}`}
                title="Ver depois"
                aria-label="Ver depois"
              >
                <Clock3 className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setScheduling(scheduling === t.id ? null : t.id)}
                className={`p-1 rounded-md ${sched ? 'text-sky-500' : 'text-slate-300 dark:text-slate-600 hover:text-sky-500'}`}
                title="Programar data (aparece no Planner)"
                aria-label="Programar data"
              >
                <CalendarDays className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => deleteTopic(t.id)}
            className="p-1 rounded-md text-slate-300 dark:text-slate-600 hover:text-rose-500 sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Excluir"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
        {scheduling === t.id && (
          <div className="flex items-center gap-2 pl-7 pb-1.5">
            <DatePickerField value={t.firstContactDate || ''} onChange={(d) => schedule(t, d)} placeholder="Escolher dia" />
            {sched && (
              <button type="button" onClick={() => schedule(t, '')} className="text-[11px] font-bold text-rose-500 hover:underline">
                Tirar data
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const addInput = (tut: TutorialSession, cabide: boolean) => {
    const key = `${tut.id}-${cabide ? 'c' : 'o'}`;
    const color = cabide ? '#f43f5e' : accent;
    const submit = () => {
      addTopics(tut, [drafts[key] || ''], cabide);
      setDrafts((d) => ({ ...d, [key]: '' }));
    };
    const hasText = !!(drafts[key] || '').trim();
    return (
      <div className="pt-2 space-y-1">
        <div
          className="flex items-center gap-1.5 rounded-xl border-2 border-dashed bg-white dark:bg-slate-950/60 pl-2.5 pr-1 py-1 transition-colors focus-within:border-solid"
          style={{ borderColor: hasText ? color : `${color}66` }}
        >
          <Plus className="h-4 w-4 shrink-0" style={{ color }} />
          <input
            value={drafts[key] || ''}
            onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
            }}
            onPaste={(e) => {
              const txt = e.clipboardData.getData('text');
              if (txt.includes('\n')) {
                e.preventDefault();
                addTopics(tut, txt.split(/\r?\n/), cabide);
              }
            }}
            placeholder={cabide ? 'Novo assunto' : 'Novo objetivo'}
            className={`${cabide ? 'tutoria-add-cabide' : 'tutoria-add-objective'} flex-1 min-w-0 bg-transparent py-1.5 text-xs font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden`}
          />
          <button
            type="button"
            onClick={submit}
            disabled={!hasText}
            className="tutoria-add-btn shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-white text-[11px] font-black disabled:opacity-40 transition-opacity"
            style={{ backgroundColor: color }}
          >
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        </div>
        <div className="flex items-center justify-between gap-2 px-1">
          <span className="text-[10px] text-slate-400">Enter também adiciona</span>
          {!cabide && (
            <button type="button" onClick={() => setPasteFor(tut.id)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-sky-500">
              <ClipboardPaste className="h-3 w-3" /> Colar lista
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="mt-4 space-y-3" onClick={() => menuFor && setMenuFor(null)}>
      {/* Resumo do módulo */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Média do módulo</div>
          <div id="tutoria-avg" className="text-lg font-black" style={{ color: accent }}>
            {fmtGrade(avg)}
            <span className="text-xs text-slate-400">/10</span>
          </div>
          <div className="text-[10px] text-slate-500">
            Abertura {fmtGrade(avgOpen)} · Fech. {fmtGrade(avgClose)}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Tutorias fechadas</div>
          <div className="text-lg font-black text-slate-900 dark:text-white">
            {closed}
            <span className="text-xs text-slate-400">/{tutorials.length}</span>
          </div>
          <div className="text-[10px] text-slate-500">com nota de fechamento</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Objetivos estudados</div>
          <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">
            {objectives.filter(isTopicSeen).length}
            <span className="text-xs text-slate-400">/{objectives.length}</span>
          </div>
          <div className="text-[10px] text-slate-500">perguntas da abertura</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3">
          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1">
            <HangerIcon className="h-3.5 w-3.5" /> Cabide
          </div>
          <div className={`text-lg font-black ${cabideOpen ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{cabideOpen}</div>
          <div className="text-[10px] text-slate-500">{cabideOpen ? 'assuntos para estudar' : 'nada pendente'}</div>
        </div>
      </div>

      {tutorials.length === 0 && (
        <div className="rounded-2xl border border-dashed p-5 text-center space-y-2" style={{ borderColor: `${accent}66` }}>
          <p className="text-xs text-slate-500">Quantas tutorias tem este módulo? Cada uma terá abertura e fechamento.</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Tutoria 1 a</span>
            <input
              type="number"
              min={1}
              max={20}
              value={count}
              onChange={(e) => setCount(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
              className="w-16 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs text-center"
            />
            <button
              type="button"
              id="tutoria-create"
              onClick={() => createTutorials(count)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-white text-xs font-bold"
              style={{ backgroundColor: accent }}
            >
              <ListPlus className="h-3.5 w-3.5" /> Criar tutorias
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2.5">
        {tutorials.map((tut) => {
          const all = subjectTopics.filter((t) => t.moduleName === tut.name);
          const objs = all.filter((t) => !t.cabide);
          const cabs = all.filter((t) => t.cabide);
          const total = totalOf(tut);
          const done = all.length > 0 && all.every(isTopicResolved);
          const block = topicBlocks.find((b) => b.subjectId === subject.id && all.some((t) => t.blockId === b.id));
          const isCollapsed = collapsed[tut.id] ?? false;
          return (
            <div key={tut.id} className="tutoria-card rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
              {/* Cabeçalho da tutoria */}
              <div className="flex items-center gap-2 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setCollapsed((c) => ({ ...c, [tut.id]: !isCollapsed }))}
                  className="p-0.5 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  aria-label={isCollapsed ? 'Abrir' : 'Fechar'}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${isCollapsed ? '-rotate-90' : ''}`} />
                </button>
                {renaming?.id === tut.id ? (
                  <input
                    autoFocus
                    value={renaming.to}
                    onChange={(e) => setRenaming({ id: tut.id, to: e.target.value })}
                    onBlur={() => rename(tut, renaming.to)}
                    onKeyDown={(e) => e.key === 'Enter' && rename(tut, renaming.to)}
                    className="flex-1 min-w-0 rounded-lg border border-sky-500 bg-transparent px-2 py-1 text-xs font-bold"
                  />
                ) : (
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-black text-slate-900 dark:text-white truncate">{tut.name}</div>
                    <div className="text-[10px] text-slate-500">
                      {objs.filter(isTopicSeen).length}/{objs.length} objetivos
                      {tut.date ? ` · ${formatDM(tut.date)}` : ''}
                    </div>
                  </div>
                )}
                {tut.cabide && (
                  <span className="flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400" title="Ficou de cabide">
                    <HangerIcon className="h-3 w-3" /> Cabide
                  </span>
                )}
                {block ? (
                  block.reviewStatus === 'dominado' ? (
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                      <Trophy className="h-3 w-3" /> Dominado
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setCurrentTab('spaced_repetition')}
                      className={`hidden sm:flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isBlockDue(block, todayStr) ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-sky-500/15 text-sky-600 dark:text-sky-400'
                      }`}
                    >
                      <Repeat className="h-3 w-3" /> R{block.reviewsDone + 1} · {formatDM(block.nextReviewDate)}
                    </button>
                  )
                ) : (
                  done && (
                    <button
                      type="button"
                      onClick={() => sendModuleToReview(subject.id, tut.name)}
                      className="flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-full bg-emerald-500 text-white hover:bg-emerald-400"
                      title="Leva os objetivos desta tutoria para as revisões espaçadas"
                    >
                      <Repeat className="h-3 w-3" /> Revisões
                    </button>
                  )
                )}
                <span
                  className={`tutoria-total shrink-0 text-xs font-black px-2 py-1 rounded-lg ${
                    total === undefined ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' : 'text-white'
                  }`}
                  style={total !== undefined ? { backgroundColor: accent } : undefined}
                  title="Abertura + fechamento"
                >
                  {fmtGrade(total)}/10
                </span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuFor(menuFor === tut.id ? null : tut.id);
                    }}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                    aria-label="Mais opções"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </button>
                  {menuFor === tut.id && (
                    <div className="absolute right-0 top-8 z-20 w-44 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-1 text-xs">
                      <button className="w-full flex items-center gap-2 px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-800" onClick={() => setRenaming({ id: tut.id, to: tut.name })}>
                        <Pencil className="h-3.5 w-3.5" /> Renomear
                      </button>
                      <button className="w-full flex items-center gap-2 px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30" onClick={() => remove(tut)}>
                        <Trash2 className="h-3.5 w-3.5" /> Excluir tutoria
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {!isCollapsed && (
                <div className="grid grid-cols-1 md:grid-cols-2 border-t border-slate-100 dark:border-slate-800">
                  {/* Abertura */}
                  <div className="p-3 space-y-2 md:border-r border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: accent }}>
                        1 · Abertura
                      </span>
                      {gradeInput(tut, 'openingGrade', 'Nota')}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500">
                      <CalendarDays className="h-3.5 w-3.5" />
                      <DatePickerField value={tut.date || ''} onChange={(d) => patch(tut.id, { date: d || undefined })} placeholder="Data da abertura" />
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Perguntas / objetivos para estudar</p>
                    <div>
                      {objs.map(topicRow)}
                      {objs.length === 0 && <p className="text-[11px] text-slate-400 py-1">Anote as perguntas que saíram na abertura.</p>}
                      {pasteFor === tut.id ? (
                        <div className="pt-1.5 space-y-1.5">
                          <textarea
                            autoFocus
                            value={pasteText}
                            onChange={(e) => setPasteText(e.target.value)}
                            rows={4}
                            placeholder="Cole um objetivo por linha"
                            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs focus:outline-hidden focus:border-sky-500"
                          />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => { setPasteFor(null); setPasteText(''); }} className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-500">
                              Cancelar
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                addTopics(tut, pasteText.split(/\r?\n/));
                                setPasteFor(null);
                                setPasteText('');
                              }}
                              className="px-3 py-1.5 rounded-lg text-white text-xs font-bold"
                              style={{ backgroundColor: accent }}
                            >
                              Adicionar
                            </button>
                          </div>
                        </div>
                      ) : (
                        addInput(tut, false)
                      )}
                    </div>
                  </div>

                  {/* Fechamento */}
                  <div className="p-3 space-y-2 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="text-[11px] font-black uppercase tracking-wider" style={{ color: accent }}>
                        2 · Fechamento
                      </span>
                      <div className="flex items-center gap-2">
                        {gradeInput(tut, 'closingGrade', 'Nota')}
                        <button
                          type="button"
                          onClick={() => patch(tut.id, { cabide: !tut.cabide })}
                          className={`tutoria-cabide-btn h-8 w-8 rounded-lg border flex items-center justify-center transition-colors ${
                            tut.cabide
                              ? 'bg-rose-500 border-rose-500 text-white'
                              : 'border-slate-200 dark:border-slate-700 text-slate-400 hover:text-rose-500 hover:border-rose-400'
                          }`}
                          title={tut.cabide ? 'Ficou de cabide — clique para desmarcar' : 'Fiquei de cabide'}
                          aria-label="Fiquei de cabide"
                          aria-pressed={!!tut.cabide}
                        >
                          <HangerIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                    {tut.cabide ? (
                      <div className="rounded-xl border border-rose-300/60 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-2.5">
                        <p className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 flex items-center gap-1">
                          <HangerIcon className="h-3.5 w-3.5" /> Ficou de cabide: o que estudar ou revisar
                        </p>
                        {cabs.map(topicRow)}
                        {addInput(tut, true)}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Lance a nota do fechamento. Se ficou de cabide, toque no{' '}
                        <HangerIcon className="inline h-3.5 w-3.5 -mt-0.5" /> e anote o que precisa estudar ou revisar.
                      </p>
                    )}
                    {cabs.length > 0 && !tut.cabide && (
                      <div className="pt-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Do cabide</p>
                        {cabs.map(topicRow)}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {tutorials.length > 0 && (
        <button
          type="button"
          onClick={() => createTutorials(1)}
          className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
        >
          <Plus className="h-3.5 w-3.5" /> Adicionar tutoria
        </button>
      )}
    </div>
  );
};
