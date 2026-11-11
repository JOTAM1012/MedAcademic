// Plano do dia ("Hoje"): um cartão grande "Agora" com o próximo passo e o botão Começar,
// progresso do dia, lista recolhível de tarefas, o que não coube, controles de 1 toque
// (dia difícil, plantão) e lembretes de sono/cuidado. `compact` = versão do Painel.
import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BedDouble,
  CalendarRange,
  Check,
  ChevronDown,
  Clock,
  CloudRain,
  CornerDownRight,
  ExternalLink,
  FileText,
  HeartHandshake,
  Hospital,
  Lightbulb,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  Stethoscope,
  Timer,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { formatDM, parseYMD } from '../../data/blockReview';
import { PHASE_INFO, WEEKDAY_NAMES, WELLBEING_NOTE, type PlanTask } from '../../data/studyMethod';
import { useDayPlan } from '../../hooks/useStudyPlan';
import { AUTO_KINDS, DAY_KIND_INFO, blocksToHours, isRealTask, readLocal, startPlanTask, taskSizeLabel, userLocalKey, writeLocal } from './planShared';
import { QuickThemeModal } from './QuickThemeModal';
import { WeeklyPlanModal } from './WeeklyPlanModal';
import { DayPlanModal } from './DayPlanModal';
import { UpcomingExamTopics } from '../semester/UpcomingExamTopics';
import { semesterNumberOf } from '../../data/subjectFormats';

interface TodayPlanPanelProps {
  /** Versão do Painel: só "Agora" + progresso + 3 próximas + "Abrir meu plano" */
  compact?: boolean;
  /** Quem abre o "Planejar semana" (o Planner tem um só); sem isso o painel abre o seu */
  onOpenWeekPlan?: () => void;
}

const domId = (id: string) => id.replace(/[^a-zA-Z0-9_-]/g, '-');

interface SecondaryAction {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  id: string;
}

export const TodayPlanPanel: React.FC<TodayPlanPanelProps> = ({ compact, onOpenWeekPlan }) => {
  const app = useApp();
  const {
    studyMethod,
    studyPhase,
    userProfile,
    currentSubjectIds,
    startTask,
    openReviews,
    setCurrentTab,
    toggleTaskDone,
    skipTask,
    moveTaskToTomorrow,
    replanOverdueReviews,
    setLowEnergy,
    setDayShift,
    addCustomTask,
    removeCustomTask,
    showNotification,
    openPlannerToday,
    currentSemester,
    subjects,
    topicBlocks,
    toggleInitialStep,
  } = app;
  const plan = useDayPlan();
  const date = plan.date;
  const dayState = studyMethod.dayPlans[date] || {};
  const phase = PHASE_INFO[studyPhase];
  const isInternato = studyPhase === 'internato';

  const [listOpen, setListOpen] = useState(() => {
    try {
      return window.matchMedia('(min-width: 1024px)').matches;
    } catch {
      return true;
    }
  });
  const [expanded, setExpanded] = useState<string | null>(null);
  const [nowSteps, setNowSteps] = useState(true);
  // Passo a passo da tarefa. No tema novo, cada passo tem um quadradinho (fica salvo no tema)
  const StepList = (t: PlanTask) => {
    const block = t.kind === 'new_block' && t.blockId ? topicBlocks.find((b) => b.id === t.blockId) : undefined;
    const done = new Set(block?.initialSteps || []);
    return (
      <ol className="space-y-1">
        {t.steps.map((s, i) => {
          const checked = done.has(String(i));
          const body = (
            <>
              <span
                className={`h-5 w-5 shrink-0 rounded-full text-[10px] font-black flex items-center justify-center ${checked ? 'text-white' : 'ink'}`}
                style={checked ? { backgroundColor: t.color } : ({ backgroundColor: `${t.color}22`, '--ink': t.color } as React.CSSProperties)}
              >
                {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : i + 1}
              </span>
              <span className={`pt-0.5 ${checked ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>{s}</span>
            </>
          );
          return (
            <li key={i} className="text-[12px] text-slate-700 dark:text-slate-200">
              {block ? (
                <button
                  type="button"
                  id={`today-step-${t.blockId}-${i}`}
                  aria-pressed={checked}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleInitialStep(block.id, String(i));
                  }}
                  className="w-full min-h-[32px] flex gap-2 text-left rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-800/60 px-1 -mx-1 py-0.5"
                >
                  {body}
                </button>
              ) : (
                <span className="flex gap-2">{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    );
  };
  const [adding, setAdding] = useState<null | 'task' | 'patient'>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [customBlocks, setCustomBlocks] = useState(1);
  const [quickOpen, setQuickOpen] = useState(false);
  const [weekOpen, setWeekOpen] = useState(false);
  const [dayPlanOpen, setDayPlanOpen] = useState(false);
  const tipKey = userLocalKey('plan_tip_hidden', userProfile.email);
  const [tipHidden, setTipHidden] = useState(() => readLocal(tipKey) === date);

  const openWeek = onOpenWeekPlan || (() => setWeekOpen(true));
  // A tarefa "Planejar a semana" abre a janela e já conta como feita (o aluno pode desmarcar)
  const planWeekFromTask = (t: PlanTask) => {
    if (!t.done) toggleTaskDone(date, t.id);
    openWeek();
  };

  // ---------------------------------------------------------------- dados derivados
  const next = plan.next;
  const pending = plan.tasks.filter((t) => !t.done && t.id !== next?.id);
  const realCount = plan.tasks.filter(isRealTask).length;
  const lightDay = plan.dayKind === 'rest' || plan.dayKind === 'pos_plantao' || plan.dayKind === 'pos_prova';
  const showEmpty = realCount < 2 && !lightDay;
  const pct = plan.totalCount > 0 ? Math.round((plan.doneCount / plan.totalCount) * 100) : 0;
  const allDone = plan.totalCount > 0 && plan.doneCount >= plan.totalCount;
  const kind = DAY_KIND_INFO[plan.dayKind];
  const weekday = WEEKDAY_NAMES[parseYMD(date).getDay()];
  const tip = useMemo(() => {
    const d = parseYMD(date);
    const start = new Date(d.getFullYear(), 0, 0);
    const dayOfYear = Math.floor((d.getTime() - start.getTime()) / 86400000);
    return phase.tips[dayOfYear % phase.tips.length];
  }, [date, phase]);

  // ---------------------------------------------------------------- ações
  const isPosRest = (t: PlanTask) => t.kind === 'weekly_planning' && (plan.dayKind === 'pos_plantao' || plan.dayKind === 'pos_prova');

  const start = (t: PlanTask, free?: boolean) => startPlanTask(t, { startTask }, { free });

  const secondary = (t: PlanTask): SecondaryAction | null => {
    const id = `today-open-${domId(t.id)}`;
    switch (t.kind) {
      case 'review':
        return { id, label: 'Abrir revisão', icon: <ExternalLink className="h-4 w-4" />, onClick: () => openReviews({ blockId: t.blockId, tab: 'hoje' }) };
      case 'error_redo':
        return { id, label: 'Abrir caderno de erros', icon: <ExternalLink className="h-4 w-4" />, onClick: () => openReviews({ tab: 'erros' }) };
      case 'new_block':
      case 'new_topics':
      case 'tutoria':
        return { id, label: 'Abrir tema', icon: <ExternalLink className="h-4 w-4" />, onClick: () => setCurrentTab('structure') };
      case 'project':
      case 'project_review':
        return { id, label: 'Abrir estudo pessoal', icon: <ExternalLink className="h-4 w-4" />, onClick: () => setCurrentTab('personal') };
      default:
        return null;
    }
  };

  const canCheck = (t: PlanTask) => !AUTO_KINDS.includes(t.kind);
  const autoHint = (t: PlanTask) =>
    t.kind === 'review' || t.kind === 'project_review'
      ? 'Marca sozinho quando você registrar a revisão'
      : 'Marca sozinho quando você fechar o tema (todos os tópicos vistos)';
  /** Feita pelo que o aluno registrou (o motor marcou), não pelo quadradinho */
  const engineDone = (t: PlanTask) => t.done && !(dayState.done || []).includes(t.id);
  /** Quadradinho travado: tarefa que marca sozinha ou já marcada pelo registro */
  const lockedHint = (t: PlanTask): string | null => {
    if (engineDone(t)) return 'Marcada pelo que você registrou';
    if (!canCheck(t)) return autoHint(t);
    return null;
  };

  // O quadradinho nunca leva para outra aba: travado, só mostra a dica
  const onCheck = (t: PlanTask) => {
    const hint = lockedHint(t);
    if (hint) {
      showNotification(`${hint}.`, 'info');
      return;
    }
    toggleTaskDone(date, t.id);
  };

  const submitCustom = () => {
    const title = customTitle.trim();
    if (!title) return;
    if (adding === 'patient') {
      addCustomTask(date, `Revisar: ${title}`, 1);
      showNotification('Paciente virou revisão: tema no seu plano de hoje.', 'success');
    } else {
      addCustomTask(date, title, customBlocks);
      showNotification('Tarefa adicionada ao plano de hoje.', 'success');
    }
    setCustomTitle('');
    setCustomBlocks(1);
    setAdding(null);
  };

  // ---------------------------------------------------------------- peças visuais
  const Chips = ({ t, small }: { t: PlanTask; small?: boolean }) => (
    <span className={`flex flex-wrap items-center gap-1 ${small ? '' : 'mt-1.5'}`}>
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
        <Clock className="h-3 w-3" /> {taskSizeLabel(t)}
      </span>
      {!!t.overdueDays && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">
          remarcada
        </span>
      )}
      {t.star && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/30">
          ⭐ cai muito
        </span>
      )}
      {t.suggested && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-500/10 dark:text-violet-300 dark:border-violet-500/30">
          sugestão
        </span>
      )}
      {t.optional && !t.suggested && (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-dashed border-slate-300 dark:bg-transparent dark:text-slate-400 dark:border-slate-600">
          opcional
        </span>
      )}
    </span>
  );

  const CheckBox = ({ t }: { t: PlanTask }) => {
    const hint = lockedHint(t);
    const manual = !hint;
    return (
      <button
        type="button"
        id={`today-check-${domId(t.id)}`}
        onClick={() => onCheck(t)}
        aria-pressed={t.done}
        aria-disabled={!manual || undefined}
        aria-label={manual ? (t.done ? 'Feito. Desmarcar' : 'Marcar como feito') : `${t.done ? 'Feito. ' : ''}${hint}`}
        title={manual ? (t.done ? 'Desmarcar' : 'Marcar como feito') : hint!}
        className={`shrink-0 h-10 w-10 -m-1.5 flex items-center justify-center rounded-xl ${manual ? '' : 'cursor-default'}`}
      >
        <span
          className={`h-6 w-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
            t.done
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : manual
                ? 'border-slate-300 dark:border-slate-600 hover:border-emerald-500'
                : 'border-dashed border-slate-300 dark:border-slate-600'
          }`}
        >
          {t.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
        </span>
      </button>
    );
  };

  const btnGhost =
    'min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-600 inline-flex items-center gap-1.5 transition-colors';

  const TaskActions = ({ t, inOverflow }: { t: PlanTask; inOverflow?: boolean }) => {
    const sec = secondary(t);
    const freeOk = t.kind === 'exam_prep' || t.kind === 'mixed';
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {!t.done && !(inOverflow && t.skipped) && !isPosRest(t) && t.kind !== 'weekly_planning' && (
          <button type="button" onClick={() => start(t)} className="min-h-[40px] px-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black inline-flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5 fill-current" /> Começar
          </button>
        )}
        {t.kind === 'weekly_planning' && !isPosRest(t) && (
          <button type="button" onClick={() => planWeekFromTask(t)} className="min-h-[40px] px-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black inline-flex items-center gap-1.5">
            <CalendarRange className="h-3.5 w-3.5" /> Planejar semana
          </button>
        )}
        {freeOk && !t.done && !(inOverflow && t.skipped) && (
          <button type="button" onClick={() => start(t, true)} className={btnGhost}>
            <Timer className="h-3.5 w-3.5" /> Livre (com alarme)
          </button>
        )}
        {sec && (
          <button type="button" onClick={sec.onClick} className={btnGhost}>
            {sec.icon} {sec.label}
          </button>
        )}
        {inOverflow ? (
          t.skipped ? (
            <button type="button" onClick={() => skipTask(date, t.id, false)} className={btnGhost}>
              <Undo2 className="h-3.5 w-3.5" /> Voltar para hoje
            </button>
          ) : (
            t.movable && (
              <button type="button" onClick={() => moveTaskToTomorrow(t)} className={btnGhost}>
                <CornerDownRight className="h-3.5 w-3.5" /> Passar para amanhã
              </button>
            )
          )
        ) : (
          !t.done && (
            <>
              {t.movable && (
                <button type="button" id={`today-tomorrow-${domId(t.id)}`} onClick={() => moveTaskToTomorrow(t)} className={btnGhost}>
                  <CornerDownRight className="h-3.5 w-3.5" /> Passar para amanhã
                </button>
              )}
              <button type="button" id={`today-skip-${domId(t.id)}`} onClick={() => skipTask(date, t.id)} className={btnGhost}>
                <SkipForward className="h-3.5 w-3.5" /> Pular hoje
              </button>
            </>
          )
        )}
        {t.kind === 'custom' && t.customId && (
          <button
            type="button"
            onClick={() => removeCustomTask(date, t.customId!)}
            className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 inline-flex items-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remover
          </button>
        )}
      </div>
    );
  };

  const Details = ({ t, inOverflow }: { t: PlanTask; inOverflow?: boolean }) => (
    <div className="mt-2.5 ml-[38px] space-y-2.5">
      {t.reason && (
        <p className="text-[12px] text-slate-600 dark:text-slate-300 flex gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
          <span>{t.reason}</span>
        </p>
      )}
      {t.steps.length > 0 && StepList(t)}
      {t.questions && <p className="text-[11px] text-slate-500 dark:text-slate-400">Sugestão: {t.questions} questões (modelo para adaptar, não regra).</p>}
      {TaskActions({ t, inOverflow })}
    </div>
  );

  const TaskRow = ({ t, inOverflow }: { t: PlanTask; inOverflow?: boolean }) => {
    const open = expanded === t.id;
    return (
      <li
        id={`today-task-${domId(t.id)}`}
        className={`rounded-2xl border transition-colors ${
          open ? 'border-sky-300 dark:border-sky-500/40 bg-white dark:bg-slate-950/70' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40'
        } ${t.done ? 'opacity-70' : ''}`}
      >
        <div className="flex items-start gap-2.5 p-2.5 pl-3">
          {inOverflow ? (
            <span className="shrink-0 h-7 w-7 mt-px rounded-lg flex items-center justify-center text-sm" style={{ backgroundColor: `${t.color}1a` }}>
              {t.emoji}
            </span>
          ) : (
            <div className="pt-0.5">
              {CheckBox({ t })}
            </div>
          )}
          <button type="button" onClick={() => setExpanded(open ? null : t.id)} aria-expanded={open} className="min-w-0 flex-1 text-left">
            <span className={`block text-[13px] font-bold leading-snug line-clamp-2 ${t.done ? 'line-through text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-white'}`}>
              {!inOverflow && (
                <span className="mr-1" aria-hidden>
                  {t.emoji}
                </span>
              )}
              {t.title}
            </span>
            {t.subtitle && <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{t.subtitle}</span>}
            {Chips({ t })}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(open ? null : t.id)}
            aria-label={open ? 'Fechar opções' : 'Passos e opções'}
            className="shrink-0 h-10 w-10 -mr-1 -mt-1 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            {open ? <ChevronDown className="h-4 w-4 rotate-180" /> : <MoreHorizontal className="h-4 w-4" />}
          </button>
        </div>
        {open && (
          <div className="px-3 pb-3">
            {Details({ t, inOverflow })}
          </div>
        )}
      </li>
    );
  };

  // ---------------------------------------------------------------- cartão "Agora"
  const NowCard = ({ small }: { small?: boolean }) => {
    if (!next) {
      return (
        <div id="today-now-card" className="rounded-3xl border border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/70 dark:bg-emerald-500/[0.06] p-5 text-center">
          <p className="text-3xl" aria-hidden>
            {allDone ? '🎉' : '🌿'}
          </p>
          <p className="mt-1 text-base font-black text-slate-900 dark:text-white">{allDone ? 'Plano de hoje concluído!' : 'Nada pendente agora'}</p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
            {allDone ? 'Feche com a folha em branco de 10 minutos e durma no seu horário.' : 'Se quiser, escolha um tema ou faça algumas questões.'}
          </p>
        </div>
      );
    }
    const t = next;
    const sec = secondary(t);
    const freeOk = t.kind === 'exam_prep' || t.kind === 'mixed';
    const pos = isPosRest(t);
    return (
      <div
        id="today-now-card"
        className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm"
        style={{ backgroundImage: `linear-gradient(135deg, ${t.color}22 0%, ${t.color}08 45%, transparent 75%)` }}
      >
        <span className="absolute inset-y-0 left-0 w-1.5" style={{ backgroundColor: t.color }} />
        <div className={small ? 'p-4 pl-5' : 'p-4 pl-5 sm:p-5 sm:pl-6'}>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.14em] px-2 py-1 rounded-full bg-sky-600 text-white">
              <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" /> Agora
            </span>
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" /> {taskSizeLabel(t)}
            </span>
          </div>

          <div className="mt-3 flex items-start gap-3">
            <span
              className={`shrink-0 rounded-2xl flex items-center justify-center ${small ? 'h-11 w-11 text-xl' : 'h-12 w-12 sm:h-14 sm:w-14 text-2xl'}`}
              style={{ backgroundColor: `${t.color}22` }}
              aria-hidden
            >
              {t.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="today-now-title" className={`font-black text-slate-900 dark:text-white leading-snug line-clamp-3 ${small ? 'text-base' : 'text-lg sm:text-xl'}`}>
                {t.title}
              </h2>
              {t.subtitle && <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2">{t.subtitle}</p>}
              {(t.star || t.overdueDays || t.optional || t.suggested) && Chips({ t })}
            </div>
          </div>

          {t.reason && !small && (
            <p className="mt-3 text-[12px] text-slate-600 dark:text-slate-300 flex gap-1.5">
              <Lightbulb className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-500" />
              <span>
                <span className="font-bold text-slate-700 dark:text-slate-200">Por quê: </span>
                {t.reason}
              </span>
            </p>
          )}

          {!small && t.steps.length > 0 && (
            <div className="mt-2">
              <button
                type="button"
                id="today-now-steps-toggle"
                onClick={() => setNowSteps((v) => !v)}
                aria-expanded={nowSteps}
                className="min-h-[32px] text-[11px] font-bold text-sky-700 dark:text-sky-300 inline-flex items-center gap-1 hover:underline"
              >
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${nowSteps ? 'rotate-180' : ''}`} />
                {nowSteps ? 'Esconder o passo a passo' : `Ver o passo a passo (${t.steps.length})`}
              </button>
              {nowSteps && (
                <div className="mt-1.5">
                  {StepList(t)}
                  {t.questions && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 pl-7">Sugestão: {t.questions} questões (modelo para adaptar).</p>}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-2">
            {t.kind === 'weekly_planning' && !pos ? (
              <button
                type="button"
                id="today-start-btn"
                onClick={() => planWeekFromTask(t)}
                className="flex-1 sm:flex-none min-h-[48px] px-5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-md shadow-sky-600/20"
              >
                <CalendarRange className="h-4 w-4" /> Planejar a semana
              </button>
            ) : pos ? (
              <button
                type="button"
                id="today-start-btn"
                onClick={() => toggleTaskDone(date, t.id)}
                className="flex-1 sm:flex-none min-h-[48px] px-5 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black inline-flex items-center justify-center gap-2"
              >
                <BedDouble className="h-4 w-4" /> Ok, vou descansar
              </button>
            ) : (
              <button
                type="button"
                id="today-start-btn"
                onClick={() => start(t)}
                className="flex-1 sm:flex-none min-h-[48px] px-6 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black inline-flex items-center justify-center gap-2 shadow-md shadow-sky-600/20"
              >
                <Play className="h-4 w-4 fill-current" /> Começar
              </button>
            )}
            {freeOk && (
              <button type="button" id="today-start-free-btn" onClick={() => start(t, true)} className={`${btnGhost} min-h-[48px] rounded-2xl`}>
                <Timer className="h-4 w-4" /> Livre (com alarme)
              </button>
            )}
            {sec && (
              <button type="button" id="today-now-secondary" onClick={sec.onClick} className={`${btnGhost} min-h-[48px] rounded-2xl`}>
                {sec.icon} {sec.label}
              </button>
            )}
            {canCheck(t) && !pos && (
              <button
                type="button"
                id="today-now-done"
                onClick={() => toggleTaskDone(date, t.id)}
                title="Já fiz"
                className={`${btnGhost} min-h-[48px] rounded-2xl`}
              >
                <Check className="h-4 w-4 text-emerald-500" /> {small ? 'Feito' : 'Já fiz'}
              </button>
            )}
          </div>
          {!canCheck(t) && !small && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{autoHint(t)}.</p>}
        </div>
      </div>
    );
  };

  const Progress = () => (
    <div id="today-progress">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-bold text-slate-700 dark:text-slate-200">
          {plan.doneCount} de {plan.totalCount} tarefa{plan.totalCount === 1 ? '' : 's'}
        </span>
        <span className="text-slate-500 dark:text-slate-400">
          ≈ {blocksToHours(plan.planned)} de {blocksToHours(plan.capacity)} de foco
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-emerald-500 transition-all" style={{ width: `${plan.doneCount > 0 ? Math.max(pct, 4) : 0}%` }} />
      </div>
    </div>
  );

  const EmptyCard = ({ small }: { small?: boolean }) => (
    <div id="today-empty-card" className={`rounded-3xl border border-dashed border-sky-300 dark:border-sky-700/60 bg-sky-50/60 dark:bg-sky-500/[0.05] ${small ? 'p-4' : 'p-5'}`}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5" /> Seu próximo passo
      </p>
      {currentSubjectIds.length === 0 ? (
        <>
          <p className="mt-1.5 text-sm font-black text-slate-900 dark:text-white">Cadastre as disciplinas do semestre</p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Com elas, o site monta seu plano: revisões, temas novos e questões.</p>
          <button
            type="button"
            id="today-go-subjects"
            onClick={() => setCurrentTab('structure')}
            className="mt-3 min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black inline-flex items-center gap-1.5"
          >
            Ir para Disciplinas <ArrowRight className="h-4 w-4" />
          </button>
        </>
      ) : (
        <>
          <p className="mt-1.5 text-sm font-black text-slate-900 dark:text-white">Seu dia ainda está quase vazio</p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Escolha um tema para estudar hoje. O site cuida das revisões depois (amanhã, em 7 e em 30 dias).</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              id="today-choose-theme-btn"
              onClick={() => setQuickOpen(true)}
              className="min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black inline-flex items-center gap-1.5"
            >
              <Sparkles className="h-4 w-4" /> Escolher o tema de hoje
            </button>
            <button type="button" id="today-empty-week-btn" onClick={openWeek} className={btnGhost}>
              <CalendarRange className="h-4 w-4" /> Planejar semana
            </button>
          </div>
        </>
      )}
    </div>
  );

  const modals = (
    <>
      <QuickThemeModal open={quickOpen} onClose={() => setQuickOpen(false)} />
      {!onOpenWeekPlan && <WeeklyPlanModal open={weekOpen} onClose={() => setWeekOpen(false)} />}
      <DayPlanModal open={dayPlanOpen} onClose={() => setDayPlanOpen(false)} />
    </>
  );

  // ================================================================= versão do Painel
  if (compact) {
    const upcoming = pending.filter((t) => t.kind !== 'blank_page').slice(0, 3);
    return (
      <div id="today-plan-compact" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 flex flex-col gap-3 h-full">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-sky-500" /> Seu plano de hoje
          </p>
          {plan.dayKind !== 'normal' && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${kind.cls}`}>
              {kind.emoji} {kind.label}
            </span>
          )}
        </div>
        {NowCard({ small: true })}
        {Progress()}
        {showEmpty ? (
          EmptyCard({ small: true })
        ) : (
          upcoming.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Depois</p>
              <ul className="space-y-1">
                {upcoming.map((t) => (
                  <li key={t.id} className="flex items-center gap-2 min-w-0 text-xs">
                    <span className="h-6 w-6 shrink-0 rounded-lg flex items-center justify-center text-[13px]" style={{ backgroundColor: `${t.color}1a` }} aria-hidden>
                      {t.emoji}
                    </span>
                    <span className="min-w-0 flex-1 truncate font-bold text-slate-700 dark:text-slate-200">{t.title}</span>
                    <span className="shrink-0 text-[10px] text-slate-500 dark:text-slate-400">{taskSizeLabel(t)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        )}
        <button
          type="button"
          id="today-open-plan"
          onClick={() => openPlannerToday()}
          className="mt-auto w-full min-h-[44px] rounded-xl border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-xs font-black inline-flex items-center justify-center gap-1.5"
        >
          Abrir meu plano <ArrowRight className="h-4 w-4" />
        </button>
        {modals}
      </div>
    );
  }

  // ================================================================= versão completa (Planner → Hoje)
  const plantaoAuto = plan.dayKind === 'plantao' && !dayState.shift;
  const provaAuto = plan.dayKind === 'prova' && !dayState.shift;
  // Plantão só no 11º e 12º semestre; prova / pós-prova do 1º ao 10º
  const semNumber = semesterNumberOf(currentSemester);
  const showPlantao = semNumber ? semNumber >= 11 : isInternato;
  const ctrl = (active: boolean) =>
    `min-h-[40px] px-3 rounded-xl border text-xs font-bold inline-flex items-center gap-1.5 transition-colors ${
      active
        ? 'bg-indigo-600 border-indigo-600 text-white'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-indigo-400 dark:hover:border-indigo-500'
    }`;

  return (
    <div id="today-plan" className="space-y-3">
      {/* Cabeçalho do dia + progresso */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {weekday}, {formatDM(date)}
            </p>
            <p className="text-base font-black text-slate-900 dark:text-white">Meu plano de hoje</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {plan.dayKind !== 'normal' && (
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${kind.cls}`}>
                {kind.emoji} {kind.label}
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border ink" style={{ '--ink': phase.color, borderColor: `${phase.color}55`, backgroundColor: `${phase.color}12` } as React.CSSProperties}>
              {phase.emoji} {phase.label}
            </span>
          </div>
        </div>
        {Progress()}
      </div>

      {/* No celular o cartão "Agora" vem primeiro (Começar na 1ª tela); avisos do dia logo abaixo */}
      <div className="flex flex-col gap-3">
      {/* Bem-vindo de volta: revisões que não cabem */}
      {plan.overflowReviews > 0 && (
        <div id="today-welcome-back" className="order-last sm:order-none rounded-3xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/[0.06] p-4">
          <p className="text-sm font-black text-slate-900 dark:text-white">Bem-vindo(a) de volta 👋</p>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
            {plan.overflowReviews} revis{plan.overflowReviews > 1 ? 'ões ficaram' : 'ão ficou'} para trás e não cabe{plan.overflowReviews > 1 ? 'm' : ''} hoje. Sem culpa: a gente espalha pelos próximos dias, as mais importantes primeiro.
          </p>
          <button
            type="button"
            id="today-replan-btn"
            onClick={() => replanOverdueReviews()}
            className="mt-3 min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black inline-flex items-center gap-1.5"
          >
            <RefreshCw className="h-4 w-4" /> Replanejar
          </button>
        </div>
      )}

      {/* Mensagem do dia */}
      {plan.message && plan.overflowReviews === 0 && (
        <p id="today-message" className="order-last sm:order-none rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 px-4 py-3 text-[13px] text-slate-700 dark:text-slate-200">
          {plan.message}
        </p>
      )}

      {NowCard({})}
      </div>

      {/* Lembretes de prova (30/15/7/3/1 dias antes, se ainda não começou os assuntos) */}
      {(plan.examReminders || []).map((r) => (
        <div
          key={r.examId}
          id={`today-exam-reminder-${r.examId}`}
          className="rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/10 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2"
        >
          <p className="text-[13px] text-indigo-900 dark:text-indigo-100 flex-1">📅 {r.text}</p>
          <button
            type="button"
            onClick={() => setCurrentTab('semester')}
            className="shrink-0 min-h-[40px] px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black inline-flex items-center gap-1.5"
          >
            Ver assuntos da prova <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      ))}

      {showEmpty && EmptyCard({})}

      {/* Controles de 1 toque */}
      <div id="today-controls" className="flex flex-wrap items-center gap-1.5">
        <button type="button" id="today-low-energy-btn" aria-pressed={!!dayState.lowEnergy} onClick={() => setLowEnergy(date, !dayState.lowEnergy)} className={ctrl(!!dayState.lowEnergy)}>
          <CloudRain className="h-3.5 w-3.5" /> Dia difícil
        </button>
        <button type="button" id="today-plan-day-btn" onClick={() => setDayPlanOpen(true)} className={`${ctrl(false)} !border-sky-400 dark:!border-sky-600 !text-sky-700 dark:!text-sky-300`}>
          <SlidersHorizontal className="h-3.5 w-3.5" /> Planejar dia
        </button>
        {!showPlantao && (
          <>
            <button
              type="button"
              id="today-shift-prova"
              aria-pressed={plan.dayKind === 'prova'}
              title={provaAuto ? 'Você tem prova marcada hoje (toque para desligar)' : undefined}
              onClick={() => setDayShift(date, plan.dayKind === 'prova' ? (provaAuto ? 'normal' : undefined) : 'prova')}
              className={ctrl(plan.dayKind === 'prova')}
            >
              <FileText className="h-3.5 w-3.5" /> Prova hoje
            </button>
            <button
              type="button"
              id="today-shift-pos-prova"
              aria-pressed={dayState.shift === 'pos_prova'}
              onClick={() => setDayShift(date, dayState.shift === 'pos_prova' ? undefined : 'pos_prova')}
              className={ctrl(dayState.shift === 'pos_prova')}
            >
              <BedDouble className="h-3.5 w-3.5" /> Pós-prova
            </button>
          </>
        )}
        {showPlantao && (
          <>
            <button
              type="button"
              id="today-shift-plantao"
              aria-pressed={plan.dayKind === 'plantao'}
              title={plantaoAuto ? 'Plantão da sua grade hoje (toque para desligar)' : undefined}
              onClick={() => setDayShift(date, plan.dayKind === 'plantao' ? (plantaoAuto ? 'normal' : undefined) : 'plantao')}
              className={ctrl(plan.dayKind === 'plantao')}
            >
              <Hospital className="h-3.5 w-3.5" /> Plantão hoje
            </button>
            <button
              type="button"
              id="today-shift-pos"
              aria-pressed={dayState.shift === 'pos_plantao'}
              onClick={() => setDayShift(date, dayState.shift === 'pos_plantao' ? undefined : 'pos_plantao')}
              className={ctrl(dayState.shift === 'pos_plantao')}
            >
              <BedDouble className="h-3.5 w-3.5" /> Pós-plantão
            </button>
          </>
        )}
        <button type="button" id="today-add-task-btn" aria-expanded={adding === 'task'} onClick={() => setAdding(adding === 'task' ? null : 'task')} className={ctrl(adding === 'task')}>
          <Plus className="h-3.5 w-3.5" /> Tarefa minha
        </button>
        {isInternato && (
          <button type="button" id="today-patient-btn" aria-expanded={adding === 'patient'} onClick={() => setAdding(adding === 'patient' ? null : 'patient')} className={ctrl(adding === 'patient')}>
            <Stethoscope className="h-3.5 w-3.5" /> Paciente de hoje → revisar o tema
          </button>
        )}
      </div>

      {adding && (
        <form
          id="today-add-form"
          onSubmit={(e) => {
            e.preventDefault();
            submitCustom();
          }}
          className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-2.5"
        >
          <label htmlFor="today-add-input" className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {adding === 'patient' ? 'Qual foi o tema do paciente?' : 'O que você vai fazer?'}
          </label>
          <input
            id="today-add-input"
            autoFocus
            value={customTitle}
            onChange={(e) => setCustomTitle(e.target.value)}
            maxLength={90}
            placeholder={adding === 'patient' ? 'Ex.: Cetoacidose diabética' : 'Ex.: Resumo da aula de cardio'}
            className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
          />
          {adding === 'patient' ? (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">Vira a tarefa "Revisar: tema" (1 bloco de 25 min). Cada paciente é um gatilho de revisão.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1">Tamanho:</span>
              {[0, 1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCustomBlocks(n)}
                  aria-pressed={customBlocks === n}
                  className={`min-h-[36px] px-2.5 rounded-lg border text-[11px] font-bold ${
                    customBlocks === n
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                  }`}
                >
                  {n === 0 ? '10 min' : `${n} × 25`}
                </button>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(null)} className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button
              type="submit"
              id="today-add-save"
              disabled={!customTitle.trim()}
              className="min-h-[40px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-black inline-flex items-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Adicionar
            </button>
          </div>
        </form>
      )}

      {/* Dica da fase (1 frase, dispensável) */}
      {!tipHidden && (
        <div id="today-tip" className="flex items-start gap-2 rounded-2xl px-3.5 py-2.5 border" style={{ borderColor: `${phase.color}40`, backgroundColor: `${phase.color}0d` }}>
          <span className="text-base leading-none mt-0.5" aria-hidden>
            {phase.emoji}
          </span>
          <p className="flex-1 text-[12px] text-slate-700 dark:text-slate-200">
            <span className="font-bold">Dica do {phase.label}: </span>
            {tip}
          </p>
          <button
            type="button"
            aria-label="Dispensar dica"
            onClick={() => {
              writeLocal(tipKey, date);
              setTipHidden(true);
            }}
            className="shrink-0 h-8 w-8 -m-1 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Lista do dia */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs">
        <button
          type="button"
          id="today-list-toggle"
          onClick={() => setListOpen((o) => !o)}
          aria-expanded={listOpen}
          className="w-full min-h-[52px] flex items-center justify-between gap-2 px-4 py-3 text-left"
        >
          <span className="text-sm font-black text-slate-900 dark:text-white">
            {listOpen ? 'O dia todo' : 'Ver o dia todo'} <span className="font-bold text-slate-500 dark:text-slate-400">· {plan.tasks.length} tarefa{plan.tasks.length === 1 ? '' : 's'}</span>
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${listOpen ? 'rotate-180' : ''}`} />
        </button>
        {listOpen && (
          <div className="px-3 pb-3">
            <ul id="today-list" className="space-y-1.5">
              {(() => {
                // Organizado por disciplina: cada uma com as suas tarefas; o resto vai em "Rotina do dia"
                const groups: Array<{ key: string; name: string; color: string; tasks: PlanTask[] }> = [];
                plan.tasks.forEach((t) => {
                  const sub = t.subjectId ? subjects.find((x) => x.id === t.subjectId) : undefined;
                  const key = sub ? sub.id : '__rotina';
                  let g = groups.find((x) => x.key === key);
                  if (!g) {
                    g = { key, name: sub ? sub.name : 'Rotina do dia', color: sub?.color || '#64748b', tasks: [] };
                    groups.push(g);
                  }
                  g.tasks.push(t);
                });
                groups.sort((a, b) => Number(a.key === '__rotina') - Number(b.key === '__rotina'));
                return groups.map((g) => (
                  <React.Fragment key={g.key}>
                    <li id={`today-group-${g.key}`} className="pt-2.5 first:pt-0 px-1 flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} aria-hidden />
                      <span className="truncate">{g.name}</span>
                      <span className="font-bold normal-case tracking-normal">
                        · {g.tasks.filter((t) => t.done).length}/{g.tasks.length}
                      </span>
                    </li>
                    {g.tasks.map((t) => (
                      <React.Fragment key={t.id}>{TaskRow({ t })}</React.Fragment>
                    ))}
                  </React.Fragment>
                ));
              })()}
            </ul>
            <p className="mt-2 px-1 text-[11px] text-slate-500 dark:text-slate-400">
              Revisões e temas se marcam sozinhos quando você registra. Toque numa tarefa para ver o passo a passo.
            </p>
          </div>
        )}
      </div>

      {/* Não coube hoje */}
      {plan.overflow.length > 0 && (
        <div id="today-overflow" className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-950/30 p-3">
          <p className="px-1 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Não coube hoje · {plan.overflow.length}</p>
          <p className="px-1 text-[11px] text-slate-500 dark:text-slate-400 mb-2">Tudo bem. Revisões vêm primeiro; o resto pode ir para amanhã.</p>
          <ul className="space-y-1.5">
            {plan.overflow.map((t) => (
              <React.Fragment key={t.id}>{TaskRow({ t, inOverflow: true })}</React.Fragment>
            ))}
          </ul>
        </div>
      )}

      {/* Cuidado e sono */}
      {plan.dayKind === 'low_energy' && (
        <p id="today-wellbeing" className="rounded-2xl border border-indigo-200 dark:border-indigo-500/30 bg-indigo-50 dark:bg-indigo-500/[0.06] px-4 py-3 text-[12px] text-slate-700 dark:text-slate-200 flex gap-2">
          <HeartHandshake className="h-4 w-4 shrink-0 mt-0.5 text-indigo-500" />
          <span>{WELLBEING_NOTE}</span>
        </p>
      )}
      {/* Assuntos das próximas provas: check list da prova direto no plano */}
      <UpcomingExamTopics withinDays={21} compact />

      {plan.turnsNote && (
        <p id="today-turns" className="flex items-start gap-2 px-2 text-[12px] text-slate-500 dark:text-slate-400">
          <span aria-hidden>🕒</span> <span>{plan.turnsNote}</span>
        </p>
      )}
      <p id="today-sleep" className="flex items-center gap-2 px-2 text-[12px] text-slate-500 dark:text-slate-400">
        <span aria-hidden>🌙</span> {plan.sleepNote}
      </p>

      {modals}
    </div>
  );
};
