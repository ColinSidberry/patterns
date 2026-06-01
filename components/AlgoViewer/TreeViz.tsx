'use client'

import { motion } from 'framer-motion'
import { TreeState } from '@/data/algo-types'

interface Props {
  state: TreeState
  isBroken?: boolean
}

const CANVAS_WIDTH = 400
const ROW_HEIGHT = 80
const TOP_PADDING = 36
const NODE_R = 18  // radius (node is 36×36)

function getNodePosition(i: number): { x: number; y: number } {
  const depth = Math.floor(Math.log2(i + 1))
  const posInLevel = i - (Math.pow(2, depth) - 1)
  const totalAtLevel = Math.pow(2, depth)
  const x = (posInLevel + 0.5) / totalAtLevel * CANVAS_WIDTH
  const y = depth * ROW_HEIGHT + TOP_PADDING
  return { x, y }
}

function treeDepth(nodes: (number | null)[]): number {
  let maxDepth = 0
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i] !== null) {
      const d = Math.floor(Math.log2(i + 1))
      if (d > maxDepth) maxDepth = d
    }
  }
  return maxDepth
}

function getNodeColor(
  i: number,
  activeIndex: number | undefined,
  highlightPath: number[] | undefined,
  activeNodes: number[] | undefined,
  isBroken: boolean
): { bg: string; border: string; text: string } {
  const isActive = activeIndex === i
  const isOnPath = highlightPath?.includes(i) ?? false
  const isActiveNode = activeNodes?.includes(i) ?? false

  if (isActive && isBroken) {
    return { bg: '#3b1c1c', border: '#f87171', text: '#fca5a5' }
  }
  if (isActive) {
    return { bg: '#1e3a5f', border: '#3b82f6', text: '#93c5fd' }
  }
  if (isOnPath) {
    return { bg: '#2d2002', border: '#ca8a04', text: '#fde047' }
  }
  if (isActiveNode) {
    return { bg: '#1e1f45', border: '#6366f1', text: '#a5b4fc' }
  }
  return { bg: '#313244', border: '#45475a', text: '#cdd6f4' }
}

export function TreeViz({ state, isBroken = false }: Props) {
  const { nodes, activeIndex, highlightPath, activeNodes } = state

  const depth = treeDepth(nodes)
  const canvasHeight = depth * ROW_HEIGHT + TOP_PADDING + NODE_R + 24

  // Build connecting lines: for each present node, draw line to present parent
  const lines: { x1: number; y1: number; x2: number; y2: number; key: string }[] = []
  for (let i = 1; i < nodes.length; i++) {
    if (nodes[i] === null) continue
    const parentIdx = Math.floor((i - 1) / 2)
    if (nodes[parentIdx] === null) continue
    const child = getNodePosition(i)
    const parent = getNodePosition(parentIdx)
    lines.push({ x1: parent.x, y1: parent.y, x2: child.x, y2: child.y, key: `line-${i}` })
  }

  // Collect present nodes
  const presentNodes: { i: number; x: number; y: number; val: number }[] = []
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i] === null) continue
    const { x, y } = getNodePosition(i)
    presentNodes.push({ i, x, y, val: nodes[i] as number })
  }

  return (
    <div style={{ width: CANVAS_WIDTH, position: 'relative' }}>
      <svg
        width={CANVAS_WIDTH}
        height={canvasHeight}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Connecting lines — drawn first (below nodes) */}
        {lines.map(({ x1, y1, x2, y2, key }) => (
          <line
            key={key}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#45475a"
            strokeWidth={1.5}
          />
        ))}

        {/* Nodes */}
        {presentNodes.map(({ i, x, y, val }) => {
          const colors = getNodeColor(i, activeIndex, highlightPath, activeNodes, isBroken)
          return (
            <g key={`node-${i}`}>
              {/* Framer-motion animates SVG foreignObject wrapper for bg/border color transitions */}
              <motion.circle
                cx={x}
                cy={y}
                r={NODE_R}
                animate={{
                  fill: colors.bg,
                  stroke: colors.border,
                }}
                transition={{ duration: 0.2 }}
                strokeWidth={2}
              />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={13}
                fontWeight={600}
                fontFamily="ui-monospace, SFMono-Regular, monospace"
                fill={colors.text}
                style={{ pointerEvents: 'none', userSelect: 'none' }}
              >
                {val}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
