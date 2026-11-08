import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Stethoscope, CloudOff, RefreshCw, X, ChevronDown, Trash2 } from 'lucide-react';
import { AuthProvider, useAuth, isLocalOnly } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { MobileTabBar } from './components/MobileTabBar';
import { AccessProvider } from './context/AccessContext';
import { AccessGate } from './components/AccessGate';
import { AnnouncementBanner } from './components/AnnouncementBanner';
import { OwnerPanelView } from './components/OwnerPanelView';
import { OwnerName } from './components/OwnerName';
import { CARTOON_AVATARS } from './data/avatars';
import { useAccess } from './context/AccessContext';
import { StudyTimeModal } from './components/modals/StudyTimeModal';
import { DashboardView } from './components/DashboardView';
import { AcademicStructureView } from './components/AcademicStructureView';
import { SpacedRepetitionView } from './components/SpacedRepetitionView';
import { StudyStopwatchView } from './components/StudyStopwatchView';
import { SemesterView } from './components/semester/SemesterView';
import { CalendarView } from './components/CalendarView';
import { ProfileView } from './components/ProfileView';
import { CustomizeView } from './components/CustomizeView';
import { ChecklistView } from './components/ChecklistView';
import { ProfileCreationPage } from './components/ProfileCreationPage';
import { GuidedTour } from './components/GuidedTour';
import { MethodGuideModal } from './components/guide/MethodGuideModal';
import { PersonalStudiesView } from './components/PersonalStudiesView';
import { InstallAppModal } from './components/InstallAppGuide';
import { OPEN_INSTALL_EVENT } from './lib/pwaInstall';

// Modals
import { AddSubjectModal } from './components/modals/AddSubjectModal';
import { AddTopicModal } from './components/modals/AddTopicModal';
import { AddExamModal } from './components/modals/AddExamModal';
import { AddSemesterModal } from './components/modals/AddSemesterModal';
import { AddScheduleModal } from './components/modals/AddScheduleModal';
import { OnboardingModal } from './components/modals/OnboardingModal';
import { StudyRoutineModal } from './components/plan/StudyRoutineModal';
import { userLocalKey, writeLocal } from './components/plan/planShared';
import { AuthModal } from './components/modals/AuthModal';

const AppContent: React.FC = () => {
  const { activeUserId, activeUser, logout, isDeleting, isSigningUp } = useAuth();
  const { isOwner: isOwnerAccount } = useAccess();
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
    methodGuide,
    openMethodGuide,
    methodGuideSeen,
    tourRequestAt,
  } = useApp();

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Guided Tour State
  const [isTourOpen, setIsTourOpen] = useState(false);
  // Outras telas pedem o tour pelo contexto (requestTour)
  useEffect(() => {
    if (tourRequestAt) setIsTourOpen(true);
  }, [tourRequestAt]);

  // Janela "Instalar app" (aberta por openInstallGuide() de qualquer tela)
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  useEffect(() => {
    const open = () => setIsInstallOpen(true);
    window.addEventListener(OPEN_INSTALL_EVENT, open);
    return () => window.removeEventListener(OPEN_INSTALL_EVENT, open);
  }, []);

  const tourSeenKey = `medacademic_tour_seen_${activeUserId || 'guest'}`;
  // The guided tour no longer opens by itself (returning users kept seeing it on every new
  // login/device). New accounts get the welcome guide once; the tour stays under "Ajuda & Tour".

  const markTourSeen = () => {
    try {
      localStorage.setItem(tourSeenKey, 'true');
    } catch (e) {}
  };

  // Conta nova: tour primeiro; ao terminar ou pular, o app "aperta" o botão "Como Usar a Plataforma"
  const newUserFlowRef = useRef(false);
  // Enquanto o fluxo de conta nova está entre uma janela e outra (tour → "Como usar"),
  // o guia rápido do método não pode abrir no meio
  const [isShellFlowBusy, setIsShellFlowBusy] = useState(false);
  const [isRoutineSurveyOpen, setIsRoutineSurveyOpen] = useState(false);
  useEffect(() => {
    const start = () => {
      let pending = false;
      try {
        pending = sessionStorage.getItem('medacademic_new_user_welcome') === '1';
        sessionStorage.removeItem('medacademic_new_user_welcome');
      } catch {}
      if (!pending) return;
      newUserFlowRef.current = true;
      setIsShellFlowBusy(true);
      setCurrentTab('dashboard');
      setTimeout(() => setIsRoutineSurveyOpen(true), 400);
    };
    window.addEventListener('medacademic:new-user-welcome', start);
    start();
    return () => window.removeEventListener('medacademic:new-user-welcome', start);
  }, []);

  const pressHowToUse = () => {
    setIsShellFlowBusy(true);
    setCurrentTab('dashboard');
    setTimeout(() => {
      const btn = document.getElementById('dashboard-how-to-use-btn') || document.getElementById('dashboard-tutorial-btn');
      if (btn) {
        btn.scrollIntoView({ block: 'center', behavior: 'smooth' });
        btn.classList.add('how-to-press');
        setTimeout(() => btn.classList.remove('how-to-press'), 1200);
      }
      setTimeout(() => {
        setIsOnboardingOpen(true);
        setIsShellFlowBusy(false);
      }, btn ? 700 : 0);
    }, 350);
  };

  // Pesquisa respondida: não abre de novo no Planner e segue para o tour
  const handleCloseRoutineSurvey = () => {
    setIsRoutineSurveyOpen(false);
    writeLocal(userLocalKey('routine_setup_shown', userProfile.email), '1');
    setTimeout(() => setIsTourOpen(true), 350);
  };

  const handleCloseTour = () => {
    setIsTourOpen(false);
    markTourSeen();
    if (newUserFlowRef.current) {
      newUserFlowRef.current = false;
      pressHowToUse();
    } else {
      setIsShellFlowBusy(false);
    }
  };

  // Guia rápido do Método (3 telas): abre sozinho UMA vez para quem ainda não viu — inclusive
  // usuários antigos —, só depois de carregar a nuvem e sem tour, "Como usar" ou criação de perfil
  // abertos. Na conta nova ele vem por último: tour → "Como usar a plataforma" → guia rápido.
  const isSetupDone =
    userProfile.onboardingCompleted || Boolean(activeUser && activeUser.onboardingCompleted) || subjects.length > 0;
  const autoGuideUserRef = useRef<string | null>(null);
  useEffect(() => {
    if (!activeUserId || autoGuideUserRef.current === activeUserId) return;
    if (methodGuideSeen || methodGuide.open) return;
    if (!isInitialLoadComplete || cloudSyncStatus === 'syncing') return;
    if (isTourOpen || isOnboardingOpen || isEditingProfileSetup || !isSetupDone || isShellFlowBusy || isRoutineSurveyOpen) return;
    // pequena espera: deixa a tela assentar e evita abrir no meio de uma troca de janela
    const t = setTimeout(() => {
      autoGuideUserRef.current = activeUserId;
      openMethodGuide(-1);
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeUserId,
    methodGuideSeen,
    methodGuide.open,
    isInitialLoadComplete,
    cloudSyncStatus,
    isTourOpen,
    isOnboardingOpen,
    isEditingProfileSetup,
    isSetupDone,
    isShellFlowBusy,
    isRoutineSurveyOpen,
  ]);

  // Modals state
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [isAddSemesterOpen, setIsAddSemesterOpen] = useState(false);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [selectedDayForScheduleModal, setSelectedDayForScheduleModal] = useState<number | undefined>();
  const [activeSubjectIdForModal, setActiveSubjectIdForModal] = useState<string | undefined>();
  const [dateForModal, setDateForModal] = useState<string | undefined>();

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
    // "Criar novo usuário": profile wizard first, e-mail & password on its last step
    return isSigningUp ? <ProfileCreationPage signupMode /> : <AuthModal isPage={true} />;
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

  const handleOpenAddExam = (date?: string) => {
    setDateForModal(date);
    setIsAddExamOpen(true);
  };

  const handleOpenAddSchedule = (dayNum?: number, date?: string) => {
    setSelectedDayForScheduleModal(dayNum);
    setDateForModal(date);
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
      case 'stopwatch':
        return <StudyStopwatchView />;
      // Avaliações e Grade de horários viraram uma aba só (links antigos caem nela)
      case 'semester':
      case 'grades':
      case 'schedule':
        return <SemesterView />;
      case 'calendar':
        return (
          <CalendarView
            onOpenAddExam={handleOpenAddExam}
            onOpenAddSchedule={handleOpenAddSchedule}
            onOpenAddTopic={handleOpenAddTopic}
          />
        );
      case 'admin':
        return <OwnerPanelView />;
      // O Histórico agora fica dentro do Perfil
      case 'customize':
        return <CustomizeView />;
      case 'profile':
      case 'history':
        return <ProfileView />;
      case 'checklist':
        return <ChecklistView />;
      case 'personal':
        return <PersonalStudiesView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <AccessGate>
    <div className="flex h-screen h-[100dvh] w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 transition-colors">
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
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 pb-36 lg:pb-6 max-w-7xl w-full mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 12, scale: 0.995 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.995 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              <AnnouncementBanner />
              {renderActiveView()}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* Abas fixas no rodapé (celular / app) */}
      <MobileTabBar />
      <StudyTimeModal />

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
        defaultDate={dateForModal}
      />

      <AddSemesterModal
        isOpen={isAddSemesterOpen}
        onClose={() => setIsAddSemesterOpen(false)}
      />

      <AddScheduleModal
        isOpen={isAddScheduleOpen}
        onClose={() => setIsAddScheduleOpen(false)}
        defaultDay={selectedDayForScheduleModal}
        defaultDate={dateForModal}
      />

      <OnboardingModal
        isOpen={isOnboardingOpen}
        onClose={() => {
          // The welcome guide already covers the tour; don't chain a second tutorial after it
          markTourSeen();
          setIsOnboardingOpen(false);
        }}
      />

      <AuthModal />

      {/* Guia "Como funciona o Método MedAcademic" (completo ou modo rápido do 1º acesso) */}
      <MethodGuideModal />

      {/* Aviso de modo offline (o cartão do usuário fica na barra lateral) */}
      <div className="fixed bottom-[calc(84px+env(safe-area-inset-bottom,0px))] lg:bottom-4 right-3 lg:right-4 z-40 flex flex-col items-end gap-2.5 max-w-[340px]">
        {/* Subtle Offline Toast above dock (shown when offline > 30s) */}
        {showOfflineToast && !isOfflineToastDismissed && !isLocalOnly && (
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
                Você está sem conexão há mais de 30s. Suas alterações continuam sendo salvas no dispositivo e serão sincronizadas com a nuvem ao reconectar.
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

      </div>

      <InstallAppModal isOpen={isInstallOpen} onClose={() => setIsInstallOpen(false)} />

      {/* Conta nova: pesquisa de perfil e rotina (3 perguntas obrigatórias + opcionais) */}
      <StudyRoutineModal open={isRoutineSurveyOpen} required onClose={handleCloseRoutineSurvey} />

      {/* Guided Overlay Tour for New Users */}
      <GuidedTour
        isOpen={isTourOpen}
        onClose={handleCloseTour}
        onNavigateTab={(tab) => setCurrentTab(tab)}
        currentTab={currentTab}
      />
    </div>
    </AccessGate>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AccessProvider>
      <AppProvider>
        <AppContent />
      </AppProvider>
      </AccessProvider>
    </AuthProvider>
  );
}
