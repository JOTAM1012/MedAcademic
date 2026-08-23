import React, { useState, useEffect } from 'react';
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

export const DashboardView: React.FC = () => {
  const {
    currentSemester,
    subjects,
    topics,
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
  const masteredTopics = topics.filter((t) => t.status === 'dominado').length;
  const totalTopics = topics.length;
  const masteryPercentage = totalTopics > 0 ? Math.round((masteredTopics / totalTopics) * 100) : 0;

  // Topics due for spaced repetition review today
  const todayStr = new Date().toISOString().split('T')[0];
  const dueTopics = topics.filter(
    (t) => t.inSpacedRepetition !== false && t.status !== 'dominado' && (!t.nextReviewDate || t.nextReviewDate <= todayStr)
  );

  // Next Exams with Live Countdown
  const upcomingExams = exams
    .filter((e) => e.date && e.grade === undefined && new Date(e.date).getTime() >= new Date().setHours(0, 0, 0, 0))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const primaryNextExam = upcomingExams[0];

  // Today's classes from schedule (1 = Mon, ..., 6 = Sat)
  const currentDayOfWeek = currentTime.getDay() === 0 ? 7 : (currentTime.getDay() as 1 | 2 | 3 | 4 | 5 | 6);
  const todaysClasses = schedule
    .filter((sc) => sc.dayOfWeek === currentDayOfWeek)
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

  return (
    <div className="space-y-6 pb-12">
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
                  Seja bem-vindo(a) ao seu Painel Acadêmico, {userProfile.name.split(' ')[0]}! 🩺
                </h2>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl">
                  Seu painel foi iniciado limpo e pronto para a sua rotina. Comece cadastrando as disciplinas do seu semestre ou explore o tutorial com todas as funcionalidades.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
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

      {/* 4-Metric Grid (from Sleek Interface design) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Hours Studied */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-slate-400 dark:text-slate-500 text-xs font-medium mb-1 block uppercase tracking-tight">
            Hours Studied (Week)
          </span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {totalHoursStudiedWeek}h
            </h3>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {weeklyGoalPercentage}% of {weeklyTarget}h
            </span>
          </div>
          <div className="mt-2 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all duration-500"
              style={{ width: `${weeklyGoalPercentage}%` }}
            />
          </div>
        </div>

        {/* Metric 2: Active Streak */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-slate-400 dark:text-slate-500 text-xs font-medium mb-1 block uppercase tracking-tight">
            Active Streak
          </span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {userProfile.currentStreakDays} Days
            </h3>
            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              Nv. {userProfile.level}
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Consistência diária inabalável</p>
        </div>

        {/* Metric 3: Topics Due */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-slate-400 dark:text-slate-500 text-xs font-medium mb-1 block uppercase tracking-tight">
            Revisões Para Hoje
          </span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {dueTopics.length} Assuntos
            </h3>
            <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
              Ciclo Adaptativo
            </span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Prontos para repetição espaçada</p>
        </div>

        {/* Metric 4: Topics Mastery */}
        <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-slate-400 dark:text-slate-500 text-xs font-medium mb-1 block uppercase tracking-tight">
            Topics Mastery
          </span>
          <div className="flex items-baseline justify-between">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">
              {masteryPercentage}%
            </h3>
            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
              {masteredTopics}/{totalTopics} Tópicos
            </span>
          </div>
          <div className="mt-2 w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${masteryPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Main Grid: Left Column & Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Schedule + Weekly Goal Breakdown + Upcoming Exams */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Schedule (Grade Horária de Hoje) - Sleek List */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Today's Schedule & Clinical Rotations
                </h3>
                <p className="text-xs text-slate-400">
                  Grade sincronizada para o dia letivo ({currentSemester?.name})
                </p>
              </div>
              <button
                onClick={() => setCurrentTab('schedule')}
                className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
              >
                <span>Grade Completa</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {todaysClasses.length === 0 ? (
              <div className="text-center py-8 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80">
                <Calendar className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                <p className="text-xs text-slate-500 font-medium">
                  Sem aulas presenciais hoje. Dia excelente para reforçar o Spaced Repetition e MedRevision!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {todaysClasses.map((item) => {
                  const subject = getSubject(item.subjectId);
                  return (
                    <div
                      key={item.id}
                      className="group flex items-center justify-between p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/40 hover:border-slate-200 dark:hover:border-slate-700 transition-all"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div
                          className="w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0"
                          style={{
                            backgroundColor: `${subject?.color || '#2563eb'}18`,
                            color: subject?.color || '#2563eb',
                          }}
                        >
                          {subject?.code || 'MED'}
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {subject?.name}
                          </h4>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>Sala: {item.room}</span>
                            <span>•</span>
                            <span className="font-semibold text-blue-600 dark:text-blue-400">{item.type}</span>
                            <span>•</span>
                            <span>{item.location || 'Campus Saúde'}</span>
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.startTime} - {item.endTime}
                        </span>
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                          Confirmado
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Academic Structure Mastery Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  Disciplinas & Domínio de Tópicos
                </h3>
                <p className="text-xs text-slate-400">
                  Acompanhamento por cadeira curricular médica
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
              {subjects.map((sub) => {
                const subTopics = topics.filter((t) => t.subjectId === sub.id);
                const subMastered = subTopics.filter((t) => t.status === 'dominado').length;
                const subPercentage = subTopics.length > 0 ? Math.round((subMastered / subTopics.length) * 100) : 0;
                return (
                  <div
                    key={sub.id}
                    onClick={() => setCurrentTab('structure')}
                    className="p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-950/30 hover:border-blue-300 dark:hover:border-blue-800 cursor-pointer transition-all"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: sub.color }} />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {sub.name}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5">
                      <span>Domínio:</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {subMastered}/{subTopics.length} tópicos ({subPercentage}%)
                      </span>
                    </div>
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

        {/* Right 1 Col: Hero Countdown Card + Spaced Repetition Action + Achievements */}
        <div className="space-y-6">
          {/* Next Exam Hero Countdown Card (from Sleek Interface design) */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-lg shadow-blue-200/50 dark:shadow-none relative overflow-hidden">
            <div className="relative z-10">
              <span className="bg-white/20 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                Next Major Exam
              </span>

              {primaryNextExam ? (
                <>
                  <h2 className="text-xl font-bold mt-2 leading-tight">
                    {primaryNextExam.title}
                  </h2>
                  <p className="text-blue-100 text-xs mt-0.5">
                    {primarySubject?.name || 'Medicina'} • Peso {primaryNextExam.weight}
                  </p>

                  <div className="mt-5 flex gap-2">
                    <div className="bg-white/20 backdrop-blur-md rounded-lg p-2.5 text-center flex-1">
                      <span className="block text-xl font-black">
                        {primaryCountdown?.days || 0}
                      </span>
                      <span className="text-[9px] uppercase tracking-tighter text-blue-100">
                        Days
                      </span>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md rounded-lg p-2.5 text-center flex-1">
                      <span className="block text-xl font-black">
                        {primaryCountdown?.hours || 0}
                      </span>
                      <span className="text-[9px] uppercase tracking-tighter text-blue-100">
                        Hours
                      </span>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md rounded-lg p-2.5 text-center flex-1">
                      <span className="block text-xl font-black">
                        {primaryCountdown?.minutes || 0}
                      </span>
                      <span className="text-[9px] uppercase tracking-tighter text-blue-100">
                        Mins
                      </span>
                    </div>
                    <div className="bg-white/20 backdrop-blur-md rounded-lg p-2.5 text-center flex-1">
                      <span className="block text-xl font-black">
                        {primaryCountdown?.seconds || 0}
                      </span>
                      <span className="text-[9px] uppercase tracking-tighter text-blue-100">
                        Secs
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/15 flex items-center justify-between text-xs text-blue-100">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Calendar className="w-3.5 h-3.5" />
                      {primaryNextExam.date} às {primaryNextExam.time || '08:00'}
                    </span>
                    <button
                      onClick={() => setCurrentTab('grades')}
                      className="font-bold underline hover:text-white"
                    >
                      Ver detalhes
                    </button>
                  </div>
                </>
              ) : (
                <div className="py-6 text-center">
                  <p className="text-xs text-blue-100">Nenhuma prova pendente agendada.</p>
                  <button
                    onClick={() => setCurrentTab('grades')}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white text-blue-800 font-bold text-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Agendar Avaliação
                  </button>
                </div>
              )}
            </div>

            {/* Background Medical Illustration Decor */}
            <div className="absolute -right-6 -bottom-6 opacity-10 pointer-events-none">
              <Stethoscope className="w-48 h-48" />
            </div>
          </div>

          {/* Spaced Repetition Action Box */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Repeat className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                    Repetição Espaçada de Assuntos
                  </h4>
                  <p className="text-[11px] text-slate-400">Curva do Esquecimento</p>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[10px] font-bold text-blue-700 dark:text-blue-300">
                {dueTopics.length} Pendentes
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              Consolide a memória de longo prazo com ciclos adaptativos (Disciplina → Matéria → Assunto) para diagnósticos e condutas.
            </p>

            <button
              id="dashboard-start-spaced-review-btn"
              onClick={() => setCurrentTab('spaced_repetition')}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors shadow-xs"
            >
              <Repeat className="w-4 h-4" />
              <span>Iniciar Sessão de Revisão</span>
            </button>
          </div>

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
