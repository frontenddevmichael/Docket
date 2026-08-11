import { createBrowserRouter, RouterProvider, useLocation, Outlet } from 'react-router-dom'
import { useEffect, Suspense, lazy } from 'react'
import { trackPageView } from '@/lib/analytics'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthGuard } from '@/components/AuthGuard'
import { Layout } from '@/components/Layout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { RouteErrorBoundary } from '@/components/RouteErrorBoundary'
import { ToastProvider, useToast } from '@/components/Toast'
import { Dashboard } from '@/pages/Dashboard'
import { Workspace } from '@/pages/Workspace'
import { NewSession } from '@/pages/NewSession'
import { SessionReview } from '@/pages/SessionReview'
import { SessionExecute } from '@/pages/SessionExecute'
import { SessionReport } from '@/pages/SessionReport'
import { ProjectOverview } from '@/pages/ProjectOverview'
import { ProjectSetup } from '@/pages/ProjectSetup'
import { AssignProjects } from '@/pages/AssignProjects'
import { MyProjects } from '@/pages/MyProjects'
import { ProjectDetail } from '@/pages/ProjectDetail'
import { IssueLog } from '@/pages/IssueLog'
import { Settings } from '@/pages/Settings'
import { NotFound } from '@/pages/NotFound'

/* Lazy-loaded pages that include framer-motion — code-split so the library
   only loads when these routes are visited, not on every app mount. */
const Marketing = lazy(() => import('@/pages/Marketing').then((m) => ({ default: m.Marketing })))
const SignIn = lazy(() => import('@/pages/SignIn').then((m) => ({ default: m.SignIn })))
const SignUp = lazy(() => import('@/pages/SignUp').then((m) => ({ default: m.SignUp })))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword').then((m) => ({ default: m.ForgotPassword })))
const ResetPassword = lazy(() => import('@/pages/ResetPassword').then((m) => ({ default: m.ResetPassword })))

/** Minimal fallback shown while a lazy-loaded route chunk is loading */
function RouteFallback() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent animate-spin mx-auto mb-3" />
        <p className="font-data-mono text-[11px] text-on-surface-variant tracking-[0.05em] uppercase">Loading…</p>
      </div>
    </div>
  )
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
    mutations: {
      retry: 0,
    },
  },
})

let globalToast: ((message: string, type?: 'success' | 'error' | 'info') => void) | null = null

function QueryErrorHandler({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  useEffect(() => { globalToast = toast }, [toast])
  return <>{children}</>
}

queryClient.getQueryCache().subscribe((event) => {
  if (event?.query?.state?.error && event.type === 'updated') {
    const error = event.query.state.error as any
    const status = error?.status ?? error?.code
    if (status === 401 || status === 'PGRST301') {
      globalToast?.('Session expired. Please sign in again.', 'error')
      window.location.href = '/sign-in'
    }
  }
})

function PageViewTracker() {
  const location = useLocation()
  useEffect(() => {
    trackPageView(location.pathname)
  }, [location.pathname])
  return null
}

/** Apply saved theme on mount + listen for OS changes in system mode */
function ThemeInit() {
  useEffect(() => {
    const applyTheme = (savedTheme?: string | null) => {
      const theme = savedTheme ?? localStorage.getItem('docket-theme') as 'light' | 'dark' | 'system' | null
      if (theme === 'dark') {
        document.documentElement.classList.add('dark')
      } else if (theme === 'light') {
        document.documentElement.classList.remove('dark')
      } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        document.documentElement.classList.toggle('dark', prefersDark)
      }
    }
    applyTheme()

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const current = localStorage.getItem('docket-theme') as string | null
      if (!current || current === 'system') {
        applyTheme('system')
      }
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  return null
}

/** Root layout wraps all pages so PageViewTracker is inside router context */
function RootLayout() {
  return (
    <>
      <ThemeInit />
      <PageViewTracker />
      <Outlet />
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { path: '/', element: <Suspense fallback={<RouteFallback />}><Marketing /></Suspense> },
      { path: '/sign-in', element: <Suspense fallback={<RouteFallback />}><SignIn /></Suspense>, errorElement: <RouteErrorBoundary /> },
      { path: '/sign-up', element: <Suspense fallback={<RouteFallback />}><SignUp /></Suspense>, errorElement: <RouteErrorBoundary /> },
      { path: '/forgot-password', element: <Suspense fallback={<RouteFallback />}><ForgotPassword /></Suspense>, errorElement: <RouteErrorBoundary /> },
      { path: '/reset-password', element: <Suspense fallback={<RouteFallback />}><ResetPassword /></Suspense>, errorElement: <RouteErrorBoundary /> },
      {
        element: <AuthGuard><Layout /></AuthGuard>,
        errorElement: <RouteErrorBoundary />,
        children: [
          { path: '/workspace', element: <Workspace />, errorElement: <RouteErrorBoundary /> },
          { path: '/sessions', element: <Dashboard />, errorElement: <RouteErrorBoundary /> },
          { path: '/sessions/new', element: <NewSession />, errorElement: <RouteErrorBoundary /> },
          { path: '/sessions/:id', element: <SessionReview />, errorElement: <RouteErrorBoundary /> },
          { path: '/sessions/:id/execute', element: <SessionExecute />, errorElement: <RouteErrorBoundary /> },
          { path: '/sessions/:id/report', element: <SessionReport />, errorElement: <RouteErrorBoundary /> },
          { path: '/projects', element: <ProjectOverview />, errorElement: <RouteErrorBoundary /> },
          { path: '/projects/new', element: <ProjectSetup />, errorElement: <RouteErrorBoundary /> },
          { path: '/projects/assign', element: <AssignProjects />, errorElement: <RouteErrorBoundary /> },
          { path: '/projects/my', element: <MyProjects />, errorElement: <RouteErrorBoundary /> },
          { path: '/projects/:id', element: <ProjectDetail />, errorElement: <RouteErrorBoundary /> },
          { path: '/projects/:id/issue-log', element: <IssueLog />, errorElement: <RouteErrorBoundary /> },
          { path: '/settings', element: <Settings />, errorElement: <RouteErrorBoundary /> },
        ],
      },
      { path: '*', element: <NotFound /> },
    ],
  },
])

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ErrorBoundary>
        <ToastProvider>
          <QueryErrorHandler>
            <RouterProvider router={router} />
          </QueryErrorHandler>
        </ToastProvider>
      </ErrorBoundary>
    </QueryClientProvider>
  )
}

export default App
