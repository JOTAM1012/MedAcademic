// Método MedAcademic — o Guia Científico de Estudo transformado em regras do site.
// Fonte única de: técnica de cada revisão, caderno de erros, fase do curso, preferências da rotina,
// fila de revisões, plano do dia (o que estudar hoje, em que ordem e quanto cabe), carga da semana,
// estudos pessoais e checklist diário. Tudo aqui é função pura: as telas chamam com os dados do
// contexto (useApp) e mostram o resultado. Datas sempre YYYY-MM-DD locais (ymd/parseYMD).
import type {
  Certainty,
  DayPlanState,
  ErrorNote,
  ErrorType,
  Exam,
  PersonalProject,
  PersonalProjectItem,
  PersonalProjectKind,
  QuestionLog,
  ReviewTechniqueId,
  ScheduleClass,
  Semester,
  StudyMethodState,
  StudyPlanPrefs,
  ExamShift,
  TurnState,
  TurnMethod,
  StudySession,
  Subject,
  SubjectFormat,
  Topic,
  TopicBlock,
  TopicDifficulty,
  UserProfile,
} from '../types';
import { addDaysYMD, daysBetween, isBlockDue, isTopicSeen, nextIntervalDays, overdueDays, parseYMD, scheduleReviewDate, ymd } from './blockReview';
import { cycleOfSemester, type CycleId } from './subjectFormats';
import { examDisplayTitle, getActivityCategory, occursOn } from './planning';
import { EXAM_TASKS, examProgress, examReminderText, examReminderToday, nextExamStep } from './examTopics';

// ---------------------------------------------------------------------------------------------
// Técnicas de cada etapa (recuperação ativa)
// ---------------------------------------------------------------------------------------------
export interface TechniqueInfo {
  id: ReviewTechniqueId;
  label: string; // "Folha em branco + flashcards"
  short: string; // "Folha em branco"
  emoji: string;
  color: string;
  when: string; // "24 h depois"
  why: string;
  steps: string[];
  /** Blocos de 25 min sugeridos */
  pomodoros: number;
  /** Nº de questões sugerido (modelo para adaptar, não regra fixa) */
  questions?: number;
}

export const TECHNIQUES: Record<ReviewTechniqueId, TechniqueInfo> = {
  estudo_inicial: {
    id: 'estudo_inicial',
    label: 'Estudo inicial do tema',
    short: 'Estudo inicial',
    emoji: '🌱',
    color: '#10b981',
    when: 'Dia 0',
    why: 'Primeiro entender, depois memorizar. Errar no pré-teste é normal e ajuda a aprender.',
    steps: [
      'Pré-teste: tente 3 a 5 questões do tema antes de estudar (errar é normal)',
      'Mapa geral: escreva as grandes partes do tema e o que precisa saber antes',
      'Feynman: explique de memória, em voz alta, e marque onde travou',
      'Flashcards: crie cartões só dos pontos que você já entendeu',
      'Questões do tema, lendo o comentário de todas as alternativas',
      'Anote os erros no caderno: tipo do erro e a regra em 1 linha',
    ],
    pomodoros: 3,
  },
  folha_branco: {
    id: 'folha_branco',
    label: 'Folha em branco + flashcards',
    short: 'Folha em branco',
    emoji: '📝',
    color: '#0ea5e9',
    when: '24 h depois',
    why: 'A 1ª revisão é a mais valiosa: a maior perda de memória acontece nas primeiras horas.',
    steps: [
      'Sem consultar nada, escreva ou desenhe tudo o que lembra do tema',
      'Confira com o material e complete com outra cor o que faltou',
      'Transforme o que você esqueceu em flashcards e faça os cartões novos',
    ],
    pomodoros: 1,
  },
  questoes_tema: {
    id: 'questoes_tema',
    label: 'Bloco de questões do tema',
    short: 'Questões do tema',
    emoji: '🎯',
    color: '#8b5cf6',
    when: '7 dias depois',
    why: 'Tentar lembrar fortalece a memória. Quem se testa lembra muito mais do que quem relê.',
    steps: [
      'Faça um bloco de questões só deste tema, sem consultar',
      'Marque sua certeza antes de conferir: chute, dúvida ou certeza',
      'Leia o comentário de todas as alternativas, até das que acertou',
      'Classifique cada erro e anote no caderno de erros',
    ],
    pomodoros: 2,
    questions: 20,
  },
  questoes_novas: {
    id: 'questoes_novas',
    label: 'Questões novas + caderno de erros',
    short: 'Questões novas',
    emoji: '📒',
    color: '#f59e0b',
    when: '30 dias depois',
    why: 'Questões novas testam a retenção real. Erro corrigido uma vez ainda precisa voltar.',
    steps: [
      'Faça questões novas do tema (que você ainda não viu)',
      'Refaça os erros do caderno deste tema',
      'Tente responder cada regra anotada antes de olhar',
    ],
    pomodoros: 2,
    questions: 20,
  },
  misturadas: {
    id: 'misturadas',
    label: 'Questões misturadas (intercalação)',
    short: 'Misturadas',
    emoji: '🔀',
    color: '#ec4899',
    when: '60–90 dias e depois a cada poucos meses',
    why: 'Misturar temas treina escolher a estratégia certa, como na prova e no plantão.',
    steps: [
      'Faça questões deste tema misturadas com outros temas que você já tem base',
      'Compare diagnósticos diferenciais lado a lado',
      'Erros novos voltam para o caderno de erros',
    ],
    pomodoros: 1,
    questions: 15,
  },
};

// ---------- Meu método: passos do 1º e do 2º contato (o aluno pode trocar pelos dele)
export const METHOD_PRESETS: Array<{ id: string; label: string; hint: string; first: string[]; second: string[] }> = [
  { id: 'guia', label: 'Padrão do guia', hint: 'Pré-teste, mapa, Feynman, questões', first: TECHNIQUES.estudo_inicial.steps, second: TECHNIQUES.folha_branco.steps },
  {
    id: 'video',
    label: 'Videoaula + resumo + questões',
    hint: 'Pré-teste, aula, resumo, 30 questões',
    first: [
      'Pré-teste: faça 3 a 5 questões do tema antes de começar (errar é normal)',
      'Videoaula: assista à aula do tema',
      'Resumo: faça o seu resumo do tema',
      'Questões: faça 30 questões do tema',
      'Erros: corrija cada erro, lendo o comentário, e anote no caderno de erros',
    ],
    second: [
      'Leia o seu resumo em voz alta',
      'Folha em branco: sem consultar, escreva tudo o que lembra do tema',
      'Questões: faça 10 a 20 questões do tema',
      'Erros: corrija os erros e anote no caderno',
    ],
  },
];
const cleanSteps = (list?: string[]) => (list || []).map((x) => x.trim()).filter(Boolean);
/** Passos do 1º contato (tema novo): os do aluno ou o padrão do guia */
export const firstContactSteps = (prefs?: Pick<StudyPlanPrefs, 'firstContactSteps'>) => {
  const own = cleanSteps(prefs?.firstContactSteps);
  return own.length ? own : TECHNIQUES.estudo_inicial.steps;
};
/** Passos do 2º contato (1ª revisão): os do aluno, se houver; senão os da técnica */
export const secondContactSteps = (prefs: Pick<StudyPlanPrefs, 'secondContactSteps'> | undefined, fallback: string[]) => {
  const own = cleanSteps(prefs?.secondContactSteps);
  return own.length ? own : fallback;
};

/** Etapa (técnica) da revisão nº (reviewsDone + 1) */
export const techniqueIdForReview = (reviewNumber: number): ReviewTechniqueId =>
  reviewNumber <= 1 ? 'folha_branco' : reviewNumber === 2 ? 'questoes_tema' : reviewNumber === 3 ? 'questoes_novas' : 'misturadas';

export interface ReviewTechnique extends TechniqueInfo {
  reviewNumber: number;
  /** Texto curto: "R2 · Questões do tema" */
  badge: string;
  /** Passo extra vindo do tipo de erro mais comum na revisão anterior */
  extraStep?: string;
}

/** Tipo de erro mais frequente registrado na última revisão do bloco */
export const mainErrorType = (block: Pick<TopicBlock, 'reviewLog'>): ErrorType | undefined => {
  const last = block.reviewLog?.[block.reviewLog.length - 1];
  if (!last?.errors) return undefined;
  let best: ErrorType | undefined;
  let max = 0;
  (Object.keys(last.errors) as ErrorType[]).forEach((k) => {
    const v = last.errors?.[k] || 0;
    if (v > max) {
      max = v;
      best = k;
    }
  });
  return best;
};

/**
 * Técnica da PRÓXIMA revisão do bloco, adaptada ao formato da disciplina (Básico/Clínico)
 * e ao resultado anterior: se foi Difícil, ganha um passo extra escolhido pelo tipo de erro
 * (lacuna → estudar o ponto e criar flashcard; raciocínio → Feynman; leitura → grifar; pressa → ritmo).
 */
export const reviewTechnique = (
  block: Pick<TopicBlock, 'reviewsDone' | 'difficulty'> & Partial<Pick<TopicBlock, 'reviewLog' | 'needsQuestions'>>,
  format?: SubjectFormat
): ReviewTechnique => {
  const n = (block.reviewsDone || 0) + 1;
  const base = TECHNIQUES[techniqueIdForReview(n)];
  let steps = [...base.steps];
  let label = base.label;
  if (base.id === 'folha_branco') {
    if (format === 'anatomia' || format === 'morfo') {
      label = 'Desenho de memória + flashcards com imagem';
      steps = [
        'Sem consultar, desenhe a estrutura/peça de memória e nomeie as partes',
        'Compare com o atlas ou a peça e corrija com outra cor',
        'Crie flashcards com imagem (oclusão) do que você errou',
      ];
    } else if (format === 'habilidades') {
      label = 'Ensaio do procedimento em voz alta';
      steps = [
        'Sem consultar, fale em voz alta o passo a passo do procedimento',
        'Confira com o checklist da estação e marque o que esqueceu',
        'Faça flashcards dos passos que você pulou',
      ];
    } else if (format === 'tutoria') {
      label = 'Folha em branco dos objetivos da tutoria';
      steps = [
        'Sem consultar, responda por escrito cada objetivo da tutoria',
        'Confira com suas fontes e complete o que faltou',
        'Transforme o que você esqueceu em flashcards',
      ];
    }
  }
  let extraStep: string | undefined;
  if (block.difficulty === 'dificil' && n > 1) {
    const type = mainErrorType(block as TopicBlock);
    extraStep = type ? `Antes: ${ERROR_TYPES[type].action.toLowerCase()} (${ERROR_TYPES[type].label.toLowerCase()})` : 'Antes: reexplique em voz alta o mecanismo que travou (Feynman)';
    steps = [extraStep, ...steps];
  }
  // Nenhuma questão no estudo inicial: o método cobra questões já nesta revisão
  if (block.needsQuestions && !steps.some((s) => /quest/i.test(s))) {
    const q = 'Faça um bloco de questões deste tema (você ainda não fez nenhuma), sem consultar';
    steps = [...steps, q];
    if (!extraStep) extraStep = q;
  }
  return { ...base, label, steps, extraStep, reviewNumber: n, badge: `R${n} · ${base.short}` };
};

/** Técnica de revisão para itens de Estudos pessoais (sem banco de questões: folha em branco / explicar / flashcards) */
export const projectReviewTechnique = (reviewNumber: number, kind?: PersonalProjectKind): ReviewTechnique => {
  if (kind === 'residencia') return reviewTechnique({ reviewsDone: reviewNumber - 1 });
  const variants: Array<Pick<TechniqueInfo, 'label' | 'short' | 'emoji' | 'color' | 'steps'>> = [
    {
      label: 'Folha em branco do que estudou',
      short: 'Folha em branco',
      emoji: '📝',
      color: '#0ea5e9',
      steps: ['Sem consultar, escreva tudo o que lembra deste item', 'Confira e complete com outra cor', 'Crie flashcards do que esqueceu'],
    },
    {
      label: 'Explicar em voz alta',
      short: 'Explicar',
      emoji: '🗣️',
      color: '#8b5cf6',
      steps: ['Explique o item em voz alta, como para um colega', 'Marque onde travou e volte à fonte só nesses pontos', 'Explique de novo até fluir'],
    },
    {
      label: 'Flashcards + aplicação',
      short: 'Aplicar',
      emoji: '🃏',
      color: '#f59e0b',
      steps: ['Faça os flashcards deste item', 'Aplique: um exercício, caso, frase ou resumo DE MEMÓRIA', 'Confira e anote o que errou'],
    },
  ];
  const v = variants[Math.min(reviewNumber - 1, variants.length - 1)];
  const base = TECHNIQUES[techniqueIdForReview(reviewNumber)];
  return { ...base, ...v, questions: undefined, pomodoros: 1, reviewNumber, badge: `R${reviewNumber} · ${v.short}` };
};

/**
 * Sugestão de avaliação pelas questões. Acertos no chute não contam como domínio,
 * e erro com certeza nunca sugere Fácil. É só sugestão: o aluno decide o botão.
 */
export const suggestDifficulty = (args: { total?: number; correct?: number; luckyCorrect?: number; confidentErrors?: number }): TopicDifficulty | undefined => {
  const total = args.total || 0;
  if (total <= 0) return undefined;
  const correct = Math.max(0, Math.min(total, (args.correct || 0) - (args.luckyCorrect || 0)));
  const pct = correct / total;
  const s: TopicDifficulty = pct >= 0.8 ? 'facil' : pct >= 0.6 ? 'medio' : 'dificil';
  return s === 'facil' && (args.confidentErrors || 0) > 0 ? 'medio' : s;
};

// ---------------------------------------------------------------------------------------------
// Método de questões e caderno de erros
// ---------------------------------------------------------------------------------------------
export const ERROR_TYPES: Record<ErrorType, { id: ErrorType; label: string; emoji: string; color: string; example: string; action: string }> = {
  lacuna: {
    id: 'lacuna',
    label: 'Lacuna de conteúdo',
    emoji: '📚',
    color: '#0ea5e9',
    example: 'Não sabia o critério diagnóstico',
    action: 'Estude o ponto e crie um flashcard',
  },
  raciocinio: {
    id: 'raciocinio',
    label: 'Erro de raciocínio',
    emoji: '🧠',
    color: '#8b5cf6',
    example: 'Sabia os fatos, mas não conectou o mecanismo',
    action: 'Reexplique o mecanismo com o método Feynman',
  },
  leitura: {
    id: 'leitura',
    label: 'Leitura do enunciado',
    emoji: '👁️',
    color: '#f59e0b',
    example: 'Não viu o "EXCETO" ou a idade do paciente',
    action: 'Grife as palavras-chave do enunciado antes de ler as alternativas',
  },
  pressa: {
    id: 'pressa',
    label: 'Pressa ou cansaço',
    emoji: '⏱️',
    color: '#e11d48',
    example: 'Errou algo que sabia',
    action: 'Ajuste o ritmo e faça pausas de verdade',
  },
};
export const ERROR_TYPE_ORDER: ErrorType[] = ['lacuna', 'raciocinio', 'leitura', 'pressa'];

export const CERTAINTY_INFO: Record<Certainty, { id: Certainty; label: string; emoji: string; hint: string }> = {
  chute: { id: 'chute', label: 'Chute', emoji: '🎲', hint: 'Não sabia' },
  duvida: { id: 'duvida', label: 'Dúvida', emoji: '🤔', hint: 'Fiquei entre duas' },
  certeza: { id: 'certeza', label: 'Certeza', emoji: '💪', hint: 'Tinha certeza' },
};
export const CERTAINTY_ORDER: Certainty[] = ['chute', 'duvida', 'certeza'];

/** Datas para refazer um erro sem tema ligado: 7 e 30 dias depois */
export const ERROR_REDO_DAYS = [7, 30];
/** Acertos seguidos para considerar o erro resolvido */
export const ERROR_RESOLVE_AFTER = 2;

export const newErrorNoteId = () => 'err-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

export const makeErrorNote = (
  data: Pick<ErrorNote, 'theme' | 'type' | 'rule'> & Partial<Pick<ErrorNote, 'subjectId' | 'blockId' | 'certainty' | 'why' | 'flashcard'>>,
  today = ymd(new Date())
): ErrorNote => ({
  id: newErrorNoteId(),
  createdAt: today,
  status: 'aberto',
  redoDates: ERROR_REDO_DAYS.map((d) => addDaysYMD(d, today)),
  redoneCount: 0,
  ...data,
  theme: data.theme.trim(),
  rule: data.rule.trim(),
  why: data.why?.trim() || undefined,
});

export const nextErrorRedo = (n: ErrorNote) => (n.status === 'resolvido' ? undefined : n.redoDates[Math.min(n.redoneCount, n.redoDates.length - 1)]);

/**
 * Erro para refazer hoje. Erro ligado a um tema em revisão volta DENTRO da próxima revisão daquele
 * tema (R2/R3, como o guia pede); só erros sem tema (ou de tema fora das revisões) usam +7/+30.
 */
export const isErrorDue = (n: ErrorNote, today = ymd(new Date()), blocks?: TopicBlock[]) => {
  if (n.status === 'resolvido') return false;
  // Nunca no mesmo dia em que foi anotado ou refeito
  if (n.createdAt >= today || n.lastRedo === today) return false;
  if (n.blockId && blocks) {
    const b = blocks.find((x) => x.id === n.blockId);
    // Volta dentro da R2 em diante (o card da R1 é folha em branco + flashcards e não mostra erros)
    if (b && b.reviewStatus !== 'estudando' && (b.reviewsDone || 0) >= 1) return isBlockDue(b, today);
  }
  const next = nextErrorRedo(n);
  return !!next && next <= today;
};

/** Erros abertos de um bloco (aparecem dentro da revisão do tema) */
export const errorsOfBlock = (notes: ErrorNote[], blockId: string) => notes.filter((n) => n.blockId === blockId && n.status !== 'resolvido');

/**
 * Erros do bloco para refazer DENTRO do card de revisão: abertos e anotados antes de hoje
 * (um erro anotado durante a revisão de hoje volta na próxima, não no mesmo card).
 * Inclui os refeitos hoje, para o card poder mostrar "✓ refeito".
 */
export const redoableErrorsOfBlock = (notes: ErrorNote[], blockId: string, today = ymd(new Date())) =>
  notes.filter((n) => n.blockId === blockId && n.createdAt < today && (n.status !== 'resolvido' || n.lastRedo === today));

/** Resultado de refazer um erro: acertou avança (2 acertos = resolvido); errou recomeça 7/30 dias */
export const applyErrorRedo = (n: ErrorNote, gotItRight: boolean, today = ymd(new Date())): ErrorNote => {
  if (!gotItRight) return { ...n, status: 'aberto', redoneCount: 0, lastRedo: today, redoDates: ERROR_REDO_DAYS.map((d) => addDaysYMD(d, today)) };
  const count = n.redoneCount + 1;
  // A próxima tentativa conta a partir de hoje (refazer com atraso não deixa o erro vencido)
  const redoDates = [...n.redoDates];
  if (count < redoDates.length && redoDates[count] <= today) {
    const gap = (ERROR_REDO_DAYS[count] ?? 30) - (ERROR_REDO_DAYS[count - 1] ?? 0);
    redoDates[count] = addDaysYMD(Math.max(1, gap), today);
  }
  return { ...n, redoDates, redoneCount: count, lastRedo: today, status: count >= ERROR_RESOLVE_AFTER ? 'resolvido' : 'aberto' };
};

// ---------------------------------------------------------------------------------------------
// Fase do curso: cada ciclo da medicina estuda de um jeito
// ---------------------------------------------------------------------------------------------
export type StudyPhase = CycleId;

export interface PhaseInfo {
  id: StudyPhase;
  label: string;
  emoji: string;
  color: string;
  priority: string;
  tips: string[];
  defaults: Pick<StudyPlanPrefs, 'focusMinutes' | 'breakMinutes' | 'shortFocusMinutes' | 'shortBreakMinutes' | 'newTopicsPerDay' | 'longTermGoal'>;
  /** Meta semanal sugerida para um estudo pessoal */
  projectWeekly: number;
}

export const PHASE_INFO: Record<StudyPhase, PhaseInfo> = {
  ciclo_basico: {
    id: 'ciclo_basico',
    label: 'Ciclo Básico',
    emoji: '🧬',
    color: '#10b981',
    priority: 'Entender mecanismos: fisiologia, bioquímica, farmacologia',
    tips: [
      'Use mais Feynman e desenhos: explique o mecanismo antes de decorar.',
      'Anatomia e histologia: flashcards com imagem (oclusão) funcionam muito bem.',
      'Treine com as questões das provas da sua própria faculdade.',
    ],
    defaults: { focusMinutes: 50, breakMinutes: 10, shortFocusMinutes: 30, shortBreakMinutes: 5, newTopicsPerDay: 1, longTermGoal: false },
    projectWeekly: 2,
  },
  ciclo_clinico: {
    id: 'ciclo_clinico',
    label: 'Ciclo Clínico',
    emoji: '🩺',
    color: '#0ea5e9',
    priority: 'Ligar o mecanismo à clínica',
    tips: [
      'Questões clínicas todo dia, mesmo que poucas.',
      'Flashcards de critérios diagnósticos e condutas.',
      'Feynman para fisiopatologia: explique por que cada sinal aparece.',
    ],
    defaults: { focusMinutes: 50, breakMinutes: 10, shortFocusMinutes: 30, shortBreakMinutes: 5, newTopicsPerDay: 1, longTermGoal: false },
    projectWeekly: 2,
  },
  internato: {
    id: 'internato',
    label: 'Internato',
    emoji: '🏥',
    color: '#8b5cf6',
    priority: 'Pouco tempo livre, muita prática',
    tips: [
      'Blocos curtos de questões no celular entre as atividades.',
      'Poucos cartões novos por dia, mas flashcards todo dia.',
      'Cada paciente vira gatilho para revisar o tema.',
    ],
    defaults: { focusMinutes: 30, breakMinutes: 5, shortFocusMinutes: 30, shortBreakMinutes: 5, newTopicsPerDay: 1, longTermGoal: true },
    projectWeekly: 4,
  },
};

/** As rotinas são modelos para adaptar, não regras fixas (frase do guia) */
export const ROUTINE_DISCLAIMER = 'As rotinas e números são modelos para adaptar, não regras fixas.';

/** Fase atual pelo semestre (1º–4º Básico, 5º–8º Clínico, 9º+ Internato) */
export const studyPhaseOf = (sem?: Pick<Semester, 'name'> | null): StudyPhase => cycleOfSemester(sem);

/** Preparação para residência: prova-alvo definida no internato ou projeto pessoal de Residência ativo */
export const isResidencyPrep = (phase: StudyPhase, profile?: Pick<UserProfile, 'targetExam'> | null, projects: PersonalProject[] = []) =>
  (phase === 'internato' && !!profile?.targetExam?.trim()) || projects.some((p) => p.kind === 'residencia' && !p.archived);

// ---------------------------------------------------------------------------------------------
// Preferências da rotina (guardamos só o que o aluno escolheu; o resto é calculado)
// ---------------------------------------------------------------------------------------------
/** Capacidade padrão em blocos de 25 min: horas semanais em 6 dias, ~30 min por bloco (foco + pausa) */
export const defaultDailyPomodoros = (weeklyTargetHours?: number) => {
  const h = weeklyTargetHours && weeklyTargetHours > 0 ? weeklyTargetHours : 25;
  return Math.max(3, Math.min(16, Math.round((h * 60) / 30 / 6)));
};

export const defaultPrefs = (phase: StudyPhase, weeklyTargetHours?: number): StudyPlanPrefs => ({
  dailyPomodoros: defaultDailyPomodoros(weeklyTargetHours),
  restDay: 0,
  mixedDay: 6,
  usesFlashcards: true,
  ...PHASE_INFO[phase].defaults,
});

/** Preferências efetivas = padrões da fase + o que o aluno escolheu */
export const resolvePrefs = (saved: Partial<StudyPlanPrefs> | undefined, phase: StudyPhase, weeklyTargetHours?: number): StudyPlanPrefs => {
  const base = defaultPrefs(phase, weeklyTargetHours);
  if (!saved) return base;
  const out = { ...base } as StudyPlanPrefs;
  (Object.keys(saved) as Array<keyof StudyPlanPrefs>).forEach((k) => {
    if (saved[k] !== undefined) (out as any)[k] = saved[k];
  });
  // Preferência antiga (só o foco): pausa proporcional ao bloco
  if (saved.focusMinutes !== undefined && saved.breakMinutes === undefined) out.breakMinutes = saved.focusMinutes >= 45 ? 10 : 5;
  return out;
};

// ---------- Semana por turnos (manhã, tarde, noite)
export const TURN_KEYS: ExamShift[] = ['manha', 'tarde', 'noite'];
export const TURN_LABELS = ['Manhã', 'Tarde', 'Noite'];
export const emptyWeekTurns = (): TurnState[][] => Array.from({ length: 7 }, () => ['livre', 'livre', 'livre'] as TurnState[]);
/** Turno de um horário "HH:MM" (0 manhã, 1 tarde, 2 noite). Fim: o minuto anterior (12:00 ainda é manhã) */
export const turnOfTime = (time: string, isEnd = false) => {
  const [h, m] = (time || '00:00').split(':').map((x) => parseInt(x, 10) || 0);
  const min = h * 60 + m - (isEnd ? 1 : 0);
  return min < 720 ? 0 : min < 1080 ? 1 : 2;
};
/**
 * Quanto cabe num dia pelos turnos. O dia com mais turnos livres recebe todo o tempo de foco;
 * os outros, proporcional. Sem turno livre: só revisões curtas. Tudo descanso: dia de descanso.
 */
export const turnCapacity = (prefs: StudyPlanPrefs, dow: number): { capacity: number; allRest: boolean; turns: TurnState[] } | null => {
  const week = prefs.weekTurns;
  const turns = week?.[dow];
  if (!week || !turns || turns.length !== 3) return null;
  const freeOf = (d?: TurnState[]) => (d || []).filter((t) => t === 'livre').length;
  const maxFree = Math.max(1, ...week.map((d, i) => (i === prefs.restDay ? 0 : freeOf(d))));
  const free = freeOf(turns);
  const allRest = turns.every((t) => t === 'descanso');
  const capacity = free === 0 ? Math.min(2, prefs.dailyPomodoros) : Math.max(2, Math.round((prefs.dailyPomodoros * free) / maxFree));
  return { capacity, allRest, turns };
};
const TURN_WORD: Record<TurnState, string> = { livre: 'livre', ocupado: 'ocupada', descanso: 'de descanso' };
/** Dias da semana de descanso: o dia fixo + os dias com os três turnos em descanso */
export const restDaysOf = (prefs: Pick<StudyPlanPrefs, 'restDay' | 'weekTurns'>): number[] => {
  const out = new Set<number>();
  if (prefs.restDay !== null && prefs.restDay !== undefined) out.add(prefs.restDay);
  prefs.weekTurns?.forEach((d, i) => {
    if (d?.length === 3 && d.every((t) => t === 'descanso')) out.add(i);
  });
  return Array.from(out);
};
export const turnKey = (dow: number, turn: ExamShift) => `${dow}-${turn}`;
export const TURN_METHODS: Array<{ id: TurnMethod; label: string; emoji: string }> = [
  { id: 'tema_novo', label: 'Tema novo', emoji: '📘' },
  { id: 'revisao', label: 'Revisão', emoji: '🔁' },
  { id: 'questoes', label: 'Questões', emoji: '✍️' },
  { id: 'flashcards', label: 'Flashcards', emoji: '🃏' },
  { id: 'resumo', label: 'Resumo', emoji: '📝' },
  { id: 'leitura', label: 'Leitura / aula', emoji: '🎧' },
];
/** Semana de prova marcada pelo aluno */
export const isExamWeek = (prefs: Pick<StudyPlanPrefs, 'examWeeks'>, date: string) => !!prefs.examWeeks?.includes(weekStart(date));

export const WEEKDAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
export const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export const EMPTY_STUDY_METHOD: StudyMethodState = { version: 1, errorNotes: [], habits: {}, dayPlans: {}, projects: [] };

/** Normaliza o objeto salvo (dados antigos, campos faltando) */
export const normalizeStudyMethod = (raw: any): StudyMethodState => {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_STUDY_METHOD };
  return {
    version: 1,
    prefs: raw.prefs && typeof raw.prefs === 'object' ? raw.prefs : undefined,
    errorNotes: Array.isArray(raw.errorNotes) ? raw.errorNotes : [],
    habits: raw.habits && typeof raw.habits === 'object' ? raw.habits : {},
    dayPlans: raw.dayPlans && typeof raw.dayPlans === 'object' ? raw.dayPlans : {},
    projects: Array.isArray(raw.projects) ? raw.projects : [],
    guideSeen: !!raw.guideSeen,
    deleted: raw.deleted && typeof raw.deleted === 'object' ? raw.deleted : undefined,
    dashboard: raw.dashboard && typeof raw.dashboard === 'object' ? raw.dashboard : undefined,
    mobileTabs: Array.isArray(raw.mobileTabs) ? raw.mobileTabs.filter((x: unknown) => typeof x === 'string') : undefined,
    contests: Array.isArray(raw.contests) ? raw.contests : undefined,
    pastExams: Array.isArray(raw.pastExams) ? raw.pastExams : undefined,
    sidebar: raw.sidebar && typeof raw.sidebar === 'object' ? raw.sidebar : undefined,
    structFavorites: Array.isArray(raw.structFavorites) ? raw.structFavorites.filter((x: unknown) => typeof x === 'string') : undefined,
  };
};

/**
 * Junta o que veio da nuvem com o que está neste aparelho: dias (plano/checklist) por data,
 * erros e projetos por id (a nuvem vale; itens que só existem aqui são mantidos). O que foi
 * excluído em qualquer aparelho (lista `deleted`) sai dos dois lados.
 */
const mergeByDate = <T,>(local: Record<string, T> | undefined, cloud: Record<string, T> | undefined, join: (l: T, c: T) => T): Record<string, T> => {
  const out: Record<string, T> = { ...(local || {}) };
  Object.entries(cloud || {}).forEach(([k, c]) => {
    out[k] = k in out ? join(out[k], c) : c;
  });
  return out;
};

export const mergeStudyMethod = (local: StudyMethodState, cloudRaw: any, _today = ymd(new Date())): StudyMethodState => {
  const cloud = normalizeStudyMethod(cloudRaw);
  const deleted = { ...(local.deleted || {}), ...(cloud.deleted || {}) };
  const byId = <T extends { id: string }>(c: T[], l: T[]) => {
    const ids = new Set(c.map((x) => x.id));
    return [...c, ...l.filter((x) => !ids.has(x.id))].filter((x) => !deleted[x.id]);
  };
  return {
    version: 1,
    prefs: cloud.prefs || local.prefs,
    errorNotes: byId(cloud.errorNotes, local.errorNotes),
    projects: byId(cloud.projects, local.projects),
    habits: mergeByDate(local.habits, cloud.habits, (l, c) => (Array.isArray(l) && Array.isArray(c) ? (Array.from(new Set([...c, ...l])) as typeof c) : c)),
    dayPlans: mergeByDate(local.dayPlans, cloud.dayPlans, (l, c) => {
      const uni = (a?: string[], b?: string[]) => (a || b ? Array.from(new Set([...(b || []), ...(a || [])])) : undefined);
      const custom = c.custom || l.custom ? [...(c.custom || []), ...(l.custom || []).filter((x) => !(c.custom || []).some((y) => y.id === x.id))] : undefined;
      return { ...l, ...c, done: uni(l.done, c.done), skipped: uni(l.skipped, c.skipped), ...(custom ? { custom } : {}) };
    }),
    guideSeen: cloud.guideSeen || local.guideSeen,
    deleted: Object.keys(deleted).length ? deleted : undefined,
    dashboard: cloud.dashboard || local.dashboard,
    mobileTabs: cloud.mobileTabs || local.mobileTabs,
    contests: byId(cloud.contests || [], local.contests || []),
    pastExams: byId(cloud.pastExams || [], local.pastExams || []),
    sidebar: cloud.sidebar || local.sidebar,
    structFavorites: cloud.structFavorites ?? local.structFavorites,
  };
};

/** Remove dias antigos do checklist e do plano (o objeto vai inteiro para a nuvem) */
export const pruneStudyMethod = (s: StudyMethodState, today = ymd(new Date()), keepDays = 45): StudyMethodState => {
  const limit = addDaysYMD(-keepDays, today);
  const keep = <T,>(rec: Record<string, T>) => {
    const out: Record<string, T> = {};
    Object.keys(rec).forEach((k) => {
      if (k >= limit) out[k] = rec[k];
    });
    return out;
  };
  // Exclusões ficam 120 dias (tempo de sobra para os outros aparelhos sincronizarem)
  const delLimit = addDaysYMD(-120, today);
  const deleted: Record<string, string> = {};
  Object.entries(s.deleted || {}).forEach(([id, d]) => {
    if (d >= delLimit) deleted[id] = d;
  });
  return { ...s, habits: keep(s.habits), dayPlans: keep(s.dayPlans), deleted: Object.keys(deleted).length ? deleted : undefined };
};

// ---------------------------------------------------------------------------------------------
// Fila de revisões (mesma regra em todas as telas)
// ---------------------------------------------------------------------------------------------
/** Blocos que contam para revisões: os da disciplina que ainda existe (de qualquer semestre) */
export const reviewableBlocks = (topicBlocks: TopicBlock[], subjects: Subject[]) => {
  const ids = new Set(subjects.map((s) => s.id));
  return topicBlocks.filter((b) => ids.has(b.subjectId) && !b.paused);
};

/** Revisões vencidas (hoje + atrasadas), na ordem do guia: mais atrasada, ⭐ cai muito, prova perto, pior % */
export const dueReviewQueue = (topicBlocks: TopicBlock[], subjects: Subject[], today = ymd(new Date()), exams: Exam[] = []) => {
  const soon = subjectsWithExamWithin(exams, subjects, today, 7);
  return reviewableBlocks(topicBlocks, subjects)
    .filter((b) => isBlockDue(b, today))
    .sort(
      (a, b) =>
        overdueDays(b, today) - overdueDays(a, today) ||
        Number(!!b.star) - Number(!!a.star) ||
        Number(soon.has(b.subjectId)) - Number(soon.has(a.subjectId)) ||
        (lastPct(a) ?? 1) - (lastPct(b) ?? 1)
    );
};

/** Quantas revisões vencidas (badge da Sidebar, da barra do celular, do sino...) */
export const dueReviewCount = (topicBlocks: TopicBlock[], subjects: Subject[], today = ymd(new Date()), projects: PersonalProject[] = []) =>
  reviewableBlocks(topicBlocks, subjects).filter((b) => isBlockDue(b, today)).length +
  projects.filter((p) => !p.archived).reduce((a, p) => a + p.items.filter((i) => isItemReviewDue(i, today)).length, 0);

/** Último % de acertos registrado no bloco (para priorizar o que mais erra) */
export const lastPct = (b?: TopicBlock) => {
  const log = [...(b?.reviewLog || [])].reverse().find((l) => l.questions && l.correct !== undefined);
  return log && log.questions ? (log.correct || 0) / log.questions : undefined;
};

/** Disciplina de uma prova (pelo id antigo ou pelo nome livre) */
export const examSubjectId = (e: Exam, subjects: Subject[]) => {
  if (e.subjectId && subjects.some((s) => s.id === e.subjectId)) return e.subjectId;
  const name = (e.subjectName || '').trim().toLowerCase();
  if (!name) return undefined;
  return subjects.find((s) => s.name.trim().toLowerCase() === name || (s.universitySubject || '').trim().toLowerCase() === name)?.id;
};

/** Disciplinas com prova (ainda sem nota) nos próximos `days` dias */
export const subjectsWithExamWithin = (exams: Exam[], subjects: Subject[], today: string, days: number) => {
  const out = new Set<string>();
  exams.forEach((e) => {
    if (e.grade !== undefined || e.date < today || daysBetween(today, e.date) > days) return;
    const sid = examSubjectId(e, subjects);
    if (sid) out.add(sid);
  });
  return out;
};

/**
 * "Bem-vindo de volta" / "Replanejar": espalha as revisões vencidas (atrasadas e de hoje, de temas e
 * de estudos pessoais) pelos próximos dias. As mais atrasadas e com ⭐ ficam hoje; cada dia recebe no
 * máximo `perDay` blocos de 25 min de revisão, contando o que já vence naquele dia; o descanso é pulado.
 * Devolve { blocks: { blockId: data }, items: { "projectId:itemId": data } } só com o que mudou de data.
 */
export const spreadOverdueReviews = (
  topicBlocks: TopicBlock[],
  subjects: Subject[],
  today: string,
  perDay: number,
  restDay: number | null | number[] = null,
  projects: PersonalProject[] = []
) => {
  const limit = Math.max(1, perDay);
  const fmt = (sid: string) => subjects.find((s) => s.id === sid)?.format;
  type Entry = { key: string; kind: 'block' | 'item'; cost: number };
  const queue: Entry[] = dueReviewQueue(topicBlocks, subjects, today).map((b) => ({
    key: b.id,
    kind: 'block',
    cost: Math.max(1, reviewTechnique(b, fmt(b.subjectId)).pomodoros || 1),
  }));
  projects
    .filter((p) => !p.archived)
    .forEach((p) =>
      p.items
        .filter((i) => isItemReviewDue(i, today))
        .sort((a, b) => (a.nextReviewDate || '').localeCompare(b.nextReviewDate || ''))
        .forEach((i) => queue.push({ key: `${p.id}:${i.id}`, kind: 'item', cost: 1 }))
    );
  const queued = new Set(queue.map((e) => e.key));
  // Carga que já existe em cada dia futuro (revisões que vencem naquela data e não estão na fila)
  const usedOn: Record<string, number> = {};
  reviewableBlocks(topicBlocks, subjects).forEach((b) => {
    if (b.reviewStatus === 'estudando' || !b.nextReviewDate || b.nextReviewDate <= today || queued.has(b.id)) return;
    usedOn[b.nextReviewDate] = (usedOn[b.nextReviewDate] || 0) + Math.max(1, reviewTechnique(b, fmt(b.subjectId)).pomodoros || 1);
  });
  projects
    .filter((p) => !p.archived)
    .forEach((p) =>
      p.items.forEach((i) => {
        if (!i.inReview || !i.nextReviewDate || i.nextReviewDate <= today) return;
        usedOn[i.nextReviewDate] = (usedOn[i.nextReviewDate] || 0) + 1;
      })
    );
  const blocksOut: Record<string, string> = {};
  const itemsOut: Record<string, string> = {};
  let day = 0;
  queue.forEach((e) => {
    for (let guard = 0; guard < 400; guard++) {
      const date = addDaysYMD(day, today);
      const rd = Array.isArray(restDay) ? restDay : restDay === null ? [] : [restDay];
      const isRest = rd.length < 7 && rd.includes(parseYMD(date).getDay());
      const used = usedOn[date] || 0;
      // Um dia sempre aceita pelo menos uma revisão (evita laço infinito com revisões grandes)
      if (!isRest && (used === 0 || used + e.cost <= limit)) {
        usedOn[date] = used + e.cost;
        if (day > 0) {
          if (e.kind === 'block') blocksOut[e.key] = date;
          else itemsOut[e.key] = date;
        }
        return;
      }
      day++;
    }
  });
  return { blocks: blocksOut, items: itemsOut };
};

/** Último dia em que o aluno fez algo (sessão, revisão ou questões) */
export const lastActivityDate = (sessions: StudySession[], blocks: TopicBlock[], questionLogs: QuestionLog[]) => {
  let last = '';
  sessions.forEach((s) => {
    const d = sessionDate(s);
    if (d > last) last = d;
  });
  blocks.forEach((b) => {
    if (b.lastReviewDate && b.lastReviewDate > last) last = b.lastReviewDate;
  });
  questionLogs.forEach((q) => {
    if (q.date > last) last = q.date;
  });
  return last || undefined;
};

// ---------------------------------------------------------------------------------------------
// Estudos pessoais
// ---------------------------------------------------------------------------------------------
export interface ProjectKindInfo {
  id: PersonalProjectKind;
  label: string;
  emoji: string;
  color: string;
  hint: string;
  /** Itens prontos do modelo */
  template: string[];
  /** Dias sugeridos (0 = domingo … 6 = sábado) */
  days?: number[];
}

export const PROJECT_KINDS: Record<PersonalProjectKind, ProjectKindInfo> = {
  faculdade: {
    id: 'faculdade',
    label: 'Faculdade',
    emoji: '🏫',
    color: '#0ea5e9',
    hint: 'Matérias da faculdade: prova, trabalho, seminário, reforço',
    template: ['Revisar a matéria da próxima prova', 'Fazer as questões de provas antigas', 'Preparar o seminário'],
    days: [1, 2, 3, 4, 5],
  },
  residencia: {
    id: 'residencia',
    label: 'Residência',
    emoji: '🎯',
    color: '#e11d48',
    hint: 'Questões como eixo, caderno de erros e simulados',
    template: ['Clínica Médica', 'Cirurgia', 'Pediatria', 'Ginecologia e Obstetrícia', 'Medicina Preventiva'],
    days: [1, 2, 3, 4, 5],
  },
  liga: { id: 'liga', label: 'Liga acadêmica', emoji: '🩺', color: '#10b981', hint: 'Temas e aulas da liga', template: ['Tema da próxima aula da liga', 'Caso clínico para apresentar'], days: [3] },
  idioma: {
    id: 'idioma',
    label: 'Idioma',
    emoji: '🌎',
    color: '#0ea5e9',
    hint: 'Inglês médico, espanhol… (25 min, 3x por semana)',
    template: ['Vocabulário de anamnese', 'Ler 1 artigo curto em inglês', 'Ouvir 1 podcast médico'],
    days: [1, 3, 5],
  },
  curso: {
    id: 'curso',
    label: 'Curso',
    emoji: '🎓',
    color: '#8b5cf6',
    hint: 'ECG, USG, ACLS, programação…',
    template: ['Aula 1', 'Aula 2', 'Aula 3', 'Aula 4', 'Aula 5', 'Aula 6', 'Aula 7', 'Aula 8'],
  },
  leitura: { id: 'leitura', label: 'Leitura', emoji: '📖', color: '#f59e0b', hint: 'Livro ou capítulos', template: ['Capítulo 1', 'Capítulo 2', 'Capítulo 3', 'Capítulo 4'] },
  pesquisa: {
    id: 'pesquisa',
    label: 'Pesquisa / artigo',
    emoji: '🔬',
    color: '#6366f1',
    hint: 'TCC, iniciação científica, artigo',
    template: ['Revisão de literatura', 'Coleta de dados', 'Análise', 'Escrita da discussão'],
  },
  outro: { id: 'outro', label: 'Outro', emoji: '✨', color: '#64748b', hint: 'Qualquer estudo seu', template: [] },
};
export const PROJECT_KIND_ORDER: PersonalProjectKind[] = ['faculdade', 'residencia', 'outro', 'liga', 'idioma', 'curso', 'leitura', 'pesquisa'];

export const newProjectId = () => 'proj-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
export const newItemId = () => 'pit-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);

/** Segunda-feira da semana de uma data */
export const weekStart = (date: string) => {
  const d = parseYMD(date);
  const dow = d.getDay(); // 0 domingo
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return ymd(d);
};

/** Data local (YYYY-MM-DD) de uma sessão */
export const sessionDate = (s: Pick<StudySession, 'timestamp'>) => ymd(new Date(s.timestamp));

/** Blocos de foco feitos na semana (seg–dom) para um projeto */
export const projectWeekPomodoros = (project: PersonalProject, sessions: StudySession[], date = ymd(new Date())) => {
  const start = weekStart(date);
  const end = addDaysYMD(6, start);
  return sessions
    .filter((s) => s.projectId === project.id && sessionDate(s) >= start && sessionDate(s) <= end)
    .reduce((acc, s) => acc + Math.max(1, Math.round((s.durationMinutes || 25) / 25)), 0);
};

export const nextProjectItem = (p: PersonalProject) => p.items.find((i) => !i.done);

/** Item concluído entra nas revisões (R1 amanhã) */
export const startItemReviews = (item: PersonalProjectItem, today = ymd(new Date())): PersonalProjectItem => ({
  ...item,
  inReview: true,
  reviewsDone: 0,
  difficulty: undefined,
  lastReviewDate: undefined,
  nextReviewDate: addDaysYMD(1, today),
});

/** Revisão de um item de projeto feita (mesmo motor de intervalos dos blocos) */
export const reviewProjectItemResult = (item: PersonalProjectItem, difficulty: TopicDifficulty, opts: { today?: string; restDay?: number | null | number[]; longTerm?: boolean } = {}): PersonalProjectItem => {
  const today = opts.today || ymd(new Date());
  const done = (item.reviewsDone || 0) + 1;
  return {
    ...item,
    reviewsDone: done,
    difficulty,
    lastReviewDate: today,
    nextReviewDate: scheduleReviewDate(nextIntervalDays(difficulty, done, opts.longTerm), { from: today, restDay: opts.restDay }),
  };
};

export const isItemReviewDue = (item: PersonalProjectItem, today = ymd(new Date())) => !!item.inReview && !!item.nextReviewDate && item.nextReviewDate <= today;

// ---------------------------------------------------------------------------------------------
// Plano do dia
// ---------------------------------------------------------------------------------------------
export type PlanTaskKind =
  | 'flashcards'
  | 'summary'
  | 'review'
  | 'project_review'
  | 'custom'
  | 'error_redo'
  | 'phase_questions'
  | 'mixed'
  | 'exam_prep'
  | 'exam_topic'
  | 'tutoria'
  | 'new_block'
  | 'new_topics'
  | 'project'
  | 'blank_page'
  | 'weekly_planning';

export interface PlanTask {
  id: string;
  kind: PlanTaskKind;
  /** 1 revisões · 2 questões/erros · 3 conteúdo novo */
  priority: 1 | 2 | 3;
  emoji: string;
  color: string;
  title: string;
  subtitle?: string;
  /** Por que esta tarefa está aqui (texto curto para o aluno) */
  reason?: string;
  steps: string[];
  /** Tamanho em blocos de 25 min (unidade interna da capacidade; um bloco de 50 conta como 2) */
  pomodoros: number;
  /** Minutos de foco de cada bloco desta tarefa (bloco do aluno) */
  focus: number;
  /** Pausa depois de cada bloco (min) */
  breakMin?: number;
  technique?: ReviewTechniqueId;
  reviewNumber?: number;
  /** Nº de questões sugerido (sugestão, não regra) */
  questions?: number;
  subjectId?: string;
  blockId?: string;
  topicIds?: string[];
  projectId?: string;
  itemId?: string;
  examId?: string;
  customId?: string;
  overdueDays?: number;
  star?: boolean;
  optional?: boolean;
  /** Sugestão automática (o aluno não programou) */
  suggested?: boolean;
  done: boolean;
  skipped: boolean;
  /** O que "Passar para amanhã" muda */
  movable?: 'review' | 'new_block' | 'new_topics' | 'custom' | 'project_review';
}

export type DayKind = 'normal' | 'mixed' | 'rest' | 'low_energy' | 'plantao' | 'pos_plantao' | 'prova' | 'pos_prova';

export interface DayPlan {
  date: string;
  dayKind: DayKind;
  /** Capacidade em blocos de 25 min */
  capacity: number;
  /** Blocos das tarefas que couberam */
  planned: number;
  tasks: PlanTask[];
  /** Tarefas que não couberam hoje */
  overflow: PlanTask[];
  /** Revisões que ficaram de fora (para o aviso "+N na fila") */
  overflowReviews: number;
  doneCount: number;
  totalCount: number;
  /** Próxima tarefa a fazer (para o botão "Começar") */
  next?: PlanTask;
  message?: string;
  /** Lembrete fixo de sono no fim do plano */
  sleepNote: string;
  /** Turnos do dia (quando o aluno marcou a semana por turnos) */
  turnsNote?: string;
  tips: string[];
  phase: StudyPhase;
  residencyPrep: boolean;
  /** Prova amanhã/hoje (não passar da capacidade, dormir bem) */
  examEve?: Exam;
  /** Lembretes de prova de hoje (30/15/7/3/1 dias antes, se ainda não começou os assuntos) */
  examReminders?: Array<{ examId: string; daysLeft: number; text: string }>;
}

export interface PlanInput {
  date: string;
  today?: string;
  /** Todos os blocos (as revisões valem para qualquer semestre; conteúdo novo só do semestre atual) */
  blocks: TopicBlock[];
  topics: Topic[];
  /** Todas as disciplinas */
  subjects: Subject[];
  /** Disciplinas do semestre atual (conteúdo novo, tutoria) */
  currentSubjectIds: string[];
  exams: Exam[];
  /** Grade do semestre atual */
  schedule: ScheduleClass[];
  sessions: StudySession[];
  method: StudyMethodState;
  prefs: StudyPlanPrefs;
  phase: StudyPhase;
  residencyPrep?: boolean;
}

const subjectName = (subjects: Subject[], id?: string) => subjects.find((s) => s.id === id)?.name || '';
const subjectColor = (subjects: Subject[], id?: string) => subjects.find((s) => s.id === id)?.color || '#0ea5e9';
/** Tamanho em unidades de 25 min de N blocos de `focus` minutos */
const units = (focus: number, blocks: number) => Math.max(1, Math.round((blocks * focus) / 25));
/** Quantos blocos um tema novo pede (~75–100 min de estudo inicial) */
export const newTopicBlocks = (focus: number) => Math.max(1, Math.round((focus >= 40 ? 100 : 75) / focus));
/** Quantos blocos de `focus` min cabem numa tarefa de `pomodoros` unidades de 25 min */
export const taskBlocks = (pomodoros: number, focus: number) => Math.max(1, Math.round((pomodoros * 25) / Math.max(5, focus)));
/** "2 × 50 min" / "1 × 60 min" / "10 min" */
export const formatTaskSize = (pomodoros: number, focus: number) => (pomodoros <= 0 ? '10 min' : `${taskBlocks(pomodoros, focus)} × ${focus} min`);
/** Texto de um bloco: "60/10" */
export const blockLabel = (focus: number, rest: number) => `${focus}/${rest}`;

/** Dia com plantão/estágio na grade */
export const isPlantaoDay = (schedule: ScheduleClass[], date: string) => {
  const d = parseYMD(date);
  const dayNum = d.getDay() === 0 ? 7 : d.getDay();
  return schedule.some((sc) => occursOn(sc, date, dayNum) && (sc.category ? sc.category === 'plantao' : /plant[aã]o/i.test(`${sc.type || ''} ${sc.title || ''}`)));
};

export const SLEEP_NOTE = 'Noite: dormir em horário regular. O sono consolida o que você estudou hoje.';

/** Monta o plano de um dia. Para datas futuras mostra só o que está agendado para aquele dia. */
export const buildDayPlan = (input: PlanInput): DayPlan => {
  const today = input.today || ymd(new Date());
  const { date, blocks, topics, subjects, exams, schedule, sessions, method, prefs, phase } = input;
  const projects = (method.projects || []).filter((p) => !p.archived);
  const currentIds = new Set(input.currentSubjectIds);
  const subjectIds = new Set(subjects.map((s) => s.id));
  const isToday = date === today;
  const isPast = date < today;
  const state: DayPlanState = method.dayPlans?.[date] || {};
  const doneSet = new Set(state.done || []);
  const skipSet = new Set(state.skipped || []);
  const dow = parseYMD(date).getDay();
  const residencyPrep = !!input.residencyPrep;

  const lowEnergy = !!state.lowEnergy;
  // Dias especiais: plantão/pós-plantão (internato final) e prova/pós-prova (demais semestres)
  const posPlantaoDay = state.shift === 'pos_plantao';
  const plantaoDay = state.shift === 'plantao' || (!state.shift && isPlantaoDay(schedule, date));
  const examToday = exams.find((e) => e.grade === undefined && e.date === date);
  const provaDay = !plantaoDay && (state.shift === 'prova' || (!state.shift && !!examToday));
  const posProva = state.shift === 'pos_prova';
  const posPlantao = posPlantaoDay || posProva; // descanso depois do plantão ou da prova
  const plantao = plantaoDay || provaDay; // só o essencial
  const turnsDay = turnCapacity(prefs, dow);
  const firstSteps = firstContactSteps(prefs);
  const examWeek = isExamWeek(prefs, date);
  const rest = prefs.restDay === dow || posPlantao || !!turnsDay?.allRest;
  const mixed = prefs.mixedDay === dow && !rest && !plantao;
  const dayKind: DayKind = lowEnergy
    ? 'low_energy'
    : posProva
      ? 'pos_prova'
      : posPlantaoDay
        ? 'pos_plantao'
        : rest
          ? 'rest'
          : provaDay
            ? 'prova'
            : plantaoDay
              ? 'plantao'
              : mixed
                ? 'mixed'
                : 'normal';

  // Prova: disciplinas com prova em até 7 dias sobem; nos 2 dias antes, conteúdo novo de outras disciplinas sai
  const soon7 = subjectsWithExamWithin(exams, subjects, date, 7);
  const soon2 = subjectsWithExamWithin(exams, subjects, date, 2);
  const examEve = exams
    .filter((e) => e.grade === undefined && e.date >= date && daysBetween(date, e.date) <= 1)
    .sort((a, b) => a.date.localeCompare(b.date))[0];

  let capacity = state.capacity && state.capacity > 0 ? state.capacity : prefs.dailyPomodoros;
  if (rest && !state.capacity) capacity = 1;
  else {
    // Dia difícil e plantão: vale o menor dos dois
    // Semana por turnos: menos turnos livres, menos foco
    if (turnsDay && !state.capacity) capacity = Math.min(capacity, turnsDay.capacity);
    if (lowEnergy && !state.capacity) capacity = Math.min(capacity, Math.max(2, Math.round(prefs.dailyPomodoros / 3)));
    if (plantao && !state.capacity) capacity = Math.min(capacity, 2);
    // Semana de prova: estudo intensificado (+50%), menos no dia difícil e no plantão
    if (examWeek && !state.capacity && !lowEnergy && !plantao) capacity = Math.min(16, Math.round(capacity * 1.5));
  }
  // Blocos do aluno: curto para revisões/questões, longo para tema novo (no dia difícil/plantão, só o curto)
  const shortFocus = prefs.shortFocusMinutes;
  const newFocus = lowEnergy || plantao ? prefs.shortFocusMinutes : prefs.focusMinutes;
  const breakFor = (focus: number) =>
    focus === prefs.focusMinutes && !(lowEnergy || plantao) ? prefs.breakMinutes : focus === prefs.shortFocusMinutes ? prefs.shortBreakMinutes : Math.max(5, Math.round(focus / 5));

  const all: PlanTask[] = [];
  const mk = (t: Omit<PlanTask, 'done' | 'skipped'> & { autoDone?: boolean; sized?: boolean }): PlanTask => {
    const { autoDone, sized, ...rest2 } = t;
    // Tarefas do bloco curto vêm em "nº de blocos"; viram unidades de 25 min no tamanho do bloco do aluno
    if (!sized && rest2.focus === shortFocus && rest2.pomodoros > 0) rest2.pomodoros = units(shortFocus, rest2.pomodoros);
    return { ...rest2, breakMin: rest2.breakMin ?? breakFor(rest2.focus), done: !!autoDone || doneSet.has(t.id), skipped: skipSet.has(t.id) };
  };

  // 1. Flashcards do dia (no domingo/pós-plantão fica opcional)
  if (prefs.usesFlashcards) {
    all.push(
      mk({
        id: `fc:${date}`,
        kind: 'flashcards',
        priority: 1,
        emoji: '🃏',
        color: '#14b8a6',
        title: 'Flashcards do dia',
        subtitle: 'Comece por aqui: seus cartões do dia (Anki ou flashcards)',
        reason: 'Fazer os cartões todo dia evita a avalanche de atrasados.',
        steps: ['Faça os cartões do dia no Anki ou nos seus flashcards', 'Seja honesto nos botões: errei, difícil, bom, fácil', 'Poucos cartões novos por dia'],
        pomodoros: 1,
        focus: shortFocus,
        optional: rest,
      })
    );
  }
  // 1b. Ler o resumo do dia (leitura ativa)
  if (prefs.readsSummary !== false) {
    all.push(
      mk({
        id: `sum:${date}`,
        kind: 'summary',
        priority: 1,
        emoji: '📖',
        color: '#0ea5e9',
        title: 'Ler o resumo do dia',
        subtitle: 'Leitura ativa do seu resumo (o do tema de hoje ou de uma revisão)',
        reason: 'Ler tentando lembrar antes fixa muito mais do que só reler.',
        steps: ['Escolha o resumo do tema de hoje ou de uma revisão', 'Tampe um trecho e tente lembrar antes de ler', 'No fim, diga em voz alta 3 pontos que ficaram'],
        pomodoros: 1,
        focus: shortFocus,
        optional: rest,
      })
    );
  }

  // 2. Revisões de temas (qualquer semestre, disciplina existente)
  const reviewBlocks = blocks.filter((b) => {
    if (!subjectIds.has(b.subjectId) || b.reviewStatus === 'estudando') return false;
    if (isToday) return (!b.paused && isBlockDue(b, today)) || b.lastReviewDate === today;
    if (isPast) return b.lastReviewDate === date;
    return !b.paused && b.nextReviewDate === date;
  });
  const reviewTasks = reviewBlocks.map((b) => {
    const reviewedThatDay = b.lastReviewDate === date;
    const prevLog = b.reviewLog ? b.reviewLog.slice(0, -1) : [];
    const tech = reviewTechnique(
      reviewedThatDay ? { reviewsDone: Math.max(0, b.reviewsDone - 1), difficulty: prevLog[prevLog.length - 1]?.difficulty, reviewLog: prevLog } : b,
      subjects.find((s) => s.id === b.subjectId)?.format
    );
    const late = isToday && !reviewedThatDay ? overdueDays(b, today) : 0;
    const errs = errorsOfBlock(method.errorNotes || [], b.id).length;
    return mk({
      id: `rev:${b.id}`,
      kind: 'review',
      priority: 1,
      emoji: tech.emoji,
      color: tech.color,
      title: `${tech.badge}: ${b.name}`,
      subtitle: [subjectName(subjects, b.subjectId), errs > 0 && tech.reviewNumber > 1 ? `${errs} erro${errs > 1 ? 's' : ''} do caderno para refazer` : ''].filter(Boolean).join(' · ') || undefined,
      reason: late > 0 ? `Remarcada (desde ${late} dia${late > 1 ? 's' : ''} atrás): revisões vêm antes de conteúdo novo.` : soon7.has(b.subjectId) ? 'Tem prova desta disciplina nos próximos dias.' : tech.why,
      steps: tech.id === 'folha_branco' ? secondContactSteps(prefs, tech.steps) : tech.steps,
      pomodoros: tech.pomodoros,
      focus: shortFocus,
      technique: tech.id,
      reviewNumber: tech.reviewNumber,
      questions: tech.questions,
      subjectId: b.subjectId,
      blockId: b.id,
      overdueDays: late,
      star: !!b.star,
      optional: rest,
      movable: 'review',
      autoDone: reviewedThatDay,
    });
  });
  reviewTasks.sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if ((b.overdueDays || 0) !== (a.overdueDays || 0)) return (b.overdueDays || 0) - (a.overdueDays || 0);
    if (!!b.star !== !!a.star) return b.star ? 1 : -1;
    const ea = soon7.has(a.subjectId || '') ? 1 : 0;
    const eb = soon7.has(b.subjectId || '') ? 1 : 0;
    if (ea !== eb) return eb - ea;
    return (lastPct(blocks.find((x) => x.id === a.blockId)) ?? 1) - (lastPct(blocks.find((x) => x.id === b.blockId)) ?? 1);
  });
  all.push(...reviewTasks);

  // 2b. Revisões de itens de Estudos pessoais
  projects.forEach((p) =>
    p.items.forEach((it) => {
      if (!it.inReview) return;
      const reviewedThatDay = it.lastReviewDate === date;
      const due = isToday ? isItemReviewDue(it, today) || reviewedThatDay : isPast ? reviewedThatDay : it.nextReviewDate === date;
      if (!due) return;
      const n = reviewedThatDay ? it.reviewsDone || 1 : (it.reviewsDone || 0) + 1;
      const tech = projectReviewTechnique(n, p.kind);
      all.push(
        mk({
          id: `prev:${p.id}:${it.id}`,
          kind: 'project_review',
          priority: 1,
          emoji: p.emoji || tech.emoji,
          color: p.color || tech.color,
          title: `${tech.badge}: ${it.title}`,
          subtitle: `Estudo pessoal · ${p.title}`,
          reason: tech.why,
          steps: tech.steps,
          pomodoros: 1,
          focus: shortFocus,
          technique: tech.id,
          reviewNumber: n,
          projectId: p.id,
          itemId: it.id,
          optional: rest,
          movable: 'project_review',
          autoDone: reviewedThatDay,
        })
      );
    })
  );

  // 2b. Turnos planejados (modo detalhado): matéria, assunto e forma de estudo de cada turno livre
  if (prefs.turnsDetailed && prefs.turnPlans && !rest && !plantao && !lowEnergy) {
    const freeIdx = TURN_KEYS.map((_, i) => i).filter((i) => !turnsDay || turnsDay.turns[i] === 'livre');
    const planned = freeIdx.filter((i) => {
      const tp = prefs.turnPlans?.[turnKey(dow, TURN_KEYS[i])];
      return !!tp && !!(tp.subjectId || tp.method || tp.note);
    });
    // O que já está no plano (flashcards, resumo, revisões) sai da conta antes de dividir
    const taken = all.filter((t) => !t.optional && !t.skipped).reduce((a, t) => a + t.pomodoros, 0);
    const share = Math.max(1, Math.min(4, Math.floor(Math.max(0, capacity - taken) / Math.max(1, planned.length))));
    planned.forEach((i) => {
      const tp = prefs.turnPlans?.[turnKey(dow, TURN_KEYS[i])];
      if (!tp) return;
      const m = TURN_METHODS.find((x) => x.id === tp.method);
      const subj = tp.subjectId ? subjectName(subjects, tp.subjectId) : '';
      const topic = tp.topicId ? topics.find((t) => t.id === tp.topicId)?.title : '';
      all.push(
        mk({
          id: `turn:${date}:${TURN_KEYS[i]}`,
          kind: 'custom',
          priority: 2,
          emoji: m?.emoji || '🕒',
          color: tp.subjectId ? subjectColor(subjects, tp.subjectId) : '#0ea5e9',
          title: `${TURN_LABELS[i]}: ${[subj, m?.label].filter(Boolean).join(' · ') || tp.note}`,
          subtitle: [topic, tp.note && (subj || m) ? tp.note : ''].filter(Boolean).join(' · ') || 'Turno que você planejou',
          reason: 'Você planejou este turno em Minha rotina.',
          steps: [],
          pomodoros: share,
          focus: tp.method === 'tema_novo' ? newFocus : shortFocus,
          subjectId: tp.subjectId,
          topicIds: tp.topicId ? [tp.topicId] : undefined,
          sized: true,
        })
      );
    });
  }

  // 3. Tarefas que o aluno adicionou
  (state.custom || []).forEach((c) =>
    all.push(
      mk({
        id: `custom:${c.id}`,
        kind: 'custom',
        priority: 2,
        emoji: '📌',
        color: '#64748b',
        title: c.title,
        subtitle: 'Tarefa sua',
        steps: [],
        pomodoros: c.pomodoros,
        focus: shortFocus,
        customId: c.id,
        movable: 'custom',
        autoDone: !!c.done,
      })
    )
  );

  if (!rest) {
    // 4. Refazer erros do caderno (os sem tema em revisão; os de tema voltam dentro da revisão)
    const notes = method.errorNotes || [];
    const dueErrors = notes.filter((n) => {
      if (n.status === 'resolvido') return false;
      if (n.blockId) {
        const b = blocks.find((x) => x.id === n.blockId);
        if (b && b.reviewStatus !== 'estudando' && !b.paused) return false;
      }
      return isToday ? isErrorDue(n, today) : nextErrorRedo(n) === date;
    });
    const redoneHere = notes.some((n) => n.lastRedo === date && !n.blockId);
    if (dueErrors.length > 0 || (isToday && redoneHere)) {
      all.push(
        mk({
          id: `err:${date}`,
          kind: 'error_redo',
          priority: 2,
          emoji: '📒',
          color: '#f59e0b',
          title: dueErrors.length > 0 ? `Refazer ${dueErrors.length} erro${dueErrors.length > 1 ? 's' : ''} do caderno` : 'Caderno de erros em dia',
          subtitle: 'Tente responder antes de olhar a regra anotada',
          reason: 'Erro corrigido uma vez ainda precisa voltar (7 e 30 dias depois).',
          steps: ['Abra o caderno de erros', 'Para cada erro, responda antes de mostrar a regra', 'Marque "Acertei" ou "Errei de novo"'],
          pomodoros: dueErrors.length > 8 ? 2 : 1,
          focus: shortFocus,
          autoDone: isToday && dueErrors.length === 0,
        })
      );
    }

    // 5. Questões fixas da fase (clínico, internato, residência)
    const resProject = projects.find((p) => p.kind === 'residencia');
    if (phase === 'ciclo_clinico' || phase === 'internato' || residencyPrep) {
      const doneQ = resProject ? sessions.some((s) => s.projectId === resProject.id && s.activity === 'phase_questions' && sessionDate(s) === date) : false;
      all.push(
        mk({
          id: `pq:${date}`,
          kind: 'phase_questions',
          priority: 2,
          emoji: residencyPrep ? '🎯' : phase === 'internato' ? '📱' : '🩺',
          color: residencyPrep ? '#e11d48' : '#0ea5e9',
          title: residencyPrep ? 'Questões do dia (eixo da residência)' : phase === 'internato' ? 'Bloco curto de questões no celular' : 'Questões clínicas do dia',
          subtitle: residencyPrep ? 'Sugestão: 30 questões · leia os comentários' : phase === 'internato' ? 'Sugestão: 10 questões entre as atividades' : 'Sugestão: 10 a 15 questões clínicas',
          reason: residencyPrep ? 'Na preparação para a residência, as questões são o eixo principal.' : PHASE_INFO[phase].tips[0],
          steps: ['Responda sem consultar e marque sua certeza', 'Leia o comentário de todas as alternativas', 'Anote os erros no caderno com o tipo'],
          pomodoros: residencyPrep ? 2 : 1,
          focus: shortFocus,
          questions: residencyPrep ? 30 : phase === 'internato' ? 10 : 15,
          projectId: residencyPrep ? resProject?.id : undefined,
          autoDone: doneQ,
        })
      );
    }

    if (!plantao) {
      // 6. Sábado: misturadas + caderno (só temas com base: R2 feita); reta final: 1 tarefa da prova mais próxima
      const withBase = blocks.filter((b) => subjectIds.has(b.subjectId) && b.reviewStatus !== 'estudando' && b.reviewsDone >= 2).length;
      if (mixed) {
        all.push(
          mk({
            id: `mix:${date}`,
            kind: 'mixed',
            priority: 2,
            emoji: '🔀',
            color: '#ec4899',
            title:
              withBase === 0
                ? 'Caderno de erros + questões do tema'
                : phase === 'ciclo_basico'
                  ? 'Questões misturadas (provas da faculdade)'
                  : residencyPrep
                    ? 'Simulado / questões misturadas'
                    : 'Questões misturadas de várias áreas',
            subtitle: withBase === 0 ? 'Misturar só depois de ter a base (R2 feita)' : `Misturamos só o que você já tem base (${withBase} tema${withBase > 1 ? 's' : ''})`,
            reason: 'No sábado o guia pede intercalação e a releitura ATIVA do caderno de erros.',
            steps:
              withBase === 0
                ? ['Responda o caderno de erros tentando lembrar a regra antes de olhar', 'Faça questões só do tema que estudou nesta semana']
                : ['Faça um bloco de questões misturando os temas com base', 'Responda o caderno de erros tentando lembrar a regra antes de olhar', 'Anote os erros novos'],
            pomodoros: 2,
            focus: shortFocus,
            questions: 30,
          })
        );
      }
      // Assuntos da prova: o próximo passo do check list de cada prova (as 2 mais próximas, até 30 dias)
      exams
        .filter((e) => e.grade === undefined && e.date > date && daysBetween(date, e.date) <= 30 && (e.examTopics || []).length > 0)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 2)
        .forEach((e) => {
          const step = nextExamStep(e);
          if (!step) return;
          const info = EXAM_TASKS[step.task];
          const left = daysBetween(date, e.date);
          const prog = examProgress(e);
          const q = step.topic.questions || 10;
          all.push(
            mk({
              id: `etopic:${e.id}:${step.topic.id}:${step.task}`,
              kind: 'exam_topic',
              priority: 2,
              emoji: info.emoji,
              color: '#6366f1',
              title: `${info.label}: ${step.topic.title}`,
              subtitle: `${examDisplayTitle(e)} · faltam ${left} dia${left > 1 ? 's' : ''} · ${prog.pct}% dos assuntos`,
              reason: 'Assuntos da prova que você listou: um passo por vez, com tempo para revisar antes.',
              steps: [info.step(step.topic.title, q), 'No fim, diga em voz alta os 3 pontos principais', 'Marque o passo no check list da prova'],
              pomodoros: step.task === 'questoes' ? (q >= 20 ? 2 : 1) : step.task === 'aula' || step.task === 'fazer_resumo' ? 2 : 1,
              focus: shortFocus,
              examId: e.id,
              subjectId: examSubjectId(e, subjects),
              questions: step.task === 'questoes' ? q : undefined,
            })
          );
        });
      const nextExam = exams
        .filter((e) => e.grade === undefined && e.date > date && daysBetween(date, e.date) <= 14)
        .sort((a, b) => a.date.localeCompare(b.date))[0];
      if (nextExam) {
        const left = daysBetween(date, nextExam.date);
        if (left === 1) {
          all.push(
            mk({
              id: `exam:${nextExam.id}:${date}`,
              kind: 'exam_prep',
              priority: 2,
              emoji: '🛌',
              color: '#6366f1',
              title: `Prova amanhã: ${nextExam.title}`,
              subtitle: 'Caderno de erros + dormir no horário',
              reason: 'Trocar sono por estudo na véspera costuma ser mau negócio: o sono consolida a memória.',
              steps: ['Responda o caderno de erros dos temas da prova', 'Folha em branco dos pontos principais', 'Durma no seu horário de sempre'],
              pomodoros: 1,
              focus: shortFocus,
              examId: nextExam.id,
              subjectId: examSubjectId(nextExam, subjects),
            })
          );
        } else if (left % 3 === 0 || mixed || left <= 3) {
          all.push(
            mk({
              id: `exam:${nextExam.id}:${date}`,
              kind: 'exam_prep',
              priority: 2,
              emoji: '⏳',
              color: '#6366f1',
              title: `Reta final: ${nextExam.title} (faltam ${left} dias)`,
              subtitle: 'Simulado com tempo ou bloco misturado dos temas da prova',
              reason: 'Na reta final, blocos misturados e simulados treinam estratégia, tempo e resistência.',
              steps: ['Faça questões misturadas dos temas da prova, com tempo (Pomodoro livre)', 'Corrija lendo todos os comentários', 'Anote os erros no caderno'],
              pomodoros: 2,
              focus: shortFocus,
              examId: nextExam.id,
              subjectId: examSubjectId(nextExam, subjects),
            })
          );
        }
      }

      // 7. Tutoria (Básico/Clínico): objetivos pendentes antes do fechamento + cabide
      if (phase !== 'internato') {
        subjects
          .filter((s) => currentIds.has(s.id) && s.format === 'tutoria')
          .forEach((s) => {
            (s.tutorials || [])
              .filter((tut) => tut.closingGrade === undefined)
              .forEach((tut) => {
                const pending = topics.filter((t) => t.subjectId === s.id && (t.moduleName || '') === tut.name && !t.cabide && !isTopicSeen(t));
                if (pending.length === 0) return;
                all.push(
                  mk({
                    id: `tut:${s.id}:${tut.id}:${date}`,
                    kind: 'tutoria',
                    priority: 3,
                    emoji: '🧩',
                    color: s.color || '#8b5cf6',
                    title: `Objetivos da ${tut.name} (${s.name})`,
                    subtitle: `${pending.length} objetivo${pending.length > 1 ? 's' : ''} para estudar antes do fechamento`,
                    reason: 'Na tutoria, o conteúdo novo da semana são os objetivos da abertura.',
                    steps: firstSteps,
                    pomodoros: units(newFocus, Math.min(2, Math.max(1, Math.ceil(pending.length / 3)))),
                    sized: true,
                    focus: newFocus,
                    subjectId: s.id,
                    topicIds: pending.map((t) => t.id),
                  })
                );
              });
            const cabide = topics.filter((t) => t.subjectId === s.id && t.cabide && !isTopicSeen(t));
            if (cabide.length > 0)
              all.push(
                mk({
                  id: `cab:${s.id}:${date}`,
                  kind: 'tutoria',
                  priority: 3,
                  emoji: '🪝',
                  color: '#e11d48',
                  title: `Cabide de ${s.name}: ${cabide.length} assunto${cabide.length > 1 ? 's' : ''}`,
                  subtitle: cabide
                    .slice(0, 3)
                    .map((t) => t.title)
                    .join(' · '),
                  reason: 'O que ficou de cabide no fechamento entra como conteúdo para estudar.',
                  steps: firstSteps,
                  pomodoros: 1,
                  focus: shortFocus,
                  subjectId: s.id,
                  topicIds: cabide.map((t) => t.id),
                })
              );
          });
      }

      // 8. Conteúdo novo: blocos programados, 1º contato programado, ou uma sugestão
      const examFocus = soon2.size > 0;
      const plannedBlocks = blocks.filter(
        (b) =>
          currentIds.has(b.subjectId) &&
          !b.paused &&
          // Programado para o dia, ou concluído no dia (inclusive a sugestão que o aluno aceitou e terminou)
          ((b.reviewStatus === 'estudando' && !!b.plannedDate && (isToday ? b.plannedDate <= today : !isPast && b.plannedDate === date)) || b.completedDate === date)
      );
      plannedBlocks
        .sort((a, b) => Number(soon7.has(b.subjectId)) - Number(soon7.has(a.subjectId)))
        .forEach((b) => {
          const late = isToday && b.reviewStatus === 'estudando' && b.plannedDate && b.plannedDate < today ? daysBetween(b.plannedDate, today) : 0;
          const bt = topics.filter((t) => t.blockId === b.id);
          const seen = bt.filter(isTopicSeen).length;
          const offFocus = examFocus && !soon2.has(b.subjectId) && b.completedDate !== date;
          all.push(
            mk({
              id: `new:${b.id}`,
              kind: 'new_block',
              priority: 3,
              emoji: '🌱',
              color: subjectColor(subjects, b.subjectId),
              title: `Tema novo: ${b.name}`,
              subtitle: `${subjectName(subjects, b.subjectId)}${bt.length ? ` · ${seen}/${bt.length} tópicos vistos` : ''}`,
              reason: offFocus ? 'Véspera de prova: este tema pode esperar; foque na disciplina da prova.' : late > 0 ? `Remarcado: estava para ${late} dia${late > 1 ? 's' : ''} atrás.` : TECHNIQUES.estudo_inicial.why,
              steps: firstSteps,
              pomodoros: units(newFocus, newTopicBlocks(newFocus)),
              sized: true,
              focus: newFocus,
              technique: 'estudo_inicial',
              subjectId: b.subjectId,
              blockId: b.id,
              overdueDays: late,
              optional: offFocus,
              movable: 'new_block',
              autoDone: b.completedDate === date,
            })
          );
        });
      const scheduledTopics = topics.filter(
        (t) =>
          currentIds.has(t.subjectId) &&
          t.scheduleFirstContact &&
          t.firstContactDate &&
          (isToday ? t.firstContactDate <= today && (!isTopicSeen(t) || t.lastStudiedDate === today) : t.firstContactDate === date && (!isPast || isTopicSeen(t))) &&
          !plannedBlocks.some((b) => b.id === t.blockId) &&
          !t.cabide &&
          // Na tutoria (Básico/Clínico) os objetivos já entram no passo 7
          !(phase !== 'internato' && subjects.find((s) => s.id === t.subjectId)?.format === 'tutoria')
      );
      const bySubject = new Map<string, Topic[]>();
      scheduledTopics.forEach((t) => bySubject.set(t.subjectId, [...(bySubject.get(t.subjectId) || []), t]));
      bySubject.forEach((list, sid) => {
        const allDone = list.every(isTopicSeen);
        all.push(
          mk({
            id: `ntop:${sid}:${date}`,
            kind: 'new_topics',
            priority: 3,
            emoji: '🌱',
            color: subjectColor(subjects, sid),
            title: `1º contato: ${list.length === 1 ? list[0].title : `${list.length} tópicos`}`,
            subtitle: `${subjectName(subjects, sid)}${list.length > 1 ? ' · ' + list.slice(0, 3).map((t) => t.title).join(' · ') : ''}`,
            reason: TECHNIQUES.estudo_inicial.why,
            steps: firstSteps,
            pomodoros: units(newFocus, Math.min(2, Math.max(1, Math.ceil(list.length / 2)))),
            sized: true,
            focus: newFocus,
            technique: 'estudo_inicial',
            subjectId: sid,
            topicIds: list.map((t) => t.id),
            optional: examFocus && !soon2.has(sid),
            movable: 'new_topics',
            autoDone: allDone,
          })
        );
      });
      const newCount = plannedBlocks.length + bySubject.size;
      if (isToday && !lowEnergy && prefs.topicMode !== 'manual' && newCount < prefs.newTopicsPerDay) {
        const candidates = blocks
          .filter((b) => currentIds.has(b.subjectId) && b.reviewStatus === 'estudando' && !b.plannedDate && !b.paused)
          .sort((a, b) => Number(soon7.has(b.subjectId)) - Number(soon7.has(a.subjectId)) || a.createdAt.localeCompare(b.createdAt))
          .slice(0, prefs.newTopicsPerDay - newCount);
        candidates.forEach((b) =>
          all.push(
            mk({
              id: `new:${b.id}`,
              kind: 'new_block',
              priority: 3,
              emoji: '💡',
              color: subjectColor(subjects, b.subjectId),
              title: `Sugestão de tema novo: ${b.name}`,
              subtitle: subjectName(subjects, b.subjectId),
              reason: soon7.has(b.subjectId) ? 'Sugestão: tem prova desta disciplina em breve.' : 'Sugestão automática: é o tema em estudo mais antigo sem data.',
              steps: firstSteps,
              pomodoros: units(newFocus, newTopicBlocks(newFocus)),
              sized: true,
              focus: newFocus,
              technique: 'estudo_inicial',
              subjectId: b.subjectId,
              blockId: b.id,
              suggested: true,
              optional: true,
              movable: 'new_block',
            })
          )
        );
      }

      // 9. Estudos pessoais (mínimo protegido de 1 bloco nos dias escolhidos)
      projects.forEach((p) => {
        if (residencyPrep && p.kind === 'residencia') return; // a residência já está nas "Questões do dia"
        const preferred = p.days && p.days.length > 0 ? p.days.includes(dow) : true;
        if (!preferred) return;
        const doneWeek = projectWeekPomodoros(p, sessions, date);
        const remaining = Math.max(0, p.weeklyPomodoros - doneWeek);
        const doneToday = sessions.some((s) => s.projectId === p.id && s.activity !== 'phase_questions' && sessionDate(s) === date);
        if (remaining <= 0 && !doneToday) return;
        const item = nextProjectItem(p);
        const daysLeft = p.days && p.days.length > 0 ? p.days.length : 5;
        all.push(
          mk({
            id: `proj:${p.id}:${date}`,
            kind: 'project',
            priority: 3,
            emoji: p.emoji || '✨',
            color: p.color || '#64748b',
            title: `Estudo pessoal: ${p.title}`,
            subtitle: item ? `Próximo: ${item.title}` : `Meta da semana: ${doneWeek}/${p.weeklyPomodoros} blocos`,
            reason: `Meta da semana: ${doneWeek}/${p.weeklyPomodoros} blocos. Este bloco fica protegido nos dias que você escolheu.`,
            steps: item ? [`Estude: ${item.title}`, 'No fim, escreva de memória o que tirou daqui (folha em branco de 5 min)'] : ['Escolha o próximo passo do projeto'],
            pomodoros: Math.max(1, Math.min(2, Math.ceil(remaining / daysLeft))),
            sized: true,
            focus: shortFocus,
            projectId: p.id,
            autoDone: doneToday,
          })
        );
      });
    }

    // 10. Folha em branco no fim do dia
    all.push(
      mk({
        id: `blank:${date}`,
        kind: 'blank_page',
        priority: 2,
        emoji: '🌙',
        color: '#6366f1',
        title: 'Folha em branco do dia (10 min)',
        subtitle: 'Escreva tudo o que aprendeu hoje, sem consultar',
        reason: 'Fechar o dia tentando lembrar é recuperação ativa de graça.',
        steps: ['Sem consultar, escreva tudo o que aprendeu hoje', 'Marque o que não conseguiu lembrar para revisar amanhã'],
        pomodoros: 0,
        focus: shortFocus,
      })
    );
  } else {
    all.push(
      mk({
        id: `plan:${date}`,
        kind: 'weekly_planning',
        priority: 2,
        emoji: posPlantao ? '😴' : '🗓️',
        color: '#0ea5e9',
        title: posProva ? 'Pós-prova: descanse' : posPlantao ? 'Pós-plantão: descanse' : 'Planejar a semana (20 min)',
        subtitle: posPlantao ? 'Só o essencial, se der vontade' : 'Temas novos, revisões que vencem e pontos fracos',
        reason: posProva
          ? 'Depois da prova a cabeça precisa descansar. Amanhã o plano volta ao normal.'
          : posPlantao
            ? 'Depois do plantão o corpo precisa recuperar. Dormir bem também é estudar.'
            : 'Domingo é descanso de verdade, com 20 minutos para planejar a semana.',
        steps: posPlantao ? ['Durma e coma bem', 'Se quiser, faça só os flashcards do dia'] : ['Abra "Planejar semana" no Planner', 'Distribua os temas novos nos dias', 'Veja as revisões e provas da semana'],
        pomodoros: posPlantao ? 0 : 1,
        focus: shortFocus,
      })
    );
  }

  // "Planejar dia": a ordem escolhida pelo aluno vem antes da prioridade calculada
  if (state.order?.length) {
    const pos = new Map(state.order.map((id, i) => [id, i]));
    const idx = new Map(all.map((t, i) => [t.id, i]));
    all.sort((a, b) => (pos.get(a.id) ?? 1000 + (idx.get(a.id) || 0)) - (pos.get(b.id) ?? 1000 + (idx.get(b.id) || 0)));
  }
  const pinnedSet = new Set(state.pinned || []);
  // Encaixa pela capacidade (a ordem acima já é a prioridade). Uma revisão sempre entra.
  const tasks: PlanTask[] = [];
  const overflow: PlanTask[] = [];
  let used = 0;
  let reviewsIn = 0;
  for (const t0 of all) {
    // Fixada pelo aluno no "Planejar dia" deixa de ser opcional
    const t = pinnedSet.has(t0.id) && t0.optional ? { ...t0, optional: false, reason: 'Você fixou esta tarefa para hoje no Planejar dia.' } : t0;
    if (t.skipped) {
      overflow.push(t);
      continue;
    }
    if (rest && (t.kind === 'review' || t.kind === 'project_review' || t.kind === 'flashcards' || t.kind === 'summary')) {
      tasks.push({ ...t, optional: true });
      continue;
    }
    const isReview = t.kind === 'review' || t.kind === 'project_review';
    const always = t.done || pinnedSet.has(t.id) || t.kind === 'blank_page' || t.kind === 'custom' || t.kind === 'weekly_planning' || (isReview && reviewsIn === 0);
    const protectedProject = t.kind === 'project' && !lowEnergy && !plantao && !examEve && !overflow.some((o) => o.kind === 'project');
    if (always || used + t.pomodoros <= capacity || (protectedProject && t.pomodoros <= 1)) {
      tasks.push(t);
      if (!t.optional || t.done) used += t.pomodoros;
      if (isReview) reviewsIn++;
    } else if (t.optional) {
      overflow.push(t);
    } else {
      overflow.push(t);
    }
  }

  const counted = tasks.filter((t) => !t.optional || t.done);
  const doneCount = counted.filter((t) => t.done).length;
  const next = tasks.find((t) => !t.done && !t.optional && t.kind !== 'blank_page') || tasks.find((t) => !t.done && t.kind !== 'blank_page');
  const overflowReviews = overflow.filter((t) => (t.kind === 'review' || t.kind === 'project_review') && !t.skipped).length;

  const examReminders = isToday
    ? exams
        .map((e) => ({ e, left: examReminderToday(e, date) }))
        .filter((x): x is { e: Exam; left: number } => x.left !== undefined)
        .map(({ e, left }) => ({ examId: e.id, daysLeft: left, text: examReminderText(e, left) }))
    : [];
  let message: string | undefined;
  if (lowEnergy) message = `Dia difícil? Tudo bem. Faça só o essencial, em blocos curtos de ${prefs.shortFocusMinutes} minutos. Um passo pequeno ainda conta.`;
  else if (posProva) message = 'Pós-prova: dia de descanso. Você merece. Se der vontade, só os flashcards ou o resumo.';
  else if (posPlantao) message = 'Pós-plantão: dia de descanso. Descanse; se der, faça só os flashcards.';
  else if (rest) message = 'Hoje é dia de descanso de verdade. Separe só 20 minutos para planejar a semana.';
  else if (provaDay)
    message = `Dia de prova${examToday ? `: ${examToday.title}` : ''}. Só uma revisão leve antes (resumo ou flashcards), nada de conteúdo novo. Boa prova!`;
  else if (plantao) message = 'Dia de plantão: só o essencial. Use os pacientes como gatilho para revisar temas.';
  else if (examEve) message = `Prova ${examEve.date === date ? 'hoje' : 'amanhã'}: ${examEve.title}. Não passe da conta e durma no horário de sempre.`;
  else if (overflowReviews > 0) message = `+${overflowReviews} revisão${overflowReviews > 1 ? 'ões' : ''} na fila que não coube${overflowReviews > 1 ? 'ram' : ''} hoje. Use "Replanejar" para espalhar pelos próximos dias.`;
  else if (overflow.some((t) => !t.skipped && !t.optional)) message = 'Hoje tem mais do que cabe. As revisões vêm primeiro; o resto pode ir para amanhã.';
  else if (tasks.filter((t) => !['blank_page', 'flashcards', 'summary', 'phase_questions'].includes(t.kind)).length === 0)
    message = 'Nada agendado para hoje. Escolha um tema novo para começar ou faça questões.';

  return {
    date,
    dayKind,
    capacity,
    planned: used,
    tasks,
    overflow,
    overflowReviews,
    doneCount,
    totalCount: counted.length,
    next,
    message,
    sleepNote: SLEEP_NOTE,
    turnsNote: (() => {
      const wk = examWeek ? 'Semana de prova: estudo intensificado e foco nas matérias da prova.' : '';
      if (!turnsDay) return wk || undefined;
      const t = turnsDay.turns;
      let note = `Seus turnos hoje: ${TURN_LABELS.map((l, i) => `${l.toLowerCase()} ${TURN_WORD[t[i]]}`).join(' · ')}.`;
      const bi = prefs.bestTurn ? TURN_KEYS.indexOf(prefs.bestTurn) : -1;
      if (!rest && !plantao && bi >= 0 && t[bi] === 'livre') note += ` Faça o tema novo de ${TURN_LABELS[bi].toLowerCase()}, seu melhor turno.`;
      else if (!rest && t.every((x) => x !== 'livre')) note += ' Sem turno livre: só revisões curtas.';
      return wk ? `${wk} ${note}` : note;
    })(),
    tips: PHASE_INFO[phase].tips,
    phase,
    residencyPrep,
    examEve,
    examReminders,
  };
};

/** Carga dos dias (visão Semana / "Planejar semana"): demanda × capacidade em blocos de 25 min */
export const buildWeekLoad = (input: Omit<PlanInput, 'date'>, dates: string[]) =>
  dates.map((date) => {
    const p = buildDayPlan({ ...input, date });
    const every = [...p.tasks, ...p.overflow];
    const reviews = every.filter((t) => t.kind === 'review' || t.kind === 'project_review').length;
    const newTopics = every.filter((t) => (t.kind === 'new_block' || t.kind === 'new_topics') && !t.suggested).length;
    const demand = every.filter((t) => !t.optional).reduce((a, t) => a + t.pomodoros, 0);
    return { date, dayKind: p.dayKind, capacity: p.capacity, demand, reviews, newTopics, overloaded: demand > p.capacity, plan: p };
  });

/**
 * Distribui temas em estudo sem data pelos próximos dias (sem descanso e sem o dia de misturadas),
 * respeitando temas por dia e o espaço que sobra depois das revisões. Devolve { blockId: data }.
 */
export const autoDistributeNewTopics = (input: Omit<PlanInput, 'date'>, blockIds: string[], fromDate: string, days = 7) => {
  const result: Record<string, string> = {};
  const queue = [...blockIds];
  const per = units(input.prefs.focusMinutes, newTopicBlocks(input.prefs.focusMinutes));
  for (let i = 0; i < days && queue.length > 0; i++) {
    const date = addDaysYMD(i, fromDate);
    const dow = parseYMD(date).getDay();
    if (dow === input.prefs.restDay || dow === input.prefs.mixedDay) continue;
    const p = buildDayPlan({ ...input, date, today: fromDate });
    // Plantão, pós-plantão e descanso não recebem conteúdo novo
    if (p.dayKind === 'plantao' || p.dayKind === 'pos_plantao' || p.dayKind === 'rest' || p.dayKind === 'prova' || p.dayKind === 'pos_prova') continue;
    const every = [...p.tasks, ...p.overflow];
    const already = every.filter((t) => (t.kind === 'new_block' || t.kind === 'new_topics') && !t.suggested).length + Object.values(result).filter((d) => d === date).length;
    const load = every.filter((t) => !t.optional && t.kind !== 'new_block' && t.kind !== 'new_topics').reduce((a, t) => a + t.pomodoros, 0);
    let slots = Math.max(0, input.prefs.newTopicsPerDay - already);
    const free = p.capacity - load - already * per;
    slots = Math.min(slots, Math.max(Math.floor(free / per), already === 0 ? 1 : 0));
    for (let k = 0; k < slots && queue.length > 0; k++) result[queue.shift()!] = date;
  }
  return result;
};

// ---------------------------------------------------------------------------------------------
// Checklist diário (7 itens do guia)
// ---------------------------------------------------------------------------------------------
export interface HabitInfo {
  id: string;
  label: string;
  hint: string;
  emoji: string;
  /** O site marca sozinho quando percebe */
  auto?: boolean;
}

export const DAILY_HABITS: HabitInfo[] = [
  { id: 'ativa', label: 'Fiz recuperação ativa', hint: 'Questões, flashcards ou folha em branco', emoji: '🧠', auto: true },
  { id: 'revisoes_antes', label: 'Fiz as revisões antes do conteúdo novo', hint: 'Revisões têm prioridade', emoji: '🔁', auto: true },
  { id: 'feynman', label: 'Expliquei um mecanismo em voz alta', hint: 'Sem consultar (Feynman)', emoji: '🗣️' },
  { id: 'erros', label: 'Anotei os erros e o tipo de cada um', hint: 'Caderno de erros', emoji: '📒', auto: true },
  { id: 'flashcards', label: 'Criei flashcards só do que entendi', hint: 'Entender antes de memorizar', emoji: '🃏' },
  { id: 'foco', label: 'Estudei em blocos de foco com pausas de verdade', hint: 'Levantar, água, longe do celular', emoji: '⏱️', auto: true },
  { id: 'sono', label: 'Vou dormir num horário razoável', hint: 'O sono consolida a memória', emoji: '🌙' },
];

/** Itens que o site já sabe que você fez (o aluno marca os outros à mão) */
export const autoHabits = (args: {
  date: string;
  plan?: DayPlan;
  sessions: StudySession[];
  questionLogs: QuestionLog[];
  blocks: TopicBlock[];
  errorNotes: ErrorNote[];
}): Set<string> => {
  const { date, plan, sessions, questionLogs, blocks, errorNotes } = args;
  const out = new Set<string>();
  const reviewed = blocks.some((b) => b.lastReviewDate === date);
  const questions = questionLogs.some((q) => q.date === date);
  const errorsWork = errorNotes.some((n) => n.createdAt === date || n.lastRedo === date);
  if (reviewed || questions || errorsWork) out.add('ativa');
  if (errorNotes.some((n) => n.createdAt === date)) out.add('erros');
  if (sessions.some((s) => s.type === 'pomodoro' && sessionDate(s) === date)) out.add('foco');
  if (plan) {
    const reviews = plan.tasks.filter((t) => (t.kind === 'review' || t.kind === 'project_review') && !t.optional);
    const newDone = plan.tasks.some((t) => (t.kind === 'new_block' || t.kind === 'new_topics') && t.done);
    if (reviews.length > 0 ? reviews.every((t) => t.done) : newDone) out.add('revisoes_antes');
  }
  return out;
};

/** Mensagem de cuidado (ansiedade/sono fazem parte do método) */
export const WELLBEING_NOTE =
  'Cuidar da saúde mental faz parte do método. Se a ansiedade, o cansaço ou o desânimo estiverem pesando, procure o apoio psicopedagógico da sua faculdade ou um profissional de saúde.';

export const difficultyLabel: Record<TopicDifficulty, string> = { dificil: 'Difícil', medio: 'Médio', facil: 'Fácil' };

/** Curva do esquecimento (Ebbinghaus 1885, cap. 7): economia ao reaprender — dados reais do guia */
export const FORGETTING_CURVE = [
  { label: '20 min', pct: 58.2 },
  { label: '1 h', pct: 44.2 },
  { label: '9 h', pct: 35.8 },
  { label: '1 dia', pct: 33.7 },
  { label: '2 dias', pct: 27.8 },
  { label: '6 dias', pct: 25.4 },
  { label: '31 dias', pct: 21.1 },
];
