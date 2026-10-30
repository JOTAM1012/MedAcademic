import React, { useState } from 'react';
import { X, BookOpen, GraduationCap } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AreaPicker } from '../AreaPicker';
import { getMedicalArea } from '../../data/areas';

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}


export const AddSubjectModal: React.FC<AddSubjectModalProps> = ({ isOpen, onClose }) => {
  const { currentSemester, addSubject, addXp, triggerConfetti } = useApp();

  const [name, setName] = useState('');
  const [area, setArea] = useState<string | null>(null);
  const [targetGrade, setTargetGrade] = useState(7.0);
  const [workloadHours, setWorkloadHours] = useState<number | ''>('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !area) return;
    const areaInfo = getMedicalArea(area);

    addSubject({
      name: name.trim(),
      code: areaInfo.short,
      color: areaInfo.color,
      majorArea: area,
      targetGrade: Number(targetGrade) || 7.0,
      workloadHours: workloadHours ? Number(workloadHours) : undefined,
      semesterId: currentSemester?.id,
      universitySubject: name.trim(),
    });

    addXp(50, 'Nova Disciplina Cadastrada');
    triggerConfetti();
    setName('');
    setArea(null);
    setWorkloadHours('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Nova Disciplina da Faculdade
              </h2>
              <p className="text-xs text-slate-500">Cadastre a disciplina da sua grade curricular</p>
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

          {/* Discipline Name (Manual input) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nome da Disciplina da Faculdade
            </label>
            <input
              type="text"
              placeholder="Ex: Neonatologia, Cardiologia, Pré-natal..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 font-medium"
              required
              autoFocus
            />
          </div>

          {/* Grande Área (define grupo e cor) */}
          <AreaPicker value={area} onChange={setArea} />

          {/* Target Grade and Workload */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Meta de Média
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={targetGrade}
                onChange={(e) => setTargetGrade(parseFloat(e.target.value) || 7.0)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Carga Horária (h)
              </label>
              <input
                type="number"
                placeholder="Ex: 80"
                value={workloadHours}
                onChange={(e) => setWorkloadHours(parseInt(e.target.value) || '')}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!name.trim() || !area}
              title={!area ? 'Escolha a grande área' : undefined}
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
