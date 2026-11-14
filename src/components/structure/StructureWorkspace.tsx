// Disciplinas em cadernos: estante (grandes áreas ou módulos) em cima, barra com as disciplinas
// do caderno escolhido logo abaixo, e a disciplina abre numa janela em forma de caderno.
// Extras: "Continuar de onde parou", favoritas (⭐) e prova próxima.
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, FolderOpen, Play, Plus, Search, Star, X } from 'lucide-react';
import type { Exam, Subject, Topic, TopicBlock } from '../../types';
import { formatDM, isTopicSeen, ymd } from '../../data/blockReview';
import { Bar, Ring, subjectColor, subjectName, topicStats } from './shared';
import { SubjectSection } from './SubjectSection';
import Segmented from '../shared/Segmented';
import { useApp } from '../../context/AppContext';
import '../checklist/notebook.css';
import './areaWorkspace.css';

export interface Shelf {
  id: string;
  title: string;
  code: string;
  color: string;
  items: Subject[];
  /** módulo da faculdade dono do caderno (tem assuntos próprios) */
  module?: Subject;
  domId?: string;
}

type Sort = 'situacao' | 'progresso' | 'prova' | 'az';
type Status = 'andamento' | 'nova' | 'feita';
const RINGS = Array.from({ length: 9 });
const RINGS_BIG = Array.from({ length: 16 });

const LAST_KEY = 'medacademic_struct_last';
const FAV_KEY = 'medacademic_struct_favs';
const SORT_KEY = 'medacademic_struct_sort';

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* sem armazenamento */
  }
};
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

const Rings: React.FC<{ n?: unknown[] }> = ({ n = RINGS }) => (
  <div className="nb-rings" aria-hidden="true">
    {n.map((_, i) => (
      <span key={i} className="nb-ring" />
    ))}
  </div>
);

interface Props {
  shelves: Shelf[];
  allSubjects: Subject[];
  topics: Topic[];
  topicBlocks: TopicBlock[];
  exams: Exam[];
  /** chave para lembrar o caderno escolhido (uma por visão) */
  storageKey: string;
  addLabel: string;
  onAdd: () => void;
  onEdit: (s: Subject) => void;
  onOpenModule?: (id: string) => void;
  allowLinking?: boolean;
  focusSubjectId?: string | null;
}

export const StructureWorkspace: React.FC<Props> = ({
  shelves,
  allSubjects,
  topics,
  topicBlocks,
  exams,
  storageKey,
  addLabel,
  onAdd,
  onEdit,
  onOpenModule,
  allowLinking = false,
  focusSubjectId,
}) => {
  const today = ymd(new Date());

  const [shelfId, setShelfIdState] = useState<string>(() => {
    const saved = read(storageKey);
    return saved && shelves.some((g) => g.id === saved) ? saved : shelves[0]?.id || '';
  });
  const [sort, setSortState] = useState<Sort>(() => {
    const s = read(SORT_KEY);
    return s === 'progresso' || s === 'prova' || s === 'az' ? s : 'situacao';
  });
  // Favoritas ficam na conta (valem em todos os aparelhos)
  const { studyMethod, setStructFavorites } = useApp();
  const favs = studyMethod.structFavorites || [];
  // as marcadas antes neste aparelho passam para a conta uma vez
  useEffect(() => {
    let local: string[] = [];
    try {
      local = JSON.parse(read(FAV_KEY) || '[]');
    } catch {
      local = [];
    }
    if (!local.length) return;
    const merged = Array.from(new Set([...(studyMethod.structFavorites || []), ...local]));
    setStructFavorites(merged);
    try {
      localStorage.removeItem(FAV_KEY);
    } catch {
      /* sem armazenamento */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [lastId, setLastId] = useState<string | null>(() => read(LAST_KEY));
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const setShelfId = (id: string) => {
    setShelfIdState(id);
    write(storageKey, id);
    setQuery('');
  };
  const setSort = (s: Sort) => {
    setSortState(s);
    write(SORT_KEY, s);
  };
  const toggleFav = (id: string) => setStructFavorites(favs.includes(id) ? favs.filter((x) => x !== id) : [...favs, id]);
  const openSubject = (id: string) => {
    setOpenId(id);
    setLastId(id);
    write(LAST_KEY, id);
  };

  // pedido de fora (busca do topo, disciplina nova): vai ao caderno dela e abre
  useEffect(() => {
    if (!focusSubjectId) return;
    const g = shelves.find((x) => x.items.some((s) => s.id === focusSubjectId));
    if (g) setShelfIdState(g.id);
    openSubject(focusSubjectId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSubjectId]);

  // prova mais próxima de cada disciplina (por vínculo ou pelo nome)
  const nextExamOf = useMemo(() => {
    const upcoming = exams.filter((e) => e.date >= today && e.grade === undefined).sort((a, b) => a.date.localeCompare(b.date));
    return (s: Subject) => {
      const names = [s.name, s.universitySubject].filter(Boolean).map((x) => norm(x as string));
      return upcoming.find((e) => e.subjectId === s.id || (e.subjectName && names.includes(norm(e.subjectName))));
    };
  }, [exams, today]);
  const daysTo = (d: string) => Math.round((new Date(d + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000);

  const infoOf = (s: Subject) => {
    const list = topics.filter((t) => t.subjectId === s.id);
    const st = topicStats(list);
    const status: Status = st.total > 0 && st.pct >= 100 ? 'feita' : st.seen > 0 ? 'andamento' : 'nova';
    const blocks = topicBlocks.filter((b) => b.subjectId === s.id);
    const nextReview = blocks
      .filter((b) => b.reviewStatus !== 'estudando' && b.nextReviewDate && !b.paused)
      .map((b) => b.nextReviewDate as string)
      .sort()[0];
    const exam = nextExamOf(s);
    const examDays = exam ? daysTo(exam.date) : null;
    const nextTopic = list.find((t) => !t.bonus && !isTopicSeen(t));
    return { s, st, status, nextReview, exam, examDays, nextTopic };
  };
  type Info = ReturnType<typeof infoOf>;

  const shelf = shelves.find((g) => g.id === shelfId) || shelves[0];
  const rows: Info[] = useMemo(() => (shelf ? shelf.items.map(infoOf) : []), [shelf, topics, topicBlocks, nextExamOf]); // eslint-disable-line react-hooks/exhaustive-deps

  const q = norm(query);
  const filtered = rows.filter((r) => !q || norm(subjectName(r.s)).includes(q));
  const byName = (a: Info, b: Info) => subjectName(a.s).localeCompare(subjectName(b.s), 'pt-BR');
  const sorted =
    sort === 'az'
      ? [...filtered].sort(byName)
      : sort === 'progresso'
        ? [...filtered].sort((a, b) => a.st.pct - b.st.pct || byName(a, b))
        : sort === 'prova'
          ? [...filtered].sort((a, b) => (a.examDays ?? 9999) - (b.examDays ?? 9999) || byName(a, b))
          : filtered;

  // ---------- Continuar de onde parou ----------
  const last = lastId ? allSubjects.find((s) => s.id === lastId) : undefined;
  const lastInfo = last ? infoOf(last) : null;

  // ---------- disciplina aberta (janela) ----------
  const open = openId ? allSubjects.find((s) => s.id === openId) : undefined;
  const openList = shelf && open && shelf.items.some((s) => s.id === open.id) ? sorted.map((r) => r.s.id) : [];
  const openIdx = open ? openList.indexOf(open.id) : -1;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      // outra janela por cima (ex.: confirmação) fecha primeiro
      if (document.querySelector('[role="alertdialog"]')) return;
      setOpenId(null);
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!shelf) return null;
  const shelfStats = topicStats(topics.filter((t) => shelf.items.some((s) => s.id === t.subjectId) || (shelf.module && t.subjectId === shelf.module.id)));

  // ---------- peças ----------
  const examBadge = (r: Info) =>
    r.exam && r.examDays !== null ? (
      <span className={`aw-badge ${r.examDays <= 7 ? 'aw-badge--hot' : ''}`} title={r.exam.title}>
        {r.examDays === 0 ? 'Prova hoje' : r.examDays === 1 ? 'Prova amanhã' : `Prova em ${r.examDays} dias`}
      </span>
    ) : null;

  const chip = (r: Info) => {
    const color = subjectColor(r.s);
    const fav = favs.includes(r.s.id);
    const hint = r.nextReview
      ? r.nextReview <= today
        ? 'Revisão hoje'
        : `Revisão ${formatDM(r.nextReview)}`
      : `${r.st.seen}/${r.st.total} vistos`;
    return (
      <li key={r.s.id} className="aw-chip" style={{ '--aw-color': color } as React.CSSProperties}>
        <button type="button" id={`struct-subject-${r.s.id}`} onClick={() => openSubject(r.s.id)} className="aw-chip__main">
          <Ring pct={r.st.pct} color={color} size={36} />
          <span className="min-w-0 flex-1 text-left">
            <span className="block text-[13px] font-bold text-slate-900 dark:text-white truncate">{subjectName(r.s)}</span>
            <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 min-w-0">
              <span className={`text-[11px] whitespace-nowrap ${r.nextReview && r.nextReview <= today ? 'text-amber-600 dark:text-amber-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>{hint}</span>
              {examBadge(r)}
            </span>
          </span>
        </button>
        <button
          type="button"
          id={`struct-fav-${r.s.id}`}
          onClick={() => toggleFav(r.s.id)}
          aria-pressed={fav}
          aria-label={fav ? `Tirar ${subjectName(r.s)} das favoritas` : `Favoritar ${subjectName(r.s)}`}
          className={`aw-chip__star ${fav ? 'is-on' : ''}`}
        >
          <Star className="h-4 w-4" fill={fav ? 'currentColor' : 'none'} />
        </button>
      </li>
    );
  };


  // Tudo junto, sem separar por situação: favoritas primeiro; em "Situação", em andamento → não iniciadas → concluídas
  const RANK: Record<Status, number> = { andamento: 0, nova: 1, feita: 2 };
  const ordered = [...sorted].sort((a, b) => {
    const fa = favs.includes(a.s.id) ? 0 : 1;
    const fb = favs.includes(b.s.id) ? 0 : 1;
    if (fa !== fb) return fa - fb;
    return sort === 'situacao' ? RANK[a.status] - RANK[b.status] : 0;
  });
  const listBody = <ul className="aw-chips">{ordered.map(chip)}</ul>;

  return (
    <div className="space-y-5">
      {/* Continuar de onde parou */}
      {lastInfo && (
        <div id="struct-continue" className="aw-continue" style={{ '--aw-color': subjectColor(lastInfo.s) } as React.CSSProperties}>
          <Ring pct={lastInfo.st.pct} color={subjectColor(lastInfo.s)} size={40} />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Continuar de onde parou</p>
            <p className="text-sm font-black text-slate-900 dark:text-white truncate">{subjectName(lastInfo.s)}</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{lastInfo.nextTopic ? `Próximo: ${lastInfo.nextTopic.title}` : 'Todos os assuntos vistos'}</p>
          </div>
          <button type="button" id="struct-continue-btn" onClick={() => openSubject(lastInfo.s.id)} className="shrink-0 h-10 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black inline-flex items-center gap-1.5">
            <Play className="h-3.5 w-3.5 fill-current" /> Continuar
          </button>
        </div>
      )}

      {/* Estante de cadernos */}
      <div className="aw-shelf -mx-1 px-1 pt-2 flex gap-5 overflow-x-auto pb-3 scrollbar-none" role="tablist" aria-label="Cadernos">
        {shelves.map((g) => {
          const st = topicStats(topics.filter((t) => g.items.some((s) => s.id === t.subjectId) || (g.module && t.subjectId === g.module.id)));
          const active = g.id === shelf.id;
          return (
            <button
              key={g.id}
              type="button"
              role="tab"
              aria-selected={active}
              id={g.domId}
              onClick={() => setShelfId(g.id)}
              className={`aw-notebook ${active ? 'is-active' : ''}`}
              style={{ '--aw-color': g.color } as React.CSSProperties}
            >
              <Rings />
              <span className="aw-notebook__tape" aria-hidden />
              <span className="aw-notebook__body">
                <span className="aw-notebook__code">{g.code}</span>
                <span className="aw-notebook__name">{g.title}</span>
                <span className="aw-notebook__meta">
                  {g.items.length} disciplina{g.items.length === 1 ? '' : 's'} · {st.seen}/{st.total} vistos
                </span>
                <span className="aw-notebook__foot">
                  <span className="aw-notebook__pct">{st.pct}%</span>
                  <span className="aw-notebook__bar">
                    <span style={{ width: `${st.pct}%` }} />
                  </span>
                </span>
              </span>
            </button>
          );
        })}
        <button type="button" onClick={onAdd} className="aw-notebook aw-notebook--add">
          <Plus className="h-5 w-5" />
          <span className="text-[11px] font-bold">{addLabel}</span>
        </button>
      </div>

      {/* Barra com as disciplinas do caderno */}
      <section className="aw-panel p-4 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <span className="h-10 w-10 shrink-0 rounded-xl grid place-items-center text-[11px] font-black" style={{ backgroundColor: `${shelf.color}1f`, color: shelf.color }}>
              {shelf.code}
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="struct-area-title" className="text-base font-black text-slate-900 dark:text-white truncate">
                {shelf.title}
              </h2>
              <div className="flex items-center gap-2">
                <p className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
                  {shelfStats.seen}/{shelfStats.total} vistos · {shelfStats.pct}%
                </p>
                <Bar pct={shelfStats.pct} color={shelf.color} className="flex-1 max-w-[160px]" />
              </div>
            </div>
            {shelf.module && onOpenModule && (
              <button
                type="button"
                id={`struct-open-module-${shelf.module.id}`}
                onClick={() => onOpenModule(shelf.module!.id)}
                className="shrink-0 h-9 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold inline-flex items-center gap-1.5"
              >
                <FolderOpen className="h-3.5 w-3.5" /> Abrir módulo
              </button>
            )}
          </div>
          <div className="flex flex-col sm:flex-row gap-2 lg:w-[460px] shrink-0">
            <label className="relative block sm:flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <input
                id="struct-area-search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar disciplina"
                className="w-full h-9 pl-8 pr-3 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
              />
            </label>
            <div className="sm:w-[260px]">
              <Segmented
                ariaLabel="Ordenar disciplinas"
                stretch
                fontSize={11}
                options={[
                  { id: 'situacao', label: 'Situação' },
                  { id: 'progresso', label: '%' },
                  { id: 'prova', label: 'Prova' },
                  { id: 'az', label: 'A–Z' },
                ]}
                value={sort}
                onChange={setSort}
                idFor={(id) => `struct-sort-${id}`}
              />
            </div>
          </div>
        </div>

        {shelf.items.length === 0 ? (
          <p className="py-6 text-center text-xs text-slate-400">
            Nenhuma disciplina neste caderno ainda.
            {shelf.module ? ' Abra o módulo para vincular disciplinas.' : ''}
          </p>
        ) : sorted.length ? (
          <div className="space-y-3">{listBody}</div>
        ) : (
          <p className="py-6 text-center text-xs text-slate-400">Nenhuma disciplina com esse nome.</p>
        )}
      </section>

      {/* Disciplina aberta: janela em forma de caderno */}
      {open &&
        createPortal(
          <div className="aw-window-wrap" role="presentation">
            <div className="aw-window-backdrop" onClick={() => setOpenId(null)} />
            <div role="dialog" aria-modal="true" aria-label={subjectName(open)} className="aw-window nb" style={{ '--aw-color': subjectColor(open) } as React.CSSProperties}>
              <Rings n={RINGS_BIG} />
              <header className="aw-window__head">
                <span className="aw-window__dot" aria-hidden />
                <p className="min-w-0 flex-1 text-xs font-bold text-slate-500 dark:text-slate-400 truncate">
                  {shelf.title}
                  {openIdx >= 0 ? ` · ${openIdx + 1} de ${openList.length}` : ''}
                </p>
                {openIdx >= 0 && openList.length > 1 && (
                  <>
                    <button type="button" id="struct-window-prev" disabled={openIdx === 0} onClick={() => openSubject(openList[openIdx - 1])} aria-label="Disciplina anterior" className="aw-window__btn">
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button type="button" id="struct-window-next" disabled={openIdx === openList.length - 1} onClick={() => openSubject(openList[openIdx + 1])} aria-label="Próxima disciplina" className="aw-window__btn">
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button type="button" id="struct-window-close" onClick={() => setOpenId(null)} aria-label="Fechar caderno" className="aw-window__btn">
                  <X className="h-4 w-4" />
                </button>
              </header>
              <div className="aw-window__scroll">
                <div className="aw-detail-in" key={open.id}>
                  <SubjectSection subject={open} standalone allowLinking={allowLinking} onEdit={onEdit} />
                </div>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

