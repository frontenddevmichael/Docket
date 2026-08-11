-- =============================================================
-- Docket — Migration 014: Execution Depth Layer
-- (spec §7 Phase 2 — QA Execute Test Cases / Test Matrix)
-- =============================================================

-- 1. Widen test_cases.status to the full execution vocabulary.
--    Existing 'not_run' is retained and maps to the spreadsheet's "Untested".
alter table public.test_cases
  drop constraint if exists test_cases_status_check,
  add constraint test_cases_status_check
    check (status in (
      'not_run', 'untested', 'pass', 'fail', 'blocked',
      'not_applicable', 'fixed', 'reopened', 'controlled_live', 'uat'
    ));

-- 2. Execution metadata columns on test_cases
alter table public.test_cases add column if not exists module text;
alter table public.test_cases add column if not exists submodule text;
alter table public.test_cases add column if not exists test_objective text;
alter table public.test_cases add column if not exists test_class text;
alter table public.test_cases add column if not exists test_data jsonb;
alter table public.test_cases add column if not exists test_environment text;
alter table public.test_cases add column if not exists severity text
  check (severity in ('critical', 'high', 'medium', 'low'));
alter table public.test_cases add column if not exists priority text
  check (priority in ('high', 'medium', 'low'));
alter table public.test_cases add column if not exists assigned_developer uuid references auth.users(id);
alter table public.test_cases add column if not exists executed_at timestamptz;

-- 3. Execution evidence gains environment + actual result
alter table public.execution_evidence add column if not exists environment text;
alter table public.execution_evidence add column if not exists actual_result text;

-- 4. Indexes for matrix rollups and issue-log drilling
create index if not exists idx_test_cases_status on public.test_cases(status);
create index if not exists idx_test_cases_module on public.test_cases(module);
create index if not exists idx_test_cases_severity on public.test_cases(severity);
create index if not exists idx_test_cases_assigned_developer on public.test_cases(assigned_developer);