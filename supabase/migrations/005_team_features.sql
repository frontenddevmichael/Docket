-- =============================================================
-- Docket — Migration 005: Team Features (roles + activity)
-- =============================================================

-- 0. SECURITY DEFINER helper to check workspace membership without RLS recursion
create or replace function public.is_workspace_member(workspace_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = is_workspace_member.workspace_id
      and workspace_members.user_id = auth.uid()
  );
$$;

create or replace function public.is_workspace_admin(workspace_id uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = is_workspace_admin.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin')
  );
$$;

-- 1. Extend workspace_members role constraint to include admin/tester
alter table public.workspace_members
  drop constraint if exists workspace_members_role_check,
  add constraint workspace_members_role_check
    check (role in ('owner', 'admin', 'tester', 'member'));

-- 2. Activity log for session timeline
create table if not exists public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.sessions(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  action      text not null,
  details     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists idx_activity_log_session on public.activity_log(session_id);
create index if not exists idx_activity_log_user on public.activity_log(user_id);

-- RLS: activity_log
alter table public.activity_log enable row level security;

create policy "Members can view activity in their session"
  on public.activity_log for select
  using (
    exists (
      select 1 from public.sessions
      where sessions.id = activity_log.session_id
        and public.is_workspace_member(sessions.workspace_id)
    )
  );

create policy "Service can insert activity"
  on public.activity_log for insert
  with check (true);

-- 3. Update workspace_members select policy to allow viewing all members in workspace
drop policy if exists "Members can view workspace memberships" on public.workspace_members;
create policy "Members can view workspace memberships"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_members.workspace_id));

-- 4. Admin/owner policies for workspace management
create policy "Admins can invite members"
  on public.workspace_members for insert
  with check (public.is_workspace_admin(workspace_members.workspace_id));

create policy "Admins can update members"
  on public.workspace_members for update
  using (public.is_workspace_admin(workspace_members.workspace_id));

create policy "Admins can remove members"
  on public.workspace_members for delete
  using (public.is_workspace_admin(workspace_members.workspace_id));

-- 5. Only owners can delete/transfer workspace (update workspace policy)
-- (already handled by existing owner-only update policy)

-- 6. Automatic activity logging for test case changes
create or replace function public.log_test_case_activity()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_user_id uuid;
begin
  v_user_id := coalesce(auth.uid(), coalesce(new.created_by, old.created_by));

  if tg_op = 'INSERT' then
    insert into public.activity_log (session_id, user_id, action, details)
    values (new.session_id, v_user_id, 'test_case_added',
      jsonb_build_object('test_case_id', new.id, 'title', new.title));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.activity_log (session_id, user_id, action, details)
    values (new.session_id, v_user_id, 'test_case_updated',
      jsonb_build_object('test_case_id', new.id, 'title', new.title));
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.activity_log (session_id, user_id, action, details)
    values (old.session_id, v_user_id, 'test_case_deleted',
      jsonb_build_object('test_case_id', old.id, 'title', old.title));
    return old;
  end if;
end;
$$;

create trigger trg_test_case_activity
  after insert or update or delete on public.test_cases
  for each row execute function public.log_test_case_activity();

-- 7. Automatic activity logging for session status changes
create or replace function public.log_session_activity()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  if old.status is distinct from new.status then
    insert into public.activity_log (session_id, user_id, action, details)
    values (new.id, auth.uid(), 'status_change',
      jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  return new;
end;
$$;

create trigger trg_session_activity
  after update of status on public.sessions
  for each row execute function public.log_session_activity();
