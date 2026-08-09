import { useState, useEffect, useCallback } from 'react'
import { Icon } from '@/components/Icon'
import { useToast } from '@/components/Toast'
import { fetchWithAuth } from '@/lib/api'
import { supabase } from '@/lib/supabase'

interface Invitation {
  id: string
  workspace_id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  workspace_name?: string | null
}

export function PendingInvitations({ userId: _userId }: { userId: string }) {
  const { toast } = useToast()
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  const fetchInvitations = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { setLoading(false); return }
      const res = await fetchWithAuth('/api/workspace/invitations')
      if (!res.ok) return
      const data = await res.json()
      setInvitations(data.invitations || [])
    } catch {
      // silent fail
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchInvitations() }, [fetchInvitations])

  async function handleAccept(id: string) {
    setProcessing(id)
    try {
      const res = await fetchWithAuth(`/api/workspace/invitations/${id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to accept invitation')
      toast('Joined workspace!', 'success')
      setInvitations(prev => prev.filter(i => i.id !== id))
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setProcessing(null)
    }
  }

  async function handleDecline(id: string) {
    setProcessing(id)
    try {
      const res = await fetchWithAuth(`/api/workspace/invitations/${id}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to decline invitation')
      toast('Invitation declined', 'info')
      setInvitations(prev => prev.filter(i => i.id !== id))
    } catch (err: any) {
      toast(err.message, 'error')
    } finally {
      setProcessing(null)
    }
  }

  if (loading) return null
  if (invitations.length === 0) {
    return (
      <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-6 shadow-rest flex flex-col gap-4">
        <h2 className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">
          Pending Invitations
        </h2>
        <p className="font-body-md text-[13px] text-on-surface-variant/60">No pending invitations.</p>
      </section>
    )
  }

  return (
    <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-6 shadow-rest flex flex-col gap-4">
      <h2 className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">
        Pending Invitations
      </h2>
      <div className="space-y-2">
        {invitations.map(inv => (
          <div key={inv.id} className="flex items-center gap-3 px-4 py-3 rounded-lg bg-surface-container/40 border border-outline-variant/20">
            <div className="w-9 h-9 rounded-full bg-surface-container-higher border border-outline-variant/20 flex items-center justify-center shrink-0">
              <Icon name="person-add" size={16} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-body-md text-[13px] text-primary">
                {inv.workspace_name || 'Unnamed Workspace'}
              </div>
              <div className="font-mono text-[11px] text-on-surface-variant">
                Invited as <span className="font-heading font-semibold uppercase">{inv.role}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDecline(inv.id)}
                disabled={processing === inv.id}
                className="px-3 py-1.5 text-[11px] font-heading font-semibold text-on-surface-variant border border-outline-variant/30 rounded-lg hover:bg-surface-container transition-colors disabled:opacity-40"
              >
                Decline
              </button>
              <button
                type="button"
                onClick={() => handleAccept(inv.id)}
                disabled={processing === inv.id}
                className="px-3 py-1.5 text-[11px] font-heading font-semibold bg-primary text-on-primary rounded-lg hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {processing === inv.id ? (
                  <><div className="w-3 h-3 border-2 border-on-primary border-t-transparent rounded-full animate-spin" /> Accepting...</>
                ) : 'Accept'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
