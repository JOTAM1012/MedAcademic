import React, { useMemo, useState } from 'react';
import { Repeat, CalendarClock, Layers, Trophy, Play, X, Check, ChevronDown, AlertTriangle, Sparkles, Timer } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Subject, TopicBlock, TopicDifficulty } from '../types';
import { getMedicalArea, getSpecialty } from '../data/areas';
import {
  BLOCK_REVIEWS_TO_MASTER,
  PLAN_ORDER,
  REVIEW_PLANS,
  difficultyFromScore,
  isBlockDue,
  isTopicSeen,
  ymd,
} from '../data/blockReview';

interface SpacedRepetitionViewProps {
  onOpenAddTopic?: () => void;
}

const WEEKDAYS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

const parseYMD = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const daysBetween = (from: string, to: string) => Math.round((parseYMD(to).getTime() - parseYMD(from).getTime()) / 86400000);
const dateLabel = (s: string, today: string) => {
  const diff = daysBetween(today, s);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  const d = parseYMD(s);
  return `${WEEKDAYS[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// Revisões espaçadas por BLOCO, com plano sugerido conforme a dificuldade (Fácil 15Q · Médio 20Q · Difícil 30Q)
export const SpacedRepetitionView: React.FC<SpacedRepetitionViewProps> = () => {
  const { topicBlocks, topics, subjects, reviewTopicBlock, setTimerMode, setCurrentTab, showNotification } = useApp();

  const [session, setSession] = useState<TopicBlock | null>(null);
  const [plan, setPlan] = useState<TopicDifficulty>('medio');
  const [stepsDone, setStepsDone] = useState<Record<number, boolean>>({});
  const [questions, setQuestions] = useState('');
  const [correct, setCorrect] = useState('');
  const [showTopics, setShowTopics] = useState(false);
  const [showMastered, setShowMastered] = useState(false);

  const today = ymd(new Date());
  const subjectOf = (b: TopicBlock) => subjects.find((s) => s.id === b.subjectId);
  const colorOf = (sub?: Subject) => (sub ? getSpecialty(sub.specialty)?.color || getMedicalArea(sub.majorArea).color : '#64748b');
  const subtitleOf = (sub?: Subject) => {
    if (!sub) return 'Sem disciplina';
    const area = getMedicalArea(sub.majorArea);
    const name = sub.universitySubject || sub.name;
    return name === area.id ? name : `${name} · ${area.id}`;
  };

  const blocks = topicBlocks.filter((b) => subjects.some((s) => s.id === b.subjectId));
  const due = useMemo(
    () => blocks.filter((b) => isBlockDue(b, today)).sort((a, b) => (a.nextReviewDate || '').localeCompare(b.nextReviewDate || '')),
    [blocks, today]
  );
  const upcoming = blocks
    .filter((b) => b.reviewStatus === 'revisao' && b.nextReviewDate && b.nextReviewDate > today)
    .sort((a, b) => a.nextReviewDate!.localeCompare(b.nextReviewDate!));
  const studying = blocks.filter((b) => b.reviewStatus === 'estudando');
  const mastered = blocks.filter((b) => b.reviewStatus === 'dominado');
  const overdueCount = due.filter((b) => b.nextReviewDate! < today).length;
  const next7 = upcoming.filter((b) => daysBetween(today, b.nextReviewDate!) <= 7).length;

  const upcomingByDate = useMemo(() => {
    const map = new Map<string, TopicBlock[]>();
    upcoming.slice(0, 40).forEach((b) => map.set(b.nextReviewDate!, [...(map.get(b.nextReviewDate!) || []), b]));
    return Array.from(map.entries());
  }, [upcoming]);

  const openSession = (b: TopicBlock) => {
    const level = b.difficulty || 'medio';
    setSession(b);
    setPlan(level);
    setStepsDone({});
    setQuestions(String(REVIEW_PLANS[level].questions));
    setCorrect('');
    setShowTopics(false);
  };

  const choosePlan = (level: TopicDifficulty) => {
    setPlan(level);
    setStepsDone({});
    setQuestions(String(REVIEW_PLANS[level].questions));
  };

  const qNum = Number(questions) || 0;
  const cNum = correct.trim() === '' ? undefined : Math.min(Number(correct) || 0, qNum);
  const pct = cNum !== undefined && qNum > 0 ? Math.round((cNum / qNum) * 100) : undefined;
  const suggested = cNum !== undefined ? difficultyFromScore(cNum, qNum) : undefined;

  const finish = (level: TopicDifficulty) => {
    if (!session) return;
    reviewTopicBlock(session.id, level, { questions: qNum || undefined, correct: cNum });
    setSession(null);
  };

  const startPomodoro = () => {
    if (!session) return;
    setTimerMode('pomodoro', session.subjectId);
    setCurrentTab('stopwatch');
    showNotification(`Pomodoro pronto para revisar "${session.name}". Aperte Iniciar.`, 'info');
  };

  const renderChips = (b: TopicBlock) => (
    <div className="flex items-center gap-1">
      {Array.from({ length: BLOCK_REVIEWS_TO_MASTER }, (_, i) => (
        <span
          key={i}
          className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
            i < b.reviewsDone
              ? 'bg-emerald-500 text-white'
              : i === b.reviewsDone && b.reviewStatus === 'revisao'
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/40'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
          }`}
        >
          R{i + 1}
        </span>
      ))}
    </div>
  );

  const renderPlanLine = (level: TopicDifficulty) => {
    const p = REVIEW_PLANS[level];
    return (
      <span className="text-[11px] font-semibold" style={{ color: p.color }}>
        {p.emoji} {p.label}: {p.steps.join(' + ')}
      </span>
    );
  };

  return (
    <div className="space-y-5 pb-12 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div>
        <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">Revisões</h1>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
          A revisão é feita por bloco. Um bloco entra aqui quando todos os seus tópicos forem vistos; depois de 4 revisões ele fica dominado.
        </p>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50/60 dark:bg-amber-950/20 p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
            <Repeat className="h-4 w-4" /> Para hoje
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{due.length}</div>
          <div className="text-[11px] text-slate-500">{overdueCount > 0 ? `${overdueCount} atrasada${overdueCount > 1 ? 's' : ''}` : 'em dia'}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <CalendarClock className="h-4 w-4 text-sky-500" /> Próximos 7 dias
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{next7}</div>
          <div className="text-[11px] text-slate-500">{upcoming.length} agendadas no total</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <Layers className="h-4 w-4 text-violet-500" /> Em estudo
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{studying.length}</div>
          <div className="text-[11px] text-slate-500">blocos com tópicos a ver</div>
        </div>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-slate-500">
            <Trophy className="h-4 w-4 text-emerald-500" /> Dominados
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">{mastered.length}</div>
          <div className="text-[11px] text-slate-500">4 revisões concluídas</div>
        </div>
      </div>

      {/* Planos sugeridos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {PLAN_ORDER.map((level) => {
          const p = REVIEW_PLANS[level];
          return (
            <div key={level} className="rounded-2xl border bg-white dark:bg-slate-900 p-3" style={{ borderColor: p.color + '55' }}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-black" style={{ color: p.color }}>
                  {p.emoji} {p.label}
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md text-white" style={{ backgroundColor: p.color }}>
                  {p.questions}Q
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-1">{p.steps.join(' · ')}</p>
            </div>
          );
        })}
      </div>

      {/* Para hoje */}
      <section className="space-y-2">
        <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Para revisar hoje</h2>
        {due.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-900/40 p-6 text-center">
            <Sparkles className="h-6 w-6 mx-auto text-emerald-500 mb-1" />
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100">Nenhuma revisão para hoje 🎉</p>
            <p className="text-xs text-slate-500 mt-0.5">
              {upcoming[0] ? `Próxima: "${upcoming[0].name}" ${dateLabel(upcoming[0].nextReviewDate!, today).toLowerCase()}.` : 'Marque os tópicos como vistos nas disciplinas para os blocos entrarem aqui.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {due.map((b) => {
              const sub = subjectOf(b);
              const color = colorOf(sub);
              const late = daysBetween(b.nextReviewDate!, today);
              const count = topics.filter((t) => t.blockId === b.id).length;
              return (
                <div key={b.id} className="relative rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 pl-5 overflow-hidden">
                  <span className="absolute left-0 top-0 bottom-0 w-1.5" style={{ backgroundColor: color }} />
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-black text-slate-900 dark:text-white truncate">{b.name}</h3>
                      <p className="text-[11px] font-semibold truncate" style={{ color }}>
                        {subtitleOf(sub)} · {count} tópico{count === 1 ? '' : 's'}
                      </p>
                    </div>
                    {late > 0 && (
                      <span className="shrink-0 flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="h-3 w-3" /> {late}d atrasada
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
                    {renderChips(b)}
                    {renderPlanLine(b.difficulty || 'medio')}
                  </div>
                  <button
                    onClick={() => openSession(b)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-white text-xs font-bold"
                    style={{ backgroundColor: color }}
                  >
                    <Play className="h-3.5 w-3.5" /> Revisar {b.name} · R{b.reviewsDone + 1}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Próximas revisões */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-2">Próximas revisões</h2>
          {upcomingByDate.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">Nenhuma revisão agendada.</p>
          ) : (
            <div className="space-y-3">
              {upcomingByDate.map(([date, list]) => (
                <div key={date}>
                  <div className="text-[11px] font-bold text-slate-500 mb-1">{dateLabel(date, today)}</div>
                  <ul className="space-y-1">
                    {list.map((b) => {
                      const sub = subjectOf(b);
                      return (
                        <li key={b.id} className="flex items-center gap-2 text-xs">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: colorOf(sub) }} />
                          <span className="font-semibold text-slate-800 dark:text-slate-100 truncate flex-1">{b.name}</span>
                          <span className="text-[10px] font-bold text-slate-400 shrink-0">R{b.reviewsDone + 1}</span>
                          <span className="text-[10px] font-bold shrink-0" style={{ color: REVIEW_PLANS[b.difficulty || 'medio'].color }}>
                            {REVIEW_PLANS[b.difficulty || 'medio'].questions}Q
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Em estudo */}
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-500">Em estudo</h2>
            <button onClick={() => setCurrentTab('structure')} className="text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline">
              Abrir disciplinas
            </button>
          </div>
          {studying.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">Nenhum bloco em estudo.</p>
          ) : (
            <ul className="space-y-2">
              {studying.map((b) => {
                const list = topics.filter((t) => t.blockId === b.id);
                const seen = list.filter(isTopicSeen).length;
                const sub = subjectOf(b);
                const color = colorOf(sub);
                return (
                  <li key={b.id}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-100 truncate">{b.name}</span>
                      <span className="text-[10px] font-bold text-slate-500 shrink-0">
                        {seen}/{list.length} vistos
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${list.length ? (seen / list.length) * 100 : 0}%`, backgroundColor: color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Dominados */}
      {mastered.length > 0 && (
        <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
          <button onClick={() => setShowMastered((v) => !v)} className="w-full flex items-center justify-between text-xs font-black uppercase tracking-widest text-slate-500">
            <span className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-emerald-500" /> Dominados ({mastered.length})
            </span>
            <ChevronDown className={`h-4 w-4 transition-transform ${showMastered ? '' : '-rotate-90'}`} />
          </button>
          {showMastered && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {mastered.map((b) => (
                <span key={b.id} className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
                  🏆 {b.name}
                </span>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Sessão de revisão */}
      {session && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in" onClick={() => setSession(null)}>
          <div
            id="block-review-session"
            className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: colorOf(subjectOf(session)) }}>
                  Revisão {session.reviewsDone + 1} de {BLOCK_REVIEWS_TO_MASTER} · {subtitleOf(subjectOf(session))}
                </p>
                <h2 className="text-lg font-black text-slate-900 dark:text-white truncate">{session.name}</h2>
              </div>
              <button onClick={() => setSession(null)} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Fechar">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Tópicos do bloco */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800">
              <button onClick={() => setShowTopics((v) => !v)} className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-700 dark:text-slate-200">
                Tópicos do bloco ({topics.filter((t) => t.blockId === session.id).length})
                <ChevronDown className={`h-4 w-4 transition-transform ${showTopics ? '' : '-rotate-90'}`} />
              </button>
              {showTopics && (
                <ul className="px-3 pb-2 space-y-0.5">
                  {topics
                    .filter((t) => t.blockId === session.id)
                    .map((t) => (
                      <li key={t.id} className="text-xs text-slate-600 dark:text-slate-300">
                        • {t.title}
                      </li>
                    ))}
                </ul>
              )}
            </div>

            {/* Plano */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Plano de revisão</p>
              <div className="grid grid-cols-3 gap-1.5">
                {PLAN_ORDER.map((level) => {
                  const p = REVIEW_PLANS[level];
                  const active = plan === level;
                  return (
                    <button
                      key={level}
                      onClick={() => choosePlan(level)}
                      className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all ${active ? 'text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'}`}
                      style={active ? { backgroundColor: p.color, borderColor: p.color } : undefined}
                    >
                      {p.label} · {p.questions}Q
                    </button>
                  );
                })}
              </div>
              <ul className="mt-2 space-y-1">
                {REVIEW_PLANS[plan].steps.map((step, i) => (
                  <li key={step}>
                    <button
                      onClick={() => setStepsDone((d) => ({ ...d, [i]: !d[i] }))}
                      className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 bg-slate-50 dark:bg-slate-950/60 text-left"
                    >
                      <span
                        className="h-5 w-5 shrink-0 rounded-md border-2 flex items-center justify-center"
                        style={{ borderColor: REVIEW_PLANS[plan].color, backgroundColor: stepsDone[i] ? REVIEW_PLANS[plan].color : 'transparent' }}
                      >
                        {stepsDone[i] && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                      </span>
                      <span className={`text-xs font-semibold ${stepsDone[i] ? 'line-through text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>{step}</span>
                    </button>
                  </li>
                ))}
              </ul>
              <button onClick={startPomodoro} className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline">
                <Timer className="h-3.5 w-3.5" /> Revisar com Pomodoro
              </button>
            </div>

            {/* Desempenho nas questões */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">Questões (opcional)</p>
              <div className="flex items-end gap-2">
                <label className="flex-1">
                  <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">Feitas</span>
                  <input
                    type="number"
                    min="0"
                    value={questions}
                    onChange={(e) => setQuestions(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
                  />
                </label>
                <label className="flex-1">
                  <span className="block text-[10px] font-semibold text-slate-500 mb-0.5">Acertos</span>
                  <input
                    id="block-review-correct"
                    type="number"
                    min="0"
                    value={correct}
                    onChange={(e) => setCorrect(e.target.value)}
                    placeholder="—"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2.5 py-1.5 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
                  />
                </label>
                <div className="flex-1 text-center pb-1">
                  <div className="text-lg font-black text-slate-900 dark:text-white">{pct !== undefined ? `${pct}%` : '—'}</div>
                  <div className="text-[10px] text-slate-500">aproveitamento</div>
                </div>
              </div>
              {suggested && (
                <p className="text-[11px] mt-2 font-semibold" style={{ color: REVIEW_PLANS[suggested].color }}>
                  Sugestão pelo desempenho: {REVIEW_PLANS[suggested].label}
                </p>
              )}
            </div>

            {/* Avaliação */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-1.5">Como foi a revisão?</p>
              <div className="grid grid-cols-3 gap-1.5">
                {PLAN_ORDER.map((level) => {
                  const p = REVIEW_PLANS[level];
                  const isSuggested = suggested === level;
                  return (
                    <button
                      key={level}
                      onClick={() => finish(level)}
                      className={`px-2 py-2.5 rounded-xl text-xs font-black text-white transition-transform hover:scale-[1.02] ${isSuggested ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-slate-900' : ''}`}
                      style={{ backgroundColor: p.color, ['--tw-ring-color' as string]: p.color }}
                    >
                      {p.emoji} {p.label}
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-slate-500 mt-1.5">
                Fácil espaça mais a próxima revisão; Difícil traz o bloco de volta antes. A escolha também define o plano sugerido da próxima vez.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
