import React from 'react';
import type { Subject, Topic } from '../../types';
import { OTHER_AREA, getMedicalArea, getSpecialty } from '../../data/areas';
import { subjectFormatOf, subjectOrganization } from '../../data/subjectFormats';
import { isTopicPending, isTopicSeen } from '../../data/blockReview';

/** Tópico que conta no progresso (aula bônus fica de fora) */
export const countsInProgress = (t: Topic) => !t.bonus;

export interface TopicStats {
  total: number;
  seen: number;
  pending: number;
  pct: number;
}

/** Progresso de uma lista de tópicos, sem contar as aulas bônus */
export const topicStats = (list: Topic[]): TopicStats => {
  const counted = list.filter(countsInProgress);
  const seen = counted.filter(isTopicSeen).length;
  return {
    total: counted.length,
    seen,
    pending: counted.filter(isTopicPending).length,
    pct: counted.length ? Math.round((seen / counted.length) * 100) : 0,
  };
};

/** Módulo / matéria da faculdade (vazio quando é igual ao nome da disciplina) */
export const moduleOf = (s: Subject): string | null => {
  const m = (s.universitySubject || '').trim();
  return m && m.toLowerCase() !== s.name.trim().toLowerCase() ? m : null;
};

/** Nome da disciplina (o campo name; disciplinas antigas podem ter só universitySubject) */
export const subjectName = (s: Subject) => s.name || s.universitySubject || 'Disciplina';
/** Módulo da faculdade (não é disciplina de grande área) */
export const isModule = (s: Pick<Subject, 'kind'>) => s.kind === 'module';

export const hasArea = (s: Subject) => getMedicalArea(s.majorArea).id !== OTHER_AREA.id;

/** Cor de exibição: especialidade → grande área → formato → cor própria */
export const subjectColor = (s: Subject) => {
  const sp = getSpecialty(s.specialty);
  if (sp) return sp.color;
  const area = getMedicalArea(s.majorArea);
  if (area.id !== OTHER_AREA.id) return area.color;
  if (s.format) return subjectFormatOf(s).color;
  return s.color || OTHER_AREA.color;
};

export const Ring: React.FC<{ pct: number; color: string; size?: number }> = ({ pct, color, size = 40 }) => (
  <div
    className="shrink-0 rounded-full grid place-items-center"
    style={{ width: size, height: size, background: `conic-gradient(${color} ${pct * 3.6}deg, rgba(148,163,184,0.2) 0deg)` }}
    aria-label={`${pct}% concluído`}
  >
    <span
      className="rounded-full bg-white dark:bg-slate-900 grid place-items-center text-[10px] font-black text-slate-700 dark:text-slate-200"
      style={{ width: size - 7, height: size - 7 }}
    >
      {pct}%
    </span>
  </div>
);

export const Bar: React.FC<{ pct: number; color: string; className?: string }> = ({ pct, color, className = '' }) => (
  <div className={`h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden ${className}`}>
    <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
  </div>
);

/** Confirmação inline (sem window.confirm) */
export const InlineConfirm: React.FC<{ text: string; onYes: () => void; onNo: () => void; yesLabel?: string }> = ({ text, onYes, onNo, yesLabel = 'Excluir' }) => (
  <div className="flex items-center gap-2 flex-wrap rounded-xl bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-[11px] text-rose-800 dark:text-rose-200">
    <span className="flex-1 min-w-0 font-semibold">{text}</span>
    <button type="button" onClick={onNo} className="h-9 px-3 rounded-lg font-bold text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-900/60">
      Cancelar
    </button>
    <button type="button" onClick={onYes} className="h-9 px-3 rounded-lg font-bold bg-rose-600 hover:bg-rose-500 text-white">
      {yesLabel}
    </button>
  </div>
);

export const formatMin = (m: number) => {
  const h = Math.floor(m / 60);
  const r = Math.round(m % 60);
  if (h === 0) return `${r} min`;
  return r ? `${h}h${String(r).padStart(2, '0')}` : `${h}h`;
};

/** Linha de contexto: "Clínica Médica · ❤️ Cardiologia" ou "🧠 Tutoria · Blocos" */
export const subjectContext = (s: Subject) => {
  if (hasArea(s)) {
    const sp = getSpecialty(s.specialty);
    const area = getMedicalArea(s.majorArea).id;
    return sp ? `${area} · ${sp.emoji} ${sp.id}` : area;
  }
  const f = subjectFormatOf(s);
  const org = subjectOrganization(s);
  return `${f.emoji} ${f.label} · ${org === 'blocos' ? 'Blocos' : f.id === 'tutoria' ? 'Tutorias' : 'Checklist'}`;
};
