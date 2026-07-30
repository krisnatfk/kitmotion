-- Server-only AI provider registry. API keys are encrypted by the application
-- before storage and are never exposed through an authenticated client policy.

create table public.ai_providers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  base_url text not null,
  api_key_encrypted text not null,
  model text not null,
  response_format text not null default 'json_schema',
  priority integer not null default 100,
  is_active boolean not null default true,
  health_status text not null default 'unchecked',
  consecutive_failures integer not null default 0,
  last_checked_at timestamptz,
  last_success_at timestamptz,
  last_latency_ms integer,
  last_error text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint ai_providers_name_not_blank check (length(trim(name)) >= 2),
  constraint ai_providers_base_url_not_blank check (length(trim(base_url)) > 0),
  constraint ai_providers_model_not_blank check (length(trim(model)) > 0),
  constraint ai_providers_priority_nonnegative check (priority >= 0),
  constraint ai_providers_failures_nonnegative check (consecutive_failures >= 0),
  constraint ai_providers_response_format_valid check (
    response_format in ('json_schema', 'json_object')
  ),
  constraint ai_providers_health_status_valid check (
    health_status in ('unchecked', 'healthy', 'degraded', 'unhealthy')
  )
);

create index ai_providers_runtime_idx
  on public.ai_providers (is_active, priority, health_status);

create trigger ai_providers_set_updated_at before update on public.ai_providers
  for each row execute function public.set_updated_at();

alter table public.ai_providers enable row level security;

-- No anon/authenticated policies. All reads and writes go through server-side
-- admin actions or the service-role AI runtime.
