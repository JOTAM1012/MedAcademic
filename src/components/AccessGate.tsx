import React from 'react';
import { ShieldAlert, Wrench, LogOut, RefreshCw } from 'lucide-react';
import { useAccess } from '../context/AccessContext';
import { useAuth } from '../context/AuthContext';

// Conta bloqueada ou site em manutenção: o Dono/Moderador entra sempre
export const AccessGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const access = useAccess();
  const { logout } = useAuth();
  const blocked = access.blocked && !access.isAdmin;
  const maintenance = access.maintenance && !access.isAdmin;
  if (!blocked && !maintenance) return <>{children}</>;

  return (
    <div className="min-h-[100dvh] w-full bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div id={blocked ? 'account-blocked-screen' : 'maintenance-screen'} className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900 p-7 text-center space-y-4 shadow-2xl">
        <div className={`mx-auto h-14 w-14 rounded-2xl flex items-center justify-center ${blocked ? 'bg-rose-500/15 text-rose-400' : 'bg-amber-500/15 text-amber-400'}`}>
          {blocked ? <ShieldAlert className="h-7 w-7" /> : <Wrench className="h-7 w-7" />}
        </div>
        <div>
          <h1 className="text-lg font-black">{blocked ? 'Conta suspensa' : 'Estamos em manutenção'}</h1>
          <p className="text-sm text-slate-400 mt-1.5">
            {blocked
              ? access.blockReason || 'Sua conta foi suspensa pela administração do MedAcademic. Fale com o suporte para mais informações.'
              : access.maintenanceMessage || 'O MedAcademic está passando por melhorias. Volte em alguns minutos — seus dados estão guardados.'}
          </p>
        </div>
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => access.refresh()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold">
            <RefreshCw className="h-3.5 w-3.5" /> Tentar de novo
          </button>
          <button onClick={() => logout()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-rose-300 hover:bg-rose-950/40 text-xs font-bold">
            <LogOut className="h-3.5 w-3.5" /> Sair
          </button>
        </div>
      </div>
    </div>
  );
};
