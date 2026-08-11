import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { fetchWithAuth } from '@/lib/api'

const PLAN_COPY = {
  pro: {
    name: 'Pro',
    price: '$19',
    cadence: '/month',
    features: ['Unlimited generations', 'Workspace roles & invitations', 'Issue Log & sign-off', 'Priority support'],
  },
  enterprise: {
    name: 'Enterprise',
    price: 'Custom',
    cadence: '',
    features: ['SSO / SAML', 'Audit logging', 'Dedicated support & SLAs', 'On-prem deployment'],
  },
} as const

type UpgradeState = 'loading' | 'redirecting' | 'not-configured' | 'error'

export function Upgrade() {
  useDocumentTitle('Upgrade')
  const [searchParams] = useSearchParams()
  const plan = searchParams.get('plan') === 'enterprise' ? 'enterprise' : 'pro'
  const copy = PLAN_COPY[plan]
  const [state, setState] = useState<UpgradeState>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetchWithAuth('/api/billing/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan }),
        })
        const data = await res.json().catch(() => ({}))
        if (res.status === 501) {
          if (!cancelled) setState('not-configured')
          return
        }
        if (!res.ok) {
          throw new Error(data.error || 'Could not start checkout')
        }
        if (!cancelled) setState('redirecting')
        // Full page navigation to Stripe Checkout.
        window.location.href = data.url
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || 'Could not start checkout')
          setState('error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [plan])

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md px-4 py-16 flex items-start justify-center">
      <div className="w-full max-w-md">
        <Link to="/" className="font-heading text-[13px] font-semibold text-primary hover:underline underline-offset-2">
          ← Back to Docket
        </Link>

        <h1 className="font-heading text-[28px] md:text-[34px] text-primary mt-8 mb-1">Upgrade to {copy.name}</h1>
        <p className="text-[14px] text-on-surface-variant mb-8">
          {copy.price}
          {copy.cadence && <span className="text-on-surface-variant/70"> {copy.cadence}</span>} — cancel anytime.
        </p>

        {state === 'loading' && (
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-8 text-center">
            <div className="text-[14px] text-on-surface-variant animate-pulse">Contacting our payment provider…</div>
          </div>
        )}

        {state === 'redirecting' && (
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-8 text-center">
            <div className="text-[14px] text-on-surface-variant animate-pulse">
              Taking you to secure checkout…
            </div>
          </div>
        )}

        {state === 'not-configured' && (
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg p-6">
            <div className="font-heading text-[16px] text-primary font-semibold mb-2">
              Payments aren't enabled yet
            </div>
            <p className="text-[13.5px] text-on-surface-variant leading-relaxed">
              Docket's billing isn't wired up on this deployment yet. Contact the Docket team to
              activate the {copy.name} plan for your workspace.
            </p>
          </div>
        )}

        {state === 'error' && (
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-6">
            <div className="font-heading text-[16px] text-primary font-semibold mb-2">Couldn't start checkout</div>
            <p className="text-[13.5px] text-on-surface-variant">{error}</p>
            <button
              type="button"
              onClick={() => { setState('loading'); setError(''); window.location.reload() }}
              className="mt-4 font-heading text-[12px] font-semibold uppercase tracking-[0.05em] bg-primary text-on-primary px-4 py-2 rounded-lg"
            >
              Try again
            </button>
          </div>
        )}

        <ul className="mt-8 space-y-2">
          {copy.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-[13.5px] text-on-surface-variant">
              <span className="text-primary">✓</span> {f}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
