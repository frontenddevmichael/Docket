import { Router } from 'express'
import { z } from 'zod'
import OpenAI from 'openai'
import { requireAuth } from '../lib/auth-middleware.js'

// Mirror of shared/loading-messages.ts (client imports the shared copy via the
// @shared alias). Kept server-local so the server build stays self-contained
// and emits a clean dist/ layout without pulling in files above src/.
const FALLBACK_LOADING_MESSAGES = [
  'Parsing your requirements\u2026',
  'Mapping test scenarios\u2026',
  'Checking for edge cases\u2026',
  'Drafting test cases\u2026',
  'Validating coverage\u2026',
  'Finalizing test suite\u2026',
] as const

const loadingMessagesSchema = z.object({
  requirementsText: z.string().optional(),
})

const router = Router()
router.use(requireAuth)

router.post('/loading-messages', async (req, res) => {
  const parsed = loadingMessagesSchema.safeParse(req.body)
  const requirementsText = parsed.success ? parsed.data.requirementsText : undefined

  if (!requirementsText) {
    res.json({ messages: FALLBACK_LOADING_MESSAGES })
    return
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    res.json({
      messages: [
        'Preparing test generation\u2026',
        'Reading your requirements\u2026',
        'Mapping test scenarios\u2026',
        'Drafting test cases\u2026',
        'Reviewing coverage\u2026',
        'Finalizing suite\u2026',
      ],
    })
    return
  }

  try {
    const openai = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey })

    const completion = await openai.chat.completions.create({
      model: 'google/gemini-2.5-flash',
      messages: [
        {
          role: 'system',
          content: 'You generate loading messages for a QA test-generation tool. Given requirements text, produce exactly 6 short (max 45 chars each) personalized loading messages about what the AI is doing. Each message starts with a verb ending in -ing and relates specifically to the requirements. Return only a JSON array of strings.',
        },
        {
          role: 'user',
          content: `Generate 6 loading messages for these requirements:\n\n${requirementsText.slice(0, 2000)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
      max_tokens: 512,
    })

    const text = completion.choices[0]?.message?.content
    if (!text) throw new Error('Empty response')

    const json = JSON.parse(text)
    const messages: string[] = Array.isArray(json) ? json : json.messages ?? []

    res.json({
      messages: messages.slice(0, 8).map((m: string) => m.length > 48 ? m.slice(0, 45) + '\u2026' : m),
    })
  } catch {
    res.json({ messages: FALLBACK_LOADING_MESSAGES })
  }
})

export default router
