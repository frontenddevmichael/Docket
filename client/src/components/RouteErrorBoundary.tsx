import { useState } from 'react'
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router-dom'
import { Icon } from '@/components/Icon'

export function RouteErrorBoundary() {
  const error = useRouteError()
  const navigate = useNavigate()
  const [showDetails, setShowDetails] = useState(false)

  let title = 'Something went wrong'
  let message = 'An unexpected error occurred. Please try again.'
  let statusCode: number | null = null

  if (isRouteErrorResponse(error)) {
    statusCode = error.status
    if (error.status === 404) {
      title = 'Page not found'
      message = 'The page you\'re looking for doesn\'t exist or has been moved.'
    } else if (error.status === 403) {
      title = 'Access denied'
      message = 'You don\'t have permission to view this page.'
    } else if (error.status === 401) {
      title = 'Not signed in'
      message = 'Please sign in to access this page.'
    } else if (error.status >= 500) {
      title = 'Server error'
      message = 'The server encountered an error. Please try again later.'
    }
  } else if (error instanceof Error) {
    message = error.message || message
  }

  const errorMessage = error instanceof Error ? error.message : isRouteErrorResponse(error) ? `${error.status} ${error.statusText}` : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-8">
      <div className="bg-surface-container-lowest rounded-lg shadow-rest p-6 sm:p-10 max-w-md w-full text-center">
        {statusCode ? (
          <p className="font-heading text-[48px] sm:text-[64px] text-primary mb-1">{statusCode}</p>
        ) : (
          <div className="w-14 h-14 mx-auto mb-3 rounded-full bg-error-container flex items-center justify-center">
            <Icon name="error" size={28} className="text-error" />
          </div>
        )}

        <h1 className="font-heading text-[20px] sm:text-[24px] text-primary mb-2">{title}</h1>
        <p className="font-body-md text-[14px] text-on-surface-variant mb-6">{message}</p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto px-5 py-2.5 text-[13px] font-medium rounded-lg
                       border border-outline-variant text-on-surface-variant
                       hover:bg-surface-container-higher transition-colors"
          >
            Go back
          </button>
          <button
            type="button"
            onClick={() => navigate('/')}
            className="w-full sm:w-auto bg-primary text-on-primary px-5 py-2.5 rounded-lg
                       text-[13px] font-medium hover:opacity-90 active:scale-[0.97]
                       transition-all duration-150"
          >
            Go home
          </button>
        </div>

        {errorMessage !== title && (
          <button
            type="button"
            onClick={() => setShowDetails((v) => !v)}
            className="mt-6 text-[11px] font-mono text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
          >
            {showDetails ? 'Hide details' : 'Show details'}
          </button>
        )}

        {showDetails && (
          <pre className="mt-3 p-3 rounded bg-surface-sunken text-[11px] font-mono text-left text-on-surface-variant max-h-48 overflow-auto whitespace-pre-wrap">
            {errorMessage}
            {errorStack ? `\n\n${errorStack}` : ''}
          </pre>
        )}
      </div>
    </div>
  )
}
