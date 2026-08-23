import React, { useState } from 'react';
import {
  TrendingUp,
  ChevronDown,
  Bell,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';

interface SpacedRepetitionRulesCardProps {
  initialExpanded?: boolean;
  className?: string;
}

export const SpacedRepetitionRulesCard: React.FC<SpacedRepetitionRulesCardProps> = ({
  initialExpanded = true,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);

  return (
    <div
      id="spaced-repetition-rules-card"
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-sky-600 via-sky-700 to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 border border-sky-400/20 ${className}`}
    >
      {/* Background Subtle Glow / Accent Effect */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-cyan-400/15 blur-3xl" />
      <div className="pointer-events-none absolute -left-16 -bottom-16 h-48 w-48 rounded-full bg-blue-900/30 blur-2xl" />

      {/* 1. Header do Card */}
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
          {/* Circular Icon with translucent cyan/sky background */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-cyan-300/20 border border-cyan-200/30 shadow-inner backdrop-blur-xs text-cyan-200">
            <TrendingUp className="h-6 w-6 stroke-[2.2]" />
          </div>

          <div>
            <h3 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
              <span>Regras do Algoritmo de Repetição Espaçada</span>
              <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-cyan-100 backdrop-blur-xs">
                <Sparkles className="h-2.5 w-2.5" />
                SM-2 Adaptativo
              </span>
            </h3>
            <p className="text-xs sm:text-sm text-sky-100/80 font-medium">
              Projetado com base na Curva do Esquecimento
            </p>
          </div>
        </div>

        {/* Expand / Collapse Chevron */}
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/90 transition-transform duration-300 ${
            isExpanded ? 'rotate-180 bg-white/20' : 'rotate-0'
          }`}
          aria-label={isExpanded ? 'Recolher regras' : 'Expandir regras'}
        >
          <ChevronDown className="h-4 w-4" />
        </div>
      </div>

      {/* Collapsible Content Area */}
      {isExpanded && (
        <div className="relative z-10 space-y-4 px-5 pb-5 sm:px-6 sm:pb-6 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* 2. Seção de Intervalos Adaptativos */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between text-xs sm:text-sm font-semibold text-white/95 tracking-wide">
              <span className="flex items-center gap-1.5">
                <span>📊</span>
                <span>Intervalos Adaptativos do Ciclo:</span>
              </span>
              <span className="text-[11px] text-sky-200/70 font-normal hidden sm:inline">
                Intervalos entre revisões
              </span>
            </div>

            {/* Dark Navy High-Contrast Box (#0B132B / #0F172A) */}
            <div className="overflow-hidden rounded-xl border border-slate-700/60 bg-[#0B132B] p-3 sm:p-4 shadow-inner text-slate-100">
              <div className="divide-y divide-slate-800/80 space-y-2.5">
                {/* Linha 1: Difícil */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 pt-0 first:pt-0">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.7)]" />
                    <span className="text-xs sm:text-sm font-bold text-rose-400 tracking-wide">
                      Difícil
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium hidden md:inline">
                      (Retenção instável)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-mono font-medium text-slate-200 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto">
                    <span className="font-semibold text-white">1d</span>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    <span className="font-semibold text-white">3d</span>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    <span className="font-semibold text-white">7d</span>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    <span className="font-semibold text-rose-300 font-bold">15d</span>
                  </div>
                </div>

                {/* Linha 2: Médio */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 pt-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.7)]" />
                    <span className="text-xs sm:text-sm font-bold text-amber-300 tracking-wide">
                      Médio
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium hidden md:inline">
                      (Recordação com esforço)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-mono font-medium text-slate-200 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto">
                    <span className="font-semibold text-white">3d</span>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    <span className="font-semibold text-white">7d</span>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    <span className="font-semibold text-white">15d</span>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    <span className="font-semibold text-amber-300 font-bold">30d</span>
                  </div>
                </div>

                {/* Linha 3: Fácil */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 pt-2.5">
                  <div className="flex items-center gap-2.5">
                    <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.7)]" />
                    <span className="text-xs sm:text-sm font-bold text-emerald-300 tracking-wide">
                      Fácil
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium hidden md:inline">
                      (Memória consolidada)
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm font-mono font-medium text-slate-200 bg-slate-900/90 px-3 py-1.5 rounded-lg border border-slate-800 self-start sm:self-auto">
                    <span className="font-semibold text-white">7d</span>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    <span className="font-semibold text-white">15d</span>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    <span className="font-semibold text-white">30d</span>
                    <ArrowRight className="h-3 w-3 text-slate-500" />
                    <span className="font-semibold text-emerald-300 font-bold">60d</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Rodapé Informativo */}
          <div className="flex items-start sm:items-center gap-2.5 rounded-xl bg-sky-950/40 border border-sky-300/20 px-3.5 py-2.5 text-xs sm:text-sm text-sky-100 font-medium leading-relaxed backdrop-blur-xs">
            <span className="text-base shrink-0">🔔</span>
            <p className="text-sky-100/95 font-medium">
              Notificações enviadas automaticamente com{' '}
              <strong className="text-white font-bold underline decoration-sky-300/40 underline-offset-2">
                1 dia, 1 hora e 15 min
              </strong>{' '}
              de antecedência.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
