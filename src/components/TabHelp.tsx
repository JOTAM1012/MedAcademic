// Linha de ajuda no topo de cada aba: botão "Ajuda" (tutorial simples daquela aba) e,
// no Semestre, "Como funciona o método?" (Dashboard e Planner já têm o botão no cabeçalho).
import React, { useState } from 'react';
import { BookOpen, HelpCircle, Lightbulb } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TAB_HELP } from '../data/tabHelp';
import { PlanModal } from './plan/planShared';

const ALIAS: Record<string, string> = { grades: 'semester', schedule: 'semester', history: 'profile' };

export const TabHelpBar: React.FC<{ tab: string }> = ({ tab }) => {
  const { openMethodGuide } = useApp();
  const [open, setOpen] = useState(false);
  const key = ALIAS[tab] || tab;
  const help = TAB_HELP[key];
  if (!help) return null;
  const btn =
    'min-h-[36px] inline-flex items-center gap-1.5 px-3 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-300 hover:border-sky-400 transition-colors';

  return (
    <>
      <div id="tab-help-bar" className="mb-3 flex justify-end gap-2">
        {key === 'semester' && (
          <button type="button" id="tab-method-guide-btn" onClick={() => openMethodGuide(0)} className={btn}>
            <BookOpen className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Como funciona o método?
          </button>
        )}
        <button type="button" id="tab-help-btn" onClick={() => setOpen(true)} className={btn} aria-label={help.title}>
          <HelpCircle className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Ajuda
        </button>
      </div>

      <PlanModal
        id="tab-help-modal"
        open={open}
        onClose={() => setOpen(false)}
        icon={<HelpCircle className="h-5 w-5" />}
        title={help.title}
        subtitle={help.intro}
        footer={
          <button type="button" id="tab-help-close" onClick={() => setOpen(false)} className="min-h-[44px] px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black">
            Entendi
          </button>
        }
      >
        <div className="space-y-4">
          {help.sections.map((s) => (
            <section key={s.title} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3.5">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span aria-hidden>{s.emoji}</span> {s.title}
              </h3>
              <ol className="mt-2 space-y-1.5">
                {s.steps.map((st, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm leading-snug text-slate-700 dark:text-slate-200">
                    <span className="mt-0.5 h-5 w-5 shrink-0 rounded-full bg-sky-600/15 text-sky-700 dark:text-sky-300 text-[11px] font-black grid place-items-center">{i + 1}</span>
                    <span>{st}</span>
                  </li>
                ))}
              </ol>
            </section>
          ))}
          {help.tip && (
            <p className="flex items-start gap-2 rounded-xl bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-800 dark:text-amber-200">
              <Lightbulb className="h-4 w-4 shrink-0 mt-0.5" /> <span>{help.tip}</span>
            </p>
          )}
        </div>
      </PlanModal>
    </>
  );
};
