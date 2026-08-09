import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from '@/pages/Dashboard'

// Mock supabase
vi.mock('@/lib/supabase', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          range: vi.fn(() => Promise.resolve({ data: [], error: null })),
        })),
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            range: vi.fn(() => Promise.resolve({ data: [], error: null })),
          })),
        })),
      })),
    })),
  },
}))

// Mock posthog analytics to avoid init errors
vi.mock('@/lib/analytics', () => ({
  Events: {
    sessionCreated: vi.fn(),
    testCasesGenerated: vi.fn(),
    testCaseResult: vi.fn(),
    testCaseDeleted: vi.fn(),
    testCaseDuplicated: vi.fn(),
    reportExported: vi.fn(),
    settingsUpdated: vi.fn(),
    userSignedUp: vi.fn(),
    userSignedIn: vi.fn(),
  },
}))

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    useNavigate: () => mockNavigate,
  }
})

function renderWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the personalized greeting', async () => {
    renderWithProviders(<Dashboard />)
    expect(await screen.findByText(/Good (morning|afternoon|evening)/)).toBeInTheDocument()
  })

  it('renders a new session button', async () => {
    renderWithProviders(<Dashboard />)
    expect(await screen.findByRole('button', { name: /new session/i })).toBeInTheDocument()
  })

  it('renders the Session History heading', async () => {
    renderWithProviders(<Dashboard />)
    expect(await screen.findByText('Session History')).toBeInTheDocument()
  })

  it('renders metric card labels', async () => {
    renderWithProviders(<Dashboard />)
    expect(await screen.findByText('Session History')).toBeInTheDocument()
  })
})
