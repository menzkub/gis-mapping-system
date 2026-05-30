-- ============================================================
-- PEA Meter & TR Search — Supabase schema
-- Run once in the Supabase SQL editor.
-- ============================================================

-- ---- Extensions ----
create extension if not exists "pgcrypto";

-- ============================================================
-- profiles — app-level metadata for every auth.users row
-- ============================================================
create table public.profiles (
  id          uuid        primary key references auth.users(id) on delete cascade,
  username    text        unique not null,
  name        text        not null default '',
  role        text        not null default 'user'    check (role    in ('admin','user')),
  status      text        not null default 'pending' check (status  in ('active','pending','banned')),
  last_login  timestamptz,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Any authenticated user can read their own row
create policy "profiles: own select"
  on public.profiles for select
  using (auth.uid() = id);

-- Admins can read all profiles (for AdminPanel users list)
create policy "profiles: admin select"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Admins can update any profile (approve/ban/role change)
create policy "profiles: admin update"
  on public.profiles for update
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- ============================================================
-- meters
-- ============================================================
create table public.meters (
  id          bigserial   primary key,
  objectid    bigint      unique not null,
  tag         text        not null default '',
  code        text        not null default '',
  route       text        not null default '',
  accountnum  text        not null default '',
  peano       text        not null default '',
  feederid    text        not null default '',
  owner       text        not null default 'PEA',
  installati  text        not null default '',
  latitude    double precision not null,
  longitude   double precision not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.meters enable row level security;

create policy "meters: active user select"
  on public.meters for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
    )
  );

create policy "meters: admin write"
  on public.meters for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'
    )
  );

create index meters_feederid_idx on public.meters(feederid);
create index meters_tag_idx      on public.meters(tag);
create index meters_objectid_idx on public.meters(objectid);

-- ============================================================
-- transformers
-- ============================================================
create table public.transformers (
  id            bigserial   primary key,
  objectid      bigint      unique not null,
  tag           text        not null default '',
  phase         text        not null default '',
  voltage       text        not null default '',
  peano_tr      text        not null default '',
  install_phase text        not null default '',
  kva           numeric     not null default 0,
  owner_tr      text        not null default 'PEA',
  location      text        not null default '',
  feeder1       text        not null default '',
  latitude      double precision not null,
  longitude     double precision not null,
  pea_meter     text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.transformers enable row level security;

create policy "transformers: active user select"
  on public.transformers for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.status = 'active'
    )
  );

create policy "transformers: admin write"
  on public.transformers for all
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin' and p.status = 'active'
    )
  );

create index transformers_feeder1_idx  on public.transformers(feeder1);
create index transformers_tag_idx      on public.transformers(tag);
create index transformers_objectid_idx on public.transformers(objectid);

-- ============================================================
-- audit_log
-- ============================================================
create table public.audit_log (
  id          bigserial   primary key,
  at          timestamptz not null default now(),
  user_id     uuid        references auth.users(id) on delete set null,
  username    text        not null default '',
  action      text        not null,
  target      text        not null default '',
  detail      text        not null default '',
  ip          text        not null default ''
);

alter table public.audit_log enable row level security;

create policy "audit_log: admin select"
  on public.audit_log for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

create policy "audit_log: authenticated insert"
  on public.audit_log for insert
  with check (auth.uid() is not null);

create index audit_log_at_idx     on public.audit_log(at desc);
create index audit_log_action_idx on public.audit_log(action);

-- ============================================================
-- updated_at trigger
-- ============================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger meters_updated_at
  before update on public.meters
  for each row execute function public.touch_updated_at();

create trigger transformers_updated_at
  before update on public.transformers
  for each row execute function public.touch_updated_at();

-- ============================================================
-- Auto-create profile on auth.users INSERT
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, username, name, role, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'user',
    'pending'
  );
  return new;
end;
$$;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- First admin: after running schema + seed, promote yourself:
--   UPDATE public.profiles SET role='admin', status='active'
--   WHERE username='your-username';
-- ============================================================
