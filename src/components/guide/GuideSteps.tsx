// Conteúdo dos passos do guia "Como funciona o Método MedAcademic".
// Cada passo é curto e visual; os números são sugestões do guia (modelo para adaptar).
import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  FolderHeart,
  Layers,
  NotebookPen,
  Play,
  Repeat,
  SlidersHorizontal,
  Timer,
  HeartHandshake,
} from 'lucide-react';
import type { StudyPlanPrefs } from '../../types';
import {
  CERTAINTY_INFO,
  CERTAINTY_ORDER,
  DAILY_HABITS,
  ERROR_TYPES,
  ERROR_TYPE_ORDER,
  PHASE_INFO,
  ROUTINE_DISCLAIMER,
  SLEEP_NOTE,
  WEEKDAY_SHORT,
  WELLBEING_NOTE,
  type StudyPhase,
} from '../../data/studyMethod';
import {
  ForgettingCurveChart,
  IllusionOfCompetenceArt,
  IllustrationFrame,
  PomodoroBarsArt,
  QuestionMockArt,
  REVIEW_TIMELINE,
  ReviewTimelineArt,
} from './GuideIllustrations';

export interface GuideContext {
  phase: StudyPhase;
  residencyPrep: boolean;
  prefs: StudyPlanPrefs;
  /** Fecha o guia e leva a uma aba */
  goTo: (target: 'structure' | 'calendar' | 'spaced_repetition' | 'erros' | 'stopwatch' | 'personal' | 'routine') => void;
}

export interface GuideStep {
  id: string;
  emoji: string;
  /** Nome curto (índice) */
  short: string;
  title: string;
  color: string;
  render: (ctx: GuideContext) => React.ReactNode;
}

// ---------------------------------------------------------------------------------------------
// Peças de texto
// ---------------------------------------------------------------------------------------------
const Lead: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <p className="text-sm sm:text-[15px] leading-relaxed text-slate-600 dark:text-slate-300">{children}</p>
);

const SectionTitle: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-1">{children}</h3>
);

const Point: React.FC<{ emoji?: string; color?: string; title: React.ReactNode; children?: React.ReactNode }> = ({ emoji, color = '#0ea5e9', title, children }) => (
  <li className="flex items-start gap-3">
    <span className="mt-0.5 h-8 w-8 shrink-0 rounded-xl grid place-items-center text-base" style={{ background: `${color}1a` }}>
      {emoji || <Check className="h-4 w-4" style={{ color }} />}
    </span>
    <div className="min-w-0">
      <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{title}</p>
      {children && <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">{children}</p>}
    </div>
  </li>
);

type Tone = 'sky' | 'amber' | 'emerald' | 'violet' | 'rose';
const TONES: Record<Tone, string> = {
  sky: 'bg-sky-500/10 border-sky-500/25 text-sky-800 dark:text-sky-200',
  amber: 'bg-amber-500/10 border-amber-500/25 text-amber-800 dark:text-amber-200',
  emerald: 'bg-emerald-500/10 border-emerald-500/25 text-emerald-800 dark:text-emerald-200',
  violet: 'bg-violet-500/10 border-violet-500/25 text-violet-800 dark:text-violet-200',
  rose: 'bg-rose-500/10 border-rose-500/25 text-rose-800 dark:text-rose-200',
};

const Callout: React.FC<{ tone?: Tone; emoji?: string; children: React.ReactNode; id?: string }> = ({ tone = 'sky', emoji = '💡', children, id }) => (
  <div id={id} className={`flex items-start gap-2.5 rounded-2xl border p-3 sm:p-3.5 text-[13px] leading-relaxed font-semibold ${TONES[tone]}`}>
    <span className="text-base leading-none mt-0.5" aria-hidden>
      {emoji}
    </span>
    <div className="min-w-0">{children}</div>
  </div>
);

const Chip: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold border ink" style={{ '--ink': color, background: `${color}14`, borderColor: `${color}40` } as React.CSSProperties}>
    {children}
  </span>
);

// ---------------------------------------------------------------------------------------------
// Passos
// ---------------------------------------------------------------------------------------------
export const GUIDE_STEPS: GuideStep[] = [
  {
    id: 'why',
    emoji: '🤔',
    short: 'Por que método?',
    title: 'Por que seguir um método?',
    color: '#0ea5e9',
    render: () => (
      <div className="space-y-4">
        <Lead>
          O difícil na medicina não é aprender: é <strong className="text-slate-900 dark:text-white">não esquecer</strong>. Você estuda um tema, entende tudo e, semanas depois, ele sumiu.
        </Lead>
        <IllustrationFrame>
          <IllusionOfCompetenceArt />
        </IllustrationFrame>
        <ul className="space-y-3">
          <Point emoji="🪞" color="#64748b" title="Reler dá a ilusão de que você sabe">
            O texto parece familiar, e familiar parece “sei”. Mas na prova ninguém te mostra o texto.
          </Point>
          <Point emoji="🧠" color="#10b981" title="Tentar lembrar é o que fixa">
            Questões, folha em branco e explicar em voz alta obrigam o cérebro a buscar a informação. É isso que fortalece a memória.
          </Point>
          <Point emoji="💪" color="#f59e0b" title="Parece mais difícil, e é por isso que funciona">
            Se der trabalho, não quer dizer que está dando errado. Esse esforço é justamente o que faz o conteúdo ficar.
          </Point>
        </ul>
        <Callout tone="sky" emoji="🧭">
          O site faz a parte chata por você: decide <strong>o que</strong> revisar, <strong>quando</strong> e <strong>como</strong>. Você só segue o próximo passo.
        </Callout>
      </div>
    ),
  },
  {
    id: 'curve',
    emoji: '📉',
    short: 'Curva do esquecimento',
    title: 'A curva do esquecimento',
    color: '#f59e0b',
    render: () => (
      <div className="space-y-4">
        <Lead>
          Em 1885, Ebbinghaus mediu quanto tempo economizava ao reestudar algo que já tinha aprendido. A economia cai rápido no começo e depois bem devagar.
        </Lead>
        <IllustrationFrame
          id="guide-forgetting-curve"
          caption="Economia ao reaprender (Ebbinghaus, 1885): quanto do esforço ele poupou ao reestudar a mesma lista depois de cada intervalo."
        >
          <ForgettingCurveChart />
        </IllustrationFrame>
        <SectionTitle>Três cuidados ao ler a curva</SectionTitle>
        <ul className="space-y-3">
          <Point emoji="⚠️" color="#e11d48" title="Não é “esquecemos 70% em 24 horas”">
            O número mede economia ao reaprender, com sílabas sem sentido. Não é uma porcentagem de matéria perdida.
          </Point>
          <Point emoji="🗂️" color="#8b5cf6" title="Esquecer não é apagar">
            Mesmo depois de um mês ainda sobra economia: reestudar fica mais rápido. A memória enfraquece, mas não some.
          </Point>
          <Point emoji="🔗" color="#10b981" title="Conteúdo com significado cai mais devagar">
            Medicina entendida (mecanismo, ligação com a clínica) é esquecida bem mais devagar que sílabas soltas.
          </Point>
        </ul>
        <Callout tone="amber" emoji="⏰">
          A maior queda acontece nas primeiras horas. Por isso a <strong>1ª revisão, em 24 h, é a mais valiosa</strong> de todas.
        </Callout>
      </div>
    ),
  },
  {
    id: 'reviews',
    emoji: '🔁',
    short: 'Suas revisões',
    title: 'Suas revisões: quando e como',
    color: '#8b5cf6',
    render: () => (
      <div className="space-y-4">
        <Lead>Cada tema que você estuda entra numa linha do tempo. Em cada volta você usa uma técnica diferente, sempre tentando lembrar antes de olhar.</Lead>
        <IllustrationFrame>
          <ReviewTimelineArt />
        </IllustrationFrame>
        <ol id="guide-review-timeline" className="space-y-2">
          {REVIEW_TIMELINE.map((n) => (
            <li key={n.key} className="flex items-start gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <span className="h-9 w-9 shrink-0 rounded-xl grid place-items-center text-[11px] font-black text-white" style={{ background: n.tech.color }}>
                {n.code}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                    {n.tech.emoji} {n.tech.label}
                  </span>
                  <span className="text-[11px] font-bold rounded-full px-2 py-0.5 ink" style={{ '--ink': n.tech.color, background: `${n.tech.color}14` } as React.CSSProperties}>
                    {n.when}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{n.tech.steps[0]}.</p>
              </div>
            </li>
          ))}
          <li className="flex items-center gap-3 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-3">
            <span className="h-9 w-9 shrink-0 rounded-xl grid place-items-center text-base bg-slate-100 dark:bg-slate-800">♾️</span>
            <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Depois, o tema volta <strong className="text-slate-700 dark:text-slate-200">a cada poucos meses</strong>, misturado com outros.
            </p>
          </li>
        </ol>
        <SectionTitle>O intervalo se ajusta a você</SectionTitle>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="rounded-2xl border border-rose-500/25 bg-rose-500/5 p-3">
            <p className="text-sm font-black text-rose-600 dark:text-rose-300">Foi mal</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">A próxima revisão vem mais cedo.</p>
          </div>
          <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/5 p-3">
            <p className="text-sm font-black text-emerald-600 dark:text-emerald-300">Foi bem</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">O intervalo fica mais longo.</p>
          </div>
          <div className="rounded-2xl border border-sky-500/25 bg-sky-500/5 p-3">
            <p className="text-sm font-black text-sky-600 dark:text-sky-300">Atrasou um pouco?</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">Um pouco tarde é melhor que cedo demais.</p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'questions',
    emoji: '🎯',
    short: 'Questões e caderno de erros',
    title: 'Questões e caderno de erros',
    color: '#e11d48',
    render: () => (
      <div className="space-y-4">
        <Lead>Questão não é só para medir: é a melhor forma de revisar. O jeito de fazer muda tudo.</Lead>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 items-start">
          <QuestionMockArt />
          <ol className="space-y-2.5">
            {[
              ['Responda sem consultar', 'Mesmo achando que não sabe. Tentar já ajuda a aprender.'],
              ['Marque sua certeza antes de conferir', CERTAINTY_ORDER.map((c) => `${CERTAINTY_INFO[c].emoji} ${CERTAINTY_INFO[c].label}`).join(' · ') + '. Acerto no chute não é domínio.'],
              ['Leia o comentário de todas as alternativas', 'Até das que você acertou: cada alternativa ensina um ponto.'],
              ['Classifique cada erro', 'O tipo do erro diz o que fazer (abaixo).'],
            ].map(([t, d], i) => (
              <li key={t} className="flex items-start gap-2.5">
                <span className="h-6 w-6 shrink-0 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-300 grid place-items-center text-[11px] font-black">{i + 1}</span>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{t}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <SectionTitle>Os 4 tipos de erro e o que fazer</SectionTitle>
        <div id="guide-error-types" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {ERROR_TYPE_ORDER.map((k) => {
            const e = ERROR_TYPES[k];
            return (
              <div key={k} className="rounded-2xl border p-3" style={{ borderColor: `${e.color}40`, background: `${e.color}0d` }}>
                <p className="text-sm font-black ink" style={{ '--ink': e.color } as React.CSSProperties}>
                  {e.emoji} {e.label}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 italic mt-0.5">Ex.: {e.example}</p>
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 mt-1.5 flex items-start gap-1">
                  <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: e.color }} />
                  <span>{e.action}</span>
                </p>
              </div>
            );
          })}
        </div>
        <SectionTitle>Caderno de erros: 1 linha por erro</SectionTitle>
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3 text-xs">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-black text-slate-800 dark:text-slate-100">Asma</span>
            <Chip color={ERROR_TYPES.leitura.color}>
              {ERROR_TYPES.leitura.emoji} {ERROR_TYPES.leitura.label}
            </Chip>
          </div>
          <p className="text-slate-500 dark:text-slate-400 mt-1.5">
            <strong className="text-slate-600 dark:text-slate-300">Por que errei:</strong> não vi o “EXCETO”.
          </p>
          <p className="text-slate-700 dark:text-slate-200 mt-0.5">
            <strong>Regra:</strong> ler o comando da questão antes das alternativas.
          </p>
        </div>
        <Callout tone="violet" emoji="📒">
          O erro volta para você refazer: dentro da próxima revisão do tema (7 e 30 dias) ou, se não tiver tema, em 7 e 30 dias. Acertou duas vezes seguidas? Resolvido.
        </Callout>
      </div>
    ),
  },
  {
    id: 'day',
    emoji: '☀️',
    short: 'Seu plano do dia',
    title: 'Seu plano do dia',
    color: '#10b981',
    render: () => (
      <div className="space-y-4">
        <Lead>Todo dia o site monta sozinho o que estudar, na ordem certa e do tamanho do seu tempo. Quando o dia aperta, a prioridade é sempre esta:</Lead>
        <div className="grid grid-cols-3 gap-2">
          {[
            { n: 1, t: 'Revisões', c: '#0ea5e9' },
            { n: 2, t: 'Questões', c: '#8b5cf6' },
            { n: 3, t: 'Conteúdo novo', c: '#10b981' },
          ].map((p) => (
            <div key={p.n} className="rounded-2xl border p-2.5 text-center" style={{ borderColor: `${p.c}40`, background: `${p.c}10` }}>
              <span className="mx-auto h-7 w-7 rounded-lg grid place-items-center text-xs font-black text-white" style={{ background: p.c }}>
                {p.n}
              </span>
              <p className="text-[11px] sm:text-xs font-bold text-slate-700 dark:text-slate-200 mt-1.5 leading-tight">{p.t}</p>
            </div>
          ))}
        </div>
        <div id="guide-plan-mock" className="rounded-2xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 to-transparent p-3.5 flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-sky-600 dark:text-sky-300">Agora</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">R1 · Folha em branco: Insuficiência cardíaca</p>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">1 × 25 min</p>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3 py-2 text-xs font-black text-white" aria-hidden>
            <Play className="h-3.5 w-3.5 fill-current" /> Começar
          </span>
        </div>
        <p className="text-xs sm:text-[13px] text-slate-500 dark:text-slate-400 leading-relaxed">
          Você não precisa decidir nada: abra o <strong className="text-slate-700 dark:text-slate-200">Planner › Hoje</strong> e aperte <strong className="text-slate-700 dark:text-slate-200">Começar</strong>. O Pomodoro já abre com a tarefa e os passos.
        </p>
        <SectionTitle>Um dia típico do guia</SectionTitle>
        <ol className="relative space-y-1.5 pl-1">
          {[
            ['🃏', 'Flashcards do dia', '1 bloco'],
            ['🌱', 'Tema novo: pré-teste, mapa geral e Feynman', '2–3 blocos'],
            ['✍️', 'Criar flashcards do tema novo', '1 bloco'],
            ['🎯', 'Questões das revisões de 24 h, 7 e 30 dias', '2 blocos'],
            ['🌙', 'Folha em branco no fim do dia', '10 min'],
            ['😴', 'Dormir em horário regular', ''],
          ].map(([e, t, d]) => (
            <li key={t} className="flex items-center gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 px-3 py-2">
              <span className="text-base" aria-hidden>
                {e}
              </span>
              <span className="text-xs sm:text-[13px] font-semibold text-slate-700 dark:text-slate-200 flex-1 min-w-0">{t}</span>
              {d && <span className="shrink-0 text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5">{d}</span>}
            </li>
          ))}
        </ol>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">📦 Não coube hoje</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">O que passar do seu tempo fica separado, com “Passar para amanhã”. Sem culpa.</p>
          </div>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3">
            <p className="text-sm font-black text-slate-800 dark:text-slate-100">🫶 Dia difícil</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">Ligue quando estiver sem energia: o plano encolhe para o essencial, em blocos de 25 min.</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 dark:text-slate-500 italic">{ROUTINE_DISCLAIMER}</p>
      </div>
    ),
  },
  {
    id: 'week',
    emoji: '🗓️',
    short: 'Sua semana e seu mês',
    title: 'Sua semana e seu mês',
    color: '#6366f1',
    render: ({ prefs }) => {
      const order = [1, 2, 3, 4, 5, 6, 0];
      const kindOf = (d: number) => (prefs.restDay === d ? 'rest' : prefs.mixedDay === d ? 'mixed' : 'normal');
      const KIND = {
        normal: { e: '🌱', t: 'Temas novos', c: '#10b981' },
        mixed: { e: '🔀', t: 'Misturadas', c: '#ec4899' },
        rest: { e: '🛋️', t: 'Descanso', c: '#0ea5e9' },
      } as const;
      return (
        <div className="space-y-4">
          <Lead>A semana tem um ritmo. Ele já vem pronto e você pode ajustar em “Minha rotina”.</Lead>
          <div id="guide-week-grid" className="grid grid-cols-7 gap-1 sm:gap-1.5">
            {order.map((d) => {
              const k = KIND[kindOf(d)];
              return (
                <div
                  key={d}
                  className="rounded-xl border px-0.5 py-2 text-center min-w-0"
                  style={{ borderColor: `${k.c}40`, background: `${k.c}10` }}
                  title={`${WEEKDAY_SHORT[d]}: ${k.t}`}
                >
                  <p className="text-[10px] sm:text-[11px] font-black text-slate-700 dark:text-slate-200">{WEEKDAY_SHORT[d]}</p>
                  <p className="text-base sm:text-lg leading-none my-1" aria-hidden>
                    {k.e}
                  </p>
                  {/* No celular só o emoji; a legenda fica embaixo da grade */}
                  <p className="hidden sm:block text-[10px] font-bold leading-tight truncate ink" style={{ '--ink': k.c } as React.CSSProperties}>
                    {k.t}
                  </p>
                  <span className="sr-only">{k.t}</span>
                </div>
              );
            })}
          </div>
          <p id="guide-week-legend" className="sm:hidden -mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {(['normal', 'mixed', 'rest'] as const).map((key) => (
              <span key={key} className="inline-flex items-center gap-1">
                <span aria-hidden>{KIND[key].e}</span> {KIND[key].t}
              </span>
            ))}
          </p>
          <ul className="space-y-3">
            <Point emoji="🌱" color="#10b981" title="Dias de semana: temas novos conforme a grade">
              1 a 2 temas novos por dia, sempre depois das revisões do dia.
            </Point>
            <Point emoji="🔀" color="#ec4899" title="Dia das misturadas: questões de várias áreas + caderno de erros">
              Misturar temas treina escolher a estratégia certa, como na prova.
            </Point>
            <Point emoji="🛋️" color="#0ea5e9" title="Descanso de verdade + 20 min para planejar">
              Use “Planejar semana” no Planner: ele distribui os temas novos nos dias sozinho, e você ajusta se quiser.
            </Point>
          </ul>
          <SectionTitle>No mês</SectionTitle>
          <ul className="space-y-3">
            <Point emoji="📅" color="#f59e0b" title="As revisões de 30 dias aparecem sozinhas">
              Você não precisa lembrar de nada: o tema reaparece no plano do dia certo.
            </Point>
            <Point emoji="📝" color="#6366f1" title="Provas puxam a prioridade">
              Na semana da prova, as revisões daquela disciplina sobem. Nos últimos dias entram simulados e blocos misturados. Na véspera: caderno de erros e sono.
            </Point>
          </ul>
        </div>
      );
    },
  },
  {
    id: 'phases',
    emoji: '🧬',
    short: 'Cada fase estuda de um jeito',
    title: 'Cada fase estuda de um jeito',
    color: '#10b981',
    render: ({ phase, residencyPrep }) => (
      <div className="space-y-4">
        <Lead>O site ajusta o plano à fase do seu curso (pelo semestre atual): tamanho dos blocos, temas por dia e tarefas fixas.</Lead>
        <div id="guide-phase-cards" className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
          {(['ciclo_basico', 'ciclo_clinico', 'internato'] as StudyPhase[]).map((id) => {
            const p = PHASE_INFO[id];
            const current = id === phase;
            return (
              <div
                key={id}
                id={`guide-phase-${id}`}
                className={`relative rounded-2xl border p-3.5 ${current ? 'ring-2 shadow-lg' : 'opacity-90'}`}
                style={{ borderColor: `${p.color}${current ? '80' : '33'}`, background: `${p.color}${current ? '14' : '08'}`, ...(current ? ({ '--tw-ring-color': `${p.color}66` } as React.CSSProperties) : {}) }}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-900 dark:text-white">
                    {p.emoji} {p.label}
                  </p>
                  {current && (
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-white rounded-full px-2 py-0.5" style={{ background: p.color }}>
                      Você está aqui
                    </span>
                  )}
                </div>
                <p className="text-xs font-semibold mt-1 ink" style={{ '--ink': p.color } as React.CSSProperties}>
                  {p.priority}
                </p>
                <ul className="mt-2 space-y-1.5">
                  {p.tips.map((t) => (
                    <li key={t} className="flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      <Check className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: p.color }} />
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                  Blocos de {p.defaults.focusMinutes} min para tema novo
                </p>
              </div>
            );
          })}
        </div>
        <div
          id="guide-phase-residencia"
          className={`rounded-2xl border p-3.5 ${residencyPrep ? 'ring-2 ring-rose-500/50' : ''}`}
          style={{ borderColor: residencyPrep ? '#e11d4880' : '#e11d4833', background: residencyPrep ? '#e11d4814' : '#e11d4808' }}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-black text-slate-900 dark:text-white">🎯 Preparação para residência</p>
            {residencyPrep && <span className="shrink-0 text-[10px] font-black uppercase tracking-wider text-white rounded-full px-2 py-0.5 bg-rose-600">Você está aqui</span>}
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
            Questões viram o eixo do dia, com caderno de erros e simulados no fim de semana. Liga quando você define a prova-alvo no internato ou cria um projeto de Residência em Estudos pessoais.
          </p>
        </div>
      </div>
    ),
  },
  {
    id: 'pomodoro',
    emoji: '🍅',
    short: 'Pomodoro e Feynman',
    title: 'Pomodoro e Feynman',
    color: '#f97316',
    render: () => (
      <div className="space-y-4">
        <Lead>Duas ferramentas simples que tornam o estudo ativo: blocos de foco com pausa de verdade, e explicar para aprender.</Lead>
        <IllustrationFrame caption="Escolha o formato pelo tipo de tarefa. Na pausa: levante, beba água, longe do celular.">
          <PomodoroBarsArt />
        </IllustrationFrame>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <div className="rounded-2xl border border-orange-500/25 bg-orange-500/5 p-3">
            <p className="text-sm font-black text-orange-600 dark:text-orange-300">25/5</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">Dias de pouca motivação, revisões e tarefas curtas.</p>
          </div>
          <div className="rounded-2xl border border-orange-500/25 bg-orange-500/5 p-3">
            <p className="text-sm font-black text-orange-600 dark:text-orange-300">50/10</p>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">Imersão: tema novo, caso clínico longo.</p>
          </div>
        </div>
        <div id="guide-my-block" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 p-3">
          <p className="text-sm font-black text-slate-900 dark:text-white">Seu bloco, do seu jeito</p>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed">
            25/5 e 50/10 são pontos de partida. Se 60/10 ou 45/15 funcionam melhor para você, escolha em Planner › Rotina (até um tempo personalizado). O plano do
            dia, o Pomodoro e o ciclo de estudos passam a usar o seu bloco.
          </p>
        </div>
        <ul className="space-y-3">
          <Point emoji="🎯" color="#f97316" title="Cada bloco tem uma tarefa concreta">
            “Fazer 20 questões de asma” em vez de “estudar pneumo”.
          </Point>
          <Point emoji="🔢" color="#f97316" title="Conte blocos, não horas">
            4 blocos bem feitos valem mais que 6 horas com o celular do lado.
          </Point>
        </ul>
        <SectionTitle>Feynman em 4 passos</SectionTitle>
        <ol id="guide-feynman" className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {[
            ['Escolha um conceito', 'Ex.: por que a insuficiência cardíaca causa edema.'],
            ['Explique em voz alta, de memória', 'Como se fosse para um colega do 1º período. Sem olhar o material.'],
            ['Marque onde travou', 'Volte à fonte só nesses pontos.'],
            ['Explique de novo, mais simples', 'Até fluir sem jargão e sem pular etapas.'],
          ].map(([t, d], i) => (
            <li key={t} className="flex items-start gap-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <span className="h-7 w-7 shrink-0 rounded-lg bg-violet-500/15 text-violet-600 dark:text-violet-300 grid place-items-center text-xs font-black">{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-snug">{t}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    ),
  },
  {
    id: 'habits',
    emoji: '🌙',
    short: 'Checklist, sono e saúde mental',
    title: 'Checklist, sono e saúde mental',
    color: '#6366f1',
    render: () => (
      <div className="space-y-4">
        <Lead>Sete perguntas para fechar o dia. Algumas o site marca sozinho quando percebe; as outras você marca.</Lead>
        <ul id="guide-habits" className="space-y-1.5">
          {DAILY_HABITS.map((h) => (
            <li key={h.id} className="flex items-center gap-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2.5">
              <span className="text-base shrink-0" aria-hidden>
                {h.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-[13px] font-bold text-slate-800 dark:text-slate-100 leading-snug">{h.label}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{h.hint}</p>
              </div>
              {h.auto && (
                <span className="shrink-0 text-[10px] font-bold rounded-full px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border border-emerald-500/20">automático</span>
              )}
            </li>
          ))}
        </ul>
        <Callout tone="violet" emoji="😴">
          {SLEEP_NOTE}
        </Callout>
        <div className="flex items-start gap-3 rounded-2xl border border-rose-500/25 bg-rose-500/5 p-3.5">
          <HeartHandshake className="h-5 w-5 shrink-0 text-rose-500 mt-0.5" />
          <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">{WELLBEING_NOTE}</p>
        </div>
      </div>
    ),
  },
  {
    id: 'site',
    emoji: '🧭',
    short: 'Como usar o site',
    title: 'Como usar o site, passo a passo',
    color: '#0ea5e9',
    render: ({ goTo }) => {
      const items: Array<{ id: Parameters<GuideContext['goTo']>[0]; icon: React.ElementType; color: string; title: string; text: string }> = [
        { id: 'structure', icon: Layers, color: '#6366f1', title: 'Disciplinas', text: 'Cadastre suas disciplinas e os temas que vai estudar.' },
        { id: 'calendar', icon: CalendarDays, color: '#8b5cf6', title: 'Planner › Hoje', text: 'Abra todo dia e siga o próximo passo do plano.' },
        { id: 'spaced_repetition', icon: Repeat, color: '#0ea5e9', title: 'Revisões', text: 'Faça a revisão com a técnica indicada e registre como foi.' },
        { id: 'erros', icon: NotebookPen, color: '#f59e0b', title: 'Caderno de erros', text: 'Anote cada erro em 1 linha e refaça quando ele voltar.' },
        { id: 'stopwatch', icon: Timer, color: '#f97316', title: 'Pomodoro', text: 'Foque em blocos. O “Começar” do plano já liga a tarefa aqui.' },
        { id: 'personal', icon: FolderHeart, color: '#e11d48', title: 'Estudos pessoais', text: 'Residência, liga, idioma, cursos: com meta semanal e revisões.' },
        { id: 'routine', icon: SlidersHorizontal, color: '#10b981', title: 'Minha rotina', text: 'Ajuste blocos por dia, dia de descanso e dia das misturadas.' },
      ];
      return (
        <div className="space-y-4">
          <Lead>Pronto! Para começar, siga esta ordem. Toque em um item para ir direto à aba.</Lead>
          <ol id="guide-site-steps" className="space-y-2">
            {items.map((it, i) => {
              const Icon = it.icon;
              return (
                <li key={it.id}>
                  <button
                    id={`guide-goto-${it.id}`}
                    onClick={() => goTo(it.id)}
                    className="group w-full min-h-[56px] flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-sky-400/60 dark:hover:border-sky-500/50 hover:bg-sky-50/60 dark:hover:bg-sky-950/30 p-3 text-left transition-colors cursor-pointer"
                  >
                    <span className="text-[11px] font-black text-slate-400 w-4 text-center shrink-0">{i + 1}</span>
                    <span className="h-9 w-9 shrink-0 rounded-xl grid place-items-center" style={{ background: `${it.color}1a`, color: it.color }}>
                      <Icon className="h-[18px] w-[18px]" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-bold text-slate-800 dark:text-slate-100">{it.title}</span>
                      <span className="block text-xs text-slate-500 dark:text-slate-400 leading-snug">{it.text}</span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all" />
                  </button>
                </li>
              );
            })}
          </ol>
          <Callout tone="emerald" emoji="🌱">
            Comece pequeno: cadastre 1 disciplina e 1 tema hoje. O resto o plano organiza com você.
          </Callout>
          <p className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
            <BookOpen className="h-3.5 w-3.5" /> Volte a este guia quando quiser pelo botão “Como funciona?” (Dashboard, Planner e Revisões).
          </p>
        </div>
      );
    },
  },
];
