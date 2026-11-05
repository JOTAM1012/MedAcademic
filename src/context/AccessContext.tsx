import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';

// Papel e acesso vindos do servidor (função my_access no Supabase). Tudo que é sensível
// (ver usuários, bloquear, excluir, avisos, manutenção) é checado de novo no banco.
export type AccessRole = 'owner' | 'moderator' | null;

export interface AccessState {
  loaded: boolean;
  role: AccessRole;
  isOwner: boolean;
  isAdmin: boolean;
  blocked: boolean;
  blockReason?: string | null;
  plan: string;
  lifetime: boolean;
  maintenance: boolean;
  maintenanceMessage?: string | null;
  refresh: () => Promise<void>;
}

const DEFAULT: AccessState = {
  loaded: false,
  role: null,
  isOwner: false,
  isAdmin: false,
  blocked: false,
  plan: 'free',
  lifetime: false,
  maintenance: false,
  refresh: async () => {},
};

const AccessContext = createContext<AccessState>(DEFAULT);

export const AccessProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { cloudUserId } = useAuth();
  const [state, setState] = useState<Omit<AccessState, 'refresh'>>(DEFAULT);

  const refresh = useCallback(async () => {
    if (!supabase || !cloudUserId) {
      // Só no desenvolvimento local: pré-visualizar a interface do Dono (o servidor nunca é afetado)
      if (import.meta.env.DEV && localStorage.getItem('medacademic_dev_role') === 'owner') {
        setState({ ...DEFAULT, loaded: true, role: 'owner', isOwner: true, isAdmin: true, plan: 'vitalicio', lifetime: true, maintenance: localStorage.getItem('medacademic_dev_maint') === '1' });
        return;
      }
      setState({ ...DEFAULT, loaded: true });
      return;
    }
    const { data, error } = await supabase.rpc('my_access');
    if (error || !data) {
      // Banco ainda sem as funções de acesso (ou offline): segue como usuário comum
      setState((s) => ({ ...s, loaded: true }));
      return;
    }
    const d = data as Record<string, any>;
    const role = (d.role as AccessRole) || null;
    setState({
      loaded: true,
      role,
      isOwner: role === 'owner',
      isAdmin: role === 'owner' || role === 'moderator',
      blocked: !!d.blocked,
      blockReason: d.block_reason,
      plan: d.plan || 'free',
      lifetime: !!d.lifetime,
      maintenance: !!d.maintenance,
      maintenanceMessage: d.maintenance_message,
    });
  }, [cloudUserId]);

  useEffect(() => {
    refresh();
    if (!cloudUserId) return;
    const t = window.setInterval(refresh, 5 * 60 * 1000);
    const onFocus = () => refresh();
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(t);
      window.removeEventListener('focus', onFocus);
    };
  }, [refresh, cloudUserId]);

  return <AccessContext.Provider value={{ ...state, refresh }}>{children}</AccessContext.Provider>;
};

export const useAccess = () => useContext(AccessContext);
