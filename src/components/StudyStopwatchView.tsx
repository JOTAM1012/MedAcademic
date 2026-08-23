import React, { useState, useEffect, useRef } from 'react';
import {
  Timer,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Sparkles,
  BookOpen,
  CheckCircle2,
  Clock,
  Flame,
  Award,
  Music,
  Headphones,
  List,
  Settings,
} from 'lucide-react';
import { useApp } from '../context/AppContext';

import { StudyCycleModal } from './modals/StudyCycleModal';
import { PomodoroSettingsModal } from './modals/PomodoroSettingsModal';

export const StudyStopwatchView: React.FC = () => {
  const {
    timer,
    startTimer,
    pauseTimer,
    resetTimer,
    setTimerMode,
    setTimerSubject,
    subjects,
    topics,
    studySessions,
    logStudySession,
    addXp,
    triggerConfetti,
    pomodoroSettings,
    updatePomodoroSettings,
  } = useApp();

  const [ambientSound, setAmbientSound] = useState<'none' | 'whitenoise' | 'rain' | 'binaural'>('none');
  const [sessionNotes, setSessionNotes] = useState<string>('');
  const [isStudyCycleModalOpen, setIsStudyCycleModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundNodeRef = useRef<any>(null);

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
        // Alpha binaural beats (432Hz + 442Hz = 10Hz Alpha wave for deep focus)
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
      subjectId: timer.selectedSubjectId,
      topicId: timer.selectedTopicId,
      durationMinutes: durationMins,
      type: 'stopwatch',
      notes: sessionNotes || 'Sessão de Cronômetro Livre',
      xpEarned: xp,
    });

    addXp(xp, 'Sessão de Foco Livre');
    triggerConfetti();
    resetTimer();
    setSessionNotes('');
  };

  const selectedSubject = subjects.find((s) => s.id === timer.selectedSubjectId);
  const subjectTopics = topics.filter((t) => t.subjectId === timer.selectedSubjectId);

  const handleSelectCycleStep = (wMins: number, bMins: number, stepName: string) => {
    // We set the work timer first
    setTimerMode('pomodoro', timer.selectedSubjectId, timer.selectedTopicId, wMins * 60);
    // Since we are setting custom times, we don't handle the break automatically yet,
    // the user will manually click break after, or we can just let them use the mode.
    // For now, setting the timer to the work mins is the first step.
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Cronômetro & Pomodoro Médico
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Foco & Horas Líquidas
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Monitore suas sessões de estudo por disciplina e registre automaticamente para o cálculo de metas semanais.
          </p>
        </div>

        {/* Top Action Button: Ciclos de Estudo & Configurações */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            id="open-pomodoro-settings-btn"
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-bold text-xs shadow-md transition-all cursor-pointer"
            title="Configurar Tempos de Foco e Pausas"
          >
            <Settings className="h-4 w-4 text-sky-400" />
            <span>Editar Tempos</span>
          </button>

          <button
            id="open-study-cycle-btn"
            type="button"
            onClick={() => setIsStudyCycleModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 transition-all cursor-pointer transform hover:scale-105"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Ciclos de Estudo</span>
            <span className="px-1.5 py-0.5 rounded-md bg-slate-950/20 text-[10px] uppercase tracking-wider font-extrabold">Novo</span>
          </button>
        </div>
      </div>

      {/* Main Timer Display Card */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-gradient-to-b from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950 p-6 sm:p-10 shadow-lg text-center max-w-2xl mx-auto">
        {/* Mode Selector Tabs */}
        <div className="inline-flex p-1 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-8 max-w-full overflow-x-auto">
          <button
            id="timer-mode-pomodoro"
            onClick={() => setTimerMode('pomodoro')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              timer.mode === 'pomodoro'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Pomodoro ({pomodoroSettings.workMinutes}m)
          </button>
          <button
            id="timer-mode-short-break"
            onClick={() => setTimerMode('short_break')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              timer.mode === 'short_break'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Pausa Curta ({pomodoroSettings.shortBreakMinutes}m)
          </button>
          <button
            id="timer-mode-medium-break"
            onClick={() => setTimerMode('medium_break')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              timer.mode === 'medium_break'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Pausa Média ({pomodoroSettings.mediumBreakMinutes}m)
          </button>
          <button
            id="timer-mode-long-break"
            onClick={() => setTimerMode('long_break')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              timer.mode === 'long_break'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Pausa Longa ({pomodoroSettings.longBreakMinutes}m)
          </button>
          <button
            id="timer-mode-stopwatch"
            onClick={() => setTimerMode('stopwatch')}
            className={`px-3 sm:px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              timer.mode === 'stopwatch'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Cronômetro Livre
          </button>
        </div>

        {/* Subject & Topic Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8 text-left max-w-lg mx-auto">
          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Matéria em Foco
            </label>
            <select
              value={timer.selectedSubjectId || ''}
              onChange={(e) => setTimerSubject(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
              Tópico / Caso (Opcional)
            </label>
            <select
              value={timer.selectedTopicId || ''}
              onChange={(e) => setTimerSubject(timer.selectedSubjectId || '', e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            >
              <option value="">Geral da Matéria</option>
              {subjectTopics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Large Timer Digits */}
        <div className="my-6">
          <div className="font-mono text-6xl sm:text-8xl font-black tracking-tight text-slate-900 dark:text-white select-none">
            {timer.mode === 'stopwatch'
              ? formatTime(timer.elapsedSeconds)
              : formatTime(timer.timeLeftSeconds)}
          </div>

          <p className="mt-2 text-xs font-medium text-slate-400">
            {timer.isRunning
              ? '🔥 Sessão de estudo ativa. Mantenha o foco!'
              : 'Pressione Iniciar para começar a contabilizar suas horas líquidas.'}
          </p>
        </div>

        {/* Primary Controls */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            id="timer-reset-btn"
            onClick={resetTimer}
            className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-105"
            title="Reiniciar tempo"
          >
            <RotateCcw className="h-5 w-5" />
          </button>

          <button
            id="timer-start-pause-main-btn"
            onClick={timer.isRunning ? pauseTimer : startTimer}
            className={`flex items-center gap-2.5 px-8 py-4 rounded-2xl text-white font-extrabold text-base shadow-xl transition-all hover:scale-105 active:scale-95 ${
              timer.isRunning
                ? 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                : 'bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 shadow-sky-600/20'
            }`}
          >
            {timer.isRunning ? (
              <>
                <Pause className="h-5 w-5" />
                <span>Pausar Foco</span>
              </>
            ) : (
              <>
                <Play className="h-5 w-5 fill-current ml-0.5" />
                <span>Iniciar Foco</span>
              </>
            )}
          </button>

          {timer.mode === 'stopwatch' && timer.elapsedSeconds >= 60 && (
            <button
              onClick={handleStopwatchFinish}
              className="px-4 py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md transition-all"
            >
              Salvar Sessão
            </button>
          )}
        </div>

        {/* Ambient Sound Synthesizer Controls */}
        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs font-bold text-slate-400 mr-2 flex items-center gap-1">
            <Headphones className="h-3.5 w-3.5" /> Som Ambiente:
          </span>

          <button
            onClick={() => setAmbientSound('none')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              ambientSound === 'none'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Mudo
          </button>

          <button
            onClick={() => setAmbientSound('rain')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              ambientSound === 'rain'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            🌧️ Chuva Suave
          </button>

          <button
            onClick={() => setAmbientSound('whitenoise')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              ambientSound === 'whitenoise'
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            💨 Ruído Branco
          </button>

          <button
            onClick={() => setAmbientSound('binaural')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              ambientSound === 'binaural'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            🧠 Ondas Alpha (10Hz)
          </button>
        </div>
      </div>

      {/* Recent Study Sessions Table */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <List className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Histórico de Sessões de Estudo
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Total: {studySessions.reduce((acc, s) => acc + s.durationMinutes, 0)} minutos registrados
          </span>
        </div>

        <div className="space-y-2">
          {studySessions.slice(0, 5).map((session) => {
            const sub = subjects.find((s) => s.id === session.subjectId);
            return (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 text-xs"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: sub?.color || '#0284c7' }}
                  />
                  <div>
                    <div className="font-bold text-slate-900 dark:text-white">
                      {sub?.name || 'Estudo Geral'}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {session.notes || 'Sessão de foco acadêmico'}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-mono font-bold text-slate-800 dark:text-slate-200">
                    {session.durationMinutes} min
                  </div>
                  <div className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                    +{session.xpEarned} XP
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Study Cycle Modal */}
      <StudyCycleModal
        isOpen={isStudyCycleModalOpen}
        onClose={() => setIsStudyCycleModalOpen(false)}
        onSelectCycleStep={handleSelectCycleStep}
      />

      {/* Pomodoro Settings Modal */}
      <PomodoroSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={pomodoroSettings}
        onSave={updatePomodoroSettings}
      />
    </div>
  );
};
