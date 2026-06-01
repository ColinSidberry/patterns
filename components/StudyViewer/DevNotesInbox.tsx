'use client'

// Dev-only client hook: on mount, drain the server-side inbox at
// /api/dev-notes and write each pending entry into localStorage via the
// canonical `appendNote` path. Then fire a synthetic `storage` event so any
// mounted NotesPanel re-reads its history.
//
// In production the API route returns 404, so the fetch resolves with an
// !ok response and we exit silently — no console noise, no infinite retry.
//
// Mounted from StudyViewer (always-on for any study page) so the inbox
// drains even if the user never opens the Reference Solution accordion.

import { useEffect } from 'react'
import { appendNote } from '@/lib/notes'

interface InboxEntry {
  problemId: string
  title: string
  body: string
}

export function DevNotesInbox(): null {
  useEffect(() => {
    // Skip entirely in prod builds. NODE_ENV is inlined at build time so
    // the whole effect tree-shakes / no-ops.
    if (process.env.NODE_ENV === 'production') return

    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/dev-notes', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { notes?: unknown }
        if (cancelled) return
        const notes = Array.isArray(data.notes) ? (data.notes as InboxEntry[]) : []
        const touched = new Set<string>()
        for (const n of notes) {
          if (!n || typeof n !== 'object') continue
          const { problemId, title, body } = n
          if (typeof problemId !== 'string' || !problemId) continue
          if (typeof title !== 'string' || typeof body !== 'string') continue
          // Skip totally-empty entries — they'd be filtered out on read anyway.
          if (!title.trim() && !body.trim()) continue
          appendNote(problemId, title, body)
          touched.add(problemId)
        }
        // appendNote() already dispatches a per-problem storage event, but
        // re-fire here to be defensive in case the inbox spans many problems
        // and any mounted NotesPanel watches a different key.
        for (const pid of touched) {
          try {
            window.dispatchEvent(new StorageEvent('storage', { key: `patterns:notes:${pid}` }))
          } catch {
            // older Safari — ignore
          }
        }
      } catch {
        // Network / parse failure → swallow. Dev-only ergonomic feature.
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return null
}
