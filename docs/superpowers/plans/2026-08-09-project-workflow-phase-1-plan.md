# Implementation Plan — Phase 1: Project & Workflow Layer

Source spec: `docs/superpowers/specs/2026-08-09-project-workflow-design.md`
Date: 2026-08-09

## 0. Scope

Add the generalized project + request→assign→accept/reject workflow on top of Docket's existing session-centric AI test-case flow. Approach A: projects wrap existing sessions. Multiple sessions per project allowed. Docket design language retained (single amber signal).

**In scope (Phase 1):**
- `projects` data model, status lifecycle, RLS, requests (Project Setup → View Request → assign → accept/reject with reason).
- Generalized roles `owner | admin | manager | tester | developer | viewer`.
- Server `projects` routes; client pages `/projects`, `/projects/new`, `/projects/assign`, `/projects/my`, `/projects/:id`; role-gated nav; CSV export helper.

**Out of scope (later phases per spec):** execution status expansion / severity-priority / test matrix (2), issue log + save-draft email (3), report sign-off + share + failure-distribution (4), Azure SSO, FCMB/EazyPM specifics.

## 1. Constraints & existing patterns to follow

- Migrations: plain SQL in `supabase/migrations/`, text + `check` constraints (no enums), `uuid_generate_v4()` style from `001_initial_schema.sql` / `gen_random_uuid()` from 004+. Use `gen_random_uuid()` (later style).
- RLS helpers are `SECURITY DEFINER` SQL functions (`is_workspace_member`, `is_workspace_admin` in `005`/`006`).
- Server routes: Express `Router` + `router.use(requireAuth)` (`server/src/lib/auth-middleware.ts`); `req.userId` = caller, `req.supabase` = **user-scoped client (RLS applies)**, `supabaseAdmin` (`server/src/lib/supabase-admin.ts`) = **service role** for privileged writes. App-level role checks in handlers.
- Client: TanStack Query hooks calling `apiGet/apiPost/apiPatch` (`client/src/lib/api.ts` with `fetchWithAuth`), forms via react-hook-form, pages under `client/src/pages/`, components under `client/src/components/`, types in `client/src/types/database.ts`.
- Role reconciliation (differs from spec §3 only in wording): existing DB already allows `owner | admin | tester | member` (migration 005) and invite role check `admin | tester | member` (migration 007). Phase 1 final set is `owner | admin | manager | tester | developer | viewer`; backfill existing `member` rows → `tester`.
- Repo is not a git repo → no commit steps.

## 2. Build steps

### Step A — Migration `supabase/migrations/013_project_workflow.sql`

Create:
1. `projects` table exactly per spec §4 (columns, `status` check with the full lifecycle, indexes `(workspace_id)`, `(status)`, `(assigned_tester)`).
2. `sessions.project_id uuid references projects(id) on delete set null` + index `(project_id)`.
3. `is_workspace_manager(workspace_id uuid)` SQL helper: exists membership with `role in ('owner','admin','manager')`.
4. Widen `workspace_members.role` check to `('owner','admin','manager','tester','developer','viewer')` AND backfill: `update workspace_members set role='tester' where role='member';`.
5. Widen `workspace_invitations.role` check + default to the same six values; backfill `member`→`tester`.
6. RLS on `projects`: enable; **select** for workspace members (`is_workspace_member`), **insert** for members, **no** update/delete policies (state transitions go through the server with service role; keeps the existing privileged-write pattern).

Verify: `npx supabase db push` (if project linked) or review SQL. Confirm against `012_storage_cleanup_rpc.sql` naming for any convention.

### Step B — Server `server/src/routes/projects.ts`

New router using `requireAuth`, `supabaseAdmin` for writes, `req.supabase` for member-scoped reads. Handlers:

| Endpoint | Behavior | Permission |
|---|---|---|
| `GET /api/projects` | workspace projects + status counts, `?status=` `?search=` `?page=` filters; tester sees own-assigned + requested first | owner/admin/manager see all; tester sees own; viewer read-only |
| `GET /api/projects/my` | projects with `assigned_tester = userId` | member |
| `GET /api/projects/:id` | full project incl. first-session requirements (`session_inputs` via project's first session) | workspace member |
| `POST /api/projects` | create request (`status='requested'` default; manager/admin may set `assigned_tester` → `'assigned'`) | workspace member |
| `PATCH /api/projects/:id` | update fields; `assign_tester` sets `assigned_tester` + `status='assigned'` | owner/admin/manager for assign/status; creator for draft edits |
| `POST /api/projects/:id/accept` | `status='accepted'`; creates the project's first `sessions` row (title = project name, requirements_text from request's requirement input if provided) | `assigned_tester` |
| `POST /api/projects/:id/reject` | `status='rejected'` + `rejection_reason` (required body field) | `assigned_tester` |

Guard rails: 400 on missing required fields; 403 on wrong role; 404 on not-found/not-in-workspace; consistent try/catch + `console.error` logging matching `workspace.ts`. Attach `profiles` (`full_name`, `email`) for `assigned_tester`/`created_by`/`requested_by` (reuse the `attachProfiles` pattern from `workspace.ts:6`).

### Step C — `server/src/index.ts`

Import and mount: `app.use('/api', projectsRouter)` alongside the other routers (after `workspaceRouter`). No env additions.

### Step D — `server/src/lib/email.ts`

Add `sendProjectAssigned(...)` (tester gets project link) and `sendProjectRejected(...)` (creator/manager gets notification with reason). Mirror existing `sendWorkspaceInvitation` structure including the "Resend not configured → log" fallback. New senders are fire-and-forget (`void`), never block responses.

### Step E — Role whitelists in `server/src/routes/workspace.ts`

- Line 71 / 200 / 346 / 391: `['owner','admin']` stays (admins manage members) — no change.
- Line 108 invite role map: `['admin','manager','tester','developer','viewer'].includes(role) ? role : 'tester'` (default becomes `tester`).
- Line 336 PATCH member role validation: same six-role list; drop `member`.
- Invitation accept path (`role: invitation.role`) is already generic — no change.

### Step F — Client persistence type `client/src/types/database.ts`

Regenerate from the new schema (or hand-edit): add `Project`/`Projects` table types (`Tables<'projects'>`, interfaces `Project`, plus `ProjectWithProfiles` extending with `assigned_tester`, `created_by`, `requested_by` profile objects). Update `WorkspaceMember.role` union to the six roles. Keep the file consistent with the existing `Database` shape.

### Step G — Client API layer

Add to `client/src/pages/Projects`-supporting hooks:
- `client/src/lib/export.ts` — `csvFromRows<T>(rows, columns)` helper (quoted values, CRLF, UTF-8 BOM so Excel renders correctly) + `downloadCsv(filename, csv)`.
- `client/src/hooks/useProjects.ts` — Query hooks: `useProjects(filters)`, `useProject(id)`, `useMyProjects()` with TanStack Query (`queryKey` per filter), plus mutations `useCreateProject`, `useAssignProject`, `useAcceptProject`, `useRejectProject` (invalidate `['projects']` on success). Follow `useSessions.ts` / `useDeleteSession.ts` shapes.
- `client/src/hooks/useRole.ts` — fetches current user's workspace role (`GET /api/workspace/members` → find own membership) → `{ role }`; used by gated nav.

### Step H — Shared components

- `client/src/components/StatusBadge.tsx` — project status tube (`draft/requested/assigned/accepted/rejected/in_progress/on_hold/uat/completed`) using neutral + amber tokens and a supporting glyph (per spec §6). Pure + unit-testable.
- `client/src/components/ProjectsTable.tsx` — reusable table (columns: name, overview, business segment, delivery category, test type, tester, status, start/target dates, actions `View`, per-role `Assign`); enables search/filter/export via props. Uses `StatusBadge`.

### Step I — Pages

1. `client/src/pages/ProjectOverview.tsx` (`/projects`) — status-count grid (requested/assigned/ongoing/on-hold/uat/completed), search-by-name, filter-by-column+date, CSV export, role-aware rows + View. Mirrors `Dashboard.tsx` layout patterns.
2. `client/src/pages/ProjectSetup.tsx` (`/projects/new`) — react-hook-form create-request: name, overview, project_type (web/mobile/api/ussd/other), business_segment, business_impact, delivery_category (new/enhancement/bug_fix), test_type, start/target dates, stakeholders (jsonb). Submit → `useCreateProject` → navigate to `/projects/:id`.
3. `client/src/pages/AssignProjects.tsx` (`/projects/assign`) — manager page: requested/assigned inbox, `Assign tester` dropdown from workspace members (tester/developer roles), calls `useAssignProject`.
4. `client/src/pages/MyProjects.tsx` (`/projects/my`) — tester's assigned list (rows → View).
5. `client/src/pages/ProjectDetail.tsx` (`/projects/:id`) — detail fields + requirement attachments (from first session's `session_inputs`); gates **Generate Test Cases** to assigned tester on accepted project; **Reject** opens a required-reason form. Active-session test-case table reuses `SessionReview` via an embedded link/panel; Execute links to `/sessions/:sessionId/execute`.

Page titles via `useDocumentTitle`; loading/error/empty states consistent with existing pages.

### Step J — `client/src/App.tsx`

Add routes under the `AuthGuard` layout children: `/projects` → ProjectOverview, `/projects/new` → ProjectSetup, `/projects/assign` → AssignProjects, `/projects/my` → MyProjects, `/projects/:id` → ProjectDetail. Import pages eagerly (like Dashboard) or lazily where framer-motion is needed.

### Step K — Role-gated nav `client/src/components/Layout.tsx`

- Extend `navItems` with Projects → `/projects`; add conditional items from `useRole()`: Assign Projects (`/projects/assign`, manager+), My Projects (`/projects/my`, tester), Manage Users already under Settings (admin-only toggle optional this phase).
- Apply gating to desktop top nav, sidebar, and mobile drawer consistently. `isActive` update for new paths (`'/' prefix` matching already works for `/projects...`).

### Step L — Tests

- `client/src/test/export.test.ts` — CSV escaping, BOM, column subsetting.
- `client/src/test/StatusBadge.test.tsx` — renders each status with expected label/glyph.
- `client/src/test/ProjectsTable.test.tsx` — renders rows, action visibility per role prop.
- Route/nav smoke: as needed for gated items.
- No server test harness exists; validate projects routes manually via `curl`/`test-route.mjs` pattern with real token (documented under verification).

## 3. Verification

Run after Steps A–E (server side) and again after all steps:
```
npm run typecheck:client
npm run typecheck:server
npm run lint
npm run test        # client vitest
npm run build       # client: tsc -b && vite build; server: tsc
```
Manual API smoke (server running): create a project (member), assign as manager (403 as tester), accept/reject as assigned tester, confirm rejected reason is stored.

Manual UI smoke: sign in → `/projects` shows counts → create request → as manager assign to tester → switch user → `/projects/my` shows project → accept → generate test cases via existing session flow → reject path returns validation on empty reason.

Confirm no regressions in existing flows: `/sessions`, `/sessions/new`, `/settings`, workspace invites (role list change).

## 4. Notes / follow-ups

- Spec §2 traceability matrix item 5 (severity/priority columns) is Phase 2 — ProjectDetail intentionally does not add those columns in Phase 1.
- Severity/priority fixed vocabulary decided at Phase 2 planning (`critical|high|medium|low` / `high|medium|low`).
- Duplicate-project-as-child (`parent_project_id`) deferred to Phase 2 per spec §9.
- Legacy untethered sessions (no `project_id`) remain accessible via existing `/sessions` routes; no forced migration this phase.