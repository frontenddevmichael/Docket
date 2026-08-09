/**
 * `<PreviewSheet>` — a mobile bottom sheet for full-screen previews.
 *
 * Slides up from the bottom with a spring animation, supports swipe-to-dismiss,
 * backdrop tap to close, and an enlarged illustration preview.
 *
 * ```tsx
 * <AnimatePresence>
 *   {showSheet && (
 *     <PreviewSheet
 *       illustration={<ScreenToCases className="w-16 h-16" />}
 *       title="Screen → Cases"
 *       description="Drop a screenshot. Test cases appear."
 *       onClose={() => setShowSheet(false)}
 *     />
 *   )}
 * </AnimatePresence>
 * ```
 */

import { motion } from 'framer-motion'

interface PreviewSheetProps {
  /** Optional hand-drawn illustration shown enlarged in the sheet header */
  illustration?: React.ReactNode
  /** Title text */
  title: string
  /** Description text */
  description: string
  /** Called when the sheet is dismissed (backdrop tap, swipe down, close) */
  onClose: () => void
  /** Optional custom content rendered below the description */
  children?: React.ReactNode
  /** Optional class override for the sheet panel */
  className?: string
}

export default function PreviewSheet({
  illustration,
  title,
  description,
  onClose,
  children,
  className = '',
}: PreviewSheetProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-50 flex items-end justify-center sm:hidden"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Sheet panel */}
      <motion.div
        drag="y"
        dragConstraints={{ top: 0, bottom: 120 }}
        dragElastic={{ top: 0, bottom: 0.5 }}
        onDragEnd={(_, info) => {
          if (info.offset.y > 80) onClose()
        }}
        onClick={(e) => e.stopPropagation()}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className={`relative w-full max-w-md mx-auto bg-surface-container-lowest rounded-t-2xl px-6 pt-2 pb-8 shadow-floating ${className}`}
      >
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-outline-variant/30 mx-auto mb-4" />

        {/* Enlarged illustration */}
        {illustration && (
          <div className="flex justify-center mb-5">
            <div className="scale-[2.2] origin-center">
              {illustration}
            </div>
          </div>
        )}

        {/* Title */}
        <h3 className="font-heading text-[17px] text-primary font-medium mb-2 text-center">
          {title}
        </h3>

        {/* Description */}
        <p className="font-body-md text-[13px] text-on-surface-variant leading-relaxed text-center max-w-xs mx-auto">
          {description}
        </p>

        {/* Custom content */}
        {children}

        {/* Close hint */}
        <p className="font-body-md text-[11px] text-on-surface-variant/40 text-center mt-5">
          Tap backdrop or swipe down to close
        </p>
      </motion.div>
    </motion.div>
  )
}
