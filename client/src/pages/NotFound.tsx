import { Link } from 'react-router-dom'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function NotFound() {
  useDocumentTitle('Page Not Found')
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-8 animate-[fadeIn_300ms_ease-out]">
      <div className="bg-surface-container-lowest rounded-lg shadow-rest p-6 sm:p-10 max-w-md w-full text-center">
        <p className="text-[48px] font-heading text-primary mb-2">404</p>
        <p className="text-[14px] text-on-surface-variant mb-6">This page doesn&apos;t exist.</p>
        <Link
          to="/"
          className="inline-block bg-primary text-on-primary rounded-lg px-5 py-2 text-[14px] font-medium
                     hover:opacity-90 active:scale-[0.97] transition-all duration-150
                     focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring"
        >
          Go home
        </Link>
      </div>
    </div>
  )
}
