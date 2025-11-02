-- 1) EXTENSÃO (para uuid randômico, geralmente já habilitada)
create extension if not exists pgcrypto;

-- 2) TABELA DE PAPÉIS (admin, voluntario, etc.)
create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','voluntario'))
);

-- 3) FUNÇÃO: checar se usuário é admin
create or replace function public.is_admin(uid uuid)
returns boolean
language sql
stable
as chore: roadmap de prioridades e estrutura inicial para tickets (fix path + git identity)
  select exists(
    select 1 from public.user_roles
    where user_id = uid and role = 'admin'
  );
chore: roadmap de prioridades e estrutura inicial para tickets (fix path + git identity);

-- 4) ENUM opcional p/ status (ou use CHECK com text)
do chore: roadmap de prioridades e estrutura inicial para tickets (fix path + git identity)
begin
  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type ticket_status as enum ('open','in_progress','closed');
  end if;
endchore: roadmap de prioridades e estrutura inicial para tickets (fix path + git identity);

-- 5) TABELA: tickets
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  title text not null check (length(title) between 3 and 200),
  description text,
  status ticket_status not null default 'open',
  created_by uuid not null references auth.users(id) on delete cascade,
  assigned_to uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- gatilho p/ updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as chore: roadmap de prioridades e estrutura inicial para tickets (fix path + git identity)
begin
  new.updated_at = now();
  return new;
end;
chore: roadmap de prioridades e estrutura inicial para tickets (fix path + git identity);

drop trigger if exists trg_tickets_updated_at on public.tickets;
create trigger trg_tickets_updated_at
before update on public.tickets
for each row execute procedure public.set_updated_at();

-- 6) ÍNDICES úteis
create index if not exists idx_tickets_created_by on public.tickets(created_by);
create index if not exists idx_tickets_status on public.tickets(status);
create index if not exists idx_tickets_assigned_to on public.tickets(assigned_to);

-- 7) RLS LIGADA
alter table public.tickets enable row level security;

-- 8) POLICIES
-- SELECT: dono ou admin
drop policy if exists "read_own_or_admin" on public.tickets;
create policy "read_own_or_admin"
on public.tickets
for select
to authenticated
using (created_by = auth.uid() or public.is_admin(auth.uid()));

-- INSERT: somente se created_by = auth.uid()
drop policy if exists "insert_self" on public.tickets;
create policy "insert_self"
on public.tickets
for insert
to authenticated
with check (created_by = auth.uid());

-- UPDATE: dono ou admin
drop policy if exists "update_own_or_admin" on public.tickets;
create policy "update_own_or_admin"
on public.tickets
for update
to authenticated
using (created_by = auth.uid() or public.is_admin(auth.uid()))
with check (created_by = auth.uid() or public.is_admin(auth.uid()));

-- DELETE: dono ou admin
drop policy if exists "delete_own_or_admin" on public.tickets;
create policy "delete_own_or_admin"
on public.tickets
for delete
to authenticated
using (created_by = auth.uid() or public.is_admin(auth.uid()));

-- 9) ADMIN SEED (OPCIONAL): coloque seu user_id para ser admin
-- select * from auth.users;  -> copie seu id e substitua abaixo, então rode uma vez
-- insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-000000000000','admin');
