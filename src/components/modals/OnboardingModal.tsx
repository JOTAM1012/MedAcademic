import React, { useState } from 'react';
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
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
  const { addXp, triggerConfetti, setCurrentTab } = useApp();
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

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
      actionTip: '💡 Dica: Ao marcar um tópico como "Dominado", você ganha +20 XP no seu perfil médico!',
      bulletPoints: [
        'Clique em "+ Nova Disciplina" para definir nome, código e cor da matéria.',
        'Adicione tópicos clínicos específicos (ex: Eletrocardiograma, Choque Séptico).',
        'Alterne entre "Não Iniciado", "Em Estudo" e "Dominado" para acompanhar seu domínio real.',
      ],
    },
    {
      title: '3. Repetição Espaçada 🧠',
      subtitle: 'Método SM-2 para nunca mais esquecer condutas e critérios.',
      icon: Repeat,
      color: 'bg-amber-500 text-white',
      tag: 'Fixação',
      description:
        'Crie ciclos de repetição espaçada para os tópicos de estudo. O algoritmo SM-2 agenda a próxima revisão conforme sua facilidade em relembrar a matéria.',
      actionTip: '💡 Dica: Estude os tópicos e anexe imagens/esquemas.',
      bulletPoints: [
        'Avalie cada tópico revisado.',
        'Filtre tópicos por disciplina ou estude tudo o que está agendado para hoje.',
      ],
    },
    {
      title: '4. Cronômetro & Pomodoro ⏱️',
      subtitle: 'Controle preciso de horas líquidas de estudo com foco total.',
      icon: Timer,
      color: 'bg-emerald-500 text-white',
      tag: 'Produtividade',
      description:
        'Meça o tempo dedicado a cada disciplina com cronômetro livre ou nos modos Pomodoro (25/5 min ou 50/10 min). Inclui gerador de sons ambientes para máxima concentração.',
      actionTip: '💡 Dica: Ao salvar cada sessão de estudos, suas horas e XP são contabilizados automaticamente!',
      bulletPoints: [
        'Vincule a sessão à matéria correspondente para gerar gráficos de rendimento.',
        'Ative sons de Fundo: Chuva Suave, Cafeteria ou Ondas Alpha Binaurais.',
        'Histórico completo de sessões com data, horário e tempo líquido registrado.',
      ],
    },
  ];

  const active = steps[currentStep];
  const IconComponent = active.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      addXp(100, 'Tutorial Concluído com Sucesso');
      triggerConfetti();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-xl rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-2xl overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-slate-100 dark:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Fechar tutorial"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Step Indicator Header */}
        <div className="flex items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-1.5">
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
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Guia {currentStep + 1} de {steps.length}
          </span>
        </div>

        {/* Header with Icon */}
        <div className="flex items-start gap-4 mb-4">
          <div className={`p-3.5 rounded-2xl ${active.color} shadow-md shrink-0`}>
            <IconComponent className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/20">
                {active.tag}
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white mt-1">
              {active.title}
            </h2>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-0.5">
              {active.subtitle}
            </p>
          </div>
        </div>

        {/* Description */}
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-4">
          {active.description}
        </p>

        {/* Bullet Points */}
        <div className="space-y-2 mb-4 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/80">
          {active.bulletPoints.map((bp, i) => (
            <div key={i} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
              <span>{bp}</span>
            </div>
          ))}
        </div>

        {/* Action Tip */}
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium mb-6">
          {active.actionTip}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
          {currentStep > 0 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Anterior</span>
            </button>
          ) : (
            <button
              onClick={onClose}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              Pular Tutorial
            </button>
          )}

          <button
            id="onboarding-next-step-btn"
            onClick={handleNext}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-md transition-all hover:scale-102 cursor-pointer"
          >
            <span>{currentStep === steps.length - 1 ? 'Concluir Tutorial (+100 XP) 🩺' : 'Próximo Passo'}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

