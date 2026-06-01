// Dev-only: returns the sentence-timestamps sidecar JSON for one chapter.
// Lives next to the MP3 in ~/Obsidian/2. Codex/audio/<chapter>.timestamps.json
// and is the source of truth for the reader UI's sentence highlighting.

import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const AUDIO_DIR = path.join(os.homedir(), 'Obsidian', '2. Codex', 'audio')

function devOnlyGate(): Response | null {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 })
  }
  return null
}

function safeFilename(raw: string): string {
  const decoded = decodeURIComponent(raw)
  return decoded.replace(/[^\w\s\-,.()&'—]/g, '')
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ chapter: string }> },
): Promise<Response> {
  const gate = devOnlyGate()
  if (gate) return gate

  const { chapter: rawChapter } = await params
  const chapter = safeFilename(rawChapter)
  const filename = chapter.endsWith('.timestamps.json')
    ? chapter
    : `${chapter}.timestamps.json`
  const filepath = path.join(AUDIO_DIR, filename)

  if (!filepath.startsWith(AUDIO_DIR + path.sep)) {
    return new Response('Forbidden', { status: 403 })
  }

  try {
    const raw = await fs.readFile(filepath, 'utf8')
    return new Response(raw, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
    })
  } catch {
    return new Response(
      JSON.stringify({
        error: `No timestamps for "${chapter}". Re-run scripts/render-chapter.mjs to generate.`,
      }),
      { status: 404, headers: { 'Content-Type': 'application/json' } },
    )
  }
}
