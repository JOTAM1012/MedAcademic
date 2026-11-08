// Guia "Como funciona o Método MedAcademic".
// Aberto por openMethodGuide(step) do contexto: step >= 0 abre o guia completo naquele passo;
// step = -1 abre o modo rápido (3 telas) do 1º acesso. Fechar chama closeMethodGuide (marca como visto).
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, BookOpen, Check, ChevronDown, ChevronLeft, ChevronRight, Sparkles, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ROUTINE_DISCLAIMER } from '../../data/studyMethod';
import { GUIDE_STEPS, type GuideContext } from './GuideSteps';
import { QuickFocusArt, QuickNextStepArt, QuickPriorityArt } from './GuideIllustrations';

const QUICK_SCREENS = [
  {
    id: 'quick-priority',
    kicker: 'Regra de ouro',
    title: 'Revisão vem antes do conteúdo novo',
    text: 'Esquecer é normal. Revisar no dia certo, tentando lembrar antes de olhar, é o que faz o conteúdo ficar. Por isso o seu dia começa pelas revisões.',
    color: '#0ea5e9',
    Art: QuickPriorityArt,
  },
  {
    id: 'quick-next',
    kicker: 'Sem pensar no que fazer',
    title: 'Siga o próximo passo do seu plano',
    text: 'O site monta sozinho o plano de hoje, na ordem certa e do tamanho do seu tempo. Você só segue a lista do Planner › Hoje.',
    color: '#8b5cf6',
    Art: QuickNextStepArt,
  },
  {
    id: 'quick-focus',
    kicker: 'Agora é com você',
    title: 'Aperte Começar e foque',
    text: 'O Pomodoro abre com a tarefa e os passos da técnica. Um bloco de cada vez, com pausa de verdade. Dia ruim? Use o “Dia difícil”.',
    color: '#f97316',
    Art: QuickFocusArt,
  },
];

const clampStep = (n: number) => Math.max(0, Math.min(GUIDE_STEPS.length - 1, Number.isFinite(n) ? n : 0));

export const MethodGuideModal: React.FC = () => {
  const { methodGuide, openMethodGuide, closeMethodGuide, studyPhase, residencyPrep, studyPrefs, setCurrentTab, openReviews, openPlannerToday, requestTour } = useApp();
  const isOpen = methodGuide.open;
  const quick = methodGuide.step === -1;

  const [idx, setIdx] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const bodyRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Sempre começa no passo pedido (e na 1ª tela do modo rápido)
  useEffect(() => {
    if (!isOpen) return;
    setIdx(clampStep(methodGuide.step));
    setQIdx(0);
    setDir(1);
  }, [isOpen, methodGuide.step]);

  // Volta ao topo a cada passo
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [idx, quick]);

  // Foco no painel ao abrir (teclado / leitor de tela)
  useEffect(() => {
    if (isOpen) setTimeout(() => panelRef.current?.focus({ preventScroll: true }), 30);
  }, [isOpen, quick]);

  const close = useCallback(() => closeMethodGuide(), [closeMethodGuide]);

  const goStep = (n: number) => {
    const next = clampStep(n);
    setDir(next >= idx ? 1 : -1);
    setIdx(next);
  };

  const goQuick = (n: number) => {
    const next = Math.max(0, Math.min(QUICK_SCREENS.length - 1, n));
    setDir(next >= qIdx ? 1 : -1);
    setQIdx(next);
  };

  const startNow = () => {
    closeMethodGuide();
    openPlannerToday();
  };

  const goTo: GuideContext['goTo'] = (target) => {
    closeMethodGuide();
    if (target === 'erros') openReviews({ tab: 'erros' });
    else if (target === 'routine') openPlannerToday({ routine: true });
    else if (target === 'calendar') openPlannerToday();
    else setCurrentTab(target);
  };

  // Teclado: Esc fecha, setas navegam
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }
      if (tag === 'SELECT' || tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (quick) goQuick(qIdx + 1);
        else goStep(idx + 1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (quick) goQuick(qIdx - 1);
        else goStep(idx - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quick, idx, qIdx, close]);

  const ctx: GuideContext = { phase: studyPhase, residencyPrep, prefs: studyPrefs, goTo };
  const slide = {
    initial: (d: number) => ({ opacity: 0, x: d * 24 }),
    animate: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: d * -24 }),
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="method-guide-backdrop"
          id="guide-modal"
          className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center bg-slate-950/70 backdrop-blur-sm sm:p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          {quick ? (
            // ------------------------------------------------------------------ modo rápido
            <motion.div
              key="quick"
              ref={panelRef}
              id="guide-quick"
              role="dialog"
              aria-modal="true"
              aria-labelledby="guide-quick-title"
              tabIndex={-1}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full sm:max-w-md max-h-[92dvh] overflow-y-auto overscroll-contain rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 border-b-0 sm:border-b bg-white dark:bg-slate-900 shadow-2xl outline-none"
            >
              <div className="sm:hidden mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-slate-300/70 dark:bg-slate-700" aria-hidden />
              <button
                id="guide-close-btn"
                onClick={close}
                className="absolute top-3 right-3 z-10 h-10 w-10 grid place-items-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="px-5 sm:px-7 pt-4 sm:pt-7">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-300">
                  <Sparkles className="h-3.5 w-3.5" /> Método MedAcademic
                </span>
              </div>

              <AnimatePresence mode="wait" custom={dir} initial={false}>
                {(() => {
                  const s = QUICK_SCREENS[qIdx];
                  return (
                    <motion.div
                      key={s.id}
                      id={`guide-${s.id}`}
                      custom={dir}
                      variants={slide}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.2 }}
                      className="px-5 sm:px-7 pt-3"
                    >
                      <div
                        className="rounded-2xl border p-4 min-h-[180px] flex items-center justify-center"
                        style={{ borderColor: `${s.color}33`, background: `linear-gradient(160deg, ${s.color}17, transparent 70%)` }}
                      >
                        <div className="w-full max-w-[300px]">
                          <s.Art />
                        </div>
                      </div>
                      <p className="mt-4 text-[11px] font-black uppercase tracking-wider ink" style={{ '--ink': s.color } as React.CSSProperties}>
                        {qIdx + 1} de {QUICK_SCREENS.length} · {s.kicker}
                      </p>
                      <h2 id="guide-quick-title" className="mt-1 text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {s.title}
                      </h2>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{s.text}</p>
                    </motion.div>
                  );
                })()}
              </AnimatePresence>

              <div className="px-5 sm:px-7 pt-5 pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))] sm:pb-6">
                <div className="flex items-center justify-center gap-1.5 mb-4">
                  {QUICK_SCREENS.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => goQuick(i)}
                      className="h-6 grid place-items-center px-0.5 cursor-pointer"
                      aria-label={`Tela ${i + 1}`}
                      aria-current={i === qIdx ? 'step' : undefined}
                    >
                      <span className={`block h-2 rounded-full transition-all duration-300 ${i === qIdx ? 'w-7 bg-sky-500' : i < qIdx ? 'w-2 bg-sky-400/60' : 'w-2 bg-slate-300 dark:bg-slate-700'}`} />
                    </button>
                  ))}
                </div>
                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    id="guide-open-full-btn"
                    onClick={() => openMethodGuide(0)}
                    className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl px-4 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                  >
                    <BookOpen className="h-4 w-4" />
                    Ver o guia completo
                  </button>
                  <div className="flex items-center gap-2 sm:ml-auto">
                    {qIdx > 0 && (
                      <button
                        onClick={() => goQuick(qIdx - 1)}
                        className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        aria-label="Tela anterior"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </button>
                    )}
                    {qIdx < QUICK_SCREENS.length - 1 ? (
                      <button
                        id="guide-quick-next-btn"
                        onClick={() => goQuick(qIdx + 1)}
                        className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl px-5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold shadow-md shadow-sky-500/20 transition-colors cursor-pointer"
                      >
                        Próximo
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    ) : (
                      <button
                        id="guide-start-now-btn"
                        onClick={startNow}
                        className="flex-1 sm:flex-none min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl px-5 bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold shadow-md shadow-sky-500/20 transition-colors cursor-pointer"
                      >
                        Começar agora
                        <ArrowRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          ) : (
            // ------------------------------------------------------------------ guia completo
            <motion.div
              key="full"
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="guide-step-title"
              tabIndex={-1}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 30 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
              className="relative w-full sm:max-w-5xl h-[92dvh] sm:h-[min(760px,92dvh)] flex overflow-hidden rounded-t-3xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 border-b-0 sm:border-b bg-white dark:bg-slate-900 shadow-2xl outline-none"
            >
              {/* Índice lateral (computador) */}
              <aside id="guide-toc" className="hidden lg:flex w-64 shrink-0 flex-col border-r border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                <div className="px-5 pt-5 pb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="h-9 w-9 rounded-xl bg-gradient-to-tr from-sky-500 to-blue-600 grid place-items-center shadow-md shadow-sky-500/20">
                      <Sparkles className="h-4 w-4 text-white" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Como funciona</p>
                      <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">Método MedAcademic</p>
                    </div>
                  </div>
                </div>
                <nav className="flex-1 overflow-y-auto px-3 pb-3 space-y-0.5" aria-label="Passos do guia">
                  {GUIDE_STEPS.map((s, i) => {
                    const active = i === idx;
                    return (
                      <button
                        key={s.id}
                        id={`guide-toc-${s.id}`}
                        onClick={() => goStep(i)}
                        aria-current={active ? 'step' : undefined}
                        className={`w-full flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors cursor-pointer ${
                          active ? 'bg-white dark:bg-slate-800 shadow-xs border border-slate-200 dark:border-slate-700' : 'border border-transparent hover:bg-white/70 dark:hover:bg-slate-800/50'
                        }`}
                      >
                        <span
                          className={`h-6 w-6 shrink-0 rounded-lg grid place-items-center text-[11px] font-black ${
                            active ? 'text-white' : i < idx ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                          }`}
                          style={active ? { background: s.color } : undefined}
                        >
                          {i < idx ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
                        </span>
                        <span className={`text-xs leading-snug truncate ${active ? 'font-black text-slate-900 dark:text-white' : 'font-semibold text-slate-600 dark:text-slate-400'}`}>{s.short}</span>
                      </button>
                    );
                  })}
                </nav>
                <p className="px-5 py-4 text-[10.5px] leading-snug text-slate-400 dark:text-slate-500 border-t border-slate-200 dark:border-slate-800">{ROUTINE_DISCLAIMER}</p>
              </aside>

              <div className="flex-1 min-w-0 flex flex-col">
                {/* Cabeçalho */}
                <div className="shrink-0 border-b border-slate-100 dark:border-slate-800 px-4 sm:px-6 pt-2.5 sm:pt-5 pb-3">
                  <div className="sm:hidden mx-auto mb-2 h-1.5 w-10 rounded-full bg-slate-300/70 dark:bg-slate-700" aria-hidden />
                  <div className="flex items-start gap-3">
                    <span className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 rounded-2xl grid place-items-center text-xl" style={{ background: `${GUIDE_STEPS[idx].color}1f` }} aria-hidden>
                      {GUIDE_STEPS[idx].emoji}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-black uppercase tracking-wider ink" style={{ '--ink': GUIDE_STEPS[idx].color } as React.CSSProperties}>
                        Passo {idx + 1} de {GUIDE_STEPS.length}
                      </p>
                      <h2 id="guide-step-title" className="text-lg sm:text-2xl font-black text-slate-900 dark:text-white leading-tight">
                        {GUIDE_STEPS[idx].title}
                      </h2>
                    </div>
                    <button
                      id="guide-close-btn"
                      onClick={close}
                      className="shrink-0 h-10 w-10 grid place-items-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                      aria-label="Fechar o guia"
                      title="Fechar (Esc)"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  {/* Índice (celular/tablet) */}
                  <div className="lg:hidden relative mt-3">
                    <label htmlFor="guide-step-select" className="sr-only">
                      Ir para o passo
                    </label>
                    <select
                      id="guide-step-select"
                      value={idx}
                      onChange={(e) => goStep(Number(e.target.value))}
                      className="w-full min-h-[42px] appearance-none rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/70 pl-3 pr-9 text-sm font-semibold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-500/40 cursor-pointer"
                    >
                      {GUIDE_STEPS.map((s, i) => (
                        <option key={s.id} value={i}>
                          {i + 1}. {s.short}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                </div>

                {/* Conteúdo */}
                <div ref={bodyRef} className="flex-1 overflow-y-auto overscroll-contain px-4 sm:px-6 py-4 sm:py-5">
                  <AnimatePresence mode="wait" custom={dir} initial={false}>
                    <motion.div
                      key={GUIDE_STEPS[idx].id}
                      id={`guide-step-${GUIDE_STEPS[idx].id}`}
                      custom={dir}
                      variants={slide}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                      transition={{ duration: 0.18 }}
                      className="max-w-2xl mx-auto"
                    >
                      {GUIDE_STEPS[idx].render(ctx)}
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Rodapé */}
                <div className="shrink-0 border-t border-slate-100 dark:border-slate-800 px-3 sm:px-6 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] sm:pb-4 flex items-center justify-between gap-2">
                  <button
                    id="guide-prev-btn"
                    onClick={() => goStep(idx - 1)}
                    disabled={idx === 0}
                    className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center gap-1 rounded-xl px-3 text-xs font-bold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-0 disabled:pointer-events-none transition-colors cursor-pointer"
                    aria-label="Passo anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="hidden min-[400px]:inline">Anterior</span>
                  </button>

                  {/* Celular/tablet: só mostra o progresso (o select de passos fica no topo) */}
                  <div className="lg:hidden flex items-center gap-1" aria-hidden="true">
                    {GUIDE_STEPS.map((s, i) => (
                      <span
                        key={s.id}
                        className={`block h-1.5 rounded-full transition-all duration-300 ${
                          i === idx ? 'w-5' : i < idx ? 'w-1.5 bg-sky-400/60' : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                        }`}
                        style={i === idx ? { background: s.color } : undefined}
                      />
                    ))}
                  </div>
                  <div className="hidden lg:flex items-center" role="group" aria-label="Passos">
                    {GUIDE_STEPS.map((s, i) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => goStep(i)}
                        className="min-w-[24px] h-8 px-0.5 grid place-items-center rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                        aria-label={`Passo ${i + 1}: ${s.short}`}
                        aria-current={i === idx ? 'step' : undefined}
                        title={s.short}
                      >
                        <span
                          className={`block h-1.5 sm:h-2 rounded-full transition-all duration-300 ${
                            i === idx ? 'w-5 sm:w-6' : i < idx ? 'w-1.5 sm:w-2 bg-sky-400/60' : 'w-1.5 sm:w-2 bg-slate-300 dark:bg-slate-700'
                          }`}
                          style={i === idx ? { background: s.color } : undefined}
                        />
                      </button>
                    ))}
                  </div>

                  {idx < GUIDE_STEPS.length - 1 ? (
                    <button
                      id="guide-next-btn"
                      onClick={() => goStep(idx + 1)}
                      className="min-h-[44px] inline-flex items-center justify-center gap-1 rounded-xl px-4 bg-sky-600 hover:bg-sky-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-sky-500/20 transition-colors cursor-pointer"
                    >
                      Próximo
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  ) : (
                    <button
                      id="guide-tour-btn"
                      onClick={() => {
                        close();
                        requestTour();
                      }}
                      className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl px-4 border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-500/10 text-xs sm:text-sm font-bold transition-colors cursor-pointer"
                    >
                      Fazer o tour pelo site
                    </button>
                  )}
                  {idx >= GUIDE_STEPS.length - 1 && (
                    <button
                      id="guide-finish-btn"
                      onClick={close}
                      className="min-h-[44px] inline-flex items-center justify-center gap-1.5 rounded-xl px-4 bg-emerald-600 hover:bg-emerald-500 text-white text-xs sm:text-sm font-bold shadow-md shadow-emerald-500/20 transition-colors cursor-pointer"
                    >
                      <Check className="h-4 w-4" strokeWidth={3} />
                      Fechar
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default MethodGuideModal;
