// Ajuda de cada aba: um botão pequeno ao lado do título da aba abre um tutorial simples daquela tela.
// No Semestre aparece também "Como funciona o método?" (Dashboard e Planner já têm o botão no cabeçalho).
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, HelpCircle, Lightbulb } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TAB_HELP } from '../data/tabHelp';
import { PlanModal } from './plan/planShared';

const ALIAS: Record<string, string> = { grades: 'semester', schedule: 'semester', history: 'profile' };

export const TabHelpBar: React.FC<{ tab: string }> = ({ tab }) => {
  const { openMethodGuide } = useApp();
  const [open, setOpen] = useState(false);
  const [slot, setSlot] = useState<HTMLElement | null>(null);
  // Tela sem título (ex.: dentro de uma disciplina): o botão aparece numa linha discreta no topo
  const [noTitle, setNoTitle] = useState(false);
  const key = ALIAS[tab] || tab;
  // No Dashboard o título é a saudação com o nome: sem botão "Ajuda" ali
  const help = key === 'dashboard' ? undefined : TAB_HELP[key];

  // Acha o título (h1) da aba e coloca o botão logo depois dele
  useEffect(() => {
    setSlot(null);
    setNoTitle(false);
    if (!help) return;
    let el: HTMLSpanElement | null = null;
    let tries = 0;
    const place = () => {
      const h1 = document.querySelector('main h1');
      if (!h1) {
        if (tries++ < 8) timer = window.setTimeout(place, 120);
        else setNoTitle(true);
        return;
      }
      el = document.createElement('span');
      el.className = 'tab-help-slot';
      h1.appendChild(el);
      setSlot(el);
      setNoTitle(false);
    };
    let timer = window.setTimeout(place, 60);
    // Se a tela trocar o título (o h1 é recriado), coloca o botão de novo
    const watch = window.setInterval(() => {
      if ((el && !el.isConnected) || (!el && document.querySelector('main h1'))) {
        el = null;
        setSlot(null);
        tries = 0;
        place();
      }
    }, 800);
    return () => {
      window.clearInterval(watch);
      window.clearTimeout(timer);
      el?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  if (!help) return null;
  const pill =
    'align-middle ml-2 inline-flex items-center gap-1 h-8 px-2.5 rounded-full text-xs font-bold tracking-normal normal-case border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 text-slate-600 dark:text-slate-300 hover:text-sky-700 dark:hover:text-sky-300 hover:border-sky-400 transition-colors';
  const buttons = (
    <>
      <button type="button" id="tab-help-btn" onClick={() => setOpen(true)} className={pill} aria-label={help.title} title={help.title}>
        <HelpCircle className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Ajuda
      </button>
      {key === 'semester' && (
        <button type="button" id="tab-method-guide-btn" onClick={() => openMethodGuide(0)} className={pill} title="Como funciona o método?">
          <BookOpen className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Método
        </button>
      )}
    </>
  );

  return (
    <>
      {slot ? createPortal(buttons, slot) : noTitle ? <div id="tab-help-bar" className="-mt-2 mb-2 flex justify-end">{buttons}</div> : null}

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
            <section key={s.title} className="rounded-2xl bg-slate-50 dark:bg-slate-950/50 p-3.5">
              <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="h-4 w-1 rounded-full bg-sky-500" aria-hidden /> {s.title}
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
