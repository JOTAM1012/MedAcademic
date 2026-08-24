import React, { useState } from 'react';
import { LogOut, Stethoscope } from 'lucide-react';
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

// Modals
import { AddSubjectModal } from './components/modals/AddSubjectModal';
import { AddTopicModal } from './components/modals/AddTopicModal';
import { AddExamModal } from './components/modals/AddExamModal';
import { AddSemesterModal } from './components/modals/AddSemesterModal';
import { AddScheduleModal } from './components/modals/AddScheduleModal';
import { OnboardingModal } from './components/modals/OnboardingModal';
import { AuthModal } from './components/modals/AuthModal';

const AppContent: React.FC = () => {
  const { activeUserId, logout } = useAuth();
  const {
    currentTab,
    setCurrentTab,
    isOnboardingOpen,
    setIsOnboardingOpen,
    userProfile,
    isInitialLoadComplete,
  } = useApp();

  // Mobile menu state
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Modals state
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isAddTopicOpen, setIsAddTopicOpen] = useState(false);
  const [isAddExamOpen, setIsAddExamOpen] = useState(false);
  const [isAddSemesterOpen, setIsAddSemesterOpen] = useState(false);
  const [isAddScheduleOpen, setIsAddScheduleOpen] = useState(false);
  const [selectedDayForScheduleModal, setSelectedDayForScheduleModal] = useState<number | undefined>();
  const [activeSubjectIdForModal, setActiveSubjectIdForModal] = useState<string | undefined>();

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

  // If user has not completed initial profile creation wizard, show the initial profile creation page
  if (!userProfile.onboardingCompleted) {
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
        <TopBar onToggleMobileMenu={() => setIsMobileMenuOpen(true)} />

        {/* Dynamic Scrollable Page Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-7xl w-full mx-auto">
          {renderActiveView()}
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

      {/* Floating Bottom-Right User Status & Logout Dock (Exact match to requested UI) */}
      <div
        id="app-bottom-right-account-dock"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2.5 bg-slate-900/95 dark:bg-slate-900/95 backdrop-blur-md border border-slate-800 text-white rounded-full pl-1.5 pr-3 py-1.5 shadow-2xl transition-all hover:border-slate-700"
      >
        <button
          onClick={() => setCurrentTab('profile')}
          className="flex items-center gap-2 group cursor-pointer focus:outline-hidden"
          title={`Perfil de ${userProfile.name}`}
        >
          <div className="w-8 h-8 rounded-full bg-blue-950 border border-slate-700 overflow-hidden shrink-0 transition-transform group-hover:scale-105">
            <img
              src={userProfile.avatarUrl}
              alt={userProfile.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="hidden sm:flex flex-col text-left mr-1">
            <span className="text-xs font-bold text-slate-200 group-hover:text-sky-400 transition-colors truncate max-w-[110px]">
              {userProfile.name.split(' ')[0]}
            </span>
            <span className="text-[10px] text-emerald-400 font-medium">
              Nv. {userProfile.level} • {userProfile.currentStreakDays}d
            </span>
          </div>
        </button>

        <div className="h-4 w-px bg-slate-800" />

        <button
          id="dock-logout-btn"
          onClick={logout}
          className="flex items-center gap-1.5 text-rose-500 hover:text-rose-400 text-xs font-bold transition-colors cursor-pointer px-1 py-0.5 rounded-md hover:bg-rose-500/10"
          title="Sair da Conta (Logout)"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span className="text-xs">Sair</span>
        </button>
      </div>
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
