import docMaleWhite from '../assets/images/doc_male_white_1787501957110.jpg';
import docMaleBrown from '../assets/images/doc_male_brown_1787501974297.jpg';
import docFemWhite from '../assets/images/doc_fem_white_1787501989649.jpg';
import docFemBrown from '../assets/images/doc_fem_brown_1787502005207.jpg';

export interface DoctorAvatar {
  id: string;
  label: string;
  sublabel: string;
  gender: 'male' | 'female';
  tone: 'white' | 'brown';
  url: string;
}

export const CARTOON_AVATARS: DoctorAvatar[] = [
  {
    id: 'avatar-doc-male-white',
    label: 'Médico Branco',
    sublabel: 'Homem',
    gender: 'male',
    tone: 'white',
    url: docMaleWhite,
  },
  {
    id: 'avatar-doc-male-brown',
    label: 'Médico Moreno',
    sublabel: 'Homem',
    gender: 'male',
    tone: 'brown',
    url: docMaleBrown,
  },
  {
    id: 'avatar-doc-fem-white',
    label: 'Médica Branca',
    sublabel: 'Mulher',
    gender: 'female',
    tone: 'white',
    url: docFemWhite,
  },
  {
    id: 'avatar-doc-fem-brown',
    label: 'Médica Morena',
    sublabel: 'Mulher',
    gender: 'female',
    tone: 'brown',
    url: docFemBrown,
  },
];
