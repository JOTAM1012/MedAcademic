import docMaleWhite from '../assets/images/avatars/doc-male-white.jpg';
import docMaleBlack from '../assets/images/avatars/doc-male-black.jpg';
import docFemBrunette from '../assets/images/avatars/doc-fem-brunette.jpg';
import docFemBlonde from '../assets/images/avatars/doc-fem-blonde.jpg';
import docFemBlack from '../assets/images/avatars/doc-fem-black.jpg';

export interface DoctorAvatar {
  id: string;
  label: string;
  sublabel: string;
  gender: 'male' | 'female';
  tone: 'white' | 'black';
  url: string;
}

export const CARTOON_AVATARS: DoctorAvatar[] = [
  { id: 'avatar-doc-male-white', label: 'Médico Branco', sublabel: 'Homem', gender: 'male', tone: 'white', url: docMaleWhite },
  { id: 'avatar-doc-male-brown', label: 'Médico Negro', sublabel: 'Homem', gender: 'male', tone: 'black', url: docMaleBlack },
  { id: 'avatar-doc-fem-white', label: 'Médica Morena', sublabel: 'Mulher', gender: 'female', tone: 'white', url: docFemBrunette },
  { id: 'avatar-doc-fem-blonde', label: 'Médica Loira', sublabel: 'Mulher', gender: 'female', tone: 'white', url: docFemBlonde },
  { id: 'avatar-doc-fem-brown', label: 'Médica Negra', sublabel: 'Mulher', gender: 'female', tone: 'black', url: docFemBlack },
];

// Avatares da versão anterior → novo avatar equivalente (as imagens antigas saíram do site)
const LEGACY: Array<[string, string]> = [
  ['doc_male_white', docMaleWhite],
  ['doc_male_brown', docMaleBlack],
  ['doc_fem_white', docFemBrunette],
  ['doc_fem_brown', docFemBlack],
];

/** Troca a URL de um avatar antigo pela do novo; fotos próprias ficam como estão */
export const upgradeAvatarUrl = (url?: string): string | undefined => {
  if (!url) return url;
  const hit = LEGACY.find(([key]) => url.includes(key));
  return hit ? hit[1] : url;
};
