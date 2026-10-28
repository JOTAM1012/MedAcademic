-- MedAcademic — banco de dados no Supabase
-- Rode este arquivo uma vez no SQL Editor do seu projeto (Dashboard → SQL Editor → New query → Run).

-- Estado acadêmico completo de cada estudante (matérias, tópicos, provas, perfil, sessões...),
-- guardado como JSON em uma linha por usuário.
create table if not exists public.app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Cada usuário só enxerga e altera a própria linha.
alter table public.app_state enable row level security;

drop policy if exists "app_state_select_own" on public.app_state;
create policy "app_state_select_own" on public.app_state
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "app_state_insert_own" on public.app_state;
create policy "app_state_insert_own" on public.app_state
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

drop policy if exists "app_state_update_own" on public.app_state;
create policy "app_state_update_own" on public.app_state
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "app_state_delete_own" on public.app_state;
create policy "app_state_delete_own" on public.app_state
  for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Novas tabelas não ficam expostas na API automaticamente: libera só para usuários logados.
revoke all on public.app_state from anon;
revoke all on public.app_state from authenticated;
grant select, insert, update, delete on public.app_state to authenticated;
