// MedAcademic Service Worker - Aggressive Cache-First Offline Support
const CACHE_VERSION = 'medacademic-v2';
const STATIC_CACHE_NAME = `medacademic-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE_NAME = `medacademic-dynamic-${CACHE_VERSION}`;

const PRECACHE_RESOURCES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.svg',
];

// Install Event: Aggressive Precaching of Core App Shell
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker e pré-carregando assets estáticos...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_RESOURCES).catch((err) => {
        console.warn('[SW] Falha parcial no precache (não-fatal):', err);
      });
    }).then(() => {
      return self.skipWaiting();
    })
  );
});

// Activate Event: Purge old caches & claim clients immediately
self.addEventListener('activate', (event) => {
  console.log('[SW] Ativando Service Worker e limpando caches antigos...');
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== STATIC_CACHE_NAME && key !== DYNAMIC_CACHE_NAME) {
            console.log('[SW] Removendo cache obsoleto:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Fetch Event: Cache-First for static assets & navigate requests; network fallback with API offline handlers
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignore non-http(s) requests (chrome-extension, data URIs, etc.)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle API Requests (Gemini & Backend) with graceful offline fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          return response;
        })
        .catch(() => {
          console.log('[SW] Requisição de API interceptada offline:', url.pathname);
          if (url.pathname.includes('/gemini/chat')) {
            return new Response(
              JSON.stringify({
                text: "⚠️ **[Dr. Gemini - Modo Offline]** Você está desconectado da internet no momento.\n\n📚 Suas revisões, cronômetro, matérias e simulados continuam funcionando normalmente no dispositivo com salvamento local. Assim que a rede for restabelecida, as respostas em tempo real com raciocínio profundo da IA serão reativadas.",
                isOffline: true
              }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          }
          if (url.pathname.includes('/gemini/generate-topics')) {
            return new Response(
              JSON.stringify({
                topics: [
                  { moduleName: "Fisiopatologia Geral", title: "Mecanismos Fisiopatológicos Fundamentais", description: "Bases fisiopatológicas e manifestações clínicas essenciais.", difficulty: "medio", preferredStudyMethod: "resumo" },
                  { moduleName: "Diagnóstico Clínico", title: "Critérios Diagnósticos e Exames", description: "Sinais de alarme e diagnóstico diferencial.", difficulty: "medio", preferredStudyMethod: "questoes" },
                  { moduleName: "Conduta Terapêutica", title: "Manejo e Tratamento de 1ª Linha", description: "Esquema terapêutico inicial e cuidados.", difficulty: "dificil", preferredStudyMethod: "questoes" }
                ],
                isOffline: true
              }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          }
          if (url.pathname.includes('/gemini/generate-quiz')) {
            return new Response(
              JSON.stringify({
                question: "Paciente apresenta quadro agudo com suspeita clínica. Qual a conduta inicial recomendada pelas diretrizes?",
                options: [
                  "A) Iniciar conduta empírica de suporte e monitorização imediata dos sinais vitais.",
                  "B) Alta hospitalar imediata sem investigação complementar.",
                  "C) Suspender qualquer hidratação venosa.",
                  "D) Aguardar 48h antes de qualquer abordagem clínica."
                ],
                correctIndex: 0,
                explanation: "Em situações de instabilidade ou investigação inicial, a conduta primária visa à estabilização clínica e monitorização rigorosa dos sinais vitais.",
                isOffline: true
              }),
              { headers: { 'Content-Type': 'application/json' } }
            );
          }
          return new Response(
            JSON.stringify({ status: 'offline', message: 'Serviço em modo offline' }),
            { headers: { 'Content-Type': 'application/json' } }
          );
        })
    );
    return;
  }

  // Handle Navigation Requests (HTML / SPA routes) - CACHE-FIRST for instantaneous loading
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      caches.match('/index.html').then((cachedHtml) => {
        if (cachedHtml) {
          // Revalidate in background to keep cache fresh
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(STATIC_CACHE_NAME).then((cache) => {
                cache.put('/index.html', networkResponse.clone());
                cache.put('/', networkResponse);
              });
            }
          }).catch(() => { /* offline revalidation ignored */ });
          return cachedHtml;
        }

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(STATIC_CACHE_NAME).then((cache) => {
              cache.put('/index.html', clone);
            });
          }
          return networkResponse;
        }).catch(async () => {
          const cache = await caches.open(STATIC_CACHE_NAME);
          const offlineHtml = await cache.match('/index.html') || await cache.match('/');
          return offlineHtml || new Response(
            '<!DOCTYPE html><html><body><h1>MedAcademic Offline</h1><p>O aplicativo está pronto para uso offline.</p></body></html>',
            { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
        });
      })
    );
    return;
  }

  // Handle Static Assets (JS, CSS, SVGs, Images, Web Fonts) - AGGRESSIVE CACHE-FIRST
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Cache hit! Return immediately from local cache.
        // Revalidate in background asynchronously for fresh assets
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
              cache.put(request, networkResponse);
            });
          }
        }).catch(() => { /* silent offline revalidation error */ });

        return cachedResponse;
      }

      // Cache miss: fetch from network and store aggressively into dynamic cache
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(DYNAMIC_CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return networkResponse;
      }).catch(() => {
        console.warn('[SW] Asset estático indisponível offline:', request.url);
        return new Response('', { status: 408, statusText: 'Offline Resource Unavailable' });
      });
    })
  );
});
