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
