// MedAcademic Service Worker Registration
export function registerServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      const swUrl = '/service-worker.js';
      navigator.serviceWorker
        .register(swUrl)
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
                    console.log('[PWA] Conteúdo e assets estáticos armazenados em cache para execução 100% offline.');
                  }
                }
              };
            }
          };
        })
        .catch((error) => {
          console.warn('[PWA] Tentando fallback para /sw.js devido a:', error);
          navigator.serviceWorker.register('/sw.js').catch((err) => {
            console.warn('[PWA] Falha na ativação do Service Worker:', err);
          });
        });
    });
  }
}
