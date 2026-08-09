import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Icon } from '@/components/Icon'
import { AuthShell } from '@/components/AuthShell'
import { SignInDoodle } from '@/components/marketing/FeatureIllustrations'
import { authLabel, authInput, authBtnPrimary, authErrorBanner } from '@/lib/authStyles'
import { authErrorText } from '@/lib/authError'

export function ForgotPassword() {
  useDocumentTitle('Reset Password')
  const { resetPassword } = useAuth()
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!email) { setError('Enter your email address'); return }
    setLoading(true)
    try {
      const { error } = await resetPassword(email)
      if (error) throw error
      setSent(true)
    } catch (err: any) {
      setError(authErrorText(err, 'Something went wrong'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Reset your password"
      subtitle="Enter your email and we'll send you a reset link."
      doodle={
        <SignInDoodle className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-0 hidden md:block w-[200px] md:w-[260px] h-auto opacity-[0.35]" />
      }
      footer={
        <Link to="/sign-in" className="font-semibold text-primary hover:underline underline-offset-2 transition-colors">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2">
          <Icon name="check-circle" size={44} className="mx-auto mb-4 text-success" />
          <p className="font-heading text-[16px] font-semibold text-on-surface mb-1.5">Check your email</p>
          <p className="font-body-md text-[13px] text-on-surface-variant mb-7">
            If an account exists for <span className="text-primary font-medium">{email}</span>, a password reset link is on its way.
          </p>
          <Link to="/sign-in" className={authBtnPrimary}>Back to sign in</Link>
        </motion.div>
      ) : (
        <>
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
              <label htmlFor="forgot-email" className={authLabel}>Email</label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className={authInput}
                autoComplete="email"
                autoFocus
              />
            </div>

            <button type="submit" disabled={loading} className={authBtnPrimary}>
              {loading ? (
                <>
                  <Icon name="sync" size={15} className="animate-spin" />
                  Sending…
                </>
              ) : (
                'Send reset link'
              )}
            </button>
          </form>
        </>
      )}
    </AuthShell>
  )
}