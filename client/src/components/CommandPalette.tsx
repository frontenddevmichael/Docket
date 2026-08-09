import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Icon, type IconName } from '@/components/Icon'
import { ShortcutsHelp } from '@/components/ShortcutsHelp'

const CMDK_USED_KEY = '__docket_cmdk_used'

interface CommandItem {
  id: string
  label: string
  icon: IconName
  action: () => void
  section: string
}

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { signOut } = useAuth()

  const commands: CommandItem[] = [
    { id: 'new-session', label: 'New Session', icon: 'add', action: () => navigate('/sessions/new'), section: 'Navigation' },
    { id: 'dashboard', label: 'Go to Dashboard', icon: 'dashboard', action: () => navigate('/'), section: 'Navigation' },
    { id: 'settings', label: 'Go to Settings', icon: 'settings', action: () => navigate('/settings'), section: 'Navigation' },
    { id: 'sign-out', label: 'Sign Out', icon: 'logout', action: async () => { await signOut(); navigate('/sign-in') }, section: 'Account' },
    { id: 'shortcuts', label: 'Keyboard Shortcuts', icon: 'keyboard', action: () => setShortcutsOpen(true), section: 'Help' },
  ]

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  )

  const executeCommand = useCallback((cmd: CommandItem) => {
    setOpen(false)
    setQuery('')
    cmd.action()
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      if (e.key === '?' && !open) {
        e.preventDefault()
        setShortcutsOpen((prev) => !prev)
      }
      if (e.key === 'Escape' && open) {
        setOpen(false)
        setQuery('')
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  useEffect(() => {
    if (open) {
      inputRef.current?.focus()
      setSelectedIndex(0)
      try { localStorage.setItem(CMDK_USED_KEY, 'true') } catch { /* ignore private browsing */ }
    }
  }, [open])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      executeCommand(filtered[selectedIndex])
    }
  }

  return (
    <>
      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh] glass-overlay animate-[fadeIn_200ms_ease-out]"
          onClick={() => { setOpen(false); setQuery('') }}
          role="dialog"
          aria-modal="true"
          aria-label="Command palette"
        >
          <div
            className="w-full max-w-lg mx-4 bg-surface-container-lowest border border-outline-variant rounded-xl shadow-floating overflow-hidden animate-[fadeInScale_200ms_var(--ease-spring)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant">
              <Icon name="search" size={20} className="text-on-surface-variant" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search…"
                className="flex-1 bg-transparent text-[14px] text-on-surface placeholder:text-on-surface-variant/50 outline-none font-body-md"
              />
              <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-on-surface-variant bg-surface-container rounded border border-outline-variant">
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div className="max-h-72 overflow-y-auto p-1">
              {filtered.length === 0 ? (
                <div className="px-4 py-8 text-center">
                  <p className="text-[13px] text-on-surface-variant">No commands found</p>
                </div>
              ) : (
                filtered.map((cmd, i) => (
                  <button
                    key={cmd.id}
                    type="button"
                    onClick={() => executeCommand(cmd)}
                    onMouseEnter={() => setSelectedIndex(i)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-left transition-colors duration-75
                      ${i === selectedIndex ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant hover:bg-surface-container'}`}
                  >
                    <Icon name={cmd.icon} size={18} className="text-on-surface-variant" />
                    <span className="font-body-md text-[13px] font-medium flex-1">{cmd.label}</span>
                    <span className="text-[10px] font-mono text-on-surface-variant/50 uppercase">{cmd.section}</span>
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-outline-variant flex items-center gap-2 sm:gap-4 text-[11px] font-mono text-on-surface-variant/60 flex-wrap">
              <span className="hidden sm:flex items-center gap-1 whitespace-nowrap">
                <kbd className="px-1 py-0.5 bg-surface-container rounded border border-outline-variant text-[10px]">&uarr;&darr;</kbd>
                navigate
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <kbd className="px-1 py-0.5 bg-surface-container rounded border border-outline-variant text-[10px]">&crarr;</kbd>
                select
              </span>
              <span className="flex items-center gap-1 whitespace-nowrap">
                <kbd className="px-1 py-0.5 bg-surface-container rounded border border-outline-variant text-[10px]">esc</kbd>
                close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
