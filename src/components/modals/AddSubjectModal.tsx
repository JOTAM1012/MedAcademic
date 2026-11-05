import React, { useState } from 'react';
import { X, BookOpen, GraduationCap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AreaPicker } from '../AreaPicker';
import { SpecialtyPicker } from '../SpecialtyPicker';
import { getMedicalArea, getSpecialty, isClinicaMedica } from '../../data/areas';
import { CycleSubjectForm } from './CycleSubjectForm';
import { cycleOfSemester, getSubjectFormat } from '../../data/subjectFormats';
import type { SubjectFormat, SubjectOrganization } from '../../types';

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 font-medium';
const labelCls = 'block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1';

export const AddSubjectModal: React.FC<AddSubjectModalProps> = ({ isOpen, onClose }) => {
  const { currentSemester, addSubject, addXp, triggerConfetti } = useApp();

  const [name, setName] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState('');
  // Básico/Clínico
  const [format, setFormat] = useState<SubjectFormat | null>(null);
  const [organization, setOrganization] = useState<SubjectOrganization>('checklist');
  const [tutorialCount, setTutorialCount] = useState(5);

  if (!isOpen) return null;
  const cycle = cycleOfSemester(currentSemester);
  const isCycleMode = cycle !== 'internato';

  const isCM = isClinicaMedica(area || undefined);
  const areaInfo = area ? getMedicalArea(area) : null;

  const reset = () => {
    setName('');
    setArea(null);
    setSpecialty('');
    setFormat(null);
    setOrganization('checklist');
    setTutorialCount(5);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleAreaChange = (next: string) => {
    setArea(next);
    if (!isClinicaMedica(next)) {
      // Nome que veio de uma especialidade não faz sentido em outra área
      if (specialty && name === specialty) setName('');
      setSpecialty('');
    }
  };

  // Preenche o nome com a especialidade enquanto o usuário não tiver digitado outro
  const handleSpecialtyChange = (next: string) => {
    if (!name.trim() || name === specialty) setName(next);
    setSpecialty(next);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCycleMode) {
      if (!name.trim() || !format) return;
      const f = getSubjectFormat(format);
      addSubject({
        name: name.trim(),
        universitySubject: name.trim(),
        code: f.label.slice(0, 3).toUpperCase(),
        color: f.color,
        format,
        organization,
        checklistModules: [],
        tutorials:
          format === 'tutoria' && organization === 'checklist'
            ? Array.from({ length: tutorialCount }, (_, i) => ({ id: `tut-${Date.now()}-${i}`, name: `Tutoria ${i + 1}` }))
            : undefined,
        targetGrade: 7.0,
        semesterId: currentSemester?.id,
      });
      addXp(50, 'Nova Disciplina Cadastrada');
      triggerConfetti();
      handleClose();
      return;
    }
    if (!name.trim() || !area || !areaInfo) return;
    const sp = isCM ? getSpecialty(specialty) : undefined;

    addSubject({
      name: name.trim(),
      code: areaInfo.short,
      color: areaInfo.color,
      majorArea: area,
      specialty: sp?.id,
      targetGrade: 7.0,
      semesterId: currentSemester?.id,
      universitySubject: name.trim(),
    });

    addXp(50, 'Nova Disciplina Cadastrada');
    triggerConfetti();
    handleClose();
  };

  return (
    <div className="app-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="app-modal-panel relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{isCycleMode ? "Novo componente do semestre" : "Nova Disciplina da Faculdade"}</h2>
              <p className="text-xs text-slate-500">
                {isCycleMode ? `${cycle === 'ciclo_basico' ? 'Ciclo Básico' : 'Ciclo Clínico'} · escolha o formato e como organizar` : 'Cadastre a disciplina da sua grade curricular'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Semestre vinculado */}
          <div className="px-3 py-2.5 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <GraduationCap className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider">Semestre Vinculado</div>
                <div className="text-xs font-black text-sky-700 dark:text-sky-200 truncate">{currentSemester?.name || 'Semestre Vigente'}</div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-200/80 dark:bg-sky-900 text-sky-800 dark:text-sky-200 shrink-0">
              {currentSemester?.code || 'Atual'}
            </span>
          </div>

          {isCycleMode ? (
            <CycleSubjectForm
              cycle={cycle}
              format={format}
              onFormat={setFormat}
              name={name}
              onName={setName}
              organization={organization}
              onOrganization={setOrganization}
              tutorialCount={tutorialCount}
              onTutorialCount={setTutorialCount}
            />
          ) : (
          <>
          {/* 1. Grande área (define grupo e cor) */}
          <AreaPicker value={area} onChange={handleAreaChange} label="1. Grande Área" />

          {/* 2. Especialidade (só Clínica Médica) */}
          {isCM && <SpecialtyPicker value={specialty} onChange={handleSpecialtyChange} />}

          {/* Nome da disciplina */}
          <div>
            <label className={labelCls} htmlFor="subject-name">
              {isCM ? '3. Nome da Disciplina' : '2. Nome da Disciplina'}
            </label>
            <div className="relative">
              {areaInfo && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: getSpecialty(specialty)?.color || areaInfo.color }} />
              )}
              <input
                id="subject-name"
                type="text"
                placeholder={isCM ? 'Ex: Cardiologia, Clínica Médica I...' : 'Ex: Neonatologia, Cirurgia do Trauma, Pré-natal...'}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={`${inputCls} ${areaInfo ? 'pl-8' : ''}`}
                required
              />
            </div>
          </div>
          </>
          )}

          <div className="app-modal-footer pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || (isCycleMode ? !format : !area)}
              title={
                isCycleMode
                  ? !format ? 'Escolha o formato' : !name.trim() ? 'Informe o nome' : undefined
                  : !area ? 'Escolha a grande área' : !name.trim() ? 'Informe o nome da disciplina' : undefined
              }
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs"
            >
              Criar Disciplina
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
