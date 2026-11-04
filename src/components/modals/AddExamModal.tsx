import React, { useEffect, useMemo, useState } from 'react';
import { X, GraduationCap, Calendar, Clock, MapPin, Target, Award } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { DatePickerField } from '../DatePickerField';
import { Exam, ExamShift } from '../../types';
import { EXAM_KINDS, EXAM_SHIFTS, examFormat, getExamSubjectName, shiftFromTime } from '../../data/planning';

interface AddExamModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Prova a editar (sem ela, cria uma nova) */
  editingExam?: Exam | null;
  defaultDate?: string;
  defaultSubjectName?: string;
}

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:border-sky-500';
const labelCls = 'block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1 uppercase tracking-wide';

const parseGrade = (raw: string) => {
  if (raw.trim() === '') return undefined;
  const n = Number(raw.replace(',', '.'));
  return Number.isFinite(n) ? n : undefined;
};

export const AddExamModal: React.FC<AddExamModalProps> = ({
  isOpen,
  onClose,
  editingExam,
  defaultDate,
  defaultSubjectName,
}) => {
  const { exams, subjects, addExam, updateExam, addXp, showNotification, currentSemester } = useApp();

  const [subjectName, setSubjectName] = useState('');
  const [type, setType] = useState<string>(EXAM_KINDS[0].id);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [shift, setShift] = useState<ExamShift | undefined>();
  const [location, setLocation] = useState('');
  const [weight, setWeight] = useState('1');
  const [maxGrade, setMaxGrade] = useState('10');
  const [expected, setExpected] = useState('');
  const [grade, setGrade] = useState('');
  // Personalização por tipo de prova
  const [totalQ, setTotalQ] = useState('');
  const [minCorrect, setMinCorrect] = useState('');
  const [correctAns, setCorrectAns] = useState('');
  const [objQ, setObjQ] = useState('');
  const [writtenQ, setWrittenQ] = useState('');
  const [writtenMax, setWrittenMax] = useState('');
  const [objCorrect, setObjCorrect] = useState('');
  const [writtenEarned, setWrittenEarned] = useState('');
  const [notes, setNotes] = useState('');

  // Preenche o formulário sempre que abre (nova prova ou edição)
  useEffect(() => {
    if (!isOpen) return;
    const ex = editingExam;
    setSubjectName(ex ? getExamSubjectName(ex, subjects).replace('Sem disciplina', '') : defaultSubjectName || '');
    setType(ex?.type || EXAM_KINDS[0].id);
    setTitle(ex?.title || '');
    setDate(ex?.date || defaultDate || '');
    setTime(ex?.time || '');
    setShift(ex?.shift || shiftFromTime(ex?.time));
    setLocation(ex?.location || '');
    setWeight(String(ex?.weight ?? 1));
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
  }, [isOpen, editingExam, defaultDate, defaultSubjectName]);

  // Sugestões: disciplinas já usadas em provas + disciplinas cadastradas
  const subjectSuggestions = useMemo(() => {
    const names = new Set<string>();
    exams.forEach((e) => {
      const n = getExamSubjectName(e, subjects);
      if (n !== 'Sem disciplina') names.add(n);
    });
    subjects.forEach((s) => names.add(s.universitySubject || s.name));
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [exams, subjects]);

  if (!isOpen) return null;

  const handleTimeChange = (value: string) => {
    setTime(value);
    const auto = shiftFromTime(value);
    if (auto) setShift(auto);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = subjectName.trim();
    if (!name || !date) {
      showNotification('Informe a disciplina e a data da prova.', 'warning');
      return;
    }
    const max = parseGrade(maxGrade) || 10;
    const expectedGrade = parseGrade(expected);
    const released = parseGrade(grade);
    if ([expectedGrade, released].some((g) => g !== undefined && (g < 0 || g > max))) {
      showNotification(`As notas devem ficar entre 0 e ${max}.`, 'warning');
      return;
    }

    const fmt = examFormat(type);
    const num = (v: string) => parseGrade(v);
    const total = num(totalQ);
    const objTotal = num(objQ);
    const wMax = num(writtenMax);
    if (fmt === 'questions' && total !== undefined) {
      if ((num(correctAns) ?? 0) > total || (num(minCorrect) ?? 0) > total) {
        showNotification(`Os acertos não podem passar de ${total} questões.`, 'warning');
        return;
      }
    }
    if (fmt === 'mixed') {
      if (objTotal !== undefined && (num(objCorrect) ?? 0) > objTotal) {
        showNotification(`Os acertos não podem passar de ${objTotal} questões objetivas.`, 'warning');
        return;
      }
      if (wMax !== undefined && ((num(writtenEarned) ?? 0) > wMax || wMax > max)) {
        showNotification('Confira a pontuação das discursivas.', 'warning');
        return;
      }
    }

    const payload = {
      // Campos do formato escolhido (os dos outros formatos são limpos)
      totalQuestions: fmt === 'questions' ? total : undefined,
      minCorrect: fmt === 'questions' ? num(minCorrect) : undefined,
      correctAnswers: fmt === 'questions' ? num(correctAns) : undefined,
      objectiveQuestions: fmt === 'mixed' ? objTotal : undefined,
      writtenQuestions: fmt === 'mixed' ? num(writtenQ) : undefined,
      writtenPointsMax: fmt === 'mixed' ? wMax : undefined,
      objectiveCorrect: fmt === 'mixed' ? num(objCorrect) : undefined,
      writtenPointsEarned: fmt === 'mixed' ? num(writtenEarned) : undefined,
      subjectName: name,
      title: title.trim() || `${type} · ${name}`,
      type,
      date,
      time: time || undefined,
      shift,
      location: location.trim() || undefined,
      weight: parseGrade(weight) || 1,
      maxGrade: max,
      expectedGrade,
      grade: released,
      notes: notes.trim() || undefined,
    };

    if (editingExam) {
      updateExam(editingExam.id, { ...payload, subjectId: editingExam.subjectId });
      showNotification('Prova atualizada!', 'success');
    } else {
      addExam({ ...payload, semesterId: currentSemester?.id, topicsCovered: [] });
      addXp(40, 'Prova adicionada à grade');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                {editingExam ? 'Editar prova' : 'Nova prova'}
              </h2>
              <p className="text-xs text-slate-500">Aparece na Grade de Semestre e no Planner</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className={labelCls} htmlFor="exam-subject">Disciplina</label>
            <input
              id="exam-subject"
              type="text"
              list="exam-subject-suggestions"
              placeholder="Ex: Cardiologia, Anatomia II, Pediatria..."
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              className={inputCls}
              autoFocus={!editingExam}
              required
            />
            <datalist id="exam-subject-suggestions">
              {subjectSuggestions.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>
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
                    className={`px-2 py-2 rounded-xl border text-[11px] font-bold transition-all ${
                      active
                        ? 'text-white shadow-sm'
                        : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
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
            <input
              id="exam-title"
              type="text"
              placeholder="Ex: P1, 2ª avaliação, Prova final"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls} htmlFor="exam-date">
                <Calendar className="inline h-3 w-3 mr-1 -mt-0.5" />Data
              </label>
              <DatePickerField id="exam-date" value={date} onChange={setDate} className={inputCls} placeholder="Escolher data" />
            </div>
            <div>
              <label className={labelCls} htmlFor="exam-time">
                <Clock className="inline h-3 w-3 mr-1 -mt-0.5" />Horário
              </label>
              <input id="exam-time" type="time" value={time} onChange={(e) => handleTimeChange(e.target.value)} className={inputCls} />
            </div>
          </div>

          <div>
            <span className={labelCls}>Turno</span>
            <div className="grid grid-cols-3 gap-1.5">
              {EXAM_SHIFTS.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setShift(shift === s.id ? undefined : s.id)}
                  className={`px-2 py-2 rounded-xl border text-xs font-bold transition-all ${
                    shift === s.id
                      ? 'bg-sky-600 border-sky-600 text-white shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {s.emoji} {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className={labelCls} htmlFor="exam-location">
                <MapPin className="inline h-3 w-3 mr-1 -mt-0.5" />Local (opcional)
              </label>
              <input
                id="exam-location"
                type="text"
                placeholder="Ex: Bloco C, sala 204"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls} htmlFor="exam-weight">Peso</label>
              <input id="exam-weight" type="number" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} className={inputCls} />
            </div>
          </div>

          {(() => {
            const fmt = examFormat(type);
            const max = parseGrade(maxGrade) || 10;
            const exp = parseGrade(expected);
            const tq = parseGrade(totalQ);
            // acertos necessários para a nota desejada (regra de três sobre a nota máxima)
            const neededCorrect = fmt === 'questions' && tq && exp !== undefined ? Math.min(tq, Math.ceil((exp / max) * tq)) : undefined;
            const oq = parseGrade(objQ);
            const wm = parseGrade(writtenMax);
            const objWorth = wm !== undefined ? Math.max(0, max - wm) : undefined;
            const oc = parseGrade(objCorrect);
            const we = parseGrade(writtenEarned);
            const mixedFinal =
              fmt === 'mixed' && oq && objWorth !== undefined && oc !== undefined
                ? Math.round(((oc / oq) * objWorth + (we ?? 0)) * 10) / 10
                : undefined;
            const ca = parseGrade(correctAns);
            const pct = (c?: number, t?: number) => (c !== undefined && t ? `${Math.round((c / t) * 100)}%` : undefined);
            const n = (id: string, value: string, set: (v: string) => void, placeholder: string, step = '1') => (
              <input id={id} type="number" step={step} min="0" placeholder={placeholder} value={value} onChange={(e) => set(e.target.value)} className={inputCls} />
            );
            const L = ({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) => (
              <label className={labelCls} htmlFor={htmlFor}>
                {children}
              </label>
            );

            return (
              <div id="exam-grade-plan" className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 p-3 space-y-3">
                {/* Antes da prova */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 mb-2 flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" /> Planejamento
                  </p>
                  {fmt === 'questions' && (
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <L htmlFor="exam-total-q">Questões</L>
                        {n('exam-total-q', totalQ, setTotalQ, 'Ex: 30')}
                      </div>
                      <div>
                        <L htmlFor="exam-expected">Nota desejada</L>
                        {n('exam-expected', expected, setExpected, 'Ex: 8', '0.1')}
                      </div>
                      <div>
                        <L htmlFor="exam-min-correct">Acertos mín.</L>
                        {n('exam-min-correct', minCorrect, setMinCorrect, neededCorrect !== undefined ? String(neededCorrect) : 'Ex: 24')}
                      </div>
                    </div>
                  )}
                  {fmt === 'grade' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <L htmlFor="exam-expected">Nota desejada</L>
                        {n('exam-expected', expected, setExpected, 'Ex: 8', '0.1')}
                      </div>
                      <div>
                        <L htmlFor="exam-max">Nota máx.</L>
                        {n('exam-max', maxGrade, setMaxGrade, '10', '0.5')}
                      </div>
                    </div>
                  )}
                  {fmt === 'mixed' && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <L htmlFor="exam-obj-q">Questões objetivas</L>
                        {n('exam-obj-q', objQ, setObjQ, 'Ex: 20')}
                      </div>
                      <div>
                        <L htmlFor="exam-written-q">Questões discursivas</L>
                        {n('exam-written-q', writtenQ, setWrittenQ, 'Ex: 2')}
                      </div>
                      <div>
                        <L htmlFor="exam-written-max">Discursivas valem (pts)</L>
                        {n('exam-written-max', writtenMax, setWrittenMax, 'Ex: 5', '0.5')}
                      </div>
                      <div>
                        <L htmlFor="exam-expected">Nota desejada</L>
                        {n('exam-expected', expected, setExpected, 'Ex: 8', '0.1')}
                      </div>
                    </div>
                  )}
                  {fmt === 'questions' && neededCorrect !== undefined && (
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Para tirar {String(exp).replace('.', ',')} precisa de ~<strong>{neededCorrect}</strong> acertos de {tq}.{' '}
                      {minCorrect === '' && (
                        <button type="button" onClick={() => setMinCorrect(String(neededCorrect))} className="font-bold text-sky-600 dark:text-sky-400 hover:underline">
                          Usar {neededCorrect}
                        </button>
                      )}
                    </p>
                  )}
                  {fmt === 'mixed' && objWorth !== undefined && (
                    <p className="text-[11px] text-slate-500 mt-1.5">
                      Objetivas valem {String(objWorth).replace('.', ',')} pts · discursivas {String(wm).replace('.', ',')} pts (nota máx. {max}).
                    </p>
                  )}
                </div>

                {/* Depois da prova */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1">
                    <Award className="h-3.5 w-3.5" /> Resultado (depois da prova)
                  </p>
                  {fmt === 'questions' && (
                    <div className="grid grid-cols-3 gap-2 items-end">
                      <div>
                        <L htmlFor="exam-grade">Nota que tirei</L>
                        {n('exam-grade', grade, setGrade, '—', '0.1')}
                      </div>
                      <div>
                        <L htmlFor="exam-correct">Acertei</L>
                        {n('exam-correct', correctAns, setCorrectAns, tq ? `de ${tq}` : '—')}
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
                        {n('exam-grade', grade, setGrade, '—', '0.1')}
                      </div>
                    </div>
                  )}
                  {fmt === 'mixed' && (
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <L htmlFor="exam-obj-correct">Objetivas certas</L>
                          {n('exam-obj-correct', objCorrect, setObjCorrect, oq ? `de ${oq}` : '—')}
                        </div>
                        <div>
                          <L htmlFor="exam-written-earned">Discursivas (pts)</L>
                          {n('exam-written-earned', writtenEarned, setWrittenEarned, wm !== undefined ? `de ${wm}` : '—', '0.1')}
                        </div>
                        <div>
                          <L htmlFor="exam-grade">Nota final</L>
                          {n('exam-grade', grade, setGrade, mixedFinal !== undefined ? String(mixedFinal) : '—', '0.1')}
                        </div>
                      </div>
                      {mixedFinal !== undefined && grade === '' && (
                        <p className="text-[11px] text-slate-500">
                          Pela conta: {pct(oc, oq)} das objetivas + {String(we ?? 0).replace('.', ',')} pts nas discursivas ≈ <strong>{String(mixedFinal).replace('.', ',')}</strong>.{' '}
                          <button type="button" onClick={() => setGrade(String(mixedFinal))} className="font-bold text-sky-600 dark:text-sky-400 hover:underline">
                            Usar como nota final
                          </button>
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-500 mt-2">O resultado pode ficar em branco e ser preenchido depois que a nota sair.</p>
                </div>
              </div>
            );
          })()}

          <div>
            <label className={labelCls} htmlFor="exam-notes">Observações (opcional)</label>
            <textarea
              id="exam-notes"
              rows={2}
              placeholder="Conteúdo cobrado, material para levar..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${inputCls} resize-none`}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button type="submit" className="px-5 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs">
              {editingExam ? 'Salvar alterações' : 'Adicionar prova'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
