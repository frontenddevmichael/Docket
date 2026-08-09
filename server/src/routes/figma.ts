import { Router } from 'express'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '../lib/auth-middleware.js'

const figmaSchema = z.object({
  url: z.string().min(1, 'Figma URL is required'),
})

const FIGMA_API = 'https://api.figma.com/v1'

const router = Router()
router.use(requireAuth)

function parseFigmaUrl(url: string): { fileKey: string; nodeId?: string } | null {
  const match = url.match(/figma\.com\/(file|proto)\/([a-zA-Z0-9]+)(?:\/.*)?(?:\?.*node-id=([a-zA-Z0-9%-]+))?/)
  if (!match) return null
  return { fileKey: match[2], nodeId: match[3] ? decodeURIComponent(match[3]) : undefined }
}

router.post('/figma', async (req, res) => {
  try {
    const body = figmaSchema.safeParse(req.body)
    if (!body.success) {
      res.status(400).json({ error: body.error.errors[0].message })
      return
    }
    const { url } = body.data

    const token = process.env.FIGMA_ACCESS_TOKEN
    if (!token) {
      res.status(500).json({ error: 'Figma API not configured (FIGMA_ACCESS_TOKEN missing)' })
      return
    }

    const figmaUrl = parseFigmaUrl(url)
    if (!figmaUrl) {
      res.status(400).json({ error: 'Could not parse Figma URL. Use a share link like figma.com/file/...' })
      return
    }

    const headers = { Authorization: `Bearer ${token}` }

    // Fetch rendered frame as PNG
    const imageParams = new URLSearchParams({ format: 'png', scale: '2' })
    if (figmaUrl.nodeId) imageParams.set('node_id', figmaUrl.nodeId)
    const imageRes = await fetch(`${FIGMA_API}/images/${figmaUrl.fileKey}?${imageParams}`, { headers })

    if (!imageRes.ok) {
      const errBody = await imageRes.text().catch(() => '')
      res.status(502).json({ error: `Figma API returned ${imageRes.status}: ${errBody.slice(0, 200)}` })
      return
    }

    const imageData = await imageRes.json() as { err?: string; images?: Record<string, string> }
    if (imageData.err) {
      res.status(502).json({ error: imageData.err })
      return
    }

    const imageUrl = imageData.images?.[figmaUrl.nodeId ?? ''] ?? Object.values(imageData.images ?? {})[0]
    if (!imageUrl) {
      res.status(502).json({ error: 'No image returned from Figma' })
      return
    }

    // Download and store in Supabase
    const imgRes = await fetch(imageUrl)
    if (!imgRes.ok) {
      res.status(502).json({ error: 'Failed to download Figma rendering' })
      return
    }
    const imgBuffer = Buffer.from(await imgRes.arrayBuffer())
    const filePath = `figma/figma-${figmaUrl.fileKey}-${Date.now()}.png`
    const db: SupabaseClient = req.supabase!
    const { data: uploadData, error: uploadError } = await db.storage
      .from('screenshots')
      .upload(filePath, imgBuffer, { contentType: 'image/png', upsert: false })

    if (uploadError) {
      res.status(500).json({ error: 'Failed to store Figma rendering' })
      return
    }

    const { data: { publicUrl } } = db.storage.from('screenshots').getPublicUrl(uploadData.path)

    // Fetch text layers from the document tree
    const fileRes = await fetch(`${FIGMA_API}/files/${figmaUrl.fileKey}?depth=1`, { headers })
    const textLayers: { id: string; name: string; characters: string }[] = []

    if (fileRes.ok) {
      const fileData = await fileRes.json() as { document?: { children?: unknown[] } }
      const children = fileData.document?.children ?? []
      for (const page of children as any[]) {
        if (Array.isArray(page.children)) {
          for (const node of page.children) {
            if (node.type === 'TEXT' && node.characters) {
              textLayers.push({ id: node.id, name: node.name ?? '', characters: node.characters })
            }
          }
        }
      }
    }

    res.json({
      fileKey: figmaUrl.fileKey,
      renderedScreenshotUrl: publicUrl,
      screenshotPath: uploadData.path,
      textLayers,
    })
  } catch (err) {
    console.error('Figma extraction error:', err)
    res.status(500).json({ error: 'Figma extraction failed' })
  }
})

export default router
