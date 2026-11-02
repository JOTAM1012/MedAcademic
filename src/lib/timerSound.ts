// Bipes do Pomodoro e notificações do sistema.
// Os bipes de fim são AGENDADOS no relógio de áudio (Web Audio) no momento em que o timer começa:
// o áudio toca na hora certa mesmo com a aba em segundo plano, quando o navegador atrasa o JavaScript.

type BeepKind = 'start' | 'end';

// start: dois bipes subindo · end: três bipes mais longos
const PATTERNS: Record<BeepKind, Array<{ at: number; freq: number; dur: number }>> = {
  start: [
    { at: 0, freq: 660, dur: 0.12 },
    { at: 0.16, freq: 880, dur: 0.16 },
  ],
  end: [
    { at: 0, freq: 880, dur: 0.22 },
    { at: 0.32, freq: 880, dur: 0.22 },
    { at: 0.64, freq: 1046, dur: 0.38 },
  ],
};

let ctx: AudioContext | null = null;
let scheduled: Array<{ osc: OscillatorNode; startAt: number }> = [];

const getCtx = () => {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  return ctx;
};

/** Precisa ser chamado num clique (Iniciar): navegadores só liberam áudio após um gesto do usuário */
export function unlockTimerAudio() {
  const c = getCtx();
  if (c && c.state === 'suspended') c.resume().catch(() => {});
}

export const isTimerAudioRunning = () => ctx?.state === 'running';

const schedulePattern = (kind: BeepKind, delaySeconds: number, track: boolean) => {
  const c = getCtx();
  if (!c) return;
  const base = c.currentTime + Math.max(0, delaySeconds);
  PATTERNS[kind].forEach(({ at, freq, dur }) => {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = base + at;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + dur + 0.05);
    if (track) {
      const entry = { osc, startAt: t };
      scheduled.push(entry);
      osc.onended = () => {
        scheduled = scheduled.filter((e) => e !== entry);
      };
    }
  });
};

export function playTimerBeep(kind: BeepKind) {
  unlockTimerAudio();
  schedulePattern(kind, 0, false);
}

/** Agenda um bipe para um instante (epoch ms); pode ser cancelado com cancelScheduledBeeps */
export function scheduleTimerBeepAt(kind: BeepKind, atMs: number) {
  schedulePattern(kind, (atMs - Date.now()) / 1000, true);
}

/** Cancela só os bipes que ainda não começaram (um bipe tocando agora vai até o fim) */
export function cancelScheduledBeeps() {
  const now = ctx?.currentTime ?? 0;
  scheduled = scheduled.filter(({ osc, startAt }) => {
    if (startAt <= now) return true;
    try {
      osc.stop();
    } catch {
      /* já parado */
    }
    return false;
  });
}

// ---------- Notificações do sistema (quando o app não está visível) ----------

export function requestTimerNotifications() {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'default') Notification.requestPermission().catch(() => {});
}

export function notifyTimer(title: string, body: string) {
  if (typeof document === 'undefined' || !document.hidden) return;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  const options = { body, icon: '/icon-192.png', badge: '/icon-192.png', tag: 'medacademic-timer', renotify: true } as NotificationOptions;
  // No Android a notificação precisa sair pelo service worker
  navigator.serviceWorker?.getRegistration().then((reg) => {
    if (reg) reg.showNotification(title, options);
    else new Notification(title, options);
  }).catch(() => {
    try {
      new Notification(title, options);
    } catch {
      /* sem suporte */
    }
  });
}
