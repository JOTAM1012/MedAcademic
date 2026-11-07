// "Planejar semana": os próximos 7 dias (tipo do dia, revisões previstas, temas novos, se cabe
// no dia, provas) + temas em estudo sem data, com dia por tema e "Distribuir automaticamente".
import React, { useMemo, useState } from 'react';
import { AlertTriangle, CalendarRange, GraduationCap, Layers, Plus, Repeat, Sparkles, Sprout, Wand2 } from 'lucide-react';
import { StudyContentModal } from './StudyContentModal';
import { useApp } from '../../context/AppContext';
import { addDaysYMD, formatDM, parseYMD } from '../../data/blockReview';
import { WEEKDAY_NAMES, WEEKDAY_SHORT, autoDistributeNewTopics } from '../../data/studyMethod';
import { todayYMD, usePlanInput, useWeekLoad } from '../../hooks/useStudyPlan';
import { DAY_KIND_INFO, PlanModal, blocksToHours } from './planShared';
import { QuickThemeModal } from './QuickThemeModal';

interface WeeklyPlanModalProps {
  open: boolean;
  onClose: () => void;
}

export const WeeklyPlanModal: React.FC<WeeklyPlanModalProps> = ({ open, onClose }) => {
  const { topicBlocks, subjects, currentSubjectIds, exams, updateTopicBlock, showNotification, studyPrefs } = useApp();
  const input = usePlanInput();
  const today = todayYMD();
  const dates = useMemo(() => Array.from({ length: 7 }, (_, i) => addDaysYMD(i, today)), [today]);
  const load = useWeekLoad(open ? dates : []);
  const [quickOpen, setQuickOpen] = useState(false);
  const [contentOpen, setContentOpen] = useState(false);
  const [quickDate, setQuickDate] = useState<string | undefined>(undefined);

  const subjectOf = (id: string) => subjects.find((s) => s.id === id);
  const unscheduled = useMemo(
    () =>
      topicBlocks
        .filter((b) => b.reviewStatus === 'estudando' && !b.paused && !b.plannedDate && currentSubjectIds.includes(b.subjectId))
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
    [topicBlocks, currentSubjectIds]
  );
  // Temas já com data nesta semana (para poder trocar o dia)
  const scheduledThisWeek = useMemo(
    () =>
      topicBlocks
        .filter((b) => b.reviewStatus === 'estudando' && !b.paused && b.plannedDate && b.plannedDate >= today && b.plannedDate <= dates[6] && currentSubjectIds.includes(b.subjectId))
        .sort((a, b) => (a.plannedDate || '').localeCompare(b.plannedDate || '')),
    [topicBlocks, currentSubjectIds, today, dates]
  );

  const examsOn = (date: string) => exams.filter((e) => e.date === date && e.grade === undefined);
  const dayLabel = (date: string) => (date === today ? 'Hoje' : date === dates[1] ? 'Amanhã' : WEEKDAY_NAMES[parseYMD(date).getDay()]);

  const distribute = () => {
    if (unscheduled.length === 0) return;
    const map = autoDistributeNewTopics(input, unscheduled.map((b) => b.id), today, 7);
    const ids = Object.keys(map);
    ids.forEach((id) => updateTopicBlock(id, { plannedDate: map[id] }));
    if (ids.length === 0) showNotification('A semana já está cheia. Escolha os dias à mão ou deixe alguns temas para a próxima.', 'info');
    else
      showNotification(
        `${ids.length} tema${ids.length > 1 ? 's' : ''} distribuído${ids.length > 1 ? 's' : ''} pela semana${ids.length < unscheduled.length ? `; ${unscheduled.length - ids.length} não coube${unscheduled.length - ids.length > 1 ? 'ram' : ''}` : ''}.`,
        'success'
      );
  };

  const daySelect = (value: string, onChange: (v: string) => void, id: string) => (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      aria-label="Dia para estudar"
      className="shrink-0 min-h-[40px] max-w-[132px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-xs font-bold text-slate-800 dark:text-slate-100"
    >
      <option value="">Sem data</option>
      {dates.map((d) => {
        const dow = parseYMD(d).getDay();
        const tag = dow === studyPrefs.restDay ? ' · descanso' : dow === studyPrefs.mixedDay ? ' · misturadas' : '';
        return (
          <option key={d} value={d}>
            {d === today ? 'Hoje' : `${WEEKDAY_SHORT[dow]} ${formatDM(d)}`}
            {tag}
          </option>
        );
      })}
    </select>
  );

  return (
    <>
      <PlanModal
        id="weekly-plan-modal"
        open={open}
        onClose={onClose}
        icon={<CalendarRange className="h-5 w-5" />}
        title="Planejar semana"
        subtitle="20 minutos que poupam a semana inteira: veja as revisões que vencem, distribua os temas novos e confira as provas."
        maxWidth="max-w-2xl"
        footer={
          <button type="button" id="weekly-plan-done" onClick={onClose} className="min-h-[40px] px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black">
            Pronto
          </button>
        }
      >
        <div className="space-y-6">
          {/* ---------- Próximos 7 dias ---------- */}
          <section>
            <div className="flex items-center justify-between gap-2 mb-2">
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Próximos 7 dias</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">cabe no seu dia?</p>
            </div>
            <ul id="weekly-plan-days" className="space-y-2">
              {load.map((l) => {
                const kind = DAY_KIND_INFO[l.dayKind];
                const dayExams = examsOn(l.date);
                const pct = l.capacity > 0 ? Math.min(100, Math.round((l.demand / l.capacity) * 100)) : 0;
                const newNames = [...l.plan.tasks, ...l.plan.overflow].filter((t) => (t.kind === 'new_block' || t.kind === 'new_topics') && !t.suggested);
                return (
                  <li
                    key={l.date}
                    className={`rounded-2xl border p-3 ${
                      l.date === today ? 'border-sky-300 dark:border-sky-500/40 bg-sky-50/60 dark:bg-sky-500/[0.05]' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-slate-900 dark:text-white">
                          {dayLabel(l.date)} <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{formatDM(l.date)}</span>
                        </p>
                        <div className="mt-1 flex flex-wrap items-center gap-1">
                          {l.dayKind !== 'normal' && (
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${kind.cls}`}>
                              {kind.emoji} {kind.label}
                            </span>
                          )}
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Repeat className="h-3 w-3 text-sky-500" /> {l.reviews} revis{l.reviews === 1 ? 'ão' : 'ões'}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center gap-1">
                            <Sprout className="h-3 w-3 text-emerald-500" /> {l.newTopics} tema{l.newTopics === 1 ? '' : 's'} novo{l.newTopics === 1 ? '' : 's'}
                          </span>
                          {dayExams.map((e) => (
                            <span
                              key={e.id}
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:border-rose-500/30 flex items-center gap-1 max-w-full"
                            >
                              <GraduationCap className="h-3 w-3 shrink-0" /> <span className="truncate">{e.title}</span>
                            </span>
                          ))}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickDate(l.date);
                          setQuickOpen(true);
                        }}
                        title="Colocar um tema neste dia"
                        aria-label={`Colocar um tema em ${dayLabel(l.date)}`}
                        className="shrink-0 h-10 w-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 flex items-center justify-center text-sky-600 dark:text-sky-400 hover:border-sky-400"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2.5">
                      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${l.overloaded ? 'bg-amber-500' : 'bg-sky-500'}`}
                          style={{ width: `${l.demand > 0 ? Math.max(pct, 4) : 0}%` }}
                        />
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
                        <span className="text-slate-500 dark:text-slate-400" title={`${l.demand} × 25 min previstos`}>
                          ≈ {blocksToHours(l.demand)} previstos · seu dia tem {blocksToHours(l.capacity)}
                        </span>
                        {l.overloaded && (
                          <span className="font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" /> Dia cheio
                          </span>
                        )}
                      </div>
                      {newNames.length > 0 && (
                        <p className="mt-1 text-[11px] text-slate-600 dark:text-slate-300 truncate">🌱 {newNames.map((t) => t.title.replace(/^Tema novo: |^1º contato: /, '')).join(' · ')}</p>
                      )}
                      {l.overloaded && <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Revisões vêm primeiro. Passe um tema novo para um dia mais leve.</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>

          {/* ---------- Temas sem data ---------- */}
          <section id="weekly-plan-unscheduled">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Temas em estudo sem data</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Até {studyPrefs.newTopicsPerDay} por dia, sem o descanso e o dia das misturadas.
                </p>
              </div>
              <button
                type="button"
                id="weekly-plan-auto"
                disabled={unscheduled.length === 0}
                onClick={distribute}
                className="min-h-[40px] px-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black flex items-center gap-1.5"
              >
                <Wand2 className="h-4 w-4" /> Distribuir automaticamente
              </button>
            </div>
            {unscheduled.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-center">
                <p className="text-xs text-slate-600 dark:text-slate-300">Nenhum tema em estudo sem data.</p>
                <button
                  type="button"
                  id="weekly-plan-new-theme"
                  onClick={() => {
                    setQuickDate(undefined);
                    setQuickOpen(true);
                  }}
                  className="mt-2 min-h-[40px] px-3.5 rounded-xl border border-sky-300 dark:border-sky-700 text-sky-700 dark:text-sky-300 text-xs font-bold hover:bg-sky-50 dark:hover:bg-sky-950/40 inline-flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5" /> Escolher um tema novo
                </button>
              </div>
            ) : (
              <ul className="space-y-1.5">
                {unscheduled.map((b) => {
                  const sub = subjectOf(b.subjectId);
                  return (
                    <li key={b.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 p-2 pl-3">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: sub?.color || '#64748b' }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{b.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{sub?.universitySubject || sub?.name}</p>
                      </div>
                      {daySelect('', (v) => v && updateTopicBlock(b.id, { plannedDate: v }), `weekly-plan-day-${b.id}`)}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* ---------- Já programados nesta semana ---------- */}
          {scheduledThisWeek.length > 0 && (
            <section>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Já programados nesta semana</p>
              <ul className="space-y-1.5">
                {scheduledThisWeek.map((b) => {
                  const sub = subjectOf(b.subjectId);
                  return (
                    <li key={b.id} className="flex items-center gap-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-2 pl-3">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: sub?.color || '#64748b' }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{b.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{sub?.universitySubject || sub?.name}</p>
                      </div>
                      {daySelect(b.plannedDate || '', (v) => updateTopicBlock(b.id, { plannedDate: v || undefined }), `weekly-plan-move-${b.id}`)}
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <button
            type="button"
            id="weekly-plan-content"
            onClick={() => setContentOpen(true)}
            className="w-full min-h-[44px] rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/50 text-xs font-bold text-slate-700 dark:text-slate-200 hover:border-sky-400 flex items-center justify-center gap-1.5"
          >
            <Layers className="h-4 w-4" /> Meus conteúdos: ligar ou desligar temas na rotina
          </button>

          {scheduledThisWeek.length + unscheduled.length > 0 && (
            <button
              type="button"
              id="weekly-plan-new-theme-2"
              onClick={() => {
                setQuickDate(undefined);
                setQuickOpen(true);
              }}
              className="w-full min-h-[44px] rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:border-sky-400 hover:text-sky-700 dark:hover:text-sky-300 flex items-center justify-center gap-1.5"
            >
              <Plus className="h-4 w-4" /> Novo tema
            </button>
          )}
        </div>
      </PlanModal>
      <QuickThemeModal open={open && quickOpen} onClose={() => setQuickOpen(false)} defaultDate={quickDate} stacked />
      <StudyContentModal open={open && contentOpen} onClose={() => setContentOpen(false)} stacked />
    </>
  );
};
