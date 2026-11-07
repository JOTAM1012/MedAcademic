// "Minha rotina": preferências do plano do dia (blocos por dia, formato do foco, descanso,
// dia das misturadas, temas novos, flashcards, meta de longo prazo). Versão "primeira vez" com
// 3 perguntas grandes. Salva só o que mudou (updateStudyPrefs); o resto segue os padrões da fase.
import React, { useEffect, useState } from 'react';
import { Check, Minus, Plus, RotateCcw, Settings2, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PHASE_INFO, ROUTINE_DISCLAIMER, WEEKDAY_NAMES, WEEKDAY_SHORT } from '../../data/studyMethod';
import type { StudyPlanPrefs } from '../../types';
import { OptionChip, PlanModal, blocksToHours } from './planShared';

interface StudyRoutineModalProps {
  open: boolean;
  onClose: () => void;
  /** Mini-configuração da 1ª visita (3 perguntas) */
  firstTime?: boolean;
}

const HOURS_OPTIONS = [
  { label: '1 hora', hint: '2 blocos de foco', blocks: 2 },
  { label: '2 horas', hint: '4 blocos', blocks: 4 },
  { label: '3 horas', hint: '6 blocos', blocks: 6 },
  { label: '4 horas', hint: '8 blocos', blocks: 8 },
  { label: '5 h ou mais', hint: '10 blocos', blocks: 10 },
];

// Dias na ordem da semana brasileira (segunda primeiro)
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

/** Sábado livre → misturadas no sábado; sábado ocupado → domingo (se não for o descanso) ou nenhum */
const mixedDayFor = (saturdayBusy: boolean, restDay: number | null): number | null => {
  if (!saturdayBusy && restDay !== 6) return 6;
  if (restDay !== 0) return 0;
  return null;
};

const SectionTitle: React.FC<{ children: React.ReactNode; hint?: React.ReactNode }> = ({ children, hint }) => (
  <div className="mb-2">
    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">{children}</p>
    {hint && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{hint}</p>}
  </div>
);

const Toggle: React.FC<{ id: string; on: boolean; onChange: (v: boolean) => void; label: string; hint: string }> = ({ id, on, onChange, label, hint }) => (
  <button
    type="button"
    id={id}
    role="switch"
    aria-checked={on}
    onClick={() => onChange(!on)}
    className="w-full min-h-[48px] flex items-center justify-between gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-3.5 py-2.5 text-left hover:border-sky-400 dark:hover:border-sky-700 transition-colors"
  >
    <span className="min-w-0">
      <span className="block text-sm font-bold text-slate-900 dark:text-white">{label}</span>
      <span className="block text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>
    </span>
    <span className={`relative shrink-0 h-6 w-11 rounded-full transition-colors ${on ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </span>
  </button>
);

export const StudyRoutineModal: React.FC<StudyRoutineModalProps> = ({ open, onClose, firstTime }) => {
  const { studyPrefs, studyPhase, updateStudyPrefs, showNotification } = useApp();
  const phase = PHASE_INFO[studyPhase];
  const [mode, setMode] = useState<'quick' | 'full'>(firstTime ? 'quick' : 'full');
  const [draft, setDraft] = useState<StudyPlanPrefs>(studyPrefs);
  const [saturdayBusy, setSaturdayBusy] = useState<boolean | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(studyPrefs);
    setMode(firstTime ? 'quick' : 'full');
    setSaturdayBusy(null);
    setConfirmReset(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, firstTime]);

  const set = <K extends keyof StudyPlanPrefs>(k: K, v: StudyPlanPrefs[K]) => setDraft((d) => ({ ...d, [k]: v }));
  // Versão rápida: o dia das misturadas sai da 3ª pergunta (nunca cai no descanso)
  const quickMixed =
    saturdayBusy !== null ? mixedDayFor(saturdayBusy, draft.restDay) : draft.mixedDay !== draft.restDay ? draft.mixedDay : mixedDayFor(true, draft.restDay);
  const sameDay = mode === 'full' && draft.restDay !== null && draft.restDay === draft.mixedDay;

  const save = () => {
    if (sameDay) return;
    const final: StudyPlanPrefs = mode === 'quick' ? { ...draft, mixedDay: quickMixed } : draft;
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
    showNotification('Sem problema. Quando quiser, toque em "Rotina" no topo do Planner.', 'info');
    onClose();
  };

  // ---------------------------------------------------------------- versão rápida (1ª vez)
  if (mode === 'quick') {
    return (
      <PlanModal
        id="routine-first-time"
        open={open}
        onClose={firstTime ? skipFirstTime : onClose}
        icon={<Sparkles className="h-5 w-5" />}
        title="Vamos montar sua rotina?"
        subtitle="3 perguntas rápidas. O site usa isso para dizer o que cabe no seu dia. Dá para mudar quando quiser."
        footer={
          <>
            <button type="button" id="routine-skip" onClick={firstTime ? skipFirstTime : onClose} className="min-h-[40px] px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Agora não. Ajusto depois em Minha rotina
            </button>
            <button
              type="button"
              id="routine-quick-save"
              onClick={save}
              className="min-h-[40px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" /> Pronto, montar meu plano
            </button>
          </>
        }
      >
        <div className="space-y-6">
          <section>
            <p className="text-sm font-black text-slate-900 dark:text-white mb-2">1. Quanto tempo por dia você consegue estudar?</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {HOURS_OPTIONS.map((o) => (
                <button
                  key={o.blocks}
                  type="button"
                  id={`routine-hours-${o.blocks}`}
                  onClick={() => set('dailyPomodoros', o.blocks)}
                  aria-pressed={draft.dailyPomodoros === o.blocks}
                  className={`min-h-[56px] rounded-2xl border px-3 py-2 text-left transition-colors ${
                    draft.dailyPomodoros === o.blocks
                      ? 'bg-sky-600 border-sky-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100 hover:border-sky-400'
                  }`}
                >
                  <span className="block text-sm font-black">{o.label}</span>
                  <span className={`block text-[11px] ${draft.dailyPomodoros === o.blocks ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>{o.hint}</span>
                </button>
              ))}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Seja realista: é melhor cumprir 2 blocos todo dia do que planejar 8 e desanimar.</p>
          </section>

          <section>
            <p className="text-sm font-black text-slate-900 dark:text-white mb-2">2. Qual dia é de descanso?</p>
            <div className="flex flex-wrap gap-1.5">
              {WEEK_ORDER.map((d) => (
                <OptionChip key={d} id={`routine-rest-${d}`} active={draft.restDay === d} onClick={() => set('restDay', d)} className="min-w-[48px]">
                  {WEEKDAY_SHORT[d]}
                </OptionChip>
              ))}
              <OptionChip id="routine-rest-none" active={draft.restDay === null} onClick={() => set('restDay', null)}>
                Não tenho
              </OptionChip>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">Descanso de verdade também faz parte do método: só 20 min para planejar a semana.</p>
          </section>

          <section>
            <p className="text-sm font-black text-slate-900 dark:text-white mb-2">3. Você tem aula ou estágio no sábado?</p>
            <div className="grid grid-cols-2 gap-2">
              <OptionChip id="routine-sat-yes" active={saturdayBusy === true} onClick={() => setSaturdayBusy(true)} className="min-h-[48px] text-sm">
                Sim, tenho
              </OptionChip>
              <OptionChip id="routine-sat-no" active={saturdayBusy === false} onClick={() => setSaturdayBusy(false)} className="min-h-[48px] text-sm">
                Não, fica livre
              </OptionChip>
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              {quickMixed === null
                ? 'Sem dia fixo para questões misturadas: elas entram aos poucos nos outros dias.'
                : `${WEEKDAY_NAMES[quickMixed]} vira o dia das questões misturadas + caderno de erros.`}
            </p>
          </section>

          <button
            type="button"
            id="routine-more"
            onClick={() => {
              setDraft((d) => ({ ...d, mixedDay: quickMixed }));
              setMode('full');
            }}
            className="text-xs font-bold text-sky-700 dark:text-sky-400 hover:underline flex items-center gap-1.5">
            <Settings2 className="h-3.5 w-3.5" /> Quero ajustar mais detalhes
          </button>
        </div>
      </PlanModal>
    );
  }

  // ---------------------------------------------------------------- versão completa
  const focusLabel = draft.focusMinutes === 50 ? '50/10' : '25/5';
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
              Padrão da fase: foco {phase.defaults.focusMinutes === 50 ? '50/10' : '25/5'} para tema novo, {phase.defaults.newTopicsPerDay} tema novo por dia
              {phase.defaults.longTermGoal ? ', intervalos longos de manutenção' : ''}.
            </p>
          </div>
        </div>

        {/* Blocos por dia */}
        <section>
          <SectionTitle hint="1 bloco = 25 min de foco + 5 de pausa. Conte blocos, não horas.">Blocos de foco por dia</SectionTitle>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Menos um bloco"
              onClick={() => set('dailyPomodoros', Math.max(2, draft.dailyPomodoros - 1))}
              className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-sky-400"
            >
              <Minus className="h-4 w-4" />
            </button>
            <div className="flex-1 text-center">
              <p id="routine-blocks-value" className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                {draft.dailyPomodoros} <span className="text-sm font-bold text-slate-500 dark:text-slate-400">blocos</span>
              </p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                ≈ {blocksToHours(draft.dailyPomodoros)} de foco · {blocksToHours(Math.round((draft.dailyPomodoros * 30) / 25))} com as pausas
              </p>
            </div>
            <button
              type="button"
              aria-label="Mais um bloco"
              onClick={() => set('dailyPomodoros', Math.min(16, draft.dailyPomodoros + 1))}
              className="h-11 w-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-center text-slate-700 dark:text-slate-200 hover:border-sky-400"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </section>

        {/* Formato do tema novo */}
        <section>
          <SectionTitle hint="Revisões e questões usam blocos de 25 min. Aqui é o formato do tema novo.">Formato do foco no tema novo</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            <OptionChip id="routine-focus-25" active={draft.focusMinutes === 25} onClick={() => set('focusMinutes', 25)} className="min-h-[52px] text-left">
              <span className="block text-sm">25 / 5</span>
              <span className={`block text-[10px] font-semibold ${draft.focusMinutes === 25 ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>dias corridos, pouca energia</span>
            </OptionChip>
            <OptionChip id="routine-focus-50" active={draft.focusMinutes === 50} onClick={() => set('focusMinutes', 50)} className="min-h-[52px] text-left">
              <span className="block text-sm">50 / 10</span>
              <span className={`block text-[10px] font-semibold ${draft.focusMinutes === 50 ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>imersão em tema novo</span>
            </OptionChip>
          </div>
          <span className="sr-only">Formato atual: {focusLabel}</span>
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
          <Toggle id="routine-flashcards" on={draft.usesFlashcards} onChange={(v) => set('usesFlashcards', v)} label="Uso flashcards todo dia" hint="Anki ou cartões: entra como 1º passo do dia" />
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
