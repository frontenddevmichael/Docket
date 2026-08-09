import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import PreviewSheet from '../PreviewSheet'
import { useLongPress } from '../../hooks/useLongPress'

interface BentoItem {
  id: string
  title: string
  desc: string
  /** Optional hand-drawn illustration rendered above the title */
  illustration?: React.ReactNode
  /** Extra content shown when expanded */
  expandedContent?: React.ReactNode
  /** Grid span classes e.g. "md:col-span-2 md:row-span-2" */
  layout?: string
}

interface MagicBentoProps {
  items: BentoItem[]
  className?: string
}

export default function MagicBento({ items, className = '' }: MagicBentoProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [sheetItem, setSheetItem] = useState<BentoItem | null>(null)

  /* ── Mobile long-press → bottom sheet preview ── */
  const longPress = useLongPress((item: BentoItem) => {
    setSheetItem(item)
    try { navigator.vibrate(15) } catch { /* Vibration API unavailable */ }
  }, { delay: 400 })

  const toggle = (id: string) => {
    if (longPress.consume()) return
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <>
      <div
        className={`grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[180px] ${className}`}
      >
        {items.map((item) => {
          const isExpanded = expandedId === item.id
          const isHovered = hoveredId === item.id

          return (
            <motion.div
              key={item.id}
              layout
              onMouseEnter={() => setHoveredId(item.id)}
              onMouseLeave={() => setHoveredId(null)}
              onTouchStart={() => longPress.handlers.onTouchStart(item)}
              onTouchEnd={longPress.handlers.onTouchEnd}
              onTouchMove={longPress.handlers.onTouchEnd}
              className={`relative ${item.layout || ''} bg-surface-container-lowest border border-outline-variant/30 rounded-lg cursor-pointer card-interactive
                touch-action-[manipulation]
                ${isExpanded || isHovered ? 'overflow-visible z-10' : 'overflow-hidden'}
                ${isHovered ? 'ring-1 ring-primary/15 shadow-floating' : ''}
                ${isExpanded ? 'shadow-floating' : ''}
              `}
              onClick={() => toggle(item.id)}
            >
              {/* ── Hover preview — enlarged illustration floats above card ── */}
              <AnimatePresence>
                {isHovered && !isExpanded && item.illustration && (
                  <motion.div
                    initial={{ opacity: 0, y: 12, scale: 0.85 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 12, scale: 0.85 }}
                    transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
                    className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-4 py-3 bg-surface-container-lowest border border-outline-variant/15 rounded-xl shadow-floating pointer-events-none"
                  >
                    <div className="scale-150 origin-bottom">
                      {item.illustration}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="p-5 flex flex-col h-full">
                {/* Illustration */}
                {item.illustration && (
                  <div className="mb-3 flex-shrink-0">
                    {item.illustration}
                  </div>
                )}
                {/* Header */}
                <h3 className="font-heading text-[14px] text-primary font-medium mb-1">
                  {item.title}
                </h3>
                <p className="font-body-md text-[12px] text-on-surface-variant leading-relaxed flex-1">
                  {item.desc}
                </p>

                {/* Expanded content — illustration appears alongside on wide cards */}
                <AnimatePresence initial={false}>
                  {isExpanded && (
                    <motion.div
                      key="expanded"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 border-t border-outline-variant/20 mt-2">
                        {item.expandedContent || item.illustration ? (
                          <div className="flex items-start gap-4">
                            {item.illustration && (
                              <div className="shrink-0 hidden sm:block mt-0.5 opacity-70">
                                <div className="scale-125 origin-top-left">
                                  {item.illustration}
                                </div>
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              {item.expandedContent || (
                                <p className="font-body-md text-[12px] text-on-surface-variant leading-relaxed">
                                  Click again to collapse. In production this would
                                  show a live preview or detailed walkthrough of the
                                  feature.
                                </p>
                              )}
                            </div>
                          </div>
                        ) : (
                          <p className="font-body-md text-[12px] text-on-surface-variant leading-relaxed">
                            Click again to collapse. In production this would
                            show a live preview or detailed walkthrough of the
                            feature.
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── Mobile bottom sheet ── */}
      <AnimatePresence>
        {sheetItem && (
          <PreviewSheet
            illustration={sheetItem.illustration}
            title={sheetItem.title}
            description={sheetItem.desc}
            onClose={() => setSheetItem(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
