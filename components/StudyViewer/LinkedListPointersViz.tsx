'use client'

// Pure presentation: renders a singly-linked-list as a row of node boxes
// connected by → arrows, with named pointer labels above (top) or below
// (bottom) specific nodes. Final `null` cap is shown in a dimmed style.
//
// Pointer indices come from the shared trace context — the worker resolves
// them by reference identity walked from the configured listVar (which may
// be dot-pathed). No knowledge of the trace internals here.

import type { LinkedListFrame } from '@/lib/runner/vizFrames'
import type { VizTone } from '@/data/algo-monster-types'

interface Props {
  frame: LinkedListFrame
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

const NODE_W = 44
const ARROW_W = 24
const SLOT_W = NODE_W + ARROW_W   // node + arrow gap; pointers center on this slot

export function LinkedListPointersViz({ frame }: Props) {
  if (frame.nodes.length === 0) {
    return (
      <div className="rounded-lg border border-[#313244] bg-[#181825] px-4 py-6 text-xs text-[#6c7086] italic text-center">
        Waiting for trace…
      </div>
    )
  }

  const topPointers = frame.pointers.filter((p) => p.side === 'top')
  const bottomPointers = frame.pointers.filter((p) => p.side === 'bottom')
  // Slots: one per node + one trailing "null cap" slot. Pointers whose
  // value is null land at index === frame.nodes.length, hovering over the
  // null cap.
  const nullSlotIndex = frame.nodes.length
  const totalSlots = frame.nodes.length + 1

  return (
    <div
      className="rounded-lg border border-[#313244] bg-[#181825] px-4 py-4"
      data-viz-root="linked-list-pointers"
    >
      <div className="flex items-start gap-6">
        <div className="flex flex-col items-start gap-1">
          {/* Top pointers row */}
          <div
            className="relative"
            style={{ width: totalSlots * SLOT_W, height: 28 }}
          >
            {topPointers.map((p) => (
              <PointerLabel
                key={`top-${p.name}`}
                p={p}
                pos={p.index * SLOT_W}
                side="top"
              />
            ))}
          </div>

          {/* Node strip + arrows + trailing null cap. Sentinels render
              their semantic label (e.g. "dummy") instead of their
              arbitrary value, since the value of a sentinel doesn't
              matter to the algorithm. */}
          <div className="flex items-center" style={{ height: NODE_W }}>
            {frame.nodes.map((v, i) => {
              const hit = frame.pointers.some((p) => p.index === i)
              const isSentinel = i < (frame.sentinelCount ?? 0)
              const cellClass = isSentinel
                ? 'border-dashed border-[#45475a] bg-transparent text-[#6c7086]'
                : hit
                  ? 'border-[#cdd6f4] bg-[#2a2d4a] text-[#cdd6f4]'
                  : 'border-[#313244] bg-[#1e1e2e] text-[#a6adc8]'
              const label = isSentinel ? (frame.sentinelLabel ?? 'dummy') : String(v)
              const fontClass = isSentinel
                ? 'font-mono text-[10px] uppercase tracking-wide'
                : 'font-mono text-sm tabular-nums'
              return (
                <div key={i} className="flex items-center">
                  <div
                    data-node-index={i}
                    data-node-value={String(v)}
                    {...(isSentinel && { 'data-node-sentinel': 'true' })}
                    className={`flex items-center justify-center rounded border transition-colors ${cellClass} ${fontClass}`}
                    style={{ width: NODE_W, height: NODE_W }}
                    title={isSentinel ? `${label} (sentinel; value is arbitrary)` : undefined}
                  >
                    {label}
                  </div>
                  <div
                    className="text-[#45475a] text-base font-mono select-none"
                    style={{ width: ARROW_W, textAlign: 'center' }}
                    aria-hidden
                  >
                    →
                  </div>
                </div>
              )
            })}
            {/* Null cap as a first-class slot so pointers can hover over it */}
            <div
              data-node-index={nullSlotIndex}
              data-node-value="null"
              data-node-null="true"
              className={`flex items-center justify-center font-mono text-[11px] tabular-nums transition-colors ${
                frame.pointers.some((p) => p.index === nullSlotIndex)
                  ? 'text-[#cdd6f4]'
                  : 'text-[#6c7086]'
              }`}
              style={{ width: NODE_W, height: NODE_W }}
              title="null (end of chain)"
            >
              null
            </div>
          </div>

          {/* Bottom pointers row */}
          <div
            className="relative"
            style={{ width: totalSlots * SLOT_W, height: 28 }}
          >
            {bottomPointers.map((p) => (
              <PointerLabel
                key={`bot-${p.name}`}
                p={p}
                pos={p.index * SLOT_W}
                side="bottom"
              />
            ))}
          </div>
        </div>

        {/* Optional target box */}
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
  p: LinkedListFrame['pointers'][number]; pos: number; side: 'top' | 'bottom'
}) {
  const arrow = side === 'top' ? '↓' : '↑'
  const tone = p.tone
  return (
    <div
      className={`absolute flex flex-col items-center transition-all ${TONE_TEXT[tone]}`}
      data-pointer-name={p.name}
      data-pointer-label={p.label}
      data-pointer-index={p.index}
      data-pointer-side={side}
      style={{
        left: pos,
        width: NODE_W,
        ...(side === 'top' ? { bottom: 0 } : { top: 0 }),
      }}
    >
      {side === 'bottom' && <div className="text-base leading-none">{arrow}</div>}
      <div
        className={`text-[10px] font-mono font-semibold border ${TONE_BORDER[tone]} rounded px-1.5 py-0.5 bg-[#1e1e2e] whitespace-nowrap`}
      >
        {p.label}
      </div>
      {side === 'top' && <div className="text-base leading-none">{arrow}</div>}
    </div>
  )
}
