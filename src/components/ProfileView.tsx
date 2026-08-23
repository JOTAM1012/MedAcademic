import React, { useState, useRef } from 'react';
import {
  User,
  GraduationCap,
  Award,
  Flame,
  Target,
  Download,
  Upload,
  Sparkles,
  Save,
  Check,
  Trash2,
  AlertTriangle,
  X,
  FileCheck,
  Camera,
  Image as ImageIcon,
  Edit3,
  Cloud,
  CloudOff,
  Activity,
  Calendar,
  Clock,
  BookOpen,
  ArrowLeft,
  Users,
  Lock,
  ShieldCheck,
  LogOut,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { CARTOON_AVATARS } from '../data/avatars';

export const ProfileView: React.FC = () => {
  const { accounts, activeUser, openAuthModal, updateAccount, logout } = useAuth();
  const {
    userProfile,
    updateUserProfile,
    clearAllData,
    semesters,
    subjects,
    topics,
    exams,
    schedule,
    studySessions,
    achievements,
    medRevisions,
    showNotification,
  } = useApp();

  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(userProfile.name);
  const [email, setEmail] = useState(userProfile.email || '');
  const [university, setUniversity] = useState(userProfile.university);
  const [dreamSpecialty, setDreamSpecialty] = useState(userProfile.dreamSpecialty || '');
  const [targetExam, setTargetExam] = useState(userProfile.targetExam || '');
  const [weeklyTargetHours, setWeeklyTargetHours] = useState(userProfile.weeklyTargetHours || 30);
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatarUrl || CARTOON_AVATARS[0].url);
  const [isCustomPhoto, setIsCustomPhoto] = useState(
    !CARTOON_AVATARS.some((a) => a.url === (userProfile.avatarUrl || CARTOON_AVATARS[0].url))
  );
  const [googleSyncEnabled, setGoogleSyncEnabled] = useState(userProfile.googleSyncEnabled || false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const currentSemester = semesters.find((s) => s.id === userProfile.currentSemesterId) || semesters[0];
  const isInternato = currentSemester?.name?.toLowerCase().includes('internato') || false;

  // Sync state when userProfile updates
  React.useEffect(() => {
    setName(userProfile.name);
    setEmail(userProfile.email || '');
    setUniversity(userProfile.university);
    setDreamSpecialty(userProfile.dreamSpecialty || '');
    setTargetExam(userProfile.targetExam || '');
    setWeeklyTargetHours(userProfile.weeklyTargetHours || 30);
    setAvatarUrl(userProfile.avatarUrl || CARTOON_AVATARS[0].url);
  }, [userProfile]);

  // Clear / Wipe Modal state
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const avatarInputRef = useRef<HTMLInputElement | null>(null);

  const handleCustomPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        setAvatarUrl(dataUrl);
        setIsCustomPhoto(true);
        showNotification('Foto personalizada carregada!', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      showNotification('O campo Nome Completo é obrigatório.', 'warning');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      showNotification('O campo E-mail Acadêmico é obrigatório.', 'warning');
      return;
    }
    if (!university.trim()) {
      showNotification('O campo Faculdade de Medicina é obrigatório.', 'warning');
      return;
    }

    updateUserProfile({
      name: name.trim(),
      email: email.trim(),
      university: university.trim(),
      dreamSpecialty: dreamSpecialty.trim(),
      targetExam: targetExam.trim(),
      googleSyncEnabled,
      weeklyTargetHours: Number(weeklyTargetHours),
      avatarUrl,
    });
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      setIsEditing(false);
    }, 1200);
  };

  const toggleGoogleSync = () => {
    const newValue = !googleSyncEnabled;
    setGoogleSyncEnabled(newValue);
    updateUserProfile({ googleSyncEnabled: newValue });
    if (newValue) {
      showNotification('Sincronização com Google Cloud ativada!', 'success');
    } else {
      showNotification('Sincronização desativada.', 'info');
    }
  };

  const handleExportData = () => {
    const fullBackup = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      userProfile,
      semesters,
      subjects,
      topics,
      exams,
      schedule,
      studySessions,
      achievements,
      medRevisions,
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `medstudy-backup-completo-${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('Backup completo exportado com sucesso!', 'success');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string);
        if (!data.version || !data.userProfile) {
          throw new Error('Formato de backup inválido.');
        }
        showNotification('Para implementar importação de dados, seria necessário mesclar ou substituir o estado do contexto (simplificado por segurança no momento).', 'warning');
      } catch (err) {
        showNotification('Erro ao ler arquivo de backup. O arquivo pode estar corrompido.', 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmWipeAll = () => {
    clearAllData();
    setIsWipeModalOpen(false);
    setName('Estudante de Medicina');
    setUniversity('Faculdade de Medicina');
    setDreamSpecialty('');
    setTargetExam('');
    setWeeklyTargetHours(30);
  };

  // Metrics Calculation
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  const sessionsThisWeek = studySessions.filter((s) => new Date(s.timestamp) >= startOfWeek);
  const sessionsThisMonth = studySessions.filter((s) => new Date(s.timestamp) >= startOfMonth);
  const sessionsThisYear = studySessions.filter((s) => new Date(s.timestamp) >= startOfYear);

  const hoursThisWeek = (sessionsThisWeek.reduce((acc, s) => acc + s.durationMinutes, 0) / 60).toFixed(1);
  const hoursThisMonth = (sessionsThisMonth.reduce((acc, s) => acc + s.durationMinutes, 0) / 60).toFixed(1);
  const hoursThisYear = (sessionsThisYear.reduce((acc, s) => acc + s.durationMinutes, 0) / 60).toFixed(1);

  // Estimates for "questões" based on sessions, and "revisões"
  const revisionsThisWeek = sessionsThisWeek.filter((s) => s.type === 'spaced_repetition').length;
  const questionsThisWeek = sessionsThisWeek.length * 12; // estimated ~12 questions per general session

  return (
    <div className="space-y-6 pb-12 max-w-4xl mx-auto">
      {/* Hidden file input for import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            {isEditing ? 'Editar Perfil' : 'Seu Perfil Médico'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {isEditing 
              ? 'Ajuste seus dados pessoais e metas.' 
              : 'Acompanhe seu progresso, metas e estatísticas.'}
          </p>
        </div>
        {!isEditing ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsEditing(true)}
              className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
            >
              <Edit3 className="h-4 w-4" />
              <span>Editar Perfil</span>
            </button>
            <button
              id="profile-logout-btn"
              onClick={logout}
              className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-600 dark:text-rose-400 font-bold text-xs border border-rose-200 dark:border-rose-900/50 shadow-xs transition-colors cursor-pointer"
              title="Sair da Conta (Logout)"
            >
              <LogOut className="h-4 w-4" />
              <span>Sair da Conta</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => setIsEditing(false)}
            className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar ao Perfil</span>
          </button>
        )}
      </div>

      {!isEditing ? (
        // --- DASHBOARD VIEW ---
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-200">
          
          {/* Identity & Main Info Card */}
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col md:flex-row items-center gap-6 p-6">
            <div className="shrink-0 w-24 h-24 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-md">
              <img src={userProfile.avatarUrl || CARTOON_AVATARS[0].url} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="text-center md:text-left flex-1">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{userProfile.name}</h2>
              <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-slate-600 dark:text-slate-400 font-medium">
                <GraduationCap className="h-4 w-4" />
                <span>{userProfile.university}</span>
              </div>
              
              <div className="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-3">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-100 dark:border-indigo-900/50">
                  <GraduationCap className="h-4 w-4" />
                  <span>{currentSemester?.name || 'Ciclo Médico'}</span>
                </div>
                {isInternato && userProfile.targetExam && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 text-xs font-bold border border-sky-100 dark:border-sky-900/50">
                    <Target className="h-4 w-4" />
                    <span>Prova: {userProfile.targetExam}</span>
                  </div>
                )}
                {isInternato && userProfile.dreamSpecialty && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold border border-emerald-100 dark:border-emerald-900/50">
                    <Award className="h-4 w-4" />
                    <span>Esp: {userProfile.dreamSpecialty}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Google Sync Card */}
            <div className="lg:col-span-1 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex flex-col justify-between relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <Cloud className="h-24 w-24 text-sky-500" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-2">
                  <Cloud className="h-5 w-5 text-sky-500" />
                  Google Cloud Sync
                  <span className="text-[10px] bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 px-2 py-0.5 rounded-full uppercase font-bold">
                    Sempre Ativo
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed">
                  Sincronização contínua via Firebase Firestore ativada automaticamente. Suas matérias, revisões espaçadas, notas e métricas são salvas na nuvem em tempo real.
                </p>
              </div>
              <div className="w-full py-3 rounded-xl text-xs font-black shadow-xs flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-400">
                <Check className="h-4 w-4 text-emerald-500" />
                <span>Sincronização em Tempo Real Ativa</span>
              </div>
            </div>

            {/* Study Metrics */}
            <div className="lg:col-span-2 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Clock className="h-5 w-5 text-indigo-500" />
                Métricas de Estudo
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Na Semana</div>
                  <div className="flex items-end gap-1.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{hoursThisWeek}</span>
                    <span className="text-sm font-semibold text-slate-500 pb-0.5">horas</span>
                  </div>
                  <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
                    <div 
                      className="bg-indigo-500 h-full rounded-full transition-all" 
                      style={{ width: `${Math.min((Number(hoursThisWeek) / userProfile.weeklyTargetHours) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1.5 text-right font-medium">Meta: {userProfile.weeklyTargetHours}h</div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">No Mês</div>
                  <div className="flex items-end gap-1.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{hoursThisMonth}</span>
                    <span className="text-sm font-semibold text-slate-500 pb-0.5">horas</span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">No Ano</div>
                  <div className="flex items-end gap-1.5">
                    <span className="text-2xl font-black text-slate-900 dark:text-white">{hoursThisYear}</span>
                    <span className="text-sm font-semibold text-slate-500 pb-0.5">horas</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
             {/* Weekly Questions */}
             <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex items-center gap-4">
               <div className="h-12 w-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center shrink-0">
                 <FileCheck className="h-6 w-6" />
               </div>
               <div>
                 <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Questões na Semana</div>
                 <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{questionsThisWeek}</div>
               </div>
             </div>

             {/* Reviews Done */}
             <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs flex items-center gap-4">
               <div className="h-12 w-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
                 <BookOpen className="h-6 w-6" />
               </div>
               <div>
                 <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Revisões (Semana)</div>
                 <div className="text-xl font-black text-slate-900 dark:text-white mt-0.5">{revisionsThisWeek}</div>
               </div>
             </div>
          </div>

        </div>
      ) : (
        // --- EDIT FORM VIEW ---
        <div className="animate-in slide-in-from-right-4 fade-in duration-200">
          <form onSubmit={handleSave} className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 sm:p-8 shadow-xs space-y-8">
            {/* 1. Identidade e Avatar */}
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <User className="h-5 w-5 text-sky-500" />
                1. Identidade e Foto
              </h2>
              
              <div className="flex flex-col sm:flex-row items-start gap-6">
                <div className="w-full sm:w-auto">
                  <div className="relative w-28 h-28 mx-auto sm:mx-0 rounded-3xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shadow-sm group">
                    <img
                      src={avatarUrl}
                      alt="Avatar atual"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        type="button"
                        onClick={() => avatarInputRef.current?.click()}
                        className="p-2 rounded-full bg-white/20 hover:bg-white/40 text-white backdrop-blur-xs transition-colors cursor-pointer"
                        title="Alterar foto"
                      >
                        <Camera className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="file"
                    ref={avatarInputRef}
                    onChange={handleCustomPhotoChange}
                    accept="image/*"
                    className="hidden"
                  />
                  <p className="text-[10px] text-center text-slate-500 mt-2">Clique na foto para alterar</p>
                </div>

                <div className="flex-1 space-y-4 w-full">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                        <span>Nome Completo</span>
                        <span className="text-[10px] text-rose-500 font-extrabold uppercase">* Obrigatório</span>
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                        <span>E-mail Acadêmico</span>
                        <span className="text-[10px] text-rose-500 font-extrabold uppercase">* Obrigatório</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ex: mariana@med.ufmg.br"
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    {CARTOON_AVATARS.map((avatar) => (
                      <button
                        key={avatar.id}
                        type="button"
                        onClick={() => {
                          setAvatarUrl(avatar.url);
                          setIsCustomPhoto(false);
                        }}
                        className={`p-1.5 rounded-xl border-2 transition-all cursor-pointer ${
                          avatarUrl === avatar.url && !isCustomPhoto
                            ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30'
                            : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title={avatar.label}
                      >
                        <img src={avatar.url} alt={avatar.label} className="w-full aspect-square object-cover rounded-lg" />
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => avatarInputRef.current?.click()}
                      className={`flex flex-col items-center justify-center gap-1 p-1.5 rounded-xl border-2 border-dashed transition-all cursor-pointer ${
                        isCustomPhoto
                          ? 'border-sky-500 bg-sky-50 dark:bg-sky-900/30 text-sky-600'
                          : 'border-slate-300 dark:border-slate-700 text-slate-500 hover:border-sky-400 hover:text-sky-500'
                      }`}
                    >
                      <ImageIcon className="h-5 w-5" />
                      <span className="text-[9px] font-bold">Custom</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-800" />

            {/* 2. Objetivos e Instituição */}
            <div>
              <h2 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 mb-4">
                <Target className="h-5 w-5 text-sky-500" />
                2. Objetivos e Instituição
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                    <span>Universidade / Faculdade de Medicina</span>
                    <span className="text-[10px] text-rose-500 font-extrabold uppercase">* Obrigatório</span>
                  </label>
                  <input
                    type="text"
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
                  />
                </div>
                
                {isInternato && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                        <span>Prova de Acesso Direto (Meta R1 / Revalida)</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Opcional</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: ENARE, USP-SP, UNIFESP"
                        value={targetExam}
                        onChange={(e) => setTargetExam(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center justify-between">
                        <span>Especialidade dos Sonhos (R1)</span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Opcional</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ex: Cardiologia, Neurocirurgia"
                        value={dreamSpecialty}
                        onChange={(e) => setDreamSpecialty(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-sky-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Meta Semanal de Estudos: <span className="font-bold text-sky-600">{weeklyTargetHours} horas</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="60"
                    step="5"
                    value={weeklyTargetHours}
                    onChange={(e) => setWeeklyTargetHours(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-600 mt-2"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 border-t border-slate-100 dark:border-slate-800">
              <div className="w-full sm:w-auto text-center sm:text-left">
                {savedSuccess && (
                  <span className="text-xs font-bold text-emerald-600 flex items-center justify-center sm:justify-start gap-1">
                    <Check className="h-4 w-4" /> Alterações salvas com sucesso!
                  </span>
                )}
              </div>
              <div className="w-full sm:w-auto flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-600 dark:text-slate-400 font-bold text-xs hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>Salvar Perfil</span>
                </button>
              </div>
            </div>
          </form>

          <div className="mt-8 space-y-6">
            {/* Backup and Storage Utilities */}
            <div className="rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white pb-2 border-b border-slate-100 dark:border-slate-800">
                Backup & Exportação
              </h3>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Exportar Backup Completo (JSON)</div>
                  <div className="text-[11px] text-slate-500">Faça download de todas as matérias, notas, aulas e progresso.</div>
                </div>
                <button
                  type="button"
                  onClick={handleExportData}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Download className="h-4 w-4" />
                  <span>Exportar Dados</span>
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Importar Backup JSON</div>
                  <div className="text-[11px] text-slate-500">Restaure seus dados a partir de um arquivo .json salvo anteriormente.</div>
                </div>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Upload className="h-4 w-4" />
                  <span>Importar Arquivo</span>
                </button>
              </div>
            </div>

            {/* Danger Zone: Zerar Tudo */}
            <div className="rounded-3xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 p-6 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-rose-200/60 dark:border-rose-900/40">
                <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                <h3 className="text-sm font-bold text-rose-900 dark:text-rose-300">
                  Zona de Limpeza de Dados
                </h3>
              </div>
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60">
                <div>
                  <div className="text-xs font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Zerar Tudo do Site (Limpar do Zero)</span>
                  </div>
                  <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Apaga 100% das matérias, tópicos, provas, notas, aulas na grade, sessões e reseta o XP e streak para zero.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsWipeModalOpen(true)}
                  className="shrink-0 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                  <span>Zerar Tudo do Site</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Zerar Tudo do Site */}
      {isWipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">Zerar Tudo do Site?</h4>
                  <p className="text-[11px] text-rose-600 font-medium">Ação irreversível</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsWipeModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            
            <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed bg-rose-50/50 dark:bg-rose-950/30 p-3.5 rounded-2xl border border-rose-100 dark:border-rose-900/40">
              <p className="font-semibold text-rose-900 dark:text-rose-300 mb-1">Você está prestes a apagar:</p>
              <ul className="list-disc list-inside space-y-0.5 text-[11px] text-slate-600 dark:text-slate-400">
                <li>Todas as disciplinas, matérias e tópicos</li>
                <li>Todas as notas e datas de provas/exames</li>
                <li>Todos os ciclos de repetição espaçada</li>
                <li>Aulas cadastradas na grade de horários</li>
                <li>Histórico de sessões de estudo Pomodoro</li>
                <li>Seu Streak de dias e pontos de XP (zerados)</li>
              </ul>
            </div>
            
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsWipeModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmWipeAll}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black shadow-xs transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
                <span>Sim, Zerar Tudo Agora</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
