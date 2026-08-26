import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Stethoscope, CloudOff, RefreshCw, X, ChevronDown, Trash2 } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { DashboardView } from './components/DashboardView';
import { AcademicStructureView } from './components/AcademicStructureView';
import { SpacedRepetitionView } from './components/SpacedRepetitionView';
import { MedRevisionView } from './components/MedRevisionView';
import { StudyStopwatchView } from './components/StudyStopwatchView';
import { GradesManagementView } from './components/GradesManagementView';
import { ScheduleView } from './components/ScheduleView';
import { CalendarView } from './components/CalendarView';
import { GeminiTutorView } from './components/GeminiTutorView';
import { ProfileView } from './components/ProfileView';
import { ProfileCreationPage } from './components/ProfileCreationPage';
import { GuidedTour } from './components/GuidedTour';

// Modals
import { AddSubjectModal } from './components/modals/AddSubjectModal';
import { AddTopicModal } from './components/modals/AddTopicModal';
import { AddExamModal } from './components/modals/AddExamModal';
import { AddSemesterModal } from './components/modals/AddSemesterModal';
import { AddScheduleModal } from './components/modals/AddScheduleModal';
import { OnboardingModal } from './components/modals/OnboardingModal';
import { AuthModal } from './components/modals/AuthModal';

const AppContent: React.FC = () => {
  const { activeUserId, activeUser, logout, isDeleting } = useAuth();
  const {
    currentTab,
    setCurrentTab,
    isOnboardingOpen,
    setIsOnboardingOpen,
    isEditingProfileSetup,
    userProfile,
    subjects,
    isInitialLoadComplete,
    cloudSyncStatus,
    forceCloudSync,
  } = useApp();

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Guided Tour State
  const [isTourOpen, setIsTourOpen] = useState(false);

  // Auto-trigger tour for new users after initial load
  useEffect(() => {
    if (isInitialLoadComplete && userProfile) {
      try {
        const tourSeen = localStorage.getItem(`medacademic_tour_seen_${activeUserId || 'guest'}`);
        if (!tourSeen && !userProfile.onboardingCompleted) {
          const timer = setTimeout(() => setIsTourOpen(true), 800);
          return () => clearTimeout(timer);
        }
      } catch (e) {}
    }
  }, [isInitialLoadComplete, activeUserId, userProfile]);

  const handleCloseTour = () => {
    setIsTourOpen(false);
    try {
      localStorage.setItem(`medacademic_tour_seen_${activeUserId || 'guest'}`, 'true');
    } catch (e) {}
  };

  // Modals state
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [isAddSemesterOpen, setIsAddSemesterOpen] = useState(false);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [selectedDayForScheduleModal, setSelectedDayForScheduleModal] = useState<number | undefined>();
  const [activeSubjectIdForModal, setActiveSubjectIdForModal] = useState<string | undefined>();

  // Offline status tracking for toast notification after 30 seconds & reconnection pop effect
  const [showOfflineToast, setShowOfflineToast] = useState(false);
  const [isOfflineToastDismissed, setIsOfflineToastDismissed] = useState(false);
  const [isReconnectedPop, setIsReconnectedPop] = useState(false);
  const prevSyncStatusRef = React.useRef(cloudSyncStatus);

  // Compact Dock Inactivity Management (collapses after 5 seconds)
  const [isDockCompact, setIsDockCompact] = useState(false);
  const dockInactivityTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const resetDockTimer = React.useCallback(() => {
    setIsDockCompact(false);
    if (dockInactivityTimerRef.current) {
      clearTimeout(dockInactivityTimerRef.current);
    }
    dockInactivityTimerRef.current = setTimeout(() => {
      setIsDockCompact(true);
    }, 5000);
  }, []);

  useEffect(() => {
    resetDockTimer();
    return () => {
      if (dockInactivityTimerRef.current) {
        clearTimeout(dockInactivityTimerRef.current);
      }
    };
  }, [resetDockTimer]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let popTimer: NodeJS.Timeout | null = null;

    if (cloudSyncStatus === 'offline') {
      timer = setTimeout(() => {
        setShowOfflineToast(true);
      }, 30000); // 30 seconds
    } else {
      setShowOfflineToast(false);
      setIsOfflineToastDismissed(false);
    }

    // Detect reconnection transition to 'synced'
    if (
      cloudSyncStatus === 'synced' &&
      (prevSyncStatusRef.current === 'offline' || prevSyncStatusRef.current === 'syncing')
    ) {
      setIsReconnectedPop(true);
      popTimer = setTimeout(() => {
        setIsReconnectedPop(false);
      }, 1500);
    }

    prevSyncStatusRef.current = cloudSyncStatus;

    return () => {
      if (timer) clearTimeout(timer);
      if (popTimer) clearTimeout(popTimer);
    };
  }, [cloudSyncStatus]);

  // Show deletion progress indicator while clearing remote DB and local caches
  if (isDeleting) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm animate-fade-in">
          <div className="h-14 w-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center animate-pulse shadow-xl shadow-rose-500/10 text-rose-400">
            <Trash2 className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Excluindo Conta...</h2>
            <p className="text-xs text-slate-400 mt-1">Limpando registros no banco de dados e encerrando sua sessão com segurança...</p>
          </div>
          <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="w-full h-full bg-rose-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // If user is not logged in / authenticated, show Login & Create Account as the mandatory entry screen
  if (!activeUserId) {
    return <AuthModal isPage={true} />;
  }

  // Show loading indicator while fetching user profile and academic state from Firestore
  if (!isInitialLoadComplete) {
    return (
      <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center text-slate-100 p-6">
        <div className="flex flex-col items-center gap-4 text-center max-w-sm">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-tr from-sky-500 to-blue-600 flex items-center justify-center animate-pulse shadow-xl shadow-sky-500/20">
            <Stethoscope className="h-7 w-7 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white">Carregando MedAcademic</h2>
            <p className="text-xs text-slate-400 mt-1">Sincronizando suas matérias, revisões e métricas com a nuvem...</p>
          </div>
          <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden mt-2">
            <div className="w-full h-full bg-sky-500 rounded-full animate-pulse" />
          </div>
        </div>
      </div>
    );
  }

  // Only show onboarding page if user genuinely has no account profile, no active session, and no existing subjects
  const isAccountSetupComplete =
    userProfile.onboardingCompleted ||
    Boolean(activeUser && activeUser.onboardingCompleted) ||
    subjects.length > 0;

  if (!isAccountSetupComplete || isEditingProfileSetup) {
    return <ProfileCreationPage />;
  }

  const handleOpenAddTopic = (subjectId?: string) => {
    setActiveSubjectIdForModal(subjectId);
    setIsAddTopicOpen(true);
  };

  const handleOpenAddExam = (subjectId?: string) => {
    setActiveSubjectIdForModal(subjectId);
    setIsAddExamOpen(true);
  };

  const handleOpenAddSchedule = (dayNum?: number) => {
    setSelectedDayForScheduleModal(dayNum);
    setIsAddScheduleOpen(true);
  };

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'structure':
        return (
          <AcademicStructureView
            onOpenAddSubject={() => setIsAddSubjectOpen(true)}
            onOpenAddTopic={handleOpenAddTopic}
            
          />
        );
      case 'spaced_repetition':
        return (
          <SpacedRepetitionView
            onOpenAddTopic={() => handleOpenAddTopic()}
          />
        );
      case 'med_revision':
        return <MedRevisionView />;
      case 'stopwatch':
        return <StudyStopwatchView />;
      case 'grades':
        return (
          <GradesManagementView
            onOpenAddExam={handleOpenAddExam}
            onOpenAddSubject={() => setIsAddSubjectOpen(true)}
          />
        );
      case 'schedule':
        return (
          <ScheduleView onOpenAddSchedule={(dayNum) => handleOpenAddSchedule(dayNum)} />
        );
      case 'calendar':
        return (
          <CalendarView
            onOpenAddExam={handleOpenAddExam}
            onOpenAddSchedule={(dayNum) => handleOpenAddSchedule(dayNum)}
            onOpenAddTopic={handleOpenAddTopic}
          />
        );
      case 'gemini_tutor':
        return <GeminiTutorView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors">
      {/* Navigation Sidebar */}
      <Sidebar
        isMobileOpen={isMobileMenuOpen}
        setIsMobileOpen={setIsMobileMenuOpen}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 min-w-0 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <TopBar
          onToggleMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenTour={() => setIsTourOpen(true)}
        />

        {/* Dynamic Scrollable Page Content with Smooth Page Transitions */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 12, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Global Creation & Onboarding Modals */}
      <AddSubjectModal
        isOpen={isAddSubjectOpen}
        onClose={() => setIsAddSubjectOpen(false)}
      />

      <AddTopicModal
        isOpen={isAddTopicOpen}
        onClose={() => setIsAddTopicOpen(false)}
        defaultSubjectId={activeSubjectIdForModal}
      />

      <AddExamModal
        isOpen={isAddExamOpen}
        onClose={() => setIsAddExamOpen(false)}
        defaultSubjectId={activeSubjectIdForModal}
      />

      <AddSemesterModal
        isOpen={isAddSemesterOpen}
        onClose={() => setIsAddSemesterOpen(false)}
      />

      <AddScheduleModal
        isOpen={isAddScheduleOpen}
        onClose={() => setIsAddScheduleOpen(false)}
        defaultDay={selectedDayForScheduleModal}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => setIsOnboardingOpen(false)}
      />

      <AuthModal />

      {/* Floating Bottom-Right Container with User Status Dock & Toast */}
      <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2.5 max-w-[340px]">
        {/* Subtle Offline Toast above dock (shown when offline > 30s) */}
        {showOfflineToast && !isOfflineToastDismissed && (
          <div
            id="dock-offline-toast"
            className="flex items-start gap-2.5 bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md border border-amber-500/40 text-slate-100 rounded-2xl p-3 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300 w-full"
          >
            <div className="p-1.5 rounded-xl bg-amber-500/15 text-amber-400 shrink-0 mt-0.5">
              <CloudOff className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center justify-between gap-1.5">
                <span className="text-xs font-bold text-amber-300 truncate">Operando em Modo Local</span>
                <button
                  id="dock-offline-toast-close-btn"
                  onClick={() => setIsOfflineToastDismissed(true)}
                  className="text-slate-400 hover:text-slate-200 transition-colors p-0.5 rounded-md hover:bg-slate-800 shrink-0 cursor-pointer"
                  title="Dispensar aviso"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 leading-relaxed">
                Você está sem conexão há mais de 30s. Suas alterações continuam sendo salvas no dispositivo e serão sincronizadas com o Firestore ao reconectar.
              </p>
              <div className="mt-2.5 flex items-center gap-2">
                <button
                  id="dock-offline-reconnect-btn"
                  onClick={() => forceCloudSync()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-semibold transition-colors cursor-pointer border border-amber-500/30"
                >
                  <RefreshCw className="h-3 w-3" />
                  Tentar Reconectar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating User Status & Logout Dock (Exact match to requested UI with compact mode) */}
        <div
          id="app-bottom-right-account-dock"
          onMouseEnter={() => {
            setIsDockCompact(false);
            if (dockInactivityTimerRef.current) clearTimeout(dockInactivityTimerRef.current);
          }}
          onMouseLeave={() => {
            resetDockTimer();
          }}
          className={`relative flex items-center bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md border text-white rounded-full p-1.5 transition-all duration-300 ${
            isDockCompact
              ? `gap-0 pr-1.5 ${
                  cloudSyncStatus === 'synced'
                    ? 'border-emerald-500/50 ring-1 ring-emerald-500/30 shadow-[0_0_14px_rgba(16,185,129,0.25)]'
                    : cloudSyncStatus === 'syncing'
                    ? 'border-amber-500/50 ring-1 ring-amber-500/30 shadow-[0_0_14px_rgba(245,158,11,0.25)] animate-pulse'
                    : 'border-rose-500/50 ring-1 ring-rose-500/30 shadow-[0_0_14px_rgba(244,63,94,0.25)]'
                }`
              : 'gap-2 pr-2 border-slate-800 hover:border-slate-700 shadow-2xl'
          }`}
        >
          <button
            onClick={() => setCurrentTab('profile')}
            className="flex items-center gap-2 group cursor-pointer focus:outline-hidden"
            title={`Perfil de ${userProfile.name} • Firestore: ${
              cloudSyncStatus === 'synced'
                ? 'Online e Sincronizado'
                : cloudSyncStatus === 'syncing'
                ? 'Sincronizando...'
                : 'Offline (Modo Local)'
            }`}
          >
            <div className="relative shrink-0">
              <div className="w-8 h-8 rounded-full bg-blue-950 border border-slate-700 overflow-hidden transition-transform group-hover:scale-105">
                <img
                  src={userProfile.avatarUrl}
                  alt={userProfile.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              {/* Visual Status Indicator (Green/Yellow/Red) with Pop Feedback */}
              <div className="absolute -bottom-0.5 -right-0.5 flex items-center justify-center pointer-events-none">
                {/* Ping ripple effect on reconnect */}
                {isReconnectedPop && (
                  <span className="absolute h-5 w-5 rounded-full bg-emerald-400 opacity-80 animate-ping" />
                )}
                <span
                  id="dock-firestore-status-indicator"
                  className={`relative w-3 h-3 rounded-full border-2 border-slate-900 transition-all duration-500 ease-out ${
                    cloudSyncStatus === 'synced'
                      ? isReconnectedPop
                        ? 'bg-emerald-400 scale-150 ring-4 ring-emerald-400/50 shadow-lg shadow-emerald-400'
                        : 'bg-emerald-500 shadow-xs shadow-emerald-500/80 scale-100'
                      : cloudSyncStatus === 'syncing'
                      ? 'bg-amber-400 shadow-xs shadow-amber-400/80 animate-pulse scale-100'
                      : 'bg-rose-500 shadow-xs shadow-rose-500/80 scale-100'
                  }`}
                  title={
                    cloudSyncStatus === 'synced'
                      ? 'Firestore Online: Conexão ativa e sincronizada'
                      : cloudSyncStatus === 'syncing'
                      ? 'Firestore: Sincronizando dados...'
                      : 'Firestore Offline: Operando em cache local'
                  }
                />
              </div>
            </div>

            {/* Collapsible Text info container */}
            <div
              className={`transition-all duration-300 overflow-hidden flex flex-col text-left ${
                isDockCompact ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-[160px] opacity-100 mr-1'
              }`}
            >
              <span className="text-xs font-bold text-slate-200 group-hover:text-sky-400 transition-colors truncate max-w-[110px]">
                {userProfile.name.split(' ')[0]}
              </span>
              <div className="flex items-center gap-1.5 whitespace-nowrap">
                <span className="text-[10px] text-emerald-400 font-medium">
                  Nv. {userProfile.level} • {userProfile.currentStreakDays}d
                </span>
                <span
                  className={`text-[9px] font-semibold px-1 rounded-sm ${
                    cloudSyncStatus === 'synced'
                      ? 'text-emerald-400/90'
                      : cloudSyncStatus === 'syncing'
                      ? 'text-amber-400/90'
                      : 'text-rose-400/90'
                  }`}
                >
                  {cloudSyncStatus === 'synced' ? '• Online' : cloudSyncStatus === 'syncing' ? '• Sync...' : '• Offline'}
                </span>
              </div>
            </div>
          </button>

          {/* Collapsible Divider, Logout Button, and Minimize Button */}
          <div
            className={`transition-all duration-300 overflow-hidden flex items-center gap-1.5 ${
              isDockCompact ? 'max-w-0 opacity-0 pointer-events-none' : 'max-w-[120px] opacity-100'
            }`}
          >
            <div className="h-4 w-px bg-slate-800 mr-1 shrink-0" />
            <button
              id="dock-logout-btn"
              onClick={logout}
              className="flex items-center gap-1.5 text-rose-500 hover:text-rose-400 text-xs font-bold transition-colors cursor-pointer px-1.5 py-1 rounded-md hover:bg-rose-500/10 whitespace-nowrap"
              title="Sair da Conta (Logout)"
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              <span className="text-xs">Sair</span>
            </button>

            {/* Discrete Minimize Button (ChevronDown) */}
            <button
              id="dock-minimize-btn"
              onClick={(e) => {
                e.stopPropagation();
                setIsDockCompact(true);
                if (dockInactivityTimerRef.current) clearTimeout(dockInactivityTimerRef.current);
              }}
              className="p-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-100 border border-slate-700/60 transition-all cursor-pointer shrink-0 ml-0.5"
              title="Minimizar caixa de conta (ChevronDown)"
              aria-label="Minimizar barra de conta"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Guided Overlay Tour for New Users */}
      <GuidedTour
        isOpen={isTourOpen}
        onClose={handleCloseTour}
        onNavigateTab={(tab) => setCurrentTab(tab)}
        currentTab={currentTab}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </AuthProvider>
  );
}
