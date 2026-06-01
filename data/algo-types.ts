// ── Visualization state ───────────────────────────────────────────────────────

export interface ArrayRowState {
  type: 'array-row'
  values: (string | number)[]
  pointers: Record<string, number>
  highlight?: number[]
  showBars?: boolean
  note?: string
}

export interface DPRowState {
  type: 'dp-row'
  values: (number | null)[]
  activeIndex: number   // 0-based index into values; -1 = no active cell
  note?: string
}

export interface LinkedListState {
  type: 'linked-list'
  nodes: { id: string; val: number | string }[]  // ordered head → tail
  pointers: Record<string, number>               // pointer name → node index; -1 = null
  reversed?: number                              // first N nodes have reversed arrows
  note?: string
}

export interface TreeState {
  type: 'tree'
  nodes: (number | null)[]  // level-order (LeetCode format), null = absent node
  activeIndex?: number      // currently visiting node (0-based)
  highlightPath?: number[]  // nodes to highlight amber — used for duplicates / key paths
  activeNodes?: number[]    // nodes to highlight indigo — used for "currently referenced" nodes
  note?: string
}

export interface GridState {
  type: 'grid'
  cells: string[][]                  // '0' = water / empty, '1' = land / filled
  visited?: [number, number][]       // [row, col] cells already processed
  active?: [number, number][]        // [row, col] cells currently being explored
  note?: string
}

export interface StaircaseState {
  type: 'staircase'
  n: number                          // total steps (step 0 = ground, step n = top)
  highlightStep?: number             // step to visually emphasize
  mode?: 'outgoing' | 'incoming'    // arrows from highlightStep outward, or arrows arriving at highlightStep
  paths?: number[][]                 // explicit paths — each is a sequence of step indices; arrows drawn for every consecutive pair
  activePath?: number                // when paths is set: index of the currently highlighted path; undefined = all grey
  stepCounts?: (number | null)[]    // stepCounts[i] = known ways to reach step i (null = unknown)
  note?: string
}

export type StepState = ArrayRowState | DPRowState | LinkedListState | TreeState | GridState | StaircaseState

// ── Step ──────────────────────────────────────────────────────────────────────

export interface AlgoStep {
  id: string
  label: string
  phaseLabel: string
  state: StepState
  description: string
  currentLine: number                           // 1-indexed line in solutionCode to highlight
  vars: Record<string, string | number>         // current variable values shown as inline hints
  calc?: string                                 // optional multi-line substitution chain
  isPausePoint?: boolean                        // surfaces in key-moments mode
}

// ── Failure mode ──────────────────────────────────────────────────────────────

export interface AlgoFailureMode {
  id: string
  label: string
  shortLabel: string
  brokenSteps: AlgoStep[]
  fixSteps: AlgoStep[]
  solutionCode?: string                         // if different from the happy-path code
}

// ── Approach ──────────────────────────────────────────────────────────────────

export interface DefinedTerm {
  term: string
  definition: string
}

export interface TraceCard {
  type: 'trace'
  label: string
  highlight?: number[]
  highlightTerms?: string[]
  inputs: { label: string; value: string | number }[]
  result: string
}

export interface EquationCard {
  type: 'equation'
  insight: string
  formula: string
}

export interface InsightCard {
  type: 'insight'
  question: string
  answer: string
  highlight?: number[]
  highlightTerms?: string[]
  definedTerms?: DefinedTerm[]
}

export interface RevealCard {
  type: 'reveal'
  pattern: string
}

export interface DecisionCard {
  type: 'decision'
  heightL: number
  heightR: number
  shorterSide: 'l' | 'r'
  reason: string
  highlight?: number[]
  pointers?: Record<string, number>
}

export type ApproachCard = TraceCard | EquationCard | InsightCard | RevealCard | DecisionCard

export interface ApproachSection {
  label: string
  description?: string
  cards: ApproachCard[]
  vizState?: StepState   // overrides approach-level vizState when any card in this section is hovered
}

export interface PlaybackFrame {
  pointers?: Record<string, number>    // array-row: pointer positions
  highlight?: number[]                 // array-row: highlighted cells
  dpValues?: (number | null)[]         // dp-row: dp array state at this frame
  dpActiveIndex?: number               // dp-row: active cell index
  note?: string
}

export interface PlaybackScenario {
  label: string
  values?: (string | number)[]         // array-row: the input array for this scenario
  frames: PlaybackFrame[]
}

export interface ProblemApproach {
  vizState?: StepState
  playback?: PlaybackScenario[]
  sections: ApproachSection[]
}

// ── Pattern templates ─────────────────────────────────────────────────────────

export const PATTERN_TEMPLATES: Record<string, string[]> = {
  'Two Pointers':       ['Initialize', 'Loop', 'Compare', 'Update bound', 'Evaluate', 'Move pointer', 'Return'],
  'Sliding Window':     ['Initialize', 'Loop', 'Expand', 'Shrink', 'Update best', 'Return'],
  'Binary Search':      ['Initialize', 'Loop', 'Mid', 'Narrow', 'Return'],
  'Dynamic Programming':['Base cases', 'Build dp', 'Return'],
}

// ── Problem ───────────────────────────────────────────────────────────────────

export interface UnderstandingQuestion {
  question: string
  answer: string
  highlightTerms?: string[]   // substrings of the problem question to highlight on hover
  pathAnnotations?: { text: string; path: number }[]  // answer substrings that, on hover, activate a specific path in a staircase visual
  visual?: StepState
}

export interface CodeSection {
  label: string
  startLine: number   // 1-indexed, inclusive
  endLine: number
}

export interface AlgoProblem {
  id: string
  title: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  pattern: string
  question: string
  starterCode: string
  solutionCode: string                          // full solution shown in the right panel
  steps: AlgoStep[]
  failureModes?: AlgoFailureMode[]
  understanding?: UnderstandingQuestion[]       // step-0 Q&A before the walkthrough
  approach?: ProblemApproach                    // step-1 reasoning chain between understand and walkthrough
  codeSections?: CodeSection[]                  // pattern anatomy labels in code panel
}
