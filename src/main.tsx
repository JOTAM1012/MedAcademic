import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './registerServiceWorker';
import { initPwaInstall } from './lib/pwaInstall';

// Register PWA Service Worker for offline capability
registerServiceWorker();
// Guarda o convite de instalação do navegador para o botão "Instalar app"
initPwaInstall();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

