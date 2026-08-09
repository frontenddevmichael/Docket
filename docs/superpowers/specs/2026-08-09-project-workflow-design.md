# Docket Project & Workflow Layer — Design

Source input: `TEST MANAGEMENT TOOL PROJECT.xlsx` (17 sheets) compared against the existing Docket codebase (client/server/supabase/docs).

Status: Draft for review. Date: 2026-08-09.

## 1. Overview

Docket is currently a session-centric AI test-case generator: upload a screen + requirements → generate cases → execute → report. The spreadsheet designs a full project-and-defect management workflow around that core. This design adds that workflow layer in a **generalized, non-bank-specific** form — Docket branding and design language retained, FCMB/EazyPM/Azure specifics removed or deferred.

Decisions confirmed by the owner:
- **Generalized product** — adopt the workflow ideas, not the bank specifics.
- **Phase 1 = project layer + workflow**; execution depth, issue log, and reporting are follow-up phases.
- **Workflow preserved:** request → assign → accept/reject (with reason) → generate → execute.
- **Approach A — projects wrap existing sessions.** New `projects` table; `sessions` gain a nullable `project_id`. The existing generation → review → execute → report flow is unchanged, just scoped under a project. One project may hold one or many test sessions.
- **Multiple sessions per project is allowed** (projected default: first session created on accept).
- **Design language unchanged:** single amber signal, no spreadsheet status colors (PASS-green/Fail-red replaced by Docket's glyph + neutral/amber system per `design-direction.md`). Status differences are carried by text/glyph, not color.
- **Auth unchanged for Phase 1.** Existing Supabase email/password remains; Azure AD SSO is a follow-up (see Non-goals).

## 2. Full spreadsheet-to-codebase comparison (traceability matrix)

Existing assets verified and reused: `session_inputs` (attachments for PID/BRD/RD, Figma, user stories — the spreadsheet's "Project Requirement" section), `execution_evidence`, `reports`, `workspace_members`, Resend email wiring, and the whole AI generation pipeline.

| # | Spreadsheet sheet | On the ground today | Gap | Plan phase |
|---|---|---|---|---|
| 1 | Login Screen | Mismatch — email/password auth (`client/src/pages/SignIn.tsx`) | Azure AD SSO | Follow-up |
| 2 | Project Overview | Missing — `Dashboard.tsx` lists sessions, not projects | Project dashboard w/ status counts, list, search/filter/export | 1 |
| 3 | EazyPM Request (Assign Projects) | Missing | Request inbox + assign-to-tester (manager) | 1 |
| 4 | View Requests | Partial — `/sessions/:id` shows a session | Project request view, requirement attachments, Reject w/ reason | 1 |
| 5 | View Assigned Projects | Partial — `SessionReview.tsx` has edit/delete/add/execute | Severity/priority columns; Generate gating; duplicate | 1 + 2 |
| 6 | QA Execute Test Cases | Partial — `SessionExecute.tsx` pass/fail/blocked + evidence | 8 statuses, environment dropdown, severity/priority, matrix/KPIs, pagination, observations, save-draft email | 2 + 3 |
| 7 | My Projects | Missing | Tester's assigned-project list | 1 |
| 8 | Ongoing Projects | Missing | Project list filtered by status (admin) | 1 |
| 9 | Completed Project Screen | Missing | Project list filtered by status (admin) | 1 |
| 10 | Project Issue Log | Missing | Projects-with-defects list → Issue Log | 3 |
| 11 | Issue Log Screen | Missing | Defect summary/distribution/breakdown, blockers, observations | 3 |
| 12 | Report Screen / Preview | Partial — `SessionReport.tsx` verdict, summary, coverage, failures | Failure distribution, observations w/ dev+PM comments, blockers, sign-off, share | 4 |
| 13 | Sheet1 (Test Matrix) | Missing | Per-module matrix + quality KPIs | 2 |
| 14 | Sheet2 (team roster) | Not a screen | N/A — docs only | — |
| 15 | Sheet3 (screen index) | Not a screen | N/A — index | — |
| 16 | Project Setup Screen | Missing | Create-project/request form | 1 |

## 3. Roles and permissions

Current: `workspace_members.role` check allows `owner | member`; RLS uses `is_workspace_admin` / `is_workspace_member` functions (`supabase/migrations/006_fix_rls_recursion.sql`).

Generalized role set (spreadsheet role → new role):
- `owner` — full control (unchanged).
- `admin` — Manage Users; sees all lists (spreadsheet "Admin").
- `manager` — send/assign requests, approve work (spreadsheet "QA Lead").
- `tester` — view own requests, generate, reject w/ reason, execute (spreadsheet "QA Tester").
- `developer` — execute-screen writing, marks `fixed`, receives failed-TC mail (spreadsheet "Developer").
- `viewer` — read-only stakeholder (spreadsheet "PM / Stakeholders").

Migration mapping: existing `owner` stays `owner`; existing `member` broad-maps to `tester` (least disruption, tester covers the current single-user flow). Constraint updated to `role in ('owner','admin','manager','tester','developer','viewer')`.

Role-gating applies to client nav (`client/src/components/Layout.tsx`) and to project-level RLS + server endpoints (assign/reject/accept are permission-checked). Menu model follows the spreadsheet's role-visible menu lists (Assign Projects → manager+ only; Manage Users → admin only; QA Projects → tester).

## 4. Data model

Follows the existing pattern (text + `check` constraints, not Postgres enums) seen throughout `supabase/migrations/001_initial_schema.sql`.

### New table `projects` (migration `013_project_workflow.sql`)
```
id                uuid pk default uuid_generate_v4()
workspace_id      uuid not null references workspaces(id) on delete cascade
name              text not null
overview          text
project_type      text check in ('web','mobile','api','ussd','other')            -- generalized from "Select from Web/Mobile/API/USSD/Others"
business_segment  text                                                           -- free text (bank segments generalized away)
business_impact   text
delivery_category text check in ('new','enhancement','bug_fix')
test_type         text                                                           -- free text; spreadsheet uses API/UI/Performance
status            text not null default 'draft'
                  check in ('draft','requested','assigned','accepted',
                            'rejected','in_progress','on_hold','uat','completed')
assigned_tester   uuid references auth.users(id)
created_by        uuid not null references auth.users(id)
requested_by      uuid references auth.users(id)
stakeholders      jsonb default '[]'                                             -- [{name, email}]
start_date        date
target_end_date   date
end_date          date
rejection_reason  text
created_at        timestamptz not null default now()
updated_at        timestamptz not null default now()
```
Indexes: `(workspace_id)`, `(status)`, `(assigned_tester)`. RLS: members of the workspace can select; insert by members; update/delete restricted by role (manager+/owner for assign/status; tester for accept/reject on own assignment).

### Modified `sessions`
- Add nullable `project_id uuid references projects(id) on delete set null` (keeps untethered legacy sessions working).
- Add index `(project_id)`.

### Modified `workspace_members`
- Widen `role` check to the six roles above.

### Status lifecycle
`draft` → `requested` → `assigned` → `accepted` (→ `in_progress` → `uat` → `completed`, with `on_hold` anywhere in the active track) | `requested`/`assigned` → `rejected` (+ `rejection_reason`).
"Ongoing" on dashboards = `in_progress | on_hold | uat`; "Completed" = `completed`.

## 5. Server

New `server/src/routes/projects.ts` (mounted at `/api/projects` in `server/src/index.ts`):
- `GET /api/projects` — workspace projects with status counts + filters (`status`, `search`, `page`). Role-aware (tester sees own assignments + requested; manager/admin see all).
- `POST /api/projects` — create request (`draft`/`requested`); manager/admin may create directly assigned.
- `GET /api/projects/:id` — detail incl. requirement attachments (reuses `session_inputs` at project level via first session).
- `PATCH /api/projects/:id` — assign tester (manager+/owner/admin), update fields.
- `POST /api/projects/:id/accept` — tester accepts; creates the project's first session here.
- `POST /api/projects/:id/reject` — tester rejects w/ reason.
- `GET /api/projects/my` — projects assigned to the caller.

Existing endpoints unchanged. `POST /api/generate` (`server/src/routes/generate.ts`) gains prompt additions in Phase 2 to emit `module`, `submodule`, `test_objective`, `test_class`, `severity`, `priority`.

## 6. Client

### New pages + routes (added in `client/src/App.tsx`)
| Route | Page | Replaces / reuses | Spreadsheet sheet |
|---|---|---|---|
| `/projects` | ProjectOverview | `Dashboard` pattern; new count grid + table | Project Overview, Ongoing, Completed |
| `/projects/new` | ProjectSetup | `NewSession` form patterns | Project Setup Screen |
| `/projects/assign` | AssignProjects | — | EazyPM Request |
| `/projects/my` | MyProjects | — | My Projects |
| `/projects/:id` | ProjectDetail | embeds `SessionReview` for the active session; `NewSession` input for Generate; Reject dialog | View Requests, View Assigned Projects |
| `/projects/:id/issue-log` | IssueLog | Phase 3 | Issue Log |

Shared component additions:
- `client/src/components/ProjectsTable.tsx` — reusable project list row + View/Assign actions.
- `client/src/components/StatusBadge.tsx` — status tube using neutral/amber tokens + glyph alignments.
- `client/src/lib/export.ts` — CSV export helper (JSON→CSV, quoted, BOM for Excel); reused by all list screens. PDF/Excel export via existing print path / later server-side.

`Layout.tsx`: nav becomes role-gated per the menu model above; "Projects" becomes the primary rail group alongside the existing Sessions/Workspace.

`ProjectDetail` gates the Generate Test Cases button to accepted/assigned projects for the assigned tester; Reject shows a required-reason form. The active-session test-case table reuses `SessionReview`; Execute links to the existing `/sessions/:id/execute`.

## 7. Phase plan (item-by-item gap list)

### Phase 1 — Project layer & workflow
1. **Migration `013_project_workflow.sql`:** `projects` table + RLS + indexes; `sessions.project_id`; `workspace_members.role` widening; backfill note (existing rows → role `tester`).
2. **RLS helpers:** `is_workspace_manager(v space)` (admin/manager/owner) for assign/status writes.
3. **Server `projects.ts`** endpoints above, with permission checks and email notifications on assign/accept/reject (reuses `server/src/lib/email.ts`; add senders for assignment + rejection).
4. **Client:**
   - `ProjectOverview` (`/projects`) — count grid (by status), search (name), filter (all columns + date), CSV export, View per row, role-aware views.
   - `ProjectSetup` (`/projects/new`) — create request form.
   - `AssignProjects` (`/projects/assign`) — manager inbox (requested/assigned states), assign-from-tester-pool dropdown.
   - `MyProjects` (`/projects/my`) — assigned list for tester.
   - `ProjectDetail` (`/projects/:id`) — detail fields + requirement attachments + Generate/reject control.
   - Role-gated `Layout` nav.
5. **Types:** `client/src/types/database.ts` regeneration for `projects` + widened role.
6. **Tests:** vitest for `ProjectsTable`, status helpers, CSV export; component test for AssignProjects permission gating.
7. **Route / nav tests** and e2e smoke update (`client/e2e/signin.spec.ts` unaffected).

### Phase 2 — Execution depth (spreadsheet: QA Execute Test Cases, Test Matrix)
1. **Migration `014_execution_statuses.sql`:** widen `test_cases.status`. Final values: `untested | pass | fail | blocked | not_applicable | fixed | reopened | controlled_live | uat`. This covers the spreadsheet's 8 statuses (Pass, Fail, Untested, Not Applicable, Fixed, Reopened, Controlled Live, UAT) while keeping Docket's existing `blocked`. Data migration renames existing `not_run` → `untested` (same meaning, spreadsheet label). Add `module`, `submodule`, `test_objective`, `test_class`, `test_data`, `test_environment`, `severity`, `priority`, `assigned_developer`, `executed_at`.
2. **Generate prompt** (`generate.ts`): request + validate module/submodule/objective/class and severity/priority per case; prepopulate columns.
3. **Execute screen (`SessionExecute.tsx`):** environment dropdown (test/pilot/regression/production), status dropdown w/ Docket-styled indicators, severity/priority dropdowns, auto `executed_at` on any action, pagination 20/page.
4. **Test Matrix:** derived client-side per-module rollups + quality KPIs (% execution, target vs actual % completion, variance, defect rate, quality score), the static execution-screen table.
5. **Duplicate test case** (add to `SessionReview.tsx`) and duplicate-project-as-child (Phase 2 close).

### Phase 3 — Issue log (spreadsheet: Issue Log Screen, Project Issue Log)
1. **Migration `015_issue_log.sql`:** `issues` table (details, severity/priority, assigned developer, owner, dependency, status open/closed, dates, duration-of-impact) + `blockers` + `observations` tables.
2. **Pages:** `IssueLog` (`/projects/:id/issue-log`) with defect summary (total/fixed/ongoing/reopened/not-tested/NA), distribution (severity/priority of failed TCs), breakdown table; Project Issue Log (projects-with-defects list). Auto-save on all actions.
3. **Email workflow:** Save Draft by tester → mail developer on failed TCs; by developer → mail tester on fixed TCs; links back to the issue log (extend `email.ts`).

### Phase 4 — Reporting & utilities (spreadsheet: Report Screen)
1. **Report (`SessionReport.tsx`):** Failure Distribution (priority/severity), Observations w/ developer + PM/PO comment columns, Blockers section, Open Items, Sign-off table (unit/name/signature/date/concurrence/reason), Share button.
2. **Exports:** CSV/Excel on all project list screens (`lib/export.ts`); PDF via print path.
3. **Dashboard chart:** project summary pie chart (`/projects` count grid).

## 8. Non-goals (this design)

- **Azure AD SSO** — follow-up item; spreadsheets' login screen is not changed in Phase 1.
- **EazyPM/FCMB specifics** — no bank segments, work streams, or external intake integrations.
- **Automated test execution** — execution stays manual.
- **Source-code gap detection** — existing separate roadmap (`docket-prd.md` Milestone B).
- **Spreadsheet status colors** — Docket's single-amber + glyph system retained per `design-direction.md`.
- **Team billing / paid plans.**

## 9. Open items for implementation planning

- Backfill for existing sessions with no project: left untethered for now; a "create project from session" action may be added in Phase 1 if desired.
- Severity/priority values need a fixed vocabulary shared by the generation prompt and the UI dropdowns (recommended: `critical|high|medium|low` for severity; `high|medium|low` for priority).
- Duplicate-project-as-child relationships require a `parent_project_id` column — deferred to Phase 2 to keep Phase 1 schema minimal.