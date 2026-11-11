// Cartões do Painel: ordem, visibilidade e padrão para quem nunca personalizou.
// As escolhas ficam em studyMethod.dashboard (nuvem) e valem para todos os semestres.
import type { DashboardPrefs, DashboardWidgetId } from '../../types';

/**
 * Tamanho do bloco no grid "bento" (celular: sempre 1 coluna).
 * - hero: plano de hoje — 2 colunas no tablet; 2 colunas × 2 linhas no desktop
 * - wide: 2 colunas a partir do tablet (progresso, próximas provas, resumo da semana)
 * - tall: 1 coluna × 2 linhas a partir do tablet (listas longas, como o checklist)
 * - stat: bloco pequeno, quase quadrado, com um número grande
 */
export type BentoSize = 'hero' | 'wide' | 'tall' | 'stat';

export const BENTO_SPAN: Record<BentoSize, string> = {
  hero: 'md:col-span-2 xl:row-span-2',
  wide: 'md:col-span-2',
  tall: 'md:row-span-2',
  stat: '',
};

export interface WidgetMeta {
  id: DashboardWidgetId;
  label: string;
  hint: string;
  /** Tamanho no grid bento */
  size: BentoSize;
  /** Classes de largura/altura no grid (derivadas de `size`) */
  span: string;
}

const meta = (id: DashboardWidgetId, label: string, hint: string, size: BentoSize): WidgetMeta => ({ id, label, hint, size, span: BENTO_SPAN[size] });

export const WIDGETS: Record<DashboardWidgetId, WidgetMeta> = {
  semester: meta('semester', 'Semestre', 'Quanto do semestre já passou e o que tem hoje na grade', 'stat'),
  plan: meta('plan', 'Plano de hoje', 'O próximo passo do dia, com o botão Começar', 'hero'),
  habits: meta('habits', 'Checklist do dia', 'Os 7 hábitos do guia, tocáveis aqui', 'tall'),
  progress: meta('progress', 'Progresso das disciplinas', 'Por grande área ou por módulo, com cada disciplina dentro', 'wide'),
  questions: meta('questions', 'Acertos em questões', 'Questões e % de acerto por grande área ou módulo', 'stat'),
  reviews: meta('reviews', 'Revisões', 'O que vence hoje, atrasadas e o ponto fraco', 'stat'),
  exams_upcoming: meta('exams_upcoming', 'Próximas provas', 'Datas, dias que faltam e % dos assuntos', 'wide'),
  study_time: meta('study_time', 'Constância da semana', 'Dias com estudo e blocos de foco na semana', 'stat'),
  grades_avg: meta('grades_avg', 'Média em provas', 'Média das notas lançadas no período', 'stat'),
  concursos: meta('concursos', 'Provas de concurso', 'Sua evolução nas provas de concurso e residência', 'stat'),
};

export const DEFAULT_WIDGETS: DashboardPrefs['widgets'] = [
  { id: 'semester', visible: true },
  { id: 'plan', visible: true },
  { id: 'habits', visible: true },
  { id: 'progress', visible: true },
  { id: 'questions', visible: true },
  { id: 'reviews', visible: true },
  { id: 'exams_upcoming', visible: true },
  { id: 'study_time', visible: false },
  { id: 'grades_avg', visible: false },
  { id: 'concursos', visible: true },
];

/** Lista salva + cartões novos (que ainda não estavam salvos) com o padrão, na posição do padrão */
export const resolveWidgets = (prefs?: DashboardPrefs): DashboardPrefs['widgets'] => {
  const saved = (prefs?.widgets || []).filter((w, i, arr) => !!WIDGETS[w.id] && arr.findIndex((x) => x.id === w.id) === i);
  if (!saved.length) return DEFAULT_WIDGETS.map((w) => ({ ...w }));
  const out = saved.map((w) => ({ id: w.id, visible: !!w.visible }));
  DEFAULT_WIDGETS.forEach((d, di) => {
    if (out.some((w) => w.id === d.id)) return;
    // entra logo depois do cartão que vem antes dele no padrão
    const prevIds = DEFAULT_WIDGETS.slice(0, di).map((x) => x.id);
    let at = -1;
    out.forEach((w, i) => {
      if (prevIds.includes(w.id)) at = i;
    });
    out.splice(at + 1, 0, { ...d });
  });
  return out;
};
