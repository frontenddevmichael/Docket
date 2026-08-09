-- =============================================================
-- Docket — Migration 013: Project & Workflow Layer
-- =============================================================

-- 0. Manager helper (owner/admin/manager) — mirror is_workspace_admin
create or replace function public.is_workspace_manager(workspace_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = is_workspace_manager.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin', 'manager')
  );
$$;

-- 1. Projects (generalized per spec §4)
create table if not exists public.projects (
  id                uuid primary key default gen_random_uuid(),
  workspace_id      uuid not null references public.workspaces(id) on delete cascade,
  name              text not null,
  overview          text,
  project_type      text check (project_type in ('web', 'mobile', 'api', 'ussd', 'other')),
  business_segment  text,
  business_impact   text,
  delivery_category text check (delivery_category in ('new', 'enhancement', 'bug_fix')),
  test_type         text,
  status            text not null default 'draft'
    check (status in
      ('draft', 'requested', 'assigned', 'accepted', 'rejected',
       'in_progress', 'on_hold', 'uat', 'completed')),
  assigned_tester   uuid references auth.users(id),
  created_by        uuid not null references auth.users(id),
  requested_by      uuid references auth.users(id),
  stakeholders      jsonb not null default '[]'::jsonb,
  start_date        date,
  target_end_date   date,
  end_date          date,
  rejection_reason  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_projects_workspace on public.projects(workspace_id);
create index if not exists idx_projects_status on public.projects(status);
create index if not exists idx_projects_assigned_tester on public.projects(assigned_tester);

-- 2. Link sessions to a project (Approach A — projects wrap sessions)
alter table public.sessions add column if not exists project_id uuid references public.projects(id) on delete set null;
create index if not exists idx_sessions_project on public.sessions(project_id);

-- 3. Widen member roles to the final set; backfill legacy 'member' → 'tester'
alter table public.workspace_members
  drop constraint if exists workspace_members_role_check,
  add constraint workspace_members_role_check
    check (role in ('owner', 'admin', 'manager', 'tester', 'developer', 'viewer'));

update public.workspace_members set role = 'tester' where role = 'member';

-- 4. Widen invitation roles + default to match
alter table public.workspace_invitations
  drop constraint if exists workspace_invitations_role_check,
  add constraint workspace_invitations_role_check
    check (role in ('owner', 'admin', 'manager', 'tester', 'developer', 'viewer'));

alter table public.workspace_invitations alter column role set default 'tester';

update public.workspace_invitations set role = 'tester' where role = 'member';

-- 5. RLS — members read/create; state transitions handled by the server
--    (service role + app-level role checks), matching the existing pattern.
alter table public.projects enable row level security;

create policy "Members can view projects in their workspace"
  on public.projects for select
  using (public.is_workspace_member(projects.workspace_id));

create policy "Members can create projects in their workspace"
  on public.projects for insert
  with check (public.is_workspace_member(projects.workspace_id));