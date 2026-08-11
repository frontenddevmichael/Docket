import express from 'express'
import helmet from 'helmet'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import multer from 'multer'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const _dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnv(filePath: string): Record<string, string> {
  try {
    const text = fs.readFileSync(filePath, 'utf-8')
    const env: Record<string, string> = {}
    for (const line of text.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eqIdx = trimmed.indexOf('=')
      if (eqIdx === -1) continue
      env[trimmed.slice(0, eqIdx).trim()] = trimmed.slice(eqIdx + 1).trim()
    }
    return env
  } catch {
    return {}
  }
}

for (const [key, value] of Object.entries(loadEnv(path.resolve(_dirname, '../../.env.local')))) {
  if (!process.env[key]) process.env[key] = value
}

import { verifyServiceRoleKey, serviceRoleStatus } from './lib/supabase-admin.js'
import screenshotRouter from './routes/screenshot.js'
import generateRouter from './routes/generate.js'
import trackingRouter from './routes/tracking.js'
import trackingStatsRouter from './routes/tracking-stats.js'
import loadingMessagesRouter from './routes/loading-messages.js'
import figmaRouter from './routes/figma.js'
import githubPrRouter from './routes/github-pr.js'
import apiSpecRouter from './routes/api-spec.js'
import sourceCodeRouter from './routes/source-code.js'
import workspaceRouter from './routes/workspace.js'
import projectsRouter from './routes/projects.js'
import issueLogRouter from './routes/issue-log.js'
import accountRouter from './routes/account.js'

const app = express()
const PORT = process.env.PORT ?? 3001

const missingVars: string[] = []
if (!process.env.OPENROUTER_API_KEY) missingVars.push('OPENROUTER_API_KEY')
if (!process.env.SUPABASE_URL) missingVars.push('SUPABASE_URL')
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) missingVars.push('SUPABASE_SERVICE_ROLE_KEY')
if (!process.env.RESEND_API_KEY) missingVars.push('RESEND_API_KEY')

if (missingVars.length > 0) {
  console.warn(`WARNING: Missing env vars: ${missingVars.join(', ')}`)
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('FATAL: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required. Server cannot function without a database.')
  process.exit(1)
}

console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? 'present' : 'not set')
console.log('Supabase:', 'configured')
console.log('Resend:', process.env.RESEND_API_KEY ? 'configured' : 'not set (emails will be logged)')

function parseOrigin(origin: string | undefined): string | string[] {
  if (!origin) return ['http://localhost:5173', 'http://localhost:5175']
  if (origin.includes(',')) return origin.split(',').map(s => s.trim())
  return origin
}

app.use(helmet({ contentSecurityPolicy: false }))
app.use(cors({ origin: parseOrigin(process.env.CLIENT_ORIGIN) }))
app.use(express.json({ limit: '10mb' }))
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })

app.use((_req, res, next) => {
  res.setHeader('Referrer-Policy', 'same-origin')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()')
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')
  res.setHeader('Origin-Agent-Cluster', '?1')
  next()
})

app.use((req, res, next) => {
  res.setTimeout(30_000, () => {
    res.status(408).json({ error: 'Request timeout' })
  })
  next()
})

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    openRouterConfigured: !!process.env.OPENROUTER_API_KEY,
    // false when the service-role key is missing/invalid — every admin
    // route would then return 500. The uptime check can key off this.
    serviceRoleOk: serviceRoleStatus().ok,
  })
})

app.use('/api', rateLimit({
  windowMs: 60_000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({ error: 'Too many requests. Please try again shortly.' })
  },
}))

// ── Production: serve the built client from the same process ──
// In production the SPA is built into ../../client/dist (relative to dist/
// when compiled, or src/ when run via tsx). Serving it from Express keeps
// deployment to a single container and avoids CORS entirely — the client
// calls Supabase directly and this API via same-origin /api paths.
const clientDist = path.resolve(_dirname, '../../client/dist')
if (process.env.NODE_ENV === 'production' && fs.existsSync(clientDist)) {
  app.use(express.static(clientDist))
  app.get('*', (req, res, next) => {
    // API paths keep their own handlers; anything else falls back to the SPA.
    if (req.path.startsWith('/api')) return next()
    res.sendFile(path.join(clientDist, 'index.html'))
  })
}

app.use('/api', screenshotRouter)
app.use('/api', generateRouter)
app.use('/api', trackingRouter)
app.use('/api', trackingStatsRouter)
app.use('/api', loadingMessagesRouter)
app.use('/api', figmaRouter)
app.use('/api', githubPrRouter)
app.use('/api', apiSpecRouter)
app.use('/api', sourceCodeRouter)
app.use('/api', workspaceRouter)
app.use('/api', projectsRouter)
app.use('/api', issueLogRouter)
app.use('/api', accountRouter)

// Final error handler — sync throws from any route land here instead of
// crashing the process. Returns a generic message (no internals leaked).
app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Not found' })
})
app.use('/api', (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[api] unhandled error:', err)
  res.status(500).json({ error: 'Internal server error' })
})

// Keep the process alive and observably unhealthy rather than dying silently
// on a stray async failure. Logging the error is enough for the uptime/health
// check to be useful, and the process-level guard prevents total downtime.
process.on('unhandledRejection', (reason) => {
  console.error('[process] unhandledRejection:', reason)
})
process.on('uncaughtException', (err) => {
  console.error('[process] uncaughtException:', err)
})

const logPath = path.resolve(_dirname, '../server.log')
let logStream: fs.WriteStream | null = null
try {
  logStream = fs.createWriteStream(logPath, { flags: 'a' })
  logStream.on('error', (err) => {
    console.error(`[log-stream error] ${err.message}`)
  })
} catch (err) {
  console.error(`[log-stream] Failed to open log file: ${err}`)
}
function log(msg: string) {
  const line = `[${new Date().toISOString()}] ${msg}\n`
  console.log(msg)
  if (logStream) {
    logStream.write(line, (err) => {
      if (err) console.error(`[log-stream write error] ${err.message}`)
    })
  }
}

// Boot-time credential check: an invalid service-role key silently 500s every
// admin-backed route. In production refuse to boot so the deploy fails fast;
// in dev log loudly (the /api/health serviceRoleOk flag stays visible either way).
// SUPABASE_SKIP_KEY_CHECK=1 bypasses the gate for emergency ops while rotating keys.
const { ok: serviceRoleOk, detail: serviceRoleDetail } = await verifyServiceRoleKey()
if (!serviceRoleOk && process.env.SUPABASE_SKIP_KEY_CHECK !== '1') {
  console.error('WARNING: Supabase service-role key check FAILED — admin routes (/api/projects, /api/issue-log, /api/generate, /api/account, workspace admin ops) will return 500.')
  console.error(`  detail: ${serviceRoleDetail}`)
  console.error('  Fix: Supabase Dashboard → Settings → API keys → rotate service_role, then update .env.local (and the host env).')
  if (process.env.NODE_ENV === 'production') {
    console.error('FATAL: refusing to boot in production with an invalid service-role key.')
    process.exit(1)
  }
}

app.listen(PORT, () => {
  log(`Docket server running on http://localhost:${PORT} (serviceRoleOk=${serviceRoleOk})`)
})
