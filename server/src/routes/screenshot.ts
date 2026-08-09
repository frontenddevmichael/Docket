import { Router } from 'express'
import { z } from 'zod'
import { chromium } from 'playwright'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '../lib/auth-middleware.js'

const screenshotSchema = z.object({
  url: z.string().min(1, 'URL is required'),
})

const router = Router()
router.use(requireAuth)

router.post('/screenshot', async (req, res) => {
  try {
    const parsed = screenshotSchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.errors[0].message })
      return
    }
    const { url } = parsed.data

    const normalizedUrl = url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`

    const browser = await chromium.launch({ headless: true })
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })

    try {
      await page.goto(normalizedUrl, { waitUntil: 'networkidle', timeout: 15000 })
      const buffer = await page.screenshot({ type: 'png', fullPage: false })
      await browser.close()

      const filePath = `screenshots/url-capture-${Date.now()}.png`

      const db: SupabaseClient = req.supabase!
      const { data, error } = await db.storage
        .from('screenshots')
        .upload(filePath, buffer, {
          contentType: 'image/png',
          upsert: false,
        })

      if (error) {
        res.status(500).json({ error: 'Failed to store screenshot' })
        return
      }

      const { data: { publicUrl } } = db.storage
        .from('screenshots')
        .getPublicUrl(data.path)

      res.json({ screenshotUrl: publicUrl, screenshotPath: data.path })
    } catch (err) {
      await browser.close().catch(() => {})
      throw err
    }
  } catch (err) {
    console.error('Screenshot capture error:', err)
    res.status(500).json({ error: 'Screenshot capture failed' })
  }
})

export default router
