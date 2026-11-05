-- MedAcademic — papéis (Dono/Moderador), bloqueio de contas, acesso vitalício/assinaturas,
-- avisos para todos e modo manutenção. Rode depois do schema.sql.

-- ---------- Tabelas ----------
create table if not exists public.app_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'moderator')),
  created_at timestamptz not null default now()
);

create table if not exists public.account_status (
  user_id uuid primary key references auth.users (id) on delete cascade,
  blocked boolean not null default false,
  reason text,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users (id) on delete set null
);

-- Planos (preparado para assinaturas futuras)
create table if not exists public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null default 'free',
  lifetime boolean not null default false,
  expires_at timestamptz,
  note text,
  updated_at timestamptz not null default now()
);

create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 120),
  body text not null default '' check (char_length(body) <= 2000),
  tone text not null default 'info' check (tone in ('info', 'success', 'warning')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users (id) on delete set null
);

create table if not exists public.site_settings (
  id int primary key default 1 check (id = 1),
  maintenance boolean not null default false,
  maintenance_message text,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;

-- ---------- Funções auxiliares ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.app_admins a where a.user_id = (select auth.uid())) $$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.app_admins a where a.user_id = (select auth.uid()) and a.role = 'owner') $$;

-- Bloqueado (Dono/Moderador nunca é bloqueado)
create or replace function public.is_blocked()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (select 1 from public.account_status s where s.user_id = (select auth.uid()) and s.blocked)
     and not public.is_admin()
$$;

-- ---------- RLS ----------
alter table public.app_admins enable row level security;
alter table public.account_status enable row level security;
alter table public.entitlements enable row level security;
alter table public.announcements enable row level security;
alter table public.site_settings enable row level security;

drop policy if exists "app_admins_select_own" on public.app_admins;
create policy "app_admins_select_own" on public.app_admins for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "account_status_select_own" on public.account_status;
create policy "account_status_select_own" on public.account_status for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "entitlements_select_own" on public.entitlements;
create policy "entitlements_select_own" on public.entitlements for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists "announcements_select" on public.announcements;
create policy "announcements_select" on public.announcements for select to authenticated
  using (active or public.is_admin());
drop policy if exists "announcements_insert_admin" on public.announcements;
create policy "announcements_insert_admin" on public.announcements for insert to authenticated
  with check (public.is_admin());
drop policy if exists "announcements_update_admin" on public.announcements;
create policy "announcements_update_admin" on public.announcements for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
drop policy if exists "announcements_delete_admin" on public.announcements;
create policy "announcements_delete_admin" on public.announcements for delete to authenticated
  using (public.is_admin());

drop policy if exists "site_settings_select" on public.site_settings;
create policy "site_settings_select" on public.site_settings for select to authenticated using (true);

revoke all on public.app_admins, public.account_status, public.entitlements, public.announcements, public.site_settings from anon;
revoke all on public.app_admins, public.account_status, public.entitlements, public.announcements, public.site_settings from authenticated;
grant select on public.app_admins, public.account_status, public.entitlements, public.site_settings to authenticated;
grant select, insert, update, delete on public.announcements to authenticated;

-- Conta bloqueada não lê nem grava os próprios dados de estudo
drop policy if exists "app_state_select_own" on public.app_state;
create policy "app_state_select_own" on public.app_state for select to authenticated
  using ((select auth.uid()) = user_id and not public.is_blocked());
drop policy if exists "app_state_insert_own" on public.app_state;
create policy "app_state_insert_own" on public.app_state for insert to authenticated
  with check ((select auth.uid()) = user_id and not public.is_blocked());
drop policy if exists "app_state_update_own" on public.app_state;
create policy "app_state_update_own" on public.app_state for update to authenticated
  using ((select auth.uid()) = user_id and not public.is_blocked())
  with check ((select auth.uid()) = user_id and not public.is_blocked());

-- ---------- RPCs ----------
-- Acesso do usuário logado: papel, bloqueio, plano e manutenção
create or replace function public.my_access()
returns json language sql stable security definer set search_path = ''
as $$
  select json_build_object(
    'role', (select a.role from public.app_admins a where a.user_id = (select auth.uid())),
    'blocked', public.is_blocked(),
    'block_reason', (select s.reason from public.account_status s where s.user_id = (select auth.uid()) and s.blocked),
    'plan', coalesce((select e.plan from public.entitlements e where e.user_id = (select auth.uid())), 'free'),
    'lifetime', coalesce((select e.lifetime from public.entitlements e where e.user_id = (select auth.uid())), false),
    'maintenance', (select st.maintenance from public.site_settings st where st.id = 1),
    'maintenance_message', (select st.maintenance_message from public.site_settings st where st.id = 1)
  )
$$;

-- Lista de usuários (só Dono/Moderador)
create or replace function public.admin_list_users()
returns table (
  id uuid, email text, created_at timestamptz, last_sign_in_at timestamptz, last_activity timestamptz,
  name text, university text, level int, questions bigint, correct bigint, study_minutes bigint,
  blocked boolean, block_reason text, role text, plan text, lifetime boolean
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  return query
  select u.id, u.email::text, u.created_at, u.last_sign_in_at, st.updated_at,
         st.data->'userProfile'->>'name',
         st.data->'userProfile'->>'university',
         nullif(st.data->'userProfile'->>'level', '')::int,
         coalesce((select sum((q->>'total')::bigint) from jsonb_array_elements(case when jsonb_typeof(st.data->'questionLogs') = 'array' then st.data->'questionLogs' else '[]'::jsonb end) q), 0)::bigint,
         coalesce((select sum((q->>'correct')::bigint) from jsonb_array_elements(case when jsonb_typeof(st.data->'questionLogs') = 'array' then st.data->'questionLogs' else '[]'::jsonb end) q), 0)::bigint,
         coalesce((select sum((x->>'durationMinutes')::numeric)::bigint from jsonb_array_elements(case when jsonb_typeof(st.data->'studySessions') = 'array' then st.data->'studySessions' else '[]'::jsonb end) x), 0)::bigint,
         coalesce(s.blocked, false), s.reason, a.role, coalesce(e.plan, 'free'), coalesce(e.lifetime, false)
  from auth.users u
  left join public.app_state st on st.user_id = u.id
  left join public.account_status s on s.user_id = u.id
  left join public.app_admins a on a.user_id = u.id
  left join public.entitlements e on e.user_id = u.id
  order by u.created_at desc;
end $$;

-- Estatísticas gerais (só Dono/Moderador)
create or replace function public.admin_stats()
returns json language plpgsql stable security definer set search_path = ''
as $$
declare r json;
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  select json_build_object(
    'total_users', (select count(*) from auth.users),
    'new_7d', (select count(*) from auth.users where created_at > now() - interval '7 days'),
    'new_30d', (select count(*) from auth.users where created_at > now() - interval '30 days'),
    'active_7d', (select count(*) from public.app_state where updated_at > now() - interval '7 days'),
    'active_today', (select count(*) from public.app_state where updated_at > now() - interval '1 day'),
    'blocked', (select count(*) from public.account_status where blocked),
    'questions', (select coalesce(sum((q->>'total')::bigint), 0) from public.app_state st,
                  jsonb_array_elements(case when jsonb_typeof(st.data->'questionLogs') = 'array' then st.data->'questionLogs' else '[]'::jsonb end) q),
    'study_minutes', (select coalesce(sum((x->>'durationMinutes')::numeric), 0)::bigint from public.app_state st,
                  jsonb_array_elements(case when jsonb_typeof(st.data->'studySessions') = 'array' then st.data->'studySessions' else '[]'::jsonb end) x),
    'signups_by_week', (select coalesce(json_agg(w order by w.week), '[]'::json) from (
        select date_trunc('week', created_at)::date as week, count(*) as n
        from auth.users where created_at > now() - interval '8 weeks' group by 1) w)
  ) into r;
  return r;
end $$;

-- Bloquear / desbloquear (não vale para Dono/Moderador)
create or replace function public.admin_set_blocked(target uuid, should_block boolean, why text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  if exists (select 1 from public.app_admins a where a.user_id = target) then
    raise exception 'Não é possível bloquear um Dono/Moderador';
  end if;
  insert into public.account_status (user_id, blocked, reason, updated_at, updated_by)
  values (target, should_block, case when should_block then why end, now(), (select auth.uid()))
  on conflict (user_id) do update set blocked = excluded.blocked, reason = excluded.reason,
    updated_at = now(), updated_by = excluded.updated_by;
end $$;

-- Excluir conta (só o Dono; apaga também os dados de estudo)
create or replace function public.admin_delete_user(target uuid)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_owner() then raise exception 'not allowed' using errcode = '42501'; end if;
  if exists (select 1 from public.app_admins a where a.user_id = target) then
    raise exception 'Não é possível excluir um Dono/Moderador';
  end if;
  delete from auth.users where id = target;
end $$;

-- Modo manutenção (só o Dono): quem não é Dono/Moderador vê a tela de manutenção
create or replace function public.admin_set_maintenance(on_off boolean, msg text default null)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if not public.is_owner() then raise exception 'not allowed' using errcode = '42501'; end if;
  update public.site_settings set maintenance = on_off, maintenance_message = msg, updated_at = now() where id = 1;
end $$;

revoke execute on function public.is_admin(), public.is_owner(), public.is_blocked(), public.my_access(),
  public.admin_list_users(), public.admin_stats(), public.admin_set_blocked(uuid, boolean, text),
  public.admin_delete_user(uuid), public.admin_set_maintenance(boolean, text) from public, anon;
grant execute on function public.is_admin(), public.is_owner(), public.is_blocked(), public.my_access(),
  public.admin_list_users(), public.admin_stats(), public.admin_set_blocked(uuid, boolean, text),
  public.admin_delete_user(uuid), public.admin_set_maintenance(boolean, text) to authenticated;

-- ---------- Dono do site: papel + acesso vitalício ----------
insert into public.app_admins (user_id, role)
select id, 'owner' from auth.users where lower(email) = 'joaombseiffert@gmail.com'
on conflict (user_id) do update set role = 'owner';

insert into public.entitlements (user_id, plan, lifetime, note)
select id, 'vitalicio', true, 'Dono do site' from auth.users where lower(email) = 'joaombseiffert@gmail.com'
on conflict (user_id) do update set plan = 'vitalicio', lifetime = true, note = 'Dono do site', updated_at = now();
