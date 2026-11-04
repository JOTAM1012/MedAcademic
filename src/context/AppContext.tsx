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
} from '../types';
import {
  BLOCK_REVIEWS_TO_MASTER,
  FIRST_REVIEW_DAY,
  addDaysYMD,
  isTopicResolved,
  nextIntervalDays,
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

  // Subjects
  subjects: Subject[];
  /** Returns the id of the created subject */
  addSubject: (sub: Omit<Subject, 'id'>) => string;
  updateSubject: (id: string, sub: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

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
  renameTopicBlock: (id: string, name: string) => void;
  deleteTopicBlock: (id: string) => void;
  reviewTopicBlock: (id: string, difficulty: TopicDifficulty, result?: { questions?: number; correct?: number }) => void;
  /** Recomeça as revisões do bloco (volta para "Em estudo" se algum tópico não estiver visto) */
  restartBlockReviews: (id: string) => void;

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

  // MedRevision
  medRevisions: MedRevisionTopic[];
  toggleMedRevisionComplete: (id: string) => void;
  addMedRevision: (mr: Omit<MedRevisionTopic, 'id'>) => void;
  deleteMedRevision: (id: string) => void;

  // Study Sessions & Gamification
  studySessions: StudySession[];
  logStudySession: (session: Omit<StudySession, 'id' | 'timestamp'>) => void;
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
  notification: { message: string; type: 'success' | 'info' | 'warning' } | null;
  showNotification: (message: string, type?: 'success' | 'info' | 'warning') => void;

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
  deleteChecklistItem: (id: string) => void;
  clearCompletedChecklist: (blockId?: string) => void;
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
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

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

    let isSubscribed = true;

    // High-performance IndexedDB Async Hydration for Heavy Datasets (Revisões Espaçadas, Sessões, etc.)
    const loadIDBCache = async (uid: string) => {
      try {
        const [
          idbMed, idbSess, idbTop, idbSub, idbEx,
          idbSem, idbProf, idbSch, idbAch, idbPomo, idbTut
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
        ]);
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
      localStorage.setItem(getUserKey('user_profile', activeUserId), JSON.stringify(userProfile));
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

  // Migração: tópicos sem bloco viram um bloco com o nome da disciplina (ex.: "NEONATOLOGIA 1").
  // O id é fixo por disciplina, então dois aparelhos migrando ao mesmo tempo geram o mesmo bloco.
  useEffect(() => {
    if (!activeUserId || !isInitialLoadComplete) return;
    const validIds = new Set(topicBlocks.map((b) => b.id));
    const orphans = topics.filter((t) => !t.blockId || !validIds.has(t.blockId));
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
      const status: TopicBlock['reviewStatus'] = !allSeen
        ? 'estudando'
        : reviewsDone >= BLOCK_REVIEWS_TO_MASTER
        ? 'dominado'
        : 'revisao';
      newBlocks.push({
        id,
        subjectId,
        name: sub?.universitySubject || sub?.name || 'Geral',
        createdAt: new Date().toISOString(),
        reviewStatus: status,
        reviewsDone: Math.min(reviewsDone, BLOCK_REVIEWS_TO_MASTER),
        completedDate: status !== 'estudando' ? today : undefined,
        nextReviewDate:
          status === 'revisao' ? (reviewsDone === 0 ? addDaysYMD(FIRST_REVIEW_DAY, today) : dates[0] || addDaysYMD(FIRST_REVIEW_DAY, today)) : undefined,
        difficulty: reviewsDone > 0 ? 'medio' : undefined,
      });
    });
    if (newBlocks.length > 0) setTopicBlocks((prev) => [...prev, ...newBlocks.filter((b) => !prev.some((p) => p.id === b.id))]);
    setTopics((prev) =>
      prev.map((t) => (t.blockId && validIds.has(t.blockId) ? t : { ...t, blockId: 'blk-auto-' + t.subjectId }))
    );
  }, [topics, topicBlocks, subjects, activeUserId, isInitialLoadComplete]);

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

  // Dark Mode side-effect
  useEffect(() => {
    if (userProfile.darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [userProfile.darkMode]);

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
  }, [timer.isRunning, timer.endsAt, timer.startedAt, timer.mode, timer.cycle]);

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
        });

        if (isLast) {
          notifyTimer('🏁 Ciclo de estudos concluído!', 'Excelente trabalho. Hora de descansar.');
          showNotification('🏁 Ciclo de estudos concluído! Excelente trabalho. +100 XP', 'success');
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
          showNotification(`🎉 Etapa concluída! Pausa de ${step.breakMins} min iniciada. +100 XP`, 'success');
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
          showNotification(`🎉 Etapa concluída! Próxima: ${next.title}. +100 XP`, 'success');
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
      showNotification('🎉 Ciclo Pomodoro concluído com sucesso! +100 XP', 'success');
      addXp(100, 'Pomodoro Concluído');
      logStudySession({
        subjectId: timer.selectedSubjectId,
        durationMinutes: focusMinutes,
        type: 'pomodoro',
        xpEarned: 100,
        notes: 'Sessão Pomodoro de Foco Médico',
      });
      setTimer((prev) => ({
        ...prev,
        mode: 'short_break',
        timeLeftSeconds: pomodoroSettings.shortBreakMinutes * 60,
        customDurationSeconds: undefined,
        totalPomodorosCompleted: prev.totalPomodorosCompleted + 1,
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

  const showNotification = (message: string, type: 'success' | 'info' | 'warning' = 'info') => {
    setNotification({ message, type });
    setTimeout(() => {
      setNotification(null);
    }, 4000);
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
  const addXp = (amount: number, _reason?: string) => {
    const prev = userProfileRef.current;
    const newXp = prev.totalXp + amount;
    const newLevel = Math.floor(newXp / 800) + 1;
    userProfileRef.current = { ...prev, totalXp: newXp, level: newLevel };
    if (newLevel > prev.level) {
      showNotification(`🏆 Parabéns! Você subiu para o Nível ${newLevel}!`, 'success');
      triggerConfetti();
    }
    setUserProfile((p) => {
      const xp = p.totalXp + amount;
      return { ...p, totalXp: xp, level: Math.floor(xp / 800) + 1 };
    });
  };

  const logStudySession = (session: Omit<StudySession, 'id' | 'timestamp'>) => {
    const newSession: StudySession = {
      ...session,
      id: 'sess-' + Date.now(),
      timestamp: new Date().toISOString(),
    };
    setStudySessions((prev) => [newSession, ...prev]);

    // Check & update streak and achievements
    const today = new Date().toISOString().split('T')[0];
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
  };

  // Current Semester
  const currentSemester = semesters.find((s) => s.id === userProfile.currentSemesterId) || semesters[0];

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

  const addSubject = (sub: Omit<Subject, 'id'>) => {
    const newSub: Subject = { ...sub, id: 'sub-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) };
    setSubjects((prev) => [...prev, newSub]);
    showNotification(`Disciplina "${sub.name}" criada com sucesso!`, 'success');
    // XP is awarded by the calling modal
    return newSub.id;
  };

  const updateSubject = (id: string, sub: Partial<Subject>) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...sub } : s)));
    showNotification('Disciplina atualizada!', 'success');
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    setTopicBlocks((prev) => prev.filter((b) => b.subjectId !== id));
    showNotification('Disciplina removida.', 'info');
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
      if (!status) showNotification('Tópico atualizado!', 'success');
    }
  };

  const deleteTopic = (id: string) => {
    const t = topics.find((x) => x.id === id);
    const next = topics.filter((x) => x.id !== id);
    setTopics(next);
    showNotification('Tópico removido.', 'info');
    if (t) syncBlockStatus(t.blockId, next);
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
    const list = nextTopics.filter((t) => t.blockId === blockId);
    const allSeen = list.length > 0 && list.every(isTopicResolved);
    if (block.reviewStatus === 'estudando' && allSeen) {
      setTopicBlocks((prev) =>
        prev.map((bk) =>
          bk.id === blockId
            ? {
                ...bk,
                reviewStatus: 'revisao',
                reviewsDone: 0,
                completedDate: ymd(new Date()),
                nextReviewDate: addDaysYMD(FIRST_REVIEW_DAY),
                difficulty: undefined,
              }
            : bk
        )
      );
      addXp(50, 'Bloco concluído');
      triggerConfetti();
      showNotification(`✅ Bloco "${block.name}" concluído hoje (Dia 0)! 1ª revisão no Dia 7, em ${addDaysYMD(FIRST_REVIEW_DAY).split('-').reverse().slice(0, 2).join('/')}.`, 'success');
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

  const renameTopicBlock = (id: string, name: string) => {
    if (!name.trim()) return;
    setTopicBlocks((prev) => prev.map((bk) => (bk.id === id ? { ...bk, name: name.trim() } : bk)));
  };

  const deleteTopicBlock = (id: string) => {
    setTopicBlocks((prev) => prev.filter((bk) => bk.id !== id));
    setTopics((prev) => prev.filter((t) => t.blockId !== id));
    showNotification('Bloco removido.', 'info');
  };

  const reviewTopicBlock = (id: string, difficulty: TopicDifficulty, result?: { questions?: number; correct?: number }) => {
    const block = topicBlocks.find((bk) => bk.id === id);
    if (!block || block.reviewStatus !== 'revisao') return;
    const done = Math.min(BLOCK_REVIEWS_TO_MASTER, block.reviewsDone + 1);
    const todayStr = ymd(new Date());
    const log = [...(block.reviewLog || []), { date: todayStr, difficulty, ...result }];

    if (done >= BLOCK_REVIEWS_TO_MASTER) {
      setTopicBlocks((prev) =>
        prev.map((bk) =>
          bk.id === id ? { ...bk, reviewStatus: 'dominado', reviewsDone: done, difficulty, lastReviewDate: todayStr, nextReviewDate: undefined, reviewLog: log } : bk
        )
      );
      addXp(150, 'Bloco Dominado (4 revisões)');
      triggerConfetti();
      showNotification(`🏆 4ª revisão concluída! O bloco "${block.name}" agora está dominado.`, 'success');
      return;
    }
    const intervalDays = nextIntervalDays(difficulty, done);
    setTopicBlocks((prev) =>
      prev.map((bk) =>
        bk.id === id
          ? { ...bk, reviewsDone: done, difficulty, lastReviewDate: todayStr, nextReviewDate: addDaysYMD(intervalDays), reviewLog: log }
          : bk
      )
    );
    addXp(difficulty === 'facil' ? 60 : difficulty === 'medio' ? 45 : 30, `Revisão ${done}/${BLOCK_REVIEWS_TO_MASTER} do bloco`);
    showNotification(`Revisão ${done}/${BLOCK_REVIEWS_TO_MASTER} de "${block.name}" registrada. Próxima em ${intervalDays} dia${intervalDays > 1 ? 's' : ''}.`, 'success');
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
              nextReviewDate: allSeen ? addDaysYMD(FIRST_REVIEW_DAY) : undefined,
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
    showNotification(`Prova "${ex.title}" adicionada à grade de semestre!`, 'success');
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
    showNotification('Prova removida da grade de semestre.', 'info');
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
    setChecklistBlocks((prev) => prev.filter((b) => b.id !== id));
    setChecklist((prev) => prev.filter((item) => item.blockId !== id));
    showNotification('Bloco removido do checklist.', 'info');
  };

  const toggleChecklistItem = (id: string) => {
    setChecklist((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, done: !item.done, doneAt: !item.done ? new Date().toISOString() : undefined } : item
      )
    );
  };

  const deleteChecklistItem = (id: string) => {
    setChecklist((prev) => prev.filter((item) => item.id !== id));
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

  const toggleDarkMode = () => {
    setUserProfile((prev) => ({ ...prev, darkMode: !prev.darkMode }));
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
        : { ...prev, isRunning: true, endsAt: now + prev.timeLeftSeconds * 1000 }
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
    }));
    announceStart();
    showNotification(`Ciclo iniciado: ${steps[index].title} (${steps[index].workMins} min)`, 'info');
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
        startNextSemester,
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
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
        medRevisions,
        toggleMedRevisionComplete,
        addMedRevision,
        deleteMedRevision,
        studySessions,
        logStudySession,
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
        pomodoroSettings,
        updatePomodoroSettings,
        isDarkMode: userProfile.darkMode,
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
        renameTopicBlock,
        deleteTopicBlock,
        reviewTopicBlock,
        restartBlockReviews,
        addChecklistItem,
        updateChecklistItem,
        addChecklistBlock,
        updateChecklistBlock,
        deleteChecklistBlock,
        toggleChecklistItem,
        deleteChecklistItem,
        clearCompletedChecklist,
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
