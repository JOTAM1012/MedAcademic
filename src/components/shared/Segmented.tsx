// Seletor de uma opção (ex.: Semana | Mês) com o GooeyNav nas cores do site.
// Use em todo lugar com botões lado a lado em que só um fica ativo.
import React from 'react';
import { useApp } from '../../context/AppContext';
import GooeyNav from './GooeyNav';

export interface SegmentedOption<T extends string> {
  id: T;
  label: string;
  hint?: string;
  icon?: React.ReactNode;
  badge?: number | string;
}

interface Props<T extends string> {
  options: ReadonlyArray<SegmentedOption<T>>;
  value: T;
  onChange: (id: T) => void;
  ariaLabel: string;
  /** id de cada botão */
  idFor?: (id: T) => string;
  /** ocupa a largura toda */
  stretch?: boolean;
  className?: string;
  /** tamanho da letra (px) */
  fontSize?: number;
  /** uma linha só (coloque dentro de um pai com overflow-x-auto) */
  nowrap?: boolean;
}

export default function Segmented<T extends string>({ options, value, onChange, ariaLabel, idFor, stretch, className = '', fontSize = 12, nowrap }: Props<T>) {
  const { isDarkMode } = useApp();
  const index = Math.max(
    0,
    options.findIndex((o) => o.id === value)
  );
  return (
    <GooeyNav
      ariaLabel={ariaLabel}
      items={options.map((o) => ({ label: o.label, hint: o.hint, icon: o.icon, badge: o.badge, id: idFor?.(o.id) }))}
      activeIndex={index}
      onChange={(i) => onChange(options[i].id)}
      theme={isDarkMode ? 'dark' : 'light'}
      size="sm"
      stretch={stretch}
      className={`${nowrap ? 'gooey-nav--nowrap ' : ''}${className}`}
      color="#2563eb"
      activeTextColor="#ffffff"
      particleCount={12}
      spread={14}
      bleed={5}
      style={
        {
          '--gn-font': `${fontSize}px`,
          '--gn-frame': isDarkMode ? 'rgba(15, 17, 21, 0.5)' : '#edeff2',
          '--gn-frame-edge': isDarkMode ? '#22262d' : '#e1e4ea',
          '--gn-frame-highlight': 'transparent',
          '--gn-frame-shadow': 'none',
          '--gn-ink': isDarkMode ? '#ffffff' : '#181b21',
          '--gn-muted': isDarkMode ? '#9aa1ad' : '#6c7380',
        } as React.CSSProperties
      }
    />
  );
}
