// Acertos em questões (bloco pequeno): % de acerto do período, total e tendência.
// Em "Ver detalhes": por grande área ou por módulo, com as disciplinas dentro. Respeita os filtros de período e de área.
import React, { useMemo, useState } from 'react';
import { ChevronDown, Target } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { areaOfSubject, rangeFor, type PeriodFilter } from '../../data/dashboardMetrics';
import { CountUp } from '../shared/CountUp';
import { Bar, BigNumber, Details, GroupToggle, LinkButton, StatBody, StatLabel, StatNote, Trend, Unit, WidgetCard, softBtn } from './ui';
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
      action={
        <LinkButton id="dash-questions-open" compact onClick={() => setCurrentTab('spaced_repetition')}>
          Revisões
        </LinkButton>
      }
    >
      <StatBody>
        <BigNumber className={goalTone(pct, goal)}>
          {pct === undefined ? (
            '—'
          ) : (
            <>
              <CountUp value={Math.round(pct)} />
              <Unit>%</Unit>
            </>
          )}
        </BigNumber>
        <StatLabel>
          de acerto · {plural(data.cur.t, 'questão', 'questões')}
        </StatLabel>
        <StatNote className="mt-0.5">
          {delta !== undefined && delta !== 0 ? (
            <>
              <Trend delta={delta} suffix="pontos" /> <span>vs período anterior</span>
            </>
          ) : (
            <>
              {periodLabel} · meta {goal}%
            </>
          )}
        </StatNote>
      </StatBody>

      {data.cur.t === 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <StatNote>Nenhuma questão neste período.</StatNote>
          <button type="button" onClick={() => setCurrentTab('spaced_repetition')} className={softBtn}>
            Registrar questões
          </button>
        </div>
      ) : (
        <Details id="dash-questions-details" label={mode === 'area' ? 'Ver por grande área' : 'Ver por módulo'}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatNote>
              {periodLabel} · meta {goal}%
            </StatNote>
            <GroupToggle id="dash-questions-mode" value={mode} onChange={onModeChange} />
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {data.groups.map((g) => {
              const gp = (g.c / g.t) * 100;
              const isOpen = !!open[g.key];
              return (
                <li key={g.key} id={`dash-questions-group-${slug(g.key)}`}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen((o) => ({ ...o, [g.key]: !o[g.key] }))}
                    className="w-full min-h-[48px] py-2 text-left flex flex-col gap-1.5"
                  >
                    <span className="w-full flex items-center gap-2 min-w-0 text-xs">
                      {g.emoji ? <span aria-hidden>{g.emoji}</span> : <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: g.color }} />}
                      <span className="min-w-0 flex-1 truncate font-bold text-slate-800 dark:text-slate-100">{g.label}</span>
                      <span className="shrink-0 text-[11px] text-slate-500 dark:text-slate-400 tabular-nums">{g.t} q.</span>
                      <span className={`shrink-0 w-10 text-right font-black tabular-nums ${goalTone(gp, goal)}`}>{fmtPct(gp)}</span>
                      <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 motion-reduce:transition-none ${isOpen ? 'rotate-180' : ''}`} />
                    </span>
                    <Bar pct={gp} color={goalBar(gp, goal)} goal={goal} thin />
                  </button>
                  {isOpen && (
                    <ul className="pb-2.5 pl-4 space-y-1.5">
                      {g.subs.map((s) => {
                        const sp = (s.c / s.t) * 100;
                        return (
                          <li key={s.sub.id} className="flex items-center gap-2 min-w-0 text-[11px]">
                            <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s.sub.color }} />
                            <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">{s.sub.universitySubject || s.sub.name}</span>
                            <span className="shrink-0 text-slate-500 dark:text-slate-400 tabular-nums">
                              {s.c}/{s.t}
                            </span>
                            <span className={`shrink-0 w-10 text-right font-black tabular-nums ${goalTone(sp, goal)}`}>{fmtPct(sp)}</span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          {data.loose.t > 0 && (
            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              + {plural(data.loose.t, 'questão', 'questões')} sem disciplina ({fmtPct((data.loose.c / data.loose.t) * 100)})
            </p>
          )}
        </Details>
      )}
    </WidgetCard>
  );
};
