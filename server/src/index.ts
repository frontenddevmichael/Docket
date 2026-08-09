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
app.use('/api', accountRouter)

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

app.listen(PORT, () => {
  log(`Docket server running on http://localhost:${PORT}`)
})
