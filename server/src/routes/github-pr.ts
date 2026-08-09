import { Router } from 'express'
import { z } from 'zod'
import { Octokit } from '@octokit/rest'
import { requireAuth } from '../lib/auth-middleware.js'

const githubPrSchema = z.object({
  url: z.string().min(1, 'GitHub PR URL is required'),
})

const router = Router()
router.use(requireAuth)

function parsePrUrl(url: string): { owner: string; repo: string; prNumber: number } | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/)
  if (!match) return null
  return { owner: match[1], repo: match[2].replace(/\.git$/, ''), prNumber: parseInt(match[3], 10) }
}

router.post('/github/pr', async (req, res) => {
  try {
    const body = githubPrSchema.safeParse(req.body)
    if (!body.success) {
      res.status(400).json({ error: body.error.errors[0].message })
      return
    }
    const { url } = body.data

    const prUrl = parsePrUrl(url)
    if (!prUrl) {
      res.status(400).json({ error: 'Could not parse GitHub PR URL. Expected format: github.com/owner/repo/pull/123' })
      return
    }

    const token = process.env.GITHUB_TOKEN
    const octokit = new Octokit(token ? { auth: token } : undefined)

    const { owner, repo, prNumber } = prUrl

    // Fetch PR details
    const { data: pr } = await octokit.pulls.get({ owner, repo, pull_number: prNumber })

    // Fetch changed files
    const { data: files } = await octokit.pulls.listFiles({ owner, repo, pull_number: prNumber, per_page: 100 })
    const changedFiles = files.map(f => ({
      filename: f.filename,
      status: f.status,
      additions: f.additions,
      deletions: f.deletions,
    }))

    // Fetch diff
    const diffRes = await fetch(`https://github.com/${owner}/${repo}/pull/${prNumber}.diff`)
    let diff = ''
    if (diffRes.ok) {
      diff = await diffRes.text()
      // Truncate large diffs
      const MAX_DIFF = 50 * 1024
      if (diff.length > MAX_DIFF) {
        diff = diff.slice(0, MAX_DIFF) + '\n\n... diff truncated at 50KB'
      }
    }

    res.json({
      description: pr.body ?? '',
      title: pr.title,
      changedFiles,
      diff,
    })
  } catch (err: any) {
    console.error('GitHub PR extraction error:', err)
    if (err?.status === 404) {
      res.status(404).json({ error: 'PR not found. Check that the repository and PR number are correct.' })
      return
    }
    if (err?.status === 403) {
      res.status(429).json({ error: 'GitHub API rate limit exceeded. Try again later.' })
      return
    }
    res.status(500).json({ error: 'GitHub PR extraction failed' })
  }
})

export default router
