import React, { useState } from 'react';
import {
  Stethoscope,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  BookOpen,
  Filter,
  Search,
  ArrowRight,
  Award,
  Flame,
  FileText,
  Activity,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MedRevisionTopic } from '../types';

export const MedRevisionView: React.FC = () => {
  const { medRevisions, toggleMedRevisionComplete, setCurrentTab } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const categories = [
    'all',
    'Clínica Médica',
    'Cirurgia Geral',
    'Pediatria',
    'Ginecologia & Obstetrícia',
    'Medicina Preventiva & SUS',
  ];

  const filteredTopics = medRevisions.filter((item) => {
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    const matchesSearch =
      !searchTerm ||
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.keyPearls.some((p) => p.toLowerCase().includes(searchTerm.toLowerCase())) ||
      item.differentialDiagnosis.some((d) => d.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const completedCount = medRevisions.filter((m) => m.isCompleted).length;
  const progressPercent = Math.round((completedCount / medRevisions.length) * 100);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              MedRevision Hub
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
              Residência Médica & Revalida
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Tópicos médicos de altíssimo rendimento (High-Yield), pérolas clínicas e pegadinhas de bancas examinadoras.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentTab('gemini_tutor')}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 text-white text-xs font-bold shadow-xs hover:opacity-90 transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            <span>Simulador Clínico Gemini</span>
          </button>
        </div>
      </div>

      {/* Progress & Quick Stats Card */}
      <div className="rounded-3xl border border-sky-100 dark:border-sky-900/50 bg-gradient-to-r from-sky-900 via-slate-900 to-slate-950 text-white p-6 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-sky-300">
              Progresso do Ciclo de Residência
            </span>
            <h2 className="text-lg font-black text-white mt-0.5">
              {completedCount} de {medRevisions.length} Tópicos de Ouro Dominados ({progressPercent}%)
            </h2>
          </div>
          <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-xl backdrop-blur-xs">
            <Award className="h-4 w-4 text-amber-300" />
            <span className="text-xs font-bold text-sky-100">+150 XP por tema concluído</span>
          </div>
        </div>

        <div className="w-full bg-white/15 h-2.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-sky-400 to-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'Todas as Áreas' : cat}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por patologia, conduta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
          />
        </div>
      </div>

      {/* Topics Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredTopics.map((topic) => (
          <div
            key={topic.id}
            className={`rounded-2xl border p-5 transition-all ${
              topic.isCompleted
                ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs'
            }`}
          >
            {/* Header: Area + Priority + Complete Button */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-sky-400">
                  {topic.category}
                </span>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">
                  {topic.title}
                </h3>
              </div>

              <button
                id={`med-revision-toggle-${topic.id}`}
                onClick={() => toggleMedRevisionComplete(topic.id)}
                className={`p-1.5 rounded-xl border transition-all ${
                  topic.isCompleted
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-slate-300 dark:border-slate-700 text-slate-400 hover:border-emerald-500 hover:text-emerald-500'
                }`}
                title={topic.isCompleted ? 'Marcar como não concluído' : 'Marcar como dominado'}
              >
                <CheckCircle2 className="h-4 w-4" />
              </button>
            </div>

            {/* High Yield Badge & Frequency */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-300">
                {topic.highYieldLevel}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                {topic.revalidaFrequency}
              </span>
            </div>

            {/* Clinical Pearls (Pérolas Clínicas) */}
            <div className="space-y-1.5 mb-3 bg-slate-50 dark:bg-slate-950/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/80">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                💎 Pérolas de Prova & Conduta:
              </div>
              <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                {topic.keyPearls.map((pearl, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-sky-500 font-bold shrink-0">•</span>
                    <span>{pearl}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Guideline Snippet */}
            <div className="text-[11px] text-slate-600 dark:text-slate-400 italic bg-sky-50/40 dark:bg-sky-950/20 p-2.5 rounded-lg border border-sky-100 dark:border-sky-900/30 mb-3">
              <strong>Referência:</strong> {topic.guidelineSnippet}
            </div>

            {/* Differential Diagnosis Chips */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1 overflow-x-auto text-[10px] text-slate-500">
                <span className="font-semibold text-slate-400">Ddx:</span>
                {topic.differentialDiagnosis.slice(0, 2).map((d) => (
                  <span
                    key={d}
                    className="px-1.5 py-0.5 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                  >
                    {d}
                  </span>
                ))}
              </div>

              <button
                onClick={() => setCurrentTab('gemini_tutor')}
                className="text-xs font-bold text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 shrink-0 ml-2"
              >
                <span>Perguntar ao Tutor</span>
                <ArrowRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
