'use client'

// Shared trace state for the SolutionDebugger and the UnderstandViz.
// Owns: the worker, the snapshots, the active test, the current step, and
// the per-pointer positions for the visual.
//
// Both consumers read state via `useTrace()`. Stepping in either one
// (debugger ←/→, hover anchor in Understand, visual's own controls) is
// reflected everywhere via the shared state.
//
// Pointer positions: when stepping manually (debugger or visual ←/→), all
// pointers update from the snapshot. When hovering an anchor that targets
// a specific pointer (e.g., `fast=2`), only that pointer moves; others
// keep their last position.

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'
import type {
  ArrayPointersVizConfig,
  GridBfsVizConfig,
  LinkedListPointersVizConfig,
  ParamHint,
  TestCase,
  VizConfig,
} from '@/data/algo-monster-types'
import type { Snapshot, TraceRequest, TraceResponse } from '@/lib/runner/traceTypes'
import {
  deriveArrayFrame, deriveGridBfsFrame, deriveLinkedListFrame,
  type ArrayFrame, type GridBfsFrame, type LinkedListFrame,
} from '@/lib/runner/vizFrames'

interface DebugTest { input: unknown[] | unknown }
function isFunctionTest(t: TestCase): t is DebugTest & TestCase {
  return !!t && typeof t === 'object' && 'input' in (t as unknown as Record<string, unknown>)
}

const TIMEOUT_MS = 5000

export type TraceStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'ready' }
  | { kind: 'error'; message: string }

interface TraceContextValue {
  // Trace
  snapshots: Snapshot[]
  status: TraceStatus

  // Test selection (shared)
  fnTests: TestCase[]
  activeTest: number
  setActiveTest: (i: number) => void

  // Step state (shared between debugger + visual + understand)
  currentStep: number
  // Step + snap all pointers to the snapshot at this step.
  stepTo: (step: number) => void
  // Step + selectively update only the named pointers; others persist.
  stepToWithPointers: (step: number, controlled: string[]) => void

  // Per-pointer positions — only meaningful when vizConfig is set.
  // Falls through to the snapshot's values when not yet set.
  pointerPositions: Record<string, number>

  // Optional viz config; if null, pointer state is unused.
  vizConfig: VizConfig | null

  // Convenience: derived frame for the current state. Discriminated by
  // vizConfig.type — array-pointers → ArrayFrame, linked-list-pointers →
  // LinkedListFrame, grid-bfs → GridBfsFrame.
  frame: ArrayFrame | LinkedListFrame | GridBfsFrame | null
}

const TraceContext = createContext<TraceContextValue | null>(null)

export function useTrace(): TraceContextValue {
  const v = useContext(TraceContext)
  if (!v) throw new Error('useTrace must be used inside <TraceProvider>')
  return v
}

interface ProviderProps {
  children: ReactNode
  code: string
  entryFunction: string
  paramHints?: ParamHint[]
  returnHint?: ParamHint
  tests: TestCase[]
  vizConfig?: VizConfig | null
}

export function TraceProvider({
  children, code, entryFunction, paramHints, returnHint, tests, vizConfig,
}: ProviderProps) {
  const fnTests = useMemo(() => tests.filter(isFunctionTest), [tests])
  const [activeTest, setActiveTest] = useState(0)
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [status, setStatus] = useState<TraceStatus>({ kind: 'idle' })
  const [currentStep, setCurrentStep] = useState(0)
  const [pointerPositions, setPointerPositions] = useState<Record<string, number>>({})
  // Set of pointer names the user has deliberately positioned via a
  // single-pointer hover (e.g., `fast=2`). On subsequent single-pointer
  // hovers, *explicit* pointers preserve their value while non-explicit
  // pointers auto-sync to the new step's snapshot — avoiding the
  // "fresh page hover shows fast at seed value with cells from step 14"
  // incoherence. Reset on full-sync hovers and on trace reload.
  const [explicit, setExplicit] = useState<Set<string>>(new Set())
  const workerRef = useRef<Worker | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Spin up the worker each time the active test changes.
  useEffect(() => {
    if (fnTests.length === 0) {
      setStatus({ kind: 'error', message: 'no function tests' })
      return
    }
    workerRef.current?.terminate()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const worker = new Worker(
      new URL('@/lib/runner/traceRunner.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker
    setStatus({ kind: 'loading' })
    setSnapshots([])
    setCurrentStep(0)

    worker.onmessage = (ev: MessageEvent<TraceResponse>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      const r = ev.data
      if (r.kind === 'snapshots') {
        setSnapshots(r.snapshots)
        setStatus({ kind: 'ready' })
      } else if (r.kind === 'compile-error') {
        setStatus({ kind: 'error', message: r.message })
      } else if (r.kind === 'runtime-error') {
        setSnapshots(r.partial)
        setStatus({ kind: 'error', message: r.message })
      } else if (r.kind === 'timeout') {
        setSnapshots(r.partial)
        setStatus({ kind: 'error', message: 'snapshot cap reached' })
      }
      worker.terminate()
      workerRef.current = null
    }
    worker.onerror = (ev) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setStatus({ kind: 'error', message: ev.message || 'worker error' })
      worker.terminate()
      workerRef.current = null
    }
    timeoutRef.current = setTimeout(() => {
      worker.terminate()
      workerRef.current = null
      setStatus({ kind: 'error', message: 'timed out 5s' })
    }, TIMEOUT_MS)

    const test = fnTests[activeTest] as DebugTest
    const req: TraceRequest = {
      solutionCode: code,
      entryFunction,
      testInput: test.input,
      ...(paramHints !== undefined && { paramHints }),
      ...(returnHint !== undefined && { returnHint }),
      ...(vizConfig?.type === 'linked-list-pointers' && {
        listPointerInfo: {
          listVar: vizConfig.listVar,
          pointerVars: vizConfig.pointers.map((p) => p.from),
        },
      }),
    }
    worker.postMessage(req)

    return () => {
      worker.terminate()
      workerRef.current = null
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [code, entryFunction, paramHints, returnHint, fnTests, activeTest, vizConfig])

  // Re-seed pointer positions whenever a fresh trace lands. Pick the
  // initial currentStep to be the earliest snap where ALL declared
  // pointers are present (so the user opens the page seeing the
  // algorithm's "ready" state, not a partially-initialized one). Falls
  // back to first-with-any-pointer, then to step 0.
  //
  // Grid-bfs has no "pointer position" state to seed — frames re-derive
  // entirely from the snapshot — so the seed step is just the first
  // snapshot where the gridVar resolves.
  useEffect(() => {
    if (!vizConfig || snapshots.length === 0) {
      setPointerPositions({})
      return
    }
    if (vizConfig.type === 'grid-bfs') {
      // Seed at the earliest step where ALL configured entities resolve —
      // mirrors the array/list "first-with-all-pointers" heuristic.
      // Prefer "cellPointers + counters all bound"; fall back to "grid
      // shape resolved"; final fallback to step 0.
      const declaredCellPointers = (vizConfig.cellPointers ?? []).length
      const declaredCounters = (vizConfig.counters ?? []).length
      let firstFull = -1
      let firstAnyGrid = -1
      for (let i = 0; i < snapshots.length; i++) {
        const f = deriveGridBfsFrame(snapshots[i], vizConfig)
        if (firstAnyGrid === -1 && f.rows > 0 && f.cols > 0) firstAnyGrid = i
        if (
          f.rows > 0 &&
          f.cellPointers.length === declaredCellPointers &&
          f.counters.length === declaredCounters
        ) { firstFull = i; break }
      }
      const seedStep = firstFull >= 0 ? firstFull : (firstAnyGrid >= 0 ? firstAnyGrid : 0)
      setPointerPositions({})
      setCurrentStep(seedStep)
      setExplicit(new Set())
      return
    }
    const declaredCount = vizConfig.pointers.length
    let firstFull = -1
    let firstAny = -1
    for (let i = 0; i < snapshots.length; i++) {
      const f = vizConfig.type === 'array-pointers'
        ? deriveArrayFrame(snapshots[i], vizConfig)
        : deriveLinkedListFrame(snapshots[i], vizConfig)
      if (firstAny === -1 && f.pointers.length > 0) firstAny = i
      if (f.pointers.length === declaredCount) { firstFull = i; break }
    }
    const seedStep = firstFull >= 0 ? firstFull : (firstAny >= 0 ? firstAny : 0)
    const initialFrame = vizConfig.type === 'array-pointers'
      ? deriveArrayFrame(snapshots[seedStep], vizConfig)
      : deriveLinkedListFrame(snapshots[seedStep], vizConfig)
    const seed: Record<string, number> = {}
    for (const p of initialFrame.pointers) seed[p.name] = p.index
    setPointerPositions(seed)
    setCurrentStep(seedStep)
    setExplicit(new Set())   // fresh trace = nothing explicitly positioned yet
  }, [snapshots, vizConfig])

  const total = snapshots.length

  const stepTo = useCallback((step: number) => {
    if (step < 0 || step >= total) return
    setCurrentStep(step)
    if (!vizConfig) return
    const snap = snapshots[step]
    if (!snap) return
    if (vizConfig.type === 'grid-bfs') {
      // Grid frames re-derive from the snapshot; no override state to
      // sync. Just clear explicit (no-op for grid but keeps invariants).
      setExplicit(new Set())
      return
    }
    const f = vizConfig.type === 'array-pointers'
      ? deriveArrayFrame(snap, vizConfig)
      : deriveLinkedListFrame(snap, vizConfig)
    const next: Record<string, number> = {}
    for (const p of f.pointers) next[p.name] = p.index
    setPointerPositions(next)
    setExplicit(new Set())   // global step navigation resets explicit set
  }, [total, snapshots, vizConfig])

  const stepToWithPointers = useCallback((step: number, controlled: string[]) => {
    if (step < 0 || step >= total) return
    setCurrentStep(step)
    if (!vizConfig) return
    const snap = snapshots[step]
    if (!snap) return
    if (vizConfig.type === 'grid-bfs') {
      // Grid-bfs has no per-pointer hover semantics — coordinate-style
      // anchors (e.g., `(0,1)`) don't bind to a single pointer var. All
      // hovers behave like full step navigation.
      setExplicit(new Set())
      return
    }
    const f = vizConfig.type === 'array-pointers'
      ? deriveArrayFrame(snap, vizConfig)
      : deriveLinkedListFrame(snap, vizConfig)
    // Full-sync hover (e.g., array literal targets all pointers): reset
    // explicit state and sync everything. Equivalent to stepTo.
    if (controlled.length >= vizConfig.pointers.length) {
      const next: Record<string, number> = {}
      for (const p of f.pointers) next[p.name] = p.index
      setPointerPositions(next)
      setExplicit(new Set())
      return
    }
    // Single-pointer hover: mark controlled as explicit. Sync controlled
    // (just got hovered) and any non-explicit pointers (auto-track to
    // the new step). Pointers that were explicit BEFORE this hover keep
    // their value — that's the "construct a state" affordance.
    const prevExplicit = explicit
    const newExplicit = new Set(prevExplicit)
    for (const name of controlled) newExplicit.add(name)
    setExplicit(newExplicit)
    setPointerPositions((prev) => {
      const next = { ...prev }
      for (const cfg of vizConfig.pointers) {
        const name = cfg.from
        const isControlled = controlled.includes(name)
        const wasExplicit = prevExplicit.has(name)
        const fromSnap = f.pointers.find((p) => p.name === name)
        if (isControlled || !wasExplicit) {
          if (fromSnap) next[name] = fromSnap.index
          // If pointer is out-of-scope at this snap, leave its value
          // unchanged (don't surprise-delete a visible pointer).
        }
      }
      return next
    })
  }, [total, snapshots, vizConfig, explicit])

  // Derived frame: cells/nodes from current snapshot, pointer positions
  // overlaid from the per-pointer state.
  const frame: ArrayFrame | LinkedListFrame | GridBfsFrame | null = useMemo(() => {
    if (!vizConfig) return null
    const snap = snapshots[currentStep]
    if (vizConfig.type === 'grid-bfs') {
      return deriveGridBfsFrame(snap, vizConfig)
    }
    if (vizConfig.type === 'array-pointers') {
      const baseFrame = deriveArrayFrame(snap, vizConfig)
      const pointers = vizConfig.pointers.map((cfg) => {
        const overridden = pointerPositions[cfg.from]
        const baseFromSnap = baseFrame.pointers.find((p) => p.name === cfg.from)
        const idx = overridden !== undefined ? overridden : baseFromSnap?.index ?? -1
        return { name: cfg.from, index: idx, side: cfg.side, tone: cfg.tone ?? 'cyan' as const }
      }).filter((p) => p.index >= 0)
      const out: ArrayFrame = { cells: baseFrame.cells, pointers }
      if (baseFrame.target) out.target = baseFrame.target
      return out
    } else {
      const baseFrame = deriveLinkedListFrame(snap, vizConfig)
      const pointers = vizConfig.pointers.map((cfg) => {
        const overridden = pointerPositions[cfg.from]
        const baseFromSnap = baseFrame.pointers.find((p) => p.name === cfg.from)
        const idx = overridden !== undefined ? overridden : baseFromSnap?.index ?? -1
        return {
          name: cfg.from,
          label: cfg.label ?? cfg.from,
          index: idx,
          side: cfg.side,
          tone: cfg.tone ?? 'cyan' as const,
        }
      }).filter((p) => p.index >= 0)
      const out: LinkedListFrame = { nodes: baseFrame.nodes, pointers }
      if (baseFrame.target) out.target = baseFrame.target
      if (baseFrame.sentinelCount) {
        out.sentinelCount = baseFrame.sentinelCount
        if (baseFrame.sentinelLabel) out.sentinelLabel = baseFrame.sentinelLabel
      }
      return out
    }
  }, [snapshots, currentStep, pointerPositions, vizConfig])

  const value: TraceContextValue = {
    snapshots,
    status,
    fnTests,
    activeTest,
    setActiveTest,
    currentStep,
    stepTo,
    stepToWithPointers,
    pointerPositions,
    vizConfig: vizConfig ?? null,
    frame,
  }

  return <TraceContext.Provider value={value}>{children}</TraceContext.Provider>
}
