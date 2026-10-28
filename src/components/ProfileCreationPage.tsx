import React, { useState, useRef } from 'react';
import {
  Stethoscope,
  GraduationCap,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  Clock,
  Target,
  HeartPulse,
  BookOpen,
  User,
  ShieldCheck,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Camera,
  Cloud,
  CloudOff,
} from 'lucide-react';
import { useApp, seedNewUserData } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { UserProfile, Semester } from '../types';
import { INITIAL_USER_PROFILE, INITIAL_SEMESTERS } from '../mockData';
import { CARTOON_AVATARS } from '../data/avatars';

const SPECIALTIES_R1 = [
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
  'Infectologia',
  'Neurologia',
  'Neurocirurgia',
  'Otorrinolaringologia',
  'Medicina de Emergência',
  'Medicina de Família e Comunidade',
  'Cardiologia',
  'Patologia',
];

export interface SemesterOption {
  number: number;
  label: string;
  yearLabel: string;
  semCode: string;
}

export interface MedicalCycleConfig {
  id: 'ciclo_basico' | 'ciclo_clinico' | 'internato';
  title: string;
  semesters: SemesterOption[];
}

const MEDICAL_CYCLES: MedicalCycleConfig[] = [
  {
    id: 'ciclo_basico',
    title: 'Ciclo Básico',
    semesters: [
      { number: 1, label: '1º Semestre', yearLabel: '1º Ano', semCode: 'SEM1' },
      { number: 2, label: '2º Semestre', yearLabel: '1º Ano', semCode: 'SEM2' },
      { number: 3, label: '3º Semestre', yearLabel: '2º Ano', semCode: 'SEM3' },
      { number: 4, label: '4º Semestre', yearLabel: '2º Ano', semCode: 'SEM4' },
    ],
  },
  {
    id: 'ciclo_clinico',
    title: 'Ciclo Clínico',
    semesters: [
      { number: 5, label: '5º Semestre', yearLabel: '3º Ano', semCode: 'SEM5' },
      { number: 6, label: '6º Semestre', yearLabel: '3º Ano', semCode: 'SEM6' },
      { number: 7, label: '7º Semestre', yearLabel: '4º Ano', semCode: 'SEM7' },
      { number: 8, label: '8º Semestre', yearLabel: '4º Ano', semCode: 'SEM8' },
    ],
  },
  {
    id: 'internato',
    title: 'Internato',
    semesters: [
      { number: 9, label: '9º Semestre', yearLabel: '5º Ano (Internato I)', semCode: 'SEM9' },
      { number: 10, label: '10º Semestre', yearLabel: '5º Ano (Internato II)', semCode: 'SEM10' },
      { number: 11, label: '11º Semestre', yearLabel: '6º Ano (Internato III)', semCode: 'SEM11' },
      { number: 12, label: '12º Semestre', yearLabel: '6º Ano (Internato IV)', semCode: 'SEM12' },
    ],
  },
];

interface ProfileCreationPageProps {
  /** Sign-up flow: no account exists yet; e-mail & password are asked on the last step */
  signupMode?: boolean;
}

export const ProfileCreationPage: React.FC<ProfileCreationPageProps> = ({ signupMode = false }) => {
  const { activeUserId, updateAccount, isDeleting, registerWithEmail, cancelSignup } = useAuth();

  const {
    userProfile,
    subjects,
    updateUserProfile,
    clearAllData,
    updateSemester,
    addXp,
    triggerConfetti,
    showNotification,
    setIsOnboardingOpen,
    setCurrentTab,
    forceCloudSync,
    setIsEditingProfileSetup,
    isEditingProfileSetup,
  } = useApp();

  const [currentStep, setCurrentStep] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [name, setName] = useState(signupMode ? '' : userProfile.name || '');
  const [email, setEmail] = useState(signupMode ? '' : userProfile.email || '');
  const [university, setUniversity] = useState(signupMode ? '' : userProfile.university || '');
  // Sign-up access credentials (last step)
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [signupError, setSignupError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCycle, setSelectedCycle] = useState<'ciclo_basico' | 'ciclo_clinico' | 'internato'>('ciclo_clinico');
  const [selectedSemesterNum, setSelectedSemesterNum] = useState<number>(5);
  const [semesterName, setSemesterName] = useState('5º Semestre - Ciclo Clínico');
  const [semesterCode, setSemesterCode] = useState('2026.1');
  const [dreamSpecialty, setDreamSpecialty] = useState(userProfile.dreamSpecialty || 'Clínica Médica');
  const [targetExam, setTargetExam] = useState(userProfile.targetExam || '');
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState(true);
  const [weeklyTargetHours, setWeeklyTargetHours] = useState<number>(userProfile.weeklyTargetHours || 30);
  const [targetAverageGrade, setTargetAverageGrade] = useState<number>(userProfile.targetAverageGrade || 8.5);
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState<string>(
    userProfile.avatarUrl || CARTOON_AVATARS[0].url
  );
  const [customAvatarUploaded, setCustomAvatarUploaded] = useState<boolean>(false);

  const activeCycleConfig =
    MEDICAL_CYCLES.find((c) => c.id === selectedCycle) || MEDICAL_CYCLES[1];

  const handleSelectCycle = (cycleId: 'ciclo_basico' | 'ciclo_clinico' | 'internato') => {
    setSelectedCycle(cycleId);
    const found = MEDICAL_CYCLES.find((c) => c.id === cycleId);
    if (found && found.semesters.length > 0) {
      const firstSem = found.semesters[0];
      setSelectedSemesterNum(firstSem.number);
      setSemesterName(`${firstSem.label} - ${found.title}`);
      setSemesterCode(firstSem.semCode);
    }
  };

  const handleSelectSemester = (semOption: SemesterOption) => {
    setSelectedSemesterNum(semOption.number);
    setSemesterName(`${semOption.label} - ${activeCycleConfig.title}`);
    setSemesterCode(semOption.semCode);
  };

  // Upload Custom Photo
  const handleCustomPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setSelectedAvatarUrl(dataUrl);
        setCustomAvatarUploaded(true);
        showNotification('Sua foto personalizada foi carregada com sucesso!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  // Sign-up: creates the account with the profile built in the wizard
  const handleSignupFinish = async () => {
    setSignupError(null);
    if (!name.trim()) {
      showNotification('Por favor, informe seu nome completo para continuar.', 'warning');
      setCurrentStep(1);
      return;
    }
    if (!university.trim()) {
      showNotification('Por favor, informe sua Faculdade de Medicina.', 'warning');
      setCurrentStep(2);
      return;
    }
    const cleanEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setSignupError('Informe um e-mail válido para acessar seu perfil.');
      return;
    }
    if (password.trim().length < 6) {
      setSignupError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setSignupError('As senhas não conferem.');
      return;
    }

    setIsSubmitting(true);
    const chosenSemesterName = semesterName.trim() || `${selectedSemesterNum}º Semestre - ${activeCycleConfig.title}`;
    const profile: UserProfile = {
      ...INITIAL_USER_PROFILE,
      name: name.trim(),
      email: cleanEmail,
      university: university.trim(),
      dreamSpecialty: dreamSpecialty.trim(),
      targetExam: targetExam.trim(),
      googleSyncEnabled,
      weeklyTargetHours: Number(weeklyTargetHours),
      targetAverageGrade: Number(targetAverageGrade),
      avatarUrl: selectedAvatarUrl,
      currentSemesterId: 'sem-1',
      totalXp: 150, // welcome reward
      level: 1,
      onboardingCompleted: true,
    };
    const semesters: Semester[] = [
      {
        ...INITIAL_SEMESTERS[0],
        id: 'sem-1',
        name: chosenSemesterName,
        code: semesterCode.trim() || `SEM${selectedSemesterNum}`,
        targetHoursWeekly: Number(weeklyTargetHours),
        description: `${activeCycleConfig.title} • ${chosenSemesterName}`,
        isCurrent: true,
      },
    ];

    const res = await registerWithEmail(
      {
        name: name.trim(),
        email: cleanEmail,
        password: password.trim(),
        university: university.trim(),
        currentSemester: chosenSemesterName,
        dreamSpecialty: dreamSpecialty.trim(),
        avatarUrl: selectedAvatarUrl,
        onboardingCompleted: true,
      },
      (uid) => seedNewUserData(uid, profile, semesters)
    );
    setIsSubmitting(false);

    if (!res.success) {
      setSignupError(res.error || 'Não foi possível criar sua conta.');
      return;
    }
    if (res.needsEmailConfirmation) return; // back to the login screen with the confirmation notice
    triggerConfetti();
    showNotification(`Bem-vindo(a), ${name.trim()}! Sua conta foi criada. Use ${cleanEmail} e sua senha para entrar.`, 'success');
    setTimeout(() => setIsOnboardingOpen(true), 800);
  };

  const handleFinish = () => {
    if (!name.trim()) {
      showNotification('Por favor, informe seu nome completo para continuar.', 'warning');
      setCurrentStep(1);
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showNotification('Por favor, informe um e-mail acadêmico válido.', 'warning');
      setCurrentStep(1);
      return;
    }
    if (!university.trim()) {
      showNotification('Por favor, informe sua Faculdade de Medicina.', 'warning');
      setCurrentStep(2);
      return;
    }

    // Only initialize blank data if user has no existing subjects
    if (subjects.length === 0) {
      clearAllData();
      const chosenSemesterName = semesterName.trim() || `${selectedSemesterNum}º Semestre - ${activeCycleConfig.title}`;
      const chosenSemesterCode = semesterCode.trim() || `SEM${selectedSemesterNum}`;
      updateSemester('sem-1', {
        name: chosenSemesterName,
        code: chosenSemesterCode,
        targetHoursWeekly: Number(weeklyTargetHours),
        description: `${activeCycleConfig.title} • ${chosenSemesterName}`,
      });
    }

    // Update user profile
    const updated: Partial<UserProfile> = {
      name: name.trim(),
      email: email.trim(),
      university: university.trim(),
      dreamSpecialty: dreamSpecialty.trim(),
      targetExam: targetExam.trim(),
      googleSyncEnabled: googleSyncEnabled,
      weeklyTargetHours: Number(weeklyTargetHours),
      targetAverageGrade: Number(targetAverageGrade),
      avatarUrl: selectedAvatarUrl,
      onboardingCompleted: true,
      currentSemesterId: 'sem-1',
    };

    updateUserProfile(updated);
    if (activeUserId) {
      updateAccount(activeUserId, {
        name: name.trim(),
        university: university.trim(),
        dreamSpecialty: dreamSpecialty.trim(),
        avatarUrl: selectedAvatarUrl,
        onboardingCompleted: true,
      });
    }
    if (!isEditingProfileSetup) {
      addXp(150, 'Perfil Médico Configurado com Sucesso!');
      triggerConfetti();
    }
    
    // Force immediate cloud sync so logout won't lose this onboarding completion state
    setTimeout(() => {
      forceCloudSync();
    }, 100);
    
    // Redirect directly to the Dashboard Tab
    setCurrentTab('dashboard');
    setIsEditingProfileSetup(false);
    
    if (!isEditingProfileSetup) {
      showNotification(`Bem-vindo(a), ${name.trim()}! Seu perfil foi configurado com sucesso e o painel iniciado no ${selectedSemesterNum}º Semestre.`, 'success');
      // Open quick tutorial guide right after finishing
      setTimeout(() => {
        setIsOnboardingOpen(true);
      }, 600);
    } else {
      showNotification(`Perfil atualizado com sucesso!`, 'success');
    }
  };

  if (isDeleting) {
    return null;
  }

  return (
    <div className="min-h-screen w-full bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-x-hidden font-sans">
      {/* Hidden File Input for Custom Avatar */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleCustomPhotoUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Subtle Background Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Brand Header */}
      <header className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-blue-600 shadow-md shadow-sky-600/20 text-white">
            <Stethoscope className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black tracking-tight text-white">MedAcademic</span>
              <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30">
                {signupMode ? 'Novo Usuário' : isEditingProfileSetup ? 'Edição de Perfil' : 'Setup Inicial'}
              </span>
            </div>
            <p className="text-xs text-slate-400">Sistema de Estudos Médicos & Preparação R1</p>
          </div>
        </div>

        {/* Action / Step Indicator */}
        <div className="flex items-center gap-4">
          {signupMode && (
            <button
              id="signup-back-to-login-btn"
              onClick={cancelSignup}
              className="text-xs font-bold px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar ao Login
            </button>
          )}
          {isEditingProfileSetup && (
            <button
              onClick={() => setIsEditingProfileSetup(false)}
              className="text-xs font-bold px-4 py-2 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Cancelar Edição
            </button>
          )}
          <div className="flex items-center gap-2 hidden sm:flex">
            {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold transition-all ${
                currentStep === step
                  ? 'bg-sky-600 text-white shadow-sm'
                  : currentStep > step
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-slate-900 text-slate-500 border border-slate-800'
              }`}
            >
              {currentStep > step ? <Check className="h-3 w-3" /> : <span>{step}</span>}
              <span className="hidden sm:inline">
                {step === 1 && 'Identidade & Foto'}
                {step === 2 && 'Faculdade & Ciclo'}
                {step === 3 && 'Residência R1'}
                {step === 4 && (signupMode ? 'E-mail & Senha' : 'Iniciar Painel')}
              </span>
            </div>
          ))}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto px-6 py-8 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Form Wizard (Left / Main) */}
          <div className="lg:col-span-8 bg-slate-900/80 backdrop-blur-md rounded-3xl border border-slate-800 p-6 sm:p-8 shadow-xl space-y-6">
            
            {/* Step 1: Identidade & Avatar */}
            {currentStep === 1 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-500/10 text-sky-400 text-xs font-bold border border-sky-500/20 mb-2">
                    <User className="h-3.5 w-3.5" />
                    <span>Passo 1 de 4: Identificação e Foto do Estudante</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Como podemos chamar você?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Defina seu nome e escolha um avatar médico cartoon ou faça upload da sua própria foto.
                  </p>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      Nome Completo ou Nome Social <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Dra. Mariana Costa ou João Silva"
                      className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 transition-colors"
                      autoFocus
                    />
                  </div>

                  {/* In sign-up mode the e-mail is asked on the last step, together with the password */}
                  {!signupMode && (
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>E-mail Acadêmico / Principal</span>
                      <span className="text-[10px] text-rose-400 font-extrabold uppercase">* Obrigatório</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ex: mariana.costa@medicina.edu.br"
                      className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 transition-colors"
                    />
                  </div>
                  )}

                  {/* Avatar Picker & Custom Upload */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      Escolha um Avatar Cartoon ou envie sua Própria Foto
                    </label>
                    
                    <div className="grid grid-cols-5 gap-3">
                      {/* 4 Cartoon Avatars */}
                      {CARTOON_AVATARS.map((avatar) => (
                        <button
                          key={avatar.id}
                          type="button"
                          onClick={() => {
                            setSelectedAvatarUrl(avatar.url);
                            setCustomAvatarUploaded(false);
                          }}
                          title={avatar.label}
                          aria-label={avatar.label}
                          className={`relative rounded-2xl p-1.5 sm:p-2 flex items-center justify-center border-2 transition-all group cursor-pointer aspect-square ${
                            selectedAvatarUrl === avatar.url && !customAvatarUploaded
                              ? 'border-sky-500 bg-sky-950/40 ring-4 ring-sky-500/20 scale-105'
                              : 'border-slate-800 bg-slate-950/60 opacity-70 hover:opacity-100 hover:border-slate-700'
                          }`}
                        >
                          <div className="w-full h-full rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                            <img
                              src={avatar.url}
                              alt={avatar.label}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          {selectedAvatarUrl === avatar.url && !customAvatarUploaded && (
                            <div className="absolute top-1.5 right-1.5 bg-sky-500 text-white rounded-full p-0.5 shadow-md">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      ))}

                      {/* Custom Photo Upload Card */}
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        title="Enviar foto personalizada"
                        aria-label="Enviar foto personalizada"
                        className={`relative rounded-2xl p-1.5 sm:p-2 flex items-center justify-center border-2 border-dashed transition-all group cursor-pointer aspect-square ${
                          customAvatarUploaded
                            ? 'border-emerald-500 bg-emerald-950/30 ring-4 ring-emerald-500/20 scale-105'
                            : 'border-slate-700 bg-slate-950/60 hover:border-sky-500 hover:bg-slate-900/80 text-slate-400 hover:text-sky-400'
                        }`}
                      >
                        {customAvatarUploaded ? (
                          <>
                            <div className="w-full h-full rounded-xl overflow-hidden bg-slate-900 flex items-center justify-center">
                              <img
                                src={selectedAvatarUrl}
                                alt="Sua Foto"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <div className="absolute top-1.5 right-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-md">
                              <Check className="h-3 w-3 stroke-[3]" />
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center justify-center w-full h-full">
                            <Upload className="h-6 w-6 group-hover:scale-110 transition-transform" />
                          </div>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Faculdade & Ciclo Médico */}
            {currentStep === 2 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 text-blue-400 text-xs font-bold border border-blue-500/20 mb-2">
                    <GraduationCap className="h-3.5 w-3.5" />
                    <span>Passo 2 de 4: Faculdade & Ciclo</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Onde e em que fase você está estudando?
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Informe sua faculdade de medicina e selecione seu ciclo acadêmico atual.
                  </p>
                </div>

                <div className="space-y-5">
                  {/* University Freeform Input */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                      <span>Faculdade de Medicina / Instituição de Ensino</span>
                      <span className="text-[10px] text-rose-400 font-extrabold uppercase">* Obrigatório</span>
                    </label>
                    <input
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="Digite o nome da sua faculdade (Ex: USP, UNIFESP, UFRJ, PUC, UFMG...)"
                      className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 transition-colors"
                      autoFocus
                    />
                  </div>

                  {/* Medical Cycles Selection - ONLY MAIN TITLES */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-2">
                      Ciclo Acadêmico Atual
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {MEDICAL_CYCLES.map((cycle) => (
                        <div
                          key={cycle.id}
                          onClick={() => handleSelectCycle(cycle.id as any)}
                          className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            selectedCycle === cycle.id
                              ? 'bg-sky-950/50 border-sky-500 text-white ring-2 ring-sky-500/40 shadow-md'
                              : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                          }`}
                        >
                          <span className="text-sm font-black tracking-tight">{cycle.title}</span>
                          <div
                            className={`h-5 w-5 rounded-full border flex items-center justify-center shrink-0 ${
                              selectedCycle === cycle.id
                                ? 'border-sky-500 bg-sky-500 text-white'
                                : 'border-slate-700 bg-slate-900'
                            }`}
                          >
                            {selectedCycle === cycle.id && <Check className="h-3 w-3 stroke-[3]" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Semester in Cycle Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-bold text-slate-300">
                        Semestre no {activeCycleConfig.title}
                      </label>
                      <span className="text-[10px] text-sky-400 font-semibold">
                        Selecione seu semestre atual
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {activeCycleConfig.semesters.map((sem) => {
                        const isSelected = selectedSemesterNum === sem.number;
                        return (
                          <button
                            key={sem.number}
                            type="button"
                            onClick={() => handleSelectSemester(sem)}
                            className={`p-3 rounded-2xl border text-left transition-all cursor-pointer relative flex flex-col justify-between ${
                              isSelected
                                ? 'bg-sky-950/60 border-sky-500 text-white ring-2 ring-sky-500/40 shadow-md scale-102'
                                : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700 hover:bg-slate-950'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className="text-xs font-black tracking-tight">{sem.label}</span>
                              {isSelected && (
                                <div className="h-4 w-4 rounded-full bg-sky-500 text-white flex items-center justify-center">
                                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] font-medium text-slate-400 mt-1">
                              {sem.yearLabel}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Semester Active Code / Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Identificação do Semestre
                      </label>
                      <input
                        type="text"
                        value={semesterName}
                        onChange={(e) => setSemesterName(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-400 mb-1">
                        Período / Ano Letivo
                      </label>
                      <input
                        type="text"
                        value={semesterCode}
                        onChange={(e) => setSemesterCode(e.target.value)}
                        className="w-full rounded-xl bg-slate-950 border border-slate-800 px-3 py-2 text-xs text-white focus:outline-hidden focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Residência Médica (R1) & Especialidade e Metas */}
            {currentStep === 3 && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20 mb-2">
                    <Target className="h-3.5 w-3.5" />
                    <span>
                      {selectedCycle === 'internato' 
                        ? 'Passo 3 de 4: Residência Médica (R1) & Metas'
                        : 'Passo 3 de 4: Metas Acadêmicas & de Estudos'}
                    </span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    {selectedCycle === 'internato' 
                      ? 'Especialidade R1 & Metas de Estudos'
                      : 'Metas Acadêmicas & de Estudos'}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    {selectedCycle === 'internato'
                      ? 'Defina sua especialidade principal para o R1 e configure suas metas de horas e média acadêmica.'
                      : 'Configure suas metas semanais de estudos e sua média acadêmica alvo para o seu ciclo de formação.'}
                  </p>
                </div>

                <div className="space-y-5">
                  {selectedCycle === 'internato' && (
                    <>
                      {/* Target Exam */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                          <span>Prova de Acesso Direto (Meta R1 / Revalida)</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Opcional</span>
                        </label>
                        <input
                          type="text"
                          value={targetExam}
                          onChange={(e) => setTargetExam(e.target.value)}
                          placeholder="Ex: ENARE, USP-SP, UNIFESP"
                          className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 transition-colors"
                        />
                      </div>

                      {/* Specialty for R1 */}
                      <div>
                        <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                          <span>Especialidade dos Sonhos (R1 / Entrada Direta)</span>
                          <span className="text-[10px] text-slate-400 font-bold uppercase">Opcional</span>
                        </label>
                        <input
                          type="text"
                          value={dreamSpecialty}
                          onChange={(e) => setDreamSpecialty(e.target.value)}
                          placeholder="Ex: Clínica Médica, Cirurgia Geral, Pediatria, Ginecologia e Obstetrícia..."
                          className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 transition-colors"
                          autoFocus
                        />

                        {/* Quick R1 Specialty Chips */}
                        <div className="flex flex-wrap gap-1.5 mt-2.5">
                          {SPECIALTIES_R1.map((spec) => (
                            <button
                              key={spec}
                              type="button"
                              onClick={() => setDreamSpecialty(spec)}
                              className={`text-[11px] px-3 py-1 rounded-xl border transition-all cursor-pointer ${
                                dreamSpecialty === spec
                                  ? 'bg-sky-500/20 border-sky-500 text-sky-300 font-bold shadow-xs'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                              }`}
                            >
                              {spec}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Target Study Hours focused on R1 */}
                  <div className="p-4.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-sky-400" />
                        <span>Meta Semanal de Horas de Estudo</span>
                      </label>
                      <span className="text-sm font-black text-sky-400">{weeklyTargetHours}h / semana</span>
                    </div>

                    {/* Quick presets for weekly hours */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { hours: 15, label: 'Leve', desc: '15h/sem' },
                        { hours: 25, label: 'Moderada', desc: '25h/sem' },
                        { hours: 35, label: 'Foco R1', desc: '35h/sem' },
                        { hours: 45, label: 'Intensiva', desc: '45h/sem' },
                      ].map((preset) => {
                        const isSelected = weeklyTargetHours === preset.hours;
                        return (
                          <button
                            key={preset.hours}
                            type="button"
                            onClick={() => setWeeklyTargetHours(preset.hours)}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-sky-950/60 border-sky-500 text-sky-300 ring-2 ring-sky-500/30 font-bold'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            <div className="text-xs font-bold">{preset.desc}</div>
                            <div className="text-[10px] text-slate-500">{preset.label}</div>
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="range"
                      min="10"
                      max="60"
                      step="5"
                      value={weeklyTargetHours}
                      onChange={(e) => setWeeklyTargetHours(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>10h (Mínimo)</span>
                      <span>30h (Recomendado R1)</span>
                      <span>60h (Máximo)</span>
                    </div>
                  </div>

                  {/* Target Average Grade / CR */}
                  <div className="p-4.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Target className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Meta de Média Acadêmica (CR / Nota Alvo)</span>
                      </label>
                      <span className="text-sm font-black text-emerald-400">{targetAverageGrade.toFixed(1)}</span>
                    </div>

                    {/* Quick presets for Target Grade */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {[
                        { grade: 7.5, label: 'Aprovação', desc: 'Nota 7.5' },
                        { grade: 8.0, label: 'Bom Desempenho', desc: 'Nota 8.0' },
                        { grade: 8.5, label: 'Destaque R1', desc: 'Nota 8.5' },
                        { grade: 9.0, label: 'Excelência', desc: 'Nota 9.0' },
                      ].map((preset) => {
                        const isSelected = targetAverageGrade === preset.grade;
                        return (
                          <button
                            key={preset.grade}
                            type="button"
                            onClick={() => setTargetAverageGrade(preset.grade)}
                            className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30 font-bold'
                                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                            }`}
                          >
                            <div className="text-xs font-bold">{preset.desc}</div>
                            <div className="text-[10px] text-slate-500">{preset.label}</div>
                          </button>
                        );
                      })}
                    </div>

                    <input
                      type="range"
                      min="7.0"
                      max="10.0"
                      step="0.5"
                      value={targetAverageGrade}
                      onChange={(e) => setTargetAverageGrade(Number(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-500">
                      <span>7.0 (Média Padrão)</span>
                      <span>8.5 (Currículo Competitivo R1)</span>
                      <span>10.0 (Gabarito)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4 (sign-up): e-mail & password used to log in */}
            {currentStep === 4 && signupMode && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20 mb-2">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Passo 4 de 4: Acesso ao Perfil</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Defina seu e-mail e senha
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Você usará estes dados na tela de <strong className="text-slate-200">Login de Usuário</strong> para acessar seu perfil em qualquer dispositivo.
                  </p>
                </div>

                {signupError && (
                  <div id="signup-error" className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs">
                    {signupError}
                  </div>
                )}

                <form
                  className="space-y-4"
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSignupFinish();
                  }}
                >
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      E-mail <span className="text-rose-400">*</span>
                    </label>
                    <input
                      id="signup-email"
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ex: mariana.costa@medicina.edu.br"
                      className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 transition-colors"
                      autoFocus
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Senha <span className="text-rose-400">*</span>
                      </label>
                      <input
                        id="signup-password"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1.5">
                        Confirmar senha <span className="text-rose-400">*</span>
                      </label>
                      <input
                        id="signup-password-confirm"
                        type={showPassword ? 'text' : 'password'}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a senha"
                        className="w-full rounded-2xl bg-slate-950 border border-slate-800 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-hidden focus:border-sky-500 transition-colors"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer select-none">
                    <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} />
                    Mostrar senha
                  </label>
                  {/* hidden submit so Enter creates the account */}
                  <button type="submit" className="hidden" aria-hidden="true" tabIndex={-1} />
                </form>
              </div>
            )}

            {/* Step 4: Inicialização - Sempre Painel Zerado Limpo */}
            {currentStep === 4 && !signupMode && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-400 text-xs font-bold border border-purple-500/20 mb-2">
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>Passo 4 de 4: Inicialização do Painel</span>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                    Painel 100% Zerado & Pronto para Usar
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Seu ambiente acadêmico será iniciado totalmente limpo para você cadastrar suas próprias matérias e notas.
                  </p>
                </div>

                <div className="p-6 rounded-3xl bg-slate-950 border border-slate-800 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-400 shrink-0 mt-0.5">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Ambiente Limpo e Estruturado</h4>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        Tudo pronto para você adicionar as disciplinas da sua faculdade, montar seus ciclos de repetição espaçada e registrar suas horas de estudo.
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-center text-xs">
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Matérias</div>
                      <div className="text-sm font-black text-slate-200 mt-0.5">0 Cadastradas</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Repetições</div>
                      <div className="text-sm font-black text-slate-200 mt-0.5">0 Tópicos</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">Provas</div>
                      <div className="text-sm font-black text-slate-200 mt-0.5">0 Agendadas</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800">
                      <div className="text-[10px] text-slate-500 font-bold uppercase">XP de Início</div>
                      <div className="text-sm font-black text-emerald-400 mt-0.5">+150 XP</div>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => prev - 1)}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span>Voltar</span>
                </button>
              ) : (
                <div />
              )}

              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep === 1) {
                      if (!name.trim()) {
                        showNotification('Por favor, informe seu Nome Completo (campo obrigatório).', 'warning');
                        return;
                      }
                      if (!signupMode && (!email.trim() || !email.includes('@'))) {
                        showNotification('Por favor, informe um E-mail Acadêmico válido (campo obrigatório).', 'warning');
                        return;
                      }
                    }
                    if (currentStep === 2) {
                      if (!university.trim()) {
                        showNotification('Por favor, informe sua Faculdade de Medicina (campo obrigatório).', 'warning');
                        return;
                      }
                    }
                    setCurrentStep((prev) => prev + 1);
                  }}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black shadow-lg shadow-sky-600/20 transition-colors cursor-pointer"
                >
                  <span>Próximo Passo</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  id="profile-finish-btn"
                  onClick={signupMode ? handleSignupFinish : handleFinish}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs sm:text-sm font-black shadow-xl shadow-sky-600/30 transition-all scale-100 hover:scale-102 cursor-pointer disabled:opacity-60 disabled:cursor-wait"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {signupMode
                      ? isSubmitting
                        ? 'Criando conta...'
                        : 'Criar Conta e Acessar'
                      : 'Concluir Perfil e Iniciar Painel Zerado'}
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Live Preview Card (Right Sidebar) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 backdrop-blur-md p-6 shadow-xl space-y-5">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-800">
                <ShieldCheck className="h-4 w-4 text-sky-400" />
                <span>Prévia do Crachá Médico</span>
              </div>

              {/* Student Identification Card */}
              <div className="flex items-center gap-3.5">
                <div className="relative">
                  <img
                    src={selectedAvatarUrl}
                    alt={name || 'Estudante'}
                    referrerPolicy="no-referrer"
                    className="h-16 w-16 rounded-2xl object-cover border-2 border-sky-500/50 shadow-md bg-slate-950"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-emerald-500 h-4 w-4 rounded-full border-2 border-slate-900" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-white truncate">
                    {name.trim() || 'Estudante de Medicina'}
                  </h3>
                  <p className="text-xs text-sky-400 truncate mt-0.5">
                    {university.trim() || 'Faculdade de Medicina'}
                  </p>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-1">
                    <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-slate-300 font-medium">
                      Nível 1
                    </span>
                    <span>• 0 XP Inicial</span>
                  </div>
                </div>
              </div>

              {/* Badges preview */}
              <div className="space-y-2.5 pt-3 border-t border-slate-800 text-xs">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-indigo-400" />
                    <span>Prova:</span>
                  </span>
                  <span className="font-bold text-slate-200 text-right truncate max-w-[150px]">
                    {targetExam || 'Não definida'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <HeartPulse className="h-3.5 w-3.5 text-rose-400" />
                    <span>Foco R1:</span>
                  </span>
                  <span className="font-bold text-slate-200 text-right truncate max-w-[150px]">
                    {dreamSpecialty || 'Não definida'}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5 text-sky-400" />
                    <span>Ciclo & Semestre:</span>
                  </span>
                  <span className="font-bold text-slate-200 truncate max-w-[170px] text-right">
                    {selectedSemesterNum}º Sem • {activeCycleConfig.title}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Meta Semanal:</span>
                  </span>
                  <span className="font-bold text-emerald-400">{weeklyTargetHours}h / semana</span>
                </div>

                <div className="flex items-center justify-between text-slate-400">
                  <span className="flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5 text-amber-400" />
                    <span>Média Alvo (CR):</span>
                  </span>
                  <span className="font-bold text-amber-400">{targetAverageGrade.toFixed(1)}</span>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-sky-950/30 border border-sky-900/40 text-[11px] text-sky-300 leading-relaxed">
                ✨ <strong>Recompensa de Boas-Vindas:</strong> Ao concluir seu perfil, você desbloqueará o <strong>Tutorial de Boas-Vindas</strong> e ganhará <strong>+150 XP</strong>.
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Footer Info */}
      <footer className="relative z-10 w-full max-w-6xl mx-auto px-6 py-4 text-center text-xs text-slate-500">
        MedAcademic Pro © 2026 • Plataforma de Estudos Médicos & Preparação para Residência Médica
      </footer>
    </div>
  );
};

