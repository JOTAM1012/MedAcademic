import React, { useState, useRef } from 'react';
import {
  X,
  Layers,
  Calendar as CalendarIcon,
  Clock,
  Bell,
  CheckSquare,
  HelpCircle,
  Video,
  FileText,
  BookOpen,
  User,
  Sparkles,
  Plus,
  ArrowRight,
  BookmarkCheck,
  Image as ImageIcon,
  Upload,
  Trash2,
  Paperclip,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PreferredStudyMethod, TopicDifficulty, TopicPriority } from '../../types';

interface AddStudyTopicModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSubjectId?: string;
}

export const AddStudyTopicModal: React.FC<AddStudyTopicModalProps> = ({
  isOpen,
  onClose,
  defaultSubjectId,
}) => {
  const { subjects, addSubject, addTopic, addXp, triggerConfetti, showNotification } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Hierarchy state
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    defaultSubjectId || subjects[0]?.id || ''
  );
  const [isCreatingNewSubject, setIsCreatingNewSubject] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubjectColor, setNewSubjectColor] = useState('#0284c7');

  const [moduleName, setModuleName] = useState('');
  const [topicTitle, setTopicTitle] = useState('');
  const [notes, setNotes] = useState('');

  // Image Upload state
  const [imageUrl, setImageUrl] = useState<string>('');
  const [imageCaption, setImageCaption] = useState<string>('');
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  // 1st Contact Schedule Section
  const [scheduleFirstContact, setScheduleFirstContact] = useState(true);
  const [contactDate, setContactDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [studyTime, setStudyTime] = useState('08:00');
  const [notificationsActive, setNotificationsActive] = useState(true);

  // Spaced Repetition Settings
  const [inSpacedRepetition, setInSpacedRepetition] = useState(true);
  const [preferredMethod, setPreferredMethod] = useState<PreferredStudyMethod>('questoes');
  const [questionCount, setQuestionCount] = useState<number>(15);
  const [priority, setPriority] = useState<TopicPriority>('alta');

  if (!isOpen) return null;

  const currentSubject = subjects.find((s) => s.id === selectedSubjectId);

  // Quick date helper
  const setQuickDate = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    setContactDate(d.toISOString().split('T')[0]);
  };

  const formatDateDisplay = (dateString: string) => {
    if (!dateString) return '';
    try {
      const parts = dateString.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const d = new Date(year, month, day);
        const days = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.'];
        const dayOfWeek = days[d.getDay()];
        return `${String(day).padStart(2, '0')}/${String(month + 1).padStart(2, '0')}/${year} (${dayOfWeek})`;
      }
    } catch {
      // ignore
    }
    return dateString;
  };

  const handleCreateNewSubject = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!newSubjectName.trim()) return;
    const newId = 'sub-' + Date.now();
    addSubject({
      name: newSubjectName.trim(),
      code: 'MED-' + Math.floor(100 + Math.random() * 900),
      color: newSubjectColor,
      semesterId: subjects[0]?.semesterId || 'sem-5',
      workloadHours: 60,
      targetGrade: 8.5,
    });
    setSelectedSubjectId(newId);
    setIsCreatingNewSubject(false);
    setNewSubjectName('');
  };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
          if (!imageCaption) {
            setImageCaption(file.name.replace(/\.[^/.]+$/, ''));
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImageUrl(reader.result);
          if (!imageCaption) {
            setImageCaption(file.name.replace(/\.[^/.]+$/, ''));
          }
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topicTitle.trim()) return;

    let targetSubId = selectedSubjectId;
    if (!targetSubId && subjects.length > 0) {
      targetSubId = subjects[0].id;
    }

    if (!targetSubId) {
      showNotification('Por favor, crie ou selecione uma disciplina primeiro.', 'warning');
      return;
    }

    addTopic({
      subjectId: targetSubId,
      moduleName: moduleName.trim() || 'Geral',
      title: topicTitle.trim(),
      description: notes.trim() || undefined,
      status: 'nao_iniciado',
      priority,
      firstContactDate: contactDate,
      studyTime: scheduleFirstContact ? studyTime : undefined,
      scheduleFirstContact,
      notificationsActive,
      inSpacedRepetition,
      preferredStudyMethod: preferredMethod,
      questionCount: preferredMethod === 'questoes' ? questionCount : undefined,
      cycleStep: undefined,
      intervalDays: undefined,
      nextReviewDate: undefined,
      lastStudiedDate: undefined,
      notes: notes.trim() || undefined,
      imageUrl: imageUrl.trim() || undefined,
      imageCaption: imageCaption.trim() || undefined,
      tags: [moduleName.trim() || 'Geral', preferredMethod],
    });

    addXp(60, 'Novo Assunto Cadastrado');
    triggerConfetti();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden my-6">
        
        {/* Modal Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-gradient-to-r from-sky-50 to-white dark:from-slate-800/60 dark:to-slate-900">
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              <span className="p-1.5 rounded-xl bg-sky-500 text-white shadow-xs">
                <BookmarkCheck className="h-4 w-4" />
              </span>
              Novo Assunto de Estudo
            </h2>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-sky-600 dark:text-sky-400 mt-1">
              <span>Disciplina</span>
              <ArrowRight className="h-3 w-3" />
              <span>Matéria</span>
              <ArrowRight className="h-3 w-3" />
              <span>Assunto</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          
          {/* Step 1: Disciplina & Matéria */}
          <div className="space-y-3.5 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                  1. Disciplina
                </label>
                <button
                  type="button"
                  onClick={() => setIsCreatingNewSubject(!isCreatingNewSubject)}
                  className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />
                  {isCreatingNewSubject ? 'Selecionar Existente' : '+ Nova Disciplina'}
                </button>
              </div>

              {isCreatingNewSubject ? (
                <div className="space-y-2.5 p-3 rounded-xl bg-white dark:bg-slate-900 border border-sky-200 dark:border-sky-800/60 animate-in fade-in">
                  <input
                    type="text"
                    placeholder="Nome da Disciplina (ex: Cardiologia, Pediatria)"
                    value={newSubjectName}
                    onChange={(e) => setNewSubjectName(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-hidden focus:border-sky-500"
                  />
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={handleCreateNewSubject}
                      className="w-full text-xs font-bold px-3 py-2 rounded-lg bg-sky-600 text-white hover:bg-sky-700 shadow-xs"
                    >
                      Criar & Selecionar
                    </button>
                  </div>
                </div>
              ) : (
                <select
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-hidden focus:border-sky-500 shadow-2xs"
                  required
                >
                  {subjects.map((sub) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name} ({sub.code})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                2. Matéria / Módulo Específico
              </label>
              <input
                type="text"
                placeholder="Ex: Insuficiência Cardíaca, Farmacologia Clínica, Abdome Agudo"
                value={moduleName}
                onChange={(e) => setModuleName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500 font-medium shadow-2xs"
                required
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                3. Título do Assunto / Detalhe
              </label>
              <input
                type="text"
                placeholder="Ex: Critérios de Framingham e Manejo da IC Descompensada"
                value={topicTitle}
                onChange={(e) => setTopicTitle(e.target.value)}
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2.5 text-xs font-bold text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500 shadow-2xs"
                required
              />
            </div>
          </div>

          {/* Section: Agendar 1º Contato */}
          <div className="space-y-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-black text-slate-900 dark:text-white">
                    🎯 Agendar 1º Contato
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Defina quando terá o primeiro contato com este assunto
                </p>
              </div>

              {/* Toggle switch */}
              <button
                type="button"
                onClick={() => setScheduleFirstContact(!scheduleFirstContact)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                  scheduleFirstContact ? 'bg-sky-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                    scheduleFirstContact ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {scheduleFirstContact && (
              <div className="pt-2 space-y-3 animate-in fade-in">
                {/* Quick chip buttons */}
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setQuickDate(0)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950/60 dark:hover:text-sky-300 transition-colors"
                  >
                    Hoje
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(1)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950/60 dark:hover:text-sky-300 transition-colors"
                  >
                    Amanhã
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuickDate(2)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-sky-100 hover:text-sky-700 dark:hover:bg-sky-950/60 dark:hover:text-sky-300 transition-colors"
                  >
                    +2 dias
                  </button>
                </div>

                {/* Date Row */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <CalendarIcon className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Data do 1º Contato
                      </span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {formatDateDisplay(contactDate)}
                      </p>
                    </div>
                  </div>
                  <input
                    type="date"
                    value={contactDate}
                    onChange={(e) => setContactDate(e.target.value)}
                    className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                  />
                </div>

                {/* Time Row */}
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex items-center gap-2.5">
                    <Clock className="h-4 w-4 text-sky-600 dark:text-sky-400" />
                    <div>
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                        Horário do Estudo
                      </span>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {studyTime}
                      </p>
                    </div>
                  </div>
                  <input
                    type="time"
                    value={studyTime}
                    onChange={(e) => setStudyTime(e.target.value)}
                    className="text-xs font-semibold px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                  />
                </div>

                {/* Notification Toggle Row */}
                <div className="flex items-center justify-between px-1 pt-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-300">
                    <Bell className="h-4 w-4 text-amber-500" />
                    <span>Lembretes de notificação ativos</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={notificationsActive}
                    onChange={(e) => setNotificationsActive(e.target.checked)}
                    className="h-4 w-4 rounded-sm text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          {/* Spaced Repetition Opt-in */}
          <div className="flex items-center gap-2.5">
            <input
              type="checkbox"
              id="inSpacedRepetition"
              checked={inSpacedRepetition}
              onChange={(e) => setInSpacedRepetition(e.target.checked)}
              className="h-4 w-4 rounded-sm text-sky-600 focus:ring-sky-500 border-slate-300 dark:border-slate-700"
            />
            <label
              htmlFor="inSpacedRepetition"
              className="text-xs font-black text-slate-900 dark:text-white cursor-pointer select-none"
            >
              Inserir no Ciclo de Revisões Espaçadas
            </label>
          </div>

          {/* Método Preferencial de Estudo */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
              Método Preferencial de Estudo
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setPreferredMethod('questoes')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  preferredMethod === 'questoes'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <HelpCircle className="h-3.5 w-3.5" />
                Questões
              </button>
              <button
                type="button"
                onClick={() => setPreferredMethod('videoaula')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  preferredMethod === 'videoaula'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Video className="h-3.5 w-3.5" />
                Videoaula
              </button>
              <button
                type="button"
                onClick={() => setPreferredMethod('resumo')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  preferredMethod === 'resumo'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <FileText className="h-3.5 w-3.5" />
                Resumo
              </button>
              <button
                type="button"
                onClick={() => setPreferredMethod('livros')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  preferredMethod === 'livros'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Livros
              </button>
              <button
                type="button"
                onClick={() => setPreferredMethod('pessoal')}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                  preferredMethod === 'pessoal'
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <User className="h-3.5 w-3.5" />
                Pessoal
              </button>
            </div>

            {/* If Questões, show count */}
            {preferredMethod === 'questoes' && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-100 dark:border-sky-900/50 animate-in fade-in">
                <span className="text-xs font-bold text-sky-800 dark:text-sky-300">
                  Meta de questões para cada revisão:
                </span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value) || 15)}
                  className="w-16 text-center text-xs font-black px-2 py-1 rounded-lg border border-sky-300 dark:border-sky-700 bg-white dark:bg-slate-900 text-sky-900 dark:text-sky-200 focus:outline-hidden"
                />
                <span className="text-xs text-sky-700 dark:text-sky-400 font-semibold">questões</span>
              </div>
            )}
          </div>


          {/* Anotações Adicionais */}
          <div>
            <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1">
              Anotações & Foco Clínico (Opcional)
            </label>
            <textarea
              rows={2}
              placeholder="Ex: Focar nas diretrizes de manejo emergencial e conduta terapêutica..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3.5 py-2 text-xs text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500 resize-none font-medium"
            />
          </div>

          {/* Imagem / Esquema Clínico Anexado */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" />
                Imagem / Esquema Clínico (Opcional)
              </label>
              {imageUrl && (
                <button
                  type="button"
                  onClick={() => {
                    setImageUrl('');
                    setImageCaption('');
                  }}
                  className="text-xs font-semibold text-rose-500 hover:text-rose-600 flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Remover
                </button>
              )}
            </div>

            {imageUrl ? (
              <div className="space-y-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 animate-in fade-in">
                <div className="relative max-h-48 rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                  <img
                    src={imageUrl}
                    alt={imageCaption || 'Imagem anexada'}
                    referrerPolicy="no-referrer"
                    className="max-h-48 w-auto object-contain rounded-xl"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Legenda da imagem (ex: ECG com supradesnivelamento de ST em DII, DIII e aVF)"
                  value={imageCaption}
                  onChange={(e) => setImageCaption(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                />
              </div>
            ) : (
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`p-4 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center text-center ${
                  isDragOver
                    ? 'border-sky-500 bg-sky-50 dark:bg-sky-950/40'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 hover:border-sky-400 hover:bg-sky-50/50 dark:hover:bg-sky-950/20'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <div className="w-9 h-9 rounded-xl bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-2 shadow-2xs">
                  <Upload className="h-4 w-4" />
                </div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Arraste uma imagem ou clique para fazer upload
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  ECG, cortes anatômicos, lâminas histológicas, raio-X ou fluxogramas (PNG, JPG, WebP)
                </p>
              </div>
            )}
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-black text-xs shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <BookmarkCheck className="h-4 w-4" />
              Adicionar Assunto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
