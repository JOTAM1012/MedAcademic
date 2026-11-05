import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Clock,
  Flame,
  Award,
  GraduationCap,
  Calendar,
  Sparkles,
  Play,
  Repeat,
  CheckCircle2,
  BookOpen,
  ArrowRight,
  Plus,
  Stethoscope,
  TrendingUp,
  AlertCircle,
  Activity,
  Check,
  ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { OwnerName } from './OwnerName';
import { getActivityCategory, getExamKind, getExamSubjectName, occursOn, toYMD } from '../data/planning';
import { isBlockDue } from '../data/blockReview';
import { InstallAppBanner } from './InstallAppGuide';
import { SemesterStatusCard } from './SemesterStatusCard';
import { DashboardInsights } from './dashboard/DashboardInsights';

export const DashboardView: React.FC = () => {
  const {
    currentSemester,
    subjects,
    topics,
    topicBlocks,
    exams,
    schedule,
    achievements,
    userProfile,
    studySessions,
    setCurrentTab,
    setTimerMode,
    startTimer,
    setIsOnboardingOpen,
  } = useApp();

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute Weekly study hours
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
  const recentSessions = studySessions.filter((s) => new Date(s.timestamp) >= sevenDaysAgo);
  const totalMinutesStudiedWeek = recentSessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const totalHoursStudiedWeek = (totalMinutesStudiedWeek / 60).toFixed(1);
  const weeklyTarget = userProfile.weeklyTargetHours || 30;
  const weeklyGoalPercentage = Math.min(100, Math.round((Number(totalHoursStudiedWeek) / weeklyTarget) * 100));

  // Compute Topics Mastery
  // Domínio = blocos com as 4 revisões concluídas
  const masteredTopics = topicBlocks.filter((b) => b.reviewStatus !== 'estudando' && b.reviewsDone >= 4).length;
  const totalTopics = topicBlocks.length;
  const masteryPercentage = totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0;

  // Topics due for spaced repetition review today
  const todayStr = new Date().toISOString().split('T')[0];
  const dueTopics = topicBlocks.filter((b) => isBlockDue(b, todayStr));

  // Next Exams with Live Countdown
  const upcomingExams = exams
    .filter((e) => e.date && e.grade === undefined && new Date(e.date).getTime() >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const primaryNextExam = upcomingExams[0];

  // Today's classes from schedule (1 = Mon, ..., 6 = Sat)
  const currentDayOfWeek = currentTime.getDay() === 0 ? 7 : (currentTime.getDay() as 1 | 2 | 3 | 4 | 5 | 6);
  const todaysClasses = schedule
    .filter((sc) => occursOn(sc, toYMD(currentTime), currentDayOfWeek))
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  // Countdown Calculator helper
  const getExamCountdown = (examDateStr: string, examTimeStr?: string) => {
    const targetDate = new Date(`${examDateStr}T${examTimeStr || '08:00'}:00`);
    const diffMs = targetDate.getTime() - currentTime.getTime();

    if (diffMs <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, isToday: true };
    }

    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

    return { days, hours, minutes, seconds, isToday: days === 0 };
  };

  const getSubject = (subjectId: string) => subjects.find((s) => s.id === subjectId);

  const primaryCountdown = primaryNextExam
    ? getExamCountdown(primaryNextExam.date, primaryNextExam.time)
    : null;
  const primarySubject = primaryNextExam ? getSubject(primaryNextExam.subjectId) : null;

  const isReturning = userProfile.onboardingCompleted;

  return (
    <div id="tour-dashboard" className="space-y-6 pb-12">
      <InstallAppBanner />
      {/* Clean Slate / First Steps Guide Banner */}
      {subjects.length === 0 && (
        <div className="rounded-2xl border border-sky-200 dark:border-sky-800/80 bg-gradient-to-r from-sky-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80 p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-sky-500 text-white flex items-center justify-center shadow-md shadow-sky-500/20 shrink-0">
                <Stethoscope className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white">
                  {isReturning 
                    ? `Seja bem-vindo(a) novamente ao seu Painel Acadêmico, ${userProfile.name.split(' ')[0]}! 🩺`
                    : `Seja bem-vindo(a) ao seu Painel Acadêmico, ${userProfile.name.split(' ')[0]}! 🩺`}
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
                  {isReturning 
                    ? "Sua jornada rumo à excelência médica continua. Mantenha o foco, sua dedicação de hoje constrói o grande profissional de amanhã!"
                    : "Seu painel foi iniciado limpo e pronto para a sua rotina. Comece cadastrando suas disciplinas ou explore o tutorial com todas as funcionalidades."}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                id="dashboard-tutorial-btn"
                onClick={() => setIsOnboardingOpen(true)}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                <span>Ver Tutorial</span>
              </button>
              <button
                onClick={() => setCurrentTab('structure')}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-blue-500/20 flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Matéria</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {subjects.length > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white leading-snug">
              Seja bem-vindo(a) novamente, <OwnerName name={userProfile.name.split(' ')[0]} />! 🩺
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Sua jornada rumo à excelência médica continua. Mantenha o foco, sua dedicação de hoje constrói o grande profissional de amanhã!
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              id="dashboard-how-to-use-btn"
              onClick={() => setIsOnboardingOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 text-sky-700 dark:text-sky-300 hover:bg-sky-100 dark:hover:bg-sky-900/60 text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-sky-500" />
              <span>Como Usar a Plataforma</span>
            </button>
          </div>
        </div>
      )}

      {/* Novo painel: filtros, métricas reais, hoje, evolução, áreas, horas, tabela e constância */}
      <DashboardInsights />

      <SemesterStatusCard />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* Academic Structure Mastery Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Disciplinas & progresso
                </h3>
                <p className="text-xs text-slate-400">
                  Tópicos vistos e blocos concluídos de cada disciplina
                </p>
              </div>
              <button
                onClick={() => setCurrentTab('structure')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Ver Disciplinas</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {subjects.filter((s) => !s.semesterId || s.semesterId === currentSemester?.id).map((sub) => {
                const subTopics = topics.filter((t) => t.subjectId === sub.id);
                const subSeen = subTopics.filter((t) => t.status !== 'nao_iniciado').length;
                const subBlocks = topicBlocks.filter((b) => b.subjectId === sub.id);
                const subBlocksDone = subBlocks.filter((b) => b.reviewStatus !== 'estudando').length;
                const subPercentage = subTopics.length > 0 ? Math.round((subSeen / subTopics.length) * 100) : 0;
                return (
                  <div
                    key={sub.id}
                    onClick={() => setCurrentTab('structure')}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 hover:border-blue-300 dark:hover:border-blue-800 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {sub.universitySubject || sub.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                      <span>{subTopics.length ? `${subSeen}/${subTopics.length} tópicos vistos` : 'Sem tópicos'}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {subPercentage}%
                      </span>
                    </div>
                    {subBlocks.length > 0 && (
                      <div className="text-[10px] text-slate-400 mb-1.5">
                        {subBlocksDone}/{subBlocks.length} blocos concluídos (em revisão)
                      </div>
                    )}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ backgroundColor: sub.color, width: `${subPercentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
        <div>
          {/* Gamification & Badges Showcase */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Conquistas & Gamificação
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    {achievements.filter((a) => a.unlockedAt).length} de {achievements.length} badges
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                {userProfile.totalXp} XP
              </span>
            </div>

            <div className="space-y-2.5">
              {achievements.slice(0, 3).map((ach) => {
                const isUnlocked = !!ach.unlockedAt;
                return (
                  <div
                    key={ach.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isUnlocked
                        ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/40 dark:bg-emerald-950/20'
                        : 'border-slate-100 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/20 opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 ${
                          isUnlocked
                            ? 'bg-emerald-500 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        <Award className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                          {ach.title}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">{ach.description}</div>
                      </div>
                    </div>

                    <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 shrink-0 ml-2">
                      +{ach.xpReward} XP
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
