import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, act } from '@testing-library/react'
import { GenerateLoading, filterTips } from '@/pages/GenerateLoading'

vi.mock('@tanstack/react-query', () => ({ useQuery: vi.fn() }))

  // Mock the Icon component to avoid SVG complexity
vi.mock('@/components/Icon', () => ({
  Icon: ({ name, size, className }: { name: string; size?: number; className?: string }) => (
    <span data-testid={`icon-${name}`} data-size={size} className={className} />
  ),
}))

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('GenerateLoading', () => {
  describe('Basic rendering', () => {
    it('renders the spinner container with circles', () => {
      const { container } = render(<GenerateLoading />)

      // Spinner SVG rings exist
      const svgs = container.querySelectorAll('svg')
      expect(svgs.length).toBeGreaterThanOrEqual(2) // outer dashed + inner arc

      // Center pulsing icon
      expect(screen.getByTestId('icon-memory')).toBeInTheDocument()
    })

    it('renders the heading "Processing Input"', () => {
      render(<GenerateLoading />)
      expect(screen.getByText('Processing Input')).toBeInTheDocument()
    })

    it('renders the autorenew icon for status', () => {
      render(<GenerateLoading />)
      expect(screen.getByTestId('icon-autorenew')).toBeInTheDocument()
    })
  })

  describe('Fallback messages', () => {
    it('displays the first fallback message on mount', () => {
      render(<GenerateLoading />)
      // The component has a 1s initial delay before showing the first message
      act(() => { vi.advanceTimersByTime(1100) })
      expect(screen.getByText(/parsing your requirements/i)).toBeInTheDocument()
    })

    it('uses custom messages when provided via props', () => {
      const customMessages = ['Custom msg 1', 'Custom msg 2', 'Custom msg 3']
      render(<GenerateLoading messages={customMessages} />)

      // After initial delay
      act(() => { vi.advanceTimersByTime(1100) })
      expect(screen.getByText('Custom msg 1')).toBeInTheDocument()
    })

    it('applies typewriter cursor class to message text', () => {
      render(<GenerateLoading />)
      act(() => { vi.advanceTimersByTime(1100) })
      const messageText = screen.getByText(/parsing your requirements/i)
      expect(messageText.className).toContain('typewriter-cursor')
    })
  })

  describe('Tip rendering', () => {
    it('shows the first general tip at mount (tipIndex starts at 0)', () => {
      render(<GenerateLoading />)
      // First general tip in the definitions list
      expect(screen.getByText(/edit test case steps/i)).toBeInTheDocument()
    })

    it('renders the lightbulb icon in the tip area', () => {
      render(<GenerateLoading />)
      expect(screen.getByTestId('icon-lightbulb')).toBeInTheDocument()
    })
  })

  describe('Context-sensitive tips (filterTips logic)', () => {
    it('returns general + shortcut + new for new users (testCaseCount=0, hasUsedCmdK=false)', () => {
      const tips = filterTips({ testCaseCount: 0, hasTeam: false, hasUsedCmdK: false })
      expect(tips).toContain('Tip: Edit test case steps before executing them.')
      expect(tips).toContain('Tip: Press \u2318K to open the command palette and navigate faster.')
      expect(tips).toContain('Tip: Attach a screenshot or PRD for more accurate test cases.')
      expect(tips).not.toContain('Tip: You can drag to reorder test cases after generation.')
      expect(tips).not.toContain('Tip: Tag team members to review specific test cases.')
    })

    it('shows keyboard shortcut tips only when hasUsedCmdK is false', () => {
      const withShortcut = filterTips({ testCaseCount: 0, hasTeam: false, hasUsedCmdK: false })
      expect(withShortcut).toContain('Tip: Press \u2318K to open the command palette and navigate faster.')

      const withoutShortcut = filterTips({ testCaseCount: 0, hasTeam: false, hasUsedCmdK: true })
      expect(withoutShortcut).not.toContain('Tip: Press \u2318K to open the command palette and navigate faster.')
    })

    it('returns power tips when testCaseCount > 5', () => {
      const tips = filterTips({ testCaseCount: 6, hasTeam: false, hasUsedCmdK: false })
      expect(tips).toContain('Tip: You can drag to reorder test cases after generation.')
      expect(tips).toContain('Tip: Failed tests can be linked to GitHub issues with one click.')
      expect(tips).toContain('Tip: You can mark test cases as BLOCKED if a dependency isn\'t ready.')
      // Should NOT include new-user tips
      expect(tips).not.toContain('Tip: Attach a screenshot or PRD for more accurate test cases.')
    })

    it('returns team tips when hasTeam is true', () => {
      const tips = filterTips({ testCaseCount: 0, hasTeam: true, hasUsedCmdK: false })
      expect(tips).toContain('Tip: Tag team members to review specific test cases.')
    })

    it('does not include team tips when hasTeam is false', () => {
      const tips = filterTips({ testCaseCount: 0, hasTeam: false, hasUsedCmdK: false })
      expect(tips).not.toContain('Tip: Tag team members to review specific test cases.')
    })

    it('does not include power tips when testCaseCount is 5', () => {
      const tips = filterTips({ testCaseCount: 5, hasTeam: false, hasUsedCmdK: false })
      expect(tips).not.toContain('Tip: You can drag to reorder test cases after generation.')
      // But DOES include new-user tips (≤ 5)
      expect(tips).toContain('Tip: Attach a screenshot or PRD for more accurate test cases.')
    })

    it('returns all tips when no context provided', () => {
      const tips = filterTips()
      // 10 total tips defined
      expect(tips.length).toBe(10)
    })

    it('places general tips before contextual tips for priority ordering', () => {
      const tips = filterTips({ testCaseCount: 0, hasTeam: true, hasUsedCmdK: false })
      // General tips come first, then shortcut, then contextual
      const firstTip = tips[0]
      expect(firstTip).toContain('Edit test case steps') // First general tip
    })
  })

  describe('Error state', () => {
    it('renders error message when error prop is set', () => {
      render(<GenerateLoading error="Something went wrong" />)
      expect(screen.getByText('Something went wrong')).toBeInTheDocument()
    })

    it('renders the error icon', () => {
      render(<GenerateLoading error="Test error" />)
      expect(screen.getByTestId('icon-error')).toBeInTheDocument()
    })

    it('renders retry button when onRetry is provided', () => {
      const onRetry = vi.fn()
      render(<GenerateLoading error="Test error" onRetry={onRetry} />)
      const retryBtn = screen.getByRole('button', { name: /try again/i })
      expect(retryBtn).toBeInTheDocument()
      retryBtn.click()
      expect(onRetry).toHaveBeenCalledOnce()
    })

    it('renders cancel button when onCancel is provided', () => {
      const onCancel = vi.fn()
      render(<GenerateLoading error="Test error" onCancel={onCancel} />)
      const cancelBtn = screen.getByRole('button', { name: /cancel/i })
      expect(cancelBtn).toBeInTheDocument()
      cancelBtn.click()
      expect(onCancel).toHaveBeenCalledOnce()
    })

    it('does not cycle messages when in error state', () => {
      // Render with error → no timers should be active
      const clearSpy = vi.spyOn(globalThis, 'clearInterval')
      render(<GenerateLoading error="Test error" />)
      act(() => { vi.advanceTimersByTime(10000) })
      expect(screen.queryByText(/edit test case steps/i)).not.toBeInTheDocument()
      clearSpy.mockRestore()
    })
  })

  describe('Cancel button', () => {
    it('renders cancel button when onCancel is provided in normal state', () => {
      const onCancel = vi.fn()
      render(<GenerateLoading onCancel={onCancel} />)
      const cancelBtn = screen.getByRole('button', { name: /cancel/i })
      expect(cancelBtn).toBeVisible()
    })

    it('does not render cancel button when onCancel is not provided', () => {
      render(<GenerateLoading />)
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })
  })
})
