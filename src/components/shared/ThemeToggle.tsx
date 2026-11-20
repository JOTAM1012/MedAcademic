// Botão de modo claro/escuro: marcado = noite (lua e estrelas), desmarcado = dia (sol e nuvens).
import React from 'react';
import './ThemeToggle.css';

interface ThemeToggleProps {
  dark: boolean;
  onToggle: () => void;
  className?: string;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ dark, onToggle, className = '' }) => (
  <label id="theme-toggle-button" className={className}>
    <input
      type="checkbox"
      role="switch"
      id="toggle"
      data-testid="topbar-theme-toggle-btn"
      checked={dark}
      onChange={onToggle}
      aria-label={dark ? 'Ativar modo claro' : 'Ativar modo escuro'}
    />
    <svg viewBox="0 0 69.667 44" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      {/* céu */}
      <rect id="container" x="0" y="0" width="69.667" height="44" rx="22" fill="#3d7eae" />
      {/* nuvens (dia) */}
      <g id="cloud" fill="#fff">
        <circle cx="50" cy="38" r="9" />
        <circle cx="61" cy="34" r="8" />
        <circle cx="40" cy="42" r="7" opacity="0.85" />
        <circle cx="66" cy="27" r="5" opacity="0.85" />
      </g>
      {/* estrelas (noite) */}
      <g id="stars" fill="#fff">
        <path d="M10 10 l0.9 2.1 2.1 0.9 -2.1 0.9 -0.9 2.1 -0.9 -2.1 -2.1 -0.9 2.1 -0.9z" />
        <path d="M20 26 l0.7 1.6 1.6 0.7 -1.6 0.7 -0.7 1.6 -0.7 -1.6 -1.6 -0.7 1.6 -0.7z" />
        <path d="M14 33 l0.5 1.1 1.1 0.5 -1.1 0.5 -0.5 1.1 -0.5 -1.1 -1.1 -0.5 1.1 -0.5z" />
        <circle cx="22" cy="12" r="0.9" />
        <circle cx="7" cy="23" r="0.8" />
        <circle cx="27" cy="34" r="0.7" />
      </g>
      {/* bolinha: sol ou lua */}
      <g id="button">
        <g id="sun">
          <circle cx="19.667" cy="19.667" r="19.667" fill="#f8e664" />
          <circle cx="19.667" cy="19.667" r="19.667" fill="none" stroke="#e8c63a" strokeWidth="1.5" />
          <circle cx="15" cy="13" r="5" fill="#fff6b4" opacity="0.7" />
        </g>
        <g id="moon">
          <circle cx="19.667" cy="19.667" r="19.667" fill="#cce6ee" />
          <g id="patches" fill="#a6cad0">
            <circle cx="12" cy="13" r="4" />
            <circle cx="26" cy="11" r="2.5" />
            <circle cx="25" cy="27" r="5" />
            <circle cx="12" cy="28" r="2" />
          </g>
        </g>
      </g>
    </svg>
  </label>
);

export default ThemeToggle;
