// Agenda das revisões: próximos 14 dias agrupados por data, com a técnica de cada uma.
import React, { useMemo } from 'react';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { addDaysYMD, parseYMD } from '../../data/blockReview';
import { WEEKDAY_NAMES, projectReviewTechnique, reviewTechnique } from '../../data/studyMethod';
import { todayYMD } from '../../hooks/useStudyPlan';
import { subjectColor, subjectLabel, weekdayDM } from './reviewShared';
import { EmptyState } from '../shared/EmptyState';

interface AgendaRow {
  key: string;
  emoji: string;
  color: string;
  badge: string;
  title: string;
  subtitle: string;
  dot: string;
  star?: boolean;
  blockId?: string;
}

const DAYS = 14;

export const ReviewAgenda: React.FC<{ onOpenBlock: (blockId: string) => void; onOpenPersonal?: () => void; onOpenStructure?: () => void }> = ({ onOpenBlock, onOpenPersonal, onOpenStructure }) => {
  const { topicBlocks, subjects, studyMethod, studyPrefs } = useApp();
  const today = todayYMD();

  const days = useMemo(() => {
    const subIds = new Set(subjects.map((s) => s.id));
    const out: Array<{ date: string; rows: AgendaRow[] }> = [];
    for (let i = 1; i <= DAYS; i++) {
      const date = addDaysYMD(i, today);
      const rows: AgendaRow[] = [];
      topicBlocks
        .filter((b) => subIds.has(b.subjectId) && b.reviewStatus === 'revisao' && b.nextReviewDate === date)
        .sort((a, b) => Number(!!b.star) - Number(!!a.star) || a.name.localeCompare(b.name))
        .forEach((b) => {
          const sub = subjects.find((s) => s.id === b.subjectId);
          const tech = reviewTechnique(b, sub?.format);
          rows.push({
            key: b.id,
            emoji: tech.emoji,
            color: tech.color,
            badge: tech.badge,
            title: b.name,
            subtitle: subjectLabel(sub),
            dot: subjectColor(sub),
            star: !!b.star,
            blockId: b.id,
          });
        });
      (studyMethod.projects || [])
        .filter((p) => !p.archived)
        .forEach((p) =>
          p.items
            .filter((it) => it.inReview && it.nextReviewDate === date)
            .forEach((it) => {
              const tech = projectReviewTechnique((it.reviewsDone || 0) + 1, p.kind);
              rows.push({
                key: `${p.id}:${it.id}`,
                emoji: p.emoji || tech.emoji,
                color: tech.color,
                badge: tech.badge,
                title: it.title,
                subtitle: `Estudo pessoal · ${p.title}`,
                dot: p.color || tech.color,
              });
            })
        );
      out.push({ date, rows });
    }
    return out;
  }, [topicBlocks, subjects, studyMethod.projects, today]);

  const max = Math.max(1, ...days.map((d) => d.rows.length));
  const total = days.reduce((a, d) => a + d.rows.length, 0);
  const isRest = (date: string) => studyPrefs.restDay !== null && parseYMD(date).getDay() === studyPrefs.restDay;

  return (
    <div id="review-agenda" className="space-y-4">
      {/* Faixa dos 14 dias */}
      <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <p className="text-[13px] font-black text-slate-900 dark:text-white">Próximos 14 dias</p>
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
            {total} revis{total === 1 ? 'ão' : 'ões'}
          </p>
        </div>
        <div className="grid grid-cols-14 gap-1" style={{ gridTemplateColumns: `repeat(${DAYS}, minmax(0, 1fr))` }}>
          {days.map((d) => {
            const n = d.rows.length;
            const dow = parseYMD(d.date).getDay();
            return (
              <a
                key={d.date}
                href={n > 0 ? `#review-day-${d.date}` : undefined}
                onClick={(e) => {
                  if (!n) return;
                  e.preventDefault();
                  document.getElementById(`review-day-${d.date}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }}
                className="flex flex-col items-center gap-1 min-w-0"
                title={`${weekdayDM(d.date)}: ${n} revis${n === 1 ? 'ão' : 'ões'}`}
              >
                <div className="h-14 w-full flex items-end justify-center">
                  <div
                    className={`w-full max-w-[18px] rounded-md ${n ? 'bg-sky-500 dark:bg-sky-400' : 'bg-slate-100 dark:bg-slate-800'}`}
                    style={{ height: n ? `${Math.max(18, (n / max) * 100)}%` : '10%' }}
                  />
                </div>
                <span className="text-[10px] font-black text-slate-700 dark:text-slate-200 tabular-nums">{n || ''}</span>
                <span className={`text-[9px] font-bold ${isRest(d.date) ? 'text-slate-300 dark:text-slate-600' : 'text-slate-400'}`}>{WEEKDAY_NAMES[dow].slice(0, 1)}</span>
              </a>
            );
          })}
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Nenhuma revisão nos próximos 14 dias"
          text="Termine o estudo de um tema. A 1ª revisão aparece aqui no dia seguinte."
          actionLabel={onOpenStructure ? 'Abrir disciplinas' : undefined}
          onAction={onOpenStructure}
        />
      ) : (
        <div className="space-y-4">
          {days
            .filter((d) => d.rows.length > 0)
            .map((d, idx) => {
              const label = idx === 0 && d.date === addDaysYMD(1, today) ? `Amanhã · ${weekdayDM(d.date)}` : `${WEEKDAY_NAMES[parseYMD(d.date).getDay()]} · ${weekdayDM(d.date).split(' ')[1]}`;
              return (
                <section key={d.date} id={`review-day-${d.date}`} className="scroll-mt-24">
                  <div className="flex items-center justify-between gap-2 mb-2 px-1">
                    <h3 className="text-[12px] font-black uppercase tracking-wide text-slate-600 dark:text-slate-300">{label}</h3>
                    <span className="text-[11px] font-bold text-slate-400">
                      {isRest(d.date) ? 'dia de descanso · ' : ''}
                      {d.rows.length}
                    </span>
                  </div>
                  <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                    {d.rows.map((r) => (
                      <li key={r.key}>
                        <button
                          type="button"
                          onClick={() => (r.blockId ? onOpenBlock(r.blockId) : onOpenPersonal?.())}
                          className="w-full flex items-center gap-3 px-3.5 py-3 min-h-[56px] text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <span className="h-9 w-9 shrink-0 rounded-xl flex items-center justify-center text-lg" style={{ backgroundColor: r.color + '14' }} aria-hidden>
                            {r.emoji}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5 min-w-0">
                              <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ink" style={{ '--ink': r.color, backgroundColor: r.color + '14' } as React.CSSProperties}>
                                {r.badge}
                              </span>
                              {r.star && <span className="text-[11px] shrink-0" title="Cai muito na prova">⭐</span>}
                            </span>
                            <span className="block text-[13px] font-bold text-slate-900 dark:text-white truncate mt-0.5">{r.title}</span>
                            <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 min-w-0">
                              <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ backgroundColor: r.dot }} />
                              <span className="truncate">{r.subtitle}</span>
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 shrink-0" />
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
        </div>
      )}
      <p className="text-[11px] text-slate-500 dark:text-slate-400 px-1">Revisar um pouco depois da data é melhor do que antes. As datas se ajustam sozinhas a cada revisão.</p>
    </div>
  );
};
