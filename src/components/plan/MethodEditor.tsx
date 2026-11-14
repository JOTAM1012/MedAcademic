// "Meu método de estudo": os passos do 1º contato (tema novo) e do 2º contato (1ª revisão, 24 h depois).
// O aluno escolhe um modelo pronto ou marca os passos que quer entre várias opções (pode reordenar e
// somar um passo seu). Salva como lista de passos (um texto por passo), o mesmo formato de antes.
import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Plus, X } from 'lucide-react';
import { METHOD_PRESETS, TECHNIQUES } from '../../data/studyMethod';

interface Props {
  first: string[] | undefined;
  second: string[] | undefined;
  onChange: (first: string[] | undefined, second: string[] | undefined) => void;
}

/** Opção pronta: rótulo curto no chip + o passo completo que vai para o plano */
interface StepOption {
  key: string;
  short: string;
  text: string;
}

const G1 = TECHNIQUES.estudo_inicial.steps;
const G2 = TECHNIQUES.folha_branco.steps;
const VIDEO = METHOD_PRESETS.find((p) => p.id === 'video');
const V1 = VIDEO?.first || [];
const V2 = VIDEO?.second || [];

/** Opções do 1º contato (tema novo): as do guia, as do modelo videoaula e outras boas práticas */
const FIRST_OPTIONS: StepOption[] = [
  { key: 'preteste', short: 'Pré-teste', text: G1[0] },
  { key: 'mapa', short: 'Mapa geral', text: G1[1] },
  { key: 'video', short: 'Videoaula', text: V1[1] },
  { key: 'aula15', short: 'Aula em 1,5x', text: 'Aula em 1,5x: assista à aula do tema mais rápido, pausando para anotar' },
  { key: 'leitura', short: 'Leitura do material', text: 'Leia o material base (livro, apostila ou diretriz), focando no que errou no pré-teste' },
  { key: 'feynman', short: 'Feynman', text: G1[2] },
  { key: 'resumo', short: 'Resumo', text: V1[2] },
  { key: 'resumo_ativo', short: 'Resumo ativo', text: 'Resumo ativo: escreva com suas palavras, sem copiar o texto' },
  { key: 'mapa_mental', short: 'Mapa mental', text: 'Mapa mental: ligue causa, sinais, diagnóstico e conduta num desenho' },
  { key: 'caso', short: 'Caso clínico', text: 'Caso clínico: aplique o tema num caso (sinais, exames e conduta)' },
  { key: 'flashcards', short: 'Flashcards', text: G1[3] },
  { key: 'questoes_com', short: 'Questões comentadas', text: G1[4] },
  { key: 'questoes30', short: '30 questões', text: V1[3] },
  { key: 'erros', short: 'Caderno de erros', text: G1[5] },
  { key: 'erros_corrigir', short: 'Corrigir erros', text: V1[4] },
  { key: 'folha5', short: 'Folha em branco (5 min)', text: 'Folha em branco (5 min): no fim, escreva o que lembra sem olhar' },
  { key: 'perguntas', short: 'Perguntas de prova', text: 'Escreva 3 perguntas que a prova faria sobre o tema' },
  { key: 'ensinar', short: 'Ensinar alguém', text: 'Ensine alguém (ou grave um áudio) explicando o tema em 2 minutos' },
].filter((o) => !!o.text);

/** Opções do 2º contato (1ª revisão, 24 h depois) */
const SECOND_OPTIONS: StepOption[] = [
  { key: 'folha', short: 'Folha em branco', text: G2[0] },
  { key: 'conferir', short: 'Conferir com outra cor', text: G2[1] },
  { key: 'flash_novos', short: 'Flashcards do que esqueceu', text: G2[2] },
  { key: 'resumo_voz', short: 'Resumo em voz alta', text: V2[0] },
  { key: 'folha_v', short: 'Folha em branco (modelo videoaula)', text: V2[1] },
  { key: 'flashcards', short: 'Flashcards do tema', text: 'Faça os flashcards do tema criados ontem' },
  { key: 'questoes', short: 'Revisão por questões', text: V2[2] },
  { key: 'questoes10', short: '10 questões sem consultar', text: 'Revisão por questões: 10 questões do tema, sem consultar' },
  { key: 'erros', short: 'Corrigir erros', text: V2[3] },
  { key: 'caderno', short: 'Caderno de erros', text: 'Releia o caderno de erros do tema e tente lembrar cada regra antes de ler' },
  { key: 'feynman', short: 'Feynman', text: 'Feynman: explique o tema em voz alta, sem olhar, e marque onde travou' },
  { key: 'mapa_mental', short: 'Refazer o mapa mental', text: 'Refaça o mapa mental de memória e compare com o original' },
  { key: 'resumo_ativo', short: 'Completar o resumo', text: 'Resumo ativo: complete o resumo com o que faltou na folha em branco' },
  { key: 'simulado', short: 'Mini simulado', text: 'Mini simulado: 5 questões com tempo, como na prova' },
  { key: 'ensinar', short: 'Ensinar alguém', text: 'Ensine o tema a alguém (ou grave um áudio de 2 minutos)' },
  { key: 'audio', short: 'Áudio em 1,5x', text: 'Ouça um áudio ou resumo do tema em 1,5x (no trajeto ou na academia)' },
].filter((o) => !!o.text);

const same = (a: string[] | undefined, b: string[]) => !!a && a.length === b.length && a.every((x, i) => x === b[i]);

/** Um contato: passos marcados (na ordem), opções prontas para marcar e "+ outro" */
const ContactPicker: React.FC<{
  id: string;
  label: string;
  options: StepOption[];
  value: string[];
  onChange: (v: string[]) => void;
}> = ({ id, label, options, value, onChange }) => {
  const [custom, setCustom] = useState('');
  const selected = new Set(value);
  const toggle = (text: string) => onChange(selected.has(text) ? value.filter((x) => x !== text) : [...value, text]);
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };
  const addCustom = () => {
    const t = custom.trim().replace(/^\s*(?:\d+[.)]|[-•])\s*/, '');
    if (!t) return;
    if (!selected.has(t)) onChange([...value, t]);
    setCustom('');
  };
  const iconBtn =
    'h-8 w-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent';

  return (
    <div id={id} className="rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-2.5">
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{label}</p>
        <span className="text-[11px] text-slate-500 dark:text-slate-400 shrink-0">
          {value.length} passo{value.length === 1 ? '' : 's'}
        </span>
      </div>

      {/* Passos marcados, na ordem do plano */}
      {value.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 dark:border-slate-700 px-3 py-2 text-[11px] text-slate-500 dark:text-slate-400">
          Nenhum passo marcado. Assim, o plano usa os passos do guia.
        </p>
      ) : (
        <ol id={`${id}-list`} className="rounded-xl border border-slate-200 dark:border-slate-800 divide-y divide-slate-200 dark:divide-slate-800">
          {value.map((text, i) => (
            <li key={`${text}-${i}`} className="flex items-center gap-1.5 pl-2.5 pr-1 py-1">
              <span className="shrink-0 h-5 w-5 rounded-full bg-sky-600 text-white text-[10px] font-black grid place-items-center">{i + 1}</span>
              <span className="min-w-0 flex-1 text-[12px] leading-snug text-slate-800 dark:text-slate-100">{text}</span>
              <button type="button" aria-label={`Subir: ${text}`} disabled={i === 0} onClick={() => move(i, -1)} className={iconBtn}>
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label={`Descer: ${text}`} disabled={i === value.length - 1} onClick={() => move(i, 1)} className={iconBtn}>
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button type="button" aria-label={`Tirar: ${text}`} onClick={() => onChange(value.filter((_, k) => k !== i))} className={iconBtn}>
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ol>
      )}

      {/* Opções prontas */}
      <div>
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">Marque o que você faz</p>
        <div className="flex flex-wrap gap-1.5">
          {options.map((o) => {
            const on = selected.has(o.text);
            return (
              <button
                key={o.key}
                type="button"
                id={`${id}-opt-${o.key}`}
                aria-pressed={on}
                title={o.text}
                onClick={() => toggle(o.text)}
                className={`min-h-[36px] px-2.5 rounded-xl border text-[12px] font-bold inline-flex items-center gap-1 transition-colors ${
                  on
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400 dark:hover:border-sky-600'
                }`}
              >
                {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5 opacity-60" />}
                {o.short}
              </button>
            );
          })}
        </div>
      </div>

      {/* + outro passo */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          addCustom();
        }}
        className="flex gap-1.5"
      >
        <input
          id={`${id}-custom`}
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          maxLength={120}
          placeholder="+ outro passo (opcional)"
          aria-label="Somar um passo seu"
          className="flex-1 min-w-0 min-h-[36px] rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-3 text-[12px] text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:border-sky-500"
        />
        <button
          type="submit"
          id={`${id}-custom-add`}
          disabled={!custom.trim()}
          className="min-h-[36px] px-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-[12px] font-black inline-flex items-center gap-1"
        >
          <Plus className="h-3.5 w-3.5" /> Somar
        </button>
      </form>
    </div>
  );
};

export const MethodEditor: React.FC<Props> = ({ first, second, onChange }) => {
  const guide = METHOD_PRESETS[0];
  const active = !first && !second ? 'guia' : METHOD_PRESETS.find((p) => p.id !== 'guia' && same(first, p.first) && same(second, p.second))?.id || 'meu';
  // Sem escolha própria, aparecem marcados os passos do guia
  const f = first ?? guide.first;
  const s = second ?? guide.second;

  return (
    <div id="routine-method" className="space-y-3">
      <div className="grid sm:grid-cols-3 gap-1.5">
        {METHOD_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            id={`method-preset-${p.id}`}
            aria-pressed={active === p.id}
            onClick={() => (p.id === 'guia' ? onChange(undefined, undefined) : onChange([...p.first], [...p.second]))}
            className={`min-h-[52px] rounded-xl border px-3 py-2 text-left transition-colors ${
              active === p.id ? 'bg-sky-600 border-sky-600 text-white' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-sky-400'
            }`}
          >
            <span className="block text-xs font-black">{p.label}</span>
            <span className={`block text-[11px] ${active === p.id ? 'text-sky-100' : 'text-slate-500 dark:text-slate-400'}`}>{p.hint}</span>
          </button>
        ))}
        <span
          className={`min-h-[52px] rounded-xl border px-3 py-2 ${active === 'meu' ? 'bg-sky-600 border-sky-600 text-white' : 'border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400'}`}
        >
          <span className="block text-xs font-black">Do meu jeito</span>
          <span className="block text-[11px]">Marque os passos abaixo</span>
        </span>
      </div>

      <ContactPicker
        id="method-first"
        label="🌱 1º contato com o tema (tema novo)"
        options={FIRST_OPTIONS}
        value={f}
        onChange={(v) => onChange(v, second)}
      />
      <ContactPicker
        id="method-second"
        label="📝 2º contato (1ª revisão, 24 h depois)"
        options={SECOND_OPTIONS}
        value={s}
        onChange={(v) => onChange(first, v)}
      />
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Marque os passos, mude a ordem com as setas ou some um seu. Eles aparecem no plano do dia e no tema, com um quadradinho para marcar cada um. As revisões seguintes (7 dias, 30 dias…) continuam com questões.
      </p>
    </div>
  );
};
