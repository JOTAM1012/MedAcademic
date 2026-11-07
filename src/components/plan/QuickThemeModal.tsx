// "Escolher o tema de hoje": disciplina do semestre + nome do tema + data → createPlannedTheme.
import React, { useEffect, useMemo, useState } from 'react';
import { BookOpen, Check } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { addDaysYMD, formatDM } from '../../data/blockReview';
import { todayYMD } from '../../hooks/useStudyPlan';
import { DatePickerField } from '../DatePickerField';
import { OptionChip, PlanModal } from './planShared';

interface QuickThemeModalProps {
  open: boolean;
  onClose: () => void;
  /** Data já escolhida (ex.: um dia do "Planejar semana") */
  defaultDate?: string;
  stacked?: boolean;
}

export const QuickThemeModal: React.FC<QuickThemeModalProps> = ({ open, onClose, defaultDate, stacked }) => {
  const { subjects, currentSubjectIds, createPlannedTheme, setCurrentTab } = useApp();
  const today = todayYMD();
  const tomorrow = addDaysYMD(1, today);
  const options = useMemo(() => subjects.filter((s) => currentSubjectIds.includes(s.id)), [subjects, currentSubjectIds]);

  const [subjectId, setSubjectId] = useState('');
  const [name, setName] = useState('');
  const [date, setDate] = useState(defaultDate || today);

  useEffect(() => {
    if (!open) return;
    setName('');
    setDate(defaultDate || today);
    setSubjectId((prev) => (prev && options.some((s) => s.id === prev) ? prev : options[0]?.id || ''));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const dateMode = date === today ? 'hoje' : date === tomorrow ? 'amanha' : 'outra';
  const canSave = !!subjectId && name.trim().length > 0 && !!date;
  const chosen = options.find((s) => s.id === subjectId);

  const save = () => {
    if (!canSave) return;
    createPlannedTheme(subjectId, name, date);
    onClose();
  };

  return (
    <PlanModal
      id="quick-theme-modal"
      open={open}
      onClose={onClose}
      stacked={stacked}
      icon={<BookOpen className="h-5 w-5" />}
      title="Escolher um tema para estudar"
      subtitle="Um tema por vez. Ele entra no seu plano no dia escolhido, com o passo a passo do estudo inicial."
      maxWidth="max-w-md"
      footer={
        options.length > 0 ? (
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
              <Check className="h-4 w-4" /> Colocar no plano
            </button>
          </>
        ) : undefined
      }
    >
      {options.length === 0 ? (
        <div className="text-center py-4 space-y-3">
          <p className="text-sm text-slate-600 dark:text-slate-300">Primeiro cadastre as disciplinas deste semestre. Depois é só escolher o tema.</p>
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
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <div>
            <label htmlFor="quick-theme-subject" className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Disciplina
            </label>
            <div className="relative">
              {chosen && <span className="absolute left-3 top-1/2 -translate-y-1/2 h-2.5 w-2.5 rounded-full" style={{ backgroundColor: chosen.color }} />}
              <select
                id="quick-theme-subject"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 pl-8 pr-3 text-sm font-bold text-slate-900 dark:text-white"
              >
                {options.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.universitySubject || s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="quick-theme-name" className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
              Tema
            </label>
            <input
              id="quick-theme-name"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Insuficiência cardíaca"
              maxLength={90}
              className="w-full min-h-[44px] rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500"
            />
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Dica: um tema que caiba em 1 a 2 horas de estudo.</p>
          </div>

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
