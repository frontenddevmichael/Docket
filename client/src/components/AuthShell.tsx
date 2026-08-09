import { motion } from 'framer-motion'
import { Icon } from '@/components/Icon'
import type { ReactNode } from 'react'

interface AuthShellProps {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
  doodle?: ReactNode
}

export function AuthShell({ title, subtitle, children, footer, doodle }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-background relative overflow-hidden flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 pointer-events-none noise-overlay" aria-hidden="true" />
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{
          backgroundImage:
            'radial-gradient(1000px 500px at 50% -20%, color-mix(in srgb, var(--color-primary-fixed) 45%, transparent), transparent 60%), radial-gradient(900px 420px at 50% 115%, color-mix(in srgb, var(--color-secondary-fixed-dim) 30%, transparent), transparent 55%)',
        }}
      />
      {doodle}

      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-lifted p-6 sm:p-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="w-8 h-8 rounded-md bg-primary text-on-primary flex items-center justify-center">
              <Icon name="workspaces" size={16} />
            </div>
            <span className="font-heading text-[18px] text-primary tracking-tight font-semibold">Docket</span>
          </div>

          <h1 className="font-heading text-[24px] font-semibold text-on-surface mb-1">{title}</h1>
          <p className="font-body-md text-[14px] text-on-surface-variant mb-6">{subtitle}</p>

          {children}
        </div>

        {footer && (
          <div className="text-center font-body-md text-[13px] text-on-surface-variant mt-5">{footer}</div>
        )}
      </motion.div>
    </div>
  )
}