import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, useReducedMotion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useAuth } from '@/hooks/useAuth'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { Icon } from '@/components/Icon'
import { AuthShell } from '@/components/AuthShell'
import { AuthSuccess } from '@/components/AuthSuccess'
import { rememberEmail } from '@/lib/signup-email'
import { SignUpDoodle } from '@/components/marketing/FeatureIllustrations'
import { authLabel, authInput, authBtnPrimary, authBtnSecondary, authErrorBanner } from '@/lib/authStyles'
import { authErrorText } from '@/lib/authError'

const formSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Must be at least 8 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords must match',
  path: ['confirmPassword'],
})

type FormData = z.infer<typeof formSchema>

type FocusField = 'email' | 'password' | 'confirm' | null

type Phase = 'form' | 'success' | 'verify'

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

function PasswordChecklist({ password }: { password: string }) {
  const reduceMotion = useReducedMotion() ?? false
  const checks = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase letter', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter', met: /[a-z]/.test(password) },
    { label: 'Number', met: /\d/.test(password) },
    { label: 'Special character', met: /[^A-Za-z0-9]/.test(password) },
  ]

  // Appears as soon as the user starts typing; each row ticks off live.
  if (!password) return null

  return (
    <ul className="mt-2.5 space-y-1.5" aria-label="Password requirements">
      {checks.map((c) => (
        <li key={c.label} data-met={c.met} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={`flex items-center justify-center w-4 h-4 rounded-full border transition-colors duration-200 ${
              c.met ? 'bg-primary border-primary text-on-primary' : 'border-outline-variant'
            }`}
          >
            {c.met && (
              <motion.svg
                viewBox="0 0 10 8"
                className="w-2 h-1.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={reduceMotion ? false : { scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 600, damping: 28 }}
              >
                <path d="M1 4l2.8 2.8L9 1" />
              </motion.svg>
            )}
          </span>
          <span
            className={`font-body-md text-[11px] transition-colors duration-200 ${
              c.met ? 'text-on-surface font-medium' : 'text-on-surface-variant/70'
            }`}
          >
            {c.label}
          </span>
        </li>
      ))}
    </ul>
  )
}

function InteractiveDoodle({ focusField }: { focusField: FocusField }) {
  return (
    <motion.div
      className="absolute bottom-6 left-1/2 -translate-x-1/2 pointer-events-none z-0 hidden md:block"
      animate={{
        scale: focusField ? 1.05 : 1,
        opacity: focusField ? 0.55 : 0.35,
        y: focusField === 'email' ? -4 : focusField === 'password' ? -8 : focusField === 'confirm' ? -6 : 0,
      }}
      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
    >
      <SignUpDoodle className="w-[200px] md:w-[260px] h-auto" />
    </motion.div>
  )
}

export function SignUp() {
  useDocumentTitle('Create Account')
  const { signUp, signInWithOAuth } = useAuth()
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [focusField, setFocusField] = useState<FocusField>(null)
  const [phase, setPhase] = useState<Phase>('form')
  const [submittedEmail, setSubmittedEmail] = useState('')

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  })

  const password = watch('password')

  const onSubmit = async (data: FormData) => {
    setServerError('')
    setLoading(true)
    try {
      const { data: result, error } = await signUp(data.email, data.password)
      if (error) throw error
      rememberEmail(data.email)
      setSubmittedEmail(data.email)
      setPhase(result.session ? 'success' : 'verify')
    } catch (err: any) {
      setServerError(authErrorText(err, 'Could not create account'))
    } finally {
      setLoading(false)
    }
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    setServerError('')
    try {
      const { error } = await signInWithOAuth(provider)
      if (error) throw error
    } catch (err: any) {
      setServerError(authErrorText(err, `Could not start ${provider} sign-in`))
    }
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Start generating test cases in minutes."
      doodle={<InteractiveDoodle focusField={focusField} />}
      footer={
        phase === 'form' ? (
          <>
            Already have an account?{' '}
            <Link to="/sign-in" className="font-semibold text-primary hover:underline underline-offset-2 transition-colors">
              Sign in
            </Link>
          </>
        ) : undefined
      }
    >
      {phase === 'form' ? (
        <>
          {serverError && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0, x: [0, -6, 6, -4, 4, 0] }}
              transition={{ duration: 0.35 }}
              role="alert"
              className={authErrorBanner}
            >
              {serverError}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label htmlFor="signup-email" className={authLabel}>Email</label>
              <input
                id="signup-email"
                type="email"
                {...register('email')}
                onFocus={() => setFocusField('email')}
                onBlur={() => setFocusField(null)}
                placeholder="you@company.com"
                className={authInput}
                autoComplete="email"
                autoFocus
                aria-describedby={errors.email ? 'signup-email-error' : undefined}
              />
              {errors.email && (
                <p id="signup-email-error" className="mt-1.5 font-body-md text-[12px] text-error">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="signup-password" className={authLabel}>Password</label>
              <div className="relative">
                <input
                  id="signup-password"
                  type={showPassword ? 'text' : 'password'}
                  {...register('password')}
                  onFocus={() => setFocusField('password')}
                  onBlur={() => setFocusField(null)}
                  placeholder="Create a password"
                  className={`${authInput} pr-10`}
                  autoComplete="new-password"
                  aria-describedby={errors.password ? 'signup-password-error' : undefined}
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
              {errors.password && (
                <p id="signup-password-error" className="mt-1.5 font-body-md text-[12px] text-error">{errors.password.message}</p>
              )}
              <PasswordChecklist password={password ?? ''} />
            </div>

            <div>
              <label htmlFor="signup-confirm" className={authLabel}>Confirm Password</label>
              <input
                id="signup-confirm"
                type={showPassword ? 'text' : 'password'}
                {...register('confirmPassword')}
                onFocus={() => setFocusField('confirm')}
                onBlur={() => setFocusField(null)}
                placeholder="Re-enter your password"
                className={authInput}
                autoComplete="new-password"
                aria-describedby={errors.confirmPassword ? 'signup-confirm-error' : undefined}
              />
              {errors.confirmPassword && (
                <p id="signup-confirm-error" className="mt-1.5 font-body-md text-[12px] text-error">{errors.confirmPassword.message}</p>
              )}
            </div>

            <button type="submit" disabled={loading} className={authBtnPrimary}>
              {loading ? (
                <>
                  <Icon name="sync" size={15} className="animate-spin" />
                  Creating account…
                </>
              ) : (
                'Create Account'
              )}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-outline-variant/30" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-container-lowest px-2 font-body-md text-[10px] text-on-surface-variant uppercase tracking-[0.05em]">or</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={() => handleOAuth('google')} className={authBtnSecondary}>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </button>
            <button type="button" onClick={() => handleOAuth('github')} className={authBtnSecondary}>
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 shrink-0" aria-hidden="true">
                <path fill="currentColor" d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
              </svg>
              GitHub
            </button>
          </div>
        </>
      ) : (
        <AuthSuccess
          phase={phase}
          heading="Account created"
          message="Welcome to Docket. Setting up your workspace…"
          email={submittedEmail}
          onRedirect={() => navigate('/sessions', { replace: true })}
          onSignIn={() => navigate('/sign-in', { replace: true })}
        />
      )}
    </AuthShell>
  )
}
