// Senha: campo com olhinho, "Esqueci minha senha" (login), nova senha pelo link do e-mail e "Trocar senha" (perfil).
// A senha nunca é guardada de um jeito que dê para ler: dá para trocar, não para ver a antiga.
import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, Eye, EyeOff, KeyRound, Lock, Mail } from 'lucide-react';
import { useAuth, isLocalOnly } from '../../context/AuthContext';
import { useApp } from '../../context/AppContext';
import IconSwap from '../shared/IconSwap';

const inputCls =
  'w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500/60 focus:border-sky-500/60';

/** Campo de senha com o olhinho para mostrar o que está sendo digitado */
export const PasswordField: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
}> = ({ id, label, value, onChange, autoComplete = 'new-password', placeholder, className }) => {
  const [show, setShow] = useState(false);
  return (
    <label htmlFor={id} className="block">
      <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">{label}</span>
      <span className="relative block">
        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <input
          id={id}
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          className={className || inputCls}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-label={show ? 'Esconder senha' : 'Mostrar senha'}
          aria-pressed={show}
          className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 grid place-items-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        >
          <IconSwap swapped={show} from={<Eye className="h-4 w-4" />} to={<EyeOff className="h-4 w-4" />} />
        </button>
      </span>
    </label>
  );
};

const Msg: React.FC<{ kind: 'ok' | 'err'; text: string; id?: string }> = ({ kind, text, id }) => (
  <p
    id={id}
    role={kind === 'err' ? 'alert' : 'status'}
    className={`p-2.5 rounded-xl text-xs flex items-start gap-2 border ${
      kind === 'ok'
        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
    }`}
  >
    {kind === 'ok' ? <CheckCircle2 className="h-4 w-4 shrink-0 mt-px" /> : <AlertCircle className="h-4 w-4 shrink-0 mt-px" />}
    <span>{text}</span>
  </p>
);

/** Login: "Esqueci minha senha" — manda o link para criar uma nova senha */
export const ForgotPasswordPanel: React.FC<{ initialEmail?: string; onBack: () => void; inputClassName?: string }> = ({ initialEmail = '', onBack, inputClassName }) => {
  const { requestPasswordReset } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const res = await requestPasswordReset(email);
    setBusy(false);
    setMsg(
      res.success
        ? { kind: 'ok', text: 'Pronto! Se este e-mail tiver conta, chega um link para criar uma nova senha. Olhe também a caixa de spam.' }
        : { kind: 'err', text: res.error || 'Não deu para enviar agora. Tente de novo.' }
    );
  };
  return (
    <form id="auth-forgot-panel" onSubmit={submit} className="space-y-3 max-w-md mx-auto py-2">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-sky-500/10 ring-1 ring-inset ring-sky-400/25 text-sky-600 dark:text-sky-300 flex items-center justify-center mx-auto mb-2">
          <KeyRound className="h-6 w-6" />
        </div>
        <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">Esqueci minha senha</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">Digite o e-mail da conta. Mandamos um link para você criar uma senha nova.</p>
      </div>
      {isLocalOnly && <Msg kind="err" text="No modo local não há envio de e-mail." />}
      <label className="block">
        <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">E-mail da conta</span>
        <span className="relative block">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            id="auth-forgot-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="ex: user@med.com"
            className={inputClassName || inputCls.replace('pr-10', 'pr-3')}
          />
        </span>
      </label>
      {msg && <Msg id="auth-forgot-msg" kind={msg.kind} text={msg.text} />}
      <button type="submit" id="auth-forgot-send" disabled={busy} className="auth-btn-primary w-full py-2.5 rounded-xl text-white text-xs font-bold disabled:opacity-60">
        {busy ? 'Enviando…' : 'Enviar link para criar nova senha'}
      </button>
      <button type="button" id="auth-forgot-back" onClick={onBack} className="w-full py-2 text-xs font-bold text-sky-700 dark:text-sky-300 hover:underline">
        Voltar para o login
      </button>
    </form>
  );
};

/** Abriu pelo link do e-mail: cria a nova senha (por cima do app) */
export const PasswordRecoveryModal: React.FC = () => {
  const { isPasswordRecovery, completePasswordRecovery, cancelPasswordRecovery } = useAuth();
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  if (!isPasswordRecovery) return null;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return setMsg({ kind: 'err', text: 'As duas senhas não são iguais.' });
    setBusy(true);
    const res = await completePasswordRecovery(pw);
    setBusy(false);
    if (!res.success) setMsg({ kind: 'err', text: res.error || 'Não deu para salvar. Tente de novo.' });
  };
  return (
    <div className="app-modal fixed inset-0 z-[95] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <form
        id="password-recovery-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="password-recovery-title"
        onSubmit={submit}
        className="app-modal-panel w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 space-y-3 shadow-2xl"
      >
        <h2 id="password-recovery-title" className="text-base font-black text-slate-900 dark:text-white flex items-center gap-2">
          <KeyRound className="h-5 w-5 text-sky-600 dark:text-sky-400" /> Crie sua nova senha
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">Use pelo menos 6 caracteres. Depois é só entrar com ela.</p>
        <PasswordField id="recovery-new" label="Nova senha" value={pw} onChange={setPw} />
        <PasswordField id="recovery-confirm" label="Repita a nova senha" value={pw2} onChange={setPw2} />
        {msg && <Msg kind={msg.kind} text={msg.text} />}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={cancelPasswordRecovery} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800">
            Agora não
          </button>
          <button type="submit" id="recovery-save" disabled={busy} className="flex-1 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black disabled:opacity-60">
            {busy ? 'Salvando…' : 'Salvar nova senha'}
          </button>
        </div>
      </form>
    </div>
  );
};

/** Perfil: e-mail da conta e "Trocar senha" (confere a senha atual) */
export const AccountPasswordCard: React.FC = () => {
  const { activeUser, activeUserId, changePassword } = useAuth();
  const { showNotification } = useApp();
  const [open, setOpen] = useState(false);
  const [cur, setCur] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const email = activeUser?.email || activeUserId || '';
  const reset = () => {
    setCur('');
    setPw('');
    setPw2('');
    setErr(null);
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw !== pw2) return setErr('As duas senhas novas não são iguais.');
    setBusy(true);
    setErr(null);
    const res = await changePassword(cur, pw);
    setBusy(false);
    if (!res.success) return setErr(res.error || 'Não deu para trocar a senha.');
    showNotification('Senha trocada! Use a nova no próximo login.', 'success');
    reset();
    setOpen(false);
  };
  return (
    <section id="profile-account-card" className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-4 sm:p-5 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-sky-600 dark:text-sky-400" /> Conta e senha
          </h3>
          <p className="text-[12px] text-slate-500 dark:text-slate-400 mt-0.5">
            E-mail de acesso: <strong id="profile-account-email" className="text-slate-800 dark:text-slate-200 break-all">{email || '—'}</strong>
          </p>
        </div>
        {!open && (
          <button type="button" id="profile-change-password-btn" onClick={() => setOpen(true)} className="shrink-0 min-h-[40px] px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black">
            Trocar senha
          </button>
        )}
      </div>
      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Por segurança, a senha não fica guardada de um jeito que dê para mostrar. Se esqueceu, use "Esqueci minha senha" na tela de login, ou troque aqui.
      </p>
      {open && (
        <form id="profile-change-password" onSubmit={submit} className="grid gap-3 sm:grid-cols-3">
          <PasswordField id="profile-pw-current" label="Senha atual" value={cur} onChange={setCur} autoComplete="current-password" />
          <PasswordField id="profile-pw-new" label="Nova senha" value={pw} onChange={setPw} />
          <PasswordField id="profile-pw-confirm" label="Repita a nova senha" value={pw2} onChange={setPw2} />
          {err && (
            <div className="sm:col-span-3">
              <Msg id="profile-pw-error" kind="err" text={err} />
            </div>
          )}
          <div className="sm:col-span-3 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => {
                reset();
                setOpen(false);
              }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancelar
            </button>
            <button type="submit" id="profile-pw-save" disabled={busy} className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-black disabled:opacity-60">
              {busy ? 'Salvando…' : 'Salvar nova senha'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
};
