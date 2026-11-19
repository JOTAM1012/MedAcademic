// "Planejar dia": personalizar o dia de hoje. Tipo do dia, quanto tempo tem, a ordem das tarefas
// (arrastando), o que sai (tirar de hoje / amanhã), escolher o tema novo e somar tarefas suas.
// Tema novo só entra se o aluno escolher; o que ele adiciona aparece logo abaixo, com X para tirar.
import React, { useMemo, useState } from 'react';
import { ArrowUpToLine, BookOpen, CalendarClock, FolderTree, Layers, Lightbulb, Minus, Pin, PinOff, Plus, RotateCcw, SlidersHorizontal, Undo2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { addDaysYMD, formatDM, parseYMD, ymd } from '../../data/blockReview';
import { EXAM_MOODS, MINIMAL_DAY_OPTIONS, WEEKDAY_NAMES, dayBaseCapacity, formatFreeHours, formatMinutes, hoursByWeekdayOf, type PlanTask } from '../../data/studyMethod';
import { MixedThemesCard } from './MixedThemesCard';
import type { DayPlanState, DayTaskDetail } from '../../types';
import { ThemeDetailCard } from './ThemeDetailCard';
import { semesterNumberOf } from '../../data/subjectFormats';
import { useDayPlan, useDayThemes } from '../../hooks/useStudyPlan';
import { ReorderList, type ReorderHandleProps } from '../shared/ReorderList';
import { OptionChip, PlanModal, blocksToHours, readLocal, stepByBlock, taskSizeLabel, userLocalKey, writeLocal } from './planShared';
import { StudyContentModal } from './StudyContentModal';
import { QuickThemeModal } from './QuickThemeModal';
import Segmented from '../shared/Segmented';
import Stepper, { Step } from '../shared/Stepper';

/** "Somar o básico" do método (modo simples): só aparece o que ainda não está no plano de hoje */
const BASICS: Array<{ id: string; title: string; blocks: number; kinds: string[] }> = [
  { id: 'fc', title: 'Flashcards do dia', blocks: 1, kinds: ['flashcards'] },
  { id: 'sum', title: 'Ler o resumo do dia', blocks: 1, kinds: ['summary'] },
  { id: 'q', title: 'Questões do dia (10 a 15, sem consultar)', blocks: 1, kinds: ['phase_questions', 'mixed'] },
  { id: 'err', title: 'Caderno de erros: refazer tentando lembrar a regra', blocks: 1, kinds: ['error_redo', 'mixed'] },
  { id: 'blank', title: 'Folha em branco do dia (10 min)', blocks: 0, kinds: ['blank_page'] },
];

/** Blocos fixos que o modo detalhado deixa ligar/desligar */
const FIXED_KINDS: Array<{ kind: string; label: string }> = [
  { kind: 'flashcards', label: 'Flashcards' },
  { kind: 'summary', label: 'Ler o resumo' },
  { kind: 'phase_questions', label: 'Questões do dia' },
  { kind: 'error_redo', label: 'Caderno de erros' },
  { kind: 'mixed', label: 'Misturadas' },
  { kind: 'blank_page', label: 'Folha em branco' },
];

interface DayPlanModalProps {
  open: boolean;
  onClose: () => void;
  /** Dia a planejar (padrão: hoje). Usado pelo "Planejar semana" */
  date?: string;
  /** Aberto por cima de outra janela */
  stacked?: boolean;
}

/** Atalhos de horas do dia (passo Tempo) */
const HOUR_CHIPS = [1, 2, 3, 4, 5, 6, 8];

type DayType ='normal' | 'dificil' | 'prova' | 'pos_prova' | 'plantao' | 'pos_plantao';

export const DayPlanModal: React.FC<DayPlanModalProps> = ({ open, onClose, date: dateProp, stacked }) => {
  const {
    studyMethod,
    studyPrefs,
    studyPhase,
    currentSemester,
    currentSubjectIds,
    subjects,
    topicBlocks,
    topics,
    setDayPlanState,
    setLowEnergy,
    setDayShift,
    skipTask,
    removeCustomTask,
    moveTaskToDate,
    addCustomTask,
    showNotification,
    userProfile,
  } = useApp();
  const plan = useDayPlan(dateProp);
  // "Por módulo" só aparece se houver módulo da faculdade no semestre
  const hasModules = subjects.some((s) => s.kind === 'module' && currentSubjectIds.includes(s.id));
  const date = plan.date;
  const themes = useDayThemes(date);
  const todayStr = ymd(new Date());
  const isToday = date === todayStr;
  // "hoje" quando é o dia de hoje; nos outros dias, "neste dia"
  const H = isToday ? 'hoje' : 'neste dia';
  const nextDay = addDaysYMD(1, date);
  const state = studyMethod.dayPlans[date] || {};
  const [title, setTitle] = useState('');
  const [blocks, setBlocks] = useState(1);
  const [contentOpen, setContentOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [themeBy, setThemeBy] = useState<'area' | 'module'>('area');
  // Passos: Tipo do dia → Tempo → Conteúdo → Revisão (volta ao primeiro ao fechar)
  const [step, setStep] = useState(1);
  const handleClose = () => {
    setStep(1);
    onClose();
  };
  const confirmDay = () => {
    showNotification(isToday ? 'Plano de hoje confirmado.' : 'Plano do dia confirmado.', 'success');
    handleClose();
  };
  const modeKey = userLocalKey('dayplan_mode', userProfile?.email);
  const [mode, setModeState] = useState<'simples' | 'detalhado'>(() => (readLocal(modeKey) === 'detalhado' ? 'detalhado' : 'simples'));
  const setMode = (m: 'simples' | 'detalhado') => {
    setModeState(m);
    writeLocal(modeKey, m);
  };

  const semNumber = semesterNumberOf(currentSemester);
  const showPlantao = semNumber ? semNumber >= 11 : studyPhase === 'internato';

  const all = useMemo(() => [...plan.tasks, ...plan.overflow], [plan]);
  const order = all.map((t) => t.id);

  const pinned = new Set(state.pinned || []);
  const capacity = state.capacity || plan.capacity;

  const dayType: DayType = state.lowEnergy
    ? 'dificil'
    : plan.dayKind === 'prova' || plan.dayKind === 'pos_prova' || plan.dayKind === 'plantao' || plan.dayKind === 'pos_plantao'
      ? plan.dayKind
      : 'normal';

  const setType = (t: DayType) => {
    if (t === 'dificil') {
      setLowEnergy(date, true);
      return;
    }
    if (state.lowEnergy) setLowEnergy(date, false);
    if (t === 'normal') setDayShift(date, plan.dayKind === 'prova' || plan.dayKind === 'plantao' ? 'normal' : undefined);
    else setDayShift(date, t);
  };

  // Arrastar (ou ↑/↓ na alça): a nova ordem fica guardada no plano do dia
  const commitOrder = (ids: string[]) => setDayPlanState(date, (s) => ({ ...s, order: ids }));
  // Prioridade: vai para o topo e fica fixada hoje
  const toTop = (id: string) => {
    setDayPlanState(date, (s) => ({ ...s, order: [id, ...order.filter((x) => x !== id)], pinned: Array.from(new Set([...(s.pinned || []), id])) }));
  };
  const presentKinds = new Set(all.filter((t) => !t.skipped).map((t) => t.kind as string));
  // Atalho aparece sempre que o item não está no dia (o que foi tirado de hoje conta como fora)
  const activeTitles = new Set(all.filter((t) => !t.skipped).map((t) => t.title));
  const basicsToAdd = BASICS.filter((b) => !b.kinds.some((k) => presentKinds.has(k)) && !activeTitles.has(b.title));
  const addBasic = (b: (typeof BASICS)[number]) => {
    // Se o item já existe mas foi tirado de hoje, só volta (não duplica)
    const skipped = all.find((t) => t.skipped && (t.title === b.title || b.kinds.includes(t.kind)));
    if (skipped) skipTask(date, skipped.id, false);
    else addCustomTask(date, b.title, b.blocks);
    showNotification(`"${b.title}" entrou no plano ${isToday ? 'de hoje' : 'deste dia'}.`, 'success');
  };
  // X: tarefa que você somou sai de vez; o tema volta a ficar sem data; as do plano saem só de hoje
  const removeOrSkip = (t: PlanTask) => {
    if (t.kind === 'custom' && t.customId) removeCustomTask(date, t.customId);
    else if (t.kind === 'new_block' && t.blockId && !t.skipped) themes.removeTheme(t.blockId);
    else skipTask(date, t.id, !t.skipped);
  };
  const fixedTasks = (kind: string) => all.filter((t) => t.kind === kind);
  const togglePin = (id: string) =>
    setDayPlanState(date, (s) => {
      const set = new Set(s.pinned || []);
      if (set.has(id)) set.delete(id);
      else set.add(id);
      return { ...s, pinned: [...set] };
    });
  // − / + andam 1 bloco de foco da sua rotina (ex.: 30 min), de 1 bloco até 10 h
  const blockMin = studyPrefs.focusMinutes;
  const capMinus = stepByBlock(capacity, -1, blockMin, blockMin, 600);
  const capPlus = stepByBlock(capacity, 1, blockMin, blockMin, 600);
  const setCapacity = (n: number) => setDayPlanState(date, (s) => ({ ...s, capacity: n }));
  const resetDay = () => {
    setDayPlanState(date, (s) => ({ ...s, order: undefined, pinned: undefined, capacity: undefined }));
    showNotification('Ordem e tempo voltaram ao padrão.', 'info');
  };

  // O que já está no dia: temas (com X para tirar) e tarefas que o aluno somou
  const dayThemes = plan.tasks.filter((t) => t.kind === 'new_block' || t.kind === 'new_topics');
  const dayCustom = plan.tasks.filter((t) => t.kind === 'custom' && !!t.customId);
  const themeIdsInDay = new Set(dayThemes.map((t) => t.blockId).filter(Boolean));
  // Tema novo para o dia: temas ligados, em estudo, que ainda não estão neste dia
  const themeOptions = topicBlocks.filter(
    (b) => currentSubjectIds.includes(b.subjectId) && b.reviewStatus === 'estudando' && !b.paused && !themeIdsInDay.has(b.id)
  );
  const addTheme = (id: string) => {
    const b = topicBlocks.find((x) => x.id === id);
    if (!b) return;
    themes.addTheme(id);
    showNotification(`"${b.name}" entrou no plano ${isToday ? 'de hoje' : 'deste dia'}.`, 'success');
  };

  const submitTask = () => {
    const t = title.trim();
    if (!t) return;
    addCustomTask(date, t, blocks);
    setTitle('');
    setBlocks(1);
  };

  // Prova hoje: humor depois da prova. Dia difícil: dia mínimo (tocar de novo tira a escolha)
  const setMood = (m: NonNullable<DayPlanState['mood']>) => setDayPlanState(date, (s) => ({ ...s, mood: s.mood === m ? undefined : m }));
  const setMinimal = (m: NonNullable<DayPlanState['minimal']>) => setDayPlanState(date, (s) => ({ ...s, minimal: s.minimal === m ? undefined : m }));
  // Detalhado: escolhas de cada tema (tempo, questões, tópicos, atividades)
  const setDetail = (taskId: string, next: DayTaskDetail | undefined) =>
    setDayPlanState(date, (s) => {
      const detail = { ...(s.detail || {}) };
      if (next) detail[taskId] = next;
      else delete detail[taskId];
      return { ...s, detail: Object.keys(detail).length ? detail : undefined };
    });
  const topicsOf = (t: PlanTask) => (t.kind === 'new_block' && t.blockId ? topics.filter((x) => x.blockId === t.blockId) : []);

  // Resumo do dia montado: quanto ficou para cada coisa (minutos)
  const summary = useMemo(() => {
    const live = plan.tasks.filter((t) => !t.skipped);
    // Folha em branco não ocupa bloco, mas leva ~10 min
    const min = (list: PlanTask[]) => Math.round(list.reduce((a, t) => a + (t.minutes || t.pomodoros * 25 || (t.kind === 'blank_page' ? 10 : 0)), 0));
    const isRev = (t: PlanTask) => t.kind === 'review' || t.kind === 'project_review';
    const isThemeT = (t: PlanTask) => t.kind === 'new_block' || t.kind === 'new_topics';
    const reviews = live.filter((t) => isRev(t) && !t.optional);
    const themesL = live.filter((t) => isThemeT(t) && !t.optional);
    const others = live.filter((t) => !isRev(t) && !isThemeT(t) && !t.optional);
    const optional = live.filter((t) => t.optional);
    const required = min(reviews) + min(themesL) + min(others);
    const optMin = min(optional.filter((t) => !t.done));
    const capMin = Math.round(plan.capacity * 25);
    return {
      reviews: { n: reviews.length, min: min(reviews) },
      themes: { n: themesL.length, min: min(themesL) },
      others: { n: others.length, min: min(others) },
      optional: { n: optional.length, min: optMin },
      required,
      capMin,
      // A rotina opcional também cabe no tempo (o resto do opcional é "se der")
      left: capMin - required - min(optional.filter((t) => t.routine && !t.done)),
    };
  }, [plan]);
  const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
  const headline = [
    `Seu dia: ${formatMinutes(summary.required)}`,
    summary.reviews.n ? plural(summary.reviews.n, 'revisão', 'revisões') : '',
    summary.themes.n ? plural(summary.themes.n, 'tema', 'temas') : '',
    summary.others.n ? plural(summary.others.n, 'outra tarefa', 'outras tarefas') : '',
    summary.optional.n ? plural(summary.optional.n, 'opcional', 'opcionais') : '',
  ]
    .filter(Boolean)
    .join(' · ');
  const SummaryList = ({ id }: { id: string }) => (
    <ul id={id} className="space-y-1 text-[12px] text-slate-700 dark:text-slate-200">
      {summary.reviews.n > 0 && (
        <li className="flex justify-between gap-2"><span>Revisões ({summary.reviews.n})</span><span className="font-bold">{formatMinutes(summary.reviews.min)}</span></li>
      )}
      {summary.themes.n > 0 && (
        <li className="flex justify-between gap-2"><span>Temas ({summary.themes.n})</span><span className="font-bold">{formatMinutes(summary.themes.min)}</span></li>
      )}
      {summary.others.n > 0 && (
        <li className="flex justify-between gap-2"><span>Outras tarefas ({summary.others.n})</span><span className="font-bold">{formatMinutes(summary.others.min)}</span></li>
      )}
      {summary.optional.n > 0 && (
        <li className="flex justify-between gap-2 text-slate-500 dark:text-slate-400"><span>Opcionais ({summary.optional.n})</span><span className="font-bold">{summary.optional.min ? formatMinutes(summary.optional.min) : 'leve'}</span></li>
      )}
      {summary.reviews.n + summary.themes.n + summary.others.n + summary.optional.n === 0 && <li className="text-slate-500 dark:text-slate-400">Nada no dia ainda.</li>}
      <li className="flex justify-between gap-2 pt-1 border-t border-slate-200 dark:border-slate-800">
        <span>{summary.capMin < summary.required ? 'Passou do seu tempo' : summary.left < 0 ? 'Sobra para os opcionais' : 'Sobra'}</span>
        <span className="font-bold">{formatMinutes(summary.capMin < summary.required ? summary.required - summary.capMin : summary.left < 0 ? summary.capMin - summary.required : summary.left)}</span>
      </li>
    </ul>
  );

  // O que cada tipo muda no plano (mesma regra do cálculo do dia em studyMethod.ts)
  // Tempo padrão deste dia: horas livres do dia da semana (se preenchidas) ou o tempo de foco por dia
  const daily = dayBaseCapacity(studyPrefs, parseYMD(date).getDay());
  const freeToday = hoursByWeekdayOf(studyPrefs)?.[parseYMD(date).getDay()];
  const shortMin = studyPrefs.shortFocusMinutes;
  const lowCap = blocksToHours(Math.min(daily, Math.max(2, Math.round(daily / 3))));
  const essentialCap = blocksToHours(Math.min(2, daily));
  const typeChips: Array<{ id: DayType; label: string; hint: string; desc: string; capped?: boolean }> = [
    {
      id: 'normal',
      label: 'Normal',
      hint: 'plano completo',
      desc: `Revisões primeiro, depois os temas que você escolher. A rotina (flashcards, questões, folha em branco) fica opcional. Seu tempo: ${blocksToHours(daily)}.`,
    },
    {
      id: 'dificil',
      label: 'Dia difícil',
      hint: 'só o essencial',
      desc: `O tempo cai para cerca de ${lowCap}, em blocos curtos de ${shortMin} min. Sem tema novo sugerido. Se quiser, escolha um dia mínimo:`,
      capped: true,
    },
    ...(showPlantao
      ? [
          {
            id: 'plantao' as const,
            label: isToday ? 'Plantão hoje' : 'Dia de plantão',
            hint: 'pouco tempo',
            desc: `No máximo ${essentialCap} de foco, em blocos curtos de ${shortMin} min: revisões e flashcards. Sem tema novo e sem misturadas.`,
            capped: true,
          },
          {
            id: 'pos_plantao' as const,
            label: 'Pós-plantão',
            hint: 'descanso',
            desc: 'Vira dia de descanso: revisões, flashcards e resumo ficam opcionais. No dia seguinte o plano volta ao normal.',
          },
        ]
      : [
          {
            id: 'prova' as const,
            label: isToday ? 'Prova hoje' : 'Dia de prova',
            hint: 'revisão leve',
            desc: `Só revisão leve, em blocos curtos de ${shortMin} min. Sem tema novo. Como você vai estar depois da prova?`,
            capped: true,
          },
          {
            id: 'pos_prova' as const,
            label: 'Pós-prova',
            hint: 'descanso',
            desc: 'Dia de descanso: nada é obrigatório. O que aparecer fica opcional. Amanhã o plano volta ao normal.',
          },
        ]),
  ];
  const activeType = typeChips.find((c) => c.id === dayType) || typeChips[0];

  // Linha da lista: no modo detalhado a alça (⋮⋮) arrasta a tarefa; ↑/↓ no teclado também move
  const row = (t: PlanTask, handle: (p: ReorderHandleProps) => React.ReactNode) => {
    const i = all.findIndex((x) => x.id === t.id);
    const status = t.skipped ? (isToday ? 'fora de hoje' : 'fora deste dia') : t.done ? 'feita' : pinned.has(t.id) ? 'fixada' : t.optional ? 'opcional' : '';
    return (
      <div className={`flex items-center gap-1.5 px-2 py-2 bg-white dark:bg-slate-900 ${t.skipped ? 'opacity-50' : ''}`}>
        {mode === 'detalhado' && handle({ id: `dayplan-grip-${t.id}`, label: `Arrastar ${t.title} para mudar a ordem`, className: 'h-10 w-8' })}
        <span className="text-lg leading-none shrink-0">{t.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-bold truncate ${t.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>{t.title}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {taskSizeLabel(t)}
            {status ? ` · ${status}` : ''}
          </p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {mode === 'detalhado' && !t.skipped && !t.done && i > 0 && (
            <button
              type="button"
              id={`dayplan-top-${t.id}`}
              aria-label="Prioridade: colocar em primeiro"
              title="Prioridade: em primeiro"
              onClick={() => toTop(t.id)}
              className="h-10 w-9 hidden sm:flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <ArrowUpToLine className="h-4 w-4" />
            </button>
          )}
          {mode === 'detalhado' && !t.skipped && !t.done && (
            <button
              type="button"
              id={`dayplan-pin-${t.id}`}
              aria-pressed={pinned.has(t.id)}
              aria-label={pinned.has(t.id) ? 'Desafixar' : 'Fixar no dia (deixa de ser opcional)'}
              title={pinned.has(t.id) ? 'Desafixar' : 'Fixar no dia'}
              onClick={() => togglePin(t.id)}
              className={`h-10 w-10 flex items-center justify-center rounded-xl ${pinned.has(t.id) ? 'text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-500/10' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
            >
              {pinned.has(t.id) ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
            </button>
          )}
          {t.movable && !t.done && !t.skipped && (
            <button
              type="button"
              aria-label={isToday ? 'Passar para amanhã' : 'Passar para o dia seguinte'}
              title={isToday ? 'Passar para amanhã' : 'Passar para o dia seguinte'}
              onClick={() => moveTaskToDate(t, date, nextDay)}
              className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <CalendarClock className="h-4 w-4" />
            </button>
          )}
          {!t.done && (
            <button
              type="button"
              id={`dayplan-skip-${t.id}`}
              aria-label={t.skipped ? 'Voltar para o dia' : t.kind === 'custom' ? 'Remover' : 'Tirar do dia'}
              title={t.skipped ? 'Voltar para o dia' : t.kind === 'custom' ? 'Remover' : 'Tirar do dia'}
              onClick={() => removeOrSkip(t)}
              className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              {t.skipped ? <Undo2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
            </button>
          )}
        </div>
      </div>
    );
  };

  // "Já está no dia": o que o aluno colocou, com X para tirar
  const addedList = (list: PlanTask[], id: string, label: string) =>
    list.length > 0 && (
      <div id={id} className="mt-2.5">
        <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
          {label} · {list.length}
        </p>
        <ul className="space-y-1">
          {list.map((t) => (
            <li key={t.id} className="flex items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 pl-2.5 pr-1 py-1">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: t.color }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className={`block text-[12px] font-bold truncate ${t.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>
                  {t.title.replace(/^Tema novo: /, '')}
                </span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400 truncate">
                  {taskSizeLabel(t)}
                  {t.kind !== 'custom' && t.subtitle ? ` · ${t.subtitle}` : ''}
                </span>
              </span>
              {!t.done && (t.kind === 'custom' || t.kind === 'new_block') ? (
                <button
                  type="button"
                  aria-label={`Tirar ${t.title} ${isToday ? 'de hoje' : 'deste dia'}`}
                  title={isToday ? 'Tirar de hoje' : 'Tirar deste dia'}
                  onClick={() => removeOrSkip(t)}
                  className="shrink-0 h-9 w-9 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-rose-600 dark:hover:text-rose-400"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : (
                <span className="shrink-0 px-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">{t.done ? 'feito' : '1º contato'}</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    );

  return (
    <>
      <PlanModal
        id="dayplan-modal"
        open={open}
        onClose={handleClose}
        stacked={stacked}
        maxWidth="max-w-2xl"
        icon={<SlidersHorizontal className="h-5 w-5" />}
        title={`Planejar meu dia · ${WEEKDAY_NAMES[parseYMD(date).getDay()]}, ${formatDM(date)}`}
        subtitle="O site organiza e sugere; você decide o que entra. Aqui você deixa o dia do seu jeito."
      >
        <div className="space-y-5">
          {/* Modo */}
          <Segmented
            ariaLabel="Modo do planejamento"
            stretch
            fontSize={13}
            options={[
              { id: 'simples', label: 'Simples', hint: 'você diz as horas' },
              { id: 'detalhado', label: 'Detalhado', hint: 'você escolhe tudo' },
            ]}
            value={mode}
            onChange={(id) => setMode(id)}
            idFor={(id) => `dayplan-mode-${id}`}
          />

          <Stepper id="dayplan-stepper" step={step} onStepChange={setStep} onFinalStepCompleted={confirmDay} completeButtonText="Confirmar">
          {/* Passo 1: tipo do dia */}
          <Step title="Tipo do dia">
          <section>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{isToday ? 'Como é o seu dia hoje?' : 'Como vai ser este dia?'}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {typeChips.map((c) => (
                <OptionChip key={c.id} id={`dayplan-type-${c.id}`} active={dayType === c.id} onClick={() => setType(c.id)} className="min-h-[48px] text-left">
                  <span className="block text-sm">{c.label}</span>
                  <span className={`block text-[10px] font-semibold ${dayType === c.id ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>{c.hint}</span>
                </OptionChip>
              ))}
            </div>
            <div id="dayplan-type-help" aria-live="polite" className="mt-2.5 rounded-xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 px-3 py-2.5">
              <p className="text-[12px] text-slate-700 dark:text-slate-200 leading-relaxed">
                <span className="font-black text-sky-700 dark:text-sky-300">{activeType.label}:</span> {activeType.desc}
              </p>
              {/* Prova hoje: humor depois da prova */}
              {dayType === 'prova' && (
                <div id="dayplan-mood" className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {EXAM_MOODS.map((m) => (
                    <OptionChip key={m.id} id={`dayplan-mood-${m.id}`} active={state.mood === m.id} onClick={() => setMood(m.id)} className="min-h-[44px]">
                      <span aria-hidden>{m.emoji}</span> {m.label}
                    </OptionChip>
                  ))}
                </div>
              )}
              {dayType === 'prova' && state.mood && (
                <p id="dayplan-mood-help" className="mt-1.5 text-[12px] text-slate-700 dark:text-slate-200">
                  {EXAM_MOODS.find((m) => m.id === state.mood)?.desc}
                  {state.mood === 'estressado' ? ' Dica: pare 10 min, respire fundo e beba água.' : ''}
                </p>
              )}
              {/* Dia difícil: dia mínimo */}
              {dayType === 'dificil' && (
                <div id="dayplan-minimal" className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {MINIMAL_DAY_OPTIONS.map((o) => (
                    <OptionChip key={o.id} id={`dayplan-minimal-${o.id}`} active={state.minimal === o.id} onClick={() => setMinimal(o.id)} className="min-h-[44px] text-left">
                      <span className="block text-[13px]">{o.label}</span>
                      <span className={`block text-[10px] font-semibold ${state.minimal === o.id ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>{o.hint}</span>
                    </OptionChip>
                  ))}
                </div>
              )}
              {dayType === 'dificil' && state.minimal && (
                <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Só isso conta {H}. O resto fica opcional. Toque de novo para tirar.</p>
              )}
              {activeType.capped && (
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Se você escolher o tempo no próximo passo, vale o tempo que você escolher.</p>
              )}
            </div>
          </section>
          </Step>

          {/* Passo 2: tempo */}
          <Step title="Tempo">
          <section>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Quanto tempo de foco você tem {H}?</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="dayplan-time-minus"
                aria-label={`Menos ${blockMin} minutos`}
                title={`Menos 1 bloco (${blockMin} min)`}
                disabled={capMinus >= capacity}
                onClick={() => setCapacity(capMinus)}
                className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-sky-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 text-center">
                <p id="dayplan-time" className="text-2xl font-black text-slate-900 dark:text-white leading-none">{blocksToHours(capacity)}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {state.capacity ? (isToday ? 'só para hoje' : 'só para este dia') : freeToday !== undefined ? `padrão de ${WEEKDAY_NAMES[parseYMD(date).getDay()].toLowerCase()}: ${formatFreeHours(freeToday)} livres (${blocksToHours(daily)} de foco)` : `padrão da sua rotina (${blocksToHours(daily)})`} · previsto {blocksToHours(plan.planned)}
                </p>
              </div>
              <button
                type="button"
                id="dayplan-time-plus"
                aria-label={`Mais ${blockMin} minutos`}
                title={`Mais 1 bloco (${blockMin} min)`}
                disabled={capPlus <= capacity}
                onClick={() => setCapacity(capPlus)}
                className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-sky-400 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 text-center">
              Cada toque muda 1 bloco de foco ({blockMin} min). Ou escolha as horas:
            </p>
            <div id="dayplan-hours" className="mt-2 flex flex-wrap justify-center gap-1.5">
              {HOUR_CHIPS.map((h) => {
                const u = (h * 60) / 25;
                const on = Math.abs(capacity - u) < 0.01;
                return (
                  <OptionChip key={h} id={`dayplan-hours-${h}`} active={on} onClick={() => setCapacity(u)} className="min-w-[48px]">
                    {h}h
                  </OptionChip>
                );
              })}
            </div>
            {/* Simples: o site monta o dia no tempo (revisões, temas, rotina) e mostra quanto ficou para cada coisa */}
            {mode === 'simples' && (
              <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-3">
                <p className="text-[12px] font-black text-slate-900 dark:text-white mb-1.5">Como fica o seu dia</p>
                <SummaryList id="dayplan-simple-summary" />
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Revisões vêm primeiro. Depois os temas{summary.themes.n > 1 ? ', que dividem o tempo por igual' : ''}. A rotina entra se sobrar tempo.
                </p>
              </div>
            )}
          </section>
          </Step>

          {/* Passo 3: conteúdo (o que entra no dia) */}
          <Step title="Conteúdo">
          <div className="space-y-5">
          {/* Simples: somar o básico do método */}
          {mode === 'simples' && (
            <section>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Somar o básico do método</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">As revisões já estão no dia. Se quiser, some um destes:</p>
              {basicsToAdd.length === 0 ? (
                <p className="text-[12px] text-slate-500 dark:text-slate-400">O básico já está no seu dia. 👍</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {basicsToAdd.map((b) => (
                    <button
                      key={b.id}
                      type="button"
                      id={`dayplan-basic-${b.id}`}
                      onClick={() => addBasic(b)}
                      className="min-h-[40px] px-3 rounded-xl border border-dashed border-sky-300 dark:border-sky-700 text-[12px] font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 inline-flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" /> {b.title}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )}

          {/* Detalhado: ligar/desligar os blocos fixos do dia */}
          {mode === 'detalhado' && (
            <section>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Check list do dia</p>
              <div className="flex flex-wrap gap-1.5">
                {FIXED_KINDS.filter((k) => fixedTasks(k.kind).length > 0).map((k) => {
                  const list = fixedTasks(k.kind);
                  const on = list.some((t) => !t.skipped);
                  return (
                    <OptionChip
                      key={k.kind}
                      id={`dayplan-fixed-${k.kind}`}
                      active={on}
                      onClick={() => list.forEach((t) => skipTask(date, t.id, on))}
                    >
                      {on ? '✓ ' : ''}
                      {k.label}
                    </OptionChip>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Desligado sai só deste dia. No dia seguinte o plano volta ao padrão da sua rotina.</p>
            </section>
          )}

          {/* Detalhado: dia das misturadas (temas da semana e questões por tema) */}
          {mode === 'detalhado' &&
            all
              .filter((t) => t.kind === 'mixed' && !t.skipped && !t.done && (t.mixThemes || []).length > 0)
              .map((t) => (
                <section key={t.id} id="dayplan-mixed">
                  <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">🔀 Questões misturadas</p>
                  <MixedThemesCard task={t} date={date} />
                </section>
              ))}

          {/* Tema novo + conteúdos */}
          <section>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Estudar um tema {H}</p>
            <div className="space-y-2">
              <select
                id="dayplan-theme"
                value=""
                onChange={(e) => e.target.value && addTheme(e.target.value)}
                className="w-full min-w-0 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm font-bold text-slate-800 dark:text-slate-100"
              >
                <option value="">{themeOptions.length ? 'Escolher um tema em estudo…' : 'Nenhum outro tema ligado em estudo'}</option>
                {themeOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.plannedDate ? ` (${b.plannedDate < date ? 'estava para' : 'marcado para'} ${formatDM(b.plannedDate)})` : ''}
                  </option>
                ))}
              </select>
              {isToday && plan.suggestions.length > 0 && (
                <div id="dayplan-suggestions" className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                    <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Cabem no seu tempo:
                  </span>
                  {plan.suggestions.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => t.blockId && addTheme(t.blockId)}
                      className="min-h-[36px] max-w-full px-2.5 rounded-xl border border-dashed border-sky-300 dark:border-sky-700 text-[12px] font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 inline-flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5 shrink-0" /> <span className="truncate">{t.title}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className={`grid gap-2 ${hasModules ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2'}`}>
              <button
                type="button"
                id="dayplan-pick-area"
                onClick={() => {
                  setThemeBy('area');
                  setThemeOpen(true);
                }}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:border-sky-400"
              >
                <BookOpen className="h-4 w-4" /> Por área e disciplina
              </button>
              {hasModules && (
                <button
                  type="button"
                  id="dayplan-pick-module"
                  onClick={() => {
                    setThemeBy('module');
                    setThemeOpen(true);
                  }}
                  className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:border-sky-400"
                >
                  <FolderTree className="h-4 w-4" /> Por módulo
                </button>
              )}
              <button
                type="button"
                id="dayplan-open-content"
                onClick={() => setContentOpen(true)}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:border-sky-400"
              >
                <Layers className="h-4 w-4" /> Meus conteúdos
              </button>
              </div>
            </div>
            {addedList(dayThemes, 'dayplan-added-themes', isToday ? 'Temas de hoje' : 'Temas deste dia')}
            {dayThemes.length === 0 && (
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Nenhum tema {isToday ? 'em hoje' : 'neste dia'} ainda. O que você escolher aparece aqui.</p>
            )}
            {/* Detalhado: por tema, tempo, questões, tópicos e atividades */}
            {mode === 'detalhado' && dayThemes.filter((t) => !t.done).length > 0 && (
              <div id="dayplan-theme-details" className="mt-3 space-y-2">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Como estudar cada tema</p>
                {dayThemes
                  .filter((t) => !t.done)
                  .map((t) => (
                    <ThemeDetailCard
                      key={t.id}
                      task={t}
                      detail={state.detail?.[t.id]}
                      topics={topicsOf(t)}
                      focusMinutes={studyPrefs.focusMinutes}
                      onChange={(next) => setDetail(t.id, next)}
                    />
                  ))}
              </div>
            )}
            {mode === 'simples' && dayThemes.length > 0 && (
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">O tempo de cada tema sai do seu tempo livre. Quer escolher tempo, tópicos e atividades? Use o modo Detalhado.</p>
            )}
          </section>

          {/* Tarefa minha */}
          <section>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Somar uma tarefa sua</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitTask();
              }}
              className="flex flex-col sm:flex-row gap-2"
            >
              <input
                id="dayplan-task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: ler o resumo de arritmias"
                className="flex-1 min-w-0 min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              <div className="flex gap-2">
                <select
                  aria-label="Tamanho"
                  value={blocks}
                  onChange={(e) => setBlocks(Number(e.target.value))}
                  className="min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-sm font-bold text-slate-800 dark:text-slate-100"
                >
                  {[1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} × {studyPrefs.shortFocusMinutes} min
                    </option>
                  ))}
                </select>
                <button type="submit" id="dayplan-add-task" className="min-h-[44px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black inline-flex items-center gap-1.5">
                  <Plus className="h-4 w-4" /> Somar
                </button>
              </div>
            </form>
            {addedList(dayCustom, 'dayplan-added-tasks', isToday ? 'Suas tarefas de hoje' : 'Suas tarefas deste dia')}
          </section>
          </div>
          </Step>

          {/* Passo 4: confirmar (resumo do dia montado; a ordem por arrastar continua aqui) */}
          <Step title="Confirmar">
          <section>
            <div id="dayplan-confirm" className="mb-4 rounded-2xl border border-sky-200 dark:border-sky-500/30 bg-sky-50 dark:bg-sky-500/10 p-3">
              <p id="dayplan-headline" className="text-sm font-black text-slate-900 dark:text-white">{headline}</p>
              <div className="mt-2">
                <SummaryList id="dayplan-confirm-summary" />
              </div>
              <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">Quer mudar algo? Volte aos passos anteriores. Está bom? Toque em Confirmar.</p>
            </div>
            <div className="flex items-end justify-between gap-2 mb-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{mode === 'detalhado' ? 'Ordem e prioridade' : 'Tarefas'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {mode === 'detalhado' ? 'Arraste pela alça para mudar a ordem · ⤒ prioridade · X tira do dia' : 'X tira do dia · relógio passa para o dia seguinte'}
              </p>
            </div>
            {plan.overBy > 0 && (
              <p id="dayplan-over-time" className="mb-2 text-[11px] text-slate-500 dark:text-slate-400">
                Passou {blocksToHours(plan.overBy)} do seu tempo. Tudo bem: você decide no fim do dia.
              </p>
            )}
            {all.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-sm text-center text-slate-600 dark:text-slate-300">Nada no plano {isToday ? 'de hoje' : 'deste dia'} ainda.</p>
            ) : (
              <div id="dayplan-list">
              <ReorderList
                items={all}
                onCommit={commitOrder}
                className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden"
                itemProps={(t) => ({ id: `dayplan-task-${t.id}` })}
                renderItem={row}
              />
              </div>
            )}
            <div className="mt-3 flex justify-end">
              <button type="button" id="dayplan-reset" onClick={resetDay} className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5">
                <RotateCcw className="h-4 w-4" /> Voltar ordem e tempo ao padrão
              </button>
            </div>
          </section>
          </Step>
          </Stepper>
        </div>
      </PlanModal>
      <StudyContentModal open={contentOpen} onClose={() => setContentOpen(false)} stacked />
      <QuickThemeModal open={open && themeOpen} onClose={() => setThemeOpen(false)} defaultDate={date} stacked by={themeBy} />
    </>
  );
};
