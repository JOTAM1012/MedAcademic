import React, { createContext, useContext, useState, useEffect } from 'react';
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

const ACCOUNTS_STORAGE_KEY = 'medacademic_registered_accounts_v5';
const ACTIVE_USER_STORAGE_KEY = 'medacademic_active_user_id_v5';

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

  // Fetch cloud users from Firestore on mount to support cross-device login
  useEffect(() => {
    async function fetchCloudUsers() {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        const cloudUsers: UserAccount[] = [];
        querySnapshot.forEach((docSnap) => {
          const uData = docSnap.data() as UserAccount;
          if (uData && uData.email) {
            cloudUsers.push({ ...uData, id: docSnap.id });
          }
        });
        if (cloudUsers.length > 0) {
          setAccounts((prev) => {
            const map = new Map();
            [...prev, ...cloudUsers].forEach(acc => {
              map.set(acc.email.trim().toLowerCase(), acc);
            });
            return Array.from(map.values());
          });
        }
      } catch (e) {
        console.warn("Could not fetch cloud users from Firestore:", e);
      }
    }
    fetchCloudUsers();
  }, []);

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
          target = { ...emailSnap.data() as UserAccount, id: emailSnap.id };
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
            target = { ...uData, id: docSnap.id };
          }
        });
      } catch (e) {
        console.warn("Error querying Firestore for login email:", e);
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
      const updatedTarget = { ...target, lastLoginAt: now };

      // Ensure local state includes the logged-in target user so activeUser is immediately populated
      setAccounts((prev) => {
        const exists = prev.some((a) => a.id === updatedTarget.id || a.email.trim().toLowerCase() === cleanEmail);
        if (exists) {
          return prev.map((a) => (a.id === updatedTarget.id || a.email.trim().toLowerCase() === cleanEmail) ? updatedTarget : a);
        } else {
          return [...prev, updatedTarget];
        }
      });

      setActiveUserId(updatedTarget.id);
      setIsAuthModalOpen(false);
      return { success: true };
    }

    // 4. Try Firebase Auth sign in as last resort
    try {
      const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
      const uid = cred.user.uid;
      setActiveUserId(uid);
      setIsAuthModalOpen(false);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: 'Perfil não encontrado com este e-mail. Verifique o e-mail ou crie um novo perfil.' };
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

    if (!existingAccount) {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        querySnapshot.forEach((docSnap) => {
          const uData = docSnap.data() as UserAccount;
          if (uData && uData.email && uData.email.trim().toLowerCase() === cleanEmail) {
            existingAccount = { ...uData, id: docSnap.id };
          }
        });
      } catch (e) {
        console.warn("Error checking existing user in Firestore:", e);
      }
    }

    if (existingAccount) {
      return {
        success: false,
        error: 'Este e-mail já possui um perfil cadastrado. Vá para a aba "Login" para acessar seu perfil.',
      };
    }

    const uid = cleanEmail; // Use cleanEmail as canonical document ID for O(1) cross-device resolution
    const newAccount: UserAccount = {
      ...data,
      email: cleanEmail,
      id: uid,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    // Save to Firestore cloud database with cleanEmail as key for cross-device instant access
    try {
      await setDoc(doc(db, 'users', cleanEmail), newAccount);
    } catch (err: any) {
      console.warn("Firestore save warning during registration:", err.message);
    }

    // Try Firebase Auth if enabled, but don't fail if operation-not-allowed
    try {
      await createUserWithEmailAndPassword(auth, cleanEmail, data.password);
    } catch (e) {
      // Ignore auth/operation-not-allowed
    }

    setAccounts((prev) => [...prev.filter((a) => a.email.trim().toLowerCase() !== cleanEmail), newAccount]);
    setActiveUserId(uid);
    setIsAuthModalOpen(false);
    return { success: true, account: newAccount };
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

    // Sync updates to Firestore
    try {
      await setDoc(doc(db, 'users', userId), data, { merge: true });
    } catch (err) {
      console.error("Error updating user in Firestore:", err);
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
