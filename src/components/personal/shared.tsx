// Peças comuns da aba "Estudos pessoais": passos do foco por tipo, prazo, anel de progresso.
import React from 'react';
import type { PersonalProject, PersonalProjectItem, PersonalProjectKind } from '../../types';
import { daysBetween } from '../../data/blockReview';

/** Ordem dos dias nos chips (segunda primeiro). Valores = getDay() (0 = domingo) */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export const PROJECT_COLORS = ['#e11d48', '#f59e0b', '#10b981', '#14b8a6', '#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899', '#64748b'];
export const PROJECT_EMOJIS = ['🎯', '🩺', '🌎', '🎓', '📖', '🔬', '🫀', '🧠', '💊', '📈', '✍️', '✨'];

/** Modelos sugeridos no estado vazio (abrem o modal já no passo 2) */
export interface ProjectPreset {
  kind: PersonalProjectKind;
  title?: string;
  items?: string[];
  /** Texto curto do cartão de sugestão */
  blurb?: string;
}

export const SUGGESTED_PRESETS: ProjectPreset[] = [
  { kind: 'residencia', blurb: 'Questões como eixo, um pouco por dia' },
  {
    kind: 'curso',
    title: 'Curso de ECG',
    items: ['Ritmo e frequência', 'Eixo elétrico', 'Ondas e intervalos', 'Sobrecargas', 'Bloqueios', 'Isquemia e infarto', 'Arritmias'],
    blurb: 'Um tema por bloco, com traçados de memória',
  },
  { kind: 'idioma', title: 'Inglês médico', blurb: '25 min, 3 vezes por semana' },
];

/** Título sugerido pelo tipo */
export const suggestedTitle = (kind: PersonalProjectKind, targetExam?: string) => {
  switch (kind) {
    case 'residencia':
      return targetExam?.trim() ? `Residência · ${targetExam.trim()}` : 'Preparação para a residência';
    case 'liga':
      return 'Liga acadêmica';
    case 'idioma':
      return 'Inglês médico';
    case 'curso':
      return 'Curso de ';
    case 'leitura':
      return 'Livro: ';
    case 'pesquisa':
      return 'Meu artigo';
    default:
      return '';
  }
};

/** Passos curtos mostrados durante o foco ("Começar"), sempre com recuperação ativa no fim */
export const projectFocusSteps = (kind: PersonalProjectKind, item?: Pick<PersonalProjectItem, 'title'>): string[] => {
  const t = item?.title;
  switch (kind) {
    case 'residencia':
      return [
        t ? `Questões de ${t}, sem consultar` : 'Bloco de questões, sem consultar',
        'Marque sua certeza antes de conferir',
        'Leia o comentário de todas as alternativas',
        'Anote os erros no caderno com o tipo',
      ];
    case 'idioma':
      return [t ? `Pratique: ${t}` : 'Pratique o idioma (leitura, escuta ou vocabulário)', 'No fim, fale ou escreva 3 frases de memória com o que aprendeu'];
    case 'curso':
      return [
        t ? `Estude: ${t}, pausando para anotar de memória` : 'Avance no curso, pausando para anotar de memória',
        'No fim, escreva de memória o que tirou daqui (folha em branco de 5 min)',
      ];
    case 'leitura':
      return [
        t ? `Leia: ${t}` : 'Leia o próximo trecho',
        'A cada seção, feche o livro e diga a ideia principal em voz alta',
        'No fim, escreva de memória o que tirou daqui (5 min)',
      ];
    case 'pesquisa':
      return [t ? `Avance em: ${t} (uma tarefa concreta)` : 'Escolha uma tarefa concreta da pesquisa', 'Antes de parar, anote o próximo passo'];
    default:
      return t
        ? [`Estude: ${t}`, 'No fim, escreva de memória o que tirou daqui (folha em branco de 5 min)']
        : ['Escolha um passo pequeno e concreto', 'No fim, escreva de memória o que tirou daqui (5 min)'];
  }
};

/** Texto do prazo (neutro, sem culpa) */
export const deadlineInfo = (deadline: string | undefined, today: string) => {
  if (!deadline) return undefined;
  const left = daysBetween(today, deadline);
  if (left > 1) return { text: `faltam ${left} dias`, tone: left <= 7 ? 'soon' : 'calm' } as const;
  if (left === 1) return { text: 'prazo amanhã', tone: 'soon' } as const;
  if (left === 0) return { text: 'prazo hoje', tone: 'soon' } as const;
  return { text: `prazo passou há ${-left} dia${-left > 1 ? 's' : ''}`, tone: 'past' } as const;
};

/** Minutos em texto curto: 50 min, 1h40, 3h */
export const fmtMinutes = (min: number) => {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${String(m).padStart(2, '0')}` : `${h}h`;
};

/** Meta efetiva da semana: em semana pesada, a meta cai pela metade (sem cobrança) */
export const effectiveGoal = (p: Pick<PersonalProject, 'weeklyPomodoros'>, heavyWeek: boolean) =>
  heavyWeek ? Math.max(1, Math.ceil(p.weeklyPomodoros / 2)) : p.weeklyPomodoros;

/** Divide o texto colado em itens (um por linha, sem marcadores) */
export const splitLines = (raw: string) =>
  raw
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*(?:[-•*·]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);

/** Anel de progresso (SVG) */
export const ProgressRing: React.FC<{ value: number; max: number; color: string; size?: number; stroke?: number; children?: React.ReactNode }> = ({
  value,
  max,
  color,
  size = 56,
  stroke = 6,
  children,
}) => {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-slate-100 dark:stroke-slate-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
};
