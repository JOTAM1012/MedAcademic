import React, { createContext, useContext, useState, useEffect } from 'react';
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

interface TimerState {
  isRunning: boolean;
  mode: 'pomodoro' | 'short_break' | 'medium_break' | 'long_break' | 'stopwatch';
  timeLeftSeconds: number; // For pomodoro countdown
  elapsedSeconds: number; // For stopwatch
  selectedSubjectId?: string;
  selectedTopicId?: string;
  totalPomodorosCompleted: number;
  customDurationSeconds?: number;
}

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

  // Reset & Clear Everything
  clearAllData: () => void;
  resetAllData: () => void;

  // Search query state
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Quick Notification
  notification: { message: string; type: 'success' | 'info' | 'warning' } | null;
  showNotification: (message: string, type?: 'success' | 'info' | 'warning') => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  SEMESTERS: 'medacademic_semesters_v1',
  SUBJECTS: 'medacademic_subjects_v1',
  TOPICS: 'medacademic_topics_v1',
  EXAMS: 'medacademic_exams_v1',
  SCHEDULE: 'medacademic_schedule_v1',
  ACHIEVEMENTS: 'medacademic_achievements_v1',
  MED_REVISIONS: 'medacademic_med_revisions_v1',
  USER_PROFILE: 'medacademic_user_profile_v1',
  STUDY_SESSIONS: 'medacademic_study_sessions_v1',
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Load Initial State with LocalStorage
  const [semesters, setSemesters] = useState<Semester[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SEMESTERS);
    return saved ? JSON.parse(saved) : INITIAL_SEMESTERS;
  });

  const [subjects, setSubjects] = useState<Subject[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUBJECTS);
    return saved ? JSON.parse(saved) : INITIAL_SUBJECTS;
  });

  const [topics, setTopics] = useState<Topic[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TOPICS);
    return saved ? JSON.parse(saved) : INITIAL_TOPICS;
  });

  const [exams, setExams] = useState<Exam[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.EXAMS);
    return saved ? JSON.parse(saved) : INITIAL_EXAMS;
  });

  const [schedule, setSchedule] = useState<ScheduleClass[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULE);
    return saved ? JSON.parse(saved) : INITIAL_SCHEDULE;
  });

  const [achievements, setAchievements] = useState<Achievement[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.ACHIEVEMENTS);
    return saved ? JSON.parse(saved) : INITIAL_ACHIEVEMENTS;
  });

  const [medRevisions, setMedRevisions] = useState<MedRevisionTopic[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MED_REVISIONS);
    return saved ? JSON.parse(saved) : INITIAL_MED_REVISIONS;
  });

  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
    return saved ? JSON.parse(saved) : INITIAL_USER_PROFILE;
  });

  const [studySessions, setStudySessions] = useState<StudySession[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.STUDY_SESSIONS);
    if (saved) return JSON.parse(saved);
    return [
      {
        id: 'sess-1',
        subjectId: 'sub-cardio',
        durationMinutes: 45,
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        type: 'pomodoro',
        notes: 'Estudo dos 4 pilares da ICFER e dosagem de betabloqueadores.',
        xpEarned: 150,
      },
      {
        id: 'sess-2',
        subjectId: 'sub-semiologia',
        durationMinutes: 60,
        timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
        type: 'stopwatch',
        notes: 'Ausculta pulmonar e sons pleurais.',
        xpEarned: 200,
      },
    ];
  });

  // Timer State
  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    mode: 'pomodoro',
    timeLeftSeconds: 25 * 60,
    elapsedSeconds: 0,
    selectedSubjectId: 'sub-cardio',
    totalPomodorosCompleted: 0,
  });

  const [pomodoroSettings, setPomodoroSettings] = useState(() => {
    const saved = localStorage.getItem('medacademic_pomodoro_settings_v1');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return {
      workMinutes: 25,
      shortBreakMinutes: 5,
      mediumBreakMinutes: 10,
      longBreakMinutes: 15,
    };
  });

  useEffect(() => {
    localStorage.setItem('medacademic_pomodoro_settings_v1', JSON.stringify(pomodoroSettings));
  }, [pomodoroSettings]);

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

  // Persist State to LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SEMESTERS, JSON.stringify(semesters));
  }, [semesters]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  }, [subjects]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify(topics));
  }, [topics]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
  }, [exams]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify(schedule));
  }, [schedule]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACHIEVEMENTS, JSON.stringify(achievements));
  }, [achievements]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MED_REVISIONS, JSON.stringify(medRevisions));
  }, [medRevisions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.STUDY_SESSIONS, JSON.stringify(studySessions));
  }, [studySessions]);

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
            // Timer Finished
            if (prev.mode === 'pomodoro') {
              triggerConfetti();
              showNotification('🎉 Ciclo Pomodoro concluído com sucesso! +100 XP', 'success');
              addXp(100, 'Pomodoro Concluído');
              logStudySession({
                subjectId: prev.selectedSubjectId,
                durationMinutes: 25,
                type: 'pomodoro',
                xpEarned: 100,
                notes: 'Sessão Pomodoro de Foco Médico',
              });
              return {
                ...prev,
                isRunning: false,
                mode: 'short_break',
                timeLeftSeconds: 5 * 60,
                totalPomodorosCompleted: prev.totalPomodorosCompleted + 1,
              };
            } else {
              showNotification('⏰ Pausa finalizada! Hora de retomar o foco.', 'info');
              return {
                ...prev,
                isRunning: false,
                mode: 'pomodoro',
                timeLeftSeconds: 25 * 60,
              };
            }
          }

          return { ...prev, timeLeftSeconds: prev.timeLeftSeconds - 1 };
        });
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [timer.isRunning]);

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

  const addXp = (amount: number, _reason?: string) => {
    setUserProfile((prev) => {
      const newXp = prev.totalXp + amount;
      const newLevel = Math.floor(newXp / 800) + 1;
      if (newLevel > prev.level) {
        showNotification(`🏆 Parabéns! Você subiu para o Nível ${newLevel}!`, 'success');
        triggerConfetti();
      }
      return {
        ...prev,
        totalXp: newXp,
        level: newLevel,
      };
    });
  };

  const logStudySession = (session: Omit<StudySession, 'id' | 'timestamp'>) => {
    const newSession: StudySession = {
      ...session,
      id: 'sess-' + Date.now(),
      timestamp: new Date().toISOString(),
    };
    setStudySessions((prev) => [newSession, ...prev]);

    // Check & update achievements
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
    addXp(100, 'Novo Semestre');
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
    addXp(80, 'Nova Disciplina');
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
    addXp(50, 'Novo Tópico de Estudo');
  };

  const updateTopic = (id: string, top: Partial<Topic>) => {
    setTopics((prev) =>
      prev.map((t) => {
        if (t.id === id) {
          const updated = { ...t, ...top };
          if (top.status === 'dominado' && t.status !== 'dominado') {
            addXp(120, 'Tópico Dominado');
            triggerConfetti();
          }
          return updated;
        }
        return t;
      })
    );
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

    setTopics((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;

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

        return {
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
      })
    );
  };

  const addExam = (ex: Omit<Exam, 'id'>) => {
    const newEx: Exam = { ...ex, id: 'exam-' + Date.now() };
    setExams((prev) => [...prev, newEx]);
    showNotification(`Prova "${ex.title}" agendada!`, 'success');
    addXp(50, 'Prova Agendada');
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
    setMedRevisions((prev) =>
      prev.map((mr) => {
        if (mr.id === id) {
          const nextState = !mr.isCompleted;
          if (nextState) {
            addXp(150, 'Tópico de Residência Concluído');
            triggerConfetti();
          }
          return { ...mr, isCompleted: nextState };
        }
        return mr;
      })
    );
  };

  const addMedRevision = (mr: Omit<MedRevisionTopic, 'id'>) => {
    const newMr: MedRevisionTopic = { ...mr, id: 'mr-' + Date.now() };
    setMedRevisions((prev) => [...prev, newMr]);
    showNotification('Tema de MedRevision adicionado!', 'success');
  };

  const updateUserProfile = (profile: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...profile }));
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
      email: userProfile.email || 'usuario@medstudy.com',
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
      onboardingCompleted: false,
    });
    setTimer({
      isRunning: false,
      mode: 'pomodoro',
      timeLeftSeconds: 25 * 60,
      elapsedSeconds: 0,
      totalPomodorosCompleted: 0,
    });

    // Clear and re-seed LocalStorage with clean blank state
    localStorage.setItem(STORAGE_KEYS.SEMESTERS, JSON.stringify([blankSemester]));
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.TOPICS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.SCHEDULE, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.STUDY_SESSIONS, JSON.stringify([]));

    showNotification('O site foi completamente zerado! Dados limpos com sucesso.', 'warning');
  };

  // Restore Default Medical Curriculum Demo
  const resetAllData = () => {
    setSemesters(INITIAL_SEMESTERS);
    setSubjects(INITIAL_SUBJECTS);
    setTopics(INITIAL_TOPICS);
    setExams(INITIAL_EXAMS);
    setSchedule(INITIAL_SCHEDULE);
    setAchievements(INITIAL_ACHIEVEMENTS);
    setMedRevisions(INITIAL_MED_REVISIONS);
    setUserProfile(INITIAL_USER_PROFILE);
    setStudySessions([
      {
        id: 'sess-1',
        subjectId: 'sub-cardio',
        durationMinutes: 45,
        timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
        type: 'pomodoro',
        notes: 'Estudo dos 4 pilares da ICFER e dosagem de betabloqueadores.',
        xpEarned: 150,
      },
    ]);
    setTimer({
      isRunning: false,
      mode: 'pomodoro',
      timeLeftSeconds: 25 * 60,
      elapsedSeconds: 0,
      selectedSubjectId: 'sub-cardio',
      totalPomodorosCompleted: 0,
    });

    showNotification('Currículo médico de demonstração restaurado!', 'success');
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
    }));
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
        pomodoroSettings,
        updatePomodoroSettings,
        isDarkMode: userProfile.darkMode,
        toggleDarkMode,
        isOnboardingOpen,
        setIsOnboardingOpen,
        clearAllData,
        resetAllData,
        searchQuery,
        setSearchQuery,
        notification,
        showNotification,
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
