'use client'

import { useEffect } from 'react'
import { migrateKeyPrefix } from '@/lib/migratePrefix'

// Runs first on boot: renames any legacy-prefixed localStorage keys to the
// current `patterns:` namespace. If it migrated anything, reload once so all
// surfaces re-read the renamed keys. Idempotent — a no-op after the first run.
const FLAG = 'patterns:__prefix_migrated'

export function PrefixMigrationGate() {
  useEffect(() => {
    if (sessionStorage.getItem(FLAG)) return
    const migrated = migrateKeyPrefix()
    sessionStorage.setItem(FLAG, '1')
    if (migrated) window.location.reload()
  }, [])
  return null
}
