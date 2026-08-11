# Docket

AI-powered QA test management tool. Generate, organize, and execute test cases from requirements, screenshots, project specs, and source context.

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS 4, Vite
- **Backend**: Express 4, Supabase (PostgreSQL + Auth + Storage)
- **AI**: OpenRouter (Gemini 2.5 Flash)
- **Infrastructure**: Supabase (managed) + one Docker container (API + SPA)

## Architecture

- **Client** (`client/`): Vite SPA. Talks to Supabase directly for most queries (RLS-protected) and to the Express API (same-origin `/api`) for privileged operations — screenshots, AI generation, workspace admin, projects, issue log.
- **Server** (`server/`): Express API. Uses the service-role key for operations RLS can't cover, and verifies user JWTs on every request.
- **Auth**: Supabase Auth with JWT tokens verified server-side.
- **Database**: migrations in `supabase/migrations/` (001–015).

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project (free tier works)
- OpenRouter API key

### Setup

1. Clone the repo
2. Create the env files (see `.env.example` for all keys):

```bash
# Server config — read by the Express server from the repo root
cp .env.example .env.local

# Client config — read by Vite (baked into the bundle at build time)
cp .env.example client/.env
```

3. Fill in values:

| File | Keys |
|---|---|
| `.env.local` (root) | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`, `OPENROUTER_API_KEY`, `CLIENT_ORIGIN`, optional `RESEND_API_KEY`, `EMAIL_FROM`, `FIGMA_ACCESS_TOKEN`, `GITHUB_TOKEN` |
| `client/.env` | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (same values as above) |

4. Install dependencies:

```bash
npm install                      # root (concurrently only)
cd client && npm install
cd ../server && npm install
```

5. Apply database migrations:

```bash
npx supabase link --project-ref your-project-ref
npx supabase db push
```

6. Start development servers:

```bash
# Terminal 1: API server (port 3001)
cd server && npm run dev

# Terminal 2: Client (Vite)
cd client && npm run dev
```

Or run both from the root with `npm run dev`. The client runs on
`http://localhost:5175` and proxies `/api` to the API on `http://localhost:3001`.

> Note: the Express server reads env from the root `.env.local` (not `server/.env.local`).
> If `PORT` is set in your shell, the API will bind to that instead of 3001 — run
> `PORT=3001 npm run dev` in `server/` if your shell exports `PORT`.

## Scripts (run from repo root)

```bash
npm run typecheck      # client + server
npm test               # client unit tests (77 tests)
npm run build          # client (Vite) + server (tsc)
npm run lint           # client (oxlint)
```

## Features

- AI-powered test-case generation from screenshots, requirements, Figma links, GitHub PRs, API specs, and source archives
- Project workflow: request → assign → accept/reject → generate → execute (Project Overview, Assign, My Projects, Detail)
- Execution depth: 8 statuses (Pass/Fail/Blocked/N-A/Fixed/Reopened/Controlled-Live/UAT), environment, severity, priority, developer assignment, Test Matrix & KPIs
- Issue Log per project: defect summary, distribution, blockers, observations with developer/PM comments, save-draft email handoff
- Drag-and-drop test case organization, bulk actions, duplicate
- Test execution tracking with evidence (screenshots + notes) and timestamps
- Editable report with verdict stamp, summary graph, requirements coverage, failure distribution, sign-off table, PDF export, share
- Team collaboration via workspace invitations and roles (owner/admin/manager/tester/developer/viewer)
- Dark mode, keyboard shortcuts, command palette

## Deployment

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full checklist and runbook.

Short version: build the root `Dockerfile` (it compiles the client and server into a single
image that serves both the SPA and the API on port 3001), point it at your Supabase project
with the env vars from `.env.example`, run the migrations, and verify the post-deploy
gate in the checklist.

## CI / Uptime

- `.github/workflows/ci.yml` — lint, typecheck, unit tests, Playwright smoke tests on push/PR.
- `.github/workflows/uptime.yml` — health-checks `/api/health` and Supabase every 15 min;
  opens a GitHub issue when the service is down. Requires `PUBLIC_API_URL`, `SUPABASE_URL`,
  and `SUPABASE_ANON_KEY` secrets.
