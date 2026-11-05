import React, { useState } from 'react';
import { Smartphone, Monitor, Download, CheckCircle2, Share, PlusSquare, MoreVertical, AlertTriangle, X } from 'lucide-react';
import { InstallPlatform, openInstallGuide, promptPwaInstall, usePwaInstall } from '../lib/pwaInstall';

const PLATFORM_TABS: Array<{ id: InstallPlatform; label: string; icon: React.ElementType }> = [
  { id: 'android', label: 'Android', icon: Smartphone },
  { id: 'ios', label: 'iPhone', icon: Smartphone },
  { id: 'desktop', label: 'Computador', icon: Monitor },
];

const STEPS: Record<InstallPlatform, Array<{ icon: React.ElementType; title: string; text: string }>> = {
  android: [
    { icon: Smartphone, title: 'Abra no Chrome', text: 'Acesse medacademic.vercel.app pelo Google Chrome.' },
    { icon: MoreVertical, title: 'Toque no menu ⋮', text: 'No canto superior direito do navegador.' },
    { icon: Download, title: '"Instalar app"', text: 'Ou "Adicionar à tela inicial". Confirme em Instalar.' },
  ],
  ios: [
    { icon: Smartphone, title: 'Abra no Safari', text: 'No iPhone a instalação só funciona pelo Safari.' },
    { icon: Share, title: 'Toque em Compartilhar', text: 'O quadrado com a seta para cima, na barra do Safari.' },
    { icon: PlusSquare, title: '"Adicionar à Tela de Início"', text: 'Role a lista se precisar e toque em Adicionar.' },
  ],
  desktop: [
    { icon: Monitor, title: 'Abra no Chrome ou Edge', text: 'Acesse medacademic.vercel.app no computador.' },
    { icon: Download, title: 'Ícone de instalar', text: 'Clique no ícone de instalar na barra de endereço (à direita).' },
    { icon: CheckCircle2, title: 'Confirme', text: 'O MedAcademic abre em janela própria, como um programa.' },
  ],
};

interface InstallAppGuideProps {
  compact?: boolean;
}

/** Passo a passo de instalação, com botão nativo quando o navegador oferece */
export const InstallAppGuide: React.FC<InstallAppGuideProps> = ({ compact = false }) => {
  const { canPrompt, isInstalled, platform, isIOSNonSafari } = usePwaInstall();
  const [tab, setTab] = useState<InstallPlatform>(platform);
  const [result, setResult] = useState<'accepted' | 'dismissed' | null>(null);

  const handleInstall = async () => {
    const ok = await promptPwaInstall();
    setResult(ok ? 'accepted' : 'dismissed');
  };

  if (isInstalled || result === 'accepted') {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-6 w-6 shrink-0" />
        <div>
          <p className="text-sm font-bold">O MedAcademic já está instalado neste aparelho</p>
          <p className="text-xs opacity-80">Abra pelo ícone na tela inicial. As atualizações chegam sozinhas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {canPrompt && (
        <button
          id="install-app-native-btn"
          onClick={handleInstall}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold shadow-md transition-colors"
        >
          <Download className="h-4 w-4" />
          Instalar agora neste aparelho
        </button>
      )}

      {platform === 'ios' && isIOSNonSafari && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-300">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>Você está em outro navegador. Copie o link e abra no <strong>Safari</strong> para instalar.</span>
        </div>
      )}

      <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 dark:bg-slate-950/70 p-1">
        {PLATFORM_TABS.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              onClick={() => setTab(p.id)}
              className={`flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[11px] font-bold whitespace-nowrap transition-colors ${
                tab === p.id
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {p.label}
              {p.id === platform && <span className="w-1.5 h-1.5 shrink-0 rounded-full bg-sky-500" title="Seu aparelho" />}
            </button>
          );
        })}
      </div>

      <ol className={compact ? 'space-y-1.5' : 'space-y-2'}>
        {STEPS[tab].map((s, i) => {
          const Icon = s.icon;
          return (
            <li
              key={s.title}
              className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-2.5"
            >
              <span className="w-7 h-7 shrink-0 rounded-full bg-sky-600 text-white text-xs font-black flex items-center justify-center">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white">{s.title}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">{s.text}</p>
              </div>
              <Icon className="h-4 w-4 shrink-0 text-sky-500" />
            </li>
          );
        })}
      </ol>

      {!compact && (
        <p className="text-[11px] text-slate-500 dark:text-slate-400">
          Instalado, ele abre em tela cheia com ícone próprio, funciona offline e continua sincronizando seus dados na nuvem.
        </p>
      )}
      {result === 'dismissed' && (
        <p className="text-[11px] text-slate-500">Instalação cancelada. Você pode instalar depois pelo menu do navegador.</p>
      )}
    </div>
  );
};

const BANNER_DISMISS_KEY = 'medacademic_install_banner_dismissed';

/** Convite discreto no Dashboard, só no celular e enquanto o app não estiver instalado */
export const InstallAppBanner: React.FC = () => {
  const { isInstalled, platform, canPrompt } = usePwaInstall();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(BANNER_DISMISS_KEY) === 'true';
    } catch {
      return false;
    }
  });

  if (isInstalled || dismissed || platform === 'desktop') return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(BANNER_DISMISS_KEY, 'true');
    } catch {}
  };

  return (
    <div id="install-app-banner" className="flex items-center gap-3 rounded-2xl border border-sky-200 dark:border-sky-800/70 bg-sky-50 dark:bg-sky-950/40 p-3">
      <img src="/icon-192.png" alt="" className="w-10 h-10 rounded-xl shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-900 dark:text-white">Use o MedAcademic como aplicativo</p>
        <p className="text-[11px] text-slate-600 dark:text-slate-400">Ícone na tela inicial, tela cheia e funciona offline.</p>
      </div>
      <button
        onClick={async () => {
          if (canPrompt && (await promptPwaInstall())) return;
          openInstallGuide();
        }}
        className="shrink-0 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold"
      >
        Instalar
      </button>
      <button onClick={dismiss} className="shrink-0 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Dispensar">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

interface InstallAppModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallAppModal: React.FC<InstallAppModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;
  return (
    <div className="app-modal fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in" onClick={onClose}>
      <div
        className="app-modal-panel relative w-full max-w-md max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <img src="/icon-192.png" alt="" className="w-11 h-11 rounded-xl" />
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Instalar o MedAcademic</h2>
              <p className="text-xs text-slate-500">Use como aplicativo no celular ou no computador</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label="Fechar">
            <X className="h-5 w-5" />
          </button>
        </div>
        <InstallAppGuide />
      </div>
    </div>
  );
};
