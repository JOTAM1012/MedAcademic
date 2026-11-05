import { MEDICAL_SCHOOLS, type MedicalSchoolRow } from './medicalSchoolsList';

export interface MedicalSchool {
  code: string;
  sigla: string;
  name: string;
  category: MedicalSchoolRow[3];
  generatedSigla: boolean;
}

const toSchool = (r: MedicalSchoolRow): MedicalSchool => ({ code: r[0], sigla: r[1], name: r[2], category: r[3], generatedSigla: r[4] === 1 });

export const ALL_SCHOOLS: MedicalSchool[] = MEDICAL_SCHOOLS.map(toSchool);

export const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

const indexed = ALL_SCHOOLS.map((s) => ({ s, sig: norm(s.sigla), nm: norm(s.name) }));

export const schoolByCode = (code?: string) => (code ? ALL_SCHOOLS.find((s) => s.code === code) : undefined);

/** Busca por sigla ou nome (sem acento, em qualquer parte) */
export const searchSchools = (query: string, limit = 8): MedicalSchool[] => {
  const q = norm(query);
  if (!q) return [];
  const words = q.split(' ');
  return indexed
    .map(({ s, sig, nm }) => {
      let score = 0;
      if (sig === q) score = 100;
      else if (sig.startsWith(q)) score = 80;
      else if (sig.includes(q)) score = 60;
      if (words.every((w) => nm.includes(w))) score = Math.max(score, nm.startsWith(q) ? 55 : nm.split(' ').some((w) => w.startsWith(words[0])) ? 45 : 35);
      return { s, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || a.s.sigla.localeCompare(b.s.sigla, 'pt'))
    .slice(0, limit)
    .map((x) => x.s);
};

/** Nomes antigos / siglas que mudaram (ex.: a FAMAZ virou centro universitário: UNIFAMAZ) */
const ALIASES: Record<string, string> = {
  famaz: 'unifamaz',
};

/**
 * Atualiza a faculdade escrita à mão (perfis antigos) para a da lista do e-MEC.
 * Só aceita correspondência exata de sigla ou de nome (ou um apelido conhecido) e sem ambiguidade.
 */
export const matchSchool = (text?: string): MedicalSchool | undefined => {
  if (!text) return undefined;
  let q = norm(text);
  if (!q) return undefined;
  q = ALIASES[q] || q;
  const bySigla = indexed.filter((x) => x.sig === q);
  if (bySigla.length === 1) return bySigla[0].s;
  const byName = indexed.filter((x) => x.nm === q);
  if (byName.length === 1) return byName[0].s;
  return undefined;
};

export const CATEGORY_STYLE: Record<MedicalSchool['category'], string> = {
  Federal: 'bg-emerald-500/15 text-emerald-300',
  Estadual: 'bg-sky-500/15 text-sky-300',
  Municipal: 'bg-cyan-500/15 text-cyan-300',
  Especial: 'bg-violet-500/15 text-violet-300',
  Privada: 'bg-slate-500/20 text-slate-300',
};
