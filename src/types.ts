export type TopicStatus = 'nao_iniciado' | 'em_andamento' | 'revisado' | 'dominado';
export type TopicPriority = 'alta' | 'media' | 'baixa';
export type PreferredStudyMethod = 'questoes' | 'videoaula' | 'resumo' | 'livros' | 'pessoal';
export type TopicDifficulty = 'dificil' | 'medio' | 'facil';

export interface Topic {
  id: string;
  subjectId: string;
  blockId?: string; // bloco da disciplina (ex.: "Diabetes"); a revisão é feita por bloco
  pending?: boolean; // "ver depois": conta para fechar o bloco, mas fica como pendência até ser visto
  moduleName?: string; // Matéria / Módulo dentro da disciplina
  specialty?: string; // especialidade (Clínica Médica): Cardiologia, Neurologia...
  title: string; // Nome do Assunto
  description?: string;
  status: TopicStatus;
  priority: 'alta' | 'media' | 'baixa';
  firstContactDate?: string; // YYYY-MM-DD
  studyTime?: string; // e.g. "08:00"
  scheduleFirstContact?: boolean;
  notificationsActive?: boolean;
  inSpacedRepetition?: boolean; // Inserir no Ciclo de Revisões Espaçadas
  preferredStudyMethods?: PreferredStudyMethod[];
  questionCount?: number;
  difficulty?: TopicDifficulty;
  cycleStep?: number; // 1, 2, 3, 4 (R1, R2, R3, R4...)
  reviewsDone?: number; // revisões espaçadas concluídas (0–4); na 4ª o assunto vira "dominado"
  intervalDays?: number; // 1, 3, 7, 15, 30, 60
  lastStudiedDate?: string;
  nextReviewDate?: string;
  notes?: string;
  imageUrl?: string; // Imagem/diagrama/esquema clínico anexado
  /** Tutoria: assunto que ficou "de cabide" (para estudar/revisar depois do fechamento) */
  cabide?: boolean;
  imageCaption?: string;
  tags?: string[];
  estimatedHours?: number;
}

export type BlockReviewStatus = 'estudando' | 'revisao' | 'dominado';

// Bloco de tópicos dentro de uma disciplina (ex.: Endocrinologia → Diabetes, Tireoide).
// Entra nas revisões quando todos os tópicos forem vistos; 4 revisões espaçadas → dominado.
export interface StudyTimePrompt {
  kind: 'block' | 'review';
  blockId: string;
  subjectId?: string;
  name: string;
  reviewNumber?: number;
}

export interface TopicBlock {
  /** Dia planejado para estudar o bloco (D0 no Planner) */
  plannedDate?: string;
  /** Tempo de estudo informado ao concluir o bloco (Dia 0) */
  studyMinutes?: number;
  id: string;
  subjectId: string;
  name: string;
  createdAt: string;
  reviewStatus: BlockReviewStatus;
  reviewsDone: number;
  completedDate?: string; // YYYY-MM-DD: dia em que todos os tópicos foram vistos (Dia 0)
  nextReviewDate?: string; // YYYY-MM-DD
  lastReviewDate?: string;
  difficulty?: TopicDifficulty; // última avaliação: define o plano sugerido da próxima revisão
  /** Fora da rotina: o plano não sugere, não programa e não cobra revisões deste tema */
  paused?: boolean;
  reviewLog?: Array<{
    date: string;
    difficulty: TopicDifficulty;
    questions?: number;
    correct?: number;
    /** Estado do bloco antes desta revisão (para desfazer) */
    prev?: { nextReviewDate?: string; lastReviewDate?: string; difficulty?: TopicDifficulty };
    /** Tempo de estudo informado na conclusão da revisão */
    minutes?: number;
    sessionId?: string;
    /** Técnica usada nesta revisão (folha em branco, questões do tema...) */
    stage?: ReviewTechniqueId;
    /** XP dado nesta revisão (devolvido ao desfazer) */
    xp?: number;
    /** Certeza marcada antes de conferir as questões */
    certainty?: Partial<Record<Certainty, number>>;
    /** Erros por tipo (lacuna, raciocínio, leitura, pressa) */
    errors?: Partial<Record<ErrorType, number>>;
  }>;
  /** ⭐ Tema que cai muito na prova: sobe na fila de revisões */
  star?: boolean;
  /** Passos do estudo inicial (Dia 0) já feitos: pré-teste, mapa, Feynman, flashcards, questões */
  initialSteps?: string[];
}

// Questões registradas (por bloco ou por tópico), somadas no semestre
export interface QuestionLog {
  id: string;
  date: string; // YYYY-MM-DD
  semesterId?: string;
  kind: 'block' | 'topic';
  subjectId?: string;
  blockId?: string;
  topicId?: string;
  total: number;
  correct: number;
  /** Tipo do bloco de questões (do tema, misturadas, simulado, pré-teste, refazer erros) */
  mode?: QuestionMode;
  errors?: Partial<Record<ErrorType, number>>;
}

// ===== Método de estudo (Guia Científico): revisões por etapa, caderno de erros, plano do dia =====
export type ReviewTechniqueId = 'estudo_inicial' | 'folha_branco' | 'questoes_tema' | 'questoes_novas' | 'misturadas';
export type ErrorType = 'lacuna' | 'raciocinio' | 'leitura' | 'pressa';
export type Certainty = 'chute' | 'duvida' | 'certeza';
export type QuestionMode = 'tema' | 'misturadas' | 'simulado' | 'pre_teste' | 'erros';

/** Caderno de erros: tema, por que errou e a regra correta em 1 linha; volta em 7 e 30 dias */
export interface ErrorNote {
  id: string;
  createdAt: string; // YYYY-MM-DD
  subjectId?: string;
  blockId?: string;
  theme: string;
  type: ErrorType;
  certainty?: Certainty;
  why?: string;
  rule: string;
  status: 'aberto' | 'resolvido';
  /** Datas para refazer (criação +7 e +30; reinicia se errar de novo) */
  redoDates: string[];
  redoneCount: number;
  lastRedo?: string;
  flashcard?: boolean;
}

export interface StudyPlanPrefs {
  /** Capacidade: blocos de foco (pomodoros) por dia de estudo */
  dailyPomodoros: number;
  /** Bloco longo (tema novo / imersão): minutos de foco. Cada aluno escolhe (25, 45, 50, 60, 90...) */
  focusMinutes: number;
  /** Pausa depois do bloco longo (min) */
  breakMinutes: number;
  /** Bloco curto (revisões, questões, flashcards): minutos de foco */
  shortFocusMinutes: number;
  /** Pausa depois do bloco curto (min) */
  shortBreakMinutes: number;
  /** Dia de descanso (0 = domingo … 6 = sábado); null = sem descanso fixo */
  restDay: number | null;
  /** Dia de questões misturadas + caderno de erros (6 = sábado); null = nenhum */
  mixedDay: number | null;
  /** Temas novos por dia */
  newTopicsPerDay: 1 | 2 | 3;
  /** Usa flashcards/Anki todo dia */
  usesFlashcards: boolean;
  /** Conteúdo novo: 'auto' = o plano escolhe entre os temas ativos; 'manual' = só os que você programar */
  topicMode?: 'auto' | 'manual';
  /** Meta de longo prazo (internato/residência): intervalos de manutenção mais longos */
  longTermGoal: boolean;
}

export interface PlanCustomTask {
  id: string;
  title: string;
  pomodoros: number;
  done?: boolean;
}

/** Estado manual de um dia do plano (o resto é calculado) */
export interface DayPlanState {
  done?: string[];
  skipped?: string[];
  custom?: PlanCustomTask[];
  lowEnergy?: boolean;
  /** Dia especial: prova / pós-prova (1º–10º semestre), plantão / pós-plantão (11º–12º). 'normal' desliga o automático */
  shift?: 'plantao' | 'pos_plantao' | 'prova' | 'pos_prova' | 'normal';
  /** "Planejar dia": tempo de foco de hoje (em unidades de 25 min), no lugar do padrão da rotina */
  capacity?: number;
  /** "Planejar dia": ordem escolhida pelo aluno (ids das tarefas) */
  order?: string[];
  /** "Planejar dia": tarefas que o aluno quer hoje mesmo se não couberem */
  pinned?: string[];
}

export type PersonalProjectKind = 'faculdade' | 'residencia' | 'liga' | 'idioma' | 'curso' | 'leitura' | 'pesquisa' | 'outro';

export interface PersonalProjectItem {
  id: string;
  title: string;
  done: boolean;
  doneAt?: string;
  /** Revisões do item (mesmo motor R1–R4; técnica: folha em branco / explicar / flashcards) */
  inReview?: boolean;
  reviewsDone?: number;
  nextReviewDate?: string;
  lastReviewDate?: string;
  difficulty?: TopicDifficulty;
}

/** Estudos pessoais: projetos fora da grade (residência, liga, idioma, curso, leitura, pesquisa) */
export interface PersonalProject {
  id: string;
  title: string;
  kind: PersonalProjectKind;
  emoji: string;
  color: string;
  /** Meta semanal em blocos de foco */
  weeklyPomodoros: number;
  /** Dias da semana preferidos (0 = domingo … 6 = sábado); vazio = qualquer dia */
  days?: number[];
  deadline?: string;
  items: PersonalProjectItem[];
  createdAt: string;
  archived?: boolean;
}

/** Tudo do método num objeto só (salvo local + nuvem como `studyMethod`) */
export interface StudyMethodState {
  version: 1;
  /** Só o que o aluno escolheu; o resto vem dos padrões da fase (resolvePrefs) */
  prefs?: Partial<StudyPlanPrefs>;
  errorNotes: ErrorNote[];
  /** Checklist diário: data → ids marcados à mão */
  habits: Record<string, string[]>;
  /** Plano do dia: data → estado manual */
  dayPlans: Record<string, DayPlanState>;
  projects: PersonalProject[];
  guideSeen?: boolean;
  /** Erros/projetos excluídos (id → data), para a exclusão valer em todos os aparelhos */
  deleted?: Record<string, string>;
}

export interface Subject {
  id: string;
  semesterId?: string;
  name: string;
  code: string;
  color: string;
  iconName?: string;
  majorArea?: string;
  specialty?: string; // especialidade dentro da Clínica Médica (Cardiologia, Neurologia...)
  universitySubject?: string;
  room?: string;
  workloadHours?: number;
  targetGrade: number;
  currentGradeAverage?: number;
  topicsCount?: number;
  completedTopicsCount?: number;
  /** Básico/Clínico: formato do componente na faculdade (Tutoria, Aula, Morfo, Anatomia...) */
  format?: SubjectFormat;
  /** Básico/Clínico: forma de organizar — por blocos (revisão espaçada) ou checklist Matéria → Tópico */
  organization?: SubjectOrganization;
  /** Checklist: ordem das matérias (inclui as que ainda não têm tópicos) */
  checklistModules?: string[];
  /** Tutoria (Básico/Clínico): sessões com abertura e fechamento */
  tutorials?: TutorialSession[];
}

export interface TutorialSession {
  id: string;
  name: string; // "Tutoria 1"
  date?: string;
  openingGrade?: number; // 0–5
  closingGrade?: number; // 0–5
  cabide?: boolean; // ficou de cabide no fechamento
}

export type SubjectFormat = 'tutoria' | 'aula' | 'morfo' | 'anatomia' | 'habilidades' | 'personalizada';
export type SubjectOrganization = 'blocos' | 'checklist';

export interface Semester {
  id: string;
  name: string; // e.g. "5º Semestre - Ciclo Clínico I"
  code: string; // e.g. "2026.1"
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  targetHoursWeekly: number;
  description?: string;
  period?: string; // período acadêmico "2026.1" (01/01–30/06) ou "2026.2" (01/08–31/12)
  customDates?: boolean; // datas de início/fim definidas pelo usuário (depois do fim = férias)
}

export type ExamShift = 'manha' | 'tarde' | 'noite';

export interface Exam {
  id: string;
  subjectId?: string; // legado: provas antigas vinculadas a uma disciplina cadastrada
  subjectName?: string; // nome livre da disciplina (Grade de Semestre)
  semesterId?: string;
  title: string; // e.g. "P1 - Cardiologia"
  date: string; // YYYY-MM-DD
  time?: string;
  shift?: ExamShift;
  weight: number;
  grade?: number; // nota lançada (undefined enquanto não sai)
  expectedGrade?: number; // nota esperada
  maxGrade: number; // usually 10
  location?: string;
  topicsCovered: string[];
  type: string; // OSCE, Anatomia, Simulado, Prova Escrita, Prova Objetiva, Escrita/Objetiva, Multimídia, Formativa (ou legado)
  // Provas com questões (Objetiva, Anatomia, Simulado, Multimídia)
  totalQuestions?: number;
  minCorrect?: number; // acertos mínimos desejados
  correctAnswers?: number; // acertos depois da prova
  // Prova mista (Escrita/Objetiva)
  objectiveQuestions?: number;
  writtenQuestions?: number;
  writtenPointsMax?: number; // quanto valem as discursivas
  objectiveCorrect?: number;
  writtenPointsEarned?: number;
  notes?: string;
}

export interface ScheduleClass {
  id: string;
  subjectId?: string;
  title?: string; // e.g. "Plantão 12h UPA", "Grupo de Estudos ECG"
  dayOfWeek: 1 | 2 | 3 | 4 | 5 | 6 | 7; // 1 = Monday, 7 = Sunday
  startTime: string; // "08:00"
  endTime: string; // "10:00"
  room: string;
  type: string; // 'Teórica' | 'Prática / Ambulatório' | 'Plantão' | 'Laboratório' | 'PBL' | 'Compromisso' | 'Estudo';
  location?: string;
  color?: string;
  isCompleted?: boolean;
  notes?: string;
  category?: string; // id de ACTIVITY_CATEGORIES (aula, academia, simposio, liga, congresso...)
  semesterId?: string; // a grade de horários é por semestre (as antigas ficam no histórico)
  shift?: ExamShift; // turno: manhã, tarde ou noite
  date?: string; // YYYY-MM-DD: evento de data única (sem repetição semanal)
}

export interface StudySession {
  id: string;
  subjectId?: string;
  topicId?: string;
  durationMinutes: number;
  timestamp: string; // ISO string
  type: 'pomodoro' | 'stopwatch' | 'spaced_repetition' | 'tutor_ai';
  notes?: string;
  xpEarned: number;
  /** Bloco de revisão ligado ao foco */
  blockId?: string;
  /** Projeto de Estudos pessoais ligado ao foco */
  projectId?: string;
  /** Tipo de tarefa do plano (review, new_topic, flashcards, ...) */
  activity?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: 'streak' | 'hours' | 'grades' | 'reviews' | 'special';
  unlockedAt?: string;
  progress: number; // 0 to 100
  target: number;
  current: number;
  xpReward: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
  doneAt?: string;
  blockId?: string; // bloco ao qual pertence (itens antigos caem em "Geral")
  important?: boolean; // essencial: sobe para o topo e entra no foco
  dueDate?: string; // YYYY-MM-DD: aparece no Planner
}

export interface ChecklistBlock {
  id: string;
  name: string;
  color: string;
  emoji?: string;
  createdAt: string;
}

export interface MedRevisionTopic {
  id: string;
  category: 'Clínica Médica' | 'Cirurgia Geral' | 'Pediatria' | 'Ginecologia & Obstetrícia' | 'Medicina Preventiva & SUS';
  title: string;
  highYieldLevel: '⭐⭐⭐ Extrema Prioridade' | '⭐⭐ Alta Relevância' | '⭐ Importante';
  keyPearls: string[];
  guidelineSnippet: string;
  differentialDiagnosis: string[];
  revalidaFrequency: string; // e.g. "Presente em 85% das provas"
  isCompleted: boolean;
}

export interface UserProfile {
  name: string;
  email: string;
  university: string; // o que aparece: sigla da faculdade (ou nome em "Outra")
  /** código e-MEC da faculdade escolhida na lista (vazio = "Outra") */
  universityCode?: string;
  /** nome completo da faculdade (da lista ou digitado em "Outra") */
  universityName?: string;
  currentSemesterId: string;
  weeklyTargetHours: number;
  targetAverageGrade: number;
  /** Metas de acertos do mês (%) — Dashboard */
  /** Tratamento usado nas saudações (sem valor = neutro "bem-vindo(a)") */
  greetingGender?: 'masculino' | 'feminino';
  goalExamPct?: number;
  goalReviewPct?: number;
  dreamSpecialty: string; // e.g. "Cardiologia Intervencionista", "Neurocirurgia"
  targetExam?: string; // e.g. "ENARE", "USP-SP"
  googleSyncEnabled?: boolean;
  avatarUrl?: string;
  totalXp: number;
  level: number;
  currentStreakDays: number;
  bestStreakDays: number;
  lastStudyDate?: string;
  darkMode: boolean;
  soundEnabled: boolean;
  onboardingCompleted: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  suggestedFollowUps?: string[];
}
