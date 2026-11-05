import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { registerServiceWorker } from './registerServiceWorker';
import { initPwaInstall } from './lib/pwaInstall';
import { installSafeLocalStorage } from './lib/storageSafety';
import { AppErrorBoundary } from './components/AppErrorBoundary';

// Armazenamento cheio (ex.: foto grande no iPhone) nunca mais derruba o app
installSafeLocalStorage();

// Register PWA Service Worker for offline capability
registerServiceWorker();
// Guarda o convite de instalação do navegador para o botão "Instalar app"
initPwaInstall();

// Teste de desenvolvimento da tela de recuperação (removido do build de produção)
if (import.meta.env.DEV && localStorage.getItem('medacademic_dev_crash') === '1') {
  const Boom = () => {
    throw new Error('teste da tela de recuperação');
  };
  createRoot(document.getElementById('root')!).render(
    <AppErrorBoundary>
      <Boom />
    </AppErrorBoundary>,
  );
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <AppErrorBoundary>
        <App />
      </AppErrorBoundary>
    </StrictMode>,
  );
}
