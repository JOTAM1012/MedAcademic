import React, { useState } from 'react';
import { X, Plus, BookOpen, Sparkles } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AddSubjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddSubjectModal: React.FC<AddSubjectModalProps> = ({ isOpen, onClose }) => {
  const { currentSemester, addSubject, addXp, triggerConfetti } = useApp();

  const [name, setName] = useState('');
  const [professor, setProfessor] = useState('');
  const [color, setColor] = useState('#0284c7');
  const [workloadHours, setWorkloadHours] = useState(80);
  const [targetGrade, setTargetGrade] = useState(7.0);

  if (!isOpen) return null;

  const colorPalette = [
    '#0284c7', // Sky
    '#e11d48', // Rose
    '#10b981', // Emerald
    '#8b5cf6', // Purple
    '#f59e0b', // Amber
    '#06b6d4', // Cyan
    '#4f46e5', // Indigo
    '#ec4899', // Pink
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !currentSemester) return;

    addSubject({
      semesterId: currentSemester.id,
      name: name.trim(),
      code: 'MED-' + Math.floor(100 + Math.random() * 900),
      professor: professor.trim() || 'Docente Responsável',
      color,
      workloadHours: Number(workloadHours) || 60,
      targetGrade: Number(targetGrade) || 7.0,
    });

    addXp(50, 'Nova Disciplina Cadastrada');
    triggerConfetti();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Nova Matéria / Disciplina
              </h2>
              <p className="text-xs text-slate-500">Semestre: {currentSemester?.name}</p>
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
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Nome da Disciplina
            </label>
            <input
              type="text"
              placeholder="Ex: Neurologia Clínica, Farmacologia II..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Carga Horária (h)
              </label>
              <input
                type="number"
                value={workloadHours}
                onChange={(e) => setWorkloadHours(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Docente / Preceptor
              </label>
              <input
                type="text"
                placeholder="Ex: Dr. Carlos"
                value={professor}
                onChange={(e) => setProfessor(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Cor de Identificação
            </label>
            <div className="flex items-center gap-2">
              {colorPalette.map((c) => (
                <button
                  type="button"
                  key={c}
                  onClick={() => setColor(c)}
                  className={`h-7 w-7 rounded-full transition-transform ${
                    color === c ? 'scale-125 ring-2 ring-slate-900 dark:ring-white' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
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
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs"
            >
              Criar Matéria
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
