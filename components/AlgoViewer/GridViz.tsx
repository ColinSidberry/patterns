'use client'

import { motion } from 'framer-motion'
import { GridState } from '@/data/algo-types'

interface Props {
  state: GridState
  isBroken?: boolean
}

const CELL = 36
const GAP = 3
const STEP = CELL + GAP
const LABEL_SIZE = 10
const COL_LABEL_H = 18
const ROW_LABEL_W = 18

function isInSet(set: [number, number][] | undefined, r: number, c: number): boolean {
  if (!set) return false
  return set.some(([sr, sc]) => sr === r && sc === c)
}

function getCellColors(
  val: string,
  isActive: boolean,
  isVisited: boolean,
  isBroken: boolean,
): { bg: string; border: string; text: string } {
  if (isActive && isBroken) {
    return { bg: '#3b1c1c', border: '#f87171', text: '#fca5a5' }
  }
  if (isActive) {
    return { bg: '#2d2002', border: '#ca8a04', text: '#fde047' }
  }
  if (isVisited) {
    return { bg: '#313244', border: '#45475a', text: '#6c7086' }
  }
  if (val === '1') {
    return { bg: '#1a3b2a', border: '#22c55e', text: '#4ade80' }
  }
  // '0' — water
  return { bg: '#181825', border: '#313244', text: '#45475a' }
}

export function GridViz({ state, isBroken = false }: Props) {
  const { cells, visited, active } = state
  const rows = cells.length
  const cols = cells[0]?.length ?? 0

  const gridW = cols * STEP - GAP
  const gridH = rows * STEP - GAP

  return (
    <div style={{ display: 'inline-block' }}>
      {/* Column index labels */}
      <div
        style={{
          display: 'flex',
          marginLeft: ROW_LABEL_W + GAP,
          marginBottom: 2,
          height: COL_LABEL_H,
        }}
      >
        {Array.from({ length: cols }, (_, c) => (
          <div
            key={c}
            style={{
              width: CELL,
              marginRight: c < cols - 1 ? GAP : 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: LABEL_SIZE,
              color: '#45475a',
              userSelect: 'none',
            }}
          >
            {c}
          </div>
        ))}
      </div>

      {/* Row labels + grid cells */}
      <div style={{ display: 'flex', gap: GAP, alignItems: 'flex-start' }}>
        {/* Row index labels */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: GAP,
            width: ROW_LABEL_W,
          }}
        >
          {Array.from({ length: rows }, (_, r) => (
            <div
              key={r}
              style={{
                height: CELL,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: LABEL_SIZE,
                color: '#45475a',
                userSelect: 'none',
              }}
            >
              {r}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${cols}, ${CELL}px)`,
            gap: GAP,
            width: gridW,
            height: gridH,
          }}
        >
          {cells.map((row, r) =>
            row.map((val, c) => {
              const isActive = isInSet(active, r, c)
              const isVisited = isInSet(visited, r, c)
              const colors = getCellColors(val, isActive, isVisited, isBroken)

              return (
                <motion.div
                  key={`${r}-${c}`}
                  animate={{
                    backgroundColor: colors.bg,
                    borderColor: colors.border,
                    color: colors.text,
                  }}
                  transition={{ duration: 0.2 }}
                  style={{
                    width: CELL,
                    height: CELL,
                    borderRadius: 4,
                    border: '1.5px solid',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: 'ui-monospace, SFMono-Regular, monospace',
                    userSelect: 'none',
                  }}
                >
                  {val}
                </motion.div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
