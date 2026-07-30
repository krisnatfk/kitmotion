-- Cached, server-generated AI insights. Raw camera frames and videos are never
-- stored here; content is generated only from authoritative session summaries.

create table public.ai_insights (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  cache_key text not null,
  session_id uuid references public.workout_sessions(id) on delete cascade,
  classroom_id uuid references public.classrooms(id) on delete cascade,
  content jsonb not null,
  source text not null default 'ai',
  provider text,
  model text,
  prompt_version text not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_user_id, kind, cache_key),
  constraint ai_insights_kind_valid check (
    kind in ('session_coach', 'daily_recommendation', 'teacher_class')
  ),
  constraint ai_insights_source_valid check (source in ('ai', 'fallback')),
  constraint ai_insights_cache_key_not_blank check (length(trim(cache_key)) > 0),
  constraint ai_insights_content_object check (jsonb_typeof(content) = 'object')
);

create index ai_insights_owner_kind_idx
  on public.ai_insights (owner_user_id, kind, updated_at desc);
create index ai_insights_session_idx
  on public.ai_insights (session_id) where session_id is not null;
create index ai_insights_classroom_idx
  on public.ai_insights (classroom_id) where classroom_id is not null;

create trigger ai_insights_set_updated_at before update on public.ai_insights
  for each row execute function public.set_updated_at();

alter table public.ai_insights enable row level security;

create policy "ai_insights_select_own" on public.ai_insights
  for select to authenticated using (owner_user_id = auth.uid());

-- Inserts and updates are intentionally service-role only.

