-- Focus app — Supabase schema
-- Paste this into Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to run on a fresh project. To re-run safely, drop tables first (see end of file).

------------------------------------------------------------------------
-- Tables
------------------------------------------------------------------------

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null,
  completed_at timestamptz,
  duration_min integer not null,
  tag_id uuid references public.tags(id) on delete set null,
  intent text,
  source text not null check (source in ('start_now','unstuck','physical_action')),
  ai_suggestion jsonb,
  note text,                                      -- post-session reflection
  captures jsonb not null default '[]'::jsonb,    -- mid-session captures: [{text, captured_at}]
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  audio text not null default 'tick',
  volume integer not null default 35,
  default_duration integer not null default 25,
  theme text not null default 'auto',
  last_used_tag_id uuid,
  updated_at timestamptz not null default now()
);

create table if not exists public.user_meta (
  user_id uuid primary key references auth.users(id) on delete cascade,
  blacklisted boolean not null default false,
  daily_ai_quota integer not null default 50,
  created_at timestamptz not null default now()
);

create table if not exists public.ai_request_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  thought_char_count integer not null,
  has_previous_actions boolean not null default false,
  created_at timestamptz not null default now()
);

------------------------------------------------------------------------
-- Indexes
------------------------------------------------------------------------

create index if not exists ai_request_log_user_created
  on public.ai_request_log(user_id, created_at desc);
create index if not exists sessions_user_completed
  on public.sessions(user_id, completed_at desc);
create index if not exists sessions_user_updated
  on public.sessions(user_id, updated_at desc);
create index if not exists tags_user_updated
  on public.tags(user_id, updated_at desc);

------------------------------------------------------------------------
-- Row Level Security
------------------------------------------------------------------------

alter table public.sessions       enable row level security;
alter table public.tags           enable row level security;
alter table public.settings       enable row level security;
alter table public.user_meta      enable row level security;
alter table public.ai_request_log enable row level security;

drop policy if exists sessions_owner       on public.sessions;
drop policy if exists tags_owner           on public.tags;
drop policy if exists settings_owner       on public.settings;
drop policy if exists user_meta_owner_read on public.user_meta;
drop policy if exists ai_log_owner_read    on public.ai_request_log;

create policy sessions_owner on public.sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy tags_owner on public.tags
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy settings_owner on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- user_meta + ai_request_log: client can read its own, only service-role writes
create policy user_meta_owner_read on public.user_meta
  for select using (auth.uid() = user_id);

create policy ai_log_owner_read on public.ai_request_log
  for select using (auth.uid() = user_id);

------------------------------------------------------------------------
-- Triggers
------------------------------------------------------------------------

-- On signup, create matching user_meta + settings rows.
create or replace function public.handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_meta (user_id) values (new.id) on conflict do nothing;
  insert into public.settings  (user_id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto-update updated_at on row update.
create or replace function public.touch_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists sessions_updated_at on public.sessions;
create trigger sessions_updated_at before update on public.sessions
  for each row execute function public.touch_updated_at();

drop trigger if exists tags_updated_at on public.tags;
create trigger tags_updated_at before update on public.tags
  for each row execute function public.touch_updated_at();

drop trigger if exists settings_updated_at on public.settings;
create trigger settings_updated_at before update on public.settings
  for each row execute function public.touch_updated_at();

------------------------------------------------------------------------
-- (Optional) Drop everything to re-run cleanly:
--
--   drop trigger if exists on_auth_user_created on auth.users;
--   drop function if exists public.handle_new_user() cascade;
--   drop function if exists public.touch_updated_at() cascade;
--   drop table  if exists public.ai_request_log;
--   drop table  if exists public.sessions;
--   drop table  if exists public.tags;
--   drop table  if exists public.settings;
--   drop table  if exists public.user_meta;
------------------------------------------------------------------------
