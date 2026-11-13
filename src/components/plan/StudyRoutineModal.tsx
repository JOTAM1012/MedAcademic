// "Minha rotina": preferências do plano do dia (blocos por dia, formato do foco, descanso,
// dia das misturadas, temas novos, flashcards, meta de longo prazo). Versão "primeira vez" com
// 3 perguntas grandes. Salva só o que mudou (updateStudyPrefs); o resto segue os padrões da fase.
import React, { useEffect, useState } from 'react';
import { Check, Minus, Plus, RotateCcw, Settings2, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PHASE_INFO, ROUTINE_DISCLAIMER, TURN_KEYS, TURN_LABELS, WEEKDAY_NAMES, WEEKDAY_SHORT } from '../../data/studyMethod';
import type { ExamShift, StudyPlanPrefs, TurnState } from '../../types';
import { OptionChip, PlanModal, blocksToHours } from './planShared';
import { BlockPicker } from './BlockPicker';
import { WeekTurnsEditor } from './WeekTurnsEditor';
import SquishSwitch from '../shared/SquishSwitch';
import { shakeElement, shakeField } from '../shared/ErrorShake';
import { ExamWeeksPicker } from './ExamWeeksPicker';
import { MethodEditor } from './MethodEditor';

interface StudyRoutineModalProps {
  open: boolean;
  onClose: () => void;
  /** Mini-configuração da 1ª visita (3 perguntas) */
  firstTime?: boolean;
  /** Conta nova: a pesquisa abre ao entrar; as 3 perguntas obrigatórias precisam de resposta */
  required?: boolean;
}

const HOURS_OPTIONS = [
  { label: '1 hora', hint: '≈ 50 min de foco', blocks: 2 },
  { label: '2 horas', hint: '≈ 1h40 de foco', blocks: 4 },
  { label: '3 horas', hint: '≈ 2h30 de foco', blocks: 6 },
  { label: '4 horas', hint: '≈ 3h20 de foco', blocks: 8 },
  { label: '5 h ou mais', hint: '≈ 4h10 de foco', blocks: 10 },
];

// Dias na ordem da semana brasileira (segunda primeiro)
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Sábado livre → misturadas no sábado; sábado ocupado → domingo (se não for o descanso) ou nenhum */
const mixedDayFor = (saturdayBusy: boolean, restDay: number | null): number | null => {
  if (!saturdayBusy && restDay !== 6) return 6;
  if (restDay !== 0) return 0;
  return null;
};

/** Pesquisa rápida → semana por turnos: dias úteis e fim de semana com os turnos livres marcados */
const buildWeekTurns = (weekday: ExamShift[], weekend: ExamShift[]): TurnState[][] =>
  Array.from({ length: 7 }, (_, dow) => {
    const free = dow === 0 || dow === 6 ? weekend : weekday;
    return TURN_KEYS.map((k) => (free.includes(k) ? 'livre' : 'ocupado')) as TurnState[];
  });
const freeTurnsOf = (day?: TurnState[]): ExamShift[] | null => (day ? TURN_KEYS.filter((_, i) => day[i] === 'livre') : null);

const SectionTitle: React.FC<{ children: React.ReactNode; hint?: React.ReactNode }> = ({ children, hint }) => (
  <div className="mb-2">
    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{children}</p>
    {hint && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>}
  </div>
);

const Toggle: React.FC<{ id: string; on: boolean; onChange: (v: boolean) => void; label: string; hint: string }> = ({ id, on, onChange, label, hint }) => (
  <div className="w-full min-h-[48px] flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-3.5 py-2.5 hover:border-sky-400 dark:hover:border-sky-700 transition-colors">
    <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer">
      <span className="block text-sm font-bold text-slate-900 dark:text-white">{label}</span>
      <span className="block text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>
    </label>
    <SquishSwitch id={id} checked={on} onChange={onChange} width={48} height={28} radius={14} trackColor="#cbd5e1" trackOnColor="#0284c7" className="shrink-0" />
  </div>
);

export const StudyRoutineModal: React.FC<StudyRoutineModalProps> = ({ open, onClose, firstTime: firstTimeProp, required }) => {
  const firstTime = firstTimeProp || required;
  const { studyPrefs, studyPhase, updateStudyPrefs, showNotification } = useApp();
  const phase = PHASE_INFO[studyPhase];
  const [mode, setMode] = useState<'quick' | 'full'>(firstTime ? 'quick' : 'full');
  const [draft, setDraft] = useState<StudyPlanPrefs>(studyPrefs);
  const [weekdayFree, setWeekdayFree] = useState<ExamShift[] | null>(null);
  const [weekendFree, setWeekendFree] = useState<ExamShift[] | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [touched, setTouched] = useState({ hours: false, rest: false });

  useEffect(() => {
    if (!open) return;
    setDraft(studyPrefs);
    setMode(firstTime ? 'quick' : 'full');
    setWeekdayFree(freeTurnsOf(studyPrefs.weekTurns?.[1]));
    setWeekendFree(freeTurnsOf(studyPrefs.weekTurns?.[6]));
    setConfirmReset(false);
    setTouched({ hours: false, rest: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, firstTime]);

  const set = <K extends keyof StudyPlanPrefs>(k: K, v: StudyPlanPrefs[K]) => setDraft((d) => ({ ...d, [k]: v }));
  // Versão rápida: sábado sem turno livre = sábado ocupado; o dia das misturadas nunca cai no descanso
  const saturdayBusy = weekendFree === null ? null : weekendFree.length === 0;
  const quickTurns = weekdayFree !== null || weekendFree !== null ? buildWeekTurns(weekdayFree ?? ['manha', 'tarde', 'noite'], weekendFree ?? []) : undefined;
  const quickMixed =
    saturdayBusy !== null ? mixedDayFor(saturdayBusy, draft.restDay) : draft.mixedDay !== draft.restDay ? draft.mixedDay : mixedDayFor(true, draft.restDay);
  const sameDay = mode === 'full' && draft.restDay !== null && draft.restDay === draft.mixedDay;

  const missing = required ? [!touched.hours && 'tempo por dia', weekdayFree === null && 'turnos livres', !touched.rest && 'dia de descanso'].filter(Boolean) as string[] : [];
  const save = () => {
    if (missing.length > 0) {
      // Balança as perguntas obrigatórias que faltam
      if (!touched.hours) shakeField('routine-q-hours', 0, false);
      if (weekdayFree === null) shakeField('routine-q-weekday', 0, false);
      if (!touched.rest) shakeField('routine-q-rest', 0, false);
      shakeElement(document.getElementById('routine-missing'));
      document.querySelector(`[data-shake-field="${!touched.hours ? 'routine-q-hours' : weekdayFree === null ? 'routine-q-weekday' : 'routine-q-rest'}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (sameDay) return;
    const final: StudyPlanPrefs = mode === 'quick' ? { ...draft, mixedDay: quickMixed, weekTurns: quickTurns ?? draft.weekTurns } : draft;
    const changes: Partial<StudyPlanPrefs> = {};
    (Object.keys(final) as Array<keyof StudyPlanPrefs>).forEach((k) => {
      if (final[k] !== studyPrefs[k]) (changes as any)[k] = final[k];
    });
    // Na 1ª vez sempre grava algo (para a mini-configuração não voltar)
    if (Object.keys(changes).length > 0 || firstTime) updateStudyPrefs(Object.keys(changes).length > 0 ? changes : { dailyPomodoros: final.dailyPomodoros });
    onClose();
  };

  // 1ª vez: fechar sem responder não abre de novo sozinho, então avisa onde ajustar depois
  const skipFirstTime = () => {
    showNotification('Sem problema. Quando quiser, ajuste em Personalizar › Minha rotina ou em "Rotina" no Planner.', 'info');
    onClose();
  };

  // ---------------------------------------------------------------- versão rápida (1ª vez): pesquisa de rotina
  if (mode === 'quick') {
    const turnChip = (list: ExamShift[] | null, setList: (v: ExamShift[]) => void, k: ExamShift, idPrefix: string, i: number) => {
      const on = !!list?.includes(k);
      return (
        <OptionChip
          key={k}
          id={`${idPrefix}-${k}`}
          active={on}
          onClick={() => setList(on ? (list || []).filter((x) => x !== k) : [...(list || []), k])}
          className="min-h-[44px] text-sm"
        >
          {TURN_LABELS[i]}
        </OptionChip>
      );
    };
    const Q = ({ n, children, optional }: { n: number; children: React.ReactNode; optional?: boolean }) => (
      <p className="text-sm font-black text-slate-900 dark:text-white mb-2 flex items-start gap-2">
        <span className={`shrink-0 h-6 w-6 rounded-full text-xs grid place-items-center ${optional ? 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-200' : 'bg-sky-600 text-white'}`}>{n}</span>
        <span className="pt-0.5 flex-1">
          {children}{' '}
          {required && (
            <span className={`ml-1 align-middle inline-block text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ${optional ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400' : 'bg-sky-500/15 text-sky-700 dark:text-sky-300'}`}>
              {optional ? 'Opcional' : 'Obrigatória'}
            </span>
          )}
        </span>
      </p>
    );
    return (
      <PlanModal
        id="routine-first-time"
        open={open}
        onClose={firstTime ? skipFirstTime : onClose}
        hideClose={required}
        icon={<Sparkles className="h-5 w-5" />}
        title="Vamos conhecer sua rotina?"
        subtitle="Leva 1 minuto. O site usa suas respostas para montar o plano do dia do seu jeito. Dá para mudar depois em Personalizar."
        footer={
          <>
            {required ? (
              <p id="routine-missing" className={`mr-auto text-[11px] ${missing.length > 0 ? 'text-rose-600 dark:text-rose-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                {missing.length > 0 ? `Falta responder: ${missing.join(', ')}.` : 'Tudo certo. As opcionais podem ficar para depois.'}
              </p>
            ) : (
              <button type="button" id="routine-skip" onClick={firstTime ? skipFirstTime : onClose} className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                Agora não
              </button>
            )}
            <button
              type="button"
              id="routine-quick-save"
              onClick={save}
              aria-disabled={missing.length > 0}
              className={`min-h-[44px] px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black flex items-center gap-1.5 ${missing.length > 0 ? 'opacity-50' : ''}`}
            >
              <Check className="h-4 w-4" /> Pronto, montar meu plano
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <section>
            <Q n={1}>Quanto tempo por dia você consegue estudar?</Q>
            <div data-shake-field="routine-q-hours">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {HOURS_OPTIONS.map((o) => (
                <button
                  key={o.blocks}
                  type="button"
                  id={`routine-hours-${o.blocks}`}
                  onClick={() => {
                    set('dailyPomodoros', o.blocks);
                    setTouched((t) => ({ ...t, hours: true }));
                  }}
                  aria-pressed={draft.dailyPomodoros === o.blocks && (!required || touched.hours)}
                  className={`min-h-[56px] rounded-2xl border px-3 py-2 text-left transition-colors ${
                    draft.dailyPomodoros === o.blocks && (!required || touched.hours)
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-sky-400'
                  }`}
                >
                  <span className="block text-sm font-black">{o.label}</span>
                  <span className={`block text-[11px] ${draft.dailyPomodoros === o.blocks && (!required || touched.hours) ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>{o.hint}</span>
                </button>
              ))}
            </div>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Seja realista: é melhor cumprir 1 hora todo dia do que planejar 4 e desanimar.</p>
          </section>

          <section>
            <Q n={2}>De segunda a sexta, quais turnos ficam livres para estudar?</Q>
            <div data-shake-field="routine-q-weekday" className="grid grid-cols-4 gap-2">
              {TURN_KEYS.map((k, i) => turnChip(weekdayFree, setWeekdayFree, k, 'routine-wd', i))}
              <OptionChip id="routine-wd-none" active={weekdayFree?.length === 0} onClick={() => setWeekdayFree([])} className="min-h-[44px] text-sm">
                Nenhum
              </OptionChip>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Pode marcar mais de um. Os outros contam como ocupados (aula, estágio, trabalho).</p>
          </section>

          <section>
            <Q n={3} optional>E no sábado e domingo?</Q>
            <div className="grid grid-cols-3 gap-2">{TURN_KEYS.map((k, i) => turnChip(weekendFree, setWeekendFree, k, 'routine-we', i))}</div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              {weekendFree === null
                ? 'Se o fim de semana for todo ocupado, deixe sem marcar e toque em Pronto.'
                : quickMixed === null
                  ? 'Sem dia fixo para questões misturadas: elas entram aos poucos nos outros dias.'
                  : `${WEEKDAY_NAMES[quickMixed]} vira o dia das questões misturadas + caderno de erros.`}
            </p>
          </section>

          <section>
            <Q n={4} optional>Em qual turno você rende mais?</Q>
            <div className="grid grid-cols-4 gap-2">
              {TURN_KEYS.map((k, i) => (
                <OptionChip key={k} id={`routine-quick-best-${k}`} active={draft.bestTurn === k} onClick={() => set('bestTurn', k)} className="min-h-[44px] text-sm">
                  {TURN_LABELS[i]}
                </OptionChip>
              ))}
              <OptionChip id="routine-quick-best-none" active={!draft.bestTurn} onClick={() => set('bestTurn', undefined)} className="min-h-[44px] text-sm">
                Tanto faz
              </OptionChip>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">O plano sugere o tema novo nesse turno.</p>
          </section>

          <section>
            <Q n={5}>Qual dia é de descanso?</Q>
            <div data-shake-field="routine-q-rest" className="flex flex-wrap gap-1.5">
              {WEEK_ORDER.map((d) => (
                <OptionChip
                  key={d}
                  id={`routine-rest-${d}`}
                  active={draft.restDay === d && (!required || touched.rest)}
                  onClick={() => {
                    set('restDay', d);
                    setTouched((t) => ({ ...t, rest: true }));
                  }}
                  className="min-w-[48px]"
                >
                  {WEEKDAY_SHORT[d]}
                </OptionChip>
              ))}
              <OptionChip
                id="routine-rest-none"
                active={draft.restDay === null && (!required || touched.rest)}
                onClick={() => {
                  set('restDay', null);
                  setTouched((t) => ({ ...t, rest: true }));
                }}
              >
                Não tenho
              </OptionChip>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Descanso de verdade também faz parte do método: só 20 min para planejar a semana.</p>
          </section>

          <section>
            <Q n={6} optional>Qual bloco de foco funciona para você?</Q>
            <BlockPicker
              idPrefix="routine-quick-long"
              focus={draft.focusMinutes}
              rest={draft.breakMinutes}
              onChange={(fo, re) => setDraft((d) => ({ ...d, focusMinutes: fo, breakMinutes: re }))}
            />
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Foco/pausa em minutos. Na dúvida, 25/5 é um ótimo começo.</p>
          </section>

          <section className="space-y-2">
            <Q n={7} optional>O que já faz parte do seu estudo?</Q>
            <Toggle id="routine-quick-flashcards" on={draft.usesFlashcards} onChange={(v) => set('usesFlashcards', v)} label="Flashcards (Anki ou cartões)" hint="Entram como 1º passo do dia" />
            <Toggle id="routine-quick-summary" on={draft.readsSummary !== false} onChange={(v) => set('readsSummary', v)} label="Ler meu resumo" hint="Leitura ativa: tampe e tente lembrar antes de ler" />
          </section>

          <button
            type="button"
            id="routine-more"
            onClick={() => {
              setDraft((d) => ({ ...d, mixedDay: quickMixed, weekTurns: quickTurns ?? d.weekTurns }));
              setMode('full');
            }}
            className="min-h-[40px] text-sm font-bold text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1.5">
            <Settings2 className="h-4 w-4" /> Quero ajustar mais detalhes (turno por turno de cada dia)
          </button>
        </div>
      </PlanModal>
    );
  }

  // ---------------------------------------------------------------- versão completa
  const focusLabel = `${draft.focusMinutes}/${draft.breakMinutes}`;
  return (
    <PlanModal
      id="routine-modal"
      open={open}
      onClose={onClose}
      icon={<Settings2 className="h-5 w-5" />}
      title="Minha rotina"
      subtitle="O plano do dia segue estas escolhas. Comece pelos padrões da sua fase e ajuste ao seu jeito."
      footer={
        <>
          <button type="button" onClick={onClose} className="min-h-[40px] px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            Cancelar
          </button>
          <button
            type="button"
            id="routine-save"
            onClick={save}
            disabled={sameDay}
            className="min-h-[40px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" /> Salvar rotina
          </button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Fase atual */}
        <div className="rounded-2xl border p-3.5 flex items-start gap-3" style={{ borderColor: `${phase.color}55`, backgroundColor: `${phase.color}12` }}>
          <span className="text-2xl leading-none">{phase.emoji}</span>
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-wider ink" style={{ '--ink': phase.color } as React.CSSProperties}>
              Sua fase: {phase.label}
            </p>
            <p className="text-xs text-slate-700 dark:text-slate-200 mt-0.5">{phase.priority}.</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
              Padrão da fase: bloco {phase.defaults.focusMinutes}/{phase.defaults.breakMinutes} para tema novo e {phase.defaults.shortFocusMinutes}/{phase.defaults.shortBreakMinutes} para revisões, {phase.defaults.newTopicsPerDay} tema novo por dia
              {phase.defaults.longTermGoal ? ', intervalos longos de manutenção' : ''}.
            </p>
          </div>
        </div>

        {/* Blocos por dia */}
        <section>
          <SectionTitle hint="Quanto tempo de foco cabe no seu dia (sem contar as pausas). Cada ponto = 25 min.">Tempo de foco por dia</SectionTitle>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Menos 25 minutos"
              onClick={() => set('dailyPomodoros', Math.max(2, draft.dailyPomodoros - 1))}
              className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-sky-400"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="flex-1 text-center">
              <p id="routine-blocks-value" className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                {blocksToHours(draft.dailyPomodoros)} <span className="text-sm font-bold text-slate-500 dark:text-slate-400">de foco</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                ≈ {Math.max(1, Math.round((draft.dailyPomodoros * 25) / draft.focusMinutes))} bloco{Math.round((draft.dailyPomodoros * 25) / draft.focusMinutes) > 1 ? 's' : ''} de {draft.focusMinutes} min ·{' '}
                {Math.max(1, Math.round((draft.dailyPomodoros * 25) / draft.shortFocusMinutes))} de {draft.shortFocusMinutes} min
              </p>
            </div>
            <button
              type="button"
              aria-label="Mais 25 minutos"
              onClick={() => set('dailyPomodoros', Math.min(16, draft.dailyPomodoros + 1))}
              className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-sky-400"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Semana por turnos */}
        <section id="routine-turns-section">
          <SectionTitle hint="Marque cada turno como livre, ocupado (aula, estágio, trabalho) ou descanso. O plano usa isso para saber quanto cabe em cada dia.">
            Minha semana por turnos
          </SectionTitle>
          <WeekTurnsEditor
            value={draft.weekTurns}
            onChange={(v) => set('weekTurns', v)}
            bestTurn={draft.bestTurn}
            onBestTurn={(v) => set('bestTurn', v)}
            detailed={draft.turnsDetailed}
            onDetailed={(v) => set('turnsDetailed', v || undefined)}
            turnPlans={draft.turnPlans}
            onTurnPlans={(v) => set('turnPlans', v)}
          />
        </section>

        {/* Semanas de prova */}
        <section>
          <SectionTitle hint="Na semana de prova o plano aumenta seu tempo de foco em 50% e dá prioridade às matérias da prova. Toque para marcar.">
            Semanas de prova
          </SectionTitle>
          <ExamWeeksPicker value={draft.examWeeks} onChange={(v) => set('examWeeks', v)} />
        </section>

        {/* Meu método: passos do 1º e do 2º contato */}
        <section id="routine-method-section">
          <SectionTitle hint="Como você estuda um tema novo e como faz a 1ª revisão. O plano do dia mostra estes passos para marcar.">
            Meu método de estudo
          </SectionTitle>
          <MethodEditor
            first={draft.firstContactSteps}
            second={draft.secondContactSteps}
            onChange={(a, b) => setDraft((d) => ({ ...d, firstContactSteps: a, secondContactSteps: b }))}
          />
        </section>

        {/* Meus blocos de foco */}
        <section id="routine-blocks-section">
          <SectionTitle hint="Escolha o tempo que funciona para você. O plano, o Pomodoro e o ciclo de estudos usam estes blocos.">
            Meu bloco longo (tema novo, imersão)
          </SectionTitle>
          <BlockPicker
            idPrefix="routine-long"
            focus={draft.focusMinutes}
            rest={draft.breakMinutes}
            onChange={(fo, re) => setDraft((d) => ({ ...d, focusMinutes: fo, breakMinutes: re }))}
          />
        </section>
        <section>
          <SectionTitle hint="Revisões, questões e flashcards. No dia difícil e no plantão, o plano usa só este.">Meu bloco curto (revisões e questões)</SectionTitle>
          <BlockPicker
            idPrefix="routine-short"
            focus={draft.shortFocusMinutes}
            rest={draft.shortBreakMinutes}
            onChange={(fo, re) => setDraft((d) => ({ ...d, shortFocusMinutes: fo, shortBreakMinutes: re }))}
          />
          <span className="sr-only">Blocos atuais: longo {focusLabel}, curto {draft.shortFocusMinutes}/{draft.shortBreakMinutes}</span>
        </section>

        {/* Descanso */}
        <section>
          <SectionTitle hint="Descanso: só 20 min para planejar a semana. Revisões vencidas ficam opcionais.">Dia de descanso</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {WEEK_ORDER.map((d) => (
              <OptionChip key={d} id={`routine-restday-${d}`} active={draft.restDay === d} onClick={() => set('restDay', d)} className="min-w-[48px]">
                {WEEKDAY_SHORT[d]}
              </OptionChip>
            ))}
            <OptionChip id="routine-restday-none" active={draft.restDay === null} onClick={() => set('restDay', null)}>
              Nenhum
            </OptionChip>
          </div>
        </section>

        {/* Misturadas */}
        <section>
          <SectionTitle hint="Questões de várias áreas + caderno de erros (intercalação).">Dia das questões misturadas</SectionTitle>
          <div className="flex flex-wrap gap-1.5">
            {WEEK_ORDER.map((d) => (
              <OptionChip key={d} id={`routine-mixedday-${d}`} active={draft.mixedDay === d} onClick={() => set('mixedDay', d)} className="min-w-[48px]">
                {WEEKDAY_SHORT[d]}
              </OptionChip>
            ))}
            <OptionChip id="routine-mixedday-none" active={draft.mixedDay === null} onClick={() => set('mixedDay', null)}>
              Nenhum
            </OptionChip>
          </div>
          {sameDay && <p className="mt-1.5 text-[11px] font-bold text-amber-700 dark:text-amber-300">O dia de descanso e o das misturadas não podem ser o mesmo.</p>}
        </section>

        {/* Temas novos */}
        <section>
          <SectionTitle hint="Revisões vêm antes. Se o dia apertar, o tema novo é o que espera.">Temas novos por dia</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            {([1, 2, 3] as const).map((n) => (
              <OptionChip key={n} id={`routine-new-${n}`} active={draft.newTopicsPerDay === n} onClick={() => set('newTopicsPerDay', n)} className="min-h-[44px] text-sm">
                {n}
              </OptionChip>
            ))}
          </div>
        </section>

        <section className="space-y-2">
          <Toggle id="routine-flashcards" on={draft.usesFlashcards} onChange={(v) => set('usesFlashcards', v)} label="Flashcards todo dia" hint="Anki ou cartões: entra como 1º passo do dia" />
          <Toggle id="routine-summary" on={draft.readsSummary !== false} onChange={(v) => set('readsSummary', v)} label="Ler o resumo todo dia" hint="Leitura ativa do seu resumo: tampe e tente lembrar antes de ler" />
          <Toggle
            id="routine-longterm"
            on={draft.longTermGoal}
            onChange={(v) => set('longTermGoal', v)}
            label="Meta de longo prazo (residência / internato)"
            hint="Revisões de manutenção com intervalos mais longos"
          />
        </section>

        {/* Voltar aos padrões */}
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-3">
          {confirmReset ? (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs text-slate-700 dark:text-slate-200 flex-1 min-w-[160px]">Voltar tudo para o padrão do {phase.label}?</p>
              <button type="button" onClick={() => setConfirmReset(false)} className="min-h-[36px] px-3 rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
                Não
              </button>
              <button
                type="button"
                id="routine-reset-confirm"
                onClick={() => {
                  updateStudyPrefs(null);
                  onClose();
                }}
                className="min-h-[36px] px-3 rounded-lg bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 text-xs font-black"
              >
                Sim, voltar
              </button>
            </div>
          ) : (
            <button type="button" id="routine-reset" onClick={() => setConfirmReset(true)} className="w-full min-h-[36px] flex items-center justify-center gap-1.5 text-xs font-bold text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-300">
              <RotateCcw className="h-3.5 w-3.5" /> Voltar aos padrões da minha fase
            </button>
          )}
        </div>

        <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center italic">{ROUTINE_DISCLAIMER}</p>
      </div>
    </PlanModal>
  );
};
