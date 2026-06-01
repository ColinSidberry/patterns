'use client'

import { useEffect } from 'react'
import { migrateNextDueToStudyDays } from '@/lib/srs'
import { getEffectiveGoal, loadGoal } from '@/lib/goal'

// One-time pass on app mount: snap any existing nextDue values that landed
// on a non-study day forward to the next study day. The function itself is
// idempotent (gated by `patterns:srs:migrated:v2`), but we still mount this
// at the root so the migration runs before any queue/badge surfaces read
// stored state.
export function SrsMigrationGate() {
  useEffect(() => {
    const goal = getEffectiveGoal(loadGoal())
    migrateNextDueToStudyDays(goal.studyDaysMask)
  }, [])
  return null
}
