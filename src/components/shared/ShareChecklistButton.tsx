// Compartilhar um bloco do Checklist por link. Vai só a lista (itens e subitens), sem o que já foi feito.
// No celular abre o "Enviar" do aparelho; no computador copia o link. Se não der, mostra o link numa janela.
import React, { useState } from 'react';
import IconSwap from './IconSwap';
import { Check, Copy, Link2, Share2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { ChecklistBlock } from '../../types';
import { PlanModal } from '../plan/planShared';
import { buildSharedChecklist, encodeShared, shareLink } from '../../data/share';

export const ShareChecklistButton: React.FC<{ block: Pick<ChecklistBlock, 'id' | 'name' | 'color' | 'emoji'>; className?: string }> = ({ block, className = '' }) => {
  const { checklist, showNotification } = useApp();
  const [link, setLink] = useState('');
  const [modal, setModal] = useState(false);
  const [done, setDone] = useState(false);

  const copied = () => {
    setDone(true);
    setTimeout(() => setDone(false), 1800);
    showNotification(`Link de "${block.name}" copiado. É só colar na conversa com seu amigo.`, 'success');
  };

  const go = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = shareLink(await encodeShared(buildSharedChecklist({ ...block, createdAt: '' }, checklist)));
    setLink(url);
    const touch = typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches;
    if (touch && 'share' in navigator) {
      try {
        await navigator.share({ title: `${block.name} no MedAcademic`, text: `Te mandei o checklist "${block.name}". Abra para adicionar no seu:`, url });
      } catch {
        /* cancelado */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      copied();
    } catch {
      setModal(true);
    }
  };

  const copyAgain = async () => {
    try {
      await navigator.clipboard.writeText(link);
      copied();
      setModal(false);
    } catch {
      showNotification('Não deu para copiar sozinho. Segure no link e copie.', 'info');
    }
  };

  return (
    <>
      <button
        type="button"
        id={`checklist-share-block-${block.id}`}
        onClick={go}
        aria-label={`Compartilhar ${block.name} com um amigo`}
        title="Compartilhar com um amigo (copia o link)"
        className={`p-1 rounded-md transition-colors ${
          done ? 'text-emerald-500 bg-emerald-500/10' : 'text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:text-sky-400 dark:hover:bg-sky-500/10'
        } ${className}`}
      >
        <IconSwap swapped={done} from={<Share2 className="h-4 w-4" />} to={<Check className="h-4 w-4" />} />
      </button>
      <PlanModal
        id="share-checklist-modal"
        open={modal}
        onClose={() => setModal(false)}
        icon={<Share2 className="h-5 w-5" />}
        title={`Compartilhar "${block.name}"`}
        subtitle="Mande o link para um amigo. Ele recebe uma cópia da lista, sem o que você já fez."
        footer={
          <>
            <button type="button" onClick={() => setModal(false)} className="min-h-[44px] px-4 rounded-xl text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Fechar
            </button>
            <button
              type="button"
              id="share-checklist-copy"
              disabled={!link}
              onClick={copyAgain}
              className="min-h-[44px] px-5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-sm font-black inline-flex items-center gap-1.5"
            >
              <Copy className="h-4 w-4" /> Copiar link
            </button>
          </>
        }
      >
        <label className="block">
          <span className="flex items-center gap-1 text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1">
            <Link2 className="h-3.5 w-3.5" /> Link
          </span>
          <input
            id="share-checklist-link"
            readOnly
            value={link}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-xs text-slate-600 dark:text-slate-300 truncate"
          />
        </label>
      </PlanModal>
    </>
  );
};
