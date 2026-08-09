import { Router } from 'express'
import { requireAuth } from '../lib/auth-middleware.js'

const router = Router()
router.use(requireAuth)

router.get('/tracking/stats', async (req, res) => {
  try {
    const db = req.supabase!
    const { count: sessionCount, error: sessionError } = await db
      .from('sessions')
      .select('*', { count: 'exact', head: true })

    // Use SQL aggregation instead of loading all rows
    const { data: feedbackCounts } = await db
      .from('test_cases')
      .select('feedback')

    const { data: events } = await db
      .from('tracking_events')
      .select('event_type, created_at')
      .order('created_at', { ascending: false })
      .limit(50)

    // Aggregate feedback counts
    const kept = feedbackCounts?.filter((tc) => tc.feedback === 'kept').length ?? 0
    const edited = feedbackCounts?.filter((tc) => tc.feedback === 'edited').length ?? 0
    const deleted = feedbackCounts?.filter((tc) => tc.feedback === 'deleted').length ?? 0
    const totalCases = feedbackCounts?.length ?? 0

    res.json({
      totalSessions: sessionError ? 0 : (sessionCount ?? 0),
      totalTestCases: totalCases,
      feedback: { kept, edited, deleted, unmarked: totalCases - kept - edited - deleted },
      recentEvents: (events ?? []).slice(0, 20),
    })
  } catch (err) {
    console.error('Tracking stats error:', err)
    res.status(500).json({ error: 'Failed to fetch tracking stats' })
  }
})

export default router
