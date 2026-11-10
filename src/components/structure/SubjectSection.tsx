import React, { useState } from 'react';
import { ChevronDown, MoreHorizontal, Pencil, Trash2, FolderTree, ArrowRight, Share2 } from 'lucide-react';
import { ShareSubjectModal } from './ShareSubject';
import { useApp } from '../../context/AppContext';
import type { Subject } from '../../types';

import { subjectFormatOf, subjectOrganization } from '../../data/subjectFormats';
import { SubjectBlocksPanel } from '../SubjectBlocksPanel';
import { SubjectChecklistPanel } from '../SubjectChecklistPanel';
import { TutoriaPanel } from '../TutoriaPanel';
import { InlineConfirm, Ring, moduleOf, subjectColor, subjectContext, subjectName, topicStats } from './shared';

interface Props {
  subject: Subject;
  /** Sem recolher (tela de uma disciplina só) */
  standalone?: boolean;
  defaultOpen?: boolean;
  allowLinking?: boolean;
  onEdit: (s: Subject) => void;
}


// Uma disciplina com seu painel (blocos, checklist ou tutorias)
export const SubjectSection: React.FC<Props> = ({ subject, standalone, defaultOpen, allowLinking, onEdit }) => {
  const { topics, deleteSubject, updateSubject } = useApp();
  const [open, setOpen] = useState(!!(standalone || defaultOpen));
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [editingModule, setEditingModule] = useState(false);
  const [moduleDraft, setModuleDraft] = useState('');

  const color = subjectColor(subject);
  const st = topicStats(topics.filter((t) => t.subjectId === subject.id));
  const mod = moduleOf(subject);
  const f = subjectFormatOf(subject);
  const org = subjectOrganization(subject);

  const saveModule = () => {
    const v = moduleDraft.trim();
    updateSubject(subject.id, { universitySubject: v || subject.name });
    setEditingModule(false);
  };

  const menuBtn = 'w-full min-h-[40px] flex items-center gap-2 px-2.5 rounded-lg text-xs font-semibold';

  return (
    <section
      id={`struct-subject-${subject.id}`}
      className={standalone ? '' : 'rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800'}
      onClick={() => menu && setMenu(false)}
    >
      <div className={`flex items-center gap-3 ${standalone ? 'pb-1' : 'p-3 sm:p-4'}`}>
        <button
          type="button"
          onClick={() => !standalone && setOpen((o) => !o)}
          aria-expanded={standalone ? undefined : open}
          className={`flex-1 min-w-0 flex items-center gap-3 text-left ${standalone ? 'cursor-default' : 'min-h-[48px]'}`}
        >
          <Ring pct={st.pct} color={color} size={standalone ? 48 : 42} />
          <div className="min-w-0">
            {mod && (
              <p className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 min-w-0">
                <span className="truncate">{mod}</span>
                <ArrowRight className="h-3 w-3 shrink-0" />
              </p>
            )}
            <h2 id={standalone ? 'cycle-subject-title' : undefined} className={`${standalone ? 'text-lg' : 'text-sm'} font-black text-slate-900 dark:text-white truncate`}>
              {subjectName(subject)}
            </h2>
            <p className="text-[11px] font-semibold truncate" style={{ color }}>
              {subjectContext(subject)}
              <span className="text-slate-400 dark:text-slate-500 font-medium">
                {' '}· {st.seen}/{st.total}
                {st.pending > 0 ? ` · ${st.pending} ver depois` : ''}
              </span>
            </p>
          </div>
        </button>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setMenu((m) => !m);
            }}
            className="h-10 w-10 grid place-items-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label={`Opções de ${subjectName(subject)}`}
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menu && (
            <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-11 z-30 w-56 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl p-1.5">
              <button
                onClick={() => {
                  setMenu(false);
                  onEdit(subject);
                }}
                className={`${menuBtn} text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800`}
              >
                <Pencil className="h-3.5 w-3.5" /> Editar disciplina
              </button>
              <button
                onClick={() => {
                  setMenu(false);
                  setModuleDraft(mod || '');
                  setEditingModule(true);
                }}
                className={`${menuBtn} text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800`}
              >
                <FolderTree className="h-3.5 w-3.5" /> Módulo da faculdade
              </button>
              <button
                id={`struct-share-${subject.id}`}
                onClick={() => {
                  setMenu(false);
                  setSharing(true);
                }}
                className={`${menuBtn} text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40`}
              >
                <Share2 className="h-3.5 w-3.5" /> Compartilhar com um amigo
              </button>
              <button
                onClick={() => {
                  setMenu(false);
                  setConfirmDelete(true);
                }}
                className={`${menuBtn} text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40`}
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir disciplina
              </button>
            </div>
          )}
        </div>
        {!standalone && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="h-10 w-8 shrink-0 grid place-items-center rounded-xl text-slate-400"
            aria-label={open ? 'Recolher disciplina' : 'Abrir disciplina'}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>

      {(confirmDelete || editingModule) && (
        <div className={standalone ? 'mt-2' : 'px-3 sm:px-4 pb-2'}>
          {confirmDelete && (
            <InlineConfirm
              text={`Excluir "${subjectName(subject)}" com seus blocos e tópicos?`}
              onNo={() => setConfirmDelete(false)}
              onYes={() => {
                setConfirmDelete(false);
                deleteSubject(subject.id);
              }}
            />
          )}
          {editingModule && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveModule();
              }}
              className="flex items-center gap-2 flex-wrap rounded-xl bg-slate-50 dark:bg-slate-950/60 p-2"
            >
              <input
                autoFocus
                value={moduleDraft}
                onChange={(e) => setModuleDraft(e.target.value)}
                placeholder="Módulo/matéria da faculdade (ex: Saúde da Criança)"
                className="flex-1 min-w-[180px] h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 text-xs font-semibold text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
                aria-label="Módulo ou matéria da faculdade"
              />
              <button type="button" onClick={() => setEditingModule(false)} className="h-10 px-3 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
                Cancelar
              </button>
              <button type="submit" className="h-10 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold">
                Salvar
              </button>
            </form>
          )}
        </div>
      )}

      {open && (
        <div className={standalone ? '' : 'px-3 sm:px-4 pb-4'}>
          {org === 'blocos' ? (
            <SubjectBlocksPanel subject={subject} allowLinking={allowLinking} />
          ) : f.id === 'tutoria' ? (
            <TutoriaPanel subject={subject} />
          ) : (
            <SubjectChecklistPanel subject={subject} />
          )}
        </div>
      )}
      <ShareSubjectModal subject={sharing ? subject : null} onClose={() => setSharing(false)} />
    </section>
  );
};
