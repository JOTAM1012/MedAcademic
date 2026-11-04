// Calendário acadêmico: 1º semestre de 01/01 a 30/06, 2º semestre de 01/08 a 31/12, férias em julho.
import { ymd } from './blockReview';

export interface AcademicPeriod {
  code: string; // "2026.1" | "2026.2"
  year: number;
  half: 1 | 2;
  start: string; // YYYY-MM-DD
  end: string;
}

export const periodOf = (year: number, half: 1 | 2): AcademicPeriod => ({
  code: `${year}.${half}`,
  year,
  half,
  start: half === 1 ? `${year}-01-01` : `${year}-08-01`,
  end: half === 1 ? `${year}-06-30` : `${year}-12-31`,
});

export const periodByCode = (code?: string): AcademicPeriod | undefined => {
  const m = /^(\d{4})\.([12])$/.exec(code || '');
  return m ? periodOf(Number(m[1]), Number(m[2]) as 1 | 2) : undefined;
};

export const isVacation = (date = ymd(new Date())) => date.slice(5, 7) === '07';

/** Semestre em que a data cai; em julho (férias) devolve o semestre que vem (agosto) */
export const periodForDate = (date = ymd(new Date())): AcademicPeriod => {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  return month <= 6 ? periodOf(year, 1) : periodOf(year, 2);
};

export const nextPeriod = (p: AcademicPeriod): AcademicPeriod => (p.half === 1 ? periodOf(p.year, 2) : periodOf(p.year + 1, 1));

export const periodLabel = (p?: AcademicPeriod) =>
  p ? `${p.code} · ${p.half === 1 ? '01/01 a 30/06' : '01/08 a 31/12'}` : '';

const dayMs = 86400000;
const toDate = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const daysUntil = (from: string, to: string) => Math.round((toDate(to).getTime() - toDate(from).getTime()) / dayMs);

/** Progresso (0–100) do semestre na data */
export const periodProgress = (p: AcademicPeriod, date = ymd(new Date())) => {
  const total = daysUntil(p.start, p.end) + 1;
  const done = Math.min(total, Math.max(0, daysUntil(p.start, date) + 1));
  return Math.round((done / total) * 100);
};

export const inPeriod = (p: AcademicPeriod | undefined, date?: string) => !!p && !!date && date >= p.start && date <= p.end;

/** "9º Semestre - Internato" → "10º Semestre - Internato" */
export const nextSemesterName = (name: string) => {
  const m = /^(\d+)\s*([ºo°])?/.exec(name.trim());
  if (!m) return 'Próximo semestre';
  const n = Number(m[1]) + 1;
  return name.trim().replace(/^(\d+)\s*([ºo°])?/, `${n}${m[2] || 'º'}`);
};
