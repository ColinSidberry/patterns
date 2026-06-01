'use client'

import { useState } from 'react'

interface Props {
  total: number
  current: number
  labels: string[]
  onGoTo: (index: number) => void
}

export function ProgressDots({ total, current, labels, onGoTo }: Props) {
  const [hovered, setHovered] = useState<number | null>(null)

  return (
    <div className="flex items-center justify-center gap-2 py-3 relative">
      {Array.from({ length: total }).map((_, i) => {
        const isDone = i < current
        const isActive = i === current
        return (
          <div key={i} className="relative flex items-center">
            <button
              onClick={() => onGoTo(i)}
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              className={`rounded-full transition-all duration-200 ${
                isActive
                  ? 'w-5 h-5 bg-indigo-600 ring-2 ring-indigo-200'
                  : isDone
                    ? 'w-3 h-3 bg-indigo-300 hover:bg-indigo-400'
                    : 'w-2.5 h-2.5 bg-gray-200 hover:bg-gray-300'
              }`}
              aria-label={`Go to step ${i + 1}: ${labels[i]}`}
            />
            {/* Tooltip */}
            {hovered === i && (
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
                <div className="bg-gray-900 text-white text-xs rounded-lg px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                  {labels[i]}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900" />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
