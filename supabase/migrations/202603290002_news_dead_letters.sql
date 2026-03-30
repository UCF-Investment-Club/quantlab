create table if not exists public.news_ingestion_dead_letters (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.news_ingestion_runs(id) on delete cascade,
  provider text not null,
  article_external_id text,
  payload_json jsonb not null default '{}'::jsonb,
  error_message text not null,
  created_at timestamptz not null default now()
);

create index if not exists news_ingestion_dead_letters_run_id_idx
  on public.news_ingestion_dead_letters (run_id);

create index if not exists news_ingestion_dead_letters_created_at_idx
  on public.news_ingestion_dead_letters (created_at desc);

alter table public.news_ingestion_dead_letters enable row level security;

drop policy if exists news_ingestion_dead_letters_admin_select on public.news_ingestion_dead_letters;
create policy news_ingestion_dead_letters_admin_select
on public.news_ingestion_dead_letters
for select
to authenticated
using (public.current_app_role() = 'ADMIN');

drop policy if exists news_ingestion_dead_letters_insert_authenticated on public.news_ingestion_dead_letters;
create policy news_ingestion_dead_letters_insert_authenticated
on public.news_ingestion_dead_letters
for insert
to authenticated
with check (true);

comment on table public.news_ingestion_dead_letters is 'Provider records that could not be normalized/persisted during ingestion runs';