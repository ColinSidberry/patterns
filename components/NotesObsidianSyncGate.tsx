'use client'

import { useEffect } from 'react'

// One-time catch-up sync. The first time the user loads the app after the
// auto-mirror feature lands, walk every existing note across every problem
// and POST it to /api/export-note so Obsidian gets the back-catalog.
//
// Guarded by `patterns:obsidian-synced:v1` so it runs exactly once per
// browser. Subsequent saves are mirrored inline by lib/notes.ts on each
// appendNote/updateNote.

const FLAG = 'patterns:obsidian-synced:v1'

interface LegacyNote {
  problemId?: string
  title?: string
  body?: string
  createdAt?: string
  updatedAt?: string
}

interface Note {
  id: string
  title?: string
  body?: string
  createdAt?: string
}

export function NotesObsidianSyncGate() {
  useEffect(() => {
    void (async () => {
      try {
        if (localStorage.getItem(FLAG)) return
        const entries: Array<{
          problemId: string
          noteId: string
          noteTitle: string
          body: string
          createdAt: string
        }> = []
        const KEY_PREFIX = 'patterns:notes:'
        const LEGACY_PREFIX = 'patterns:note:'
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i)
          if (!k) continue
          // Order matters — KEY_PREFIX is a superstring of LEGACY_PREFIX.
          if (k.startsWith(KEY_PREFIX)) {
            const problemId = k.slice(KEY_PREFIX.length)
            try {
              const arr = JSON.parse(localStorage.getItem(k)!) as Note[]
              if (!Array.isArray(arr)) continue
              for (const n of arr) {
                if ((n.title ?? '').trim() || (n.body ?? '').trim()) {
                  entries.push({
                    problemId,
                    noteId: n.id,
                    noteTitle: n.title ?? '',
                    body: n.body ?? '',
                    createdAt: n.createdAt ?? new Date().toISOString(),
                  })
                }
              }
            } catch {
              // skip malformed
            }
          } else if (k.startsWith(LEGACY_PREFIX) && !k.startsWith(KEY_PREFIX)) {
            const problemId = k.slice(LEGACY_PREFIX.length)
            try {
              const o = JSON.parse(localStorage.getItem(k)!) as LegacyNote
              if ((o.title ?? '').trim() || (o.body ?? '').trim()) {
                entries.push({
                  problemId,
                  noteId: `legacy_${problemId}`,
                  noteTitle: o.title ?? '',
                  body: o.body ?? '',
                  createdAt: o.createdAt ?? o.updatedAt ?? new Date().toISOString(),
                })
              }
            } catch {
              // skip malformed
            }
          }
        }
        let ok = 0
        for (const e of entries) {
          try {
            const res = await fetch('/api/export-note', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(e),
            })
            if (res.ok) ok++
          } catch {
            // ignore — try again next gate run if we don't set the flag
          }
        }
        // Only set the flag if everything we found made it (or there was
        // nothing to send). Partial failures leave the flag unset so a
        // future load retries.
        if (ok === entries.length) {
          localStorage.setItem(FLAG, '1')
        }
        if (entries.length > 0) {
          // eslint-disable-next-line no-console
          console.info(`[obsidian-sync] mirrored ${ok}/${entries.length} note(s) to Obsidian`)
        }
      } catch {
        // localStorage unavailable; nothing to do
      }
    })()
  }, [])
  return null
}
