'use client'

import { motion } from 'framer-motion'
import { ArrayRowState } from '@/data/algo-types'

interface Props {
  state: ArrayRowState
  isBroken?: boolean
}

const POINTER_COLORS = [
  { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd', label: '#60a5fa' },
  { bg: '#3b1c1c', border: '#ef4444', text: '#fca5a5', label: '#f87171' },
  { bg: '#3b2f00', border: '#ca8a04', text: '#fde047', label: '#facc15' },
  { bg: '#1a3b2a', border: '#22c55e', text: '#86efac', label: '#4ade80' },
]

export function ArrayRowViz({ state, isBroken = false }: Props) {
  const { values, pointers, highlight = [], showBars } = state
  const pointerEntries = Object.entries(pointers)
  const maxVal = showBars ? Math.max(...(values as number[])) : 1
  const BAR_MAX_H = 56

  const pointerColorMap: Record<string, typeof POINTER_COLORS[0]> = {}
  pointerEntries.forEach(([key], i) => {
    pointerColorMap[key] = POINTER_COLORS[i % POINTER_COLORS.length]
  })

  const n = values.length
  const CELL = 32
  const GAP = 3
  const STEP = CELL + GAP
  const BRACKET_W = 16
  const totalW = BRACKET_W * 2 + n * STEP - GAP

  const cellPointers: Record<number, string[]> = {}
  pointerEntries.forEach(([key, idx]) => {
    if (!cellPointers[idx]) cellPointers[idx] = []
    cellPointers[idx].push(key)
  })

  const ptrIndices = pointerEntries.map(([, idx]) => idx)
  const waterL = ptrIndices.length >= 2 ? Math.min(...ptrIndices) : -1
  const waterR = ptrIndices.length >= 2 ? Math.max(...ptrIndices) : -1
  const waterH = (showBars && waterL >= 0)
    ? Math.min(values[waterL] as number, values[waterR] as number)
    : 0

  const showContainer = showBars && waterL >= 0 && waterR > waterL && waterH > 0
  const boxHeightPx = showContainer ? (waterH / maxVal) * BAR_MAX_H : 0
  // Left/right edges pinned to the horizontal center of each pointer bar column
  const boxLeft = BRACKET_W + waterL * STEP + CELL / 2
  const boxWidth = (waterR - waterL) * STEP

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <div className="flex justify-center">
        <div style={{ paddingLeft: 8, paddingRight: 8 }}>

          {/* Pointer labels */}
          <div className="relative" style={{ height: 36 }}>
            {pointerEntries.map(([key, idx]) => {
              const color = pointerColorMap[key]
              return (
                <motion.div
                  key={key}
                  className="absolute"
                  style={{ top: 0 }}
                  animate={{ left: BRACKET_W + idx * STEP + CELL / 2 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <div className="flex flex-col items-center" style={{ transform: 'translateX(-50%)' }}>
                    <span
                      className="text-xs font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                      style={{ backgroundColor: color.bg, color: color.label, border: `1px solid ${color.border}` }}
                    >
                      {key}
                    </span>
                    <div className="w-px h-2" style={{ backgroundColor: color.border }} />
                  </div>
                </motion.div>
              )
            })}
          </div>

          {/* Cells */}
          <div className="flex items-start">
            <span
              className="font-mono text-[#45475a] select-none shrink-0 flex items-center"
              style={{ fontSize: 22, height: CELL, width: BRACKET_W, lineHeight: 1 }}
            >
              [
            </span>
            <div className="flex items-start" style={{ gap: GAP }}>
              {values.map((val, i) => {
                const ptrs = cellPointers[i] ?? []
                const isHighlighted = highlight.includes(i)
                const hasPtr = ptrs.length > 0
                const ptrColor = hasPtr ? pointerColorMap[ptrs[0]] : null
                const isBrokenCell = isBroken && (isHighlighted || hasPtr)

                return (
                  <motion.div
                    key={i}
                    className="flex flex-col items-center shrink-0"
                    style={{ width: CELL }}
                  >
                    <motion.div
                      animate={{
                        backgroundColor: isBrokenCell
                          ? '#3b1c1c'
                          : hasPtr
                            ? ptrColor!.bg
                            : isHighlighted
                              ? '#1e3a5f'
                              : '#313244',
                        borderColor: isBrokenCell
                          ? '#f87171'
                          : hasPtr
                            ? ptrColor!.border
                            : isHighlighted
                              ? '#60a5fa'
                              : '#45475a',
                      }}
                      transition={{ duration: 0.2 }}
                      className="w-full rounded-lg border-2 flex items-center justify-center text-sm font-semibold"
                      style={{
                        height: CELL,
                        color: isBrokenCell
                          ? '#fca5a5'
                          : hasPtr
                            ? ptrColor!.text
                            : isHighlighted
                              ? '#93c5fd'
                              : '#cdd6f4',
                      }}
                    >
                      {val}
                    </motion.div>
                    <span className="text-[10px] text-[#45475a] mt-1">{i}</span>
                  </motion.div>
                )
              })}
            </div>
            <span
              className="font-mono text-[#45475a] select-none shrink-0 flex items-center"
              style={{ fontSize: 22, height: CELL, paddingLeft: 4, lineHeight: 1, alignSelf: 'flex-start' }}
            >
              ]
            </span>
          </div>

          {/* Height bars + container overlay */}
          {showBars && (
            <>
              <div className="relative mt-3" style={{ height: BAR_MAX_H + 4 }}>

                {/* Individual bars — rendered first (behind container) */}
                {values.map((val, i) => {
                  const h = ((val as number) / maxVal) * BAR_MAX_H
                  const ptrs = cellPointers[i] ?? []
                  const hasPtr = ptrs.length > 0
                  const ptrColor = hasPtr ? pointerColorMap[ptrs[0]] : null

                  return (
                    <div
                      key={i}
                      className="absolute bottom-0"
                      style={{ left: BRACKET_W + i * STEP, width: CELL }}
                    >
                      <motion.div
                        className="absolute bottom-0 left-1 right-1 rounded-t-sm"
                        style={{
                          backgroundColor: hasPtr
                            ? (isBroken ? '#f87171' : ptrColor!.border)
                            : '#45475a',
                        }}
                        animate={{ height: h }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )
                })}

                {/* Container box — bottom-anchored, left/right at column centers */}
                {showContainer && (
                  <>
                    <div
                      className="absolute bottom-0 pointer-events-none"
                      style={{
                        left: boxLeft,
                        width: boxWidth,
                        height: boxHeightPx,
                        backgroundColor: 'rgba(96, 165, 250, 0.10)',
                        border: '1.5px solid rgba(96, 165, 250, 0.55)',
                      }}
                    />
                    {/* h = X label just above the top-left of the box */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: boxLeft + 3,
                        bottom: boxHeightPx + 4,
                        fontSize: 9,
                        color: 'rgba(96, 165, 250, 0.8)',
                        lineHeight: 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      h = {waterH}
                    </div>
                  </>
                )}
              </div>

              {/* Width bracket below bars */}
              {waterL >= 0 && waterR > waterL && (
                <div className="relative" style={{ height: 20, marginTop: 1 }}>
                  <div className="absolute" style={{
                    left: BRACKET_W + waterL * STEP + CELL / 2,
                    width: (waterR - waterL) * STEP,
                    top: 7,
                    height: 1,
                    backgroundColor: '#45475a',
                  }} />
                  <div className="absolute" style={{
                    left: BRACKET_W + waterL * STEP + CELL / 2,
                    top: 3,
                    width: 1,
                    height: 9,
                    backgroundColor: '#45475a',
                  }} />
                  <div className="absolute" style={{
                    left: BRACKET_W + waterR * STEP + CELL / 2,
                    top: 3,
                    width: 1,
                    height: 9,
                    backgroundColor: '#45475a',
                  }} />
                  <div className="absolute text-center" style={{
                    left: BRACKET_W + waterL * STEP + CELL / 2,
                    width: (waterR - waterL) * STEP,
                    top: 11,
                    fontSize: 9,
                    color: '#6c7086',
                    lineHeight: 1,
                  }}>
                    w = {waterR - waterL}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
