// Per-pattern readiness derivation. "Coverage" is driven by core problems
// (denominator = CORE_PER_PATTERN per pattern). "Strength" combines EF +
// reps over the studied core. Non-core completions add a bonus.

import type { SrsState } from './srs'
import type { CorePatternSummary } from './coreCatalog'

export type PatternStatus = 'untouched' | 'started' | 'learning' | 'fluent'

export interface PatternProgress {
  id: string
  name: string
  module: string
  scaffold: 'iterative' | 'recursive' | 'dp' | 'design'
  coreTotal: number
  coreStudied: number          // core problems with any SRS record
  coreFluent: number           // core problems with reps >= 2 AND ef >= 2.5
  coreNew: number              // coreTotal - coreStudied
  coreDueNow: number           // core problems with nextDue <= today
  extraStudied: number         // non-core problems in this pattern with SRS records
  avgEf: number | null         // average EF over studied core (null if none)
  status: PatternStatus
  // 0..1 score combining coverage, strength, and bonus from extras
  readiness: number
}

const STATUS_RANK: Record<PatternStatus, number> = {
  untouched: 0,
  started: 1,
  learning: 2,
  fluent: 3,
}

export function deriveProgress(
  patterns: CorePatternSummary[],
  stateById: Map<string, SrsState>
): PatternProgress[] {
  const now = Date.now()
  const dayMs = 86_400_000
  const out: PatternProgress[] = []
  for (const p of patterns) {
    const coreTotal = p.coreIds.length
    let coreStudied = 0
    let coreFluent = 0
    let coreDueNow = 0
    let efSum = 0
    for (const id of p.coreIds) {
      const s = stateById.get(id)
      if (!s) continue
      coreStudied++
      efSum += s.ef
      if (s.reps >= 2 && s.ef >= 2.5) coreFluent++
      const dueIn = (new Date(s.nextDue).getTime() - now) / dayMs
      if (dueIn <= 0) coreDueNow++
    }
    let extraStudied = 0
    for (const id of p.allIds) {
      if (p.coreIds.includes(id)) continue
      if (stateById.has(id)) extraStudied++
    }
    const coreNew = coreTotal - coreStudied
    const avgEf = coreStudied > 0 ? efSum / coreStudied : null

    // Coverage 0..1, Strength 0..1 (EF in [1.3, 3.5] mapped), Bonus 0..0.2
    const coverage = coreTotal === 0 ? 0 : coreStudied / coreTotal
    const strength =
      avgEf === null ? 0 : Math.min(1, Math.max(0, (avgEf - 1.3) / (3.0 - 1.3)))
    const bonus = Math.min(0.2, extraStudied * 0.05)
    // Composite. Coverage matters most (you must study the core); strength is
    // the multiplier; bonus is sweetener.
    const readiness = Math.min(1, coverage * (0.6 + 0.4 * strength) + bonus)

    let status: PatternStatus
    if (coreStudied === 0) status = 'untouched'
    else if (coreFluent === coreTotal && coreTotal > 0) status = 'fluent'
    else if (coreStudied === coreTotal) status = 'learning'
    else status = 'started'

    out.push({
      id: p.id,
      name: p.name,
      module: p.module,
      scaffold: p.scaffold,
      coreTotal,
      coreStudied,
      coreFluent,
      coreNew,
      coreDueNow,
      extraStudied,
      avgEf,
      status,
      readiness,
    })
  }
  return out
}

export function sortByWeakest(rows: PatternProgress[]): PatternProgress[] {
  return [...rows].sort((a, b) => {
    const sA = STATUS_RANK[a.status]
    const sB = STATUS_RANK[b.status]
    if (sA !== sB) return sA - sB
    if (a.readiness !== b.readiness) return a.readiness - b.readiness
    return a.name.localeCompare(b.name)
  })
}

export interface OverallProgress {
  patternsTotal: number
  patternsFluent: number
  patternsStarted: number     // any non-untouched
  coreTotal: number           // sum of coreTotal across patterns
  coreStudied: number
  coreFluent: number
  extrasStudied: number       // sum across all patterns
  dueToday: number            // reviews actually due today (not new starts)
  newToday: number            // planned new problems to start today
}

export function summarize(
  rows: PatternProgress[],
  dueToday: number,
  newToday: number
): OverallProgress {
  let patternsFluent = 0
  let patternsStarted = 0
  let coreTotal = 0
  let coreStudied = 0
  let coreFluent = 0
  let extrasStudied = 0
  for (const r of rows) {
    if (r.status === 'fluent') patternsFluent++
    if (r.status !== 'untouched') patternsStarted++
    coreTotal += r.coreTotal
    coreStudied += r.coreStudied
    coreFluent += r.coreFluent
    extrasStudied += r.extraStudied
  }
  return {
    patternsTotal: rows.length,
    patternsFluent,
    patternsStarted,
    coreTotal,
    coreStudied,
    coreFluent,
    extrasStudied,
    dueToday,
    newToday,
  }
}
