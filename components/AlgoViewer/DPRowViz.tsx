'use client'

import { motion } from 'framer-motion'
import { DPRowState } from '@/data/algo-types'

interface Props {
  state: DPRowState
  isBroken?: boolean
}

export function DPRowViz({ state, isBroken = false }: Props) {
  const { values, activeIndex } = state

  const CELL = 40
  const GAP = 6

  return (
    <div className="flex items-start justify-center gap-2">
      <span className="text-xs font-mono text-[#585b70] select-none flex items-center" style={{ height: CELL }}>dp</span>
      <span className="font-mono text-[#45475a] text-xl leading-none select-none flex items-center" style={{ height: CELL }}>[</span>
      <div className="flex items-start" style={{ gap: GAP }}>
        {values.map((val, i) => {
          const isActive = i === activeIndex
          const isEmpty = val === null
          const isBrokenCell = isBroken && isActive

          return (
            <div key={i} className="flex flex-col items-center">
              <motion.div
                animate={{
                  backgroundColor: isBrokenCell
                    ? '#3b1c1c'
                    : isActive
                      ? '#1e3a5f'
                      : isEmpty
                        ? '#181825'
                        : '#313244',
                  borderColor: isBrokenCell
                    ? '#f87171'
                    : isActive
                      ? '#3b82f6'
                      : isEmpty
                        ? '#313244'
                        : '#45475a',
                }}
                transition={{ duration: 0.25 }}
                className="rounded-lg border-2 flex items-center justify-center font-mono font-semibold"
                style={{
                  width: CELL,
                  height: CELL,
                  fontSize: 14,
                  color: isBrokenCell
                    ? '#fca5a5'
                    : isActive
                      ? '#93c5fd'
                      : isEmpty
                        ? '#45475a'
                        : '#cdd6f4',
                }}
              >
                {val === null ? '?' : val}
              </motion.div>
              <span className="text-[10px] text-[#45475a] mt-1 font-mono">{i + 1}</span>
            </div>
          )
        })}
      </div>
      <span className="font-mono text-[#45475a] text-xl leading-none select-none flex items-center" style={{ height: CELL }}>]</span>
    </div>
  )
}
