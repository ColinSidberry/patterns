import patternsRaw from '@/data/patterns.json'
import { getProblemById } from '@/lib/algoMonster'
import algoEntriesRaw from '@/data/algo_monster_problems.json'
import type {
  AlgoMonsterEntry,
  Difficulty,
  SlotEntry,
  SlotKind,
} from '@/data/algo-monster-types'

type Scaffold = 'iterative' | 'recursive' | 'dp' | 'design'

export interface PatternSlotDef {
  key: string
  label: string
  kind?: SlotKind
}

export interface PatternDef {
  id: string
  name: string
  module: string
  scaffold: Scaffold
  shortDescription?: string
  whenToUse?: string
  algoMasterRef?: string
  slots: PatternSlotDef[] | null
  skeleton?: string
  memberProblems?: string[]
}

const allPatterns = (patternsRaw as { patterns: PatternDef[] }).patterns
const allEntries = algoEntriesRaw as AlgoMonsterEntry[]

const patternsById: Record<string, PatternDef> = {}
for (const p of allPatterns) patternsById[p.id] = p

export function getPattern(id: string): PatternDef | undefined {
  return patternsById[id]
}

export function getAllPatternIds(): string[] {
  return allPatterns.map((p) => p.id)
}

// All entries for a pattern, ordered by studyOrder. Used both for the
// comparison page and the sibling drawer. Foundation-module entries
// (Computer Basics, Algorithm Complexity, etc.) are docs-style lessons
// that happen to share a `pattern` tag with real practice problems —
// exclude them so sibling lists stay apples-to-apples.
export function getPatternMembers(patternId: string): AlgoMonsterEntry[] {
  return allEntries
    .filter((e) => e.pattern === patternId && e.module !== 'Foundations')
    .sort((a, b) => a.studyOrder - b.studyOrder)
}

// Entries that share at least one `tags` value with the given list,
// excluding the current problem, Foundation lessons, and anything
// already in `excludeIds` (typically the pattern siblings, so the same
// problem doesn't appear in both lists).
export function getTagSiblings(
  currentId: string,
  tags: string[] | undefined,
  excludeIds: Set<string> = new Set(),
): AlgoMonsterEntry[] {
  if (!tags || tags.length === 0) return []
  const want = new Set(tags)
  return allEntries
    .filter(
      (e) =>
        e.id !== currentId &&
        e.module !== 'Foundations' &&
        !excludeIds.has(e.id) &&
        Array.isArray(e.tags) &&
        e.tags.some((t) => want.has(t)),
    )
    .sort((a, b) => a.studyOrder - b.studyOrder)
}

// ── Comparison row generation ───────────────────────────────────────────────

export interface ComparisonProblem {
  id: string
  title: string
  difficulty?: Difficulty
  studyOrder: number
  hasSlots: boolean
}

export interface ComparisonRow {
  key: string
  description: string
  kind?: SlotKind
  // cells aligned with the order in `problems`
  cells: (string | null)[]
}

// Match a problem's slot to a canonical pattern slot. Exact label match
// first; for variable-kind anchors, fall back to whatever per-problem
// `[BRACKETED]` slot they used (e.g., pattern says `[COMPARE]`, problem says
// `[FILTER]` — same logical row).
function findMatch(
  canonicalKey: string,
  canonicalKind: SlotKind | undefined,
  slots: SlotEntry[]
): SlotEntry | null {
  const exact = slots.find((s) => s.label === canonicalKey)
  if (exact) return exact
  if (canonicalKind === 'variable') {
    return slots.find((s) => s.kind === 'variable') ?? null
  }
  return null
}

export function buildComparison(patternId: string): {
  pattern: PatternDef
  problems: ComparisonProblem[]
  rows: ComparisonRow[]
} | null {
  const pattern = getPattern(patternId)
  if (!pattern) return null
  const members = getPatternMembers(patternId)
  const problems: ComparisonProblem[] = members.map((m) => ({
    id: m.id,
    title: m.title,
    studyOrder: m.studyOrder,
    hasSlots: Array.isArray(m.slotTemplate) && m.slotTemplate.length > 0,
    ...(m.difficulty && { difficulty: m.difficulty }),
  }))
  if (!pattern.slots) {
    return { pattern, problems, rows: [] }
  }
  const rows: ComparisonRow[] = pattern.slots.map((slot) => ({
    key: slot.key,
    description: slot.label,
    ...(slot.kind && { kind: slot.kind }),
    cells: members.map((m) => {
      const tmpl = m.slotTemplate
      if (!tmpl) return null
      const match = findMatch(slot.key, slot.kind, tmpl)
      return match?.code ?? null
    }),
  }))
  return { pattern, problems, rows }
}

// For data-structure-design (no slot grid), surface full solutions instead.
export function getDesignProblems(
  patternId: string
): { id: string; title: string; difficulty?: Difficulty; solutionJS: string }[] {
  return getPatternMembers(patternId)
    .filter((m) => !!m.solutionJS)
    .map((m) => ({
      id: m.id,
      title: m.title,
      solutionJS: m.solutionJS!,
      ...(m.difficulty && { difficulty: m.difficulty }),
    }))
}

// Re-export so the page route can hit one file.
export { getProblemById }
