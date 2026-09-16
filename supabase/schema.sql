-- Cresvion Speech Link — Phase 1 schema
-- Run ONCE in the Supabase SQL Editor.
-- Re-running without a reset will fail on existing objects.
-- Tables start EMPTY. Old Base44 rows are not imported here.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Avoid RLS recursion when policies need to know if the caller is an admin.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------------
-- profiles  (Base44 User + UserProfile collapsed)
-- id = auth.users.id
-- user_id is kept as a duplicate of id so filter({ user_id }) façades stay simple
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  user_id uuid not null unique,
  email text,
  full_name text,
  display_name text not null default '',
  preferred_interface_language text not null default 'en'
    check (preferred_interface_language in ('en', 'es')),
  timezone text not null default 'UTC',
  role text not null default 'user'
    check (role in ('user', 'admin')),
  account_status text not null default 'active'
    check (account_status in ('active', 'suspended', 'pending')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_user_id_matches_id check (user_id = id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    user_id,
    email,
    full_name,
    display_name,
    preferred_interface_language,
    timezone,
    role,
    account_status
  )
  values (
    new.id,
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    coalesce(new.raw_user_meta_data->>'preferred_interface_language', 'en'),
    coalesce(new.raw_user_meta_data->>'timezone', 'UTC'),
    'user',
    'active'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- api_keys  (Base44 ApiKey)
-- raw key is NEVER stored; only key_hash + display prefix
-- ---------------------------------------------------------------------------

create table if not exists public.api_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  key_prefix text not null,
  key_hash text not null unique,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'expired')),
  daily_stt_seconds_limit integer not null default 300,
  daily_tts_characters_limit integer not null default 10000,
  monthly_stt_seconds_limit integer not null default 9000,
  monthly_tts_characters_limit integer not null default 300000,
  last_used_date timestamptz,
  revoked_date timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists api_keys_user_id_idx on public.api_keys (user_id);
create index if not exists api_keys_status_idx on public.api_keys (status);

drop trigger if exists api_keys_set_updated_at on public.api_keys;
create trigger api_keys_set_updated_at
  before update on public.api_keys
  for each row execute function public.set_updated_at();

-- Max 5 ACTIVE keys per user is enforced in createApiKey (MAX_API_KEYS_PER_USER).
-- Partial unique would block revoked+recreate patterns; keep the cap in the Edge Function.

-- ---------------------------------------------------------------------------
-- usage_records  (Base44 UsageRecord)
-- created_at is the Base44 created_date sort key
-- ---------------------------------------------------------------------------

create table if not exists public.usage_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  api_key_id uuid references public.api_keys(id) on delete set null,
  endpoint text not null
    check (endpoint in ('stt', 'tts', 'pipeline')),
  status text not null default 'success'
    check (status in ('success', 'error')),
  stt_seconds integer not null default 0,
  tts_characters integer not null default 0,
  detected_language text,
  request_id text,
  error_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists usage_records_user_id_created_at_idx
  on public.usage_records (user_id, created_at desc);
create index if not exists usage_records_created_at_idx
  on public.usage_records (created_at desc);
create index if not exists usage_records_api_key_id_idx
  on public.usage_records (api_key_id);

drop trigger if exists usage_records_set_updated_at on public.usage_records;
create trigger usage_records_set_updated_at
  before update on public.usage_records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- app_settings  (Base44 AppSetting)
-- ---------------------------------------------------------------------------

create table if not exists public.app_settings (
  id uuid primary key default gen_random_uuid(),
  setting_name text not null unique,
  setting_value text not null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists app_settings_set_updated_at on public.app_settings;
create trigger app_settings_set_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

insert into public.app_settings (setting_name, setting_value) values
  ('tts_provider', 'gemini'),
  ('default_daily_stt_seconds', '300'),
  ('default_daily_tts_characters', '10000'),
  ('default_daily_requests', '20'),
  ('rate_limit_per_minute', '10'),
  ('max_audio_seconds', '60'),
  ('max_audio_file_mb', '25'),
  ('max_tts_characters', '2000'),
  ('monthly_multiplier_days', '30'),
  ('safety_threshold_percent', '80'),
  ('system_daily_capacity_requests', '500'),
  ('safety_block_enabled', 'false'),
  ('pipeline_assistant_model', 'disabled'),
  ('pipeline_assistant_prompt', '')
on conflict (setting_name) do nothing;

-- ---------------------------------------------------------------------------
-- system_announcements  (Base44 SystemAnnouncement)
-- ---------------------------------------------------------------------------

create table if not exists public.system_announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  interface_language text not null default 'en'
    check (interface_language in ('en', 'es')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists system_announcements_set_updated_at on public.system_announcements;
create trigger system_announcements_set_updated_at
  before update on public.system_announcements
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.api_keys enable row level security;
alter table public.usage_records enable row level security;
alter table public.app_settings enable row level security;
alter table public.system_announcements enable row level security;

-- profiles
create policy profiles_select_own_or_admin
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or public.is_admin()
  );

create policy profiles_update_own
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()) and not public.is_admin())
  with check (
    id = (select auth.uid())
    and role is not distinct from (select p.role from public.profiles p where p.id = (select auth.uid()))
    and account_status is not distinct from (select p.account_status from public.profiles p where p.id = (select auth.uid()))
  );

create policy profiles_admin_update
  on public.profiles for update
  to authenticated
  using (public.is_admin());

-- api_keys: owners can read their keys (hash still returned unless façade strips it).
-- Writes go through Edge Functions with the service role in production.
create policy api_keys_select_own_or_admin
  on public.api_keys for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin()
  );

create policy api_keys_insert_own
  on public.api_keys for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy api_keys_update_own_or_admin
  on public.api_keys for update
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin()
  );

-- usage_records
create policy usage_records_select_own_or_admin
  on public.usage_records for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_admin()
  );

create policy usage_records_insert_own
  on public.usage_records for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy usage_records_admin_all
  on public.usage_records for all
  to authenticated
  using (public.is_admin());

-- app_settings: authenticated users may read (quotas/UI); only admin writes
create policy app_settings_select_authenticated
  on public.app_settings for select
  to authenticated
  using (true);

create policy app_settings_admin_write
  on public.app_settings for all
  to authenticated
  using (public.is_admin());

-- system_announcements: public read of active rows; admin write
create policy system_announcements_select_public
  on public.system_announcements for select
  to anon, authenticated
  using (active = true or public.is_admin());

create policy system_announcements_admin_write
  on public.system_announcements for all
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated;

grant select on public.system_announcements to anon;

grant select on public.profiles to authenticated;
grant update on public.profiles to authenticated;

grant select, insert, update on public.api_keys to authenticated;

grant select, insert on public.usage_records to authenticated;
grant update, delete on public.usage_records to authenticated;

grant select on public.app_settings to authenticated;
grant insert, update, delete on public.app_settings to authenticated;

grant select on public.system_announcements to authenticated;
grant insert, update, delete on public.system_announcements to authenticated;

-- ---------------------------------------------------------------------------
-- Storage (create bucket "speech-uploads" in the Dashboard first)
-- Optional: dashboard audio_url path. Speech functions also accept multipart bytes.
-- ---------------------------------------------------------------------------

-- insert into storage.buckets (id, name, public)
-- values ('speech-uploads', 'speech-uploads', true)
-- on conflict (id) do nothing;
--
-- create policy speech_uploads_public_read
--   on storage.objects for select
--   to anon, authenticated
--   using (bucket_id = 'speech-uploads');
--
-- create policy speech_uploads_authenticated_insert
--   on storage.objects for insert
--   to authenticated
--   with check (
--     bucket_id = 'speech-uploads'
--     and (select auth.uid())::text = (storage.foldername(name))[1]
--   );
--
-- create policy speech_uploads_delete_own
--   on storage.objects for delete
--   to authenticated
--   using (
--     bucket_id = 'speech-uploads'
--     and (select auth.uid())::text = (storage.foldername(name))[1]
--   );
