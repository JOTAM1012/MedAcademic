// Nome e período do semestre gerados pela escolha (sem digitar).
// O ciclo do app sai do número no início do nome (cycleOfSemester), então o formato é sempre
// "Nº Semestre - Ciclo Básico" / "Nº Semestre - Ciclo Clínico" / "Nº Semestre - Internato".
import { periodForDate } from '../../data/academicCalendar';

export const cycleTitleForNumber = (n: number): string => (n <= 4 ? 'Ciclo Básico' : n <= 8 ? 'Ciclo Clínico' : 'Internato');

/** "3º Semestre - Ciclo Básico" */
export const buildSemesterName = (n: number): string => `${n}º Semestre - ${cycleTitleForNumber(n)}`;

export const semesterNumberOf = (name?: string | null): number => Number((name || '').match(/^\s*(\d{1,2})/)?.[1]) || 0;

/** Nome padrão a partir do número (conserta nomes digitados à mão, ex.: "Ciclo Básicosssss") */
export const canonicalSemesterName = (name?: string | null): string => {
  const n = semesterNumberOf(name);
  return n >= 1 && n <= 12 ? buildSemesterName(n) : name || '';
};

// ---------- Período / ano letivo: ano × 1º/2º semestre → "2026.1" ----------
export const PERIOD_YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

export const parsePeriodCode = (code?: string | null): { year: number; half: 1 | 2 } | null => {
  const m = /^(\d{4})\.([12])$/.exec((code || '').trim());
  return m ? { year: Number(m[1]), half: Number(m[2]) as 1 | 2 } : null;
};

export const periodCodeOf = (year: number, half: 1 | 2) => `${year}.${half}`;

/** Primeiro código válido da lista; senão o período de hoje */
export const pickPeriodCode = (...codes: Array<string | undefined | null>): string => {
  for (const c of codes) if (parsePeriodCode(c)) return (c as string).trim();
  return periodForDate().code;
};

/** Anos para escolher (inclui o ano salvo se estiver fora da lista) */
export const periodYearOptions = (current?: number): number[] =>
  current && !PERIOD_YEARS.includes(current) ? [...PERIOD_YEARS, current].sort((a, b) => a - b) : PERIOD_YEARS;
