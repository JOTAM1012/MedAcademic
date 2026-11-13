import IconSwap from './shared/IconSwap';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Crown,
  Users,
  UserPlus,
  Activity,
  FileCheck,
  Clock,
  ShieldAlert,
  Search,
  Ban,
  CheckCircle2,
  Trash2,
  Megaphone,
  Plus,
  Eye,
  EyeOff,
  Wrench,
  RefreshCw,
  Infinity as InfinityIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAccess } from '../context/AccessContext';
import { useApp } from '../context/AppContext';
import type { Announcement } from './AnnouncementBanner';
import { OnAirSign } from './OnAirSign';

interface AdminUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  last_activity: string | null;
  name: string | null;
  university: string | null;
  level: number | null;
  questions: number;
  correct: number;
  study_minutes: number;
  blocked: boolean;
  block_reason: string | null;
  role: string | null;
  plan: string;
  lifetime: boolean;
}

interface Stats {
  total_users: number;
  new_7d: number;
  new_30d: number;
  active_7d: number;
  active_today: number;
  blocked: number;
  questions: number;
  study_minutes: number;
  signups_by_week: Array<{ week: string; n: number }>;
}

const fmtDate = (s?: string | null) => (s ? new Date(s).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—');
const ago = (s?: string | null) => {
  if (!s) return 'nunca';
  const d = Math.floor((Date.now() - new Date(s).getTime()) / 86400000);
  return d <= 0 ? 'hoje' : d === 1 ? 'ontem' : `há ${d} dias`;
};

type Tab = 'stats' | 'users' | 'announcements' | 'site';

// Painel do Dono: estatísticas, usuários (bloquear/excluir), avisos e manutenção
export const OwnerPanelView: React.FC = () => {
  const access = useAccess();
  const { showNotification } = useApp();
  const [tab, setTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newTone, setNewTone] = useState<Announcement['tone']>('info');
  const [maintMsg, setMaintMsg] = useState(access.maintenanceMessage || '');

  const load = useCallback(async () => {
    if (!supabase || !access.isAdmin) return;
    setLoading(true);
    const [s, u, a] = await Promise.all([
      supabase.rpc('admin_stats'),
      supabase.rpc('admin_list_users'),
      supabase.from('announcements').select('id,title,body,tone,active,created_at').order('created_at', { ascending: false }),
    ]);
    if (s.data) setStats(s.data as Stats);
    if (u.data) setUsers(u.data as AdminUser[]);
    if (a.data) setAnnouncements(a.data as Announcement[]);
    if (s.error || u.error) showNotification('Não foi possível carregar o painel. Tente de novo.', 'warning');
    setLoading(false);
  }, [access.isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => !q || u.email.toLowerCase().includes(q) || (u.name || '').toLowerCase().includes(q) || (u.university || '').toLowerCase().includes(q));
  }, [users, search]);

  if (!access.isAdmin) {
    return (
      <div className="p-10 text-center text-sm text-slate-500">
        <ShieldAlert className="h-8 w-8 mx-auto mb-2 text-slate-400" />
        Área restrita ao Dono do site.
      </div>
    );
  }

  const setBlocked = async (u: AdminUser, block: boolean) => {
    let reason: string | null = null;
    if (block) {
      const r = window.prompt(`Suspender ${u.email}? Motivo (aparece para o usuário, opcional):`, '');
      if (r === null) return;
      reason = r.trim() || null;
    } else if (!window.confirm(`Reativar a conta de ${u.email}?`)) return;
    const { error } = await supabase!.rpc('admin_set_blocked', { target: u.id, should_block: block, why: reason });
    if (error) return showNotification(error.message, 'warning');
    showNotification(block ? 'Conta suspensa.' : 'Conta reativada.', 'success');
    load();
  };

  const removeUser = async (u: AdminUser) => {
    const typed = window.prompt(`EXCLUIR a conta ${u.email} e todos os dados de estudo dela? Isso não pode ser desfeito.\n\nDigite o e-mail para confirmar:`);
    if (typed === null) return;
    if (typed.trim().toLowerCase() !== u.email.toLowerCase()) return showNotification('E-mail não confere. Nada foi excluído.', 'warning');
    const { error } = await supabase!.rpc('admin_delete_user', { target: u.id });
    if (error) return showNotification(error.message, 'warning');
    showNotification('Conta excluída.', 'success');
    load();
  };

  const publish = async () => {
    if (!newTitle.trim()) return;
    const { error } = await supabase!.from('announcements').insert({ title: newTitle.trim(), body: newBody.trim(), tone: newTone });
    if (error) return showNotification(error.message, 'warning');
    setNewTitle('');
    setNewBody('');
    showNotification('Aviso publicado para todos os usuários.', 'success');
    load();
  };
  const toggleAnn = async (a: Announcement) => {
    const { error } = await supabase!.from('announcements').update({ active: !a.active }).eq('id', a.id);
    if (error) return showNotification(error.message, 'warning');
    load();
  };
  const deleteAnn = async (a: Announcement) => {
    if (!window.confirm(`Apagar o aviso "${a.title}"?`)) return;
    const { error } = await supabase!.from('announcements').delete().eq('id', a.id);
    if (error) return showNotification(error.message, 'warning');
    load();
  };

  const setMaintenance = async (on: boolean) => {
    if (on && !window.confirm('Ativar o modo manutenção? Todos os usuários (menos você) verão a tela de manutenção até você desativar.')) return;
    const { error } = await supabase!.rpc('admin_set_maintenance', { on_off: on, msg: maintMsg.trim() || null });
    if (error) return showNotification(error.message, 'warning');
    await access.refresh();
    showNotification(on ? 'Modo manutenção ATIVADO.' : 'Modo manutenção desativado.', on ? 'warning' : 'success');
  };

  // Últimas 8 semanas completas (semanas sem cadastro = 0), começando na segunda-feira
  const weeks = (() => {
    const counts = new Map<string, number>((stats?.signups_by_week || []).map((w) => [String(w.week).slice(0, 10), Number(w.n)] as [string, number]));
    const now = new Date();
    const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    return Array.from({ length: 8 }, (_, i) => {
      const d = new Date(monday);
      d.setDate(d.getDate() - (7 - i) * 7 + 7);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { key, label: key.slice(8, 10) + '/' + key.slice(5, 7), n: counts.get(key) || 0, current: i === 7 };
    });
  })();
  const maxWeek = Math.max(1, ...weeks.map((w) => w.n));
  const weeksTotal = weeks.reduce((a, w) => a + w.n, 0);
  const card = 'rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4';

  return (
    <div id="owner-panel" className="space-y-5 pb-12">
      {/* Cabeçalho (minimalista): coroa, título, status do site e atualizar */}
      <div className="flex items-center justify-between gap-3 pb-4 border-b border-amber-400/20">
        <div className="flex items-center gap-3 min-w-0">
          <span className="h-10 w-10 shrink-0 rounded-xl bg-amber-400/15 text-amber-500 dark:text-amber-300 grid place-items-center">
            <Crown className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h1 className="text-lg font-black owner-gold-name leading-tight">Painel do Dono</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
              {access.lifetime && <InfinityIcon className="h-3.5 w-3.5 text-amber-500 dark:text-amber-300 shrink-0" />}
              {access.isOwner ? 'Dono do MedAcademic' : 'Equipe MedAcademic'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            id="owner-site-status"
            onClick={() => setTab('site')}
            title={access.maintenance ? 'Site em manutenção. Toque para ver.' : 'Site no ar. Toque para ver.'}
            className={`min-h-[36px] inline-flex items-center gap-1.5 px-3 rounded-full text-xs font-black border ${
              access.maintenance
                ? 'border-amber-500/40 bg-amber-500/10 text-amber-600 dark:text-amber-300'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-300'
            }`}
          >
            <span className={`h-2 w-2 rounded-full ${access.maintenance ? 'bg-amber-500' : 'bg-rose-500 animate-pulse'}`} />
            {access.maintenance ? 'Manutenção' : 'No ar'}
          </button>
          <button
            type="button"
            onClick={load}
            aria-label="Atualizar"
            title="Atualizar"
            className="h-9 w-9 grid place-items-center rounded-full text-slate-500 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Abas */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {(
          [
            ['stats', 'Estatísticas', Activity],
            ['users', `Usuários (${users.length})`, Users],
            ['announcements', 'Avisos', Megaphone],
            ['site', 'Site', Wrench],
          ] as Array<[Tab, string, React.ElementType]>
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            id={`owner-tab-${id}`}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap ${
              tab === id ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
            }`}
          >
            <Icon className="h-3.5 w-3.5" /> {label}
          </button>
        ))}
      </div>

      {tab === 'stats' && !stats && !loading && (
        <div className={`${card} text-center text-xs text-slate-500`}>Não foi possível carregar as estatísticas agora. Verifique a conexão e toque em Atualizar.</div>
      )}

      {tab === 'stats' && stats && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { icon: Users, label: 'Usuários', value: stats.total_users, sub: `${stats.blocked} suspensos`, color: 'text-sky-500' },
              { icon: UserPlus, label: 'Novos (7 dias)', value: stats.new_7d, sub: `${stats.new_30d} em 30 dias`, color: 'text-emerald-500' },
              { icon: Activity, label: 'Ativos (7 dias)', value: stats.active_7d, sub: `${stats.active_today} nas últimas 24h`, color: 'text-violet-500' },
              { icon: FileCheck, label: 'Questões feitas', value: stats.questions, sub: `${Math.round(stats.study_minutes / 60)}h de estudo no total`, color: 'text-amber-500' },
            ].map((c) => (
              <div key={c.label} className={card}>
                <c.icon className={`h-5 w-5 ${c.color}`} />
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{c.value.toLocaleString('pt-BR')}</div>
                <div className="text-xs font-bold text-slate-500">{c.label}</div>
                <div className="text-[11px] text-slate-400 mt-0.5">{c.sub}</div>
              </div>
            ))}
          </div>
          <div className={card}>
            <div className="flex items-baseline justify-between gap-2 mb-4">
              <p className="text-xs font-black uppercase tracking-wider text-slate-500">Cadastros por semana</p>
              <p className="text-xs text-slate-500">
                <strong className="text-slate-900 dark:text-white text-base">{weeksTotal}</strong> nas últimas 8 semanas
              </p>
            </div>
            <div id="owner-signups-chart" className="relative">
              {/* linhas de referência */}
              <div className="absolute inset-x-0 top-0 h-36 flex flex-col justify-between pointer-events-none">
                {[maxWeek, Math.round(maxWeek / 2), 0].map((v, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="w-4 text-right text-[9px] text-slate-400">{v}</span>
                    <div className="flex-1 border-t border-dashed border-slate-200 dark:border-slate-800" />
                  </div>
                ))}
              </div>
              <div className="relative h-36 pl-6 flex items-end gap-1.5 sm:gap-3">
                {weeks.map((w) => (
                  <div key={w.key} className="flex-1 h-full flex flex-col justify-end items-center min-w-0 group" title={`Semana de ${w.label}: ${w.n} cadastro${w.n === 1 ? '' : 's'}`}>
                    <span className={`text-[11px] font-black mb-1 ${w.n ? 'text-slate-800 dark:text-white' : 'text-slate-400'}`}>{w.n}</span>
                    <div
                      className={`w-full max-w-12 rounded-t-lg transition-all ${
                        w.n
                          ? 'bg-gradient-to-t from-amber-600 to-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.35)] group-hover:from-amber-500 group-hover:to-amber-200'
                          : 'bg-slate-200 dark:bg-slate-800'
                      }`}
                      style={{ height: w.n ? `${Math.max(8, (w.n / maxWeek) * 112)}px` : '3px' }}
                    />
                  </div>
                ))}
              </div>
              <div className="pl-6 mt-1.5 flex gap-1.5 sm:gap-3">
                {weeks.map((w) => (
                  <span key={w.key} className={`flex-1 text-center text-[9px] sm:text-[10px] truncate ${w.current ? 'font-black text-amber-500' : 'text-slate-400'}`}>
                    {w.current ? 'Esta' : w.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail ou faculdade…"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-9 pr-3 py-2.5 text-sm"
            />
          </div>
          <div className="space-y-2">
            {filtered.map((u) => {
              const pct = u.questions ? Math.round((u.correct / u.questions) * 100) : null;
              const isStaff = !!u.role;
              return (
                <div key={u.id} className={`${card} ${u.blocked ? 'border-rose-400/50 bg-rose-50/40 dark:bg-rose-950/20' : ''}`}>
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-black truncate ${u.role === 'owner' ? 'owner-gold-name' : 'text-slate-900 dark:text-white'}`}>
                                                    {u.name || 'Sem nome'}
                        </span>
                        {u.role && (
                          <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md border ${u.role === 'owner' ? 'owner-gold-badge' : 'bg-violet-500/15 text-violet-300 border-violet-500/40'}`}>
                            {u.role === 'owner' ? <Crown className="h-3 w-3" aria-label="Dono" /> : 'Moderador'}
                          </span>
                        )}
                        {u.lifetime && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-300 border border-amber-500/30">Vitalício</span>}
                        {u.blocked && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-md bg-rose-600 text-white">Suspenso</span>}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{u.email}{u.university ? ` · ${u.university.toUpperCase()}` : ''}</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Cadastro {fmtDate(u.created_at)} · último acesso {ago(u.last_sign_in_at)} · ativo {ago(u.last_activity)}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-3">
                        <span className="flex items-center gap-1"><FileCheck className="h-3 w-3" /> {u.questions} questões{pct !== null ? ` (${pct}%)` : ''}</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {Math.round(u.study_minutes / 6) / 10}h</span>
                      </p>
                      {u.blocked && u.block_reason && <p className="text-[11px] text-rose-500 mt-0.5">Motivo: {u.block_reason}</p>}
                    </div>
                    {!isStaff && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setBlocked(u, !u.blocked)}
                          className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold ${
                            u.blocked ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300' : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                          }`}
                        >
                          <IconSwap swapped={u.blocked} from={<Ban className="h-3.5 w-3.5" />} to={<CheckCircle2 className="h-3.5 w-3.5" />} />
                          {u.blocked ? 'Reativar' : 'Suspender'}
                        </button>
                        {access.isOwner && (
                          <button onClick={() => removeUser(u)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-600 dark:text-rose-300">
                            <Trash2 className="h-3.5 w-3.5" /> Excluir
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Nenhum usuário encontrado.</p>}
          </div>
        </div>
      )}

      {tab === 'announcements' && (
        <div className="space-y-4">
          <div className={`${card} space-y-2.5`}>
            <p className="text-xs font-black uppercase tracking-wider text-slate-500">Novo aviso para todos</p>
            <input
              id="owner-ann-title"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={120}
              placeholder="Título (ex.: Nova função no Planner! 🎉)"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm font-bold"
            />
            <textarea
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
              maxLength={2000}
              rows={3}
              placeholder="Mensagem (opcional)"
              className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
            />
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex gap-1.5">
                {(
                  [
                    ['info', 'Info', 'bg-sky-500'],
                    ['success', 'Novidade', 'bg-emerald-500'],
                    ['warning', 'Atenção', 'bg-amber-500'],
                  ] as const
                ).map(([id, label, dot]) => (
                  <button
                    key={id}
                    onClick={() => setNewTone(id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${newTone === id ? 'border-slate-400 bg-slate-100 dark:bg-slate-800' : 'border-transparent text-slate-500'}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${dot}`} /> {label}
                  </button>
                ))}
              </div>
              <button id="owner-ann-publish" onClick={publish} disabled={!newTitle.trim()} className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 text-xs font-black">
                <Plus className="h-3.5 w-3.5" /> Publicar
              </button>
            </div>
          </div>
          <div className="space-y-2">
            {announcements.map((a) => (
              <div key={a.id} className={`${card} flex items-start justify-between gap-3 ${a.active ? '' : 'opacity-55'}`}>
                <div className="min-w-0">
                  <p className="text-sm font-black text-slate-900 dark:text-white">{a.title}</p>
                  {a.body && <p className="text-xs text-slate-500 whitespace-pre-line mt-0.5">{a.body}</p>}
                  <p className="text-[10px] text-slate-400 mt-1">{fmtDate(a.created_at)} · {a.active ? 'visível para todos' : 'oculto'}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => toggleAnn(a)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500" title={a.active ? 'Ocultar' : 'Mostrar'}>
                    <IconSwap swapped={a.active} from={<Eye className="h-4 w-4" />} to={<EyeOff className="h-4 w-4" />} />
                  </button>
                  <button onClick={() => deleteAnn(a)} className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-500" title="Apagar">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
            {announcements.length === 0 && <p className="text-xs text-slate-400 text-center py-6">Nenhum aviso publicado.</p>}
          </div>
        </div>
      )}

      {tab === 'site' && (
        <div className={`${card} space-y-3`}>
          <div className="flex items-start gap-3">
            <Wrench className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-black text-slate-900 dark:text-white">Modo manutenção</p>
              <p className="text-xs text-slate-500">Bloqueia o site para todos os usuários enquanto você faz mudanças. Você (Dono) continua entrando normalmente.</p>
            </div>
          </div>
          <input
            value={maintMsg}
            onChange={(e) => setMaintMsg(e.target.value)}
            placeholder="Mensagem para os usuários (opcional)"
            className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 px-3 py-2 text-sm"
          />
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <OnAirSign maintenance={access.maintenance} />
            {access.isOwner && (
              <button
                onClick={() => setMaintenance(!access.maintenance)}
                className={`px-4 py-2 rounded-xl text-xs font-black ${access.maintenance ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'}`}
              >
                {access.maintenance ? 'Desativar manutenção' : 'Ativar manutenção'}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
