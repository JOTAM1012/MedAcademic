import React from 'react';
import { GraduationCap, Check, Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { MEDICAL_CYCLES } from './ProfileCreationPage';
import { periodForDate, semesterBounds } from '../data/academicCalendar';
import { ymd } from '../data/blockReview';
import { Semester } from '../types';

const semNumber = (s: Semester) => {
  const m = s.name.match(/^\s*(\d{1,2})\s*[º°o]/i);
  return m ? Number(m[1]) : undefined;
};

const CYCLE_STYLE: Record<string, { ring: string; chip: string; dot: string }> = {
  ciclo_basico: { ring: 'border-emerald-500/60 bg-emerald-500/10', chip: 'text-emerald-600 dark:text-emerald-300', dot: 'bg-emerald-500' },
  ciclo_clinico: { ring: 'border-sky-500/60 bg-sky-500/10', chip: 'text-sky-600 dark:text-sky-300', dot: 'bg-sky-500' },
  internato: { ring: 'border-violet-500/60 bg-violet-500/10', chip: 'text-violet-600 dark:text-violet-300', dot: 'bg-violet-500' },
};

// Trocar de ciclo/semestre no Perfil: cada semestre tem suas próprias disciplinas, provas e grade de horários
export const SemesterSwitcher: React.FC = () => {
  const { semesters, currentSemester, setCurrentSemesterId, addSemester, subjects, exams, schedule, showNotification } = useApp();

  const byNumber = new Map<number, Semester>();
  // prioriza o atual quando houver dois com o mesmo número
  [...semesters].sort((a) => (a.id === currentSemester?.id ? 1 : -1)).forEach((s) => {
    const n = semNumber(s);
    if (n) byNumber.set(n, s);
  });

  const countsFor = (id: string) => ({
    subjects: subjects.filter((x) => x.semesterId === id).length,
    exams: exams.filter((x) => x.semesterId === id).length,
    classes: schedule.filter((x) => x.semesterId === id).length,
  });

  const switchTo = (n: number, cycleTitle: string) => {
    const existing = byNumber.get(n);
    if (existing) {
      if (existing.id === currentSemester?.id) return;
      setCurrentSemesterId(existing.id);
      showNotification(`Agora você está no ${existing.name}. Disciplinas, provas e grade de horários são deste semestre.`, 'success');
      return;
    }
    // Semestre ainda não criado: cria no período atual (as datas podem ser personalizadas depois)
    const base = currentSemester ? semesterBounds(currentSemester) : periodForDate(ymd(new Date()));
    const id = addSemester({
      name: `${n}º Semestre - ${cycleTitle}`,
      code: base.code,
      period: base.code,
      startDate: base.start,
      endDate: base.end,
      isCurrent: true,
      targetHoursWeekly: currentSemester?.targetHoursWeekly || 30,
    });
    setCurrentSemesterId(id);
  };

  const currentN = currentSemester ? semNumber(currentSemester) : undefined;

  return (
    <div id="semester-switcher" className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-sky-500" />
          <div>
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Ciclo acadêmico e semestre</h3>
            <p className="text-xs text-slate-500">Troque de semestre para ver e editar as ferramentas de cada um (disciplinas, provas, grade de horários e revisões).</p>
          </div>
        </div>
        {currentSemester && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/30">
            Atual: {currentSemester.name}
          </span>
        )}
      </div>

      <div className="space-y-4">
        {MEDICAL_CYCLES.map((cycle) => {
          const st = CYCLE_STYLE[cycle.id];
          const inCycle = currentN !== undefined && cycle.semesters.some((s) => s.number === currentN);
          return (
            <div key={cycle.id}>
              <p className={`text-[11px] font-black uppercase tracking-widest mb-2 flex items-center gap-1.5 ${st.chip}`}>
                <span className={`h-2 w-2 rounded-full ${st.dot}`} /> {cycle.title}
                {inCycle && <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-slate-900/80 dark:bg-white/10 text-white normal-case tracking-normal">você está aqui</span>}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {cycle.semesters.map((opt) => {
                  const sem = byNumber.get(opt.number);
                  const active = !!sem && sem.id === currentSemester?.id;
                  const c = sem ? countsFor(sem.id) : undefined;
                  return (
                    <button
                      key={opt.number}
                      id={`switch-sem-${opt.number}`}
                      onClick={() => switchTo(opt.number, cycle.title)}
                      className={`relative text-left rounded-2xl border p-3 transition-all ${
                        active
                          ? `${st.ring} ring-2 ring-offset-0 ring-sky-500/30`
                          : sem
                          ? 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 hover:border-slate-400 dark:hover:border-slate-500'
                          : 'border-dashed border-slate-200 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className={`text-xs font-black ${active ? 'text-slate-900 dark:text-white' : sem ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>
                          {opt.label}
                        </span>
                        {active ? (
                          <span className="h-5 w-5 rounded-full bg-sky-500 text-white flex items-center justify-center">
                            <Check className="h-3 w-3" />
                          </span>
                        ) : !sem ? (
                          <Plus className="h-3.5 w-3.5 text-slate-400" />
                        ) : null}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">{opt.yearLabel}</p>
                      <p className="text-[10px] mt-1.5 font-semibold text-slate-500 dark:text-slate-400">
                        {c ? `${c.subjects} disc. · ${c.exams} provas · ${c.classes} aulas` : 'Criar e abrir'}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
