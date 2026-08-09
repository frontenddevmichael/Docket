-- =============================================================
-- Docket — Migration 004: Input Expansion + Team Prep
-- =============================================================

create extension if not exists "uuid-ossp" with schema public;

-- 1. session_inputs — polymorphic input storage for screenshots,
--    requirements, figma, github_pr, api_spec, source_code
create table if not exists public.session_inputs (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  type        text not null check (type in ('screenshot', 'requirements', 'figma', 'github_pr', 'api_spec', 'source_code')),
  label       text,
  data        jsonb,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

-- 2. assigned_to on sessions for team assignment
alter table public.sessions add column if not exists assigned_to uuid references auth.users(id);

-- Indexes
create index if not exists idx_session_inputs_session on public.session_inputs(session_id);
create index if not exists idx_sessions_assigned on public.sessions(assigned_to);
create index if not exists idx_sessions_created_by on public.sessions(created_by);

-- =============================================================
-- Row Level Security — session_inputs
-- =============================================================
alter table public.session_inputs enable row level security;

create policy "Members can view session inputs in their workspace"
  on public.session_inputs for select
  using (
    exists (
      select 1 from public.sessions
      join public.workspace_members on workspace_members.workspace_id = sessions.workspace_id
      where sessions.id = session_inputs.session_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "Members can insert session inputs in their workspace"
  on public.session_inputs for insert
  with check (
    exists (
      select 1 from public.sessions
      join public.workspace_members on workspace_members.workspace_id = sessions.workspace_id
      where sessions.id = session_inputs.session_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "Members can update session inputs in their workspace"
  on public.session_inputs for update
  using (
    exists (
      select 1 from public.sessions
      join public.workspace_members on workspace_members.workspace_id = sessions.workspace_id
      where sessions.id = session_inputs.session_id
        and workspace_members.user_id = auth.uid()
    )
  );

create policy "Members can delete session inputs in their workspace"
  on public.session_inputs for delete
  using (
    exists (
      select 1 from public.sessions
      join public.workspace_members on workspace_members.workspace_id = sessions.workspace_id
      where sessions.id = session_inputs.session_id
        and workspace_members.user_id = auth.uid()
    )
  );
