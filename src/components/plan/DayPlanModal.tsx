// "Planejar dia": personalizar o dia de hoje. Tipo do dia, quanto tempo tem, a ordem das tarefas,
// o que entra (fixar) ou sai (tirar de hoje / amanhã), escolher o tema novo e somar tarefas suas.
import React, { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpToLine, BookOpen, CalendarClock, Layers, Minus, Pin, PinOff, Plus, RotateCcw, SlidersHorizontal, Undo2, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { addDaysYMD, formatDM, parseYMD, ymd } from '../../data/blockReview';
import { WEEKDAY_NAMES, type PlanTask } from '../../data/studyMethod';
import { semesterNumberOf } from '../../data/subjectFormats';
import { useDayPlan } from '../../hooks/useStudyPlan';
import { OptionChip, PlanModal, blocksToHours, readLocal, taskSizeLabel, userLocalKey, writeLocal } from './planShared';
import { StudyContentModal } from './StudyContentModal';
import { QuickThemeModal } from './QuickThemeModal';

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

type DayType = 'normal' | 'dificil' | 'prova' | 'pos_prova' | 'plantao' | 'pos_plantao';

export const DayPlanModal: React.FC<DayPlanModalProps> = ({ open, onClose, date: dateProp, stacked }) => {
  const {
    studyMethod,
    studyPrefs,
    studyPhase,
    currentSemester,
    currentSubjectIds,
    topicBlocks,
    setDayPlanState,
    setLowEnergy,
    setDayShift,
    skipTask,
    removeCustomTask,
    moveTaskToDate,
    addCustomTask,
    updateTopicBlock,
    showNotification,
    userProfile,
  } = useApp();
  const plan = useDayPlan(dateProp);
  const date = plan.date;
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
  const inToday = new Set(plan.tasks.map((t) => t.id));
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

  const move = (id: string, dir: -1 | 1) => {
    const i = order.indexOf(id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= order.length) return;
    const next = [...order];
    [next[i], next[j]] = [next[j], next[i]];
    setDayPlanState(date, (s) => ({ ...s, order: next }));
  };
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
  // X: tarefa que você somou sai de vez; as do plano saem só de hoje
  const removeOrSkip = (t: PlanTask) => {
    if (t.kind === 'custom' && t.customId) removeCustomTask(date, t.customId);
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
  const setCapacity = (n: number) => setDayPlanState(date, (s) => ({ ...s, capacity: Math.max(1, Math.min(24, n)) }));
  const resetDay = () => {
    setDayPlanState(date, (s) => ({ ...s, order: undefined, pinned: undefined, capacity: undefined }));
    showNotification('O dia voltou ao plano automático.', 'info');
  };

  // Tema novo para hoje: temas ligados, em estudo, que não estão programados para hoje
  const themeOptions = topicBlocks.filter(
    (b) => currentSubjectIds.includes(b.subjectId) && b.reviewStatus === 'estudando' && !b.paused && b.plannedDate !== date
  );
  const addTheme = (id: string) => {
    const b = topicBlocks.find((x) => x.id === id);
    if (!b) return;
    updateTopicBlock(id, { plannedDate: date });
    showNotification(`"${b.name}" entrou no plano ${isToday ? 'de hoje' : 'deste dia'}.`, 'success');
  };

  const submitTask = () => {
    const t = title.trim();
    if (!t) return;
    addCustomTask(date, t, blocks);
    setTitle('');
    setBlocks(1);
  };

  const typeChips: Array<{ id: DayType; label: string; hint: string }> = [
    { id: 'normal', label: 'Normal', hint: 'plano completo' },
    { id: 'dificil', label: 'Dia difícil', hint: 'só o essencial' },
    ...(showPlantao
      ? ([
          { id: 'plantao', label: isToday ? 'Plantão hoje' : 'Dia de plantão', hint: 'pouco tempo' },
          { id: 'pos_plantao', label: 'Pós-plantão', hint: 'descanso' },
        ] as const)
      : ([
          { id: 'prova', label: isToday ? 'Prova hoje' : 'Dia de prova', hint: 'revisão leve' },
          { id: 'pos_prova', label: 'Pós-prova', hint: 'descanso' },
        ] as const)),
  ];

  const row = (t: PlanTask, i: number) => {
    const isIn = inToday.has(t.id) && !t.skipped;
    return (
      <li key={t.id} id={`dayplan-task-${t.id}`} className={`flex items-center gap-2 px-2.5 py-2 ${t.skipped ? 'opacity-50' : ''}`}>
        <div className={`flex-col shrink-0 ${mode === 'detalhado' ? 'flex' : 'hidden'}`}>
          <button
            type="button"
            aria-label={`Subir ${t.title}`}
            disabled={i === 0}
            onClick={() => move(t.id, -1)}
            className="h-6 w-8 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Descer ${t.title}`}
            disabled={i === all.length - 1}
            onClick={() => move(t.id, 1)}
            className="h-6 w-8 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
        </div>
        <span className="text-lg leading-none shrink-0">{t.emoji}</span>
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-bold truncate ${t.done ? 'line-through text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>{t.title}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
            {taskSizeLabel(t)} · {t.skipped ? (isToday ? 'fora de hoje' : 'fora deste dia') : isIn ? (pinned.has(t.id) ? 'fixada' : 'cabe no dia') : 'não coube'}
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
              aria-label={pinned.has(t.id) ? 'Desafixar' : 'Fixar no dia mesmo se não couber'}
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
      </li>
    );
  };

  return (
    <>
      <PlanModal
        id="dayplan-modal"
        open={open}
        onClose={onClose}
        stacked={stacked}
        maxWidth="max-w-2xl"
        icon={<SlidersHorizontal className="h-5 w-5" />}
        title={`Planejar meu dia · ${WEEKDAY_NAMES[parseYMD(date).getDay()]}, ${formatDM(date)}`}
        subtitle="O plano automático é o ponto de partida. Aqui você deixa o dia do seu jeito."
        footer={
          <>
            <button type="button" id="dayplan-reset" onClick={resetDay} className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 inline-flex items-center gap-1.5">
              <RotateCcw className="h-4 w-4" /> Voltar ao automático
            </button>
            <button type="button" id="dayplan-done" onClick={onClose} className="min-h-[40px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black">
              Pronto
            </button>
          </>
        }
      >
        <div className="space-y-5">
          {/* Modo */}
          <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 dark:bg-slate-950/60 p-1" role="tablist" aria-label="Modo do planejamento">
            {(
              [
                { id: 'simples', label: 'Simples', hint: 'o plano pronto + o básico' },
                { id: 'detalhado', label: 'Detalhado', hint: 'você escolhe tudo' },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                role="tab"
                id={`dayplan-mode-${m.id}`}
                aria-selected={mode === m.id}
                onClick={() => setMode(m.id)}
                className={`min-h-[44px] rounded-xl px-3 text-left transition-colors ${
                  mode === m.id ? 'bg-white dark:bg-slate-800 shadow-xs' : 'hover:bg-white/60 dark:hover:bg-slate-800/50'
                }`}
              >
                <span className={`block text-sm font-black ${mode === m.id ? 'text-sky-700 dark:text-sky-300' : 'text-slate-700 dark:text-slate-200'}`}>{m.label}</span>
                <span className="block text-[10px] text-slate-500 dark:text-slate-400">{m.hint}</span>
              </button>
            ))}
          </div>

          {/* Tipo do dia */}
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
          </section>

          {/* Tempo */}
          <section>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Quanto tempo de foco você tem {H}?</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                aria-label="Menos 25 minutos"
                onClick={() => setCapacity(capacity - 1)}
                className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-sky-400"
              >
                <Minus className="h-4 w-4" />
              </button>
              <div className="flex-1 text-center">
                <p id="dayplan-time" className="text-2xl font-black text-slate-900 dark:text-white leading-none">{blocksToHours(capacity)}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                  {state.capacity ? (isToday ? 'só para hoje' : 'só para este dia') : `padrão da sua rotina (${blocksToHours(studyPrefs.dailyPomodoros)})`} · previsto {blocksToHours(plan.planned)}
                </p>
              </div>
              <button
                type="button"
                aria-label="Mais 25 minutos"
                onClick={() => setCapacity(capacity + 1)}
                className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-sky-400"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </section>

          {/* Simples: somar o básico do método */}
          {mode === 'simples' && (
            <section>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">Somar o básico do método</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">O plano já vem pronto. Se quiser, some um destes:</p>
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

          {/* Tarefas */}
          <section>
            <div className="flex items-end justify-between gap-2 mb-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{mode === 'detalhado' ? 'Tarefas, ordem e prioridade' : 'Seu dia'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">
                {mode === 'detalhado' ? 'Setas mudam a ordem · ⤒ prioridade · alfinete fixa no dia · X tira do dia' : 'X tira do dia · relógio passa para o dia seguinte'}
              </p>
            </div>
            {all.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-sm text-center text-slate-600 dark:text-slate-300">Nada no plano {isToday ? 'de hoje' : 'deste dia'} ainda.</p>
            ) : (
              <ul id="dayplan-list" className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
                {all.map(row)}
              </ul>
            )}
          </section>

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
                <option value="">{themeOptions.length ? 'Escolher um bloco em estudo…' : 'Nenhum tema ligado sem data'}</option>
                {themeOptions.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                    {b.plannedDate ? ` (estava para ${formatDM(b.plannedDate)})` : ''}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="dayplan-pick-area"
                onClick={() => setThemeOpen(true)}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center justify-center gap-1.5 hover:border-sky-400"
              >
                <BookOpen className="h-4 w-4" /> Por área e disciplina
              </button>
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
          </section>
        </div>
      </PlanModal>
      <StudyContentModal open={contentOpen} onClose={() => setContentOpen(false)} stacked />
      <QuickThemeModal open={open && themeOpen} onClose={() => setThemeOpen(false)} defaultDate={date} stacked />
    </>
  );
};
