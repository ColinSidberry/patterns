'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Step } from '@/data/types'
import { CodeSnippet } from './CodeSnippet'

interface Props {
  step: Step
  stepIndex: number
  actors: string[]
  mode: string
  failureModeLabel: string | null
  brokenStepCount: number
  onExpand?: () => void
}

const ARROW_COLORS = {
  default: { line: '#6366f1', text: '#4f46e5' },
  green:   { line: '#16a34a', text: '#15803d' },
  red:     { line: '#dc2626', text: '#b91c1c' },
}

export function StepPanel({ step, stepIndex, actors, mode, failureModeLabel, brokenStepCount, onExpand }: Props) {
  const actorCount = actors.length
  const ACTOR_W = actorCount > 5 ? 68 : 90
  const SPACING = actorCount > 5 ? 105 : 130
  const totalWidth = (actorCount - 1) * SPACING + ACTOR_W
  const fromIdx = actors.indexOf(step.arrow.from)
  const toIdx = actors.indexOf(step.arrow.to)
  const isSelf = fromIdx === toIdx
  const arrowColor = ARROW_COLORS[step.arrow.color ?? 'default']
  const isBroken = mode !== 'happy' && stepIndex < brokenStepCount

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Header */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${step.id}-header`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-3"
        >
          {failureModeLabel && (
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
              isBroken
                ? 'bg-red-100 text-red-700'
                : 'bg-green-100 text-green-700'
            }`}>
              {isBroken ? '⚡ Broken path' : '✓ Fix'}
            </span>
          )}
          <h3 className="text-base font-semibold text-gray-900">{step.label}</h3>
        </motion.div>
      </AnimatePresence>

      {/* Description */}
      <AnimatePresence mode="wait">
        <motion.p
          key={`${step.id}-desc`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, delay: 0.05 }}
          className="text-sm text-gray-500 leading-relaxed"
        >
          {step.description}
        </motion.p>
      </AnimatePresence>

      {/* Sequence diagram */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 overflow-x-auto">
        <div style={{ minWidth: totalWidth + 40 }} className="relative">
          {/* Actors */}
          <div className="flex" style={{ gap: SPACING - ACTOR_W }}>
            {actors.map((actor) => {
              const isActive = step.activeActors.includes(actor)
              return (
                <div key={actor} style={{ width: ACTOR_W }} className="flex flex-col items-center">
                  <motion.div
                    animate={{
                      backgroundColor: isActive ? (isBroken ? '#fee2e2' : '#eef2ff') : '#f9fafb',
                      borderColor: isActive ? (isBroken ? '#fca5a5' : '#a5b4fc') : '#e5e7eb',
                      scale: isActive ? 1.05 : 1,
                    }}
                    transition={{ duration: 0.2 }}
                    className={`w-full py-2 px-1 rounded-lg border text-center text-xs font-medium transition-colors ${
                      isActive
                        ? isBroken ? 'text-red-700' : 'text-indigo-700'
                        : 'text-gray-400'
                    }`}
                  >
                    {actor}
                  </motion.div>
                  {/* Lifeline */}
                  <div className="w-px bg-gray-200 flex-1 mt-1" style={{ minHeight: 80 }} />
                </div>
              )
            })}
          </div>

          {/* Arrow */}
          <div className="absolute" style={{ top: 52, left: 0, right: 0 }}>
            {isSelf ? (
              // Self-arrow (loops back)
              <div
                style={{ left: fromIdx * SPACING + ACTOR_W / 2, top: 10 }}
                className="absolute"
              >
                <svg width="80" height="40" className="overflow-visible">
                  <path
                    d="M 0 0 Q 50 0 50 20 Q 50 40 0 40"
                    fill="none"
                    stroke={arrowColor.line}
                    strokeWidth="1.5"
                    strokeDasharray={step.arrow.style === 'dashed' ? '5,3' : undefined}
                  />
                  <polyline points="-4,36 0,40 4,36" fill="none" stroke={arrowColor.line} strokeWidth="1.5" />
                </svg>
                <span className="absolute text-xs font-medium whitespace-nowrap" style={{ left: 55, top: 12, color: arrowColor.text }}>
                  {step.arrow.label}
                </span>
              </div>
            ) : (
              // Normal arrow between actors
              <AnimatePresence mode="wait">
                <motion.div
                  key={step.id}
                  className="absolute"
                  style={{ top: 14, left: 0, right: 0 }}
                >
                  {(() => {
                    const x1 = fromIdx * SPACING + ACTOR_W / 2 + (fromIdx < toIdx ? ACTOR_W / 2 - 8 : -(ACTOR_W / 2 - 8))
                    const x2 = toIdx * SPACING + ACTOR_W / 2 + (toIdx > fromIdx ? -(ACTOR_W / 2 - 8) : ACTOR_W / 2 - 8)
                    const midX = (x1 + x2) / 2
                    return (
                      <svg style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible' }} width={totalWidth + 40} height={40}>
                        <motion.line
                          x1={x1} y1={12} x2={x2} y2={12}
                          stroke={arrowColor.line}
                          strokeWidth="2"
                          strokeDasharray={step.arrow.style === 'dashed' ? '6,3' : undefined}
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          transition={{ duration: 0.35, ease: 'easeOut' }}
                        />
                        {/* Arrowhead */}
                        <motion.polygon
                          points={
                            toIdx > fromIdx
                              ? `${x2},12 ${x2 - 8},8 ${x2 - 8},16`
                              : `${x2},12 ${x2 + 8},8 ${x2 + 8},16`
                          }
                          fill={arrowColor.line}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.3 }}
                        />
                        <text
                          x={midX}
                          y={6}
                          textAnchor="middle"
                          fontSize="10"
                          fill={arrowColor.text}
                          fontWeight="500"
                        >
                          {step.arrow.label}
                        </text>
                      </svg>
                    )
                  })()}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      {/* Code snippet */}
      <div className="flex-1 min-h-0">
        <CodeSnippet
          file={step.code.file}
          lines={step.code.lines}
          stepKey={step.id}
          onExpand={onExpand}
        />
      </div>
    </div>
  )
}
