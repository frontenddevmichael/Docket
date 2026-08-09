import { useState, useEffect, useMemo, useRef } from 'react'
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useSessionsWithStats } from '@/hooks/useSessionsWithStats'
import { CommandPalette } from '@/components/CommandPalette'
import { Icon } from '@/components/Icon'

const navItems = [
  { path: '/workspace', label: 'Workspace', icon: 'dashboard' as const },
  { path: '/sessions', label: 'Sessions', icon: 'assignment' as const },
  { path: '/sessions/new', label: 'New Session', icon: 'add' as const },
  { path: '/projects', label: 'Projects', icon: 'folder' as const },
]

export function Layout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [pageKey, setPageKey] = useState(0)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const profileTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    setPageKey((k) => k + 1)
    setMobileMenuOpen(false)
  }, [location.pathname])

  // Close profile dropdown on click outside
  useEffect(() => {
    if (!profileOpen) return
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [profileOpen])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
      if (profileTimerRef.current) clearTimeout(profileTimerRef.current)
    }
  }, [])

  // Theme init moved to App.tsx ThemeInit — runs globally on every page

  const { data: pageData } = useSessionsWithStats(0, 10)
  const sessions = pageData?.sessions
  const totalTests = useMemo(() => sessions?.reduce((sum, s) => sum + s.testCount, 0) ?? 0, [sessions])
  const totalPasses = useMemo(() => sessions?.reduce((sum, s) => sum + s.passCount, 0) ?? 0, [sessions])
  const passRate = totalTests > 0 ? Math.round((totalPasses / totalTests) * 100) : 0

  const handleSignOut = async () => {
    await signOut()
    navigate('/sign-in')
  }

  const isActive = (path: string) => {
    if (path === '/sessions') return location.pathname === '/sessions'
    if (path === '/workspace') return location.pathname === '/workspace'
    if (path === '/projects') return location.pathname === '/projects'
    return location.pathname.startsWith(path)
  }

  const userInitials = user?.email?.slice(0, 2).toUpperCase() ?? 'US'

  return (
    <div className="min-h-screen flex flex-col bg-background text-on-surface font-body-md antialiased">
      <CommandPalette />

      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-surface focus:px-4 focus:py-2 focus:rounded focus:shadow-lifted focus:text-[14px] focus:text-primary focus:ring-2 focus:ring-focus-ring focus:ring-offset-2">
        Skip to content
      </a>

      {/* === Horizontal Top Navigation === */}
      <header className="h-12 bg-surface border-b border-outline-strong flex items-center px-4 shrink-0 z-30">
        {/* Left side */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            className="hidden min-[568px]:flex p-1.5 text-on-surface-variant hover:text-primary hover:bg-surface-container rounded transition-all"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Icon name="menu" size={20} />
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            className="min-[568px]:hidden p-1 -ml-1 text-on-surface-variant hover:text-primary transition-colors"
            aria-label="Open menu"
          >
            <Icon name="menu" size={22} />
          </button>
          <Link to="/sessions" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded bg-surface-variant flex items-center justify-center border border-outline-variant group-hover:border-primary transition-colors">
              <Icon name="workspaces" size={14} className="text-on-surface-variant group-hover:text-primary transition-colors" />
            </div>
            <span className="font-heading text-[16px] text-primary tracking-tight font-semibold hidden sm:inline">Docket</span>
          </Link>
        </div>

        {/* Desktop nav links */}
        <nav className="hidden sm:flex items-center ml-8 gap-1">
          {navItems.map((item) => {
            const active = isActive(item.path)
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-1.5 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold rounded transition-all duration-150
                  ${active
                    ? 'text-primary bg-surface-container shadow-rest'
                    : 'text-on-surface-variant hover:text-primary hover:bg-surface-container/50'
                  }`}
              >
                <Icon name={item.icon} size={16} />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2 ml-auto">
          <button
            type="button"
            onClick={() => navigate('/settings')}
            className={`p-1.5 rounded transition-all ${isActive('/settings') ? 'text-primary bg-surface-container shadow-rest' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container/50'}`}
            aria-label="Settings"
          >
            <Icon name="settings" size={18} />
          </button>

          {/* Profile avatar with dropdown — hover + click toggle */}
          <div
            className="relative"
            ref={profileRef}
            onMouseEnter={() => {
              if (profileTimerRef.current) clearTimeout(profileTimerRef.current)
              setProfileOpen(true)
            }}
            onMouseLeave={() => {
              profileTimerRef.current = setTimeout(() => setProfileOpen(false), 300)
            }}
          >
            <button
              type="button"
              onClick={() => setProfileOpen((p) => !p)}
              className="w-7 h-7 rounded-full bg-primary flex items-center justify-center ml-1 cursor-pointer hover:opacity-90 transition-opacity"
              aria-label={profileOpen ? 'Close profile menu' : 'Open profile menu'}
              aria-expanded={profileOpen}
            >
              <span className="font-heading text-[9px] text-on-primary font-semibold">{userInitials}</span>
            </button>

            {/* Dropdown — appears on hover or click */}
            <div
              className={`absolute right-0 top-full mt-2 w-56 transition-all duration-200 ease-out z-50
                ${profileOpen ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible translate-y-1'}`}
              onMouseEnter={() => {
                if (profileTimerRef.current) clearTimeout(profileTimerRef.current)
                setProfileOpen(true)
              }}
            >
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-lg shadow-floating overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-outline-variant/20">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <span className="font-heading text-[11px] text-on-primary font-semibold">{userInitials}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="font-mono text-[12px] text-primary font-medium truncate">{user?.email?.split('@')[0] ?? 'User'}</p>
                      <p className="font-mono text-[9px] text-on-surface-variant truncate">{user?.email ?? ''}</p>
                    </div>
                  </div>
                </div>
                {/* Quick stats */}
                {totalTests > 0 && (
                  <div className="px-4 py-2.5 border-b border-outline-variant/20">
                    <div className="flex items-center gap-4">
                      <div className="flex-1 text-center">
                        <p className="font-mono text-[11px] text-primary font-semibold">{totalTests}</p>
                        <p className="font-heading text-[8px] uppercase tracking-[0.08em] text-on-surface-variant/50 font-semibold">Tests</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="font-mono text-[11px] text-success font-semibold">{passRate}%</p>
                        <p className="font-heading text-[8px] uppercase tracking-[0.08em] text-on-surface-variant/50 font-semibold">Pass</p>
                      </div>
                      <div className="flex-1 text-center">
                        <p className="font-mono text-[11px] text-primary font-semibold">{sessions?.length ?? 0}</p>
                        <p className="font-heading text-[8px] uppercase tracking-[0.08em] text-on-surface-variant/50 font-semibold">Sessions</p>
                      </div>
                    </div>
                  </div>
                )}
                {/* Actions */}
                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => { navigate('/settings'); (document.activeElement as HTMLElement)?.blur() }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 font-heading text-[10px] uppercase tracking-[0.05em] font-semibold rounded text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all"
                  >
                    <Icon name="settings" size={14} />
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2.5 px-3 py-2 font-heading text-[10px] uppercase tracking-[0.05em] font-semibold rounded text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-all"
                  >
                    <Icon name="logout" size={14} />
                    Sign Out
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Mobile overlay */}
        {mobileMenuOpen && (
          <div
            className="fixed inset-0 glass-overlay z-40 min-[568px]:hidden animate-[fadeIn_200ms_ease-out]"
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        {/* === Collapsible Sidebar (Desktop) === */}
        <nav
          className={`hidden min-[568px]:flex flex-col bg-surface-container-low border-r border-outline-strong transition-all duration-200 ease-out flex-shrink-0 z-10
            ${sidebarCollapsed ? 'w-14' : 'w-56'}`}
          onMouseEnter={() => {
            if (sidebarCollapsed) {
              if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current)
              setSidebarCollapsed(false)
            }
          }}
          onMouseLeave={() => {
            collapseTimerRef.current = setTimeout(() => {
              setSidebarCollapsed(true)
            }, 400)
          }}
        >
          <div className="flex-1 overflow-y-auto px-2 py-2">
            {/* Navigation */}
            <div className="space-y-0.5">
              {navItems.map((item) => {
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3 py-2 font-heading text-[10px] uppercase tracking-[0.05em] font-semibold rounded transition-all duration-150
                      ${sidebarCollapsed ? 'justify-center' : ''}
                      ${active
                        ? 'text-primary font-bold bg-surface-container-high shadow-rest'
                        : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest'
                      }`}
                    title={sidebarCollapsed ? item.label : undefined}
                  >
                    <Icon name={item.icon} size={16} />
                    {!sidebarCollapsed && item.label}
                  </Link>
                )
              })}
            </div>

            {/* Tools section */}
            {!sidebarCollapsed && (
              <>
                <div className="mt-6 mb-2 px-3">
                  <span className="font-heading text-[9px] uppercase tracking-[0.08em] text-on-surface-variant/50 font-semibold">Tools</span>
                </div>
                <div className="space-y-0.5">
                  <button
                    type="button"
                    onClick={() => navigate('/settings')}
                    className={`w-full flex items-center gap-3 px-3 py-2 font-heading text-[10px] uppercase tracking-[0.05em] font-semibold rounded transition-all duration-150
                      ${isActive('/settings')
                        ? 'text-primary font-bold bg-surface-container-high shadow-rest'
                        : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest'
                      }`}
                  >
                    <Icon name="settings" size={16} />
                    Settings
                  </button>
                  <div className="flex items-center gap-3 px-3 py-2 text-on-surface-variant/50 font-heading text-[10px] uppercase tracking-[0.05em] font-semibold rounded">
                    <Icon name="keyboard" size={16} />
                    <span className="flex-1">Shortcuts</span>
                    <kbd className="px-1 py-0.5 text-[9px] font-mono bg-surface-container rounded border border-outline-variant">⌘K</kbd>
                  </div>
                </div>
              </>
            )}
          </div>
        </nav>

        {/* === Mobile SideNav === */}
        <nav className={`fixed inset-y-0 left-0 w-64 bg-surface-container-low border-r border-outline-strong z-50 flex flex-col transition-transform duration-200 ease-out min-[568px]:hidden ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="px-6 py-5 border-b border-outline-variant/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded bg-surface-variant flex items-center justify-center border border-outline-variant shrink-0">
                  <Icon name="workspaces" size={18} className="text-on-surface-variant" />
                </div>
                <div>
                  <h2 className="font-heading text-[14px] text-primary leading-tight">Docket</h2>
                  <p className="font-mono text-[9px] text-on-surface-variant mt-0.5">v0.1.0</p>
                </div>
              </div>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="p-1 text-on-surface-variant hover:text-primary" aria-label="Close menu">
                <Icon name="close" size={20} />
              </button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-3">
            <div className="space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold rounded transition-all
                    ${isActive(item.path) ? 'text-primary font-bold bg-surface-container-high' : 'text-on-surface-variant hover:text-primary hover:bg-surface-container-highest'}`}
                >
                  <Icon name={item.icon} size={18} />
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
          <div className="px-4 py-4 border-t border-outline-variant/30 space-y-1">
            <Link to="/settings" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-2.5 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold rounded text-on-surface-variant hover:text-primary hover:bg-surface-container-highest transition-all">
              <Icon name="settings" size={18} />
              Settings
            </Link>
            <button type="button" onClick={handleSignOut} className="w-full flex items-center gap-3 px-4 py-2.5 font-heading text-[11px] uppercase tracking-[0.05em] font-semibold rounded text-on-surface-variant hover:text-error hover:bg-error-container/30 transition-all">
              <Icon name="logout" size={18} />
              Sign Out
            </button>
          </div>
        </nav>

        {/* === Main content area === */}
        <main id="main-content" className="flex-1 min-h-0 flex flex-col overflow-hidden bg-background">
          <div key={pageKey} className="flex-1 flex flex-col overflow-hidden page-enter">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
