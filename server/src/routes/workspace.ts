import { Router, Request, Response } from 'express'
import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAuth } from '../lib/auth-middleware.js'
import { sendWorkspaceInvitation } from '../lib/email.js'

async function attachProfiles(supabase: SupabaseClient, rows: { user_id: string }[]) {
  const userIds = [...new Set(rows.map(r => r.user_id))]
  if (userIds.length === 0) return
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .in('id', userIds)
  const map = new Map((profiles || []).map(p => [p.id, p]))
  for (const row of rows) {
    ;(row as any).profiles = map.get(row.user_id) || null
  }
}

const router = Router()
router.use(requireAuth)

// GET /api/workspace/members — list members of the user's workspace
router.get('/workspace/members', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!

    const { data: membership, error: membershipError } = await req.supabase!
      .from('workspace_members')
      .select('workspace_id')
      .eq('user_id', userId)
      .single()

    if (membershipError || !membership) {
      return res.status(404).json({ error: 'No workspace found' })
    }

    const { data: members, error: membersError } = await req.supabase!
      .from('workspace_members')
      .select('id, workspace_id, user_id, role, invited_at, joined_at')
      .eq('workspace_id', membership.workspace_id)
      .order('invited_at', { ascending: true })

    if (membersError) {
      return res.status(500).json({ error: membersError.message })
    }

    await attachProfiles(req.supabase!, members || [])

    res.json({ members: members || [], workspace_id: membership.workspace_id })
  } catch (err: any) {
    console.error('[workspace] GET /members error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/workspace/invite — send an invitation by email (accept flow)
router.post('/workspace/invite', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const { email, role } = req.body

    if (!email) return res.status(400).json({ error: 'Email is required' })

    const { data: callerMembership } = await req.supabase!
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId)
      .single()

    if (!callerMembership) return res.status(404).json({ error: 'No workspace found' })
    if (!['owner', 'admin'].includes(callerMembership.role)) {
      return res.status(403).json({ error: 'Only owners and admins can invite members' })
    }

    // Check if user is already a member (if their profile exists)
    const { data: profile } = await req.supabase!
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle()

    if (profile) {
      const { data: existing } = await req.supabase!
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', callerMembership.workspace_id)
        .eq('user_id', profile.id)
        .single()

      if (existing) {
        return res.status(409).json({ error: 'User is already a member of this workspace' })
      }
    }

    // Check for existing pending invitation for this email
    const { data: existingInvite } = await req.supabase!
      .from('workspace_invitations')
      .select('id, status')
      .eq('workspace_id', callerMembership.workspace_id)
      .eq('email', email)
      .in('status', ['pending'])
      .maybeSingle()

    if (existingInvite) {
      return res.status(409).json({ error: 'A pending invitation already exists for this email' })
    }

    const newRole = ['admin', 'manager', 'tester', 'developer', 'viewer'].includes(role) ? role : 'tester'
    const { data: invitation, error: insertError } = await req.supabase!
      .from('workspace_invitations')
      .insert({
        workspace_id: callerMembership.workspace_id,
        email,
        role: newRole,
        invited_by: userId,
      })
      .select('id, workspace_id, email, role, status, created_at, expires_at')
      .single()

    if (insertError) return res.status(500).json({ error: insertError.message })

    const { data: inviterProfile } = await req.supabase!
      .from('profiles')
      .select('full_name')
      .eq('id', userId)
      .maybeSingle()

    const { data: workspace } = await req.supabase!
      .from('workspaces')
      .select('name')
      .eq('id', callerMembership.workspace_id)
      .single()

    sendWorkspaceInvitation({
      to: email,
      inviterName: inviterProfile?.full_name ?? 'A team member',
      workspaceName: workspace?.name ?? 'a workspace',
      role: newRole,
    })

    res.json({ invitation })
  } catch (err: any) {
    console.error('[workspace] POST /invite error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// GET /api/workspace/invitations — list pending invitations for current user
router.get('/workspace/invitations', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!

    const { data: profile } = await req.supabase!
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (!profile) return res.status(404).json({ error: 'Profile not found' })

    const { data: invitations } = await req.supabase!
      .from('workspace_invitations')
      .select('id, workspace_id, email, role, status, created_at, expires_at, invited_by')
      .eq('email', profile.email)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })

    // Attach workspace names
    if (invitations && invitations.length > 0) {
      const workspaceIds = [...new Set(invitations.map(i => i.workspace_id))]
      const { data: workspaces } = await req.supabase!
        .from('workspaces')
        .select('id, name')
        .in('id', workspaceIds)
      const wsMap = new Map((workspaces || []).map(w => [w.id, w.name]))
      for (const inv of invitations) {
        ;(inv as any).workspace_name = wsMap.get(inv.workspace_id) || null
      }
    }

    res.json({ invitations: invitations || [] })
  } catch (err: any) {
    console.error('[workspace] GET /invitations error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// GET /api/workspace/sent-invitations — list invitations sent by this workspace (admin view)
router.get('/workspace/sent-invitations', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!

    const { data: membership } = await req.supabase!
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId)
      .single()

    if (!membership) return res.status(404).json({ error: 'No workspace found' })
    if (!['owner', 'admin'].includes(membership.role)) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const { data: invitations } = await req.supabase!
      .from('workspace_invitations')
      .select('id, workspace_id, email, role, status, created_at, expires_at, invited_by')
      .eq('workspace_id', membership.workspace_id)
      .order('created_at', { ascending: false })

    if (invitations && invitations.length > 0) {
      const invitedByUserIds = [...new Set(invitations.map(i => i.invited_by))]
      const { data: invitedByProfiles } = await req.supabase!
        .from('profiles')
        .select('id, email, full_name')
        .in('id', invitedByUserIds)
      const profileMap = new Map((invitedByProfiles || []).map(p => [p.id, p]))
      for (const inv of invitations) {
        ;(inv as any).profiles = profileMap.get(inv.invited_by) || null
      }
    }

    res.json({ invitations: invitations || [] })
  } catch (err: any) {
    console.error('[workspace] GET /sent-invitations error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/workspace/invitations/:id/accept — accept a pending invitation
router.post('/workspace/invitations/:id/accept', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const invitationId = req.params.id

    const { data: profile } = await req.supabase!
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (!profile) return res.status(404).json({ error: 'Profile not found' })

    const { data: invitation } = await req.supabase!
      .from('workspace_invitations')
      .select('*')
      .eq('id', invitationId)
      .eq('email', profile.email)
      .eq('status', 'pending')
      .single()

    if (!invitation) return res.status(404).json({ error: 'Invitation not found or already processed' })

    if (new Date(invitation.expires_at) < new Date()) {
      await req.supabase!.from('workspace_invitations').update({ status: 'expired' }).eq('id', invitationId)
      return res.status(410).json({ error: 'Invitation has expired' })
    }

    // Check not already a member
    const { data: existing } = await req.supabase!
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', invitation.workspace_id)
      .eq('user_id', userId)
      .single()

    if (existing) {
      await req.supabase!.from('workspace_invitations').update({ status: 'accepted' }).eq('id', invitationId)
      return res.json({ member: existing, message: 'Already a member' })
    }

    // Add as workspace member
    const { data: member, error: insertError } = await req.supabase!
      .from('workspace_members')
      .insert({
        workspace_id: invitation.workspace_id,
        user_id: userId,
        role: invitation.role,
        invited_at: invitation.created_at,
        joined_at: new Date().toISOString(),
      })
      .select('id, workspace_id, user_id, role, invited_at, joined_at')
      .single()

    if (insertError) return res.status(500).json({ error: insertError.message })

    // Mark invitation as accepted
    await req.supabase!.from('workspace_invitations').update({ status: 'accepted' }).eq('id', invitationId)

    res.json({ member })
  } catch (err: any) {
    console.error('[workspace] POST /invitations/:id/accept error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/workspace/invitations/:id/decline — decline a pending invitation
router.post('/workspace/invitations/:id/decline', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const invitationId = req.params.id

    const { data: profile } = await req.supabase!
      .from('profiles')
      .select('email')
      .eq('id', userId)
      .single()

    if (!profile) return res.status(404).json({ error: 'Profile not found' })

    const { data: invitation } = await req.supabase!
      .from('workspace_invitations')
      .select('id')
      .eq('id', invitationId)
      .eq('email', profile.email)
      .eq('status', 'pending')
      .single()

    if (!invitation) return res.status(404).json({ error: 'Invitation not found or already processed' })

    await req.supabase!.from('workspace_invitations').update({ status: 'declined' }).eq('id', invitationId)

    res.json({ success: true })
  } catch (err: any) {
    console.error('[workspace] POST /invitations/:id/decline error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// PATCH /api/workspace/members/:id — update member role
router.patch('/workspace/members/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const memberId = req.params.id
    const { role } = req.body

    if (!role || !['admin', 'manager', 'tester', 'developer', 'viewer'].includes(role)) {
      return res.status(400).json({ error: 'Valid role is required (admin, manager, tester, developer, viewer)' })
    }

    const { data: callerMembership } = await req.supabase!
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId)
      .single()

    if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
      return res.status(403).json({ error: 'Only owners and admins can change roles' })
    }

    const { data: targetMember } = await req.supabase!
      .from('workspace_members')
      .select('id, role')
      .eq('id', memberId)
      .eq('workspace_id', callerMembership.workspace_id)
      .single()

    if (!targetMember) return res.status(404).json({ error: 'Member not found' })
    if (targetMember.role === 'owner') {
      return res.status(403).json({ error: 'Cannot change the owner role' })
    }
    if (callerMembership.role === 'admin' && role === 'admin') {
      return res.status(403).json({ error: 'Admins cannot promote others to admin' })
    }

    const { error: updateError } = await req.supabase!
      .from('workspace_members')
      .update({ role })
      .eq('id', memberId)

    if (updateError) return res.status(500).json({ error: updateError.message })

    res.json({ success: true })
  } catch (err: any) {
    console.error('[workspace] PATCH /members/:id error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// DELETE /api/workspace/members/:id — remove a member
router.delete('/workspace/members/:id', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const memberId = req.params.id

    const { data: callerMembership } = await req.supabase!
      .from('workspace_members')
      .select('workspace_id, role')
      .eq('user_id', userId)
      .single()

    if (!callerMembership || !['owner', 'admin'].includes(callerMembership.role)) {
      return res.status(403).json({ error: 'Only owners and admins can remove members' })
    }

    const { data: targetMember } = await req.supabase!
      .from('workspace_members')
      .select('id, role')
      .eq('id', memberId)
      .eq('workspace_id', callerMembership.workspace_id)
      .single()

    if (!targetMember) return res.status(404).json({ error: 'Member not found' })
    if (targetMember.role === 'owner') {
      return res.status(403).json({ error: 'Cannot remove the workspace owner' })
    }

    const { error: deleteError } = await req.supabase!
      .from('workspace_members')
      .delete()
      .eq('id', memberId)

    if (deleteError) return res.status(500).json({ error: deleteError.message })

    res.json({ success: true })
  } catch (err: any) {
    console.error('[workspace] DELETE /members/:id error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// GET /api/sessions/:id/activity — activity timeline for a session
router.get('/sessions/:id/activity', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const sessionId = req.params.id

    const { data: session } = await req.supabase!
      .from('sessions')
      .select('workspace_id')
      .eq('id', sessionId)
      .single()

    if (!session) return res.status(404).json({ error: 'Session not found' })

    const { data: membership } = await req.supabase!
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', session.workspace_id)
      .eq('user_id', userId)
      .single()

    if (!membership) return res.status(403).json({ error: 'Access denied' })

    const { data: activity, error: activityError } = await req.supabase!
      .from('activity_log')
      .select('id, session_id, user_id, action, details, created_at')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (activityError) return res.status(500).json({ error: activityError.message })

    await attachProfiles(req.supabase!, activity || [])

    res.json({ activity: activity || [] })
  } catch (err: any) {
    console.error('[workspace] GET /sessions/:id/activity error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

// POST /api/sessions/:id/assign — assign session to a user
router.post('/sessions/:id/assign', async (req: Request, res: Response) => {
  try {
    const userId = req.userId!
    const sessionId = req.params.id
    const { assignedTo } = req.body

    const { data: session } = await req.supabase!
      .from('sessions')
      .select('workspace_id')
      .eq('id', sessionId)
      .single()

    if (!session) return res.status(404).json({ error: 'Session not found' })

    const { data: membership } = await req.supabase!
      .from('workspace_members')
      .select('id')
      .eq('workspace_id', session.workspace_id)
      .eq('user_id', userId)
      .single()

    if (!membership) return res.status(403).json({ error: 'Access denied' })

    if (assignedTo) {
      const { data: assigneeMembership } = await req.supabase!
        .from('workspace_members')
        .select('id')
        .eq('workspace_id', session.workspace_id)
        .eq('user_id', assignedTo)
        .single()

      if (!assigneeMembership) {
        return res.status(400).json({ error: 'Assignee is not a workspace member' })
      }
    }

    const { error: updateError } = await req.supabase!
      .from('sessions')
      .update({ assigned_to: assignedTo || null })
      .eq('id', sessionId)

    if (updateError) return res.status(500).json({ error: updateError.message })

    const assignedUserName = req.body.assignedName || 'someone'
    void req.supabase!.from('activity_log').insert({
      session_id: sessionId,
      user_id: userId,
      action: assignedTo ? 'assigned' : 'unassigned',
      details: assignedTo
        ? { assigned_to: assignedTo, assigned_name: assignedUserName }
        : {},
    })

    res.json({ success: true })
  } catch (err: any) {
    console.error('[workspace] POST /sessions/:id/assign error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

router.delete('/sessions/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await req.supabase!.rpc('delete_session', { p_session_id: req.params.id })
    if (error) {
      console.error('[workspace] DELETE /sessions/:id rpc error:', error)
      return res.status(500).json({ error: error.message })
    }
    res.json({ success: true })
  } catch (err: any) {
    console.error('[workspace] DELETE /sessions/:id error:', err)
    res.status(500).json({ error: err.message || 'Internal server error' })
  }
})

export default router
