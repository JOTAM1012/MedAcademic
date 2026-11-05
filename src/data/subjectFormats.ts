// Disciplinas do Ciclo Básico e do Ciclo Clínico: organizadas pelo FORMATO do componente na faculdade
// (Tutoria, Aula, Morfo, Anatomia...), em vez da Grande Área usada no Internato.
import type { Semester, Subject, SubjectFormat, SubjectOrganization } from '../types';

export type CycleId = 'ciclo_basico' | 'ciclo_clinico' | 'internato';

export interface SubjectFormatInfo {
  id: SubjectFormat;
  label: string;
  hint: string;
  emoji: string;
  color: string;
  /** como se chama o agrupador (matéria) e o item (tópico) neste formato */
  group: string;
  groups: string;
  item: string;
  items: string;
  namePlaceholder: string;
  groupPlaceholder: string;
  itemPlaceholder: string;
  /** sequência rápida (ex.: Problema 1..8) */
  sequence?: { prefix: string; count: number };
}

export const SUBJECT_FORMATS: SubjectFormatInfo[] = [
  {
    id: 'tutoria',
    label: 'Tutoria',
    hint: 'PBL / APG / Sessão tutorial',
    emoji: '🧩',
    color: '#8b5cf6',
    group: 'Problema',
    groups: 'Problemas',
    item: 'Objetivo',
    items: 'objetivos',
    namePlaceholder: 'Ex: Imunologia',
    groupPlaceholder: 'Ex: Problema 1 – Dor no peito',
    itemPlaceholder: 'Ex: Explicar a fisiopatologia da aterosclerose',
    sequence: { prefix: 'Problema', count: 8 },
  },
  {
    id: 'aula',
    label: 'Aula / Teórica',
    hint: 'Aulas expositivas do módulo',
    emoji: '🎓',
    color: '#0ea5e9',
    group: 'Módulo',
    groups: 'Módulos',
    item: 'Tema',
    items: 'temas',
    namePlaceholder: 'Ex: Fisiologia Humana',
    groupPlaceholder: 'Ex: Fisiologia Renal',
    itemPlaceholder: 'Ex: Filtração glomerular',
    sequence: { prefix: 'Semana', count: 6 },
  },
  {
    id: 'morfo',
    label: 'Morfofuncional',
    hint: 'Laboratório morfofuncional',
    emoji: '🫀',
    color: '#ef4444',
    group: 'Sistema',
    groups: 'Sistemas',
    item: 'Conteúdo',
    items: 'conteúdos',
    namePlaceholder: 'Ex: Morfofuncional II',
    groupPlaceholder: 'Ex: Sistema Respiratório',
    itemPlaceholder: 'Ex: Histologia do epitélio respiratório',
  },
  {
    id: 'anatomia',
    label: 'Anatomia',
    hint: 'Peças, regiões e estruturas',
    emoji: '🦴',
    color: '#f59e0b',
    group: 'Região / Sistema',
    groups: 'Regiões',
    item: 'Estrutura',
    items: 'estruturas',
    namePlaceholder: 'Ex: Anatomia Humana I',
    groupPlaceholder: 'Ex: Membro superior',
    itemPlaceholder: 'Ex: Plexo braquial',
  },
  {
    id: 'habilidades',
    label: 'Habilidades / Prática',
    hint: 'Lab de habilidades, semiologia, ambulatório',
    emoji: '🩺',
    color: '#10b981',
    group: 'Prática / Estação',
    groups: 'Práticas',
    item: 'Procedimento',
    items: 'procedimentos',
    namePlaceholder: 'Ex: Habilidades Médicas III',
    groupPlaceholder: 'Ex: Exame físico do abdome',
    itemPlaceholder: 'Ex: Manobra de Blumberg',
  },
  {
    id: 'personalizada',
    label: 'Disciplina',
    hint: 'Escreva qual: Humanidades, Bioquímica, IESC...',
    emoji: '✏️',
    color: '#6366f1',
    group: 'Módulo',
    groups: 'Módulos',
    item: 'Tópico',
    items: 'tópicos',
    namePlaceholder: 'Ex: Humanidades Médicas',
    groupPlaceholder: 'Ex: Bioética',
    itemPlaceholder: 'Ex: Princípios da bioética',
  },
];

export const getSubjectFormat = (id?: string): SubjectFormatInfo =>
  SUBJECT_FORMATS.find((f) => f.id === id) || SUBJECT_FORMATS[SUBJECT_FORMATS.length - 1];

/** ordem dos formatos sugerida para cada ciclo */
export const FORMAT_ORDER: Record<'ciclo_basico' | 'ciclo_clinico', SubjectFormat[]> = {
  ciclo_basico: ['tutoria', 'morfo', 'anatomia', 'aula', 'habilidades', 'personalizada'],
  ciclo_clinico: ['tutoria', 'habilidades', 'aula', 'personalizada', 'morfo', 'anatomia'],
};

/** sugestões de nome para "Disciplina" personalizada */
export const DISCIPLINE_SUGGESTIONS: Record<'ciclo_basico' | 'ciclo_clinico', string[]> = {
  ciclo_basico: ['Bioquímica', 'Fisiologia', 'Histologia', 'Embriologia', 'Genética', 'Imunologia', 'Microbiologia', 'Farmacologia', 'Humanidades', 'IESC / Saúde Coletiva'],
  ciclo_clinico: ['Semiologia', 'Patologia', 'Farmacologia Clínica', 'Clínica Médica', 'Cirurgia', 'Pediatria', 'Ginecologia e Obstetrícia', 'Psiquiatria', 'Saúde Coletiva', 'Bioética'],
};

export const CYCLE_INFO: Record<CycleId, { label: string; color: string }> = {
  ciclo_basico: { label: 'Ciclo Básico', color: '#10b981' },
  ciclo_clinico: { label: 'Ciclo Clínico', color: '#0ea5e9' },
  internato: { label: 'Internato', color: '#8b5cf6' },
};

/** Ciclo pelo número do semestre: 1º–4º Básico, 5º–8º Clínico, 9º–12º Internato */
export const cycleOfSemester = (sem?: Pick<Semester, 'name'> | null): CycleId => {
  const name = sem?.name || '';
  const n = Number(name.match(/^\s*(\d{1,2})/)?.[1]);
  if (n >= 1 && n <= 4) return 'ciclo_basico';
  if (n >= 5 && n <= 8) return 'ciclo_clinico';
  if (n >= 9) return 'internato';
  if (/b[aá]sico/i.test(name)) return 'ciclo_basico';
  if (/cl[ií]nico/i.test(name)) return 'ciclo_clinico';
  return 'internato'; // sem número: mantém o modelo atual
};

/** Disciplina antiga (criada por Grande Área) vira "Disciplina · Por blocos" */
export const subjectOrganization = (s: Subject): SubjectOrganization => s.organization || 'blocos';
export const subjectFormatOf = (s: Subject): SubjectFormatInfo => getSubjectFormat(s.format);
