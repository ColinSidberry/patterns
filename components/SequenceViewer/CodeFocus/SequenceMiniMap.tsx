'use client'

import { useRef, useEffect } from 'react'
import { Step } from '@/data/types'

interface Props {
  actors: string[]
  steps: Step[]
  currentIndex: number
  onStepClick: (index: number) => void
}

export function SequenceMiniMap({ actors, steps, currentIndex, onStepClick }: Props) {
  const currentRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }, [currentIndex])

  const actorIndex = (name: string) => actors.indexOf(name)

  return (
    <div className="flex flex-col h-full bg-[#0f0f1a] overflow-hidden">
      {/* Actor columns header */}
      <div className="shrink-0 px-4 pt-4 pb-2 border-b border-white/5">
        <p className="text-[10px] font-mono text-gray-500 uppercase tracking-widest mb-3">
          Sequence Map
        </p>
        <div className="relative flex items-end" style={{ height: 40 }}>
          {actors.map((actor, i) => {
            const col = getActorColumn(i, actors.length)
            return (
              <div
                key={actor}
                className="absolute flex flex-col items-center"
                style={{ left: col, transform: 'translateX(-50%)' }}
              >
                <span
                  className="text-[9px] font-mono text-gray-500 text-center leading-tight"
                  style={{ maxWidth: 48, wordBreak: 'break-word' }}
                >
                  {actor}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step rows */}
      <div className="flex-1 overflow-y-auto">
        {steps.map((step, i) => {
          const isCurrent = i === currentIndex
          const isPast = i < currentIndex
          const fromIdx = actorIndex(step.arrow.from)
          const toIdx = actorIndex(step.arrow.to)
          const isSelf = fromIdx === toIdx

          return (
            <button
              key={step.id}
              ref={isCurrent ? currentRef : undefined}
              onClick={() => onStepClick(i)}
              className={`w-full text-left px-0 py-0 focus:outline-none group transition-colors ${
                isCurrent ? 'bg-indigo-950/60' : 'hover:bg-white/[0.03]'
              }`}
            >
              {/* Left accent bar for current */}
              <div className="relative flex items-center" style={{ height: 44 }}>
                <div
                  className={`absolute left-0 top-0 bottom-0 w-0.5 transition-colors ${
                    isCurrent ? 'bg-indigo-500' : 'bg-transparent'
                  }`}
                />

                {/* Step number */}
                <span
                  className={`absolute font-mono text-[10px] transition-colors ${
                    isCurrent ? 'text-indigo-400' : isPast ? 'text-gray-600' : 'text-gray-700'
                  }`}
                  style={{ left: 8, minWidth: 14 }}
                >
                  {i + 1}
                </span>

                {/* Arrow SVG spanning actor columns */}
                <div className="absolute inset-0 overflow-hidden" style={{ left: 28 }}>
                  <MiniArrow
                    actors={actors}
                    fromIdx={fromIdx}
                    toIdx={toIdx}
                    isSelf={isSelf}
                    label={step.arrow.label}
                    isCurrent={isCurrent}
                    isPast={isPast}
                    color={step.arrow.color}
                    dashed={step.arrow.style === 'dashed'}
                  />
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function getActorColumn(i: number, total: number): number {
  const PADDING = 28 // left offset after step number
  const AVAILABLE = 340 // width of minimap minus padding
  if (total <= 1) return PADDING + AVAILABLE / 2
  return PADDING + (i / (total - 1)) * AVAILABLE
}

interface MiniArrowProps {
  actors: string[]
  fromIdx: number
  toIdx: number
  isSelf: boolean
  label: string
  isCurrent: boolean
  isPast: boolean
  color?: string
  dashed?: boolean
}

function MiniArrow({ actors, fromIdx, toIdx, isSelf, label, isCurrent, isPast, color, dashed }: MiniArrowProps) {
  const total = actors.length
  const x1 = getActorColumn(fromIdx, total) - 28
  const x2 = getActorColumn(toIdx, total) - 28
  const midX = isSelf ? x1 + 20 : (x1 + x2) / 2

  const strokeColor = isCurrent
    ? (color === 'red' ? '#f87171' : color === 'green' ? '#4ade80' : '#818cf8')
    : isPast
    ? '#374151'
    : '#1f2937'

  const textColor = isCurrent
    ? (color === 'red' ? '#fca5a5' : color === 'green' ? '#86efac' : '#a5b4fc')
    : isPast
    ? '#4b5563'
    : '#374151'

  const strokeW = isCurrent ? 1.5 : 1
  const dashArray = dashed ? '4,2' : undefined

  return (
    <svg width="100%" height="44" style={{ overflow: 'visible', position: 'absolute', top: 0, left: 0 }}>
      {/* Vertical lifelines for all actors */}
      {actors.map((_, i) => {
        const cx = getActorColumn(i, total) - 28
        return (
          <line
            key={i}
            x1={cx} y1={0} x2={cx} y2={44}
            stroke="#1a1a2e"
            strokeWidth={1}
            strokeDasharray="2,3"
          />
        )
      })}

      {isSelf ? (
        <g>
          <path
            d={`M ${x1} 18 Q ${x1 + 22} 18 ${x1 + 22} 26 Q ${x1 + 22} 34 ${x1} 34`}
            fill="none"
            stroke={strokeColor}
            strokeWidth={strokeW}
            strokeDasharray={dashArray}
          />
          <polygon
            points={`${x1 - 3},31 ${x1},34 ${x1 + 3},31`}
            fill={strokeColor}
          />
          <text x={x1 + 26} y={28} fontSize={8} fill={textColor} fontFamily="monospace">
            {label.length > 18 ? label.slice(0, 17) + '…' : label}
          </text>
        </g>
      ) : (
        <g>
          <line
            x1={x1} y1={26} x2={x2} y2={26}
            stroke={strokeColor}
            strokeWidth={strokeW}
            strokeDasharray={dashArray}
          />
          <polygon
            points={
              toIdx > fromIdx
                ? `${x2},26 ${x2 - 5},22 ${x2 - 5},30`
                : `${x2},26 ${x2 + 5},22 ${x2 + 5},30`
            }
            fill={strokeColor}
          />
          <text
            x={midX}
            y={20}
            fontSize={8}
            fill={textColor}
            fontFamily="monospace"
            textAnchor="middle"
          >
            {label.length > 20 ? label.slice(0, 19) + '…' : label}
          </text>
        </g>
      )}
    </svg>
  )
}
