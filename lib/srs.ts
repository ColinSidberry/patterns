// SM-2 spaced repetition with Anki-style button modifiers and study-day
// snapping. All state is per-problem, keyed `patterns:srs:<problemId>`.

export interface SrsState {
  ef: number              // easiness factor, min 1.3
  interval: number        // days until next review
  reps: number            // consecutive successful reviews
  lastReviewed: string    // ISO
  nextDue: string         // ISO
  mastered?: boolean      // user has graduated this out of the daily queue
}

export type Quality = 0 | 3 | 4 | 5

const DAY_MS = 86_400_000
const KEY = (id: string) => `patterns:srs:${id}`
const MIGRATION_FLAG = 'patterns:srs:migrated:v2'

// Per-button interval modifiers. Applied at every rep so the Hard/Good/Easy
// choice has an immediate, visible effect on next-review timing — not just
// EF drift that doesn't show up until rep 3+.
const MOD: Record<3 | 4 | 5, number> = { 3: 0.6, 4: 1.0, 5: 1.3 }
// Base intervals at the Good anchor. With modifiers:
//   rep 1: H=1d  G=2d  E=3d
//   rep 2: H=4d  G=6d  E=8d
const BASE_REP1 = 2
const BASE_REP2 = 6

// Calendar-day alignment: SRS intervals are in *days*, so nextDue should land
// at a calendar-day boundary, not a wallclock offset. "interval = 1" means
// "due anytime tomorrow", not "due 24 hours from the moment I clicked".
function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round(
    (startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / DAY_MS
  )
}

// Snap a date forward (or hold) until it lands on a configured study day.
// `mask` is a list of weekday numbers (0=Sun…6=Sat). Empty/undefined mask
// means "every day is a study day" — return the input unchanged.
export function nextStudyDay(d: Date, mask?: number[]): Date {
  if (!mask || mask.length === 0) return new Date(d)
  const out = new Date(d)
  // Hard cap at 14 iterations — even a single-day mask resolves within 7.
  for (let i = 0; i < 14; i++) {
    if (mask.includes(out.getDay())) return out
    out.setDate(out.getDate() + 1)
  }
  return out
}

export function defaultState(now: Date = new Date()): SrsState {
  return {
    ef: 2.5,
    interval: 0,
    reps: 0,
    lastReviewed: now.toISOString(),
    nextDue: now.toISOString(),
  }
}

export function applyReview(
  prev: SrsState | null,
  q: Quality,
  now: Date = new Date(),
  studyDaysMask?: number[]
): SrsState {
  const seed = prev ?? defaultState(now)
  let { ef, interval, reps } = seed
  if (q < 3) {
    // Again: schedule for tomorrow (snapped forward to the next study
    // day if a mask is provided), don't reset reps — accumulated practice
    // still counts and progression resumes when the card next gets
    // Hard/Good/Easy. EF drops sharply (q=0 → ef - 0.8, floored at 1.3)
    // so future intervals shorten naturally.
    interval = 1
    ef = Math.max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  } else {
    reps += 1
    const m = MOD[q as 3 | 4 | 5]
    if (reps === 1) interval = Math.max(1, Math.round(BASE_REP1 * m))
    else if (reps === 2) interval = Math.max(1, Math.round(BASE_REP2 * m))
    else interval = Math.max(1, Math.round(interval * ef * m))
    ef = Math.max(1.3, ef + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02))
  }
  // Anchor nextDue to the start of a future local day so daily-bucket math
  // (today vs. tomorrow vs. in N days) is unambiguous, then snap forward
  // to the next study day so reviews don't pile up on weekends.
  const candidate = new Date(startOfLocalDay(now).getTime() + interval * DAY_MS)
  const next = nextStudyDay(candidate, studyDaysMask)
  return {
    ef: Math.round(ef * 100) / 100,
    interval,
    reps,
    lastReviewed: now.toISOString(),
    nextDue: next.toISOString(),
  }
}

export function loadState(id: string): SrsState | null {
  try {
    const v = localStorage.getItem(KEY(id))
    if (!v) return null
    return JSON.parse(v) as SrsState
  } catch {
    return null
  }
}

export function saveState(id: string, state: SrsState): void {
  try {
    localStorage.setItem(KEY(id), JSON.stringify(state))
  } catch {
    // quota / unavailable — silently drop
  }
}

export function clearState(id: string): void {
  try {
    localStorage.removeItem(KEY(id))
  } catch {
    // ignore
  }
}

export interface DueRecord {
  id: string
  state: SrsState
  daysUntilDue: number     // floor; negative = overdue
}

export function getAllStates(): DueRecord[] {
  const out: DueRecord[] = []
  const now = new Date()
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || !k.startsWith('patterns:srs:')) continue
      const id = k.slice('patterns:srs:'.length)
      try {
        const state = JSON.parse(localStorage.getItem(k)!) as SrsState
        const daysUntilDue = calendarDaysBetween(now, new Date(state.nextDue))
        out.push({ id, state, daysUntilDue })
      } catch {
        // skip malformed entries
      }
    }
  } catch {
    // localStorage unavailable
  }
  return out
}

export function getDueRecords(): DueRecord[] {
  return getAllStates().filter((r) => r.daysUntilDue <= 0 && !r.state.mastered)
}

// ── Skip-today set ─────────────────────────────────────────────────────
//
// "Skip" is an ephemeral, today-only deprioritization. The problem stays
// in today's queue but sorts to the bottom of its list. Stored per-day
// in localStorage at `patterns:queue:YYYY-MM-DD:skipped`, so it auto-
// expires when the calendar day rolls over.

function todaySkipKey(now: Date = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `patterns:queue:${y}-${m}-${d}:skipped`
}

export function getSkippedToday(now: Date = new Date()): Set<string> {
  try {
    const raw = localStorage.getItem(todaySkipKey(now))
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as string[])
  } catch {
    return new Set()
  }
}

export function skipToday(id: string, now: Date = new Date()): Set<string> {
  const set = getSkippedToday(now)
  set.add(id)
  try {
    localStorage.setItem(todaySkipKey(now), JSON.stringify(Array.from(set)))
  } catch {
    // quota / unavailable — silently drop
  }
  return set
}

export function unskipToday(id: string, now: Date = new Date()): Set<string> {
  const set = getSkippedToday(now)
  set.delete(id)
  try {
    localStorage.setItem(todaySkipKey(now), JSON.stringify(Array.from(set)))
  } catch {
    // ignore
  }
  return set
}

// Toggle the mastered flag on a problem. Stamps lastReviewed so the action
// shows up in "Done today". Preserves any existing reps/ef/nextDue so an
// existing review schedule is intact if the user later un-masters.
//
// If no state exists yet (user hits Mastered on a never-rated problem),
// seed a fluent stub (reps=2, ef=2.5) so a later un-master leaves the
// problem in the rotation as already-fluent rather than as never-seen.
export function setMastered(id: string, mastered: boolean): SrsState {
  const now = new Date().toISOString()
  const s = loadState(id) ?? {
    ef: 2.5,
    interval: 0,
    reps: 2,
    lastReviewed: now,
    nextDue: now,
  }
  s.mastered = mastered
  s.lastReviewed = now
  saveState(id, s)
  return s
}

export function getStateMap(): Map<string, SrsState> {
  const out = new Map<string, SrsState>()
  for (const r of getAllStates()) out.set(r.id, r.state)
  return out
}

// Virtual queue: a problem is in one of three buckets.
//   "new"     — core problem with no SRS record yet (study it first)
//   "due"     — has an SRS record and nextDue is today or earlier
//   "learned" — has an SRS record and nextDue is in the future
//
// "to do today" = new core + due (any). This is the default daily target;
// untouched non-core problems aren't surfaced as backlog noise.
export interface VirtualQueueBuckets {
  newCore: string[]              // untouched core IDs (sorted by input order)
  due: DueRecord[]               // due reviews (any problem)
  learned: DueRecord[]           // not-yet-due reviews
  todoCount: number              // newCore.length + due.length
}

export function buildVirtualQueue(coreIds: string[]): VirtualQueueBuckets {
  const stateById = getStateMap()
  const all = getAllStates()
  const due: DueRecord[] = []
  const learned: DueRecord[] = []
  for (const r of all) {
    if (r.state.mastered) continue   // mastered problems aren't in the daily rotation
    if (r.daysUntilDue <= 0) due.push(r)
    else learned.push(r)
  }
  const newCore: string[] = []
  for (const id of coreIds) if (!stateById.has(id)) newCore.push(id)
  return { newCore, due, learned, todoCount: newCore.length + due.length }
}

// One-time pass over all stored SRS records to snap any `nextDue` that
// landed on a non-study day forward to the next study day. Used when the
// study-day-snapping behavior is introduced — without this, users with
// existing weekend-due items would see them sit on Sat/Sun until rated.
// Idempotent: gated by a flag in localStorage, runs once per browser.
export function migrateNextDueToStudyDays(mask: number[] | undefined): number {
  try {
    if (localStorage.getItem(MIGRATION_FLAG)) return 0
    if (!mask || mask.length === 0) {
      localStorage.setItem(MIGRATION_FLAG, '1')
      return 0
    }
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k && k.startsWith('patterns:srs:') && k !== MIGRATION_FLAG) keys.push(k)
    }
    let count = 0
    for (const k of keys) {
      try {
        const raw = localStorage.getItem(k)
        if (!raw) continue
        const s = JSON.parse(raw) as SrsState
        const due = new Date(s.nextDue)
        if (mask.includes(due.getDay())) continue
        s.nextDue = nextStudyDay(due, mask).toISOString()
        localStorage.setItem(k, JSON.stringify(s))
        count++
      } catch {
        // skip malformed entries
      }
    }
    localStorage.setItem(MIGRATION_FLAG, '1')
    return count
  } catch {
    return 0
  }
}

export function describeInterval(days: number): string {
  if (days <= 0) return 'now'
  if (days === 1) return 'tomorrow'
  if (days < 30) return `in ${days} days`
  if (days < 365) {
    const m = Math.round(days / 30)
    return `in ${m} ${m === 1 ? 'month' : 'months'}`
  }
  const y = Math.round(days / 365)
  return `in ${y} ${y === 1 ? 'year' : 'years'}`
}
