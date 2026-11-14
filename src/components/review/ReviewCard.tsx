// Card de uma revisão (tema/bloco): mostra a técnica da etapa, os passos, os erros do caderno
// deste tema e o registro em 1 toque (Difícil / Médio / Fácil com a sugestão já destacada).
import React, { useEffect, useMemo, useState } from 'react';
import { ChevronDown, Eye, History, NotebookPen, Play, Star, Undo2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Certainty, ErrorType, TopicBlock, TopicDifficulty } from '../../types';
import { daysBetween, formatDM, isBlockDue, isTopicPending, nextIntervalDays, overdueDays, scheduleReviewDate, cycleDay } from '../../data/blockReview';
import {
  CERTAINTY_INFO,
  CERTAINTY_ORDER,
  ERROR_TYPES,
  ERROR_TYPE_ORDER,
  TECHNIQUES,
  redoableErrorsOfBlock,
  reviewTechnique,
  suggestDifficulty,
  restDaysOf,
  secondContactSteps,
} from '../../data/studyMethod';
import { todayYMD } from '../../hooks/useStudyPlan';
import { ErrorNoteModal } from './ErrorNoteModal';
import { Counter, DIFF_ORDER, DIFF_UI, StepList, formatMinutes, pctClass, subjectColor, subjectLabel } from './reviewShared';

interface ReviewCardProps {
  block: TopicBlock;
  /** Mostra passos, erros e o registro. Sem `onToggle` fica sempre aberto. */
  expanded?: boolean;
  onToggle?: () => void;
  highlight?: boolean;
  /** Chamado depois de concluir a revisão */
  onReviewed?: (blockId: string) => void;
  /** Sessão guiada: card maior, sem recolher */
  variant?: 'list' | 'session';
}

const numInput =
  'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 py-2.5 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 placeholder:font-normal focus:outline-hidden focus:border-sky-500';

const EMPTY_CERT: Record<Certainty, number> = { chute: 0, duvida: 0, certeza: 0 };
const EMPTY_ERR: Record<ErrorType, number> = { lacuna: 0, raciocinio: 0, leitura: 0, pressa: 0 };
const sum = (o: Record<string, number>) => Object.values(o).reduce((a, b) => a + b, 0);

export const ReviewCard: React.FC<ReviewCardProps> = ({ block, expanded = true, onToggle, highlight, onReviewed, variant = 'list' }) => {
  const { subjects, topics, studyMethod, studyPrefs, reviewTopicBlock, undoBlockReview, addQuestionLog, setBlockStar, redoErrorNote, startTask } = useApp();
  const today = todayYMD();
  const sub = subjects.find((s) => s.id === block.subjectId);
  const color = subjectColor(sub);
  const tech = useMemo(() => {
    const t = reviewTechnique(block, sub?.format);
    // 1ª revisão: se o aluno definiu o "2º contato" no Meu método, valem os passos dele
    return t.id === 'folha_branco' ? { ...t, steps: secondContactSteps(studyPrefs, t.steps) } : t;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [block, sub?.format, studyPrefs.secondContactSteps]);
  const blockTopics = topics.filter((t) => t.blockId === block.id);
  const pendingTopics = blockTopics.filter(isTopicPending);
  const isLegacyMastered = block.reviewStatus === 'dominado';
  const due = isBlockDue(block, today);
  const late = overdueDays(block, today);
  const early = !due && !isLegacyMastered && !!block.nextReviewDate && block.nextReviewDate > today;
  const reviewedToday = block.lastReviewDate === today;
  // Erros do caderno voltam a partir da R2 e só os anotados antes de hoje
  // (um erro anotado nesta revisão volta na próxima, não neste mesmo card)
  const redoable = tech.reviewNumber >= 2 ? redoableErrorsOfBlock(studyMethod.errorNotes || [], block.id, today) : [];
  const errorsToRedo = redoable.filter((n) => n.lastRedo !== today);
  const redoneToday = redoable.filter((n) => n.lastRedo === today).length;

  // Estado local do card
  const [stepsDone, setStepsDone] = useState<Set<number>>(new Set());
  const [total, setTotal] = useState('');
  const [correct, setCorrect] = useState('');
  const [details, setDetails] = useState(false);
  const [lucky, setLucky] = useState(0);
  const [confidentErrors, setConfidentErrors] = useState(0);
  const [certainty, setCertainty] = useState<Record<Certainty, number>>(EMPTY_CERT);
  const [errors, setErrors] = useState<Record<ErrorType, number>>(EMPTY_ERR);
  const [earlyOk, setEarlyOk] = useState(false);
  const [shownRules, setShownRules] = useState<Set<string>>(new Set());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmUndo, setConfirmUndo] = useState(false);
  const [noteModal, setNoteModal] = useState(false);

  // Depois de concluir (ou desfazer) a revisão, o card volta ao estado inicial
  useEffect(() => {
    setStepsDone(new Set());
    setTotal('');
    setCorrect('');
    setDetails(false);
    setLucky(0);
    setConfidentErrors(0);
    setCertainty(EMPTY_CERT);
    setErrors(EMPTY_ERR);
    setEarlyOk(false);
    setConfirmUndo(false);
  }, [block.id, block.reviewsDone]);

  const t = Math.max(0, Math.floor(Number(total) || 0));
  const cRaw = correct === '' ? undefined : Math.max(0, Math.floor(Number(correct) || 0));
  const c = cRaw === undefined ? undefined : Math.min(cRaw, t);
  const pct = t > 0 && c !== undefined ? Math.round((c / t) * 100) : undefined;
  const suggestion = suggestDifficulty({ total: t, correct: c, luckyCorrect: lucky, confidentErrors });
  const tooMany = cRaw !== undefined && t > 0 && cRaw > t;

  const nextTech = reviewTechnique({ reviewsDone: block.reviewsDone + 1 }, sub?.format);
  const preview = (level: TopicDifficulty) => {
    const days = nextIntervalDays(level, block.reviewsDone + 1, studyPrefs.longTermGoal);
    const date = scheduleReviewDate(days, { from: today, restDay: restDaysOf(studyPrefs) });
    const d = daysBetween(today, date);
    return { date, text: d === 1 ? 'amanhã' : `em ${d} dias` };
  };

  const conclude = (level: TopicDifficulty) => {
    const cert = sum(certainty) > 0 ? certainty : undefined;
    const errs = sum(errors) > 0 ? errors : undefined;
    // Questões entram no total do semestre (antes, para o aviso da revisão ser o último a aparecer)
    if (t > 0 && c !== undefined) {
      addQuestionLog({ kind: 'block', blockId: block.id, subjectId: block.subjectId, total: t, correct: c, mode: tech.reviewNumber >= 4 ? 'misturadas' : 'tema', errors: errs });
    }
    reviewTopicBlock(block.id, level, { questions: t || undefined, correct: t ? c : undefined, certainty: cert, errors: errs });
    onReviewed?.(block.id);
  };

  const start = () =>
    startTask({ title: `${tech.badge}: ${block.name}`, kind: 'review', subjectId: block.subjectId, blockId: block.id, steps: tech.steps, minutes: studyPrefs.shortFocusMinutes, breakMinutes: studyPrefs.shortBreakMinutes });

  // ---- Status (texto neutro para atraso) ----
  const status = (() => {
    if (isLegacyMastered) return { text: 'Consolidado', cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50' };
    if (reviewedToday && !due)
      return { text: `✓ Feita hoje · próxima ${formatDM(block.nextReviewDate)}`, cls: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50' };
    if (late > 0)
      return { text: `Remarcada · desde ${formatDM(block.nextReviewDate)}`, cls: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700' };
    if (due) return { text: 'Para hoje', cls: 'bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800' };
    if (block.nextReviewDate) {
      const d = daysBetween(today, block.nextReviewDate);
      return {
        text: `${formatDM(block.nextReviewDate)} · ${d === 1 ? 'amanhã' : `em ${d} dias`}`,
        cls: 'bg-slate-50 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800',
      };
    }
    return null;
  })();

  const isSession = variant === 'session';
  const open = expanded || !onToggle;
  const log = block.reviewLog || [];

  return (
    <div
      id={`review-card-${block.id}`}
      className={`rounded-3xl border bg-white dark:bg-slate-900 shadow-xs transition-all scroll-mt-24 ${
        highlight ? 'border-sky-400 dark:border-sky-500 ring-4 ring-sky-400/20' : 'border-slate-200 dark:border-slate-800'
      } ${isSession ? 'shadow-lg' : ''}`}
    >
      {/* Cabeçalho (toca para abrir/fechar na lista) */}
      <div
        className={`p-4 sm:p-5 ${onToggle ? 'cursor-pointer select-none' : ''}`}
        onClick={onToggle}
        role={onToggle ? 'button' : undefined}
        tabIndex={onToggle ? 0 : undefined}
        aria-expanded={onToggle ? open : undefined}
        onKeyDown={(e) => {
          if (!onToggle) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle();
          }
        }}
      >
        <div className="flex items-start gap-3">
          <span
            className="h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center text-xl border"
            style={{ backgroundColor: tech.color + '14', borderColor: tech.color + '33' }}
            aria-hidden
          >
            {isLegacyMastered ? '🏆' : tech.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {!isLegacyMastered && (
                <span
                  className="text-[11px] font-black px-2 py-0.5 rounded-full border whitespace-nowrap ink"
                  style={{ '--ink': tech.color, backgroundColor: tech.color + '14', borderColor: tech.color + '40' } as React.CSSProperties}
                >
                  {tech.badge}
                </span>
              )}
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 min-w-0 max-w-full">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="truncate">{subjectLabel(sub)}</span>
              </span>
              {block.star && <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400">⭐ Cai muito</span>}
            </div>
            <h3 className={`font-black text-slate-900 dark:text-white leading-snug mt-1 break-words ${isSession ? 'text-lg sm:text-xl' : 'text-[15px] sm:text-base'}`}>{block.name}</h3>
            {status && (
              <span className={`inline-flex mt-1.5 text-[11px] font-bold px-2 py-0.5 rounded-full border ${status.cls}`}>
                {status.text}
              </span>
            )}
            {!open && blockTopics.length > 0 && (
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-1">{blockTopics.map((x) => x.title).join(' · ')}</p>
            )}
          </div>
          {onToggle && (
            <ChevronDown className={`h-5 w-5 mt-1 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
          )}
        </div>
      </div>

      {open && (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5 space-y-4 -mt-1">
          {/* Tópicos do tema */}
          {blockTopics.length > 0 && (
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-3">
              {blockTopics.map((x, i) => (
                <React.Fragment key={x.id}>
                  {i > 0 && ' · '}
                  {isTopicPending(x) ? <span className="font-semibold text-amber-700 dark:text-amber-400">{x.title} (ver depois)</span> : x.title}
                </React.Fragment>
              ))}
            </p>
          )}

          {!isLegacyMastered && (
            <>
              {/* Técnica da etapa */}
              <div className="rounded-2xl border p-3.5 sm:p-4 space-y-3" style={{ borderColor: tech.color + '33', backgroundColor: tech.color + '0a' }}>
                <div>
                  <p className="text-[13px] font-black ink" style={{ '--ink': tech.color } as React.CSSProperties}>
                    {tech.label}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">{tech.why}</p>
                </div>
                <StepList
                  steps={tech.steps}
                  color={tech.color}
                  done={stepsDone}
                  idPrefix={`review-step-${block.id}`}
                  onToggle={(i) =>
                    setStepsDone((s) => {
                      const n = new Set(s);
                      if (n.has(i)) n.delete(i);
                      else n.add(i);
                      return n;
                    })
                  }
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {tech.questions ? <>sugestão: <strong className="text-slate-700 dark:text-slate-200">{tech.questions} questões</strong> · </> : null}
                  {tech.pomodoros} × {studyPrefs.shortFocusMinutes} min
                  {tech.extraStep ? ' · com um passo extra porque a última foi difícil' : ''}
                </p>
              </div>

              {/* Erros do caderno deste tema (voltam a partir da R2) */}
              {(errorsToRedo.length > 0 || redoneToday > 0) && (
                <div id={`review-errors-${block.id}`} className="rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/60 dark:bg-amber-950/20 p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[13px] font-black text-amber-800 dark:text-amber-300">
                      📒 {errorsToRedo.length > 0 ? `Refaça ${errorsToRedo.length} erro${errorsToRedo.length > 1 ? 's' : ''} deste tema` : 'Erros deste tema refeitos'}
                    </p>
                    {redoneToday > 0 && <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 shrink-0">✓ {redoneToday} hoje</span>}
                  </div>
                  {errorsToRedo.length > 0 && <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80">Tente lembrar a regra antes de olhar.</p>}
                  <ul className="space-y-2">
                    {errorsToRedo.map((n) => {
                      const info = ERROR_TYPES[n.type];
                      const shown = shownRules.has(n.id);
                      return (
                        <li key={n.id} className="rounded-xl bg-white dark:bg-slate-900 border border-amber-100 dark:border-slate-800 p-3">
                          <div className="flex items-start gap-2">
                            <span className="text-base leading-none mt-0.5" title={info.label}>
                              {info.emoji}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="text-[13px] font-bold text-slate-900 dark:text-white break-words">{n.theme}</p>
                              {n.why && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 break-words">Por que errei: {n.why}</p>}
                            </div>
                          </div>
                          {shown ? (
                            <p className="mt-2 text-[13px] font-semibold rounded-lg px-2.5 py-2 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-200 break-words">{n.rule}</p>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setShownRules((s) => new Set(s).add(n.id))}
                              className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 dark:text-sky-300 min-h-[36px] px-1"
                            >
                              <Eye className="h-3.5 w-3.5" /> Mostrar regra
                            </button>
                          )}
                          {shown && (
                            <div className="grid grid-cols-2 gap-2 mt-2">
                              <button
                                type="button"
                                onClick={() => redoErrorNote(n.id, true)}
                                className="min-h-[40px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black"
                              >
                                ✓ Acertei
                              </button>
                              <button
                                type="button"
                                onClick={() => redoErrorNote(n.id, false)}
                                className="min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
                              >
                                Errei de novo
                              </button>
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* Começar */}
              <div className="flex flex-wrap gap-2">
                <button
                  id={`review-start-${block.id}`}
                  type="button"
                  onClick={start}
                  className="inline-flex items-center justify-center gap-2 min-h-[44px] px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black shadow-sm flex-1 sm:flex-none"
                >
                  <Play className="h-4 w-4 fill-current" /> {isSession ? 'Começar foco' : 'Começar'}
                </button>
                <button
                  id={`review-star-${block.id}`}
                  type="button"
                  onClick={() => setBlockStar(block.id, !block.star)}
                  aria-pressed={!!block.star}
                  className={`inline-flex items-center justify-center gap-1.5 min-h-[44px] px-3.5 rounded-xl border text-xs font-bold transition-colors ${
                    block.star
                      ? 'border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300'
                      : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                  title="Temas que caem muito sobem na fila de revisões"
                >
                  <Star className={`h-4 w-4 ${block.star ? 'fill-amber-400 text-amber-500' : ''}`} /> Cai muito na prova
                </button>
              </div>

              {/* Concluir em 1 toque */}
              <div id={`review-conclude-${block.id}`} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/40 p-3.5 sm:p-4 space-y-3">
                <p className="text-[13px] font-black text-slate-900 dark:text-white">Terminou? Como foi a R{tech.reviewNumber}?</p>
                {early && !earlyOk ? (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3 space-y-2.5">
                    <p className="text-[13px] text-slate-700 dark:text-slate-200 leading-snug">
                      Esta revisão está marcada para <strong>{formatDM(block.nextReviewDate)}</strong>. Revisar cedo demais rende menos. Fazer mesmo assim?
                    </p>
                    <button
                      id={`review-early-ok-${block.id}`}
                      type="button"
                      onClick={() => setEarlyOk(true)}
                      className="min-h-[40px] px-4 rounded-xl border border-slate-300 dark:border-slate-600 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Fazer mesmo assim
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
                      <label className="min-w-0">
                        <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Questões feitas</span>
                        <input
                          id={`review-total-${block.id}`}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          placeholder={tech.questions ? String(tech.questions) : 'opcional'}
                          value={total}
                          onChange={(e) => setTotal(e.target.value)}
                          className={numInput}
                        />
                      </label>
                      <label className="min-w-0">
                        <span className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">Acertos</span>
                        <input
                          id={`review-correct-${block.id}`}
                          type="number"
                          inputMode="numeric"
                          min="0"
                          placeholder="opcional"
                          value={correct}
                          onChange={(e) => setCorrect(e.target.value)}
                          className={numInput}
                        />
                      </label>
                      <div className="w-14 text-center pb-2">
                        <div className={`text-lg font-black ${pct !== undefined ? pctClass(pct) : 'text-slate-300 dark:text-slate-600'}`}>{pct !== undefined ? `${pct}%` : '—'}</div>
                      </div>
                    </div>
                    {tooMany && <p className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">Os acertos passaram do total: contamos {t}.</p>}

                    <div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">
                        {suggestion ? (
                          <>
                            Sugestão pelo seu resultado: <strong className="text-slate-700 dark:text-slate-200">{DIFF_UI[suggestion].label}</strong> (você decide)
                          </>
                        ) : tech.id === 'folha_branco' ? (
                          'Lembrou quase tudo? Fácil. Com esforço? Médio. Esqueceu muito? Difícil.'
                        ) : (
                          <>Próxima: {nextTech.badge}</>
                        )}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {DIFF_ORDER.map((level) => {
                          const ui = DIFF_UI[level];
                          const p = preview(level);
                          const sug = suggestion === level;
                          return (
                            <button
                              key={level}
                              id={`review-rate-${level}-${block.id}`}
                              type="button"
                              onClick={() => conclude(level)}
                              className={`relative flex flex-col items-center justify-center min-h-[60px] px-1.5 py-2 rounded-xl border font-bold transition-all ${ui.cls} ${
                                sug ? `ring-2 ${ui.ring} ring-offset-2 ring-offset-slate-50 dark:ring-offset-slate-950 shadow-md` : ''
                              }`}
                              title={`${ui.hint} · próxima ${formatDM(p.date)}`}
                            >
                              {sug && (
                                <span className="absolute -top-2 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-sky-600 text-white whitespace-nowrap">
                                  sugerido
                                </span>
                              )}
                              <span className="text-[13px]">
                                {ui.emoji} {ui.label}
                              </span>
                              <span className="text-[10px] font-semibold opacity-80 leading-tight text-center">
                                R{tech.reviewNumber + 1} {p.text}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Detalhar (opcional) */}
                    <button
                      id={`review-details-toggle-${block.id}`}
                      type="button"
                      onClick={() => setDetails((d) => !d)}
                      aria-expanded={details}
                      className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 dark:text-sky-300 min-h-[36px]"
                    >
                      <ChevronDown className={`h-3.5 w-3.5 transition-transform ${details ? 'rotate-180' : ''}`} /> Detalhar (opcional)
                    </button>
                    {details && (
                      <div id={`review-details-${block.id}`} className="space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Counter label="🎲 Acertei no chute" value={lucky} onChange={setLucky} hint="Não conta como domínio" />
                          <Counter label="💪 Errei com certeza" value={confidentErrors} onChange={setConfidentErrors} hint="Ideia errada fixada: anote no caderno" />
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">Como você respondeu (certeza antes de conferir)</p>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {CERTAINTY_ORDER.map((k) => (
                              <Counter
                                key={k}
                                label={`${CERTAINTY_INFO[k].emoji} ${CERTAINTY_INFO[k].label}`}
                                value={certainty[k]}
                                onChange={(n) => setCertainty((s) => ({ ...s, [k]: n }))}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">Erros por tipo</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {ERROR_TYPE_ORDER.map((k) => (
                              <Counter
                                key={k}
                                id={`review-err-${k}-${block.id}`}
                                label={`${ERROR_TYPES[k].emoji} ${ERROR_TYPES[k].label}`}
                                value={errors[k]}
                                onChange={(n) => setErrors((s) => ({ ...s, [k]: n }))}
                                hint={ERROR_TYPES[k].action}
                              />
                            ))}
                          </div>
                        </div>
                        <button
                          id={`review-add-error-${block.id}`}
                          type="button"
                          onClick={() => setNoteModal(true)}
                          className="inline-flex items-center justify-center gap-2 w-full sm:w-auto min-h-[44px] px-4 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs font-black hover:bg-amber-100 dark:hover:bg-amber-950/60"
                        >
                          <NotebookPen className="h-4 w-4" /> Anotar um erro no caderno
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {pendingTopics.length > 0 && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {pendingTopics.length} assunto{pendingTopics.length > 1 ? 's' : ''} marcado{pendingTopics.length > 1 ? 's' : ''} para ver depois neste tema.
            </p>
          )}

          {/* Histórico e desfazer */}
          {log.length > 0 && (
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  id={`review-history-toggle-${block.id}`}
                  type="button"
                  onClick={() => setHistoryOpen((h) => !h)}
                  aria-expanded={historyOpen}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 min-h-[36px] px-1"
                >
                  <History className="h-3.5 w-3.5" /> Histórico ({log.length}) <ChevronDown className={`h-3.5 w-3.5 transition-transform ${historyOpen ? 'rotate-180' : ''}`} />
                </button>
                {!confirmUndo && (
                  <button
                    id={`undo-review-${block.id}`}
                    type="button"
                    onClick={() => setConfirmUndo(true)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 min-h-[36px] px-1"
                    title="Clicou sem querer? Volta a última revisão deste tema"
                  >
                    <Undo2 className="h-3.5 w-3.5" /> Desfazer última
                  </button>
                )}
              </div>
              {confirmUndo && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 p-3 space-y-2">
                  <p className="text-xs text-slate-700 dark:text-slate-200">
                    Desfazer a R{log.length}? A avaliação dessa revisão sai e a data volta a ser a anterior.
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        undoBlockReview(block.id);
                        setConfirmUndo(false);
                      }}
                      className="min-h-[40px] px-4 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-black"
                    >
                      Sim, desfazer
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmUndo(false)}
                      className="min-h-[40px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
              {historyOpen && (
                <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
                  <table className="w-full text-[11px] min-w-[320px]">
                    <thead>
                      <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400 bg-slate-50 dark:bg-slate-950/60">
                        <th className="px-3 py-2 font-bold">Revisão</th>
                        <th className="px-2 py-2 font-bold">Data</th>
                        <th className="px-2 py-2 font-bold">Questões</th>
                        <th className="px-2 py-2 font-bold">Tempo</th>
                        <th className="px-3 py-2 font-bold text-right">Como foi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {log.map((r, i) => {
                        const p = r.questions && r.correct !== undefined ? Math.round((r.correct / r.questions) * 100) : undefined;
                        const day = cycleDay(block, r.date);
                        const stage = r.stage ? TECHNIQUES[r.stage] : undefined;
                        return (
                          <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                            <td className="px-3 py-1.5 whitespace-nowrap">
                              <span className="font-black text-slate-800 dark:text-slate-100">R{i + 1}</span>
                              {stage && <span className="ml-1" title={stage.label}>{stage.emoji}</span>}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-slate-700 dark:text-slate-200 font-semibold">
                              {formatDM(r.date)}
                              {day !== undefined && <span className="text-slate-400 font-normal"> · dia {day}</span>}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap">
                              {r.questions ? (
                                <span className="text-slate-600 dark:text-slate-300">
                                  {r.correct !== undefined ? `${r.correct}/${r.questions}` : r.questions}
                                  {p !== undefined && <strong className={`ml-1 ${pctClass(p)}`}>{p}%</strong>}
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 whitespace-nowrap text-slate-600 dark:text-slate-300">{r.minutes ? formatMinutes(r.minutes) : <span className="text-slate-400">—</span>}</td>
                            <td className="px-3 py-1.5 whitespace-nowrap text-right font-bold text-slate-700 dark:text-slate-200">
                              {DIFF_UI[r.difficulty].emoji} {DIFF_UI[r.difficulty].label}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ErrorNoteModal isOpen={noteModal} onClose={() => setNoteModal(false)} defaultBlockId={block.id} />
    </div>
  );
};
