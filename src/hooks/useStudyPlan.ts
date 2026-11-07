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
