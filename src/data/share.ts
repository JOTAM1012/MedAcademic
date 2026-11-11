// Compartilhar uma disciplina/módulo por link: vai só a LISTA (blocos, tópicos e subtópicos).
// Não vai progresso (concluído, ver depois, revisões), vínculos, notas nem datas.
// O conteúdo vai comprimido no próprio link (#importar=...), sem servidor.
// Também serve para um bloco do Checklist (k: 'c'): vai só o nome, a cor, o emoji e os itens.
import type { ChecklistBlock, ChecklistItem, Subject, SubItem, Topic, TopicBlock } from '../types';

export interface SharedTopic {
  /** título */
  n: string;
  /** matéria (formato checklist) */
  m?: string;
  /** subtópicos: [título, descrição?] */
  d?: Array<[string, string?]>;
}

export interface SharedSubject {
  v: 1;
  s: {
    name: string;
    code?: string;
    color: string;
    kind?: 'module';
    majorArea?: string;
    specialty?: string;
    universitySubject?: string;
    format?: Subject['format'];
    organization?: Subject['organization'];
    checklistModules?: string[];
    tutorials?: string[];
  };
  /** blocos com seus tópicos, na ordem */
  b: Array<{ n: string; t: SharedTopic[] }>;
  /** tópicos fora de bloco */
  t: SharedTopic[];
}

/** Bloco do Checklist compartilhado: nome, cor, emoji e itens (sem feito, datas nem essencial) */
export interface SharedChecklist {
  v: 1;
  k: 'c';
  c: {
    name: string;
    color: string;
    emoji?: string;
  };
  /** itens: texto + subitens [título, descrição?] */
  i: Array<{ x: string; d?: Array<[string, string?]> }>;
}

export type SharedPayload = SharedSubject | SharedChecklist;

export const isSharedChecklist = (p: SharedPayload | null | undefined): p is SharedChecklist => !!p && (p as SharedChecklist).k === 'c';

export const SHARE_HASH = '#importar=';
export const PENDING_IMPORT_KEY = 'medacademic_pending_import';

const topicOut = (t: Topic): SharedTopic => {
  const o: SharedTopic = { n: t.title };
  if (t.moduleName) o.m = t.moduleName;
  if (t.details?.length) o.d = t.details.map((d) => (d.text ? [d.title, d.text] : [d.title]));
  return o;
};

export const buildSharedSubject = (subject: Subject, blocks: TopicBlock[], topics: Topic[]): SharedSubject => {
  const own = topics.filter((t) => t.subjectId === subject.id);
  const myBlocks = blocks.filter((b) => b.subjectId === subject.id);
  const blockIds = new Set(myBlocks.map((b) => b.id));
  const s: SharedSubject['s'] = { name: subject.name, color: subject.color };
  if (subject.code) s.code = subject.code;
  if (subject.kind) s.kind = subject.kind;
  if (subject.majorArea) s.majorArea = subject.majorArea;
  if (subject.specialty) s.specialty = subject.specialty;
  if (subject.universitySubject) s.universitySubject = subject.universitySubject;
  if (subject.format) s.format = subject.format;
  if (subject.organization) s.organization = subject.organization;
  if (subject.checklistModules?.length) s.checklistModules = subject.checklistModules;
  if (subject.tutorials?.length) s.tutorials = subject.tutorials.map((x) => x.name);
  return {
    v: 1,
    s,
    b: myBlocks.map((b) => ({ n: b.name, t: own.filter((t) => t.blockId === b.id).map(topicOut) })),
    t: own.filter((t) => !t.blockId || !blockIds.has(t.blockId)).map(topicOut),
  };
};

export const buildSharedChecklist = (block: ChecklistBlock, items: ChecklistItem[]): SharedChecklist => {
  const c: SharedChecklist['c'] = { name: block.name, color: block.color };
  if (block.emoji) c.emoji = block.emoji;
  return {
    v: 1,
    k: 'c',
    c,
    i: items
      .filter((it) => it.blockId === block.id)
      // mais novo primeiro, como aparece na tela (quem recebe mantém essa ordem)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
      .map((it) => {
        const o: SharedChecklist['i'][number] = { x: it.text };
        if (it.details?.length) o.d = it.details.map((d) => (d.text ? [d.title, d.text] : [d.title]));
        return o;
      }),
  };
};

export const sharedCounts = (p: SharedSubject) => {
  const all = [...p.b.flatMap((b) => b.t), ...p.t];
  return { blocks: p.b.length, topics: all.length, subtopics: all.reduce((n, t) => n + (t.d?.length || 0), 0) };
};

// ---------- codificação: JSON → deflate → base64url (sem compressão se o navegador não tiver)
const toB64Url = (bytes: Uint8Array) => {
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64Url = (s: string) => {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4);
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
};
const pipe = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream) => {
  const out = new Response(new Blob([bytes]).stream().pipeThrough(stream));
  return new Uint8Array(await out.arrayBuffer());
};

export const encodeShared = async (p: SharedPayload): Promise<string> => {
  const raw = new TextEncoder().encode(JSON.stringify(p));
  if (typeof CompressionStream !== 'undefined') return 'z' + toB64Url(await pipe(raw, new CompressionStream('deflate-raw')));
  return 'j' + toB64Url(raw);
};

const cleanDetails = (d: unknown): Array<[string, string?]> | undefined =>
  Array.isArray(d)
    ? d
        .filter((x): x is [string, string?] => Array.isArray(x) && typeof x[0] === 'string')
        .map((x) => (typeof x[1] === 'string' && x[1] ? [x[0], x[1]] : [x[0]]))
    : undefined;

const cleanChecklist = (p: Partial<SharedChecklist>): SharedChecklist | null => {
  const c = p.c as Partial<SharedChecklist['c']> | undefined;
  if (!c || typeof c !== 'object' || typeof c.name !== 'string' || !c.name.trim() || !Array.isArray(p.i)) return null;
  return {
    v: 1,
    k: 'c',
    c: {
      name: c.name.trim().slice(0, 120),
      color: typeof c.color === 'string' && c.color ? c.color : '#0ea5e9',
      ...(typeof c.emoji === 'string' && c.emoji ? { emoji: c.emoji.slice(0, 8) } : {}),
    },
    i: p.i
      .filter((it): it is SharedChecklist['i'][number] => !!it && typeof it === 'object' && typeof (it as { x?: unknown }).x === 'string' && !!(it as { x: string }).x.trim())
      .map((it) => {
        const d = cleanDetails(it.d);
        return d?.length ? { x: it.x, d } : { x: it.x };
      }),
  };
};

export const decodeShared = async (code: string): Promise<SharedPayload | null> => {
  try {
    const c = decodeURIComponent(code.trim().replace(/^.*#importar=/, ''));
    const bytes = fromB64Url(c.slice(1));
    const raw = c[0] === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
    const p = JSON.parse(new TextDecoder().decode(raw)) as SharedSubject;
    if (!p || typeof p !== 'object') return null;
    if ((p as unknown as SharedChecklist).k === 'c') return p.v === 1 ? cleanChecklist(p as unknown as SharedChecklist) : null;
    if (p?.v !== 1 || !p.s || typeof p.s.name !== 'string' || !p.s.name.trim() || !Array.isArray(p.b) || !Array.isArray(p.t)) return null;
    const cleanTopics = (list: unknown): SharedTopic[] =>
      (Array.isArray(list) ? list : [])
        .filter((t): t is SharedTopic => !!t && typeof t === 'object' && typeof (t as SharedTopic).n === 'string')
        .map((t) => ({
          n: t.n,
          ...(typeof t.m === 'string' ? { m: t.m } : {}),
          ...(Array.isArray(t.d) ? { d: t.d.filter((x) => Array.isArray(x) && typeof x[0] === 'string') } : {}),
        }));
    return {
      v: 1,
      s: { ...p.s, color: typeof p.s.color === 'string' && p.s.color ? p.s.color : '#0ea5e9' },
      b: p.b.filter((b) => !!b && typeof b === 'object' && typeof b.n === 'string').map((b) => ({ n: b.n, t: cleanTopics(b.t) })),
      t: cleanTopics(p.t),
    };
  } catch {
    return null;
  }
};

export const shareLink = (code: string) => `${window.location.origin}/${SHARE_HASH}${code}`;

/** Subtópicos novos (sem marcação) a partir do formato compartilhado */
export const sharedDetails = (d: SharedTopic['d'], mkId: () => string): SubItem[] | undefined =>
  d?.length ? d.map(([title, text]) => (text ? { id: mkId(), title, text } : { id: mkId(), title })) : undefined;
