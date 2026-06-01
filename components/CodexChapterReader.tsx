'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { CodeBlock } from './StudyViewer/CodeBlock'
import { QuestionRenderer } from './StudyViewer/QuestionRenderer'
import codexManifest from '@/lib/codex-manifest.json'

interface SentenceTimestamp {
  index: number
  text: string
  paragraphIndex: number
  startMs: number
  endMs: number
}

type Block =
  | { type: 'paragraph'; paragraphIndex: number; sentenceIndices: number[] }
  | { type: 'problem'; problemId: string; title: string; question: string }
  | { type: 'code'; lang: string; title: string | null; body: string }
  | {
      type: 'highlight'
      targetCodeBlockIndex: number   // index in the document blocks array
      startLine: number              // 1-indexed
      endLine: number                // 1-indexed inclusive
      title: string | null
    }

interface Section {
  id: string
  title: string
  startBlockIdx: number
  endBlockIdx: number
  startSentenceIdx: number | null
  endSentenceIdx: number | null
  startMs: number
  endMs: number
}

interface ChapterMeta {
  chapter: string
  engine: string
  voice: string
  rate: number
  totalDurationMs: number
  sentenceCount: number
  sentences: SentenceTimestamp[]
  blocks?: Block[]
  sections?: Section[]
  renderedAt: string
}

interface Props {
  slug: string
}

// Section IDs that start collapsed on a reader's first visit. The narrative
// spine (introduction, scene, closing) stays open by default so a new
// reader gets a coherent chapter without expanding anything; the Notes
// sections are dig-in material a returning reader opens as needed. Once
// the user toggles anything, their preference is persisted per slug.
const DEFAULT_COLLAPSED_SECTION_IDS = new Set([
  'framework',
  'app-1',
  'app-2',
  'app-3',
  'app-4',
  'thread',
])

function storageKey(slug: string) {
  return `codex-collapsed:${slug}`
}

function continuousStorageKey(slug: string) {
  return `codex-continuous:${slug}`
}

function formatDuration(ms: number): string {
  const totalSec = Math.round(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  if (m === 0) return `${s}s`
  if (s === 0) return `${m} min`
  return `${m}:${String(s).padStart(2, '0')}`
}

// Threshold for when an inline CODE block claims the companion panel:
// as soon as its top is anywhere in the viewport (or above), it's active.
// Eager — the user sees the code inline and the companion mirror at the
// same time, no delay.
const CODE_ACTIVE_VIEWPORT_FRAC = 1.0

// Threshold for when a HIGHLIGHT anchor activates: only when its anchor
// has scrolled up into the reading line (upper third of the viewport).
// Precise — prevents two adjacent highlights inside the same on-screen
// chunk of prose from both being "passed" at once. Without this, scrolling
// over a section with several closely-spaced highlights would just land on
// whichever is latest.
const HIGHLIGHT_ACTIVE_VIEWPORT_FRAC = 0.35

export function CodexChapterReader({ slug }: Props) {
  const [meta, setMeta] = useState<ChapterMeta | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentIndex, setCurrentIndex] = useState<number>(-1)
  const [playbackRate, setPlaybackRate] = useState(1)
  // Index into the `companionBlocks` array — which block is currently
  // mirrored in the sticky companion panel. The companion can display
  // either a problem card or a code block, in document order. -1 = nothing
  // pinned yet (shouldn't happen once any block exists; we default to 0).
  const [activeCompanionIdx, setActiveCompanionIdx] = useState<number>(-1)
  // Index into the `highlightsOrdered` array — which highlight range is
  // currently active. -1 = no highlight. Highlights only apply when the
  // active companion block is the code block they target.
  const [activeHighlightIdx, setActiveHighlightIdx] = useState<number>(-1)
  const audioRef = useRef<HTMLAudioElement>(null)
  const activeSentenceRef = useRef<HTMLSpanElement>(null)
  const userScrolledRef = useRef(false)
  // Track each inline companion-eligible element (problem card or code
  // figure) by its position in the ordered companion-blocks list, so the
  // scroll handler can read their viewport rects.
  const inlineCompanionRefs = useRef<Map<number, HTMLElement>>(new Map())
  // Anchor element for each highlight block (invisible 1px spacer placed
  // at the highlight's position in document flow). Same scroll tracking.
  const inlineHighlightRefs = useRef<Map<number, HTMLElement>>(new Map())
  // Refs to each section container so the TOC can scroll to one.
  const sectionRefs = useRef<Map<string, HTMLElement>>(new Map())

  // Collapse state per section, persisted per slug.
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') return new Set()
    try {
      const stored = window.localStorage.getItem(storageKey(slug))
      if (stored) return new Set(JSON.parse(stored) as string[])
    } catch {
      // bad JSON or missing localStorage — fall through
    }
    return new Set()
  })
  // True = audio plays end-to-end across sections (today's behavior).
  // False (default) = playing a section stops the audio at the section's
  // endMs. Toggle lives in the player bar; persisted per slug.
  const [continuousMode, setContinuousMode] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try {
      return window.localStorage.getItem(continuousStorageKey(slug)) === '1'
    } catch {
      return false
    }
  })
  // When set, the audio time-update handler pauses playback once the
  // current time crosses this. Cleared by user-initiated play (the audio
  // element's `play` event) since manual resume implies the user wants to
  // keep going.
  const stopAtMsRef = useRef<number | null>(null)
  // True once the chapter meta has loaded AND we've applied the per-slug
  // default-collapsed Notes sections (only on first visit, before any
  // localStorage has been written for this slug).
  const hasAppliedDefaultsRef = useRef(false)

  // Chapter assets live in Vercel Blob (public), keyed by slug in the committed
  // codex-manifest.json. This replaces the old dev-only /api/codex-audio routes
  // that read from the local Obsidian vault and 404'd on the deployed site.
  const manifestEntry = (codexManifest as Record<string, { audioUrl: string; timestampsUrl: string }>)[slug]
  const audioUrl = manifestEntry?.audioUrl ?? ''
  const timestampsUrl = manifestEntry?.timestampsUrl ?? ''

  // Fetch timestamps JSON on mount.
  useEffect(() => {
    void (async () => {
      try {
        if (!timestampsUrl) {
          throw new Error(`No published chapter for "${slug}".`)
        }
        const res = await fetch(timestampsUrl)
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error || `HTTP ${res.status}`)
        }
        const data: ChapterMeta = await res.json()
        setMeta(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    })()
  }, [timestampsUrl])

  // Block-tree for rendering (with backwards-compat fallback).
  const renderBlocks = useMemo<Block[]>(() => {
    if (!meta) return []
    if (meta.blocks && meta.blocks.length > 0) return meta.blocks
    const groups = new Map<number, number[]>()
    for (const s of meta.sentences) {
      if (!groups.has(s.paragraphIndex)) groups.set(s.paragraphIndex, [])
      groups.get(s.paragraphIndex)!.push(s.index)
    }
    return Array.from(groups.entries())
      .sort(([a], [b]) => a - b)
      .map(([paragraphIndex, sentenceIndices]) => ({
        type: 'paragraph' as const,
        paragraphIndex,
        sentenceIndices,
      }))
  }, [meta])

  const sentencesByIndex = useMemo(() => {
    if (!meta) return new Map<number, SentenceTimestamp>()
    return new Map(meta.sentences.map((s) => [s.index, s]))
  }, [meta])

  // The ordered list of "companion-eligible" blocks in document order:
  // problem cards AND code blocks. As the reader scrolls, the panel mirrors
  // whichever one is most-recently active. Before the first code block
  // is reached, the panel shows the problem card so the reader has the
  // question they're working on visible alongside the prose.
  type CompanionBlock = Extract<Block, { type: 'code' | 'problem' }>
  const companionBlocks = useMemo(() => {
    const out: Array<{ block: CompanionBlock; blockIndex: number }> = []
    renderBlocks.forEach((b, idx) => {
      if (b.type === 'code' || b.type === 'problem') {
        out.push({ block: b, blockIndex: idx })
      }
    })
    return out
  }, [renderBlocks])

  // Map from render-block index → position in companionBlocks. Used by the
  // inline-rendering loop to give each eligible block a stable ordinal that
  // matches what the scroll handler tracks.
  const companionOrdinalByBlockIndex = useMemo(() => {
    const m = new Map<number, number>()
    companionBlocks.forEach((c, i) => m.set(c.blockIndex, i))
    return m
  }, [companionBlocks])

  // Ordered highlight blocks. Each has a `blockIndex` for the inline
  // anchor's position and a `targetCodeBlockIndex` to look up which full
  // code block it targets.
  const highlightsOrdered = useMemo(() => {
    const out: Array<{ block: Extract<Block, { type: 'highlight' }>; blockIndex: number }> = []
    renderBlocks.forEach((b, idx) => {
      if (b.type === 'highlight') out.push({ block: b, blockIndex: idx })
    })
    return out
  }, [renderBlocks])

  // Drive currentIndex (sentence highlight) from audio.currentTime.
  useEffect(() => {
    if (!meta || !audioRef.current) return
    const audio = audioRef.current
    const sentences = meta.sentences

    function findIndexAt(timeMs: number): number {
      let lo = 0
      let hi = sentences.length - 1
      while (lo <= hi) {
        const mid = (lo + hi) >> 1
        const s = sentences[mid]!
        if (timeMs < s.startMs) hi = mid - 1
        else if (timeMs >= s.endMs) lo = mid + 1
        else return mid
      }
      if (timeMs >= sentences[sentences.length - 1]!.endMs) return sentences.length - 1
      return -1
    }

    const onTimeUpdate = () => {
      const idx = findIndexAt(audio.currentTime * 1000)
      setCurrentIndex((prev) => (prev === idx ? prev : idx))
    }
    audio.addEventListener('timeupdate', onTimeUpdate)
    return () => audio.removeEventListener('timeupdate', onTimeUpdate)
  }, [meta])

  // Apply playback rate.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = playbackRate
  }, [playbackRate])

  // Auto-scroll the active sentence into view (with user-overrides honored).
  // Re-runs on collapsedSections change so that when the auto-expand effect
  // opens a previously-collapsed section, the freshly-mounted active span
  // gets scrolled into view on the next pass.
  useEffect(() => {
    if (currentIndex < 0 || userScrolledRef.current) return
    const el = activeSentenceRef.current
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [currentIndex, collapsedSections])

  useEffect(() => {
    const onWheel = () => { userScrolledRef.current = true }
    const onKey = (e: KeyboardEvent) => {
      if (['PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        userScrolledRef.current = true
      }
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    window.addEventListener('touchmove', onWheel, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('wheel', onWheel)
      window.removeEventListener('touchmove', onWheel)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  // Companion-panel sync. A code block becomes "active" when its inline
  // element is in (or above) the upper portion of the viewport. Driven by
  // both window.scroll and the audio's own scrollIntoView calls (the latter
  // emits scroll events). Throttled to one update per animation frame.
  // Also tracks the active highlight range — the latest highlight whose
  // anchor is above the viewport threshold AND whose target code block is
  // the currently active companion code.
  useEffect(() => {
    if (companionBlocks.length === 0) return
    let raf = 0
    const recompute = () => {
      raf = 0
      const codeThreshold = window.innerHeight * CODE_ACTIVE_VIEWPORT_FRAC
      const highlightThreshold = window.innerHeight * HIGHLIGHT_ACTIVE_VIEWPORT_FRAC
      // Default to the FIRST companion block when there are any — keeps
      // the panel populated from the moment the chapter loads. In v2 this
      // is the problem card, which appears in the document before any code.
      let activeCompanion = companionBlocks.length > 0 ? 0 : -1
      for (let i = 0; i < companionBlocks.length; i++) {
        const el = inlineCompanionRefs.current.get(i)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.top <= codeThreshold) activeCompanion = i
        else break
      }
      // Active highlight: latest highlight whose anchor has scrolled past
      // the (tighter) highlight threshold AND whose target code block
      // matches the currently-active companion block. The "match" gate
      // prevents stale highlights from leaking into a section whose
      // companion is no longer the highlighted code block.
      const activeBlockIndex =
        activeCompanion >= 0 ? companionBlocks[activeCompanion]!.blockIndex : -1
      let activeHl = -1
      for (let i = 0; i < highlightsOrdered.length; i++) {
        const h = highlightsOrdered[i]!
        if (h.block.targetCodeBlockIndex !== activeBlockIndex) continue
        const el = inlineHighlightRefs.current.get(i)
        if (!el) continue
        const rect = el.getBoundingClientRect()
        if (rect.top <= highlightThreshold) activeHl = i
      }
      setActiveCompanionIdx((prev) => (prev === activeCompanion ? prev : activeCompanion))
      setActiveHighlightIdx((prev) => (prev === activeHl ? prev : activeHl))
    }
    const onChange = () => {
      if (raf) return
      raf = requestAnimationFrame(recompute)
    }
    // Run once after mount to catch initial positions.
    recompute()
    window.addEventListener('scroll', onChange, { passive: true })
    window.addEventListener('resize', onChange)
    return () => {
      if (raf) cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [companionBlocks, highlightsOrdered])

  // Sentence click → audio seek + re-enable auto-scroll.
  const handleSentenceClick = useCallback((s: SentenceTimestamp) => {
    if (!audioRef.current) return
    audioRef.current.currentTime = s.startMs / 1000
    userScrolledRef.current = false
    void audioRef.current.play().catch(() => { /* user gesture */ })
  }, [])

  // Ref-callback factory for inline companion-eligible elements (problem
  // cards + code <figure>s) — registers/unregisters by ordinal so the
  // scroll handler can find them.
  const setCompanionRef = useCallback((ordinal: number) => (el: HTMLElement | null) => {
    if (el) inlineCompanionRefs.current.set(ordinal, el)
    else inlineCompanionRefs.current.delete(ordinal)
  }, [])

  // Same factory for the (invisible) highlight anchor spacers.
  const setHighlightRef = useCallback((ordinal: number) => (el: HTMLElement | null) => {
    if (el) inlineHighlightRefs.current.set(ordinal, el)
    else inlineHighlightRefs.current.delete(ordinal)
  }, [])

  // Lookup: render-block index → highlight ordinal (for the inline anchor).
  const highlightOrdinalByBlockIndex = useMemo(() => {
    const m = new Map<number, number>()
    highlightsOrdered.forEach((h, i) => m.set(h.blockIndex, i))
    return m
  }, [highlightsOrdered])

  // Sections array. If the timestamps JSON predates the sectioning render
  // script, synthesize a single all-encompassing section so the rest of the
  // UI still functions.
  const sections = useMemo<Section[]>(() => {
    if (!meta) return []
    if (meta.sections && meta.sections.length > 0) return meta.sections
    return [{
      id: 'all',
      title: meta.chapter,
      startBlockIdx: 0,
      endBlockIdx: renderBlocks.length - 1,
      startSentenceIdx: 0,
      endSentenceIdx: Math.max(0, meta.sentences.length - 1),
      startMs: 0,
      endMs: meta.totalDurationMs,
    }]
  }, [meta, renderBlocks])

  // Grouping: each section gets the contiguous slice of blocks that falls in
  // its block-index range. Order is preserved.
  const sectionGroups = useMemo(() => {
    return sections.map((sec) => ({
      section: sec,
      blocks: renderBlocks
        .slice(sec.startBlockIdx, sec.endBlockIdx + 1)
        .map((block, i) => ({ block, blockIdx: sec.startBlockIdx + i })),
    }))
  }, [sections, renderBlocks])

  // Which section is currently playing (contains the active sentence)?
  const activeSectionId = useMemo<string | null>(() => {
    if (currentIndex < 0) return null
    for (const sec of sections) {
      if (sec.startSentenceIdx === null || sec.endSentenceIdx === null) continue
      if (currentIndex >= sec.startSentenceIdx && currentIndex <= sec.endSentenceIdx) {
        return sec.id
      }
    }
    return null
  }, [sections, currentIndex])

  // First visit only: apply default-collapsed Notes sections. We key off the
  // raw localStorage presence (not the state) so SSR/CSR initial-render
  // mismatches don't double-fire this.
  useEffect(() => {
    if (!meta || sections.length === 0) return
    if (hasAppliedDefaultsRef.current) return
    hasAppliedDefaultsRef.current = true
    try {
      if (window.localStorage.getItem(storageKey(slug))) return
    } catch {
      return
    }
    const defaults = sections
      .filter((s) => DEFAULT_COLLAPSED_SECTION_IDS.has(s.id))
      .map((s) => s.id)
    if (defaults.length > 0) setCollapsedSections(new Set(defaults))
  }, [meta, sections, slug])

  // Persist collapse state per slug.
  useEffect(() => {
    if (!hasAppliedDefaultsRef.current) return
    try {
      window.localStorage.setItem(storageKey(slug), JSON.stringify([...collapsedSections]))
    } catch {
      // localStorage full or disabled — non-fatal
    }
  }, [collapsedSections, slug])

  // Persist continuous-mode toggle per slug.
  useEffect(() => {
    try {
      window.localStorage.setItem(continuousStorageKey(slug), continuousMode ? '1' : '0')
    } catch {
      // non-fatal
    }
  }, [continuousMode, slug])

  // Stop-at-end logic: when stopAtMsRef is set and the audio time crosses
  // it, pause and clear. Separate from the highlight-driving timeupdate
  // effect to keep concerns isolated.
  useEffect(() => {
    if (!audioRef.current) return
    const audio = audioRef.current
    const onTimeUpdate = () => {
      const stop = stopAtMsRef.current
      if (stop === null) return
      if (audio.currentTime * 1000 >= stop) {
        audio.pause()
        stopAtMsRef.current = null
      }
    }
    audio.addEventListener('timeupdate', onTimeUpdate)
    return () => audio.removeEventListener('timeupdate', onTimeUpdate)
  }, [meta])

  // Auto-expand the active section if it's currently collapsed — otherwise
  // the user can't see the sentence highlights for prose that's actively
  // being read. Only triggers on activeSectionId transitions.
  useEffect(() => {
    if (!activeSectionId) return
    setCollapsedSections((prev) => {
      if (!prev.has(activeSectionId)) return prev
      const next = new Set(prev)
      next.delete(activeSectionId)
      return next
    })
  }, [activeSectionId])

  const toggleSection = useCallback((id: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const playSection = useCallback((sec: Section) => {
    if (!audioRef.current) return
    // Expand first so highlights are visible.
    setCollapsedSections((prev) => {
      if (!prev.has(sec.id)) return prev
      const next = new Set(prev)
      next.delete(sec.id)
      return next
    })
    audioRef.current.currentTime = sec.startMs / 1000
    // Set the stop AFTER the seek so we don't fire on a stale time.
    stopAtMsRef.current = continuousMode ? null : sec.endMs
    userScrolledRef.current = false
    void audioRef.current.play().catch(() => { /* user gesture */ })
  }, [continuousMode])

  const jumpToSection = useCallback((id: string) => {
    const el = sectionRefs.current.get(id)
    if (!el) return
    // Expand it on jump so the body is visible too.
    setCollapsedSections((prev) => {
      if (!prev.has(id)) return prev
      const next = new Set(prev)
      next.delete(id)
      return next
    })
    el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  const setSectionRef = useCallback((id: string) => (el: HTMLElement | null) => {
    if (el) sectionRefs.current.set(id, el)
    else sectionRefs.current.delete(id)
  }, [])

  // Toggling continuous mode ON also clears any pending stop — the user
  // wants to keep going. Toggling OFF leaves stopAtMs as-is (so if the user
  // then triggers a section play, it'll stop; otherwise no effect).
  const handleContinuousToggle = useCallback(() => {
    setContinuousMode((prev) => {
      const next = !prev
      if (next) stopAtMsRef.current = null
      return next
    })
  }, [])

  // Sentence click in a different section than the current stop point should
  // override the stop — the user is jumping somewhere intentionally. The
  // base handleSentenceClick is already defined; extend it to clear stop.
  const handleSentenceClickEx = useCallback((s: SentenceTimestamp) => {
    stopAtMsRef.current = null
    handleSentenceClick(s)
  }, [handleSentenceClick])

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="rounded-lg border border-red-900/40 bg-red-950/20 px-5 py-4 text-sm text-red-300">
          {error}
        </div>
      </div>
    )
  }
  if (!meta) {
    return (
      <div className="max-w-3xl mx-auto px-6 py-8">
        <p className="text-sm text-[#6c7086]">Loading chapter…</p>
      </div>
    )
  }

  const activeCompanionBlock =
    activeCompanionIdx >= 0 ? companionBlocks[activeCompanionIdx]?.block ?? null : null
  const activeCompanionBlockIndex =
    activeCompanionIdx >= 0 ? companionBlocks[activeCompanionIdx]?.blockIndex ?? -1 : -1
  const activeHighlight =
    activeHighlightIdx >= 0 ? highlightsOrdered[activeHighlightIdx]?.block ?? null : null
  // Only apply the highlight range if the active companion is a code block
  // AND it's the one the highlight targets. The scroll handler already
  // enforces this, but the belt-and-suspenders check guards against stale
  // state during transitions.
  const companionHighlightedLines =
    activeHighlight &&
    activeCompanionBlock?.type === 'code' &&
    activeHighlight.targetCodeBlockIndex === activeCompanionBlockIndex
      ? { startLine: activeHighlight.startLine, endLine: activeHighlight.endLine }
      : null

  const renderBlock = (block: Block, blockIdx: number) => {
    if (block.type === 'paragraph') {
      const sentences = block.sentenceIndices
        .map((i) => sentencesByIndex.get(i))
        .filter((s): s is SentenceTimestamp => !!s)
      return (
        <p key={`p-${block.paragraphIndex}`} className="mb-5 leading-[1.85] text-[15px]">
          {sentences.map((s, i) => {
            const isActive = s.index === currentIndex
            return (
              <span key={s.index}>
                <span
                  ref={isActive ? activeSentenceRef : null}
                  onClick={() => handleSentenceClickEx(s)}
                  className={`cursor-pointer rounded-sm transition-colors -mx-0.5 px-0.5 ${
                    isActive
                      ? 'bg-amber-500/25 text-[#cdd6f4]'
                      : 'hover:bg-[#1e1e2e] text-[#a6adc8] hover:text-[#cdd6f4]'
                  }`}
                  title={`${(s.startMs / 1000).toFixed(1)}s · click to jump`}
                >
                  {s.text}
                </span>
                {i < sentences.length - 1 ? ' ' : ''}
              </span>
            )
          })}
        </p>
      )
    }
    if (block.type === 'problem') {
      const ordinal = companionOrdinalByBlockIndex.get(blockIdx) ?? -1
      const isActiveInCompanion = ordinal === activeCompanionIdx
      return (
        <aside
          key={`problem-${blockIdx}`}
          ref={setCompanionRef(ordinal)}
          className={`my-6 rounded-xl border border-indigo-500/30 bg-indigo-950/20 px-5 py-4 transition-opacity ${
            isActiveInCompanion ? 'lg:opacity-50' : ''
          }`}
          title={isActiveInCompanion ? 'Also pinned in the side panel →' : undefined}
        >
          <div className="flex items-baseline gap-3 mb-2">
            <span className="text-[10px] uppercase tracking-widest text-indigo-300/80 font-semibold">
              The problem
            </span>
            <Link
              href={`/study/${block.problemId}`}
              className="ml-auto text-[11px] text-indigo-300 hover:text-indigo-200 transition-colors"
            >
              open in Patterns →
            </Link>
          </div>
          <h3 className="text-base font-semibold text-[#cdd6f4] mb-3">{block.title}</h3>
          <div className="text-[13px] text-[#a6adc8] leading-relaxed">
            <QuestionRenderer text={block.question} />
          </div>
        </aside>
      )
    }
    if (block.type === 'code') {
      const ordinal = companionOrdinalByBlockIndex.get(blockIdx) ?? -1
      const isActiveInCompanion = ordinal === activeCompanionIdx
      return (
        <figure
          key={`code-${blockIdx}`}
          ref={setCompanionRef(ordinal)}
          className={`my-6 transition-opacity ${
            isActiveInCompanion ? 'lg:opacity-50' : ''
          }`}
          title={isActiveInCompanion ? 'Also pinned in the side panel →' : undefined}
        >
          {block.title && (
            <figcaption className="text-[11px] uppercase tracking-widest text-[#6c7086] font-semibold mb-2 px-1">
              {block.title}
            </figcaption>
          )}
          <CodeBlock code={block.body} />
        </figure>
      )
    }
    if (block.type === 'highlight') {
      const ordinal = highlightOrdinalByBlockIndex.get(blockIdx) ?? -1
      return (
        <div
          key={`highlight-${blockIdx}`}
          ref={setHighlightRef(ordinal)}
          aria-hidden="true"
          data-title={block.title ?? ''}
          data-lines={`${block.startLine}-${block.endLine}`}
          className="h-px -my-px"
        />
      )
    }
    return null
  }

  return (
    <>
      {/* Sticky audio bar */}
      <div className="sticky top-[49px] z-10 border-b border-[#313244] bg-[#181825]/95 backdrop-blur">
        <div className="max-w-3xl mx-auto px-6 py-3 flex items-center gap-3 flex-wrap">
          <audio
            ref={audioRef}
            controls
            preload="metadata"
            src={audioUrl}
            className="flex-1 min-w-[260px] h-9"
          >
            Your browser does not support the audio element.
          </audio>
          <div className="flex items-center gap-1.5 text-xs">
            {[0.85, 1, 1.15, 1.3, 1.5, 1.75, 2].map((r) => (
              <button
                key={r}
                onClick={() => setPlaybackRate(r)}
                className={`px-1.5 py-0.5 rounded border transition-colors tabular-nums ${
                  playbackRate === r
                    ? 'bg-indigo-600/30 border-indigo-500/60 text-indigo-200'
                    : 'bg-[#181825] border-[#313244] text-[#6c7086] hover:text-[#a6adc8] hover:border-[#45475a]'
                }`}
              >
                {r}×
              </button>
            ))}
          </div>
          <button
            onClick={handleContinuousToggle}
            className={`px-2 py-0.5 rounded border text-[11px] transition-colors ${
              continuousMode
                ? 'bg-emerald-600/25 border-emerald-500/50 text-emerald-200'
                : 'bg-[#181825] border-[#313244] text-[#6c7086] hover:text-[#a6adc8] hover:border-[#45475a]'
            }`}
            title={
              continuousMode
                ? 'Continuous: audio plays end-to-end across sections.'
                : 'Sectioned: a section play stops at that section’s end. Click to play through.'
            }
          >
            {continuousMode ? 'continuous' : 'sectioned'}
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:flex lg:gap-8 lg:px-8">
        <article className="max-w-3xl mx-auto lg:mx-0 lg:flex-1 min-w-0 py-10 text-[#cdd6f4]">
          {sectionGroups.map(({ section, blocks }) => {
            const isCollapsed = collapsedSections.has(section.id)
            const isActive = section.id === activeSectionId
            const durationMs = section.endMs - section.startMs
            return (
              <section
                key={section.id}
                ref={setSectionRef(section.id)}
                id={`section-${section.id}`}
                className={`mb-6 rounded-xl border transition-colors ${
                  isActive
                    ? 'border-amber-500/40 bg-[#1e1e2e]/40'
                    : 'border-[#313244] bg-transparent'
                }`}
              >
                <div className="flex items-center gap-3 px-5 py-3">
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="flex items-baseline gap-3 flex-1 min-w-0 text-left group"
                    aria-expanded={!isCollapsed}
                    aria-controls={`section-body-${section.id}`}
                  >
                    <span
                      className={`inline-block w-3 text-[10px] text-[#6c7086] group-hover:text-[#a6adc8] transition-transform ${
                        isCollapsed ? '' : 'rotate-90'
                      }`}
                      aria-hidden
                    >
                      ▶
                    </span>
                    <h2 className="text-sm font-semibold text-[#cdd6f4] truncate">
                      {section.title}
                    </h2>
                    <span className="text-[11px] text-[#6c7086] tabular-nums shrink-0">
                      {formatDuration(durationMs)}
                    </span>
                  </button>
                  <button
                    onClick={() => playSection(section)}
                    className="text-[11px] px-2 py-0.5 rounded border border-[#45475a] text-[#a6adc8] hover:text-[#cdd6f4] hover:border-amber-500/50 hover:bg-amber-500/10 transition-colors shrink-0"
                    title={
                      continuousMode
                        ? 'Play from this section (continuous mode is on, so audio will keep going past the end)'
                        : 'Play just this section — audio stops at the end'
                    }
                  >
                    ▶ play
                  </button>
                </div>
                {!isCollapsed && (
                  <div
                    id={`section-body-${section.id}`}
                    className="px-5 pb-5 pt-1 border-t border-[#313244]/60"
                  >
                    {blocks.map(({ block, blockIdx }) => renderBlock(block, blockIdx))}
                  </div>
                )}
              </section>
            )
          })}
        </article>

        {/* Sticky companion (desktop only). Mirrors whichever inline code
            block is currently in play. */}
        <aside className="hidden lg:block lg:w-[440px] lg:shrink-0 py-10">
          <div
            className="sticky top-[120px] overflow-y-auto"
            style={{ maxHeight: 'calc(100vh - 140px)' }}
          >
            {activeCompanionBlock?.type === 'code' && (
              <div className="transition-opacity">
                <div className="flex items-baseline gap-2 mb-2 px-1">
                  <span className="text-[10px] uppercase tracking-widest text-amber-300/80 font-semibold">
                    In play
                  </span>
                  {activeCompanionBlock.title && (
                    <span className="text-[11px] text-[#a6adc8] truncate">
                      {activeCompanionBlock.title}
                    </span>
                  )}
                  {activeHighlight && companionHighlightedLines && (
                    <span className="ml-auto text-[10px] text-amber-300/80 italic truncate">
                      {activeHighlight.title || `lines ${activeHighlight.startLine}–${activeHighlight.endLine}`}
                    </span>
                  )}
                </div>
                <CodeBlock
                  code={activeCompanionBlock.body}
                  highlightedLines={companionHighlightedLines}
                />
              </div>
            )}
            {activeCompanionBlock?.type === 'problem' && (
              <div className="transition-opacity">
                <div className="flex items-baseline gap-2 mb-2 px-1">
                  <span className="text-[10px] uppercase tracking-widest text-indigo-300/80 font-semibold">
                    The problem
                  </span>
                  <span className="text-[11px] text-[#a6adc8] truncate">
                    {activeCompanionBlock.title}
                  </span>
                  <Link
                    href={`/study/${activeCompanionBlock.problemId}`}
                    className="ml-auto text-[10px] text-indigo-300 hover:text-indigo-200 transition-colors"
                  >
                    open →
                  </Link>
                </div>
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-950/20 px-4 py-3 text-[12px] text-[#a6adc8] leading-relaxed">
                  <QuestionRenderer text={activeCompanionBlock.question} />
                </div>
              </div>
            )}
            {!activeCompanionBlock && (
              <div className="rounded-lg border border-dashed border-[#313244] bg-[#181825]/40 px-4 py-6 text-[11px] text-[#6c7086] italic text-center">
                Content will appear here as the chapter reaches each section.
              </div>
            )}
          </div>
        </aside>
      </div>
    </>
  )
}
