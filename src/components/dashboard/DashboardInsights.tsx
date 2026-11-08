// O Painel agora é feito de cartões personalizáveis (DashboardView + dashboard/*Widget.tsx).
// Aqui fica só o editor das metas de acertos, usado no Perfil.
import React, { useState } from 'react';
import { Check, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

// Editor das metas de acertos do mês (usado no Perfil)
export const GoalsEditor: React.FC<{ compact?: boolean; onDone?: () => void }> = ({ compact, onDone }) => {
  const { userProfile, updateUserProfile } = useApp();
  const [exam, setExam] = useState(String(userProfile.goalExamPct ?? 70));
  const [review, setReview] = useState(String(userProfile.goalReviewPct ?? 70));
  const clamp = (v: string) => Math.min(100, Math.max(1, Math.round(Number(v) || 70)));
  const save = () => {
    updateUserProfile({ goalExamPct: clamp(exam), goalReviewPct: clamp(review) });
    onDone?.();
  };
  const input = 'w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-2 py-1.5 text-sm font-black text-slate-900 dark:text-white';
  return (
    <div id="goals-editor" className={compact ? 'space-y-2' : 'space-y-3'}>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Provas (%)</span>
          <input id="goal-exam-input" type="number" min="1" max="100" value={exam} onChange={(e) => setExam(e.target.value)} className={input} />
        </label>
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Revisões (%)</span>
          <input id="goal-review-input" type="number" min="1" max="100" value={review} onChange={(e) => setReview(e.target.value)} className={input} />
        </label>
      </div>
      <div className="flex justify-end gap-2">
        {onDone && (
          <button onClick={onDone} className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Cancelar">
            <X className="h-4 w-4" />
          </button>
        )}
        <button id="goals-save" onClick={save} className="min-h-[40px] flex items-center gap-1 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold">
          <Check className="h-3.5 w-3.5" /> Salvar metas
        </button>
      </div>
    </div>
  );
};
