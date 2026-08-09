import { useState, useEffect, type ReactNode } from 'react'

interface PillNavProps {
  /** Links rendered inside the pill */
  links: Array<{ href: string; label: string }>
  /** Actions rendered outside the pill on the right */
  actions?: ReactNode
  /** Logo/brand slot */
  logo?: ReactNode
  /** Mobile menu toggle content */
  mobileMenu?: ReactNode
}

export default function PillNav({
  links,
  actions,
  logo,
  mobileMenu,
}: PillNavProps) {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        scrolled
          ? 'bg-surface/80 backdrop-blur-md shadow-rest'
          : 'bg-transparent'
      }`}
    >
      <div className="max-w-[1280px] mx-auto px-4 md:px-10 h-14 flex items-center justify-between">
        {/* Logo */}
        {logo && <div className="flex items-center gap-2.5">{logo}</div>}

        {/* Desktop: pill center */}
        <div className="hidden md:flex items-center gap-1 mx-auto px-3 py-1 rounded-full bg-surface-container-lowest/90 border border-outline-variant/20 shadow-rest">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="px-4 py-1.5 font-body-md text-[13px] text-on-surface-variant hover:text-primary transition-colors rounded-full hover:bg-surface-container-high/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {actions}

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden w-8 h-8 rounded-lg border border-outline-variant/30 flex items-center justify-center text-on-surface-variant hover:text-primary transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              className="w-4 h-4"
            >
              {mobileOpen ? (
                <path d="M18 6 6 18M6 6l12 12" />
              ) : (
                <>
                  <line x1="4" x2="20" y1="6" y2="6" />
                  <line x1="4" x2="20" y1="12" y2="12" />
                  <line x1="4" x2="20" y1="18" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-surface-container-lowest border-t border-outline-variant/20 px-4 py-3 space-y-2">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="block px-4 py-2 font-body-md text-[13px] text-on-surface-variant hover:text-primary transition-colors rounded-lg hover:bg-surface-container-high/50"
            >
              {link.label}
            </a>
          ))}
          {mobileMenu && <div className="pt-2 border-t border-outline-variant/20">{mobileMenu}</div>}
        </div>
      )}
    </header>
  )
}
