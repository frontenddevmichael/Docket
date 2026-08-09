-- =============================================================
-- Docket — Migration 012: Storage Cleanup on Session Delete
-- =============================================================

-- Update delete_session to also remove storage objects
create or replace function public.delete_session(
  p_session_id uuid
)
returns void
language plpgsql
security definer set search_path = ''
as $$
declare
  v_screenshot_path text;
  v_evidence_path text;
begin
  -- 1. Capture storage paths before CASCADE deletes remove the rows

  -- Get screenshot path from the session itself
  select screenshot_path into v_screenshot_path
  from public.sessions
  where id = p_session_id;

  -- 2. Delete screenshot from storage
  if v_screenshot_path is not null then
    delete from storage.objects
    where bucket_id = 'screenshots'
      and name = v_screenshot_path;
  end if;

  -- 3. Delete evidence screenshots from storage
  --    evidence screenshot_url is a full public URL; extract the path after '/evidence/'
  for v_evidence_path in
    select
      case
        when screenshot_url is not null then
          split_part(screenshot_url, '/evidence/', 2)
        else null
      end
    from public.execution_evidence
    where session_id = p_session_id
  loop
    if v_evidence_path is not null then
      delete from storage.objects
      where bucket_id = 'evidence'
        and name = v_evidence_path;
    end if;
  end loop;

  -- 4. Log the deletion
  insert into public.activity_log (session_id, user_id, action, details)
  values (p_session_id, auth.uid(), 'session_deleted', '{}'::jsonb);

  -- 5. Delete session (CASCADE handles test_cases, execution_evidence, reports)
  delete from public.sessions where id = p_session_id;
end;
$$;
