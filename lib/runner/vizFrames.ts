// Translate a trace snapshot + viz config into a renderable frame for the
// ArrayPointersViz component. Pure function — no React, no DOM.
//
// The trace worker pre-serializes each snapshot's vars as JSON strings,
// with linked-list / tree shapes pre-walked to flat arrays. We just need
// to JSON.parse the relevant vars and pluck out array values + pointer
// indices.

import type {
  ArrayPointersVizConfig, GridBfsVizConfig, GridValueStyle,
  LinkedListPointersVizConfig, VizTone,
} from '@/data/algo-monster-types'
import type { Snapshot } from './traceTypes'

export interface ArrayFrame {
  cells: (number | string)[]
  pointers: { name: string; index: number; side: 'top' | 'bottom'; tone: VizTone }[]
  target?: { label: string; value: string | number }
}

export interface LinkedListFrame {
  nodes: (number | string)[]
  pointers: { name: string; label: string; index: number; side: 'top' | 'bottom'; tone: VizTone }[]
  target?: { label: string; value: string | number }
  sentinelCount?: number   // leading nodes that are sentinels; rendered muted
  sentinelLabel?: string   // display text for sentinel cells (default "dummy")
}

export interface GridBfsFrame {
  kind: 'grid-bfs'              // discriminator (other frames don't carry one;
                                // see isArrayFrame / isLinkedListFrame guards)
  rows: number
  cols: number
  cells: (number | string)[][]  // [row][col] = value at this snapshot
  cellPointers: {
    rowVar: string
    colVar: string
    label: string
    row: number
    col: number
    tone: VizTone
  }[]
  queue?: unknown[]             // each entry rendered as JSON-ish tuple
  counters: { label: string; value: string | number }[]
  valueStyles: GridValueStyle[]
}

function parseSnapshotVar(snap: Snapshot, name: string): unknown {
  const raw = snap.vars[name]
  if (raw === undefined) return undefined
  try {
    return JSON.parse(raw)
  } catch {
    return raw
  }
}

// Coerce any reasonable representation of a number into a number.
function toIndex(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const n = Number(v)
    return Number.isFinite(n) ? n : -1
  }
  return -1
}

// Extract a flat array of cell values from a snapshot var. Arrays come
// through as JSON arrays; linked-list / tree shapes are tagged with __shape
// (we don't expect those in the array-pointers config but handle gracefully).
function extractArray(value: unknown): (number | string)[] {
  if (value === undefined || value === null) return []
  if (Array.isArray(value)) return value as (number | string)[]
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    if (Array.isArray(obj.values)) return obj.values as (number | string)[]
  }
  return []
}

// Walk a snap's serialized listVar (possibly dot-pathed) and pull out the
// chain values. The dot-path is resolved against the JSON-parsed structure
// — e.g., listVar="dummy.next" reads dummy.next from the parsed object.
function extractListValues(snap: Snapshot, listPath: string): (number | string)[] {
  const parts = listPath.split('.')
  const raw = snap.vars[parts[0]]
  if (raw === undefined) return []
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return [] }
  for (let i = 1; i < parts.length; i++) {
    if (parsed === null || typeof parsed !== 'object') return []
    parsed = (parsed as Record<string, unknown>)[parts[i]]
  }
  if (parsed === null || parsed === undefined) return []
  if (typeof parsed !== 'object') return []
  const obj = parsed as Record<string, unknown>
  if (Array.isArray((obj as { values?: unknown }).values)) {
    return (obj as { values: (number | string)[] }).values
  }
  return []
}

export function deriveLinkedListFrame(
  snap: Snapshot | undefined,
  config: LinkedListPointersVizConfig
): LinkedListFrame {
  if (!snap) return { nodes: [], pointers: [] }
  const nodes = extractListValues(snap, config.listVar)
  const indices = snap.listPointerIndices ?? {}
  const pointers: LinkedListFrame['pointers'] = []
  for (const p of config.pointers) {
    const idx = indices[p.from]
    if (idx === undefined || idx < 0) continue
    pointers.push({
      name: p.from,
      label: p.label ?? p.from,
      index: idx,
      side: p.side,
      tone: p.tone ?? 'cyan',
    })
  }
  const frame: LinkedListFrame = { nodes, pointers }
  if (config.target) {
    const v = parseSnapshotVar(snap, config.target.var)
    if (v !== undefined) {
      frame.target = { label: config.target.label, value: v as string | number }
    }
  }
  if (config.sentinelCount && config.sentinelCount > 0) {
    frame.sentinelCount = config.sentinelCount
    frame.sentinelLabel = config.sentinelLabel ?? 'dummy'
  }
  return frame
}

// Pluck a 2D array out of a serialized snap var. The trace worker
// JSON-stringifies arrays directly (no shape tag), so a 2D grid round-trips
// as `[[..],[..]]`. If something else is in `gridVar`, return [].
function extract2D(value: unknown): (number | string)[][] {
  if (!Array.isArray(value)) return []
  const out: (number | string)[][] = []
  for (const row of value) {
    if (Array.isArray(row)) {
      out.push(row as (number | string)[])
    } else {
      // Non-2D shape — bail rather than half-render
      return []
    }
  }
  return out
}

export function deriveGridBfsFrame(
  snap: Snapshot | undefined,
  config: GridBfsVizConfig
): GridBfsFrame {
  const empty: GridBfsFrame = {
    kind: 'grid-bfs',
    rows: 0,
    cols: 0,
    cells: [],
    cellPointers: [],
    counters: [],
    valueStyles: config.valueStyles,
  }
  if (!snap) return empty
  const cells = extract2D(parseSnapshotVar(snap, config.gridVar))
  if (cells.length === 0) return empty
  const rows = cells.length
  const cols = cells[0]?.length ?? 0
  const cellPointers: GridBfsFrame['cellPointers'] = []
  for (const cp of config.cellPointers ?? []) {
    const r = toIndex(parseSnapshotVar(snap, cp.rowVar))
    const c = toIndex(parseSnapshotVar(snap, cp.colVar))
    // Only render when both indices resolve and land inside the grid. A
    // pointer with one resolved + one stale (e.g., `nr` defined but `nc`
    // not yet computed) is dropped — partial overlays mislead more than
    // they help.
    if (r < 0 || c < 0 || r >= rows || c >= cols) continue
    cellPointers.push({
      rowVar: cp.rowVar,
      colVar: cp.colVar,
      label: cp.label,
      row: r,
      col: c,
      tone: cp.tone ?? 'cyan',
    })
  }
  const counters: GridBfsFrame['counters'] = []
  for (const ct of config.counters ?? []) {
    const v = parseSnapshotVar(snap, ct.var)
    if (v === undefined) continue
    counters.push({ label: ct.label, value: v as string | number })
  }
  let queue: unknown[] | undefined
  if (config.queueVar) {
    const q = parseSnapshotVar(snap, config.queueVar)
    if (Array.isArray(q)) queue = q
  }
  const frame: GridBfsFrame = {
    kind: 'grid-bfs',
    rows,
    cols,
    cells,
    cellPointers,
    counters,
    valueStyles: config.valueStyles,
  }
  if (queue !== undefined) frame.queue = queue
  return frame
}

export function deriveArrayFrame(
  snap: Snapshot | undefined,
  config: ArrayPointersVizConfig
): ArrayFrame {
  if (!snap) {
    return { cells: [], pointers: [] }
  }
  const cells = extractArray(parseSnapshotVar(snap, config.arrayVar))
  const pointers: ArrayFrame['pointers'] = []
  for (const p of config.pointers) {
    const idx = toIndex(parseSnapshotVar(snap, p.from))
    if (idx < 0) continue
    pointers.push({
      name: p.from,
      index: idx,
      side: p.side,
      tone: p.tone ?? 'cyan',
    })
  }
  const frame: ArrayFrame = { cells, pointers }
  if (config.target) {
    const v = parseSnapshotVar(snap, config.target.var)
    if (v !== undefined) {
      frame.target = {
        label: config.target.label,
        value: v as string | number,
      }
    }
  }
  return frame
}
