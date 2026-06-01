'use client'

import { useEffect, useState } from 'react'

interface ChapterListing {
  slug: string
  title: string
  audioUrl: string
  sizeBytes: number
  modifiedAt: string
  hasMarkdown: boolean
}

function formatMB(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const now = Date.now()
  const diff = Math.max(0, now - then) / 1000
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function CodexReader() {
  const [chapters, setChapters] = useState<ChapterListing[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch('/api/codex-audio')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setChapters(data.chapters || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })()
  }, [])

  if (error) {
    return (
      <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-5 py-4 text-sm text-red-300">
        Failed to load chapters: {error}
      </div>
    )
  }

  if (chapters === null) {
    return <p className="text-sm text-[#6c7086]">Loading chapters…</p>
  }

  if (chapters.length === 0) {
    return (
      <div className="rounded-lg border border-[#313244] bg-[#1e1e2e] px-6 py-10 text-center">
        <p className="text-[#cdd6f4] mb-2">No chapters rendered yet.</p>
        <p className="text-sm text-[#6c7086] mb-4">
          Drop a chapter markdown file in <span className="font-mono">~/Obsidian/2. Codex/</span> and run:
        </p>
        <pre className="text-xs text-[#a6adc8] bg-[#181825] border border-[#313244] rounded-md px-4 py-3 inline-block text-left">
          node scripts/render-chapter.mjs &quot;Chapter 1 - …​.md&quot;
        </pre>
      </div>
    )
  }

  return (
    <ul className="flex flex-col gap-4">
      {chapters.map((c) => (
        <ChapterRow key={c.slug} chapter={c} />
      ))}
    </ul>
  )
}

function ChapterRow({ chapter }: { chapter: ChapterListing }) {
  const [rate, setRate] = useState(1)

  return (
    <li className="rounded-xl border border-[#313244] bg-[#1e1e2e] px-5 py-4">
      <div className="flex items-baseline gap-3 mb-3">
        <a
          href={`/codex/${encodeURIComponent(chapter.slug)}`}
          className="text-base font-semibold text-[#cdd6f4] hover:text-indigo-300 transition-colors flex-1"
        >
          {chapter.title}
        </a>
        <a
          href={`/codex/${encodeURIComponent(chapter.slug)}`}
          className="text-[11px] text-indigo-300 hover:text-indigo-200 transition-colors"
        >
          read →
        </a>
        <span className="text-[10px] font-mono text-[#6c7086]">{formatMB(chapter.sizeBytes)}</span>
        <span className="text-[10px] text-[#6c7086]">{formatRelative(chapter.modifiedAt)}</span>
      </div>
      <audio
        controls
        preload="metadata"
        src={chapter.audioUrl}
        onLoadedMetadata={(e) => {
          // Apply current playback rate when the audio element loads.
          ;(e.currentTarget as HTMLAudioElement).playbackRate = rate
        }}
        ref={(el) => {
          // Keep playbackRate in sync if user toggles the speed.
          if (el) el.playbackRate = rate
        }}
        className="w-full"
      >
        Your browser does not support the audio element.
      </audio>
      <div className="flex items-center gap-2 mt-3 text-xs">
        <span className="text-[#6c7086]">Speed</span>
        {[0.85, 1, 1.15, 1.3, 1.5, 1.75, 2].map((r) => (
          <button
            key={r}
            onClick={() => setRate(r)}
            className={`px-2 py-0.5 rounded-md border transition-colors tabular-nums ${
              rate === r
                ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-200'
                : 'bg-[#181825] border-[#313244] text-[#6c7086] hover:text-[#a6adc8] hover:border-[#45475a]'
            }`}
          >
            {r}×
          </button>
        ))}
        <a
          href={chapter.audioUrl}
          download={`${chapter.slug}.mp3`}
          className="ml-auto text-[#6c7086] hover:text-indigo-300 transition-colors"
          title="Download for offline / phone playback"
        >
          ↓ download
        </a>
      </div>
    </li>
  )
}
