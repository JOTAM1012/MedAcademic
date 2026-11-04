import React, { useState } from 'react';
import { AlertCircle, Award, Calendar, Search, Timer, Zap, ArrowRight, BookmarkCheck, ClipboardCheck, Layers, ClipboardList } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TopicBlock, TopicDifficulty } from '../types';
import { SpacedRepetitionRulesCard } from './SpacedRepetitionRulesCard';
import { QuestionLogModal } from './modals/QuestionLogModal';
import { getMedicalArea, getSpecialty } from '../data/areas';
import {
  BLOCK_REVIEWS_TO_MASTER,
  FIRST_REVIEW_DAY,
  PLAN_ORDER,
  REVIEW_PLANS,
  addDaysYMD,
  cycleDay,
  difficultyFromScore,
  formatDM,
  isBlockDue,
  nextIntervalDays,
  suggestedPlan,
  ymd,
} from '../data/blockReview';

interface SpacedRepetitionViewProps {
  onOpenAddTopic?: () => void;
}

const RATING_STYLE: Record<TopicDifficulty, string> = {
  dificil: 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border-rose-200 dark:border-rose-900/40',
  medio: 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 hover:bg-amber-100 border-amber-200 dark:border-amber-900/40',
  facil: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 border-emerald-200 dark:border-emerald-900/40',
};

// Repetição espaçada por BLOCO: Dia 0 = bloco concluído, 1ª revisão no Dia 7; a avaliação
// (Difícil/Médio/Fácil) define a próxima data e a sugestão de estudo para esse dia.
export const SpacedRepetitionView: React.FC<SpacedRepetitionViewProps> = () => {
  const { topicBlocks, topics, subjects, reviewTopicBlock, addQuestionLog, setCurrentTab, setTimerMode, addXp, triggerConfetti } = useApp();

  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'due' | 'upcoming' | 'mastered'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isQuestionLogOpen, setIsQuestionLogOpen] = useState(false);
  const [questionLogBlock, setQuestionLogBlock] = useState<string | undefined>();

  // Sessão guiada
  const [isStudySessionActive, setIsStudySessionActive] = useState(false);
  const [sessionCurrentIndex, setSessionCurrentIndex] = useState(0);
  const [reviewQuestions, setReviewQuestions] = useState<number | ''>('');
  const [reviewCorrect, setReviewCorrect] = useState<number | ''>('');
  const [reviewTimeMinutes, setReviewTimeMinutes] = useState<number | ''>('');

  const todayStr = ymd(new Date());
  const subjectOf = (b: TopicBlock) => subjects.find((s) => s.id === b.subjectId);
  const colorOf = (b: TopicBlock) => {
    const sub = subjectOf(b);
    return sub ? getSpecialty(sub.specialty)?.color || getMedicalArea(sub.majorArea).color : '#0284c7';
  };
  const blockTopicsOf = (b: TopicBlock) => topics.filter((t) => t.blockId === b.id);

  // Só entram no ciclo os blocos concluídos (todos os tópicos vistos)
  const cycleBlocks = topicBlocks.filter((b) => b.reviewStatus !== 'estudando' && subjects.some((s) => s.id === b.subjectId));
  const studyingCount = topicBlocks.filter((b) => b.reviewStatus === 'estudando').length;
  const dueBlocks = cycleBlocks.filter((b) => isBlockDue(b, todayStr)).sort((a, b) => (a.nextReviewDate || '').localeCompare(b.nextReviewDate || ''));
  const masteredBlocks = cycleBlocks.filter((b) => b.reviewStatus === 'dominado');
  const upcomingBlocks = cycleBlocks.filter((b) => b.reviewStatus === 'revisao' && !!b.nextReviewDate && b.nextReviewDate > todayStr);
  const next7Count = upcomingBlocks.filter((b) => b.nextReviewDate! <= addDaysYMD(7)).length;

  const filteredBlocks = cycleBlocks
    .filter((b) => {
      if (selectedSubjectFilter !== 'all' && b.subjectId !== selectedSubjectFilter) return false;
      if (statusFilter === 'due' && !isBlockDue(b, todayStr)) return false;
      if (statusFilter === 'upcoming' && !(b.reviewStatus === 'revisao' && b.nextReviewDate && b.nextReviewDate > todayStr)) return false;
      if (statusFilter === 'mastered' && b.reviewStatus !== 'dominado') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const sub = subjectOf(b);
        return (
          b.name.toLowerCase().includes(q) ||
          (sub?.name || '').toLowerCase().includes(q) ||
          blockTopicsOf(b).some((t) => t.title.toLowerCase().includes(q))
        );
      }
      return true;
    })
    .sort((a, b) => {
      if (a.reviewStatus === 'dominado' && b.reviewStatus !== 'dominado') return 1;
      if (a.reviewStatus !== 'dominado' && b.reviewStatus === 'dominado') return -1;
      return (a.nextReviewDate || '9999').localeCompare(b.nextReviewDate || '9999');
    });

  const getReviewStatusBadge = (b: TopicBlock) => {
    if (b.reviewStatus === 'dominado') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <Award className="h-3 w-3" /> Dominado
        </span>
      );
    }
    const day = cycleDay(b, b.nextReviewDate);
    if (isBlockDue(b, todayStr)) {
      const isToday = b.nextReviewDate === todayStr;
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
          <AlertCircle className="h-3 w-3" /> {isToday ? 'Revisar Hoje' : 'Revisão Atrasada'} · R{b.reviewsDone + 1}
          {day !== undefined && ` · Dia ${day}`}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
        <Calendar className="h-3 w-3" /> R{b.reviewsDone + 1} · {formatDM(b.nextReviewDate)}
        {day !== undefined && ` · Dia ${day}`}
      </span>
    );
  };

  // Plano / sugestão de estudo para a revisão agendada
  const renderSuggestion = (b: TopicBlock, emphasize: boolean) => {
    if (b.reviewStatus === 'dominado') return null;
    const plan = suggestedPlan(b);
    const when = isBlockDue(b, todayStr) ? 'hoje' : `em ${formatDM(b.nextReviewDate)}`;
    return (
      <div
        className={`rounded-xl border px-3 py-2 text-xs ${emphasize ? 'font-semibold' : ''}`}
        style={
          plan
            ? { borderColor: plan.color + '55', backgroundColor: plan.color + '12', color: plan.color }
            : { borderColor: '#0284c755', backgroundColor: '#0284c712', color: '#0284c7' }
        }
      >
        {plan ? (
          <>
            📋 Sugestão para {when} ({plan.emoji} {plan.label}): <strong>{plan.steps.join(' + ')}</strong>
          </>
        ) : (
          <>
            📋 1ª revisão (Dia {FIRST_REVIEW_DAY}) {when}: revise o bloco como preferir e avalie a dificuldade. A avaliação define a próxima data e a sugestão de
            estudo.
          </>
        )}
      </div>
    );
  };

  // Prévia do que cada botão agenda
  const ratingPreview = (b: TopicBlock, level: TopicDifficulty) => {
    const done = b.reviewsDone + 1;
    if (done >= BLOCK_REVIEWS_TO_MASTER) return 'conclui → Dominado';
    const days = nextIntervalDays(level, done);
    return `próxima em ${days}d · ${REVIEW_PLANS[level].questions}Q`;
  };

  // Questões informadas no card (opcional) entram no registro da revisão e no total do semestre
  const [cardQ, setCardQ] = useState<Record<string, { total: string; correct: string }>>({});
  const rate = (b: TopicBlock, level: TopicDifficulty) => {
    const q = cardQ[b.id];
    const total = Number(q?.total) || 0;
    const correct = q && q.correct !== '' ? Math.min(Number(q.correct) || 0, total) : undefined;
    reviewTopicBlock(b.id, level, total ? { questions: total, correct } : undefined);
    if (total > 0 && correct !== undefined) addQuestionLog({ kind: 'block', blockId: b.id, subjectId: b.subjectId, total, correct });
    setCardQ(({ [b.id]: _, ...rest }) => rest);
  };

  // Linha "Revisões feitas": R · data · dia do ciclo · questões · dificuldade
  const renderReviewHistory = (b: TopicBlock) => {
    const log = b.reviewLog || [];
    if (log.length === 0) return null;
    return (
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950/60 text-[11px] font-black uppercase tracking-wide text-slate-500">
          Revisões feitas ({log.length}/{BLOCK_REVIEWS_TO_MASTER})
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[11px] min-w-[460px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wide text-slate-400">
                <th className="px-3 py-1.5 font-bold">Revisão</th>
                <th className="px-2 py-1.5 font-bold">Concluída em</th>
                <th className="px-2 py-1.5 font-bold">Questões</th>
                <th className="px-2 py-1.5 font-bold">Acertos</th>
                <th className="px-3 py-1.5 font-bold text-right">Dificuldade</th>
              </tr>
            </thead>
            <tbody>
              {log.map((r, i) => {
                const day = cycleDay(b, r.date);
                const hasQ = !!r.questions;
                const p = hasQ && r.correct !== undefined ? Math.round((r.correct / r.questions!) * 100) : undefined;
                const plan = REVIEW_PLANS[r.difficulty];
                return (
                  <tr key={i} className="border-t border-slate-100 dark:border-slate-800">
                    <td className="px-3 py-1.5">
                      <span className="font-black px-1.5 py-0.5 rounded bg-sky-600 text-white">R{i + 1} ✓</span>
                    </td>
                    <td className="px-2 py-1.5 text-slate-700 dark:text-slate-200 font-semibold whitespace-nowrap">
                      {formatDM(r.date)}
                      {day !== undefined && <span className="text-slate-400 font-normal"> · Dia {day}</span>}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {hasQ ? <span className="font-semibold text-slate-700 dark:text-slate-200">Sim · {r.questions}</span> : <span className="text-slate-400">Não</span>}
                    </td>
                    <td className="px-2 py-1.5 whitespace-nowrap">
                      {p !== undefined ? (
                        <span>
                          <span className="text-slate-600 dark:text-slate-300">{r.correct}/{r.questions}</span>{' '}
                          <strong className={p >= 80 ? 'text-emerald-600 dark:text-emerald-400' : p >= 60 ? 'text-amber-600 dark:text-amber-400' : 'text-rose-600 dark:text-rose-400'}>
                            {p}%
                          </strong>
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right whitespace-nowrap">
                      <span className="font-bold" style={{ color: plan.color }}>
                        {plan.emoji} {plan.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {b.reviewStatus === 'revisao' && b.nextReviewDate && (
                <tr className="border-t border-dashed border-slate-200 dark:border-slate-700 bg-amber-50/50 dark:bg-amber-950/10">
                  <td className="px-3 py-1.5">
                    <span className="font-black px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300">R{b.reviewsDone + 1}</span>
                  </td>
                  <td className="px-2 py-1.5 text-slate-600 dark:text-slate-300 whitespace-nowrap" colSpan={4}>
                    Próxima em <strong>{formatDM(b.nextReviewDate)}</strong>
                    {cycleDay(b, b.nextReviewDate) !== undefined && ` · Dia ${cycleDay(b, b.nextReviewDate)}`}
                    {suggestedPlan(b) && ` · sugestão: ${suggestedPlan(b)!.steps.join(' + ')}`}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const activeSessionBlock = dueBlocks[sessionCurrentIndex];

  const handleSessionRating = (level: TopicDifficulty) => {
    if (!activeSessionBlock) return;
    const total = Number(reviewQuestions) || 0;
    const correct = reviewCorrect === '' ? undefined : Math.min(Number(reviewCorrect) || 0, total);
    reviewTopicBlock(activeSessionBlock.id, level, { questions: total || undefined, correct });
    if (total > 0 && correct !== undefined) {
      addQuestionLog({ kind: 'block', blockId: activeSessionBlock.id, subjectId: activeSessionBlock.subjectId, total, correct });
    }
    setReviewQuestions('');
    setReviewCorrect('');
    setReviewTimeMinutes('');
    // O bloco avaliado sai de "hoje": o próximo assume o mesmo índice
    if (dueBlocks.length <= 1) {
      setIsStudySessionActive(false);
      triggerConfetti();
      addXp(150, 'Sessão de Revisões Finalizada');
    } else if (sessionCurrentIndex >= dueBlocks.length - 1) {
      setSessionCurrentIndex(0);
    }
  };

  const startTimerFor = (b: TopicBlock) => {
    setTimerMode('pomodoro', b.subjectId);
    setCurrentTab('stopwatch');
  };

  const sessionScore =
    reviewQuestions && reviewCorrect !== '' ? difficultyFromScore(Number(reviewCorrect), Number(reviewQuestions)) : undefined;

  return (
    <div id="tour-spaced-repetition" className="space-y-6 pb-16">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Repetição Espaçada de Blocos</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              Curva do Esquecimento de Ebbinghaus
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Hierarquia: <strong className="text-slate-700 dark:text-slate-300">Disciplina → Bloco → Tópicos</strong>. O bloco entra aqui quando todos os tópicos forem
            vistos (Dia 0).
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            id="open-question-log-btn"
            onClick={() => {
              setQuestionLogBlock(undefined);
              setIsQuestionLogOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black shadow-md transition-all"
          >
            <ClipboardCheck className="h-4 w-4" /> Registrar questões
          </button>
          <button
            onClick={() => setCurrentTab('structure')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold"
          >
            <Layers className="h-4 w-4" /> Disciplinas
          </button>
        </div>
      </div>

      <SpacedRepetitionRulesCard />

      {/* Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/40 bg-rose-50/50 dark:bg-rose-950/20">
          <div className="text-[11px] font-bold text-rose-900 dark:text-rose-300 uppercase tracking-wider">Para Revisar Hoje</div>
          <div className="text-2xl font-black text-rose-700 dark:text-rose-400 mt-1">{dueBlocks.length}</div>
          <div className="text-[10px] text-rose-700/70 dark:text-rose-400/70">Blocos pendentes</div>
        </div>
        <div className="p-4 rounded-2xl border border-sky-200 dark:border-sky-900/40 bg-sky-50/50 dark:bg-sky-950/20">
          <div className="text-[11px] font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider">Total no Ciclo</div>
          <div className="text-2xl font-black text-sky-700 dark:text-sky-400 mt-1">{cycleBlocks.length}</div>
          <div className="text-[10px] text-sky-700/70 dark:text-sky-400/70">{studyingCount} blocos ainda em estudo</div>
        </div>
        <div className="p-4 rounded-2xl border border-amber-200 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20">
          <div className="text-[11px] font-bold text-amber-900 dark:text-amber-300 uppercase tracking-wider">Próximos 7 Dias</div>
          <div className="text-2xl font-black text-amber-700 dark:text-amber-400 mt-1">{next7Count}</div>
          <div className="text-[10px] text-amber-700/70 dark:text-amber-400/70">Revisões agendadas</div>
        </div>
        <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
          <div className="text-[11px] font-bold text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">Blocos Dominados</div>
          <div className="text-2xl font-black text-emerald-700 dark:text-emerald-400 mt-1">{masteredBlocks.length}</div>
          <div className="text-[10px] text-emerald-700/70 dark:text-emerald-400/70">Retenção consolidada</div>
        </div>
      </div>

      {/* Sessão guiada */}
      {dueBlocks.length > 0 && !isStudySessionActive && (
        <div className="rounded-3xl border border-amber-200 dark:border-amber-900/50 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-amber-500 text-white">
                <Zap className="h-4 w-4" />
              </span>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">Sessão Guiada de Revisão ({dueBlocks.length} blocos para hoje)</h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">Percorra os blocos do dia com a sugestão de estudo de cada um e avalie como foi.</p>
          </div>
          <button
            onClick={() => {
              setSessionCurrentIndex(0);
              setIsStudySessionActive(true);
            }}
            className="shrink-0 px-5 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <Zap className="h-4 w-4" /> Iniciar Revisão do Dia
          </button>
        </div>
      )}

      {isStudySessionActive && activeSessionBlock && (
        <div id="guided-review-session" className="rounded-3xl border border-sky-300 dark:border-sky-800 bg-white dark:bg-slate-900 p-6 shadow-xl space-y-5 animate-in fade-in">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: colorOf(activeSessionBlock) }} />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">
                {subjectOf(activeSessionBlock)?.universitySubject || subjectOf(activeSessionBlock)?.name}
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-xs font-bold text-sky-600 dark:text-sky-400">
                Bloco {sessionCurrentIndex + 1} de {dueBlocks.length}
              </span>
              <button onClick={() => setIsStudySessionActive(false)} className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                Pausar Sessão
              </button>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <span className="text-xs text-slate-400">
                Revisão {Math.min(BLOCK_REVIEWS_TO_MASTER, activeSessionBlock.reviewsDone + 1)} de {BLOCK_REVIEWS_TO_MASTER}
                {cycleDay(activeSessionBlock, todayStr) !== undefined && ` · Dia ${cycleDay(activeSessionBlock, todayStr)}`}
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">{activeSessionBlock.name}</h2>
            </div>
            {renderSuggestion(activeSessionBlock, true)}
            <div className="flex flex-wrap gap-1.5">
              {blockTopicsOf(activeSessionBlock).map((t) => (
                <span key={t.id} className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {t.title}
                </span>
              ))}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3">Métricas da Revisão</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Qtd. Questões</label>
                <input
                  type="number"
                  placeholder={String(suggestedPlan(activeSessionBlock)?.questions || 20)}
                  value={reviewQuestions}
                  onChange={(e) => setReviewQuestions(parseInt(e.target.value) || '')}
                  className="w-full text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-slate-700 dark:text-slate-300 focus:outline-hidden focus:border-sky-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">Acertos</label>
                <input
                  type="number"
                  placeholder="Ex: 17"
                  value={reviewCorrect}
                  onChange={(e) => setReviewCorrect(e.target.value === '' ? '' : parseInt(e.target.value) || 0)}
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
            {sessionScore && (
              <p className="text-[11px] mt-2 font-semibold" style={{ color: REVIEW_PLANS[sessionScore].color }}>
                {Math.round((Number(reviewCorrect) / Number(reviewQuestions)) * 100)}% de acertos · sugestão: {REVIEW_PLANS[sessionScore].label}
              </p>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-3 text-center">Como foi seu desempenho nesta revisão?</p>
            <div className="grid grid-cols-3 gap-2.5">
              {PLAN_ORDER.map((level) => (
                <button
                  key={level}
                  onClick={() => handleSessionRating(level)}
                  className={`flex flex-col items-center p-3 rounded-xl border font-bold transition-all shadow-xs ${RATING_STYLE[level]} ${
                    sessionScore === level ? 'ring-2 ring-offset-2 ring-sky-500 dark:ring-offset-slate-900' : ''
                  }`}
                >
                  <span className="text-xs">
                    {REVIEW_PLANS[level].emoji} {REVIEW_PLANS[level].label}
                  </span>
                  <span className="text-[10px] font-normal opacity-80">{ratingPreview(activeSessionBlock, level)}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {(
            [
              ['all', `Todos (${cycleBlocks.length})`, 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'],
              ['due', `🚨 Hoje (${dueBlocks.length})`, 'bg-rose-600 text-white'],
              ['upcoming', `⏳ Próximos (${upcomingBlocks.length})`, 'bg-sky-600 text-white'],
              ['mastered', `🏆 Dominados (${masteredBlocks.length})`, 'bg-emerald-600 text-white'],
            ] as const
          ).map(([id, label, active]) => (
            <button
              key={id}
              onClick={() => setStatusFilter(id)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                statusFilter === id ? active : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
          >
            <option value="all">Todas as Disciplinas</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.universitySubject || s.name}
              </option>
            ))}
          </select>
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar bloco..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
            />
          </div>
        </div>
      </div>

      {/* Lista de blocos no ciclo */}
      <div className="space-y-3.5">
        {filteredBlocks.length === 0 ? (
          <div className="p-12 text-center rounded-3xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900">
            <BookmarkCheck className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Nenhum bloco neste filtro</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto mb-4">
              Marque todos os tópicos de um bloco como vistos na aba Disciplinas: esse dia vira o Dia 0 e a 1ª revisão aparece aqui no Dia {FIRST_REVIEW_DAY}.
            </p>
            <button onClick={() => setCurrentTab('structure')} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold">
              Abrir disciplinas
            </button>
          </div>
        ) : (
          filteredBlocks.map((b) => {
            const sub = subjectOf(b);
            const color = colorOf(b);
            const list = blockTopicsOf(b);
            const done = b.reviewsDone;
            return (
              <div
                key={b.id}
                className="group rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs hover:border-sky-300 dark:hover:border-sky-700 transition-all space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg text-white shadow-2xs" style={{ backgroundColor: color }}>
                      {getMedicalArea(sub?.majorArea).short} • {sub?.universitySubject || sub?.name}
                    </span>
                    <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700">
                      {list.length} tópico{list.length === 1 ? '' : 's'}
                    </span>
                    {suggestedPlan(b) && b.reviewStatus !== 'dominado' && (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md text-white" style={{ backgroundColor: suggestedPlan(b)!.color }}>
                        {suggestedPlan(b)!.label} · {suggestedPlan(b)!.questions}Q
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">{getReviewStatusBadge(b)}</div>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white leading-snug">{b.name}</h3>
                  {list.length > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                      {list.slice(0, 8).map((t) => t.title).join(' · ')}
                      {list.length > 8 && ` · +${list.length - 8}`}
                    </p>
                  )}
                </div>

                {renderSuggestion(b, isBlockDue(b, todayStr))}

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/70 dark:border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                    <span>
                      Revisões: <strong className="text-slate-700 dark:text-slate-200">{done}/{BLOCK_REVIEWS_TO_MASTER}</strong>
                    </span>
                    <div className="flex items-center gap-1 flex-wrap">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-700 text-white">Dia 0</span>
                      {Array.from({ length: BLOCK_REVIEWS_TO_MASTER }, (_, i) => {
                        const isNext = i === done && b.reviewStatus === 'revisao';
                        const day =
                          i < done ? cycleDay(b, b.reviewLog?.[i]?.date) : isNext ? cycleDay(b, b.nextReviewDate) : i === 0 ? FIRST_REVIEW_DAY : undefined;
                        return (
                          <React.Fragment key={i}>
                            <ArrowRight className="h-2.5 w-2.5 text-slate-400" />
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                done > i
                                  ? 'bg-sky-600 text-white'
                                  : isNext
                                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 ring-1 ring-amber-500/50'
                                  : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                              }`}
                              title={done > i ? 'Revisão concluída' : isNext ? 'Próxima revisão' : 'Data definida pela avaliação anterior'}
                            >
                              R{i + 1}
                              {day !== undefined ? ` · Dia ${day}` : ''}
                              {done > i ? ' ✓' : ''}
                            </span>
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                    {b.completedDate && (
                      <span>
                        Dia 0: <strong className="text-slate-700 dark:text-slate-300">{formatDM(b.completedDate)}</strong>
                      </span>
                    )}
                    {b.lastReviewDate && (
                      <span>
                        Última: <strong className="text-slate-700 dark:text-slate-300">{formatDM(b.lastReviewDate)}</strong>
                      </span>
                    )}
                  </div>
                </div>

                {renderReviewHistory(b)}

                {b.reviewStatus !== 'dominado' && (
                  <div className="flex flex-wrap items-center gap-2 text-[11px]">
                    <span className="font-bold text-slate-500">Questões nesta revisão (opcional):</span>
                    <input
                      type="number"
                      min="0"
                      placeholder={String(suggestedPlan(b)?.questions || 'Feitas')}
                      value={cardQ[b.id]?.total || ''}
                      onChange={(e) => setCardQ((q) => ({ ...q, [b.id]: { total: e.target.value, correct: q[b.id]?.correct || '' } }))}
                      className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-sky-500"
                      aria-label={`Questões feitas em ${b.name}`}
                    />
                    <span className="text-slate-400">feitas</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="Acertos"
                      value={cardQ[b.id]?.correct || ''}
                      onChange={(e) => setCardQ((q) => ({ ...q, [b.id]: { total: q[b.id]?.total || '', correct: e.target.value } }))}
                      className="w-20 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1 font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-sky-500"
                      aria-label={`Acertos em ${b.name}`}
                    />
                    <span className="text-slate-400">acertos</span>
                    {Number(cardQ[b.id]?.total) > 0 && cardQ[b.id]?.correct !== '' && cardQ[b.id]?.correct !== undefined && (
                      <strong className="text-slate-700 dark:text-slate-200">
                        {Math.round((Math.min(Number(cardQ[b.id].correct), Number(cardQ[b.id].total)) / Number(cardQ[b.id].total)) * 100)}%
                      </strong>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-slate-400 mr-1">
                      {b.reviewStatus === 'dominado'
                        ? 'Dominado — 4 revisões concluídas'
                        : `Concluir revisão ${Math.min(BLOCK_REVIEWS_TO_MASTER, done + 1)}/${BLOCK_REVIEWS_TO_MASTER}:`}
                    </span>
                    {b.reviewStatus !== 'dominado' &&
                      PLAN_ORDER.map((level) => (
                        <button
                          key={level}
                          onClick={() => rate(b, level)}
                          className={`flex flex-col items-start px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors ${RATING_STYLE[level]}`}
                          title={`Revisão feita: ${ratingPreview(b, level)}`}
                        >
                          <span>
                            {REVIEW_PLANS[level].emoji} {REVIEW_PLANS[level].label}
                          </span>
                          <span className="text-[9px] font-semibold opacity-75">{ratingPreview(b, level)}</span>
                        </button>
                      ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setQuestionLogBlock(b.id);
                        setIsQuestionLogOpen(true);
                      }}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950 transition-colors"
                    >
                      <ClipboardList className="h-3.5 w-3.5" /> Questões
                    </button>
                    <button
                      onClick={() => startTimerFor(b)}
                      className="flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950 transition-colors"
                    >
                      <Timer className="h-3.5 w-3.5" /> Cronômetro
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <QuestionLogModal isOpen={isQuestionLogOpen} onClose={() => setIsQuestionLogOpen(false)} defaultBlockId={questionLogBlock} />
    </div>
  );
};
