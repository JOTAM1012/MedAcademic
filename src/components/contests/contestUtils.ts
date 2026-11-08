// Provas de concurso: grandes áreas da residência e contas simples (% de acerto, médias)
import { ContestExam } from '../../types';
import { MEDICAL_AREAS } from '../../data/areas';

export interface ContestArea {
  id: string;
  short: string;
  color: string;
}

const colorOf = (id: string, fallback: string) => MEDICAL_AREAS.find((a) => a.id === id)?.color || fallback;

/** As 5 grandes áreas cobradas nas provas de residência */
export const CONTEST_AREAS: ContestArea[] = [
  { id: 'Clínica Médica', short: 'CM', color: colorOf('Clínica Médica', '#2563eb') },
  { id: 'Cirurgia', short: 'CIR', color: colorOf('Cirurgia', '#059669') },
  { id: 'Pediatria', short: 'PED', color: colorOf('Pediatria', '#f59e0b') },
  { id: 'Ginecologia e Obstetrícia', short: 'GO', color: colorOf('Ginecologia', '#9333ea') },
  { id: 'Preventiva', short: 'PREV', color: colorOf('Preventiva', '#0d9488') },
];

export const contestArea = (id: string): ContestArea => CONTEST_AREAS.find((a) => a.id === id) || { id, short: id.slice(0, 3).toUpperCase(), color: '#64748b' };

export const contestPct = (c: Pick<ContestExam, 'totalQuestions' | 'correct'>) =>
  c.totalQuestions > 0 ? Math.round((c.correct / c.totalQuestions) * 100) : 0;

/** Provas em ordem de realização (mais antiga primeiro) */
export const sortContestsAsc = (list: ContestExam[]) =>
  [...list].sort((a, b) => (a.date || '').localeCompare(b.date || '') || a.createdAt.localeCompare(b.createdAt));

export const contestStats = (list: ContestExam[]) => {
  const total = list.reduce((a, c) => a + (c.totalQuestions || 0), 0);
  const correct = list.reduce((a, c) => a + (c.correct || 0), 0);
  const avg = list.length ? Math.round(list.reduce((a, c) => a + contestPct(c), 0) / list.length) : undefined;
  const best = list.length ? Math.max(...list.map(contestPct)) : undefined;
  const byArea = CONTEST_AREAS.map((area) => {
    let t = 0;
    let k = 0;
    list.forEach((c) =>
      (c.areas || []).forEach((x) => {
        if (x.area === area.id && (x.total || 0) > 0) {
          t += x.total || 0;
          k += Math.min(x.correct || 0, x.total || 0);
        }
      })
    );
    return { ...area, total: t, correct: k, pct: t > 0 ? Math.round((k / t) * 100) : undefined };
  }).filter((a) => a.total > 0);
  return { count: list.length, total, correct, avg, best, byArea };
};

export const pctTone = (p?: number) =>
  p === undefined
    ? 'text-slate-400'
    : p >= 80
    ? 'text-emerald-600 dark:text-emerald-400'
    : p >= 60
    ? 'text-amber-600 dark:text-amber-400'
    : 'text-rose-600 dark:text-rose-400';

export const formatMinutes = (m?: number) => {
  if (!m || m <= 0) return '—';
  const h = Math.floor(m / 60);
  const r = m % 60;
  return h ? `${h}h${r ? String(r).padStart(2, '0') : ''}` : `${r} min`;
};

export const formatDateBR = (s?: string) => {
  if (!s) return '';
  const [y, m, d] = s.split('-');
  return d && m ? `${d}/${m}/${y}` : s;
};
