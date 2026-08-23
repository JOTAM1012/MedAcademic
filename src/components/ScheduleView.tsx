import React, { useState } from 'react';
import {
  CalendarDays,
  Plus,
  Clock,
  MapPin,
  Trash2,
  BookOpen,
  Filter,
  CheckCircle2,
  Sparkles,
  Search,
  Building2,
  Copy,
  LayoutGrid,
  ListOrdered,
  Calendar,
  AlertCircle,
  Tag,
  ChevronRight,
  MoreVertical,
  Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { ScheduleClass } from '../types';

interface ScheduleViewProps {
  onOpenAddSchedule: (dayNum?: number) => void;
}

const DAYS = [
  { num: 1, name: 'Segunda-feira', short: 'Seg' },
  { num: 2, name: 'Terça-feira', short: 'Ter' },
  { num: 3, name: 'Quarta-feira', short: 'Qua' },
  { num: 4, name: 'Quinta-feira', short: 'Qui' },
  { num: 5, name: 'Sexta-feira', short: 'Sex' },
  { num: 6, name: 'Sábado', short: 'Sáb' },
  { num: 7, name: 'Domingo', short: 'Dom' },
];

export const ScheduleView: React.FC<ScheduleViewProps> = ({ onOpenAddSchedule }) => {
  const { schedule, deleteScheduleClass, updateScheduleClass, addScheduleClass, subjects, showNotification } = useApp();

  const [selectedDayTab, setSelectedDayTab] = useState<number>(0); // 0 = all days, 1-7 = Mon-Sun
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [duplicateModalItem, setDuplicateModalItem] = useState<ScheduleClass | null>(null);

  const getSubject = (subjectId?: string) => {
    if (!subjectId) return null;
    return subjects.find((s) => s.id === subjectId);
  };

  // Helper to calculate duration in hours between HH:mm and HH:mm
  const calculateHours = (start: string, end: string) => {
    const [h1, m1] = start.split(':').map(Number);
    const [h2, m2] = end.split(':').map(Number);
    const mins = (h2 * 60 + m2) - (h1 * 60 + m1);
    return Math.max(0, mins / 60);
  };

  // Weekly Stats Calculation
  const totalItems = schedule.length;
  const totalWeeklyHours = schedule
    .reduce((acc, item) => acc + calculateHours(item.startTime, item.endTime), 0)
    .toFixed(1);

  // Find busiest day
  const itemsPerDay = DAYS.map((d) => ({
    day: d,
    count: schedule.filter((s) => s.dayOfWeek === d.num).length,
    hours: schedule.filter((s) => s.dayOfWeek === d.num).reduce((acc, item) => acc + calculateHours(item.startTime, item.endTime), 0)
  }));
  const busiestDay = [...itemsPerDay].sort((a, b) => b.count - a.count)[0];

  // Filter schedule items
  const filteredSchedule = schedule.filter((item) => {
    const sub = getSubject(item.subjectId);
    const titleText = item.title || sub?.name || '';
    const roomText = item.room || '';
    const locText = item.location || '';
    const typeText = item.type || '';

    const matchesSearch =
      titleText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roomText.toLowerCase().includes(searchQuery.toLowerCase()) ||
      locText.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFilter =
      filterType === 'all' ||
      (filterType === 'aulas' && item.subjectId) ||
      (filterType === 'compromissos' && !item.subjectId) ||
      (filterType === 'plantao' && (typeText.toLowerCase().includes('plantão') || typeText.toLowerCase().includes('internato'))) ||
      (filterType === 'pratica' && (typeText.toLowerCase().includes('prática') || typeText.toLowerCase().includes('ambulatório')));

    return matchesSearch && matchesFilter;
  });

  const handleToggleComplete = (id: string, currentStatus?: boolean) => {
    updateScheduleClass(id, { isCompleted: !currentStatus });
    if (!currentStatus) {
      showNotification('Atividade marcada como concluída hoje! 👏', 'success');
    }
  };

  const handleDuplicateToDay = (item: ScheduleClass, targetDayNum: number) => {
    addScheduleClass({
      subjectId: item.subjectId,
      title: item.title,
      dayOfWeek: targetDayNum as any,
      startTime: item.startTime,
      endTime: item.endTime,
      room: item.room,
      type: item.type,
      location: item.location,
      color: item.color,
      notes: item.notes,
    });
    setDuplicateModalItem(null);
    showNotification(`Atividade duplicada para ${DAYS.find((d) => d.num === targetDayNum)?.name}!`, 'success');
  };

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Grade Horária & Aulas
            </h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
              Grade Semanal
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Organize horários de anfiteatros, enfermarias, ambulatórios, plantões e compromissos de estudo.
          </p>
        </div>

        {/* Global Action Button */}
        <div className="flex items-center gap-2">
          <button
            id="schedule-add-class-btn"
            onClick={() => onOpenAddSchedule()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-md shadow-sky-600/20 transition-all cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Adicionar à Grade</span>
          </button>
        </div>
      </div>

      {/* Stats Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400">
            <CalendarDays className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Carga Semanal</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{totalWeeklyHours} horas</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
            <BookOpen className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total de Aulas</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">{totalItems} cadastradas</div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dia mais Atarefado</div>
            <div className="text-sm font-black text-slate-900 dark:text-white mt-0.5 truncate max-w-[120px]">
              {busiestDay?.count > 0 ? `${busiestDay.day.short} (${busiestDay.count}x)` : 'Livre'}
            </div>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Compromissos</div>
            <div className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
              {schedule.filter((s) => !s.subjectId).length} pessoais
            </div>
          </div>
        </div>
      </div>

      {/* Toolbar: View Switcher, Search, Type Filters */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
        {/* Days Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedDayTab(0)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedDayTab === 0
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
            }`}
          >
            Semana Completa
          </button>
          {DAYS.map((d) => {
            const count = schedule.filter((s) => s.dayOfWeek === d.num).length;
            return (
              <button
                key={d.num}
                onClick={() => setSelectedDayTab(d.num)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                  selectedDayTab === d.num
                    ? 'bg-sky-600 text-white shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                }`}
              >
                <span>{d.short}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedDayTab === d.num ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search & Filter & View Toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar matéria/sala..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
            />
          </div>

          {/* Filter Dropdown */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-hidden"
          >
            <option value="all">Todas Atividades</option>
            <option value="aulas">Apenas Aulas</option>
            <option value="compromissos">Apenas Compromissos</option>
            <option value="plantao">Plantões / Internato</option>
            <option value="pratica">Prática / Ambulatório</option>
          </select>

          {/* Mode toggle */}
          <div className="flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Visão em Grade"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'timeline' ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-xs' : 'text-slate-400 hover:text-slate-600'
              }`}
              title="Visão Linha do Tempo"
            >
              <ListOrdered className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewMode === 'grid' ? (
        /* GRID VIEW: Cards per Day */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {DAYS
            .filter((d) => selectedDayTab === 0 || selectedDayTab === d.num)
            .map((day) => {
              const dayClasses = filteredSchedule
                .filter((sc) => sc.dayOfWeek === day.num)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

              return (
                <div
                  key={day.num}
                  className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs flex flex-col justify-between transition-all"
                >
                  <div>
                    {/* Day Header with EXPLICIT "Adicionar à Grade" Button */}
                    <div className="flex items-center justify-between pb-3.5 mb-3.5 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full bg-sky-500" />
                        <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                          {day.name}
                        </h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                          {dayClasses.length}
                        </span>
                      </div>

                      {/* Direct "+ Adicionar à grade" button in this specific day card */}
                      <button
                        type="button"
                        onClick={() => onOpenAddSchedule(day.num)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/60 hover:bg-sky-100 text-sky-700 dark:text-sky-300 border border-sky-200 dark:border-sky-800/80 text-[11px] font-bold transition-all cursor-pointer"
                        title={`Adicionar aula ou compromisso na ${day.name}`}
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>Adicionar</span>
                      </button>
                    </div>

                    {/* Day Content */}
                    {dayClasses.length === 0 ? (
                      <div className="py-10 px-4 text-center border-2 border-dashed border-slate-100 dark:border-slate-800/80 rounded-2xl my-2 flex flex-col items-center justify-center">
                        <CalendarDays className="h-8 w-8 text-slate-300 dark:text-slate-700 mb-2" />
                        <p className="text-xs text-slate-400 font-medium">Nenhuma aula ou compromisso cadastrado.</p>
                        <button
                          type="button"
                          onClick={() => onOpenAddSchedule(day.num)}
                          className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-sky-600 hover:text-white text-slate-600 dark:text-slate-300 text-xs font-bold transition-all cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>+ Adicionar para {day.short}</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {dayClasses.map((item) => {
                          const sub = getSubject(item.subjectId);
                          const isCommitment = !item.subjectId;
                          const accentColor = item.color || sub?.color || '#0284c7';

                          return (
                            <div
                              key={item.id}
                              className={`relative overflow-hidden rounded-2xl border transition-all p-3.5 ${
                                item.isCompleted
                                  ? 'bg-slate-50/50 dark:bg-slate-950/20 border-slate-200 dark:border-slate-800 opacity-60'
                                  : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800 hover:border-slate-300'
                              }`}
                            >
                              {/* Left Accent Stripe */}
                              <div
                                className="absolute top-0 left-0 bottom-0 w-1.5"
                                style={{ backgroundColor: accentColor }}
                              />

                              <div className="pl-1">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className="text-xs font-black text-slate-900 dark:text-white truncate">
                                        {isCommitment ? item.title || 'Compromisso Pessoal' : sub?.name || 'Disciplina'}
                                      </span>

                                      {/* Type Tag */}
                                      <span
                                        className="text-[9px] font-extrabold px-2 py-0.5 rounded-md border"
                                        style={{
                                          color: accentColor,
                                          borderColor: `${accentColor}40`,
                                          backgroundColor: `${accentColor}15`,
                                        }}
                                      >
                                        {item.type || 'Aula'}
                                      </span>
                                    </div>

                                    {/* Subtitle / Details */}
                                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2 flex-wrap">
                                      {item.room && <span>Sala: {item.room}</span>}
                                      {sub?.professor && <span>• Prof: {sub.professor}</span>}
                                    </div>
                                  </div>

                                  {/* Actions */}
                                  <div className="flex items-center gap-1 shrink-0">
                                    {/* Complete Toggle */}
                                    <button
                                      type="button"
                                      onClick={() => handleToggleComplete(item.id, item.isCompleted)}
                                      className={`p-1 rounded-lg transition-colors cursor-pointer ${
                                        item.isCompleted
                                          ? 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/50'
                                          : 'text-slate-300 hover:text-emerald-500'
                                      }`}
                                      title={item.isCompleted ? 'Concluída' : 'Marcar como concluída hoje'}
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </button>

                                    {/* Duplicate */}
                                    <button
                                      type="button"
                                      onClick={() => setDuplicateModalItem(item)}
                                      className="p-1 text-slate-300 hover:text-sky-500 rounded-lg transition-colors cursor-pointer"
                                      title="Duplicar para outro dia"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </button>

                                    {/* Delete */}
                                    <button
                                      type="button"
                                      onClick={() => deleteScheduleClass(item.id)}
                                      className="p-1 text-slate-300 hover:text-rose-500 rounded-lg transition-colors cursor-pointer"
                                      title="Remover da grade"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* Footer Time & Location */}
                                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                                  <span className="flex items-center gap-1 text-sky-600 dark:text-sky-400">
                                    <Clock className="h-3 w-3" />
                                    {item.startTime} - {item.endTime}
                                  </span>
                                  {item.location && (
                                    <span className="text-slate-400 font-sans flex items-center gap-1 text-[10px]">
                                      <Building2 className="h-3 w-3" />
                                      {item.location}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Add Button */}
                  {dayClasses.length > 0 && (
                    <button
                      type="button"
                      onClick={() => onOpenAddSchedule(day.num)}
                      className="mt-3 w-full py-2 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold border border-slate-200/60 dark:border-slate-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 text-sky-500" />
                      <span>Adicionar nesta {day.short}</span>
                    </button>
                  )}
                </div>
              );
            })}
        </div>
      ) : (
        /* TIMELINE VIEW */
        <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ListOrdered className="h-4 w-4 text-sky-500" />
              Visão Cronológica Semanal
            </h3>
            <span className="text-xs text-slate-500">{filteredSchedule.length} atividades encontradas</span>
          </div>

          {filteredSchedule.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              Nenhuma atividade encontrada na busca.
            </div>
          ) : (
            <div className="space-y-6">
              {DAYS.map((day) => {
                const dayClasses = filteredSchedule
                  .filter((sc) => sc.dayOfWeek === day.num)
                  .sort((a, b) => a.startTime.localeCompare(b.startTime));

                if (dayClasses.length === 0) return null;

                return (
                  <div key={day.num} className="space-y-3">
                    <div className="flex items-center justify-between text-xs font-black text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800">
                      <span>{day.name}</span>
                      <button
                        type="button"
                        onClick={() => onOpenAddSchedule(day.num)}
                        className="text-sky-600 dark:text-sky-400 hover:underline text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" /> Adicionar
                      </button>
                    </div>

                    <div className="space-y-2 pl-2">
                      {dayClasses.map((item) => {
                        const sub = getSubject(item.subjectId);
                        const isCommitment = !item.subjectId;
                        const accentColor = item.color || sub?.color || '#0284c7';

                        return (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className="w-2 h-10 rounded-full"
                                style={{ backgroundColor: accentColor }}
                              />
                              <div>
                                <div className="text-xs font-bold text-slate-900 dark:text-white">
                                  {isCommitment ? item.title || 'Compromisso' : sub?.name}
                                </div>
                                <div className="text-[11px] text-slate-500">
                                  {item.startTime} - {item.endTime} • {item.room || 'Sem sala'} • {item.type}
                                </div>
                              </div>
                            </div>

                            <button
                              type="button"
                              onClick={() => deleteScheduleClass(item.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 cursor-pointer"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Duplicate Modal */}
      {duplicateModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl space-y-4">
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              Duplicar Atividade para outro Dia
            </h4>
            <p className="text-xs text-slate-500">
              Escolha qual dia da semana deseja copiar essa atividade:
            </p>

            <div className="grid grid-cols-2 gap-2">
              {DAYS.map((d) => (
                <button
                  key={d.num}
                  type="button"
                  onClick={() => handleDuplicateToDay(duplicateModalItem, d.num)}
                  className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-sky-50 dark:hover:bg-sky-950 text-xs font-bold text-slate-800 dark:text-slate-200 hover:text-sky-600 transition-all cursor-pointer text-left flex items-center justify-between"
                >
                  <span>{d.name}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </button>
              ))}
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setDuplicateModalItem(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
