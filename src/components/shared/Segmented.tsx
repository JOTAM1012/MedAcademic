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
      color={isDarkMode ? '#e8e6e1' : '#0a0a0a'}
      activeTextColor={isDarkMode ? '#0a0a0a' : '#edeae3'}
      particleCount={12}
      spread={14}
      bleed={5}
      style={
        {
          '--gn-font': `${fontSize}px`,
          '--gn-frame': isDarkMode ? 'rgba(10, 10, 10, 0.5)' : '#e5e1d8',
          '--gn-frame-edge': isDarkMode ? '#1c1c1c' : '#d9d5cc',
          '--gn-frame-highlight': 'transparent',
          '--gn-frame-shadow': 'none',
          '--gn-ink': isDarkMode ? '#e8e6e1' : '#0a0a0a',
          '--gn-muted': isDarkMode ? '#a3a09a' : '#45413c',
        } as React.CSSProperties
      }
    />
  );
}
