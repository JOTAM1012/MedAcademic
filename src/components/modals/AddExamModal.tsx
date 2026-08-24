import React, { useState } from 'react';
import { X, GraduationCap, Calendar, Clock, MapPin, Award } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubjectId?: string;
}

const EXAM_FORMATS = [
  'Prova Teórica',
  'OSCE Prático',
  'Seminário / Caso Clínico',
  'Prática Ambulatorial',
  'Prova de Habilidades',
  'Substitutiva / Exame Final',
  'Trabalho Acadêmico',
];

export const AddExamModal: React.FC<AddExamModalProps> = ({
  isOpen,
  onClose,
  defaultSubjectId,
}) => {
  const { subjects, addExam, addXp, triggerConfetti, showNotification } = useApp();

  const [subjectId, setSubjectId] = useState(defaultSubjectId || subjects[0]?.id || '');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('08:00');
  const [weight, setWeight] = useState(1.0);
  const [type, setType] = useState(EXAM_FORMATS[0]);
  const [location, setLocation] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectId) {
      showNotification('Cadastre ao menos uma disciplina antes de agendar uma avaliação.', 'warning');
      return;
    }
    if (!title.trim() || !date) return;

    addExam({
      subjectId,
      title: title.trim(),
      date,
      time: time || undefined,
      weight: Number(weight) || 1.0,
      type,
      location: location.trim() || undefined,
    });

    addXp(40, 'Avaliação Agendada');
    triggerConfetti();
    showNotification('Avaliação agendada com sucesso e adicionada ao Calendário!', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Agendar Nova Avaliação / Prova
              </h2>
              <p className="text-xs text-slate-500">Adiciona ao cálculo de médias e ao Calendário</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {/* Disciplina */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Disciplina da Faculdade
            </label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
              required
            >
              {subjects.length === 0 ? (
                <option value="">(Nenhuma disciplina cadastrada)</option>
              ) : (
                subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.universitySubject || s.name}
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Título da Avaliação */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Título da Avaliação
            </label>
            <input
              type="text"
              placeholder="Ex: Prova Teórica 1 (P1), OSCE Prático, Seminário..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 font-medium"
              required
            />
          </div>

          {/* Formato da Prova */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Formato da Avaliação
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            >
              {EXAM_FORMATS.map((fmt) => (
                <option key={fmt} value={fmt}>
                  {fmt}
                </option>
              ))}
            </select>
          </div>

          {/* Data e Horário */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                Data da Prova
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 font-medium"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-slate-400" />
                Horário
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 font-medium"
              />
            </div>
          </div>

          {/* Peso e Local */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Award className="h-3.5 w-3.5 text-slate-400" />
                Peso na Média
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={weight}
                onChange={(e) => setWeight(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                Local / Sala (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Anfiteatro 1, Lab 3"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500 font-medium"
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
              className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs"
            >
              Agendar Avaliação
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
