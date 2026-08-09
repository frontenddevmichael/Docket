# Input Expansion Design — Figma, GitHub PR, API Specs, Source Code

## 1. Overview

Extend Docket's input sources beyond screenshot + requirements to support four new input types: Figma links, GitHub pull request URLs, API specifications (OpenAPI/Swagger), and source code archives. Each type is entirely optional — any combination works as long as at least one input is selected.

## 2. Wizard UI — 3 Steps

The existing two-panel single-form layout on NewSession is replaced with a concise 3-step wizard:

### Step 1 — What are you testing?

- Session title field at the top
- A grid of input-type cards, none preselected. User taps the ones they want.
- Each card shows: type name, icon, one-line description
- Types: Screenshot, Figma, GitHub PR, API Spec, Source Code, Requirements
- "Next" button enabled when at least one type is selected

### Step 2 — Fill in details

- Only the selected types render. Each type shows its configuration fields in a compact card.
- Screenshot: upload area (PNG/JPEG/WebP) or URL field for Playwright capture
- Figma: Figma share URL field
- GitHub PR: GitHub PR URL field
- API Spec: URL field or file upload (YAML/JSON)
- Source Code: file upload (zip)
- Requirements: textarea or file upload (.txt, .md, .csv)
- "Back" returns to Step 1, "Next" proceeds to Step 3

### Step 3 — Launch

- Summary list: one line per selected type with a brief status indicator
- Title displayed for confirmation
- "Generate Test Cases" primary button
- Submitting triggers the same flow as today: session created → navigate to session detail → generation begins

## 3. Database

New `session_inputs` table:

```sql
create table session_inputs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  type text not null check (type in ('screenshot', 'requirements', 'figma', 'github_pr', 'api_spec', 'source_code')),
  label text,
  data jsonb,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
```

Each `data` JSONB payload per type:

- **figma**: `{ fileKey, renderedScreenshotUrl, textLayers: [{ id, name, characters }] }`
- **github_pr**: `{ owner, repo, prNumber, description, changedFiles: [], diff }`
- **api_spec**: `{ endpoints: [{ path, method, summary, params }], schemas: [] }`
- **source_code**: `{ fileCount, languages: [], fileTree }` — contents too large, only structure
- **screenshot**: `{ screenshotUrl, screenshotPath }` — mirrors sessions table columns
- **requirements**: `{ text }` — mirrors sessions table columns

The existing `sessions` columns (`screenshot_url`, `screenshot_path`, `requirements_text`) are kept for backward compatibility. When a screenshot or requirements input is provided via the wizard, it's written to both the column and the `session_inputs` row to avoid breaking existing reports and queries.

Milestone C (team/multi-user) will need a `workspace_id` on this table, but per the PRD, it's added when team features are built.

## 4. Server Endpoints

Each new input type has a dedicated extraction endpoint. All are `POST`, all accept a URL or file, all validate input and return parsed data.

### POST /api/figma

**Input:** `{ url: string }`
**Process:**
1. Extract file key + optional node ID from the Figma share URL
2. Call Figma REST API `GET /v1/images/{fileKey}` with `node_id` to get rendered PNG URL
3. Download PNG and store in `screenshots` Supabase bucket
4. Call `GET /v1/files/{fileKey}` to extract text layers from the document tree
5. Filter to text nodes, collect `{ id, name, characters }` per node
**Output:** `{ screenshotUrl, textLayers: [] }`

### POST /api/github/pr

**Input:** `{ url: string }`
**Process:**
1. Parse GitHub PR URL into `{ owner, repo, prNumber }`
2. Octokit calls:
   - `GET /repos/{owner}/{repo}/pulls/{prNumber}` → title, body, changed files count
   - `GET /repos/{owner}/{repo}/pulls/{prNumber}/files` → list of changed files with status
   - `GET /repos/{owner}/{repo}/pulls/{prNumber}.diff` → raw diff text
3. If diff exceeds 50KB, truncate to first 50KB and include a note about truncation
**Output:** `{ description, changedFiles: [], diff }`
**Auth:** Server uses a single GitHub token (environment variable) for public repos. Private repo support requires user OAuth — not included in this phase.

### POST /api/api-spec

**Input:** `{ url?: string, file?: binary }` (multipart, one required)
**Process:**
1. Accept OpenAPI 3.x YAML/JSON or Swagger 2.x
2. Parse with a spec parser (e.g., `swagger-parser` or manual js-yaml + json parsing)
3. Extract: `info.title`, `paths` → `[{ path, method, summary, parameters, requestBody? }]`, `components.schemas` → schema names and types
**Output:** `{ title, version, endpoints: [], schemas: [] }`

### POST /api/source-code

**Input:** `{ file: binary }` (multipart, zip only)
**Process:**
1. Extract zip to temp directory
2. Build file tree (paths only, no content for files > 100KB)
3. Detect languages by extension (`.ts`, `.js`, `.py`, `.go`, `.rs`, etc.)
4. Count total files
5. Read first 2000 chars of any file under 100KB that looks like source code (for AI context)
6. Clean up temp files
**Output:** `{ fileCount, languages: [], fileTree, snippets: [{ path, content }] }`

### Modified POST /api/generate

No API surface change. The endpoint reads `session_inputs` for the session and constructs the AI prompt based on which input types are present. The existing `screenshot_url` and `requirements_text` fields on `sessions` are still used when present.

Prompt construction strategy per input type:
- **screenshot / figma**: image provided to vision model
- **requirements / figma textLayers / github_pr.description / api_spec**: text context added to the system prompt
- **github_pr.diff / source_code.snippets**: code context, appended as "Source material: the following code was provided..."

If both screenshot and Figma are present, the Figma rendered frame takes priority as the visual input (it's the design source of truth).

## 5. Client Changes

### NewSession.tsx — wizard rewrite

- The current two-panel form is replaced with the 3-step wizard
- Step state managed locally: `step: 1 | 2 | 3`
- Selected types stored as a `Set<string>` or `string[]`
- Configuration per type stored in a `Record<string, any>` keyed by type name
- On Step 2, each selected type renders its config card in order
- "Back" preserves all selections

### Submission flow

All extraction calls happen at Step 3 submission time, not during Step 2 configuration. Exact sequence:

1. User clicks "Generate Test Cases" in Step 3
2. Client calls extraction endpoints in parallel for each selected type (e.g., `/api/figma`, `/api/github/pr`). Each shows its own loading status inline
3. Extraction endpoints return structured data. Any binary assets (rendered Figma frames, screenshots) are stored in Supabase storage by the endpoint
4. On all extractions succeeding, the client creates the session:
   - Inserts into `sessions` table with `title`, `screenshot_url` (from screenshot or Figma input), `requirements_text` (from requirements input)
   - Inserts one `session_inputs` row per selected type with the extraction data
5. Client navigates to `/sessions/{id}` — existing generation flow takes over
6. On any extraction failure, per-type error shown. Unaffected types succeed. User can retry the failed type

### Error states

- Per-type extraction failure: inline error below the failed type's card
- Network/timeout: retry button per type
- Invalid URL format: validated client-side before submission
- Rate limit (GitHub): clear message about the limit

## 6. Existing Flow Compatibility

The two-panel NewSession layout is replaced entirely. Screenshot and Requirements still appear in the type selector (positioned first in the grid) but are not preselected — the user chooses the combination they need.

Sessions created before this change remain fully viewable and functional. Their data lives in the `sessions` table columns and is displayed as before. The `session_inputs` table is backfilled for new sessions only.

## 7. Future Considerations

These are deliberately deferred but the architecture accounts for them:

- **Team workspace_id** on `session_inputs`: added when Milestone C begins
- **User OAuth for private GitHub repos**: new scope expands `POST /api/github/pr` to accept an OAuth token alongside the URL
- **Code file content indexing**: currently only snippets (first 2000 chars). Full-file context would require chunking + embedding
- **Figma Dev Mode API**: Figma has a newer "Dev Mode" API with better structured data — upgrade when it stabilizes
