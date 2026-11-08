import React, { useEffect, useState } from 'react';
import { X, GraduationCap, Target, Award, Plus, ChevronDown, ListChecks } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DatePickerField } from '../DatePickerField';
import { Exam, ExamLink, ExamShift, ExamTaskKind, ExamTopic } from '../../types';
import { EXAM_KINDS, EXAM_SHIFTS, SHIFT_DEFAULT_TIMES, examFormat, shiftFromTime } from '../../data/planning';
import { DEFAULT_EXAM_TASKS, examTaskKinds } from '../../data/examTopics';
import { ymd } from '../../data/blockReview';
import { ExamSubjectPicker } from '../semester/ExamSubjectPicker';
import { ExamTopicsEditor } from '../semester/ExamTopicsEditor';
import { ExamWithEnd, examEndTime } from '../semester/semesterUtils';

interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Prova a editar (sem ela, cria uma nova) */
  editingExam?: Exam | null;
  defaultDate?: string;
  defaultSubjectName?: string;
  /** abre já rolado até "Resultado" */
  focusResult?: boolean;
  /** abre já em "Assuntos da prova" */
  focusTopics?: boolean;
}

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500';
const labelCls = 'block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wide';
const ghostBtn =
  'min-h-10 px-3 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-sky-600 hover:border-sky-400 flex items-center gap-1';

const parseNum = (raw: string) => {
  if (raw.trim() === '') return undefined;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

/** Vínculo da prova (provas antigas: nome livre ou disciplina cadastrada) */
const linkOf = (ex: Exam, subjects: { id: string; name: string; universitySubject?: string }[]): ExamLink | undefined => {
  if (ex.link) return ex.link;
  if (ex.subjectName?.trim()) return { kind: 'manual', label: ex.subjectName.trim() };
  const s = ex.subjectId ? subjects.find((x) => x.id === ex.subjectId) : undefined;
  return s ? { kind: 'subject', id: s.id, label: s.name } : undefined;
};

export const AddExamModal: React.FC<AddExamModalProps> = ({
  isOpen,
  onClose,
  editingExam,
  defaultDate,
  defaultSubjectName,
  focusResult,
  focusTopics,
}) => {
  const { subjects, addExam, updateExam, showNotification, currentSemester } = useApp();

  const [link, setLink] = useState<ExamLink | undefined>();
  const [type, setType] = useState<string>(EXAM_KINDS[0].id);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [shift, setShift] = useState<ExamShift | undefined>();
  const [showTimes, setShowTimes] = useState(false);
  const [location, setLocation] = useState('');
  const [showLocation, setShowLocation] = useState(false);
  const [weight, setWeight] = useState('1');
  const [showWeight, setShowWeight] = useState(false);
  const [maxGrade, setMaxGrade] = useState('10');
  const [expected, setExpected] = useState('');
  const [grade, setGrade] = useState('');
  const [totalQ, setTotalQ] = useState('');
  const [minCorrect, setMinCorrect] = useState('');
  const [correctAns, setCorrectAns] = useState('');
  const [objQ, setObjQ] = useState('');
  const [writtenQ, setWrittenQ] = useState('');
  const [writtenMax, setWrittenMax] = useState('');
  const [objCorrect, setObjCorrect] = useState('');
  const [writtenEarned, setWrittenEarned] = useState('');
  const [notes, setNotes] = useState('');
  const [showNotes, setShowNotes] = useState(false);
  const [topicsOpen, setTopicsOpen] = useState(false);
  const [examTopics, setExamTopics] = useState<ExamTopic[]>([]);
  const [topicTasks, setTopicTasks] = useState<ExamTaskKind[]>(DEFAULT_EXAM_TASKS);
  const [remindersOff, setRemindersOff] = useState(false);

  useEffect(() => {
    if (!isOpen || !(focusResult || focusTopics)) return;
    const t = window.setTimeout(() => {
      const sec = document.getElementById(focusResult ? 'exam-result-section' : 'exam-topics-section');
      sec?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      if (focusResult) (sec?.querySelector('input') as HTMLInputElement | null)?.focus({ preventScroll: true });
    }, 250);
    return () => window.clearTimeout(t);
  }, [isOpen, focusResult, focusTopics]);

  // Preenche o formulário sempre que abre (nova prova ou edição)
  useEffect(() => {
    if (!isOpen) return;
    const ex = editingExam;
    setLink(ex ? linkOf(ex, subjects) : defaultSubjectName ? { kind: 'manual', label: defaultSubjectName } : undefined);
    setType(ex?.type || EXAM_KINDS[0].id);
    // Título automático antigo ("Prova Escrita · Cardiologia") não é nome dado pelo aluno
    const auto = ex && (ex.title === `${ex.type} · ${ex.subjectName || ''}` || ex.title === ex.subjectName);
    setTitle(ex && !auto ? ex.title : '');
    setDate(ex?.date || defaultDate || '');
    const sh = ex?.shift || shiftFromTime(ex?.time);
    setShift(sh);
    setTime(ex?.time || '');
    setEndTime(ex ? examEndTime(ex) || '' : '');
    // horário fora do padrão do turno: já mostra "começa/termina"
    setShowTimes(!!ex?.time && (!sh || ex.time !== SHIFT_DEFAULT_TIMES[sh].start || (!!examEndTime(ex) && examEndTime(ex) !== SHIFT_DEFAULT_TIMES[sh].end)));
    setLocation(ex?.location || '');
    setShowLocation(!!ex?.location);
    setWeight(String(ex?.weight ?? 1));
    setShowWeight(!!ex && ex.weight !== 1);
    setMaxGrade(String(ex?.maxGrade ?? 10));
    setExpected(ex?.expectedGrade !== undefined ? String(ex.expectedGrade) : '');
    setGrade(ex?.grade !== undefined ? String(ex.grade) : '');
    const str = (n?: number) => (n !== undefined ? String(n) : '');
    setTotalQ(str(ex?.totalQuestions));
    setMinCorrect(str(ex?.minCorrect));
    setCorrectAns(str(ex?.correctAnswers));
    setObjQ(str(ex?.objectiveQuestions));
    setWrittenQ(str(ex?.writtenQuestions));
    setWrittenMax(str(ex?.writtenPointsMax));
    setObjCorrect(str(ex?.objectiveCorrect));
    setWrittenEarned(str(ex?.writtenPointsEarned));
    setNotes(ex?.notes || '');
    setShowNotes(!!ex?.notes);
    setExamTopics(ex?.examTopics || []);
    setTopicTasks(ex ? examTaskKinds(ex) : DEFAULT_EXAM_TASKS);
    setRemindersOff(!!ex?.remindersOff);
    setTopicsOpen(!!focusTopics || (ex?.examTopics || []).length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, editingExam, defaultDate, defaultSubjectName, focusTopics]);

  if (!isOpen) return null;

  const today = ymd(new Date());
  // Resultado só depois da prova: ao editar uma prova que já passou, pelo "Lançar resultado" ou se já tem nota
  const showResult = !!editingExam && ((!!date && date <= today) || !!focusResult || editingExam.grade !== undefined);

  const pickShift = (id: ExamShift) => {
    if (shift === id) {
      setShift(undefined);
      setTime('');
      setEndTime('');
      return;
    }
    setShift(id);
    setTime(SHIFT_DEFAULT_TIMES[id].start);
    setEndTime(SHIFT_DEFAULT_TIMES[id].end);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = (link?.label || '').trim();
    if (!name || !date) {
      showNotification('Informe a disciplina e a data da prova.', 'warning');
      return;
    }
    if (time && endTime && endTime <= time) {
      showNotification('O término precisa ser depois do começo.', 'warning');
      return;
    }
    const max = parseNum(maxGrade) || 10;
    const expectedGrade = parseNum(expected);
    const released = showResult ? parseNum(grade) : editingExam?.grade;
    if ([expectedGrade, released].some((g) => g !== undefined && (g < 0 || g > max))) {
      showNotification(`As notas devem ficar entre 0 e ${max}.`, 'warning');
      return;
    }

    const fmt = examFormat(type);
    const total = parseNum(totalQ);
    const objTotal = parseNum(objQ);
    const wMax = parseNum(writtenMax);
    if (fmt === 'questions' && total !== undefined) {
      if ((parseNum(correctAns) ?? 0) > total || (parseNum(minCorrect) ?? 0) > total) {
        showNotification(`Os acertos não podem passar de ${total} questões.`, 'warning');
        return;
      }
    }
    if (fmt === 'mixed') {
      if (objTotal !== undefined && (parseNum(objCorrect) ?? 0) > objTotal) {
        showNotification(`Os acertos não podem passar de ${objTotal} questões objetivas.`, 'warning');
        return;
      }
      if (wMax !== undefined && ((parseNum(writtenEarned) ?? 0) > wMax || wMax > max)) {
        showNotification('Confira a pontuação das discursivas.', 'warning');
        return;
      }
    }
    // Sem a seção de resultado na tela, os valores salvos continuam como estavam
    const res = (draft: string, saved?: number) => (showResult ? parseNum(draft) : saved);
    const cleanLink: ExamLink = { ...link!, label: name };

    const payload: Partial<ExamWithEnd> = {
      totalQuestions: fmt === 'questions' ? total : undefined,
      minCorrect: fmt === 'questions' ? parseNum(minCorrect) : undefined,
      correctAnswers: fmt === 'questions' ? res(correctAns, editingExam?.correctAnswers) : undefined,
      objectiveQuestions: fmt === 'mixed' ? objTotal : undefined,
      writtenQuestions: fmt === 'mixed' ? parseNum(writtenQ) : undefined,
      writtenPointsMax: fmt === 'mixed' ? wMax : undefined,
      objectiveCorrect: fmt === 'mixed' ? res(objCorrect, editingExam?.objectiveCorrect) : undefined,
      writtenPointsEarned: fmt === 'mixed' ? res(writtenEarned, editingExam?.writtenPointsEarned) : undefined,
      subjectName: name,
      link: cleanLink,
      subjectId: cleanLink.kind === 'subject' ? cleanLink.id : editingExam?.subjectId,
      // Sem nome próprio, a prova leva o nome da disciplina (o resto do site lê `title`)
      title: title.trim() || name,
      type,
      date,
      time: time || undefined,
      endTime: time && endTime ? endTime : undefined,
      shift: shift || shiftFromTime(time),
      location: location.trim() || undefined,
      weight: parseNum(weight) || 1,
      maxGrade: max,
      expectedGrade,
      grade: released,
      notes: notes.trim() || undefined,
      examTopics: examTopics.length ? examTopics : undefined,
      topicTasks,
      remindersOff: remindersOff || undefined,
    };

    if (editingExam) {
      updateExam(editingExam.id, payload);
      showNotification('Prova atualizada!', 'success');
    } else {
      addExam({ ...(payload as Omit<Exam, 'id'>), semesterId: currentSemester?.id, topicsCovered: [] });
    }
    onClose();
  };

  const fmt = examFormat(type);
  const max = parseNum(maxGrade) || 10;
  const exp = parseNum(expected);
  const tq = parseNum(totalQ);
  const neededCorrect = fmt === 'questions' && tq && exp !== undefined ? Math.min(tq, Math.ceil((exp / max) * tq)) : undefined;
  const oq = parseNum(objQ);
  const wm = parseNum(writtenMax);
  const objWorth = wm !== undefined ? Math.max(0, max - wm) : undefined;
  const oc = parseNum(objCorrect);
  const we = parseNum(writtenEarned);
  const mixedFinal = fmt === 'mixed' && oq && objWorth !== undefined && oc !== undefined ? Math.round(((oc / oq) * objWorth + (we ?? 0)) * 10) / 10 : undefined;
  const ca = parseNum(correctAns);
  const pct = (c?: number, t?: number) => (c !== undefined && t ? `${Math.round((c / t) * 100)}%` : undefined);
  const num = (id: string, value: string, set: (v: string) => void, placeholder: string, step = '1') => (
    <input id={id} type="number" step={step} min="0" inputMode="decimal" placeholder={placeholder} value={value} onChange={(e) => set(e.target.value)} className={inputCls} />
  );
  const L = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
    <label className={labelCls} htmlFor={htmlFor}>
      {children}
    </label>
  );
  const activeShift = EXAM_SHIFTS.find((s) => s.id === shift);
  const suggestedSource =
    link && (link.kind === 'subject' || link.kind === 'project') && link.id ? { kind: link.kind, id: link.id, label: link.label } : undefined;

  return (
    <div className="app-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="app-modal-panel relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-bold text-slate-900 dark:text-white">{editingExam ? 'Editar prova' : 'Nova prova'}</h2>
              <p className="text-xs text-slate-500">Aparece no Semestre e no Planner</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="h-10 w-10 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className={labelCls} htmlFor="exam-subject">Disciplina</label>
            <ExamSubjectPicker value={link} onChange={setLink} autoFocus={!editingExam && !defaultSubjectName} />
          </div>

          <div>
            <span className={labelCls}>Tipo de prova</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {EXAM_KINDS.map((k) => {
                const active = type === k.id;
                return (
                  <button
                    key={k.id}
                    type="button"
                    onClick={() => setType(k.id)}
                    className={`min-h-10 px-2 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                      active ? 'text-white shadow-sm' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                    style={active ? { backgroundColor: k.color, borderColor: k.color } : undefined}
                  >
                    {k.id}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={labelCls} htmlFor="exam-title">Nome da prova (opcional)</label>
            <input id="exam-title" type="text" placeholder="Ex: P1, 2ª avaliação, Prova final" value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>

          <div>
            <label className={labelCls} htmlFor="exam-date">Data</label>
            <DatePickerField id="exam-date" value={date} onChange={setDate} className={inputCls} placeholder="Escolher data" />
          </div>

          <div>
            <span className={labelCls}>Turno</span>
            <div className="grid grid-cols-3 gap-1.5">
              {EXAM_SHIFTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickShift(s.id)}
                  className={`min-h-10 px-1 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                    shift === s.id ? 'bg-sky-600 border-sky-600 text-white shadow-sm' : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300'
                  }`}
                >
                  {s.emoji} {s.label}
                  <span className={`block text-[9px] font-semibold ${shift === s.id ? 'text-sky-100' : 'text-slate-400'}`}>{s.range}</span>
                </button>
              ))}
            </div>
            {!showTimes ? (
              <button type="button" onClick={() => setShowTimes(true)} className="mt-1.5 min-h-10 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline">
                {activeShift ? `${time || '—'}–${endTime || '—'} · ajustar horário` : 'Definir começa e termina'}
              </button>
            ) : (
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <L htmlFor="exam-time">Começa</L>
                  <input
                    id="exam-time"
                    type="time"
                    value={time}
                    onChange={(e) => {
                      setTime(e.target.value);
                      const auto = shiftFromTime(e.target.value);
                      if (auto) setShift(auto);
                    }}
                    className={inputCls}
                  />
                </div>
                <div>
                  <L htmlFor="exam-end-time">Termina</L>
                  <input id="exam-end-time" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
                </div>
              </div>
            )}
          </div>

          {/* Local e peso: só se o aluno quiser */}
          {(showLocation || showWeight) && (
            <div className="grid grid-cols-3 gap-2">
              {showLocation && (
                <div className={showWeight ? 'col-span-2' : 'col-span-3'}>
                  <L htmlFor="exam-location">Local</L>
                  <input id="exam-location" type="text" placeholder="Ex: Bloco C, sala 204" value={location} onChange={(e) => setLocation(e.target.value)} className={inputCls} autoFocus={!location} />
                </div>
              )}
              {showWeight && (
                <div className={showLocation ? '' : 'col-span-1'}>
                  <L htmlFor="exam-weight">Peso</L>
                  <input id="exam-weight" type="number" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} />
                </div>
              )}
            </div>
          )}
          {(!showLocation || !showWeight || !showNotes) && (
            <div className="flex flex-wrap gap-1.5 -mt-1">
              {!showLocation && (
                <button type="button" id="exam-add-location" onClick={() => setShowLocation(true)} className={ghostBtn}>
                  <Plus className="h-3 w-3" /> Local
                </button>
              )}
              {!showWeight && (
                <button type="button" id="exam-add-weight" onClick={() => setShowWeight(true)} className={ghostBtn}>
                  <Plus className="h-3 w-3" /> Peso
                </button>
              )}
              {!showNotes && (
                <button type="button" id="exam-add-notes" onClick={() => setShowNotes(true)} className={ghostBtn}>
                  <Plus className="h-3 w-3" /> Observação
                </button>
              )}
            </div>
          )}

          {/* Planejamento (+ resultado só depois da prova) */}
          <div id="exam-grade-plan" className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 mb-2 flex items-center gap-1">
                <Target className="h-3.5 w-3.5" /> Planejamento
              </p>
              {fmt === 'questions' && (
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <L htmlFor="exam-total-q">Questões</L>
                    {num('exam-total-q', totalQ, setTotalQ, 'Ex: 30')}
                  </div>
                  <div>
                    <L htmlFor="exam-expected">Nota desejada</L>
                    {num('exam-expected', expected, setExpected, 'Ex: 8', '0.1')}
                  </div>
                  <div>
                    <L htmlFor="exam-min-correct">Acerto mín.</L>
                    {num('exam-min-correct', minCorrect, setMinCorrect, neededCorrect !== undefined ? String(neededCorrect) : 'Ex: 24')}
                  </div>
                </div>
              )}
              {fmt === 'grade' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <L htmlFor="exam-expected">Nota desejada</L>
                    {num('exam-expected', expected, setExpected, 'Ex: 8', '0.1')}
                  </div>
                  <div>
                    <L htmlFor="exam-max">Nota máx.</L>
                    {num('exam-max', maxGrade, setMaxGrade, '10', '0.5')}
                  </div>
                </div>
              )}
              {fmt === 'mixed' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <L htmlFor="exam-obj-q">Objetivas</L>
                    {num('exam-obj-q', objQ, setObjQ, 'Ex: 20')}
                  </div>
                  <div>
                    <L htmlFor="exam-written-q">Discursivas</L>
                    {num('exam-written-q', writtenQ, setWrittenQ, 'Ex: 2')}
                  </div>
                  <div>
                    <L htmlFor="exam-written-max">Discursivas valem</L>
                    {num('exam-written-max', writtenMax, setWrittenMax, 'Ex: 5 pts', '0.5')}
                  </div>
                  <div>
                    <L htmlFor="exam-expected">Nota desejada</L>
                    {num('exam-expected', expected, setExpected, 'Ex: 8', '0.1')}
                  </div>
                </div>
              )}
              {fmt === 'questions' && neededCorrect !== undefined && (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Para tirar {String(exp).replace('.', ',')}, precisa de ~<strong>{neededCorrect}</strong> acertos de {tq}.{' '}
                  {minCorrect === '' && (
                    <button type="button" onClick={() => setMinCorrect(String(neededCorrect))} className="font-bold text-sky-600 dark:text-sky-400 hover:underline">
                      Usar {neededCorrect}
                    </button>
                  )}
                </p>
              )}
              {fmt === 'mixed' && objWorth !== undefined && (
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Objetivas valem {String(objWorth).replace('.', ',')} pts. Discursivas, {String(wm).replace('.', ',')} pts.
                </p>
              )}
            </div>

            {showResult && (
              <div
                id="exam-result-section"
                className={`pt-3 border-t border-slate-200 dark:border-slate-800 ${focusResult ? 'rounded-2xl ring-2 ring-emerald-500/40 p-2 -mx-1 bg-emerald-500/5' : ''}`}
              >
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                  <Award className="h-3.5 w-3.5" /> Resultado
                </p>
                {fmt === 'questions' && (
                  <div className="grid grid-cols-3 gap-2 items-end">
                    <div>
                      <L htmlFor="exam-grade">Nota</L>
                      {num('exam-grade', grade, setGrade, '—', '0.1')}
                    </div>
                    <div>
                      <L htmlFor="exam-correct">Acertei</L>
                      {num('exam-correct', correctAns, setCorrectAns, tq ? `de ${tq}` : '—')}
                    </div>
                    <div className="text-center pb-2">
                      <div className="text-lg font-black text-slate-900 dark:text-white">{pct(ca, tq) || '—'}</div>
                      <div className="text-[10px] text-slate-500">de acertos</div>
                    </div>
                  </div>
                )}
                {fmt === 'grade' && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <L htmlFor="exam-grade">Nota que tirei</L>
                      {num('exam-grade', grade, setGrade, '—', '0.1')}
                    </div>
                  </div>
                )}
                {fmt === 'mixed' && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <L htmlFor="exam-obj-correct">Objetivas certas</L>
                        {num('exam-obj-correct', objCorrect, setObjCorrect, oq ? `de ${oq}` : '—')}
                      </div>
                      <div>
                        <L htmlFor="exam-written-earned">Discursivas</L>
                        {num('exam-written-earned', writtenEarned, setWrittenEarned, wm !== undefined ? `de ${wm}` : '—', '0.1')}
                      </div>
                      <div>
                        <L htmlFor="exam-grade">Nota final</L>
                        {num('exam-grade', grade, setGrade, mixedFinal !== undefined ? String(mixedFinal) : '—', '0.1')}
                      </div>
                    </div>
                    {mixedFinal !== undefined && grade === '' && (
                      <p className="text-[11px] text-slate-500">
                        Pela conta: ≈ <strong>{String(mixedFinal).replace('.', ',')}</strong>.{' '}
                        <button type="button" onClick={() => setGrade(String(mixedFinal))} className="font-bold text-sky-600 dark:text-sky-400 hover:underline">
                          Usar como nota final
                        </button>
                      </p>
                    )}
                  </div>
                )}
                <p className="text-[10px] text-slate-500 mt-2">Pode deixar em branco e lançar quando a nota sair.</p>
              </div>
            )}
          </div>

          {/* Assuntos da prova (opcional) */}
          <div id="exam-topics-section" className="rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              id="exam-topics-toggle"
              onClick={() => setTopicsOpen((v) => !v)}
              aria-expanded={topicsOpen}
              className="w-full min-h-12 flex items-center gap-2 px-3 text-left"
            >
              <ListChecks className="h-4 w-4 text-sky-500 shrink-0" />
              <span className="min-w-0 flex-1">
                <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">Assuntos da prova</span>
                <span className="block text-[11px] text-slate-500">
                  {examTopics.length ? `${examTopics.length} assunto${examTopics.length > 1 ? 's' : ''}` : 'Opcional. Vira um check list na sua rotina.'}
                </span>
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${topicsOpen ? 'rotate-180' : ''}`} />
            </button>
            {topicsOpen && (
              <div className="px-3 pb-3">
                <ExamTopicsEditor
                  topics={examTopics}
                  onTopicsChange={setExamTopics}
                  tasks={topicTasks}
                  onTasksChange={setTopicTasks}
                  remindersOff={remindersOff}
                  onRemindersOffChange={setRemindersOff}
                  suggestedSource={suggestedSource}
                />
              </div>
            )}
          </div>

          {showNotes && (
            <div>
              <label className={labelCls} htmlFor="exam-notes">Observações</label>
              <textarea id="exam-notes" rows={2} placeholder="Material para levar, conteúdo cobrado..." value={notes} onChange={(e) => setNotes(e.target.value)} className={`${inputCls} resize-none`} />
            </div>
          )}

          <div className="app-modal-footer pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={onClose} className="min-h-10 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
              Cancelar
            </button>
            <button type="submit" className="min-h-10 px-5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs">
              {editingExam ? 'Salvar' : 'Adicionar prova'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
