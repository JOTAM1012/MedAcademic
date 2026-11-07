// Card de um estudo pessoal: meta da semana, próximo item, Começar, +1 bloco e a lista de itens com revisões.
import React, { useState } from 'react';
import {
  Archive,
  ArchiveRestore,
  CalendarClock,
  Check,
  ChevronDown,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  Trash2,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { PersonalProject, PersonalProjectItem } from '../../types';
import { PROJECT_KINDS, WEEKDAY_SHORT, nextProjectItem } from '../../data/studyMethod';
import { formatDM, parseYMD } from '../../data/blockReview';
import { DAY_ORDER, ProgressRing, deadlineInfo, effectiveGoal, fmtMinutes, projectFocusSteps, splitLines } from './shared';

interface ProjectCardProps {
  project: PersonalProject;
  today: string;
  /** Blocos de foco feitos nesta semana (projectWeekPomodoros) */
  weekDone: number;
  /** Semana pesada (dias cheios, plantão, dia difícil): a meta é ajustada, nunca "falhou" */
  heavyWeek: boolean;
  onEdit: (p: PersonalProject) => void;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ project: p, today, weekDone, heavyWeek, onEdit }) => {
  const { startTask, logProjectBlock, toggleProjectItem, startProjectItemReviews, addProjectItems, removeProjectItem, updateProject, deleteProject, showNotification } =
    useApp();

  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [justDone, setJustDone] = useState<string | null>(null);
  const [addText, setAddText] = useState('');

  const kind = PROJECT_KINDS[p.kind] || PROJECT_KINDS.outro;
  const color = p.color || kind.color;
  const next = nextProjectItem(p);
  const doneItems = p.items.filter((i) => i.done).length;
  const goal = p.weeklyPomodoros;
  const target = effectiveGoal(p, heavyWeek);
  const adjusted = heavyWeek && target < goal;
  const left = Math.max(0, target - weekDone);
  const deadline = deadlineInfo(p.deadline, today);
  const dow = parseYMD(today).getDay();
  const isTodayDay = !!p.days?.length && p.days.includes(dow);
  const reviewDueCount = p.items.filter((i) => i.inReview && i.nextReviewDate && i.nextReviewDate <= today).length;

  const start = () =>
    startTask({
      title: next ? `${p.title} — ${next.title}` : p.title,
      kind: 'project',
      projectId: p.id,
      itemId: next?.id,
      minutes: 25,
      steps: projectFocusSteps(p.kind, next),
    });

  const toggleItem = (it: PersonalProjectItem) => {
    toggleProjectItem(p.id, it.id);
    setJustDone(!it.done ? it.id : justDone === it.id ? null : justDone);
  };

  const submitItems = () => {
    const titles = splitLines(addText);
    if (titles.length === 0) return;
    addProjectItems(p.id, titles);
    setAddText('');
  };

  const toggleArchive = () => {
    setMenuOpen(false);
    updateProject(p.id, { archived: !p.archived });
    showNotification(p.archived ? `"${p.title}" voltou para os seus estudos.` : `"${p.title}" arquivado. Ele sai do plano do dia.`, 'success');
  };

  let status: { text: string; tone: 'done' | 'calm' | 'adjusted' };
  if (weekDone >= goal) status = { text: 'Meta da semana feita ✨', tone: 'done' };
  else if (adjusted && weekDone >= target) status = { text: 'Meta ajustada feita. Semana pesada, ótimo trabalho!', tone: 'done' };
  else if (adjusted) status = { text: `Meta ajustada (semana pesada) · faltam ${left}`, tone: 'adjusted' };
  else status = { text: `Faltam ${left} bloco${left > 1 ? 's' : ''} · ${fmtMinutes(left * 25)}`, tone: 'calm' };

  const statusCls =
    status.tone === 'done'
      ? 'text-emerald-600 dark:text-emerald-400'
      : status.tone === 'adjusted'
        ? 'text-amber-700 dark:text-amber-400'
        : 'text-slate-500 dark:text-slate-400';

  return (
    <article
      id={`personal-project-${p.id}`}
      className={`relative rounded-3xl border bg-white dark:bg-slate-900 shadow-xs transition-shadow hover:shadow-md ${
        p.archived ? 'border-slate-200/70 dark:border-slate-800/70 opacity-80' : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <div className="h-1 rounded-t-3xl" style={{ backgroundColor: color }} aria-hidden="true" />

      <div className="p-4 sm:p-5">
        {/* Cabeçalho */}
        <div className="flex items-start gap-3">
          <div className="h-11 w-11 shrink-0 rounded-2xl flex items-center justify-center text-xl" style={{ backgroundColor: `${color}1f` }} aria-hidden="true">
            {p.emoji || kind.emoji}
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-black text-slate-900 dark:text-white leading-tight truncate" title={p.title}>
              {p.title}
            </h3>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full px-2 py-0.5 text-[11px] font-bold ink" style={{ '--ink': color, backgroundColor: `${color}14` } as React.CSSProperties}>
                {kind.label}
              </span>
              {p.archived && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">Arquivado</span>
              )}
              {!p.archived && isTodayDay && (
                <span className="rounded-full px-2 py-0.5 text-[11px] font-bold bg-sky-50 dark:bg-sky-500/10 text-sky-700 dark:text-sky-300">Hoje é dia</span>
              )}
              {deadline && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                    deadline.tone === 'soon'
                      ? 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                  }`}
                  title={`Prazo: ${formatDM(p.deadline)}`}
                >
                  <CalendarClock className="h-3 w-3" /> {deadline.text}
                </span>
              )}
            </div>
          </div>

          {/* Meta da semana */}
          {!p.archived && (
            <ProgressRing value={weekDone} max={target} color={color}>
              <div className="text-center leading-none">
                <div className="text-sm font-black text-slate-900 dark:text-white">
                  {weekDone}
                  <span className="text-[10px] font-bold text-slate-400">/{target}</span>
                </div>
                <div className="text-[8px] font-bold uppercase tracking-wide text-slate-400 mt-0.5">semana</div>
              </div>
            </ProgressRing>
          )}

          {/* Menu */}
          <div className="relative -mr-2 -mt-1">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="h-10 w-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Opções do estudo"
              aria-expanded={menuOpen}
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} aria-hidden="true" />
                <div className="absolute right-0 top-10 z-20 w-48 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(p);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 h-10 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </button>
                  <button
                    type="button"
                    onClick={toggleArchive}
                    className="w-full flex items-center gap-2 px-2.5 h-10 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {p.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
                    {p.archived ? 'Desarquivar' : 'Arquivar'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setMenuOpen(false);
                      setConfirmDelete(true);
                    }}
                    className="w-full flex items-center gap-2 px-2.5 h-10 rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Status + dias */}
        {!p.archived && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
            <p className={`text-xs font-bold ${statusCls}`} title={adjusted ? `Meta normal: ${goal} blocos. Nesta semana, ${target} já está ótimo.` : undefined}>
              {status.text}
            </p>
            {p.days && p.days.length > 0 && (
              <div
                className="flex gap-0.5"
                role="img"
                aria-label={`Dias preferidos: ${DAY_ORDER.filter((d) => p.days!.includes(d)).map((d) => WEEKDAY_SHORT[d]).join(', ')}`}
              >
                {DAY_ORDER.map((d) => {
                  const on = p.days!.includes(d);
                  return (
                    <span
                      key={d}
                      aria-hidden="true"
                      className={`h-5 min-w-[26px] px-0.5 rounded-md flex items-center justify-center text-[10px] font-bold ${
                        on ? 'text-white' : 'text-slate-400 dark:text-slate-600'
                      } ${d === dow ? 'ring-1 ring-slate-400 dark:ring-slate-500' : ''}`}
                      style={on ? { backgroundColor: color } : undefined}
                      title={WEEKDAY_SHORT[d]}
                    >
                      {WEEKDAY_SHORT[d]}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Próximo item */}
        {!p.archived && (
          <div className="mt-3 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 px-3 py-2.5">
            <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Próximo</div>
            <div className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
              {next ? next.title : p.items.length > 0 ? 'Todos os itens feitos ✨' : 'Escolha um passo pequeno (ou adicione itens)'}
            </div>
            {reviewDueCount > 0 && (
              <div className="mt-1 text-[11px] font-semibold text-sky-700 dark:text-sky-300">
                {reviewDueCount} {reviewDueCount === 1 ? 'item para revisar' : 'itens para revisar'} hoje
              </div>
            )}
          </div>
        )}

        {/* Ações */}
        {!p.archived && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              id={`personal-start-${p.id}`}
              type="button"
              onClick={start}
              className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shadow-xs"
            >
              <Play className="h-3.5 w-3.5" fill="currentColor" /> Começar · 25 min
            </button>
            <button
              id={`personal-log-${p.id}`}
              type="button"
              onClick={() => logProjectBlock(p.id, 25)}
              className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800"
              title="Somar um bloco de 25 min que você fez longe do site"
            >
              <Plus className="h-3.5 w-3.5" /> 1 bloco feito fora do site
            </button>
          </div>
        )}

        {/* Itens */}
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 w-full h-10 flex items-center justify-between rounded-xl px-1 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
          aria-expanded={expanded}
        >
          <span className="flex items-center gap-2">
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? '' : '-rotate-90'}`} />
            {expanded ? 'Esconder itens' : 'Ver itens'}
          </span>
          <span className="flex items-center gap-2">
            <span className="w-16 sm:w-24 h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <span
                className="block h-full rounded-full transition-all duration-500"
                style={{ width: `${p.items.length ? (doneItems / p.items.length) * 100 : 0}%`, backgroundColor: color }}
              />
            </span>
            {doneItems}/{p.items.length}
          </span>
        </button>

        {expanded && (
          <div className="mt-1">
            {p.items.length === 0 ? (
              <p className="px-1 py-2 text-xs text-slate-400">Nenhum item ainda. Divida em partes pequenas: capítulos, aulas, temas.</p>
            ) : (
              <ul className="space-y-0.5">
                {p.items.map((it) => {
                  const reviewToday = it.inReview && it.nextReviewDate && it.nextReviewDate <= today;
                  return (
                    <li key={it.id}>
                      <div className="group flex items-center gap-1 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <button
                          type="button"
                          onClick={() => toggleItem(it)}
                          className="h-10 w-10 shrink-0 flex items-center justify-center"
                          aria-label={it.done ? `Desmarcar ${it.title}` : `Marcar ${it.title} como feito`}
                        >
                          <span
                            className="h-5 w-5 rounded-md border-2 flex items-center justify-center transition-colors"
                            style={{ borderColor: color, backgroundColor: it.done ? color : 'transparent' }}
                          >
                            {it.done && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
                          </span>
                        </button>
                        <div className="min-w-0 flex-1 py-1.5">
                          <span className={`block text-sm break-words ${it.done ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-slate-800 dark:text-slate-100'}`}>
                            {it.title}
                          </span>
                          {it.inReview ? (
                            <span
                              className={`mt-0.5 inline-flex items-center gap-1 text-[11px] font-bold ${
                                reviewToday ? 'text-sky-700 dark:text-sky-300' : 'text-slate-500 dark:text-slate-400'
                              }`}
                            >
                              <RotateCcw className="h-3 w-3" />
                              {reviewToday ? `R${(it.reviewsDone || 0) + 1} hoje` : `R${(it.reviewsDone || 0) + 1} em ${formatDM(it.nextReviewDate)}`}
                            </span>
                          ) : it.done && justDone !== it.id ? (
                            <button
                              type="button"
                              onClick={() => startProjectItemReviews(p.id, it.id)}
                              className="mt-0.5 text-[11px] font-bold text-sky-600 dark:text-sky-400 hover:underline"
                            >
                              Revisar este item depois
                            </button>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            removeProjectItem(p.id, it.id);
                            if (justDone === it.id) setJustDone(null);
                          }}
                          className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl text-slate-300 dark:text-slate-600 hover:text-rose-500 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 focus:opacity-100"
                          aria-label={`Remover ${it.title}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Ao concluir: folha em branco de 5 min + entrar nas revisões */}
                      {justDone === it.id && it.done && (
                        <div className="mx-1 mb-2 mt-1 rounded-2xl border px-3 py-3" style={{ borderColor: `${color}55`, backgroundColor: `${color}0d` }}>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">
                            ✍️ Escreva de memória, em 5 min, o que tirou daqui (folha em branco).
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Tentar lembrar agora fixa muito mais do que reler depois.</p>
                          <div className="mt-2.5 flex flex-wrap gap-2">
                            {!it.inReview && (
                              <button
                                type="button"
                                onClick={() => {
                                  startProjectItemReviews(p.id, it.id);
                                  setJustDone(null);
                                }}
                                className="h-10 px-3 inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
                              >
                                <RotateCcw className="h-3.5 w-3.5" /> Revisar este item depois
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setJustDone(null)}
                              className="h-10 px-3 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800"
                            >
                              Agora não
                            </button>
                          </div>
                          {!it.inReview && <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">A 1ª revisão fica para amanhã. Ela aparece aqui e no seu plano do dia.</p>}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                submitItems();
              }}
              className="mt-2 flex items-start gap-2"
            >
              <textarea
                value={addText}
                onChange={(e) => setAddText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    submitItems();
                  }
                }}
                rows={addText.includes('\n') ? 3 : 1}
                placeholder="Adicionar itens (cole vários, um por linha)"
                className="flex-1 min-w-0 min-h-10 resize-none rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-3 py-2.5 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500"
                aria-label={`Adicionar itens em ${p.title}`}
              />
              <button
                type="submit"
                disabled={!addText.trim()}
                className="h-10 px-3 shrink-0 inline-flex items-center gap-1 rounded-xl text-xs font-bold text-white disabled:opacity-40"
                style={{ backgroundColor: color }}
              >
                <Plus className="h-4 w-4" /> Adicionar
              </button>
            </form>
          </div>
        )}

        {/* Excluir com confirmação inline */}
        {confirmDelete && (
          <div className="mt-3 rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/30 px-3 py-3">
            <p className="text-xs font-semibold text-rose-800 dark:text-rose-200">Excluir "{p.title}"? Os itens e as revisões dele somem. Isso não dá para desfazer.</p>
            {!p.archived && <p className="mt-0.5 text-[11px] text-rose-700/80 dark:text-rose-300/80">Se quiser só pausar, use "Arquivar".</p>}
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setConfirmDelete(false)}
                className="h-10 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
              >
                Cancelar
              </button>
              {!p.archived && (
                <button
                  type="button"
                  onClick={() => {
                    setConfirmDelete(false);
                    toggleArchive();
                  }}
                  className="h-10 px-4 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
                >
                  Arquivar
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  deleteProject(p.id);
                  showNotification(`"${p.title}" excluído.`, 'info');
                }}
                className="h-10 px-4 inline-flex items-center gap-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500"
              >
                <Trash2 className="h-3.5 w-3.5" /> Excluir
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  );
};

export default ProjectCard;
