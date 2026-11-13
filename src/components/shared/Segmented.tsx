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
      color="#0284c7"
      activeTextColor="#ffffff"
      particleCount={12}
      spread={14}
      bleed={5}
      style={
        {
          '--gn-font': `${fontSize}px`,
          '--gn-frame': isDarkMode ? 'rgba(2, 6, 23, 0.5)' : '#f1f5f9',
          '--gn-frame-edge': isDarkMode ? '#1e293b' : '#e2e8f0',
          '--gn-frame-highlight': 'transparent',
          '--gn-frame-shadow': 'none',
          '--gn-ink': isDarkMode ? '#ffffff' : '#0f172a',
          '--gn-muted': isDarkMode ? '#94a3b8' : '#64748b',
        } as React.CSSProperties
      }
    />
  );
}
