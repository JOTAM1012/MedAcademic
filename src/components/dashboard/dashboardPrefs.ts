// Cartões do Painel: ordem, visibilidade e padrão para quem nunca personalizou.
// As escolhas ficam em studyMethod.dashboard (nuvem) e valem para todos os semestres.
import type { DashboardPrefs, DashboardWidgetId } from '../../types';

export interface WidgetMeta {
  id: DashboardWidgetId;
  label: string;
  hint: string;
  /** Classes de largura no grid (1 coluna no celular, 2 no tablet, 3 no desktop) */
  span: string;
}

export const WIDGETS: Record<DashboardWidgetId, WidgetMeta> = {
  semester: { id: 'semester', label: 'Semestre', hint: 'Quanto do semestre já passou e o que tem hoje na grade', span: '' },
  plan: { id: 'plan', label: 'Plano de hoje', hint: 'O próximo passo do dia, com o botão Começar', span: '' },
  habits: { id: 'habits', label: 'Checklist do dia', hint: 'Os 7 hábitos do guia, tocáveis aqui', span: '' },
  progress: { id: 'progress', label: 'Progresso das disciplinas', hint: 'Por grande área ou por módulo, com cada disciplina dentro', span: 'md:col-span-2' },
  questions: { id: 'questions', label: 'Acertos em questões', hint: 'Questões e % de acerto por grande área ou módulo', span: '' },
  reviews: { id: 'reviews', label: 'Revisões', hint: 'O que vence hoje, atrasadas e o ponto fraco', span: '' },
  exams_upcoming: { id: 'exams_upcoming', label: 'Próximas provas', hint: 'Datas, dias que faltam e % dos assuntos', span: '' },
  study_time: { id: 'study_time', label: 'Constância da semana', hint: 'Dias com estudo e blocos de foco na semana', span: '' },
  grades_avg: { id: 'grades_avg', label: 'Média em provas', hint: 'Média das notas lançadas no período', span: '' },
  concursos: { id: 'concursos', label: 'Provas de concurso', hint: 'Sua evolução nas provas de concurso e residência', span: '' },
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
