// MedAcademic Service Worker Registration
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return;

  // In development the SW would cache Vite modules and serve stale code; remove any old registration.
  if (!import.meta.env.PROD) {
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/service-worker.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registrado com sucesso! Escopo:', registration.scope);

        registration.onupdatefound = () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  console.log('[PWA] Nova versão disponível do aplicativo.');
                } else {
                  console.log('[PWA] Conteúdo e assets estáticos armazenados em cache para execução offline.');
                }
              }
            };
          }
        };
      })
      .catch((error) => {
        console.warn('[PWA] Falha na ativação do Service Worker:', error);
      });
  });
}
