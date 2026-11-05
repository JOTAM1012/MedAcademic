import React, { useState, useEffect, useCallback, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  ChevronRight,
  ChevronLeft,
  X,
  CheckCircle2,
  HelpCircle,
  LayoutDashboard,
  Brain,
  Timer,
  GraduationCap,
  Smartphone,
  Compass,
  Zap,
  Cloud,
  BookOpen,
} from 'lucide-react';

export interface TourStep {
  id: string;
  targetSelector: string; // CSS Selector for highlighting target element
  /** alvo no celular/tablet (menu lateral fica escondido abaixo de 1024px) */
  mobileTargetSelector?: string;
  /** texto alternativo para celular/tablet */
  mobileDescription?: string;
  title: string;
  description: string;
  badgeText?: string;
  icon?: React.ReactNode;
  tabToNavigate?: string; // Optional tab to open when this step becomes active
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface GuidedTourProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tab: string) => void;
  currentTab?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetSelector: '#tour-welcome',
    title: 'Bem-vindo ao MedAcademic!',
    description: 'Sua plataforma para organizar a vida acadêmica e os estudos. Faça este tour rápido para conhecer as principais ferramentas.',
    badgeText: 'Introdução 🚀',
    icon: <Sparkles className="w-5 h-5 text-amber-400" />,
    position: 'center',
  },
  {
    id: 'sidebar',
    targetSelector: '#tour-sidebar',
    mobileTargetSelector: '#mobile-tab-bar',
    title: 'Navegação principal',
    description:
      'Acesse o Dashboard, o Planner, a Grade do Semestre (provas e notas), a Grade de Horários, as Disciplinas, as Revisões, o Pomodoro, o Checklist e o Perfil.',
    mobileDescription:
      'Use a barra de abas aqui embaixo: Início, Planner, Revisões e Pomodoro. Em “Mais” estão a Grade do Semestre (provas e notas), a Grade de Horários, as Disciplinas, o Checklist e o Perfil.',
    badgeText: 'Navegação 📍',
    icon: <Compass className="w-5 h-5 text-cyan-400" />,
    position: 'right',
  },
  {
    id: 'dashboard',
    targetSelector: '#tour-dashboard',
    title: 'Acompanhe seu desempenho',
    description: 'Veja suas horas de estudo, a taxa de acertos nas revisões, sua sequência de dias de estudo e os gráficos da sua evolução.',
    badgeText: 'Desempenho 📊',
    icon: <LayoutDashboard className="w-5 h-5 text-emerald-400" />,
    tabToNavigate: 'dashboard',
    position: 'bottom',
  },
  {
    id: 'spaced-repetition',
    targetSelector: '#tour-spaced-repetition',
    title: 'Revisão espaçada',
    description:
      'Agende e acompanhe suas revisões com o método de repetição espaçada. Ao retomar os conteúdos em intervalos planejados, você fortalece a retenção e apoia sua aprendizagem.',
    badgeText: 'Revisões 🧠',
    icon: <Brain className="w-5 h-5 text-violet-400" />,
    tabToNavigate: 'spaced_repetition',
    position: 'bottom',
  },
  {
    id: 'sync',
    targetSelector: '#topbar-cloud-sync-btn',
    title: 'Sincronização dos dados',
    description: 'Seus dados ficam salvos no dispositivo e são sincronizados com a nuvem em tempo real.',
    badgeText: 'Sincronização ☁️',
    icon: <Cloud className="w-5 h-5 text-blue-400" />,
    position: 'bottom',
  },
  {
    id: 'install',
    targetSelector: '#topbar-install-btn',
    title: 'Instale no celular',
    description:
      'Toque em “Instalar app” para adicionar o MedAcademic à tela inicial e usá-lo em tela cheia, inclusive offline. A instalação está disponível para Android e iOS.',
    badgeText: 'Aplicativo 📲',
    icon: <Smartphone className="w-5 h-5 text-sky-400" />,
    position: 'bottom',
  },
  {
    id: 'how-to-use',
    targetSelector: '#dashboard-how-to-use-btn, #dashboard-tutorial-btn',
    title: 'Como usar a plataforma',
    description:
      'Este botão no Dashboard abre o guia “Como Usar a Plataforma”, que explica passo a passo como funciona cada ferramenta. Volte a ele sempre que tiver dúvida. Na primeira vez, ele abre sozinho logo depois deste tour (dá para pular).',
    badgeText: 'Guia das ferramentas 📘',
    icon: <BookOpen className="w-5 h-5 text-sky-400" />,
    tabToNavigate: 'dashboard',
    position: 'bottom',
  },
];

export const GuidedTour: React.FC<GuidedTourProps> = ({
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  const currentStep = TOUR_STEPS[currentStepIndex];

  // Update rect position for highlight spotlight
  const updateTargetPosition = useCallback(() => {
    if (!isOpen || !currentStep) return;

    if (currentStep.position === 'center' || currentStep.targetSelector === '#tour-welcome') {
      setTargetRect(null);
      return;
    }

    const narrow = window.innerWidth < 1024;
    const selector = narrow && currentStep.mobileTargetSelector ? currentStep.mobileTargetSelector : currentStep.targetSelector;
    const el = document.querySelector(selector);
    const rect = el?.getBoundingClientRect();
    // elemento escondido (ex.: botão de instalar quando o app já está instalado) → cartão no centro
    setTargetRect(rect && rect.width > 0 && rect.height > 0 ? rect : null);
  }, [isOpen, currentStep]);

  // Navigate tab if step specifies one
  useEffect(() => {
    if (isOpen && currentStep && currentStep.tabToNavigate && onNavigateTab) {
      onNavigateTab(currentStep.tabToNavigate);
    }
  }, [isOpen, currentStepIndex, currentStep, onNavigateTab]);

  // Handle position recalculation & listeners
  useLayoutEffect(() => {
    if (!isOpen) return;

    // Small delay to allow tab transitions/DOM rendering
    const timer = setTimeout(() => {
      updateTargetPosition();
    }, 150);

    window.addEventListener('resize', updateTargetPosition);
    window.addEventListener('scroll', updateTargetPosition, true);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updateTargetPosition);
      window.removeEventListener('scroll', updateTargetPosition, true);
    };
  }, [isOpen, currentStepIndex, updateTargetPosition]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowRight' || e.key === 'Space') {
        e.preventDefault();
        handleNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentStepIndex]);

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
    }
  };

  if (!isOpen) return null;

  // Calculate tooltip popover coordinates
  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect || currentStep.position === 'center') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        position: 'fixed',
      };
    }

    const padding = 16;
    const isMobile = window.innerWidth < 768;

    if (isMobile) {
      return {
        bottom: '24px',
        left: '16px',
        right: '16px',
        position: 'fixed',
        margin: '0 auto',
        maxWidth: 'calc(100vw - 32px)',
      };
    }

    const pos = currentStep.position || 'bottom';
    let top = 0;
    let left = 0;

    switch (pos) {
      case 'bottom':
        top = targetRect.bottom + padding;
        left = targetRect.left + targetRect.width / 2 - 200;
        break;
      case 'top':
        top = targetRect.top - 240 - padding;
        left = targetRect.left + targetRect.width / 2 - 200;
        break;
      case 'right':
        top = Math.max(20, targetRect.top + targetRect.height / 2 - 110);
        left = targetRect.right + padding;
        break;
      case 'left':
        top = Math.max(20, targetRect.top + targetRect.height / 2 - 110);
        left = targetRect.left - 420 - padding;
        break;
    }

    // Keep within viewport boundaries
    left = Math.max(16, Math.min(left, window.innerWidth - 424));
    top = Math.max(16, Math.min(top, window.innerHeight - 260));

    return {
      top: `${top}px`,
      left: `${left}px`,
      position: 'fixed',
    };
  };

  return (
    <AnimatePresence>
      <div className="aria-modal-tour fixed inset-0 z-[99999] overflow-hidden pointer-events-auto">
        {/* Darkened Backdrop Overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-slate-950/60 pointer-events-none transition-opacity duration-300"
          onClick={onClose}
        />

        {/* Highlight Spotlight Hole around Target Element */}
        {targetRect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{
              opacity: 1,
              scale: 1,
              top: targetRect.top - 6,
              left: targetRect.left - 6,
              width: targetRect.width + 12,
              height: targetRect.height + 12,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute rounded-xl ring-4 ring-cyan-500/80 shadow-[0_0_35px_rgba(6,182,212,0.5)] bg-transparent pointer-events-none z-[100000]"
          >
            <div className="absolute -inset-1 rounded-xl bg-cyan-400/10 animate-pulse pointer-events-none" />
          </motion.div>
        )}

        {/* Guided Tooltip Box */}
        <motion.div
          key={currentStep.id}
          initial={{ opacity: 0, y: 12, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -12, scale: 0.96 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          style={getTooltipStyle()}
          className="z-[100001] w-full max-w-[420px] bg-slate-900/95 border border-slate-700/80 rounded-2xl p-5 md:p-6 shadow-2xl backdrop-blur-xl text-slate-100 flex flex-col justify-between gap-4"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-slate-800/90 border border-slate-700/60 shadow-inner">
                {currentStep.icon || <Sparkles className="w-5 h-5 text-cyan-400" />}
              </div>
              <div>
                <span className="inline-block text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 mb-0.5">
                  {currentStep.badgeText || `Etapa ${currentStepIndex + 1} de ${TOUR_STEPS.length}`}
                </span>
                <h3 className="text-base md:text-lg font-bold text-white tracking-tight leading-snug">
                  {currentStep.title}
                </h3>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Fechar tour (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Description */}
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-normal">
            {typeof window !== "undefined" && window.innerWidth < 1024 && currentStep.mobileDescription ? currentStep.mobileDescription : currentStep.description}
          </p>

          {/* Progress & Controls */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentStepIndex(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex
                      ? 'w-6 bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.6)]'
                      : 'w-1.5 bg-slate-700 hover:bg-slate-600'
                  }`}
                  title={`Ir para etapa ${idx + 1}`}
                />
              ))}
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Anterior
                </button>
              )}

              <button
                onClick={handleNext}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold text-slate-950 bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-400 hover:from-cyan-300 hover:to-blue-300 shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5 active:scale-95"
              >
                {currentStepIndex === TOUR_STEPS.length - 1 ? (
                  <>
                    Concluir Tour
                    <CheckCircle2 className="w-3.5 h-3.5 text-slate-950" />
                  </>
                ) : (
                  <>
                    Próximo
                    <ChevronRight className="w-3.5 h-3.5 text-slate-950" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
