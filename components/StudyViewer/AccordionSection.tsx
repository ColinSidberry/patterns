'use client'

import { useEffect, useRef, ReactNode } from 'react'

interface Props {
  id: string
  title: string
  open: boolean
  onToggle: (id: string) => void
  children: ReactNode
}

export function AccordionSection({ id, title, open, onToggle, children }: Props) {
  const ref = useRef<HTMLElement>(null)
  const wasOpen = useRef(open)

  // When this section transitions closed → open, scroll it into view.
  useEffect(() => {
    if (open && !wasOpen.current && ref.current) {
      // Defer one frame so the body has rendered before measuring.
      requestAnimationFrame(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      })
    }
    wasOpen.current = open
  }, [open])

  return (
    <section
      ref={ref}
      id={`section-${id}`}
      className="rounded-xl border border-[#313244] bg-[#1e1e2e]"
      style={{ scrollMarginTop: '64px' }}
    >
      <button
        onClick={() => onToggle(id)}
        className="w-full flex items-center gap-3 px-5 py-3 hover:bg-[#252537] transition-colors text-left"
      >
        <span
          className={`inline-block w-3 text-[#6c7086] text-xs font-mono transition-transform ${
            open ? 'rotate-90' : ''
          }`}
        >
          ▶
        </span>
        <h2 className="text-sm font-semibold text-[#cdd6f4] uppercase tracking-wide">
          {title}
        </h2>
      </button>
      {open && (
        <div className="px-5 pb-5 pt-1 border-t border-[#313244]">
          {children}
        </div>
      )}
    </section>
  )
}
