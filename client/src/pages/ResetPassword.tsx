import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Icon } from '@/components/Icon'
import { AuthShell } from '@/components/AuthShell'
import { SignInDoodle } from '@/components/marketing/FeatureIllustrations'
import { authLabel, authInput, authBtnPrimary, authErrorBanner } from '@/lib/authStyles'
import { authErrorText } from '@/lib/authError'

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {open ? (
        <>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </>
      ) : (
        <>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </>
      )}
    </svg>
  )
}

export function ResetPassword() {
  useDocumentTitle('Set New Password')
  const { updatePassword } = useAuth()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true)
    })

    return () => listener?.subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const { error } = await updatePassword(password)
      if (error) throw error
      navigate('/sessions', { replace: true })
    } catch (err: any) {
      setError(authErrorText(err, 'Something went wrong'))
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin rounded-full mx-auto mb-3" />
          <p className="font-mono text-[11px] text-on-surface-variant tracking-[0.05em] uppercase">Verifying link…</p>
        </div>
      </div>
    )
  }

  return (
    <AuthShell
      title="Set new password"
      subtitle="Must be at least 8 characters."
      doodle={
        <SignInDoodle className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-0 hidden md:block w-[200px] md:w-[260px] h-auto opacity-[0.35]" />
      }
    >
      {error && (
        <motion.div
          animate={{ x: [0, -6, 6, -4, 4, 0] }}
          transition={{ duration: 0.35 }}
          className={authErrorBanner}
        >
          {error}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="reset-password" className={authLabel}>New Password</label>
          <div className="relative">
            <input
              id="reset-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter new password"
              className={`${authInput} pr-10`}
              autoComplete="new-password"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              <EyeIcon open={showPassword} />
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading} className={authBtnPrimary}>
          {loading ? (
            <>
              <Icon name="sync" size={15} className="animate-spin" />
              Updating…
            </>
          ) : (
            'Update password'
          )}
        </button>
      </form>
    </AuthShell>
  )
}