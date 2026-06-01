/// <reference lib="webworker" />
// Trace worker for the solution debugger. Receives an instrumented solution
// + a single test input, runs it once, returns the captured snapshots.
//
// Each snapshot's `vars` are JSON-stringified up-front (depth-limited,
// cycle-safe) so we don't try to structured-clone live linked-list / tree
// references across the worker boundary.

import { instrumentSource } from './instrument'
import { ListNode, TreeNode, arrayToList, arrayToTree } from './conversions'
import type { ParamHint } from '@/data/algo-monster-types'
import type { Snapshot, TraceRequest, TraceResponse } from './traceTypes'

declare const self: DedicatedWorkerGlobalScope

const MAX_SNAPSHOTS = 5000   // hard cap: protects against runaway loops

// Cap how many nodes we walk in a list/tree before we tag the trailing
// element as truncated. In practice catalog test inputs are <20 items, so
// this is just a runaway-protection safety net.
const LIST_WALK_CAP = 200
const TREE_NODE_CAP = 256

interface ListShape { __shape: 'linked-list' | 'doubly-linked-list'; values: (string | number)[]; truncated?: number }
interface TreeShape { __shape: 'tree'; values: (string | number | null)[]; truncated?: number }

function valKey(o: Record<string, unknown>): 'val' | 'data' | null {
  if ('val' in o) return 'val'
  if ('data' in o) return 'data'
  return null
}

function isLinkedListNode(o: Record<string, unknown>): boolean {
  // val/data + next; missing left/right (so it's not a tree)
  return valKey(o) !== null && 'next' in o && !('left' in o) && !('right' in o)
}

function isTreeNode(o: Record<string, unknown>): boolean {
  return valKey(o) !== null && 'left' in o && 'right' in o
}

function walkLinkedList(head: Record<string, unknown>): ListShape {
  const seen = new Set<object>()
  const values: (string | number)[] = []
  let curr: Record<string, unknown> | null = head
  let truncated = 0
  let isDoubly = false
  while (curr !== null && typeof curr === 'object') {
    if (seen.has(curr)) { values.push('<cycle>'); break }
    seen.add(curr)
    if ('prev' in curr) isDoubly = true
    const key = valKey(curr) as 'val' | 'data'
    const v = curr[key]
    values.push(v as string | number)
    if (values.length >= LIST_WALK_CAP) {
      // Estimate remaining by continuing to count without storing
      let extra = 0
      let probe = curr.next as Record<string, unknown> | null
      while (probe !== null && typeof probe === 'object' && !seen.has(probe) && extra < 1000) {
        seen.add(probe)
        extra++
        probe = probe.next as Record<string, unknown> | null
      }
      truncated = extra
      break
    }
    curr = curr.next as Record<string, unknown> | null
  }
  const shape: ListShape = {
    __shape: isDoubly ? 'doubly-linked-list' : 'linked-list',
    values,
  }
  if (truncated > 0) shape.truncated = truncated
  return shape
}

function walkTree(root: Record<string, unknown>): TreeShape {
  // Level-order with explicit nulls for missing children (LeetCode convention)
  const out: (string | number | null)[] = []
  const queue: (Record<string, unknown> | null)[] = [root]
  let truncated = 0
  while (queue.length > 0 && out.length < TREE_NODE_CAP) {
    const node = queue.shift()!
    if (node === null) {
      out.push(null)
      continue
    }
    const key = valKey(node) as 'val' | 'data'
    out.push(node[key] as string | number)
    queue.push((node.left as Record<string, unknown> | null) ?? null)
    queue.push((node.right as Record<string, unknown> | null) ?? null)
  }
  if (queue.length > 0) truncated = queue.length
  // Trim trailing nulls (LeetCode convention)
  while (out.length > 0 && out[out.length - 1] === null) out.pop()
  const shape: TreeShape = { __shape: 'tree', values: out }
  if (truncated > 0) shape.truncated = truncated
  return shape
}

function safeStringify(v: unknown, maxDepth = 4): string {
  const seen = new WeakSet<object>()
  function go(val: unknown, depth: number): unknown {
    if (val === undefined) return '__undefined__'
    if (val === null || typeof val !== 'object') return val
    if (seen.has(val as object)) return '<cycle>'
    // Detect linked-list / tree shapes BEFORE depth check — these get
    // walked iteratively, no depth issues.
    const obj = val as Record<string, unknown>
    if (isLinkedListNode(obj)) {
      seen.add(val as object)
      return walkLinkedList(obj)
    }
    if (isTreeNode(obj)) {
      seen.add(val as object)
      return walkTree(obj)
    }
    if (depth >= maxDepth) return '…'
    seen.add(val as object)
    if (Array.isArray(val)) {
      const out = val.slice(0, 24).map((x) => go(x, depth + 1))
      if (val.length > 24) out.push(`…+${val.length - 24} more`)
      return out
    }
    // Class instances → tag with constructor name
    const ctor = (val as { constructor?: { name?: string } }).constructor?.name
    const out: Record<string, unknown> = {}
    if (ctor && ctor !== 'Object') out.__class__ = ctor
    const keys = Object.keys(val as Record<string, unknown>).slice(0, 16)
    for (const k of keys) {
      out[k] = go((val as Record<string, unknown>)[k], depth + 1)
    }
    return out
  }
  try {
    return JSON.stringify(go(v, 0))
  } catch {
    return JSON.stringify(String(v))
  }
}

function convertInput(value: unknown, hint: ParamHint | undefined | null): unknown {
  if (hint === 'linkedList') {
    return arrayToList(value as (number | string | null)[])
  }
  if (hint === 'tree') {
    return arrayToTree(value as (number | string | null)[])
  }
  return value
}

self.onmessage = (ev: MessageEvent<TraceRequest>) => {
  const req = ev.data
  const start = performance.now()
  const snapshots: Snapshot[] = []
  let timedOut = false

  const lpi = req.listPointerInfo

  // Resolve a (possibly dot-pathed) var name against the live vars map.
  // Returns:
  //   - the live value if the full path resolves (may itself be null —
  //     e.g., curr.next where curr is a node and curr.next is null)
  //   - undefined if any intermediate segment is missing or non-walkable
  //     (so the caller can distinguish "no info" from "explicit null")
  function resolvePath(vars: Record<string, unknown>, path: string): unknown {
    const parts = path.split('.')
    let cur: unknown = vars[parts[0]]
    for (let i = 1; i < parts.length; i++) {
      if (cur === null || cur === undefined || typeof cur !== 'object') return undefined
      cur = (cur as Record<string, unknown>)[parts[i]]
    }
    return cur
  }

  // Walk the chain at `head`, find the first node whose reference === target.
  // Returns:
  //   - 0..N-1 if target is the i-th node in the chain
  //   - chain length N if target is `null` (pointer at the "null cap")
  //   - -1 if target is some other object not on the chain (or non-object)
  function listIndexOf(head: unknown, target: unknown): number {
    if (target === null) {
      // Pointer is null — locate it past the last node.
      let cur: unknown = head
      let len = 0
      const seen = new WeakSet<object>()
      while (cur !== null && typeof cur === 'object') {
        if (seen.has(cur as object)) return -1
        seen.add(cur as object)
        cur = (cur as Record<string, unknown>).next
        len++
        if (len > LIST_WALK_CAP) return -1
      }
      return len
    }
    if (typeof target !== 'object') return -1
    let cur: unknown = head
    let i = 0
    const seen = new WeakSet<object>()
    while (cur !== null && typeof cur === 'object') {
      if (seen.has(cur as object)) return -1
      seen.add(cur as object)
      if (cur === target) return i
      cur = (cur as Record<string, unknown>).next
      i++
      if (i > LIST_WALK_CAP) return -1
    }
    return -1
  }

  // The instrumented source calls `__snap` after each statement.
  ;(self as unknown as { __snap: (line: number, vars: Record<string, unknown>) => void }).__snap = (line, vars) => {
    if (timedOut) throw new Error('__trace_timeout__')
    if (snapshots.length >= MAX_SNAPSHOTS) {
      timedOut = true
      throw new Error('__trace_snapshot_cap__')
    }
    const serialized: Record<string, string> = {}
    for (const [k, v] of Object.entries(vars)) {
      serialized[k] = safeStringify(v)
    }
    const snap: Snapshot = { line, vars: serialized }
    if (lpi) {
      const head = resolvePath(vars, lpi.listVar)
      if (head !== null && typeof head === 'object') {
        const indices: Record<string, number> = {}
        for (const ptrPath of lpi.pointerVars) {
          // pointerVars may be dot-pathed (e.g., "curr.next") — resolve
          // through the same helper that handles listVar.
          const ptrRef = resolvePath(vars, ptrPath)
          const idx = listIndexOf(head, ptrRef)
          if (idx >= 0) indices[ptrPath] = idx
        }
        if (Object.keys(indices).length > 0) snap.listPointerIndices = indices
      }
    }
    snapshots.push(snap)
  }

  let instrumented: string
  try {
    instrumented = instrumentSource(req.solutionCode, req.entryFunction)
  } catch (e) {
    const r: TraceResponse = { kind: 'compile-error', message: (e as Error).message }
    self.postMessage(r)
    return
  }

  // Convert input args via paramHints (linked-list/tree array → live nodes).
  const inputArr = Array.isArray(req.testInput) ? req.testInput : [req.testInput]
  const args: unknown[] = []
  try {
    for (let i = 0; i < inputArr.length; i++) {
      args.push(convertInput(inputArr[i], req.paramHints?.[i] ?? null))
    }
  } catch (e) {
    const r: TraceResponse = {
      kind: 'runtime-error',
      message: `Input conversion failed: ${(e as Error).message}`,
      partial: snapshots,
    }
    self.postMessage(r)
    return
  }

  try {
    // Build a function that defines the instrumented code and returns the
    // entry function. ListNode/TreeNode injected as globals so user code
    // that calls `new ListNode(...)` works.
    const factory = new Function(
      'ListNode',
      'TreeNode',
      `${instrumented}\nreturn typeof ${req.entryFunction} !== 'undefined' ? ${req.entryFunction} : undefined;`
    )
    const fn = factory(ListNode, TreeNode) as ((...a: unknown[]) => unknown) | undefined
    if (typeof fn !== 'function') {
      throw new Error(`Function "${req.entryFunction}" is not defined after evaluation`)
    }
    fn(...args)
  } catch (e) {
    const msg = (e as Error).message
    if (msg === '__trace_snapshot_cap__') {
      const r: TraceResponse = { kind: 'timeout', partial: snapshots }
      self.postMessage(r)
      return
    }
    const r: TraceResponse = {
      kind: 'runtime-error',
      message: msg,
      partial: snapshots,
    }
    self.postMessage(r)
    return
  }

  const r: TraceResponse = {
    kind: 'snapshots',
    snapshots,
    durationMs: performance.now() - start,
  }
  self.postMessage(r)
}
