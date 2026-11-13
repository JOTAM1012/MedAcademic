import IconSwap from '../shared/IconSwap';
import React, { useState, useEffect } from 'react';
import { confirmDialog } from '../shared/ConfirmDialog';
import { shakeElement } from '../shared/ErrorShake';
import {
  User,
  Users,
  Lock,
  Mail,
  Plus,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  GraduationCap,
  KeyRound,
  X,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Eye,
  EyeOff,
  UserCheck,
  UserPlus,
  LogIn,
  Smartphone,
} from 'lucide-react';
import { useAuth, UserAccount, isLocalOnly } from '../../context/AuthContext';
import { CARTOON_AVATARS } from '../../data/avatars';
import { usePwaInstall } from '../../lib/pwaInstall';
import { InstallAppModal } from '../InstallAppGuide';
import { motion, useReducedMotion } from 'motion/react';
import '../auth.css';

const SPECIALTIES_LIST = [
  'Clínica Médica',
  'Cirurgia Geral',
  'Pediatria',
  'Ginecologia e Obstetrícia',
  'Anestesiologia',
  'Ortopedia e Traumatologia',
  'Dermatologia',
  'Radiologia',
  'Psiquiatria',
  'Oftalmologia',
  'Cardiologia Intervencionista',
  'Neurologia',
  'Neurocirurgia',
  'Infectologia',
  'Medicina de Emergência',
  'Medicina de Família e Comunidade',
];

interface AuthModalProps {
  isPage?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isPage = false }) => {
  const { isInstalled: isAppInstalled } = usePwaInstall();
  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const reduceMotion = useReducedMotion();
  const {
    accounts,
    activeUserId,
    isAuthModalOpen,
    authViewMode,
    openAuthModal,
    closeAuthModal,
    selectAccount,
    loginWithEmail,
    startSignup,
    deleteAccount,
    authNotice,
  } = useAuth();

  const [activeTab, setActiveTab] = useState<'login' | 'register'>(
    authViewMode === 'register' ? 'register' : 'login'
  );

  useEffect(() => {
    if (authViewMode === 'register') setActiveTab('register');
    else setActiveTab('login');
  }, [authViewMode]);

  // Password Prompt for Selected Profile
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserAccount | null>(null);
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Erro: o aviso e os campos da tela aberta balançam (tremor de erro)
  useEffect(() => {
    if (!errorMessage) return;
    shakeElement(document.getElementById('auth-error-banner'));
    document.querySelectorAll('[data-auth-field]').forEach((el) => shakeElement(el));
  }, [errorMessage]);

  // Login Tab State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  if (!isPage && !isAuthModalOpen && activeUserId) return null;

  const handleProfileClick = async (account: UserAccount) => {
    setErrorMessage(null);
    // Cloud accounts always need the password; local ones only if they set one
    if (!isLocalOnly || account.passwordHash) {
      setSelectedUserForPassword(account);
      setPasswordInput('');
    } else {
      const res = await selectAccount(account.id);
      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao acessar o perfil.');
      }
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;
    setErrorMessage(null);

    const res = await selectAccount(selectedUserForPassword.id, passwordInput);
    if (res.success) {
      setSelectedUserForPassword(null);
      setPasswordInput('');
    } else {
      setErrorMessage(res.error || 'Senha incorreta.');
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!loginEmail.trim()) {
      setErrorMessage('Informe o e-mail cadastrado.');
      return;
    }

    const res = await loginWithEmail(loginEmail, loginPassword);
    if (res.success) {
      setLoginEmail('');
      setLoginPassword('');
    } else {
      setErrorMessage(res.error || 'Erro ao realizar login.');
    }
  };

  const handleDeleteProfile = async (account: UserAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      await confirmDialog({
        title: `Apagar o perfil de ${account.name}?`,
        message: 'Isto apaga todos os dados deste perfil neste aparelho.',
        confirmLabel: 'Apagar perfil',
      })
    ) {
      deleteAccount(account.id);
    }
  };

  return (
    <div className={isPage || !activeUserId ? "auth-stage dark min-h-screen w-full text-slate-100 flex flex-col items-center justify-center px-4 py-8 sm:p-8 relative overflow-x-hidden overflow-y-auto font-sans" : "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-md p-4 overflow-y-auto font-sans"}>
      {(isPage || !activeUserId) && (
        <div className="relative text-center mb-6 max-w-xl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-600 shadow-xl shadow-sky-500/25 ring-1 ring-inset ring-white/25 mx-auto mb-3 flex items-center justify-center text-white">
            <Stethoscope className="h-7 w-7" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            MedAcademic
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Plataforma de Gestão Acadêmica & Estudos em Medicina
          </p>
          <div className="auth-chip mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-bold text-sky-300">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
            <span>{isLocalOnly ? 'Modo local: dados salvos neste dispositivo' : 'Seus estudos sincronizados na nuvem'}</span>
          </div>
        </div>
      )}

      <div className="auth-card relative w-full max-w-2xl rounded-3xl overflow-hidden my-2 sm:my-6">
        {/* Camada de vidro separada: o painel de senha (dentro do cartão) não fica preso ao desfoque */}
        <div className="auth-glass-layer" aria-hidden />
        <div className="relative">
        {/* Header Bar */}
        <div className="px-5 sm:px-6 pt-5 pb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-sky-500/15 ring-1 ring-inset ring-sky-400/25 flex items-center justify-center text-sky-600 dark:text-sky-300 shrink-0">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-x-2 gap-y-1">
                MedAcademic - Acesso & Login
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 ring-1 ring-inset ring-sky-400/30">
                  {isLocalOnly ? 'Local' : 'Nuvem'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Acesse sua conta por e-mail ou crie um novo perfil de estudante
              </p>
            </div>
          </div>

          {activeUserId && (
            <button
              onClick={closeAuthModal}
              className="text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-2 rounded-full hover:bg-slate-900/5 dark:hover:bg-white/[0.07] transition-colors cursor-pointer shrink-0"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Tab Navigation: controle segmentado com pílula que desliza */}
        <div className="px-5 sm:px-6">
          <div className="auth-segment grid grid-cols-2 gap-1 p-1 rounded-2xl" role="tablist">
            {(
              [
                ['login', LogIn, 'Login de Usuário'],
                ['register', UserPlus, 'Criar Novo Usuário'],
              ] as const
            ).map(([tab, TabIcon, tabLabel]) => {
              const isOn = activeTab === tab;
              return (
                <button
                  key={tab}
                  role="tab"
                  aria-selected={isOn}
                  onClick={() => {
                    setActiveTab(tab);
                    setErrorMessage(null);
                  }}
                  className={`relative py-2 px-2 rounded-xl text-xs font-semibold transition-colors duration-150 flex items-center justify-center gap-2 cursor-pointer ${
                    isOn ? 'text-slate-900 dark:text-white font-bold' : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  {isOn && (
                    <motion.span
                      layoutId="auth-tab-pill"
                      className="auth-segment-pill absolute inset-0 rounded-xl"
                      transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 38 }}
                    />
                  )}
                  <TabIcon className={`relative h-4 w-4 ${isOn ? 'text-sky-600 dark:text-sky-300' : ''}`} />
                  <span className="relative truncate">{tabLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6">
          {/* Info Banner (e.g. e-mail confirmation pending) */}
          {authNotice && !errorMessage && (
            <div id="auth-notice" className="mb-4 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{authNotice}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div id="auth-error-banner" role="alert" className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 2: Email Login */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 max-w-md mx-auto py-2">
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 ring-1 ring-inset ring-sky-400/25 text-sky-600 dark:text-sky-300 flex items-center justify-center mx-auto mb-2">
                  <KeyRound className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Acessar seu Perfil Pessoal
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Digite seu e-mail para abrir seu dashboard pessoal de estudos
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail do Estudante
                </label>
                <div className="relative" data-auth-field data-field-error={errorMessage ? 'true' : undefined}>
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="ex: user@med.com"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full pl-9 pr-3 py-2 auth-input rounded-xl border text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500/60 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Senha do Perfil <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">(Obrigatório)</span>
                </label>
                <div className="relative" data-auth-field data-field-error={errorMessage ? 'true' : undefined}>
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Sua senha secreta"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      if (errorMessage) setErrorMessage(null);
                    }}
                    className="w-full pl-9 pr-10 py-2 auth-input rounded-xl border text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500/60 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <IconSwap swapped={showPassword} from={<Eye className="h-4 w-4" />} to={<EyeOff className="h-4 w-4" />} />
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  className="auth-btn-primary w-full py-2.5 rounded-xl text-white text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                  Entrar no Meu Perfil
                </button>

                <div className="pt-3 border-t border-slate-900/[0.07] dark:border-white/[0.07] text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Ainda não possui uma conta no MedAcademic?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setErrorMessage(null);
                    }}
                    className="auth-btn-secondary w-full py-2.5 rounded-xl text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>Criar Novo Usuário</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* TAB 3: Register New Profile */}
          {activeTab === 'register' && (
            <div className="space-y-5 max-w-md mx-auto py-2">
              <div className="text-center">
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Criar Novo Perfil de Estudante
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Monte seu perfil em 4 passos (identidade, faculdade, metas) e, no final, defina o e-mail e a senha
                  que você usará para entrar.
                </p>
              </div>

              <button
                type="button"
                id="auth-start-signup-btn"
                onClick={() => {
                  setErrorMessage(null);
                  startSignup();
                }}
                className="auth-btn-hero w-full py-8 rounded-2xl text-white font-black flex flex-col items-center justify-center gap-2 cursor-pointer"
              >
                <UserPlus className="h-9 w-9" />
                <span className="text-lg">Criar Novo Usuário</span>
                <span className="text-[11px] font-semibold text-sky-100/90">Começar a criação do perfil →</span>
              </button>

              <div className="space-y-3">
                <div className="pt-3 border-t border-slate-900/[0.07] dark:border-white/[0.07] text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Já possui um perfil de estudante?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setErrorMessage(null);
                    }}
                    className="auth-btn-secondary w-full py-2.5 rounded-xl text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Já tenho conta, fazer Login</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Password Prompt Sub-modal */}
          {selectedUserForPassword && (
            <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-md p-6 flex items-center justify-center z-20">
              <div className="auth-subpanel w-full max-w-sm p-6 rounded-2xl text-center space-y-4">
                <div className="relative inline-block">
                  <img
                    src={selectedUserForPassword.avatarUrl || CARTOON_AVATARS[0].url}
                    alt={selectedUserForPassword.name}
                    referrerPolicy="no-referrer"
                    className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-blue-500 shadow-md"
                  />
                  <div className="absolute bottom-0 right-0 bg-amber-500 text-white p-1 rounded-full">
                    <Lock className="h-3 w-3" />
                  </div>
                </div>

                <div>
                  <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                    {selectedUserForPassword.name}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Perfil protegido. Digite a senha para continuar.
                  </p>
                </div>

                <form onSubmit={handlePasswordSubmit} className="space-y-3">
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      autoFocus
                      required
                      placeholder="Senha do perfil"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full pl-9 pr-10 py-2 auth-input rounded-xl border text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500/60 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      <IconSwap swapped={showPassword} from={<Eye className="h-4 w-4" />} to={<EyeOff className="h-4 w-4" />} />
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedUserForPassword(null);
                        setPasswordInput('');
                        setErrorMessage(null);
                      }}
                      className="auth-btn-secondary flex-1 py-2 rounded-xl text-slate-600 dark:text-slate-300 text-xs font-semibold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="auth-btn-primary flex-1 py-2 rounded-xl text-white text-xs font-bold"
                    >
                      Acessar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Instalar como aplicativo (na tela de login o App ainda não montou a janela global) */}
        {(isPage || !activeUserId) && !isAppInstalled && (
          <button
            id="auth-install-btn"
            type="button"
            onClick={() => setIsInstallOpen(true)}
            className="auth-chip mx-auto mb-5 -mt-1 flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold text-slate-300 hover:text-white transition-colors"
          >
            <Smartphone className="h-4 w-4 text-sky-400" />
            Instalar o MedAcademic no celular
          </button>
        )}
        </div>
      </div>
      <InstallAppModal isOpen={isInstallOpen} onClose={() => setIsInstallOpen(false)} />
    </div>
  );
};
