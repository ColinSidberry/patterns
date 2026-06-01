// Dev-only streaming route for Codex chapter MP3s. Reads the file from
// ~/Obsidian/2. Codex/audio/<chapter>.mp3 and streams it back with the
// right headers so HTML5 <audio> can scrub it.
//
// Hard gate: 404 in production. The route exists purely to serve audio
// files that live outside the repo (in Obsidian) so they're sharable
// between the on-the-go listening experience and the in-app reader
// without duplicating the bytes or putting them in git.

import { promises as fs } from 'node:fs'
import { createReadStream, statSync } from 'node:fs'
import path from 'node:path'
import os from 'node:os'

const AUDIO_DIR = path.join(os.homedir(), 'Obsidian', '2. Codex', 'audio')

function devOnlyGate(): Response | null {
  if (process.env.NODE_ENV === 'production') {
    return new Response('Not Found', { status: 404 })
  }
  return null
}

// Strip any path traversal attempts (../, leading slashes, etc.) — the
// client passes a chapter slug, never a directory walk.
function safeFilename(raw: string): string {
  const decoded = decodeURIComponent(raw)
  // Allow alphanumerics, spaces, dashes, commas, periods, parens, em-dashes,
  // and ampersands — everything a chapter title might reasonably contain.
  return decoded.replace(/[^\w\s\-,.()&'—]/g, '')
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ chapter: string }> },
): Promise<Response> {
  const gate = devOnlyGate()
  if (gate) return gate

  const { chapter: rawChapter } = await params
  const chapter = safeFilename(rawChapter)
  const filename = chapter.endsWith('.mp3') ? chapter : `${chapter}.mp3`
  const filepath = path.join(AUDIO_DIR, filename)

  // Confirm the resolved path is actually inside AUDIO_DIR (belt + suspenders
  // against weird decoding).
  if (!filepath.startsWith(AUDIO_DIR + path.sep)) {
    return new Response('Forbidden', { status: 403 })
  }

  let stat
  try {
    stat = await fs.stat(filepath)
  } catch {
    return new Response(`No audio rendered for "${chapter}". Run scripts/render-chapter.mjs first.`, {
      status: 404,
    })
  }

  // Range request support so the <audio> element can seek.
  const range = req.headers.get('range')
  if (range) {
    const match = /bytes=(\d+)-(\d*)/.exec(range)
    if (match) {
      const start = parseInt(match[1]!, 10)
      const end = match[2] ? parseInt(match[2], 10) : stat.size - 1
      const chunkSize = end - start + 1
      const stream = createReadStream(filepath, { start, end })
      return new Response(stream as unknown as ReadableStream, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${stat.size}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'no-store',
        },
      })
    }
  }

  // Full-file response.
  void statSync   // keep import warm if Next tree-shakes the streaming path
  const stream = createReadStream(filepath)
  return new Response(stream as unknown as ReadableStream, {
    headers: {
      'Content-Length': String(stat.size),
      'Content-Type': 'audio/mpeg',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'no-store',
    },
  })
}

// Lightweight listing endpoint — the /codex page hits this to discover
// available chapters without bundling the filesystem read into the page
// component.
// Re-exporting under the same route file is awkward in Next 16 / App
// Router; the listing endpoint lives at /api/codex-audio (no [chapter]
// segment) in its own file.
