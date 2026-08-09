-- =============================================================
-- Docket — Migration 010: Performance RPCs
-- =============================================================

-- 1. Batch reorder test cases — single call instead of N individual updates
create or replace function public.batch_reorder_test_cases(
  p_updates jsonb
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  item jsonb;
begin
  for item in select jsonb_array_elements(p_updates)
  loop
    update public.test_cases
    set sort_order = (item->>'sort_order')::int,
        updated_at = now()
    where id = (item->>'id')::uuid;
  end loop;
end;
$$;

-- 2. Delete session and all related data atomically (CASCADE handles DB rows,
--    but this ensures storage cleanup is also tracked)
create or replace function public.delete_session(
  p_session_id uuid
)
returns void
language plpgsql
security definer set search_path = ''
as $$
begin
  -- CASCADE deletes will handle: execution_evidence, reports, test_cases, activity_log
  -- We also need to track the deletion in activity_log before the session row disappears
  insert into public.activity_log (session_id, user_id, action, details)
  values (p_session_id, auth.uid(), 'session_deleted', '{}'::jsonb);

  delete from public.sessions where id = p_session_id;
end;
$$;

-- 3. Enable Realtime for activity_log (for live timeline updates)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'activity_log'
  ) then
    alter publication supabase_realtime add table public.activity_log;
  end if;
end
$$;
