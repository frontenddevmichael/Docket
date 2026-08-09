import { Component, type ReactNode, type ErrorInfo } from 'react'
import { Icon } from '@/components/Icon'

interface Props { children: ReactNode }
interface State { error: Error | null; showDetails: boolean }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, showDetails: false }

  static getDerivedStateFromError(error: Error): State { return { error, showDetails: false } }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info)
  }

  render() {
    if (this.state.error) {
      const { error } = this.state
      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-8">
          <div className="bg-surface-container-lowest rounded-lg shadow-rest p-8 sm:p-10 max-w-md w-full text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-error-container flex items-center justify-center">
              <Icon name="error" size={28} className="text-error" />
            </div>
            <h1 className="font-heading text-[20px] sm:text-[24px] text-primary mb-2">Something went wrong</h1>
            <p className="font-body-md text-[14px] text-on-surface-variant mb-6">
              {error.message || 'An unexpected error occurred.'}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="w-full sm:w-auto bg-primary text-on-primary px-5 py-2.5 rounded-lg
                           text-[13px] font-medium hover:opacity-90 active:scale-[0.97]
                           transition-all duration-150"
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => { this.setState({ error: null }); window.location.href = '/' }}
                className="w-full sm:w-auto px-5 py-2.5 text-[13px] font-medium rounded-lg
                           border border-outline-variant text-on-surface-variant
                           hover:bg-surface-container-higher transition-colors"
              >
                Go home
              </button>
            </div>
            <button
              type="button"
              onClick={() => this.setState((s) => ({ showDetails: !s.showDetails }))}
              className="mt-6 text-[11px] font-mono text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
            >
              {this.state.showDetails ? 'Hide details' : 'Show details'}
            </button>
            {this.state.showDetails && error.stack && (
              <pre className="mt-3 p-3 rounded bg-surface-sunken text-[11px] font-mono text-left text-on-surface-variant max-h-48 overflow-auto whitespace-pre-wrap">
                {error.stack}
              </pre>
            )}
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
