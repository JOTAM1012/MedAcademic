import type { SidebarPrefs } from '../types';
import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import confetti from 'canvas-confetti';
import {
  Semester,
  Subject,
  Topic,
  Exam,
  ScheduleClass,
  Achievement,
  MedRevisionTopic,
  UserProfile,
  StudySession,
  ChatMessage,
  ChecklistItem,
  ChecklistBlock,
  TopicBlock,
  TopicDifficulty,
  QuestionLog,
  StudyTimePrompt,
  StudyMethodState,
  ExamTaskKind,
  ContestExam,
  PastExam,
  DashboardPrefs,
  StudyPlanPrefs,
  DayPlanState,
  ErrorNote,
  ErrorType,
  Certainty,
  PersonalProject,
  PersonalProjectItem,
} from '../types';
import {
  EMPTY_STUDY_METHOD,
  type PlanTask,
  type StudyPhase,
  applyErrorRedo,
  isResidencyPrep,
  makeErrorNote,
  mergeStudyMethod,
  newItemId,
  newProjectId,
  normalizeStudyMethod,
  pruneStudyMethod,
  resolvePrefs,
  restDaysOf,
  reviewProjectItemResult,
  reviewTechnique,
  sessionDate,
  spreadOverdueReviews,
  techniqueIdForReview,
  startItemReviews,
  studyPhaseOf,
} from '../data/studyMethod';
import { upgradeAvatarUrl } from '../data/avatars';
import { sharedDetails, type SharedChecklist, type SharedSubject } from '../data/share';

/** Ação opcional no aviso (ex.: "Desfazer") */
export interface NotifyOptions {
  actionLabel?: string;
  onAction?: () => void;
  /** tempo na tela em ms (padrão 4000; com ação, 8000) */
  durationMs?: number;
}
export interface AppNotification {
  message: string;
  type: 'success' | 'info' | 'warning';
  actionLabel?: string;
  onAction?: () => void;
  /** muda a cada aviso: ajuda a reiniciar animações */
  id: number;
}

const UNDO_WINDOW_MS = 8000;
import { matchSchool, schoolByCode } from '../data/medicalSchools';
import { shrinkAvatarDataUrl, AVATAR_MAX_DATAURL } from '../data/avatarImage';
import {
  BLOCK_REVIEWS_TO_MASTER,
  FIRST_REVIEW_DAY,
  addDaysYMD,
  isTopicResolved,
  nextIntervalDays,
  scheduleReviewDate,
  formatDM,
  ymd,
} from '../data/blockReview';
import {
  INITIAL_SEMESTERS,
  INITIAL_SUBJECTS,
  INITIAL_TOPICS,
  INITIAL_EXAMS,
  INITIAL_SCHEDULE,
  INITIAL_ACHIEVEMENTS,
  INITIAL_MED_REVISIONS,
  INITIAL_USER_PROFILE,
} from '../mockData';

import { useAuth } from './AuthContext';
import { getIDBData, setIDBData } from '../lib/indexedDB';
import { REVIEWS_TO_MASTER, getReviewsDone } from '../data/topicStatus';
import { supabase, APP_STATE_TABLE } from '../lib/supabase';
import { inPeriod, nextPeriod, nextSemesterName, periodByCode, periodForDate } from '../data/academicCalendar';
import {
  cancelScheduledBeeps,
  isTimerAudioRunning,
  notifyTimer,
  playTimerBeep,
  requestTimerNotifications,
  scheduleTimerBeepAt,
  unlockTimerAudio,
} from '../lib/timerSound';

interface TimerState {
  isRunning: boolean;
  mode: 'pomodoro' | 'short_break' | 'medium_break' | 'long_break' | 'stopwatch';
  timeLeftSeconds: number; // For pomodoro countdown
  elapsedSeconds: number; // For stopwatch
  selectedSubjectId?: string;
  selectedTopicId?: string;
  totalPomodorosCompleted: number;
  customDurationSeconds?: number;
  /** Study cycle in progress: steps run in sequence (study → break → next step) */
  cycle?: StudyCycleRun;
  // O tempo é calculado pelo relógio (não por "ticks"): continua certo com a aba em segundo plano
  endsAt?: number; // epoch ms em que a contagem regressiva termina (enquanto roda)
  startedAt?: number; // cronômetro livre: epoch ms do último "iniciar"
  elapsedBase?: number; // cronômetro livre: segundos acumulados antes do último "iniciar"
  /** Tarefa do plano ligada a este foco (o que fazer, de qual bloco/projeto) */
  task?: FocusTask;
}

/** Tarefa ligada ao Pomodoro ("Começar" no plano do dia, nas Revisões ou nos Estudos pessoais) */
export interface FocusTask {
  title: string;
  /** Tipo da tarefa do plano: review, new_block, project, flashcards, phase_questions... */
  kind?: string;
  subjectId?: string;
  topicId?: string;
  blockId?: string;
  projectId?: string;
  itemId?: string;
  /** Passos curtos para mostrar durante o foco */
  steps?: string[];
  /** Foco terminou (mostra "Registrar revisão" / próximo passo) */
  finished?: boolean;
  /** A revisão do bloco já foi registrada com este foco ainda rodando (o tempo entra quando ele acabar) */
  reviewed?: boolean;
  /** Pausa do bloco desta tarefa (bloco que o aluno escolheu, ex.: 60/10) */
  breakMinutes?: number;
}

const TIMER_STORAGE_KEY = 'medacademic_timer_v1';

// Restaura um timer em andamento (ex.: o celular descartou a aba em segundo plano)
const loadSavedTimer = (): TimerState | null => {
  try {
    const raw = localStorage.getItem(TIMER_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as TimerState;
    if (!saved.isRunning) return null;
    if (saved.mode !== 'stopwatch' && (!saved.endsAt || saved.endsAt <= Date.now())) return null;
    return saved;
  } catch {
    return null;
  }
};

const remainingSeconds = (endsAt: number) => Math.max(0, Math.ceil((endsAt - Date.now()) / 1000));
const formatClock = (secs: number) => {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const r = secs % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(r).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
};

export interface StudyCycleStep {
  title: string;
  workMins: number;
  breakMins: number;
  phoneAllowed?: boolean;
}

export interface StudyCycleRun {
  steps: StudyCycleStep[];
  index: number;
  phase: 'work' | 'break';
}

export type CloudSyncStatus = 'synced' | 'syncing' | 'offline' | 'error';

interface AppContextType {
  // Navigation & View
  currentTab: string;
  setCurrentTab: (tab: string) => void;

  // Semesters & Structure
  semesters: Semester[];
  currentSemester: Semester | undefined;
  setCurrentSemesterId: (id: string) => void;
  addSemester: (sem: Omit<Semester, 'id'>) => string;
  /** Vira o semestre: cria o próximo (ex.: 10º Semestre, 2027.1) e o torna atual; o anterior vai para o histórico */
  startNextSemester: () => void;
  updateSemester: (id: string, sem: Partial<Semester>) => void;
  deleteSemester: (id: string) => void;
  resetCurrentSemester: () => void;
  undoSemesterReset: () => void;
  semesterResetBackup: { semesterId: string; semesterName: string; at: string } | null;

  // Subjects
  subjects: Subject[];
  /** Returns the id of the created subject */
  addSubject: (sub: Omit<Subject, 'id'>) => string;
  updateSubject: (id: string, sub: Partial<Subject>, opts?: { silent?: boolean }) => void;
  deleteSubject: (id: string) => void;
  /** Exclui várias disciplinas de uma vez, com os blocos e assuntos delas */
  deleteSubjects: (ids: string[]) => void;

  // Topics
  topics: Topic[];
  addTopic: (top: Omit<Topic, 'id'>) => void;
  updateTopic: (id: string, top: Partial<Topic>) => void;
  deleteTopic: (id: string) => void;
  reviewTopicSpacedRepetition: (id: string, difficulty: 'dificil' | 'medio' | 'facil' | 'dominado') => void;
  /** 1º contato: "Visto" — entra no ciclo de revisões (1ª revisão amanhã) */
  markTopicSeen: (id: string) => void;
  /** Volta o assunto para "Não iniciado" e zera as revisões */
  resetTopicProgress: (id: string) => void;
  /** "Ver depois": conta para o bloco entrar nas revisões, mas fica como pendência (vermelho) */
  markTopicPending: (id: string) => void;

  // Questões registradas (por bloco ou tópico)
  questionLogs: QuestionLog[];
  addQuestionLog: (log: Omit<QuestionLog, 'id' | 'date' | 'semesterId'>) => void;
  deleteQuestionLog: (id: string) => void;

  // Blocos de tópicos (a revisão espaçada é feita por bloco)
  topicBlocks: TopicBlock[];
  addTopicBlock: (subjectId: string, name: string) => string;
  /** Checklist (Básico/Clínico): adiciona vários tópicos de uma vez (colar lista) */
  addTopicsBulk: (tops: Omit<Topic, 'id'>[]) => void;
  /** Importa uma disciplina/módulo recebido por link (só a lista, sem progresso). Devolve o id da nova disciplina */
  importSharedSubject: (p: SharedSubject) => string;
  /** Importa um bloco do Checklist recebido por link (nada marcado como feito). Devolve o id do novo bloco */
  importSharedChecklist: (p: SharedChecklist) => string;
  /** Desfaz a última exclusão (disciplina, tópico ou bloco do Checklist), se ainda estiver no prazo (~8 s) */
  undoLastDelete: () => void;
  /** Há uma exclusão que ainda pode ser desfeita (some depois de ~8 s) */
  canUndoDelete: boolean;
  /** Checklist: transforma uma matéria vista em bloco do ciclo de revisões (Dia 0 = hoje) */
  sendModuleToReview: (subjectId: string, moduleName: string) => void;
  /** Muda a disciplina de Checklist para Blocos: cada matéria vira um bloco em estudo */
  convertChecklistToBlocks: (subjectId: string) => void;
  renameTopicBlock: (id: string, name: string) => void;
  /** Nova ordem dos tópicos (arrastar): só esses ids trocam de lugar entre si; o resto da lista fica igual */
  reorderTopics: (orderedIds: string[]) => void;
  /** Nova ordem dos blocos de uma disciplina (arrastar pelo cabeçalho) */
  reorderTopicBlocks: (orderedIds: string[]) => void;
  deleteTopicBlock: (id: string) => void;
  reviewTopicBlock: (
    id: string,
    difficulty: TopicDifficulty,
    result?: { questions?: number; correct?: number; certainty?: Partial<Record<Certainty, number>>; errors?: Partial<Record<ErrorType, number>> }
  ) => void;
  /** Recomeça as revisões do bloco (volta para "Em estudo" se algum tópico não estiver visto) */
  restartBlockReviews: (id: string) => void;
  undoBlockReview: (id: string) => void;
  updateTopicBlock: (id: string, changes: Partial<TopicBlock>) => void;

  // Exams & Grades
  exams: Exam[];
  addExam: (ex: Omit<Exam, 'id'>) => void;
  updateExam: (id: string, ex: Partial<Exam>) => void;
  deleteExam: (id: string) => void;

  // Schedule / Timetable
  schedule: ScheduleClass[];
  addScheduleClass: (sc: Omit<ScheduleClass, 'id'>) => void;
  updateScheduleClass: (id: string, sc: Partial<ScheduleClass>) => void;
  deleteScheduleClass: (id: string) => void;
  /** Várias atividades de uma vez (rodízio). Devolve o id do rodízio */
  addScheduleClasses: (list: Omit<ScheduleClass, 'id'>[], rotation?: { name?: string }) => string;
  /** "Excluir só deste dia": a atividade continua nas outras semanas */
  excludeScheduleOnDate: (id: string, date: string) => void;
  /** "Substituir neste dia": tira a atividade nesta data e coloca outra no lugar */
  replaceScheduleOnDate: (id: string, date: string, replacement: Omit<ScheduleClass, 'id'>) => void;
  /** Apaga todas as atividades de um rodízio */
  deleteRotation: (rotationId: string) => void;
  /** Marca/desmarca uma tarefa de um assunto da prova */
  toggleExamTopicTask: (examId: string, topicId: string, task: ExamTaskKind) => void;
  /** Painel personalizado (vale para todos os semestres) */
  setDashboardPrefs: (prefs: DashboardPrefs | null) => void;
  /** Abas da barra de baixo no celular (null = padrão) */
  setMobileTabs: (tabs: string[] | null) => void;
  /** Barra lateral personalizada (null = padrão) */
  setSidebarPrefs: (prefs: SidebarPrefs | null) => void;
  /** Ferramenta "Provas de concurso" disponível (internato sempre; clínico se ligar no perfil; básico não) */
  contestsActive: boolean;
  addContest: (c: Omit<ContestExam, 'id' | 'createdAt'>) => string;
  updateContest: (id: string, changes: Partial<ContestExam>) => void;
  deleteContest: (id: string) => void;
  addPastExam: (p: Omit<PastExam, 'id' | 'createdAt'>) => string;
  updatePastExam: (id: string, changes: Partial<PastExam>) => void;
  deletePastExam: (id: string) => void;

  // MedRevision
  medRevisions: MedRevisionTopic[];
  toggleMedRevisionComplete: (id: string) => void;
  addMedRevision: (mr: Omit<MedRevisionTopic, 'id'>) => void;
  deleteMedRevision: (id: string) => void;

  // Study Sessions & Gamification
  studySessions: StudySession[];
  logStudySession: (session: Omit<StudySession, 'id' | 'timestamp'>) => string;
  studyTimePrompt: StudyTimePrompt | null;
  completeStudyTimePrompt: (minutes: number) => void;
  achievements: Achievement[];
  userProfile: UserProfile;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  addXp: (amount: number, reason?: string) => void;
  triggerConfetti: () => void;

  // Global Timer / Pomodoro
  timer: TimerState;
  startTimer: () => void;
  pauseTimer: () => void;
  resetTimer: () => void;
  setTimerMode: (mode: TimerState['mode'], subjectId?: string, topicId?: string, customSeconds?: number) => void;
  setTimerSubject: (subjectId: string, topicId?: string) => void;
  startStudyCycle: (steps: StudyCycleStep[], startIndex?: number, subjectId?: string) => void;
  stopStudyCycle: () => void;
  /** Ciclo de estudos: pula o resto do foco (vai para a pausa) ou o resto da pausa (vai para a próxima etapa) */
  skipCycleStep: () => void;
  pomodoroSettings: {
    workMinutes: number;
    shortBreakMinutes: number;
    mediumBreakMinutes: number;
    longBreakMinutes: number;
  };
  updatePomodoroSettings: (settings: { workMinutes: number; shortBreakMinutes: number; mediumBreakMinutes: number; longBreakMinutes: number }) => void;

  // Theme & Onboarding
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  isOnboardingOpen: boolean;
  setIsOnboardingOpen: (open: boolean) => void;
  isEditingProfileSetup: boolean;
  setIsEditingProfileSetup: (open: boolean) => void;

  // Reset & Clear Everything
  clearAllData: () => void;
  resetAllData: () => void;

  // Cloud Synchronization Status & Actions
  isInitialLoadComplete: boolean;
  cloudSyncStatus: CloudSyncStatus;
  lastCloudSync: Date | null;
  forceCloudSync: () => Promise<void>;

  // Search query state
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Quick Notification
  notification: AppNotification | null;
  showNotification: (message: string, type?: 'success' | 'info' | 'warning', opts?: NotifyOptions) => void;
  /** Fecha o aviso atual (ex.: depois de tocar na ação) */
  dismissNotification: () => void;

  // Tutor Chat Messages State
  tutorMessages: Array<{ role: 'user' | 'assistant'; text: string; time: string }>;
  setTutorMessages: React.Dispatch<React.SetStateAction<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>>;

  // Checklist: blocos nomeados/coloridos com itens
  checklist: ChecklistItem[];
  checklistBlocks: ChecklistBlock[];
  addChecklistItem: (text: string, blockId?: string, extra?: Partial<Pick<ChecklistItem, 'important' | 'dueDate'>>) => void;
  updateChecklistItem: (id: string, changes: Partial<ChecklistItem>) => void;
  addChecklistBlock: (block: Pick<ChecklistBlock, 'name' | 'color' | 'emoji'>, items?: string[]) => string;
  updateChecklistBlock: (id: string, changes: Partial<ChecklistBlock>) => void;
  deleteChecklistBlock: (id: string) => void;
  toggleChecklistItem: (id: string) => void;
  deleteChecklistItem: (id: string, opts?: { undo?: boolean }) => void;
  clearCompletedChecklist: (blockId?: string) => void;

  // ===== Método de estudo (Guia Científico) =====
  studyMethod: StudyMethodState;
  /** Preferências efetivas da rotina (padrões da fase + o que o aluno escolheu) */
  studyPrefs: StudyPlanPrefs;
  /** Fase do curso pelo semestre atual: ciclo_basico | ciclo_clinico | internato */
  studyPhase: StudyPhase;
  /** Preparação para residência (internato com prova-alvo ou projeto de Residência) */
  residencyPrep: boolean;
  /** Ids das disciplinas do semestre atual */
  currentSubjectIds: string[];
  /** Salva só o que o aluno mudou; null volta aos padrões da fase */
  updateStudyPrefs: (changes: Partial<StudyPlanPrefs> | null) => void;
  // Plano do dia (estado manual; o resto é calculado por buildDayPlan / useDayPlan)
  setDayPlanState: (date: string, updater: (s: DayPlanState) => DayPlanState) => void;
  toggleTaskDone: (date: string, taskId: string) => void;
  skipTask: (date: string, taskId: string, skip?: boolean) => void;
  addCustomTask: (date: string, title: string, pomodoros?: number) => void;
  removeCustomTask: (date: string, customId: string) => void;
  setLowEnergy: (date: string, on: boolean) => void;
  /** 'normal' desliga o plantão que vem da grade nesse dia */
  setDayShift: (date: string, shift?: 'plantao' | 'pos_plantao' | 'normal') => void;
  /** "Passar para amanhã": muda a data do próprio bloco/tema/item/tarefa */
  moveTaskToTomorrow: (task: PlanTask) => void;
  moveTaskToDate: (task: PlanTask, from: string, to: string) => void;
  /** "Bem-vindo de volta": espalha as revisões atrasadas pelos próximos dias; devolve quantas mudou */
  replanOverdueReviews: () => number;
  // Checklist diário
  toggleHabit: (date: string, habitId: string, autoOn?: boolean) => void;
  // Caderno de erros
  addErrorNote: (data: Pick<ErrorNote, 'theme' | 'type' | 'rule'> & Partial<Pick<ErrorNote, 'subjectId' | 'blockId' | 'certainty' | 'why' | 'flashcard'>>) => string;
  updateErrorNote: (id: string, changes: Partial<ErrorNote>) => void;
  deleteErrorNote: (id: string) => void;
  /** Refez o erro: acertou (2 acertos = resolvido) ou errou de novo (volta em 7/30 dias) */
  redoErrorNote: (id: string, gotItRight: boolean) => void;
  // Estudos pessoais
  addProject: (p: Omit<PersonalProject, 'id' | 'createdAt' | 'items'> & { items?: string[] }) => string;
  updateProject: (id: string, changes: Partial<PersonalProject>) => void;
  deleteProject: (id: string) => void;
  addProjectItems: (projectId: string, titles: string[]) => void;
  updateProjectItem: (projectId: string, itemId: string, changes: Partial<PersonalProjectItem>) => void;
  toggleProjectItem: (projectId: string, itemId: string) => void;
  removeProjectItem: (projectId: string, itemId: string) => void;
  /** Item concluído entra nas revisões (R1 amanhã) */
  startProjectItemReviews: (projectId: string, itemId: string) => void;
  reviewProjectItem: (projectId: string, itemId: string, difficulty: TopicDifficulty) => void;
  /** Soma um bloco de foco feito fora do site a um projeto */
  logProjectBlock: (projectId: string, minutes?: number) => void;
  // Blocos: ⭐ cai muito, passos do estudo inicial, tema rápido para uma data
  setBlockStar: (blockId: string, star: boolean) => void;
  toggleInitialStep: (blockId: string, step: string) => void;
  /** Cria um tema para estudar numa data (bloco planejado ou tópico de 1º contato, conforme a disciplina) */
  createPlannedTheme: (subjectId: string, name: string, date: string) => void;
  // Pomodoro ligado a uma tarefa
  /** Inicia um foco já ligado à tarefa e abre a aba Pomodoro. `free` = sem tempo fixo (cronômetro com alarme) */
  startTask: (task: FocusTask & { minutes?: number; free?: boolean }) => void;
  clearFocusTask: () => void;
  // Guia do método e navegação com foco
  methodGuide: { open: boolean; step: number };
  openMethodGuide: (step?: number) => void;
  /** Pede para abrir o tour guiado (o App escuta tourRequestAt) */
  requestTour: () => void;
  tourRequestAt: number | null;
  closeMethodGuide: () => void;
  methodGuideSeen: boolean;
  markMethodGuideSeen: () => void;
  /** Abre a aba Revisões já num bloco ou sub-aba ("hoje" | "agenda" | "todos" | "erros") */
  openReviews: (focus?: { blockId?: string; tab?: string }) => void;
  reviewFocus: { blockId?: string; tab?: string } | null;
  clearReviewFocus: () => void;
  /** Abre o Planner já na visão Hoje (e, se pedir, a janela Minha rotina) */
  openPlannerToday: (opts?: { routine?: boolean }) => void;
  plannerRequest: { routine?: boolean; at: number } | null;
  clearPlannerRequest: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const getUserKey = (keyName: string, userId: string | null) => {
  const uid = userId || 'default';
  return `medacademic_usr_${uid}_${keyName}_v3`;
};

// Pre-seeds the local cache of an account that is about to be created (sign-up flow), so the
// profile filled in the wizard is the one loaded as soon as the new user becomes active.
export const seedNewUserData = (userId: string, profile: UserProfile, semesters: Semester[]) => {
  const uid = userId.trim().toLowerCase();
  localStorage.setItem(getUserKey('user_profile', uid), JSON.stringify(profile));
  localStorage.setItem(getUserKey('semesters', uid), JSON.stringify(semesters));
  localStorage.setItem(getUserKey('current_tab', uid), 'dashboard');
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeUserId, activeUser, cloudUserId, updateAccount } = useAuth();

  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [isEditingProfileSetup, setIsEditingProfileSetup] = useState<boolean>(false);
  const [notification, setNotification] = useState<AppNotification | null>(null);
  const notificationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Desfazer exclusão: guarda o que saiu por ~8 s
  type DeleteSnapshot = {
    subjects: Subject[];
    topicBlocks: TopicBlock[];
    topics: Topic[];
    checklistBlocks: ChecklistBlock[];
    checklist: ChecklistItem[];
    /** blocos de tópicos que continuam existindo, mas mudaram com a exclusão (volta a versão antiga) */
    blocksBefore: TopicBlock[];
  };
  const undoRef = useRef<DeleteSnapshot | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [canUndoDelete, setCanUndoDelete] = useState(false);

  // States
  const [semesters, setSemesters] = useState<Semester[]>(INITIAL_SEMESTERS);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [schedule, setSchedule] = useState<ScheduleClass[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>(INITIAL_ACHIEVEMENTS);
  const [medRevisions, setMedRevisions] = useState<MedRevisionTopic[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>(INITIAL_USER_PROFILE);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [checklistBlocks, setChecklistBlocks] = useState<ChecklistBlock[]>([]);
  const [topicBlocks, setTopicBlocks] = useState<TopicBlock[]>([]);
  const [questionLogs, setQuestionLogs] = useState<QuestionLog[]>([]);
  const [studyMethod, setStudyMethod] = useState<StudyMethodState>(EMPTY_STUDY_METHOD);
  const [methodGuide, setMethodGuide] = useState<{ open: boolean; step: number }>({ open: false, step: 0 });
  const [reviewFocus, setReviewFocus] = useState<{ blockId?: string; tab?: string } | null>(null);
  const [plannerRequest, setPlannerRequest] = useState<{ routine?: boolean; at: number } | null>(null);
  const studySessionsRef = useRef<StudySession[]>([]);
  const userProfileRef = useRef(userProfile);
  userProfileRef.current = userProfile;

  // Cloud sync states
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus>('synced');
  const [lastCloudSync, setLastCloudSync] = useState<Date | null>(null);
  const isSyncInProgressRef = useRef<boolean>(false);
  const [syncNonce, setSyncNonce] = useState(0); // bumped on reconnect to force a sync

  const INITIAL_TUTOR_MESSAGES = [
    {
      role: 'assistant' as const,
      text: 'Olá! Sou o Dr. Gemini, seu preceptor e tutor de inteligência artificial para medicina e estudos acadêmicos. Como posso te auxiliar hoje? Podemos discutir um caso clínico, estruturar novos assuntos para seu plano de repetição espaçada ou praticar questões de residência.',
      time: 'Agora',
    },
  ];

  const [tutorMessages, setTutorMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string; time: string }>>(INITIAL_TUTOR_MESSAGES);

  const [timer, setTimer] = useState<TimerState>(
    () =>
      loadSavedTimer() || {
        isRunning: false,
        mode: 'pomodoro',
        timeLeftSeconds: 25 * 60,
        elapsedSeconds: 0,
        selectedSubjectId: '',
        totalPomodorosCompleted: 0,
      }
  );
  // Bipes já agendados no relógio de áudio ("end@1730000000000"), para não reagendar à toa
  const scheduledBeepsRef = useRef<Set<string>>(new Set());

  const [pomodoroSettings, setPomodoroSettings] = useState({
    workMinutes: 25,
    shortBreakMinutes: 5,
    mediumBreakMinutes: 10,
    longBreakMinutes: 15,
  });

  // Rehydrate state on activeUserId change & subscribe to Firestore
  useEffect(() => {
    if (!activeUserId) {
      // Clear all states in memory on logout to avoid data leakage and reset flags
      setSemesters(INITIAL_SEMESTERS);
      setSubjects([]);
      setTopics([]);
      setExams([]);
      setSchedule([]);
      setAchievements(INITIAL_ACHIEVEMENTS);
      setMedRevisions([]);
      setUserProfile(INITIAL_USER_PROFILE);
      setStudySessions([]);
      setTutorMessages(INITIAL_TUTOR_MESSAGES);
      setChecklist([]);
      setChecklistBlocks([]);
      setTopicBlocks([]);
      setQuestionLogs([]);
      setStudyMethod(EMPTY_STUDY_METHOD);
      setMethodGuide({ open: false, step: 0 });
      setReviewFocus(null);
      setTimer((prev) => (prev.task ? { ...prev, task: undefined } : prev));
      setIsInitialLoadComplete(false);
      setCloudSyncStatus('synced');
      setLastCloudSync(null);
      setCurrentTab('dashboard');
      return;
    }

    setIsInitialLoadComplete(false);
    setCloudSyncStatus('syncing');

    // 1. Immediate Local Storage Cache Load (Fast First Render)
    const savedTab = localStorage.getItem(getUserKey('current_tab', activeUserId));
    if (savedTab) setCurrentTab(savedTab);

    const savedProfile = localStorage.getItem(getUserKey('user_profile', activeUserId));
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setUserProfile(parsed);
      } catch (e) {}
    } else if (activeUser) {
      setUserProfile({
        name: activeUser.name || 'Estudante de Medicina',
        email: activeUser.email || activeUserId,
        university: activeUser.university || 'Faculdade de Medicina',
        currentSemesterId: 'sem-1',
        weeklyTargetHours: 30,
        targetAverageGrade: 8.5,
        dreamSpecialty: activeUser.dreamSpecialty || 'Clínica Médica',
        avatarUrl: activeUser.avatarUrl,
        totalXp: 0,
        level: 1,
        currentStreakDays: 0,
        bestStreakDays: 0,
        darkMode: false,
        soundEnabled: true,
        onboardingCompleted: activeUser.onboardingCompleted !== undefined ? activeUser.onboardingCompleted : true,
      });
    }

    const savedSem = localStorage.getItem(getUserKey('semesters', activeUserId));
    if (savedSem) {
      try { setSemesters(JSON.parse(savedSem)); } catch (e) {}
    }
    const savedSub = localStorage.getItem(getUserKey('subjects', activeUserId));
    if (savedSub) {
      try { setSubjects(JSON.parse(savedSub)); } catch (e) {}
    }
    const savedTop = localStorage.getItem(getUserKey('topics', activeUserId));
    if (savedTop) {
      try { setTopics(JSON.parse(savedTop)); } catch (e) {}
    }
    const savedEx = localStorage.getItem(getUserKey('exams', activeUserId));
    if (savedEx) {
      try { setExams(JSON.parse(savedEx)); } catch (e) {}
    }
    const savedSch = localStorage.getItem(getUserKey('schedule', activeUserId));
    if (savedSch) {
      try { setSchedule(JSON.parse(savedSch)); } catch (e) {}
    }
    const savedAch = localStorage.getItem(getUserKey('achievements', activeUserId));
    if (savedAch) {
      try { setAchievements(JSON.parse(savedAch)); } catch (e) {}
    }
    const savedMed = localStorage.getItem(getUserKey('med_revisions', activeUserId));
    if (savedMed) {
      try { setMedRevisions(JSON.parse(savedMed)); } catch (e) {}
    }
    const savedSess = localStorage.getItem(getUserKey('study_sessions', activeUserId));
    if (savedSess) {
      try { setStudySessions(JSON.parse(savedSess)); } catch (e) {}
    }
    const savedPomo = localStorage.getItem(getUserKey('pomodoro_settings', activeUserId));
    if (savedPomo) {
      try { setPomodoroSettings(JSON.parse(savedPomo)); } catch (e) {}
    }
    const savedTutor = localStorage.getItem(getUserKey('tutor_messages', activeUserId));
    if (savedTutor) {
      try { setTutorMessages(JSON.parse(savedTutor)); } catch (e) {}
    }
    const savedChecklist = localStorage.getItem(getUserKey('checklist', activeUserId));
    setChecklist([]);
    if (savedChecklist) {
      try { setChecklist(JSON.parse(savedChecklist)); } catch (e) {}
    }
    const savedChecklistBlocks = localStorage.getItem(getUserKey('checklist_blocks', activeUserId));
    setChecklistBlocks([]);
    if (savedChecklistBlocks) {
      try { setChecklistBlocks(JSON.parse(savedChecklistBlocks)); } catch (e) {}
    }
    const savedQuestionLogs = localStorage.getItem(getUserKey('question_logs', activeUserId));
    setQuestionLogs([]);
    if (savedQuestionLogs) {
      try { setQuestionLogs(JSON.parse(savedQuestionLogs)); } catch (e) {}
    }
    const savedTopicBlocks = localStorage.getItem(getUserKey('topic_blocks', activeUserId));
    setTopicBlocks([]);
    if (savedTopicBlocks) {
      try { setTopicBlocks(JSON.parse(savedTopicBlocks)); } catch (e) {}
    }
    const savedStudyMethod = localStorage.getItem(getUserKey('study_method', activeUserId));
    setStudyMethod(EMPTY_STUDY_METHOD);
    if (savedStudyMethod) {
      try { setStudyMethod(normalizeStudyMethod(JSON.parse(savedStudyMethod))); } catch (e) {}
    }

    let isSubscribed = true;

    // High-performance IndexedDB Async Hydration for Heavy Datasets (Revisões Espaçadas, Sessões, etc.)
    const loadIDBCache = async (uid: string) => {
      try {
        const [
          idbMed, idbSess, idbTop, idbSub, idbEx,
          idbSem, idbProf, idbSch, idbAch, idbPomo, idbTut, idbMethod
        ] = await Promise.all([
          getIDBData<MedRevisionTopic[]>(`med_revisions_${uid}`),
          getIDBData<StudySession[]>(`study_sessions_${uid}`),
          getIDBData<Topic[]>(`topics_${uid}`),
          getIDBData<Subject[]>(`subjects_${uid}`),
          getIDBData<Exam[]>(`exams_${uid}`),
          getIDBData<Semester[]>(`semesters_${uid}`),
          getIDBData<UserProfile>(`user_profile_${uid}`),
          getIDBData<ScheduleClass[]>(`schedule_${uid}`),
          getIDBData<Achievement[]>(`achievements_${uid}`),
          getIDBData<any>(`pomodoro_settings_${uid}`),
          getIDBData<ChatMessage[]>(`tutor_messages_${uid}`),
          getIDBData<StudyMethodState>(`study_method_${uid}`),
        ]);
        if (idbMethod && typeof idbMethod === 'object') setStudyMethod(normalizeStudyMethod(idbMethod));
        if (idbMed && Array.isArray(idbMed) && idbMed.length > 0) setMedRevisions(idbMed);
        if (idbSess && Array.isArray(idbSess) && idbSess.length > 0) setStudySessions(idbSess);
        if (idbTop && Array.isArray(idbTop) && idbTop.length > 0) setTopics(idbTop);
        if (idbSub && Array.isArray(idbSub) && idbSub.length > 0) setSubjects(idbSub);
        if (idbEx && Array.isArray(idbEx) && idbEx.length > 0) setExams(idbEx);
        if (idbSem && Array.isArray(idbSem) && idbSem.length > 0) setSemesters(idbSem);
        if (idbProf) setUserProfile((prev) => ({ ...prev, ...idbProf }));
        if (idbSch && Array.isArray(idbSch)) setSchedule(idbSch);
        if (idbAch && Array.isArray(idbAch) && idbAch.length > 0) setAchievements(idbAch);
        if (idbPomo) setPomodoroSettings(idbPomo);
        if (idbTut && Array.isArray(idbTut) && idbTut.length > 0) setTutorMessages(idbTut);
        console.log(`[IndexedDB Cache] ⚡ Estado prioritário carregado com sucesso do IndexedDB local para o usuário ${uid}.`);
      } catch (err) {
        console.warn('[IndexedDB Cache] ⚠️ Falha na leitura do cache IndexedDB:', err);
      } finally {
        if (isSubscribed) {
          setIsInitialLoadComplete(true);
        }
      }
    };

    // Applies the state saved in the cloud over the local cache
    const applyCloudData = (cloudData: any) => {
      if (Array.isArray(cloudData.semesters) && cloudData.semesters.length > 0) {
        setSemesters(cloudData.semesters);
        setIDBData(`semesters_${activeUserId}`, cloudData.semesters);
      }
      if (Array.isArray(cloudData.subjects)) {
        setSubjects(cloudData.subjects);
        setIDBData(`subjects_${activeUserId}`, cloudData.subjects);
      }
      if (Array.isArray(cloudData.topics)) {
        setTopics(cloudData.topics);
        setIDBData(`topics_${activeUserId}`, cloudData.topics);
      }
      if (Array.isArray(cloudData.exams)) {
        setExams(cloudData.exams);
        setIDBData(`exams_${activeUserId}`, cloudData.exams);
      }
      if (Array.isArray(cloudData.schedule)) {
        setSchedule(cloudData.schedule);
        setIDBData(`schedule_${activeUserId}`, cloudData.schedule);
      }
      if (Array.isArray(cloudData.achievements)) {
        setAchievements(cloudData.achievements);
        setIDBData(`achievements_${activeUserId}`, cloudData.achievements);
      }
      if (Array.isArray(cloudData.medRevisions)) {
        setMedRevisions(cloudData.medRevisions);
        setIDBData(`med_revisions_${activeUserId}`, cloudData.medRevisions);
      }
      if (Array.isArray(cloudData.studySessions)) {
        setStudySessions(cloudData.studySessions);
        setIDBData(`study_sessions_${activeUserId}`, cloudData.studySessions);
      }
      if (cloudData.userProfile) {
        setUserProfile((prev) => {
          // Docs without the flag count as completed; never revert a local completion
          const cloudOnboarding = cloudData.userProfile.onboardingCompleted;
          const updated = {
            ...prev,
            ...cloudData.userProfile,
            onboardingCompleted: Boolean(prev.onboardingCompleted) || cloudOnboarding === undefined || Boolean(cloudOnboarding),
          };
          setIDBData(`user_profile_${activeUserId}`, updated);
          return updated;
        });
      }
      if (cloudData.pomodoroSettings) {
        setPomodoroSettings(cloudData.pomodoroSettings);
        setIDBData(`pomodoro_settings_${activeUserId}`, cloudData.pomodoroSettings);
      }
      if (Array.isArray(cloudData.tutorMessages) && cloudData.tutorMessages.length > 0) {
        setTutorMessages(cloudData.tutorMessages);
        setIDBData(`tutor_messages_${activeUserId}`, cloudData.tutorMessages);
      }
      if (Array.isArray(cloudData.checklist)) {
        setChecklist(cloudData.checklist);
      }
      if (Array.isArray(cloudData.questionLogs)) {
        setQuestionLogs(cloudData.questionLogs);
      }
      if (Array.isArray(cloudData.topicBlocks)) {
        setTopicBlocks(cloudData.topicBlocks);
      }
      if (Array.isArray(cloudData.checklistBlocks)) {
        setChecklistBlocks(cloudData.checklistBlocks);
      }
      // Método de estudo: objeto (não array); junta por dia/id com o que está neste aparelho
      if (cloudData.studyMethod && typeof cloudData.studyMethod === 'object') {
        setStudyMethod((prev) => mergeStudyMethod(prev, cloudData.studyMethod));
      }
    };

    // First cloud save of a new account: built from what is cached on this device
    const buildBootstrapState = () => {
      const parse = <T,>(raw: string | null, fallback: T, requireItems = false): T => {
        if (!raw) return fallback;
        try {
          const p = JSON.parse(raw);
          if (Array.isArray(fallback) && (!Array.isArray(p) || (requireItems && p.length === 0))) return fallback;
          return p ?? fallback;
        } catch {
          return fallback;
        }
      };
      const subjectsList = parse<any[]>(savedSub, []);
      const profile: UserProfile = parse<UserProfile | null>(savedProfile, null) || {
        ...INITIAL_USER_PROFILE,
        name: activeUser?.name || INITIAL_USER_PROFILE.name,
        email: activeUser?.email || activeUserId,
        university: activeUser?.university || INITIAL_USER_PROFILE.university,
        dreamSpecialty: activeUser?.dreamSpecialty || INITIAL_USER_PROFILE.dreamSpecialty,
        avatarUrl: activeUser?.avatarUrl || INITIAL_USER_PROFILE.avatarUrl,
        onboardingCompleted: subjectsList.length > 0 || Boolean(activeUser?.onboardingCompleted),
      };
      return {
        semesters: parse(savedSem, INITIAL_SEMESTERS, true),
        subjects: subjectsList,
        topics: parse<any[]>(savedTop, []),
        exams: parse<any[]>(savedEx, []),
        schedule: parse<any[]>(savedSch, []),
        achievements: parse(savedAch, INITIAL_ACHIEVEMENTS, true),
        medRevisions: parse<any[]>(savedMed, []),
        userProfile: profile,
        studySessions: parse<any[]>(savedSess, []),
        pomodoroSettings: parse(savedPomo, { workMinutes: 25, shortBreakMinutes: 5, mediumBreakMinutes: 10, longBreakMinutes: 15 }),
        tutorMessages: parse(savedTutor, INITIAL_TUTOR_MESSAGES, true),
        checklist: parse<ChecklistItem[]>(savedChecklist, []),
        checklistBlocks: parse<ChecklistBlock[]>(savedChecklistBlocks, []),
        topicBlocks: parse<TopicBlock[]>(savedTopicBlocks, []),
        questionLogs: parse<QuestionLog[]>(savedQuestionLogs, []),
        studyMethod: normalizeStudyMethod(parse<any>(savedStudyMethod, null)),
        updatedAt: new Date().toISOString(),
      };
    };

    // Fetches this user's row; creates it on the first sign-in
    const loadFromCloud = async () => {
      if (!supabase || !cloudUserId || !isSubscribed) {
        if (isSubscribed) setCloudSyncStatus('offline');
        return;
      }
      const { data, error } = await supabase
        .from(APP_STATE_TABLE)
        .select('data')
        .eq('user_id', cloudUserId)
        .maybeSingle();
      if (!isSubscribed) return;
      if (error) {
        console.warn('[Supabase] Falha ao carregar dados da nuvem:', error.message);
        setCloudSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
        return;
      }
      if (data?.data && Object.keys(data.data).length > 0) {
        applyCloudData(data.data);
        setCloudSyncStatus('synced');
        setLastCloudSync(new Date());
        return;
      }
      const { error: upsertError } = await supabase
        .from(APP_STATE_TABLE)
        .upsert({ user_id: cloudUserId, data: buildBootstrapState(), updated_at: new Date().toISOString() });
      if (!isSubscribed) return;
      if (upsertError) {
        console.warn('[Supabase] Falha no primeiro salvamento na nuvem:', upsertError.message);
        setCloudSyncStatus('error');
      } else {
        setCloudSyncStatus('synced');
        setLastCloudSync(new Date());
      }
    };

    // 1. Prioridade Máxima: cache do IndexedDB na interface; 2. depois, a versão da nuvem por cima
    loadIDBCache(activeUserId).then(loadFromCloud);

    // Online & Offline Network State Handlers (reconnecting triggers a sync)
    const handleOnline = () => {
      setCloudSyncStatus('syncing');
      setSyncNonce((n) => n + 1);
    };

    const handleOffline = () => {
      setCloudSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      isSubscribed = false;
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeUserId, cloudUserId]);

  // Persist currentTab to LocalStorage
  useEffect(() => {
    if (activeUserId && isInitialLoadComplete && currentTab) {
      localStorage.setItem(getUserKey('current_tab', activeUserId), currentTab);
    }
  }, [currentTab, activeUserId, isInitialLoadComplete]);

  // Persist individual states to LocalStorage & IndexedDB
  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      localStorage.setItem(getUserKey('semesters', activeUserId), JSON.stringify(semesters));
      setIDBData(`semesters_${activeUserId}`, semesters);
    }
  }, [semesters, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      localStorage.setItem(getUserKey('subjects', activeUserId), JSON.stringify(subjects));
      setIDBData(`subjects_${activeUserId}`, subjects);
    }
  }, [subjects, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      localStorage.setItem(getUserKey('topics', activeUserId), JSON.stringify(topics));
      setIDBData(`topics_${activeUserId}`, topics);
    }
  }, [topics, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      localStorage.setItem(getUserKey('exams', activeUserId), JSON.stringify(exams));
      setIDBData(`exams_${activeUserId}`, exams);
    }
  }, [exams, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      localStorage.setItem(getUserKey('schedule', activeUserId), JSON.stringify(schedule));
      setIDBData(`schedule_${activeUserId}`, schedule);
    }
  }, [schedule, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      localStorage.setItem(getUserKey('achievements', activeUserId), JSON.stringify(achievements));
      setIDBData(`achievements_${activeUserId}`, achievements);
    }
  }, [achievements, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      localStorage.setItem(getUserKey('med_revisions', activeUserId), JSON.stringify(medRevisions));
      setIDBData(`med_revisions_${activeUserId}`, medRevisions);
    }
  }, [medRevisions, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      try {
        localStorage.setItem(getUserKey('user_profile', activeUserId), JSON.stringify(userProfile));
      } catch (err) {
        console.warn('Perfil não coube no armazenamento local; segue salvo no IndexedDB/nuvem.', err);
      }
      setIDBData(`user_profile_${activeUserId}`, userProfile);
    }
  }, [userProfile, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      localStorage.setItem(getUserKey('study_sessions', activeUserId), JSON.stringify(studySessions));
      setIDBData(`study_sessions_${activeUserId}`, studySessions);
    }
  }, [studySessions, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      localStorage.setItem(getUserKey('pomodoro_settings', activeUserId), JSON.stringify(pomodoroSettings));
      setIDBData(`pomodoro_settings_${activeUserId}`, pomodoroSettings);
    }
  }, [pomodoroSettings, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      localStorage.setItem(getUserKey('tutor_messages', activeUserId), JSON.stringify(tutorMessages));
      setIDBData(`tutor_messages_${activeUserId}`, tutorMessages);
    }
  }, [tutorMessages, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      localStorage.setItem(getUserKey('checklist', activeUserId), JSON.stringify(checklist));
    }
  }, [checklist, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      localStorage.setItem(getUserKey('checklist_blocks', activeUserId), JSON.stringify(checklistBlocks));
    }
  }, [checklistBlocks, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      localStorage.setItem(getUserKey('topic_blocks', activeUserId), JSON.stringify(topicBlocks));
    }
  }, [topicBlocks, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      localStorage.setItem(getUserKey('question_logs', activeUserId), JSON.stringify(questionLogs));
    }
  }, [questionLogs, activeUserId, isInitialLoadComplete]);

  useEffect(() => {
    if (activeUserId && isInitialLoadComplete) {
      try {
        localStorage.setItem(getUserKey('study_method', activeUserId), JSON.stringify(studyMethod));
      } catch {
        /* sem espaço: segue no IndexedDB e na nuvem */
      }
      setIDBData(`study_method_${activeUserId}`, studyMethod);
    }
  }, [studyMethod, activeUserId, isInitialLoadComplete]);

  studySessionsRef.current = studySessions;

  // Migração: tópicos sem bloco viram um bloco com o nome da disciplina (ex.: "NEONATOLOGIA 1").
  // O id é fixo por disciplina, então dois aparelhos migrando ao mesmo tempo geram o mesmo bloco.
  useEffect(() => {
    if (!activeUserId || !isInitialLoadComplete) return;
    const validIds = new Set(topicBlocks.map((b) => b.id));
    // Checklist/Tutoria (Básico e Clínico) usam tópicos soltos de propósito: só vão para um bloco ao 'Enviar para Revisões'
    const looseSubjects = new Set(subjects.filter((s) => s.organization === 'checklist').map((s) => s.id));
    const brokenLoose = topics.some((t) => looseSubjects.has(t.subjectId) && t.blockId && !validIds.has(t.blockId));
    if (brokenLoose) {
      setTopics((prev) => prev.map((t) => (looseSubjects.has(t.subjectId) && t.blockId && !validIds.has(t.blockId) ? { ...t, blockId: undefined } : t)));
      return;
    }
    const orphans = topics.filter((t) => !looseSubjects.has(t.subjectId) && (!t.blockId || !validIds.has(t.blockId)));
    if (orphans.length === 0) return;

    const today = ymd(new Date());
    const newBlocks: TopicBlock[] = [];
    const bySubject = new Map<string, Topic[]>();
    orphans.forEach((t) => bySubject.set(t.subjectId, [...(bySubject.get(t.subjectId) || []), t]));
    bySubject.forEach((list, subjectId) => {
      const id = 'blk-auto-' + subjectId;
      if (validIds.has(id)) return;
      const sub = subjects.find((s) => s.id === subjectId);
      const allSeen = list.every(isTopicResolved);
      const reviewsDone = allSeen ? Math.min(...list.map((t) => getReviewsDone(t))) : 0;
      const dates = list.map((t) => t.nextReviewDate).filter(Boolean).sort() as string[];
      const status: TopicBlock['reviewStatus'] = !allSeen ? 'estudando' : 'revisao';
      newBlocks.push({
        id,
        subjectId,
        name: sub?.universitySubject || sub?.name || 'Geral',
        createdAt: new Date().toISOString(),
        reviewStatus: status,
        reviewsDone,
        completedDate: status !== 'estudando' ? today : undefined,
        nextReviewDate:
          status === 'revisao' ? (reviewsDone === 0 ? addDaysYMD(FIRST_REVIEW_DAY, today) : dates[0] || addDaysYMD(FIRST_REVIEW_DAY, today)) : undefined,
        difficulty: reviewsDone > 0 ? 'medio' : undefined,
      });
    });
    if (newBlocks.length > 0) setTopicBlocks((prev) => [...prev, ...newBlocks.filter((b) => !prev.some((p) => p.id === b.id))]);
    setTopics((prev) =>
      prev.map((t) => (looseSubjects.has(t.subjectId) || (t.blockId && validIds.has(t.blockId)) ? t : { ...t, blockId: 'blk-auto-' + t.subjectId }))
    );
  }, [topics, topicBlocks, subjects, activeUserId, isInitialLoadComplete]);

  // Blocos "dominados" (versão antiga, fim na R4) continuam no ciclo: R5, R6, R7...
  useEffect(() => {
    if (!activeUserId || !isInitialLoadComplete) return;
    if (!topicBlocks.some((b) => b.reviewStatus === 'dominado')) return;
    setTopicBlocks((prev) =>
      prev.map((b) => {
        if (b.reviewStatus !== 'dominado') return b;
        const level = b.difficulty || 'medio';
        const base = b.lastReviewDate || ymd(new Date());
        return { ...b, reviewStatus: 'revisao', difficulty: level, nextReviewDate: addDaysYMD(nextIntervalDays(level, b.reviewsDone), base) };
      })
    );
  }, [topicBlocks, activeUserId, isInitialLoadComplete]);

  // Blocos que entraram nas revisões antes do "Dia 0" existir: Dia 0 = data registrada e 1ª revisão no Dia 7
  useEffect(() => {
    if (!activeUserId || !isInitialLoadComplete) return;
    const pending = topicBlocks.filter((b) => b.reviewStatus !== 'estudando' && !b.completedDate);
    if (pending.length === 0) return;
    setTopicBlocks((prev) =>
      prev.map((b) => {
        if (b.reviewStatus === 'estudando' || b.completedDate) return b;
        const day0 = b.lastReviewDate && !(b.reviewLog && b.reviewLog.length) ? b.lastReviewDate : b.createdAt.slice(0, 10);
        const fresh = b.reviewStatus === 'revisao' && b.reviewsDone === 0 && !(b.reviewLog && b.reviewLog.length);
        return {
          ...b,
          completedDate: day0,
          nextReviewDate: fresh ? addDaysYMD(FIRST_REVIEW_DAY, day0) : b.nextReviewDate,
          difficulty: fresh ? undefined : b.difficulty,
        };
      })
    );
  }, [topicBlocks, activeUserId, isInitialLoadComplete]);

  // Full academic state saved as one JSON row per user (table app_state, see supabase/schema.sql)
  const buildCloudState = () => ({
    semesters,
    subjects,
    topics,
    exams,
    schedule,
    achievements,
    medRevisions,
    userProfile,
    studySessions,
    pomodoroSettings,
    tutorMessages,
    checklist,
    checklistBlocks,
    topicBlocks,
    questionLogs,
    studyMethod,
    updatedAt: new Date().toISOString(),
  });

  // Upserts the state; returns true on success. Status handling is left to the callers.
  const pushStateToCloud = async (): Promise<boolean> => {
    if (!supabase || !cloudUserId) return false;
    isSyncInProgressRef.current = true;
    try {
      const { error } = await supabase
        .from(APP_STATE_TABLE)
        .upsert({ user_id: cloudUserId, data: buildCloudState(), updated_at: new Date().toISOString() });
      if (error) {
        console.warn('[Supabase] Falha ao sincronizar:', error.message);
        return false;
      }
      return true;
    } catch (err) {
      console.warn('[Supabase] Falha ao sincronizar:', err);
      return false;
    } finally {
      setTimeout(() => {
        isSyncInProgressRef.current = false;
      }, 300);
    }
  };

  // Debounced Sync to Supabase on State Mutation
  useEffect(() => {
    if (!activeUserId || !cloudUserId || !isInitialLoadComplete) return;

    const timer = setTimeout(async () => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setCloudSyncStatus('offline');
        return;
      }
      setCloudSyncStatus('syncing');
      const ok = await pushStateToCloud();
      if (ok) {
        setCloudSyncStatus('synced');
        setLastCloudSync(new Date());
      } else {
        setCloudSyncStatus(typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error');
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [
    activeUserId,
    cloudUserId,
    isInitialLoadComplete,
    syncNonce,
    semesters,
    subjects,
    topics,
    exams,
    schedule,
    achievements,
    medRevisions,
    userProfile,
    studySessions,
    pomodoroSettings,
    tutorMessages,
    checklist,
    checklistBlocks,
    topicBlocks,
    questionLogs,
    studyMethod,
  ]);

  // Force Cloud Sync manually
  const forceCloudSync = async () => {
    if (!activeUserId) return;
    if (!supabase || !cloudUserId) {
      showNotification('Modo local: os dados ficam salvos apenas neste dispositivo.', 'info');
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setCloudSyncStatus('offline');
      showNotification('Modo offline: dados salvos no dispositivo. Sincronização ocorrerá ao reconectar.', 'info');
      return;
    }

    setCloudSyncStatus('syncing');
    if (await pushStateToCloud()) {
      setCloudSyncStatus('synced');
      setLastCloudSync(new Date());
      showNotification('Sincronização com a nuvem concluída!', 'success');
    } else {
      setCloudSyncStatus('error');
      showNotification('Erro ao sincronizar com a nuvem. Seus dados continuam salvos no dispositivo.', 'warning');
    }
  };

  const updatePomodoroSettings = (settings: { workMinutes: number; shortBreakMinutes: number; mediumBreakMinutes: number; longBreakMinutes: number }) => {
    setPomodoroSettings(settings);
    setTimer((prev) => {
      if (prev.isRunning) return prev;
      let secs = settings.workMinutes * 60;
      if (prev.mode === 'short_break') secs = settings.shortBreakMinutes * 60;
      if (prev.mode === 'medium_break') secs = settings.mediumBreakMinutes * 60;
      if (prev.mode === 'long_break') secs = settings.longBreakMinutes * 60;
      return {
        ...prev,
        timeLeftSeconds: secs,
      };
    });
  };

  // Tema: escuro é o padrão; o modo claro fica salvo neste aparelho
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(() => {
    try {
      return localStorage.getItem('medacademic_theme') === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  });
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', themeMode === 'dark');
    root.style.colorScheme = themeMode;
    try {
      localStorage.setItem('medacademic_theme', themeMode);
    } catch {
      /* sem armazenamento */
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', themeMode === 'dark' ? '#0f172a' : '#e9eff6');
  }, [themeMode]);

  // Global Timer Tick: recalcula pelo relógio, então o tempo fica certo mesmo que o navegador
  // atrase o JavaScript em segundo plano (outra aba, outro app, tela bloqueada)
  useEffect(() => {
    if (!timer.isRunning) return;
    const sync = () =>
      setTimer((prev) => {
        if (!prev.isRunning) return prev;
        const now = Date.now();
        if (prev.mode === 'stopwatch') {
          const startedAt = prev.startedAt ?? now;
          const base = prev.elapsedBase ?? prev.elapsedSeconds;
          const elapsed = base + Math.floor((now - startedAt) / 1000);
          if (elapsed === prev.elapsedSeconds && prev.startedAt) return prev;
          return { ...prev, startedAt, elapsedBase: base, elapsedSeconds: elapsed };
        }
        const endsAt = prev.endsAt ?? now + prev.timeLeftSeconds * 1000;
        const left = remainingSeconds(endsAt);
        // Fim da contagem: a conclusão é tratada no efeito abaixo (updaters precisam ser puros)
        if (left <= 0) return { ...prev, endsAt, isRunning: false, timeLeftSeconds: 0 };
        if (left === prev.timeLeftSeconds && prev.endsAt) return prev;
        return { ...prev, endsAt, timeLeftSeconds: left };
      });
    sync();
    const interval = setInterval(sync, 500);
    document.addEventListener('visibilitychange', sync);
    window.addEventListener('focus', sync);
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', sync);
      window.removeEventListener('focus', sync);
    };
  }, [timer.isRunning]);

  // Bipe de fim agendado no relógio de áudio: toca na hora certa mesmo em segundo plano.
  // No ciclo de estudos a pausa começa sozinha: já deixa agendados o bipe de início e o de fim dela.
  useEffect(() => {
    if (!timer.isRunning || timer.mode === 'stopwatch' || !timer.endsAt) {
      cancelScheduledBeeps();
      scheduledBeepsRef.current = new Set();
      return;
    }
    const plan: Array<{ kind: 'start' | 'end'; at: number }> = [{ kind: 'end', at: timer.endsAt }];
    const c = timer.cycle;
    if (c && c.phase === 'work') {
      const step = c.steps[c.index];
      if (c.index < c.steps.length - 1 && step.breakMins > 0) {
        plan.push({ kind: 'start', at: timer.endsAt + 1200 });
        plan.push({ kind: 'end', at: timer.endsAt + step.breakMins * 60 * 1000 });
      }
    }
    const keys = plan.map((p) => `${p.kind}@${p.at}`);
    if (keys.every((k) => scheduledBeepsRef.current.has(k))) return; // já está tudo agendado
    cancelScheduledBeeps();
    plan.forEach((p) => scheduleTimerBeepAt(p.kind, p.at));
    scheduledBeepsRef.current = new Set(keys);
  }, [timer.isRunning, timer.endsAt, timer.mode]);

  // Mostra o tempo no título da aba enquanto o timer roda
  useEffect(() => {
    const base = 'MedAcademic - Gestão de Estudos Médicos';
    if (!timer.isRunning) {
      document.title = base;
      return;
    }
    const label = timer.mode === 'stopwatch' ? 'Cronômetro' : timer.mode === 'pomodoro' ? 'Foco' : 'Pausa';
    const secs = timer.mode === 'stopwatch' ? timer.elapsedSeconds : timer.timeLeftSeconds;
    document.title = `⏱ ${formatClock(secs)} · ${label} — MedAcademic`;
  }, [timer.isRunning, timer.mode, timer.timeLeftSeconds, timer.elapsedSeconds]);

  // Guarda o timer em andamento: se o navegador do celular descartar a aba, ele volta de onde estava
  useEffect(() => {
    try {
      if (timer.isRunning) localStorage.setItem(TIMER_STORAGE_KEY, JSON.stringify(timer));
      else localStorage.removeItem(TIMER_STORAGE_KEY);
    } catch {
      /* armazenamento indisponível */
    }
  }, [timer.isRunning, timer.endsAt, timer.startedAt, timer.mode, timer.cycle, timer.task]);

  // Countdown completion: award XP, log the session and switch to the next phase
  useEffect(() => {
    if (timer.isRunning || timer.mode === 'stopwatch' || timer.timeLeftSeconds !== 0) return;

    // O bipe de fim normalmente já tocou pelo agendamento; se o áudio estava bloqueado, toca agora
    const finishedAt = timer.endsAt ?? Date.now();
    if (!isTimerAudioRunning() || !scheduledBeepsRef.current.has(`end@${finishedAt}`)) playTimerBeep('end');

    // Study cycle: study block → its own break (auto-started) → next step (waits for the user)
    if (timer.cycle) {
      const { steps, index, phase } = timer.cycle;
      const step = steps[index];
      const isLast = index === steps.length - 1;

      if (phase === 'work') {
        triggerConfetti();
        addXp(100, 'Etapa do Ciclo Concluída');
        logStudySession({
          subjectId: timer.selectedSubjectId,
          topicId: timer.selectedTopicId,
          durationMinutes: step.workMins,
          type: 'pomodoro',
          xpEarned: 100,
          notes: `Ciclo de Estudos • ${step.title}`,
          blockId: timer.task?.blockId,
          projectId: timer.task?.projectId,
          activity: timer.task?.kind,
        });

        if (isLast) {
          notifyTimer('🏁 Ciclo de estudos concluído!', 'Excelente trabalho. Hora de descansar.');
          showNotification('🏁 Ciclo de estudos concluído! Excelente trabalho.', 'success');
          setTimer((prev) => ({
            ...prev,
            mode: 'pomodoro',
            timeLeftSeconds: pomodoroSettings.workMinutes * 60,
            customDurationSeconds: undefined,
            totalPomodorosCompleted: prev.totalPomodorosCompleted + 1,
            cycle: undefined,
          }));
        } else if (step.breakMins > 0) {
          notifyTimer('⏰ Etapa concluída!', `Pausa de ${step.breakMins} min iniciada.`);
          showNotification(`🎉 Etapa concluída! Pausa de ${step.breakMins} min iniciada.`, 'success');
          // A pausa conta a partir do fim real do estudo (mesmo se o app estava em segundo plano)
          const breakEndsAt = finishedAt + step.breakMins * 60 * 1000;
          setTimer((prev) => ({
            ...prev,
            mode: 'short_break',
            isRunning: true,
            endsAt: breakEndsAt,
            timeLeftSeconds: remainingSeconds(breakEndsAt),
            customDurationSeconds: step.breakMins * 60,
            totalPomodorosCompleted: prev.totalPomodorosCompleted + 1,
            cycle: { steps, index, phase: 'break' },
          }));
        } else {
          const next = steps[index + 1];
          notifyTimer('⏰ Etapa concluída!', `Próxima: ${next.title}.`);
          showNotification(`🎉 Etapa concluída! Próxima: ${next.title}.`, 'success');
          setTimer((prev) => ({
            ...prev,
            mode: 'pomodoro',
            timeLeftSeconds: next.workMins * 60,
            customDurationSeconds: next.workMins * 60,
            totalPomodorosCompleted: prev.totalPomodorosCompleted + 1,
            cycle: { steps, index: index + 1, phase: 'work' },
          }));
        }
      } else {
        const next = steps[index + 1];
        notifyTimer('⏰ Pausa finalizada!', `Quando estiver pronto, inicie: ${next.title}.`);
        showNotification(`⏰ Pausa finalizada! Quando estiver pronto, inicie: ${next.title}.`, 'info');
        setTimer((prev) => ({
          ...prev,
          mode: 'pomodoro',
          timeLeftSeconds: next.workMins * 60,
          customDurationSeconds: next.workMins * 60,
          cycle: { steps, index: index + 1, phase: 'work' },
        }));
      }
      return;
    }

    if (timer.mode === 'pomodoro') {
      const focusMinutes = Math.round((timer.customDurationSeconds || pomodoroSettings.workMinutes * 60) / 60);
      triggerConfetti();
      notifyTimer('🎉 Pomodoro concluído!', 'Hora da pausa.');
      showNotification('🎉 Ciclo Pomodoro concluído! Hora da pausa.', 'success');
      addXp(100, 'Pomodoro Concluído');
      const focusSessionId = logStudySession({
        subjectId: timer.selectedSubjectId,
        topicId: timer.selectedTopicId,
        durationMinutes: focusMinutes,
        type: 'pomodoro',
        xpEarned: 100,
        notes: timer.task ? `Foco • ${timer.task.title}` : 'Sessão Pomodoro de Foco Médico',
        blockId: timer.task?.blockId,
        projectId: timer.task?.projectId,
        activity: timer.task?.kind,
      });
      // Revisão registrada no meio deste foco: o tempo do foco entra nela agora
      const reviewedBlock = timer.task?.reviewed ? timer.task.blockId : undefined;
      if (reviewedBlock) {
        const todayStr = ymd(new Date());
        setTopicBlocks((prev) =>
          prev.map((bk) => {
            if (bk.id !== reviewedBlock || !bk.reviewLog?.length) return bk;
            const log = [...bk.reviewLog];
            const last = log[log.length - 1];
            if (last.date !== todayStr || last.minutes) return bk;
            log[log.length - 1] = { ...last, minutes: focusMinutes, sessionId: focusSessionId };
            return { ...bk, reviewLog: log };
          })
        );
      }
      // Pausa longa a cada 4 blocos de foco (Cirillo); pausa de 10 min depois de um bloco de 50
      const count = timer.totalPomodorosCompleted + 1;
      const longBreak = count % 4 === 0;
      const breakMode: TimerState['mode'] = longBreak ? 'long_break' : focusMinutes >= 45 ? 'medium_break' : 'short_break';
      // Tarefa do plano: usa a pausa do bloco do aluno (ex.: 60/10, 45/15); a pausa longa a cada 4 continua
      const taskBreak = timer.task?.breakMinutes;
      const breakMins =
        breakMode === 'long_break'
          ? Math.max(pomodoroSettings.longBreakMinutes, taskBreak || 0)
          : taskBreak
            ? taskBreak
            : breakMode === 'medium_break'
              ? pomodoroSettings.mediumBreakMinutes
              : pomodoroSettings.shortBreakMinutes;
      if (longBreak) showNotification(`☕ ${count} blocos de foco! Hora de uma pausa longa (${pomodoroSettings.longBreakMinutes} min).`, 'success');
      setTimer((prev) => ({
        ...prev,
        mode: breakMode,
        timeLeftSeconds: breakMins * 60,
        customDurationSeconds: undefined,
        totalPomodorosCompleted: prev.totalPomodorosCompleted + 1,
        task: prev.task ? { ...prev.task, finished: true } : prev.task,
      }));
    } else {
      notifyTimer('⏰ Pausa finalizada!', 'Hora de retomar o foco.');
      showNotification('⏰ Pausa finalizada! Hora de retomar o foco.', 'info');
      setTimer((prev) => ({
        ...prev,
        mode: 'pomodoro',
        timeLeftSeconds: pomodoroSettings.workMinutes * 60,
        customDurationSeconds: undefined,
      }));
    }
  }, [timer.isRunning, timer.mode, timer.timeLeftSeconds]);

  const showNotification = (message: string, type: 'success' | 'info' | 'warning' = 'info', opts?: NotifyOptions) => {
    const withAction = !!(opts?.actionLabel && opts.onAction);
    setNotification({
      message,
      type,
      id: Date.now(),
      ...(withAction ? { actionLabel: opts!.actionLabel, onAction: opts!.onAction } : {}),
    });
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = setTimeout(() => {
      setNotification(null);
      notificationTimerRef.current = null;
    }, opts?.durationMs ?? (withAction ? UNDO_WINDOW_MS : 4000));
  };

  const dismissNotification = () => {
    if (notificationTimerRef.current) clearTimeout(notificationTimerRef.current);
    notificationTimerRef.current = null;
    setNotification(null);
  };

  // ---------- Desfazer exclusão (disciplina, tópico, bloco do Checklist)
  // Os dados vão para a nuvem como listas inteiras (sem "lápide" de excluído),
  // então devolver os itens com os mesmos ids basta para restaurar.
  const clearUndo = () => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = null;
    undoRef.current = null;
    setCanUndoDelete(false);
  };

  const undoLastDelete = () => {
    const snap = undoRef.current;
    if (!snap) return;
    clearUndo();
    const addBack = <T extends { id: string }>(prev: T[], back: T[]) => {
      if (!back.length) return prev;
      const ids = new Set(prev.map((x) => x.id));
      const missing = back.filter((x) => !ids.has(x.id));
      return missing.length ? [...prev, ...missing] : prev;
    };
    if (snap.subjects.length) setSubjects((prev) => addBack(prev, snap.subjects));
    if (snap.topicBlocks.length) setTopicBlocks((prev) => addBack(prev, snap.topicBlocks));
    if (snap.topics.length) setTopics((prev) => addBack(prev, snap.topics));
    // Tópico excluído pode ter fechado o bloco: o bloco volta como estava antes
    if (snap.blocksBefore.length) {
      const byId = new Map(snap.blocksBefore.map((b) => [b.id, b]));
      setTopicBlocks((prev) => prev.map((b) => byId.get(b.id) || b));
    }
    if (snap.checklistBlocks.length) setChecklistBlocks((prev) => addBack(prev, snap.checklistBlocks));
    if (snap.checklist.length) setChecklist((prev) => addBack(prev, snap.checklist));
    showNotification('Pronto, voltou.', 'success');
  };

  /** Guarda o que foi excluído e mostra o aviso com "Desfazer" */
  const offerUndo = (snap: Partial<DeleteSnapshot>, message: string) => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoRef.current = {
      subjects: snap.subjects || [],
      topicBlocks: snap.topicBlocks || [],
      topics: snap.topics || [],
      checklistBlocks: snap.checklistBlocks || [],
      checklist: snap.checklist || [],
      blocksBefore: snap.blocksBefore || [],
    };
    setCanUndoDelete(true);
    undoTimerRef.current = setTimeout(clearUndo, UNDO_WINDOW_MS);
    showNotification(message, 'info', { actionLabel: 'Desfazer', onAction: undoLastDelete, durationMs: UNDO_WINDOW_MS });
  };

  const triggerConfetti = () => {
    try {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.7 },
        colors: ['#0284c7', '#0d9488', '#10b981', '#f59e0b'],
      });
    } catch {
      // ignore
    }
  };

  // State updaters must stay pure (React may run them twice), so the level-up side effects are
  // decided from the ref instead of inside setUserProfile.
  // Nível e XP saíram do site (deixá-lo mais leve). A função fica como no-op para as chamadas antigas.
  const addXp = (_amount: number, _reason?: string) => {};

  const logStudySession = (session: Omit<StudySession, 'id' | 'timestamp'>) => {
    const newSession: StudySession = {
      ...session,
      id: 'sess-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      timestamp: new Date().toISOString(),
    };
    setStudySessions((prev) => [newSession, ...prev]);

    // Check & update streak and achievements (data local: estudo depois das 21h conta para hoje)
    const today = ymd(new Date());
    setUserProfile((prev) => {
      const lastDate = prev.lastStudyDate;
      let newStreak = prev.currentStreakDays;
      if (!lastDate) {
        newStreak = 1;
      } else {
        const last = new Date(lastDate);
        const curr = new Date(today);
        const diffDays = Math.round((curr.getTime() - last.getTime()) / (1000 * 3600 * 24));
        if (diffDays === 1) {
          newStreak += 1;
        } else if (diffDays > 1) {
          newStreak = 1;
        }
      }
      const best = Math.max(prev.bestStreakDays, newStreak);
      return {
        ...prev,
        currentStreakDays: newStreak,
        bestStreakDays: best,
        lastStudyDate: today,
      };
    });

    setAchievements((prev) =>
      prev.map((ach) => {
        if (ach.id === 'ach-1') {
          const totalHoursWeek = (studySessions.reduce((acc, s) => acc + s.durationMinutes, 0) + session.durationMinutes) / 60;
          const progress = Math.min(100, Math.round((totalHoursWeek / ach.target) * 100));
          return {
            ...ach,
            current: Number(totalHoursWeek.toFixed(1)),
            progress,
            unlockedAt: progress >= 100 && !ach.unlockedAt ? new Date().toISOString() : ach.unlockedAt,
          };
        }
        return ach;
      })
    );
    return newSession.id;
  };

  // Aba de conclusão (bloco fechado / revisão feita): tempo de estudo vira sessão nas métricas
  const [studyTimePrompt, setStudyTimePrompt] = useState<StudyTimePrompt | null>(null);
  const completeStudyTimePrompt = (minutes: number) => {
    const p = studyTimePrompt;
    setStudyTimePrompt(null);
    if (!p || !minutes || minutes <= 0) return;
    const sessionId = logStudySession({
      subjectId: p.subjectId,
      durationMinutes: minutes,
      type: p.kind === 'review' ? 'spaced_repetition' : 'stopwatch',
      notes: p.kind === 'review' ? `Revisão R${p.reviewNumber} · ${p.name}` : `Bloco concluído · ${p.name}`,
      xpEarned: 0,
    });
    setTopicBlocks((prev) =>
      prev.map((bk) => {
        if (bk.id !== p.blockId) return bk;
        if (p.kind === 'block') return { ...bk, studyMinutes: minutes };
        const log = [...(bk.reviewLog || [])];
        const idx = (p.reviewNumber || log.length) - 1;
        if (!log[idx]) return bk;
        log[idx] = { ...log[idx], minutes, sessionId };
        return { ...bk, reviewLog: log };
      })
    );
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    showNotification(`⏱ ${h ? h + 'h' : ''}${m ? (h ? String(m).padStart(2, '0') : m + ' min') : ''} de estudo registrados.`, 'success');
  };

  // Current Semester
  const currentSemester = semesters.find((s) => s.id === userProfile.currentSemesterId) || semesters[0];

  // Método de estudo: fase do curso e preferências efetivas (padrões da fase + escolhas do aluno)
  const studyPhase = studyPhaseOf(currentSemester);
  const contestsActive = studyPhase === 'internato' || (studyPhase === 'ciclo_clinico' && !!userProfile.contestsEnabled);
  const studyPrefs = resolvePrefs(studyMethod.prefs, studyPhase, userProfile.weeklyTargetHours);
  const residencyPrep = isResidencyPrep(studyPhase, userProfile, studyMethod.projects);
  const currentSubjectIds = subjects.filter((s) => !s.semesterId || s.semesterId === currentSemester?.id).map((s) => s.id);
  /** Próxima revisão: N dias a partir de hoje, pulando o dia de descanso */
  const reviewDateIn = (days: number, from?: string) => scheduleReviewDate(days, { from, restDay: restDaysOf(studyPrefs) });

  // Grade de horários do semestre atual (as de semestres anteriores ficam guardadas no histórico)
  const currentSchedule = schedule.filter((s) => !s.semesterId || !currentSemester || s.semesterId === currentSemester.id);

  // Organiza dados antigos no calendário acadêmico: semestre ganha período (2026.1 / 2026.2) e
  // disciplinas, provas e grade de horários sem semestre passam a pertencer ao semestre atual.
  useEffect(() => {
    if (!activeUserId || !isInitialLoadComplete || !currentSemester) return;
    if (semesters.some((s) => !s.period)) {
      setSemesters((prev) =>
        prev.map((s) => {
          if (s.period) return s;
          const p = s.startDate ? periodForDate(s.startDate) : periodByCode(s.code) || periodForDate(ymd(new Date()));
          return { ...s, period: p.code, startDate: p.start, endDate: p.end };
        })
      );
    }
    if (subjects.some((s) => !s.semesterId)) {
      setSubjects((prev) => prev.map((s) => (s.semesterId ? s : { ...s, semesterId: currentSemester.id })));
    }
    if (schedule.some((s) => !s.semesterId)) {
      setSchedule((prev) => prev.map((s) => (s.semesterId ? s : { ...s, semesterId: currentSemester.id })));
    }
    if (exams.some((e) => !e.semesterId)) {
      setExams((prev) =>
        prev.map((e) => {
          if (e.semesterId) return e;
          const owner = semesters.find((s) => inPeriod(periodByCode(s.period), e.date));
          return { ...e, semesterId: owner?.id || currentSemester.id };
        })
      );
    }
  }, [semesters, subjects, schedule, exams, currentSemester?.id, activeUserId, isInitialLoadComplete]);

  const setCurrentSemesterId = (id: string) => {
    setSemesters((prev) =>
      prev.map((s) => ({
        ...s,
        isCurrent: s.id === id,
      }))
    );
    setUserProfile((prev) => ({ ...prev, currentSemesterId: id }));
  };

  const addSemester = (sem: Omit<Semester, 'id'>) => {
    const newSem: Semester = { ...sem, id: 'sem-' + Date.now() };
    setSemesters((prev) => [...prev, newSem]);
    showNotification(`Semestre "${sem.name}" adicionado!`, 'success');
    // XP is awarded by the calling modal
    return newSem.id;
  };

  const startNextSemester = () => {
    if (!currentSemester) return;
    const today = ymd(new Date());
    const after = nextPeriod(periodByCode(currentSemester.period) || periodForDate(currentSemester.startDate || today));
    const todays = periodForDate(today);
    const period = todays.code > after.code ? todays : after; // se ficou mais de um semestre sem virar, vai para o atual
    const id = 'sem-' + Date.now();
    const name = nextSemesterName(currentSemester.name);
    setSemesters((prev) => [
      ...prev.map((s) => ({ ...s, isCurrent: false })),
      {
        id,
        name,
        code: period.code,
        period: period.code,
        startDate: period.start,
        endDate: period.end,
        isCurrent: true,
        targetHoursWeekly: currentSemester.targetHoursWeekly,
        description: currentSemester.description,
      },
    ]);
    setUserProfile((prev) => ({ ...prev, currentSemesterId: id }));
    addXp(200, 'Novo semestre iniciado');
    triggerConfetti();
    showNotification(`🎓 ${name} (${period.code}) iniciado! O semestre anterior está no Histórico.`, 'success');
  };

  const updateSemester = (id: string, sem: Partial<Semester>) => {
    setSemesters((prev) => prev.map((s) => (s.id === id ? { ...s, ...sem } : s)));
    showNotification('Semestre atualizado!', 'success');
  };

  const deleteSemester = (id: string) => {
    setSemesters((prev) => prev.filter((s) => s.id !== id));
    showNotification('Semestre removido.', 'info');
  };

  // ---------- Zerar só o semestre atual (semestres passados e suas estatísticas ficam intactos) ----------
  type SemesterBackup = {
    semesterId: string;
    semesterName: string;
    at: string;
    subjects: Subject[];
    topics: Topic[];
    topicBlocks: TopicBlock[];
    exams: Exam[];
    schedule: ScheduleClass[];
    questionLogs: QuestionLog[];
    studySessions: StudySession[];
  };
  const backupKey = () => getUserKey('semester_reset_backup', activeUserId);
  const readBackup = (): SemesterBackup | null => {
    try {
      const raw = localStorage.getItem(backupKey());
      if (!raw) return null;
      const b = JSON.parse(raw) as SemesterBackup;
      // o "desfazer" fica disponível por 7 dias
      if (Date.now() - new Date(b.at).getTime() > 7 * 86400000) return null;
      return b;
    } catch {
      return null;
    }
  };
  const [semesterResetBackupInfo, setSemesterResetBackupInfo] = useState<{ semesterId: string; semesterName: string; at: string } | null>(null);
  useEffect(() => {
    const b = activeUserId ? readBackup() : null;
    setSemesterResetBackupInfo(b ? { semesterId: b.semesterId, semesterName: b.semesterName, at: b.at } : null);
  }, [activeUserId]);

  const resetCurrentSemester = () => {
    const sem = semesters.find((s) => s.id === userProfile.currentSemesterId) || semesters[0];
    if (!sem) return;
    const subIds = new Set(subjects.filter((s) => s.semesterId === sem.id).map((s) => s.id));
    const backup: SemesterBackup = {
      semesterId: sem.id,
      semesterName: sem.name,
      at: new Date().toISOString(),
      subjects: subjects.filter((s) => subIds.has(s.id)),
      topics: topics.filter((t) => subIds.has(t.subjectId)),
      topicBlocks: topicBlocks.filter((b) => subIds.has(b.subjectId)),
      exams: exams.filter((e) => e.semesterId === sem.id),
      schedule: schedule.filter((c) => c.semesterId === sem.id),
      questionLogs: questionLogs.filter((q) => q.semesterId === sem.id || (q.subjectId && subIds.has(q.subjectId))),
      studySessions: studySessions.filter((x) => x.subjectId && subIds.has(x.subjectId)),
    };
    try {
      localStorage.setItem(backupKey(), JSON.stringify(backup));
    } catch {}
    const qIds = new Set(backup.questionLogs.map((q) => q.id));
    const sIds = new Set(backup.studySessions.map((x) => x.id));
    setSubjects((prev) => prev.filter((s) => !subIds.has(s.id)));
    setTopics((prev) => prev.filter((t) => !subIds.has(t.subjectId)));
    setTopicBlocks((prev) => prev.filter((b) => !subIds.has(b.subjectId)));
    setExams((prev) => prev.filter((e) => e.semesterId !== sem.id));
    setSchedule((prev) => prev.filter((c) => c.semesterId !== sem.id));
    setQuestionLogs((prev) => prev.filter((q) => !qIds.has(q.id)));
    setStudySessions((prev) => prev.filter((x) => !sIds.has(x.id)));
    setSemesterResetBackupInfo({ semesterId: sem.id, semesterName: sem.name, at: backup.at });
    showNotification(`"${sem.name}" foi zerado. Os outros semestres não foram alterados. Você pode desfazer em até 7 dias no Perfil.`, 'success');
  };

  const undoSemesterReset = () => {
    const b = readBackup();
    if (!b) {
      setSemesterResetBackupInfo(null);
      return;
    }
    const merge = <T extends { id: string }>(prev: T[], add: T[]) => [...prev, ...add.filter((x) => !prev.some((p) => p.id === x.id))];
    setSubjects((prev) => merge(prev, b.subjects));
    setTopics((prev) => merge(prev, b.topics));
    setTopicBlocks((prev) => merge(prev, b.topicBlocks));
    setExams((prev) => merge(prev, b.exams));
    setSchedule((prev) => merge(prev, b.schedule));
    setQuestionLogs((prev) => merge(prev, b.questionLogs));
    setStudySessions((prev) => merge(prev, b.studySessions));
    try {
      localStorage.removeItem(backupKey());
    } catch {}
    setSemesterResetBackupInfo(null);
    showNotification(`↩ "${b.semesterName}" foi restaurado com todas as disciplinas, revisões, provas e questões.`, 'success');
  };

  const addSubject = (sub: Omit<Subject, 'id'>) => {
    const newSub: Subject = { ...sub, id: 'sub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) };
    setSubjects((prev) => [...prev, newSub]);
    showNotification(`Disciplina "${sub.name}" criada com sucesso!`, 'success');
    // XP is awarded by the calling modal
    return newSub.id;
  };

  const updateSubject = (id: string, sub: Partial<Subject>, opts?: { silent?: boolean }) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...sub } : s)));
    if (!opts?.silent) showNotification('Disciplina atualizada!', 'success');
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setTopicBlocks((prev) => prev.filter((b) => b.subjectId !== id));
    showNotification('Disciplina removida.', 'info');
  };

  const deleteSubjects = (ids: string[]) => {
    if (!ids.length) return;
    const set = new Set(ids);
    const snap = {
      subjects: subjects.filter((s) => set.has(s.id)),
      topicBlocks: topicBlocks.filter((b) => set.has(b.subjectId)),
      topics: topics.filter((t) => set.has(t.subjectId)),
    };
    setSubjects((prev) => prev.filter((s) => !set.has(s.id)));
    setTopicBlocks((prev) => prev.filter((b) => !set.has(b.subjectId)));
    setTopics((prev) => prev.filter((t) => !set.has(t.subjectId)));
    const msg =
      ids.length === 1 && snap.subjects[0]
        ? `"${snap.subjects[0].name}" foi excluída.`
        : `${ids.length} disciplina${ids.length > 1 ? 's' : ''} excluída${ids.length > 1 ? 's' : ''}, com os assuntos.`;
    offerUndo(snap, msg);
  };

  const addTopic = (top: Omit<Topic, 'id'>) => {
    const newTop: Topic = { ...top, id: 'top-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) };
    setTopics((prev) => [...prev, newTop]);
    showNotification(`Tópico "${top.title}" cadastrado!`, 'success');
    // XP is awarded by the caller
  };

  const updateTopic = (id: string, top: Partial<Topic>) => {
    const current = topics.find((t) => t.id === id);
    if (!current) return;
    // Status follows the study flow: "Visto" starts the review cycle, "Não iniciado" resets it,
    // "Em revisão"/"Dominado" only come from completing the spaced reviews.
    const { status, ...rest } = top;
    if (status === 'em_andamento' && current.status === 'nao_iniciado') {
      markTopicSeen(id);
    } else if (status === 'nao_iniciado' && current.status !== 'nao_iniciado') {
      resetTopicProgress(id);
    }
    if (Object.keys(rest).length > 0) {
      setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...rest } : t)));
      // Subtópicos, anotação e marcações pequenas salvam em silêncio (senão o aviso apareceria a cada toque)
      const quiet = Object.keys(rest).every((k) => ['details', 'note', 'bonus', 'pending'].includes(k));
      if (!status && !quiet) showNotification('Tópico atualizado!', 'success');
    }
  };

  const deleteTopic = (id: string) => {
    const t = topics.find((x) => x.id === id);
    const next = topics.filter((x) => x.id !== id);
    setTopics(next);
    if (!t) return showNotification('Tópico removido.', 'info');
    const blockBefore = t.blockId ? topicBlocks.find((b) => b.id === t.blockId) : undefined;
    offerUndo({ topics: [t], blocksBefore: blockBefore ? [blockBefore] : [] }, `Tópico "${t.title}" removido.`);
    syncBlockStatus(t.blockId, next);
  };

  // Ciclo: Visto (1º contato) → 4 revisões espaçadas → Dominado.
  // Cada revisão concluída conta; a dificuldade só ajusta o intervalo até a próxima.
  const REVIEW_BASE_INTERVALS = [1, 7, 15, 30]; // dias até a revisão nº (revisõesFeitas + 1)
  const DIFFICULTY_FACTOR = { dificil: 0.5, medio: 1, facil: 1.5 } as const;

  const addDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  };

  // Recalcula o bloco depois que os tópicos mudam: todos vistos → entra nas revisões (1ª amanhã);
  // se um tópico volta a "não iniciado" antes da 1ª revisão, o bloco volta para "Em estudo".
  const syncBlockStatus = (blockId: string | undefined, nextTopics: Topic[]) => {
    if (!blockId) return;
    const block = topicBlocks.find((bk) => bk.id === blockId);
    if (!block) return;
    // Aula bônus não conta para fechar o bloco
    const list = nextTopics.filter((t) => t.blockId === blockId && !t.bonus);
    const allSeen = list.length > 0 && list.every(isTopicResolved);
    if (block.reviewStatus === 'estudando' && allSeen) {
      const r1 = reviewDateIn(FIRST_REVIEW_DAY);
      setTopicBlocks((prev) =>
        prev.map((bk) =>
          bk.id === blockId
            ? {
                ...bk,
                reviewStatus: 'revisao',
                reviewsDone: 0,
                completedDate: ymd(new Date()),
                nextReviewDate: r1,
                difficulty: undefined,
              }
            : bk
        )
      );
      addXp(50, 'Bloco concluído');
      triggerConfetti();
      if (!focusedTodayOn(blockId)) setStudyTimePrompt({ kind: 'block', blockId, subjectId: block.subjectId, name: block.name });
      showNotification(`✅ "${block.name}" estudado hoje (Dia 0)! 1ª revisão: folha em branco ${r1 === addDaysYMD(1) ? 'amanhã' : 'em ' + formatDM(r1)} (24 h).`, 'success');
    } else if (block.reviewStatus === 'revisao' && block.reviewsDone === 0 && !allSeen) {
      setTopicBlocks((prev) =>
        prev.map((bk) => (bk.id === blockId ? { ...bk, reviewStatus: 'estudando', nextReviewDate: undefined, completedDate: undefined } : bk))
      );
    }
  };

  const markTopicSeen = (id: string) => {
    const t = topics.find((x) => x.id === id);
    if (!t || t.status !== 'nao_iniciado') return;
    const todayStr = ymd(new Date());
    const next = topics.map((x) =>
      x.id === id
        ? { ...x, status: 'em_andamento' as const, pending: false, firstContactDate: x.firstContactDate || todayStr, lastStudiedDate: todayStr, inSpacedRepetition: false, nextReviewDate: undefined }
        : x
    );
    setTopics(next);
    addXp(30, 'Primeiro Contato Registrado');
    syncBlockStatus(t.blockId, next);
  };

  const resetTopicProgress = (id: string) => {
    const t = topics.find((x) => x.id === id);
    if (!t) return;
    const next = topics.map((x) =>
      x.id === id
        ? { ...x, status: 'nao_iniciado' as const, pending: false, reviewsDone: 0, cycleStep: 0, nextReviewDate: undefined, lastStudiedDate: undefined }
        : x
    );
    setTopics(next);
    syncBlockStatus(t.blockId, next);
  };

  const addQuestionLog = (log: Omit<QuestionLog, 'id' | 'date' | 'semesterId'>) => {
    if (!log.total || log.total <= 0) return;
    const entry: QuestionLog = {
      ...log,
      correct: Math.max(0, Math.min(log.correct, log.total)),
      id: 'qlog-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      date: ymd(new Date()),
      semesterId: currentSemester?.id,
    };
    setQuestionLogs((prev) => [entry, ...prev]);
    addXp(Math.min(60, Math.round(log.total / 2)), 'Questões registradas');
    showNotification(`${entry.total} questões registradas (${Math.round((entry.correct / entry.total) * 100)}% de acertos).`, 'success');
  };

  const deleteQuestionLog = (id: string) => {
    setQuestionLogs((prev) => prev.filter((q) => q.id !== id));
  };

  const markTopicPending = (id: string) => {
    const t = topics.find((x) => x.id === id);
    if (!t) return;
    const next = topics.map((x) =>
      x.id === id ? { ...x, status: 'nao_iniciado' as const, pending: true, lastStudiedDate: undefined } : x
    );
    setTopics(next);
    showNotification(`"${t.title}" marcado para ver depois. Ele fica como pendência do bloco.`, 'info');
    syncBlockStatus(t.blockId, next);
  };

  const addTopicBlock = (subjectId: string, name: string) => {
    const id = 'blk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    setTopicBlocks((prev) => [
      ...prev,
      { id, subjectId, name: name.trim(), createdAt: new Date().toISOString(), reviewStatus: 'estudando', reviewsDone: 0 },
    ]);
    showNotification(`Bloco "${name.trim()}" criado.`, 'success');
    return id;
  };

  const addTopicsBulk = (tops: Omit<Topic, 'id'>[]) => {
    if (tops.length === 0) return;
    const stamp = Date.now();
    const created: Topic[] = tops.map((t, i) => ({ ...t, id: `top-${stamp}-${i}-${Math.random().toString(36).slice(2, 6)}` }));
    setTopics((prev) => [...prev, ...created]);
    showNotification(created.length === 1 ? `Tópico "${created[0].title}" adicionado!` : `${created.length} tópicos adicionados!`, 'success');
  };

  const importSharedSubject = (p: SharedSubject) => {
    const stamp = Date.now();
    let n = 0;
    const mkId = (pre: string) => `${pre}-${stamp}-${n++}-${Math.random().toString(36).slice(2, 6)}`;
    const subjectId = mkId('sub');
    const sub: Subject = {
      id: subjectId,
      semesterId: currentSemester?.id,
      name: p.s.name,
      code: p.s.code || '',
      color: p.s.color || '#0ea5e9',
      targetGrade: 7,
      ...(p.s.kind ? { kind: p.s.kind } : {}),
      ...(p.s.majorArea ? { majorArea: p.s.majorArea } : {}),
      ...(p.s.specialty ? { specialty: p.s.specialty } : {}),
      ...(p.s.universitySubject ? { universitySubject: p.s.universitySubject } : {}),
      ...(p.s.format ? { format: p.s.format } : {}),
      ...(p.s.organization ? { organization: p.s.organization } : {}),
      ...(p.s.checklistModules?.length ? { checklistModules: p.s.checklistModules } : {}),
      ...(p.s.tutorials?.length ? { tutorials: p.s.tutorials.map((name) => ({ id: mkId('tut'), name })) } : {}),
    };
    const now = new Date().toISOString();
    const newBlocks: TopicBlock[] = [];
    const newTopics: Topic[] = [];
    const mkTopic = (t: SharedSubject['t'][number], blockId?: string): Topic => ({
      id: mkId('top'),
      subjectId,
      title: t.n,
      status: 'nao_iniciado',
      priority: 'media',
      ...(blockId ? { blockId } : {}),
      ...(t.m ? { moduleName: t.m } : {}),
      ...(t.d?.length ? { details: sharedDetails(t.d, () => mkId('st')) } : {}),
    });
    p.b.forEach((b) => {
      const id = mkId('blk');
      newBlocks.push({ id, subjectId, name: b.n, createdAt: now, reviewStatus: 'estudando', reviewsDone: 0 });
      b.t.forEach((t) => newTopics.push(mkTopic(t, id)));
    });
    p.t.forEach((t) => newTopics.push(mkTopic(t)));
    setSubjects((prev) => [...prev, sub]);
    if (newBlocks.length) setTopicBlocks((prev) => [...prev, ...newBlocks]);
    if (newTopics.length) setTopics((prev) => [...prev, ...newTopics]);
    showNotification(`"${sub.name}" foi adicionada às suas disciplinas.`, 'success');
    return subjectId;
  };

  const sendModuleToReview = (subjectId: string, moduleName: string) => {
    const list = topics.filter((t) => t.subjectId === subjectId && (t.moduleName || '') === moduleName && !t.blockId);
    if (list.length === 0) return;
    const id = 'blk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const today = ymd(new Date());
    const r1 = reviewDateIn(FIRST_REVIEW_DAY);
    setTopicBlocks((prev) => [
      ...prev,
      {
        id,
        subjectId,
        name: moduleName,
        createdAt: new Date().toISOString(),
        reviewStatus: 'revisao',
        reviewsDone: 0,
        completedDate: today,
        nextReviewDate: r1,
      },
    ]);
    const ids = new Set(list.map((t) => t.id));
    setTopics((prev) => prev.map((t) => (ids.has(t.id) ? { ...t, blockId: id } : t)));
    addXp(50, 'Matéria enviada para as revisões');
    triggerConfetti();
    setStudyTimePrompt({ kind: 'block', blockId: id, subjectId, name: moduleName });
    showNotification(`🔁 "${moduleName}" entrou nas Revisões! 1ª revisão: folha em branco ${r1 === addDaysYMD(1) ? 'amanhã' : 'em ' + formatDM(r1)} (24 h).`, 'success');
  };

  const convertChecklistToBlocks = (subjectId: string) => {
    const sub = subjects.find((x) => x.id === subjectId);
    const loose = topics.filter((t) => t.subjectId === subjectId && !t.blockId);
    const names = Array.from(new Set([...(sub?.checklistModules || []), ...loose.map((t) => t.moduleName || 'Geral')]));
    const existing = topicBlocks.filter((b) => b.subjectId === subjectId);
    const stamp = Date.now();
    const newBlocks: TopicBlock[] = [];
    const idByName = new Map<string, string>();
    names.forEach((name, i) => {
      const found = existing.find((b) => b.name === name);
      if (found) {
        idByName.set(name, found.id);
        return;
      }
      const id = `blk-${stamp}-${i}-${Math.random().toString(36).slice(2, 6)}`;
      idByName.set(name, id);
      newBlocks.push({ id, subjectId, name, createdAt: new Date(stamp + i).toISOString(), reviewStatus: 'estudando', reviewsDone: 0 });
    });
    if (newBlocks.length) setTopicBlocks((prev) => [...prev, ...newBlocks]);
    setTopics((prev) =>
      prev.map((t) =>
        t.subjectId === subjectId && !t.blockId ? { ...t, moduleName: t.moduleName || 'Geral', blockId: idByName.get(t.moduleName || 'Geral') } : t
      )
    );
  };

  const renameTopicBlock = (id: string, name: string) => {
    if (!name.trim()) return;
    setTopicBlocks((prev) => prev.map((bk) => (bk.id === id ? { ...bk, name: name.trim() } : bk)));
  };

  // Reordenar (arrastar): só os itens citados trocam de lugar entre si, nas mesmas posições do array.
  // Ids, datas de revisão e progresso ficam intactos; o salvamento (local + nuvem) segue o fluxo normal.
  const reorderSlots = <T extends { id: string }>(prev: T[], orderedIds: string[]): T[] => {
    const byId = new Map(prev.map((x) => [x.id, x] as const));
    const queue = orderedIds.filter((id, i) => byId.has(id) && orderedIds.indexOf(id) === i).map((id) => byId.get(id) as T);
    if (queue.length < 2) return prev;
    const wanted = new Set(queue.map((x) => x.id));
    let i = 0;
    let changed = false;
    const next = prev.map((x) => {
      if (!wanted.has(x.id)) return x;
      const y = queue[i++];
      if (y !== x) changed = true;
      return y;
    });
    return changed ? next : prev;
  };
  const reorderTopics = (orderedIds: string[]) => setTopics((prev) => reorderSlots(prev, orderedIds));
  const reorderTopicBlocks = (orderedIds: string[]) => setTopicBlocks((prev) => reorderSlots(prev, orderedIds));

  const deleteTopicBlock = (id: string) => {
    setTopicBlocks((prev) => prev.filter((bk) => bk.id !== id));
    setTopics((prev) => prev.filter((t) => t.blockId !== id));
    showNotification('Bloco removido.', 'info');
  };

  /** Já houve foco (Pomodoro ligado a este bloco) hoje? Então o tempo já está registrado. */
  const focusedTodayOn = (blockId: string) =>
    studySessionsRef.current.some((s) => s.blockId === blockId && s.type === 'pomodoro' && sessionDate(s) === ymd(new Date()));

  const reviewTopicBlock: AppContextType['reviewTopicBlock'] = (id, difficulty, result) => {
    const block = topicBlocks.find((bk) => bk.id === id);
    if (!block || block.reviewStatus === 'estudando') return;
    const done = block.reviewsDone + 1;
    const todayStr = ymd(new Date());
    const prevState = { nextReviewDate: block.nextReviewDate, lastReviewDate: block.lastReviewDate, difficulty: block.difficulty };
    const clean = <T extends Record<string, number | undefined>>(o?: T) => {
      if (!o) return undefined;
      const out: Record<string, number> = {};
      Object.keys(o).forEach((k) => {
        const v = o[k];
        if (v && v > 0) out[k] = v;
      });
      return Object.keys(out).length ? (out as Partial<T>) : undefined;
    };
    const certainty = clean(result?.certainty);
    const errors = clean(result?.errors);
    // Tempo: se o aluno fez Pomodoro ligado a este bloco hoje, ele já conta (não pergunta de novo)
    const focusSessions = studySessionsRef.current.filter((s) => s.blockId === id && s.type === 'pomodoro' && sessionDate(s) === todayStr);
    const focusMinutes = focusSessions.reduce((a, s) => a + s.durationMinutes, 0);
    // Foco ligado a este bloco ainda rodando: o tempo entra quando ele terminar (não pergunta agora)
    const focusRunning = timer.isRunning && timer.mode === 'pomodoro' && !timer.cycle && timer.task?.blockId === id;
    const xp = done === BLOCK_REVIEWS_TO_MASTER ? 150 : difficulty === 'facil' ? 60 : difficulty === 'medio' ? 45 : 30;
    const entry = {
      stage: techniqueIdForReview(done),
      xp,
      date: todayStr,
      difficulty,
      ...(result?.questions ? { questions: result.questions } : {}),
      ...(result?.questions && result?.correct !== undefined ? { correct: result.correct } : {}),
      ...(certainty ? { certainty } : {}),
      ...(errors ? { errors } : {}),
      ...(focusMinutes > 0 ? { minutes: focusMinutes, sessionId: focusSessions[0].id } : {}),
      prev: prevState,
    };
    const log = [...(block.reviewLog || []), entry];
    const intervalDays = nextIntervalDays(difficulty, done, studyPrefs.longTermGoal);
    const nextDate = reviewDateIn(intervalDays);
    setTopicBlocks((prev) =>
      prev.map((bk) =>
        bk.id === id
          ? {
              ...bk,
              reviewStatus: 'revisao',
              reviewsDone: done,
              difficulty,
              lastReviewDate: todayStr,
              nextReviewDate: nextDate,
              reviewLog: log,
              // fez questões nesta revisão: o método deixa de cobrar
              needsQuestions: result?.questions ? undefined : bk.needsQuestions,
            }
          : bk
      )
    );
    if (focusMinutes === 0 && !focusRunning) setStudyTimePrompt({ kind: 'review', blockId: id, subjectId: block.subjectId, name: block.name, reviewNumber: done });
    if (focusRunning) setTimer((p) => (p.task ? { ...p, task: { ...p.task, reviewed: true } } : p));
    else if (timer.task?.blockId === id) setTimer((p) => ({ ...p, task: undefined }));
    const nextTech = reviewTechnique({ reviewsDone: done, difficulty, reviewLog: log });
    const when = nextDate === addDaysYMD(1) ? 'amanhã' : `em ${formatDM(nextDate)}`;
    if (done === BLOCK_REVIEWS_TO_MASTER) {
      addXp(xp, `R1–R4 concluídas`);
      triggerConfetti();
      showNotification(`🏆 R1–R4 de "${block.name}" concluídas! Tema consolidado: agora é manutenção (${nextTech.badge} ${when}).`, 'success');
      return;
    }
    addXp(xp, `Revisão R${done} do bloco`);
    showNotification(
      `R${done} de "${block.name}" registrada. Próxima: ${nextTech.badge} ${when}${difficulty === 'dificil' ? ' (intervalo encurtado)' : difficulty === 'facil' ? ' (intervalo alongado)' : ''}.`,
      'success'
    );
  };

  const updateTopicBlock = (id: string, changes: Partial<TopicBlock>) => {
    setTopicBlocks((prev) => prev.map((bk) => (bk.id === id ? { ...bk, ...changes } : bk)));
  };

  // Desfaz a última revisão do bloco (clique sem querer): volta datas, avaliação e questões registradas
  const undoBlockReview = (id: string) => {
    const block = topicBlocks.find((bk) => bk.id === id);
    const log = block?.reviewLog || [];
    if (!block || log.length === 0) return;
    const last = log[log.length - 1];
    const rest = log.slice(0, -1);
    const before = rest[rest.length - 1];
    const prev = last.prev || {
      // revisões antigas (sem registro do estado anterior): reconstrói pela revisão anterior
      difficulty: before?.difficulty,
      lastReviewDate: before?.date,
      nextReviewDate: before
        ? addDaysYMD(nextIntervalDays(before.difficulty, rest.length), before.date)
        : addDaysYMD(FIRST_REVIEW_DAY, block.completedDate || ymd(new Date())),
    };
    setTopicBlocks((p) =>
      p.map((bk) =>
        bk.id === id
          ? {
              ...bk,
              reviewStatus: 'revisao',
              reviewsDone: Math.max(0, bk.reviewsDone - 1),
              reviewLog: rest,
              difficulty: prev.difficulty,
              lastReviewDate: prev.lastReviewDate,
              nextReviewDate: prev.nextReviewDate,
            }
          : bk
      )
    );
    // remove só a sessão criada pelo "quanto tempo durou" (o Pomodoro feito de verdade continua contando)
    if (last.sessionId) setStudySessions((ss) => ss.filter((x) => !(x.id === last.sessionId && x.type !== 'pomodoro')));
    if (studyTimePrompt?.blockId === id && studyTimePrompt.kind === 'review') setStudyTimePrompt(null);
    // devolve o XP da revisão (e das questões registradas junto)
    const refund = (last.xp || 0) + (last.questions && last.correct !== undefined ? Math.min(60, Math.round(last.questions / 2)) : 0);
    if (refund > 0) addXp(-Math.min(refund, userProfileRef.current.totalXp), 'Revisão desfeita');
    // remove as questões que entraram junto com essa revisão
    if (last.questions && last.correct !== undefined) {
      setQuestionLogs((qs) => {
        const idx = [...qs]
          .map((q, i) => ({ q, i }))
          .reverse()
          .find(({ q }) => q.blockId === id && q.date === last.date && q.total === last.questions && q.correct === last.correct)?.i;
        return idx === undefined ? qs : qs.filter((_, i) => i !== idx);
      });
    }
    showNotification(`↩ R${log.length} de "${block.name}" desfeita. A revisão volta para ${prev.nextReviewDate ? prev.nextReviewDate.split('-').reverse().slice(0, 2).join('/') : 'a data anterior'}.`, 'info');
  };

  const restartBlockReviews = (id: string) => {
    const block = topicBlocks.find((bk) => bk.id === id);
    if (!block) return;
    const allSeen = topics.filter((t) => t.blockId === id).every(isTopicResolved) && topics.some((t) => t.blockId === id);
    setTopicBlocks((prev) =>
      prev.map((bk) =>
        bk.id === id
          ? {
              ...bk,
              reviewStatus: allSeen ? 'revisao' : 'estudando',
              reviewsDone: 0,
              difficulty: undefined,
              reviewLog: [],
              completedDate: allSeen ? ymd(new Date()) : undefined,
              nextReviewDate: allSeen ? reviewDateIn(FIRST_REVIEW_DAY) : undefined,
            }
          : bk
      )
    );
    showNotification(`Revisões de "${block.name}" recomeçadas.`, 'info');
  };

  const reviewTopicSpacedRepetition = (
    id: string,
    difficulty: 'dificil' | 'medio' | 'facil' | 'dominado'
  ) => {
    const t = topics.find((x) => x.id === id);
    if (!t) return;

    // Ainda não teve o 1º contato: avaliar = marcar como visto
    if (t.status === 'nao_iniciado') {
      markTopicSeen(id);
      return;
    }
    if (t.status === 'dominado') return;

    const level = difficulty === 'dominado' ? 'facil' : difficulty;
    const done = Math.min(REVIEWS_TO_MASTER, getReviewsDone(t) + 1);
    const todayStr = new Date().toISOString().split('T')[0];

    if (done >= REVIEWS_TO_MASTER) {
      setTopics((prev) =>
        prev.map((x) =>
          x.id === id
            ? { ...x, status: 'dominado', reviewsDone: REVIEWS_TO_MASTER, cycleStep: REVIEWS_TO_MASTER, difficulty: level, lastStudiedDate: todayStr, nextReviewDate: undefined }
            : x
        )
      );
      addXp(120, 'Assunto Dominado (4 revisões)');
      triggerConfetti();
      showNotification(`🏆 4ª revisão concluída! "${t.title}" agora está dominado.`, 'success');
      return;
    }

    const intervalDays = Math.max(1, Math.round(REVIEW_BASE_INTERVALS[done] * DIFFICULTY_FACTOR[level]));
    setTopics((prev) =>
      prev.map((x) =>
        x.id === id
          ? {
              ...x,
              status: 'revisado',
              reviewsDone: done,
              cycleStep: done + 1,
              difficulty: level,
              intervalDays,
              lastStudiedDate: todayStr,
              nextReviewDate: addDays(intervalDays),
              inSpacedRepetition: true,
            }
          : x
      )
    );
    addXp(level === 'facil' ? 60 : level === 'medio' ? 40 : 25, `Revisão ${done}/${REVIEWS_TO_MASTER}`);
    showNotification(`Revisão ${done}/${REVIEWS_TO_MASTER} registrada. Próxima em ${intervalDays} dia${intervalDays > 1 ? 's' : ''}.`, 'success');
  };

  const addExam = (ex: Omit<Exam, 'id'>) => {
    const newEx: Exam = { ...ex, id: 'exam-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) };
    setExams((prev) => [...prev, newEx]);
    showNotification(`Prova "${ex.title}" adicionada no Semestre!`, 'success');
    // XP is awarded by the calling modal
  };

  const updateExam = (id: string, ex: Partial<Exam>) => {
    const before = exams.find((e) => e.id === id);
    setExams((prev) => prev.map((e) => (e.id === id ? { ...e, ...ex } : e)));
    if (ex.grade !== undefined && before?.grade === undefined) {
      showNotification('Nota lançada!', 'success');
      addXp(150, 'Nota Registrada');
    }
  };

  const deleteExam = (id: string) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
    showNotification('Prova removida de Avaliações.', 'info');
  };

  const addScheduleClass = (sc: Omit<ScheduleClass, 'id'>) => {
    const newSc: ScheduleClass = {
      ...sc,
      semesterId: sc.semesterId || currentSemester?.id,
      id: 'sch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    };
    setSchedule((prev) => [...prev, newSc]);
    showNotification(sc.date ? 'Atividade adicionada ao Planner!' : 'Atividade adicionada à grade de horários!', 'success');
  };

  const updateScheduleClass = (id: string, sc: Partial<ScheduleClass>) => {
    setSchedule((prev) => prev.map((s) => (s.id === id ? { ...s, ...sc } : s)));
    if (Object.keys(sc).some((k) => k !== 'isCompleted')) showNotification('Atividade atualizada!', 'success');
  };

  const deleteScheduleClass = (id: string) => {
    setSchedule((prev) => prev.filter((s) => s.id !== id));
    showNotification('Atividade removida.', 'info');
  };

  const addScheduleClasses: AppContextType['addScheduleClasses'] = (list, rotation) => {
    const rotationId = 'rot-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    const stamp = Date.now();
    const created: ScheduleClass[] = list.map((sc, i) => ({
      ...sc,
      semesterId: sc.semesterId || currentSemester?.id,
      rotationId: sc.rotationId || rotationId,
      rotationName: sc.rotationName || rotation?.name?.trim() || undefined,
      id: `sch-${stamp}-${i}-${Math.random().toString(36).slice(2, 6)}`,
    }));
    setSchedule((prev) => [...prev, ...created]);
    showNotification(`${created.length} atividade${created.length > 1 ? 's' : ''} adicionada${created.length > 1 ? 's' : ''} de uma vez.`, 'success');
    return rotationId;
  };

  const excludeScheduleOnDate = (id: string, date: string) => {
    setSchedule((prev) => prev.map((s) => (s.id === id ? { ...s, exceptions: Array.from(new Set([...(s.exceptions || []), date])) } : s)));
    showNotification('Removida só deste dia. Nas outras semanas continua normal.', 'info');
  };

  const replaceScheduleOnDate: AppContextType['replaceScheduleOnDate'] = (id, date, replacement) => {
    setSchedule((prev) => [
      ...prev.map((s) => (s.id === id ? { ...s, exceptions: Array.from(new Set([...(s.exceptions || []), date])) } : s)),
      {
        ...replacement,
        date,
        endDate: undefined,
        semesterId: replacement.semesterId || currentSemester?.id,
        id: 'sch-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      },
    ]);
    showNotification('Atividade substituída neste dia.', 'success');
  };

  const deleteRotation = (rotationId: string) => {
    setSchedule((prev) => prev.filter((s) => s.rotationId !== rotationId));
    showNotification('Rodízio removido.', 'info');
  };

  const toggleExamTopicTask = (examId: string, topicId: string, task: ExamTaskKind) =>
    setExams((prev) =>
      prev.map((e) =>
        e.id === examId
          ? { ...e, examTopics: (e.examTopics || []).map((t) => (t.id === topicId ? { ...t, done: { ...(t.done || {}), [task]: !t.done?.[task] } } : t)) }
          : e
      )
    );

  const setDashboardPrefs = (prefs: DashboardPrefs | null) => patchMethod((s) => ({ ...s, dashboard: prefs || undefined }));
  const setMobileTabs = (tabs: string[] | null) => patchMethod((s) => ({ ...s, mobileTabs: tabs && tabs.length ? tabs.slice(0, 4) : undefined }));
  const setSidebarPrefs = (prefs: SidebarPrefs | null) => patchMethod((s) => ({ ...s, sidebar: prefs || undefined }));

  const newMiscId = (p: string) => p + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
  const addContest: AppContextType['addContest'] = (c) => {
    const id = newMiscId('cx');
    patchMethod((s) => ({ ...s, contests: [...(s.contests || []), { ...c, id, createdAt: new Date().toISOString() }] }));
    showNotification('Prova de concurso salva.', 'success');
    return id;
  };
  const updateContest = (id: string, changes: Partial<ContestExam>) =>
    patchMethod((s) => ({ ...s, contests: (s.contests || []).map((c) => (c.id === id ? { ...c, ...changes } : c)) }));
  const deleteContest = (id: string) =>
    patchMethod((s) => ({ ...s, contests: (s.contests || []).filter((c) => c.id !== id), deleted: { ...(s.deleted || {}), [id]: ymd(new Date()) } }));
  const addPastExam: AppContextType['addPastExam'] = (p) => {
    const id = newMiscId('px');
    patchMethod((s) => ({ ...s, pastExams: [...(s.pastExams || []), { ...p, id, createdAt: new Date().toISOString() }] }));
    showNotification('Prova anterior salva.', 'success');
    return id;
  };
  const updatePastExam = (id: string, changes: Partial<PastExam>) =>
    patchMethod((s) => ({ ...s, pastExams: (s.pastExams || []).map((c) => (c.id === id ? { ...c, ...changes } : c)) }));
  const deletePastExam = (id: string) =>
    patchMethod((s) => ({ ...s, pastExams: (s.pastExams || []).filter((c) => c.id !== id), deleted: { ...(s.deleted || {}), [id]: ymd(new Date()) } }));

  const toggleMedRevisionComplete = (id: string) => {
    const current = medRevisions.find((mr) => mr.id === id);
    if (!current) return;
    const nextState = !current.isCompleted;
    if (nextState) {
      addXp(150, 'Tópico de Residência Concluído');
      triggerConfetti();
    }
    setMedRevisions((prev) => prev.map((mr) => (mr.id === id ? { ...mr, isCompleted: nextState } : mr)));
  };

  const addMedRevision = (mr: Omit<MedRevisionTopic, 'id'>) => {
    const newMr: MedRevisionTopic = { ...mr, id: 'mr-' + Date.now() };
    setMedRevisions((prev) => [...prev, newMr]);
    showNotification('Tema de MedRevision adicionado!', 'success');
  };

  const newChecklistItem = (text: string, blockId?: string, extra?: Partial<ChecklistItem>): ChecklistItem => ({
    id: 'chk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    text: text.trim(),
    done: false,
    createdAt: new Date().toISOString(),
    ...(blockId ? { blockId } : {}),
    ...extra,
  });

  const addChecklistItem = (text: string, blockId?: string, extra?: Partial<Pick<ChecklistItem, 'important' | 'dueDate'>>) => {
    if (!text.trim()) return;
    setChecklist((prev) => [newChecklistItem(text, blockId, extra), ...prev]);
  };

  const updateChecklistItem = (id: string, changes: Partial<ChecklistItem>) => {
    setChecklist((prev) => prev.map((item) => (item.id === id ? { ...item, ...changes } : item)));
  };

  const addChecklistBlock = (block: Pick<ChecklistBlock, 'name' | 'color' | 'emoji'>, items: string[] = []) => {
    const id = 'blk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
    setChecklistBlocks((prev) => [...prev, { ...block, name: block.name.trim(), id, createdAt: new Date().toISOString() }]);
    const seeded = items.filter((t) => t.trim()).map((t) => newChecklistItem(t, id));
    if (seeded.length > 0) setChecklist((prev) => [...seeded, ...prev]);
    return id;
  };

  const updateChecklistBlock = (id: string, changes: Partial<ChecklistBlock>) => {
    setChecklistBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, ...changes } : b)));
  };

  const deleteChecklistBlock = (id: string) => {
    const block = checklistBlocks.find((b) => b.id === id);
    const items = checklist.filter((item) => item.blockId === id);
    setChecklistBlocks((prev) => prev.filter((b) => b.id !== id));
    setChecklist((prev) => prev.filter((item) => item.blockId !== id));
    if (!block) return showNotification('Bloco removido do checklist.', 'info');
    offerUndo({ checklistBlocks: [block], checklist: items }, `Bloco "${block.name}" removido do checklist.`);
  };

  const importSharedChecklist = (p: SharedChecklist) => {
    const stamp = Date.now();
    let n = 0;
    const mkId = (pre: string) => `${pre}-${stamp}-${n++}-${Math.random().toString(36).slice(2, 6)}`;
    const id = mkId('blk');
    const now = new Date().toISOString();
    const block: ChecklistBlock = {
      id,
      name: p.c.name,
      color: p.c.color || '#0ea5e9',
      ...(p.c.emoji ? { emoji: p.c.emoji } : {}),
      createdAt: now,
    };
    // createdAt decrescente: a lista aparece na mesma ordem em que foi enviada
    const items: ChecklistItem[] = p.i.map((it, i) => {
      const details = sharedDetails(it.d, () => mkId('st'));
      return {
        id: mkId('chk'),
        text: it.x,
        done: false,
        createdAt: new Date(stamp - i).toISOString(),
        blockId: id,
        ...(details ? { details } : {}),
      };
    });
    setChecklistBlocks((prev) => [...prev, block]);
    if (items.length) setChecklist((prev) => [...items, ...prev]);
    showNotification(`"${block.name}" foi adicionado ao seu Checklist.`, 'success');
    return id;
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done, doneAt: !item.done ? new Date().toISOString() : undefined } : item
      )
    );
  };

  const deleteChecklistItem = (id: string, opts?: { undo?: boolean }) => {
    const removed = checklist.find((item) => item.id === id);
    setChecklist((prev) => prev.filter((item) => item.id !== id));
    if (opts?.undo && removed) {
      showNotification(`"${removed.text}" foi excluído.`, 'info', {
        actionLabel: 'Desfazer',
        onAction: () => setChecklist((prev) => (prev.some((i) => i.id === removed.id) ? prev : [...prev, removed])),
      });
    }
  };

  // Sem blockId limpa tudo; "geral" = itens sem bloco existente
  const clearCompletedChecklist = (blockId?: string) => {
    setChecklist((prev) =>
      prev.filter((item) => {
        if (!item.done) return true;
        if (!blockId) return false;
        const owner = item.blockId && checklistBlocks.some((b) => b.id === item.blockId) ? item.blockId : 'geral';
        return owner !== blockId;
      })
    );
  };

  const deleteMedRevision = (id: string) => {
    setMedRevisions((prev) => prev.filter((mr) => mr.id !== id));
    showNotification('Tema removido do MedRevision.', 'info');
  };

  // Faculdade: perfis antigos (texto livre) passam para a lista do e-MEC e mostram só a sigla;
  // sem correspondência exata ficam como "Outra" (o texto digitado, em maiúsculas)
  useEffect(() => {
    if (!activeUserId || !isInitialLoadComplete) return;
    const u = userProfile.university;
    if (!u) return;
    if (userProfile.universityCode) {
      const s = schoolByCode(userProfile.universityCode);
      if (s && u !== s.sigla.toUpperCase()) setUserProfile((p) => ({ ...p, university: s.sigla.toUpperCase(), universityName: s.name }));
      return;
    }
    if (userProfile.universityName !== undefined) {
      if (u !== u.toUpperCase()) setUserProfile((p) => ({ ...p, university: u.toUpperCase() }));
      return;
    }
    const m = matchSchool(u);
    if (m) {
      setUserProfile((p) => ({ ...p, university: m.sigla.toUpperCase(), universityCode: m.code, universityName: m.name }));
      if (activeUserId) updateAccount(activeUserId, { university: m.sigla.toUpperCase() });
    } else if (u !== u.toUpperCase()) {
      setUserProfile((p) => ({ ...p, university: u.toUpperCase() }));
    }
  }, [userProfile.university, userProfile.universityCode, userProfile.universityName, activeUserId, isInitialLoadComplete]);

  // Avatares da versão anterior passam para o novo modelo de avatares
  useEffect(() => {
    if (!activeUserId || !isInitialLoadComplete) return;
    const next = upgradeAvatarUrl(userProfile.avatarUrl);
    if (next && next !== userProfile.avatarUrl) updateUserProfile({ avatarUrl: next });
  }, [userProfile.avatarUrl, activeUserId, isInitialLoadComplete]);

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...profile }));
    // Kept out of the updater: updating AuthProvider state while AppProvider renders is not allowed
    if (activeUserId) {
      const updated = { ...userProfileRef.current, ...profile };
      updateAccount(activeUserId, {
        name: updated.name,
        email: updated.email,
        university: updated.university,
        dreamSpecialty: updated.dreamSpecialty,
        avatarUrl: updated.avatarUrl,
        onboardingCompleted: updated.onboardingCompleted,
      });
    }
    showNotification('Perfil atualizado com sucesso!', 'success');
  };

  // Fotos de perfil antigas salvas em tamanho original: reduz para não pesar no armazenamento/sincronização
  useEffect(() => {
    const url = userProfile.avatarUrl;
    if (!activeUserId || !isInitialLoadComplete || !url || !url.startsWith('data:') || url.length <= AVATAR_MAX_DATAURL) return;
    let cancelled = false;
    shrinkAvatarDataUrl(url)
      .then((small) => {
        if (!cancelled && small.length < url.length) setUserProfile((prev) => (prev.avatarUrl === url ? { ...prev, avatarUrl: small } : prev));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [userProfile.avatarUrl, activeUserId, isInitialLoadComplete]);

  const toggleDarkMode = () => {
    const root = document.documentElement;
    root.classList.add('theme-anim');
    window.setTimeout(() => root.classList.remove('theme-anim'), 450);
    setThemeMode((m) => (m === 'dark' ? 'light' : 'dark'));
  };

  // Clear everything completely (Wipe / Zerar tudo do site)
  const clearAllData = () => {
    const blankSemester: Semester = {
      id: 'sem-1',
      name: '1º Semestre',
      code: 'SEM1',
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 180 * 86400000).toISOString().split('T')[0],
      isCurrent: true,
      targetHoursWeekly: 30,
      description: 'Semestre inicial.',
    };

    setSemesters([blankSemester]);
    setSubjects([]);
    setTopicBlocks([]);
    setQuestionLogs([]);
    setStudyMethod(EMPTY_STUDY_METHOD);
    setTopics([]);
    setExams([]);
    setSchedule([]);
    setStudySessions([]);
    setAchievements((prev) =>
      prev.map((a) => ({
        ...a,
        progress: 0,
        current: 0,
        unlockedAt: undefined,
      }))
    );
    setMedRevisions((prev) =>
      prev.map((mr) => ({
        ...mr,
        isCompleted: false,
      }))
    );
    setUserProfile({
      name: userProfile.name || 'Estudante de Medicina',
      email: userProfile.email || 'usuario@medacademic.com',
      university: userProfile.university || 'Faculdade de Medicina',
      currentSemesterId: 'sem-1',
      weeklyTargetHours: 30,
      targetAverageGrade: 8.0,
      dreamSpecialty: userProfile.dreamSpecialty || '',
      avatarUrl: userProfile.avatarUrl,
      totalXp: 0,
      level: 1,
      currentStreakDays: 0,
      bestStreakDays: 0,
      lastStudyDate: new Date().toISOString().split('T')[0],
      darkMode: userProfile.darkMode,
      soundEnabled: true,
      onboardingCompleted: true,
    });
    setTimer({
      isRunning: false,
      mode: 'pomodoro',
      timeLeftSeconds: 25 * 60,
      elapsedSeconds: 0,
      totalPomodorosCompleted: 0,
    });

    // Clear and re-seed LocalStorage with clean blank state for active user
    if (activeUserId) {
      localStorage.setItem(getUserKey('semesters', activeUserId), JSON.stringify([blankSemester]));
      localStorage.setItem(getUserKey('subjects', activeUserId), JSON.stringify([]));
      localStorage.setItem(getUserKey('topics', activeUserId), JSON.stringify([]));
      localStorage.setItem(getUserKey('exams', activeUserId), JSON.stringify([]));
      localStorage.setItem(getUserKey('schedule', activeUserId), JSON.stringify([]));
      localStorage.setItem(getUserKey('study_sessions', activeUserId), JSON.stringify([]));
    }

    showNotification('O site foi completamente zerado! Dados limpos com sucesso.', 'warning');
  };

  // Reset to Clean Initial State
  const resetAllData = () => {
    setSemesters(INITIAL_SEMESTERS);
    setSubjects([]);
    setTopics([]);
    setTopicBlocks([]);
    setQuestionLogs([]);
    setStudyMethod(EMPTY_STUDY_METHOD);
    setExams([]);
    setSchedule([]);
    setAchievements(INITIAL_ACHIEVEMENTS);
    setMedRevisions([]);
    setUserProfile(INITIAL_USER_PROFILE);
    setStudySessions([]);
    setTimer({
      isRunning: false,
      mode: 'pomodoro',
      timeLeftSeconds: 25 * 60,
      elapsedSeconds: 0,
      selectedSubjectId: '',
      totalPomodorosCompleted: 0,
    });

    if (activeUserId) {
      localStorage.removeItem(getUserKey('semesters', activeUserId));
      localStorage.removeItem(getUserKey('subjects', activeUserId));
      localStorage.removeItem(getUserKey('topics', activeUserId));
      localStorage.removeItem(getUserKey('exams', activeUserId));
      localStorage.removeItem(getUserKey('schedule', activeUserId));
      localStorage.removeItem(getUserKey('achievements', activeUserId));
      localStorage.removeItem(getUserKey('med_revisions', activeUserId));
      localStorage.removeItem(getUserKey('study_sessions', activeUserId));
      localStorage.removeItem(getUserKey('user_profile', activeUserId));
    }

    showNotification('Workspace redefinido para estado inicial limpo com sucesso!', 'success');
  };

  // Timer controls
  // Chamado no clique "Iniciar": libera o áudio, bipa e pede permissão de notificação
  const announceStart = () => {
    unlockTimerAudio();
    playTimerBeep('start');
    requestTimerNotifications();
  };

  const startTimer = () => {
    const now = Date.now();
    setTimer((prev) =>
      prev.mode === 'stopwatch'
        ? { ...prev, isRunning: true, startedAt: now, elapsedBase: prev.elapsedSeconds }
        : {
            ...prev,
            isRunning: true,
            endsAt: now + prev.timeLeftSeconds * 1000,
            // Novo foco depois de uma tarefa concluída: a tarefa antiga sai (senão o tempo iria para ela)
            task: prev.mode === 'pomodoro' && prev.task?.finished ? undefined : prev.task,
          }
    );
    announceStart();
  };

  const pauseTimer = () => {
    const now = Date.now();
    setTimer((prev) => {
      if (prev.mode === 'stopwatch') {
        const elapsed = prev.startedAt
          ? (prev.elapsedBase ?? prev.elapsedSeconds) + Math.floor((now - prev.startedAt) / 1000)
          : prev.elapsedSeconds;
        return { ...prev, isRunning: false, elapsedSeconds: elapsed, startedAt: undefined, elapsedBase: undefined };
      }
      const left = prev.endsAt ? Math.max(1, remainingSeconds(prev.endsAt)) : prev.timeLeftSeconds;
      return { ...prev, isRunning: false, timeLeftSeconds: left, endsAt: undefined };
    });
  };

  const resetTimer = () => {
    setTimer((prev) => {
      let defaultSeconds = prev.customDurationSeconds || (pomodoroSettings.workMinutes * 60);
      if (!prev.customDurationSeconds) {
        if (prev.mode === 'pomodoro') defaultSeconds = pomodoroSettings.workMinutes * 60;
        if (prev.mode === 'short_break') defaultSeconds = pomodoroSettings.shortBreakMinutes * 60;
        if (prev.mode === 'medium_break') defaultSeconds = pomodoroSettings.mediumBreakMinutes * 60;
        if (prev.mode === 'long_break') defaultSeconds = pomodoroSettings.longBreakMinutes * 60;
      }
      return {
        ...prev,
        isRunning: false,
        timeLeftSeconds: defaultSeconds,
        elapsedSeconds: 0,
        endsAt: undefined,
        startedAt: undefined,
        elapsedBase: undefined,
      };
    });
  };

  const setTimerMode = (mode: TimerState['mode'], subjectId?: string, topicId?: string, customSeconds?: number) => {
    let seconds = customSeconds;
    if (!seconds) {
      if (mode === 'pomodoro') seconds = pomodoroSettings.workMinutes * 60;
      else if (mode === 'short_break') seconds = pomodoroSettings.shortBreakMinutes * 60;
      else if (mode === 'medium_break') seconds = pomodoroSettings.mediumBreakMinutes * 60;
      else if (mode === 'long_break') seconds = pomodoroSettings.longBreakMinutes * 60;
      else seconds = 25 * 60;
    }
    
    setTimer((prev) => ({
      ...prev,
      mode,
      isRunning: false,
      timeLeftSeconds: seconds!,
      elapsedSeconds: 0,
      customDurationSeconds: customSeconds,
      selectedSubjectId: subjectId || prev.selectedSubjectId,
      selectedTopicId: topicId || prev.selectedTopicId,
      task: undefined, // escolher o modo à mão desliga a tarefa do plano
      cycle: undefined, // choosing a mode manually leaves any running study cycle
      endsAt: undefined,
      startedAt: undefined,
      elapsedBase: undefined,
    }));
  };

  // Starts a study cycle at the given step: the study block begins immediately
  const startStudyCycle = (steps: StudyCycleStep[], startIndex = 0, subjectId?: string) => {
    if (steps.length === 0) return;
    const index = Math.min(Math.max(startIndex, 0), steps.length - 1);
    const seconds = steps[index].workMins * 60;
    setTimer((prev) => ({
      ...prev,
      mode: 'pomodoro',
      isRunning: true,
      timeLeftSeconds: seconds,
      endsAt: Date.now() + seconds * 1000,
      customDurationSeconds: seconds,
      elapsedSeconds: 0,
      selectedSubjectId: subjectId ?? prev.selectedSubjectId,
      cycle: { steps, index, phase: 'work' },
      task: undefined, // o ciclo não herda a tarefa do plano
    }));
    announceStart();
    showNotification(`Ciclo iniciado: ${steps[index].title} (${steps[index].workMins} min)`, 'info');
  };

  const skipCycleStep = () => {
    if (!timer.cycle) return;
    const { steps, index, phase } = timer.cycle;
    const step = steps[index];
    const isLast = index === steps.length - 1;
    const left = timer.isRunning && timer.endsAt ? remainingSeconds(timer.endsAt) : timer.timeLeftSeconds;
    if (phase === 'work') {
      // Conta só o tempo que foi estudado de verdade
      const studiedMin = Math.floor(Math.max(0, step.workMins * 60 - left) / 60);
      if (studiedMin >= 1) {
        logStudySession({
          subjectId: timer.selectedSubjectId,
          topicId: timer.selectedTopicId,
          durationMinutes: studiedMin,
          type: 'pomodoro',
          xpEarned: 0,
          notes: `Ciclo de Estudos • ${step.title} (etapa pulada)`,
          blockId: timer.task?.blockId,
          projectId: timer.task?.projectId,
          activity: timer.task?.kind,
        });
      }
      if (isLast) {
        showNotification('Ciclo encerrado na última etapa.', 'info');
        setTimer((prev) => ({ ...prev, mode: 'pomodoro', isRunning: false, endsAt: undefined, timeLeftSeconds: pomodoroSettings.workMinutes * 60, customDurationSeconds: undefined, cycle: undefined }));
      } else if (step.breakMins > 0) {
        const breakEndsAt = Date.now() + step.breakMins * 60 * 1000;
        showNotification(`Etapa pulada. Pausa de ${step.breakMins} min iniciada.`, 'info');
        setTimer((prev) => ({
          ...prev,
          mode: 'short_break',
          isRunning: true,
          endsAt: breakEndsAt,
          timeLeftSeconds: step.breakMins * 60,
          customDurationSeconds: step.breakMins * 60,
          cycle: { steps, index, phase: 'break' },
        }));
      } else {
        const next = steps[index + 1];
        showNotification(`Etapa pulada. Próxima: ${next.title}.`, 'info');
        setTimer((prev) => ({ ...prev, mode: 'pomodoro', isRunning: false, endsAt: undefined, timeLeftSeconds: next.workMins * 60, customDurationSeconds: next.workMins * 60, cycle: { steps, index: index + 1, phase: 'work' } }));
      }
    } else {
      const next = steps[index + 1];
      if (!next) return;
      showNotification(`Pausa pulada. Quando estiver pronto, inicie: ${next.title}.`, 'info');
      setTimer((prev) => ({ ...prev, mode: 'pomodoro', isRunning: false, endsAt: undefined, timeLeftSeconds: next.workMins * 60, customDurationSeconds: next.workMins * 60, cycle: { steps, index: index + 1, phase: 'work' } }));
    }
  };

  const stopStudyCycle = () => {
    setTimer((prev) => ({
      ...prev,
      mode: 'pomodoro',
      isRunning: false,
      timeLeftSeconds: pomodoroSettings.workMinutes * 60,
      customDurationSeconds: undefined,
      elapsedSeconds: 0,
      cycle: undefined,
      endsAt: undefined,
    }));
    showNotification('Ciclo de estudos encerrado.', 'info');
  };

  const setTimerSubject = (subjectId: string, topicId?: string) => {
    setTimer((prev) => ({
      ...prev,
      selectedSubjectId: subjectId,
      selectedTopicId: topicId,
    }));
  };

  // ============================================================================================
  // Método de estudo (Guia Científico): plano do dia, caderno de erros, estudos pessoais
  // Nada aqui dá XP (marcar/desmarcar não pode virar fonte de pontos).
  // ============================================================================================
  const patchMethod = (fn: (s: StudyMethodState) => StudyMethodState) => setStudyMethod((prev) => pruneStudyMethod(fn(prev)));

  const updateStudyPrefs = (changes: Partial<StudyPlanPrefs> | null) => {
    patchMethod((s) => ({ ...s, prefs: changes === null ? undefined : { ...(s.prefs || {}), ...changes } }));
    showNotification(changes === null ? 'Rotina voltou aos padrões da sua fase.' : 'Rotina atualizada.', 'success');
  };

  const setDayPlanState = (date: string, updater: (s: DayPlanState) => DayPlanState) =>
    patchMethod((s) => ({ ...s, dayPlans: { ...s.dayPlans, [date]: updater(s.dayPlans[date] || {}) } }));

  const toggleIn = (list: string[] | undefined, id: string) => (list || []).includes(id) ? (list || []).filter((x) => x !== id) : [...(list || []), id];

  const toggleTaskDone = (date: string, taskId: string) => {
    // Passo de um assunto da prova: marcar no plano marca no check list da prova (e o próximo passo aparece)
    if (taskId.startsWith('etopic:')) {
      const [, examId, topicId, task] = taskId.split(':');
      toggleExamTopicTask(examId, topicId, task as ExamTaskKind);
      return;
    }
    setDayPlanState(date, (d) => ({ ...d, done: toggleIn(d.done, taskId) }));
  };
  const skipTask = (date: string, taskId: string, skip = true) =>
    setDayPlanState(date, (d) => ({ ...d, skipped: skip ? Array.from(new Set([...(d.skipped || []), taskId])) : (d.skipped || []).filter((x) => x !== taskId) }));
  const addCustomTask = (date: string, title: string, pomodoros = 1) => {
    if (!title.trim()) return;
    const id = 'ct-' + Date.now() + '-' + Math.random().toString(36).slice(2, 5);
    setDayPlanState(date, (d) => ({ ...d, custom: [...(d.custom || []), { id, title: title.trim(), pomodoros: Math.max(0, Math.min(8, pomodoros)) }] }));
  };
  const removeCustomTask = (date: string, customId: string) => setDayPlanState(date, (d) => ({ ...d, custom: (d.custom || []).filter((c) => c.id !== customId) }));
  const setLowEnergy = (date: string, on: boolean) => setDayPlanState(date, (d) => ({ ...d, lowEnergy: on || undefined }));
  const setDayShift = (date: string, shift?: 'plantao' | 'pos_plantao' | 'normal') => setDayPlanState(date, (d) => ({ ...d, shift }));

  /** Passa uma tarefa do plano de um dia para outro (revisão, tema novo, tarefa sua...) */
  const moveTaskToDate = (task: PlanTask, from: string, to: string) => {
    if (!to || to === from) return;
    const today = ymd(new Date());
    if (task.movable === 'review' && task.blockId) updateTopicBlock(task.blockId, { nextReviewDate: to });
    else if (task.movable === 'new_block' && task.blockId) updateTopicBlock(task.blockId, { plannedDate: to });
    else if (task.movable === 'new_topics' && task.topicIds?.length) {
      const ids = new Set(task.topicIds);
      setTopics((prev) => prev.map((t) => (ids.has(t.id) ? { ...t, firstContactDate: to, scheduleFirstContact: true } : t)));
    } else if (task.movable === 'project_review' && task.projectId && task.itemId) updateProjectItem(task.projectId, task.itemId, { nextReviewDate: to });
    else if (task.movable === 'custom' && task.customId) {
      const c = (studyMethod.dayPlans[from]?.custom || []).find((x) => x.id === task.customId);
      if (c)
        patchMethod((s) => ({
          ...s,
          dayPlans: {
            ...s.dayPlans,
            [from]: { ...(s.dayPlans[from] || {}), custom: (s.dayPlans[from]?.custom || []).filter((x) => x.id !== c.id) },
            [to]: { ...(s.dayPlans[to] || {}), custom: [...(s.dayPlans[to]?.custom || []), { ...c, done: false }] },
          },
        }));
    } else {
      skipTask(from, task.id);
      return;
    }
    const label = to === today ? 'hoje' : to === addDaysYMD(1, today) ? 'amanhã' : formatDM(to);
    showNotification(`"${task.title}" foi para ${label}.`, 'info');
  };

  const moveTaskToTomorrow = (task: PlanTask) => {
    const today = ymd(new Date());
    // "Amanhã" pula o dia de descanso
    moveTaskToDate(task, today, reviewDateIn(1, today));
  };

  const replanOverdueReviews = () => {
    const today = ymd(new Date());
    // Espaço de revisão por dia = capacidade do dia menos o bloco dos flashcards
    const perDay = Math.max(2, studyPrefs.dailyPomodoros - (studyPrefs.usesFlashcards ? 1 : 0));
    const { blocks: map, items } = spreadOverdueReviews(topicBlocks, subjects, today, perDay, restDaysOf(studyPrefs), studyMethod.projects);
    const n = Object.keys(map).length + Object.keys(items).length;
    if (n === 0) {
      showNotification('As revisões de hoje já cabem no seu dia. Nada precisou mudar de data.', 'info');
      return 0;
    }
    if (Object.keys(map).length) setTopicBlocks((prev) => prev.map((b) => (map[b.id] ? { ...b, nextReviewDate: map[b.id] } : b)));
    if (Object.keys(items).length)
      patchMethod((st) => ({
        ...st,
        projects: st.projects.map((p) => ({
          ...p,
          items: p.items.map((it) => (items[`${p.id}:${it.id}`] ? { ...it, nextReviewDate: items[`${p.id}:${it.id}`] } : it)),
        })),
      }));
    showNotification(`Pronto! ${n} revis${n > 1 ? 'ões foram espalhadas' : 'ão foi para outro dia'} pelos próximos dias. As mais importantes ficaram para hoje.`, 'success');
    return n;
  };

  /**
   * Checklist: guarda o que o aluno marcou à mão (id) e o que ele desmarcou de um item automático
   * ("off:id"). Assim um item marcado à mão não desmarca quando o site detecta o mesmo hábito.
   */
  const toggleHabit = (date: string, habitId: string, autoOn = false) =>
    patchMethod((s) => {
      const list = new Set(s.habits[date] || []);
      const off = `off:${habitId}`;
      const visible = (autoOn && !list.has(off)) || list.has(habitId);
      if (visible) {
        list.delete(habitId);
        if (autoOn) list.add(off);
      } else {
        list.delete(off);
        if (!autoOn) list.add(habitId);
      }
      return { ...s, habits: { ...s.habits, [date]: [...list] } };
    });
  const tombstone = (st: StudyMethodState, id: string): Record<string, string> => ({ ...(st.deleted || {}), [id]: ymd(new Date()) });

  const addErrorNote: AppContextType['addErrorNote'] = (data) => {
    const note = makeErrorNote(data);
    patchMethod((s) => ({ ...s, errorNotes: [note, ...s.errorNotes] }));
    showNotification('Erro anotado no caderno. Ele volta para você refazer.', 'success');
    return note.id;
  };
  const updateErrorNote = (id: string, changes: Partial<ErrorNote>) =>
    patchMethod((s) => ({ ...s, errorNotes: s.errorNotes.map((n) => (n.id === id ? { ...n, ...changes } : n)) }));
  const deleteErrorNote = (id: string) => patchMethod((s) => ({ ...s, errorNotes: s.errorNotes.filter((n) => n.id !== id), deleted: tombstone(s, id) }));
  const redoErrorNote = (id: string, gotItRight: boolean) => {
    patchMethod((s) => ({ ...s, errorNotes: s.errorNotes.map((n) => (n.id === id ? applyErrorRedo(n, gotItRight) : n)) }));
  };

  const addProject: AppContextType['addProject'] = (p) => {
    const id = newProjectId();
    const { items, ...rest } = p;
    const project: PersonalProject = {
      ...rest,
      id,
      createdAt: new Date().toISOString(),
      items: (items || []).filter((t) => t.trim()).map((t, i) => ({ id: newItemId() + i, title: t.trim(), done: false })),
    };
    patchMethod((s) => ({ ...s, projects: [...s.projects, project] }));
    showNotification(`Estudo pessoal "${project.title}" criado.`, 'success');
    return id;
  };
  const updateProject = (id: string, changes: Partial<PersonalProject>) =>
    patchMethod((s) => ({ ...s, projects: s.projects.map((p) => (p.id === id ? { ...p, ...changes } : p)) }));
  const deleteProject = (id: string) => patchMethod((s) => ({ ...s, projects: s.projects.filter((p) => p.id !== id), deleted: tombstone(s, id) }));
  const mapItems = (projectId: string, fn: (items: PersonalProjectItem[]) => PersonalProjectItem[]) =>
    patchMethod((s) => ({ ...s, projects: s.projects.map((p) => (p.id === projectId ? { ...p, items: fn(p.items) } : p)) }));
  const addProjectItems = (projectId: string, titles: string[]) =>
    mapItems(projectId, (items) => [...items, ...titles.filter((t) => t.trim()).map((t, i) => ({ id: newItemId() + i, title: t.trim(), done: false }))]);
  const updateProjectItem = (projectId: string, itemId: string, changes: Partial<PersonalProjectItem>) =>
    mapItems(projectId, (items) => items.map((it) => (it.id === itemId ? { ...it, ...changes } : it)));
  const toggleProjectItem = (projectId: string, itemId: string) =>
    mapItems(projectId, (items) =>
      items.map((it) =>
        it.id === itemId
          ? it.done
            ? { ...it, done: false, doneAt: undefined, inReview: undefined, nextReviewDate: undefined }
            : { ...it, done: true, doneAt: ymd(new Date()) }
          : it
      )
    );
  const removeProjectItem = (projectId: string, itemId: string) => mapItems(projectId, (items) => items.filter((it) => it.id !== itemId));
  const startProjectItemReviews = (projectId: string, itemId: string) => {
    const first = reviewDateIn(1);
    mapItems(projectId, (items) =>
      items.map((it) => (it.id === itemId ? { ...startItemReviews({ ...it, done: true, doneAt: it.doneAt || ymd(new Date()) }), nextReviewDate: first } : it))
    );
    showNotification(`Item nas revisões: a 1ª é ${first === addDaysYMD(1) ? 'amanhã' : formatDM(first)} (folha em branco).`, 'success');
  };
  const reviewProjectItem = (projectId: string, itemId: string, difficulty: TopicDifficulty) => {
    mapItems(projectId, (items) =>
      items.map((it) => (it.id === itemId ? reviewProjectItemResult(it, difficulty, { restDay: restDaysOf(studyPrefs), longTerm: studyPrefs.longTermGoal }) : it))
    );
    showNotification('Revisão registrada.', 'success');
  };
  const logProjectBlock = (projectId: string, minutes = 25) => {
    const p = studyMethod.projects.find((x) => x.id === projectId);
    logStudySession({ durationMinutes: minutes, type: 'stopwatch', xpEarned: 0, projectId, activity: 'project', notes: `Estudo pessoal • ${p?.title || ''}` });
    showNotification('Bloco somado à meta da semana.', 'success');
  };

  const setBlockStar = (blockId: string, star: boolean) => updateTopicBlock(blockId, { star: star || undefined });
  const toggleInitialStep = (blockId: string, step: string) =>
    setTopicBlocks((prev) => prev.map((b) => (b.id === blockId ? { ...b, initialSteps: toggleIn(b.initialSteps, step) } : b)));

  const createPlannedTheme = (subjectId: string, name: string, date: string) => {
    const sub = subjects.find((s) => s.id === subjectId);
    const title = name.trim();
    if (!sub || !title) return;
    if (sub.organization === 'checklist') {
      const moduleName = sub.checklistModules?.[0] || 'Temas';
      addTopicsBulk([
        { subjectId, title, moduleName, status: 'nao_iniciado', priority: 'media', scheduleFirstContact: true, firstContactDate: date },
      ]);
      if (!(sub.checklistModules || []).includes(moduleName)) updateSubject(subjectId, { checklistModules: [...(sub.checklistModules || []), moduleName] }, { silent: true });
    } else {
      const id = 'blk-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6);
      setTopicBlocks((prev) => [...prev, { id, subjectId, name: title, createdAt: new Date().toISOString(), reviewStatus: 'estudando', reviewsDone: 0, plannedDate: date }]);
      // Um tópico com o mesmo nome: marcar como visto fecha o tema e manda para as revisões
      const stamp = Date.now();
      setTopics((prev) => [
        ...prev,
        { id: `top-${stamp}-0-${Math.random().toString(36).slice(2, 6)}`, subjectId, blockId: id, title, status: 'nao_iniciado', priority: 'media' },
      ]);
      showNotification(`Tema "${title}" programado para ${date === ymd(new Date()) ? 'hoje' : formatDM(date)}.`, 'success');
    }
  };

  const startTask: AppContextType['startTask'] = (task) => {
    const { minutes, free, ...info } = task;
    const now = Date.now();
    const focusTask: FocusTask = { ...info, finished: false };
    // Trocar de tarefa no meio de um foco: o tempo já feito fica salvo na tarefa anterior
    if (timer.isRunning && timer.mode === 'pomodoro' && !timer.cycle && timer.endsAt) {
      const total = timer.customDurationSeconds || pomodoroSettings.workMinutes * 60;
      const doneMin = Math.floor((total - remainingSeconds(timer.endsAt)) / 60);
      if (doneMin >= 1) {
        logStudySession({
          subjectId: timer.selectedSubjectId,
          topicId: timer.selectedTopicId,
          durationMinutes: doneMin,
          type: 'pomodoro',
          xpEarned: 0,
          notes: timer.task ? `Foco (interrompido) • ${timer.task.title}` : 'Foco interrompido',
          blockId: timer.task?.blockId,
          projectId: timer.task?.projectId,
          activity: timer.task?.kind,
        });
        showNotification(`${doneMin} min do foco anterior ficaram salvos.`, 'info');
      }
    }
    if (free) {
      setTimer((prev) => ({
        ...prev,
        mode: 'stopwatch',
        isRunning: true,
        startedAt: now,
        elapsedBase: 0,
        elapsedSeconds: 0,
        endsAt: undefined,
        cycle: undefined,
        customDurationSeconds: undefined,
        selectedSubjectId: info.subjectId || '',
        selectedTopicId: info.topicId,
        task: focusTask,
      }));
    } else {
      const secs = Math.max(1, minutes || pomodoroSettings.workMinutes) * 60;
      setTimer((prev) => ({
        ...prev,
        mode: 'pomodoro',
        isRunning: true,
        timeLeftSeconds: secs,
        customDurationSeconds: secs,
        endsAt: now + secs * 1000,
        elapsedSeconds: 0,
        startedAt: undefined,
        elapsedBase: undefined,
        cycle: undefined,
        selectedSubjectId: info.subjectId || '',
        selectedTopicId: info.topicId,
        task: focusTask,
      }));
    }
    announceStart();
    setCurrentTab('stopwatch');
    showNotification(`Foco iniciado: ${info.title}`, 'info');
  };
  const clearFocusTask = () => setTimer((prev) => ({ ...prev, task: undefined }));

  const guideSeenKey = activeUserId ? `medacademic_method_guide_seen_${activeUserId}` : '';
  const methodGuideSeen =
    !!studyMethod.guideSeen ||
    (() => {
      try {
        return !!guideSeenKey && localStorage.getItem(guideSeenKey) === '1';
      } catch {
        return false;
      }
    })();
  const markMethodGuideSeen = () => {
    try {
      if (guideSeenKey) localStorage.setItem(guideSeenKey, '1');
    } catch {
      /* sem armazenamento */
    }
    if (!studyMethod.guideSeen) patchMethod((s) => ({ ...s, guideSeen: true }));
  };
  const openMethodGuide = (step = 0) => setMethodGuide({ open: true, step });
  const [tourRequestAt, setTourRequestAt] = useState<number | null>(null);
  const requestTour = () => setTourRequestAt(Date.now());
  const closeMethodGuide = () => {
    setMethodGuide((m) => ({ ...m, open: false }));
    markMethodGuideSeen();
  };
  const openReviews = (focus?: { blockId?: string; tab?: string }) => {
    setReviewFocus(focus || null);
    setCurrentTab('spaced_repetition');
  };
  const clearReviewFocus = () => setReviewFocus(null);
  const openPlannerToday = (opts?: { routine?: boolean }) => {
    setPlannerRequest({ routine: !!opts?.routine, at: Date.now() });
    setCurrentTab('calendar');
  };
  const clearPlannerRequest = () => setPlannerRequest(null);

  return (
    <AppContext.Provider
      value={{
        currentTab,
        setCurrentTab,
        semesters,
        currentSemester,
        setCurrentSemesterId,
        addSemester,
        updateSemester,
        deleteSemester,
        resetCurrentSemester,
        undoSemesterReset,
        semesterResetBackup: semesterResetBackupInfo,
        startNextSemester,
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
        deleteSubjects,
        topics,
        addTopic,
        updateTopic,
        deleteTopic,
        reviewTopicSpacedRepetition,
        markTopicSeen,
        resetTopicProgress,
        exams,
        addExam,
        updateExam,
        deleteExam,
        schedule: currentSchedule,
        addScheduleClass,
        updateScheduleClass,
        deleteScheduleClass,
        addScheduleClasses,
        excludeScheduleOnDate,
        replaceScheduleOnDate,
        deleteRotation,
        toggleExamTopicTask,
        setDashboardPrefs,
        setMobileTabs,
        setSidebarPrefs,
        contestsActive,
        addContest,
        updateContest,
        deleteContest,
        addPastExam,
        updatePastExam,
        deletePastExam,
        medRevisions,
        toggleMedRevisionComplete,
        addMedRevision,
        deleteMedRevision,
        studySessions,
        logStudySession,
        studyTimePrompt,
        completeStudyTimePrompt,
        achievements,
        userProfile,
        updateUserProfile,
        addXp,
        triggerConfetti,
        timer,
        startTimer,
        pauseTimer,
        resetTimer,
        setTimerMode,
        setTimerSubject,
        startStudyCycle,
        stopStudyCycle,
        skipCycleStep,
        pomodoroSettings,
        updatePomodoroSettings,
        isDarkMode: themeMode === 'dark',
        toggleDarkMode,
        isOnboardingOpen,
        setIsOnboardingOpen,
        isEditingProfileSetup,
        setIsEditingProfileSetup,
        clearAllData,
        resetAllData,
        isInitialLoadComplete,
        cloudSyncStatus,
        lastCloudSync,
        forceCloudSync,
        searchQuery,
        setSearchQuery,
        notification,
        showNotification,
        dismissNotification,
        tutorMessages,
        setTutorMessages,
        checklist,
        checklistBlocks,
        markTopicPending,
        topicBlocks,
        questionLogs,
        addQuestionLog,
        deleteQuestionLog,
        addTopicBlock,
        addTopicsBulk,
        importSharedSubject,
        importSharedChecklist,
        undoLastDelete,
        canUndoDelete,
        sendModuleToReview,
        convertChecklistToBlocks,
        renameTopicBlock,
        reorderTopics,
        reorderTopicBlocks,
        deleteTopicBlock,
        reviewTopicBlock,
        restartBlockReviews,
        undoBlockReview,
        updateTopicBlock,
        addChecklistItem,
        updateChecklistItem,
        addChecklistBlock,
        updateChecklistBlock,
        deleteChecklistBlock,
        toggleChecklistItem,
        deleteChecklistItem,
        clearCompletedChecklist,
        studyMethod,
        studyPrefs,
        studyPhase,
        residencyPrep,
        currentSubjectIds,
        updateStudyPrefs,
        setDayPlanState,
        toggleTaskDone,
        skipTask,
        addCustomTask,
        removeCustomTask,
        setLowEnergy,
        setDayShift,
        moveTaskToTomorrow,
        moveTaskToDate,
        replanOverdueReviews,
        toggleHabit,
        addErrorNote,
        updateErrorNote,
        deleteErrorNote,
        redoErrorNote,
        addProject,
        updateProject,
        deleteProject,
        addProjectItems,
        updateProjectItem,
        toggleProjectItem,
        removeProjectItem,
        startProjectItemReviews,
        reviewProjectItem,
        logProjectBlock,
        setBlockStar,
        toggleInitialStep,
        createPlannedTheme,
        startTask,
        clearFocusTask,
        methodGuide,
        openMethodGuide,
        closeMethodGuide,
        methodGuideSeen,
        requestTour,
        tourRequestAt,
        markMethodGuideSeen,
        openReviews,
        reviewFocus,
        clearReviewFocus,
        openPlannerToday,
        plannerRequest,
        clearPlannerRequest,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
