'use client'

// Pure presentation: renders an array of cells with labeled pointer arrows
// pinned above (top) or below (bottom) specific indices, plus an optional
// target value box on the right.
//
// No knowledge of the trace or step state — that's all in the parent.
// Frames come in pre-computed via `deriveArrayFrame`.

import type { ArrayFrame } from '@/lib/runner/vizFrames'
import type { VizTone } from '@/data/algo-monster-types'

interface Props {
  frame: ArrayFrame
}

const TONE_TEXT: Record<VizTone, string> = {
  cyan: 'text-cyan-300',
  amber: 'text-amber-300',
  emerald: 'text-emerald-300',
  indigo: 'text-indigo-300',
  rose: 'text-rose-300',
}

const TONE_BORDER: Record<VizTone, string> = {
  cyan: 'border-cyan-500/60',
  amber: 'border-amber-500/60',
  emerald: 'border-emerald-500/60',
  indigo: 'border-indigo-500/60',
  rose: 'border-rose-500/60',
}

const CELL_W = 44

export function ArrayPointersViz({ frame }: Props) {
  if (frame.cells.length === 0) {
    return (
      <div className="rounded-lg border border-[#313244] bg-[#181825] px-4 py-6 text-xs text-[#6c7086] italic text-center">
        Waiting for trace…
      </div>
    )
  }

  // Pointers grouped by side so we can render them on a single row above
  // (or below) the cell strip — multiple pointers at the same index stack.
  const topPointers = frame.pointers.filter((p) => p.side === 'top')
  const bottomPointers = frame.pointers.filter((p) => p.side === 'bottom')

  return (
    <div
      className="rounded-lg border border-[#313244] bg-[#181825] px-4 py-4"
      data-viz-root="array-pointers"
    >
      <div className="flex items-start gap-6">
        {/* Cell strip + pointers */}
        <div className="flex flex-col items-start gap-1">
          {/* Top pointers row — fixed height even when empty so cells
              don't shift between frames with/without top pointers. */}
          <div
            className="relative"
            style={{ width: frame.cells.length * (CELL_W + 4) - 4, height: 28 }}
          >
            {topPointers.map((p) => (
              <PointerLabel
                key={`top-${p.name}`}
                p={p}
                pos={p.index * (CELL_W + 4)}
                side="top"
              />
            ))}
          </div>

          {/* Cell strip */}
          <div className="flex gap-1">
            {frame.cells.map((v, i) => {
              const hit = frame.pointers.some((p) => p.index === i)
              return (
                <div
                  key={i}
                  data-cell-index={i}
                  data-cell-value={String(v)}
                  className={`flex items-center justify-center rounded border font-mono text-sm tabular-nums transition-colors ${
                    hit
                      ? 'border-[#cdd6f4] bg-[#2a2d4a] text-[#cdd6f4]'
                      : 'border-[#313244] bg-[#1e1e2e] text-[#a6adc8]'
                  }`}
                  style={{ width: CELL_W, height: CELL_W }}
                >
                  {String(v)}
                </div>
              )
            })}
          </div>

          {/* Cell-index ruler — small numbers below each cell */}
          <div
            className="flex gap-1"
            style={{ width: frame.cells.length * (CELL_W + 4) - 4 }}
          >
            {frame.cells.map((_, i) => (
              <div
                key={i}
                className="text-[10px] text-[#45475a] text-center font-mono tabular-nums"
                style={{ width: CELL_W }}
              >
                {i}
              </div>
            ))}
          </div>

          {/* Bottom pointers row */}
          <div
            className="relative"
            style={{ width: frame.cells.length * (CELL_W + 4) - 4, height: 28 }}
          >
            {bottomPointers.map((p) => (
              <PointerLabel
                key={`bot-${p.name}`}
                p={p}
                pos={p.index * (CELL_W + 4)}
                side="bottom"
              />
            ))}
          </div>
        </div>

        {/* Target box (right of strip) */}
        {frame.target && (
          <div
            className="flex flex-col items-center justify-center rounded border border-rose-500/40 bg-rose-900/15 px-3 py-2 mt-7"
            data-target-label={frame.target.label}
            data-target-value={String(frame.target.value)}
          >
            <div className="text-[10px] uppercase tracking-wider text-rose-300/80">
              {frame.target.label}
            </div>
            <div className="text-base font-mono font-bold text-rose-200 mt-0.5">
              {String(frame.target.value)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function PointerLabel({
  p, pos, side,
}: {
  p: ArrayFrame['pointers'][number]; pos: number; side: 'top' | 'bottom'
}) {
  const arrow = side === 'top' ? '↓' : '↑'
  const tone = p.tone
  return (
    <div
      className={`absolute flex flex-col items-center transition-all ${TONE_TEXT[tone]}`}
      data-pointer-name={p.name}
      data-pointer-index={p.index}
      data-pointer-side={side}
      style={{
        left: pos,
        width: CELL_W,
        ...(side === 'top' ? { bottom: 0 } : { top: 0 }),
      }}
    >
      {side === 'bottom' && <div className="text-base leading-none">{arrow}</div>}
      <div
        className={`text-[10px] font-mono font-semibold border ${TONE_BORDER[tone]} rounded px-1.5 py-0.5 bg-[#1e1e2e]`}
      >
        {p.name}
      </div>
      {side === 'top' && <div className="text-base leading-none">{arrow}</div>}
    </div>
  )
}
