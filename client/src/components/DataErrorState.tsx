import { Icon } from '@/components/Icon'

interface DataErrorStateProps {
  message?: string
  onRetry?: () => void
}

export function DataErrorState({ message, onRetry }: DataErrorStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-error-container flex items-center justify-center">
          <Icon name="error" size={24} className="text-error" />
        </div>
        <p className="font-heading text-[16px] text-primary mb-1">Failed to load data</p>
        <p className="font-body-md text-[13px] text-on-surface-variant mb-5">
          {message || 'An error occurred while loading. Please try again.'}
        </p>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2 rounded-lg
                       text-[12px] font-medium hover:opacity-90 active:scale-[0.97] transition-all duration-150"
          >
            <Icon name="autorenew" size={16} />
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
