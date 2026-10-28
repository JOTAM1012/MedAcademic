import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  RotateCcw,
  PhoneOff,
  Smartphone,
  Coffee,
  Plus,
  Trash2,
  BookOpen,
  ChevronRight,
} from 'lucide-react';
import { Subject } from '../../types';
import { StudyCycleStep } from '../../context/AppContext';

interface StudyCycleModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjects: Subject[];
  defaultSubjectId?: string;
  /** Starts the given steps in sequence, beginning at startIndex */
  onStartCycle: (steps: StudyCycleStep[], startIndex: number, subjectId?: string) => void;
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
    description: "Estude de maneira focada durante 60 minutos e, em seguida, faça uma pausa ativa de 10 minutos (ex.: ir ao banheiro, beber uma água).",
    phoneAllowed: false,
    phoneNote: "Nessa pausa ativa, você NÃO deve usar o celular.",
  },
  {
    id: '2',
    tag: "45' - 15'",
    workMins: 45,
    breakMins: 15,
    title: "2ª Etapa: Foco Intermediário",
    description: "Estude de maneira focada durante 45 minutos e, depois, faça uma pausa de 15 minutos.",
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

const toRunStep = (s: CustomCycleStep): StudyCycleStep => ({
  title: s.title,
  workMins: s.workMins,
  breakMins: s.breakMins,
  phoneAllowed: s.phoneAllowed,
});

const formatTotal = (mins: number) => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `${h}h${m > 0 ? String(m).padStart(2, '0') : ''}` : `${m} min`;
};

export const StudyCycleModal: React.FC<StudyCycleModalProps> = ({
  isOpen,
  onClose,
  subjects,
  defaultSubjectId,
  onStartCycle,
}) => {
  const [customSteps, setCustomSteps] = useState<CustomCycleStep[]>(() => {
    try {
      const saved = localStorage.getItem('medacademic_custom_cycles_v1');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [];
  });

  const [subjectId, setSubjectId] = useState<string>(defaultSubjectId || '');
  const [isCreating, setIsCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newWorkMins, setNewWorkMins] = useState(45);
  const [newBreakMins, setNewBreakMins] = useState(10);
  const [newDescription, setNewDescription] = useState('');
  const [newPhoneAllowed, setNewPhoneAllowed] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('medacademic_custom_cycles_v1', JSON.stringify(customSteps));
    } catch {}
  }, [customSteps]);

  // Keep the subject in sync with the timer screen each time the modal opens
  useEffect(() => {
    if (isOpen) setSubjectId(defaultSubjectId || subjects[0]?.id || '');
  }, [isOpen]);

  if (!isOpen) return null;

  const defaultTotal = DEFAULT_STUDY_CYCLE_STEPS.reduce(
    (acc, s, i) => acc + s.workMins + (i < DEFAULT_STUDY_CYCLE_STEPS.length - 1 ? s.breakMins : 0),
    0
  );

  const start = (steps: CustomCycleStep[], startIndex: number) => {
    onStartCycle(steps.map(toRunStep), startIndex, subjectId || undefined);
    onClose();
  };

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
      phoneNote: newPhoneAllowed ? 'Celular permitido nesta pausa.' : 'Sem o uso do celular.',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-3xl border border-amber-500/30 bg-slate-900 p-5 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto text-slate-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <RotateCcw className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white tracking-tight">Ciclos de Estudo</h2>
              <p className="text-xs text-slate-400">
                Estudo e pausas encadeados automaticamente — você só escolhe por onde começar.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 1. Subject */}
        <section className="space-y-2">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">1. Matéria em foco</h3>
          <div className="relative">
            <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <select
              id="cycle-subject-select"
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-amber-500"
            >
              {subjects.length === 0 && <option value="">Estudo geral (nenhuma matéria cadastrada)</option>}
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </section>

        {/* 2. Default cycle */}
        <section className="space-y-3">
          <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">
            2. Ciclo padrão · {DEFAULT_STUDY_CYCLE_STEPS.length} etapas · {formatTotal(defaultTotal)}
          </h3>

          <div className="rounded-2xl border border-amber-500/30 bg-slate-950/80 p-4 space-y-4">
            {/* Timeline */}
            <div className="flex items-center flex-wrap gap-1.5">
              {DEFAULT_STUDY_CYCLE_STEPS.map((step, i) => (
                <React.Fragment key={step.id}>
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500 text-slate-950 text-[11px] font-black">
                    {step.workMins}' estudo
                  </span>
                  {step.breakMins > 0 && i < DEFAULT_STUDY_CYCLE_STEPS.length - 1 && (
                    <>
                      <ChevronRight className="h-3 w-3 text-slate-600" />
                      <span
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border flex items-center gap-1 ${
                          step.phoneAllowed
                            ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                        title={step.phoneNote}
                      >
                        <Coffee className="h-3 w-3" />
                        {step.breakMins}'
                        {step.phoneAllowed ? <Smartphone className="h-3 w-3" /> : <PhoneOff className="h-3 w-3" />}
                      </span>
                    </>
                  )}
                  {i < DEFAULT_STUDY_CYCLE_STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-slate-600" />}
                </React.Fragment>
              ))}
            </div>

            <button
              type="button"
              id="cycle-start-full-btn"
              onClick={() => start(DEFAULT_STUDY_CYCLE_STEPS, 0)}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm shadow-lg transition-all cursor-pointer"
            >
              <Play className="h-4 w-4 fill-slate-950" />
              <span>Iniciar ciclo completo</span>
            </button>

            {/* Steps: start from any point */}
            <div className="divide-y divide-slate-800/80">
              {DEFAULT_STUDY_CYCLE_STEPS.map((step, i) => (
                <div key={step.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 w-16 text-center py-1 rounded-lg bg-amber-500/15 text-amber-300 text-[11px] font-black">
                      {step.tag}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{step.title}</p>
                      <p className="text-[11px] text-slate-400 truncate" title={step.description}>
                        {step.phoneNote}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => start(DEFAULT_STUDY_CYCLE_STEPS, i)}
                    className="shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-500/40 text-amber-300 hover:bg-amber-500/10 text-[11px] font-bold transition-colors cursor-pointer"
                  >
                    <Play className="h-3 w-3" />
                    {i === 0 ? 'Começar' : 'Começar daqui'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Custom cycles */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-wider">3. Meus ciclos personalizados</h3>
            <button
              type="button"
              onClick={() => setIsCreating(!isCreating)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-bold text-white transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 text-amber-400" />
              {isCreating ? 'Cancelar' : 'Criar ciclo'}
            </button>
          </div>

          {isCreating && (
            <form onSubmit={handleAddCustomCycle} className="p-4 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-3 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Nome do ciclo</label>
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
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estudo (min)</label>
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
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Pausa (min)</label>
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
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Celular na pausa</label>
                  <select
                    value={newPhoneAllowed ? 'true' : 'false'}
                    onChange={(e) => setNewPhoneAllowed(e.target.value === 'true')}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs font-bold text-white focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="false">Proibido</option>
                    <option value="true">Permitido</option>
                  </select>
                </div>
                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">Descrição (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: Bloco intensivo de questões de bancas passadas."
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all cursor-pointer shadow-md"
                >
                  Salvar ciclo
                </button>
              </div>
            </form>
          )}

          {customSteps.length === 0 && !isCreating ? (
            <p className="text-xs text-slate-500 px-1">Nenhum ciclo personalizado ainda.</p>
          ) : (
            <div className="space-y-2">
              {customSteps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-950/60"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="shrink-0 w-16 text-center py-1 rounded-lg bg-amber-500/15 text-amber-300 text-[11px] font-black">
                      {step.tag}
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{step.title}</p>
                      <p className="text-[11px] text-slate-400 truncate">{step.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleDeleteCustom(step.id)}
                      className="p-2 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="Excluir ciclo"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => start([step], 0)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black transition-colors cursor-pointer"
                    >
                      <Play className="h-3 w-3 fill-slate-950" />
                      Iniciar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
};
