// Per-problem notes as an append-only history. Each visit produces a new
// entry (created via appendNote); existing entries can still be edited or
// deleted by id. Listings are sorted newest-first.
//
// Storage: `patterns:notes:<problemId>` → Note[]
// Legacy single-note keys `patterns:note:<problemId>` are migrated on first
// read of that problem (or on listAllNotes).

export interface Note {
  id: string
  problemId: string
  title: string
  body: string
  createdAt: string  // ISO
}

interface LegacyNote {
  problemId: string
  title: string
  body: string
  createdAt: string
  updatedAt: string
}

const KEY = (id: string) => `patterns:notes:${id}`
const KEY_PREFIX = 'patterns:notes:'
const LEGACY_KEY = (id: string) => `patterns:note:${id}`
const LEGACY_PREFIX = 'patterns:note:'

function newId(): string {
  return `n_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

function notifyChange(problemId: string): void {
  try {
    window.dispatchEvent(new StorageEvent('storage', { key: KEY(problemId) }))
  } catch {
    // ignore — older Safari
  }
}

// Fire-and-forget mirror to the Obsidian vault. The dev-only API route at
// /api/export-note writes the note as a markdown file. Failures (server
// down, prod build, file permissions) are swallowed — the localStorage
// save already succeeded, this is just a side-channel for offline study.
function mirrorToObsidian(note: Note): void {
  if (typeof window === 'undefined') return
  try {
    void fetch('/api/export-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        problemId: note.problemId,
        noteId: note.id,
        noteTitle: note.title,
        body: note.body,
        createdAt: note.createdAt,
      }),
    }).catch(() => { /* ignore */ })
  } catch {
    // ignore
  }
}

// If a legacy single-note record exists, convert it to a one-element list
// at the new key and remove the legacy key. Idempotent.
function migrateLegacyForProblem(problemId: string): Note[] | null {
  try {
    const raw = localStorage.getItem(LEGACY_KEY(problemId))
    if (!raw) return null
    const old = JSON.parse(raw) as LegacyNote
    localStorage.removeItem(LEGACY_KEY(problemId))
    if (!old.title?.trim() && !old.body?.trim()) return []
    const migrated: Note = {
      id: newId(),
      problemId,
      title: old.title ?? '',
      body: old.body ?? '',
      createdAt: old.createdAt ?? old.updatedAt ?? new Date().toISOString(),
    }
    const list = [migrated]
    localStorage.setItem(KEY(problemId), JSON.stringify(list))
    return list
  } catch {
    return null
  }
}

function readList(problemId: string): Note[] {
  try {
    const raw = localStorage.getItem(KEY(problemId))
    if (raw) {
      const parsed = JSON.parse(raw) as unknown
      return Array.isArray(parsed) ? (parsed as Note[]) : []
    }
    return migrateLegacyForProblem(problemId) ?? []
  } catch {
    return []
  }
}

function writeList(problemId: string, list: Note[]): void {
  try {
    if (list.length === 0) localStorage.removeItem(KEY(problemId))
    else localStorage.setItem(KEY(problemId), JSON.stringify(list))
  } catch {
    // quota / unavailable
  }
  notifyChange(problemId)
}

// Append a new entry for this problem and return it.
export function appendNote(problemId: string, title: string, body: string): Note {
  const list = readList(problemId)
  const note: Note = {
    id: newId(),
    problemId,
    title,
    body,
    createdAt: new Date().toISOString(),
  }
  list.push(note)
  writeList(problemId, list)
  // Skip mirror for fully-empty notes (avoids spurious "(untitled).md" files).
  if (note.title.trim() || note.body.trim()) mirrorToObsidian(note)
  return note
}

// Update an existing entry by id. Returns the updated note, or null if
// no matching id exists.
export function updateNote(
  problemId: string,
  noteId: string,
  title: string,
  body: string,
): Note | null {
  const list = readList(problemId)
  const i = list.findIndex((n) => n.id === noteId)
  if (i < 0) return null
  const existing = list[i]!
  const updated: Note = { ...existing, title, body }
  list[i] = updated
  writeList(problemId, list)
  if (updated.title.trim() || updated.body.trim()) mirrorToObsidian(updated)
  return updated
}

export function deleteNote(problemId: string, noteId: string): void {
  const list = readList(problemId).filter((n) => n.id !== noteId)
  writeList(problemId, list)
}

// All notes for one problem, newest first. Skips empty entries.
export function listNotesForProblem(problemId: string): Note[] {
  return readList(problemId)
    .filter((n) => n.title.trim() || n.body.trim())
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

// All notes across all problems, newest first. Migrates any legacy keys
// encountered along the way.
export function listAllNotes(): Note[] {
  const out: Note[] = []
  try {
    const legacyIds: string[] = []
    const currentKeys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k) continue
      // Order matters: KEY_PREFIX ('patterns:notes:') is itself a
      // superstring of LEGACY_PREFIX ('patterns:note:'), so the
      // more-specific prefix has to be tested first or every current
      // key gets misclassified as a legacy key and never read.
      if (k.startsWith(KEY_PREFIX)) currentKeys.push(k)
      else if (k.startsWith(LEGACY_PREFIX)) legacyIds.push(k.slice(LEGACY_PREFIX.length))
    }
    for (const id of legacyIds) {
      migrateLegacyForProblem(id)
      const k = KEY(id)
      if (!currentKeys.includes(k)) currentKeys.push(k)
    }
    for (const k of currentKeys) {
      try {
        const raw = localStorage.getItem(k)
        if (!raw) continue
        const parsed = JSON.parse(raw) as unknown
        if (!Array.isArray(parsed)) continue
        for (const n of parsed as Note[]) {
          if (!n.title?.trim() && !n.body?.trim()) continue
          out.push(n)
        }
      } catch {
        // skip malformed
      }
    }
  } catch {
    // localStorage unavailable
  }
  out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  return out
}
