// Compartilhar disciplina/módulo por link e importar o que um amigo mandou.
// Vai só a lista (blocos, tópicos e subtópicos). Quem recebe fica com uma cópia só dele.
import React, { useEffect, useState } from 'react';
import { Check, Copy, Download, Layers, Link2, ListChecks, Send, Share2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { Subject } from '../../types';
import { PlanModal } from '../plan/planShared';
import {
  PENDING_IMPORT_KEY,
  SHARE_HASH,
  buildSharedSubject,
  decodeShared,
  encodeShared,
  isSharedChecklist,
  shareLink,
  sharedCounts,
  type SharedChecklist,
  type SharedPayload,
  type SharedSubject,
} from '../../data/share';

const countText = (p: SharedSubject) => {
  const c = sharedCounts(p);
  return [
    c.blocks ? `${c.blocks} bloco${c.blocks > 1 ? 's' : ''}` : '',
    `${c.topics} tópico${c.topics === 1 ? '' : 's'}`,
    c.subtopics ? `${c.subtopics} subtópico${c.subtopics > 1 ? 's' : ''}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
};

// ---------------------------------------------------------------- compartilhar
export const ShareSubjectModal: React.FC<{ subject: Subject | null; onClose: () => void }> = ({ subject, onClose }) => {
  const { topicBlocks, topics, showNotification } = useApp();
  const [payload, setPayload] = useState<SharedSubject | null>(null);
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!subject) return;
    setCopied(false);
    setLink('');
    const p = buildSharedSubject(subject, topicBlocks, topics);
    setPayload(p);
    encodeShared(p).then((code) => setLink(shareLink(code)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subject?.id]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      showNotification('Link copiado. É só colar na conversa com seu amigo.', 'success');
    } catch {
      showNotification('Não deu para copiar sozinho. Segure no link abaixo e copie.', 'info');
    }
  };
  const canShare = typeof navigator !== 'undefined' && 'share' in navigator;
  const send = async () => {
    try {
      await navigator.share({ title: `${subject?.name} no MedAcademic`, text: `Te mandei a lista de "${subject?.name}". Abra para adicionar nas suas disciplinas:`, url: link });
    } catch {
      /* cancelado */
    }
  };

  return (
    <PlanModal
      id="share-subject-modal"
      open={!!subject}
      onClose={onClose}
      icon={<Share2 className="h-5 w-5" />}
      title={`Compartilhar "${subject?.name || ''}"`}
      subtitle="Mande o link para um amigo que usa o site. Ele recebe uma cópia da lista para usar do jeito dele."
      footer={
        <>
          <button type="button" onClick={onClose} className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            Fechar
          </button>
          {canShare && (
            <button
              type="button"
              id="share-subject-send"
              disabled={!link}
              onClick={send}
              className="min-h-[44px] px-4 rounded-xl text-sm font-black inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40"
            >
              <Send className="h-4 w-4" /> Enviar
            </button>
          )}
          <button
            type="button"
            id="share-subject-copy"
            disabled={!link}
            onClick={copy}
            className="min-h-[44px] px-5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-sm font-black inline-flex items-center gap-1.5"
          >
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? 'Copiado' : 'Copiar link'}
          </button>
        </>
      }
    >
      {payload && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3.5 flex items-start gap-3">
            <span className="h-10 w-10 shrink-0 rounded-xl grid place-items-center text-white" style={{ backgroundColor: payload.s.color }}>
              <Layers className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900 dark:text-white truncate">{payload.s.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{countText(payload)}</p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            <div className="rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-200 p-3">
              <p className="font-black mb-1">Vai no link</p>
              <p>Nome, cor, blocos, tópicos e subtópicos, na mesma ordem.</p>
            </div>
            <div className="rounded-xl bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 p-3">
              <p className="font-black mb-1">Não vai</p>
              <p>Seu progresso (concluído, ver depois, revisões), vínculos, notas e datas.</p>
            </div>
          </div>
          <label className="block">
            <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
              <Link2 className="h-3.5 w-3.5" /> Link
            </span>
            <input
              id="share-subject-link"
              readOnly
              value={link || 'Gerando o link…'}
              onFocus={(e) => e.currentTarget.select()}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs text-slate-600 dark:text-slate-300 truncate"
            />
          </label>
        </div>
      )}
    </PlanModal>
  );
};

// ---------------------------------------------------------------- importar (quem recebeu o link)
export const ImportSharedGate: React.FC = () => {
  const { importSharedSubject, importSharedChecklist, setCurrentTab, currentSemester } = useApp();
  const [payload, setPayload] = useState<SharedPayload | null>(null);
  const [bad, setBad] = useState(false);

  useEffect(() => {
    let code: string | null = null;
    try {
      code = localStorage.getItem(PENDING_IMPORT_KEY);
    } catch {}
    if (code) decodeShared(code).then((p) => (p ? setPayload(p) : setBad(true)));
    // Link colado com o site já aberto (só o #importar muda, a página não recarrega)
    const onHash = () => {
      if (!window.location.hash.startsWith(SHARE_HASH)) return;
      const c = window.location.hash.slice(SHARE_HASH.length);
      try {
        localStorage.setItem(PENDING_IMPORT_KEY, c);
      } catch {}
      history.replaceState(null, '', window.location.pathname + window.location.search);
      decodeShared(c).then((p) => (p ? setPayload(p) : setBad(true)));
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const clear = () => {
    try {
      localStorage.removeItem(PENDING_IMPORT_KEY);
    } catch {}
    setPayload(null);
    setBad(false);
  };

  if (bad)
    return (
      <PlanModal id="import-shared-bad" open onClose={clear} icon={<Download className="h-5 w-5" />} title="Link incompleto" subtitle="Esse link não abriu. Peça para seu amigo copiar e mandar de novo.">
        <div className="flex justify-end">
          <button type="button" onClick={clear} className="min-h-[44px] px-5 rounded-xl bg-sky-600 text-white text-sm font-black">
            Entendi
          </button>
        </div>
      </PlanModal>
    );
  if (!payload) return null;

  if (isSharedChecklist(payload)) return <ImportChecklist payload={payload} onClose={clear} onImport={() => { importSharedChecklist(payload); clear(); setCurrentTab('checklist'); }} />;

  return (
    <PlanModal
      id="import-shared-modal"
      open
      onClose={clear}
      icon={<Download className="h-5 w-5" />}
      title="Disciplina recebida"
      subtitle="Um amigo te mandou esta lista. Ela vira uma disciplina sua, sem o progresso dele, para você usar como quiser."
      footer={
        <>
          <button type="button" id="import-shared-cancel" onClick={clear} className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            Agora não
          </button>
          <button
            type="button"
            id="import-shared-confirm"
            onClick={() => {
              importSharedSubject(payload);
              clear();
              setCurrentTab('structure');
            }}
            className="min-h-[44px] px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black inline-flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" /> Adicionar às minhas disciplinas
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3.5 flex items-start gap-3">
          <span className="h-10 w-10 shrink-0 rounded-xl grid place-items-center text-white" style={{ backgroundColor: payload.s.color }}>
            <Layers className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-white">{payload.s.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{countText(payload)}</p>
            {currentSemester && <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">Entra no {currentSemester.name}.</p>}
          </div>
        </div>
        {payload.b.length > 0 && (
          <ul className="max-h-48 overflow-y-auto space-y-1 text-xs text-slate-700 dark:text-slate-200">
            {payload.b.map((b, i) => (
              <li key={i} className="flex items-center justify-between gap-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-2">
                <span className="font-bold truncate">{b.n}</span>
                <span className="shrink-0 text-slate-500 dark:text-slate-400">{b.t.length} tópico{b.t.length === 1 ? '' : 's'}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PlanModal>
  );
};

/** Bloco do Checklist recebido por link */
const ImportChecklist: React.FC<{ payload: SharedChecklist; onClose: () => void; onImport: () => void }> = ({ payload, onClose, onImport }) => {
  const n = payload.i.length;
  return (
    <PlanModal
      id="import-checklist-modal"
      open
      onClose={onClose}
      icon={<Download className="h-5 w-5" />}
      title="Checklist recebido"
      subtitle="Um amigo te mandou esta lista. Ela vira um bloco seu, com nada marcado como feito."
      footer={
        <>
          <button type="button" id="import-checklist-cancel" onClick={onClose} className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            Agora não
          </button>
          <button
            type="button"
            id="import-checklist-confirm"
            onClick={onImport}
            className="min-h-[44px] px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black inline-flex items-center gap-1.5"
          >
            <Check className="h-4 w-4" /> Adicionar ao meu Checklist
          </button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3.5 flex items-start gap-3">
          <span className="h-10 w-10 shrink-0 rounded-xl grid place-items-center text-white text-lg" style={{ backgroundColor: payload.c.color }}>
            {payload.c.emoji || <ListChecks className="h-5 w-5" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-white">{payload.c.name}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {n} {n === 1 ? 'item' : 'itens'}
            </p>
          </div>
        </div>
        {n > 0 && (
          <ul className="max-h-48 overflow-y-auto space-y-1 text-xs text-slate-700 dark:text-slate-200">
            {payload.i.map((it, i) => (
              <li key={i} className="rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-3 py-2 truncate">
                {it.x}
              </li>
            ))}
          </ul>
        )}
      </div>
    </PlanModal>
  );
};

// ---------------------------------------------------------------- botão rápido nos cards
/** Ícone no card: no celular abre o "Enviar" do aparelho; no computador já copia o link */
export const QuickShareButton: React.FC<{ subject: Subject; className?: string }> = ({ subject, className = '' }) => {
  const { topicBlocks, topics, showNotification } = useApp();
  const [modal, setModal] = useState(false);
  const [done, setDone] = useState(false);
  const go = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const link = shareLink(await encodeShared(buildSharedSubject(subject, topicBlocks, topics)));
    const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    if (touch && 'share' in navigator) {
      try {
        await navigator.share({ title: `${subject.name} no MedAcademic`, text: `Te mandei a lista de "${subject.name}". Abra para adicionar nas suas disciplinas:`, url: link });
      } catch {
        /* cancelado */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(link);
      setDone(true);
      setTimeout(() => setDone(false), 1800);
      showNotification(`Link de "${subject.name}" copiado. É só colar na conversa com seu amigo.`, 'success');
    } catch {
      setModal(true);
    }
  };
  return (
    <>
      <button
        type="button"
        id={`struct-quick-share-${subject.id}`}
        onClick={go}
        aria-label={`Compartilhar ${subject.name} com um amigo`}
        title="Compartilhar com um amigo (copia o link)"
        className={`absolute top-3 right-12 z-10 h-9 w-9 rounded-xl flex items-center justify-center transition-colors ${
          done ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:text-sky-400 dark:hover:bg-sky-500/10'
        } ${className}`}
      >
        {done ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      </button>
      <ShareSubjectModal subject={modal ? subject : null} onClose={() => setModal(false)} />
    </>
  );
};
