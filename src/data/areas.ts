// Grandes áreas do internato / residência. Cada disciplina pertence a uma delas e herda a sua cor.
export interface MedicalArea {
  id: string; // stored in Subject.majorArea
  short: string; // sigla exibida no ícone da disciplina
  color: string;
}

export const MEDICAL_AREAS: MedicalArea[] = [
  { id: 'Clínica Médica', short: 'CM', color: '#2563eb' },
  { id: 'Cirurgia', short: 'CIR', color: '#059669' },
  { id: 'Pediatria', short: 'PED', color: '#f59e0b' },
  { id: 'Ginecologia', short: 'GIN', color: '#9333ea' },
  { id: 'Obstetrícia', short: 'OBS', color: '#db2777' },
  { id: 'Preventiva', short: 'PREV', color: '#0d9488' },
];

export const OTHER_AREA: MedicalArea = { id: 'Outras', short: '—', color: '#64748b' };

const normalize = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// Maps older/free-text values (e.g. "Cirurgia Geral", "Medicina Preventiva & SUS") to one of the 6 areas
export const getMedicalArea = (majorArea?: string): MedicalArea => {
  if (!majorArea) return OTHER_AREA;
  const value = normalize(majorArea);
  const exact = MEDICAL_AREAS.find((a) => normalize(a.id) === value);
  if (exact) return exact;
  if (value.includes('obstet')) return MEDICAL_AREAS[4];
  if (value.includes('gineco')) return MEDICAL_AREAS[3];
  if (value.includes('pediat') || value.includes('neonat')) return MEDICAL_AREAS[2];
  if (value.includes('cirurg')) return MEDICAL_AREAS[1];
  if (value.includes('prevent') || value.includes('sus') || value.includes('saude publica')) return MEDICAL_AREAS[5];
  if (value.includes('clinica')) return MEDICAL_AREAS[0];
  return OTHER_AREA;
};

// Especialidades da Clínica Médica: usadas para classificar os assuntos dessas disciplinas
export interface Specialty {
  id: string;
  emoji: string;
  color: string;
}

export const CLINICA_MEDICA_SPECIALTIES: Specialty[] = [
  { id: 'Cardiologia', emoji: '❤️', color: '#e11d48' },
  { id: 'Dermatologia', emoji: '🧴', color: '#d97706' },
  { id: 'Endocrinologia', emoji: '🦋', color: '#7c3aed' },
  { id: 'Gastroenterologia', emoji: '🍽️', color: '#ca8a04' },
  { id: 'Hematologia', emoji: '🩸', color: '#b91c1c' },
  { id: 'Hepatologia', emoji: '🧪', color: '#a16207' },
  { id: 'Infectologia', emoji: '🦠', color: '#16a34a' },
  { id: 'Nefrologia', emoji: '💧', color: '#0284c7' },
  { id: 'Neurologia', emoji: '🧠', color: '#9333ea' },
  { id: 'Pneumologia', emoji: '🫁', color: '#0891b2' },
  { id: 'Psiquiatria', emoji: '💭', color: '#db2777' },
  { id: 'Reumatologia', emoji: '🦴', color: '#64748b' },
  { id: 'Oftalmologia', emoji: '👁️', color: '#0d9488' },
];

export const getSpecialty = (id?: string) => CLINICA_MEDICA_SPECIALTIES.find((s) => s.id === id);

export const isClinicaMedica = (majorArea?: string) => getMedicalArea(majorArea).id === MEDICAL_AREAS[0].id;

// Sugestões de blocos ao criar a estrutura de uma especialidade
export const SPECIALTY_BLOCK_SUGGESTIONS: Record<string, string[]> = {
  Cardiologia: ['Insuficiência cardíaca', 'Síndrome coronariana', 'Arritmias', 'Hipertensão', 'Valvopatias', 'ECG'],
  Dermatologia: ['Lesões elementares', 'Infecções de pele', 'Câncer de pele', 'Dermatoses inflamatórias'],
  Endocrinologia: ['Diabetes', 'Tireoide', 'Adrenal', 'Hipófise', 'Obesidade', 'Dislipidemia'],
  Gastroenterologia: ['Esôfago e estômago', 'Intestino', 'Pâncreas', 'Hemorragia digestiva'],
  Hematologia: ['Anemias', 'Leucemias', 'Linfomas', 'Coagulação'],
  Hepatologia: ['Hepatites', 'Cirrose', 'Doenças biliares', 'Insuficiência hepática'],
  Infectologia: ['HIV', 'Tuberculose', 'Arboviroses', 'Antibioticoterapia', 'Sepse'],
  Nefrologia: ['Lesão renal aguda', 'Doença renal crônica', 'Distúrbios hidroeletrolíticos', 'Glomerulopatias'],
  Neurologia: ['AVC', 'Cefaleias', 'Epilepsia', 'Demências', 'Doenças desmielinizantes'],
  Pneumologia: ['Asma', 'DPOC', 'Pneumonias', 'TEP', 'Doenças intersticiais'],
  Psiquiatria: ['Depressão', 'Ansiedade', 'Psicoses', 'Transtorno bipolar', 'Dependência química'],
  Reumatologia: ['Artrite reumatoide', 'Lúpus', 'Espondiloartrites', 'Vasculites', 'Gota'],
  Oftalmologia: ['Olho vermelho', 'Glaucoma', 'Retinopatias', 'Catarata'],
};
