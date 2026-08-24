import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { clearIDBForUser } from '../lib/indexedDB';
import {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  FirebaseUser,
  sanitizeForFirestore,
  deleteDoc,
} from '../lib/firebase';
import { CARTOON_AVATARS } from '../data/avatars';

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  password?: string;
  university: string;
  currentSemester: string;
  dreamSpecialty: string;
  avatarUrl: string;
  onboardingCompleted?: boolean;
  createdAt: string;
  lastLoginAt: string;
}

interface AuthContextType {
  accounts: UserAccount[];
  activeUserId: string | null;
  activeUser: UserAccount | null;
  firebaseUser: FirebaseUser | null;
  isAuthModalOpen: boolean;
  authViewMode: 'select' | 'login' | 'register';
  selectedAccountForLogin: UserAccount | null;
  isDeleting: boolean;
  setSelectedAccountForLogin: (account: UserAccount | null) => void;
  openAuthModal: (mode?: 'select' | 'login' | 'register') => void;
  closeAuthModal: () => void;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  selectAccount: (userId: string, password?: string) => { success: boolean; error?: string };
  registerWithEmail: (data: Omit<UserAccount, 'id' | 'createdAt' | 'lastLoginAt'> & { password: string }) => Promise<{ success: boolean; account?: UserAccount; error?: string }>;
  logout: () => Promise<void>;
  updateAccount: (userId: string, data: Partial<UserAccount>) => Promise<void>;
  deleteAccount: (userId: string) => Promise<void>;
}

const ACCOUNTS_STORAGE_KEY = 'medacademic_registered_accounts_v6';
const ACTIVE_USER_STORAGE_KEY = 'medacademic_active_user_id_v6';
const ACTIVE_USER_OBJECT_STORAGE_KEY = 'medacademic_active_user_profile_v6';

const DEFAULT_ACCOUNTS: UserAccount[] = [];

// Helper functions for safe and instantaneous localStorage hydration on page reload
const loadInitialActiveUser = (): UserAccount | null => {
  try {
    const raw = localStorage.getItem(ACTIVE_USER_OBJECT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.id || parsed.email)) {
        return {
          ...parsed,
          id: (parsed.email || parsed.id).trim().toLowerCase(),
          email: (parsed.email || parsed.id).trim().toLowerCase(),
          onboardingCompleted: parsed.onboardingCompleted !== undefined ? parsed.onboardingCompleted : true,
        };
      }
    }
  } catch (e) {
    console.error('Error loading stored active user object:', e);
  }
  return null;
};

const loadInitialActiveUserId = (): string | null => {
  try {
    const saved = localStorage.getItem(ACTIVE_USER_STORAGE_KEY) || localStorage.getItem('medacademic_active_user_id_v5');
    if (saved && saved.trim()) return saved.trim().toLowerCase();
    const activeObj = loadInitialActiveUser();
    if (activeObj?.email) return activeObj.email.trim().toLowerCase();
    if (activeObj?.id) return activeObj.id.trim().toLowerCase();
  } catch (e) {
    console.error('Error loading stored active user id:', e);
  }
  return null;
};

const loadInitialAccounts = (): UserAccount[] => {
  let list: UserAccount[] = [];
  try {
    const saved = localStorage.getItem(ACCOUNTS_STORAGE_KEY) || localStorage.getItem('medacademic_registered_accounts_v5');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed.map((a: any) => ({
          ...a,
          id: (a.email || a.id || '').trim().toLowerCase(),
          email: (a.email || a.id || '').trim().toLowerCase(),
          onboardingCompleted: a.onboardingCompleted !== undefined ? a.onboardingCompleted : true,
        }));
      }
    }
  } catch (e) {
    console.error('Error parsing accounts from localStorage:', e);
  }

  // Ensure stored active user object is included in accounts array if it was stored
  const activeObj = loadInitialActiveUser();
  if (activeObj && activeObj.email) {
    const canonicalKey = activeObj.email.trim().toLowerCase();
    const exists = list.some((a) => a.email.trim().toLowerCase() === canonicalKey || a.id === canonicalKey);
    if (!exists) {
      list.push({ ...activeObj, id: canonicalKey, email: canonicalKey });
    }
  }
  return list.length > 0 ? list : DEFAULT_ACCOUNTS;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  const [accounts, setAccounts] = useState<UserAccount[]>(loadInitialAccounts);
  const [activeUserId, setActiveUserId] = useState<string | null>(loadInitialActiveUserId);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    const initialId = loadInitialActiveUserId();
    return !initialId; // Open modal automatically ONLY if no active user session exists
  });
  const [authViewMode, setAuthViewMode] = useState<'select' | 'login' | 'register'>('login');
  const [selectedAccountForLogin, setSelectedAccountForLogin] = useState<UserAccount | null>(null);

  // robust isDeleting flag to prevent auth re-triggers or sync loops during account purging
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const isDeletingRef = useRef<boolean>(false);

  // Fetch cloud users from Firestore on mount to support cross-device login
  useEffect(() => {
    async function fetchCloudUsers() {
      if (isDeletingRef.current) return;
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const cloudUsers: UserAccount[] = [];
        querySnapshot.forEach((docSnap) => {
          const uData = docSnap.data() as UserAccount;
          if (uData && uData.email) {
            const canonicalId = uData.email.trim().toLowerCase();
            cloudUsers.push({
              ...uData,
              id: canonicalId,
              email: canonicalId,
              onboardingCompleted: uData.onboardingCompleted !== undefined ? uData.onboardingCompleted : true,
            });
          }
        });
        if (cloudUsers.length > 0 && !isDeletingRef.current) {
          setAccounts((prev) => {
            const map = new Map<string, UserAccount>();
            [...prev, ...cloudUsers].forEach((acc) => {
              const key = acc.email.trim().toLowerCase();
              map.set(key, { ...acc, id: key, email: key });
            });
            const merged = Array.from(map.values());
            localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(merged));
            return merged;
          });
        }
      } catch (e) {
        console.warn("Could not fetch cloud users from Firestore:", e);
      }
    }
    fetchCloudUsers();
  }, []);

  // Firebase Auth Observer with canonical email resolution
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (isDeletingRef.current) return;
      if (user && user.email) {
        const cleanEmail = user.email.trim().toLowerCase();
        const userRef = doc(db, 'users', cleanEmail);
        try {
          const snap = await getDoc(userRef);
          if (snap.exists() && !isDeletingRef.current) {
            const data = snap.data() as UserAccount;
            const updatedAccount: UserAccount = {
              ...data,
              id: cleanEmail,
              email: cleanEmail,
              onboardingCompleted: data.onboardingCompleted !== undefined ? data.onboardingCompleted : true,
              lastLoginAt: new Date().toISOString(),
            };
            setAccounts((prev) => {
              const filtered = prev.filter((a) => a.email.trim().toLowerCase() !== cleanEmail);
              const next = [...filtered, updatedAccount];
              localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(next));
              return next;
            });
            setActiveUserId(cleanEmail);
            localStorage.setItem(ACTIVE_USER_STORAGE_KEY, cleanEmail);
            localStorage.setItem(ACTIVE_USER_OBJECT_STORAGE_KEY, JSON.stringify(updatedAccount));
          }
        } catch (err) {
          console.error("Error syncing user with Firestore:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync accounts to localStorage whenever accounts state changes
  useEffect(() => {
    if (isDeletingRef.current) return;
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  // Sync activeUserId and activeUser profile object to localStorage
  useEffect(() => {
    if (isDeletingRef.current) return;
    if (activeUserId) {
      const cleanId = activeUserId.trim().toLowerCase();
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, cleanId);
      const matchingAccount = accounts.find((a) => a.id === cleanId || a.email.trim().toLowerCase() === cleanId);
      if (matchingAccount) {
        localStorage.setItem(ACTIVE_USER_OBJECT_STORAGE_KEY, JSON.stringify(matchingAccount));
      }
    } else {
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_USER_OBJECT_STORAGE_KEY);
    }
  }, [activeUserId, accounts]);

  const activeUser = React.useMemo(() => {
    if (!activeUserId) return null;
    const cleanId = activeUserId.trim().toLowerCase();
    const found = accounts.find((a) => a.id === cleanId || a.email.trim().toLowerCase() === cleanId);
    if (found) return found;
    const cached = loadInitialActiveUser();
    if (cached && (cached.id === cleanId || cached.email.trim().toLowerCase() === cleanId)) {
      return cached;
    }
    return null;
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

  const selectAccount = (userId: string, password?: string) => {
    const target = accounts.find((a) => a.id === userId || a.email.trim().toLowerCase() === userId.trim().toLowerCase());
    if (!target) return { success: false, error: 'Perfil não encontrado.' };

    if (target.password && target.password.trim() !== '') {
      if (!password || password !== target.password) {
        return { success: false, error: 'Senha incorreta para este perfil.' };
      }
    }

    const canonicalId = target.email.trim().toLowerCase();
    const now = new Date().toISOString();
    const updatedTarget: UserAccount = {
      ...target,
      id: canonicalId,
      email: canonicalId,
      lastLoginAt: now,
    };

    const nextAccounts = accounts.map((a) => (a.email.trim().toLowerCase() === canonicalId ? updatedTarget : a));
    setAccounts(nextAccounts);
    setActiveUserId(canonicalId);

    // Synchronous immediate persistence to localStorage
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, canonicalId);
    localStorage.setItem(ACTIVE_USER_OBJECT_STORAGE_KEY, JSON.stringify(updatedTarget));
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(nextAccounts));

    setIsAuthModalOpen(false);
    setSelectedAccountForLogin(null);
    return { success: true };
  };

  const loginWithEmail = async (email: string, password: string) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Por favor, informe seu e-mail.' };
    }

    // 1. Check local accounts state first
    let target = accounts.find((a) => a.email.trim().toLowerCase() === cleanEmail);

    // 2. Direct O(1) Firestore doc lookup by cleanEmail for instant cross-device access
    if (!target) {
      try {
        const emailDocRef = doc(db, 'users', cleanEmail);
        const emailSnap = await getDoc(emailDocRef);
        if (emailSnap.exists()) {
          const data = emailSnap.data() as UserAccount;
          target = {
            ...data,
            id: cleanEmail,
            email: cleanEmail,
            onboardingCompleted: data.onboardingCompleted !== undefined ? data.onboardingCompleted : true,
          };
        }
      } catch (e) {
        console.warn("Direct email doc lookup warning:", e);
      }
    }

    // 3. Fallback collection query if direct doc lookup didn't match
    if (!target) {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        querySnapshot.forEach((docSnap) => {
          const uData = docSnap.data() as UserAccount;
          if (uData && uData.email && uData.email.trim().toLowerCase() === cleanEmail) {
            target = {
              ...uData,
              id: cleanEmail,
              email: cleanEmail,
              onboardingCompleted: uData.onboardingCompleted !== undefined ? uData.onboardingCompleted : true,
            };
          }
        });
      } catch (e) {
        console.warn("Error querying Firestore for login email:", e);
      }
    }

    // 4. Also check if state doc exists in users/{cleanEmail}/appData/state
    if (!target) {
      try {
        const stateSnap = await getDoc(doc(db, 'users', cleanEmail, 'appData', 'state'));
        if (stateSnap.exists()) {
          const sData = stateSnap.data();
          const p = sData.userProfile || {};
          target = {
            id: cleanEmail,
            name: p.name || 'Estudante de Medicina',
            email: cleanEmail,
            password: '',
            university: p.university || 'Faculdade de Medicina',
            currentSemester: '1º Semestre',
            dreamSpecialty: p.dreamSpecialty || 'Clínica Médica',
            avatarUrl: p.avatarUrl || CARTOON_AVATARS[0].url,
            onboardingCompleted: true,
            createdAt: sData.updatedAt || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
          };
        }
      } catch (e) {
        console.warn("State doc fallback check error:", e);
      }
    }

    if (target) {
      // Validate password if user set a password
      if (target.password && target.password.trim() !== '') {
        if (!password || password.trim() !== target.password.trim()) {
          return { success: false, error: 'Senha incorreta para este perfil.' };
        }
      }
      const now = new Date().toISOString();
      const updatedTarget: UserAccount = {
        ...target,
        id: cleanEmail,
        email: cleanEmail,
        onboardingCompleted: target.onboardingCompleted !== undefined ? target.onboardingCompleted : true,
        lastLoginAt: now,
      };

      // Ensure local state includes the logged-in target user so activeUser is immediately populated
      const filtered = accounts.filter((a) => a.email.trim().toLowerCase() !== cleanEmail);
      const nextAccounts = [...filtered, updatedTarget];
      setAccounts(nextAccounts);
      setActiveUserId(cleanEmail);

      // Synchronous immediate persistence to localStorage
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, cleanEmail);
      localStorage.setItem(ACTIVE_USER_OBJECT_STORAGE_KEY, JSON.stringify(updatedTarget));
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(nextAccounts));

      // Also try Firebase Auth sign in silently to maintain session if configured
      try {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      } catch (e) {
        // Safe to ignore if email/pass provider is not configured
      }

      setIsAuthModalOpen(false);
      return { success: true };
    }

    // 5. Try Firebase Auth sign in as last resort
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const email = cred.user.email ? cred.user.email.trim().toLowerCase() : cleanEmail;
      setActiveUserId(email);
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, email);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Perfil não encontrado com este e-mail. Verifique o e-mail ou crie uma conta na aba "Criar Novo Usuário".' };
    }
  };

  const registerWithEmail = async (data: Omit<UserAccount, 'id' | 'createdAt' | 'lastLoginAt'> & { password: string }) => {
    const cleanEmail = data.email.trim().toLowerCase();
    if (!cleanEmail) {
      return { success: false, error: 'Por favor, informe um e-mail válido.' };
    }

    // Check if user already exists locally or in cloud
    let existingAccount = accounts.find((a) => a.email.trim().toLowerCase() === cleanEmail);
    if (!existingAccount) {
      try {
        const emailSnap = await getDoc(doc(db, 'users', cleanEmail));
        if (emailSnap.exists()) {
          existingAccount = emailSnap.data() as UserAccount;
        }
      } catch (e) {
        console.warn("Error checking email doc in Firestore:", e);
      }
    }

    if (existingAccount) {
      return {
        success: false,
        error: 'Este e-mail já possui uma conta cadastrada. Vá para a aba "Login" para acessar seu perfil.',
      };
    }

    const uid = cleanEmail; // Use cleanEmail as canonical document ID for O(1) cross-device resolution
    const newAccount: UserAccount = {
      ...data,
      email: cleanEmail,
      id: uid,
      onboardingCompleted: true, // User account created with credentials
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    // Save to Firestore cloud database root doc with cleanEmail as key
    try {
      await setDoc(doc(db, 'users', cleanEmail), sanitizeForFirestore(newAccount), { merge: true });
    } catch (err: any) {
      console.warn("Firestore save warning during registration:", err.message);
    }

    // Try Firebase Auth if enabled, but don't fail if operation-not-allowed
    try {
      await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
    } catch (e) {
      // Ignore auth/operation-not-allowed
    }

    const nextAccounts = [...accounts.filter((a) => a.email.trim().toLowerCase() !== cleanEmail), newAccount];
    setAccounts(nextAccounts);
    setActiveUserId(uid);

    // Synchronous immediate persistence to localStorage
    localStorage.setItem(ACTIVE_USER_STORAGE_KEY, uid);
    localStorage.setItem(ACTIVE_USER_OBJECT_STORAGE_KEY, JSON.stringify(newAccount));
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(nextAccounts));

    setIsAuthModalOpen(false);
    return { success: true, account: newAccount };
  };

  const logout = async () => {
    // 1. Finalize the Firebase session FIRST before clearing local state or triggering UI redirects
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Error signing out from Firebase:", e);
    }

    // 2. Clean up local storage authentication state AFTER finalizing session
    localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    localStorage.removeItem(ACTIVE_USER_OBJECT_STORAGE_KEY);
    localStorage.removeItem('medacademic_active_user_id_v5');

    // 3. Reset active user state and set modal to login
    setSelectedAccountForLogin(null);
    setActiveUserId(null);
    openAuthModal('login');
  };

  const updateAccount = async (userId: string, data: Partial<UserAccount>) => {
    const cleanId = userId.trim().toLowerCase();
    const nextAccounts = accounts.map((a) => (a.id === cleanId || a.email.trim().toLowerCase() === cleanId ? { ...a, ...data } : a));
    setAccounts(nextAccounts);

    // Sync to localStorage
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(nextAccounts));
    if (activeUserId && (activeUserId.trim().toLowerCase() === cleanId)) {
      const updatedActive = nextAccounts.find((a) => a.id === cleanId || a.email.trim().toLowerCase() === cleanId);
      if (updatedActive) {
        localStorage.setItem(ACTIVE_USER_OBJECT_STORAGE_KEY, JSON.stringify(updatedActive));
      }
    }

    // Sync updates to Firestore
    try {
      await setDoc(doc(db, 'users', cleanId), sanitizeForFirestore(data), { merge: true });
    } catch (err) {
      console.error("Error updating user in Firestore:", err);
    }
  };

  const deleteAccount = async (userId: string) => {
    const targetId = userId || activeUserId || activeUser?.email || activeUser?.id;
    if (!targetId) {
      console.warn('[deleteAccount] Nenhuma conta alvo especificada para exclusão.');
      return;
    }

    setIsDeleting(true);
    isDeletingRef.current = true;

    try {
      const cleanId = targetId.trim().toLowerCase();
      const currentActiveCleanId = activeUserId?.trim().toLowerCase();
      const activeUserEmailClean = activeUser?.email?.trim().toLowerCase();
      const activeUserIdClean = activeUser?.id?.trim().toLowerCase();

      // 1. Limpa os documentos de dados locais/remotos no Firestore
      try {
        await deleteDoc(doc(db, 'users', cleanId, 'appData', 'state'));
        await deleteDoc(doc(db, 'users', cleanId));
        if (currentActiveCleanId && currentActiveCleanId !== cleanId) {
          await deleteDoc(doc(db, 'users', currentActiveCleanId, 'appData', 'state'));
          await deleteDoc(doc(db, 'users', currentActiveCleanId));
        }
      } catch (err) {
        console.warn("Erro ao excluir dados do usuário no Firestore:", err);
      }

      // 2. Finaliza a sessão do Firebase Auth (signOut) de forma síncrona/aguardada
      const isDeletingActiveUser =
        !activeUserId ||
        currentActiveCleanId === cleanId ||
        activeUserEmailClean === cleanId ||
        activeUserIdClean === cleanId ||
        Boolean(activeUserId);

      if (isDeletingActiveUser || firebaseUser) {
        try {
          await signOut(auth);
        } catch (err) {
          console.warn("Aviso ao encerrar sessão Firebase no deleteAccount:", err);
        }
      }

      // 3. Apenas após a confirmação do encerramento da sessão e exclusão, limpa o localStorage
      const updated = accounts.filter(
        (a) =>
          a.id.trim().toLowerCase() !== cleanId &&
          a.email.trim().toLowerCase() !== cleanId &&
          (currentActiveCleanId ? a.id.trim().toLowerCase() !== currentActiveCleanId && a.email.trim().toLowerCase() !== currentActiveCleanId : true)
      );
      setAccounts(updated);
      localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(updated));

      const idsToClean = Array.from(
        new Set([cleanId, currentActiveCleanId, activeUserEmailClean, activeUserIdClean].filter(Boolean) as string[])
      );

      const suffixes = [
        'user_profile', 'semesters', 'subjects', 'topics', 'exams',
        'schedule', 'achievements', 'med_revisions', 'study_sessions',
        'pomodoro_settings', 'tutor_messages', 'current_tab'
      ];

      idsToClean.forEach((id) => {
        suffixes.forEach((suffix) => {
          localStorage.removeItem(`medacademic_${id}_${suffix}`);
          localStorage.removeItem(`medacademic_usr_${id}_${suffix}_v3`);
        });
        clearIDBForUser(id);
      });

      suffixes.forEach((suffix) => {
        localStorage.removeItem(`medacademic_usr_default_${suffix}_v3`);
      });

      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
      localStorage.removeItem(ACTIVE_USER_OBJECT_STORAGE_KEY);
      localStorage.removeItem('medacademic_active_user_id_v5');
      localStorage.removeItem('medacademic_registered_accounts_v5');
      localStorage.removeItem('medacademic_active_user_id_v6');
      localStorage.removeItem('medacademic_active_user_profile_v6');
      localStorage.removeItem('medacademic_registered_accounts_v6');

      // 4. Reseta os estados e força o redirecionamento imediato para o modal de autenticação (login/registro)
      setSelectedAccountForLogin(null);
      setActiveUserId(null);

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
        firebaseUser,
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

