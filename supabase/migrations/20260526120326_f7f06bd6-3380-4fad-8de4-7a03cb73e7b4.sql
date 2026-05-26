
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  address text not null default '',
  created_at timestamptz not null default now()
);
create index clients_user_idx on public.clients(user_id);
create index clients_user_name_idx on public.clients(user_id, lower(name));

alter table public.clients enable row level security;

create policy "clients_select_own" on public.clients for select using (auth.uid() = user_id);
create policy "clients_insert_own" on public.clients for insert with check (auth.uid() = user_id);
create policy "clients_update_own" on public.clients for update using (auth.uid() = user_id);
create policy "clients_delete_own" on public.clients for delete using (auth.uid() = user_id);

create table public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id uuid references public.clients(id) on delete set null,
  payload jsonb not null default '{}'::jsonb,
  total_value numeric(12,2) not null default 0,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);
create index quotes_user_idx on public.quotes(user_id, created_at desc);

alter table public.quotes enable row level security;

create policy "quotes_select_own" on public.quotes for select using (auth.uid() = user_id);
create policy "quotes_insert_own" on public.quotes for insert with check (auth.uid() = user_id);
create policy "quotes_update_own" on public.quotes for update using (auth.uid() = user_id);
create policy "quotes_delete_own" on public.quotes for delete using (auth.uid() = user_id);
