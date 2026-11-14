import { confirmDialog } from '../shared/ConfirmDialog';
import React, { useState, useEffect } from 'react';
import { X, BookOpen, Trash2, GraduationCap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Subject } from '../../types';
import { AreaPicker } from '../AreaPicker';
import { getMedicalArea, getSpecialty, isClinicaMedica, OTHER_AREA } from '../../data/areas';
import { SpecialtyPicker } from '../SpecialtyPicker';
import { CycleSubjectForm } from './CycleSubjectForm';
import { cycleOfSemester, getSubjectFormat } from '../../data/subjectFormats';
import type { SubjectFormat, SubjectOrganization } from '../../types';

const SUBJECT_COLORS = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981', '#14b8a6', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f43f5e', '#64748b'];

interface EditSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  subject: Subject | null;
}


export const EditSubjectModal: React.FC<EditSubjectModalProps> = ({
  isOpen,
  onClose,
  subject,
}) => {
  const { currentSemester, updateSubject, deleteSubject, showNotification, topicBlocks, convertChecklistToBlocks } = useApp();

  const [name, setName] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [specialty, setSpecialty] = useState('');
  const [format, setFormat] = useState<SubjectFormat | null>(null);
  const [organization, setOrganization] = useState<SubjectOrganization>('blocos');
  const [customColor, setCustomColor] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (subject) {
      setCustomColor(subject.customColor);
      setFormat(subject.format || 'personalizada');
      setOrganization(subject.organization || 'blocos');
      setName(subject.universitySubject || subject.name || '');
      const current = getMedicalArea(subject.majorArea);
      setArea(current.id === OTHER_AREA.id ? null : current.id);
      setSpecialty(subject.specialty || '');
    }
  }, [subject]);

  if (!isOpen || !subject) return null;
  const cycle = cycleOfSemester(currentSemester);
  const isCycleMode = cycle !== 'internato';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isCycleMode) {
      if (!name.trim() || !format) return;
      const f = getSubjectFormat(format);
      const prevOrg = subject.organization || 'blocos';
      const changes: Partial<Subject> = {
        name: name.trim(),
        universitySubject: name.trim(),
        format,
        organization,
        color: customColor || f.color,
        customColor,
        code: f.label.slice(0, 3).toUpperCase(),
      };
      if (prevOrg === 'checklist' && organization === 'blocos') convertChecklistToBlocks(subject.id);
      if (prevOrg === 'blocos' && organization === 'checklist') {
        // os blocos viram as matérias do checklist (os tópicos continuam nos mesmos grupos)
        changes.checklistModules = topicBlocks.filter((b) => b.subjectId === subject.id).map((b) => b.name);
      }
      updateSubject(subject.id, changes);
      onClose();
      return;
    }
    if (!name.trim() || !area) return;
    const areaInfo = getMedicalArea(area);

    updateSubject(subject.id, {
      name: name.trim(),
      universitySubject: name.trim(),
      majorArea: area,
      specialty: isClinicaMedica(area) ? getSpecialty(specialty)?.id : undefined,
      code: areaInfo.short,
      color: customColor || areaInfo.color,
      customColor,
    });

    showNotification('Disciplina atualizada com sucesso!', 'success');
    onClose();
  };

  const handleDelete = async () => {
    if (
      await confirmDialog({
        title: `Excluir "${subject.universitySubject || subject.name}"?`,
        message: 'A disciplina e os assuntos dela saem do semestre.',
        confirmLabel: 'Excluir disciplina',
      })
    ) {
      deleteSubject(subject.id);
      onClose();
    }
  };

  return (
    <div role="dialog" aria-modal="true" className="app-modal fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="app-modal-panel relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Editar Disciplina da Faculdade
              </h2>
              <p className="text-xs text-slate-500">Altere o nome e configurações da disciplina</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Active Semester Pill */}
          <div className="p-3 rounded-2xl bg-sky-50/70 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-sky-600 dark:text-sky-400 shrink-0" />
              <div>
                <div className="text-[10px] font-bold text-sky-900 dark:text-sky-300 uppercase tracking-wider">
                  Semestre Vinculado
                </div>
                <div className="text-xs font-black text-sky-700 dark:text-sky-200">
                  {currentSemester?.name || 'Semestre Vigente'}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-200/80 dark:bg-sky-900 text-sky-800 dark:text-sky-200">
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
            />
          ) : (
          <>
          {/* Discipline Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nome da Disciplina da Faculdade
            </label>
            <input
              type="text"
              placeholder="Ex: Habilidades Médicas IV, Clínica Médica, Pediatria..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 font-medium"
              required
              autoFocus
            />
          </div>

          {/* Grande Área (define grupo e cor) */}
          <AreaPicker value={area} onChange={setArea} />
          {isClinicaMedica(area || undefined) && <SpecialtyPicker value={specialty} onChange={setSpecialty} />}

          </>
          )}

          {/* Cor: para organizar do seu jeito (ex.: Simulação realística com a cor da Pediatria) */}
          <div>
            <p className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">Cor</p>
            <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label="Cor da disciplina">
              <button
                type="button"
                id="edit-subject-color-auto"
                role="radio"
                aria-checked={!customColor}
                onClick={() => setCustomColor(undefined)}
                className={`h-8 px-3 rounded-full border text-[11px] font-bold transition-colors ${
                  !customColor ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-sky-400'
                }`}
              >
                Automática
              </button>
              {SUBJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  id={`edit-subject-color-${c.slice(1)}`}
                  role="radio"
                  aria-checked={customColor === c}
                  aria-label={`Cor ${c}`}
                  onClick={() => setCustomColor(c)}
                  className={`h-8 w-8 rounded-full transition-transform hover:scale-110 ${customColor === c ? 'ring-2 ring-offset-2 ring-sky-500 ring-offset-white dark:ring-offset-slate-900' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">"Automática" usa a cor do tipo ou da grande área.</p>
          </div>

          <div className="pt-3 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={handleDelete}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Excluir</span>
            </button>

            <div className="app-modal-footer flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={!name.trim() || (isCycleMode ? !format : !area)}
                title={!area ? 'Escolha a grande área' : undefined}
                className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs shadow-xs"
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
