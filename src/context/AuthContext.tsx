import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { clearIDBForUser } from '../lib/indexedDB';
import { supabase, isLocalOnly, APP_STATE_TABLE } from '../lib/supabase';
import { CARTOON_AVATARS } from '../data/avatars';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  /** Local-only mode: salted hash of the profile password (cloud mode delegates passwords to Supabase Auth). */
  passwordHash?: string;
  passwordSalt?: string;
  university: string;
  currentSemester: string;
  dreamSpecialty: string;
  avatarUrl: string;
  onboardingCompleted?: boolean;
  createdAt: string;
  lastLoginAt: string;
}

type AuthResult = { success: boolean; error?: string };

interface AuthContextType {
  accounts: UserAccount[];
  activeUserId: string | null;
  activeUser: UserAccount | null;
  /** Supabase user id (uuid) of the signed-in user; null in local-only mode or when signed out */
  cloudUserId: string | null;
  isAuthModalOpen: boolean;
  authViewMode: 'select' | 'login' | 'register';
  selectedAccountForLogin: UserAccount | null;
  isDeleting: boolean;
  setSelectedAccountForLogin: (account: UserAccount | null) => void;
  openAuthModal: (mode?: 'select' | 'login' | 'register') => void;
  closeAuthModal: () => void;
  loginWithEmail: (email: string, password: string) => Promise<AuthResult>;
  selectAccount: (userId: string, password?: string) => Promise<AuthResult>;
  registerWithEmail: (
    data: Omit<UserAccount, 'id' | 'createdAt' | 'lastLoginAt' | 'passwordHash' | 'passwordSalt'> & { password: string },
    beforeActivate?: (email: string) => void
  ) => Promise<{ success: boolean; account?: UserAccount; error?: string; needsEmailConfirmation?: boolean }>;
  /** Informational message for the login screen (e.g. "confirm your e-mail") */
  authNotice: string | null;
  setAuthNotice: (notice: string | null) => void;
  /** Sign-up wizard: profile creation happens before the account (e-mail/senha) exists */
  isSigningUp: boolean;
  startSignup: () => void;
  cancelSignup: () => void;
  logout: () => Promise<void>;
  updateAccount: (userId: string, data: Partial<UserAccount>) => Promise<void>;
  deleteAccount: (userId: string) => Promise<void>;
}

const ACCOUNTS_STORAGE_KEY = 'medacademic_registered_accounts_v6';
const ACTIVE_USER_STORAGE_KEY = 'medacademic_active_user_id_v6';
const ACTIVE_USER_OBJECT_STORAGE_KEY = 'medacademic_active_user_profile_v6';

const normalizeEmail = (email: string) => email.trim().toLowerCase();

// ---------- Local-only mode password hashing (PBKDF2-SHA256, per-account salt) ----------
const PBKDF2_ITERATIONS = 150_000;

const toHex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

async function hashPassword(password: string, saltHex?: string): Promise<{ hash: string; salt: string }> {
  const salt = saltHex || toHex(crypto.getRandomValues(new Uint8Array(16)));
  const saltBytes = new Uint8Array(salt.match(/.{2}/g)!.map((h) => parseInt(h, 16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    key,
    256
  );
  return { hash: toHex(bits), salt };
}

async function verifyLocalPassword(account: UserAccount, password: string | undefined): Promise<boolean> {
  if (!account.passwordHash || !account.passwordSalt) return true; // profile without password
  if (!password) return false;
  const { hash } = await hashPassword(password.trim(), account.passwordSalt);
  return hash === account.passwordHash;
}

// ---------- Supabase helpers ----------
// Profile fields kept in the auth user's metadata (display only — never used for authorization).
// Uploaded photos (data: URLs) stay out of it because the metadata travels inside the JWT.
const toUserMetadata = (data: Partial<UserAccount>) => {
  const meta: Record<string, unknown> = {};
  if (data.name !== undefined) meta.name = data.name;
  if (data.university !== undefined) meta.university = data.university;
  if (data.currentSemester !== undefined) meta.currentSemester = data.currentSemester;
  if (data.dreamSpecialty !== undefined) meta.dreamSpecialty = data.dreamSpecialty;
  if (data.onboardingCompleted !== undefined) meta.onboardingCompleted = data.onboardingCompleted;
  if (data.avatarUrl !== undefined && !data.avatarUrl.startsWith('data:')) meta.avatarUrl = data.avatarUrl;
  return meta;
};

const accountFromUser = (user: User, fallback?: UserAccount | null): UserAccount => {
  const meta = (user.user_metadata || {}) as Record<string, any>;
  const email = normalizeEmail(user.email || '');
  return {
    id: email,
    email,
    name: meta.name || fallback?.name || email.split('@')[0] || 'Estudante de Medicina',
    university: meta.university || fallback?.university || 'Faculdade de Medicina',
    currentSemester: meta.currentSemester || fallback?.currentSemester || '1º Semestre',
    dreamSpecialty: meta.dreamSpecialty || fallback?.dreamSpecialty || 'Clínica Médica',
    avatarUrl: fallback?.avatarUrl || meta.avatarUrl || CARTOON_AVATARS[0].url,
    onboardingCompleted: meta.onboardingCompleted ?? fallback?.onboardingCompleted ?? true,
    createdAt: user.created_at || new Date().toISOString(),
    lastLoginAt: user.last_sign_in_at || new Date().toISOString(),
  };
};

const translateAuthError = (message: string): string => {
  const m = message.toLowerCase();
  if (m.includes('invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed')) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
  if (m.includes('already registered') || m.includes('already been registered'))
    return 'Este e-mail já possui uma conta. Vá para a aba "Login" para acessar seu perfil.';
  if (m.includes('password should be') || m.includes('weak password'))
    return 'Senha fraca: use pelo menos 6 caracteres (de preferência com letras e números).';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Sem conexão com o servidor. Verifique sua internet.';
  return message;
};

// ---------- localStorage hydration ----------
const loadInitialActiveUser = (): UserAccount | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_OBJECT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.email) return { ...parsed, id: normalizeEmail(parsed.email), email: normalizeEmail(parsed.email) };
    }
  } catch (e) {
    console.error('Error loading stored active user object:', e);
  }
  return null;
};

const loadInitialActiveUserId = (): string | null => {
  try {
    const saved = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    if (saved && saved.trim()) return normalizeEmail(saved);
  } catch (e) {
    console.error('Error loading stored active user id:', e);
  }
  return null;
};

const loadInitialAccounts = (): UserAccount[] => {
  try {
    const saved = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed
          .filter((a: any) => a && a.email)
          // drop any legacy plaintext password left by older versions
          .map(({ password: _legacy, ...a }: any) => ({ ...a, id: normalizeEmail(a.email), email: normalizeEmail(a.email) }));
      }
    }
  } catch (e) {
    console.error('Error parsing accounts from localStorage:', e);
  }
  return [];
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accounts, setAccounts] = useState<UserAccount[]>(loadInitialAccounts);
  const [activeUserId, setActiveUserId] = useState<string | null>(loadInitialActiveUserId);
  const [cloudUserId, setCloudUserId] = useState<string | null>(null);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => !loadInitialActiveUserId());
  const [authViewMode, setAuthViewMode] = useState<'select' | 'login' | 'register'>('login');
  const [selectedAccountForLogin, setSelectedAccountForLogin] = useState<UserAccount | null>(null);
  const [isSigningUp, setIsSigningUp] = useState<boolean>(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const startSignup = () => setIsSigningUp(true);
  const cancelSignup = () => {
    setIsSigningUp(false);
    setAuthViewMode('login');
  };

  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const isDeletingRef = useRef<boolean>(false);

  // Stores the account locally (device cache used for instant hydration) and marks it active
  const activateAccount = (account: UserAccount) => {
    const email = normalizeEmail(account.email);
    setAccounts((prev) => {
      const next = [...prev.filter((a) => a.email !== email), { ...account, id: email, email }];
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
    setActiveUserId(email);
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, email);
    localStorage.setItem(ACTIVE_USER_OBJECT_STORAGE_KEY, JSON.stringify(account));
    setIsAuthModalOpen(false);
    setSelectedAccountForLogin(null);
  };

  const clearActiveSession = () => {
    localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_USER_OBJECT_STORAGE_KEY);
    setSelectedAccountForLogin(null);
    setActiveUserId(null);
    setCloudUserId(null);
  };

  // Supabase session: restores it on load and follows sign-in / sign-out / token refresh
  useEffect(() => {
    if (!supabase) return;

    const applySession = (session: Session | null) => {
      if (isDeletingRef.current) return;
      if (session?.user?.email) {
        const email = normalizeEmail(session.user.email);
        const cached = loadInitialAccounts().find((a) => a.email === email) || null;
        setCloudUserId(session.user.id);
        activateAccount(accountFromUser(session.user, cached));
      } else {
        // No valid session → whatever was cached locally is not signed in anymore
        clearActiveSession();
        setIsAuthModalOpen(true);
      }
    };

    supabase.auth.getSession().then(({ data }) => applySession(data.session));
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return; // handled by getSession above
      if (event === 'SIGNED_OUT') {
        if (!isDeletingRef.current) {
          clearActiveSession();
          setIsAuthModalOpen(true);
        }
        return;
      }
      if (session) applySession(session);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Keep the active account object cached for the next page load
  useEffect(() => {
    if (isDeletingRef.current || !activeUserId) return;
    const match = accounts.find((a) => a.email === activeUserId);
    if (match) localStorage.setItem(ACTIVE_USER_OBJECT_STORAGE_KEY, JSON.stringify(match));
  }, [activeUserId, accounts]);

  const activeUser = React.useMemo(() => {
    if (!activeUserId) return null;
    return accounts.find((a) => a.email === activeUserId) || loadInitialActiveUser();
  }, [accounts, activeUserId]);

  const openAuthModal = (mode: 'select' | 'login' | 'register' = 'login') => {
    setAuthViewMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    if (activeUserId) {
      setIsAuthModalOpen(false);
      setSelectedAccountForLogin(null);
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<AuthResult> => {
    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail) return { success: false, error: 'Por favor, informe seu e-mail.' };

    if (!supabase) {
      const target = accounts.find((a) => a.email === cleanEmail);
      if (!target) {
        return { success: false, error: 'Perfil não encontrado com este e-mail. Crie uma conta na aba "Criar Novo Usuário".' };
      }
      if (!(await verifyLocalPassword(target, password))) {
        return { success: false, error: 'Senha incorreta para este perfil.' };
      }
      activateAccount({ ...target, lastLoginAt: new Date().toISOString() });
      return { success: true };
    }

    const { data, error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error || !data.user) return { success: false, error: translateAuthError(error?.message || 'Erro ao entrar.') };
    setAuthNotice(null);
    const cached = accounts.find((a) => a.email === cleanEmail) || null;
    setCloudUserId(data.user.id);
    activateAccount(accountFromUser(data.user, cached));
    return { success: true };
  };

  const selectAccount = async (userId: string, password?: string): Promise<AuthResult> => {
    const target = accounts.find((a) => a.id === userId || a.email === normalizeEmail(userId));
    if (!target) return { success: false, error: 'Perfil não encontrado.' };
    return loginWithEmail(target.email, password || '');
  };

  const registerWithEmail: AuthContextType['registerWithEmail'] = async (data, beforeActivate) => {
    const cleanEmail = normalizeEmail(data.email);
    if (!cleanEmail) return { success: false, error: 'Por favor, informe um e-mail válido.' };
    const { password, ...profile } = data;
    const now = new Date().toISOString();

    if (!supabase) {
      if (accounts.some((a) => a.email === cleanEmail)) {
        return { success: false, error: 'Este e-mail já possui uma conta. Vá para a aba "Login" para acessar seu perfil.' };
      }
      const { hash, salt } = await hashPassword(password.trim());
      const account: UserAccount = {
        ...profile,
        id: cleanEmail,
        email: cleanEmail,
        passwordHash: hash,
        passwordSalt: salt,
        onboardingCompleted: profile.onboardingCompleted ?? false,
        createdAt: now,
        lastLoginAt: now,
      };
      beforeActivate?.(cleanEmail);
      setIsSigningUp(false);
      activateAccount(account);
      return { success: true, account };
    }

    const { data: signUp, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: { data: toUserMetadata(profile), emailRedirectTo: window.location.origin },
    });
    if (error) return { success: false, error: translateAuthError(error.message) };
    // With e-mail confirmation on, an existing address returns a user without identities (no error)
    if (signUp.user && signUp.user.identities && signUp.user.identities.length === 0) {
      return { success: false, error: translateAuthError('already registered') };
    }

    // Seed the local profile now so it's loaded as soon as the user signs in on this device
    beforeActivate?.(cleanEmail);
    const account: UserAccount = { ...profile, id: cleanEmail, email: cleanEmail, createdAt: now, lastLoginAt: now };
    setAccounts((prev) => {
      const next = [...prev.filter((a) => a.email !== cleanEmail), account];
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    if (!signUp.session) {
      // Project requires e-mail confirmation: the user signs in after clicking the link
      setAuthNotice(
        `Conta criada! Enviamos um link de confirmação para ${cleanEmail}. Abra o e-mail, confirme e depois entre aqui com seu e-mail e senha.`
      );
      setIsSigningUp(false);
      setAuthViewMode('login');
      return { success: true, account, needsEmailConfirmation: true };
    }

    setIsSigningUp(false);
    setCloudUserId(signUp.session.user.id);
    activateAccount(account);
    return { success: true, account };
  };

  const logout = async () => {
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (e) {
        console.error('Error signing out:', e);
      }
    }
    clearActiveSession();
    openAuthModal('login');
  };

  const updateAccount = async (userId: string, data: Partial<UserAccount>) => {
    const cleanId = normalizeEmail(userId);
    setAccounts((prev) => {
      const next = prev.map((a) => (a.email === cleanId ? { ...a, ...data } : a));
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(next));
      return next;
    });

    const meta = toUserMetadata(data);
    if (supabase && cloudUserId && cleanId === activeUserId && Object.keys(meta).length > 0) {
      supabase.auth.updateUser({ data: meta }).then(({ error }) => {
        if (error) console.warn('Falha ao atualizar o perfil no Supabase:', error.message);
      });
    }
  };

  const deleteAccount = async (userId: string) => {
    const targetId = normalizeEmail(userId || activeUserId || '');
    if (!targetId) return;

    setIsDeleting(true);
    isDeletingRef.current = true;

    try {
      // 1. Cloud data (RLS only lets the user delete their own row); max 5s so offline doesn't freeze
      if (supabase && cloudUserId && targetId === activeUserId) {
        await Promise.race([
          supabase
            .from(APP_STATE_TABLE)
            .delete()
            .eq('user_id', cloudUserId)
            .then(({ error }) => {
              if (error) console.warn('Erro ao excluir dados na nuvem:', error.message);
            }),
          new Promise((resolve) => setTimeout(resolve, 5000)),
        ]);
        try {
          await supabase.auth.signOut();
        } catch {}
      }

      // 2. Local caches
      const updated = accounts.filter((a) => a.email !== targetId);
      setAccounts(updated);
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

      const suffixes = [
        'user_profile', 'semesters', 'subjects', 'topics', 'exams',
        'schedule', 'achievements', 'med_revisions', 'study_sessions',
        'pomodoro_settings', 'tutor_messages', 'current_tab',
      ];
      suffixes.forEach((suffix) => localStorage.removeItem(`medacademic_usr_${targetId}_${suffix}_v3`));
      localStorage.removeItem(`medacademic_tour_seen_${targetId}`);
      clearIDBForUser(targetId);

      if (targetId === activeUserId) {
        clearActiveSession();
      }
      openAuthModal(updated.length > 0 ? 'login' : 'register');
    } finally {
      setTimeout(() => {
        setIsDeleting(false);
        isDeletingRef.current = false;
      }, 500);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        accounts,
        activeUserId,
        activeUser,
        cloudUserId,
        isAuthModalOpen,
        authViewMode,
        selectedAccountForLogin,
        isDeleting,
        setSelectedAccountForLogin,
        openAuthModal,
        closeAuthModal,
        loginWithEmail,
        selectAccount,
        registerWithEmail,
        authNotice,
        setAuthNotice,
        isSigningUp,
        startSignup,
        cancelSignup,
        logout,
        updateAccount,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};

export { isLocalOnly };
