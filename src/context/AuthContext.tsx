import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  auth,
  db,
  doc,
  setDoc,
  getDoc,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  googleProvider,
  FirebaseUser,
} from '../lib/firebase';
import { signInWithPopup } from 'firebase/auth';
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
  setSelectedAccountForLogin: (account: UserAccount | null) => void;
  openAuthModal: (mode?: 'select' | 'login' | 'register') => void;
  closeAuthModal: () => void;
  loginWithEmail: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  selectAccount: (userId: string, password?: string) => { success: boolean; error?: string };
  registerWithEmail: (data: Omit<UserAccount, 'id' | 'createdAt' | 'lastLoginAt'> & { password: string }) => Promise<{ success: boolean; account?: UserAccount; error?: string }>;
  logout: () => Promise<void>;
  updateAccount: (userId: string, data: Partial<UserAccount>) => Promise<void>;
  deleteAccount: (userId: string) => void;
}

const ACCOUNTS_STORAGE_KEY = 'medacademic_registered_accounts_v4';
const ACTIVE_USER_STORAGE_KEY = 'medacademic_active_user_id_v4';

const DEFAULT_ACCOUNTS: UserAccount[] = [];

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  const [accounts, setAccounts] = useState<UserAccount[]>(() => {
    const saved = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Error parsing accounts:', e);
      }
    }
    return DEFAULT_ACCOUNTS;
  });

  const [activeUserId, setActiveUserId] = useState<string | null>(() => {
    const saved = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    return saved || null;
  });

  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => {
    const saved = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    return !saved; // Open modal automatically on first access
  });
  const [authViewMode, setAuthViewMode] = useState<'select' | 'login' | 'register'>('login');
  const [selectedAccountForLogin, setSelectedAccountForLogin] = useState<UserAccount | null>(null);

  // Firebase Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Fetch or sync user profile in Firestore
        const userRef = doc(db, 'users', user.uid);
        try {
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            const data = snap.data() as UserAccount;
            const updatedAccount: UserAccount = {
              ...data,
              id: user.uid,
              email: user.email || data.email,
              lastLoginAt: new Date().toISOString(),
            };
            setAccounts((prev) => {
              const filtered = prev.filter((a) => a.id !== user.uid);
              return [...filtered, updatedAccount];
            });
            setActiveUserId(user.uid);
          } else {
            // Initialize new account record for Firebase User
            const newAcc: UserAccount = {
              id: user.uid,
              name: user.displayName || user.email?.split('@')[0] || 'Estudante de Medicina',
              email: user.email || '',
              university: 'Faculdade de Medicina',
              currentSemester: '5º Semestre - Ciclo Clínico',
              dreamSpecialty: 'Clínica Médica',
              avatarUrl: user.photoURL || CARTOON_AVATARS[0].url,
              createdAt: new Date().toISOString(),
              lastLoginAt: new Date().toISOString(),
            };
            await setDoc(userRef, newAcc);
            setAccounts((prev) => [...prev.filter((a) => a.id !== user.uid), newAcc]);
            setActiveUserId(user.uid);
          }
        } catch (err) {
          console.error("Error syncing user with Firestore:", err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Sync accounts to localStorage
  useEffect(() => {
    localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  // Sync activeUserId to localStorage
  useEffect(() => {
    if (activeUserId) {
      localStorage.setItem(ACTIVE_USER_STORAGE_KEY, activeUserId);
    } else {
      localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    }
  }, [activeUserId]);

  const activeUser = accounts.find((a) => a.id === activeUserId) || null;

  const openAuthModal = (mode: 'select' | 'login' | 'register' = 'select') => {
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
    const target = accounts.find((a) => a.id === userId);
    if (!target) return { success: false, error: 'Perfil não encontrado.' };

    if (target.password && target.password.trim() !== '') {
      if (!password || password !== target.password) {
        return { success: false, error: 'Senha incorreta para este perfil.' };
      }
    }

    const now = new Date().toISOString();
    setAccounts((prev) =>
      prev.map((a) => (a.id === userId ? { ...a, lastLoginAt: now } : a))
    );

    setActiveUserId(userId);
    setIsAuthModalOpen(false);
    setSelectedAccountForLogin(null);
    return { success: true };
  };

  const loginWithEmail = async (email: string, password: string) => {
    try {
      const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
      const uid = cred.user.uid;
      setActiveUserId(uid);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      console.warn("Firebase Auth email login fallback to local profile:", err.message);
      // Fallback to local profile check if Firebase Auth has error (e.g. user created locally)
      const cleanEmail = email.trim().toLowerCase();
      const target = accounts.find((a) => a.email.trim().toLowerCase() === cleanEmail);
      if (target) {
        return selectAccount(target.id, password);
      }
      return { success: false, error: err.message || 'Erro ao fazer login com e-mail.' };
    }
  };

  const registerWithEmail = async (data: Omit<UserAccount, 'id' | 'createdAt' | 'lastLoginAt'> & { password: string }) => {
    try {
      const cred = await createUserWithEmailAndPassword(auth, data.email.trim(), data.password);
      const uid = cred.user.uid;
      const newAccount: UserAccount = {
        id: uid,
        name: data.name,
        email: data.email,
        password: data.password,
        university: data.university,
        currentSemester: data.currentSemester,
        dreamSpecialty: data.dreamSpecialty,
        avatarUrl: data.avatarUrl,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      // Save to Firestore
      await setDoc(doc(db, 'users', uid), newAccount);

      setAccounts((prev) => [...prev.filter((a) => a.id !== uid), newAccount]);
      setActiveUserId(uid);
      setIsAuthModalOpen(false);
      return { success: true, account: newAccount };
    } catch (err: any) {
      console.warn("Firebase Auth registration fallback:", err.message);
      // Fallback local registration
      const newAccount: UserAccount = {
        ...data,
        id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      setAccounts((prev) => [...prev, newAccount]);
      setActiveUserId(newAccount.id);
      setIsAuthModalOpen(false);
      return { success: true, account: newAccount };
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error("Error signing out:", e);
    }
    setActiveUserId(null);
    openAuthModal('login');
  };

  const updateAccount = async (userId: string, data: Partial<UserAccount>) => {
    setAccounts((prev) =>
      prev.map((a) => (a.id === userId ? { ...a, ...data } : a))
    );

    // Sync to Firestore if authenticated user
    if (auth.currentUser && auth.currentUser.uid === userId) {
      try {
        await setDoc(doc(db, 'users', userId), data, { merge: true });
      } catch (err) {
        console.error("Error updating user in Firestore:", err);
      }
    }
  };

  const deleteAccount = (userId: string) => {
    const updated = accounts.filter((a) => a.id !== userId);
    setAccounts(updated);

    if (activeUserId === userId) {
      if (updated.length > 0) {
        setActiveUserId(updated[0].id);
      } else {
        setActiveUserId(null);
        openAuthModal('register');
      }
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
