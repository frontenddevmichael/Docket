# Docket — Deployment Checklist & Runbook

Target topology: **one container** (Express API + built Vite SPA) + **managed Supabase**
(database, auth, storage). This keeps deployment to a single artifact with no CORS.

---

## 0. Pre-flight — what you must have before deploying

| Item | Status | Notes |
|---|---|---|
| Valid Supabase **service role key** | **REQUIRED — currently broken** | The key in `.env.local` returns `Invalid API key`. Generate a new one in Supabase → Settings → API → `service_role`. Without it, Projects, Issue Log, Generation and Account deletion return errors. |
| Valid Supabase URL + anon key | ✅ present | Already configured and working. |
| OpenRouter API key | ✅ present | Used for test-case generation (Gemini 2.5 Flash). |
| Resend API key | ⚠️ optional | Needed for invite/assign/reject/draft emails. Without it emails are logged, not sent. |
| Email domain + `EMAIL_FROM` | ⚠️ if using Resend | e.g. `Docket <noreply@yourdomain.com>` with the domain verified in Resend. |
| Database migrations applied | ⚠️ verify | `npx supabase link --project-ref <ref>` then `npx supabase db push`. Migrations `001–015` must all be applied. |
| Hosting account | REQUIRED | Docker-capable host: Render, Railway, Fly.io, or any VPS with Docker. (This repo has no existing hosting config; see step 3.) |
| `CLIENT_ORIGIN` set to the real production URL | REQUIRED | Used in email links. Without it emails point at `http://localhost:5175`. |
| `PUBLIC_API_URL` GitHub secret | ⚠️ | Powers the Uptime Monitor workflow (`.github/workflows/uptime.yml`). |

---

## 1. Local verification (do this first)

```bash
npm ci                       # root (concurrently)
cd client && npm ci && npm run typecheck && npm run test
cd ../server && npm ci && npm run typecheck
npm run typecheck            # from repo root — client + server
npm run build                # root — builds client (Vite) + server (tsc)
```

Expected: typecheck clean, **77 unit tests passing**, production build succeeds.

Smoke-test the production artifact locally (optional):

```bash
docker build -t docket:local .
docker run --rm -p 3001:3001 \
  -e NODE_ENV=production \
  -e SUPABASE_URL=... -e SUPABASE_SERVICE_ROLE_KEY=... -e SUPABASE_ANON_KEY=... \
  -e OPENROUTER_API_KEY=... \
  -e CLIENT_ORIGIN=http://localhost:3001 \
  docket:local
# then open http://localhost:3001 — SPA + /api/health should both respond
```

---

## 2. Database

1. Link the CLI: `npx supabase link --project-ref <your-project-ref>`
2. Apply migrations: `npx supabase db push` — confirms `001` through `015` (including the
   execution-depth and issue-log layers) are in place.
3. Verify storage buckets exist: `screenshots` and `evidence` (see `supabase/migrations/002_storage.sql`).
4. Confirm auth email settings (verification + password reset) point at the production URL,
   or use the SMTP block from `.env.example` with a verified sender.

> If you already applied migrations to the current project, run `npx supabase migration list`
> and make sure everything is marked as applied — none of the new tables (projects, issues,
> blockers, observations) may be missing.

---

## 3. Build & deploy the container

Pick one host. All of them just run the `Dockerfile`.

### Option A — Render (easiest)
1. Push this repo to GitHub.
2. Render → New → **Web Service** → connect the repo.
3. Settings:
   - Runtime: **Docker** (Render auto-detects the `Dockerfile`).
   - Port: `3001`.
   - Health check path: `/api/health`.
4. Add env vars (see table below). Save → deploy.

### Option B — Railway
1. New Project → Deploy from repo → configure:
   - Root directory: repo root; Railway auto-detects the `Dockerfile`.
   - Port: `3001`.
   - Healthcheck: `/api/health`.
2. Add env vars → deploy.

### Option C — Fly.io
```bash
fly launch --no-deploy        # generates fly.toml from the Dockerfile
fly secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... # ... etc
fly deploy
```

### Option D — any VPS with Docker
```bash
docker build -t docket .
docker run -d --restart unless-stopped -p 80:3001 --env-file .env.production docket
```

### Required environment variables (all hosts)

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | ✅ | set to `production` (Dockerfile sets it) |
| `PORT` | ⚠️ | optional; defaults to `3001` |
| `SUPABASE_URL` | ✅ | project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **must be a freshly rotated key** |
| `SUPABASE_ANON_KEY` | ✅ | same anon key used by the client |
| `OPENROUTER_API_KEY` | ✅ | AI generation |
| `CLIENT_ORIGIN` | ✅ | public app URL (email links) |
| `RESEND_API_KEY` | optional | transactional email |
| `EMAIL_FROM` | optional | sender address |
| `FIGMA_ACCESS_TOKEN` | optional | Figma import |
| `GITHUB_TOKEN` | optional | GitHub PR import |

Note: `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` are baked into the client bundle at
build time, so they must be present as **build-time** secrets if the host rebuilds the image
(the Dockerfile compiles the client during the build). The runtime vars above are for the API.

---

## 4. Post-deploy verification (send-to-client gate)

- [ ] `GET https://<app>/api/health` returns `{"status":"ok",...,"serviceRoleOk":true}`
      — `serviceRoleOk:false` means the Supabase service_role key is invalid; the server
      **refuses to boot in production** until it's rotated (see §2). Emergency bypass:
      `SUPABASE_SKIP_KEY_CHECK=1` (never ship with this set).
- [ ] Marketing page loads; `/sign-in`, `/sign-up` render
- [ ] Create an account → workspace is created automatically
- [ ] New Session → upload screenshot + requirements → **Generate** produces test cases
      (exercises OpenRouter + service role + storage)
- [ ] Execute page: mark a case Pass/Fail → evidence upload works (storage bucket)
- [ ] Report page: Generate Report → PDF export works
- [ ] Projects → New Project → appears in list (exercises service role)
- [ ] Issue Log opens on a project with failed cases
- [ ] Invite a teammate by email → invitation row appears (Resend email if configured)
- [ ] Emails: invitation / assignment links point at the production URL, not localhost
- [ ] Uptime Monitor: add `PUBLIC_API_URL`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` as
      GitHub secrets so `.github/workflows/uptime.yml` starts reporting every 15 min

---

## 5. Rollback

- Render/Railway/Fly: redeploy the previous image/tag (all deploys are immutable builds).
- Database: migrations are additive (`001–015`); no data-mutating backfills exist, so a
  rollback is safe. Never `supabase db reset` on production.
- Storage: screenshots/evidence are never deleted by rollbacks.

---

## 6. Known items that require owner action (cannot be done from code)

1. **Rotate the Supabase service role key** and put the new value in `.env.local` and the host.
2. Choose a host (Render/Railway/Fly/VPS) and provide credentials if you want me to deploy.
3. (Optional) Add `RESEND_API_KEY` + verified sender for transactional email.
4. (Optional) Add PostHog key (`VITE_POSTHOG_KEY`) — analytics is currently disabled in the bundle.
5. (Optional) Add `VITE_SENTRY_DSN`-style config — Sentry is a dependency but not wired to a project.
