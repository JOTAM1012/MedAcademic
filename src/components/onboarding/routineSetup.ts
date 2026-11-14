// Rotina do cadastro: respostas rápidas (só seleção) → preferências do plano (studyPrefs).
// Mesmas regras da pesquisa rápida da "Minha rotina" (StudyRoutineModal, modo 'quick').
// No cadastro a conta ainda não existe: as respostas ficam guardadas e são aplicadas
// depois que o perfil é criado e carregado (usePendingRoutine, chamado no App).
import { useEffect } from 'react';
import { TURN_KEYS } from '../../data/studyMethod';
import type { ExamShift, StudyPlanPrefs, TurnState } from '../../types';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { userLocalKey, writeLocal } from '../plan/planShared';

export const ROUTINE_HOURS_OPTIONS = [
  { label: '1 hora', hint: '≈ 50 min de foco', blocks: 2 },
  { label: '2 horas', hint: '≈ 1h40 de foco', blocks: 4 },
  { label: '3 horas', hint: '≈ 2h30 de foco', blocks: 6 },
  { label: '4 horas', hint: '≈ 3h20 de foco', blocks: 8 },
  { label: '5 h ou mais', hint: '≈ 4h10 de foco', blocks: 10 },
];

/** Bloco de foco/pausa (min), as mesmas opções do BlockPicker. Padrão: 30/5 */
export const ROUTINE_FOCUS_OPTIONS = [
  { focus: 25, rest: 5 },
  { focus: 30, rest: 5 },
  { focus: 40, rest: 10 },
  { focus: 45, rest: 15 },
  { focus: 50, rest: 10 },
  { focus: 60, rest: 10 },
];
export const DEFAULT_ROUTINE_FOCUS = { focus: 30, rest: 5 };

/** Dias na ordem da semana brasileira (segunda primeiro) */
export const ROUTINE_WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

export interface RoutineAnswers {
  /** blocos de 25 min por dia (null = sem resposta) */
  hoursBlocks: number | null;
  focus: { focus: number; rest: number };
  /** turnos livres de segunda a sexta (null = sem resposta) */
  weekdayFree: ExamShift[] | null;
  /** turnos livres no fim de semana (null = sem resposta) */
  weekendFree: ExamShift[] | null;
  /** dia de descanso: número, null = não tenho, undefined = sem resposta */
  restDay: number | null | undefined;
  /** turno em que rende mais: null = tanto faz, undefined = sem resposta */
  bestTurn: ExamShift | null | undefined;
}

export const EMPTY_ROUTINE_ANSWERS: RoutineAnswers = {
  hoursBlocks: null,
  focus: DEFAULT_ROUTINE_FOCUS,
  weekdayFree: null,
  weekendFree: null,
  restDay: undefined,
  bestTurn: undefined,
};

/** Respondeu alguma pergunta principal? (senão a rotina fica para a pesquisa depois do cadastro) */
export const hasRoutineAnswers = (a: RoutineAnswers) =>
  a.hoursBlocks !== null || a.weekdayFree !== null || a.weekendFree !== null || a.restDay !== undefined || a.bestTurn !== undefined;

/** Sábado livre → misturadas no sábado; sábado ocupado → domingo (se não for o descanso) ou nenhum */
const mixedDayFor = (saturdayBusy: boolean, restDay: number | null): number | null => {
  if (!saturdayBusy && restDay !== 6) return 6;
  if (restDay !== 0) return 0;
  return null;
};

const buildWeekTurns = (weekday: ExamShift[], weekend: ExamShift[]): TurnState[][] =>
  Array.from({ length: 7 }, (_, dow) => {
    const free = dow === 0 || dow === 6 ? weekend : weekday;
    return TURN_KEYS.map((k) => (free.includes(k) ? 'livre' : 'ocupado')) as TurnState[];
  });

/** Só o que foi respondido vira preferência (o resto segue os padrões da fase) */
export const routineAnswersToPrefs = (a: RoutineAnswers): Partial<StudyPlanPrefs> => {
  const out: Partial<StudyPlanPrefs> = { focusMinutes: a.focus.focus, breakMinutes: a.focus.rest };
  if (a.hoursBlocks !== null) out.dailyPomodoros = a.hoursBlocks;
  if (a.restDay !== undefined) out.restDay = a.restDay;
  if (a.bestTurn !== undefined) out.bestTurn = a.bestTurn ?? undefined;
  if (a.weekdayFree !== null || a.weekendFree !== null) {
    out.weekTurns = buildWeekTurns(a.weekdayFree ?? ['manha', 'tarde', 'noite'], a.weekendFree ?? []);
  }
  // Dia das misturadas: pelo sábado livre/ocupado; sem resposta do fim de semana, só sai do sábado se ele for o descanso
  if (a.weekendFree !== null) out.mixedDay = mixedDayFor(a.weekendFree.length === 0, a.restDay ?? null);
  else if (a.restDay === 6) out.mixedDay = mixedDayFor(true, 6);
  return out;
};

/** Marca a rotina como respondida (o Planner não abre a pesquisa da 1ª vez de novo) */
export const markRoutineAnswered = (email?: string) => writeLocal(userLocalKey('routine_setup_shown', email), '1');

// ---------- Respostas guardadas até a conta existir ----------
const PENDING_KEY = 'medacademic_pending_routine';

export const savePendingRoutine = (email: string, prefs: Partial<StudyPlanPrefs>) =>
  writeLocal(PENDING_KEY, JSON.stringify({ email: email.trim().toLowerCase(), prefs, at: new Date().toISOString() }));

const readPendingRoutine = (): { email: string; prefs: Partial<StudyPlanPrefs> } | null => {
  try {
    const raw = localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p && typeof p.email === 'string' && p.prefs ? p : null;
  } catch {
    return null;
  }
};

/** Aplica a rotina do cadastro assim que o perfil novo carrega (inclusive depois de confirmar o e-mail) */
export const usePendingRoutine = () => {
  const { activeUserId } = useAuth();
  const { isInitialLoadComplete, userProfile, updateStudyPrefs } = useApp();
  useEffect(() => {
    if (!activeUserId || !isInitialLoadComplete) return;
    const pending = readPendingRoutine();
    if (!pending) return;
    const ids = [activeUserId, userProfile.email].filter(Boolean).map((x) => String(x).trim().toLowerCase());
    if (!ids.includes(pending.email)) return;
    writeLocal(PENDING_KEY, null);
    updateStudyPrefs(pending.prefs);
    markRoutineAnswered(userProfile.email || pending.email);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeUserId, isInitialLoadComplete, userProfile.email]);
};
