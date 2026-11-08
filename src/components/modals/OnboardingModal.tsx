import React, { useEffect, useState } from 'react';
import {
  X,
  Stethoscope,
  Sparkles,
  Repeat,
  Timer,
  GraduationCap,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  BookOpen,
  CalendarDays,
  PlusCircle,
  HelpCircle,
  Smartphone,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { InstallAppGuide } from '../InstallAppGuide';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { triggerConfetti, openMethodGuide } = useApp();
  const [currentStep, setCurrentStep] = useState(0);

  // Ao reabrir, o guia sempre começa do 1º passo
  useEffect(() => {
    if (isOpen) setCurrentStep(0);
  }, [isOpen]);

  if (!isOpen) return null;

  const openFullMethodGuide = () => {
    onClose();
    openMethodGuide(0);
  };

  const steps = [
    {
      title: '1. Visão Geral & Dashboard 📊',
      subtitle: 'Seu centro de comando diário na faculdade de medicina.',
      icon: Stethoscope,
      color: 'bg-sky-500 text-white',
      tag: 'Início',
      description:
        'O Dashboard centraliza tudo o que você precisa: horas estudadas na semana, contagem regressiva para suas próximas provas, sequência diária (streak) de estudos e acesso rápido aos módulos.',
      actionTip: '💡 Dica: O cronômetro superior fica sempre visível para você pausar e retomar a qualquer instante!',
      bulletPoints: [
        'Acompanhe seu progresso em relação à sua meta semanal de horas.',
        'Visualize aulas do dia na sua grade horária integrada.',
        'Monitore o nível de domínio geral de todas as matérias cadastradas.',
      ],
    },
    {
      title: '2. Disciplinas & Grade Curricular 📚',
      subtitle: 'Cadastre suas matérias e acompanhe tópicos por nível de domínio.',
      icon: BookOpen,
      color: 'bg-blue-600 text-white',
      tag: 'Estrutura',
      description:
        'Na aba "Disciplinas", você cadastra as matérias do seu semestre (ex: Cardiologia, Fisiologia, Cirurgia) e adiciona os tópicos de aula com seus respectivos status de aprendizagem.',
      actionTip: '💡 Dica: organize a disciplina em blocos (ex.: Endocrinologia → Diabetes, Tireoide). Quando todos os tópicos do bloco forem vistos, o bloco entra nas Revisões.',
      bulletPoints: [
        'Clique em "+ Nova Disciplina" para definir nome, código e cor da matéria.',
        'Adicione tópicos clínicos específicos (ex: Eletrocardiograma, Choque Séptico).',
        'Fluxo: tópicos vistos → bloco completo → 4 revisões do bloco → Dominado.',
      ],
    },
    {
      title: '3. Repetição Espaçada 🧠',
      subtitle: 'Cada tema volta no dia certo, e você tenta lembrar antes de olhar.',
      icon: Repeat,
      color: 'bg-amber-500 text-white',
      tag: 'Fixação',
      description:
        'Quando você termina de estudar um tema, ele entra nas Revisões. Em cada volta você usa uma técnica de recuperação ativa (nada de só reler):',
      actionTip:
        '💡 Dica: ao terminar cada revisão, diga como foi. Foi mal? A próxima vem mais cedo. Foi bem? O intervalo fica mais longo. Revisões vêm antes do conteúdo novo.',
      bulletPoints: [
        'R1 em 24 h: folha em branco. Escreva tudo o que lembra, sem consultar, e depois confira.',
        'R2 em 7 dias: bloco de questões só desse tema, marcando sua certeza e lendo os comentários.',
        'R3 em 30 dias: questões novas + refazer os erros do caderno de erros.',
        'R4 em diante (60–90 dias e depois a cada poucos meses): questões misturadas com outros temas.',
      ],
    },
    {
      title: '4. Cronômetro & Pomodoro ⏱️',
      subtitle: 'Controle preciso de horas líquidas de estudo com foco total.',
      icon: Timer,
      color: 'bg-emerald-500 text-white',
      tag: 'Produtividade',
      description:
        'Meça o tempo dedicado a cada disciplina com cronômetro livre ou no Pomodoro com o seu bloco (25/5, 50/10, 60/10, 45/15 ou o tempo que você quiser). Inclui gerador de sons ambientes para máxima concentração.',
      actionTip: '💡 Dica: Ao salvar cada sessão de estudos, suas horas são contabilizadas automaticamente!',
      bulletPoints: [
        'Vincule a sessão à matéria correspondente para gerar gráficos de rendimento.',
        'Ative sons de Fundo: Chuva Suave, Cafeteria ou Ondas Alpha Binaurais.',
        'Histórico completo de sessões com data, horário e tempo líquido registrado.',
      ],
    },
    {
      title: '5. Instale no celular 📱',
      subtitle: 'Use o MedAcademic como aplicativo no Android, iPhone ou computador.',
      icon: Smartphone,
      color: 'bg-sky-600 text-white',
      tag: 'Aplicativo',
      description:
        'O MedAcademic pode ser instalado direto pelo navegador, sem loja: ganha ícone na tela inicial, abre em tela cheia, funciona offline e continua sincronizando com a nuvem.',
      actionTip: '💡 Dica: o botão "Instalar app" fica sempre no topo da tela, ao lado de "Ajuda & Tour".',
      bulletPoints: [],
      custom: <InstallAppGuide compact />,
    },
  ];

  const active = steps[currentStep];
  const IconComponent = active.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      triggerConfetti();
      onClose();
    }
  };

  return (
    <div className="app-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="app-modal-panel relative w-full max-w-xl max-h-[92dvh] overflow-y-auto overscroll-contain rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-7 shadow-2xl">
        {/* Topo: passos, contador e fechar na mesma linha */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentStep(idx)}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentStep
                    ? 'w-8 bg-sky-600'
                    : idx < currentStep
                    ? 'w-3 bg-sky-400 dark:bg-sky-700'
                    : 'w-3 bg-slate-200 dark:bg-slate-800'
                }`}
                aria-label={`Ir para passo ${idx + 1}`}
              />
            ))}
          </div>
          <span className="shrink-0 text-xs font-bold text-slate-400 uppercase tracking-wider">
            Guia {currentStep + 1} de {steps.length}
          </span>
          <button
            id="onboarding-close-btn"
            onClick={onClose}
            className="shrink-0 h-10 w-10 grid place-items-center rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
            aria-label="Fechar tutorial"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Header with Icon */}
        <div className="flex items-start gap-4 mb-5">
          <div className={`h-14 w-14 grid place-items-center rounded-2xl ${active.color} shadow-md shrink-0`}>
            <IconComponent className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                {active.tag}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1.5 leading-tight">
              {active.title}
            </h2>
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 mt-1 leading-snug">
              {active.subtitle}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          {active.description}
        </p>

        {/* Bullet Points (ou conteúdo próprio do passo, ex.: guia de instalação) */}
        {'custom' in active && active.custom ? (
          <div className="mb-4">{active.custom}</div>
        ) : (
          <div className="space-y-2.5 mb-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
            {active.bulletPoints.map((bp, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm leading-snug text-slate-700 dark:text-slate-300">
                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                <span>{bp}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Tip */}
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm leading-snug text-amber-700 dark:text-amber-300 font-medium mb-6">
          {active.actionTip}
        </div>

        {/* Guia completo do Método (no passo das revisões e no fim) */}
        {(currentStep === steps.length - 1 || active.tag === 'Fixação') && (
          <button
            id={currentStep === steps.length - 1 ? 'onboarding-method-guide-btn' : 'onboarding-method-guide-link'}
            onClick={openFullMethodGuide}
            className="group w-full mb-6 flex items-center gap-3 rounded-2xl border border-sky-500/30 bg-gradient-to-r from-sky-500/10 to-transparent hover:from-sky-500/15 p-3.5 text-left transition-colors cursor-pointer min-h-[56px]"
          >
            <span className="h-10 w-10 shrink-0 rounded-xl bg-sky-600 text-white grid place-items-center shadow-md shadow-sky-500/20">
              <GraduationCap className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-black text-slate-900 dark:text-white">Ver o guia completo do método</span>
              <span className="block text-[11px] text-slate-500 dark:text-slate-400 leading-snug">
                Curva do esquecimento, revisões, questões, plano do dia e cada fase do curso.
              </span>
            </span>
            <ArrowRight className="h-4 w-4 shrink-0 text-sky-500 group-hover:translate-x-0.5 transition-transform" />
          </button>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
          {currentStep > 0 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Anterior</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="min-h-[44px] px-2 text-sm font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Pular tutorial
            </button>
          )}

          <button
            id="onboarding-next-step-btn"
            onClick={handleNext}
            className="min-h-[44px] inline-flex items-center gap-2 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md transition-colors cursor-pointer"
          >
            <span>{currentStep === steps.length - 1 ? 'Concluir tutorial 🩺' : 'Próximo passo'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

