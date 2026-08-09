import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Icon } from '@/components/Icon'

describe('Icon', () => {
  it('renders with default size', () => {
    const { container } = render(<Icon name="check-circle" />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
    expect(svg).toHaveAttribute('width', '18')
    expect(svg).toHaveAttribute('height', '18')
    expect(svg).toHaveAttribute('aria-hidden', 'true')
  })

  it('renders at a custom size', () => {
    const { container } = render(<Icon name="settings" size={32} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '32')
    expect(svg).toHaveAttribute('height', '32')
  })

  it('applies custom className', () => {
    const { container } = render(<Icon name="search" className="text-red-500" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('text-red-500')
  })

  it('returns null for unknown icon name', () => {
    // @ts-expect-error — testing runtime fallback
    const { container } = render(<Icon name="does-not-exist" />)
    expect(container.querySelector('svg')).toBeNull()
  })

  it('renders all known icons without error', () => {
    const names: Array<Parameters<typeof Icon>[0]['name']> = [
      'assignment', 'description', 'play-arrow', 'settings', 'keyboard',
      'search', 'add', 'check-circle', 'warning', 'schedule',
      'error', 'close', 'image', 'chevron-left', 'chevron-right',
      'cloud-upload', 'swap', 'trash', 'list-alt', 'web',
      'auto-awesome', 'link', 'mail', 'key', 'logout',
      'help', 'workspaces', 'dashboard', 'sync', 'radio-unchecked',
      'playlist-check', 'bug-report', 'eye-off', 'block', 'fact-check',
      'tune', 'download', 'share', 'edit', 'arrow-up',
      'memory', 'autorenew', 'info', 'menu', 'chevron-down',
      'expand-more', 'drag-indicator', 'keep', 'pencil', 'copy',
      'flag', 'filter-list', 'lightbulb', 'analytics', 'delete',
    ]

    for (const name of names) {
      const { container } = render(<Icon name={name} />)
      const svg = container.querySelector('svg')
      expect(svg, `Icon "${name}" should render an SVG`).toBeInTheDocument()
    }
  })
})
