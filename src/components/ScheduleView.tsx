import React from 'react';
import { SemesterView } from './semester/SemesterView';

interface ScheduleViewProps {
  onOpenAddSchedule?: (dayNum?: number) => void;
}

// A grade de horários agora faz parte da aba Semestre (semana e mês)
export const ScheduleView: React.FC<ScheduleViewProps> = () => <SemesterView />;
