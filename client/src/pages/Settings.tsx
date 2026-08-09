import { useStaggerOnce } from '@/hooks/useStaggerOnce'
import { StaggerItem } from '@/components/react-bits/StaggerItem'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { useToast } from '@/components/Toast'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Icon } from '@/components/Icon'
import { TeamSection } from '@/components/TeamSection'
import { fetchWithAuth } from '@/lib/api'

export function Settings() {
  const staggerSections = useStaggerOnce('settings-sections')
  useDocumentTitle('Settings')
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()

  // Password state
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  // Sign out state
  const [showSignOut, setShowSignOut] = useState(false)

  // Profile state
  const [fullName, setFullName] = useState('')
  const [profileLoaded, setProfileLoaded] = useState(false)

  // Delete account state
  const [showDeleteAccount, setShowDeleteAccount] = useState(false)
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('')

  // Preferences state
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system')
  const [defaultFilter, setDefaultFilter] = useState<string>('all')

  // Load profile on mount
  useEffect(() => {
    if (user && !profileLoaded) {
      ;(async () => {
        const { data } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', user.id)
          .single()
        if (data?.full_name) setFullName(data.full_name)
        setProfileLoaded(true)
      })()
    }
  }, [user, profileLoaded])

  // Load preferences
  useEffect(() => {
    const savedTheme = localStorage.getItem('docket-theme') as 'light' | 'dark' | 'system' | null
    const savedFilter = localStorage.getItem('docket-default-filter')
    if (savedTheme) setTheme(savedTheme)
    if (savedFilter) setDefaultFilter(savedFilter)
  }, [])

  const { data: stats } = useQuery({
    queryKey: ['tracking-stats'],
    queryFn: () => fetchWithAuth('/api/tracking/stats').then((r) => r.json()),
  })

  // Update profile mutation
  const updateProfile = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Not authenticated')
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, full_name: name, updated_at: new Date().toISOString(), email: user.email! })
      if (error) throw error
    },
    onSuccess: () => {
      toast('Profile updated', 'success')
      queryClient.invalidateQueries({ queryKey: ['profile'] })
    },
    onError: (err: Error) => {
      toast(err.message, 'error')
    },
  })

  const [passwordUpdating, setPasswordUpdating] = useState(false)

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)
    setPasswordUpdating(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    })

    if (error) {
      setMessage(error.message)
    } else {
      setMessage('Password updated successfully.')
      setNewPassword('')
      setShowPasswordForm(false)
      toast('Password updated', 'success')
    }
    setPasswordUpdating(false)
  }

  const handleSaveProfile = () => {
    if (!user || !fullName.trim()) return
    updateProfile.mutate(fullName.trim())
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    localStorage.setItem('docket-theme', newTheme)
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark')
    } else if (newTheme === 'light') {
      document.documentElement.classList.remove('dark')
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      document.documentElement.classList.toggle('dark', prefersDark)
    }
    toast(`Theme set to ${newTheme}`, 'info')
  }

  const handleDefaultFilterChange = (val: string) => {
    setDefaultFilter(val)
    localStorage.setItem('docket-default-filter', val)
  }

  const handleSignOut = async () => {
    await signOut()
    navigate('/sign-in')
  }

  const handleDeleteAccount = async () => {
    if (!user || deleteConfirmEmail !== user.email) return
    try {
      const res = await fetchWithAuth('/api/account', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete account')
      toast('Account deleted', 'info')
      await signOut()
      navigate('/sign-up')
    } catch {
      toast('Account deletion requires admin assistance. Please email support.', 'error')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto w-full">
      <div className={`max-w-3xl mx-auto w-full px-4 md:px-10 py-12 md:py-16 flex flex-col gap-8${staggerSections ? ' stagger-enter' : ''}`}>
        {/* Page Header */}
        <StaggerItem index={0}><div className="border-b border-outline-variant pb-6 mb-2">
          <h2 className="font-heading text-[24px] md:text-[32px] text-primary">Settings</h2>
          <p className="font-body-md text-[14px] text-on-surface-variant mt-2 max-w-lg">Manage your account, preferences, and security.</p>
        </div></StaggerItem>

        {/* Profile Section */}
        <StaggerItem index={1}><section className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-6 shadow-rest card-interactive flex flex-col gap-6">
          <div className="border-b border-outline-variant pb-4">
            <h3 className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">Profile</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-heading text-[11px] uppercase tracking-[0.05em] text-primary font-semibold">Email Address</label>
              <div className="bg-surface-container border border-outline-variant/30 rounded-lg px-4 py-3 flex items-center gap-3">
                <Icon name="mail" size={18} className="text-on-surface-variant" />
                <span className="font-mono text-[13px] text-primary select-all">{user?.email ?? '—'}</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="full-name" className="font-heading text-[11px] uppercase tracking-[0.05em] text-primary font-semibold">Display Name</label>
              <div className="flex items-center gap-2">
                <input
                  id="full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Your name"
                  className="flex-1 px-3 py-2 font-body-md bg-surface-container border border-outline-variant/30 rounded-lg
                             text-primary placeholder:text-on-surface-variant/60
                             focus:outline-none focus:ring-2 focus:ring-focus-ring ring-offset-2"
                />
                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={updateProfile.isPending || !fullName.trim()}
                  className="bg-primary text-on-primary rounded-lg px-4 py-2 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold
                             hover:opacity-90 active:scale-[0.97] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {updateProfile.isPending ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </section></StaggerItem>

        {/* Preferences Section */}
        <StaggerItem index={2}><section className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-6 shadow-rest card-interactive flex flex-col gap-6">
          <div className="border-b border-outline-variant pb-4">
            <h3 className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">Preferences</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-3">
              <label className="font-heading text-[11px] uppercase tracking-[0.05em] text-primary font-semibold">Theme</label>
              <div className="flex gap-2">
                {(['light', 'dark', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleThemeChange(t)}
                    className={`px-4 py-2 rounded-lg font-heading text-[10px] uppercase tracking-[0.05em] font-semibold transition-all
                      ${theme === t
                        ? 'bg-primary text-on-primary shadow-rest'
                        : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-highest'
                      }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <label htmlFor="default-filter" className="font-heading text-[11px] uppercase tracking-[0.05em] text-primary font-semibold">Default Test Filter</label>
              <select
                id="default-filter"
                value={defaultFilter}
                onChange={(e) => handleDefaultFilterChange(e.target.value)}
                className="px-3 py-2 font-body-md bg-surface-container border border-outline-variant/30 rounded-lg
                           text-primary focus:outline-none focus:ring-2 focus:ring-focus-ring ring-offset-2"
              >
                <option value="all">All tests</option>
                <option value="not_run">Not run</option>
                <option value="pass">Passed</option>
                <option value="fail">Failed</option>
              </select>
            </div>
          </div>
        </section></StaggerItem>

        {/* Security Section */}
        <StaggerItem index={3}><section className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-6 shadow-rest card-interactive flex flex-col gap-6">
          <div className="border-b border-outline-variant pb-4">
            <h3 className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">Security</h3>
          </div>
          {!showPasswordForm ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 max-w-2xl">
              <div>
                <h4 className="font-body-md text-[14px] font-medium text-primary mb-1">Password Authentication</h4>
                <p className="font-body-md text-[14px] text-on-surface-variant">Regular password updates are recommended.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowPasswordForm(true)}
                className="bg-surface text-primary border border-outline-variant/30 hover:border-primary hover:bg-surface-container-low font-heading text-[11px] uppercase tracking-[0.05em] font-semibold px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <Icon name="key" size={16} className="text-on-surface-variant" />
                Update Password
              </button>
            </div>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4 max-w-md">
              <div>
                <label htmlFor="new-password" className="font-heading text-[11px] uppercase tracking-[0.05em] text-primary font-semibold block mb-1.5">
                  New password
                </label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={8}
                  className="w-full px-3 py-2 font-body-md bg-surface-container border border-outline-variant/30 rounded-lg
                             text-primary placeholder:text-on-surface-variant/60
                             focus:outline-none focus:ring-2 focus:ring-focus-ring ring-offset-2"
                  placeholder="At least 8 characters"
                />
              </div>

              {message && (
                <p className={`font-mono text-[12px] ${message.includes('success') ? 'text-success' : 'text-error'}`}>
                  {message}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={passwordUpdating}
                  className="bg-primary text-on-primary rounded-lg px-5 py-2 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold hover:opacity-90 active:scale-[0.97] transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {passwordUpdating ? 'Updating...' : 'Update password'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowPasswordForm(false); setMessage(null); setNewPassword('') }}
                  className="font-body-md text-[14px] text-on-surface-variant hover:text-primary transition-colors px-3"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </section></StaggerItem>

        {/* Team Section */}
        {user && <TeamSection userId={user.id} />}

        {/* Account Stats */}
        {stats && (
          <StaggerItem index={4}><section className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-6 shadow-rest card-interactive flex flex-col gap-4">
            <div className="border-b border-outline-variant pb-4">
              <h3 className="font-heading text-[11px] uppercase tracking-[0.05em] text-on-surface-variant font-semibold">Usage</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
              <div className="border border-outline-variant/30 rounded-lg p-4 bg-surface-container/50">
                <p className="font-heading text-[20px] md:text-[24px] font-semibold text-primary">{stats.totalSessions}</p>
                <p className="font-mono text-[11px] text-on-surface-variant">Sessions</p>
              </div>
              <div className="border border-outline-variant/30 rounded-lg p-4 bg-surface-container/50">
                <p className="font-heading text-[20px] md:text-[24px] font-semibold text-primary">{stats.totalTestCases}</p>
                <p className="font-mono text-[11px] text-on-surface-variant">Test cases</p>
              </div>
              <div className="border border-outline-variant/30 rounded-lg p-4 bg-surface-container/50">
                <p className="font-heading text-[20px] md:text-[24px] font-semibold text-primary">{stats.feedback?.kept ?? 0}</p>
                <p className="font-mono text-[11px] text-on-surface-variant">Kept as-is</p>
              </div>
            </div>
            {stats.totalTestCases > 0 && (
              <div className="font-mono text-[11px] text-on-surface-variant">
                {stats.feedback?.edited ?? 0} edited · {stats.feedback?.deleted ?? 0} deleted · {Math.round(((stats.feedback?.kept ?? 0) / stats.totalTestCases) * 100)}% kept without changes
              </div>
            )}
          </section></StaggerItem>
        )}

        {/* Sign Out + Delete Account */}
        <StaggerItem index={5}><section className="mt-8 pt-8 border-t border-outline-variant flex flex-col items-start gap-4">
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setShowSignOut(true)}
              className="bg-surface text-error border border-error/30 hover:border-error hover:bg-error/5 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 active:scale-[0.97]"
            >
              <Icon name="logout" size={16} className="text-error" />
              Sign Out
            </button>
            <button
              type="button"
              onClick={() => setShowDeleteAccount(true)}
              className="bg-surface text-error border border-error/30 hover:border-error hover:bg-error/5 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 active:scale-[0.97]"
            >
              <Icon name="trash" size={16} className="text-error" />
              Delete Account
            </button>
          </div>
        </section></StaggerItem>
      </div>

      <ConfirmDialog
        open={showSignOut}
        title="Sign out"
        message="Are you sure you want to sign out? Your sessions will be saved."
        confirmLabel="Sign out"
        onConfirm={() => { setShowSignOut(false); handleSignOut() }}
        onCancel={() => setShowSignOut(false)}
      />

      <ConfirmDialog
        open={showDeleteAccount}
        title="Delete Account"
        message={`This will permanently delete your account and all associated data. Type ${user?.email ?? 'your email'} to confirm.`}
        confirmLabel="Delete my account"
        confirmDisabled={deleteConfirmEmail !== user?.email}
        onConfirm={() => { setShowDeleteAccount(false); handleDeleteAccount() }}
        onCancel={() => { setShowDeleteAccount(false); setDeleteConfirmEmail('') }}
      >
        <input
          type="email"
          value={deleteConfirmEmail}
          onChange={(e) => setDeleteConfirmEmail(e.target.value)}
          placeholder="Enter your email to confirm"
          className="w-full mt-3 px-3 py-2 font-mono text-[13px] bg-surface-container border border-outline-variant rounded-sm
                     text-primary placeholder:text-on-surface-variant/60
                     focus:outline-none focus:ring-2 focus:ring-focus-ring ring-offset-2"
          autoFocus
        />
      </ConfirmDialog>
    </div>
  )
}
