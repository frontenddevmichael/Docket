import { Router, Request, Response } from 'express'
import { supabaseAdmin } from '../lib/supabase-admin.js'
import { requireAuth } from '../lib/auth-middleware.js'
import { sendProjectAssigned, sendProjectRejected } from '../lib/email.js'

const MANAGER_ROLES = ['owner', 'admin', 'manager']
const PATCHABLE_FIELDS = [
  'name', 'overview', 'project_type', 'business_segment', 'business_impact',
  'delivery_category', 'test_type', 'start_date', 'target_end_date', 'stakeholders',
]

async function getMembership(userId: string) {
  const { data } = await supabaseAdmin
    .from('workspace_members')
    .select('workspace_id, role')
    .eq('user_id', userId)
    .single()
  return data ?? null
}

async function attachProfiles(rows: { assigned_tester?: string | null; created_by?: string; requested_by?: string | null }[]) {
  const ids = [...new Set(rows.flatMap(r => [r.assigned_tester, r.created_by, r.requested_by].filter(Boolean) as string[]))]
  if (ids.length === 0) return
  const { data: profiles } = await supabaseAdmin
    .from('profiles')
    .select('id, email, full_name')
    .in('id', ids)
  const map = new Map((profiles || []).map(p => [p.id, p]))
  for (const row of rows) {
    ;(row as any).assigned_tester_profile = row.assigned_tester ? map.get(row.assigned_tester) || null : null
    ;(row as any).requested_by_profile = row.requested_by ? map.get(row.requested_by) || null : null
    ;(row as any).created_by_profile = row.created_by ? map.get(row.created_by) || null : null
  }
}

function isManager(role?: string | null): boolean {
  return !!role && MANAGER_ROLES.includes(role)
}

const router = Router()
router.use(requireAuth)

// GET /api/projects — workspace projects (role-aware) with status counts
router.get('/projects', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const membership = await getMembership(userId)
    if (!membership) return res.status(404).json({ error: 'No workspace found' })

    const workspaceId = membership.workspace_id
    const { status, search, page } = req.query as { status?: string; search?: string; page?: string }
    const pageNum = Math.max(1, parseInt(page ?? '1', 10) || 1)
    const pageSize = 20

    let query = supabaseAdmin
      .from('projects')
      .select('*', { count: 'exact' })
      .eq('workspace_id', workspaceId)

    // Role-aware visibility: managers/admin/owner see all; others see assignments + own requests
    if (!isManager(membership.role)) {
      query = query.or(`assigned_tester.eq.${userId},created_by.eq.${userId},requested_by.eq.${userId}`)
    }

    if (status) query = query.eq('status', status)
    if (search) query = query.ilike('name', `%${search}%`)

    const from = (pageNum - 1) * pageSize
    const { data: projects, count, error } = await query
      .order('created_at', { ascending: false })
      .range(from, from + pageSize - 1)

    if (error) return res.status(500).json({ error: error.message })

    const { data: counts, error: countsError } = await supabaseAdmin
      .from('projects')
      .select('status')
      .eq('workspace_id', workspaceId)
    if (countsError) return res.status(500).json({ error: countsError.message })

    const countMap: Record<string, number> = {}
    for (const row of counts || []) countMap[row.status] = (countMap[row.status] ?? 0) + 1

    await attachProfiles(projects || [])

    res.json({ projects: projects || [], total: count ?? (projects?.length ?? 0), page: pageNum, counts: countMap })
  } catch (err: any) {
    console.error('[projects] GET /projects error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// GET /api/projects/my — projects assigned to the current user
router.get('/projects/my', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const membership = await getMembership(userId)
    if (!membership) return res.status(404).json({ error: 'No workspace found' })

    const { data: projects, error } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('workspace_id', membership.workspace_id)
      .eq('assigned_tester', userId)
      .order('created_at', { ascending: false })

    if (error) return res.status(500).json({ error: error.message })

    await attachProfiles(projects || [])
    res.json({ projects: projects || [] })
  } catch (err: any) {
    console.error('[projects] GET /projects/my error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// GET /api/projects/:id — full project + its sessions
router.get('/projects/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const projectId = req.params.id

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const membership = await getMembership(userId)
    if (!membership || membership.workspace_id !== project.workspace_id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { data: sessions } = await supabaseAdmin
      .from('sessions')
      .select('id, title, status, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true })

    await attachProfiles([project])

    res.json({ project, sessions: sessions || [] })
  } catch (err: any) {
    console.error('[projects] GET /projects/:id error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/projects — create a project request
router.post('/projects', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const membership = await getMembership(userId)
    if (!membership) return res.status(404).json({ error: 'No workspace found' })

    const { name, overview, project_type, business_segment, business_impact, delivery_category, test_type, start_date, target_end_date, stakeholders, assign_tester } = req.body

    if (!name || !name.trim()) return res.status(400).json({ error: 'Project name is required' })
    if (stakeholders !== undefined && (!Array.isArray(stakeholders) || stakeholders.some(s => !s?.name))) {
      return res.status(400).json({ error: 'Stakeholders must be a list of objects with a name' })
    }

    const canAssign = isManager(membership.role) && !!assign_tester
    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .insert({
        workspace_id: membership.workspace_id,
        name: name.trim(),
        overview: overview ?? null,
        project_type: project_type ?? null,
        business_segment: business_segment ?? null,
        business_impact: business_impact ?? null,
        delivery_category: delivery_category ?? null,
        test_type: test_type ?? null,
        status: canAssign ? 'assigned' : 'requested',
        assigned_tester: canAssign ? assign_tester : null,
        created_by: userId,
        requested_by: userId,
        stakeholders: Array.isArray(stakeholders) ? stakeholders : [],
        start_date: start_date ?? null,
        target_end_date: target_end_date ?? null,
      })
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    await attachProfiles([project])
    res.status(201).json({ project })
  } catch (err: any) {
    console.error('[projects] POST /projects error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// PATCH /api/projects/:id — update fields / assign tester / resubmit
router.patch('/projects/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const projectId = req.params.id

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const membership = await getMembership(userId)
    if (!membership || membership.workspace_id !== project.workspace_id) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { assign_tester, resubmit, ...bodyFields } = req.body

    const fields: Record<string, unknown> = {}
    for (const key of PATCHABLE_FIELDS) {
      if (bodyFields[key] !== undefined) fields[key] = bodyFields[key]
    }

    // Assignment is manager-scoped
    if (assign_tester !== undefined) {
      if (!isManager(membership.role)) {
        return res.status(403).json({ error: 'Only managers can assign projects' })
      }
      fields.assigned_tester = assign_tester || null
      fields.status = assign_tester ? 'assigned' : 'requested'
    }

    // Re-submit after rejection
    if (resubmit && ['rejected', 'requested', 'draft'].includes(project.status)) {
      fields.status = 'requested'
      fields.rejection_reason = null
      fields.requested_by = userId
    }

    const { data: updated, error } = await supabaseAdmin
      .from('projects')
      .update(fields)
      .eq('id', projectId)
      .select()
      .single()

    if (error) return res.status(500).json({ error: error.message })

    await attachProfiles([updated])
    res.json({ project: updated })
  } catch (err: any) {
    console.error('[projects] PATCH /projects/:id error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/projects/:id/accept — assigned tester accepts; creates first session
router.post('/projects/:id/accept', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const projectId = req.params.id

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const membership = await getMembership(userId)
    if (!membership || membership.workspace_id !== project.workspace_id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    if (project.assigned_tester !== userId) {
      return res.status(403).json({ error: 'Only the assigned tester can accept this project' })
    }
    if (['accepted', 'in_progress', 'on_hold', 'uat', 'completed'].includes(project.status)) {
      return res.status(409).json({ error: 'Project already accepted' })
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('projects')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select()
      .single()
    if (updateError) return res.status(500).json({ error: updateError.message })

    // Create the project's first session (Approach A)
    const { data: session, error: sessionError } = await supabaseAdmin
      .from('sessions')
      .insert({
        project_id: projectId,
        workspace_id: project.workspace_id,
        title: project.name,
        requirements_text: '',
        status: 'draft',
        created_by: userId,
      })
      .select('id, title, status, created_at')
      .single()
    if (sessionError) return res.status(500).json({ error: sessionError.message })

    res.json({ project: updated, session })
  } catch (err: any) {
    console.error('[projects] POST /projects/:id/accept error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/projects/:id/reject — assigned tester rejects with a required reason
router.post('/projects/:id/reject', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const projectId = req.params.id
    const { rejection_reason } = req.body

    if (!rejection_reason || !rejection_reason.trim()) {
      return res.status(400).json({ error: 'A rejection reason is required' })
    }

    const { data: project } = await supabaseAdmin
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single()
    if (!project) return res.status(404).json({ error: 'Project not found' })

    const membership = await getMembership(userId)
    if (!membership || membership.workspace_id !== project.workspace_id) {
      return res.status(403).json({ error: 'Access denied' })
    }
    if (project.assigned_tester !== userId) {
      return res.status(403).json({ error: 'Only the assigned tester can reject this project' })
    }

    const { data: updated, error: updateError } = await supabaseAdmin
      .from('projects')
      .update({ status: 'rejected', rejection_reason: rejection_reason.trim(), updated_at: new Date().toISOString() })
      .eq('id', projectId)
      .select()
      .single()
    if (updateError) return res.status(500).json({ error: updateError.message })

    if (project.requested_by) {
      const { data: requester } = await supabaseAdmin
        .from('profiles')
        .select('email')
        .eq('id', project.requested_by)
        .maybeSingle()
      if (requester?.email) {
        sendProjectRejected({ to: requester.email, projectName: project.name, reason: rejection_reason.trim() })
      }
    }

    await attachProfiles([updated])
    res.json({ project: updated })
  } catch (err: any) {
    console.error('[projects] POST /projects/:id/reject error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

export default router