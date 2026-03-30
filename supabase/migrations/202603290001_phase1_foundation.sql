create extension if not exists pgcrypto;

create or replace function public.current_app_role()
returns text
language sql
stable
as $$
  select coalesce(auth.jwt() -> 'user_metadata' ->> 'role', 'MEMBER');
$$;

create table if not exists public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  role text not null default 'MEMBER' check (role in ('MEMBER', 'OFFICER', 'ADMIN')),
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'INVITED', 'DISABLED')),
  created_at timestamptz not null default now(),
  last_login_at timestamptz
);

create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  role text not null check (role in ('MEMBER', 'OFFICER', 'ADMIN')),
  invite_token_hash text not null unique,
  expires_at timestamptz not null,
  invited_by uuid not null references public.users(id),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists invites_email_idx on public.invites (email);

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists password_reset_tokens_user_id_idx on public.password_reset_tokens (user_id);
create index if not exists password_reset_tokens_expires_at_idx on public.password_reset_tokens (expires_at);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists audit_logs_actor_id_idx on public.audit_logs (actor_id);
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);

create table if not exists public.member_profiles (
  user_id uuid primary key references public.users(id) on delete cascade,
  major text,
  graduation_year int,
  joined_at timestamptz not null default now(),
  is_active boolean not null default true
);

create index if not exists member_profiles_active_idx on public.member_profiles (is_active);

create table if not exists public.news_articles (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_article_id text not null,
  title text not null,
  summary text,
  url text,
  url_hash text not null,
  source_name text,
  published_at timestamptz not null,
  language text not null default 'en',
  inserted_at timestamptz not null default now(),
  unique (provider, provider_article_id),
  unique (url_hash)
);

create index if not exists news_articles_published_at_desc_idx on public.news_articles (published_at desc);
create index if not exists news_articles_search_idx on public.news_articles
using gin (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(summary, '')));

create table if not exists public.news_article_tickers (
  article_id uuid not null references public.news_articles(id) on delete cascade,
  ticker text not null,
  primary key (article_id, ticker)
);

create index if not exists news_article_tickers_ticker_idx on public.news_article_tickers (ticker);

create table if not exists public.news_article_sentiment (
  article_id uuid primary key references public.news_articles(id) on delete cascade,
  label text not null check (label in ('POSITIVE', 'NEUTRAL', 'NEGATIVE')),
  score numeric(5, 4) not null,
  model_name text,
  model_version text
);

create table if not exists public.news_ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null check (status in ('RUNNING', 'SUCCESS', 'FAILED')),
  fetched_count int not null default 0,
  inserted_count int not null default 0,
  error_summary text,
  retry_count int not null default 0
);

create index if not exists news_ingestion_runs_started_at_idx on public.news_ingestion_runs (started_at desc);

create or replace function public.handle_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    coalesce(new.raw_user_meta_data ->> 'role', 'MEMBER'),
    'ACTIVE'
  )
  on conflict (id) do update
  set email = excluded.email,
      full_name = excluded.full_name,
      role = excluded.role;

  insert into public.member_profiles (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_auth_user_created();

alter table public.users enable row level security;
alter table public.invites enable row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.audit_logs enable row level security;
alter table public.member_profiles enable row level security;
alter table public.news_articles enable row level security;
alter table public.news_article_tickers enable row level security;
alter table public.news_article_sentiment enable row level security;
alter table public.news_ingestion_runs enable row level security;

drop policy if exists users_select_authenticated on public.users;
create policy users_select_authenticated
on public.users
for select
to authenticated
using (true);

drop policy if exists users_update_admin on public.users;
create policy users_update_admin
on public.users
for update
to authenticated
using (public.current_app_role() = 'ADMIN')
with check (public.current_app_role() = 'ADMIN');

drop policy if exists member_profiles_select_authenticated on public.member_profiles;
create policy member_profiles_select_authenticated
on public.member_profiles
for select
to authenticated
using (true);

drop policy if exists member_profiles_update_admin on public.member_profiles;
create policy member_profiles_update_admin
on public.member_profiles
for update
to authenticated
using (public.current_app_role() = 'ADMIN')
with check (public.current_app_role() = 'ADMIN');

drop policy if exists news_articles_select_authenticated on public.news_articles;
create policy news_articles_select_authenticated
on public.news_articles
for select
to authenticated
using (true);

drop policy if exists news_article_tickers_select_authenticated on public.news_article_tickers;
create policy news_article_tickers_select_authenticated
on public.news_article_tickers
for select
to authenticated
using (true);

drop policy if exists news_article_sentiment_select_authenticated on public.news_article_sentiment;
create policy news_article_sentiment_select_authenticated
on public.news_article_sentiment
for select
to authenticated
using (true);

drop policy if exists news_ingestion_runs_select_authenticated on public.news_ingestion_runs;
create policy news_ingestion_runs_select_authenticated
on public.news_ingestion_runs
for select
to authenticated
using (true);

drop policy if exists invites_admin_all on public.invites;
create policy invites_admin_all
on public.invites
for all
to authenticated
using (public.current_app_role() = 'ADMIN')
with check (public.current_app_role() = 'ADMIN');

drop policy if exists audit_logs_admin_select on public.audit_logs;
create policy audit_logs_admin_select
on public.audit_logs
for select
to authenticated
using (public.current_app_role() = 'ADMIN');

drop policy if exists audit_logs_insert_authenticated on public.audit_logs;
create policy audit_logs_insert_authenticated
on public.audit_logs
for insert
to authenticated
with check (true);

comment on table public.users is 'Application user profile synchronized from auth.users';
comment on table public.invites is 'Admin invitation records with hashed tokens';
comment on table public.password_reset_tokens is 'App-level reset token ledger with hashes only';
comment on table public.news_articles is 'Canonical normalized news article store';
comment on table public.news_ingestion_runs is 'Run-level metrics and error status for ingestion jobs';
