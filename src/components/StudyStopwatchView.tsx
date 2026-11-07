import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion } from 'motion/react';
import {
  Play,
  Pause,
  RotateCcw,
  Headphones,
  List,
  Settings,
  Target,
  CheckCircle2,
  ArrowRight,
  X,
  Repeat,
  Layers,
  Rocket,
  CalendarCheck,
  BellRing,
  Smartphone,
  Coffee,
  Timer,
  Zap,
  BookOpen,
  Lightbulb,
  NotebookPen,
  Plus,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { StudyCycleModal } from './modals/StudyCycleModal';
import { PomodoroSettingsModal } from './modals/PomodoroSettingsModal';
import { sessionDate, weekStart } from '../data/studyMethod';
import { todayYMD, useDayPlan } from '../hooks/useStudyPlan';
import { notifyTimer, playTimerBeep } from '../lib/timerSound';

type PresetId = 'short' | 'long' | 'free';

const ALARM_OPTIONS: Array<number | null> = [null, 30, 60, 90, 120, 240];
const ALARM_STORAGE_KEY = 'medacademic_free_alarm_min';

/** "Pré-teste: tente 3 a 5..." → ["Pré-teste", "tente 3 a 5..."] */
const splitStep = (s: string): [string, string] => {
  const i = s.indexOf(':');
  return i > 0 && i < 28 ? [s.slice(0, i), s.slice(i + 1).trim()] : [s, ''];
};

const formatAlarm = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? String(m % 60).padStart(2, '0') : ''}` : `${m} min`);

export const StudyStopwatchView: React.FC = () => {
  const {
    timer,
    startTimer,
    pauseTimer,
    resetTimer,
    setTimerMode,
    setTimerSubject,
    subjects,
    currentSubjectIds,
    studySessions,
    logStudySession,
    addXp,
    triggerConfetti,
    pomodoroSettings,
    updatePomodoroSettings,
    startStudyCycle,
    stopStudyCycle,
    startTask,
    clearFocusTask,
    openReviews,
    openPlannerToday,
    setCurrentTab,
    studyPrefs,
  } = useApp();

  const [ambientSound, setAmbientSound] = useState<'none' | 'whitenoise' | 'rain' | 'binaural'>('none');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [isStudyCycleModalOpen, setIsStudyCycleModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [earlyTip, setEarlyTip] = useState(false);
  const [freeDone, setFreeDone] = useState(false);
  const [alarmMin, setAlarmMin] = useState<number | null>(() => {
    try {
      const v = Number(localStorage.getItem(ALARM_STORAGE_KEY));
      return v > 0 ? v : null;
    } catch {
      return null;
    }
  });
  const [customAlarm, setCustomAlarm] = useState('');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundNodeRef = useRef<any>(null);
  const alarmFiredRef = useRef(false);

  const today = todayYMD();
  const plan = useDayPlan();
  const task = timer.task;
  const taskKey = task ? `${task.title}|${task.blockId || ''}|${task.projectId || ''}|${task.itemId || ''}` : '';
  const taskFinished = !!task && (!!task.finished || freeDone);
  const cycle = timer.cycle;
  const cycleStep = cycle ? cycle.steps[cycle.index] : undefined;
  const isWaitingNextStep = !!cycle && cycle.phase === 'work' && !timer.isRunning;
  const isBreak = timer.mode === 'short_break' || timer.mode === 'medium_break' || timer.mode === 'long_break';

  // Nova tarefa: limpa avisos da anterior
  useEffect(() => {
    setEarlyTip(false);
    setFreeDone(false);
  }, [taskKey]);
  useEffect(() => {
    if (task?.finished) setEarlyTip(false);
  }, [task?.finished]);

  useEffect(() => {
    try {
      if (alarmMin) localStorage.setItem(ALARM_STORAGE_KEY, String(alarmMin));
      else localStorage.removeItem(ALARM_STORAGE_KEY);
    } catch {
      /* sem armazenamento */
    }
  }, [alarmMin]);

  // Alarme do cronômetro livre (simulado): bipe + notificação uma vez ao passar do tempo
  const alarmPassed = timer.mode === 'stopwatch' && !!alarmMin && timer.elapsedSeconds >= alarmMin * 60;
  useEffect(() => {
    if (timer.mode !== 'stopwatch' || !alarmMin) {
      alarmFiredRef.current = false;
      return;
    }
    if (timer.elapsedSeconds < alarmMin * 60) {
      alarmFiredRef.current = false;
      return;
    }
    if (!alarmFiredRef.current && timer.isRunning) {
      alarmFiredRef.current = true;
      playTimerBeep('end');
      notifyTimer('⏰ Tempo esgotado!', `Passaram ${formatAlarm(alarmMin)} no cronômetro livre.`);
    }
  }, [timer.elapsedSeconds, timer.mode, timer.isRunning, alarmMin]);

  // Blocos de foco: contar blocos, não horas
  const { focusToday, focusWeek } = useMemo(() => {
    const from = weekStart(today);
    let t = 0;
    let w = 0;
    studySessions.forEach((s) => {
      if (s.type !== 'pomodoro') return;
      const d = sessionDate(s);
      if (d === today) t++;
      if (d >= from && d <= today) w++;
    });
    return { focusToday: t, focusWeek: w };
  }, [studySessions, today]);

  const currentSubjects = useMemo(() => {
    const ids = new Set(currentSubjectIds);
    const list = subjects.filter((s) => ids.has(s.id));
    return list.length > 0 ? list : subjects;
  }, [subjects, currentSubjectIds]);

  const formatTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    const remainder = secs % 60;
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${remainder.toString().padStart(2, '0')}`;
  };

  // Audio synthesizer for ambient sound (runs in browser with Web Audio API, perfectly safe and reliable)
  useEffect(() => {
    if (ambientSound === 'none') {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
      return;
    }

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;

      if (ambientSound === 'whitenoise' || ambientSound === 'rain') {
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }

        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;
        whiteNoise.loop = true;

        const filter = ctx.createBiquadFilter();
        filter.type = ambientSound === 'rain' ? 'lowpass' : 'bandpass';
        filter.frequency.value = ambientSound === 'rain' ? 800 : 1000;

        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.08;

        whiteNoise.connect(filter);
        filter.connect(gainNode);
        gainNode.connect(ctx.destination);
        whiteNoise.start();
        soundNodeRef.current = whiteNoise;
      } else if (ambientSound === 'binaural') {
        const oscLeft = ctx.createOscillator();
        const oscRight = ctx.createOscillator();
        oscLeft.type = 'sine';
        oscRight.type = 'sine';
        oscLeft.frequency.value = 216;
        oscRight.frequency.value = 226;

        const merger = ctx.createChannelMerger(2);
        const gainNode = ctx.createGain();
        gainNode.gain.value = 0.06;

        oscLeft.connect(merger, 0, 0);
        oscRight.connect(merger, 0, 1);
        merger.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscLeft.start();
        oscRight.start();
      }
    } catch {
      // Audio context disabled by user
    }

    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
        audioCtxRef.current = null;
      }
    };
  }, [ambientSound]);

  // Stop sound when leaving component
  useEffect(() => {
    return () => {
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const handleStopwatchFinish = () => {
    if (timer.elapsedSeconds < 60) return;
    const durationMins = Math.max(1, Math.round(timer.elapsedSeconds / 60));
    const xp = durationMins * 5;

    logStudySession({
      subjectId: timer.selectedSubjectId || task?.subjectId,
      topicId: timer.selectedTopicId,
      durationMinutes: durationMins,
      type: 'stopwatch',
      notes: sessionNotes || (task ? `Cronômetro livre • ${task.title}` : 'Sessão de Cronômetro Livre'),
      xpEarned: xp,
      blockId: task?.blockId,
      projectId: task?.projectId,
      activity: task?.kind,
    });

    addXp(xp, 'Sessão de Foco Livre');
    triggerConfetti();
    resetTimer();
    setSessionNotes('');
    if (task) setFreeDone(true);
  };

  // ---------- Formatos (presets) ----------
  // Atalhos = os blocos que o aluno escolheu em Minha rotina (ex.: 60/10 e 25/5)
  const longBlock = { work: studyPrefs.focusMinutes, rest: studyPrefs.breakMinutes };
  const shortBlock = { work: studyPrefs.shortFocusMinutes, rest: studyPrefs.shortBreakMinutes };
  const matches = (b: { work: number; rest: number }) => pomodoroSettings.workMinutes === b.work && pomodoroSettings.shortBreakMinutes === b.rest;
  const activePreset: PresetId | null =
    timer.mode === 'stopwatch' ? 'free' : matches(longBlock) ? 'long' : matches(shortBlock) ? 'short' : null;
  const presetsLocked = timer.isRunning || !!cycle || (!!task && !taskFinished);
  const lockReason = cycle ? 'Ciclo em andamento' : task && !taskFinished ? 'O formato vem da tarefa' : timer.isRunning ? 'Pause para trocar o formato' : '';

  const applyPreset = (id: PresetId) => {
    if (presetsLocked) return;
    if (id === 'free') {
      setTimerMode('stopwatch');
      return;
    }
    const b = id === 'long' ? longBlock : shortBlock;
    const next = {
      workMinutes: b.work,
      shortBreakMinutes: b.rest,
      mediumBreakMinutes: b.rest,
      longBreakMinutes: Math.max(pomodoroSettings.longBreakMinutes, b.rest),
    };
    // Sem tarefa: volta ao modo foco (limpa duração da tarefa/ciclo); o ajuste abaixo acerta o tempo
    if (!task) setTimerMode('pomodoro');
    updatePomodoroSettings(next);
  };

  const presets: Array<{ id: PresetId; title: string; hint: string; icon: React.ReactNode }> = [
    { id: 'short', title: `${shortBlock.work}/${shortBlock.rest}`, hint: 'meu bloco curto (revisões)', icon: <Timer className="h-4 w-4" /> },
    { id: 'long', title: `${longBlock.work}/${longBlock.rest}`, hint: 'meu bloco longo (tema novo)', icon: <Zap className="h-4 w-4" /> },
    { id: 'free', title: 'Livre', hint: 'com alarme (simulado)', icon: <BellRing className="h-4 w-4" /> },
  ];

  // ---------- Tarefa ligada ao foco ----------
  const anotherBlock = () => {
    if (!task) return;
    const { finished: _f, ...rest } = task;
    void _f;
    const long = task.kind === 'new_block' || task.kind === 'new_topics';
    startTask({
      ...rest,
      minutes: long ? studyPrefs.focusMinutes : studyPrefs.shortFocusMinutes,
      breakMinutes: long ? studyPrefs.breakMinutes : studyPrefs.shortBreakMinutes,
    });
  };

  const primaryAction = (() => {
    if (!task) return null;
    if (task.kind === 'review' && task.blockId)
      return { id: 'pomo-register-review', label: 'Registrar a revisão', icon: <Repeat className="h-4 w-4" />, run: () => openReviews({ blockId: task.blockId, tab: 'hoje' }) };
    if (task.kind === 'new_block')
      return { id: 'pomo-mark-topics', label: 'Marcar tópicos vistos', icon: <Layers className="h-4 w-4" />, run: () => setCurrentTab('structure') };
    if (task.kind === 'project' || task.kind === 'project_review')
      return {
        id: 'pomo-back-personal',
        label: task.kind === 'project_review' ? 'Registrar a revisão' : 'Voltar aos Estudos pessoais',
        icon: <Rocket className="h-4 w-4" />,
        run: () => setCurrentTab('personal'),
      };
    if (task.kind === 'error_redo')
      return { id: 'pomo-open-errors', label: 'Abrir o caderno de erros', icon: <NotebookPen className="h-4 w-4" />, run: () => openReviews({ tab: 'erros' }) };
    return null;
  })();
  const nextPlanTask = plan.next && plan.next.title !== task?.title ? plan.next : undefined;

  // ---------- Textos do relógio ----------
  const modeLabel =
    timer.mode === 'stopwatch'
      ? 'Cronômetro livre'
      : timer.mode === 'pomodoro'
        ? `Foco · ${Math.round((timer.customDurationSeconds || pomodoroSettings.workMinutes * 60) / 60)} min`
        : timer.mode === 'short_break'
          ? 'Pausa curta'
          : timer.mode === 'medium_break'
            ? 'Pausa média'
            : 'Pausa longa';

  const fullSeconds =
    timer.customDurationSeconds ||
    (timer.mode === 'short_break'
      ? pomodoroSettings.shortBreakMinutes * 60
      : timer.mode === 'medium_break'
        ? pomodoroSettings.mediumBreakMinutes * 60
        : timer.mode === 'long_break'
          ? pomodoroSettings.longBreakMinutes * 60
          : pomodoroSettings.workMinutes * 60);

  const mainLabel = timer.isRunning
    ? isBreak
      ? 'Pausar pausa'
      : 'Pausar'
    : isWaitingNextStep && timer.timeLeftSeconds === (timer.customDurationSeconds || 0)
      ? `Iniciar etapa ${cycle!.index + 1}`
      : isBreak
        ? 'Iniciar pausa'
        : timer.mode === 'stopwatch'
          ? timer.elapsedSeconds > 0
            ? 'Continuar'
            : 'Iniciar cronômetro'
          : timer.timeLeftSeconds < fullSeconds
            ? 'Continuar foco'
            : 'Iniciar foco';

  const statusText = timer.isRunning
    ? isBreak
      ? 'Pausa de verdade: levante, beba água, olhe para longe.'
      : timer.mode === 'stopwatch'
        ? alarmMin
          ? alarmPassed
            ? `Passou de ${formatAlarm(alarmMin)}.`
            : `Alarme em ${formatAlarm(alarmMin)}.`
          : 'Cronômetro livre rodando.'
        : 'Foco ativo: uma tarefa só, celular longe.'
    : isBreak
      ? 'Hora da pausa. Aperte "Iniciar pausa" quando sair da mesa.'
      : 'Escolha o formato e aperte Iniciar.';

  const chipBase = 'px-3 py-2 rounded-xl text-xs font-semibold transition-colors';
  const chipOff = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700';

  return (
    <div className="space-y-5 pb-12">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Pomodoro</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-orange-100 dark:bg-orange-950/60 text-orange-700 dark:text-orange-300">
              Conte blocos, não horas
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">Um bloco de foco com uma tarefa concreta, depois uma pausa de verdade.</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:justify-end">
          <button
            id="open-pomodoro-settings-btn"
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 font-bold text-xs shadow-xs transition-all cursor-pointer"
            title="Configurar tempos de foco e pausas"
          >
            <Settings className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <span>Editar tempos</span>
          </button>

          <button
            id="open-study-cycle-btn"
            type="button"
            onClick={() => setIsStudyCycleModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>{cycle ? 'Ciclo em andamento' : 'Ciclos de estudo'}</span>
          </button>
        </div>
      </div>

      {/* Tarefa deste foco */}
      {task && (
        <div
          id="pomo-task-card"
          className={`max-w-2xl mx-auto rounded-3xl border p-4 sm:p-5 shadow-sm ${
            taskFinished
              ? 'border-emerald-500/40 bg-emerald-50 dark:bg-emerald-950/20'
              : 'border-sky-500/30 bg-sky-50/70 dark:bg-sky-950/20'
          }`}
        >
          <div className="flex items-start gap-3">
            <span className={`p-2 rounded-xl shrink-0 text-white ${taskFinished ? 'bg-emerald-600' : 'bg-sky-600'}`}>
              {taskFinished ? <CheckCircle2 className="h-5 w-5" /> : <Target className="h-5 w-5" />}
            </span>
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] font-black uppercase tracking-wider ${taskFinished ? 'text-emerald-700 dark:text-emerald-400' : 'text-sky-700 dark:text-sky-400'}`}>
                {taskFinished ? 'Foco concluído' : 'Tarefa deste foco'}
              </p>
              <h2 className="text-sm sm:text-base font-black text-slate-900 dark:text-white leading-snug line-clamp-2">{task.title}</h2>
            </div>
            <button
              type="button"
              id="pomo-close-task-x"
              onClick={clearFocusTask}
              className="p-2 -m-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-white/70 dark:hover:bg-slate-800 shrink-0"
              aria-label="Fechar tarefa"
              title="Fechar tarefa"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {!taskFinished && (
            <>
              {task.steps && task.steps.length > 0 && (
                <ol id="pomo-task-steps" className="mt-3 space-y-1.5">
                  {task.steps.map((s, i) => {
                    const [head, rest] = splitStep(s);
                    return (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                        <span className="mt-px h-5 w-5 shrink-0 rounded-full bg-white dark:bg-slate-900 border border-sky-500/30 text-sky-700 dark:text-sky-300 text-[10px] font-black flex items-center justify-center">
                          {i + 1}
                        </span>
                        <span className="leading-snug">
                          <strong className="text-slate-900 dark:text-white">{head}</strong>
                          {rest && <span>: {rest}</span>}
                        </span>
                      </li>
                    );
                  })}
                </ol>
              )}

              {earlyTip ? (
                <div id="pomo-early-tip" className="mt-3 flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-50 dark:bg-amber-950/25 px-3 py-2.5">
                  <Lightbulb className="h-4 w-4 shrink-0 mt-px text-amber-500" />
                  <div className="text-xs text-amber-900 dark:text-amber-100">
                    <p className="font-bold">Use o tempo que sobrou para revisar de memória o que acabou de fazer.</p>
                    <p className="mt-0.5 text-amber-800/90 dark:text-amber-200/80">Sem consultar: escreva ou fale o que lembra. O relógio continua até o fim do bloco.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEarlyTip(false)}
                    className="p-1 -m-1 rounded text-amber-700 dark:text-amber-300 hover:bg-amber-500/10 shrink-0"
                    aria-label="Fechar dica"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    id="pomo-finished-early"
                    onClick={() => setEarlyTip(true)}
                    className="min-h-[40px] inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-sky-500/40 bg-white dark:bg-slate-900 text-sky-700 dark:text-sky-300 text-xs font-bold hover:bg-sky-50 dark:hover:bg-sky-950/40 transition-colors"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Terminei antes
                  </button>
                  {timer.mode === 'stopwatch' && (
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">No cronômetro livre, aperte "Salvar sessão" ao terminar.</span>
                  )}
                </div>
              )}
            </>
          )}

          {taskFinished && (
            <div className="mt-3 space-y-2.5">
              <p className="text-xs text-slate-700 dark:text-slate-300">
                {isBreak ? 'Primeiro a pausa (aperte "Iniciar pausa" abaixo). Depois, registre o que fez:' : 'Bom trabalho. Agora registre o que fez:'}
              </p>
              {primaryAction && (
                <button
                  type="button"
                  id={primaryAction.id}
                  onClick={primaryAction.run}
                  className="w-full min-h-[48px] flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-black shadow-md shadow-emerald-600/20 transition-colors"
                >
                  {primaryAction.icon}
                  {primaryAction.label}
                </button>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  id="pomo-next-task"
                  onClick={() => openPlannerToday()}
                  className={`min-h-[44px] flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-left text-xs font-bold transition-colors ${
                    primaryAction
                      ? 'border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
                      : 'bg-sky-600 hover:bg-sky-500 text-white'
                  }`}
                >
                  <CalendarCheck className="h-4 w-4 shrink-0" />
                  <span className="min-w-0 flex-1">
                    <span className="block">Próxima tarefa do plano</span>
                    {nextPlanTask && <span className={`block text-[11px] font-medium truncate ${primaryAction ? 'text-slate-500 dark:text-slate-400' : 'text-sky-100'}`}>{nextPlanTask.title}</span>}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </button>
                <button
                  type="button"
                  id="pomo-another-block"
                  onClick={anotherBlock}
                  className="min-h-[44px] flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  <Plus className="h-4 w-4 shrink-0" />
                  Mais um bloco nesta tarefa
                </button>
              </div>
              <button
                type="button"
                id="pomo-close-task"
                onClick={clearFocusTask}
                className="w-full min-h-[40px] text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-xl hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
              >
                Fechar tarefa
              </button>
            </div>
          )}
        </div>
      )}

      {/* Relógio */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50/60 dark:from-slate-900 dark:to-slate-950 p-4 sm:p-8 shadow-lg text-center max-w-2xl mx-auto">
        {/* Formatos */}
        <div id="pomo-presets" className="grid grid-cols-3 gap-2" role="group" aria-label="Formato do foco">
          {presets.map((p) => {
            const active = activePreset === p.id;
            return (
              <button
                key={p.id}
                type="button"
                id={`pomo-preset-${p.id}`}
                onClick={() => applyPreset(p.id)}
                disabled={presetsLocked && !active}
                aria-pressed={active}
                className={`min-h-[56px] rounded-2xl border px-2 py-2 text-left sm:text-center transition-all ${
                  active
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40 ring-1 ring-sky-500/40'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-400 dark:hover:border-sky-700'
                } disabled:opacity-45 disabled:cursor-not-allowed`}
              >
                <span className={`flex items-center gap-1.5 sm:justify-center text-sm font-black ${active ? 'text-sky-700 dark:text-sky-300' : 'text-slate-900 dark:text-white'}`}>
                  <span className={active ? 'text-sky-600 dark:text-sky-400' : 'text-slate-400'}>{p.icon}</span>
                  {p.title}
                </span>
                <span className="block mt-0.5 text-[10px] sm:text-[11px] leading-tight text-slate-600 dark:text-slate-400">{p.hint}</span>
              </button>
            );
          })}
        </div>
        {presetsLocked && lockReason && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">{lockReason}.</p>}
        <button
          type="button"
          id="pomo-edit-blocks"
          onClick={() => openPlannerToday({ routine: true })}
          className="mt-2 min-h-[36px] text-[11px] font-bold text-sky-700 dark:text-sky-400 hover:underline"
        >
          Mudar meus blocos (ex.: 60/10, 45/15)
        </button>

        {/* Alarme do cronômetro livre */}
        {timer.mode === 'stopwatch' && (
          <div id="pomo-free-alarm" className="mt-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-3 text-left">
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <BellRing className="h-3.5 w-3.5" /> Alarme (opcional)
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ALARM_OPTIONS.map((m) => (
                <button
                  key={m ?? 'none'}
                  type="button"
                  onClick={() => setAlarmMin(m)}
                  className={`${chipBase} py-1.5 ${alarmMin === m ? 'bg-sky-600 text-white' : chipOff}`}
                >
                  {m ? formatAlarm(m) : 'Sem alarme'}
                </button>
              ))}
              <form
                className="flex items-center gap-1"
                onSubmit={(e) => {
                  e.preventDefault();
                  const v = Math.round(Number(customAlarm.replace(',', '.')));
                  if (v > 0 && v <= 600) setAlarmMin(v);
                  setCustomAlarm('');
                }}
              >
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={600}
                  value={customAlarm}
                  onChange={(e) => setCustomAlarm(e.target.value)}
                  placeholder="outro"
                  aria-label="Alarme em minutos"
                  className="w-16 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 py-1.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
                />
                <button type="submit" className={`${chipBase} py-1.5 ${chipOff}`}>
                  min
                </button>
              </form>
            </div>
            {alarmMin && !ALARM_OPTIONS.includes(alarmMin) && (
              <p className="mt-1.5 text-[11px] text-slate-600 dark:text-slate-400">Alarme em {formatAlarm(alarmMin)}.</p>
            )}
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Bom para simulado: o tempo corre livre e o site avisa (bipe e notificação) quando passar do tempo.</p>
          </div>
        )}

        {/* Ciclo de estudos em andamento */}
        {cycle && cycleStep && (
          <div id="cycle-progress-panel" className="max-w-lg mx-auto mt-4 p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-left space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  Ciclo de estudos · Etapa {cycle.index + 1} de {cycle.steps.length}
                </p>
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{cycleStep.title}</p>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  {cycle.phase === 'work'
                    ? `Estudo focado de ${cycleStep.workMins} min${cycleStep.breakMins > 0 && cycle.index < cycle.steps.length - 1 ? ` → pausa de ${cycleStep.breakMins} min` : ''}`
                    : `Pausa de ${cycleStep.breakMins} min · ${cycleStep.phoneAllowed ? 'celular permitido' : 'sem celular'}`}
                </p>
                <div id="cycle-phone-badge" className="mt-2 flex items-center gap-1.5 flex-wrap">
                  {cycle.phase === 'work' ? (
                    <>
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black uppercase tracking-wide bg-rose-600 text-white shadow-sm">
                        📵 Sem celular agora
                      </span>
                      {cycleStep.breakMins > 0 && cycle.index < cycle.steps.length - 1 && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            cycleStep.phoneAllowed ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-400' : 'border-rose-500/40 text-rose-700 dark:text-rose-400'
                          }`}
                        >
                          Na pausa: {cycleStep.phoneAllowed ? '📱 com celular' : '📵 sem celular'}
                        </span>
                      )}
                    </>
                  ) : (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black uppercase tracking-wide text-white shadow-sm ${
                        cycleStep.phoneAllowed ? 'bg-emerald-600' : 'bg-rose-600'
                      }`}
                    >
                      {cycleStep.phoneAllowed ? '📱 Pausa com celular' : '📵 Pausa sem celular'}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={stopStudyCycle}
                className="shrink-0 px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-rose-600 hover:border-rose-400 transition-colors"
              >
                Encerrar ciclo
              </button>
            </div>
            <div className="flex gap-1.5">
              {cycle.steps.map((s, i) => (
                <div
                  key={i}
                  title={s.title}
                  className={`h-1.5 flex-1 rounded-full ${
                    i < cycle.index
                      ? 'bg-emerald-500'
                      : i === cycle.index
                        ? cycle.phase === 'break'
                          ? 'bg-emerald-400 animate-pulse'
                          : 'bg-amber-500'
                        : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Dígitos */}
        <div className="relative mt-6 mb-4 py-3">
          {timer.isRunning && (
            <motion.div
              initial={{ scale: 0.95, opacity: 0.3 }}
              animate={{ scale: [0.95, 1.05, 0.95], opacity: [0.2, 0.5, 0.2] }}
              transition={{ repeat: Infinity, duration: 2.5, ease: 'easeInOut' }}
              className={`absolute inset-0 rounded-full blur-xl pointer-events-none ${
                isBreak ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/20 to-emerald-500/20' : 'bg-gradient-to-r from-sky-500/20 via-blue-500/20 to-indigo-500/20'
              }`}
            />
          )}
          <p className={`relative z-10 text-[11px] font-black uppercase tracking-widest ${isBreak ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`}>
            {modeLabel}
          </p>
          <motion.div
            key={timer.isRunning ? 'running' : 'paused'}
            initial={{ scale: 0.98 }}
            animate={{ scale: 1 }}
            className={`font-mono text-6xl sm:text-8xl font-black tracking-tight select-none relative z-10 ${
              alarmPassed ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
            }`}
          >
            {timer.mode === 'stopwatch' ? formatTime(timer.elapsedSeconds) : formatTime(timer.timeLeftSeconds)}
          </motion.div>

          <p className="mt-2 text-xs font-medium flex items-center justify-center gap-1.5 relative z-10 text-slate-600 dark:text-slate-400 px-2">
            {timer.isRunning && !isBreak && <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping inline-block shrink-0" />}
            <span className={timer.isRunning && !isBreak ? 'font-bold text-amber-700 dark:text-amber-400' : ''}>{statusText}</span>
          </p>
          {alarmPassed && (
            <p id="pomo-alarm-passed" className="relative z-10 mt-2 inline-flex items-center gap-1.5 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-bold text-amber-800 dark:text-amber-300">
              <BellRing className="h-3.5 w-3.5" /> Tempo do alarme ({formatAlarm(alarmMin!)}) passou
            </p>
          )}
        </div>

        {/* Controles */}
        <div className="flex items-center justify-center gap-3 sm:gap-4 flex-wrap">
          <button
            id="timer-reset-btn"
            onClick={resetTimer}
            className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
            title="Reiniciar tempo"
            aria-label="Reiniciar tempo"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <button
            id="timer-start-pause-main-btn"
            onClick={timer.isRunning ? pauseTimer : startTimer}
            className={`flex items-center gap-2.5 px-7 sm:px-8 py-4 rounded-2xl text-white font-extrabold text-base shadow-xl transition-all active:scale-95 ${
              timer.isRunning
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                : isBreak
                  ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/20'
                  : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sky-600/20'
            }`}
          >
            {timer.isRunning ? <Pause className="h-5 w-5" /> : isBreak ? <Coffee className="h-5 w-5" /> : <Play className="h-5 w-5 fill-current ml-0.5" />}
            <span>{mainLabel}</span>
          </button>

          {timer.mode === 'stopwatch' && timer.elapsedSeconds >= 60 && (
            <button
              id="pomo-save-free"
              onClick={handleStopwatchFinish}
              className="px-4 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
            >
              Salvar sessão
            </button>
          )}
        </div>

        {/* Disciplina do foco (quando não veio de uma tarefa) */}
        {!task && !cycle && (
          <div className="mt-5 max-w-sm mx-auto text-left">
            <label htmlFor="pomo-subject-select" className="block text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">
              Disciplina deste foco
            </label>
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <select
                id="pomo-subject-select"
                value={timer.selectedSubjectId || ''}
                onChange={(e) => setTimerSubject(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
              >
                <option value="">Estudo geral</option>
                {currentSubjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Pausas manuais */}
        {!task && !cycle && (
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5">
            <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
              <Coffee className="h-3.5 w-3.5" /> Pausa:
            </span>
            {(
              [
                ['short_break', 'timer-mode-short-break', `Curta ${pomodoroSettings.shortBreakMinutes}m`],
                ['medium_break', 'timer-mode-medium-break', `Média ${pomodoroSettings.mediumBreakMinutes}m`],
                ['long_break', 'timer-mode-long-break', `Longa ${pomodoroSettings.longBreakMinutes}m`],
              ] as const
            ).map(([mode, id, label]) => (
              <button
                key={mode}
                id={id}
                type="button"
                onClick={() => setTimerMode(mode)}
                disabled={timer.isRunning}
                className={`${chipBase} py-1.5 disabled:opacity-45 ${timer.mode === mode ? 'bg-emerald-600 text-white' : chipOff}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Som ambiente */}
        <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 mr-1 flex items-center gap-1">
            <Headphones className="h-3.5 w-3.5" /> Som ambiente:
          </span>
          {(
            [
              ['none', 'Mudo'],
              ['rain', '🌧️ Chuva suave'],
              ['whitenoise', '💨 Ruído branco'],
              ['binaural', '🧠 Ondas alfa'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setAmbientSound(id)}
              className={`${chipBase} py-1.5 ${
                ambientSound === id ? (id === 'none' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'bg-sky-600 text-white shadow-xs') : chipOff
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Blocos de foco + dica fixa */}
      <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div id="pomo-focus-count" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Blocos de foco</p>
          <div className="mt-2 flex items-end gap-4">
            <div>
              <p id="pomo-focus-today" className="text-3xl font-black text-slate-900 dark:text-white leading-none">
                {focusToday}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">hoje</p>
            </div>
            <div className="h-10 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <p id="pomo-focus-week" className="text-3xl font-black text-orange-600 dark:text-orange-400 leading-none">
                {focusWeek}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-400">na semana</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1" aria-hidden>
            {Array.from({ length: Math.max(focusToday, Math.min(12, Math.max(4, Math.round(studyPrefs.dailyPomodoros)))) }).map((_, i) => (
              <span key={i} className={`h-2 w-5 rounded-full ${i < focusToday ? 'bg-orange-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
            ))}
          </div>
          <p className="mt-2 text-[11px] text-slate-600 dark:text-slate-400">Conte blocos, não horas: cada bloco cheio de estudo ativo vale mais que horas relendo.</p>
        </div>

        <div id="pomo-tip" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">Para o foco render</p>
          <ul className="mt-2 space-y-2 text-xs text-slate-700 dark:text-slate-300">
            <li className="flex items-start gap-2">
              <Smartphone className="h-4 w-4 shrink-0 text-rose-500" />
              <span>
                <strong className="text-slate-900 dark:text-white">Celular longe</strong>, de preferência em outro cômodo.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Coffee className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>
                <strong className="text-slate-900 dark:text-white">Pausa de verdade:</strong> levante, beba água, olhe para longe.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <Target className="h-4 w-4 shrink-0 text-sky-500" />
              <span>
                <strong className="text-slate-900 dark:text-white">Uma tarefa por bloco</strong>, com técnica ativa (questões, flashcards, explicar em voz alta).
              </span>
            </li>
          </ul>
        </div>
      </div>

      {/* Histórico */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Últimas sessões</h2>
          </div>
          <span className="text-xs text-slate-600 dark:text-slate-400">Total: {studySessions.reduce((acc, s) => acc + s.durationMinutes, 0)} min registrados</span>
        </div>

        {studySessions.length === 0 ? (
          <p className="text-xs text-slate-600 dark:text-slate-400">Nenhuma sessão ainda. Seu primeiro bloco de foco aparece aqui.</p>
        ) : (
          <div className="space-y-2">
            {studySessions.slice(0, 5).map((session) => {
              const sub = subjects.find((s) => s.id === session.subjectId);
              return (
                <div
                  key={session.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub?.color || '#0284c7' }} />
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 dark:text-white truncate">{sub?.name || 'Estudo geral'}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{session.notes || 'Sessão de foco'}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-slate-800 dark:text-slate-200">{session.durationMinutes} min</div>
                    {session.type === 'pomodoro' && <div className="text-[10px] text-orange-600 dark:text-orange-400 font-semibold">1 bloco</div>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <StudyCycleModal
        isOpen={isStudyCycleModalOpen}
        onClose={() => setIsStudyCycleModalOpen(false)}
        subjects={currentSubjects}
        defaultSubjectId={timer.selectedSubjectId}
        onStartCycle={startStudyCycle}
      />

      <PomodoroSettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={pomodoroSettings} onSave={updatePomodoroSettings} />
    </div>
  );
};
