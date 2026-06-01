'use client'

import { motion } from 'framer-motion'
import { LinkedListState } from '@/data/algo-types'

interface Props {
  state: LinkedListState
  isBroken?: boolean
}

const POINTER_COLORS = [
  { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd', label: '#60a5fa' },
  { bg: '#3b1c1c', border: '#ef4444', text: '#fca5a5', label: '#f87171' },
  { bg: '#3b2f00', border: '#ca8a04', text: '#fde047', label: '#facc15' },
  { bg: '#1a3b2a', border: '#22c55e', text: '#86efac', label: '#4ade80' },
]

export function LinkedListViz({ state, isBroken = false }: Props) {
  const { nodes, pointers, reversed = 0 } = state

  const NODE = 40
  const GAP = 20   // space between nodes (arrow lives here)
  const STEP = NODE + GAP
  const BRACKET_W = 18
  // Extra width after last node for the null label + null pointer labels
  const NULL_AREA_W = 64

  // Sort pointer entries by name for stable color assignment
  const pointerEntries = Object.entries(pointers).sort(([a], [b]) => a.localeCompare(b))

  const pointerColorMap: Record<string, typeof POINTER_COLORS[0]> = {}
  pointerEntries.forEach(([key], i) => {
    pointerColorMap[key] = POINTER_COLORS[i % POINTER_COLORS.length]
  })

  // Group pointers by node index
  const nodePointers: Record<number, string[]> = {}
  pointerEntries.forEach(([key, idx]) => {
    if (!nodePointers[idx]) nodePointers[idx] = []
    nodePointers[idx].push(key)
  })

  // Null pointers (-1)
  const nullPointers = pointerEntries
    .filter(([, idx]) => idx === -1)
    .map(([key]) => key)

  const n = nodes.length

  // X center of node i (relative to the left padding of the row container)
  const nodeCenterX = (i: number) => BRACKET_W + i * STEP + NODE / 2

  // X center of the null label area (center of NULL_AREA_W after last node)
  const nullCenterX = BRACKET_W + n * STEP - GAP / 2 + NULL_AREA_W / 2

  // Total width of row container
  const totalW = BRACKET_W + n * STEP - GAP + NULL_AREA_W + BRACKET_W

  // Label height area above nodes: each label row is ~24px
  // We need to know max stacking depth for pre-allocated height
  const maxStack = Math.max(
    0,
    ...Object.values(nodePointers).map((arr) => arr.length),
    nullPointers.length,
  )
  const LABEL_ROW_H = 24
  const labelAreaH = Math.max(36, maxStack * LABEL_ROW_H + 8)

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto">
        <div className="flex justify-center">
          <div style={{ paddingLeft: 8, paddingRight: 8 }}>

            {/* Pointer labels row — positioned absolutely within a relative container */}
            <div className="relative" style={{ height: labelAreaH, width: totalW }}>

              {/* Labels over nodes */}
              {pointerEntries
                .filter(([, idx]) => idx !== -1)
                .map(([key, idx]) => {
                  const color = pointerColorMap[key]
                  // Stack: among all pointers on this node, find this key's vertical slot
                  const ptrsOnNode = nodePointers[idx] ?? []
                  const slot = ptrsOnNode.indexOf(key)
                  const topOffset = slot * LABEL_ROW_H

                  return (
                    <motion.div
                      key={key}
                      className="absolute"
                      style={{ top: topOffset }}
                      animate={{ left: nodeCenterX(idx) }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    >
                      <div
                        className="flex flex-col items-center"
                        style={{ transform: 'translateX(-50%)' }}
                      >
                        <span
                          className="text-xs font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                          style={{
                            backgroundColor: color.bg,
                            color: color.label,
                            border: `1px solid ${color.border}`,
                          }}
                        >
                          {key}
                        </span>
                        {/* connector line only for bottom-most label on this node */}
                        {slot === ptrsOnNode.length - 1 && (
                          <div className="w-px" style={{ height: labelAreaH - topOffset - LABEL_ROW_H, backgroundColor: color.border, minHeight: 4 }} />
                        )}
                      </div>
                    </motion.div>
                  )
                })}

              {/* Null pointer labels — stack above the null zone */}
              {nullPointers.map((key, slot) => {
                const color = pointerColorMap[key]
                const topOffset = slot * LABEL_ROW_H
                return (
                  <motion.div
                    key={key}
                    className="absolute"
                    style={{ top: topOffset }}
                    animate={{ left: nullCenterX }}
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  >
                    <div
                      className="flex flex-col items-center"
                      style={{ transform: 'translateX(-50%)' }}
                    >
                      <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded whitespace-nowrap"
                        style={{
                          backgroundColor: color.bg,
                          color: color.label,
                          border: `1px solid ${color.border}`,
                        }}
                      >
                        {key}
                      </span>
                      {slot === nullPointers.length - 1 && (
                        <div className="w-px" style={{ height: 4, backgroundColor: color.border }} />
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>

            {/* Node row */}
            <div className="flex items-start" style={{ width: totalW }}>
              {/* Opening bracket — aligned with nodes only */}
              <span
                className="font-mono select-none shrink-0 flex items-center"
                style={{
                  color: '#45475a',
                  fontSize: 22,
                  width: BRACKET_W,
                  height: NODE,
                  lineHeight: 1,
                }}
              >
                [
              </span>

              {/* Nodes + arrows */}
              <div className="flex items-start" style={{ gap: 0 }}>
                {nodes.map((node, i) => {
                  const ptrs = nodePointers[i] ?? []
                  const hasPtr = ptrs.length > 0
                  const ptrColor = hasPtr ? pointerColorMap[ptrs[0]] : null
                  const isBrokenCell = isBroken && hasPtr

                  // Arrow direction: reversed arrows for first `reversed` nodes
                  // Arrow between node i and node i+1: if i < reversed, show ←, else →
                  const showArrow = i < n - 1
                  const arrowReversed = i < reversed

                  return (
                    <div key={node.id} className="flex items-center" style={{ gap: 0 }}>
                      {/* Node box */}
                      <div className="flex flex-col items-center shrink-0" style={{ width: NODE }}>
                        <motion.div
                          animate={{
                            backgroundColor: isBrokenCell
                              ? '#3b1c1c'
                              : hasPtr
                                ? ptrColor!.bg
                                : '#313244',
                            borderColor: isBrokenCell
                              ? '#f87171'
                              : hasPtr
                                ? ptrColor!.border
                                : '#45475a',
                          }}
                          transition={{ duration: 0.2 }}
                          className="rounded-lg border-2 flex items-center justify-center text-sm font-semibold shrink-0"
                          style={{
                            width: NODE,
                            height: NODE,
                            color: isBrokenCell
                              ? '#fca5a5'
                              : hasPtr
                                ? ptrColor!.text
                                : '#cdd6f4',
                          }}
                        >
                          {node.val}
                        </motion.div>
                        <span className="mt-1" style={{ fontSize: 10, color: '#45475a' }}>{i}</span>
                      </div>

                      {/* Arrow between this node and the next */}
                      {showArrow && (
                        <div
                          className="flex items-center justify-center shrink-0 font-mono font-bold select-none"
                          style={{
                            width: GAP,
                            height: NODE,
                            color: '#45475a',
                            fontSize: 14,
                            letterSpacing: '-2px',
                          }}
                        >
                          {arrowReversed ? '←' : '→'}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Null label after last node */}
                <div
                  className="flex flex-col items-center shrink-0"
                  style={{ width: NULL_AREA_W - BRACKET_W }}
                >
                  <span
                    className="font-mono text-sm select-none flex items-center"
                    style={{ height: NODE, color: '#45475a' }}
                  >
                    → null
                  </span>
                  {/* spacer to align with index labels */}
                  <span style={{ height: 18, display: 'block' }} />
                </div>
              </div>

              {/* Closing bracket */}
              <span
                className="font-mono select-none shrink-0 flex items-center"
                style={{
                  color: '#45475a',
                  fontSize: 22,
                  width: BRACKET_W,
                  height: NODE,
                  lineHeight: 1,
                  paddingLeft: 2,
                }}
              >
                ]
              </span>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
