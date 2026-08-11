-- =============================================================
-- Docket — Migration 016: Account Deletion Cascades
-- =============================================================
-- Deleting a Supabase user failed with FK violations on several
-- auth.users references (e.g. workspaces.created_by), which made the
-- "Delete account" flow return 500 for any user with a workspace.
--
-- Ownership columns (created_by / executed_by / generated_by /
-- user_id / invited_by): CASCADE — deleting the account removes the
-- rows the user owns, matching the "permanently delete all data"
-- promise of account deletion.
--
-- Assignment/reference columns (assigned_tester / requested_by /
-- assigned_to / assigned_developer / owner): SET NULL — the row
-- survives and the reference is cleared instead of the row vanishing
-- from a shared workspace.

-- Ownership → cascade
alter table public.workspaces
  drop constraint if exists workspaces_created_by_fkey,
  add constraint workspaces_created_by_fkey foreign key (created_by)
    references auth.users(id) on delete cascade;

alter table public.sessions
  drop constraint if exists sessions_created_by_fkey,
  add constraint sessions_created_by_fkey foreign key (created_by)
    references auth.users(id) on delete cascade;

alter table public.test_cases
  drop constraint if exists test_cases_created_by_fkey,
  add constraint test_cases_created_by_fkey foreign key (created_by)
    references auth.users(id) on delete cascade;

alter table public.execution_evidence
  drop constraint if exists execution_evidence_executed_by_fkey,
  add constraint execution_evidence_executed_by_fkey foreign key (executed_by)
    references auth.users(id) on delete cascade;

alter table public.reports
  drop constraint if exists reports_generated_by_fkey,
  add constraint reports_generated_by_fkey foreign key (generated_by)
    references auth.users(id) on delete cascade;

alter table public.tracking_events
  drop constraint if exists tracking_events_user_id_fkey,
  add constraint tracking_events_user_id_fkey foreign key (user_id)
    references auth.users(id) on delete cascade;

alter table public.workspace_invitations
  drop constraint if exists workspace_invitations_invited_by_fkey,
  add constraint workspace_invitations_invited_by_fkey foreign key (invited_by)
    references auth.users(id) on delete cascade;

alter table public.projects
  drop constraint if exists projects_created_by_fkey,
  add constraint projects_created_by_fkey foreign key (created_by)
    references auth.users(id) on delete cascade;

alter table public.issues
  drop constraint if exists issues_created_by_fkey,
  add constraint issues_created_by_fkey foreign key (created_by)
    references auth.users(id) on delete cascade;

alter table public.blockers
  drop constraint if exists blockers_created_by_fkey,
  add constraint blockers_created_by_fkey foreign key (created_by)
    references auth.users(id) on delete cascade;

alter table public.observations
  drop constraint if exists observations_created_by_fkey,
  add constraint observations_created_by_fkey foreign key (created_by)
    references auth.users(id) on delete cascade;

-- Reference columns → set null
alter table public.projects
  drop constraint if exists projects_assigned_tester_fkey,
  add constraint projects_assigned_tester_fkey foreign key (assigned_tester)
    references auth.users(id) on delete set null;

alter table public.projects
  drop constraint if exists projects_requested_by_fkey,
  add constraint projects_requested_by_fkey foreign key (requested_by)
    references auth.users(id) on delete set null;

alter table public.sessions
  drop constraint if exists sessions_assigned_to_fkey,
  add constraint sessions_assigned_to_fkey foreign key (assigned_to)
    references auth.users(id) on delete set null;

alter table public.test_cases
  drop constraint if exists test_cases_assigned_developer_fkey,
  add constraint test_cases_assigned_developer_fkey foreign key (assigned_developer)
    references auth.users(id) on delete set null;

alter table public.issues
  drop constraint if exists issues_assigned_developer_fkey,
  add constraint issues_assigned_developer_fkey foreign key (assigned_developer)
    references auth.users(id) on delete set null;

alter table public.issues
  drop constraint if exists issues_owner_fkey,
  add constraint issues_owner_fkey foreign key (owner)
    references auth.users(id) on delete set null;
