// "Escolher o que estudar": 1) grande área → 2) disciplina → pronto. O bloco em estudo da disciplina
// entra no plano no dia escolhido (sem digitar nada). Só se a disciplina não tiver bloco em estudo, ou o
// aluno quiser outro tema, aparece o campo de texto (createPlannedTheme).
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, Check, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { addDaysYMD, formatDM } from '../../data/blockReview';
import { getMedicalArea } from '../../data/areas';
import { todayYMD } from '../../hooks/useStudyPlan';
import { DatePickerField } from '../DatePickerField';
import { OptionChip, PlanModal } from './planShared';
import type { Subject } from '../../types';

interface QuickThemeModalProps {
  open: boolean;
  onClose: () => void;
  /** Data já escolhida (ex.: um dia do "Planejar semana") */
  defaultDate?: string;
  stacked?: boolean;
}

const ALL = '__all__';

export const QuickThemeModal: React.FC<QuickThemeModalProps> = ({ open, onClose, defaultDate, stacked }) => {
  const { subjects, topicBlocks, topics, currentSubjectIds, createPlannedTheme, updateTopicBlock, showNotification, setCurrentTab } = useApp();
  const today = todayYMD();
  const tomorrow = addDaysYMD(1, today);
  const options = useMemo(() => subjects.filter((s) => currentSubjectIds.includes(s.id)), [subjects, currentSubjectIds]);

  // Grandes áreas presentes (internato/clínico). Sem área (básico): pula direto para as disciplinas.
  const areas = useMemo(() => {
    const map = new Map<string, { id: string; color: string; count: number }>();
    options.forEach((s) => {
      if (!s.majorArea) return;
      const a = getMedicalArea(s.majorArea);
      const cur = map.get(a.id) || { id: a.id, color: a.color, count: 0 };
      cur.count++;
      map.set(a.id, cur);
    });
    return Array.from(map.values());
  }, [options]);
  const useAreas = areas.length > 1;

  const [area, setArea] = useState<string | null>(null);
  const [subjectId, setSubjectId] = useState('');
  const [blockId, setBlockId] = useState<string>('');
  const [custom, setCustom] = useState(false);
  const [name, setName] = useState('');
  const [date, setDate] = useState(defaultDate || today);

  useEffect(() => {
    if (!open) return;
    setArea(useAreas ? null : ALL);
    setSubjectId('');
    setBlockId('');
    setCustom(false);
    setName('');
    setDate(defaultDate || today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const inArea = options.filter((s) => area === ALL || (s.majorArea && getMedicalArea(s.majorArea).id === area));
  const chosen = options.find((s) => s.id === subjectId);
  const studying = (sid: string) => topicBlocks.filter((b) => b.subjectId === sid && b.reviewStatus === 'estudando');
  const chosenBlocks = chosen ? studying(chosen.id) : [];

  const pickSubject = (s: Subject) => {
    setSubjectId(s.id);
    const bl = studying(s.id);
    // O bloco em estudo da disciplina é escolhido sozinho (o primeiro ainda sem data, senão o primeiro)
    const auto = bl.find((b) => !b.plannedDate) || bl[0];
    setBlockId(auto?.id || '');
    setCustom(!auto);
    setName(auto ? '' : s.universitySubject || s.name);
  };

  const dateMode = date === today ? 'hoje' : date === tomorrow ? 'amanha' : 'outra';
  const canSave = !!subjectId && !!date && (custom ? name.trim().length > 0 : !!blockId);
  const when = date === today ? 'hoje' : date === tomorrow ? 'amanhã' : formatDM(date);

  const save = () => {
    if (!canSave) return;
    if (!custom && blockId) {
      const b = topicBlocks.find((x) => x.id === blockId);
      updateTopicBlock(blockId, { plannedDate: date, paused: undefined });
      showNotification(`"${b?.name || 'Tema'}" entrou no plano de ${when}.`, 'success');
    } else {
      createPlannedTheme(subjectId, name, date);
    }
    onClose();
  };

  const stepTitle = (n: number, text: string) => (
    <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
      {n}. {text}
    </p>
  );

  return (
    <PlanModal
      id="quick-theme-modal"
      open={open}
      onClose={onClose}
      stacked={stacked}
      icon={<BookOpen className="h-5 w-5" />}
      title="O que estudar"
      subtitle={useAreas ? 'Escolha a área, depois a disciplina. O bloco em estudo entra no plano.' : 'Escolha a disciplina. O bloco em estudo entra no plano.'}
      maxWidth="max-w-md"
      footer={
        options.length > 0 && subjectId ? (
          <>
            <button type="button" onClick={onClose} className="min-h-[40px] px-4 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button
              type="button"
              id="quick-theme-save"
              disabled={!canSave}
              onClick={save}
              className="min-h-[40px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black flex items-center gap-1.5"
            >
              <Check className="h-4 w-4" /> Estudar {when}
            </button>
          </>
        ) : undefined
      }
    >
      {options.length === 0 ? (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">Primeiro cadastre as disciplinas deste semestre. Depois é só escolher.</p>
          <button
            type="button"
            onClick={() => {
              onClose();
              setCurrentTab('structure');
            }}
            className="min-h-[40px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black"
          >
            Ir para Disciplinas
          </button>
        </div>
      ) : !subjectId ? (
        <div className="space-y-4">
          {/* 1. Área */}
          {useAreas && (
            <section>
              {stepTitle(1, 'Grande área')}
              <div className="grid grid-cols-2 gap-2">
                {areas.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    id={`quick-theme-area-${a.id}`}
                    aria-pressed={area === a.id}
                    onClick={() => setArea(a.id)}
                    className={`min-h-[52px] rounded-2xl border px-3 py-2 text-left transition-colors ${
                      area === a.id
                        ? 'border-sky-500 bg-sky-50 dark:bg-sky-500/10'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 hover:border-sky-400'
                    }`}
                  >
                    <span className="flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                      {a.id}
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      {a.count} disciplina{a.count > 1 ? 's' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* 2. Disciplina */}
          {area && (
            <section>
              {stepTitle(useAreas ? 2 : 1, 'Disciplina')}
              <ul className="rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800 overflow-hidden">
                {inArea.map((s) => {
                  const bl = studying(s.id);
                  const total = topics.filter((t) => t.subjectId === s.id && !t.bonus).length;
                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        id={`quick-theme-subject-${s.id}`}
                        onClick={() => pickSubject(s)}
                        className="w-full min-h-[52px] flex items-center gap-3 px-3.5 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      >
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-bold text-slate-900 dark:text-white truncate">{s.universitySubject || s.name}</span>
                          <span className="block text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {bl.length ? `${bl.length} bloco${bl.length > 1 ? 's' : ''} em estudo` : 'Nenhum bloco em estudo'}
                            {total ? ` · ${total} tópicos` : ''}
                          </span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                      </button>
                    </li>
                  );
                })}
                {inArea.length === 0 && <li className="px-3.5 py-3 text-sm text-slate-500 dark:text-slate-400">Nenhuma disciplina nesta área.</li>}
              </ul>
            </section>
          )}
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <button
            type="button"
            id="quick-theme-back"
            onClick={() => setSubjectId('')}
            className="h-11 inline-flex items-center gap-2 px-4 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-white hover:bg-slate-200 dark:hover:bg-slate-700 text-sm font-black transition-colors"
          >
            <ArrowLeft className="h-5 w-5" /> Trocar disciplina
          </button>
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 px-3.5 py-3 flex items-center gap-2.5">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: chosen?.color }} />
            <div className="min-w-0">
              <p className="text-sm font-black text-slate-900 dark:text-white truncate">{chosen?.universitySubject || chosen?.name}</p>
              {chosen?.majorArea && <p className="text-[11px] text-slate-500 dark:text-slate-400">{getMedicalArea(chosen.majorArea).id}</p>}
            </div>
          </div>

          {/* O bloco: escolhido sozinho; só aparece escolha se houver mais de um */}
          {chosenBlocks.length > 1 && !custom && (
            <section>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Bloco</p>
              <div className="flex flex-wrap gap-1.5">
                {chosenBlocks.map((b) => (
                  <OptionChip key={b.id} id={`quick-theme-block-${b.id}`} active={blockId === b.id} onClick={() => setBlockId(b.id)}>
                    {b.name}
                    {b.plannedDate ? ` · ${formatDM(b.plannedDate)}` : ''}
                  </OptionChip>
                ))}
              </div>
            </section>
          )}
          {chosenBlocks.length === 1 && !custom && (
            <p className="text-[13px] text-slate-700 dark:text-slate-200">
              Vai estudar: <b>{chosenBlocks[0].name}</b>
            </p>
          )}

          {custom ? (
            <div>
              <label htmlFor="quick-theme-name" className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
                Tema
              </label>
              <input
                id="quick-theme-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Insuficiência cardíaca"
                maxLength={90}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400"
              />
              {chosenBlocks.length > 0 && (
                <button type="button" onClick={() => setCustom(false)} className="mt-1 text-[11px] font-bold text-sky-700 dark:text-sky-400 hover:underline">
                  Usar o bloco em estudo
                </button>
              )}
            </div>
          ) : (
            <button type="button" id="quick-theme-custom" onClick={() => setCustom(true)} className="min-h-[36px] inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:underline">
              <Plus className="h-3.5 w-3.5" /> Outro tema desta disciplina
            </button>
          )}

          <div>
            <span className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Quando</span>
            <div className="flex flex-wrap items-center gap-1.5">
              <OptionChip id="quick-theme-today" active={dateMode === 'hoje'} onClick={() => setDate(today)}>
                Hoje
              </OptionChip>
              <OptionChip id="quick-theme-tomorrow" active={dateMode === 'amanha'} onClick={() => setDate(tomorrow)}>
                Amanhã
              </OptionChip>
              <DatePickerField
                id="quick-theme-date"
                value={dateMode === 'outra' ? date : ''}
                onChange={(v) => v && setDate(v)}
                placeholder={dateMode === 'outra' ? formatDM(date) : 'Outra data…'}
                className={`min-h-[40px] rounded-xl border px-3 text-xs font-bold ${
                  dateMode === 'outra'
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
                }`}
              />
            </div>
          </div>
        </form>
      )}
    </PlanModal>
  );
};
