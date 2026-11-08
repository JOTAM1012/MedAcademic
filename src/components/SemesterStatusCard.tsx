import React, { useState } from 'react';
import { GraduationCap, Palmtree, ArrowRight, History, CalendarCog, RotateCcw, CalendarDays } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { daysUntil, isVacation, nextPeriod, nextSemesterName, periodByCode, periodForDate, periodProgress, semesterBounds } from '../data/academicCalendar';
import { formatDM, ymd } from '../data/blockReview';
import { getActivityCategory, occursOn } from '../data/planning';
import { DatePickerField } from './DatePickerField';

interface SemesterStatusCardProps {
  compact?: boolean;
  /** Cartão do Painel: % do semestre em destaque, dias que faltam, o que tem hoje na grade e "Ver semestre" */
  variant?: 'default' | 'widget';
}

const fieldCls =
  'rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100';

// Em qual semestre o usuário está (período, progresso, férias), datas personalizáveis e virada de semestre
export const SemesterStatusCard: React.FC<SemesterStatusCardProps> = ({ compact = false, variant = 'default' }) => {
  const { currentSemester, startNextSemester, setCurrentTab, updateSemester, showNotification, schedule } = useApp();
  const [editing, setEditing] = useState(false);
  const [confirmingTurnover, setConfirmingTurnover] = useState(false);
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

  // Confirmação inline (sem janela do navegador)
  const confirmTurnover = () => setConfirmingTurnover(true);
  const turnoverConfirm = confirmingTurnover && (
    <div id="semester-turnover-confirm" className="mt-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-3">
      <p className="text-xs text-slate-700 dark:text-slate-200">
        Iniciar o {nextName}? O {currentSemester.name} vai para o Histórico com disciplinas, provas, questões e grade de horários. As revisões dos blocos continuam.
      </p>
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={() => setConfirmingTurnover(false)} className="min-h-[40px] px-3 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
          Agora não
        </button>
        <button
          type="button"
          id="semester-turnover-confirm-yes"
          onClick={() => {
            setConfirmingTurnover(false);
            startNextSemester();
          }}
          className="min-h-[40px] px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
        >
          Sim, iniciar
        </button>
      </div>
    </div>
  );

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
        {turnoverConfirm}
        {editor}
      </div>
    );
  }

  const notStarted = today < bounds.start;
  const progress = notStarted ? 0 : periodProgress(bounds, today);
  const left = Math.max(0, daysUntil(today, bounds.end));

  if (variant === 'widget') {
    const now = new Date();
    const dow = now.getDay() === 0 ? 7 : now.getDay();
    const todays = schedule.filter((sc) => occursOn(sc, today, dow)).sort((a, b) => a.startTime.localeCompare(b.startTime));
    return (
      <section id="semester-status-card" className="h-full min-w-0 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs p-4 sm:p-5 flex flex-col gap-3">
        <header className="flex items-center justify-between gap-2 min-h-[32px]">
          <h3 className="min-w-0 text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <GraduationCap className="h-4 w-4 shrink-0 text-sky-500" />
            <span className="truncate">
              {currentSemester.name} <span className="text-slate-400 dark:text-slate-500 font-bold">· {bounds.code}</span>
            </span>
          </h3>
          <button
            type="button"
            id="dash-semester-open"
            onClick={() => setCurrentTab('semester')}
            className="shrink-0 min-h-[40px] -my-1.5 -mr-2 px-2 rounded-xl text-xs font-bold text-sky-700 dark:text-sky-300 hover:bg-sky-50 dark:hover:bg-sky-950/40 inline-flex items-center gap-1"
          >
            Ver semestre <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </header>
        <div className="flex items-end justify-between gap-3">
          <p className="text-3xl font-black leading-none text-slate-900 dark:text-white">
            {progress}
            <span className="text-lg text-slate-400 dark:text-slate-500">%</span>
          </p>
          <p className="pb-0.5 text-right text-[11px] font-bold text-slate-600 dark:text-slate-300">
            {notStarted ? `começa em ${daysUntil(today, bounds.start)} dias` : left === 0 ? 'último dia' : `faltam ${left} dias`}
          </p>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
          <div className="h-full rounded-full bg-sky-500" style={{ width: `${progress}%` }} />
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          {formatDM(bounds.start)} a {formatDM(bounds.end)}
          {custom ? ' (suas datas)' : bounds.half === 1 ? ' · férias em julho' : ''}
        </p>
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
            <CalendarDays className="h-3.5 w-3.5" /> Hoje na grade
          </p>
          {todays.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500">Nada na grade hoje.</p>
          ) : (
            <ul className="space-y-1">
              {todays.slice(0, 3).map((sc) => {
                const cat = getActivityCategory(sc);
                return (
                  <li key={sc.id} className="flex items-center gap-2 min-w-0 text-xs">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: sc.color || cat.color }} />
                    <span className="min-w-0 flex-1 truncate font-bold text-slate-700 dark:text-slate-200">{sc.title || cat.label}</span>
                    <span className="shrink-0 font-mono text-[11px] text-slate-500 dark:text-slate-400">{sc.startTime}</span>
                  </li>
                );
              })}
              {todays.length > 3 && <li className="text-[11px] text-slate-400 dark:text-slate-500">+ {todays.length - 3} atividades</li>}
            </ul>
          )}
        </div>
      </section>
    );
  }

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
