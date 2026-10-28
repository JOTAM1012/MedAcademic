import React, { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { MedRevisionTopic } from '../../types';

interface AddMedRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MED_REVISION_CATEGORIES: MedRevisionTopic['category'][] = [
  'Clínica Médica',
  'Cirurgia Geral',
  'Pediatria',
  'Ginecologia & Obstetrícia',
  'Medicina Preventiva & SUS',
];

const PRIORITIES: MedRevisionTopic['highYieldLevel'][] = [
  '⭐⭐⭐ Extrema Prioridade',
  '⭐⭐ Alta Relevância',
  '⭐ Importante',
];

const inputClass =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:border-sky-500';
const labelClass = 'block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1';

export const AddMedRevisionModal: React.FC<AddMedRevisionModalProps> = ({ isOpen, onClose }) => {
  const { addMedRevision, addXp } = useApp();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<MedRevisionTopic['category']>('Clínica Médica');
  const [priority, setPriority] = useState<MedRevisionTopic['highYieldLevel']>('⭐⭐ Alta Relevância');
  const [pearls, setPearls] = useState('');
  const [guideline, setGuideline] = useState('');
  const [differentials, setDifferentials] = useState('');
  const [frequency, setFrequency] = useState('');

  if (!isOpen) return null;

  const reset = () => {
    setTitle('');
    setPearls('');
    setGuideline('');
    setDifferentials('');
    setFrequency('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    addMedRevision({
      title: title.trim(),
      category,
      highYieldLevel: priority,
      keyPearls: pearls
        .split('\n')
        .map((p) => p.trim())
        .filter(Boolean),
      guidelineSnippet: guideline.trim(),
      differentialDiagnosis: differentials
        .split(/[,;\n]/)
        .map((d) => d.trim())
        .filter(Boolean),
      revalidaFrequency: frequency.trim(),
      isCompleted: false,
    });
    addXp(30, 'Tema de Residência Cadastrado');
    reset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <form
        id="add-med-revision-form"
        onSubmit={handleSubmit}
        className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto space-y-4"
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white">Novo Tema de Revisão</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tópico de alto rendimento para Residência / Revalida.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div>
          <label className={labelClass}>
            Tema <span className="text-rose-500">*</span>
          </label>
          <input
            id="med-revision-title"
            type="text"
            required
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Síndrome Coronariana Aguda com Supra de ST"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Grande área</label>
            <select value={category} onChange={(e) => setCategory(e.target.value as MedRevisionTopic['category'])} className={inputClass}>
              {MED_REVISION_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Prioridade</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value as MedRevisionTopic['highYieldLevel'])} className={inputClass}>
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className={labelClass}>Pérolas de prova & conduta (uma por linha)</label>
          <textarea
            id="med-revision-pearls"
            rows={4}
            value={pearls}
            onChange={(e) => setPearls(e.target.value)}
            placeholder={'Ex: Tempo porta-balão < 90 min\nSupra em DII, DIII e aVF = parede inferior'}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>Referência / diretriz</label>
          <input
            type="text"
            value={guideline}
            onChange={(e) => setGuideline(e.target.value)}
            placeholder="Ex: Diretriz SBC de IAM com Supra de ST (2021)"
            className={inputClass}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>Diagnósticos diferenciais</label>
            <input
              type="text"
              value={differentials}
              onChange={(e) => setDifferentials(e.target.value)}
              placeholder="Separe por vírgula"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Frequência nas provas</label>
            <input
              type="text"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="Ex: Cai em quase toda prova"
              className={inputClass}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar Tema
          </button>
        </div>
      </form>
    </div>
  );
};
