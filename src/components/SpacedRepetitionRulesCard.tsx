import React, { useState } from 'react';
import { TrendingUp, ChevronDown, ArrowRight, Sparkles } from 'lucide-react';
import { PLAN_ORDER, REVIEW_INTERVALS, REVIEW_PLANS, FIRST_REVIEW_DAY } from '../data/blockReview';

interface SpacedRepetitionRulesCardProps {
  initialExpanded?: boolean;
  className?: string;
}

const ROW_STYLE: Record<string, { dot: string; text: string; hint: string }> = {
  dificil: { dot: 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]', text: 'text-rose-400', hint: '(Retenção instável)' },
  medio: { dot: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]', text: 'text-amber-300', hint: '(Recordação com esforço)' },
  facil: { dot: 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]', text: 'text-emerald-300', hint: '(Memória consolidada)' },
};

export const SpacedRepetitionRulesCard: React.FC<SpacedRepetitionRulesCardProps> = ({ initialExpanded = true, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);

  return (
    <div
      id="spaced-repetition-rules-card"
      className={`dark relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 border border-sky-400/20 ${className}`}
    >
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-blue-900/30 blur-2xl" />

      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsExpanded((prev) => !prev);
          }
        }}
        aria-expanded={isExpanded}
        className="relative z-10 flex cursor-pointer items-center justify-between gap-4 p-5 sm:p-6 transition-colors select-none"
      >
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/20 border border-cyan-200/30 shadow-inner backdrop-blur-xs text-cyan-200">
            <TrendingUp className="h-6 w-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>Regras da Repetição Espaçada</span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-100 backdrop-blur-xs">
                <Sparkles className="h-2.5 w-2.5" />
                Por bloco
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-sky-100/80 font-medium">
              Dia 0 = bloco concluído · 1ª revisão no Dia {FIRST_REVIEW_DAY} · sua avaliação define a próxima
            </p>
          </div>
        </div>
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-transform duration-300 ${
            isExpanded ? 'rotate-180 bg-white/20' : 'rotate-0'
          }`}
          aria-label={isExpanded ? 'Recolher regras' : 'Expandir regras'}
        >
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>

      {isExpanded && (
        <div className="relative z-10 space-y-4 px-5 pb-5 sm:px-6 sm:pb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-white/95 tracking-wide">
              <span className="flex items-center gap-1.5">
                <span>📊</span>
                <span>Intervalos e sugestão de estudo por avaliação:</span>
              </span>
              <span className="text-[11px] text-sky-200/70 font-normal hidden sm:inline">R1 → R2 → R3 → R4</span>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-[#0B132B] p-3 sm:p-4 shadow-inner text-slate-100">
              <div className="divide-y divide-slate-800/80">
                {PLAN_ORDER.map((level) => {
                  const plan = REVIEW_PLANS[level];
                  const style = ROW_STYLE[level];
                  const intervals = REVIEW_INTERVALS[level];
                  return (
                    <div key={level} className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2.5">
                          <span className={`inline-block h-2.5 w-2.5 rounded-full ${style.dot}`} />
                          <span className={`text-xs sm:text-sm font-bold tracking-wide ${style.text}`}>{plan.label}</span>
                          <span className="text-[10px] text-slate-400 font-medium hidden md:inline">{style.hint}</span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 pl-5">Sugestão na próxima revisão: {plan.steps.join(' + ')}</p>
                      </div>
                      <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-mono font-medium text-slate-200 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 self-start lg:self-auto">
                        <span className="font-semibold text-sky-300">D{intervals[0]}</span>
                        {intervals.slice(1).map((d, i) => (
                          <React.Fragment key={i}>
                            <ArrowRight className="h-3 w-3 text-slate-500" />
                            <span className={`font-semibold ${i === intervals.length - 2 ? style.text + ' font-bold' : 'text-white'}`}>+{d}d</span>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-start sm:items-center gap-2.5 rounded-xl bg-sky-950/40 border border-sky-300/20 px-3.5 py-2.5 text-xs sm:text-sm text-sky-100 font-medium leading-relaxed backdrop-blur-xs">
            <span className="text-base shrink-0">📅</span>
            <p className="text-sky-100/95 font-medium">
              Cada revisão agendada aparece no <strong className="text-white font-bold">Planner</strong>. As revisões seguem em ciclos de 4 (R1–R4, R5–R8…): a cada ciclo completo o bloco ganha um{' '}
              <strong className="text-white font-bold">🏆 ciclo</strong> e continua sendo revisado.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
