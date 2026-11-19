// "Escolher o que estudar": 1) grande área → 2) disciplina → pronto. O bloco em estudo da disciplina
// entra no plano no dia escolhido (sem digitar nada). Só se a disciplina não tiver bloco em estudo, ou o
// aluno quiser outro tema, aparece o campo de texto (createPlannedTheme).
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BookOpen, CalendarDays, Check, ChevronRight, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { addDaysYMD, formatDM } from '../../data/blockReview';
import { getMedicalArea } from '../../data/areas';
import { todayYMD } from '../../hooks/useStudyPlan';
import { DatePickerField } from '../DatePickerField';
import { OptionChip, PlanModal } from './planShared';
import type { DayPlanState, Subject } from '../../types';

interface QuickThemeModalProps {
  open: boolean;
  onClose: () => void;
  /** Data já escolhida (ex.: um dia do "Planejar semana") */
  defaultDate?: string;
  stacked?: boolean;
  /** 1º passo por grande área (padrão) ou por módulo da faculdade */
  by?: 'area' | 'module';
}

const ALL = '__all__';

export const QuickThemeModal: React.FC<QuickThemeModalProps> = ({ open, onClose, defaultDate, stacked, by = 'area' }) => {
  const { subjects, topicBlocks, topics, currentSubjectIds, createPlannedTheme, updateTopicBlock, showNotification, setCurrentTab, setDayPlanState, studyMethod } = useApp();
  const today = todayYMD();
  const tomorrow = addDaysYMD(1, today);
  const options = useMemo(() => subjects.filter((s) => currentSubjectIds.includes(s.id)), [subjects, currentSubjectIds]);

  // Grupos do 1º passo: grandes áreas (padrão) ou módulos da faculdade (by="module").
  // Sem área (básico): pula direto para as disciplinas.
  const areas = useMemo(() => {
    if (by === 'module') {
      return options
        .filter((s) => s.kind === 'module')
        .map((m) => {
          // o próprio módulo (assuntos dele) + as disciplinas vinculadas
          const members = [m, ...options.filter((s) => s.id !== m.id && (m.linkedSubjectIds || []).includes(s.id))];
          return { id: m.id, label: m.universitySubject || m.name, color: m.color, count: members.length, members };
        });
    }
    const map = new Map<string, { id: string; label: string; color: string; count: number; members: Subject[] }>();
    options.forEach((s) => {
      if (!s.majorArea) return;
      const a = getMedicalArea(s.majorArea);
      const cur = map.get(a.id) || { id: a.id, label: a.id, color: a.color, count: 0, members: [] };
      cur.count++;
      cur.members.push(s);
      map.set(a.id, cur);
    });
    return Array.from(map.values());
  }, [options, by]);
  const useAreas = by === 'module' ? areas.length > 0 : areas.length > 1;
  const groupWord = by === 'module' ? 'Módulo' : 'Grande área';

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

  const inArea = area === ALL ? options : areas.find((g) => g.id === area)?.members || [];
  const chosen = options.find((s) => s.id === subjectId);
  const studying = (sid: string) => topicBlocks.filter((b) => b.subjectId === sid && b.reviewStatus === 'estudando');
  const chosenBlocks = chosen ? studying(chosen.id) : [];
  // Tópicos do bloco escolhido (não vistos primeiro); se o bloco não tiver, os soltos da disciplina
  const [topicIds, setTopicIds] = useState<string[]>([]);
  // Ao trocar de bloco ou de dia: começa com o que já estava escolhido para esse dia (para editar, não sobrescrever)
  const [repeatIds, setRepeatIds] = useState<string[]>([]);
  useEffect(() => {
    setTopicIds(blockId ? studyMethod.dayPlans[date]?.detail?.[`new:${blockId}`]?.topicIds || [] : []);
    setRepeatIds([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockId, date]);
  // Em que outros dias (de hoje em diante) cada tópico deste bloco já está no plano
  const plannedOn = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!blockId) return map;
    (Object.entries(studyMethod.dayPlans || {}) as Array<[string, DayPlanState]>).forEach(([d, s]) => {
      if (d === date || d < today) return;
      if (!(s.accepted || []).includes(`new:${blockId}`) && topicBlocks.find((b) => b.id === blockId)?.plannedDate !== d) return;
      (s.detail?.[`new:${blockId}`]?.topicIds || []).forEach((id) => map.set(id, [...(map.get(id) || []), d].sort()));
    });
    return map;
  }, [studyMethod.dayPlans, blockId, date, today, topicBlocks]);
  const blockTopics = useMemo(() => {
    if (!blockId) return [];
    let list = topics.filter((t) => t.blockId === blockId && !t.bonus);
    if (!list.length && chosen) list = topics.filter((t) => t.subjectId === chosen.id && !t.blockId && !t.bonus);
    return [...list].sort((a, b) => Number(a.status !== 'nao_iniciado') - Number(b.status !== 'nao_iniciado'));
  }, [topics, blockId, chosen]);
  const unseenTopics = blockTopics.filter((t) => t.status === 'nao_iniciado');

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
      // O mesmo tema pode ir para vários dias (ex.: MFC amanhã com Tuberculose e na sexta com Hanseníase):
      // ele entra no dia escolhido sem sair dos outros; a data do tema só muda se ainda não tiver uma (ou já passou)
      if (b && (!b.plannedDate || b.plannedDate < today)) updateTopicBlock(blockId, { plannedDate: date, paused: undefined });
      else if (b?.paused) updateTopicBlock(blockId, { paused: undefined });
      // tópicos escolhidos: vão para o passo a passo do tema no dia (mesmo lugar do modo Detalhado)
      const key = `new:${blockId}`;
      setDayPlanState(date, (d) => {
        const detail = { ...(d.detail || {}) };
        const cur = { ...(detail[key] || {}) };
        if (topicIds.length) cur.topicIds = topicIds;
        else delete cur.topicIds;
        if (Object.keys(cur).length) detail[key] = cur;
        else delete detail[key];
        return {
          ...d,
          accepted: Array.from(new Set([...(d.accepted || []), key])),
          dismissed: (d.dismissed || []).filter((x) => x !== key),
          skipped: (d.skipped || []).filter((x) => x !== key),
          detail: Object.keys(detail).length ? detail : undefined,
        };
      });
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
      subtitle={useAreas ? `Escolha ${by === 'module' ? 'o módulo' : 'a área'}, depois a disciplina. O bloco em estudo entra no plano.` : 'Escolha a disciplina. O bloco em estudo entra no plano.'}
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
              {stepTitle(1, groupWord)}
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
                      <span className="truncate">{a.label}</span>
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
                {inArea.length === 0 && <li className="px-3.5 py-3 text-sm text-slate-500 dark:text-slate-400">{by === 'module' ? 'Nada neste módulo ainda.' : 'Nenhuma disciplina nesta área.'}</li>}
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

          {/* Tópicos específicos (opcional): sem marcar nada = o bloco todo */}
          {!custom && blockId && blockTopics.length > 0 && (
            <section id="quick-theme-topics">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <p className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">Tópicos {date === today ? 'de hoje' : `de ${formatDM(date)}`} (opcional)</p>
                <span className="flex gap-2">
                  {unseenTopics.length > 0 && (
                    <button type="button" id="quick-theme-topics-unseen" onClick={() => setTopicIds(unseenTopics.map((t) => t.id))} className="text-[11px] font-bold text-sky-700 dark:text-sky-400 hover:underline">
                      Não vistos
                    </button>
                  )}
                  {topicIds.length > 0 && (
                    <button type="button" id="quick-theme-topics-clear" onClick={() => setTopicIds([])} className="text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:underline">
                      Limpar
                    </button>
                  )}
                </span>
              </div>
              <ul className="max-h-56 overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-100 dark:divide-slate-800">
                {blockTopics.map((t) => {
                  const on = topicIds.includes(t.id);
                  const seen = t.status !== 'nao_iniciado';
                  const other = plannedOn.get(t.id) || [];
                  // já está em outro dia: fica travado até o aluno tocar em "Repetir"
                  const locked = other.length > 0 && !on && !repeatIds.includes(t.id);
                  return (
                    <li key={t.id} className="flex items-center">
                      <button
                        type="button"
                        id={`quick-theme-topic-${t.id}`}
                        aria-pressed={on}
                        aria-disabled={locked}
                        title={locked ? `Já está no plano de ${other.map(formatDM).join(', ')}. Toque em "Repetir" para pôr de novo.` : undefined}
                        onClick={() => {
                          if (locked) return;
                          setTopicIds((ids) => (ids.includes(t.id) ? ids.filter((x) => x !== t.id) : [...ids, t.id]));
                        }}
                        className={`min-w-0 flex-1 min-h-[44px] flex items-center gap-2.5 px-3 py-2 text-left ${locked ? 'cursor-default opacity-70' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                      >
                        <span className={`h-5 w-5 shrink-0 rounded-md border flex items-center justify-center ${on ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                          {on && <Check className="h-3.5 w-3.5" />}
                        </span>
                        <span className={`min-w-0 flex-1 text-[13px] font-bold truncate ${seen ? 'text-slate-400 dark:text-slate-500' : 'text-slate-900 dark:text-white'}`}>{t.title}</span>
                        {seen && <span className="shrink-0 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">visto</span>}
                        {other.length > 0 && (
                          <span id={`quick-theme-topic-date-${t.id}`} className="shrink-0 inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:text-amber-300">
                            <CalendarDays className="h-3 w-3" />
                            {other.slice(0, 2).map(formatDM).join(', ')}
                            {other.length > 2 ? ` +${other.length - 2}` : ''}
                          </span>
                        )}
                      </button>
                      {locked && (
                        <button
                          type="button"
                          id={`quick-theme-topic-repeat-${t.id}`}
                          onClick={() => {
                            setRepeatIds((r) => [...r, t.id]);
                            setTopicIds((ids) => [...ids, t.id]);
                          }}
                          className="shrink-0 mr-2 min-h-[32px] px-2.5 rounded-lg border border-slate-200 dark:border-slate-700 text-[11px] font-bold text-sky-700 dark:text-sky-300 hover:border-sky-400"
                        >
                          Repetir
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                {topicIds.length ? `${topicIds.length} tópico${topicIds.length > 1 ? 's' : ''} escolhido${topicIds.length > 1 ? 's' : ''}. Eles aparecem no passo a passo do tema.` : 'Sem marcar nada, entra o bloco todo.'}
              </p>
            </section>
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
