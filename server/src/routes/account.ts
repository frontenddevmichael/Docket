import { Router } from 'express'
import { requireAuth } from '../lib/auth-middleware.js'
import { supabaseAdmin } from '../lib/supabase-admin.js'

const router = Router()
router.use(requireAuth)

router.delete('/account', async (req, res) => {
  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.userId!)
    if (error) {
      console.error('Account deletion error:', error)
      return res.status(500).json({ error: 'Failed to delete account' })
    }
    // Clean up user data
    await supabaseAdmin.from('profiles').delete().eq('id', req.userId!)
    res.json({ success: true })
  } catch (err) {
    console.error('Account deletion error:', err)
    res.status(500).json({ error: 'Failed to delete account' })
  }
})

export default router
