// Dev-only inbox bridge so Claude (running outside the browser) can queue
// notes that auto-appear in the user's Notes UI on next page load.
//
// Mechanism:
//   - Claude writes pending notes to `.dev-notes-inbox.json` at the repo root
//     as a JSON array of `{ problemId, title, body }`.
//   - On study-page mount, the client hits GET /api/dev-notes.
//   - This handler reads the inbox, truncates it to `[]`, and returns the
//     pending entries. Each note is therefore consumed exactly once.
//
// Hard gate: in production (NODE_ENV === 'production') every method returns
// 404 so this surface is impossible to misuse if the site is ever deployed.
//
// Note: this route handler has no `dynamic`/`revalidate` exports — under
// Next 16 GET handlers are dynamic by default, and Cache Components is not
// enabled here. The file read happens on each request.

import { promises as fs } from 'node:fs'
import path from 'node:path'

interface InboxEntry {
  problemId: string
  title: string
  body: string
}

const INBOX_PATH = path.join(process.cwd(), '.dev-notes-inbox.json')

function devOnlyGate(): Response | null {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 })
  }
  return null
}

async function readInbox(): Promise<InboxEntry[]> {
  let raw: string
  try {
    raw = await fs.readFile(INBOX_PATH, 'utf8')
  } catch (err: unknown) {
    // Missing file is fine — treat as empty inbox.
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return []
    throw err
  }
  const trimmed = raw.trim()
  if (!trimmed) return []
  const parsed: unknown = JSON.parse(trimmed)
  if (!Array.isArray(parsed)) return []
  // Shallow validation — drop anything that doesn't look like an InboxEntry.
  const out: InboxEntry[] = []
  for (const item of parsed) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const problemId = typeof rec['problemId'] === 'string' ? rec['problemId'] : null
    const title = typeof rec['title'] === 'string' ? rec['title'] : null
    const body = typeof rec['body'] === 'string' ? rec['body'] : null
    if (problemId === null || title === null || body === null) continue
    out.push({ problemId, title, body })
  }
  return out
}

async function clearInbox(): Promise<void> {
  await fs.writeFile(INBOX_PATH, '[]\n', 'utf8')
}

export async function GET(): Promise<Response> {
  const gate = devOnlyGate()
  if (gate) return gate
  try {
    const entries = await readInbox()
    if (entries.length > 0) await clearInbox()
    return Response.json({ notes: entries })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return Response.json({ error: message, notes: [] }, { status: 500 })
  }
}

export async function DELETE(): Promise<Response> {
  const gate = devOnlyGate()
  if (gate) return gate
  try {
    await clearInbox()
    return Response.json({ ok: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'unknown error'
    return Response.json({ error: message }, { status: 500 })
  }
}
