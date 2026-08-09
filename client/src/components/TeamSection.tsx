import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { fetchWithAuth } from '@/lib/api'
import type { WorkspaceMember, WorkspaceInvitation } from '@/types/database'

interface MemberRow extends WorkspaceMember {
  profiles?: { email: string; full_name: string | null } | null
}

interface InvitationRow extends WorkspaceInvitation {
  profiles?: { email: string; full_name: string | null } | null
}

export function TeamSection({ userId }: { userId: string }) {
  const { toast } = useToast()
  const [members, setMembers] = useState<MemberRow[]>([])
  const [invites, setInvites] = useState<InvitationRow[]>([])
  const [loading, setLoading] = useState(true)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'member' | 'tester'>('member')
  const [inviting, setInviting] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<MemberRow | null>(null)
  const [cancellingInvite, setCancellingInvite] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    setFetchError(null)
    try {
      const [membersRes, invitesRes] = await Promise.all([
        fetchWithAuth('/api/workspace/members'),
        fetchWithAuth('/api/workspace/sent-invitations'),
      ])
      if (!membersRes.ok) throw new Error('Failed to load members')
      const membersData = await membersRes.json()
      setMembers(membersData.members || [])
      setWorkspaceId(membersData.workspace_id)

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json()
        setInvites(invitesData.invitations?.filter((i: any) => i.status === 'pending') || [])
      }
    } catch (err: any) {
      setFetchError(err.message || 'Failed to load team data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  const currentMember = members.find(m => m.user_id === userId)
  const isAdminOrOwner = currentMember && ['owner', 'admin'].includes(currentMember.role)

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    setInviting(true)
    try {
      const res = await fetchWithAuth('/api/workspace/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Invite failed')
      toast(`Invitation sent to ${inviteEmail}`, 'success')
      setShowInvite(false)
      setInviteEmail('')
      fetchAll()
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setInviting(false)
    }
  }

  async function handleCancelInvite(inviteId: string) {
    setCancellingInvite(inviteId)
    try {
      const res = await fetchWithAuth(`/api/workspace/invitations/${inviteId}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to cancel invitation')
      }
      toast('Invitation cancelled', 'info')
      fetchAll()
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setCancellingInvite(null)
    }
  }

  async function handleRoleChange(memberId: string, newRole: string) {
    try {
      const res = await fetchWithAuth(`/api/workspace/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to update role')
      }
      toast('Role updated', 'success')
      fetchAll()
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  async function handleRemove() {
    if (!removeTarget) return
    try {
      const res = await fetchWithAuth(`/api/workspace/members/${removeTarget.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to remove member')
      }
      toast(`${removeTarget.profiles?.email || 'Member'} removed`, 'info')
      setRemoveTarget(null)
      fetchAll()
    } catch (err: any) {
      toast(err.message, 'error')
    }
  }

  const roleOptions = ['admin', 'tester', 'member'] as const
  const roleColors: Record<string, string> = {
    owner: 'text-warning bg-warning/10 border-warning/20',
    admin: 'text-primary bg-primary/5 border-primary/20',
    tester: 'text-on-surface-variant bg-surface-container-low border-outline-variant/20',
    member: 'text-on-surface-variant bg-surface-container-low border-outline-variant/20',
  }

  return (
    <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-6 shadow-rest flex flex-col gap-6">
      <div className="border-b border-outline-variant pb-4 flex items-center justify-between">
        <h3 className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">Team</h3>
        {workspaceId && (
          <span className="font-mono text-[10px] text-on-surface-variant/50">ID: {workspaceId.slice(0, 8)}</span>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-surface-container rounded-lg skeleton-shimmer" />
          ))}
        </div>
      ) : fetchError ? (
        <div className="text-center py-6">
          <p className="text-[13px] text-error mb-3">{fetchError}</p>
          <button
            type="button"
            onClick={fetchAll}
            className="text-[12px] font-heading font-semibold text-primary underline underline-offset-2 hover:text-on-surface-variant transition-colors"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="space-y-1">
          {members.map(m => {
            const isSelf = m.user_id === userId
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-surface-container/50 transition-colors group"
              >
                <div className="w-8 h-8 rounded-full bg-surface-container-higher border border-outline-variant/20 flex items-center justify-center text-[12px] font-heading font-semibold text-primary shrink-0">
                  {(m.profiles?.full_name?.[0] || m.profiles?.email?.[0] || '?').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-body-md text-[13px] text-primary truncate">
                    {m.profiles?.full_name || 'Unnamed'}
                    {isSelf && <span className="text-on-surface-variant/50 ml-1 text-[11px]">(you)</span>}
                  </div>
                  <div className="font-mono text-[11px] text-on-surface-variant truncate">{m.profiles?.email}</div>
                </div>
                <span className={`text-[10px] font-heading font-semibold uppercase tracking-[0.05em] px-2 py-0.5 rounded border ${roleColors[m.role] || roleColors.member}`}>
                  {m.role}
                </span>
                {isAdminOrOwner && !isSelf && m.role !== 'owner' && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <select
                      value={m.role}
                      onChange={e => handleRoleChange(m.id, e.target.value)}
                      className="text-[10px] font-heading bg-surface-container border border-outline-variant/20 rounded px-1.5 py-1 text-on-surface-variant focus:outline-none focus:ring-1 focus:ring-focus-ring cursor-pointer"
                      aria-label={`Change role for ${m.profiles?.email}`}
                    >
                      {roleOptions.map(r => (
                        <option key={r} value={r} disabled={currentMember?.role === 'admin' && r === 'admin'}>{r}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setRemoveTarget(m)}
                      className="p-1 rounded hover:bg-error/10 text-on-surface-variant hover:text-error transition-colors"
                      aria-label={`Remove ${m.profiles?.email}`}
                    >
                      <Icon name="close" size={14} />
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pending invitations */}
      {invites.length > 0 && (
        <div className="space-y-2">
          <h4 className="font-heading text-[10px] uppercase tracking-[0.05em] text-on-surface-variant/60 font-semibold">
            Pending Invitations
          </h4>
          {invites.map(inv => (
            <div key={inv.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container/30">
              <div className="w-8 h-8 rounded-full bg-surface-container-higher border border-outline-variant/20 flex items-center justify-center text-[12px] font-heading font-semibold text-on-surface-variant/50 shrink-0">
                ?
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[12px] text-on-surface-variant truncate">{inv.email}</div>
                <div className="text-[10px] text-on-surface-variant/50">
                  Invited as <span className="font-heading font-semibold uppercase">{inv.role}</span>
                </div>
              </div>
              {isAdminOrOwner && (
                <button
                  type="button"
                  onClick={() => handleCancelInvite(inv.id)}
                  disabled={cancellingInvite === inv.id}
                  className="text-[10px] font-heading font-semibold text-error hover:text-on-surface-variant transition-colors disabled:opacity-40"
                >
                  {cancellingInvite === inv.id ? '...' : 'Cancel'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {isAdminOrOwner && (
        <button
          type="button"
          onClick={() => setShowInvite(true)}
          className="self-start flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant/30 bg-surface-container-low hover:bg-surface-container transition-colors text-[12px] font-heading font-semibold text-primary"
        >
          <Icon name="person-add" size={16} />
          Invite Member
        </button>
      )}

      {/* Invite Modal */}
      {showInvite && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowInvite(false)}>
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl p-6 w-full max-w-md shadow-elevated mx-4" onClick={e => e.stopPropagation()}>
            <h4 className="font-heading text-[16px] font-semibold text-primary mb-4">Invite Member</h4>
            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label htmlFor="invite-email" className="font-heading text-[11px] uppercase tracking-[0.05em] text-primary font-semibold block mb-1.5">Email Address</label>
                <input
                  id="invite-email"
                  type="email"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                  autoFocus
                  className="w-full px-3 py-2 font-body-md bg-surface-container border border-outline-variant/30 rounded-lg text-primary placeholder:text-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-focus-ring ring-offset-2"
                />
              </div>
              <div>
                <label htmlFor="invite-role" className="font-heading text-[11px] uppercase tracking-[0.05em] text-primary font-semibold block mb-1.5">Role</label>
                <select
                  id="invite-role"
                  value={inviteRole}
                  onChange={e => setInviteRole(e.target.value as 'member' | 'tester')}
                  className="w-full px-3 py-2 font-body-md bg-surface-container border border-outline-variant/30 rounded-lg text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring ring-offset-2"
                >
                  <option value="member">Member — can view sessions and test cases</option>
                  <option value="tester">Tester — can execute tests and log results</option>
                </select>
              </div>
              <p className="text-[11px] text-on-surface-variant/70">
                An invitation will be sent to this email. The user can accept it from their workspace screen.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInvite(false)}
                  className="px-4 py-2 text-[13px] text-on-surface-variant hover:text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviting || !inviteEmail.trim()}
                  className="bg-primary text-on-primary rounded-lg px-5 py-2 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {inviting ? <><div className="w-3 h-3 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> Sending...</> : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!removeTarget}
        title={`Remove ${removeTarget?.profiles?.email || 'member'}?`}
        message="This member will lose access to all sessions and test cases in this workspace. Their existing sessions will remain but they won't be able to access them."
        confirmLabel="Remove"
        onConfirm={handleRemove}
        onCancel={() => setRemoveTarget(null)}
      />
    </section>
  )
}
