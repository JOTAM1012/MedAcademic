import React, { useState, useEffect } from 'react';
import { X, Plus, CalendarDays, BookOpen, Clock, MapPin, Tag, Check, Sparkles, Building2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AddScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultDay?: number; // 1-7
}

const DAYS_OF_WEEK = [
  { num: 1, short: 'Seg', full: 'Segunda-feira' },
  { num: 2, short: 'Ter', full: 'Terça-feira' },
  { num: 3, short: 'Qua', full: 'Quarta-feira' },
  { num: 4, short: 'Qui', full: 'Quinta-feira' },
  { num: 5, short: 'Sex', full: 'Sexta-feira' },
  { num: 6, short: 'Sáb', full: 'Sábado' },
  { num: 7, short: 'Dom', full: 'Domingo' },
];

const QUICK_PRESETS_COMMITMENT = [
  'Plantão 12h UPA / Hospital',
  'Grupo de Estudos ECG',
  'Simulado R1 / ENARE',
  'Atendimento Ambulatório',
  'Revisão Anki / Flashcards',
  'Academia / Atividade Física',
  'Reunião de Liga Acadêmica',
];

const COLOR_OPTIONS = [
  { hex: '#0284c7', label: 'Azul Sky' },
  { hex: '#059669', label: 'Verde Esmeralda' },
  { hex: '#7c3aed', label: 'Roxo Índigo' },
  { hex: '#d97706', label: 'Âmbar / Laranja' },
  { hex: '#e11d48', label: 'Vermelho / Rose' },
  { hex: '#0891b2', label: 'Ciano' },
];

export const AddScheduleModal: React.FC<AddScheduleModalProps> = ({ isOpen, onClose, defaultDay }) => {
  const { subjects, addScheduleClass, addXp, triggerConfetti, showNotification } = useApp();

  const [mode, setMode] = useState<'class' | 'commitment'>('class');
  const [selectedDays, setSelectedDays] = useState<number[]>([defaultDay || 1]);

  // Class fields
  const [subjectId, setSubjectId] = useState(subjects[0]?.id || '');
  const [classType, setClassType] = useState('Teórica');

  // Commitment fields
  const [title, setTitle] = useState('');
  const [commitmentCategory, setCommitmentCategory] = useState('Compromisso Pessoal');
  const [color, setColor] = useState('#0284c7');

  // Common fields
  const [startTime, setStartTime] = useState('08:00');
  const [endTime, setEndTime] = useState('10:00');
  const [room, setRoom] = useState('Anfiteatro 2');
  const [location, setLocation] = useState('Campus Central');
  const [notes, setNotes] = useState('');

  // Update selected days when modal opens or defaultDay changes
  useEffect(() => {
    if (isOpen) {
      if (defaultDay && defaultDay >= 1 && defaultDay <= 7) {
        setSelectedDays([defaultDay]);
      } else if (selectedDays.length === 0) {
        setSelectedDays([1]);
      }
      if (subjects.length > 0 && !subjectId) {
        setSubjectId(subjects[0].id);
      }
    }
  }, [isOpen, defaultDay, subjects]);

  if (!isOpen) return null;

  const toggleDay = (dayNum: number) => {
    if (selectedDays.includes(dayNum)) {
      if (selectedDays.length === 1) {
        showNotification('Selecione ao menos 1 dia da semana.', 'warning');
        return;
      }
      setSelectedDays(selectedDays.filter((d) => d !== dayNum));
    } else {
      setSelectedDays([...selectedDays, dayNum].sort((a, b) => a - b));
    }
  };

  const handleSelectPresetDays = (preset: 'weekdays' | 'weekend' | 'all') => {
    if (preset === 'weekdays') setSelectedDays([1, 2, 3, 4, 5]);
    if (preset === 'weekend') setSelectedDays([6, 7]);
    if (preset === 'all') setSelectedDays([1, 2, 3, 4, 5, 6, 7]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (selectedDays.length === 0) {
      showNotification('Escolha pelo menos um dia da semana.', 'warning');
      return;
    }

    if (mode === 'class' && !subjectId) {
      showNotification('Selecione uma disciplina cadastrada.', 'warning');
      return;
    }

    if (mode === 'commitment' && !title.trim()) {
      showNotification('Digite o nome do compromisso.', 'warning');
      return;
    }

    // Add for each selected day
    selectedDays.forEach((dayNum) => {
      addScheduleClass({
        subjectId: mode === 'class' ? subjectId : undefined,
        title: mode === 'commitment' ? title.trim() : undefined,
        dayOfWeek: dayNum as any,
        startTime,
        endTime,
        room: room.trim() || (mode === 'class' ? 'Sala de Aulas' : 'Local do Compromisso'),
        type: mode === 'class' ? classType : commitmentCategory,
        location: location.trim(),
        color: mode === 'commitment' ? color : undefined,
        notes: notes.trim() || undefined,
      });
    });

    const dayText = selectedDays.length === 1 ? '1 dia' : `${selectedDays.length} dias`;
    const labelText = mode === 'class' ? 'Aula' : 'Compromisso';
    showNotification(`${labelText} adicionado(a) com sucesso para ${dayText} na semana!`, 'success');
    addXp(30 * selectedDays.length, `${labelText} na Grade (${dayText})`);
    triggerConfetti();

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Adicionar à Grade Semanal
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Cadastre aulas de disciplinas ou compromissos recorrentes</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Category Switcher (Aula vs Compromisso) */}
        <div className="mt-4 grid grid-cols-2 gap-2 p-1 rounded-2xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
          <button
            type="button"
            onClick={() => setMode('class')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'class'
                ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Aula de Disciplina</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('commitment')}
            className={`flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              mode === 'commitment'
                ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>Compromisso / Evento</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Multi-Day Picker */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200/80 dark:border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <CalendarDays className="h-3.5 w-3.5 text-sky-500" />
                <span>Escolha em quais dias aparece na semana</span>
              </label>
              <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-950/50 px-2 py-0.5 rounded-md border border-sky-100 dark:border-sky-900/50">
                {selectedDays.length} dia(s) selecionado(s)
              </span>
            </div>

            {/* Interactive Day Buttons */}
            <div className="grid grid-cols-7 gap-1.5">
              {DAYS_OF_WEEK.map((day) => {
                const isSelected = selectedDays.includes(day.num);
                return (
                  <button
                    key={day.num}
                    type="button"
                    onClick={() => toggleDay(day.num)}
                    title={day.full}
                    className={`flex flex-col items-center justify-center py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-sky-600 text-white shadow-xs scale-105 font-black ring-2 ring-sky-400/40'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-sky-400 hover:text-sky-500'
                    }`}
                  >
                    <span>{day.short}</span>
                  </button>
                );
              })}
            </div>

            {/* Quick Presets */}
            <div className="flex items-center justify-end gap-1.5 pt-1 text-[10px]">
              <span className="text-slate-400 mr-1">Atalhos:</span>
              <button
                type="button"
                onClick={() => handleSelectPresetDays('weekdays')}
                className="px-2 py-1 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                Seg-Sex
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresetDays('weekend')}
                className="px-2 py-1 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                Sáb-Dom
              </button>
              <button
                type="button"
                onClick={() => handleSelectPresetDays('all')}
                className="px-2 py-1 rounded-lg bg-slate-200/60 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 cursor-pointer"
              >
                Todos
              </button>
            </div>
          </div>

          {/* Mode 1: Class Specific Fields */}
          {mode === 'class' ? (
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Disciplina Acadêmica
                </label>
                {subjects.length === 0 ? (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    Nenhuma disciplina cadastrada. Cadastre em "Matérias & Estrutura" primeiro.
                  </p>
                ) : (
                  <select
                    value={subjectId}
                    onChange={(e) => setSubjectId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                    required
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tipo de Atividade
                </label>
                <select
                  value={classType}
                  onChange={(e) => setClassType(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                >
                  <option value="Teórica">Teórica</option>
                  <option value="Prática / Lab">Prática / Lab</option>
                  <option value="Ambulatório">Ambulatório</option>
                  <option value="Enfermaria / Round">Enfermaria / Round</option>
                  <option value="Plantão Internato">Plantão Internato</option>
                  <option value="PBL / Tutoria">PBL / Tutoria</option>
                  <option value="Seminário">Seminário / Apresentação</option>
                </select>
              </div>
            </div>
          ) : (
            /* Mode 2: Commitment Specific Fields */
            <div className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nome do Compromisso / Evento
                </label>
                <input
                  type="text"
                  placeholder="Ex: Plantão 12h UPA, Grupo de Estudos, Simulado R1..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  required
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {QUICK_PRESETS_COMMITMENT.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTitle(preset)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        title === preset
                          ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold'
                          : 'bg-slate-100 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Categoria
                  </label>
                  <select
                    value={commitmentCategory}
                    onChange={(e) => setCommitmentCategory(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-indigo-500"
                  >
                    <option value="Compromisso Pessoal">Compromisso Pessoal</option>
                    <option value="Estudo / Revisão">Estudo / Revisão</option>
                    <option value="Plantão / Estágio">Plantão / Estágio</option>
                    <option value="Atividade Física">Atividade Física</option>
                    <option value="Reunião / Liga">Reunião / Liga</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Cor da Etiqueta
                  </label>
                  <div className="flex items-center gap-1.5 pt-1">
                    {COLOR_OPTIONS.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => setColor(c.hex)}
                        className={`w-6 h-6 rounded-full transition-all cursor-pointer ${
                          color === c.hex ? 'ring-2 ring-offset-2 ring-indigo-500 scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: c.hex }}
                        title={c.label}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Time & Location Fields */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-sky-500" /> Horário Início
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Clock className="h-3 w-3 text-sky-500" /> Horário Término
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Sala / Setor / Anfiteatro
              </label>
              <input
                type="text"
                placeholder="Ex: Sala 204, Leito 5..."
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Building2 className="h-3 w-3 text-emerald-500" /> Local / Hospital
              </label>
              <input
                type="text"
                placeholder="Ex: Hospital das Clínicas"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Salvar na Grade</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
