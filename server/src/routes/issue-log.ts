import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { requireAuth } from '../lib/auth-middleware.js'
import { sendIssueDraft } from '../lib/email.js'
import type { SupabaseClient } from '@supabase/supabase-js'

async function getMembership(userId: string) {
  const { data } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', userId)
    .single()
  return data ?? null
}

async function getProjectOrDeny(projectId: string | string[], workspaceId: string) {
  const projectUuid = Array.isArray(projectId) ? projectId[0] : projectId
  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('id, name')
    .eq('id', projectUuid)
    .eq('workspace_id', workspaceId)
    .single()
  if (error) return null
  return { project, error: null }
}

async function attachProfiles(db: SupabaseClient, rows: { user_id?: string | null; assigned_developer?: string | null; owner?: string | null; created_by?: string }[]) {
  const ids = [...new Set(rows.flatMap(r => [r.user_id, r.assigned_developer, r.owner, r.created_by].filter(Boolean) as string[]))]
  if (ids.length === 0) return
  const { data: profiles } = await db
    .from('profiles')
    .select('id, email, full_name')
    .in('id', ids)
  const map = new Map((profiles || []).map(p => [p.id, p]))
  for (const row of rows) {
    ;(row as any).assigned_developer_profile = row.assigned_developer ? map.get(row.assigned_developer) || null : null
    ;(row as any).owner_profile = row.owner ? map.get(row.owner) || null : null
    ;(row as any).created_by_profile = row.created_by ? map.get(row.created_by) || null : null
  }
}

const SEVERITIES = ['critical', 'high', 'medium', 'low']
const PRIORITIES = ['high', 'medium', 'low']

const router = Router()
router.use(requireAuth)

// GET /api/projects/:projectId/issue-log
router.get('/projects/:projectId/issue-log', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const projection = await getMembership(userId)
    if (!projection) return res.status(404).json({ error: 'No workspace found' })
    const workspaceId = projection.workspace_id

    const projectRow = await getProjectOrDeny(req.params.projectId, workspaceId)
    if (!projectRow?.project) return res.status(404).json({ error: 'Project not found' })

    const { data: sessions } = await supabaseAdmin
      .from('sessions')
      .select('id')
      .eq('project_id', projectRow.project.id)
    const sessionIds = (sessions ?? []).map(s => s.id)

    const issuesQuery = supabaseAdmin
      .from('issues')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('project_id', projectRow.project.id)
      .order('created_at', { ascending: false })

    const blockersQuery = supabaseAdmin
      .from('blockers')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('project_id', projectRow.project.id)
      .order('created_at', { ascending: false })

    const observationsQuery = supabaseAdmin
      .from('observations')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('project_id', projectRow.project.id)
      .order('created_at', { ascending: false })

    const [{ data: issues }, { data: blockers }, { data: observations }] = await Promise.all([
      issuesQuery,
      blockersQuery,
      observationsQuery,
    ])

    const testCaseIds = (issues ?? []).map(i => i.test_case_id).filter(Boolean) as string[]
    if (testCaseIds.length > 0) {
      const { data: testCases } = await supabaseAdmin
        .from('test_cases')
        .select('id, title, source_ref, status')
        .in('id', testCaseIds)
      const testCaseMap = new Map((testCases || []).map((tc: any) => [tc.id, tc]))
      for (const issue of issues ?? []) {
        ;(issue as any).test_case = issue.test_case_id ? testCaseMap.get(issue.test_case_id) || null : null
      }
    }

    await attachProfiles(supabaseAdmin, [...(issues ?? []), ...(blockers ?? []), ...(observations ?? [])])

    // Live failed test cases across the project's sessions (for the defect summary)
    let failedCases: { id: string; title: string; source_ref: string | null; status: string; severity: string | null; priority: string | null; module: string | null; executed_at: string | null }[] = []
    if (sessionIds.length > 0) {
      const { data: failed } = await supabaseAdmin
        .from('test_cases')
        .select('id, title, source_ref, status, severity, priority, module, executed_at')
        .in('session_id', sessionIds)
        .in('status', ['fail', 'blocked', 'reopened'])
        .order('executed_at', { ascending: false })
      failedCases = failed ?? []
    }

    res.json({
      project: projectRow.project,
      issues: issues ?? [],
      blockers: blockers ?? [],
      observations: observations ?? [],
      failedCases,
    })
  } catch (err: any) {
    console.error('[issue-log] GET /issue-log error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/projects/:projectId/issue-log/issues
router.post('/projects/:projectId/issue-log/issues', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const projection = await getMembership(userId)
    if (!projection) return res.status(404).json({ error: 'No workspace found' })
    const workspaceId = projection.workspace_id

    const projectRow = await getProjectOrDeny(req.params.projectId, workspaceId)
    if (!projectRow?.project) return res.status(404).json({ error: 'Project not found' })

    const { title, details, severity, priority, assigned_developer, owner, duration_of_impact, test_case_id, session_id } = req.body
    if (!title || !title.trim()) return res.status(400).json({ error: 'Issue title is required' })
    if (severity && !SEVERITIES.includes(severity)) return res.status(400).json({ error: 'Invalid severity' })
    if (priority && !PRIORITIES.includes(priority)) return res.status(400).json({ error: 'Invalid priority' })

    const { data: issue, error } = await supabaseAdmin
      .from('issues')
      .insert({
        workspace_id: workspaceId,
        project_id: projectRow.project.id,
        test_case_id: test_case_id ?? null,
        session_id: session_id ?? null,
        title: title.trim(),
        details: details ?? null,
        severity: severity ?? null,
        priority: priority ?? null,
        assigned_developer: assigned_developer ?? null,
        owner: owner ?? null,
        duration_of_impact: duration_of_impact ?? null,
        status: 'open',
        created_by: userId,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json({ issue })
  } catch (err: any) {
    console.error('[issue-log] POST /issues error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/projects/:projectId/issue-log/blockers
router.post('/projects/:projectId/issue-log/blockers', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const projection = await getMembership(userId)
    if (!projection) return res.status(404).json({ error: 'No workspace found' })
    const workspaceId = projection.workspace_id

    const projectRow = await getProjectOrDeny(req.params.projectId, workspaceId)
    if (!projectRow?.project) return res.status(404).json({ error: 'Project not found' })

    const { title, details } = req.body
    if (!title || !title.trim()) return res.status(400).json({ error: 'Blocker title is required' })

    const { data: blocker, error } = await supabaseAdmin
      .from('blockers')
      .insert({
        workspace_id: workspaceId,
        project_id: projectRow.project.id,
        title: title.trim(),
        details: details ?? null,
        status: 'open',
        created_by: userId,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json({ blocker })
  } catch (err: any) {
    console.error('[issue-log] POST /blockers error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/projects/:projectId/issue-log/observations
router.post('/projects/:projectId/issue-log/observations', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const projection = await getMembership(userId)
    if (!projection) return res.status(404).json({ error: 'No workspace found' })
    const workspaceId = projection.workspace_id

    const projectRow = await getProjectOrDeny(req.params.projectId, workspaceId)
    if (!projectRow?.project) return res.status(404).json({ error: 'Project not found' })

    const { content } = req.body
    if (!content || !content.trim()) return res.status(400).json({ error: 'Observation content is required' })

    const { data: observation, error } = await supabaseAdmin
      .from('observations')
      .insert({
        workspace_id: workspaceId,
        project_id: projectRow.project.id,
        content: content.trim(),
        status: 'open',
        created_by: userId,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.status(201).json({ observation })
  } catch (err: any) {
    console.error('[issue-log] POST /observations error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// PATCH /api/projects/:projectId/issue-log/issues/:id
router.patch('/projects/:projectId/issue-log/issues/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const projection = await getMembership(userId)
    if (!projection) return res.status(404).json({ error: 'No workspace found' })
    const workspaceId = projection.workspace_id

    const projectRow = await getProjectOrDeny(req.params.projectId, workspaceId)
    if (!projectRow?.project) return res.status(404).json({ error: 'Project not found' })

    const fields: Record<string, unknown> = {
      details: req.body.details ?? undefined,
      severity: req.body.severity ?? undefined,
      priority: req.body.priority ?? undefined,
      assigned_developer: req.body.assigned_developer ?? undefined,
      owner: req.body.owner ?? undefined,
      duration_of_impact: req.body.duration_of_impact ?? undefined,
      title: req.body.title ?? undefined,
    }
    for (const key of Object.keys(fields)) {
      if (fields[key] === undefined) delete fields[key]
    }

    if (req.body.status !== undefined) {
      if (!['open', 'closed'].includes(req.body.status)) {
        return res.status(400).json({ error: 'Invalid issue status' })
      }
      fields.status = req.body.status
      fields.closed_at = req.body.status === 'closed' ? new Date().toISOString() : null
    }

    if (req.body.severity && !SEVERITIES.includes(req.body.severity)) return res.status(400).json({ error: 'Invalid severity' })
    if (req.body.priority && !PRIORITIES.includes(req.body.priority)) return res.status(400).json({ error: 'Invalid priority' })
    if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const { data: issue, error } = await supabaseAdmin
      .from('issues')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .eq('project_id', projectRow.project.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json({ issue })
  } catch (err: any) {
    console.error('[issue-log] PATCH /issues/:id error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// PATCH /api/projects/:projectId/issue-log/observations/:id
router.patch('/projects/:projectId/issue-log/observations/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const projection = await getMembership(userId)
    if (!projection) return res.status(404).json({ error: 'No workspace found' })
    const workspaceId = projection.workspace_id

    const projectRow = await getProjectOrDeny(req.params.projectId, workspaceId)
    if (!projectRow?.project) return res.status(404).json({ error: 'Project not found' })

    const fields: Record<string, unknown> = {
      developer_comment: req.body.developer_comment ?? undefined,
      pm_comment: req.body.pm_comment ?? undefined,
      content: req.body.content ?? undefined,
      status: req.body.status ?? undefined,
    }
    for (const key of Object.keys(fields)) {
      if (fields[key] === undefined) delete fields[key]
    }
    if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const { data: observation, error } = await supabaseAdmin
      .from('observations')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .eq('project_id', projectRow.project.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json({ observation })
  } catch (err: any) {
    console.error('[issue-log] PATCH /observations/:id error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// PATCH /api/projects/:projectId/issue-log/blockers/:id
router.patch('/projects/:projectId/issue-log/blockers/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const projection = await getMembership(userId)
    if (!projection) return res.status(404).json({ error: 'No workspace found' })
    const workspaceId = projection.workspace_id

    const projectRow = await getProjectOrDeny(req.params.projectId, workspaceId)
    if (!projectRow?.project) return res.status(404).json({ error: 'Project not found' })

    const fields: Record<string, unknown> = {}
    if (req.body.title !== undefined) fields.title = req.body.title
    if (req.body.details !== undefined) fields.details = req.body.details
    if (req.body.status !== undefined) {
      if (!['open', 'closed'].includes(req.body.status)) {
        return res.status(400).json({ error: 'Invalid blocker status' })
      }
      fields.status = req.body.status
      fields.resolved_at = req.body.status === 'closed' ? new Date().toISOString() : null
    }
    if (Object.keys(fields).length === 0) return res.status(400).json({ error: 'Nothing to update' })

    const { data: blocker, error } = await supabaseAdmin
      .from('blockers')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .eq('workspace_id', workspaceId)
      .eq('project_id', projectRow.project.id)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })
    res.json({ blocker })
  } catch (err: any) {
    console.error('[issue-log] PATCH /blockers/:id error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/projects/:projectId/issue-log/send-draft — save-draft email handoff
// noteType 'developer': tester hands open defects to assigned developers
// noteType 'tester': developer notifies tester that fixes are ready to verify
router.post('/projects/:projectId/issue-log/send-draft', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const projection = await getMembership(userId)
    if (!projection) return res.status(404).json({ error: 'No workspace found' })
    const workspaceId = projection.workspace_id
    const noteType = req.body.noteType === 'tester' ? 'tester' : 'developer'
    const projectId = req.params.projectId

    const projectRow = await getProjectOrDeny(projectId, workspaceId)
    if (!projectRow?.project) return res.status(404).json({ error: 'Project not found' })

    const { data: issues } = await supabaseAdmin
      .from('issues')
      .select('*')
      .eq('workspace_id', workspaceId)
      .eq('project_id', projectId)
      .eq('status', 'open')

    const source = issues ?? []

    if (source.length === 0) {
      return res.status(400).json({ error: 'No open issues to send' })
    }

    const recipients = new Map<string, { count: number; items: { severity: string; title: string; ref: string | null }[] }>()
    for (const issue of source) {
      const assignee = issue.assigned_developer
      if (assignee) {
        const bucket = recipients.get(assignee) ?? { count: 0, items: [] }
        bucket.count++
        bucket.items.push({
          severity: issue.severity ?? 'medium',
          title: issue.title,
          ref: issue.details ?? null,
        })
        recipients.set(assignee, bucket)
      }
    }

    if (recipients.size === 0) {
      return res.status(400).json({ error: 'No open issue has an assigned developer to notify' })
    }

    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id, email')
      .in('id', [...recipients.keys()])

    const baseUrl = process.env.CLIENT_ORIGIN ?? 'http://localhost:5175'
    const url = `${baseUrl}/projects/${projectId}/issue-log`
    let sent = 0
    for (const profile of profiles ?? []) {
      const bucket = recipients.get(profile.id)
      if (!bucket) continue
      sendIssueDraft({
        to: profile.email,
        projectName: projectRow.project.name,
        defectCount: bucket.items.length,
        issues: bucket.items,
        noteType,
        url,
      })
      sent++
    }

    res.json({ sent, projectUrl: url })
  } catch (err: any) {
    console.error('[issue-log] POST /send-draft error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

export default router