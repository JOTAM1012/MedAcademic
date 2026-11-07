import React, { useState, useEffect } from 'react';
import { X, Play, RotateCcw, PhoneOff, Smartphone, Coffee, Plus, Trash2, BookOpen, ChevronRight, ChevronDown, Sparkles, BatteryLow, Timer } from 'lucide-react';
import { Subject } from '../../types';
import { StudyCycleStep, useApp } from '../../context/AppContext';
import { useDayPlan } from '../../hooks/useStudyPlan';
import { taskBlocks, type PlanTask } from '../../data/studyMethod';
import { Minus, CalendarCheck, Repeat } from 'lucide-react';

interface StudyCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  defaultSubjectId?: string;
  /** Starts the given steps in sequence, beginning at startIndex */
  onStartCycle: (steps: StudyCycleStep[], startIndex: number, subjectId?: string) => void;
}

export interface CustomCycleStep {
  id: string;
  tag: string;
  workMins: number;
  breakMins: number;
  title: string;
  description: string;
  phoneAllowed: boolean;
  phoneNote: string;
  isCustom?: boolean;
}

const guideStep = (id: string, title: string, workMins: number, breakMins: number, description: string): CustomCycleStep => ({
  id,
  tag: breakMins > 0 ? `${workMins}' - ${breakMins}'` : `${workMins}'`,
  workMins,
  breakMins,
  title,
  description,
  phoneAllowed: false,
  phoneNote: breakMins > 0 ? 'Pausa de verdade: levante, beba água, olhe longe. Sem celular.' : 'Último passo do dia.',
});

/** "Dia típico" do Guia Científico de Estudo (modelo para adaptar, não regra fixa) */
export const GUIDE_TYPICAL_DAY: CustomCycleStep[] = [
  guideStep('g1', 'Flashcards do dia', 25, 5, 'Faça os cartões do dia no Anki ou nos seus flashcards. Comece o dia por aqui.'),
  guideStep('g2', 'Tema novo: pré-teste, mapa e Feynman', 50, 10, 'Tente questões antes de ler, monte o mapa geral do tema e explique de memória em voz alta.'),
  guideStep('g3', 'Tema novo: continuar e fechar lacunas', 25, 5, 'Volte à fonte só nos pontos em que travou e explique de novo.'),
  guideStep('g4', 'Criar flashcards do tema novo', 25, 5, 'Crie cartões só do que você já entendeu.'),
  guideStep('g5', 'Questões das revisões (24 h, 7 e 30 dias)', 25, 5, 'Questões dos temas que vencem hoje, sem consultar. Marque a certeza antes de conferir.'),
  guideStep('g6', 'Questões das revisões: corrigir e anotar erros', 25, 5, 'Leia o comentário de todas as alternativas e anote os erros no caderno.'),
  guideStep('g7', 'Folha em branco do dia', 10, 0, 'Sem consultar, escreva tudo o que aprendeu hoje.'),
];

/** Dia difícil: o mínimo que mantém o ritmo */
export const GUIDE_HARD_DAY: CustomCycleStep[] = [
  guideStep('h1', 'Flashcards do dia', 25, 5, 'Só os cartões do dia. Um passo pequeno ainda conta.'),
  guideStep('h2', 'Revisão mais atrasada', 25, 5, 'Faça a revisão que está há mais tempo esperando (veja em Revisões › Hoje).'),
];

export const DEFAULT_STUDY_CYCLE_STEPS: CustomCycleStep[] = [
  {
    id: '1',
    tag: "60' - 10'",
    workMins: 60,
    breakMins: 10,
    title: '1ª Etapa: Foco Total Inicial',
    description: 'Estude de maneira focada durante 60 minutos e, em seguida, faça uma pausa ativa de 10 minutos (ex.: ir ao banheiro, beber uma água).',
    phoneAllowed: false,
    phoneNote: 'Nessa pausa ativa, você NÃO deve usar o celular.',
  },
  {
    id: '2',
    tag: "45' - 15'",
    workMins: 45,
    breakMins: 15,
    title: '2ª Etapa: Foco Intermediário',
    description: 'Estude de maneira focada durante 45 minutos e, depois, faça uma pausa de 15 minutos.',
    phoneAllowed: true,
    phoneNote: 'Nessa pausa, você pode verificar o seu celular.',
  },
  {
    id: '3',
    tag: "30' - 10'",
    workMins: 30,
    breakMins: 10,
    title: '3ª Etapa: Consolidando o Estudo',
    description: '30 minutos de estudo e uma pausa de 10 minutos.',
    phoneAllowed: false,
    phoneNote: 'Sem o uso do celular.',
  },
  {
    id: '4',
    tag: "30'",
    workMins: 30,
    breakMins: 0,
    title: '4ª Etapa: Bloco Final de Fechamento',
    description: 'Por fim, faça um estudo focado por 30 minutos.',
    phoneAllowed: false,
    phoneNote: 'Sem pausa intermediária.',
  },
];

const toRunStep = (s: CustomCycleStep): StudyCycleStep => ({
  title: s.title,
  workMins: s.workMins,
  breakMins: s.breakMins,
  phoneAllowed: s.phoneAllowed,
});

/** Monta um ciclo com N blocos iguais (o bloco do aluno, ex.: 60/10) */
export const myBlockCycle = (focus: number, rest: number, count: number): CustomCycleStep[] =>
  Array.from({ length: count }, (_, i) => {
    const last = i === count - 1;
    return {
      id: 'my-' + i,
      tag: !last && rest > 0 ? focus + "' - " + rest + "'" : focus + "'",
      workMins: focus,
      breakMins: last ? 0 : rest,
      title: 'Bloco ' + (i + 1) + ' de ' + count,
      description: focus + ' min de foco' + (!last && rest > 0 ? ' e ' + rest + ' min de pausa' : '') + '.',
      phoneAllowed: false,
      phoneNote: last ? 'Último bloco.' : 'Pausa de verdade: levante, beba água, olhe longe.',
    };
  });

/** Transforma as tarefas pendentes do plano de hoje em etapas de ciclo, no bloco de cada tarefa */
export const planCycle = (tasks: PlanTask[]): CustomCycleStep[] => {
  const out: CustomCycleStep[] = [];
  tasks
    .filter((t) => !t.done && !t.skipped && t.kind !== 'weekly_planning')
    .forEach((t) => {
      const n = t.pomodoros > 0 ? taskBlocks(t.pomodoros, t.focus) : 1;
      const work = t.pomodoros > 0 ? t.focus : 10;
      const rest = t.pomodoros > 0 ? t.breakMin ?? 5 : 0;
      for (let k = 0; k < n; k++)
        out.push({
          id: 'plan-' + t.id + '-' + k,
          tag: rest > 0 ? work + "' - " + rest + "'" : work + "'",
          workMins: work,
          breakMins: rest,
          title: n > 1 ? t.title + ' (' + (k + 1) + '/' + n + ')' : t.title,
          description: t.subtitle || t.reason || '',
          phoneAllowed: false,
          phoneNote: 'Pausa de verdade: levante, beba água, olhe longe.',
        });
    });
  if (out.length) {
    const last = out[out.length - 1];
    out[out.length - 1] = { ...last, breakMins: 0, tag: last.workMins + "'" };
  }
  return out;
};

const formatTotal = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}` : `${m} min`;
};

const totalOf = (steps: CustomCycleStep[]) => steps.reduce((acc, s, i) => acc + s.workMins + (i < steps.length - 1 ? s.breakMins : 0), 0);

/** Linha do tempo compacta: estudo → pausa → estudo... */
const Timeline: React.FC<{ steps: CustomCycleStep[]; tone: 'amber' | 'sky' | 'emerald' }> = ({ steps, tone }) => {
  const chip =
    tone === 'sky' ? 'bg-sky-600 text-white' : tone === 'emerald' ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950';
  return (
    <div className="flex items-center flex-wrap gap-1.5">
      {steps.map((step, i) => (
        <React.Fragment key={step.id}>
          <span className={`px-2 py-1 rounded-lg text-[11px] font-black ${chip}`} title={step.title}>
            {step.workMins}'
          </span>
          {step.breakMins > 0 && i < steps.length - 1 && (
            <span
              className={`px-1.5 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 ${
                step.phoneAllowed
                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30'
                  : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title={step.phoneNote}
            >
              <Coffee className="h-3 w-3" />
              {step.breakMins}'
              {step.phoneAllowed && <Smartphone className="h-3 w-3" />}
            </span>
          )}
          {i < steps.length - 1 && <ChevronRight className="h-3 w-3 text-slate-400 dark:text-slate-600" />}
        </React.Fragment>
      ))}
    </div>
  );
};

/** Lista de etapas com "Começar daqui" */
const StepList: React.FC<{ steps: CustomCycleStep[]; onStart: (index: number) => void; numbered?: boolean }> = ({ steps, onStart, numbered }) => (
  <div className="divide-y divide-slate-200 dark:divide-slate-800/80">
    {steps.map((step, i) => (
      <div key={step.id} className="flex items-center justify-between gap-3 py-2.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="shrink-0 w-16 text-center py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[11px] font-black">{step.tag}</span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
              {numbered ? `${i + 1}. ` : ''}
              {step.title}
            </p>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2" title={step.description}>
              {numbered ? step.description : step.phoneNote}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onStart(i)}
          className="shrink-0 flex items-center gap-1 px-3 py-2 rounded-lg border border-amber-500/40 text-amber-800 dark:text-amber-300 hover:bg-amber-500/10 text-[11px] font-bold transition-colors cursor-pointer"
        >
          <Play className="h-3 w-3" />
          {i === 0 ? 'Começar' : 'Daqui'}
        </button>
      </div>
    ))}
  </div>
);

export const StudyCycleModal: React.FC<StudyCycleModalProps> = ({ isOpen, onClose, subjects, defaultSubjectId, onStartCycle }) => {
  const { studyPrefs, openPlannerToday } = useApp();
  const plan = useDayPlan();
  const suggestedCount = Math.min(12, Math.max(1, Math.round((studyPrefs.dailyPomodoros * 25) / studyPrefs.focusMinutes)));
  const [myCount, setMyCount] = useState(suggestedCount);
  const mySteps = myBlockCycle(studyPrefs.focusMinutes, studyPrefs.breakMinutes, myCount);
  const todaySteps = planCycle(plan.tasks);
  const [customSteps, setCustomSteps] = useState<CustomCycleStep[]>(() => {
    try {
      const saved = localStorage.getItem('medacademic_custom_cycles_v1');
      if (saved) return JSON.parse(saved);
    } catch {
      /* sem armazenamento */
    }
    return [];
  });

  const [subjectId, setSubjectId] = useState<string>(defaultSubjectId || '');
  const [isCreating, setIsCreating] = useState(false);
  const [expanded, setExpanded] = useState<'typical' | 'hard' | 'classic' | 'mine' | 'today' | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newWorkMins, setNewWorkMins] = useState(45);
  const [newBreakMins, setNewBreakMins] = useState(10);
  const [newDescription, setNewDescription] = useState('');
  const [newPhoneAllowed, setNewPhoneAllowed] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('medacademic_custom_cycles_v1', JSON.stringify(customSteps));
    } catch {
      /* sem armazenamento */
    }
  }, [customSteps]);

  // Keep the subject in sync with the timer screen each time the modal opens
  useEffect(() => {
    if (isOpen) {
      setSubjectId(defaultSubjectId || '');
      setExpanded(null);
      setMyCount(suggestedCount);
      setNewWorkMins(studyPrefs.focusMinutes);
      setNewBreakMins(studyPrefs.breakMinutes);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const start = (steps: CustomCycleStep[], startIndex: number) => {
    onStartCycle(steps.map(toRunStep), startIndex, subjectId || undefined);
    onClose();
  };

  const handleAddCustomCycle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const tag = newBreakMins > 0 ? `${newWorkMins}' - ${newBreakMins}'` : `${newWorkMins}'`;
    const newStep: CustomCycleStep = {
      id: `custom-${Date.now()}`,
      tag,
      workMins: Number(newWorkMins),
      breakMins: Number(newBreakMins),
      title: newTitle.trim(),
      description: newDescription.trim() || `Sessão de ${newWorkMins} minutos de estudo focado com ${newBreakMins} minutos de pausa.`,
      phoneAllowed: newPhoneAllowed,
      phoneNote: newPhoneAllowed ? 'Celular permitido nesta pausa.' : 'Sem o uso do celular.',
      isCustom: true,
    };

    setCustomSteps([...customSteps, newStep]);
    setIsCreating(false);
    setNewTitle('');
    setNewWorkMins(45);
    setNewBreakMins(10);
    setNewDescription('');
  };

  const handleDeleteCustom = (id: string) => {
    setCustomSteps(customSteps.filter((s) => s.id !== id));
  };

  const guideCycles: Array<{
    key: 'typical' | 'hard';
    id: string;
    title: string;
    hint: string;
    icon: React.ReactNode;
    tone: 'sky' | 'emerald';
    steps: CustomCycleStep[];
  }> = [
    {
      key: 'typical',
      id: 'cycle-guide-typical',
      title: 'Dia típico do guia',
      hint: 'Flashcards → tema novo → criar cartões → questões das revisões → folha em branco.',
      icon: <Sparkles className="h-4 w-4" />,
      tone: 'sky',
      steps: GUIDE_TYPICAL_DAY,
    },
    {
      key: 'hard',
      id: 'cycle-guide-hard',
      title: 'Dia difícil (mínimo)',
      hint: 'Só o essencial para não perder o ritmo: flashcards e a revisão mais atrasada.',
      icon: <BatteryLow className="h-4 w-4" />,
      tone: 'emerald',
      steps: GUIDE_HARD_DAY,
    },
  ];

  const labelCls = 'block text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1';
  const inputCls =
    'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500';

  return (
    <div className="app-modal fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="app-modal-panel relative w-full max-w-2xl rounded-3xl border border-amber-500/30 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-800 dark:text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">Ciclos de Estudo</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400">Estudo e pausas encadeados automaticamente: você só escolhe por onde começar.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. Subject */}
        <section className="space-y-2">
          <h3 className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">1. Disciplina em foco (opcional)</h3>
          <div className="relative">
            <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <select
              id="cycle-subject-select"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 pl-9 pr-3 py-2.5 text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-amber-500"
            >
              <option value="">Estudo geral (várias disciplinas)</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* 2. Com o meu bloco */}
        <section id="cycle-mine-section" className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">2. Com o meu bloco</h3>
            <button
              type="button"
              id="cycle-edit-blocks"
              onClick={() => {
                onClose();
                openPlannerToday({ routine: true });
              }}
              className="min-h-[32px] text-[11px] font-bold text-amber-700 dark:text-amber-400 hover:underline"
            >
              Mudar meu bloco
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {/* Meu bloco em sequência */}
            <div id="cycle-mine" className="rounded-2xl border p-4 space-y-3 flex flex-col border-amber-500/30 bg-amber-500/5">
              <div className="flex items-start gap-2.5">
                <span className="p-2 rounded-xl border shrink-0 text-amber-700 dark:text-amber-300 bg-amber-500/10 border-amber-500/30">
                  <Repeat className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    Meu bloco {studyPrefs.focusMinutes}/{studyPrefs.breakMinutes}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">Blocos iguais em sequência, no tempo que funciona para você.</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="Menos um bloco"
                  onClick={() => setMyCount((c) => Math.max(1, c - 1))}
                  className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-amber-500"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <p id="cycle-mine-count" className="flex-1 text-center text-xs font-bold text-slate-700 dark:text-slate-200">
                  <span className="text-lg font-black text-slate-900 dark:text-white">{myCount}</span> bloco{myCount > 1 ? 's' : ''} · {formatTotal(totalOf(mySteps))}
                </p>
                <button
                  type="button"
                  aria-label="Mais um bloco"
                  onClick={() => setMyCount((c) => Math.min(12, c + 1))}
                  className="h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-amber-500"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <Timeline steps={mySteps} tone="amber" />
              <button
                type="button"
                id="cycle-mine-start"
                onClick={() => start(mySteps, 0)}
                className="mt-auto min-h-[40px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-slate-950" /> Iniciar
              </button>
            </div>

            {/* Plano de hoje como ciclo */}
            <div id="cycle-today" className={`rounded-2xl border p-4 space-y-3 flex flex-col ${expanded === 'today' ? 'sm:col-span-2' : ''} border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60`}>
              <div className="flex items-start gap-2.5">
                <span className="p-2 rounded-xl border shrink-0 text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/30">
                  <CalendarCheck className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white">Meu plano de hoje</p>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">
                    {todaySteps.length > 0
                      ? 'As tarefas que faltam no Planner, na ordem certa, cada uma no seu bloco.'
                      : 'Nada pendente no plano de hoje. Use o seu bloco ao lado.'}
                  </p>
                  {todaySteps.length > 0 && (
                    <p className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Timer className="h-3 w-3" /> {todaySteps.length} blocos · {formatTotal(totalOf(todaySteps))}
                    </p>
                  )}
                </div>
              </div>
              {todaySteps.length > 0 && (
                <>
                  <Timeline steps={todaySteps} tone="sky" />
                  <div className="flex gap-2 mt-auto">
                    <button
                      type="button"
                      id="cycle-today-start"
                      onClick={() => start(todaySteps, 0)}
                      className="flex-1 min-h-[40px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs shadow-md transition-all cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Iniciar
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpanded(expanded === 'today' ? null : 'today')}
                      aria-expanded={expanded === 'today'}
                      className="min-h-[40px] flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Etapas <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded === 'today' ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {expanded === 'today' && <StepList steps={todaySteps} onStart={(i) => start(todaySteps, i)} numbered />}
                </>
              )}
            </div>
          </div>
        </section>

        {/* 3. Guide cycles */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">3. Prontos do guia</h3>
            <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">Modelos para adaptar, não regras fixas</span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {guideCycles.map((g) => {
              const accent = g.tone === 'sky' ? 'text-sky-700 dark:text-sky-300 bg-sky-500/10 border-sky-500/30' : 'text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 border-emerald-500/30';
              const btn = g.tone === 'sky' ? 'bg-sky-600 hover:bg-sky-500' : 'bg-emerald-600 hover:bg-emerald-500';
              const open = expanded === g.key;
              return (
                <div key={g.key} id={g.id} className={`rounded-2xl border p-4 space-y-3 flex flex-col ${open ? 'sm:col-span-2' : ''} border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60`}>
                  <div className="flex items-start gap-2.5">
                    <span className={`p-2 rounded-xl border shrink-0 ${accent}`}>{g.icon}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-slate-900 dark:text-white">{g.title}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-snug">{g.hint}</p>
                      <p className="mt-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Timer className="h-3 w-3" /> {g.steps.length} blocos · {formatTotal(totalOf(g.steps))}
                      </p>
                    </div>
                  </div>
                  <Timeline steps={g.steps} tone={g.tone} />
                  <div className="flex gap-2 mt-auto">
                    <button
                      type="button"
                      id={`${g.id}-start`}
                      onClick={() => start(g.steps, 0)}
                      className={`flex-1 min-h-[40px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-black text-xs shadow-md transition-all cursor-pointer ${btn}`}
                    >
                      <Play className="h-3.5 w-3.5 fill-current" /> Iniciar
                    </button>
                    <button
                      type="button"
                      onClick={() => setExpanded(open ? null : g.key)}
                      aria-expanded={open}
                      className="min-h-[40px] flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      Etapas <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                  </div>
                  {open && <StepList steps={g.steps} onStart={(i) => start(g.steps, i)} numbered />}
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 px-1">
            Encha cada bloco com uma tarefa ativa (questões, flashcards, explicar em voz alta) e conte blocos, não horas.
          </p>
        </section>

        {/* 3. Classic cycle */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">
            4. Ciclo clássico · {DEFAULT_STUDY_CYCLE_STEPS.length} etapas · {formatTotal(totalOf(DEFAULT_STUDY_CYCLE_STEPS))}
          </h3>

          <div className="rounded-2xl border border-amber-500/30 bg-slate-50 dark:bg-slate-950/80 p-4 space-y-4">
            <Timeline steps={DEFAULT_STUDY_CYCLE_STEPS} tone="amber" />
            <div className="flex gap-2">
              <button
                type="button"
                id="cycle-start-full-btn"
                onClick={() => start(DEFAULT_STUDY_CYCLE_STEPS, 0)}
                className="flex-1 min-h-[40px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-md transition-all cursor-pointer"
              >
                <Play className="h-3.5 w-3.5 fill-slate-950" />
                <span>Iniciar ciclo completo</span>
              </button>
              <button
                type="button"
                onClick={() => setExpanded(expanded === 'classic' ? null : 'classic')}
                aria-expanded={expanded === 'classic'}
                className="min-h-[40px] flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Etapas <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded === 'classic' ? 'rotate-180' : ''}`} />
              </button>
            </div>
            {expanded === 'classic' && <StepList steps={DEFAULT_STUDY_CYCLE_STEPS} onStart={(i) => start(DEFAULT_STUDY_CYCLE_STEPS, i)} />}
          </div>
        </section>

        {/* 4. Custom cycles */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[11px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-wider">5. Meus ciclos personalizados</h3>
            <button
              type="button"
              onClick={() => setIsCreating(!isCreating)}
              className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-900 dark:text-white transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
              {isCreating ? 'Cancelar' : 'Criar ciclo'}
            </button>
          </div>

          {isCreating && (
            <form onSubmit={handleAddCustomCycle} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-amber-500/30 space-y-3 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className={labelCls}>Nome do ciclo</label>
                  <input type="text" required placeholder="Ex: Bloco de questões de cardio" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Estudo (min)</label>
                  <input type="number" min={1} max={300} required value={newWorkMins} onChange={(e) => setNewWorkMins(Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Pausa (min)</label>
                  <input type="number" min={0} max={120} required value={newBreakMins} onChange={(e) => setNewBreakMins(Number(e.target.value))} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Celular na pausa</label>
                  <select value={newPhoneAllowed ? 'true' : 'false'} onChange={(e) => setNewPhoneAllowed(e.target.value === 'true')} className={inputCls}>
                    <option value="false">Proibido</option>
                    <option value="true">Permitido</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className={labelCls}>Descrição (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Questões de provas passadas, corrigindo pelos comentários."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className={`${inputCls} font-medium`}
                  />
                </div>
              </div>
              <div className="app-modal-footer flex justify-end">
                <button type="submit" className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md">
                  Salvar ciclo
                </button>
              </div>
            </form>
          )}

          {customSteps.length === 0 && !isCreating ? (
            <p className="text-xs text-slate-600 dark:text-slate-400 px-1">Nenhum ciclo personalizado ainda.</p>
          ) : (
            <div className="space-y-2">
              {customSteps.map((step) => (
                <div key={step.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 w-16 text-center py-1 rounded-lg bg-amber-500/15 text-amber-800 dark:text-amber-300 text-[11px] font-black">{step.tag}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{step.title}</p>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 truncate">{step.description}</p>
                      {step.breakMins > 0 && (
                        <span
                          className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            step.phoneAllowed ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/15 text-rose-700 dark:text-rose-300'
                          }`}
                        >
                          {step.phoneAllowed ? <Smartphone className="h-3 w-3" /> : <PhoneOff className="h-3 w-3" />}
                          {step.phoneAllowed ? 'Pausa com celular' : 'Pausa sem celular'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteCustom(step.id)}
                      className="p-2.5 rounded-lg text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Excluir ciclo"
                      aria-label="Excluir ciclo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => start([step], 0)}
                      className="flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black transition-colors cursor-pointer"
                    >
                      <Play className="h-3 w-3 fill-slate-950" />
                      Iniciar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
