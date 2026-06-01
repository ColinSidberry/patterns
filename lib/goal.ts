// Study-goal model + daily plan derivation + calendar forecast.
//
// Single goal record (not per-id), persisted in localStorage at `patterns:goal`.
// Derivation pulls SRS state from `patterns:srs:*` to compute today's plan and
// a 6-week calendar grid for /progress.

import type { SrsState } from './srs'

export type GoalMode = 'ready' | 'ready-to-interview'

export interface StudyGoal {
  mode: GoalMode
  targetDate: string         // ISO date (YYYY-MM-DD), local-day
  dailyMin: number           // floor on new problems per (study) day
  dailyMax: number           // hard cap on total daily workload
  studyDaysMask: number[]    // weekday numbers (0=Sun, 1=Mon, ... 6=Sat)
  createdAt: string          // ISO
}

const KEY = 'patterns:goal'
const DAY_MS = 86_400_000

// Mon-Fri default; user can edit via setup modal.
export const DEFAULT_STUDY_DAYS = [1, 2, 3, 4, 5]

// Comparator: "hardest first" for review ordering. Lowest EF wins;
// ties broken by oldest-due-first so nothing stale lingers within a tier.
// Returns a function so it can close over stateById once per call site.
function byHardness(stateById: Map<string, SrsState>) {
  return (a: string, b: string) => {
    const sa = stateById.get(a)!
    const sb = stateById.get(b)!
    if (sa.ef !== sb.ef) return sa.ef - sb.ef
    return sa.nextDue.localeCompare(sb.nextDue)
  }
}

export const DEFAULT_GOAL: Omit<StudyGoal, 'targetDate' | 'createdAt'> = {
  mode: 'ready-to-interview',
  dailyMin: 2,
  dailyMax: 10,
  studyDaysMask: DEFAULT_STUDY_DAYS,
}

// Planning defaults used when the user hasn't committed to a target date yet.
// `targetDate: ''` is the sentinel for "no deadline" — pacing falls back to
// dailyMin and the GoalCard renders without a slide-deadline button.
const PLANNING_DEFAULT: StudyGoal = {
  ...DEFAULT_GOAL,
  targetDate: '',
  createdAt: '',
}

export function getEffectiveGoal(saved: StudyGoal | null): StudyGoal {
  return saved ?? PLANNING_DEFAULT
}

export function hasCommittedGoal(saved: StudyGoal | null): boolean {
  return !!saved && saved.targetDate !== ''
}

export const GOAL_MODE_LABEL: Record<GoalMode, string> = {
  'ready': 'Ready (seen each core problem at least once)',
  'ready-to-interview': 'Ready to interview (fluent on every core problem)',
}

export const GOAL_MODE_SHORT: Record<GoalMode, string> = {
  'ready': 'Ready',
  'ready-to-interview': 'Ready to interview',
}

// ── Persistence ───────────────────────────────────────────────────────────

export function loadGoal(): StudyGoal | null {
  try {
    const v = localStorage.getItem(KEY)
    if (!v) return null
    return JSON.parse(v) as StudyGoal
  } catch {
    return null
  }
}

export function saveGoal(g: StudyGoal): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(g))
  } catch {
    // ignore
  }
}

export function clearGoal(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignore
  }
}

// ── Date helpers (local-day) ──────────────────────────────────────────────

export function startOfLocalDay(d: Date): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

export function calendarDaysBetween(from: Date, to: Date): number {
  return Math.round(
    (startOfLocalDay(to).getTime() - startOfLocalDay(from).getTime()) / DAY_MS
  )
}

export function isoDate(d: Date): string {
  // YYYY-MM-DD in local time
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 0, 0, 0, 0)
}

// ── Study-day helpers ─────────────────────────────────────────────────────

export function isStudyDay(d: Date, mask: number[]): boolean {
  return mask.includes(d.getDay())
}

// Count study days in [from, to] (inclusive on both ends, calendar-day).
export function studyDaysInRange(from: Date, to: Date, mask: number[]): number {
  if (mask.length === 0) return 0
  const start = startOfLocalDay(from)
  const end = startOfLocalDay(to)
  if (end.getTime() < start.getTime()) return 0
  let count = 0
  const d = new Date(start)
  while (d.getTime() <= end.getTime()) {
    if (isStudyDay(d, mask)) count++
    d.setDate(d.getDate() + 1)
  }
  return count
}

// Add N study days to `from`. If `from` itself is a study day and includeStart,
// it counts as 1.
export function addStudyDays(from: Date, n: number, mask: number[]): Date {
  if (mask.length === 0 || n <= 0) return startOfLocalDay(from)
  const d = startOfLocalDay(from)
  let remaining = n
  // Walk day-by-day until we've consumed n study days.
  if (isStudyDay(d, mask)) remaining--
  while (remaining > 0) {
    d.setDate(d.getDate() + 1)
    if (isStudyDay(d, mask)) remaining--
  }
  return d
}

// ── Status helpers ────────────────────────────────────────────────────────

export function isFluent(s: SrsState): boolean {
  // Mastered is the user's explicit assertion of fluency and overrides EF.
  if (s.mastered) return true
  return s.reps >= 2 && s.ef >= 2.5
}

export function isSeen(s: SrsState | undefined): boolean {
  if (!s) return false
  if (s.mastered) return true
  return s.reps >= 1
}

export function meetsGoalMode(s: SrsState | undefined, mode: GoalMode): boolean {
  if (!s) return false
  if (mode === 'ready') return isSeen(s)
  return isFluent(s)
}

// ── Daily plan ────────────────────────────────────────────────────────────

export interface DailyPlan {
  remaining: number              // # of core that still need work to meet goal
  studyDaysLeft: number          // study days between today and target (incl)
  daysLeft: number               // calendar days between today and target (incl)
  requiredPerDay: number         // ceil(remaining / studyDaysLeft) — pace
  newToday: number               // # new problems to start today (target)
  reviewsDueToday: number        // # of due reviews (target)
  totalToday: number             // newToday + reviewsDueToday (target, capped at dailyMax)
  completedToday: number         // # of problems rated today (lastReviewed === today)
  remainingToday: number         // max(0, totalToday - completedToday) — what's left to do
  overload: boolean              // true if uncapped need exceeded dailyMax
  recommendedSlide: number       // # of calendar days to slide deadline if overloaded
  goalMet: boolean               // remaining === 0
  isStudyDayToday: boolean
}

export function deriveDailyPlan(
  goal: StudyGoal,
  stateById: Map<string, SrsState>,
  coreIds: string[],
  now: Date = new Date()
): DailyPlan {
  // 1. Count remaining core that don't meet the goal mode yet.
  let remaining = 0
  for (const id of coreIds) {
    if (!meetsGoalMode(stateById.get(id), goal.mode)) remaining++
  }

  // 2. Calendar + study days remaining (inclusive of today).
  // No targetDate (planning defaults) → no deadline pressure; pace = dailyMin.
  const hasDeadline = !!goal.targetDate
  let daysLeft = 0
  let studyDaysLeft = 0
  let requiredPerDay = 0
  if (hasDeadline) {
    const target = parseIsoDate(goal.targetDate)
    daysLeft = Math.max(1, calendarDaysBetween(now, target) + 1)
    studyDaysLeft = Math.max(1, studyDaysInRange(now, target, goal.studyDaysMask))
    requiredPerDay = remaining === 0 ? 0 : Math.ceil(remaining / studyDaysLeft)
  }

  // 4. Total currently-due (uncapped) used for overload + capacity math.
  let totalDueNow = 0
  for (const [, s] of stateById) {
    if (s.mastered) continue
    const days = calendarDaysBetween(now, new Date(s.nextDue))
    if (days <= 0) totalDueNow++
  }

  // 5. Breadth-first model: NEW picks come first up to dailyMin + any
  //    carryover from missed prior days, then reviews fill the remainder.
  //    The carryover inflation is what keeps you tracking toward a
  //    deadline — miss 1 yesterday and today's quota becomes 3. Capped
  //    at dailyMax so a long absence doesn't show 50 new problems.
  const studyDayToday = isStudyDay(now, goal.studyDaysMask)
  let untouchedCount = 0
  for (const id of coreIds) {
    if (!stateById.has(id)) untouchedCount++
  }
  const carryoverCount = findCarryoverIds(stateById, now).length
  let newToday: number
  if (!studyDayToday) {
    newToday = 0
  } else {
    newToday = Math.min(goal.dailyMin + carryoverCount, goal.dailyMax, untouchedCount)
  }
  const reviewSlots = Math.max(0, goal.dailyMax - newToday)
  const reviewsDueToday = Math.min(totalDueNow, reviewSlots)
  const totalToday = newToday + reviewsDueToday

  // 6. Overload: at strict dailyMin pace, can you still finish by your
  //    target? Compares remaining (unmet by goal mode) to capacity at
  //    pace = dailyMin across study days left.
  const overload = hasDeadline && studyDayToday && remaining > studyDaysLeft * goal.dailyMin

  // 7. Slide suggestion: how many extra calendar days you'd need at the
  //    strict dailyMin pace to clear remaining.
  let recommendedSlide = 0
  if (hasDeadline && overload && remaining > 0) {
    const sustainableStudyDays = Math.ceil(remaining / Math.max(1, goal.dailyMin))
    const newTarget = addStudyDays(now, sustainableStudyDays, goal.studyDaysMask)
    const target = parseIsoDate(goal.targetDate)
    recommendedSlide = Math.max(0, calendarDaysBetween(target, newTarget))
  }

  // 8. Today's queue snapshot — frozen at the start of the day so the
  //    count burns down as items get rated forward (instead of growing
  //    when the next untouched core slides into a completed item's slot).
  //    See the docstring on `selectTodayQueue` for the full model.
  let totalTodayFromSnapshot = totalToday
  let completedToday = 0
  let snap = loadTodayQueueSnapshot(now)
  if (!snap) {
    snap = buildTodaySnapshot(stateById, goal, coreIds, newToday, now)
    saveTodayQueueSnapshot(snap, now)
  }
  totalTodayFromSnapshot = snap.ids.length
  // Completed today (from the snapshot's perspective): snapshot items
  // currently scheduled forward (user rated them) OR mastered today.
  // Mastered doesn't push nextDue forward, but it removes the problem
  // from rotation — the badge should treat it as "closed out for today".
  for (const id of snap.ids) {
    const s = stateById.get(id)
    if (!s) continue
    if (s.mastered || calendarDaysBetween(now, new Date(s.nextDue)) > 0) {
      completedToday++
    }
  }
  const remainingToday = Math.max(0, totalTodayFromSnapshot - completedToday)

  return {
    remaining,
    studyDaysLeft,
    daysLeft,
    requiredPerDay,
    newToday,
    reviewsDueToday,
    totalToday: totalTodayFromSnapshot,    // snapshotted size, not live recompute
    completedToday,
    remainingToday,
    overload,
    recommendedSlide,
    goalMet: remaining === 0,
    isStudyDayToday: studyDayToday,
  }
}

// ── Milestone projection ──────────────────────────────────────────────────

export interface Milestones {
  readyDate: Date | null              // when all core seen ≥1 time
  readyToInterviewDate: Date | null   // when all core fluent
  readyIso: string | null
  readyToInterviewIso: string | null
}

// Project both milestones from the current state, given dailyMin pace
// across study days. Each unseen problem costs 1 work-unit to "see" and
// 2 work-units to "fluent" (initial + one review). Each seen-but-not-
// fluent problem costs 1 work-unit to "fluent". Already-fluent: 0.
export function projectMilestones(
  goal: StudyGoal,
  stateById: Map<string, SrsState>,
  coreIds: string[],
  now: Date = new Date()
): Milestones {
  let unseen = 0
  let seenNotFluent = 0
  let allFluent = 0
  for (const id of coreIds) {
    const s = stateById.get(id)
    if (!s || s.reps === 0) unseen++
    else if (!isFluent(s)) seenNotFluent++
    else allFluent++
  }

  // "Ready" = all seen at least once.
  const seenWorkLeft = unseen
  // "Fluent" = all reps ≥ 2 with ef ≥ 2.5. Conservatively: 2 work units for unseen,
  // 1 for seen-not-fluent.
  const fluentWorkLeft = unseen * 2 + seenNotFluent

  const pace = Math.max(1, goal.dailyMin)
  const seenStudyDays = Math.ceil(seenWorkLeft / pace)
  const fluentStudyDays = Math.ceil(fluentWorkLeft / pace)

  const readyDate = seenWorkLeft === 0 ? null : addStudyDays(now, seenStudyDays, goal.studyDaysMask)
  const readyToInterviewDate = fluentWorkLeft === 0 ? null : addStudyDays(now, fluentStudyDays, goal.studyDaysMask)
  // Suppress unused-var lint while keeping the count available if we want to display it later.
  void allFluent

  return {
    readyDate,
    readyToInterviewDate,
    readyIso: readyDate ? isoDate(readyDate) : null,
    readyToInterviewIso: readyToInterviewDate ? isoDate(readyToInterviewDate) : null,
  }
}

// ── Calendar grid ─────────────────────────────────────────────────────────

export type CalendarCellKind = 'past' | 'today' | 'future' | 'past-non-study' | 'future-non-study'

export interface CalendarCell {
  date: Date
  iso: string                    // YYYY-MM-DD
  inMonth: boolean               // true if date is within the focused month
  kind: CalendarCellKind
  isStudyDay: boolean
  reviewsDue: number             // past = actual ratings; future = projected
  newPlanned: number             // 0 in past; future = scheduled new today
  count: number                  // total displayed (reviewsDue + newPlanned)
  isGoalDate: boolean            // committed targetDate
  isReadyDate: boolean           // projected "Ready" milestone
  isRTIDate: boolean             // projected "Ready to interview" milestone
}

export interface DayProblems {
  reviewIds: string[]   // problems with a review on this day (past = rated, future = projected due, today = due now)
  newIds: string[]      // new problems planned to start this day (today + future only)
}

// Build a 6-week grid (42 cells, Sun-Sat) anchored on the focused month.
// Past days bucket actual ratings (from `lastReviewed`); future days project
// reviews-due (from `nextDue`) and forward-allocate new problems across study
// days at `dailyMin` pace.
export function buildCalendar(
  focusDate: Date,
  stateById: Map<string, SrsState>,
  goal: StudyGoal | null,
  plan: DailyPlan | null,
  coreIds: string[],
  now: Date = new Date()
): {
  cells: CalendarCell[]
  monthLabel: string
  firstOfMonth: Date
  milestones: Milestones | null
  idsByDay: Map<string, DayProblems>
} {
  const focusYear = focusDate.getFullYear()
  const focusMonth = focusDate.getMonth()
  const firstOfMonth = new Date(focusYear, focusMonth, 1)
  const gridStart = new Date(firstOfMonth)
  gridStart.setDate(gridStart.getDate() - gridStart.getDay())

  const todayIso = isoDate(now)
  const goalIso = goal?.targetDate ?? null
  const mask = goal?.studyDaysMask ?? DEFAULT_STUDY_DAYS

  // Per-day ID buckets (so a day click can show the actual problems).
  const idsByDay = new Map<string, DayProblems>()
  const pushReview = (iso: string, id: string) => {
    let b = idsByDay.get(iso)
    if (!b) { b = { reviewIds: [], newIds: [] }; idsByDay.set(iso, b) }
    b.reviewIds.push(id)
  }
  const pushNew = (iso: string, id: string) => {
    let b = idsByDay.get(iso)
    if (!b) { b = { reviewIds: [], newIds: [] }; idsByDay.set(iso, b) }
    b.newIds.push(id)
  }

  // Bucket past ratings + scheduled reviews by day (counts + ids).
  // Past ratings come from `lastReviewed` and reflect actual history.
  // Future reviews come from `nextDue` but get RE-ASSIGNED below by a
  // cascade simulation that caps each day at dailyMax — overflow rolls
  // to the next day so the user sees a chain of catch-up days instead
  // of one giant pile on the original due date.
  const pastByDay = new Map<string, number>()
  const scheduledByDay = new Map<string, string[]>()  // nextDue's day → IDs originally scheduled there
  const dueTodayIds: string[] = []
  for (const [id, s] of stateById) {
    if (s.lastReviewed) {
      const k = isoDate(new Date(s.lastReviewed))
      if (k < todayIso) {
        pastByDay.set(k, (pastByDay.get(k) || 0) + 1)
        pushReview(k, id)
      }
    }
    if (s.mastered) continue
    if (s.nextDue) {
      const k = isoDate(new Date(s.nextDue))
      if (k > todayIso) {
        if (!scheduledByDay.has(k)) scheduledByDay.set(k, [])
        scheduledByDay.get(k)!.push(id)
      } else if (calendarDaysBetween(now, new Date(s.nextDue)) <= 0) {
        dueTodayIds.push(id)
      }
    }
  }
  // Today's bucket gets the due reviews (capped via plan.remainingToday on
  // the count side; idsByDay still gets all of them for the day-detail panel).
  for (const id of dueTodayIds) pushReview(todayIso, id)

  // Forward simulation: walk each future day, accumulating any items
  // originally scheduled for that day plus the backlog deferred from
  // earlier days, capping at dailyMax. Excess rolls to the next day
  // (the user sees a chain of cap-day-cap-day until the backlog clears).
  // Then allocate new picks into whatever slots remain that day.
  const futureReviewsByDay = new Map<string, number>()
  const futureNewByDay = new Map<string, number>()
  let milestones: Milestones | null = null
  let todaysNewIds: string[] = []
  if (goal) {
    milestones = projectMilestones(goal, stateById, coreIds, now)
    const unmet: string[] = []
    for (const id of coreIds) {
      if (!stateById.has(id)) unmet.push(id)
    }
    let i = 0
    const pace = goal.dailyMin
    const dailyMax = goal.dailyMax
    if (isStudyDay(now, mask) && plan && plan.newToday > 0) {
      todaysNewIds = unmet.slice(0, plan.newToday)
      for (const id of todaysNewIds) pushNew(todayIso, id)
      i += plan.newToday
    }
    const gridEnd = new Date(gridStart)
    gridEnd.setDate(gridEnd.getDate() + 41)
    const horizon = new Date(Math.max(
      gridEnd.getTime(),
      milestones.readyToInterviewDate?.getTime() ?? gridEnd.getTime()
    ))
    // Seed the cascade with today's overflow: currently-due items beyond
    // dailyMax stay overdue and roll into tomorrow. Today, NEW picks
    // already consumed `plan.newToday` slots, so the review budget today
    // was `dailyMax - newToday`. Overflow = whatever sat past that limit.
    const todayNewCount = (plan && isStudyDay(now, mask)) ? plan.newToday : 0
    const todayReviewBudget = Math.max(0, dailyMax - todayNewCount)
    const sortedDueToday = [...dueTodayIds].sort(byHardness(stateById))
    let backlog: string[] = sortedDueToday.slice(todayReviewBudget)
    const cursor = new Date(now)
    cursor.setDate(cursor.getDate() + 1)
    while (cursor.getTime() <= horizon.getTime()) {
      const iso = isoDate(cursor)
      // Breadth-first: NEW picks first on study days (up to pace), then
      // reviews fill the remainder.
      let newPlanned = 0
      if (isStudyDay(cursor, mask) && i < unmet.length) {
        newPlanned = Math.min(unmet.length - i, pace, dailyMax)
        if (newPlanned > 0) {
          futureNewByDay.set(iso, newPlanned)
          for (const id of unmet.slice(i, i + newPlanned)) pushNew(iso, id)
          i += newPlanned
        }
      }
      const reviewBudget = Math.max(0, dailyMax - newPlanned)
      const newlyScheduled = scheduledByDay.get(iso) ?? []
      const pool = backlog.concat(newlyScheduled)
      pool.sort(byHardness(stateById))
      const reviewsThisDay = pool.slice(0, reviewBudget)
      backlog = pool.slice(reviewBudget)
      for (const id of reviewsThisDay) pushReview(iso, id)
      futureReviewsByDay.set(iso, reviewsThisDay.length)
      cursor.setDate(cursor.getDate() + 1)
    }
  }

  // Stable sort each day's review list by studyOrder (i.e., position in
  // coreIds). Non-core IDs (extras the user rated) fall to the end.
  const orderIndex = new Map<string, number>()
  coreIds.forEach((id, i) => orderIndex.set(id, i))
  const orderKey = (id: string) => orderIndex.get(id) ?? Number.MAX_SAFE_INTEGER
  for (const bucket of idsByDay.values()) {
    bucket.reviewIds.sort((a, b) => orderKey(a) - orderKey(b))
    // newIds come from coreIds-order slicing already, but sort defensively.
    bucket.newIds.sort((a, b) => orderKey(a) - orderKey(b))
  }

  const cells: CalendarCell[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    const iso = isoDate(d)
    const inMonth = d.getMonth() === focusMonth
    const studyDay = isStudyDay(d, mask)
    const isGoalDate = goalIso === iso
    const isReadyDate = !!(milestones?.readyIso && milestones.readyIso === iso)
    const isRTIDate = !!(milestones?.readyToInterviewIso && milestones.readyToInterviewIso === iso)

    let kind: CalendarCellKind
    let reviewsDue = 0
    let newPlanned = 0

    if (iso < todayIso) {
      kind = studyDay ? 'past' : 'past-non-study'
      reviewsDue = pastByDay.get(iso) || 0
    } else if (iso === todayIso) {
      kind = 'today'
      // Show what's REMAINING today (target minus completed), not the
      // initial target. As the user rates problems, the count ticks
      // down. Default to 0 if no plan.
      reviewsDue = plan?.remainingToday ?? 0
      newPlanned = 0
    } else {
      kind = studyDay ? 'future' : 'future-non-study'
      reviewsDue = futureReviewsByDay.get(iso) || 0
      newPlanned = futureNewByDay.get(iso) || 0
    }

    cells.push({
      date: d,
      iso,
      inMonth,
      kind,
      isStudyDay: studyDay,
      reviewsDue,
      newPlanned,
      count: reviewsDue + newPlanned,
      isGoalDate,
      isReadyDate,
      isRTIDate,
    })
  }

  const monthLabel = firstOfMonth.toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })

  return { cells, monthLabel, firstOfMonth, milestones, idsByDay }
}

// ── Today's queue (snapshotted) ───────────────────────────────────────────
//
// The list of problems "for today" needs to FREEZE at the start of the day,
// otherwise rating one of today's new problems pulls the next untouched
// core into its place and the count never burns down. We snapshot once per
// calendar day into localStorage at `patterns:queue:YYYY-MM-DD`.
//
// The snapshot stores the union of (today's planned new IDs) + (IDs that
// were due as of the snapshot time). As the user rates items, they leave
// the "due today" view (their nextDue moves forward) and appear in
// "done today" — but the total stays fixed.

interface TodayQueueSnapshot {
  ids: string[]                  // union of today's planned new + originally-due IDs
  capturedAt: string             // ISO when the snapshot was first taken (for debugging)
}

function todayQueueKey(now: Date): string {
  return `patterns:queue:${isoDate(now)}`
}

function loadTodayQueueSnapshot(now: Date): TodayQueueSnapshot | null {
  try {
    const raw = localStorage.getItem(todayQueueKey(now))
    if (!raw) return null
    return JSON.parse(raw) as TodayQueueSnapshot
  } catch {
    return null
  }
}

function saveTodayQueueSnapshot(snap: TodayQueueSnapshot, now: Date): void {
  try {
    localStorage.setItem(todayQueueKey(now), JSON.stringify(snap))
  } catch {
    // ignore quota / unavailable
  }
}

// Carryover = IDs that appeared in a past day's snapshot but never got
// rated (no SRS state). These are items the user planned but never started;
// they should surface today as "Nd late" rather than re-appearing as fresh
// new picks. Walks oldest → newest so `daysLate` reflects the FIRST day
// the item was scheduled and missed.
export function findCarryoverIds(
  stateById: Map<string, SrsState>,
  now: Date = new Date(),
  lookbackDays: number = 14
): Array<{ id: string; daysLate: number }> {
  const out: Array<{ id: string; daysLate: number }> = []
  const seen = new Set<string>()
  for (let offset = lookbackDays; offset >= 1; offset--) {
    const d = new Date(now)
    d.setDate(d.getDate() - offset)
    const snap = loadTodayQueueSnapshot(d)
    if (!snap) continue
    for (const id of snap.ids) {
      if (seen.has(id)) continue
      if (stateById.has(id)) continue   // user rated it eventually — not stale
      seen.add(id)
      out.push({ id, daysLate: offset })
    }
  }
  return out
}

// Construct today's snapshot ID list. Reviews (currentlyDue) are uncapped —
// they're already due. The remaining slots split between carryover (priority)
// and fresh new picks, with the new+carryover budget = dailyMax - reviews.
function buildTodaySnapshot(
  stateById: Map<string, SrsState>,
  goal: StudyGoal | null,
  coreIds: string[],
  planNewToday: number,
  now: Date
): TodayQueueSnapshot {
  // Breadth-first ordering: NEW picks fill first (carryover + fresh
  // untouched, up to planNewToday), then REVIEWS fill remaining slots
  // sorted HARDEST-FIRST (lowest EF, then oldest-overdue). Reviews
  // overflowing dailyMax stay overdue and roll into tomorrow naturally.
  const dailyMax = goal?.dailyMax ?? Number.POSITIVE_INFINITY

  const carryover = findCarryoverIds(stateById, now).map((c) => c.id)
  const carrySet = new Set(carryover)
  const untouchedCore: string[] = []
  for (const id of coreIds) {
    if (!stateById.has(id) && !carrySet.has(id)) untouchedCore.push(id)
  }
  // New slots: carryover priority, then fresh untouched, total capped at
  // planNewToday (which is itself capped at dailyMax in deriveDailyPlan).
  const carryoverInQueue = carryover.slice(0, planNewToday)
  const freshSlots = Math.max(0, planNewToday - carryoverInQueue.length)
  const freshNewIds = untouchedCore.slice(0, freshSlots)
  const newCount = carryoverInQueue.length + freshNewIds.length

  // Review slots fill what's left of dailyMax.
  const reviewBudget = Math.max(0, dailyMax - newCount)
  const allCurrentlyDue: string[] = []
  for (const [id, s] of stateById) {
    if (s.mastered) continue
    if (calendarDaysBetween(now, new Date(s.nextDue)) <= 0) allCurrentlyDue.push(id)
  }
  allCurrentlyDue.sort(byHardness(stateById))
  const reviewsToday = allCurrentlyDue.slice(0, reviewBudget)

  const ids = Array.from(new Set([...carryoverInQueue, ...freshNewIds, ...reviewsToday]))
  return { ids, capturedAt: now.toISOString() }
}

export interface TodayQueue {
  dueIds: string[]
  newIds: string[]
  carryover: Array<{ id: string; daysLate: number }>
  queueIds: string[]
}

export function selectTodayQueue(
  plan: DailyPlan | null,
  goal: StudyGoal | null,
  stateById: Map<string, SrsState>,
  coreIds: string[],
  now: Date = new Date()
): TodayQueue {
  // Always-true "current state" lists (driven by SRS state).
  const currentlyDueIds: string[] = []
  for (const [id, s] of stateById) {
    if (s.mastered) continue
    if (calendarDaysBetween(now, new Date(s.nextDue)) <= 0) currentlyDueIds.push(id)
  }
  const targetNewToday = plan ? plan.newToday : (goal ? 0 : Number.POSITIVE_INFINITY)

  // Read or initialize today's frozen snapshot.
  let snap = loadTodayQueueSnapshot(now)
  if (!snap) {
    snap = buildTodaySnapshot(stateById, goal, coreIds, targetNewToday, now)
    saveTodayQueueSnapshot(snap, now)
  }

  // Bucket the snapshot into carryover / new / due using current state.
  // Carryover = snapshot IDs that ALSO appear in a past day's snapshot
  // and still have no rating. Items rated forward fall out (→ "done today").
  const carryoverFound = findCarryoverIds(stateById, now)
  const carryoverDaysLate = new Map(carryoverFound.map((c) => [c.id, c.daysLate]))
  const queueSet = new Set(snap.ids)
  const newIds: string[] = []
  const dueIds: string[] = []
  const carryover: Array<{ id: string; daysLate: number }> = []
  for (const id of snap.ids) {
    if (!stateById.has(id)) {
      const daysLate = carryoverDaysLate.get(id)
      if (daysLate !== undefined) carryover.push({ id, daysLate })
      else newIds.push(id)
    } else if (currentlyDueIds.includes(id)) {
      // Has state and is due (e.g., user rated Again — it's back in the queue).
      dueIds.push(id)
    }
    // Otherwise the item is rated and scheduled forward — falls out of
    // both lists (will appear in "done today").
  }

  // Note: items that become due mid-day (after snapshot capture) and aren't
  // already in `snap.ids` will wait for tomorrow's snapshot. Without this,
  // the dailyMax cap would be silently exceeded by mid-day arrivals.
  void queueSet

  return { newIds, dueIds, carryover, queueIds: snap.ids }
}

// Forecast next-7-days planned counts (excluding today). Used for the
// "next 7 days" compact strip if we want it later.
export function next7DayCounts(
  stateById: Map<string, SrsState>,
  goal: StudyGoal | null,
  plan: DailyPlan | null,
  now: Date = new Date()
): Array<{ date: Date; iso: string; reviewsDue: number; newPlanned: number }> {
  const out: Array<{ date: Date; iso: string; reviewsDue: number; newPlanned: number }> = []
  for (let i = 1; i <= 7; i++) {
    const d = new Date(now)
    d.setDate(d.getDate() + i)
    const iso = isoDate(d)
    let reviewsDue = 0
    for (const [, s] of stateById) {
      if (s.mastered) continue
      if (isoDate(new Date(s.nextDue)) === iso) reviewsDue++
    }
    const newPlanned = goal && plan ? Math.max(0, goal.dailyMin) : 0
    out.push({ date: d, iso, reviewsDue, newPlanned })
  }
  return out
}
