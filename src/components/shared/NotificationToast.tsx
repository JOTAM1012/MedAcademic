// Aviso rápido do app (showNotification). Pode ter um botão de ação, como "Desfazer".
import React from 'react';
import { CheckCircle2, Info, AlertTriangle, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const STYLE = {
  success: { icon: CheckCircle2, ring: 'border-emerald-500/40', tint: 'text-emerald-400 bg-emerald-500/15' },
  info: { icon: Info, ring: 'border-sky-500/40', tint: 'text-sky-400 bg-sky-500/15' },
  warning: { icon: AlertTriangle, ring: 'border-amber-500/40', tint: 'text-amber-400 bg-amber-500/15' },
} as const;

export const NotificationToast: React.FC = () => {
  const { notification, dismissNotification } = useApp();
  if (!notification) return null;
  const s = STYLE[notification.type] || STYLE.info;
  const Icon = s.icon;
  return (
    <div
      key={notification.id}
      id="app-notification"
      role="status"
      aria-live="polite"
      className={`fixed left-1/2 -translate-x-1/2 bottom-[calc(84px+env(safe-area-inset-bottom,0px))] lg:bottom-6 z-[60] w-[calc(100%-32px)] max-w-md flex items-center gap-2.5 rounded-2xl border ${s.ring} bg-slate-900/95 backdrop-blur-md text-slate-100 px-3 py-2.5 shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-300`}
    >
      <span className={`p-1.5 rounded-xl shrink-0 ${s.tint}`}>
        <Icon className="h-4 w-4" />
      </span>
      <p className="flex-1 min-w-0 text-xs font-semibold leading-snug">{notification.message}</p>
      {notification.actionLabel && notification.onAction && (
        <button
          type="button"
          id="app-notification-action"
          onClick={() => {
            const fn = notification.onAction;
            dismissNotification();
            fn?.();
          }}
          className="shrink-0 min-h-[36px] px-3 rounded-xl bg-white/10 hover:bg-white/20 text-sky-300 text-xs font-black transition-colors"
        >
          {notification.actionLabel}
        </button>
      )}
      <button
        type="button"
        onClick={dismissNotification}
        aria-label="Fechar aviso"
        className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};
