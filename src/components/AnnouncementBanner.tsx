import React, { useEffect, useState } from 'react';
import { Megaphone, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  tone: 'info' | 'success' | 'warning';
  active: boolean;
  created_at: string;
}

const DISMISSED_KEY = 'medacademic_dismissed_announcements';
const readDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
};

const TONE: Record<Announcement['tone'], string> = {
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-900 dark:text-sky-100',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100',
};

// Avisos publicados pelo Dono aparecem no topo para todos os usuários
export const AnnouncementBanner: React.FC = () => {
  const { cloudUserId } = useAuth();
  const [items, setItems] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);

  useEffect(() => {
    if (!supabase || !cloudUserId) return;
    let alive = true;
    const load = async () => {
      const { data, error } = await supabase!
        .from('announcements')
        .select('id,title,body,tone,active,created_at')
        .eq('active', true)
        .order('created_at', { ascending: false })
        .limit(3);
      if (alive && !error && data) setItems(data as Announcement[]);
    };
    load();
    const t = window.setInterval(load, 10 * 60 * 1000);
    return () => {
      alive = false;
      window.clearInterval(t);
    };
  }, [cloudUserId]);

  const visible = items.filter((a) => !dismissed.includes(a.id));
  if (visible.length === 0) return null;

  const dismiss = (id: string) => {
    const next = [...dismissed, id];
    setDismissed(next);
    try {
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(next.slice(-50)));
    } catch {}
  };

  return (
    <div className="space-y-2 mb-4">
      {visible.map((a) => (
        <div key={a.id} id={`announcement-${a.id}`} className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${TONE[a.tone] || TONE.info}`}>
          <Megaphone className="h-4 w-4 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black">{a.title}</p>
            {a.body && <p className="text-xs opacity-90 mt-0.5 whitespace-pre-line">{a.body}</p>}
          </div>
          <button onClick={() => dismiss(a.id)} className="p-1 rounded-lg opacity-70 hover:opacity-100" aria-label="Dispensar aviso">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
