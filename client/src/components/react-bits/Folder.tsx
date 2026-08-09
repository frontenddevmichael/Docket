import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface FolderItem {
  q: string
  a: string
}

interface FolderProps {
  items: FolderItem[]
  className?: string
}

export default function Folder({ items, className = '' }: FolderProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null)

  return (
    <div className={`space-y-3 ${className}`}>
      {items.map((item, i) => {
        const isOpen = openIdx === i

        return (
          <div
            key={i}
            className="border border-outline-variant/30 rounded-lg overflow-hidden bg-surface-container-lowest"
          >
            <button
              onClick={() => setOpenIdx(isOpen ? null : i)}
              className="w-full flex items-center justify-between px-5 py-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-expanded={isOpen}
            >
              <span className="font-heading text-[14px] font-medium text-primary pr-4">
                {item.q}
              </span>
              <motion.svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.2, ease: 'easeInOut' }}
                className="w-4 h-4 shrink-0 text-on-surface-variant"
              >
                <path d="m6 9 6 6 6-6" />
              </motion.svg>
            </button>

            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  key="content"
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-4">
                    <p className="font-body-md text-[13px] text-on-surface-variant leading-relaxed">
                      {item.a}
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
