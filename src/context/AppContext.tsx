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
} from '../types';
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
import { supabase, APP_STATE_TABLE } from '../lib/supabase';

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
}

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
  addSemester: (sem: Omit<Semester, 'id'>) => void;
  updateSemester: (id: string, sem: Partial<Semester>) => void;
  deleteSemester: (id: string) => void;

  // Subjects
  subjects: Subject[];
  addSubject: (sub: Omit<Subject, 'id'>) => void;
  updateSubject: (id: string, sub: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  // Topics
  topics: Topic[];
  addTopic: (top: Omit<Topic, 'id'>) => void;
  updateTopic: (id: string, top: Partial<Topic>) => void;
  deleteTopic: (id: string) => void;
  reviewTopicSpacedRepetition: (id: string, difficulty: 'dificil' | 'medio' | 'facil' | 'dominado') => void;

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

  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    mode: 'pomodoro',
    timeLeftSeconds: 25 * 60,
    elapsedSeconds: 0,
    selectedSubjectId: '',
    totalPomodorosCompleted: 0,
  });

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

  // Global Timer Tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (timer.isRunning) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev.mode === 'stopwatch') {
            return { ...prev, elapsedSeconds: prev.elapsedSeconds + 1 };
          }

          if (prev.timeLeftSeconds <= 1) {
            // Timer Finished — completion is handled by the effect below (updaters must stay pure)
            return { ...prev, isRunning: false, timeLeftSeconds: 0 };
          }

          return { ...prev, timeLeftSeconds: prev.timeLeftSeconds - 1 };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isRunning]);

  // Countdown completion: award XP, log the session and switch to the next phase
  useEffect(() => {
    if (timer.isRunning || timer.mode === 'stopwatch' || timer.timeLeftSeconds !== 0) return;

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
          showNotification(`🎉 Etapa concluída! Pausa de ${step.breakMins} min iniciada. +100 XP`, 'success');
          setTimer((prev) => ({
            ...prev,
            mode: 'short_break',
            isRunning: true,
            timeLeftSeconds: step.breakMins * 60,
            customDurationSeconds: step.breakMins * 60,
            totalPomodorosCompleted: prev.totalPomodorosCompleted + 1,
            cycle: { steps, index, phase: 'break' },
          }));
        } else {
          const next = steps[index + 1];
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
    const newSub: Subject = { ...sub, id: 'sub-' + Date.now() };
    setSubjects((prev) => [...prev, newSub]);
    showNotification(`Disciplina "${sub.name}" criada com sucesso!`, 'success');
    // XP is awarded by the calling modal
  };

  const updateSubject = (id: string, sub: Partial<Subject>) => {
    setSubjects((prev) => prev.map((s) => (s.id === id ? { ...s, ...sub } : s)));
    showNotification('Disciplina atualizada!', 'success');
  };

  const deleteSubject = (id: string) => {
    setSubjects((prev) => prev.filter((s) => s.id !== id));
    showNotification('Disciplina removida.', 'info');
  };

  const addTopic = (top: Omit<Topic, 'id'>) => {
    const newTop: Topic = { ...top, id: 'top-' + Date.now() };
    setTopics((prev) => [...prev, newTop]);
    showNotification(`Tópico "${top.title}" cadastrado!`, 'success');
    // XP is awarded by the caller
  };

  const updateTopic = (id: string, top: Partial<Topic>) => {
    const current = topics.find((t) => t.id === id);
    if (current && top.status === 'dominado' && current.status !== 'dominado') {
      addXp(120, 'Tópico Dominado');
      triggerConfetti();
    }
    setTopics((prev) => prev.map((t) => (t.id === id ? { ...t, ...top } : t)));
    showNotification('Tópico atualizado!', 'success');
  };

  const deleteTopic = (id: string) => {
    setTopics((prev) => prev.filter((t) => t.id !== id));
    showNotification('Tópico removido.', 'info');
  };

  const reviewTopicSpacedRepetition = (
    id: string,
    difficulty: 'dificil' | 'medio' | 'facil' | 'dominado'
  ) => {
    const hardIntervals = [1, 3, 7, 15];
    const medIntervals = [3, 7, 15, 30];
    const easyIntervals = [7, 15, 30, 60];

    // Computed outside the state updater so XP/notifications fire exactly once
    const t = topics.find((x) => x.id === id);
    if (!t) return;

    {
        const isFirstContact = t.status === 'nao_iniciado';
        const currentStep = isFirstContact ? 1 : (t.cycleStep || 1);
        let newStep = currentStep;
        let intervalDays = 1;
        let newStatus = t.status;

        if (difficulty === 'dominado') {
          newStatus = 'dominado';
          intervalDays = 90;
          newStep = 4;
          addXp(120, 'Tópico Dominado no Ciclo');
          triggerConfetti();
          showNotification(`🏆 Parabéns! Assunto "${t.title}" marcado como dominado!`, 'success');
        } else if (difficulty === 'dificil') {
          newStep = isFirstContact ? 1 : Math.max(1, currentStep);
          const idx = Math.min(hardIntervals.length - 1, newStep - 1);
          intervalDays = hardIntervals[idx];
          newStatus = 'em_andamento';
          addXp(25, isFirstContact ? 'Primeiro Contato Registrado' : 'Revisão Difícil Realizada');
          showNotification(isFirstContact ? `Primeiro contato: próximo em ${intervalDays}d` : `Revisão registrada: intervalo de ${intervalDays}d (Difícil)`, 'info');
        } else if (difficulty === 'medio') {
          newStep = isFirstContact ? 1 : Math.min(4, currentStep + 1);
          const idx = Math.min(medIntervals.length - 1, newStep - 1);
          intervalDays = medIntervals[idx];
          newStatus = newStep >= 3 ? 'revisado' : 'em_andamento';
          addXp(40, isFirstContact ? 'Primeiro Contato Registrado' : 'Revisão Média Realizada');
          showNotification(isFirstContact ? `Primeiro contato: próxima em ${intervalDays}d` : `Revisão registrada: próxima em ${intervalDays}d (Médio)`, 'success');
        } else if (difficulty === 'facil') {
          newStep = isFirstContact ? 1 : Math.min(4, currentStep + 1);
          const idx = Math.min(easyIntervals.length - 1, newStep - 1);
          intervalDays = easyIntervals[idx];
          newStatus = newStep >= 3 ? 'revisado' : 'em_andamento';
          addXp(60, isFirstContact ? 'Primeiro Contato Registrado' : 'Revisão Fácil Realizada');
          showNotification(isFirstContact ? `Primeiro contato: próxima em ${intervalDays}d` : `Excelente retenção! Próxima revisão em ${intervalDays}d`, 'success');
        }

        const nextDate = new Date();
        nextDate.setDate(nextDate.getDate() + intervalDays);
        const todayStr = new Date().toISOString().split('T')[0];

        const updated: Topic = {
          ...t,
          status: newStatus,
          difficulty: difficulty === 'dominado' ? 'facil' : difficulty,
          cycleStep: newStep,
          intervalDays,
          firstContactDate: t.firstContactDate || todayStr,
          lastStudiedDate: todayStr,
          nextReviewDate: nextDate.toISOString().split('T')[0],
          inSpacedRepetition: true,
        };
        setTopics((prev) => prev.map((x) => (x.id === id ? updated : x)));
    }
  };

  const addExam = (ex: Omit<Exam, 'id'>) => {
    const newEx: Exam = { ...ex, id: 'exam-' + Date.now() };
    setExams((prev) => [...prev, newEx]);
    showNotification(`Prova "${ex.title}" agendada!`, 'success');
    // XP is awarded by the calling modal
  };

  const updateExam = (id: string, ex: Partial<Exam>) => {
    setExams((prev) => prev.map((e) => (e.id === id ? { ...e, ...ex } : e)));
    if (ex.grade !== undefined) {
      showNotification('Nota da avaliação registrada!', 'success');
      addXp(150, 'Nota Registrada');
    }
  };

  const deleteExam = (id: string) => {
    setExams((prev) => prev.filter((e) => e.id !== id));
    showNotification('Prova removida do calendário.', 'info');
  };

  const addScheduleClass = (sc: Omit<ScheduleClass, 'id'>) => {
    const newSc: ScheduleClass = { ...sc, id: 'sch-' + Date.now() };
    setSchedule((prev) => [...prev, newSc]);
    showNotification('Aula adicionada à grade horária!', 'success');
  };

  const updateScheduleClass = (id: string, sc: Partial<ScheduleClass>) => {
    setSchedule((prev) => prev.map((s) => (s.id === id ? { ...s, ...sc } : s)));
    showNotification('Grade de aula atualizada!', 'success');
  };

  const deleteScheduleClass = (id: string) => {
    setSchedule((prev) => prev.filter((s) => s.id !== id));
    showNotification('Aula removida da grade.', 'info');
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
  const startTimer = () => {
    setTimer((prev) => ({ ...prev, running: true, isRunning: true }));
  };

  const pauseTimer = () => {
    setTimer((prev) => ({ ...prev, running: false, isRunning: false }));
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
      customDurationSeconds: seconds,
      elapsedSeconds: 0,
      selectedSubjectId: subjectId ?? prev.selectedSubjectId,
      cycle: { steps, index, phase: 'work' },
    }));
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
        subjects,
        addSubject,
        updateSubject,
        deleteSubject,
        topics,
        addTopic,
        updateTopic,
        deleteTopic,
        reviewTopicSpacedRepetition,
        exams,
        addExam,
        updateExam,
        deleteExam,
        schedule,
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
