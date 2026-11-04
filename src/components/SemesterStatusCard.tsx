import React, { useState } from 'react';
import { GraduationCap, Palmtree, ArrowRight, History, CalendarCog, RotateCcw } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { daysUntil, isVacation, nextPeriod, nextSemesterName, periodByCode, periodForDate, periodProgress, semesterBounds } from '../data/academicCalendar';
import { formatDM, ymd } from '../data/blockReview';
import { DatePickerField } from './DatePickerField';

interface SemesterStatusCardProps {
  compact?: boolean;
}

const fieldCls =
  'rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100';

// Em qual semestre o usuário está (período, progresso, férias), datas personalizáveis e virada de semestre
export const SemesterStatusCard: React.FC<SemesterStatusCardProps> = ({ compact = false }) => {
  const { currentSemester, startNextSemester, setCurrentTab, updateSemester, showNotification } = useApp();
  const [editing, setEditing] = useState(false);
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  if (!currentSemester) return null;

  const today = ymd(new Date());
  const bounds = semesterBounds(currentSemester);
  const standard = periodByCode(currentSemester.period) || periodForDate(currentSemester.startDate || today);
  const custom = !!currentSemester.customDates;
  const ended = today > bounds.end;
  // Com datas personalizadas, depois do fim já são as férias; no padrão, férias em julho
  const vacation = ended && (custom || isVacation(today));
  const upcoming = nextPeriod(standard);
  const nextName = nextSemesterName(currentSemester.name);

  const openEditor = () => {
    setStart(bounds.start);
    setEnd(bounds.end);
    setEditing(true);
  };

  const saveCustom = () => {
    if (!start || !end) return;
    if (end <= start) {
      showNotification('O fim do semestre precisa ser depois do início.', 'warning');
      return;
    }
    updateSemester(currentSemester.id, { startDate: start, endDate: end, customDates: true });
    setEditing(false);
  };

  const resetStandard = () => {
    updateSemester(currentSemester.id, { startDate: standard.start, endDate: standard.end, customDates: false });
    setEditing(false);
  };

  const confirmTurnover = () => {
    if (
      window.confirm(
        `Iniciar o ${nextName}? O ${currentSemester.name} vai para o Histórico com disciplinas, provas, questões e grade de horários. As revisões dos blocos continuam.`
      )
    ) {
      startNextSemester();
    }
  };

  const editor = editing && (
    <div id="semester-dates-editor" className="mt-3 rounded-xl border border-sky-200 dark:border-sky-900/60 bg-sky-50/60 dark:bg-sky-950/20 p-3 space-y-2.5">
      <p className="text-[11px] text-slate-600 dark:text-slate-300">
        Defina as datas do seu semestre. Depois do fim, o app considera que você está de férias. Padrão: {formatDM(standard.start)} a {formatDM(standard.end)}.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Começa em</span>
          <DatePickerField id="semester-start-date" value={start} onChange={setStart} className={fieldCls} />
        </label>
        <label className="block">
          <span className="block text-[10px] font-bold uppercase tracking-wide text-slate-500 mb-1">Termina em (férias depois)</span>
          <DatePickerField id="semester-end-date" value={end} onChange={setEnd} className={fieldCls} />
        </label>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <button
          type="button"
          onClick={resetStandard}
          className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-sky-600"
          title="Volta para 01/01–30/06 ou 01/08–31/12"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Usar o padrão
        </button>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setEditing(false)} className="px-3 py-1.5 rounded-lg text-[11px] font-bold text-slate-500 hover:bg-white/60 dark:hover:bg-slate-800">
            Cancelar
          </button>
          <button
            id="semester-dates-save"
            type="button"
            onClick={saveCustom}
            disabled={!start || !end}
            className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 disabled:opacity-40 text-white text-[11px] font-bold"
          >
            Salvar datas
          </button>
        </div>
      </div>
    </div>
  );

  const customizeButton = (
    <button
      id="semester-customize-btn"
      onClick={editing ? () => setEditing(false) : openEditor}
      className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-sky-600 dark:hover:text-sky-400"
    >
      <CalendarCog className="h-3.5 w-3.5" /> {custom ? 'Datas personalizadas' : 'Personalizar datas'}
    </button>
  );

  // Semestre terminou: férias ou já começou o próximo
  if (ended) {
    return (
      <div
        id="semester-turnover-card"
        className={`rounded-2xl border p-4 ${
          vacation ? 'border-emerald-300 dark:border-emerald-700/50 bg-emerald-50/70 dark:bg-emerald-950/30' : 'border-amber-300 dark:border-amber-600/50 bg-amber-50/70 dark:bg-amber-950/30'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl text-white ${vacation ? 'bg-emerald-500' : 'bg-amber-500'}`}>
              {vacation ? <Palmtree className="h-5 w-5" /> : <GraduationCap className="h-5 w-5" />}
            </div>
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">
                {vacation ? '🌴 Você está de férias!' : `O ${currentSemester.name} terminou em ${formatDM(bounds.end)}`}
              </p>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                {vacation
                  ? `O ${currentSemester.name} terminou em ${formatDM(bounds.end)}. Quando o próximo começar, inicie o ${nextName}.`
                  : `Comece o ${nextName} (${upcoming.code}): o semestre anterior fica guardado no Histórico.`}
              </p>
              <div className="mt-1">{customizeButton}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={() => setCurrentTab('history')} className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-white/60 dark:hover:bg-slate-800">
              <History className="h-3.5 w-3.5" /> Histórico
            </button>
            <button
              id="start-next-semester-btn"
              onClick={confirmTurnover}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-white text-xs font-bold ${vacation ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-amber-500 hover:bg-amber-600'}`}
            >
              Iniciar {nextName} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        {editor}
      </div>
    );
  }

  const notStarted = today < bounds.start;
  const progress = notStarted ? 0 : periodProgress(bounds, today);
  const left = Math.max(0, daysUntil(today, bounds.end));

  return (
    <div id="semester-status-card" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-2 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 shrink-0">
            <GraduationCap className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-slate-900 dark:text-white truncate">
              {currentSemester.name} <span className="text-sky-600 dark:text-sky-400">· {bounds.code}</span>
            </p>
            <p className="text-[11px] text-slate-500">
              {formatDM(bounds.start)} a {formatDM(bounds.end)}
              {custom ? ' (personalizado)' : ''} ·{' '}
              {notStarted ? `começa em ${daysUntil(today, bounds.start)} dias` : left === 0 ? 'último dia' : `faltam ${left} dias`}
              {!custom && bounds.half === 1 ? ' · férias em julho' : ''}
              {custom ? ' · depois disso, férias' : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {customizeButton}
          {!compact && (
            <button onClick={() => setCurrentTab('history')} className="flex items-center gap-1 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline">
              <History className="h-3.5 w-3.5" /> Histórico
            </button>
          )}
        </div>
      </div>
      <div className="mt-3 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-sky-500 to-blue-600" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-1 text-[10px] text-slate-400 text-right">{progress}% do semestre</div>
      {editor}
    </div>
  );
};
