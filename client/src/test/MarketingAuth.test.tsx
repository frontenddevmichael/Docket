import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// No real network in tests — the SSO pre-flight probe would otherwise try to
// reach Supabase. A rejected fetch is the same as "can't reach server" and
// falls through to the mocked signInWithOAuth.
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('network disabled in tests'))))
})
afterEach(() => {
  vi.unstubAllGlobals()
})
import { MemoryRouter } from 'react-router-dom'
import { Marketing } from '@/pages/Marketing'
import { SignIn } from '@/pages/SignIn'
import { SignUp } from '@/pages/SignUp'

vi.mock('@/lib/supabase', () => ({
  supabaseUrl: 'https://example.supabase.co',
  supabaseAnonKey: 'test-anon-key',
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithPassword: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signInWithOAuth: vi.fn(() => Promise.resolve({ data: {}, error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: { user: {}, session: {} }, error: null })),
    },
  },
}))

vi.mock('react-router-dom', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...(actual as object),
    useNavigate: () => vi.fn(),
  }
})

describe('Marketing page', () => {
  it('renders the hero headline and primary CTA', () => {
    render(
      <MemoryRouter>
        <Marketing />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /verdict — stamped/i })).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /get started/i }).length).toBeGreaterThan(0)
  })

  it('renders the live hero mockup with executable test cases', () => {
    render(
      <MemoryRouter>
        <Marketing />
      </MemoryRouter>,
    )
    expect(screen.getByText('Login rejects short password')).toBeInTheDocument()
    expect(screen.getAllByText('PRD §2.3').length).toBeGreaterThan(0)
  })

  it('renders pricing tiers and the report showcase', () => {
    render(
      <MemoryRouter>
        <Marketing />
      </MemoryRouter>,
    )
    expect(screen.getByText('Free')).toBeInTheDocument()
    expect(screen.getByText('Pro')).toBeInTheDocument()
    expect(screen.getByText('Enterprise')).toBeInTheDocument()
    expect(screen.getByText(/A report your team can actually read/i)).toBeInTheDocument()
  })
})

describe('SignIn screen', () => {
  it('renders the form and split-screen brand panel', () => {
    render(
      <MemoryRouter>
        <SignIn />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /welcome back/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
    expect(screen.getByText(/Test cases that stamp/i)).toBeInTheDocument()
  })

  it('renders SSO buttons and password toggle', () => {
    render(
      <MemoryRouter>
        <SignIn />
      </MemoryRouter>,
    )
    expect(screen.getByRole('button', { name: /google/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /github/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument()
  })

  it('morphs into the success state after signing in', async () => {
    localStorage.setItem('docket:signup-email', 'user@company.com')
    render(
      <MemoryRouter>
        <SignIn />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'user@company.com' } })
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'SecretPass1!' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByText('Signed in')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    // The form is gone; the success state replaced it in the same card.
    expect(screen.queryByPlaceholderText('Enter your password')).not.toBeInTheDocument()
    // The remembered sign-up email convenience is spent once signed in.
    expect(localStorage.getItem('docket:signup-email')).toBeNull()
  })

  it('prefills the email remembered from sign-up', () => {
    localStorage.setItem('docket:signup-email', 'new@company.com')
    render(
      <MemoryRouter>
        <SignIn />
      </MemoryRouter>,
    )
    const emailInput = screen.getByPlaceholderText('you@company.com') as HTMLInputElement
    expect(emailInput.value).toBe('new@company.com')
    // Convenience: jump straight to the password field when email is prefilled.
    expect(screen.getByPlaceholderText('Enter your password')).toHaveFocus()
  })

  it('shows the error banner when sign-in fails', async () => {
    const { supabase } = await import('@/lib/supabase')
    ;(supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { user: null },
      error: { message: 'Invalid login credentials' },
    })

    render(
      <MemoryRouter>
        <SignIn />
      </MemoryRouter>,
    )
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'user@company.com' } })
    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }))

    expect(await screen.findByRole('alert')).toBeInTheDocument()
    // Form stays put when sign-in fails.
    expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
  })

  it('shows the error banner when an SSO provider is unavailable', async () => {
    const { supabase } = await import('@/lib/supabase')
    ;(supabase.auth.signInWithOAuth as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: {},
      // supabase-js auth errors are Error instances (AuthError), so authErrorText
      // surfaces err.message directly.
      error: new Error('Unsupported provider: provider is not enabled'),
    })

    render(
      <MemoryRouter>
        <SignIn />
      </MemoryRouter>,
    )
    fireEvent.click(screen.getByRole('button', { name: /google/i }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/provider is not enabled/i)
  })
})

describe('SignUp screen', () => {
  const fillValidForm = () => {
    fireEvent.change(screen.getByPlaceholderText('you@company.com'), { target: { value: 'new@company.com' } })
    fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'SecretPass1!' } })
    fireEvent.change(screen.getByPlaceholderText('Re-enter your password'), { target: { value: 'SecretPass1!' } })
  }

  it('renders a live password checklist that ticks off as the user types', () => {
    render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { name: /create your account/i })).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument()

    // Hidden until the user starts typing.
    expect(screen.queryByText('8+ characters')).not.toBeInTheDocument()

    const metItems = () =>
      screen.getAllByRole('listitem').filter((li) => li.getAttribute('data-met') === 'true')

    // Partial: only lowercase is satisfied.
    fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'secret' } })
    expect(screen.getAllByRole('listitem')).toHaveLength(5)
    expect(metItems()).toHaveLength(1)

    // Full strength: all five criteria tick off.
    fireEvent.change(screen.getByPlaceholderText('Create a password'), { target: { value: 'SecretPass1!' } })
    for (const label of ['8+ characters', 'Uppercase letter', 'Lowercase letter', 'Number', 'Special character']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
    expect(metItems()).toHaveLength(5)
  })

  it('morphs into the success state after account creation', async () => {
    render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>,
    )
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Account created')).toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
    // The form is gone; the success state replaced it in the same card.
    expect(screen.queryByPlaceholderText('Re-enter your password')).not.toBeInTheDocument()
    // Email is remembered for the sign-in prefill.
    expect(localStorage.getItem('docket:signup-email')).toBe('new@company.com')
  })

  it('shows the check-your-email state when confirmation is pending', async () => {
    // No session in the response -> email confirmation required.
    const { supabase } = await import('@/lib/supabase')
    ;(supabase.auth.signUp as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      data: { user: { id: 'u1' }, session: null },
      error: null,
    })

    render(
      <MemoryRouter>
        <SignUp />
      </MemoryRouter>,
    )
    fillValidForm()
    fireEvent.click(screen.getByRole('button', { name: /create account/i }))

    expect(await screen.findByText('Check your email')).toBeInTheDocument()
    expect(screen.getByText(/new@company\.com/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /back to sign in/i })).toBeInTheDocument()
    // Email is remembered for the sign-in prefill after confirmation.
    expect(localStorage.getItem('docket:signup-email')).toBe('new@company.com')
  })
})
