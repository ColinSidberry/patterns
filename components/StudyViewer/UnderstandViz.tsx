'use client'

// Renders the Understand prose with hover-aware inline-code spans wired
// to the shared TraceContext. Hovering an anchor advances the shared
// step (and only the pointer that anchor controls) — the visual + the
// debugger both update in lockstep.
//
// Two render modes:
//   - With anchors: the parent should also render <ArrayPointersViz/>
//     somewhere (typically inside the Reference Solution panel) using
//     the same context. Stepping in the debugger reflects here too.
//   - Without anchors: prose-only.

import React, { useMemo, useState } from 'react'
import type { VizAnchor, VizConfig } from '@/data/algo-monster-types'
import type { ArrayFrame, GridBfsFrame, LinkedListFrame } from '@/lib/runner/vizFrames'
import { useTrace } from './TraceProvider'
import { ArrayPointersViz } from './ArrayPointersViz'
import { LinkedListPointersViz } from './LinkedListPointersViz'
import { GridBfsViz } from './GridBfsViz'

interface Props {
  text: string
  vizConfig: VizConfig
}

type AnyFrame = ArrayFrame | LinkedListFrame | GridBfsFrame

function isGridFrame(f: AnyFrame): f is GridBfsFrame {
  return (f as GridBfsFrame).kind === 'grid-bfs'
}

function isArrayFrame(f: AnyFrame): f is ArrayFrame {
  // Linked-list frames have `nodes`; grid frames have `kind`. Array frames
  // are the only one with `cells` and no `kind`.
  return 'cells' in f && !('kind' in f)
}

function pointersControlled(phrase: string, allPointerNames: string[]): string[] {
  for (const name of allPointerNames) {
    if (phrase === name) return [name]
    if (phrase.startsWith(name + '=')) return [name]
  }
  return allPointerNames
}

function buildAnchorLookup(anchors: VizAnchor[] | undefined): Map<string, number> {
  const m = new Map<string, number>()
  if (!anchors) return m
  for (const a of anchors) {
    const occ = a.occurrence ?? 1
    m.set(`${a.phrase}::${occ}`, a.step)
  }
  return m
}

export function UnderstandViz({ text, vizConfig }: Props) {
  const trace = useTrace()
  // Grid-bfs configs have no `pointers` field — its pointer-equivalents are
  // `cellPointers` (2D, label-based, no per-pointer hover semantics in v1).
  // For pointersControlled, an empty list means every hover is full-sync,
  // which is exactly the right behavior for grid coordinate phrases.
  const allPointerNames = useMemo(
    () => vizConfig.type === 'grid-bfs' ? [] : vizConfig.pointers.map((p) => p.from),
    [vizConfig]
  )
  const anchorLookup = useMemo(
    () => buildAnchorLookup(vizConfig.anchors),
    [vizConfig.anchors]
  )
  const [lastHoveredKey, setLastHoveredKey] = useState<string | null>(null)

  const onHover = (phrase: string, occurrence: number) => {
    const key = `${phrase}::${occurrence}`
    const step = anchorLookup.get(key)
    if (step === undefined) return
    setLastHoveredKey(key)
    const controlled = pointersControlled(phrase, allPointerNames)
    trace.stepToWithPointers(step, controlled)
  }

  const total = trace.snapshots.length

  return (
    <div
      className="flex flex-col gap-4"
      data-trace-root="understand"
      data-current-step={trace.currentStep}
      data-total-steps={total}
      data-trace-status={trace.status.kind}
    >
      <UnderstandMarkdown
        text={text}
        anchorLookup={anchorLookup}
        activeKey={lastHoveredKey}
        onHover={onHover}
      />
      {/* Centered visual right under the prose. Same shared frame as the
          one in the Reference Solution panel — stepping in either place
          updates both. */}
      {trace.frame && (
        <div className="flex justify-center">
          {isGridFrame(trace.frame) ? (
            <GridBfsViz frame={trace.frame} />
          ) : isArrayFrame(trace.frame) ? (
            <ArrayPointersViz frame={trace.frame} />
          ) : (
            <LinkedListPointersViz frame={trace.frame} />
          )}
        </div>
      )}
      {/* Step controls — operate on the same shared step state, so the
          debugger's view and any anchor highlights stay in sync. */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 flex-wrap">
          {trace.fnTests.map((_, i) => (
            <button
              key={i}
              onClick={() => trace.setActiveTest(i)}
              className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
                i === trace.activeTest
                  ? 'bg-indigo-900/40 border-indigo-500 text-indigo-200'
                  : 'bg-[#181825] border-[#313244] text-[#a6adc8] hover:border-[#45475a]'
              }`}
            >
              Test {i + 1}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {trace.status.kind === 'loading' && (
            <span className="text-xs text-[#6c7086] italic">tracing…</span>
          )}
          {trace.status.kind === 'error' && (
            <span className="text-xs text-orange-400" title={trace.status.message}>
              ⚠ {trace.status.message.slice(0, 40)}
            </span>
          )}
          {trace.status.kind === 'ready' && total > 0 && (
            <span className="text-xs text-[#6c7086] font-mono tabular-nums">
              step {trace.currentStep + 1} / {total}
            </span>
          )}
          <button
            onClick={() => trace.stepTo(Math.max(0, trace.currentStep - 1))}
            disabled={trace.status.kind !== 'ready' || trace.currentStep === 0}
            className={`text-sm px-2.5 py-1 rounded-md border transition-colors ${
              trace.status.kind !== 'ready' || trace.currentStep === 0
                ? 'bg-[#181825] border-[#313244] text-[#45475a] cursor-not-allowed'
                : 'bg-[#181825] border-[#313244] text-[#cdd6f4] hover:border-indigo-500/50'
            }`}
            aria-label="Previous step"
          >
            ←
          </button>
          <button
            onClick={() => trace.stepTo(Math.min(total - 1, trace.currentStep + 1))}
            disabled={trace.status.kind !== 'ready' || trace.currentStep >= total - 1}
            className={`text-sm px-2.5 py-1 rounded-md border transition-colors ${
              trace.status.kind !== 'ready' || trace.currentStep >= total - 1
                ? 'bg-[#181825] border-[#313244] text-[#45475a] cursor-not-allowed'
                : 'bg-[#181825] border-[#313244] text-[#cdd6f4] hover:border-indigo-500/50'
            }`}
            aria-label="Next step"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Markdown with anchor wrapping ────────────────────────────────────────

interface UnderstandMarkdownProps {
  text: string
  anchorLookup: Map<string, number>
  activeKey: string | null
  onHover: (phrase: string, occurrence: number) => void
}

function UnderstandMarkdown({ text, anchorLookup, activeKey, onHover }: UnderstandMarkdownProps) {
  const counter = new Map<string, number>()
  const paragraphs = text.split(/\n\s*\n/)
  return (
    <div className="flex flex-col gap-4">
      {paragraphs.map((para, i) => (
        <p key={i} className="text-[15px] text-[#cdd6f4] leading-relaxed">
          {renderInlineWithAnchors(para.trim(), `p${i}`, counter, anchorLookup, activeKey, onHover)}
        </p>
      ))}
    </div>
  )
}

function renderInlineWithAnchors(
  s: string,
  key: string,
  counter: Map<string, number>,
  anchorLookup: Map<string, number>,
  activeKey: string | null,
  onHover: (phrase: string, occurrence: number) => void
): React.ReactNode {
  const lines = s.split('\n')
  return lines.map((line, li) => (
    <React.Fragment key={`${key}-l${li}`}>
      {li > 0 && <br />}
      {tokenize(line).map((tok, ti) => {
        const k = `${key}-l${li}-t${ti}`
        if (tok.t === 'code') {
          const occ = (counter.get(tok.v) ?? 0) + 1
          counter.set(tok.v, occ)
          const anchorKey = `${tok.v}::${occ}`
          const isAnchor = anchorLookup.has(anchorKey)
          const isActive = activeKey === anchorKey
          if (isAnchor) {
            return (
              <code
                key={k}
                onMouseEnter={() => onHover(tok.v, occ)}
                data-anchor-key={anchorKey}
                data-anchor-active={isActive ? 'true' : 'false'}
                className={`px-1 py-0.5 rounded font-mono text-[0.9em] cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-indigo-900/50 text-indigo-100 ring-2 ring-indigo-400/60'
                    : 'bg-[#181825] text-[#f5c2e7] hover:bg-indigo-900/30 hover:text-indigo-200'
                }`}
              >
                {tok.v}
              </code>
            )
          }
          return (
            <code
              key={k}
              className="px-1 py-0.5 rounded bg-[#181825] text-[#f5c2e7] font-mono text-[0.9em]"
            >
              {tok.v}
            </code>
          )
        }
        if (tok.t === 'bold') {
          return <strong key={k} className="font-semibold text-[#e2e8f0]">{tok.v}</strong>
        }
        if (tok.t === 'italic') {
          return <em key={k} className="italic">{tok.v}</em>
        }
        return <React.Fragment key={k}>{tok.v}</React.Fragment>
      })}
    </React.Fragment>
  ))
}

type Token =
  | { t: 'text'; v: string }
  | { t: 'code'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'italic'; v: string }

function tokenize(s: string): Token[] {
  const out: Token[] = []
  const re = /(`[^`\n]+`)|(\*\*[^*\n]+\*\*)|(\*[^*\n]+\*)/g
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(s)) !== null) {
    if (m.index > last) out.push({ t: 'text', v: s.slice(last, m.index) })
    const piece = m[0]
    if (piece.startsWith('`')) out.push({ t: 'code', v: piece.slice(1, -1) })
    else if (piece.startsWith('**')) out.push({ t: 'bold', v: piece.slice(2, -2) })
    else out.push({ t: 'italic', v: piece.slice(1, -1) })
    last = m.index + piece.length
  }
  if (last < s.length) out.push({ t: 'text', v: s.slice(last) })
  return out
}
