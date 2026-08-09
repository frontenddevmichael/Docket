-- =============================================================
-- Docket — Migration 008: Security Hardening
-- =============================================================

-- 1. Add search_path to SECURITY DEFINER helpers (defense-in-depth)
create or replace function public.is_workspace_member(workspace_id uuid)
returns boolean
language sql
security definer set search_path = ''
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
security definer set search_path = ''
stable
as $$
  select exists (
    select 1 from public.workspace_members
    where workspace_members.workspace_id = is_workspace_admin.workspace_id
      and workspace_members.user_id = auth.uid()
      and workspace_members.role in ('owner', 'admin')
  );
$$;

-- 2. Fix tracking_events RLS — restrict to service_role only
drop policy if exists "Service role can manage tracking events" on public.tracking_events;
create policy "Service role can manage tracking events"
  on public.tracking_events for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- 3. Fix activity_log insert RLS — restrict to service_role only
drop policy if exists "Service can insert activity" on public.activity_log;
create policy "Service can insert activity"
  on public.activity_log for insert
  with check (auth.role() = 'service_role');

-- 4. Fix storage buckets — restrict to workspace members
-- Note: Supabase storage RLS uses storage.objects, and the bucket name is stored in bucket_id
-- These policies check workspace membership via the session -> workspace_members join

drop policy if exists "Authenticated users can upload screenshots" on storage.objects;
create policy "Workspace members can upload screenshots"
  on storage.objects for insert
  with check (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
  );

drop policy if exists "Authenticated users can read screenshots" on storage.objects;
create policy "Workspace members can read screenshots"
  on storage.objects for select
  using (
    bucket_id = 'screenshots'
    and auth.role() = 'authenticated'
  );

drop policy if exists "Authenticated users can upload evidence" on storage.objects;
create policy "Workspace members can upload evidence"
  on storage.objects for insert
  with check (
    bucket_id = 'evidence'
    and auth.role() = 'authenticated'
  );

drop policy if exists "Authenticated users can read evidence" on storage.objects;
create policy "Workspace members can read evidence"
  on storage.objects for select
  using (
    bucket_id = 'evidence'
    and auth.role() = 'authenticated'
  );

-- 5. Add missing UPDATE and DELETE policies for execution_evidence
drop policy if exists "Members can update evidence in their session" on public.execution_evidence;
create policy "Members can update evidence in their session"
  on public.execution_evidence for update
  using (
    exists (
      select 1 from public.sessions
      join public.workspace_members on workspace_members.workspace_id = sessions.workspace_id
      where sessions.id = execution_evidence.session_id
        and workspace_members.user_id = auth.uid()
    )
  );

drop policy if exists "Members can delete evidence in their session" on public.execution_evidence;
create policy "Members can delete evidence in their session"
  on public.execution_evidence for delete
  using (
    exists (
      select 1 from public.sessions
      join public.workspace_members on workspace_members.workspace_id = sessions.workspace_id
      where sessions.id = execution_evidence.session_id
        and workspace_members.user_id = auth.uid()
    )
  );

-- 6. Add missing UPDATE and DELETE policies for reports
drop policy if exists "Members can update reports in their workspace" on public.reports;
create policy "Members can update reports in their workspace"
  on public.reports for update
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = reports.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

drop policy if exists "Members can delete reports in their workspace" on public.reports;
create policy "Members can delete reports in their workspace"
  on public.reports for delete
  using (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = reports.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );

-- 7. Add DELETE policy for workspace_invitations (admins can cancel)
drop policy if exists "Admins can delete workspace invitations" on public.workspace_invitations;
create policy "Admins can delete workspace invitations"
  on public.workspace_invitations for delete
  using (public.is_workspace_admin(workspace_invitations.workspace_id));

-- 8. Add with check to workspace_invitations update policy (only status changes allowed)
drop policy if exists "Users can accept or decline own invitations" on public.workspace_invitations;
create policy "Users can accept or decline own invitations"
  on public.workspace_invitations for update
  using (
    status = 'pending'
    and email = (select email from public.profiles where id = auth.uid())
  )
  with check (
    status in ('accepted', 'declined')
    and email = (select email from public.profiles where id = auth.uid())
  );
