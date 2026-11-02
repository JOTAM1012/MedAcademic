// Instalação do MedAcademic como aplicativo (PWA).
// O Chrome/Edge disparam "beforeinstallprompt" uma única vez, cedo; guardamos o evento aqui
// (initPwaInstall roda no main.tsx antes do React) para o botão "Instalar app" usar depois.
import { useSyncExternalStore } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export type InstallPlatform = 'ios' | 'android' | 'desktop';

interface PwaInstallState {
  canPrompt: boolean; // há um prompt nativo disponível (Android/Chrome/Edge)
  isInstalled: boolean; // rodando como app instalado
  platform: InstallPlatform;
  isIOSNonSafari: boolean; // iPhone fora do Safari (Chrome/Instagram...) não consegue instalar
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

const detectPlatform = (): InstallPlatform => {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (/iphone|ipad|ipod/i.test(ua) || isIPadOS) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
};

const detectInstalled = () => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    // Safari (iOS) expõe navigator.standalone
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
};

const detectIOSNonSafari = () => {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  return detectPlatform() === 'ios' && /crios|fxios|edgios|instagram|fban|fbav|line\//i.test(ua);
};

let state: PwaInstallState = {
  canPrompt: false,
  isInstalled: detectInstalled(),
  platform: detectPlatform(),
  isIOSNonSafari: detectIOSNonSafari(),
};

const setState = (patch: Partial<PwaInstallState>) => {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
};

export function initPwaInstall() {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // usamos nosso próprio botão
    deferredPrompt = e as BeforeInstallPromptEvent;
    setState({ canPrompt: true });
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    setState({ canPrompt: false, isInstalled: true });
  });

  window.matchMedia?.('(display-mode: standalone)').addEventListener?.('change', (ev) => {
    setState({ isInstalled: ev.matches || detectInstalled() });
  });
}

/** Abre o diálogo nativo de instalação. Retorna true se o usuário aceitou. */
export async function promptPwaInstall(): Promise<boolean> {
  if (!deferredPrompt) return false;
  const evt = deferredPrompt;
  deferredPrompt = null;
  setState({ canPrompt: false });
  await evt.prompt();
  const { outcome } = await evt.userChoice;
  return outcome === 'accepted';
}

// Qualquer tela pode abrir a janela "Instalar app" (ouvida no App.tsx)
export const OPEN_INSTALL_EVENT = 'medacademic:open-install';
export const openInstallGuide = () => window.dispatchEvent(new Event(OPEN_INSTALL_EVENT));

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => listeners.delete(cb);
};

export function usePwaInstall() {
  return useSyncExternalStore(subscribe, () => state, () => state);
}
