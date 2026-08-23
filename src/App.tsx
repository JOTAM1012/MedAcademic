import React, { useState } from 'react';
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

const AppContent: React.FC = () => {
  const { currentTab, isOnboardingOpen, setIsOnboardingOpen, userProfile } = useApp();

  // If user has not completed initial profile creation wizard, show the initial profile creation page
  if (!userProfile.onboardingCompleted) {
    return <ProfileCreationPage />;
  }

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
            onOpenAddSemester={() => setIsAddSemesterOpen(true)}
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
        return <GradesManagementView onOpenAddExam={handleOpenAddExam} />;
      case 'schedule':
        return (
          <ScheduleView onOpenAddSchedule={(dayNum) => handleOpenAddSchedule(dayNum)} />
        );
      case 'calendar':
        return <CalendarView />;
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
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
