import React, { useState } from 'react';
import {
  Layers,
  Plus,
  BookOpen,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  MoreVertical,
  Trash2,
  Edit2,
  Sparkles,
  ChevronRight,
  GraduationCap,
  Tag,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Subject, Topic, TopicStatus } from '../types';
import { MEDICAL_AREAS, OTHER_AREA, getMedicalArea } from '../data/areas';
import { EditSubjectModal } from './modals/EditSubjectModal';
import { TOPIC_STATUS_INFO, REVIEWS_TO_MASTER, getReviewsDone, isTopicDone, topicStatusLabel } from '../data/topicStatus';

interface AcademicStructureViewProps {
  onOpenAddSubject: () => void;
  onOpenAddTopic: (subjectId?: string) => void;
}

export const AcademicStructureView: React.FC<AcademicStructureViewProps> = ({
  onOpenAddSubject,
  onOpenAddTopic,
}) => {
  const {
    semesters,
    currentSemester,
    setCurrentSemesterId,
    subjects,
    deleteSubject,
    topics,
    updateTopic,
    deleteTopic,
    markTopicSeen,
    resetTopicProgress,
    setCurrentTab,
  } = useApp();

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [areaFilter, setAreaFilter] = useState<string>('all');
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Display color: the area's color (older subjects without an area keep their own)
  const subjectColor = (sub: Subject) => {
    const area = getMedicalArea(sub.majorArea);
    return area.id === OTHER_AREA.id ? sub.color || OTHER_AREA.color : area.color;
  };

  // Subjects grouped by the 6 internship areas, always in the same order ("Outras" last)
  const areaGroups = [...MEDICAL_AREAS, OTHER_AREA]
    .map((area) => ({ area, items: subjects.filter((s) => getMedicalArea(s.majorArea).id === area.id) }))
    .filter((g) => g.items.length > 0);
  const visibleGroups = areaFilter === 'all' ? areaGroups : areaGroups.filter((g) => g.area.id === areaFilter);
  const visibleSubjects = visibleGroups.flatMap((g) => g.items);

  // Active subject for topics view
  const activeSubject = selectedSubjectId
    ? subjects.find((s) => s.id === selectedSubjectId) || visibleSubjects[0]
    : visibleSubjects[0];

  // Filter topics for the active subject
  const currentSubjectTopics = activeSubject
    ? topics.filter((t) => {
        const matchesSubject = t.subjectId === activeSubject.id;
        const matchesStatus = filterStatus === 'all' || t.status === filterStatus;
        const matchesSearch =
          !searchTerm ||
          t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(searchTerm.toLowerCase()));
        return matchesSubject && matchesStatus && matchesSearch;
      })
    : [];

  const getStatusBadge = (topic: Topic) => ({
    label: topicStatusLabel(topic),
    class: TOPIC_STATUS_INFO[topic.status].badgeClass,
  });

  const formatShortDate = (iso?: string) => {
    if (!iso) return '';
    const [, m, d] = iso.split('-');
    return d && m ? `${d}/${m}` : iso;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Estrutura Acadêmica
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
              Hierarquia Médica
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Organize disciplinas clínicas e assuntos prioritários com controle de domínio.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="academic-add-subject-btn"
            onClick={onOpenAddSubject}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold shadow-xs transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Adicionar Matéria</span>
          </button>
        </div>
      </div>

      {/* Area filter chips */}
      {subjects.length > 0 && (
        <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Filtrar por grande área">
          <button
            type="button"
            onClick={() => setAreaFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
              areaFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todas ({subjects.length})
          </button>
          {[...MEDICAL_AREAS, ...(areaGroups.some((g) => g.area.id === OTHER_AREA.id) ? [OTHER_AREA] : [])].map((area) => {
            const count = subjects.filter((s) => getMedicalArea(s.majorArea).id === area.id).length;
            const active = areaFilter === area.id;
            return (
              <button
                key={area.id}
                type="button"
                onClick={() => setAreaFilter(active ? 'all' : area.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                  active ? 'text-white' : 'border-transparent bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                } ${count === 0 && !active ? 'opacity-50' : ''}`}
                style={active ? { backgroundColor: area.color, borderColor: area.color } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: active ? '#fff' : area.color }} />
                {area.id}
                <span className={active ? 'text-white/80' : 'text-slate-400'}>{count}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Subjects & Topics Split View Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Subjects List (5 cols) */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Disciplinas Ativas ({visibleSubjects.length})
            </h2>
          </div>

          {subjects.length > 0 && visibleSubjects.length === 0 ? (
            <div className="text-center py-8 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500 font-medium">Nenhuma matéria nesta área ainda.</p>
              <button onClick={onOpenAddSubject} className="mt-2 text-xs font-bold text-sky-600 hover:underline">
                + Adicionar Matéria
              </button>
            </div>
          ) : subjects.length === 0 ? (
            <div className="text-center py-10 p-4 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
              <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
              <p className="text-xs text-slate-500 font-medium">Nenhuma matéria cadastrada.</p>
              <button
                onClick={onOpenAddSubject}
                className="mt-2 text-xs font-bold text-sky-600 hover:underline"
              >
                + Cadastrar Primeira Matéria
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {visibleGroups.map(({ area, items: groupSubjects }) => (
                <div key={area.id} className="space-y-2">
                  <h3 className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider px-1" style={{ color: area.color }}>
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: area.color }} />
                    {area.id}
                    <span className="text-slate-400 font-bold">({groupSubjects.length})</span>
                  </h3>
                  {area.id === OTHER_AREA.id && (
                    <p className="text-[10px] text-slate-500 px-1 -mt-1">
                      Sem área definida — use o lápis para escolher a grande área.
                    </p>
                  )}
                  <div className="space-y-2.5">
                    {groupSubjects.map((sub) => {
                      const isSelected = activeSubject?.id === sub.id;
                      const subTopics = topics.filter((t) => t.subjectId === sub.id);
                      const doneCount = subTopics.filter(isTopicDone).length;
                      const completionPercentage =
                        subTopics.length > 0 ? Math.round((doneCount / subTopics.length) * 100) : 0;

                      return (
                        <div
                          key={sub.id}
                          onClick={() => setSelectedSubjectId(sub.id)}
                          className={`group relative overflow-hidden rounded-2xl border p-4 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-sky-500/80 bg-sky-50/40 dark:bg-sky-950/30 shadow-xs'
                              : 'border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700'
                          }`}
                        >
                          <div
                            className="absolute top-0 left-0 bottom-0 w-1.5"
                            style={{ backgroundColor: subjectColor(sub) }}
                          />

                          <div className="flex items-start justify-between">
                            <div className="min-w-0 pr-2">
                              <div className="flex items-center gap-1.5 mb-1">
                                <span className="text-[11px] font-semibold" style={{ color: subjectColor(sub) }}>
                                  {getMedicalArea(sub.majorArea).id === OTHER_AREA.id ? 'Sem área' : getMedicalArea(sub.majorArea).id}
                                </span>
                              </div>
                              <h3 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                                {sub.universitySubject || sub.name}
                              </h3>
                            </div>

                            <div className="text-right shrink-0">
                              <div className="text-xs font-black text-slate-900 dark:text-white">
                                {completionPercentage}%
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {doneCount}/{subTopics.length} realizados
                              </div>
                            </div>
                          </div>

                          {/* Mini Progress Bar */}
                          <div className="mt-3 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-300"
                              style={{ backgroundColor: subjectColor(sub), width: `${completionPercentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Topics Details for Selected Subject (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {activeSubject ? (
            <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
              {/* Subject Header Banner */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-xl text-white font-black text-[11px] shadow-xs"
                    style={{ backgroundColor: subjectColor(activeSubject) }}
                  >
                    {getMedicalArea(activeSubject.majorArea).id === OTHER_AREA.id
                      ? (activeSubject.universitySubject || activeSubject.name).slice(0, 3).toUpperCase()
                      : getMedicalArea(activeSubject.majorArea).short}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 dark:text-white">
                      {activeSubject.universitySubject || activeSubject.name}
                    </h2>
                    <p className="text-xs font-semibold" style={{ color: subjectColor(activeSubject) }}>
                      {getMedicalArea(activeSubject.majorArea).id === OTHER_AREA.id
                        ? 'Sem área definida'
                        : getMedicalArea(activeSubject.majorArea).id}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingSubject(activeSubject)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-sky-950/30 transition-colors"
                    title="Editar disciplina e área"
                    aria-label="Editar disciplina e área"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    id="academic-add-topic-btn"
                    onClick={() => onOpenAddTopic(activeSubject.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Adicionar Tópico</span>
                  </button>

                  <button
                    onClick={() => deleteSubject(activeSubject.id)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                    title="Excluir disciplina"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Filters & Search Row */}
              <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Filtrar tópicos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 py-1.5 pl-8 pr-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
                  {['all', 'nao_iniciado', 'em_andamento', 'revisado', 'dominado'].map((st) => (
                    <button
                      key={st}
                      onClick={() => setFilterStatus(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                        filterStatus === st
                          ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
                      }`}
                    >
                      {st === 'all' ? 'Todos' : TOPIC_STATUS_INFO[st as TopicStatus].filterLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Topics List Table / Cards */}
              <div className="mt-4 space-y-3">
                {currentSubjectTopics.length === 0 ? (
                  <div className="text-center py-12 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800">
                    <BookOpen className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-medium">
                      Nenhum tópico encontrado com esses filtros.
                    </p>
                    <button
                      onClick={() => onOpenAddTopic(activeSubject.id)}
                      className="mt-2 text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline"
                    >
                      + Adicionar Novo Assunto Clínico
                    </button>
                  </div>
                ) : (
                  currentSubjectTopics.map((topic) => {
                    const badge = getStatusBadge(topic);
                    const reviewsDone = getReviewsDone(topic);
                    return (
                      <div
                        key={topic.id}
                        className="rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 p-4 transition-all hover:bg-white dark:hover:bg-slate-900 hover:shadow-xs"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                {topic.title}
                              </h4>
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.class}`}
                              >
                                {badge.label}
                              </span>
                              {topic.priority === 'alta' && (
                                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-sm bg-rose-500/10 text-rose-600 dark:text-rose-400">
                                  Alta Prioridade
                                </span>
                              )}
                            </div>

                            {topic.description && (
                              <p className="text-xs text-slate-600 dark:text-slate-400">
                                {topic.description}
                              </p>
                            )}

                            {topic.notes && (
                              <div className="text-[11px] text-amber-700 dark:text-amber-300/90 bg-amber-50/60 dark:bg-amber-950/20 p-2 rounded-lg border border-amber-200/50 dark:border-amber-900/30 mt-2">
                                <strong>Nota do Estudante:</strong> {topic.notes}
                              </div>
                            )}

                            {topic.tags && topic.tags.length > 0 && (
                              <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
                                {topic.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-[10px] text-slate-500 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1"
                                  >
                                    <Tag className="h-2.5 w-2.5" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Action Status Selector & Delete */}
                          <div className="flex items-center gap-2 shrink-0 pt-2 sm:pt-0">
                            {topic.status === 'nao_iniciado' ? (
                              <button
                                type="button"
                                onClick={() => markTopicSeen(topic.id)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-colors"
                                title="Registrar o 1º contato: o assunto entra na aba Revisões"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Marcar como visto
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <div className="text-right">
                                  <div className="flex items-center justify-end gap-1" title={`${reviewsDone} de ${REVIEWS_TO_MASTER} revisões concluídas`}>
                                    {Array.from({ length: REVIEWS_TO_MASTER }, (_, i) => (
                                      <span
                                        key={i}
                                        className={`h-1.5 w-4 rounded-full ${i < reviewsDone ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}
                                      />
                                    ))}
                                  </div>
                                  <div className="text-[10px] text-slate-500 mt-1">
                                    {topic.status === 'dominado'
                                      ? '4 revisões concluídas'
                                      : topic.nextReviewDate
                                      ? `Próxima revisão ${formatShortDate(topic.nextReviewDate)}`
                                      : 'Na aba Revisões'}
                                  </div>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (reviewsDone === 0 || window.confirm(`Recomeçar "${topic.title}"? As revisões feitas serão zeradas.`)) {
                                      resetTopicProgress(topic.id);
                                    }
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                                  title="Voltar para Não iniciado"
                                  aria-label="Voltar para Não iniciado"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}

                            <button
                              onClick={() => deleteTopic(topic.id)}
                              className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                              title="Excluir tópico"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
              <p className="text-xs text-slate-500">Selecione uma disciplina para visualizar os tópicos.</p>
            </div>
          )}
        </div>
      </div>

      <EditSubjectModal
        isOpen={!!editingSubject}
        subject={editingSubject}
        onClose={() => setEditingSubject(null)}
      />
    </div>
  );
};
