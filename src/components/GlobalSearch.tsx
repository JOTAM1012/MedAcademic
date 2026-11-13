import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import InputClearDissolve, { type InputClearDissolveHandle } from './shared/InputClearDissolve';
import { FOCUS_SUBJECT_KEY } from './TutoriaGradesSection';
import {
  OPEN_SUBJECT_EVENT,
  OPEN_SUBJECT_KEY,
  SEARCH_MIN_CHARS,
  runGlobalSearch,
  type OpenSubjectDetail,
  type SearchResult,
} from '../data/search';

const GROUP_COLOR: Record<string, string> = {
  subject: 'text-blue-600 dark:text-blue-400',
  block: 'text-violet-600 dark:text-violet-400',
  topic: 'text-emerald-600 dark:text-emerald-400',
  subtopic: 'text-teal-600 dark:text-teal-400',
  checklist: 'text-amber-600 dark:text-amber-400',
  exam: 'text-rose-600 dark:text-rose-400',
};

// Busca global da barra do topo (com resultados agrupados e teclado)
export const GlobalSearch: React.FC = () => {
  const { searchQuery, setSearchQuery, subjects, topicBlocks, topics, checklist, checklistBlocks, exams, currentSemester, setCurrentTab } =
    useApp();

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<InputClearDissolveHandle>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Só disciplinas do semestre atual (as antigas não abrem na tela de Disciplinas)
  const currentSubjects = useMemo(
    () => subjects.filter((s) => !s.semesterId || !currentSemester || s.semesterId === currentSemester.id),
    [subjects, currentSemester]
  );

  const query = searchQuery.trim();
  const enough = query.length >= SEARCH_MIN_CHARS;

  const groups = useMemo(
    () => (enough ? runGlobalSearch({ subjects: currentSubjects, topicBlocks, topics, checklist, checklistBlocks, exams }, query) : []),
    [enough, query, currentSubjects, topicBlocks, topics, checklist, checklistBlocks, exams]
  );
  const flat = useMemo(() => groups.flatMap((g) => g.items), [groups]);

  // volta para o primeiro resultado quando o termo muda
  useEffect(() => setActive(0), [query]);

  // clique fora fecha
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
    };
  }, [open]);

  // mantém o item ativo visível
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const openResult = (r: SearchResult) => {
    setOpen(false);
    inputRef.current?.blur();
    if (r.kind === 'checklist') {
      setCurrentTab('checklist');
      return;
    }
    if (r.kind === 'exam') {
      setCurrentTab('semester');
      return;
    }
    if (!r.subjectId) {
      setCurrentTab('structure');
      return;
    }
    const detail: OpenSubjectDetail = { subjectId: r.subjectId };
    if (r.blockId) detail.blockId = r.blockId;
    if (r.topicId) detail.topicId = r.topicId;
    try {
      sessionStorage.setItem(OPEN_SUBJECT_KEY, JSON.stringify(detail));
      // a tela de Disciplinas já lê esta chave ao montar e abre a disciplina
      sessionStorage.setItem(FOCUS_SUBJECT_KEY, r.subjectId);
    } catch {
      /* sem armazenamento */
    }
    setCurrentTab('structure');
    window.dispatchEvent(new CustomEvent<OpenSubjectDetail>(OPEN_SUBJECT_EVENT, { detail }));
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (!enough) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      if (flat.length) setActive((i) => (i + 1) % flat.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      if (flat.length) setActive((i) => (i - 1 + flat.length) % flat.length);
    } else if (e.key === 'Enter') {
      const r = flat[active];
      if (open && r) {
        e.preventDefault();
        openResult(r);
      }
    }
  };

  const showDropdown = open && enough;
  let idx = -1;

  return (
    <div ref={wrapRef} className="relative w-full max-w-sm sm:max-w-md">
      <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-3 py-1.5 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 transition-all">
        <Search className="h-4 w-4 text-slate-400 shrink-0 mr-2" />
        <InputClearDissolve
          ref={inputRef}
          id="topbar-global-search-input"
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="topbar-search-dropdown"
          aria-autocomplete="list"
          aria-activedescendant={showDropdown && flat[active] ? `gs-opt-${active}` : undefined}
          autoComplete="off"
          placeholder="Buscar matérias, tópicos clínicos, ECG..."
          value={searchQuery}
          onValueChange={(v) => {
            setSearchQuery(v);
            setOpen(v.length > 0);
          }}
          wrapperClassName="flex-1 min-w-0"
          textClassName="text-xs text-slate-800 dark:text-slate-200"
          placeholderClassName="text-xs text-slate-400"
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="w-full bg-transparent text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-hidden"
        />
        {searchQuery && (
          <button
            type="button"
            id="topbar-search-clear-btn"
            onPointerDown={(e) => e.preventDefault()}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setOpen(false);
              inputRef.current?.clear();
            }}
            className="p-1 -m-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Limpar busca"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {showDropdown && (
        <div
          id="topbar-search-dropdown"
          ref={listRef}
          role="listbox"
          className="fixed left-0 right-0 top-16 max-h-[70vh] overflow-y-auto rounded-b-xl border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 shadow-xl z-50 sm:absolute sm:top-full sm:mt-2 sm:max-h-96 sm:rounded-xl sm:border"
        >
          {flat.length === 0 ? (
            <div className="py-4 px-2 text-center text-xs text-slate-500 dark:text-slate-400">Nada encontrado para "{query}".</div>
          ) : (
            <div className="space-y-2">
              {groups.map((g) => (
                <div key={g.kind}>
                  <div className={`px-2 pt-1 pb-0.5 text-[10px] font-bold uppercase tracking-wider ${GROUP_COLOR[g.kind]}`}>{g.label}</div>
                  {g.items.map((r) => {
                    idx += 1;
                    const i = idx;
                    const isActive = i === active;
                    return (
                      <div
                        key={r.key}
                        id={`gs-opt-${i}`}
                        data-idx={i}
                        role="option"
                        aria-selected={isActive}
                        onMouseEnter={() => setActive(i)}
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => openResult(r)}
                        className={`flex items-start gap-2 px-2 py-2 rounded-lg cursor-pointer ${
                          isActive ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                        }`}
                      >
                        <span
                          className="mt-1 w-2.5 h-2.5 rounded-full shrink-0 bg-slate-300 dark:bg-slate-600"
                          style={r.color ? { backgroundColor: r.color } : undefined}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{r.title}</span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">{r.path}</span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
