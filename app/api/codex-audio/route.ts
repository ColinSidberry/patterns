// Dev-only listing endpoint: returns the catalog of rendered chapters
// (filename, title, duration, size) so the /codex page can render a
// player per chapter without bundling fs reads into the React tree.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const CODEX_DIR = path.join(os.homedir(), 'Obsidian', '2. Codex')
const AUDIO_DIR = path.join(CODEX_DIR, 'audio')

function devOnlyGate(): Response | null {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 })
  }
  return null
}

interface ChapterListing {
  slug: string           // filename without .mp3, URL-safe
  title: string          // human-readable title (filename without .mp3)
  audioUrl: string       // GET path to stream
  sizeBytes: number
  modifiedAt: string     // ISO
  hasMarkdown: boolean   // whether the source .md file is still alongside
}

export async function GET(): Promise<Response> {
  const gate = devOnlyGate()
  if (gate) return gate

  let files: string[]
  try {
    files = await fs.readdir(AUDIO_DIR)
  } catch {
    return Response.json({ chapters: [], audioDir: AUDIO_DIR })
  }

  const mdFiles = await fs.readdir(CODEX_DIR).catch(() => [])
  const mdNames = new Set(mdFiles.filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)))

  const chapters: ChapterListing[] = []
  for (const f of files) {
    if (!f.endsWith('.mp3')) continue
    const base = f.slice(0, -4)
    const filepath = path.join(AUDIO_DIR, f)
    const stat = await fs.stat(filepath)
    chapters.push({
      slug: base,
      title: base,
      audioUrl: `/api/codex-audio/${encodeURIComponent(base)}`,
      sizeBytes: stat.size,
      modifiedAt: stat.mtime.toISOString(),
      hasMarkdown: mdNames.has(base),
    })
  }

  // Sort by chapter-number prefix if present (e.g., "Chapter 1 -", "Chapter 2 -"),
  // else alphabetically.
  chapters.sort((a, b) => {
    const ma = /^Chapter (\d+)/.exec(a.title)
    const mb = /^Chapter (\d+)/.exec(b.title)
    if (ma && mb) return parseInt(ma[1]!, 10) - parseInt(mb[1]!, 10)
    return a.title.localeCompare(b.title)
  })

  return Response.json({ chapters, audioDir: AUDIO_DIR })
}
