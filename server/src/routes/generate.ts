import { Router } from 'express'
import OpenAI from 'openai'
import { z } from 'zod'
import crypto from 'crypto'
import { supabaseAdmin, createUserClient } from '../lib/supabase-admin.js'
import type { SupabaseClient } from '@supabase/supabase-js'
import { generateLimiter } from '../lib/rate-limiter.js'
import { trackEvent } from '../lib/tracking.js'
import { logActivity } from '../lib/activity-log.js'
import { requireAuth } from '../lib/auth-middleware.js'

const testCaseSchema = z.object({
  title: z.string(),
  preconditions: z.string().nullable(),
  steps: z.array(z.string()),
  expected_result: z.string(),
  source_ref: z.string().nullable(),
  module: z.string().nullable(),
  submodule: z.string().nullable(),
  test_objective: z.string().nullable(),
  test_class: z.string().nullable(),
  test_data: z.string().nullable(),
  severity: z.enum(['critical', 'high', 'medium', 'low']),
  priority: z.enum(['high', 'medium', 'low']),
})

const generationSchema = z.object({
  test_cases: z.array(testCaseSchema),
})

interface InputData {
  type: string
  data: Record<string, unknown> | null
}

interface GenerationEntry {
  sessionId: string
  screenshotUrl?: string
  requirementsText: string
  inputs: InputData[]
  userId: string
  userJwt: string
  status: 'pending' | 'processing' | 'complete' | 'error'
  error?: string
  createdAt: number
  aborted: boolean
}

const generations = new Map<string, GenerationEntry>()

// Clean up stale entries every 5 minutes
setInterval(() => {
  const cutoff = Date.now() - 5 * 60 * 1000
  for (const [id, entry] of generations) {
    if (entry.createdAt < cutoff) generations.delete(id)
  }
}, 5 * 60 * 1000)

async function runGeneration(genId: string, entry: GenerationEntry) {
  const { sessionId, inputs, userId, userJwt } = entry
  const db: SupabaseClient = userJwt ? createUserClient(userJwt) : supabaseAdmin

  const screenshotInput = inputs.find(i => i.type === 'figma' || i.type === 'screenshot')
  const requirementsInput = inputs.find(i => i.type === 'requirements')
  const githubInput = inputs.find(i => i.type === 'github_pr')
  const apiSpecInput = inputs.find(i => i.type === 'api_spec')
  const sourceCodeInput = inputs.find(i => i.type === 'source_code')

  const screenshotUrl = screenshotInput?.data?.renderedScreenshotUrl as string
    ?? screenshotInput?.data?.screenshotUrl as string
    ?? entry.screenshotUrl
  const requirementsText = (requirementsInput?.data as any)?.text ?? entry.requirementsText

  try {
    entry.status = 'processing'

    if (entry.aborted) return

    await trackEvent({ userId, sessionId, eventType: 'generation_started' })

    await db
      .from('sessions')
      .update({ status: 'generating' })
      .eq('id', sessionId)

    if (entry.aborted) return

    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) {
      entry.status = 'error'
      entry.error = 'AI service not configured'
      return
    }

    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
    })

    let contextNotes = ''
    if (githubInput?.data) {
      const g = githubInput.data as any
      contextNotes += `\n\n--- GitHub PR context ---\nTitle: ${g.title ?? ''}\nDescription: ${(g.description ?? '').slice(0, 2000)}\nChanged files: ${(g.changedFiles ?? []).map((f: any) => f.filename).join(', ')}\nDiff:\n${(g.diff ?? '').slice(0, 3000)}`
    }
    if (apiSpecInput?.data) {
      const a = apiSpecInput.data as any
      contextNotes += `\n\n--- API Specification ---\n${a.title ?? ''} v${a.version ?? ''}\nEndpoints:\n${(a.endpoints ?? []).slice(0, 30).map((e: any) => `  ${e.method} ${e.path} — ${e.summary}`).join('\n')}`
    }
    if (sourceCodeInput?.data) {
      const c = sourceCodeInput.data as any
      contextNotes += `\n\n--- Source code context ---\nLanguages: ${(c.languages ?? []).join(', ')}\nTotal files: ${c.fileCount}\nCode snippets:\n${(c.snippets ?? []).slice(0, 10).map((s: any) => `--- ${s.path} ---\n${s.content.slice(0, 500)}`).join('\n')}`
    }

    const systemPrompt = `You are a QA engineer generating test cases from requirements and optionally screenshots, API specifications, PR diffs, and source code.

Generate 5 to 10 test cases. Keep each test case concise — short titles, 2-4 steps, 1-2 sentence expected results. Preconditions and source_ref can be null if not applicable.

For each test case you produce, you must:
1. Identify a specific behavior or state that can be tested
2. Reference the requirement that motivated it in the source_ref field
3. Write clear, actionable steps
4. Cover: expected behavior flows, unexpected/incorrect input, edge cases, and error states
5. Classify each case:
   - module: the feature area or screen this case exercises (e.g. "Login", "Payments", "Checkout")
   - submodule: a narrower slice within the module, or null
   - test_objective: one short sentence on the behavior being verified
   - test_class: one of "functional", "negative", "edge_case", "integration", "performance", "usability", "regression"
   - test_data: concrete input data used by the steps, or null
   - severity: impact if it breaks — one of "critical", "high", "medium", "low"
   - priority: how urgent it is to fix — one of "high", "medium", "low"

Be specific. Respond with valid JSON matching this exact schema:
{
  "test_cases": [
    {
      "title": "string - concise title",
      "preconditions": "string or null",
      "steps": ["string - Step 1", "string - Step 2"],
      "expected_result": "string - 1-2 sentences",
      "source_ref": "string or null",
      "module": "string or null",
      "submodule": "string or null",
      "test_objective": "string or null",
      "test_class": "string or null",
      "test_data": "string or null",
      "severity": "critical | high | medium | low",
      "priority": "high | medium | low"
    }
  ]
}`

    const userContent: OpenAI.Chat.ChatCompletionContentPart[] = [
      { type: 'text', text: `Requirements text:\n${requirementsText}${contextNotes}` },
    ]

    if (screenshotUrl) {
      userContent.push({
        type: 'image_url',
        image_url: { url: screenshotUrl },
      })
      userContent.push({
        type: 'text',
        text: 'Please analyze the screenshot and generate test cases based on both the visible screen elements and the provided context.',
      })
    } else {
      userContent.push({
        type: 'text',
        text: 'Generate test cases based on the provided context alone.',
      })
    }

    if (entry.aborted) return

    const completion = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 4096,
    })

    if (entry.aborted) return

    const responseText = completion.choices[0]?.message?.content
    if (!responseText) {
      throw new Error('Empty response from AI model')
    }

    let parsedJson: unknown
    try {
      parsedJson = JSON.parse(responseText)
    } catch {
      console.error('Failed to parse AI response as JSON:', responseText.slice(0, 200))
      await db
        .from('sessions')
        .update({ status: 'draft' })
        .eq('id', sessionId)
      entry.status = 'error'
      entry.error = 'Generated test cases were malformed. Please try again.'
      return
    }

    const parsed = generationSchema.safeParse(parsedJson)

    if (!parsed.success) {
      console.error('Generation output validation failed:', parsed.error)
      await db
        .from('sessions')
        .update({ status: 'draft' })
        .eq('id', sessionId)
      entry.status = 'error'
      entry.error = 'Generated test cases were malformed. Please try again.'
      return
    }

    if (entry.aborted) return

    const { data: session } = await db
      .from('sessions')
      .select('workspace_id, created_by')
      .eq('id', sessionId)
      .single()

    if (!session) {
      entry.status = 'error'
      entry.error = 'Session not found'
      return
    }

    const testCases = parsed.data.test_cases.map((tc, index) => ({
      session_id: sessionId,
      workspace_id: session.workspace_id,
      title: tc.title,
      preconditions: tc.preconditions,
      steps: JSON.stringify(tc.steps),
      expected_result: tc.expected_result,
      source_ref: tc.source_ref,
      module: tc.module,
      submodule: tc.submodule,
      test_objective: tc.test_objective,
      test_class: tc.test_class,
      test_data: tc.test_data ? { values: tc.test_data } : null,
      severity: tc.severity,
      priority: tc.priority,
      sort_order: index,
      status: 'not_run',
      created_by: session.created_by,
    }))

    const { data: inserted, error: insertError } = await db
      .from('test_cases')
      .insert(testCases)
      .select()

    if (insertError) {
      console.error('Failed to insert test cases:', insertError)
      await db
        .from('sessions')
        .update({ status: 'draft' })
        .eq('id', sessionId)
      entry.status = 'error'
      entry.error = 'Failed to save generated test cases'
      return
    }

    await db
      .from('sessions')
      .update({ status: 'ready' })
      .eq('id', sessionId)

    await trackEvent({
      userId,
      sessionId,
      eventType: 'generation_completed',
      eventData: { count: inserted.length },
    })

    void logActivity(sessionId, userId, 'generated', { count: inserted.length })

    entry.status = 'complete'
    console.log(`[generate] success session=${sessionId.slice(0, 8)} count=${inserted.length}`)
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : 'Unknown error'
    console.error('[generate] background error:', errMsg)
    try {
      await db
        .from('sessions')
        .update({ status: 'draft' })
        .eq('id', sessionId)
    } catch (dbErr) {
      console.error('[generate] failed to revert session status:', dbErr)
    }
    entry.status = 'error'
    entry.error = errMsg
  }
}

const generateBodySchema = z.object({
  sessionId: z.string().min(1),
  screenshotUrl: z.string().optional(),
  requirementsText: z.string().default(''),
})

const router = Router()
router.use(requireAuth)

router.post('/generate', generateLimiter, async (req, res) => {
  const userId = req.userId!
  const parsed = generateBodySchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message })
    return
  }
  const { sessionId, screenshotUrl, requirementsText } = parsed.data

  // Load session_inputs from database
  let inputs: InputData[] = []
  try {
    const db = req.supabase!
    const { data: rows } = await db
      .from('session_inputs')
      .select('type, data')
      .eq('session_id', sessionId)
      .order('sort_order', { ascending: true })
    if (rows) inputs = rows as InputData[]
  } catch (err) {
    console.warn('[generate] failed to load session_inputs:', err)
  }

  const genId = crypto.randomUUID()
  const entry: GenerationEntry = {
    sessionId,
    screenshotUrl,
    requirementsText: requirementsText ?? '',
    inputs,
    userId,
    userJwt: req.userJwt!,
    status: 'pending',
    createdAt: Date.now(),
    aborted: false,
  }
  generations.set(genId, entry)

  console.log(`[generate] POST /generate genId=${genId.slice(0, 8)} session=${sessionId.slice(0, 8)}`)

  // Run in background
  runGeneration(genId, entry)

  res.json({ generationId: genId })
})

router.get('/generate/:generationId/status', (req, res) => {
  const entry = generations.get(req.params.generationId)
  if (!entry) {
    res.status(404).json({ error: 'Generation not found' })
    return
  }

  res.json({
    status: entry.status,
    error: entry.error ?? undefined,
  })
})

router.post('/generate/:generationId/cancel', async (req, res) => {
  const entry = generations.get(req.params.generationId)
  if (!entry) {
    res.status(404).json({ error: 'Generation not found' })
    return
  }

  // Verify the caller owns this generation
  if (entry.userId !== req.userId) {
    res.status(403).json({ error: 'You can only cancel your own generations' })
    return
  }

  entry.aborted = true
  entry.status = 'error'
  entry.error = 'Cancelled'

  try {
    await req.supabase!.from('sessions').update({ status: 'draft' }).eq('id', entry.sessionId)
  } catch (err) {
    console.error('[generate] cancel update failed:', err)
  }

  res.json({ ok: true })
})

export default router
