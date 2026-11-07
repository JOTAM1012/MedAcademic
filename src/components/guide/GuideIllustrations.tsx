// Ilustrações feitas à mão (SVG/JSX) do guia "Como funciona o Método MedAcademic".
// Sem imagens externas; cores de destaque fixas e neutros com pares claro/escuro.
import React from 'react';
import { Check, Play, ArrowRight } from 'lucide-react';
import { FORGETTING_CURVE, TECHNIQUES } from '../../data/studyMethod';

/** Moldura padrão das ilustrações */
export const IllustrationFrame: React.FC<{ children: React.ReactNode; className?: string; caption?: React.ReactNode; id?: string }> = ({
  children,
  className = '',
  caption,
  id,
}) => (
  <figure id={id} className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-3 sm:p-4 ${className}`}>
    {children}
    {caption && <figcaption className="mt-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{caption}</figcaption>}
  </figure>
);

// ---------------------------------------------------------------------------------------------
// Passo 0 · Reler × testar-se (ilustração qualitativa, sem números)
// ---------------------------------------------------------------------------------------------
export const IllusionOfCompetenceArt: React.FC = () => {
  const groups = [
    { x: 40, label: 'Reler o resumo', feel: 92, keep: 34 },
    { x: 190, label: 'Testar-se de memória', feel: 52, keep: 82 },
  ];
  const base = 128;
  const h = 100;
  return (
    <div>
      <div className="flex flex-wrap items-center gap-3 mb-2 text-[11px] font-bold">
        <span className="inline-flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <span className="h-2.5 w-2.5 rounded-sm bg-slate-400 dark:bg-slate-500" /> Parece que eu sei
        </span>
        <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Lembro uma semana depois
        </span>
      </div>
      <svg viewBox="0 0 300 156" className="w-full h-auto" role="img" aria-label="Reler parece fácil mas fixa pouco; testar-se parece difícil mas fixa muito mais">
        <line x1="16" x2="290" y1={base} y2={base} className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="1" />
        {groups.map((g) => (
          <g key={g.label}>
            <rect x={g.x} y={base - (g.feel / 100) * h} width="34" height={(g.feel / 100) * h} rx="5" className="fill-slate-400 dark:fill-slate-500" />
            <rect x={g.x + 38} y={base - (g.keep / 100) * h} width="34" height={(g.keep / 100) * h} rx="5" fill="#10b981" />
            <text x={g.x + 36} y={base + 18} textAnchor="middle" className="fill-slate-600 dark:fill-slate-300" fontSize="11" fontWeight="700">
              {g.label}
            </text>
          </g>
        ))}
        <text x="150" y="14" textAnchor="middle" className="fill-slate-400 dark:fill-slate-500" fontSize="9.5" fontStyle="italic">
          ilustração: o que parece fácil fixa menos
        </text>
      </svg>
    </div>
  );
};

// ---------------------------------------------------------------------------------------------
// Passo 1 · Curva do esquecimento (dados reais: Ebbinghaus 1885, economia ao reaprender)
// ---------------------------------------------------------------------------------------------
const MINUTES: Record<string, number> = { '20 min': 20, '1 h': 60, '9 h': 540, '1 dia': 1440, '2 dias': 2880, '6 dias': 8640, '31 dias': 44640 };

export const ForgettingCurveChart: React.FC = () => {
  const L = 36;
  const R = 12;
  const T = 18;
  const B = 34;
  const W = 340 - L - R;
  const H = 200 - T - B;
  const pts = FORGETTING_CURVE.map((p) => ({ ...p, lg: Math.log10(MINUTES[p.label] || 20) }));
  const min = pts[0].lg;
  const max = pts[pts.length - 1].lg;
  const xOf = (lg: number) => L + ((lg - min) / (max - min)) * W;
  const yOf = (pct: number) => T + H - (pct / 100) * H;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${xOf(p.lg).toFixed(1)},${yOf(p.pct).toFixed(1)}`).join(' ');
  const area = `${line} L${xOf(max).toFixed(1)},${yOf(0)} L${xOf(min).toFixed(1)},${yOf(0)} Z`;
  const day = pts.find((p) => p.label === '1 dia')!;
  const fmt = (n: number) => `${n.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  const labelled = new Set(['20 min', '1 dia', '31 dias']);
  return (
    <svg viewBox="0 0 340 200" className="w-full h-auto" role="img" aria-label="Curva do esquecimento: a economia ao reaprender cai de 58% em 20 minutos para 34% em 1 dia e 21% em 31 dias">
      <defs>
        <linearGradient id="guide-curve-fill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={L} x2={L + W} y1={yOf(g)} y2={yOf(g)} className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="1" strokeDasharray={g === 0 ? undefined : '3 4'} />
          <text x={L - 6} y={yOf(g) + 3} textAnchor="end" className="fill-slate-400 dark:fill-slate-500" fontSize="9">
            {g}%
          </text>
        </g>
      ))}
      {/* faixa das primeiras 24 h: onde a maior parte se perde */}
      <rect x={xOf(min)} y={T} width={xOf(day.lg) - xOf(min)} height={H} fill="#f59e0b" opacity="0.07" />
      <text x={(xOf(min) + xOf(day.lg)) / 2} y={T + 10} textAnchor="middle" fill="#d97706" fontSize="9" fontWeight="700">
        primeiras 24 h
      </text>
      <path d={area} fill="url(#guide-curve-fill)" />
      <path d={line} fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {pts.map((p) => {
        const isDay = p.label === '1 dia';
        return (
          <g key={p.label}>
            <circle cx={xOf(p.lg)} cy={yOf(p.pct)} r={isDay ? 5.5 : 3.5} fill={isDay ? '#f59e0b' : '#0ea5e9'} className="stroke-white dark:stroke-slate-950" strokeWidth="2" />
            {labelled.has(p.label) && (
              <text x={xOf(p.lg) + (p.label === '31 dias' ? -2 : 0)} y={yOf(p.pct) - 10} textAnchor={p.label === '31 dias' ? 'end' : 'middle'} className="fill-slate-700 dark:fill-slate-200" fontSize="10" fontWeight="800">
                {fmt(p.pct)}
              </text>
            )}
            <text x={xOf(p.lg)} y={T + H + 15} textAnchor={p.label === '20 min' ? 'start' : p.label === '31 dias' ? 'end' : 'middle'} className="fill-slate-500 dark:fill-slate-400" fontSize="9">
              {p.label}
            </text>
          </g>
        );
      })}
      <text x={L + W / 2} y={200 - 4} textAnchor="middle" className="fill-slate-400 dark:fill-slate-500" fontSize="8.5">
        tempo depois de aprender (escala comprimida)
      </text>
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------
// Passo 2 · Linha do tempo das revisões
// ---------------------------------------------------------------------------------------------
export const REVIEW_TIMELINE = [
  { key: 'd0', code: 'D0', when: 'Dia 0', tech: TECHNIQUES.estudo_inicial },
  { key: 'r1', code: 'R1', when: '24 h', tech: TECHNIQUES.folha_branco },
  { key: 'r2', code: 'R2', when: '7 dias', tech: TECHNIQUES.questoes_tema },
  { key: 'r3', code: 'R3', when: '30 dias', tech: TECHNIQUES.questoes_novas },
  { key: 'r4', code: 'R4', when: '60–90 dias', tech: TECHNIQUES.misturadas },
];

export const ReviewTimelineArt: React.FC = () => {
  const xs = [22, 82, 146, 210, 272];
  const y = 42;
  return (
    <svg viewBox="0 0 340 84" className="w-full h-auto" role="img" aria-label="Dia 0, R1 em 24 horas, R2 em 7 dias, R3 em 30 dias, R4 entre 60 e 90 dias e depois a cada poucos meses">
      <line x1={xs[0]} x2={xs[4]} y1={y} y2={y} className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="3" strokeLinecap="round" />
      <line x1={xs[4]} x2={326} y1={y} y2={y} className="stroke-slate-300 dark:stroke-slate-700" strokeWidth="3" strokeDasharray="2 6" strokeLinecap="round" />
      {REVIEW_TIMELINE.map((n, i) => (
        <g key={n.key}>
          <circle cx={xs[i]} cy={y} r="14" fill={n.tech.color} />
          <text x={xs[i]} y={y + 3.5} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="900">
            {n.code}
          </text>
          <text x={xs[i]} y={y - 22} textAnchor="middle" className="fill-slate-700 dark:fill-slate-200" fontSize="10" fontWeight="800">
            {n.when}
          </text>
          <text x={xs[i]} y={y + 31} textAnchor="middle" fontSize="13">
            {n.tech.emoji}
          </text>
        </g>
      ))}
      <text x={330} y={y - 22} textAnchor="end" className="fill-slate-400 dark:fill-slate-500" fontSize="9" fontWeight="700">
        meses
      </text>
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------
// Passo 3 · Questão com certeza marcada (mock)
// ---------------------------------------------------------------------------------------------
export const QuestionMockArt: React.FC = () => (
  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 shadow-xs">
    <div className="flex items-center justify-between gap-2">
      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Questão 7 · sem consultar</span>
      <span className="text-[10px] font-bold text-violet-600 dark:text-violet-300 bg-violet-500/10 border border-violet-500/20 rounded-full px-2 py-0.5">R2 · Questões do tema</span>
    </div>
    <div className="mt-2 space-y-1.5" aria-hidden>
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 w-full" />
      <div className="h-2 rounded-full bg-slate-200 dark:bg-slate-800 w-4/5" />
    </div>
    <div className="mt-3 grid grid-cols-2 gap-1.5 text-[11px] font-bold">
      {['A', 'B', 'C', 'D'].map((l) => (
        <div
          key={l}
          className={`flex items-center gap-1.5 rounded-lg border px-2 py-1.5 ${
            l === 'C' ? 'border-sky-500/50 bg-sky-500/10 text-sky-700 dark:text-sky-300' : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
          }`}
        >
          <span className="h-4 w-4 rounded-full border border-current grid place-items-center text-[9px]">{l}</span>
          <span className="h-1.5 flex-1 rounded-full bg-current opacity-25" />
        </div>
      ))}
    </div>
    <div className="mt-3 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-bold text-slate-400 mr-0.5">Antes de conferir:</span>
      {[
        { l: '🎲 Chute', on: false },
        { l: '🤔 Dúvida', on: true },
        { l: '💪 Certeza', on: false },
      ].map((c) => (
        <span
          key={c.l}
          className={`text-[10px] font-bold rounded-full px-2 py-0.5 border ${
            c.on ? 'bg-amber-500/15 border-amber-500/40 text-amber-700 dark:text-amber-300' : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'
          }`}
        >
          {c.l}
        </span>
      ))}
    </div>
  </div>
);

// ---------------------------------------------------------------------------------------------
// Passo 7 · Pomodoro 25/5 × 50/10 numa hora
// ---------------------------------------------------------------------------------------------
export const PomodoroBarsArt: React.FC = () => {
  const L = 52;
  const W = 276;
  const px = W / 60;
  const rows = [
    { y: 14, label: '25/5', parts: [25, 5, 25, 5] },
    { y: 50, label: '50/10', parts: [50, 10] },
  ];
  return (
    <svg viewBox="0 0 340 96" className="w-full h-auto" role="img" aria-label="Uma hora em 25/5: dois blocos de 25 minutos com pausas de 5. Em 50/10: um bloco de 50 minutos e pausa de 10">
      {rows.map((r) => {
        let x = L;
        return (
          <g key={r.label}>
            <text x={L - 8} y={r.y + 15} textAnchor="end" className="fill-slate-700 dark:fill-slate-200" fontSize="12" fontWeight="900">
              {r.label}
            </text>
            {r.parts.map((m, i) => {
              const focus = i % 2 === 0;
              const el = (
                <g key={i}>
                  <rect x={x + 1} y={r.y} width={m * px - 2} height="22" rx="6" fill={focus ? '#f97316' : '#10b981'} opacity={focus ? 1 : 0.85} />
                  <text x={x + (m * px) / 2} y={r.y + 15} textAnchor="middle" fill="#fff" fontSize="10" fontWeight="800">
                    {focus ? `${m} min foco` : `${m}`}
                  </text>
                </g>
              );
              x += m * px;
              return el;
            })}
          </g>
        );
      })}
      <text x={L} y={90} className="fill-slate-400 dark:fill-slate-500" fontSize="9">
        0
      </text>
      <text x={L + W} y={90} textAnchor="end" className="fill-slate-400 dark:fill-slate-500" fontSize="9">
        60 min
      </text>
    </svg>
  );
};

// ---------------------------------------------------------------------------------------------
// Modo rápido (3 telas)
// ---------------------------------------------------------------------------------------------
export const QuickPriorityArt: React.FC = () => (
  <div className="space-y-2" aria-hidden>
    {[
      { n: 1, t: 'Revisões do dia', c: '#0ea5e9', w: '100%', tag: 'primeiro' },
      { n: 2, t: 'Questões e caderno de erros', c: '#8b5cf6', w: '88%' },
      { n: 3, t: 'Conteúdo novo', c: '#10b981', w: '76%' },
    ].map((r) => (
      <div
        key={r.n}
        style={{ width: r.w, borderColor: `${r.c}55`, background: `${r.c}14` }}
        className="flex items-center gap-2.5 rounded-xl border px-3 py-2.5"
      >
        <span className="h-7 w-7 shrink-0 rounded-lg grid place-items-center text-xs font-black text-white" style={{ background: r.c }}>
          {r.n}
        </span>
        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{r.t}</span>
        {r.tag && (
          <span className="ml-auto shrink-0 text-[10px] font-black uppercase tracking-wider rounded-full px-2 py-0.5 text-white" style={{ background: r.c }}>
            {r.tag}
          </span>
        )}
      </div>
    ))}
  </div>
);

export const QuickNextStepArt: React.FC = () => (
  <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 space-y-1.5" aria-hidden>
    {[
      { t: 'Flashcards do dia', done: true },
      { t: 'R1 · Folha em branco: Insuficiência cardíaca', done: true },
      { t: 'R2 · Questões do tema: Asma', now: true },
      { t: 'Tema novo: Pneumonias' },
    ].map((r) => (
      <div
        key={r.t}
        className={`flex items-center gap-2 rounded-xl px-2.5 py-2 text-[11px] sm:text-xs font-bold ${
          r.now ? 'bg-sky-500/10 border border-sky-500/40 text-sky-700 dark:text-sky-200' : 'text-slate-500 dark:text-slate-400'
        }`}
      >
        {r.done ? (
          <span className="h-5 w-5 shrink-0 rounded-full bg-emerald-500 grid place-items-center">
            <Check className="h-3 w-3 text-white" strokeWidth={3} />
          </span>
        ) : r.now ? (
          <ArrowRight className="h-5 w-5 shrink-0 text-sky-500" />
        ) : (
          <span className="h-5 w-5 shrink-0 rounded-full border-2 border-slate-300 dark:border-slate-700" />
        )}
        <span className={`truncate ${r.done ? 'line-through decoration-slate-400/60' : ''}`}>{r.t}</span>
        {r.now && <span className="ml-auto shrink-0 text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-300">agora</span>}
      </div>
    ))}
  </div>
);

export const QuickFocusArt: React.FC = () => {
  const r = 46;
  const c = 2 * Math.PI * r;
  return (
    <div className="flex flex-col items-center gap-3" aria-hidden>
      <svg viewBox="0 0 120 120" className="w-32 h-32">
        <circle cx="60" cy="60" r={r} fill="none" className="stroke-slate-200 dark:stroke-slate-800" strokeWidth="9" />
        <circle cx="60" cy="60" r={r} fill="none" stroke="#f97316" strokeWidth="9" strokeLinecap="round" strokeDasharray={`${c * 0.72} ${c}`} transform="rotate(-90 60 60)" />
        <text x="60" y="62" textAnchor="middle" className="fill-slate-900 dark:fill-white" fontSize="22" fontWeight="900">
          25:00
        </text>
        <text x="60" y="80" textAnchor="middle" className="fill-slate-500 dark:fill-slate-400" fontSize="9" fontWeight="700">
          foco
        </text>
      </svg>
      <span className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-black text-white shadow-md shadow-sky-500/20">
        <Play className="h-3.5 w-3.5 fill-current" /> Começar
      </span>
    </div>
  );
};
