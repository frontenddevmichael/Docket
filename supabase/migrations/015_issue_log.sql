-- =============================================================
-- Docket — Migration 015: Issue Log Layer
-- (spec §7 Phase 3 — Issue Log Screen / Project Issue Log)
-- =============================================================

-- 1. Issues — defect log entries derived from failed test cases
create table if not exists public.issues (
  id                 uuid primary key default gen_random_uuid(),
  workspace_id       uuid not null references public.workspaces(id) on delete cascade,
  project_id         uuid references public.projects(id) on delete cascade,
  session_id         uuid references public.sessions(id) on delete cascade,
  test_case_id       uuid references public.test_cases(id) on delete cascade,
  title              text not null,
  details            text,
  severity           text check (severity in ('critical', 'high', 'medium', 'low')),
  priority           text check (priority in ('high', 'medium', 'low')),
  assigned_developer uuid references auth.users(id),
  owner              uuid references auth.users(id),
  status             text not null default 'open' check (status in ('open', 'closed')),
  duration_of_impact text,
  opened_at          timestamptz not null default now(),
  closed_at          timestamptz,
  created_by         uuid not null references auth.users(id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists idx_issues_workspace on public.issues(workspace_id);
create index if not exists idx_issues_project on public.issues(project_id);
create index if not exists idx_issues_session on public.issues(session_id);
create index if not exists idx_issues_status on public.issues(status);

-- 2. Blockers — items that halt progress
create table if not exists public.blockers (
  id           uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id   uuid references public.projects(id) on delete cascade,
  session_id   uuid references public.sessions(id) on delete cascade,
  title        text not null,
  details      text,
  status       text not null default 'open' check (status in ('open', 'closed')),
  resolved_at  timestamptz,
  created_by   uuid not null references auth.users(id),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_blockers_workspace on public.blockers(workspace_id);
create index if not exists idx_blockers_project on public.blockers(project_id);
create index if not exists idx_blockers_status on public.blockers(status);

-- 3. Observations — QA findings with developer + PM/PO comments
create table if not exists public.observations (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  project_id        uuid references public.projects(id) on delete cascade,
  session_id        uuid references public.sessions(id) on delete cascade,
  content           text not null,
  developer_comment text,
  pm_comment        text,
  status            text not null default 'open' check (status in ('open', 'acknowledged', 'closed')),
  created_by        uuid not null references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_observations_workspace on public.observations(workspace_id);
create index if not exists idx_observations_project on public.observations(project_id);
create index if not exists idx_observations_session on public.observations(session_id);

-- 4. RLS — workspace members read/write; deletes stay privileged (service role)
alter table public.issues enable row level security;
create policy "Members can view issues in their workspace"
  on public.issues for select
  using (public.is_workspace_member(issues.workspace_id));
create policy "Members can insert issues in their workspace"
  on public.issues for insert
  with check (public.is_workspace_member(issues.workspace_id));
create policy "Members can update issues in their workspace"
  on public.issues for update
  using (public.is_workspace_member(issues.workspace_id));

alter table public.blockers enable row level security;
create policy "Members can view blockers in their workspace"
  on public.blockers for select
  using (public.is_workspace_member(blockers.workspace_id));
create policy "Members can insert blockers in their workspace"
  on public.blockers for insert
  with check (public.is_workspace_member(blockers.workspace_id));
create policy "Members can update blockers in their workspace"
  on public.blockers for update
  using (public.is_workspace_member(blockers.workspace_id));

alter table public.observations enable row level security;
create policy "Members can view observations in their workspace"
  on public.observations for select
  using (public.is_workspace_member(observations.workspace_id));
create policy "Members can insert observations in their workspace"
  on public.observations for insert
  with check (public.is_workspace_member(observations.workspace_id));
create policy "Members can update observations in their workspace"
  on public.observations for update
  using (public.is_workspace_member(observations.workspace_id));