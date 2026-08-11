-- 017: fix account deletion when the user has test cases
--
-- Deleting a user cascades: auth.users → sessions → test_cases. The
-- trg_test_case_activity DELETE branch then inserts into activity_log with
-- the already-deleted session id (and deleted user id), violating
-- activity_log_session_id_fkey → the whole delete fails with a 500.
--
-- Fix: skip the activity insert when the session row is already gone.
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
    if exists (select 1 from public.sessions where id = old.session_id) then
      insert into public.activity_log (session_id, user_id, action, details)
      values (old.session_id, v_user_id, 'test_case_deleted',
        jsonb_build_object('test_case_id', old.id, 'title', old.title));
    end if;
    return old;
  end if;
end;
$$;
