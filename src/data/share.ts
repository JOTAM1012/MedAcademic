// Compartilhar uma disciplina/módulo por link: vai só a LISTA (blocos, tópicos e subtópicos).
// Não vai progresso (concluído, ver depois, revisões), vínculos, notas nem datas.
// O conteúdo vai comprimido no próprio link (#importar=...), sem servidor.
import type { Subject, SubItem, Topic, TopicBlock } from '../types';

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

export const encodeShared = async (p: SharedSubject): Promise<string> => {
  const raw = new TextEncoder().encode(JSON.stringify(p));
  if (typeof CompressionStream !== 'undefined') return 'z' + toB64Url(await pipe(raw, new CompressionStream('deflate-raw')));
  return 'j' + toB64Url(raw);
};

export const decodeShared = async (code: string): Promise<SharedSubject | null> => {
  try {
    const c = decodeURIComponent(code.trim().replace(/^.*#importar=/, ''));
    const bytes = fromB64Url(c.slice(1));
    const raw = c[0] === 'z' ? await pipe(bytes, new DecompressionStream('deflate-raw')) : bytes;
    const p = JSON.parse(new TextDecoder().decode(raw)) as SharedSubject;
    if (p?.v !== 1 || !p.s?.name || !Array.isArray(p.b) || !Array.isArray(p.t)) return null;
    return p;
  } catch {
    return null;
  }
};

export const shareLink = (code: string) => `${window.location.origin}/${SHARE_HASH}${code}`;

/** Subtópicos novos (sem marcação) a partir do formato compartilhado */
export const sharedDetails = (d: SharedTopic['d'], mkId: () => string): SubItem[] | undefined =>
  d?.length ? d.map(([title, text]) => (text ? { id: mkId(), title, text } : { id: mkId(), title })) : undefined;
