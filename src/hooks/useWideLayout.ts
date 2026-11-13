// Preferências de layout guardadas neste aparelho (liga/desliga), compartilhadas entre componentes.
import { useEffect, useState } from 'react';

const EVENT = 'medacademic:layout-pref';

const read = (key: string, on: string): boolean => {
  try {
    return localStorage.getItem(key) === on;
  } catch {
    return false;
  }
};

function useLocalToggle(key: string, on = '1', off = '0'): [boolean, () => void] {
  const [value, setValue] = useState(() => read(key, on));

  useEffect(() => {
    const sync = () => setValue(read(key, on));
    window.addEventListener(EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [key, on]);

  const toggle = () => {
    const next = !read(key, on);
    try {
      localStorage.setItem(key, next ? on : off);
    } catch {
      /* sem armazenamento: só nesta tela */
    }
    setValue(next);
    window.dispatchEvent(new Event(EVENT));
  };

  return [value, toggle];
}

/** Layout largo: usa mais da tela em monitores grandes. */
export const useWideLayout = () => useLocalToggle('medacademic_wide_layout');

/** Barra lateral recolhida (só ícones). Mesma chave de antes. */
export const useSidebarCollapsed = () => useLocalToggle('medstudy_sidebar_collapsed', 'true', 'false');
