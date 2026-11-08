// Acertos em questões: total do período e % de acerto por grande área ou por módulo,
// com as disciplinas dentro de cada grupo. Respeita os filtros de período e de área.
import React, { useMemo, useState } from 'react';
import { ChevronDown, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { areaOfSubject, rangeFor, type PeriodFilter } from '../../data/dashboardMetrics';
import { Bar, EmptyNote, GroupToggle, LinkButton, WidgetCard, softBtn } from './ui';
import { GroupMode, fmtPct, goalBar, goalTone, groupSubjects, plural, slug, subjectOfLogFactory, sumLogs } from './dashboardData';

const inRange = (d: string | undefined, start: string | null, end: string | null) => !!d && (!start || d >= start) && (!end || d <= end);

export const QuestionsWidget: React.FC<{ period: PeriodFilter; periodLabel: string; area: string; mode: GroupMode; onModeChange: (m: GroupMode) => void }> = ({
  period,
  periodLabel,
  area,
  mode,
  onModeChange,
}) => {
  const { subjects, topicBlocks, questionLogs, currentSemester, studyPhase, userProfile, setCurrentTab } = useApp();
  const goal = userProfile.goalReviewPct ?? 70;
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const data = useMemo(() => {
    const r = rangeFor(period, currentSemester || undefined);
    const subOf = subjectOfLogFactory(subjects, topicBlocks);
    const areaOk = (q: (typeof questionLogs)[number]) => area === 'all' || areaOfSubject(subOf(q)).id === area;
    const logs = questionLogs.filter((q) => areaOk(q) && inRange(q.date, r.start, r.end));
    const prev = r.prevStart ? sumLogs(questionLogs.filter((q) => areaOk(q) && inRange(q.date, r.prevStart, r.prevEnd))) : undefined;
    const cur = sumLogs(logs);

    // disciplina → soma
    const bySub = new Map<string, { t: number; c: number }>();
    let loose = { t: 0, c: 0 };
    logs.forEach((q) => {
      const s = subOf(q);
      if (!s) {
        loose = { t: loose.t + q.total, c: loose.c + q.correct };
        return;
      }
      const e = bySub.get(s.id) || { t: 0, c: 0 };
      bySub.set(s.id, { t: e.t + q.total, c: e.c + q.correct });
    });
    const withLogs = subjects.filter((s) => bySub.has(s.id));
    const groups = groupSubjects(withLogs, mode, studyPhase)
      .map((g) => {
        const subs = g.subjects
          .map((s) => ({ sub: s, ...bySub.get(s.id)! }))
          .sort((a, b) => b.t - a.t);
        const t = subs.reduce((a, x) => a + x.t, 0);
        const c = subs.reduce((a, x) => a + x.c, 0);
        return { ...g, subs, t, c };
      })
      .filter((g) => g.t > 0)
      .sort((a, b) => b.t - a.t);
    return { cur, prev, groups, loose };
  }, [period, area, mode, subjects, topicBlocks, questionLogs, currentSemester, studyPhase]);

  const pct = data.cur.t ? (data.cur.c / data.cur.t) * 100 : undefined;
  const prevPct = data.prev && data.prev.t ? (data.prev.c / data.prev.t) * 100 : undefined;
  const delta = pct !== undefined && prevPct !== undefined ? Math.round(pct - prevPct) : undefined;

  return (
    <WidgetCard
      id="dash-questions"
      title="Acertos em questões"
      icon={Target}
      color="#f59e0b"
      action={<LinkButton id="dash-questions-open" onClick={() => setCurrentTab('spaced_repetition')}>Revisões</LinkButton>}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className={`text-3xl font-black leading-none ${goalTone(pct, goal)}`}>{fmtPct(pct)}</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {plural(data.cur.t, 'questão', 'questões')} · {periodLabel} · meta {goal}%
          </p>
          {delta !== undefined && delta !== 0 && (
            <p className={`mt-0.5 text-[11px] font-bold inline-flex items-center gap-1 ${delta > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {delta > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {delta > 0 ? '+' : ''}
              {delta} pontos vs período anterior
            </p>
          )}
        </div>
        <GroupToggle id="dash-questions-mode" value={mode} onChange={onModeChange} />
      </div>

      {data.cur.t === 0 ? (
        <EmptyNote
          action={
            <button type="button" onClick={() => setCurrentTab('spaced_repetition')} className={softBtn}>
              Registrar questões
            </button>
          }
        >
          Nenhuma questão registrada neste período.
        </EmptyNote>
      ) : (
        <ul className="space-y-1.5">
          {data.groups.map((g) => {
            const gp = (g.c / g.t) * 100;
            const isOpen = !!open[g.key];
            return (
              <li key={g.key} id={`dash-questions-group-${slug(g.key)}`} className="rounded-2xl border border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))}
                  className="w-full min-h-[48px] px-3 py-2 text-left flex flex-col gap-1.5"
                >
                  <span className="w-full flex items-center gap-2 min-w-0 text-xs">
                    {g.emoji ? <span aria-hidden>{g.emoji}</span> : <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />}
                    <span className="min-w-0 flex-1 truncate font-bold text-slate-800 dark:text-slate-100">{g.label}</span>
                    <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400">{g.t} q.</span>
                    <span className={`shrink-0 w-10 text-right font-black ${goalTone(gp, goal)}`}>{fmtPct(gp)}</span>
                    <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </span>
                  <Bar pct={gp} color={goalBar(gp, goal)} goal={goal} thin />
                </button>
                {isOpen && (
                  <ul className="px-3 pb-2.5 space-y-1.5 border-t border-slate-100 dark:border-slate-800 pt-2">
                    {g.subs.map((s) => {
                      const sp = (s.c / s.t) * 100;
                      return (
                        <li key={s.sub.id} className="flex items-center gap-2 min-w-0 text-[11px]">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.sub.color }} />
                          <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{s.sub.universitySubject || s.sub.name}</span>
                          <span className="shrink-0 text-slate-500 dark:text-slate-400">
                            {s.c}/{s.t}
                          </span>
                          <span className={`shrink-0 w-10 text-right font-black ${goalTone(sp, goal)}`}>{fmtPct(sp)}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </li>
            );
          })}
          {data.loose.t > 0 && (
            <li className="px-3 text-[11px] text-slate-400 dark:text-slate-500">
              + {plural(data.loose.t, 'questão', 'questões')} sem disciplina ({fmtPct((data.loose.c / data.loose.t) * 100)})
            </li>
          )}
        </ul>
      )}
    </WidgetCard>
  );
};
