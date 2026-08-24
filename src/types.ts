export type TopicStatus = 'nao_iniciado' | 'em_andamento' | 'revisado' | 'dominado';
export type TopicPriority = 'alta' | 'media' | 'baixa';
export type PreferredStudyMethod = 'questoes' | 'videoaula' | 'resumo' | 'livros' | 'pessoal';
export type TopicDifficulty = 'dificil' | 'medio' | 'facil';

export interface Topic {
  id: string;
  subjectId: string;
  moduleName?: string; // Matéria / Módulo dentro da disciplina
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

export interface Exam {
  id: string;
  subjectId: string;
  title: string; // e.g. "P1 - Cardiologia e ECG"
  date: string; // ISO format or YYYY-MM-DD
  time?: string;
  weight: number; // e.g. 1.0, 2.0
  grade?: number; // e.g. 8.5 (null if not taken yet)
  maxGrade: number; // usually 10
  location?: string;
  topicsCovered: string[];
  type: 'P1' | 'P2' | 'P3' | 'Sub' | 'Pratica' | 'OSCE' | 'Seminario';
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
