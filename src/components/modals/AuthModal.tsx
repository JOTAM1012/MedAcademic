import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth, UserAccount } from '../../context/AuthContext';
import { CARTOON_AVATARS } from '../../data/avatars';

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
  const {
    accounts,
    activeUserId,
    isAuthModalOpen,
    authViewMode,
    openAuthModal,
    closeAuthModal,
    selectAccount,
    loginWithEmail,
    registerWithEmail,
    deleteAccount,
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

  // Login Tab State
  const [loginEmail, setLoginEmail] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');

  // Register Tab State
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');

  if (!isPage && !isAuthModalOpen && activeUserId) return null;

  const handleProfileClick = (account: UserAccount) => {
    setErrorMessage(null);
    if (account.password && account.password.trim() !== '') {
      setSelectedUserForPassword(account);
      setPasswordInput('');
    } else {
      const res = selectAccount(account.id);
      if (!res.success) {
        setErrorMessage(res.error || 'Erro ao acessar o perfil.');
      }
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;
    setErrorMessage(null);

    const res = selectAccount(selectedUserForPassword.id, passwordInput);
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

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!regEmail.trim() || !regEmail.includes('@')) {
      setErrorMessage('Informe um e-mail válido para seu perfil.');
      return;
    }
    if (!regPassword.trim() || regPassword.length < 4) {
      setErrorMessage('Crie uma senha de acesso (mínimo 4 caracteres).');
      return;
    }

    const defaultName = regEmail.split('@')[0] || 'Estudante de Medicina';
    const formattedName = defaultName.charAt(0).toUpperCase() + defaultName.slice(1);

    const res = await registerWithEmail({
      name: formattedName,
      email: regEmail.trim(),
      password: regPassword.trim(),
      university: 'Faculdade de Medicina',
      currentSemester: '5º Semestre - Ciclo Clínico',
      dreamSpecialty: 'Clínica Médica',
      avatarUrl: CARTOON_AVATARS[0].url,
    });

    if (res.success) {
      setRegEmail('');
      setRegPassword('');
    } else {
      setErrorMessage(res.error || 'Erro ao cadastrar novo perfil.');
    }
  };

  const handleDeleteProfile = (account: UserAccount, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Tem certeza que deseja apagar o perfil de ${account.name}? Esta ação apagará todos os dados isolados deste usuário.`)) {
      deleteAccount(account.id);
    }
  };

  return (
    <div className={isPage || !activeUserId ? "min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-8 relative overflow-y-auto font-sans" : "fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto font-sans"}>
      {(isPage || !activeUserId) && (
        <div className="text-center mb-6 max-w-xl">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-sky-400 p-0.5 shadow-xl shadow-blue-500/20 mx-auto mb-3 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center text-sky-400">
              <Stethoscope className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            MedAcademic
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Plataforma de Gestão Acadêmica & Estudos em Medicina
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[11px] font-bold text-sky-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Google Cloud Sync Ativado por Padrão</span>
          </div>
        </div>
      )}

      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden my-4 sm:my-8">
        {/* Header Bar */}
        <div className="bg-slate-900 px-6 py-5 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Stethoscope className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                MedAcademic - Acesso & Login
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30">
                  Firebase Cloud
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Acesse sua conta por e-mail, Google ou crie um novo perfil de estudante
              </p>
            </div>
          </div>

          {activeUserId && (
            <button
              onClick={closeAuthModal}
              className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              title="Fechar"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 px-6 pt-3">
          <button
            onClick={() => {
              setActiveTab('login');
              setErrorMessage(null);
            }}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'login'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <LogIn className="h-4 w-4" />
            Login de Usuário
          </button>

          <button
            onClick={() => {
              setActiveTab('register');
              setErrorMessage(null);
            }}
            className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === 'register'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-bold'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <UserPlus className="h-4 w-4" />
            Criar Novo Usuário
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="mb-4 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 2: Email Login */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4 max-w-md mx-auto py-2">
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
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
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="ex: joao@med.edu.br"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Senha do Perfil <span className="text-[10px] font-normal text-slate-400">(Opcional, se configurada)</span>
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua senha secreta"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                  Entrar no Meu Perfil
                </button>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Ainda não possui uma conta no MedAcademic?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('register');
                      setErrorMessage(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer border border-blue-200 dark:border-blue-900/50"
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
            <form onSubmit={handleRegisterSubmit} className="space-y-4 max-w-md mx-auto py-2">
              <div className="text-center mb-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto mb-2">
                  <UserPlus className="h-6 w-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Criar Novo Perfil de Estudante
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Insira seu e-mail e crie uma senha. Você poderá personalizar seu perfil detalhadamente na aba de edição posteriormente.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  E-mail do Estudante
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="ex: joao@med.edu.br"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Criar Senha de Acesso
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Sua senha secreta"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2 space-y-3">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-md cursor-pointer"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Criar Conta e Acessar</span>
                </button>

                <div className="pt-3 border-t border-slate-200 dark:border-slate-800 text-center">
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                    Já possui um perfil de estudante?
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('login');
                      setErrorMessage(null);
                    }}
                    className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-blue-600 dark:text-blue-400 text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer border border-blue-200 dark:border-blue-900/50"
                  >
                    <LogIn className="h-4 w-4" />
                    <span>Já tenho conta, fazer Login</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Password Prompt Sub-modal */}
          {selectedUserForPassword && (
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md p-6 flex items-center justify-center z-20">
              <div className="w-full max-w-sm bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl text-center space-y-4">
                <div className="relative inline-block">
                  <img
                    src={selectedUserForPassword.avatarUrl}
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
                      className="w-full pl-9 pr-10 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
                      className="flex-1 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors"
                    >
                      Acessar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
