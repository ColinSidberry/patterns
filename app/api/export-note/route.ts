// Dev-only one-way mirror: writes a Patterns note as a markdown file into
// the user's Obsidian vault folder. Fired automatically from `lib/notes.ts`
// after every `appendNote` / `updateNote`. No-op (404) in production so
// this filesystem surface is impossible to hit on a deployed site.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import raw from '@/data/algo_monster_problems.json'

const OBSIDIAN_DIR = '/Users/colinsidberry/Obsidian/1. Source/Leetcode Study'

interface ExportBody {
  problemId: string
  noteId: string
  noteTitle: string
  body: string
  createdAt: string
}

interface ProblemEntry {
  id: string
  title?: string
}

function devOnlyGate(): Response | null {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 })
  }
  return null
}

// Make a string safe to use as a filename on macOS/Obsidian. Strips the
// reserved chars Obsidian rejects, collapses whitespace, trims.
function safeFilename(s: string): string {
  return s
    .replace(/[\/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
}

function formatMarkdown(input: ExportBody, problemTitle: string): string {
  const studyUrl = `http://localhost:3456/study/${input.problemId}`
  const title = input.noteTitle.trim() || '(untitled)'
  return `---
patterns_id: ${input.problemId}
patterns_title: ${JSON.stringify(problemTitle)}
note_id: ${input.noteId}
created: ${input.createdAt}
source: patterns
---

# ${title}

[Open in Patterns](${studyUrl})

${input.body}
`
}

export async function POST(req: Request): Promise<Response> {
  const gate = devOnlyGate()
  if (gate) return gate

  let body: ExportBody
  try {
    body = (await req.json()) as ExportBody
  } catch {
    return new Response('Invalid JSON body', { status: 400 })
  }
  if (!body.problemId || !body.noteId) {
    return new Response('Missing problemId or noteId', { status: 400 })
  }

  const entries = raw as ProblemEntry[]
  const problem = entries.find((p) => p.id === body.problemId)
  const problemTitle = problem?.title ?? body.problemId
  const noteTitle = body.noteTitle.trim() || '(untitled)'
  const filename = safeFilename(`${problemTitle} — ${noteTitle}.md`)
  const filepath = path.join(OBSIDIAN_DIR, filename)
  const md = formatMarkdown(body, problemTitle)

  try {
    await fs.mkdir(OBSIDIAN_DIR, { recursive: true })
    await fs.writeFile(filepath, md, 'utf8')
  } catch (err) {
    return new Response(`Write failed: ${(err as Error).message}`, { status: 500 })
  }
  return Response.json({ ok: true, path: filepath })
}
