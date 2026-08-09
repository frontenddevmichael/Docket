import { Router } from 'express'
import { z } from 'zod'
import { trackEvent } from '../lib/tracking.js'
import { requireAuth } from '../lib/auth-middleware.js'

const trackSchema = z.object({
  userId: z.string().min(1),
  workspaceId: z.string().optional(),
  sessionId: z.string().optional(),
  eventType: z.string().min(1),
  eventData: z.any().optional(),
})

const router = Router()
router.use(requireAuth)

router.post('/track', async (req, res) => {
  try {
    const parsed = trackSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }
    const { userId, workspaceId, sessionId, eventType, eventData } = parsed.data

    await trackEvent({
      userId,
      workspaceId,
      sessionId,
      eventType: eventType as any,
      eventData,
    })

    res.json({ ok: true })
  } catch (err) {
    console.error('Tracking error:', err)
    res.json({ ok: true }) // never fail on tracking
  }
})

export default router
