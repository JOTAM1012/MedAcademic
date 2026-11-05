import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { ymd } from '../data/blockReview';

interface DatePickerFieldProps {
  id?: string;
  value: string; // YYYY-MM-DD ou ''
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const MONTHS = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEK = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'];
const WEEKDAY_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const parse = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return ymd(d);
};

// Campo de data com calendário rápido (atalhos Hoje / Amanhã / +7 dias e grade do mês)
export const DatePickerField: React.FC<DatePickerFieldProps> = ({ id, value, onChange, placeholder = 'Escolher data', className = '' }) => {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => (value ? parse(value) : new Date()));
  const ref = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // O calendário abre por cima de tudo (fora de cartões que cortam o conteúdo) e cabe na tela
  const place = () => {
    const btn = ref.current?.getBoundingClientRect();
    if (!btn) return;
    const W = 288;
    const H = popRef.current?.offsetHeight || 340;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const left = Math.min(Math.max(8, btn.left), vw - W - 8);
    const below = btn.bottom + 6;
    const top = below + H > vh - 8 && btn.top - H - 6 > 8 ? btn.top - H - 6 : Math.max(8, Math.min(below, vh - H - 8));
    setPos({ top, left });
  };
  useLayoutEffect(() => {
    if (!open) return;
    place();
    const raf = requestAnimationFrame(place);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) setView(value ? parse(value) : new Date());
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      const t = e.target as Node;
      if (ref.current?.contains(t) || popRef.current?.contains(t)) return;
      setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const today = ymd(new Date());
  const first = new Date(view.getFullYear(), view.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // semana começa na segunda
  const daysInMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate();
  const cells: Array<string | null> = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => ymd(new Date(view.getFullYear(), view.getMonth(), i + 1))),
  ];

  const pick = (d: string) => {
    onChange(d);
    setOpen(false);
  };
  const shift = (months: number) => setView((v) => new Date(v.getFullYear(), v.getMonth() + months, 1));

  const label = value
    ? (() => {
        const d = parse(value);
        return `${WEEKDAY_SHORT[d.getDay()]}, ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
      })()
    : placeholder;

  return (
    <div ref={ref} className="relative">
      <button
        id={id}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 text-left ${className} ${value ? '' : 'text-slate-400'}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span className="truncate">{label}</span>
        <Calendar className="h-4 w-4 shrink-0 text-sky-500" />
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          role="dialog"
          aria-label="Calendário"
          onClick={(e) => e.stopPropagation()}
          style={{ top: pos?.top ?? -9999, left: pos?.left ?? -9999 }}
          className="fixed z-[120] w-72 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xl p-3 animate-in fade-in"
        >
          <div className="flex gap-1 mb-2.5">
            {[
              ['Hoje', 0],
              ['Amanhã', 1],
              ['+7 dias', 7],
              ['+15 dias', 15],
            ].map(([lbl, n]) => (
              <button
                key={lbl as string}
                type="button"
                onClick={() => pick(plusDays(n as number))}
                className="flex-1 px-1.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-700 dark:text-slate-200 hover:bg-sky-100 dark:hover:bg-sky-950"
              >
                {lbl}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between mb-1.5">
            <button type="button" onClick={() => shift(-1)} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Mês anterior">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-xs font-black text-slate-900 dark:text-white">
              {MONTHS[view.getMonth()]} {view.getFullYear()}
            </span>
            <button type="button" onClick={() => shift(1)} className="p-1 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Próximo mês">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEK.map((w, i) => (
              <span key={i} className="text-[10px] font-bold text-slate-400 py-1">
                {w}
              </span>
            ))}
            {cells.map((d, i) =>
              d ? (
                <button
                  key={d}
                  type="button"
                  onClick={() => pick(d)}
                  className={`h-8 rounded-lg text-xs font-semibold transition-colors ${
                    d === value
                      ? 'bg-sky-600 text-white'
                      : d === today
                      ? 'ring-1 ring-sky-500 text-sky-600 dark:text-sky-400'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {Number(d.slice(8))}
                </button>
              ) : (
                <span key={`e${i}`} />
              )
            )}
          </div>
          {value && (
            <button type="button" onClick={() => pick('')} className="mt-2 w-full text-[11px] font-semibold text-slate-400 hover:text-rose-500">
              Limpar data
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};
