import { Router } from 'express'
import multer from 'multer'
import * as yaml from 'js-yaml'
import { requireAuth } from '../lib/auth-middleware.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } })
const router = Router()
router.use(requireAuth)

interface Endpoint {
  path: string
  method: string
  summary: string
  parameters?: { name: string; in: string; required: boolean }[]
}

interface Schema {
  name: string
  type: string
}

function extractOpenAPI(spec: any): { title: string; version: string; endpoints: Endpoint[]; schemas: Schema[] } {
  const title = spec.info?.title ?? 'Untitled API'
  const version = spec.info?.version ?? ''
  const endpoints: Endpoint[] = []
  const schemas: Schema[] = []

  if (spec.paths) {
    for (const [path, methods] of Object.entries(spec.paths as any)) {
      if (!methods || typeof methods !== 'object') continue
      for (const [method, detail] of Object.entries(methods as any)) {
        if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method)) {
          endpoints.push({
            path,
            method: method.toUpperCase(),
            summary: typeof detail === 'object' ? (detail as any).summary ?? '' : '',
            parameters: Array.isArray((detail as any)?.parameters)
              ? (detail as any).parameters.map((p: any) => ({
                  name: p.name,
                  in: p.in,
                  required: p.required ?? false,
                }))
              : undefined,
          })
        }
      }
    }
  }

  const schemasObj = spec.components?.schemas ?? spec.definitions
  if (schemasObj) {
    for (const [name, schema] of Object.entries(schemasObj as any)) {
      schemas.push({
        name,
        type: (schema as any).type ?? 'object',
      })
    }
  }

  return { title, version, endpoints, schemas }
}

router.post('/api-spec', upload.single('file'), async (req, res) => {
  try {
    let specData: any

    // File upload path
    if (req.file) {
      const content = req.file.buffer.toString('utf-8')
      try {
        specData = JSON.parse(content)
      } catch {
        try {
          specData = yaml.load(content)
        } catch {
          res.status(400).json({ error: 'File must be valid OpenAPI JSON or YAML' })
          return
        }
      }
    } else {
      // URL or raw body
      const { url, content } = req.body as { url?: string; content?: string }

      if (url) {
        const fetched = await fetch(url as string)
        if (!fetched.ok) {
          res.status(502).json({ error: `Failed to fetch spec from URL (${fetched.status})` })
          return
        }
        const text = await fetched.text()
        try {
          specData = JSON.parse(text)
        } catch {
          try {
            specData = yaml.load(text)
          } catch {
            res.status(400).json({ error: 'Spec from URL must be valid OpenAPI JSON or YAML' })
            return
          }
        }
      } else if (content) {
        const text = content as string
        try {
          specData = JSON.parse(text)
        } catch {
          try {
            specData = yaml.load(text)
          } catch {
            res.status(400).json({ error: 'Content must be valid OpenAPI JSON or YAML' })
            return
          }
        }
      } else {
        res.status(400).json({ error: 'Provide a url, content, or file upload' })
        return
      }
    }

    if (!specData || typeof specData !== 'object') {
      res.status(400).json({ error: 'Invalid API specification format' })
      return
    }

    const swagger = specData.swagger ? 'Swagger 2.x' : specData.openapi ? `OpenAPI ${specData.openapi}` : 'Unknown'
    if (!specData.swagger && !specData.openapi) {
      res.status(400).json({ error: 'File does not appear to be an OpenAPI or Swagger specification' })
      return
    }

    const result = extractOpenAPI(specData)
    res.json({ ...result, specFormat: swagger })
  } catch (err) {
    console.error('API spec extraction error:', err)
    res.status(500).json({ error: 'API spec extraction failed' })
  }
})

export default router
