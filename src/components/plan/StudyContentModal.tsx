// "Meus conteúdos": pega as disciplinas e os blocos (temas) do semestre e deixa o aluno escolher o
// que entra na rotina. Cada tema pode ser ligado/desligado; no modo automático o plano escolhe sozinho
// entre os temas ativos, no manual só entra o que tiver data.
import React, { useMemo, useState } from 'react';
import { BookOpen, CalendarPlus, Layers, Plus, Sparkles, Wand2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import BounceSwitch from '../shared/BounceSwitch';
import { addDaysYMD, formatDM, parseYMD } from '../../data/blockReview';
import { WEEKDAY_SHORT, autoDistributeNewTopics } from '../../data/studyMethod';
import { todayYMD, usePlanInput } from '../../hooks/useStudyPlan';
import { OptionChip, PlanModal } from './planShared';
import { QuickThemeModal } from './QuickThemeModal';
import type { TopicBlock } from '../../types';

interface StudyContentModalProps {
  open: boolean;
  onClose: () => void;
  stacked?: boolean;
}

const Switch: React.FC<{ id: string; on: boolean; onChange: (v: boolean) => void; label: string }> = ({ id, on, onChange, label }) => (
  <span className="shrink-0 min-h-[40px] min-w-[52px] flex items-center justify-center">
    <BounceSwitch id={id} checked={on} onChange={onChange} ariaLabel={label} />
  </span>
);

export const StudyContentModal: React.FC<StudyContentModalProps> = ({ open, onClose, stacked }) => {
  const { subjects, topicBlocks, topics, currentSubjectIds, studyPrefs, updateStudyPrefs, updateTopicBlock, showNotification } = useApp();
  const input = usePlanInput();
  const today = todayYMD();
  const [quickOpen, setQuickOpen] = useState(false);
  const [onlyActive, setOnlyActive] = useState(false);
  const auto = studyPrefs.topicMode !== 'manual';

  const current = useMemo(() => subjects.filter((s) => currentSubjectIds.includes(s.id)), [subjects, currentSubjectIds]);
  const groups = useMemo(
    () =>
      current.map((s) => ({
        subject: s,
        blocks: topicBlocks
          .filter((b) => b.subjectId === s.id && (!onlyActive || !b.paused))
          .sort((a, b) => Number(a.reviewStatus !== 'estudando') - Number(b.reviewStatus !== 'estudando') || a.createdAt.localeCompare(b.createdAt)),
        checklist: s.organization === 'checklist',
      })),
    [current, topicBlocks, onlyActive]
  );

  const activeStudying = topicBlocks.filter((b) => currentSubjectIds.includes(b.subjectId) && b.reviewStatus === 'estudando' && !b.paused);
  const undated = activeStudying.filter((b) => !b.plannedDate);
  const pausedCount = topicBlocks.filter((b) => currentSubjectIds.includes(b.subjectId) && b.paused).length;

  // Próximos 14 dias para escolher a data à mão
  const dates = useMemo(() => Array.from({ length: 14 }, (_, i) => addDaysYMD(i, today)), [today]);
  const dayName = (d: string) => (d === today ? 'Hoje' : d === dates[1] ? 'Amanhã' : `${WEEKDAY_SHORT[parseYMD(d).getDay()]} ${formatDM(d)}`);

  const togglePaused = (b: TopicBlock, on: boolean) => {
    updateTopicBlock(b.id, on ? { paused: undefined } : { paused: true, plannedDate: undefined });
    showNotification(on ? `"${b.name}" voltou para a rotina.` : `"${b.name}" saiu da rotina. O plano não vai sugerir nem cobrar este tema.`, 'info');
  };

  const distribute = () => {
    if (undated.length === 0) {
      showNotification('Todos os temas ativos já têm data.', 'info');
      return;
    }
    const map = autoDistributeNewTopics(input, undated.map((b) => b.id), today, 14);
    const ids = Object.keys(map);
    ids.forEach((id) => updateTopicBlock(id, { plannedDate: map[id] }));
    showNotification(
      ids.length === 0
        ? 'Os próximos dias já estão cheios. Escolha as datas à mão ou diminua as revisões.'
        : `${ids.length} tema${ids.length > 1 ? 's' : ''} encaixado${ids.length > 1 ? 's' : ''} nos próximos dias, respeitando revisões, descanso e provas.`,
      ids.length ? 'success' : 'info'
    );
  };

  const statusChip = (b: TopicBlock) => {
    if (b.reviewStatus === 'estudando') {
      const bt = topics.filter((t) => t.blockId === b.id);
      const seen = bt.filter((t) => t.status !== 'nao_iniciado').length;
      return `Em estudo${bt.length ? ` · ${seen}/${bt.length}` : ''}`;
    }
    return `Em revisão · R${Math.min(b.reviewsDone + 1, 9)}${b.nextReviewDate ? ` ${b.nextReviewDate <= today ? 'hoje' : formatDM(b.nextReviewDate)}` : ''}`;
  };

  return (
    <>
      <PlanModal
        id="content-modal"
        open={open}
        onClose={onClose}
        stacked={stacked}
        maxWidth="max-w-2xl"
        icon={<Layers className="h-5 w-5" />}
        title="Meus conteúdos na rotina"
        subtitle="Suas disciplinas e temas do semestre. Ligue o que você quer estudar agora; desligue o que pode esperar."
        footer={
          <button type="button" id="content-done" onClick={onClose} className="min-h-[40px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black">
            Pronto
          </button>
        }
      >
        <div className="space-y-4">
          {/* Modo */}
          <section>
            <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Como escolher o tema novo do dia</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <OptionChip id="content-mode-auto" active={auto} onClick={() => updateStudyPrefs({ topicMode: 'auto' })} className="min-h-[56px] text-left">
                <span className="flex items-center gap-1.5 text-sm">
                  <Sparkles className="h-4 w-4" /> Automático
                </span>
                <span className={`block text-[11px] font-semibold ${auto ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  O plano escolhe entre os temas ligados (prova perto primeiro)
                </span>
              </OptionChip>
              <OptionChip id="content-mode-manual" active={!auto} onClick={() => updateStudyPrefs({ topicMode: 'manual' })} className="min-h-[56px] text-left">
                <span className="flex items-center gap-1.5 text-sm">
                  <CalendarPlus className="h-4 w-4" /> Manual
                </span>
                <span className={`block text-[11px] font-semibold ${!auto ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>
                  Só entra o tema que você colocar uma data
                </span>
              </OptionChip>
            </div>
          </section>

          {/* Ações */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              id="content-distribute"
              onClick={distribute}
              className="min-h-[40px] px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black inline-flex items-center gap-1.5"
            >
              <Wand2 className="h-4 w-4" /> Encaixar na rotina ({undated.length})
            </button>
            <button
              type="button"
              id="content-add-theme"
              onClick={() => setQuickOpen(true)}
              className="min-h-[40px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 text-xs font-bold inline-flex items-center gap-1.5 hover:border-sky-400"
            >
              <Plus className="h-4 w-4" /> Novo tema
            </button>
            <label className="ml-auto min-h-[40px] inline-flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 cursor-pointer">
              <input type="checkbox" checked={onlyActive} onChange={(e) => setOnlyActive(e.target.checked)} className="h-4 w-4 accent-sky-600" />
              Só os ligados{pausedCount ? ` (${pausedCount} desligado${pausedCount > 1 ? 's' : ''})` : ''}
            </label>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 -mt-2">
            "Encaixar" coloca os temas ligados sem data nos próximos dias, sem passar do seu tempo e pulando descanso, provas e plantões.
          </p>

          {/* Lista por disciplina */}
          {groups.length === 0 && (
            <p className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-4 text-sm text-slate-600 dark:text-slate-300 text-center">
              Nenhuma disciplina no semestre atual. Cadastre em Disciplinas & assuntos.
            </p>
          )}
          {groups.map(({ subject, blocks, checklist }) => (
            <section key={subject.id} id={`content-subject-${subject.id}`} className="rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">{subject.name}</p>
                <span className="ml-auto text-[11px] font-bold text-slate-500 dark:text-slate-400 shrink-0">
                  {blocks.length} tema{blocks.length === 1 ? '' : 's'}
                </span>
              </div>
              {blocks.length === 0 ? (
                <p className="px-3.5 py-3 text-[12px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 shrink-0" />
                  {checklist
                    ? 'Disciplina por checklist: agende o 1º contato dos tópicos em Disciplinas, ou crie um tema aqui com "Novo tema".'
                    : 'Sem temas ainda. Use "Novo tema" ou crie os blocos em Disciplinas.'}
                </p>
              ) : (
                <ul className="divide-y divide-slate-200 dark:divide-slate-800">
                  {blocks.map((b) => {
                    const on = !b.paused;
                    const studying = b.reviewStatus === 'estudando';
                    return (
                      <li key={b.id} id={`content-block-${b.id}`} className={`flex items-center gap-2 px-3 py-2 ${on ? '' : 'opacity-60'}`}>
                        <Switch id={`content-switch-${b.id}`} on={on} onChange={(v) => togglePaused(b, v)} label={`${on ? 'Desligar' : 'Ligar'} ${b.name} na rotina`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{b.name}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{on ? statusChip(b) : 'Fora da rotina'}</p>
                        </div>
                        {studying && on && (
                          <select
                            id={`content-date-${b.id}`}
                            aria-label={`Quando estudar ${b.name}`}
                            value={b.plannedDate && b.plannedDate >= today ? b.plannedDate : b.plannedDate ? 'late' : ''}
                            onChange={(e) => updateTopicBlock(b.id, { plannedDate: e.target.value && e.target.value !== 'late' ? e.target.value : undefined })}
                            className="shrink-0 max-w-[132px] min-h-[40px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-2 text-[12px] font-bold text-slate-800 dark:text-slate-100"
                          >
                            <option value="">{auto ? 'Automático' : 'Sem data'}</option>
                            {b.plannedDate && b.plannedDate < today && <option value="late">Atrasado ({formatDM(b.plannedDate)})</option>}
                            {dates.map((d) => (
                              <option key={d} value={d}>
                                {dayName(d)}
                              </option>
                            ))}
                          </select>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          ))}
        </div>
      </PlanModal>
      <QuickThemeModal open={quickOpen} onClose={() => setQuickOpen(false)} stacked />
    </>
  );
};
