// Shared types between the trace worker and the SolutionDebugger UI.

import type { ParamHint } from '@/data/algo-monster-types'

export type { ParamHint }

export interface Snapshot {
  line: number
  vars: Record<string, string>   // values pre-serialized as JSON strings (depth-limited, cycle-safe)
  // Index of each named pointer var into the listVar's chain (by ref-walk).
  // Only populated for snapshots taken under a linked-list viz config.
  // Missing keys mean the pointer is not on the chain at this snapshot.
  listPointerIndices?: Record<string, number>
}

// When set, the worker will compute per-snapshot pointer indices into the
// listVar's chain. listVar may be dot-pathed (e.g., "dummy.next").
export interface ListPointerInfo {
  listVar: string
  pointerVars: string[]
}

export interface TraceRequest {
  solutionCode: string
  entryFunction: string
  paramHints?: ParamHint[]
  returnHint?: ParamHint
  testInput: unknown                 // for function tests: the input array; we wrap if needed
  listPointerInfo?: ListPointerInfo
}

export type TraceResponse =
  | { kind: 'snapshots'; snapshots: Snapshot[]; durationMs: number }
  | { kind: 'compile-error'; message: string }
  | { kind: 'runtime-error'; message: string; partial: Snapshot[] }
  | { kind: 'timeout'; partial: Snapshot[] }
