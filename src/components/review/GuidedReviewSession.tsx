// Sessão guiada "Fazer as revisões de hoje": um card por vez, com Pular e progresso.
// A fila fica guardada na sessão do navegador (por usuário): tocar "Começar foco" leva ao
// Pomodoro e, ao voltar às Revisões, a sessão continua de onde parou.
import React, { useEffect, useState } from 'react';
import { Play, SkipForward, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { todayYMD, useDayPlan } from '../../hooks/useStudyPlan';
import { startPlanTask, userLocalKey } from '../plan/planShared';
import { ReviewCard } from './ReviewCard';
import { ProjectReviewCard } from './ProjectReviewCard';
import { taskDuration } from './reviewShared';

/** Item da fila: bloco (id do bloco) ou item de estudo pessoal ("p:projeto:item") */
export interface QueueEntry {
  key: string;
  blockId?: string;
  projectId?: string;
  itemId?: string;
}

/** Estado salvo da sessão guiada (só vale no mesmo dia) */
export interface GuidedState {
  date: string;
  order: QueueEntry[];
  idx: number;
  done: string[];
  skipped: string[];
}

export const guidedStorageKey = (email?: string) => userLocalKey('guided_review', email);

export const loadGuided = (key: string): GuidedState | null => {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (!s || s.date !== todayYMD() || !Array.isArray(s.order)) return null;
    return {
      date: s.date,
      order: s.order.filter((e: QueueEntry) => e && typeof e.key === 'string'),
      idx: Math.max(0, Number(s.idx) || 0),
      done: Array.isArray(s.done) ? s.done : [],
      skipped: Array.isArray(s.skipped) ? s.skipped : [],
    };
  } catch {
    return null;
  }
};

export const saveGuided = (key: string, s: GuidedState | null) => {
  try {
    if (s) sessionStorage.setItem(key, JSON.stringify(s));
    else sessionStorage.removeItem(key);
  } catch {
    /* sem armazenamento: a sessão só não sobrevive à troca de aba */
  }
};

interface GuidedReviewSessionProps {
  /** Estado inicial (fila congelada no início ou retomada) */
  initial: GuidedState;
  storageKey: string;
  onClose: () => void;
  onReviewed?: (blockId: string) => void;
}

export const GuidedReviewSession: React.FC<GuidedReviewSessionProps> = ({ initial, storageKey, onClose, onReviewed }) => {
  const { topicBlocks, studyMethod, startTask } = useApp();
  const plan = useDayPlan();
  // Se a sessão já estava salva (voltou de outra sub-aba), continua dela
  const [start] = useState<GuidedState>(() => loadGuided(storageKey) || initial);
  const [order, setOrder] = useState<QueueEntry[]>(start.order);
  const [idx, setIdx] = useState(Math.min(start.idx, start.order.length));
  const [done, setDone] = useState<Set<string>>(() => new Set(start.done));
  const [skipped, setSkipped] = useState<Set<string>>(() => new Set(start.skipped));

  const current = order[idx];
  const finished = idx >= order.length;

  // Guarda a fila a cada passo; sessão concluída sem puladas não precisa ser retomada
  useEffect(() => {
    if (finished && skipped.size === 0) saveGuided(storageKey, null);
    else saveGuided(storageKey, { date: start.date, order, idx, done: [...done], skipped: [...skipped] });
  }, [storageKey, start.date, order, idx, done, skipped, finished]);

  const close = () => {
    saveGuided(storageKey, null);
    onClose();
  };
  const progress = order.length ? Math.round((done.size / order.length) * 100) : 100;

  const advance = () => setIdx((i) => i + 1);
  const markDone = (key: string) => {
    setDone((s) => new Set(s).add(key));
    setSkipped((s) => {
      const n = new Set(s);
      n.delete(key);
      return n;
    });
    advance();
  };
  const skip = () => {
    if (!current) return;
    setSkipped((s) => new Set(s).add(current.key));
    advance();
  };
  const backToSkipped = () => {
    const rest = order.filter((e) => skipped.has(e.key));
    setOrder([...order.filter((e) => !skipped.has(e.key)), ...rest]);
    setIdx(order.length - rest.length);
    setSkipped(new Set());
  };

  const renderCurrent = () => {
    if (!current) return null;
    if (current.blockId) {
      const b = topicBlocks.find((x) => x.id === current.blockId);
      if (!b) return <MissingItem onNext={advance} />;
      return (
        <ReviewCard
          key={b.id}
          block={b}
          variant="session"
          onReviewed={(id) => {
            onReviewed?.(id);
            markDone(current.key);
          }}
        />
      );
    }
    const p = studyMethod.projects.find((x) => x.id === current.projectId);
    const it = p?.items.find((x) => x.id === current.itemId);
    if (!p || !it) return <MissingItem onNext={advance} />;
    return <ProjectReviewCard key={current.key} project={p} item={it} variant="session" onReviewed={() => markDone(current.key)} />;
  };

  const next = plan.next && plan.next.kind !== 'review' && plan.next.kind !== 'project_review' ? plan.next : plan.tasks.find((t) => !t.done && !t.optional && t.kind !== 'review' && t.kind !== 'project_review' && t.kind !== 'blank_page');

  return (
    <div id="guided-review-session" className="space-y-4">
      {/* Barra da sessão */}
      <div className="rounded-3xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/70 dark:bg-sky-950/30 p-4 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wide text-sky-700 dark:text-sky-300">Revisões de hoje</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {finished ? 'Sessão concluída' : `${idx + 1} de ${order.length}`}
              <span className="font-semibold text-slate-500 dark:text-slate-400">
                {' '}
                · {done.size} feita{done.size === 1 ? '' : 's'}
                {skipped.size > 0 ? ` · ${skipped.size} pulada${skipped.size === 1 ? '' : 's'}` : ''}
              </span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!finished && (
              <button
                id="review-session-skip"
                type="button"
                onClick={skip}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <SkipForward className="h-4 w-4" /> Pular
              </button>
            )}
            <button
              id="review-session-close"
              type="button"
              onClick={close}
              className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
              aria-label="Sair da sessão"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <div className="h-2 rounded-full bg-white dark:bg-slate-800 overflow-hidden" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full rounded-full bg-sky-500 transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {finished ? (
        <div id="review-session-done" className="rounded-3xl border border-emerald-200 dark:border-emerald-900/50 bg-white dark:bg-slate-900 p-6 sm:p-8 text-center space-y-4 shadow-lg">
          <p className="text-4xl">🎉</p>
          <div>
            <h3 className="text-lg font-black text-slate-900 dark:text-white">
              {done.size > 0 ? `${done.size} revis${done.size === 1 ? 'ão feita' : 'ões feitas'}!` : 'Sessão encerrada'}
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">
              {skipped.size > 0
                ? `Ficaram ${skipped.size} para depois. Sem problema: elas continuam na fila de hoje.`
                : 'Revisões em dia. É isso que segura a matéria na memória.'}
            </p>
          </div>
          {next && (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-4 text-left">
              <p className="text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Próximo passo do seu plano</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: next.color + '1a' }}>
                  {next.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-black text-slate-900 dark:text-white truncate">{next.title}</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{[next.subtitle, taskDuration(next)].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
              <button
                id="review-session-next-task"
                type="button"
                onClick={() => {
                  saveGuided(storageKey, null);
                  startPlanTask(next, { startTask });
                }}
                className="mt-3 w-full inline-flex items-center justify-center gap-2 min-h-[44px] rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black"
              >
                <Play className="h-4 w-4 fill-current" /> Começar
              </button>
            </div>
          )}
          <div className="flex flex-col min-[400px]:flex-row gap-2 justify-center">
            {skipped.size > 0 && (
              <button
                type="button"
                onClick={backToSkipped}
                className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                Voltar às puladas ({skipped.size})
              </button>
            )}
            <button type="button" onClick={close} className="min-h-[44px] px-4 rounded-xl text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200">
              Fechar
            </button>
          </div>
        </div>
      ) : (
        renderCurrent()
      )}
    </div>
  );
};

const MissingItem: React.FC<{ onNext: () => void }> = ({ onNext }) => (
  <div className="rounded-3xl border border-dashed border-slate-300 dark:border-slate-700 p-6 text-center space-y-3">
    <p className="text-sm text-slate-600 dark:text-slate-300">Esta revisão não está mais disponível.</p>
    <button type="button" onClick={onNext} className="min-h-[40px] px-4 rounded-xl bg-sky-600 text-white text-xs font-bold">
      Próxima
    </button>
  </div>
);
