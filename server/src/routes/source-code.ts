import { Router } from 'express'
import multer from 'multer'
import AdmZip from 'adm-zip'
import path from 'path'
import { requireAuth } from '../lib/auth-middleware.js'

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } })
const router = Router()
router.use(requireAuth)

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs',
  '.py', '.go', '.rs', '.rb', '.java', '.kt', '.swift',
  '.php', '.cs', '.dart', '.scala', '.ex', '.exs',
])

const LANG_MAP: Record<string, string> = {
  ts: 'TypeScript', tsx: 'TypeScript', js: 'JavaScript', jsx: 'JavaScript',
  py: 'Python', go: 'Go', rs: 'Rust', rb: 'Ruby',
  java: 'Java', kt: 'Kotlin', swift: 'Swift',
  php: 'PHP', cs: 'C#', dart: 'Dart',
  scala: 'Scala', ex: 'Elixir', exs: 'Elixir',
}

interface FileEntry {
  path: string
  size: number
}

router.post('/source-code', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file provided. Upload a .zip archive of the source code.' })
      return
    }

    const zipBuffer = req.file.buffer
    if (zipBuffer.length === 0) {
      res.status(400).json({ error: 'Empty file' })
      return
    }

    let zip: AdmZip
    try {
      zip = new AdmZip(zipBuffer)
    } catch {
      res.status(400).json({ error: 'Invalid zip file' })
      return
    }

    const entries = zip.getEntries()
    const fileTree: FileEntry[] = []
    const languages = new Set<string>()
    const snippets: { path: string; content: string }[] = []
    let totalFiles = 0
    const MAX_SNIPPET_SIZE = 100 * 1024 // 100KB
    const MAX_SNIPPET_CHARS = 2000

    for (const entry of entries) {
      if (entry.isDirectory) continue

      const ext = path.extname(entry.name).toLowerCase().replace('.', '')
      const entryPath = entry.entryName

      // Zip-slip protection: reject absolute paths and path traversal
      const resolved = path.resolve('/', entryPath)
      if (resolved !== path.join('/', entryPath) || entryPath.includes('..')) {
        continue
      }

      // Skip node_modules, .git, dist, build
      if (/node_modules|\.git|\/dist\/|\/build\//.test(entryPath)) continue

      totalFiles++
      fileTree.push({ path: entryPath, size: entry.header.size })

      if (ext && LANG_MAP[ext]) {
        languages.add(LANG_MAP[ext])
      }

      // Read snippet for source files under MAX_SNIPPET_SIZE
      if (SOURCE_EXTENSIONS.has('.' + ext) && entry.header.size < MAX_SNIPPET_SIZE) {
        const content = entry.getData().toString('utf-8').slice(0, MAX_SNIPPET_CHARS)
        snippets.push({ path: entryPath, content })
      }
    }

    res.json({
      fileCount: totalFiles,
      languages: Array.from(languages),
      snippets: snippets.slice(0, 50), // max 50 snippet files
    })
  } catch (err) {
    console.error('Source code extraction error:', err)
    res.status(500).json({ error: 'Source code extraction failed' })
  }
})

export default router
