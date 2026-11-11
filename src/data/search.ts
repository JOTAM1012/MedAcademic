import type { ChecklistBlock, ChecklistItem, Exam, Subject, Topic, TopicBlock } from '../types';

// Busca global da barra do topo: acha disciplinas, blocos, tópicos, subtópicos, checklist e provas.

export type SearchKind = 'subject' | 'block' | 'topic' | 'subtopic' | 'checklist' | 'exam';

export interface SearchResult {
  key: string;
  kind: SearchKind;
  title: string;
  path: string;
  color?: string;
  subjectId?: string;
  blockId?: string;
  topicId?: string;
}

export interface SearchGroup {
  kind: SearchKind;
  label: string;
  items: SearchResult[];
}

export interface SearchSource {
  subjects: Subject[];
  topicBlocks: TopicBlock[];
  topics: Topic[];
  checklist: ChecklistItem[];
  checklistBlocks?: ChecklistBlock[];
  exams: Exam[];
}

export const SEARCH_MIN_CHARS = 2;
const PER_GROUP = 6;
const MAX_TOTAL = 20;
const SEP = ' › ';

/** Minúsculas e sem acentos: "Cardiológico" -> "cardiologico" */
export const normalizeText = (s: string | undefined | null): string =>
  (s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

/** 0 = começa com o termo, 1 = começa uma palavra, 2 = contém, -1 = não contém */
const matchScore = (text: string | undefined, q: string): number => {
  const n = normalizeText(text);
  if (!n) return -1;
  const i = n.indexOf(q);
  if (i < 0) return -1;
  if (i === 0) return 0;
  return /[\s\-(/:.,]/.test(n[i - 1]) ? 1 : 2;
};

const formatDate = (ymd: string) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ymd || '');
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ymd || '';
};

export function runGlobalSearch(src: SearchSource, rawQuery: string): SearchGroup[] {
  const q = normalizeText(rawQuery);
  if (q.length < SEARCH_MIN_CHARS) return [];

  const subjectById = new Map(src.subjects.map((s) => [s.id, s]));
  const blockById = new Map(src.topicBlocks.map((b) => [b.id, b]));
  const checkBlockById = new Map((src.checklistBlocks || []).map((b) => [b.id, b]));
  const subjectLabel = (s: Subject) => (s.kind === 'module' ? 'Módulo' : 'Disciplina');

  type Scored = SearchResult & { score: number };
  const subjects: Scored[] = [];
  const blocks: Scored[] = [];
  const topics: Scored[] = [];
  const subtopics: Scored[] = [];
  const checks: Scored[] = [];
  const exams: Scored[] = [];

  for (const s of src.subjects) {
    const sc = Math.min(...[matchScore(s.name, q), matchScore(s.code, q)].map((x) => (x < 0 ? 9 : x)));
    if (sc < 9) {
      subjects.push({ key: `s-${s.id}`, kind: 'subject', title: s.name, path: subjectLabel(s), color: s.color, subjectId: s.id, score: sc });
    }
  }

  for (const b of src.topicBlocks) {
    const s = subjectById.get(b.subjectId);
    if (!s) continue;
    const sc = matchScore(b.name, q);
    if (sc >= 0) {
      blocks.push({ key: `b-${b.id}`, kind: 'block', title: b.name, path: s.name, color: s.color, subjectId: s.id, blockId: b.id, score: sc });
    }
  }

  for (const t of src.topics) {
    const s = subjectById.get(t.subjectId);
    if (!s) continue;
    const b = t.blockId ? blockById.get(t.blockId) : undefined;
    const base = b ? `${s.name}${SEP}${b.name}` : s.name;
    const sc = matchScore(t.title, q);
    if (sc >= 0) {
      topics.push({ key: `t-${t.id}`, kind: 'topic', title: t.title, path: base, color: s.color, subjectId: s.id, blockId: b?.id, topicId: t.id, score: sc });
    }
    for (const d of t.details || []) {
      const dsc = matchScore(d.title, q);
      if (dsc >= 0) {
        subtopics.push({
          key: `st-${t.id}-${d.id}`,
          kind: 'subtopic',
          title: d.title,
          path: `${base}${SEP}${t.title}`,
          color: s.color,
          subjectId: s.id,
          blockId: b?.id,
          topicId: t.id,
          score: dsc,
        });
      }
    }
  }

  for (const c of src.checklist) {
    const cb = c.blockId ? checkBlockById.get(c.blockId) : undefined;
    const base = cb ? `Checklist${SEP}${cb.name}` : 'Checklist';
    const sc = matchScore(c.text, q);
    if (sc >= 0) checks.push({ key: `c-${c.id}`, kind: 'checklist', title: c.text, path: base, color: cb?.color, score: sc });
    for (const d of c.details || []) {
      const dsc = matchScore(d.title, q);
      if (dsc >= 0) {
        checks.push({ key: `cd-${c.id}-${d.id}`, kind: 'checklist', title: d.title, path: `${base}${SEP}${c.text}`, color: cb?.color, score: dsc + 0.5 });
      }
    }
  }

  for (const e of src.exams) {
    const sc = matchScore(e.title, q);
    if (sc < 0) continue;
    const s = e.subjectId ? subjectById.get(e.subjectId) : undefined;
    const who = s?.name || e.subjectName;
    const path = ['Prova', formatDate(e.date), who].filter(Boolean).join(' · ');
    exams.push({ key: `e-${e.id}`, kind: 'exam', title: e.title, path, color: s?.color, subjectId: s?.id, score: sc });
  }

  const raw: [SearchKind, string, Scored[]][] = [
    ['subject', 'Disciplinas e módulos', subjects],
    ['block', 'Blocos', blocks],
    ['topic', 'Tópicos', topics],
    ['subtopic', 'Subtópicos', subtopics],
    ['checklist', 'Checklist', checks],
    ['exam', 'Provas', exams],
  ];

  const groups: SearchGroup[] = [];
  let total = 0;
  for (const [kind, label, list] of raw) {
    if (total >= MAX_TOTAL) break;
    if (list.length === 0) continue;
    const take = Math.min(PER_GROUP, MAX_TOTAL - total);
    const items = list
      .sort((a, b) => a.score - b.score || a.title.localeCompare(b.title, 'pt-BR'))
      .slice(0, take)
      .map(({ score: _score, ...r }) => r);
    total += items.length;
    groups.push({ kind, label, items });
  }
  return groups;
}

// ---- Abrir uma disciplina vinda de fora da tela de Disciplinas ----

export const OPEN_SUBJECT_EVENT = 'medacademic:open-subject';
export const OPEN_SUBJECT_KEY = 'medacademic_open_subject';

export interface OpenSubjectDetail {
  subjectId: string;
  blockId?: string;
  topicId?: string;
}
