-- =============================================================
-- Docket — Migration 009: Missing RLS Policies
-- =============================================================

-- 1. Lock profiles INSERT to service_role only (auto-created by trigger)
drop policy if exists "Service role can insert profiles" on public.profiles;
create policy "Service role can insert profiles"
  on public.profiles for insert
  with check (auth.role() = 'service_role');

-- 2. Lock workspaces INSERT and DELETE to service_role only (auto-created by trigger)
drop policy if exists "Service role can insert workspaces" on public.workspaces;
create policy "Service role can insert workspaces"
  on public.workspaces for insert
  with check (auth.role() = 'service_role');

drop policy if exists "Service role can delete workspaces" on public.workspaces;
create policy "Service role can delete workspaces"
  on public.workspaces for delete
  using (auth.role() = 'service_role');

-- 3. Lock activity_log UPDATE and DELETE to service_role only (append-only for users)
drop policy if exists "Service role can manage activity_log" on public.activity_log;
create policy "Service role can manage activity_log"
  on public.activity_log for update
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "Service role can delete activity_log" on public.activity_log;
create policy "Service role can delete activity_log"
  on public.activity_log for delete
  using (auth.role() = 'service_role');
