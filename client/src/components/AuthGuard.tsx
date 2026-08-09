import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4 animate-[fadeIn_300ms_ease-out]">
          {/* Brand icon */}
          <div className="w-12 h-12 rounded bg-surface-variant flex items-center justify-center border border-outline-variant">
            <svg
              width="24"
              height="24"
              viewBox="0 0 64 64"
              fill="none"
              className="text-primary"
              aria-hidden="true"
            >
              <rect x="12" y="6" width="40" height="52" rx="4" stroke="currentColor" strokeWidth="2" fill="none" />
              <rect x="18" y="14" width="28" height="3" rx="1.5" fill="currentColor" opacity="0.4" />
              <rect x="18" y="22" width="20" height="3" rx="1.5" fill="currentColor" opacity="0.25" />
              <rect x="18" y="30" width="24" height="3" rx="1.5" fill="currentColor" opacity="0.25" />
            </svg>
          </div>
          {/* Spinner */}
          <svg className="animate-[spinner_600ms_linear_infinite] text-on-surface-variant" width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.15" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <p className="font-heading text-[16px] text-on-surface-variant">Docket</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/sign-in" replace />
  }

  return <>{children}</>
}
