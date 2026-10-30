import React, { useState } from 'react';
import {
  Sparkles,
  Plus,
  RotateCw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  ChevronRight,
  BookOpen,
  Award,
  Zap,
  Tag,
  Search,
  CheckSquare,
  HelpCircle,
  Video,
  FileText,
  User,
  Calendar,
  Timer,
  ArrowRight,
  TrendingUp,
  BookmarkCheck,
  ChevronDown,
  Trash2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Topic, PreferredStudyMethod, TopicDifficulty } from '../types';
import { SpacedRepetitionRulesCard } from './SpacedRepetitionRulesCard';
import { getReviewsDone, REVIEWS_TO_MASTER } from '../data/topicStatus';

interface SpacedRepetitionViewProps {
  onOpenAddTopic?: () => void;
}

export const SpacedRepetitionView: React.FC<SpacedRepetitionViewProps> = ({
  onOpenAddTopic,
}) => {
  const {
    topics,
    subjects,
    reviewTopicSpacedRepetition,
    deleteTopic,
    setCurrentTab,
    setTimerSubject,
    addXp,
    updateTopic,
    triggerConfetti,
  } = useApp();

  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'upcoming' | 'mastered'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Study Session Mode
  const [isStudySessionActive, setIsStudySessionActive] = useState<boolean>(false);
  const [sessionCurrentIndex, setSessionCurrentIndex] = useState<number>(0);
  const [sessionCompletedCount, setSessionCompletedCount] = useState<number>(0);
  const [reviewMethod, setReviewMethod] = useState<string>("questoes");
  const [reviewQuestions, setReviewQuestions] = useState<number | "">("");
  const [reviewTimeMinutes, setReviewTimeMinutes] = useState<number | "">("");

  const todayStr = new Date().toISOString().split('T')[0];

  // Topics in spaced repetition
  // Only topics already marked as "Visto" enter the review cycle
  const spacedTopics = topics.filter((t) => t.inSpacedRepetition !== false && t.status !== 'nao_iniciado');

  // Filter due topics for today
  const dueTopics = spacedTopics.filter((t) => {
    if (t.status === 'dominado') return false;
    if (t.status === 'nao_iniciado') {
      if (t.scheduleFirstContact && t.firstContactDate) {
        return t.firstContactDate <= todayStr;
      }
      return true;
    }
    if (!t.nextReviewDate) return true;
    return t.nextReviewDate <= todayStr;
  });

  // Filter mastered topics
  const masteredTopics = spacedTopics.filter((t) => t.status === 'dominado');

  // Filter upcoming topics
  const upcomingTopics = spacedTopics.filter((t) => {
    if (t.status === 'dominado') return false;
    if (t.status === 'nao_iniciado') {
      if (t.scheduleFirstContact && t.firstContactDate) {
        return t.firstContactDate > todayStr;
      }
      return false;
    }
    return t.nextReviewDate && t.nextReviewDate > todayStr;
  });

  // Filtered list for display
  const filteredTopics = spacedTopics.filter((topic) => {
    // Subject filter
    if (selectedSubjectFilter !== 'all' && topic.subjectId !== selectedSubjectFilter) {
      return false;
    }

    // Status filter
    if (statusFilter === 'due') {
      const isDue = (!topic.nextReviewDate || topic.nextReviewDate <= todayStr) && topic.status !== 'dominado';
      if (!isDue) return false;
    } else if (statusFilter === 'upcoming') {
      const isUpcoming = topic.nextReviewDate && topic.nextReviewDate > todayStr && topic.status !== 'dominado';
      if (!isUpcoming) return false;
    } else if (statusFilter === 'mastered') {
      if (topic.status !== 'dominado') return false;
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const subject = subjects.find((s) => s.id === topic.subjectId);
      const matchesTitle = topic.title.toLowerCase().includes(query);
      const matchesModule = (topic.moduleName || '').toLowerCase().includes(query);
      const matchesSubject = (subject?.name || '').toLowerCase().includes(query);
      const matchesNotes = (topic.notes || '').toLowerCase().includes(query);
      return matchesTitle || matchesModule || matchesSubject || matchesNotes;
    }

    return true;
  });

  // Sort: Due today first, then closest upcoming date, then mastered
  filteredTopics.sort((a, b) => {
    if (a.status === 'dominado' && b.status !== 'dominado') return 1;
    if (a.status !== 'dominado' && b.status === 'dominado') return -1;
    const dateA = a.nextReviewDate || '9999';
    const dateB = b.nextReviewDate || '9999';
    return dateA.localeCompare(dateB);
  });

  const getMethodIcon = (method?: PreferredStudyMethod) => {
    switch (method) {
      case 'questoes':
        return <HelpCircle className="h-3.5 w-3.5" />;
      case 'videoaula':
        return <Video className="h-3.5 w-3.5" />;
      case 'resumo':
        return <FileText className="h-3.5 w-3.5" />;
      case 'livros':
        return <BookOpen className="h-3.5 w-3.5" />;
      case 'pessoal':
        return <User className="h-3.5 w-3.5" />;
      default:
        return <HelpCircle className="h-3.5 w-3.5" />;
    }
  };

  const getMethodLabel = (topic: Topic) => {
    if (topic.preferredStudyMethods?.[0] === 'questoes') {
      return topic.questionCount ? `${topic.questionCount} Questões` : 'Questões';
    }
    switch (topic.preferredStudyMethods?.[0]) {
      case 'videoaula':
        return 'Videoaula';
      case 'resumo':
        return 'Resumo Clínico';
      case 'livros':
        return 'Leitura / Livros';
      case 'pessoal':
        return 'Estudo Pessoal';
      default:
        return 'Questões';
    }
  };

  const getReviewStatusBadge = (topic: Topic) => {
    if (topic.status === 'dominado') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Award className="h-3 w-3" /> Dominado
        </span>
      );
    }

    if (!topic.nextReviewDate || topic.nextReviewDate <= todayStr) {
      const isToday = topic.nextReviewDate === todayStr;
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
          <AlertCircle className="h-3 w-3" /> {isToday ? 'Revisar Hoje' : 'Revisão Atrasada'}
        </span>
      );
    }

    // Upcoming
    const parts = topic.nextReviewDate.split('-');
    const formatted = parts.length === 3 ? `${parts[2]}/${parts[1]}` : topic.nextReviewDate;
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
        <Calendar className="h-3 w-3" /> {formatted}
      </span>
    );
  };

  // Study Session Active Topic
  const activeSessionTopic = dueTopics[sessionCurrentIndex];
  const activeSessionSubject = activeSessionTopic
    ? subjects.find((s) => s.id === activeSessionTopic.subjectId)
    : undefined;

  const handleSessionRating = (rating: 'dificil' | 'medio' | 'facil' | 'dominado') => {
    if (!activeSessionTopic) return;
    reviewTopicSpacedRepetition(activeSessionTopic.id, rating);
    setSessionCompletedCount((prev) => prev + 1);

    // Save metrics
    if (reviewTimeMinutes || reviewQuestions) {
      updateTopic(activeSessionTopic.id, {
        questionCount: (activeSessionTopic.questionCount || 0) + (Number(reviewQuestions) || 0),
        estimatedHours: (activeSessionTopic.estimatedHours || 0) + (Number(reviewTimeMinutes) || 0) / 60
      });
      // Optionally we could add studySession here, but `updateTopic` might be enough.
    }

    setReviewMethod('questoes');
    setReviewQuestions('');
    setReviewTimeMinutes('');

    if (sessionCurrentIndex >= dueTopics.length - 1) {
      setIsStudySessionActive(false);
      triggerConfetti();
      addXp(150, 'Sessão de Revisões Finalizada');
    } else {
      setSessionCurrentIndex((prev) => prev + 1);
    }
  };

  const handleStartTimerForTopic = (topic: Topic) => {
    setTimerSubject(topic.subjectId, topic.id);
    setCurrentTab('stopwatch');
  };

  return (
    <div id="tour-spaced-repetition" className="space-y-6 pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Repetição Espaçada de Assuntos
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              Curva do Esquecimento de Ebbinghaus
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Hierarquia: <strong className="text-slate-700 dark:text-slate-300">Disciplina → Matéria → Detalhe do Assunto</strong> com intervalos adaptativos.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenAddTopic}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-md hover:shadow-lg transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Novo Assunto de Estudo</span>
          </button>
        </div>
      </div>

      {/* Spaced Repetition Rules Card */}
      <SpacedRepetitionRulesCard />

      {/* Metrics Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="text-[11px] font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider">
            Para Revisar Hoje
          </div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">
            {dueTopics.length}
          </div>
          <div className="text-[10px] text-rose-700/70 dark:text-rose-400/70">
            Assuntos pendentes
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-sky-200 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20">
          <div className="text-[11px] font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider">
            Total no Ciclo
          </div>
          <div className="text-2xl font-black text-sky-700 dark:text-sky-400 mt-1">
            {spacedTopics.length}
          </div>
          <div className="text-[10px] text-sky-700/70 dark:text-sky-400/70">
            Assuntos cadastrados
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">
            Próximos 7 Dias
          </div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">
            {upcomingTopics.length}
          </div>
          <div className="text-[10px] text-amber-700/70 dark:text-amber-400/70">
            Revisões agendadas
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
            Assuntos Dominados
          </div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">
            {masteredTopics.length}
          </div>
          <div className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70">
            Retenção consolidada
          </div>
        </div>
      </div>

      {/* Interactive Guided Review Session Launcher */}
      {dueTopics.length > 0 && !isStudySessionActive && (
        <div className="rounded-3xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500 text-white">
                <Zap className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Sessão Guiada de Revisão ({dueTopics.length} assuntos para hoje)
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Percorra os assuntos do dia com cronômetro integrado, resolva as questões e avance nos ciclos de memorização.
            </p>
          </div>

          <button
            onClick={() => {
              setSessionCurrentIndex(0);
              setIsStudySessionActive(true);
            }}
            className="shrink-0 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
          >
            <Zap className="h-4 w-4" />
            <span>Iniciar Revisão do Dia</span>
          </button>
        </div>
      )}

      {/* Active Guided Study Session */}
      {isStudySessionActive && activeSessionTopic && (
        <div className="rounded-3xl border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeSessionSubject?.color || '#0284c7' }}
              />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">
                {activeSessionSubject?.name} • {activeSessionTopic.moduleName}
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                Assunto {sessionCurrentIndex + 1} de {dueTopics.length}
              </span>
              <button
                onClick={() => setIsStudySessionActive(false)}
                className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                Pausar Sessão
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  {getMethodIcon(activeSessionTopic.preferredStudyMethods?.[0])}
                  {getMethodLabel(activeSessionTopic)}
                </span>
                <span className="text-xs text-slate-400">
                  Revisão {Math.min(REVIEWS_TO_MASTER, getReviewsDone(activeSessionTopic) + 1)} de {REVIEWS_TO_MASTER}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                {activeSessionTopic.title}
              </h2>
            </div>

            {activeSessionTopic.description && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                <p className="font-bold text-slate-900 dark:text-white mb-1">
                  Diretrizes & Foco de Estudo:
                </p>
                {activeSessionTopic.description}
              </div>
            )}

            {activeSessionTopic.imageUrl && (
              <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950/80 p-2 flex flex-col items-center">
                <img
                  src={activeSessionTopic.imageUrl}
                  alt={activeSessionTopic.imageCaption || activeSessionTopic.title}
                  referrerPolicy="no-referrer"
                  className="max-h-64 w-auto object-contain rounded-xl"
                />
                {activeSessionTopic.imageCaption && (
                  <p className="text-[11px] font-semibold text-slate-300 mt-2 text-center">
                    📸 {activeSessionTopic.imageCaption}
                  </p>
                )}
              </div>
            )}

            {activeSessionTopic.notes && (
              <div className="p-3.5 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-900 dark:text-amber-200">
                <strong>Anotação Clínica:</strong> {activeSessionTopic.notes}
              </div>
            )}
          </div>

          {/* User Review Inputs */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">
              Métricas da Revisão
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Método Utilizado</label>
                <select
                  value={reviewMethod}
                  onChange={(e) => setReviewMethod(e.target.value)}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-sky-500"
                >
                  <option value="questoes">Questões</option>
                  <option value="videoaula">Videoaula</option>
                  <option value="resumo">Resumo</option>
                  <option value="livros">Livros / Texto</option>
                  <option value="pessoal">Pessoal / Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Qtd. Questões</label>
                <input
                  type="number"
                  placeholder="Ex: 15"
                  value={reviewQuestions}
                  onChange={(e) => setReviewQuestions(parseInt(e.target.value) || '')}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Tempo (minutos)</label>
                <input
                  type="number"
                  placeholder="Ex: 45"
                  value={reviewTimeMinutes}
                  onChange={(e) => setReviewTimeMinutes(parseInt(e.target.value) || '')}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>
          </div>

          {/* Review Evaluation Rating */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 text-center">
              Como foi seu desempenho nesta revisão?
            </p>
            <div className="grid grid-cols-3 gap-2.5">
              <button
                onClick={() => handleSessionRating('dificil')}
                className="flex flex-col items-center p-3 rounded-xl border border-rose-200 dark:border-rose-900/40 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 font-bold hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all shadow-xs"
              >
                <span className="text-xs">🔴 Difícil</span>
                <span className="text-[10px] text-rose-500 dark:text-rose-400 font-normal">
                  Intervalo menor
                </span>
              </button>

              <button
                onClick={() => handleSessionRating('medio')}
                className="flex flex-col items-center p-3 rounded-xl border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 font-bold hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-all shadow-xs"
              >
                <span className="text-xs">🟡 Médio</span>
                <span className="text-[10px] text-amber-500 dark:text-amber-400 font-normal">
                  Intervalo padrão
                </span>
              </button>

              <button
                onClick={() => handleSessionRating('facil')}
                className="flex flex-col items-center p-3 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all shadow-xs"
              >
                <span className="text-xs">🟢 Fácil</span>
                <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-normal">
                  Intervalo maior
                </span>
              </button>

            </div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Todos ({spacedTopics.length})
          </button>
          <button
            onClick={() => setStatusFilter('due')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'due'
                ? 'bg-rose-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            🚨 Hoje ({dueTopics.length})
          </button>
          <button
            onClick={() => setStatusFilter('upcoming')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'upcoming'
                ? 'bg-sky-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            ⏳ Próximos ({upcomingTopics.length})
          </button>
          <button
            onClick={() => setStatusFilter('mastered')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              statusFilter === 'mastered'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            🏆 Dominados ({masteredTopics.length})
          </button>
        </div>

        {/* Subject Filter & Search Input */}
        <div className="flex items-center gap-2">
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
          >
            <option value="all">Todas as Disciplinas</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>

          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar assunto..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Main List of Study Topics in Spaced Repetition */}
      <div className="space-y-3.5">
        {filteredTopics.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
            <BookmarkCheck className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">
              Nenhum assunto encontrado para este filtro
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
              Adicione um novo assunto de estudo seguindo a hierarquia Disciplina → Matéria → Detalhe.
            </p>
            <button
              onClick={onOpenAddTopic}
              className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors"
            >
              + Adicionar Novo Assunto
            </button>
          </div>
        ) : (
          filteredTopics.map((topic) => {
            const subject = subjects.find((s) => s.id === topic.subjectId);
            const currentStep = getReviewsDone(topic); // revisões concluídas (0–4)

            return (
              <div
                key={topic.id}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-sky-300 dark:hover:border-sky-700 transition-all space-y-4"
              >
                {/* Topic Top Meta Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Subject badge */}
                    <span
                      className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-white shadow-2xs"
                      style={{ backgroundColor: subject?.color || '#0284c7' }}
                    >
                      {subject?.code || 'DISC'} • {subject?.name}
                    </span>

                    {/* Module / Matéria badge */}
                    {topic.moduleName && (
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                        {topic.moduleName}
                      </span>
                    )}

                    {/* Method badge */}
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-100 dark:border-sky-900/40 flex items-center gap-1">
                      {getMethodIcon(topic.preferredStudyMethods?.[0])}
                      {getMethodLabel(topic)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {getReviewStatusBadge(topic)}
                  </div>
                </div>

                {/* Title & Notes */}
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">
                    {topic.title}
                  </h3>
                  {topic.description && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {topic.description}
                    </p>
                  )}
                  {topic.imageUrl && (
                    <div className="mt-2.5 p-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800 flex items-center gap-3">
                      <img
                        src={topic.imageUrl}
                        alt={topic.imageCaption || topic.title}
                        referrerPolicy="no-referrer"
                        className="h-16 w-24 object-cover rounded-lg shrink-0 border border-slate-200 dark:border-slate-700"
                      />
                      <div className="min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                          Imagem Anexada
                        </span>
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 truncate">
                          {topic.imageCaption || 'Esquema / Imagem de Apoio'}
                        </p>
                      </div>
                    </div>
                  )}
                  {topic.notes && (
                    <p className="text-xs text-amber-700 dark:text-amber-400 font-medium mt-1">
                      💡 {topic.notes}
                    </p>
                  )}
                </div>

                {/* Hierarchy & Cycle Progress Bar */}
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>Revisões: <strong className="text-slate-700 dark:text-slate-200">{currentStep}/{REVIEWS_TO_MASTER}</strong></span>
                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          currentStep >= 1
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        R1 · 1d
                      </span>
                      <ArrowRight className="h-2.5 w-2.5 text-slate-400" />
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          currentStep >= 2
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        R2 · 7d
                      </span>
                      <ArrowRight className="h-2.5 w-2.5 text-slate-400" />
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          currentStep >= 3
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        R3 · 15d
                      </span>
                      <ArrowRight className="h-2.5 w-2.5 text-slate-400" />
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          currentStep >= 4
                            ? 'bg-sky-600 text-white'
                            : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                        }`}
                      >
                        R4 · 30d
                      </span>
                    </div>
                  </div>

                  {/* 1st Contact & Last Review dates */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400">
                    {topic.firstContactDate && (
                      <span>
                        1º Contato: <strong className="text-slate-700 dark:text-slate-300">{topic.firstContactDate}</strong>
                        {topic.studyTime && ` às ${topic.studyTime}`}
                      </span>
                    )}
                    {topic.lastStudiedDate && (
                      <span>
                        Última: <strong className="text-slate-700 dark:text-slate-300">{topic.lastStudiedDate}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons for this Topic */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-400 mr-1">
                      {topic.status === 'dominado' ? 'Dominado — 4 revisões concluídas' : `Concluir revisão ${Math.min(REVIEWS_TO_MASTER, currentStep + 1)}/${REVIEWS_TO_MASTER}:`}
                    </span>
                    {topic.status !== 'dominado' && (
                    <>
                    <button
                      onClick={() => reviewTopicSpacedRepetition(topic.id, 'dificil')}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 transition-colors"
                      title="Revisão feita com dificuldade: próxima vem mais cedo"
                    >
                      🔴 Difícil
                    </button>
                    <button
                      onClick={() => reviewTopicSpacedRepetition(topic.id, 'medio')}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 transition-colors"
                      title="Revisão feita: intervalo padrão até a próxima"
                    >
                      🟡 Médio
                    </button>
                    <button
                      onClick={() => reviewTopicSpacedRepetition(topic.id, 'facil')}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 transition-colors"
                      title="Revisão fácil: próxima demora mais"
                    >
                      🟢 Fácil
                    </button>
                    </>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleStartTimerForTopic(topic)}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950 transition-colors"
                    >
                      <Timer className="h-3.5 w-3.5" />
                      <span>Cronômetro</span>
                    </button>

                    <button
                      onClick={() => deleteTopic(topic.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Remover do ciclo"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
