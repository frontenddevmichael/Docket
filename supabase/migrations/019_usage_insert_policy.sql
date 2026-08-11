-- 019_usage_insert_policy.sql
-- The server records generation usage through the caller's user-scoped client
-- (RLS enforced), so members need an INSERT policy on usage_events. The count
-- path already had a SELECT policy from migration 018.

create policy "Members can record workspace usage"
  on public.usage_events for insert
  with check (
    exists (
      select 1 from public.workspace_members
      where workspace_members.workspace_id = usage_events.workspace_id
        and workspace_members.user_id = auth.uid()
    )
  );
