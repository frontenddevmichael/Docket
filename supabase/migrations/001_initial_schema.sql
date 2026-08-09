-- =============================================================
-- Docket — Initial Schema
-- =============================================================

-- 0. Extensions
create extension if not exists "uuid-ossp";

-- 1. Profiles (extends Supabase Auth users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2. Workspaces (one per user in this release, but structured for teams)
create table if not exists public.workspaces (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  created_by  uuid not null references auth.users(id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2b. Workspace membership (enables team expansion later)
create table if not exists public.workspace_members (
  id           uuid primary key default uuid_generate_v4(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  role         text not null default 'owner' check (role in ('owner', 'member')),
  invited_at   timestamptz not null default now(),
  joined_at    timestamptz,
  unique(workspace_id, user_id)
);

-- 3. Sessions (a test session)
create table if not exists public.sessions (
  id                uuid primary key default uuid_generate_v4(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  title             text not null default 'Untitled Session',
  screenshot_url    text,
  screenshot_path   text,
  requirements_text text not null,
  status            text not null default 'draft' check (status in ('draft', 'generating', 'ready', 'executing', 'complete')),
  created_by        uuid not null references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 4. Test cases
create table if not exists public.test_cases (
  id                uuid primary key default uuid_generate_v4(),
  session_id        uuid not null references public.sessions(id) on delete cascade,
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  title             text not null,
  preconditions     text,
  steps             jsonb not null default '[]'::jsonb,
  expected_result   text not null,
  source_ref        text,
  status            text not null default 'not_run' check (status in ('not_run', 'pass', 'fail', 'blocked')),
  feedback          text check (feedback in ('kept', 'edited', 'deleted')),
  sort_order        integer not null default 0,
  created_by        uuid not null references auth.users(id),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- 5. Execution evidence
create table if not exists public.execution_evidence (
  id            uuid primary key default uuid_generate_v4(),
  test_case_id  uuid not null references public.test_cases(id) on delete cascade,
  session_id    uuid not null references public.sessions(id) on delete cascade,
  screenshot_url text,
  notes         text,
  executed_by   uuid not null references auth.users(id),
  executed_at   timestamptz not null default now()
);

-- 6. Reports (versioned)
create table if not exists public.reports (
  id            uuid primary key default uuid_generate_v4(),
  session_id    uuid not null references public.sessions(id) on delete cascade,
  workspace_id  uuid not null references public.workspaces(id) on delete cascade,
  content       jsonb not null,
  version       integer not null default 1,
  generated_by  uuid not null references auth.users(id),
  generated_at  timestamptz not null default now()
);

-- =============================================================
-- Indexes
-- =============================================================
create index if not exists idx_sessions_workspace on public.sessions(workspace_id);
create index if not exists idx_test_cases_session on public.test_cases(session_id);
create index if not exists idx_test_cases_workspace on public.test_cases(workspace_id);
create index if not exists idx_evidence_test_case on public.execution_evidence(test_case_id);
create index if not exists idx_reports_session on public.reports(session_id);
create index if not exists idx_reports_workspace on public.reports(workspace_id);
create index if not exists idx_workspace_members_user on public.workspace_members(user_id);

-- =============================================================
-- Row Level Security
-- =============================================================

-- Profiles
alter table public.profiles enable row level security;
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);
create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Workspaces
alter table public.workspaces enable row level security;
create policy "Members can view their workspaces"
  on public.workspaces for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = workspaces.id
        and workspace_members.user_id = auth.uid()
    )
  );
create policy "Members can update their workspaces"
  on public.workspaces for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = workspaces.id
        and workspace_members.user_id = auth.uid()
        and workspace_members.role = 'owner'
    )
  );

-- Workspace members
alter table public.workspace_members enable row level security;
create policy "Members can view workspace memberships"
  on public.workspace_members for select
  using (auth.uid() = user_id);

-- Sessions
alter table public.sessions enable row level security;
create policy "Members can view sessions in their workspace"
  on public.sessions for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = sessions.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
create policy "Members can insert sessions in their workspace"
  on public.sessions for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = sessions.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
create policy "Members can update sessions in their workspace"
  on public.sessions for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = sessions.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
create policy "Members can delete sessions in their workspace"
  on public.sessions for delete
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = sessions.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

-- Test cases
alter table public.test_cases enable row level security;
create policy "Members can view test cases in their workspace"
  on public.test_cases for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = test_cases.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
create policy "Members can insert test cases in their workspace"
  on public.test_cases for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = test_cases.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
create policy "Members can update test cases in their workspace"
  on public.test_cases for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = test_cases.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
create policy "Members can delete test cases in their workspace"
  on public.test_cases for delete
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = test_cases.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

-- Execution evidence
alter table public.execution_evidence enable row level security;
create policy "Members can view evidence in their session"
  on public.execution_evidence for select
  using (
    exists (
      select 1 from public.sessions
      join public.workspace_members on workspace_members.workspace_id = sessions.workspace_id
      where sessions.id = execution_evidence.session_id
        and workspace_members.user_id = auth.uid()
    )
  );
create policy "Members can insert evidence in their session"
  on public.execution_evidence for insert
  with check (
    exists (
      select 1 from public.sessions
      join public.workspace_members on workspace_members.workspace_id = sessions.workspace_id
      where sessions.id = execution_evidence.session_id
        and workspace_members.user_id = auth.uid()
    )
  );

-- Reports
alter table public.reports enable row level security;
create policy "Members can view reports in their workspace"
  on public.reports for select
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = reports.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
create policy "Members can insert reports in their workspace"
  on public.reports for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = reports.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

-- =============================================================
-- Auto-create profile and workspace on signup
-- =============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  workspace_id uuid;
begin
  -- Create profile
  insert into public.profiles (id, email)
  values (new.id, new.email);

  -- Create workspace
  insert into public.workspaces (name, created_by)
  values ('My Workspace', new.id)
  returning id into workspace_id;

  -- Add user as owner
  insert into public.workspace_members (workspace_id, user_id, role)
  values (workspace_id, new.id, 'owner');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
