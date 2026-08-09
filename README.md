# Docket

AI-powered QA test management tool. Generate, organize, and execute test cases from requirements and screenshots.

## Tech Stack

- **Frontend**: React 19, TypeScript 5, Tailwind CSS 4, Vite 8
- **Backend**: Express 4, Supabase (PostgreSQL + Auth + Storage)
- **AI**: OpenRouter (Gemini 2.5 Flash)
- **Infrastructure**: Supabase

## Getting Started

### Prerequisites

- Node.js 20+
- Supabase project (free tier works)

### Setup

1. Clone the repo
2. Copy `.env.example` to create config files:

```bash
cp .env.example client/.env.local
cp .env.example server/.env.local
```

3. Fill in your Supabase project credentials and API keys
4. Install dependencies:

```bash
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
# Terminal 1: Server
cd server && npm run dev

# Terminal 2: Client
cd client && npm run dev
```

The client runs on `http://localhost:5175`, the API on `http://localhost:3001`.

## Features

- AI-powered test case generation from requirements text + screenshots
- Drag-and-drop test case organization
- Manual test case creation and editing
- Test execution tracking (pass/fail/blocked)
- Team collaboration via workspace invitations
- Activity timeline for each session
- PDF and JSON report generation
- Figma, GitHub PR, API spec, and source code import

## Database Migrations

Migrations are in `supabase/migrations/`. Apply with:

```bash
npx supabase db push
```

## Architecture

- **Client** (`client/`): Vite SPA that talks to Supabase directly for most queries (RLS-protected)
- **Server** (`server/`): Express API for operations requiring service_role (screenshots, AI generation, workspace admin)
- **Auth**: Supabase Auth with JWT tokens verified server-side
