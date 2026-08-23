import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  RotateCcw,
  Sparkles,
  PhoneOff,
  Smartphone,
  Clock,
  Check,
  Plus,
  Info,
  Trash2
} from 'lucide-react';

interface StudyCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectCycleStep: (workMins: number, breakMins: number, stepName: string) => void;
}

export interface CustomCycleStep {
  id: string;
  tag: string;
  workMins: number;
  breakMins: number;
  title: string;
  description: string;
  phoneAllowed: boolean;
  phoneNote: string;
  isCustom?: boolean;
}

export const DEFAULT_STUDY_CYCLE_STEPS: CustomCycleStep[] = [
  {
    id: '1',
    tag: "60' - 10'",
    workMins: 60,
    breakMins: 10,
    title: "1ª Etapa: Foco Total Inicial",
    description: "Inicialmente, estude de maneira focada durante 60 minutos e, em seguida, faça uma pausa ativa de 10 minutos (ex.: ir ao banheiro, beber uma água).",
    phoneAllowed: false,
    phoneNote: "Nessa pausa ativa, você NÃO deve usar o celular.",
  },
  {
    id: '2',
    tag: "45' - 15'",
    workMins: 45,
    breakMins: 15,
    title: "2ª Etapa: Foco Intermediário",
    description: "Depois, estude de maneira focada durante 45 minutos e, posteriormente, faça uma pausa de 15 minutos.",
    phoneAllowed: true,
    phoneNote: "Nessa pausa, você pode verificar o seu celular.",
  },
  {
    id: '3',
    tag: "30' - 10'",
    workMins: 30,
    breakMins: 10,
    title: "3ª Etapa: Consolidando o Estudo",
    description: "30 minutos de estudo e uma pausa de 10 minutos.",
    phoneAllowed: false,
    phoneNote: "Sem o uso do celular.",
  },
  {
    id: '4',
    tag: "30'",
    workMins: 30,
    breakMins: 0,
    title: "4ª Etapa: Bloco Final de Fechamento",
    description: "Por fim, faça um estudo focado por 30 minutos.",
    phoneAllowed: false,
    phoneNote: "Sem pausa intermediária.",
  },
];

export const StudyCycleModal: React.FC<StudyCycleModalProps> = ({
  isOpen,
  onClose,
  onSelectCycleStep,
}) => {
  const [customSteps, setCustomSteps] = useState<CustomCycleStep[]>(() => {
    const saved = localStorage.getItem('medacademic_custom_cycles_v1');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    return [];
  });

  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newWorkMins, setNewWorkMins] = useState(45);
  const [newBreakMins, setNewBreakMins] = useState(10);
  const [newDescription, setNewDescription] = useState('');
  const [newPhoneAllowed, setNewPhoneAllowed] = useState(false);
  const [newPhoneNote, setNewPhoneNote] = useState('Sem o uso do celular.');

  useEffect(() => {
    localStorage.setItem('medacademic_custom_cycles_v1', JSON.stringify(customSteps));
  }, [customSteps]);

  if (!isOpen) return null;

  const handleAddCustomCycle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    const tag = newBreakMins > 0 ? `${newWorkMins}' - ${newBreakMins}'` : `${newWorkMins}'`;
    const newStep: CustomCycleStep = {
      id: `custom-${Date.now()}`,
      tag,
      workMins: Number(newWorkMins),
      breakMins: Number(newBreakMins),
      title: newTitle.trim(),
      description: newDescription.trim() || `Sessão de ${newWorkMins} minutos de estudo focado com ${newBreakMins} minutos de pausa.`,
      phoneAllowed: newPhoneAllowed,
      phoneNote: newPhoneNote.trim() || (newPhoneAllowed ? 'Celular permitido nesta pausa.' : 'Sem o uso do celular.'),
      isCustom: true,
    };

    setCustomSteps([...customSteps, newStep]);
    setIsCreating(false);
    setNewTitle('');
    setNewWorkMins(45);
    setNewBreakMins(10);
    setNewDescription('');
  };

  const handleDeleteCustom = (id: string) => {
    setCustomSteps(customSteps.filter((s) => s.id !== id));
  };

  const allSteps = [...DEFAULT_STUDY_CYCLE_STEPS, ...customSteps];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-amber-500/30 bg-slate-900 p-6 sm:p-7 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-100">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <RotateCcw className="h-6 w-6" />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[10px] font-black uppercase tracking-wider mb-0.5 border border-amber-500/20">
                Guia de Produtividade Humana
              </div>
              <h2 className="text-xl font-black text-white tracking-tight">
                CICLOS DE ESTUDO
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Action bar inside modal */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-950/40 via-slate-900 to-amber-950/30 border border-amber-500/20 flex items-start gap-3 flex-1">
            <Info className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200/90 leading-relaxed font-medium">
              Alterne períodos de alta concentração com descansos estratégicos ou crie seus próprios ciclos personalizados.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCreating(!isCreating)}
            className="shrink-0 flex items-center gap-2 px-4 py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>{isCreating ? 'Ver Ciclos' : 'Criar Ciclo Personalizado'}</span>
          </button>
        </div>

        {/* Create Custom Cycle Form */}
        {isCreating && (
          <form onSubmit={handleAddCustomCycle} className="mt-5 p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-4 animate-in fade-in duration-200">
            <h3 className="text-sm font-black text-amber-400 uppercase tracking-wide">
              Novo Ciclo Personalizado
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Título da Etapa / Ciclo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Foco Cirúrgico Avançado"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Estudo (minutos)
                </label>
                <input
                  type="number"
                  min={1}
                  max={300}
                  required
                  value={newWorkMins}
                  onChange={(e) => setNewWorkMins(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Pausa (minutos)
                </label>
                <input
                  type="number"
                  min={0}
                  max={120}
                  required
                  value={newBreakMins}
                  onChange={(e) => setNewBreakMins(Number(e.target.value))}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Uso de Celular
                </label>
                <select
                  value={newPhoneAllowed ? 'true' : 'false'}
                  onChange={(e) => setNewPhoneAllowed(e.target.value === 'true')}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-amber-500"
                >
                  <option value="false">Proibido (Sem Celular)</option>
                  <option value="true">Permitido na Pausa</option>
                </select>
              </div>

              <div className="sm:col-span-3">
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Descrição (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Bloco intensivo focado em resoluções de bancas passadas."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md"
              >
                Salvar Ciclo Personalizado
              </button>
            </div>
          </form>
        )}

        {/* Table / Step Cards */}
        <div className="mt-5 space-y-3">
          {allSteps.map((step) => (
            <div
              key={step.id}
              className="group relative overflow-hidden rounded-2xl border border-amber-500/20 bg-slate-950/80 hover:bg-slate-950 hover:border-amber-500/50 transition-all p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
            >
              {/* Left Badge */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <div className="shrink-0 flex items-center justify-center min-w-[75px] h-12 px-3 rounded-xl bg-amber-500 text-slate-950 font-black text-sm tracking-tight shadow-md">
                  {step.tag}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-black text-white">
                      {step.title}
                    </h3>
                    
                    {step.isCustom && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase tracking-wider border border-amber-400/30">
                        Personalizado
                      </span>
                    )}

                    {/* Phone Rule Badge */}
                    {step.phoneAllowed ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <Smartphone className="h-3 w-3" /> Celular Permitido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <PhoneOff className="h-3 w-3" /> Sem Celular
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-normal">
                    {step.description}
                  </p>

                  <p className="text-[11px] font-semibold text-amber-400/90 italic">
                    {step.phoneNote}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                {step.isCustom && (
                  <button
                    type="button"
                    onClick={() => handleDeleteCustom(step.id)}
                    className="p-2.5 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Excluir ciclo"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onSelectCycleStep(step.workMins, step.breakMins, step.title);
                    onClose();
                  }}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer"
                >
                  <Play className="h-3.5 w-3.5 fill-slate-950" />
                  <span>Iniciar ({step.workMins}m)</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer Summary */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-4">
            <span> Total de Ciclos: <strong className="text-white">{allSteps.length}</strong></span>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelectCycleStep(DEFAULT_STUDY_CYCLE_STEPS[0].workMins, DEFAULT_STUDY_CYCLE_STEPS[0].breakMins, DEFAULT_STUDY_CYCLE_STEPS[0].title);
              onClose();
            }}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs shadow-lg transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Iniciar 1ª Etapa (60m)</span>
          </button>
        </div>

      </div>
    </div>
  );
};
