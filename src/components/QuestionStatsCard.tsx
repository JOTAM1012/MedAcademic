import React, { useMemo, useState } from 'react';
import { ClipboardCheck, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { QuestionLogModal } from './modals/QuestionLogModal';

// Questões do semestre atual (registradas na aba Revisões), com aproveitamento e destaques por bloco
export const QuestionStatsCard: React.FC = () => {
  const { questionLogs, topicBlocks, currentSemester } = useApp();
  const [open, setOpen] = useState(false);

  const logs = useMemo(
    () => questionLogs.filter((q) => !currentSemester || !q.semesterId || q.semesterId === currentSemester.id),
    [questionLogs, currentSemester]
  );
  const total = logs.reduce((a, q) => a + q.total, 0);
  const correct = logs.reduce((a, q) => a + q.correct, 0);
  const pct = total > 0 ? Math.round((correct / total) * 100) : 0;

  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const week = logs.filter((q) => q.date >= weekAgo).reduce((a, q) => a + q.total, 0);

  // Blocos com mais questões (para mostrar onde está o volume e o aproveitamento)
  const byBlock = useMemo(() => {
    const map = new Map<string, { total: number; correct: number }>();
    logs.forEach((q) => {
      if (!q.blockId) return;
      const cur = map.get(q.blockId) || { total: 0, correct: 0 };
      map.set(q.blockId, { total: cur.total + q.total, correct: cur.correct + q.correct });
    });
    return Array.from(map.entries())
      .map(([id, v]) => ({ id, name: topicBlocks.find((b) => b.id === id)?.name || 'Bloco removido', ...v }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 4);
  }, [logs, topicBlocks]);

  const tone = (p: number) => (p >= 80 ? '#16a34a' : p >= 60 ? '#d97706' : '#e11d48');

  return (
    <div id="dashboard-question-stats" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
            <ClipboardCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base">Questões no semestre</h3>
            <p className="text-xs text-slate-400">{currentSemester?.name || 'Semestre atual'}</p>
          </div>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
        >
          <Plus className="h-3.5 w-3.5" /> Registrar
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Feitas</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{total}</div>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Acertos</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{correct}</div>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Aproveitamento</div>
          <div className="text-2xl font-black" style={{ color: total ? tone(pct) : undefined }}>
            {total ? `${pct}%` : '—'}
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-950/60 p-3">
          <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Últimos 7 dias</div>
          <div className="text-2xl font-black text-slate-900 dark:text-white">{week}</div>
        </div>
      </div>

      {total > 0 && (
        <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: tone(pct) }} />
        </div>
      )}

      {byBlock.length > 0 ? (
        <ul className="mt-4 space-y-1.5">
          {byBlock.map((b) => {
            const p = Math.round((b.correct / b.total) * 100);
            return (
              <li key={b.id} className="flex items-center gap-2 text-xs">
                <span className="flex-1 min-w-0 truncate font-semibold text-slate-700 dark:text-slate-200">{b.name}</span>
                <span className="text-slate-500 shrink-0">
                  {b.correct}/{b.total}
                </span>
                <span className="font-black shrink-0 w-10 text-right" style={{ color: tone(p) }}>
                  {p}%
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        total === 0 && <p className="mt-3 text-xs text-slate-400">Registre as questões que fizer (por bloco ou tópico) e acompanhe o total do semestre aqui.</p>
      )}

      <QuestionLogModal isOpen={open} onClose={() => setOpen(false)} />
    </div>
  );
};
