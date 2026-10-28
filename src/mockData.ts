import {
  Semester,
  Subject,
  Topic,
  Exam,
  ScheduleClass,
  Achievement,
  MedRevisionTopic,
  UserProfile,
} from './types';
import { CARTOON_AVATARS } from './data/avatars';

export const INITIAL_SEMESTERS: Semester[] = [
  {
    id: 'sem-1',
    name: '1º Semestre',
    code: '2026.1',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    isCurrent: true,
    targetHoursWeekly: 30,
    description: 'Semestre de estudos atual',
  },
];

export const INITIAL_SUBJECTS: Subject[] = [];

export const INITIAL_TOPICS: Topic[] = [];

export const INITIAL_EXAMS: Exam[] = [];

export const INITIAL_SCHEDULE: ScheduleClass[] = [];

export const INITIAL_MED_REVISIONS: MedRevisionTopic[] = [];

export const INITIAL_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'ach-1',
    title: 'Estudante Exemplar',
    description: 'Complete 10 horas de estudo no cronômetro em uma única semana.',
    icon: 'Stethoscope',
    category: 'hours',
    progress: 0,
    target: 10,
    current: 0,
    xpReward: 350,
  },
  {
    id: 'ach-2',
    title: 'Mestre da Revisão',
    description: 'Revise 20 tópicos no sistema de repetição espaçada.',
    icon: 'Activity',
    category: 'reviews',
    progress: 0,
    target: 20,
    current: 0,
    xpReward: 500,
  },
  {
    id: 'ach-3',
    title: 'Chama Olímpica',
    description: 'Mantenha um streak de estudos consecutivo por 7 dias seguidos.',
    icon: 'Flame',
    category: 'streak',
    progress: 0,
    target: 7,
    current: 0,
    xpReward: 600,
  },
  {
    id: 'ach-5',
    title: 'Média de Ouro',
    description: 'Atinja uma média superior a 8.5 em todas as disciplinas.',
    icon: 'Award',
    category: 'grades',
    progress: 0,
    target: 8.5,
    current: 0,
    xpReward: 750,
  },
  {
    id: 'ach-6',
    title: 'Foco Absoluto',
    description: 'Complete 25 ciclos de Pomodoro sem interrupções.',
    icon: 'Timer',
    category: 'hours',
    progress: 0,
    target: 25,
    current: 0,
    xpReward: 450,
  },
];

export const INITIAL_USER_PROFILE: UserProfile = {
  name: 'Estudante de Medicina',
  email: '',
  university: 'Faculdade de Medicina',
  currentSemesterId: 'sem-1',
  weeklyTargetHours: 30,
  targetAverageGrade: 8.5,
  dreamSpecialty: 'Residência Médica',
  avatarUrl: CARTOON_AVATARS[0].url,
  googleSyncEnabled: true,
  totalXp: 0,
  level: 1,
  currentStreakDays: 0,
  bestStreakDays: 0,
  darkMode: false,
  soundEnabled: true,
  onboardingCompleted: true,
};
