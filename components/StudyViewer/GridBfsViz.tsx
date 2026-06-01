'use client'

// Pure presentation: renders a 2D grid of cells colored by value (per the
// config's valueStyles palette), an optional queue side-panel, counter
// chips, and "cell pointer" overlays anchored to specific (row, col)
// positions in the grid.
//
// No knowledge of trace/step state — frames come in pre-computed via
// deriveGridBfsFrame.

import type { GridBfsFrame } from '@/lib/runner/vizFrames'
import type { GridValueStyle, VizTone } from '@/data/algo-monster-types'

interface Props {
  frame: GridBfsFrame
}

const TONE_BG: Record<VizTone, string> = {
  cyan: 'bg-cyan-500/80 text-[#0c1118]',
  amber: 'bg-amber-500/80 text-[#0c1118]',
  emerald: 'bg-emerald-500/80 text-[#0c1118]',
  indigo: 'bg-indigo-500/80 text-[#0c1118]',
  rose: 'bg-rose-500/80 text-[#0c1118]',
}

const TONE_RING: Record<VizTone, string> = {
  cyan: 'ring-cyan-400',
  amber: 'ring-amber-400',
  emerald: 'ring-emerald-400',
  indigo: 'ring-indigo-400',
  rose: 'ring-rose-400',
}

const CELL_SIZE = 48

// Look up a value's style; fall through to a muted default if not declared.
function styleFor(
  value: number | string,
  styles: GridValueStyle[]
): { fill: string; text: string; label: string } {
  for (const s of styles) {
    // Loose equality: catalog values may be numbers or strings depending on JSON
    // round-trip + algorithm semantics. `'X' == 'X'`, `2 == 2`, `'2' == 2` all hit.
    if (s.value === value || String(s.value) === String(value)) {
      return {
        fill: s.fill,
        text: s.text ?? '#cdd6f4',
        label: s.label ?? String(value),
      }
    }
  }
  return { fill: '#1e1e2e', text: '#6c7086', label: String(value) }
}

export function GridBfsViz({ frame }: Props) {
  if (frame.rows === 0 || frame.cols === 0) {
    return (
      <div className="rounded-lg border border-[#313244] bg-[#181825] px-4 py-6 text-xs text-[#6c7086] italic text-center">
        Waiting for trace…
      </div>
    )
  }

  // Index pointer overlays by "r,c" so renderer can stack them per cell.
  const overlaysByCell = new Map<string, GridBfsFrame['cellPointers']>()
  for (const cp of frame.cellPointers) {
    const k = `${cp.row},${cp.col}`
    const arr = overlaysByCell.get(k) ?? []
    arr.push(cp)
    overlaysByCell.set(k, arr)
  }

  return (
    <div
      className="rounded-lg border border-[#313244] bg-[#181825] px-4 py-4"
      data-viz-root="grid-bfs"
    >
      {/* Counters */}
      {frame.counters.length > 0 && (
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {frame.counters.map((c) => (
            <div
              key={c.label}
              data-counter-label={c.label}
              data-counter-value={String(c.value)}
              className="flex items-center gap-1.5 rounded border border-[#313244] bg-[#1e1e2e] px-2 py-1"
            >
              <span className="text-[10px] uppercase tracking-wider text-[#6c7086]">
                {c.label}
              </span>
              <span className="text-sm font-mono font-semibold text-[#cdd6f4] tabular-nums">
                {String(c.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-start gap-6">
        {/* Grid */}
        <div className="flex flex-col gap-1">
          {frame.cells.map((row, r) => (
            <div key={r} className="flex items-center gap-1">
              <div
                className="text-[10px] text-[#45475a] text-right font-mono tabular-nums"
                style={{ width: 12 }}
              >
                {r}
              </div>
              {row.map((v, c) => {
                const style = styleFor(v, frame.valueStyles)
                const overlays = overlaysByCell.get(`${r},${c}`) ?? []
                const hasPointer = overlays.length > 0
                const ringClass = hasPointer
                  ? `ring-2 ${TONE_RING[overlays[0].tone]}`
                  : ''
                return (
                  <div
                    key={c}
                    data-cell-row={r}
                    data-cell-col={c}
                    data-cell-value={String(v)}
                    className={`relative flex items-center justify-center rounded border border-[#313244] font-mono text-sm tabular-nums transition-colors ${ringClass}`}
                    style={{
                      width: CELL_SIZE,
                      height: CELL_SIZE,
                      backgroundColor: style.fill,
                      color: style.text,
                    }}
                  >
                    <span>{style.label}</span>
                    {/* Pointer chips stacked at cell top-right */}
                    {overlays.length > 0 && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2 flex gap-0.5">
                        {overlays.map((cp) => (
                          <div
                            key={cp.label}
                            data-cell-pointer-label={cp.label}
                            data-cell-pointer-row={cp.row}
                            data-cell-pointer-col={cp.col}
                            className={`rounded px-1 py-px text-[9px] font-mono font-semibold leading-none border border-[#1e1e2e] ${TONE_BG[cp.tone]}`}
                          >
                            {cp.label}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
          {/* Column ruler */}
          <div className="flex items-center gap-1 mt-0.5">
            <div style={{ width: 12 }} />
            {frame.cells[0]?.map((_, c) => (
              <div
                key={c}
                className="text-[10px] text-[#45475a] text-center font-mono tabular-nums"
                style={{ width: CELL_SIZE }}
              >
                {c}
              </div>
            ))}
          </div>
        </div>

        {/* Queue panel */}
        {frame.queue !== undefined && (
          <div
            className="flex flex-col items-stretch gap-1 min-w-[120px]"
            data-queue-root="grid-bfs"
          >
            <div className="text-[10px] uppercase tracking-wider text-[#6c7086]">
              Queue ({frame.queue.length})
            </div>
            <div className="flex flex-col gap-1 max-h-[240px] overflow-y-auto">
              {frame.queue.length === 0 ? (
                <div className="text-xs text-[#45475a] italic px-2 py-1">empty</div>
              ) : (
                frame.queue.slice(0, 8).map((entry, i) => (
                  <div
                    key={i}
                    data-queue-index={i}
                    className="rounded border border-[#313244] bg-[#1e1e2e] px-2 py-1 text-xs font-mono text-[#a6adc8] tabular-nums"
                  >
                    {formatQueueEntry(entry)}
                  </div>
                ))
              )}
              {frame.queue.length > 8 && (
                <div className="text-[10px] text-[#45475a] italic px-2">
                  +{frame.queue.length - 8} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function formatQueueEntry(entry: unknown): string {
  if (Array.isArray(entry)) return `(${entry.join(', ')})`
  if (typeof entry === 'object' && entry !== null) {
    try { return JSON.stringify(entry) } catch { return String(entry) }
  }
  return String(entry)
}
