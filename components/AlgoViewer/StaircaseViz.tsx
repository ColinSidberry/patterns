'use client'

import { StaircaseState } from '@/data/algo-types'

interface Props {
  state: StaircaseState
  isBroken?: boolean
}

const CELL = 40
const GAP = 10
const STEP = CELL + GAP
const ARROW_H = 52

export function StaircaseViz({ state }: Props) {
  const { n, highlightStep, mode, stepCounts, paths, activePath } = state

  const totalSteps = n + 1
  const totalW = totalSteps * CELL + (totalSteps - 1) * GAP

  const cx = (i: number) => i * STEP + CELL / 2

  type ArrowEntry = { from: number; to: number; hop: 1 | 2; grey: boolean }
  const arrowMap = new Map<string, ArrowEntry>()

  const addArrow = (from: number, to: number, grey: boolean) => {
    const key = `${from}-${to}`
    if (!arrowMap.has(key)) {
      arrowMap.set(key, { from, to, hop: (to - from) as 1 | 2, grey })
    }
  }

  if (paths?.length) {
    if (activePath !== undefined) {
      // Only draw the active path, colored
      const p = paths[activePath]
      for (let i = 0; i < p.length - 1; i++) addArrow(p[i], p[i + 1], false)
    } else {
      // All paths in grey (hint state — hover to animate)
      for (const p of paths) {
        for (let i = 0; i < p.length - 1; i++) addArrow(p[i], p[i + 1], true)
      }
    }
  } else if (mode === 'outgoing' && highlightStep !== undefined) {
    if (highlightStep + 1 <= n) addArrow(highlightStep, highlightStep + 1, false)
    if (highlightStep + 2 <= n) addArrow(highlightStep, highlightStep + 2, false)
  } else if (mode === 'incoming' && highlightStep !== undefined) {
    if (highlightStep - 1 >= 0) addArrow(highlightStep - 1, highlightStep, false)
    if (highlightStep - 2 >= 0) addArrow(highlightStep - 2, highlightStep, false)
  }

  const arrows = Array.from(arrowMap.values())

  const arcPath = (from: number, to: number, hop: 1 | 2) => {
    const x1 = cx(from)
    const x2 = cx(to)
    const y = ARROW_H - 4
    const peak = hop === 1 ? ARROW_H - 28 : ARROW_H - 46
    const mx = (x1 + x2) / 2
    return `M ${x1} ${y} Q ${mx} ${peak} ${x2} ${y}`
  }

  const activeColor = (hop: 1 | 2) => hop === 1 ? '#818cf8' : '#a78bfa'
  const GREY = '#585b70'

  return (
    <div className="flex flex-col items-center gap-0">
      <svg width={totalW} height={ARROW_H} style={{ overflow: 'visible', display: 'block' }}>
        <defs>
          <marker id="arr-indigo" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#818cf8" />
          </marker>
          <marker id="arr-violet" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#a78bfa" />
          </marker>
          <marker id="arr-grey" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L0,6 L6,3 z" fill="#585b70" />
          </marker>
        </defs>
        {arrows.map(({ from, to, hop, grey }) => {
          const color = grey ? GREY : activeColor(hop)
          const markerId = grey ? 'arr-grey' : hop === 1 ? 'arr-indigo' : 'arr-violet'
          return (
            <g key={`${from}-${to}`}>
              <path
                d={arcPath(from, to, hop)}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                markerEnd={`url(#${markerId})`}
              />
              <text
                x={(cx(from) + cx(to)) / 2}
                y={hop === 1 ? ARROW_H - 32 : ARROW_H - 50}
                textAnchor="middle"
                fontSize={9}
                fontFamily="monospace"
                fill={color}
              >
                +{hop}
              </text>
            </g>
          )
        })}
      </svg>

      <div className="flex items-start" style={{ gap: GAP }}>
        {Array.from({ length: totalSteps }, (_, i) => {
          const isHighlight = i === highlightStep
          const count = stepCounts?.[i]
          const inActivePath = activePath !== undefined && paths
            ? paths[activePath].includes(i)
            : paths
              ? paths.some(p => p.includes(i))
              : false

          return (
            <div key={i} className="flex flex-col items-center" style={{ width: CELL }}>
              <div style={{ height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {count != null && (
                  <span
                    className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded"
                    style={{ backgroundColor: '#1e3a5f', color: '#93c5fd', border: '1px solid #3b82f6' }}
                  >
                    {count}
                  </span>
                )}
              </div>

              <div
                className="rounded-lg border-2 flex items-center justify-center text-sm font-semibold shrink-0 transition-all"
                style={{
                  width: CELL,
                  height: CELL,
                  backgroundColor: isHighlight
                    ? '#3730a3'
                    : inActivePath && activePath !== undefined
                      ? '#2d2b55'
                      : i === n ? '#1e3a5f' : '#313244',
                  borderColor: isHighlight
                    ? '#818cf8'
                    : inActivePath && activePath !== undefined
                      ? '#6366f1'
                      : i === n ? '#3b82f6' : '#45475a',
                  color: isHighlight
                    ? '#e0e7ff'
                    : inActivePath && activePath !== undefined
                      ? '#c7d2fe'
                      : i === n ? '#93c5fd' : '#cdd6f4',
                }}
              >
                {i === 0 ? '0' : i}
              </div>

              <span className="text-[10px] mt-1" style={{ color: '#45475a' }}>
                {i === 0 ? 'start' : i === n ? 'top' : `step ${i}`}
              </span>
            </div>
          )
        })}
      </div>

      {state.note && (
        <p className="text-[10px] text-[#6c7086] mt-2 text-center">{state.note}</p>
      )}
    </div>
  )
}
