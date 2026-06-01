// Compute a `lineNumber → slotLabel` map for the unified IDE view.
//
// Two paths:
//   1. If the entry has `slotTemplate`, fuzzy-match each slot's `code` against
//      the lines of `solutionJS` to figure out which line(s) each label
//      applies to.
//   2. Otherwise, parse the solution AST and auto-derive `init / traverse /
//      return` from structural shape (statements before/inside/after the
//      first loop in the function body).
//
// Either way, only line numbers that START a new slot get a label — labels
// don't repeat down a block (the row's left margin is empty if the line
// continues a previously-labeled slot).

import * as acorn from 'acorn'
import type { SlotEntry } from '@/data/algo-monster-types'

export type SlotLabelMap = Map<number, string>

// Normalize a code line for matching: trim + collapse internal whitespace.
function norm(s: string): string {
  return s.trim().replace(/\s+/g, ' ')
}

export function mapSlotsToLines(
  solutionJS: string,
  slotTemplate: SlotEntry[]
): SlotLabelMap {
  const out: SlotLabelMap = new Map()
  const lines = solutionJS.split('\n').map(norm)
  let cursor = 0

  for (const slot of slotTemplate) {
    if (!slot.label) {
      // Unlabeled connector slot (e.g., a bare `}` in the middle). Still
      // consume the matching lines so the cursor advances.
      const slotLines = slot.code.split('\n').map(norm).filter(Boolean)
      const at = findAt(lines, slotLines, cursor)
      if (at !== -1) cursor = at + slotLines.length
      continue
    }
    const slotLines = slot.code.split('\n').map(norm).filter(Boolean)
    if (slotLines.length === 0) continue
    const at = findAt(lines, slotLines, cursor)
    if (at === -1) continue
    // 1-indexed line number; label the first line of this slot only.
    out.set(at + 1, slot.label)
    cursor = at + slotLines.length
  }
  return out
}

// Find the index in `lines` (>= start) where `needle` (a sequence of normalized
// lines) appears contiguously. Returns -1 if not found.
function findAt(lines: string[], needle: string[], start: number): number {
  outer: for (let i = start; i <= lines.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) {
      if (lines[i + j] !== needle[j]) continue outer
    }
    return i
  }
  return -1
}

type Node = any

// AST-based auto-derive when no slotTemplate exists. Labels:
//   `init`     — function-body statements before the first loop
//   `traverse` — the first loop statement itself (and its body)
//   `return`   — function-body statements after the first loop
//
// For functions with no loop (recursive / straight-line), no labels emitted.
export function autoDeriveSlots(solutionJS: string, fnName: string): SlotLabelMap {
  const out: SlotLabelMap = new Map()
  let ast: Node
  try {
    ast = acorn.parse(solutionJS, { ecmaVersion: 2022, locations: true }) as unknown as Node
  } catch {
    return out
  }
  // Find the target function
  let target: Node | null = null
  for (const node of ast.body) {
    if (node.type === 'FunctionDeclaration' && node.id?.name === fnName) {
      target = node
      break
    }
    if (node.type === 'VariableDeclaration') {
      for (const d of node.declarations) {
        if (
          d.id?.type === 'Identifier' &&
          d.id.name === fnName &&
          (d.init?.type === 'FunctionExpression' || d.init?.type === 'ArrowFunctionExpression')
        ) {
          target = d.init
          break
        }
      }
      if (target) break
    }
  }
  if (!target?.body?.body) return out

  const stmts: Node[] = target.body.body
  const isLoop = (n: Node) =>
    n &&
    (n.type === 'WhileStatement' ||
      n.type === 'ForStatement' ||
      n.type === 'DoWhileStatement' ||
      n.type === 'ForOfStatement' ||
      n.type === 'ForInStatement')

  const firstLoopIdx = stmts.findIndex(isLoop)
  if (firstLoopIdx === -1) return out

  // init: line of first body statement (only if there's at least one
  // statement before the loop)
  if (firstLoopIdx > 0) {
    out.set(stmts[0].loc.start.line, 'init')
  }
  // traverse: the loop's start line
  out.set(stmts[firstLoopIdx].loc.start.line, 'traverse')
  // return: first statement after the loop
  if (firstLoopIdx < stmts.length - 1) {
    out.set(stmts[firstLoopIdx + 1].loc.start.line, 'return')
  }
  return out
}

// Combine: AST auto-derive provides the structural skeleton (init/
// traverse/return). Curated slotTemplate (when present) layers on top,
// adding more granular labels and overriding the structural ones at the
// same line. This way partial slot matches still benefit from the
// auto-derive baseline.
export function deriveSlotLabels(
  solutionJS: string,
  fnName: string | undefined,
  slotTemplate: SlotEntry[] | null | undefined
): SlotLabelMap {
  const out: SlotLabelMap = new Map()
  if (fnName) {
    for (const [k, v] of autoDeriveSlots(solutionJS, fnName)) out.set(k, v)
  }
  if (slotTemplate && slotTemplate.length > 0) {
    for (const [k, v] of mapSlotsToLines(solutionJS, slotTemplate)) out.set(k, v)
  }
  return out
}
