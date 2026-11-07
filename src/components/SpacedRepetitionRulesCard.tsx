import React, { useState } from 'react';
import { ChevronDown, TrendingUp } from 'lucide-react';
import { REVIEW_INTERVALS } from '../data/blockReview';
import { TECHNIQUES } from '../data/studyMethod';
import type { TopicDifficulty } from '../types';

interface SpacedRepetitionRulesCardProps {
  initialExpanded?: boolean;
  className?: string;
}

// Cronograma do guia: Dia 0 → 24 h → 7 dias → 30 dias → 60–90 dias → a cada poucos meses
const TIMELINE = [
  { when: 'Dia 0', title: 'Estudo inicial', tech: TECHNIQUES.estudo_inicial, detail: 'Pré-teste, mapa, Feynman, flashcards e questões' },
  { when: '24 h', title: 'R1 · Folha em branco', tech: TECHNIQUES.folha_branco, detail: 'Escreva tudo o que lembra, sem consultar' },
  { when: '7 dias', title: 'R2 · Questões do tema', tech: TECHNIQUES.questoes_tema, detail: 'Bloco só deste tema, marcando a certeza' },
  { when: '30 dias', title: 'R3 · Questões novas + caderno', tech: TECHNIQUES.questoes_novas, detail: 'Questões que você não viu e os erros anotados' },
  { when: '60–90 dias', title: 'R4 · Misturadas', tech: TECHNIQUES.misturadas, detail: 'Este tema no meio de outros, como na prova' },
  { when: 'Depois', title: 'Manutenção', tech: { emoji: '🔁', color: '#64748b' }, detail: 'Questões misturadas a cada poucos meses' },
];

const ROWS: Array<{ id: TopicDifficulty; label: string; dot: string; text: string }> = [
  { id: 'dificil', label: 'Foi mal', dot: 'bg-rose-500', text: 'text-rose-600 dark:text-rose-400' },
  { id: 'medio', label: 'Normal', dot: 'bg-amber-400', text: 'text-amber-600 dark:text-amber-400' },
  { id: 'facil', label: 'Foi bem', dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400' },
];

export const SpacedRepetitionRulesCard: React.FC<SpacedRepetitionRulesCardProps> = ({ initialExpanded = false, className = '' }) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(initialExpanded);

  return (
    <div
      id="spaced-repetition-rules-card"
      className={`relative overflow-hidden rounded-3xl border border-sky-200 dark:border-sky-900/60 bg-gradient-to-br from-sky-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/60 shadow-xs ${className}`}
    >
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-sky-300/20 dark:bg-sky-500/10 blur-3xl" />

      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        aria-expanded={isExpanded}
        className="relative z-10 w-full flex items-center justify-between gap-3 p-4 sm:p-5 text-left select-none"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white shadow-sm">
            <TrendingUp className="h-5 w-5 stroke-[2.4]" />
          </div>
          <div className="min-w-0">
            <h3 className="text-[15px] sm:text-base font-black tracking-tight text-slate-900 dark:text-white">Como as revisões são marcadas</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium truncate">Dia 0 → 24 h → 7 dias → 30 dias → 60–90 dias</p>
          </div>
        </div>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/80 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          <ChevronDown className="h-4 w-4" />
        </span>
      </button>

      {isExpanded && (
        <div className="relative z-10 space-y-4 px-4 pb-4 sm:px-5 sm:pb-5">
          {/* Linha do tempo */}
          <ol className="relative space-y-2.5 before:absolute before:left-[19px] before:top-3 before:bottom-3 before:w-px before:bg-slate-200 dark:before:bg-slate-700">
            {TIMELINE.map((s) => (
              <li key={s.when} className="relative flex items-start gap-3">
                <span
                  className="relative z-10 h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-lg border bg-white dark:bg-slate-900"
                  style={{ borderColor: s.tech.color + '55' }}
                  aria-hidden
                >
                  {s.tech.emoji}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className="text-[13px] font-black text-slate-900 dark:text-white leading-tight">
                    <span className="text-[11px] font-black px-1.5 py-0.5 rounded-md mr-1.5 whitespace-nowrap" style={{ color: s.tech.color, backgroundColor: s.tech.color + '18' }}>
                      {s.when}
                    </span>
                    {s.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{s.detail}</p>
                </div>
              </li>
            ))}
          </ol>

          {/* Regras */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[13px] font-black text-slate-900 dark:text-white">🧠 Tentar lembrar</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Revisar é se testar, nunca só reler.</p>
            </div>
            <div className="rounded-2xl bg-white/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[13px] font-black text-slate-900 dark:text-white">↕️ Você ajusta</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Foi mal: o próximo intervalo encurta. Foi bem: alonga.</p>
            </div>
            <div className="rounded-2xl bg-white/80 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 p-3">
              <p className="text-[13px] font-black text-slate-900 dark:text-white">⏳ Sem pressa</p>
              <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">Revisar um pouco tarde é melhor do que cedo demais.</p>
            </div>
          </div>

          {/* Mini-tabela de intervalos */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/50 overflow-hidden">
            <p className="px-3 pt-3 text-[11px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Dias até a próxima revisão</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[300px]">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-slate-400">
                    <th className="text-left font-bold px-3 py-2">Como foi</th>
                    <th className="font-bold px-1.5 py-2">→ R1</th>
                    <th className="font-bold px-1.5 py-2">→ R2</th>
                    <th className="font-bold px-1.5 py-2">→ R3</th>
                    <th className="font-bold px-1.5 py-2 pr-3">→ R4</th>
                  </tr>
                </thead>
                <tbody>
                  {ROWS.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100 dark:border-slate-800">
                      <td className="px-3 py-2">
                        <span className="inline-flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200 whitespace-nowrap">
                          <span className={`h-2 w-2 rounded-full ${r.dot}`} /> {r.label}
                        </span>
                      </td>
                      {REVIEW_INTERVALS[r.id].map((d, i) => (
                        <td key={i} className={`text-center px-1.5 py-2 font-black tabular-nums ${i === 0 ? 'text-slate-400' : r.text} ${i === 3 ? 'pr-3' : ''}`}>
                          {i === 0 ? '24 h' : d === 1 ? '1 d' : `${d} d`}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-3 pb-3 text-[11px] text-slate-500 dark:text-slate-400">
              A 1ª revisão é sempre em 24 h. Depois da R4, o tema entra em manutenção. As datas aparecem no Planner e no plano do dia.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
