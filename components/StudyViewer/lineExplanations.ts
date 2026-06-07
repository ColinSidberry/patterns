// State-aware, per-line explanations for the solution debugger. Keyed by
// problemId → line number → a function that receives the CURRENT step's parsed
// variables and returns a sentence describing what's happening at that line
// RIGHT NOW (so the same line can read differently as values change — e.g. the
// comparator's `if` says "tie → fall through" when diff is 0, "a wins, return"
// otherwise).
//
// Authored by hand, per problem (like slot labels) — kept here in TS rather
// than the JSON dataset because the logic is conditional on runtime state.
// Any explainer that throws is swallowed (returns null) so a bad line note can
// never break stepping.

interface ExplainCtx {
  vars: Record<string, unknown> // parsed values for the current step
  line: number
}

type LineExplainer = (ctx: ExplainCtx) => string | null
type ProblemExplanations = Record<number, LineExplainer>

// ── formatting helpers ──────────────────────────────────────────────────────
const j = (v: unknown): string => (v === undefined ? 'undefined' : JSON.stringify(v))
const code = (s: string | undefined): number | undefined =>
  typeof s === 'string' && s.length > 0 ? s.charCodeAt(0) : undefined
const joinParts = (parts: unknown): string =>
  Array.isArray(parts) ? parts.map(String).join('') : ''
const countOf = (counts: unknown, key: unknown): number | undefined => {
  if (counts && typeof counts === 'object' && typeof key === 'string') {
    return (counts as Record<string, number>)[key]
  }
  return undefined
}

// ── sort_by_frequency ───────────────────────────────────────────────────────
const sort_by_frequency: ProblemExplanations = {
  2: () => 'Start an empty tally — counts[char] will hold how many times each character appears.',
  3: ({ vars }) =>
    `Walked the whole string and tallied each character: counts = ${j(vars.counts)}.`,
  4: ({ vars }) =>
    `Pulled out the distinct characters to sort: chars = ${j(vars.chars)}. (Object key order = first-seen order, not sorted yet.)`,
  5: ({ vars }) =>
    `The sort engine handed the comparator two characters to rank: a = ${j(vars.a)}, b = ${j(vars.b)}. These aren't positions 0 and 1 — just two elements it wants ordered, in whatever pairing it chose.`,
  6: ({ vars }) => {
    const cb = countOf(vars.counts, vars.b)
    const ca = countOf(vars.counts, vars.a)
    return `diff = counts[b] − counts[a] = ${cb} − ${ca} = ${vars.diff}. (b minus a, so the more frequent character pushes diff in its favor.)`
  },
  7: ({ vars }) => {
    const diff = vars.diff as number
    if (diff === 0) {
      return `diff is 0 → ${j(vars.a)} and ${j(vars.b)} appear equally often, so frequency can't decide. "diff !== 0" is false, so we do NOT return — fall through to the tiebreak on line 8.`
    }
    const winner = diff < 0 ? vars.a : vars.b
    const dir = diff < 0 ? 'negative → a goes first' : 'positive → b goes first'
    return `diff is ${vars.diff} (${dir}). "diff !== 0" is true → return ${vars.diff} now. The more frequent character, ${j(winner)}, is placed first; tiebreak skipped.`
  },
  8: ({ vars }) => {
    const ca = code(vars.a as string)
    const cb = code(vars.b as string)
    if (ca === undefined || cb === undefined) return 'Tie broken by character code (alphabetical order).'
    const r = ca - cb
    const winner = r < 0 ? vars.a : vars.b
    return `Frequencies tied, so break the tie by code point: ${j(vars.a)}(${ca}) − ${j(vars.b)}(${cb}) = ${r}. Smaller code wins → ${j(winner)} goes first (alphabetical).`
  },
  9: () =>
    'Comparator hands the number back to the engine, which uses its sign to slot these two into place — then repeats with other pairs until the whole array is ordered.',
  10: () => 'Empty array to assemble the answer into.',
  11: ({ vars }) =>
    `For each character in sorted order, repeat it by its count and append. parts = ${j(vars.parts)}.`,
  12: ({ vars }) => `Glue the runs together into the final answer: ${j(joinParts(vars.parts))}.`,
}

const EXPLANATIONS: Record<string, ProblemExplanations> = {
  sort_by_frequency,
}

// Parse the worker's JSON-serialized var strings back into live values for the
// explainer. (`__undefined__` is the sentinel the worker uses for undefined.)
function parseVars(serialized: Record<string, string>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(serialized)) {
    try {
      const p = JSON.parse(v)
      out[k] = p === '__undefined__' ? undefined : p
    } catch {
      out[k] = v
    }
  }
  return out
}

export function hasLineExplanations(problemId: string): boolean {
  return problemId in EXPLANATIONS
}

export function getLineExplanation(
  problemId: string,
  line: number,
  serializedVars: Record<string, string>
): string | null {
  const table = EXPLANATIONS[problemId]
  const fn = table?.[line]
  if (!fn) return null
  try {
    return fn({ vars: parseVars(serializedVars), line })
  } catch {
    return null
  }
}
