export type TopicStatus = 'nao_iniciado' | 'em_andamento' | 'revisado' | 'dominado';
export type TopicPriority = 'alta' | 'media' | 'baixa';
export type PreferredStudyMethod = 'questoes' | 'videoaula' | 'resumo' | 'livros' | 'pessoal';
export type TopicDifficulty = 'dificil' | 'medio' | 'facil';

export interface Topic {
  id: string;
  subjectId: string;
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
  type: string; // OSCE, Anatomia, Simulado, Prova Escrita, Prova Objetiva, Multimídia, Formativa (ou legado)
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
