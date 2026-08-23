import React, { useState } from 'react';
import { X, Clock, Settings, Check } from 'lucide-react';

interface PomodoroSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: {
    workMinutes: number;
    shortBreakMinutes: number;
    mediumBreakMinutes: number;
    longBreakMinutes: number;
  };
  onSave: (settings: {
    workMinutes: number;
    shortBreakMinutes: number;
    mediumBreakMinutes: number;
    longBreakMinutes: number;
  }) => void;
}

export const PomodoroSettingsModal: React.FC<PomodoroSettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSave,
}) => {
  const [workMins, setWorkMins] = useState(settings.workMinutes);
  const [shortMins, setShortMins] = useState(settings.shortBreakMinutes);
  const [mediumMins, setMediumMins] = useState(settings.mediumBreakMinutes);
  const [longMins, setLongMins] = useState(settings.longBreakMinutes);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      workMinutes: Number(workMins) || 25,
      shortBreakMinutes: Number(shortMins) || 5,
      mediumBreakMinutes: Number(mediumMins) || 10,
      longBreakMinutes: Number(longMins) || 15,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-700 bg-slate-900 p-6 sm:p-7 shadow-2xl text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-500/30">
              <Settings className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">
                Configurar Tempos
              </h2>
              <p className="text-xs text-slate-400">
                Personalize os minutos de foco e pausas.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Tempo de Pomodoro (Foco) - minutos
            </label>
            <input
              type="number"
              min={1}
              max={180}
              value={workMins}
              onChange={(e) => setWorkMins(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-bold text-white focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Pausa Curta - minutos
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={shortMins}
              onChange={(e) => setShortMins(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-bold text-white focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Pausa Média - minutos
            </label>
            <input
              type="number"
              min={1}
              max={60}
              value={mediumMins}
              onChange={(e) => setMediumMins(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-bold text-white focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Pausa Longa - minutos
            </label>
            <input
              type="number"
              min={1}
              max={120}
              value={longMins}
              onChange={(e) => setLongMins(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-bold text-white focus:outline-hidden focus:border-sky-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-black text-xs transition-all shadow-md cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>Salvar Alterações</span>
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
