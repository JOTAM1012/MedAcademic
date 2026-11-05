import React from 'react';
import { repairLocalPhotoData } from '../lib/storageSafety';

interface State {
  error: Error | null;
  repairing: boolean;
}

// Em vez de deixar a tela totalmente escura quando algo quebra, mostra uma tela de recuperação.
export class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, repairing: false };
  // (o projeto não tem @types/react; declara o que a classe usa)
  declare props: { children: React.ReactNode };
  declare setState: (s: Partial<State>) => void;

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[MedAcademic] Erro na interface:', error, info.componentStack);
  }

  private repair = async () => {
    this.setState({ repairing: true });
    await repairLocalPhotoData();
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        id="app-recovery-screen"
        style={{ minHeight: '100dvh', background: '#020617', color: '#e2e8f0', fontFamily: 'Inter, system-ui, sans-serif' }}
        className="flex items-center justify-center p-6"
      >
        <div className="w-full max-w-sm rounded-3xl border border-slate-800 bg-slate-900 p-6 text-center space-y-4 shadow-2xl">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-2xl">🩺</div>
          <div>
            <h1 className="text-lg font-black text-white">Algo não carregou direito</h1>
            <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
              Seus estudos estão salvos. Toque em <b className="text-slate-200">Reparar e abrir</b>: isso remove só a foto de perfil
              deste aparelho (você pode enviá-la de novo) e recarrega o MedAcademic.
            </p>
          </div>
          <button
            id="app-recovery-repair"
            onClick={this.repair}
            disabled={this.state.repairing}
            className="w-full rounded-2xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-black py-3 disabled:opacity-60"
          >
            {this.state.repairing ? 'Reparando…' : 'Reparar e abrir'}
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full rounded-2xl border border-slate-700 text-slate-300 text-xs font-bold py-2.5 hover:bg-slate-800"
          >
            Só recarregar
          </button>
        </div>
      </div>
    );
  }
}
