-- =============================================================
-- Docket — Migration 006: Fix RLS recursion in workspace_members
-- =============================================================

-- 1. Create SECURITY DEFINER helpers to break RLS recursion
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

-- 2. Fix workspace_members select policy (was self-referencing → recursion)
drop policy if exists "Members can view workspace memberships" on public.workspace_members;
create policy "Members can view workspace memberships"
  on public.workspace_members for select
  using (public.is_workspace_member(workspace_members.workspace_id));

-- 3. Fix workspace_members admin policies (same recursion issue)
drop policy if exists "Admins can invite members" on public.workspace_members;
create policy "Admins can invite members"
  on public.workspace_members for insert
  with check (public.is_workspace_admin(workspace_members.workspace_id));

drop policy if exists "Admins can update members" on public.workspace_members;
create policy "Admins can update members"
  on public.workspace_members for update
  using (public.is_workspace_admin(workspace_members.workspace_id));

drop policy if exists "Admins can remove members" on public.workspace_members;
create policy "Admins can remove members"
  on public.workspace_members for delete
  using (public.is_workspace_admin(workspace_members.workspace_id));

-- 4. Fix activity_log select policy (same recursion risk)
drop policy if exists "Members can view activity in their session" on public.activity_log;
create policy "Members can view activity in their session"
  on public.activity_log for select
  using (
    exists (
      select 1 from public.sessions
      where sessions.id = activity_log.session_id
        and public.is_workspace_member(sessions.workspace_id)
    )
  );

-- 5. Update sessions RLS policies to use the helper (cleaner, safer)
-- Note: sessions policies query workspace_members but don't self-reference,
-- so they weren't broken. Still, using the helper is more robust.
drop policy if exists "Members can view sessions in their workspace" on public.sessions;
create policy "Members can view sessions in their workspace"
  on public.sessions for select
  using (public.is_workspace_member(sessions.workspace_id));

drop policy if exists "Members can insert sessions in their workspace" on public.sessions;
create policy "Members can insert sessions in their workspace"
  on public.sessions for insert
  with check (public.is_workspace_member(sessions.workspace_id));

drop policy if exists "Members can update sessions in their workspace" on public.sessions;
create policy "Members can update sessions in their workspace"
  on public.sessions for update
  using (public.is_workspace_member(sessions.workspace_id));

drop policy if exists "Members can delete sessions in their workspace" on public.sessions;
create policy "Members can delete sessions in their workspace"
  on public.sessions for delete
  using (public.is_workspace_member(sessions.workspace_id));

-- 6. Fix session_inputs RLS policies too
drop policy if exists "Members can view session inputs in their workspace" on public.session_inputs;
create policy "Members can view session inputs in their workspace"
  on public.session_inputs for select
  using (
    exists (
      select 1 from public.sessions
      where sessions.id = session_inputs.session_id
        and public.is_workspace_member(sessions.workspace_id)
    )
  );

drop policy if exists "Members can insert session inputs in their workspace" on public.session_inputs;
create policy "Members can insert session inputs in their workspace"
  on public.session_inputs for insert
  with check (
    exists (
      select 1 from public.sessions
      where sessions.id = session_inputs.session_id
        and public.is_workspace_member(sessions.workspace_id)
    )
  );

drop policy if exists "Members can update session inputs in their workspace" on public.session_inputs;
create policy "Members can update session inputs in their workspace"
  on public.session_inputs for update
  using (
    exists (
      select 1 from public.sessions
      where sessions.id = session_inputs.session_id
        and public.is_workspace_member(sessions.workspace_id)
    )
  );

drop policy if exists "Members can delete session inputs in their workspace" on public.session_inputs;
create policy "Members can delete session inputs in their workspace"
  on public.session_inputs for delete
  using (
    exists (
      select 1 from public.sessions
      where sessions.id = session_inputs.session_id
        and public.is_workspace_member(sessions.workspace_id)
    )
  );
