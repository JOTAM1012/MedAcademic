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
  }>;
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
}

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
  university: string;
  currentSemesterId: string;
  weeklyTargetHours: number;
  targetAverageGrade: number;
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
