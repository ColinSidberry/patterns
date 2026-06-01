// V2 dataset types — for the data pipeline (algo_monster_problems.json
// See IMPLEMENTATION_PLAN.md "Per-entry shape" section.

export type SlotKind =
  | 'init'
  | 'loop-open'
  | 'loop-close'
  | 'scaffold'
  | 'variable'
  | 'return'
  | 'base'
  | 'recurse'

export interface SlotEntry {
  label: string
  code: string
  kind?: SlotKind
  indent?: number
}

export type Difficulty = 'easy' | 'medium' | 'hard'

export type PatternConfidence = 'high' | 'medium' | 'low'

export type TestKind = 'function' | 'class'

export type ParamHint = 'linkedList' | 'tree' | null

export interface FunctionTest {
  input: unknown[] | unknown
  expected: unknown
}

export interface ClassOp {
  op: string
  args?: unknown[]
  expected?: unknown
}

export interface ClassTest {
  ops: ClassOp[]
}

export type TestCase = FunctionTest | ClassTest

export interface AlgoMonsterEntry {
  // Identity / ordering
  id: string
  title: string
  source: string
  url?: string
  studyOrder: number

  // Categorization
  module?: string
  pattern: string | null
  patternConfidence?: PatternConfidence
  // Cross-pattern conceptual labels. Multiple entries can share a tag even
  // if their `pattern` differs (e.g., `per-element-contribution` spans
  // linear-scan and two-pointers-opposite). Surfaced as "Conceptual
  // siblings" in CompareDrawer.
  tags?: string[]
  algoMasterSection?: string
  algoMasterSubsection?: string
  courseOrder?: number

  // Problem text
  question: string
  practiceQuestion?: string
  explanation?: string
  recognitionTriggers?: string[]
  rawText?: string

  // External refs
  leetcodeUrl?: string
  leetcodeTags?: string[]
  company?: string

  // SRS state (preserved from Obsidian)
  srsScore?: number
  srsNextReview?: string

  // Display metadata
  difficulty?: Difficulty

  // Solution code
  solution?: string
  solutionJS?: string
  solutionJSFull?: string
  solutionSource?: 'extracted' | 'authored' | 'authored-lesson'
  lessonExamples?: string[]
  translatedExamples?: string[]

  // Tests / runtime hints
  tests?: TestCase[]
  testKind?: TestKind
  testSource?: string
  entryFunction?: string
  className?: string
  paramNames?: string[]
  paramHints?: ParamHint[]
  returnHint?: ParamHint

  // ENRICHMENT
  understand?: string
  approach?: string
  slotTemplate?: SlotEntry[] | null

  // Complexity audit (Big-O classification from solutionJS)
  complexity?: {
    time: string
    space: string
    notes?: string
  }

  // Optional visualization config — drives the ArrayPointersViz / future
  // viz components in the Understand section. See VizConfig below.
  viz?: VizConfig
}

// ── Visualization config ──────────────────────────────────────────────────

export type VizPointerSide = 'top' | 'bottom'
export type VizTone = 'cyan' | 'amber' | 'emerald' | 'indigo' | 'rose'

export interface VizPointer {
  from: string                    // var name OR dot-path in the trace (e.g., "fast", "curr", "curr.next")
  side: VizPointerSide
  tone?: VizTone
  label?: string                  // displayed label; defaults to `from` if omitted
}

export interface VizTarget {
  var: string                     // var name to read for the target value
  label: string                   // human label (e.g., "target")
}

// Anchor maps a backticked phrase in the Understand prose to a specific
// step in the trace. On hover, the visual jumps to that step. Repeated
// phrases are disambiguated by `occurrence` (1-indexed). State persists
// after hover-leave (no revert).
export interface VizAnchor {
  phrase: string                  // text inside `backticks` in Understand prose
  occurrence?: number             // 1-indexed; default 1
  step: number                    // 0-indexed step in the trace
}

export interface ArrayPointersVizConfig {
  type: 'array-pointers'
  arrayVar: string                // var name holding the array (e.g., "nums")
  pointers: VizPointer[]
  target?: VizTarget
  anchors?: VizAnchor[]
}

// Linked-list pointer viz — renders the chain starting at `listVar` as a
// row of nodes connected by arrows. Each pointer floats above/below the
// node it currently references (computed in the worker via reference
// identity, since serialization loses object identity).
//
// `listVar` may be a dot-path like `dummy.next` to render from a property
// of a sentinel — useful for splice-with-dummy patterns where the original
// head var becomes disconnected after head-splices.
export interface LinkedListPointersVizConfig {
  type: 'linked-list-pointers'
  listVar: string                  // e.g., "head", "dummy", "dummy.next"
  pointers: VizPointer[]
  target?: VizTarget
  anchors?: VizAnchor[]
  // Number of leading nodes that are sentinels (e.g., a dummy
  // predecessor). Rendered with muted styling and a semantic label in
  // place of their (arbitrary) value. Default 0.
  sentinelCount?: number
  // Display label for sentinel cells. Default "dummy".
  sentinelLabel?: string
}

// Grid-BFS pointer viz — renders a 2D grid (cells colored per-value), an
// optional queue side panel, optional counter chips, and "cell pointers"
// that overlay a label onto the cell at (rowVar, colVar).
//
// Designed for problems where the algorithm walks a 2D grid with a
// breadth-first frontier (multi-source rot spread, single-source shortest
// path on grid, flood fill). Cell pointers map a pair of scalar trace vars
// onto a 2D coordinate; counters show running scalars.
export interface GridBfsCellPointer {
  rowVar: string                  // var name holding the row index (e.g., "r")
  colVar: string                  // var name holding the col index (e.g., "c")
  label: string                   // displayed label
  tone?: VizTone
}

export interface GridValueStyle {
  value: number | string          // matched against cell values
  label?: string                  // optional override for cell text (else the value itself)
  fill: string                    // background color (hex)
  text?: string                   // text color (hex); default light
}

export interface GridCounter {
  var: string                     // var name to read
  label: string                   // display label
}

export interface GridBfsVizConfig {
  type: 'grid-bfs'
  gridVar: string                 // 2D array var (e.g., "grid", "matrix")
  queueVar?: string               // optional: render queue contents as side panel
  cellPointers?: GridBfsCellPointer[]
  counters?: GridCounter[]
  valueStyles: GridValueStyle[]   // per-value coloring; cells without a match get a fallback
  anchors?: VizAnchor[]
}

// Discriminated union — extend with more viz types later (tree, ...)
export type VizConfig =
  | ArrayPointersVizConfig
  | LinkedListPointersVizConfig
  | GridBfsVizConfig
