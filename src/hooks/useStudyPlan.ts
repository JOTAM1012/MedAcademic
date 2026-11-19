// Hooks do Método de estudo: plano do dia e carga da semana, calculados uma vez por mudança de dados.
import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { autoHabits, buildDayPlan, buildWeekLoad, dueReviewCount, type DayPlan, type PlanInput } from '../data/studyMethod';
import { ymd } from '../data/blockReview';

/** "Hoje" no fuso local (YYYY-MM-DD) */
export const todayYMD = () => ymd(new Date());

/** Entrada do plano (tudo que vem do contexto), memorizada */
export const usePlanInput = (): Omit<PlanInput, 'date'> => {
  const { topicBlocks, topics, subjects, exams, schedule, studySessions, studyMethod, studyPrefs, studyPhase, residencyPrep, currentSubjectIds } = useApp();
  const today = todayYMD();
  const idsKey = currentSubjectIds.join('|');
  return useMemo(
    () => ({
      today,
      blocks: topicBlocks,
      topics,
      subjects,
      currentSubjectIds,
      exams,
      schedule,
      sessions: studySessions,
      method: studyMethod,
      prefs: studyPrefs,
      phase: studyPhase,
      residencyPrep,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [today, topicBlocks, topics, subjects, idsKey, exams, schedule, studySessions, studyMethod, JSON.stringify(studyPrefs), studyPhase, residencyPrep]
  );
};

/** Plano de um dia (padrão: hoje) */
export const useDayPlan = (date?: string): DayPlan => {
  const input = usePlanInput();
  const d = date || input.today || todayYMD();
  return useMemo(() => buildDayPlan({ ...input, date: d }), [input, d]);
};

/** Carga de vários dias (visão Semana, Planejar semana) */
export const useWeekLoad = (dates: string[]) => {
  const input = usePlanInput();
  const key = dates.join('|');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => buildWeekLoad(input, dates), [input, key]);
};

/** Checklist diário: itens marcados (automáticos + à mão) */
export const useDailyHabits = (date?: string) => {
  const { studySessions, questionLogs, topicBlocks, studyMethod } = useApp();
  const d = date || todayYMD();
  const plan = useDayPlan(d);
  return useMemo(() => {
    const auto = autoHabits({ date: d, plan, sessions: studySessions, questionLogs, blocks: topicBlocks, errorNotes: studyMethod.errorNotes });
    const saved = studyMethod.habits[d] || [];
    // "id" = marcado à mão; "off:id" = automático que o aluno desmarcou
    const off = new Set(saved.filter((x) => x.startsWith('off:')).map((x) => x.slice(4)));
    const checked = new Set<string>(saved.filter((x) => !x.startsWith('off:')));
    auto.forEach((id) => {
      if (!off.has(id)) checked.add(id);
    });
    return { auto, checked };
  }, [d, plan, studySessions, questionLogs, topicBlocks, studyMethod]);
};

/** Revisões vencidas (mesma regra em toda a interface) */
export const useDueReviewCount = () => {
  const { topicBlocks, subjects, studyMethod } = useApp();
  const today = todayYMD();
  return useMemo(() => dueReviewCount(topicBlocks, subjects, today, studyMethod.projects), [topicBlocks, subjects, today, studyMethod.projects]);
};

/**
 * Temas novos de um dia: nada entra sozinho. O aluno adiciona (sugestão aceita ou tema escolhido),
 * dispensa a sugestão ("Agora não") ou tira o tema do dia.
 */
export const useDayThemes = (date?: string) => {
  const { topicBlocks, setDayPlanState, updateTopicBlock } = useApp();
  const d = date || todayYMD();
  const without = (list: string[] | undefined, id: string) => (list || []).filter((x) => x !== id);
  const withId = (list: string[] | undefined, id: string) => Array.from(new Set([...(list || []), id]));
  /** Adiciona o tema ao dia (fica guardado no plano do dia e a data vai para o tema) */
  const addTheme = (blockId: string) => {
    const id = `new:${blockId}`;
    setDayPlanState(d, (s) => ({ ...s, accepted: withId(s.accepted, id), dismissed: without(s.dismissed, id), skipped: without(s.skipped, id) }));
    // O tema pode estar em vários dias: só leva a data se ainda não tiver uma (ou se a dele já passou)
    const b = topicBlocks.find((x) => x.id === blockId);
    if (b && (!b.plannedDate || b.plannedDate < todayYMD())) updateTopicBlock(blockId, { plannedDate: d });
  };
  /** "Agora não": some das sugestões só neste dia */
  const dismissSuggestion = (blockId: string) => setDayPlanState(d, (s) => ({ ...s, dismissed: withId(s.dismissed, `new:${blockId}`) }));
  /** Tira o tema do dia: volta a ficar sem data (não é sugerido de novo neste dia) */
  const removeTheme = (blockId: string) => {
    const id = `new:${blockId}`;
    setDayPlanState(d, (s) => {
      // As escolhas do Detalhado para este tema saem junto
      let detail = s.detail;
      if (detail && detail[id]) {
        detail = { ...detail };
        delete detail[id];
      }
      return { ...s, accepted: without(s.accepted, id), dismissed: withId(s.dismissed, id), order: s.order ? without(s.order, id) : s.order, pinned: s.pinned ? without(s.pinned, id) : s.pinned, detail };
    });
    const b = topicBlocks.find((x) => x.id === blockId);
    // só a data deste dia sai (os outros dias em que o tema está continuam)
    if (b && b.plannedDate === d) updateTopicBlock(blockId, { plannedDate: undefined });
  };
  return { addTheme, dismissSuggestion, removeTheme };
};
