// Beat extractor — turns a raw snapshot stream into a coarser-grained
// list of "story beats" suitable for an anchor-authoring agent (Claude
// Code) to read alongside the prose.
//
// A beat is just a snapshot transition: what changed between snap[i-1]
// and snap[i], on which line, with the surrounding code text. No family-
// specific taxonomy of beat KINDS — the agent reads the line + the diff
// and reasons about meaning ("ah, line 6 ran which sets curr.next =
// curr.next.next, so the chain shrunk — that's a splice").
//
// First snap is treated as a beat too: the initial state, with no
// "before" values.

import type { Snapshot } from './traceTypes'

export interface VarChange {
  var: string
  before?: string   // serialized JSON; absent on the first beat
  after: string     // serialized JSON; '__undefined__' if out of scope
}

export interface Beat {
  step: number             // index into the snapshot array
  line: number             // source line number this snap fired on
  code: string             // the line of source at `line` (1-indexed), trimmed
  changed: VarChange[]     // vars whose serialized value differs from prev snap
  // Optional, family-aware extras: included verbatim from the snapshot
  // when present, useful for linked-list / pointer-aware reasoning.
  listPointerIndices?: Record<string, number>
  // Pre-computed human-readable summary line, for quick scanning by
  // the authoring agent. Format: "L{line} | {var}: {before} → {after} ; ...".
  summary: string
}

const TRUNCATE = 64
function shortVal(s: string | undefined): string {
  if (s === undefined) return '∅'
  if (s === '"__undefined__"') return 'undefined'
  if (s.length <= TRUNCATE) return s
  return s.slice(0, TRUNCATE - 1) + '…'
}

function diffVars(prev: Snapshot | null, cur: Snapshot): VarChange[] {
  const changed: VarChange[] = []
  const allKeys = new Set([
    ...(prev ? Object.keys(prev.vars) : []),
    ...Object.keys(cur.vars),
  ])
  for (const k of allKeys) {
    const before = prev?.vars[k]
    const after = cur.vars[k] ?? '"__undefined__"'
    if (before === after) continue
    const change: VarChange = { var: k, after }
    if (before !== undefined) change.before = before
    changed.push(change)
  }
  // Stable order: by var name
  changed.sort((a, b) => a.var.localeCompare(b.var))
  return changed
}

function summaryLine(beat: Beat): string {
  const parts = beat.changed.map((c) =>
    c.before === undefined
      ? `${c.var} := ${shortVal(c.after)}`
      : `${c.var}: ${shortVal(c.before)} → ${shortVal(c.after)}`
  )
  const codeBit = beat.code ? `  // ${beat.code}` : ''
  return `step ${beat.step} L${beat.line}${codeBit}\n    ${parts.join(' ; ') || '(no var change)'}`
}

export function extractBeats(snapshots: Snapshot[], sourceCode: string): Beat[] {
  const lines = sourceCode.split('\n')
  const beats: Beat[] = []
  let prev: Snapshot | null = null
  for (let i = 0; i < snapshots.length; i++) {
    const snap = snapshots[i]
    const changed = diffVars(prev, snap)
    const code = (lines[snap.line - 1] ?? '').trim()
    const beat: Beat = {
      step: i,
      line: snap.line,
      code,
      changed,
      summary: '',
    }
    if (snap.listPointerIndices) {
      beat.listPointerIndices = snap.listPointerIndices
    }
    beat.summary = summaryLine(beat)
    beats.push(beat)
    prev = snap
  }
  return beats
}
