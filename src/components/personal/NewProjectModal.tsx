// Criar (ou editar) um estudo pessoal: 1) escolher o modelo · 2) título, itens, meta semanal, dias e prazo.
import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CalendarDays, Check, Info, ListPlus, Minus, Play, Plus, Sparkles, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { PersonalProject, PersonalProjectKind } from '../../types';
import { PHASE_INFO, PROJECT_KINDS, PROJECT_KIND_ORDER, WEEKDAY_SHORT } from '../../data/studyMethod';
import { DatePickerField } from '../DatePickerField';
import { DAY_ORDER, PROJECT_COLORS, PROJECT_EMOJIS, fmtMinutes, projectFocusSteps, splitLines, suggestedTitle, type ProjectPreset } from './shared';

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  /** Projeto a editar (abre direto no passo 2 com os valores atuais) */
  editing?: PersonalProject | null;
  /** Modelo escolhido fora do modal (estado vazio): abre direto no passo 2 */
  preset?: ProjectPreset | null;
}

const inputCls =
  'w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500';
const labelCls = 'block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-1.5 uppercase tracking-wide';

const GOAL_MIN = 1;
const GOAL_MAX = 20;

const NUMBERED_PREFIXES = ['Capítulo', 'Aula', 'Módulo', 'Semana'];

export const NewProjectModal: React.FC<NewProjectModalProps> = ({ open, onClose, editing, preset }) => {
  const { addProject, updateProject, startTask, userProfile, studyPhase, showNotification } = useApp();
  const phase = PHASE_INFO[studyPhase];
  const suggestedGoal = phase.projectWeekly;

  const [step, setStep] = useState<1 | 2>(1);
  const [kind, setKind] = useState<PersonalProjectKind>('residencia');
  const [title, setTitle] = useState('');
  const [itemsText, setItemsText] = useState('');
  const [goal, setGoal] = useState(suggestedGoal);
  const [days, setDays] = useState<number[]>([]);
  const [deadline, setDeadline] = useState('');
  const [emoji, setEmoji] = useState(PROJECT_KINDS.residencia.emoji);
  const [color, setColor] = useState(PROJECT_KINDS.residencia.color);
  const [numPrefix, setNumPrefix] = useState(NUMBERED_PREFIXES[0]);
  const [numCount, setNumCount] = useState('8');
  const [touchedTitle, setTouchedTitle] = useState(false);
  const [showLook, setShowLook] = useState(false);

  const applyKind = (k: PersonalProjectKind, p?: ProjectPreset | null) => {
    const info = PROJECT_KINDS[k];
    setKind(k);
    setTitle(p?.title ?? suggestedTitle(k, userProfile.targetExam));
    setItemsText((p?.items ?? info.template).join('\n'));
    setDays(info.days ? [...info.days] : []);
    setEmoji(info.emoji);
    setColor(info.color);
    setNumPrefix(k === 'leitura' ? 'Capítulo' : k === 'curso' ? 'Aula' : 'Módulo');
    setTouchedTitle(false);
  };

  // Preenche sempre que abre (novo, modelo sugerido ou edição)
  useEffect(() => {
    if (!open) return;
    setShowLook(false);
    setNumCount('8');
    if (editing) {
      setStep(2);
      setKind(editing.kind);
      setTitle(editing.title);
      setItemsText('');
      setGoal(editing.weeklyPomodoros);
      setDays(editing.days ? [...editing.days] : []);
      setDeadline(editing.deadline || '');
      setEmoji(editing.emoji);
      setColor(editing.color);
      setTouchedTitle(true);
      return;
    }
    setGoal(suggestedGoal);
    setDeadline('');
    if (preset) {
      applyKind(preset.kind, preset);
      setStep(2);
    } else {
      applyKind('residencia');
      setStep(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, preset]);

  // Esc fecha
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const items = useMemo(() => splitLines(itemsText), [itemsText]);
  const info = PROJECT_KINDS[kind];
  const cleanTitle = title.trim();
  const canSave = cleanTitle.length > 0 && cleanTitle !== 'Curso de' && cleanTitle !== 'Livro:';

  if (!open) return null;

  const pickKind = (k: PersonalProjectKind) => {
    if (editing) {
      setKind(k);
      setEmoji(PROJECT_KINDS[k].emoji);
      setColor(PROJECT_KINDS[k].color);
    } else if (k !== kind || !touchedTitle) {
      applyKind(k);
    }
    setStep(2);
  };

  const toggleDay = (d: number) => setDays((prev) => (prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()));

  const generateNumbered = () => {
    const n = Math.max(1, Math.min(60, parseInt(numCount, 10) || 0));
    const list = Array.from({ length: n }, (_, i) => `${numPrefix} ${i + 1}`);
    // Se o texto ainda é o do modelo, troca; se o aluno já escreveu algo, acrescenta
    const isTemplate = itemsText.trim() === info.template.join('\n').trim();
    setItemsText(isTemplate || !itemsText.trim() ? list.join('\n') : `${itemsText.replace(/\s+$/, '')}\n${list.join('\n')}`);
  };

  const save = (startNow: boolean) => {
    if (!canSave) return;
    const base = {
      title: cleanTitle,
      kind,
      emoji,
      color,
      weeklyPomodoros: Math.max(GOAL_MIN, Math.min(GOAL_MAX, goal)),
      days: days.length > 0 ? days : undefined,
      deadline: deadline || undefined,
    };
    if (editing) {
      updateProject(editing.id, base);
      showNotification('Estudo pessoal atualizado.', 'success');
      onClose();
      return;
    }
    const id = addProject({ ...base, items });
    if (startNow) {
      const first = items[0];
      startTask({
        title: first ? `${cleanTitle} — ${first}` : cleanTitle,
        kind: 'project',
        projectId: id,
        minutes: 25,
        steps: projectFocusSteps(kind, first ? { title: first } : undefined),
      });
    }
    onClose();
  };

  const showResidencyHint = kind === 'residencia' && !userProfile.targetExam?.trim();

  return (
    <div
      className="app-modal fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
    >
      <div
        id="personal-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="personal-modal-title"
        onClick={(e) => e.stopPropagation()}
        className="app-modal-panel relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-2xl"
      >
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            {step === 2 && !editing ? (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="Voltar para os modelos"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            ) : (
              <div
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-xl"
                style={{ backgroundColor: `${step === 2 ? color : '#0ea5e9'}1f` }}
                aria-hidden="true"
              >
                {step === 2 ? emoji : '✨'}
              </div>
            )}
            <div className="min-w-0">
              <h2 id="personal-modal-title" className="text-base font-black text-slate-900 dark:text-white truncate">
                {editing ? 'Editar estudo pessoal' : step === 1 ? 'Novo estudo pessoal' : `Novo: ${info.label}`}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {step === 1 ? 'Passo 1 de 2 · escolha um modelo para começar' : editing ? 'Ajuste o que quiser' : 'Passo 2 de 2 · ajuste do seu jeito'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {step === 1 ? (
          <div className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
              {PROJECT_KIND_ORDER.map((k) => {
                const kInfo = PROJECT_KINDS[k];
                return (
                  <button
                    key={k}
                    id={`personal-kind-${k}`}
                    type="button"
                    onClick={() => pickKind(k)}
                    className="group text-left rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-3 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-white dark:hover:bg-slate-900 hover:shadow-md transition-all min-h-[104px] flex flex-col"
                  >
                    <span
                      className="h-9 w-9 rounded-xl flex items-center justify-center text-lg mb-2 transition-transform group-hover:scale-110"
                      style={{ backgroundColor: `${kInfo.color}1f` }}
                      aria-hidden="true"
                    >
                      {kInfo.emoji}
                    </span>
                    <span className="text-sm font-bold text-slate-900 dark:text-white leading-tight">{kInfo.label}</span>
                    <span className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400 line-clamp-2">{kInfo.hint}</span>
                  </button>
                );
              })}
            </div>
            <p className="mt-4 flex items-start gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              Cada modelo já vem com itens e dias sugeridos. Você muda tudo no próximo passo.
            </p>
          </div>
        ) : (
          <form
            className="pt-4 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              save(false);
            }}
          >
            {/* Tipo (na edição dá para trocar) */}
            {editing && (
              <div>
                <span className={labelCls}>Tipo</span>
                <div className="flex flex-wrap gap-1.5">
                  {PROJECT_KIND_ORDER.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => pickKind(k)}
                      className={`h-9 px-3 rounded-full text-[11px] font-bold border transition-colors ${
                        kind === k
                          ? 'border-transparent text-white'
                          : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      style={kind === k ? { backgroundColor: PROJECT_KINDS[k].color } : undefined}
                    >
                      {PROJECT_KINDS[k].emoji} {PROJECT_KINDS[k].label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Título */}
            <div>
              <label htmlFor="personal-title-input" className={labelCls}>
                Nome do estudo
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowLook((v) => !v)}
                  className="h-11 w-11 shrink-0 rounded-xl text-xl flex items-center justify-center border border-slate-200 dark:border-slate-800"
                  style={{ backgroundColor: `${color}1f` }}
                  aria-label="Mudar ícone e cor"
                  title="Mudar ícone e cor"
                >
                  {emoji}
                </button>
                <input
                  id="personal-title-input"
                  autoFocus={!editing}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setTouchedTitle(true);
                  }}
                  placeholder={kind === 'curso' ? 'Ex.: Curso de ECG' : kind === 'leitura' ? 'Ex.: Livro: Guyton' : 'Dê um nome curto'}
                  maxLength={60}
                  className={inputCls}
                />
              </div>
              {showLook && (
                <div className="mt-2 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-2.5">
                  <div className="flex flex-wrap gap-1">
                    {PROJECT_EMOJIS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setEmoji(em)}
                        className={`h-9 w-9 rounded-lg text-lg ${emoji === em ? 'bg-slate-100 dark:bg-slate-800 ring-1 ring-slate-300 dark:ring-slate-600' : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'}`}
                        aria-label={`Ícone ${em}`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {PROJECT_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className={`h-7 w-7 rounded-full transition-transform ${color === c ? 'ring-2 ring-offset-2 ring-sky-500 ring-offset-white dark:ring-offset-slate-900 scale-110' : ''}`}
                        style={{ backgroundColor: c }}
                        aria-label={`Cor ${c}`}
                      />
                    ))}
                  </div>
                </div>
              )}
              {showResidencyHint && (
                <p className="mt-2 flex items-start gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <Sparkles className="h-3.5 w-3.5 mt-px shrink-0 text-amber-500" />
                  Dica: você pode definir sua prova-alvo no Perfil. Ela aparece aqui e ajuda o plano a focar nas questões.
                </p>
              )}
            </div>

            {/* Itens (só ao criar; na edição eles ficam no próprio card) */}
            {!editing ? (
              <div>
                <div className="flex items-end justify-between gap-2 mb-1.5">
                  <label htmlFor="personal-items-input" className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                    Itens (capítulos, aulas, temas)
                  </label>
                  <span className="text-[11px] font-bold text-slate-400">
                    {items.length} {items.length === 1 ? 'item' : 'itens'}
                  </span>
                </div>
                <textarea
                  id="personal-items-input"
                  value={itemsText}
                  onChange={(e) => setItemsText(e.target.value)}
                  rows={Math.min(8, Math.max(4, items.length + 1))}
                  placeholder={'Um por linha, por exemplo:\nCapítulo 1\nCapítulo 2'}
                  className={inputCls + ' resize-y leading-relaxed'}
                />
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Um por linha. Pode apagar, mudar ou adicionar. Pequeno é melhor: 1 item ≈ 1 ou 2 blocos.</p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">Gerar lista:</span>
                  <select
                    value={numPrefix}
                    onChange={(e) => setNumPrefix(e.target.value)}
                    className="h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                    aria-label="Nome dos itens numerados"
                  >
                    {NUMBERED_PREFIXES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <span className="text-xs text-slate-400">1 a</span>
                  <input
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={60}
                    value={numCount}
                    onChange={(e) => setNumCount(e.target.value)}
                    className="h-9 w-16 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-2 text-xs font-semibold text-slate-700 dark:text-slate-200 focus:outline-hidden focus:border-sky-500"
                    aria-label="Quantidade de itens"
                  />
                  <button
                    type="button"
                    onClick={generateNumbered}
                    className="h-9 px-3 inline-flex items-center gap-1.5 rounded-lg text-xs font-bold text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-500/10 hover:bg-sky-100 dark:hover:bg-sky-500/20"
                  >
                    <ListPlus className="h-3.5 w-3.5" /> Gerar
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-1.5">
                <Info className="h-3.5 w-3.5 mt-px shrink-0" />
                Os itens você marca, adiciona e remove no próprio card, em "Ver itens".
              </p>
            )}

            {/* Meta semanal */}
            <div>
              <span className={labelCls}>Meta da semana</span>
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-1">
                  <button
                    type="button"
                    onClick={() => setGoal((g) => Math.max(GOAL_MIN, g - 1))}
                    disabled={goal <= GOAL_MIN}
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40"
                    aria-label="Menos um bloco"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <div className="w-16 text-center" aria-live="polite">
                    <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{goal}</div>
                    <div className="text-[10px] font-semibold text-slate-500">{goal === 1 ? 'bloco' : 'blocos'}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setGoal((g) => Math.min(GOAL_MAX, g + 1))}
                    disabled={goal >= GOAL_MAX}
                    className="h-10 w-10 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-800 disabled:opacity-40"
                    aria-label="Mais um bloco"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-300 min-w-0">
                  <div className="font-bold">≈ {fmtMinutes(goal * 25)} por semana</div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">1 bloco = 25 min de foco + 5 de pausa</div>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  Sugestão para o {phase.label} {phase.emoji}: <b className="text-slate-700 dark:text-slate-200">{suggestedGoal} blocos</b>
                </span>
                {goal !== suggestedGoal && (
                  <button type="button" onClick={() => setGoal(suggestedGoal)} className="font-bold text-sky-600 dark:text-sky-400 hover:underline">
                    usar sugestão
                  </button>
                )}
              </div>
              {goal > suggestedGoal * 2 && (
                <p className="mt-1.5 text-[11px] text-amber-700 dark:text-amber-400">Meta grande para começar. Metas pequenas que você cumpre valem mais do que metas grandes que pesam.</p>
              )}
            </div>

            {/* Dias preferidos */}
            <div>
              <span className={labelCls}>Dias preferidos</span>
              <div className="grid grid-cols-7 gap-1.5" role="group" aria-label="Dias preferidos">
                {DAY_ORDER.map((d) => {
                  const on = days.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      aria-pressed={on}
                      className={`h-10 rounded-xl text-[11px] font-bold border transition-colors ${
                        on ? 'border-transparent text-white shadow-xs' : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                      }`}
                      style={on ? { backgroundColor: color } : undefined}
                    >
                      {WEEKDAY_SHORT[d]}
                    </button>
                  );
                })}
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                {days.length > 0
                  ? `Nesses ${days.length} dia${days.length > 1 ? 's' : ''}, 1 bloco fica protegido no seu plano do dia, mesmo com a faculdade apertando.`
                  : 'Sem dias marcados: o estudo pode aparecer em qualquer dia, quando sobrar espaço.'}
              </p>
            </div>

            {/* Prazo */}
            <div>
              <span className={labelCls}>
                Prazo <span className="normal-case font-semibold text-slate-400">(opcional)</span>
              </span>
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <DatePickerField id="personal-deadline" value={deadline} onChange={setDeadline} placeholder="Sem prazo" className={inputCls} />
                </div>
                {deadline && (
                  <button
                    type="button"
                    onClick={() => setDeadline('')}
                    className="h-10 px-3 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Tirar
                  </button>
                )}
              </div>
              {!deadline && (
                <p className="mt-1.5 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <CalendarDays className="h-3.5 w-3.5" /> Ex.: data da prova de residência, fim do curso ou entrega do artigo.
                </p>
              )}
            </div>

            {/* Rodapé */}
            <div className="app-modal-footer pt-3 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
              {editing ? (
                <>
                  <button
                    type="button"
                    onClick={onClose}
                    className="h-10 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    Cancelar
                  </button>
                  <button
                    id="personal-save-btn"
                    type="submit"
                    disabled={!canSave}
                    className="h-10 px-5 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs"
                  >
                    <Check className="h-4 w-4" /> Salvar
                  </button>
                </>
              ) : (
                <>
                  <button
                    id="personal-create-btn"
                    type="submit"
                    disabled={!canSave}
                    className="h-10 px-4 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
                  >
                    Criar
                  </button>
                  <button
                    id="personal-create-start-btn"
                    type="button"
                    disabled={!canSave}
                    onClick={() => save(true)}
                    className="h-10 px-5 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white font-bold text-xs shadow-xs"
                  >
                    <Play className="h-3.5 w-3.5" fill="currentColor" /> Criar e começar agora
                  </button>
                </>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default NewProjectModal;
