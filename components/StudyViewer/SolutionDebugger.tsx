'use client'

// Step-through debugger for the Reference Solution accordion. Driven by
// the shared TraceContext — same trace + step state that the
// UnderstandViz uses, so stepping in one reflects in the other.
//
// The CodePanel is where line highlighting + per-line var pinning happens.
// The control bar at the bottom has the test selector + step nav.

import { useEffect, useMemo } from 'react'
import { tokenizeLine, TOKEN_COLORS, OPERATOR_LETTER_SPACING } from '@/lib/tokenize'
import type { Snapshot } from '@/lib/runner/traceTypes'
import { useTrace } from './TraceProvider'
import { CopyButton } from './CopyButton'
import { buildCopyTemplate } from '@/lib/copyTemplate'

interface Props {
  code: string
  problemId: string
  paramNames?: string[]
  slotLabels?: Record<number, string>
}

const MY_CODE_STORAGE_PREFIX = 'patterns:code:'

function readMyCode(problemId: string): string {
  try {
    return localStorage.getItem(MY_CODE_STORAGE_PREFIX + problemId) ?? ''
  } catch {
    return ''
  }
}

interface Pin {
  name: string
  line: number
  value: string
}

function computePinsPerStep(snapshots: Snapshot[]): Pin[][] {
  const result: Pin[][] = []
  let prev: Map<string, Pin> = new Map()
  for (const snap of snapshots) {
    const next = new Map<string, Pin>()
    for (const [name, value] of Object.entries(snap.vars)) {
      const old = prev.get(name)
      if (old && old.value === value) {
        next.set(name, old)
      } else {
        next.set(name, { name, line: snap.line, value })
      }
    }
    result.push([...next.values()])
    prev = next
  }
  return result
}

export function SolutionDebugger({ code, problemId, paramNames, slotLabels }: Props) {
  const trace = useTrace()
  const { snapshots, status, fnTests, activeTest, setActiveTest, currentStep, stepTo } = trace

  const pinsPerStep = useMemo(() => computePinsPerStep(snapshots), [snapshots])
  const fnSignatureLine = useMemo(() => {
    const lines = code.split('\n')
    for (let i = 0; i < lines.length; i++) {
      const ln = lines[i]
      if (/^\s*function\s+\w+/.test(ln) || /\w+\s*=\s*function/.test(ln) || /\w+\s*=\s*\(.*\)\s*=>/.test(ln)) {
        return i + 1
      }
    }
    return 1
  }, [code])

  // Keyboard nav: ←/→
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (status.kind !== 'ready' || snapshots.length === 0) return
      const t = e.target as HTMLElement | null
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        stepTo(Math.min(snapshots.length - 1, currentStep + 1))
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        stepTo(Math.max(0, currentStep - 1))
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [status, snapshots.length, currentStep, stepTo])

  if (fnTests.length === 0) {
    return (
      <CodePanel
        code={code}
        slotLabels={slotLabels}
        activeLine={null}
        pinsByLine={new Map()}
      >
        <div className="px-4 py-2 border-t border-[#313244] bg-[#1e1e2e] text-xs text-[#6c7086] italic">
          Step-through unavailable — class-style tests not yet supported.
        </div>
      </CodePanel>
    )
  }

  const current = snapshots[currentStep] ?? null
  const activeLine = current?.line ?? null
  const total = snapshots.length

  // Bucket pins by line. Function parameters get re-homed to the
  // signature line; everything else stays on the line where it was last
  // assigned (already computed by computePinsPerStep).
  const paramNameSet = new Set(paramNames ?? [])
  const pinsByLine = new Map<number, Pin[]>()
  const pins = pinsPerStep[currentStep] ?? []
  for (const p of pins) {
    const targetLine = paramNameSet.has(p.name) ? fnSignatureLine : p.line
    const arr = pinsByLine.get(targetLine) ?? []
    arr.push(p)
    pinsByLine.set(targetLine, arr)
  }

  return (
    <CodePanel
      code={code}
      slotLabels={slotLabels}
      activeLine={activeLine}
      pinsByLine={pinsByLine}
    >
      <div className="px-3 py-2 border-t border-[#313244] bg-[#1e1e2e] flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 flex-wrap">
          {fnTests.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveTest(i)}
              className={`text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
                i === activeTest
                  ? 'bg-indigo-900/40 border-indigo-500 text-indigo-200'
                  : 'bg-[#181825] border-[#313244] text-[#a6adc8] hover:border-[#45475a]'
              }`}
            >
              Test {i + 1}
            </button>
          ))}
          <CopyButton text={() => buildCopyTemplate(readMyCode(problemId), code)} label="Copy" />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {status.kind === 'loading' && (
            <span className="text-xs text-[#6c7086] italic">tracing…</span>
          )}
          {status.kind === 'error' && (
            <span className="text-xs text-orange-400" title={status.message}>
              ⚠ {status.message.slice(0, 40)}{status.message.length > 40 ? '…' : ''}
            </span>
          )}
          {status.kind === 'ready' && total > 0 && (
            <span className="text-xs text-[#6c7086] font-mono tabular-nums">
              step {currentStep + 1} / {total}
            </span>
          )}
          <button
            onClick={() => stepTo(Math.max(0, currentStep - 1))}
            disabled={status.kind !== 'ready' || currentStep === 0}
            className={`text-sm px-2.5 py-1 rounded-md border transition-colors ${
              status.kind !== 'ready' || currentStep === 0
                ? 'bg-[#181825] border-[#313244] text-[#45475a] cursor-not-allowed'
                : 'bg-[#181825] border-[#313244] text-[#cdd6f4] hover:border-indigo-500/50'
            }`}
            aria-label="Previous step"
          >
            ←
          </button>
          <button
            onClick={() => stepTo(Math.min(total - 1, currentStep + 1))}
            disabled={status.kind !== 'ready' || currentStep >= total - 1}
            className={`text-sm px-2.5 py-1 rounded-md border transition-colors ${
              status.kind !== 'ready' || currentStep >= total - 1
                ? 'bg-[#181825] border-[#313244] text-[#45475a] cursor-not-allowed'
                : 'bg-[#181825] border-[#313244] text-[#cdd6f4] hover:border-indigo-500/50'
            }`}
            aria-label="Next step"
          >
            →
          </button>
        </div>
      </div>
    </CodePanel>
  )
}

function CodePanel({
  code, slotLabels, activeLine, pinsByLine, children,
}: {
  code: string
  slotLabels?: Record<number, string>
  activeLine: number | null
  pinsByLine: Map<number, Pin[]>
  children?: React.ReactNode
}) {
  const lines = code.split('\n')
  const hasSlots = slotLabels && Object.keys(slotLabels).length > 0

  return (
    <div
      className="rounded-lg overflow-hidden border border-[#313244] bg-[#181825]"
      data-debugger-root="solution"
      {...(activeLine !== null && { 'data-debugger-active-line': activeLine })}
    >
      <div className="font-mono text-[13px] text-[#cdd6f4] overflow-x-auto">
        <div style={{ minWidth: '100%', width: 'max-content', position: 'relative' }}>
          {hasSlots && (
            <div
              aria-hidden
              style={{
                position: 'absolute',
                left: 73,
                top: 0,
                bottom: 0,
                width: 1,
                backgroundColor: '#313244',
                pointerEvents: 'none',
              }}
            />
          )}
          {lines.map((line, i) => {
            const lineNum = i + 1
            const isActive = activeLine === lineNum
            const linePins = pinsByLine.get(lineNum)
            const slotLabel = slotLabels?.[lineNum]
            return (
              <div
                key={i}
                className="flex items-start"
                data-line-number={lineNum}
                {...(isActive && { 'data-active-line': lineNum })}
                style={{
                  backgroundColor: isActive ? '#2a2d4a' : 'transparent',
                  transition: 'background-color 0.12s ease',
                  minWidth: '100%',
                  width: 'max-content',
                }}
              >
                {hasSlots && (
                  <span
                    className="select-none shrink-0 text-right pr-2 pl-1"
                    style={{
                      width: 72,
                      color: '#a5b4fc',
                      fontSize: 10,
                      paddingTop: 4,
                      opacity: slotLabel ? 1 : 0,
                      marginRight: 9,
                    }}
                  >
                    {slotLabel ?? ''}
                  </span>
                )}
                <span
                  className="select-none shrink-0 text-right pr-3 pl-1"
                  style={{
                    width: 36,
                    color: isActive ? '#7c7f93' : '#45475a',
                    fontSize: 11,
                    paddingTop: 4,
                  }}
                >
                  {lineNum}
                </span>
                <span
                  className="shrink-0 whitespace-pre"
                  style={{
                    paddingTop: 2,
                    opacity: activeLine === null ? 1 : isActive ? 1 : linePins ? 0.7 : 0.42,
                  }}
                >
                  {tokenizeLine(line).map((t, ti) => (
                    <span
                      key={ti}
                      style={{
                        color: TOKEN_COLORS[t.type],
                        ...(t.type === 'operator' && { letterSpacing: OPERATOR_LETTER_SPACING }),
                      }}
                    >
                      {t.text}
                    </span>
                  ))}
                  {!line && ' '}
                </span>
                {linePins && linePins.length > 0 && (
                  <span
                    className="shrink-0 text-[11px] leading-snug font-mono"
                    style={{
                      color: isActive ? '#89b4fa' : '#5c6480',
                      paddingTop: 4,
                      paddingLeft: 24,
                      paddingRight: 12,
                    }}
                  >
                    {linePins.map((p, pi) => (
                      <span key={p.name}>
                        {pi > 0 && <span className="text-[#45475a]"> · </span>}
                        <span className="text-[#7c7f93]">{p.name}</span>
                        <span className="text-[#45475a]"> = </span>
                        <span>{prettyValue(p.value)}</span>
                      </span>
                    ))}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
      {children}
    </div>
  )
}

function prettyValue(jsonStr: string): string {
  if (jsonStr === '"__undefined__"') return 'undefined'
  let parsed: unknown
  try { parsed = JSON.parse(jsonStr) } catch { return jsonStr }
  return renderValue(parsed)
}

function renderValue(v: unknown): string {
  if (v === null) return 'null'
  if (v === undefined) return 'undefined'
  if (typeof v === 'string') {
    if (v === '__undefined__') return 'undefined'
    if (v === '<cycle>') return '<cycle>'
    if (v === '…') return '…'
    return JSON.stringify(v)
  }
  if (typeof v !== 'object') return String(v)
  if (Array.isArray(v)) return '[' + v.map(renderValue).join(', ') + ']'
  const obj = v as Record<string, unknown>
  if (obj.__shape === 'linked-list' || obj.__shape === 'doubly-linked-list') {
    const arrow = obj.__shape === 'doubly-linked-list' ? ' ⇄ ' : ' → '
    const values = (obj.values as (string | number)[]) ?? []
    const truncated = (obj.truncated as number | undefined) ?? 0
    const parts = values.map((x) => (typeof x === 'string' ? JSON.stringify(x) : String(x)))
    parts.push('null')
    return parts.join(arrow) + (truncated > 0 ? ` …+${truncated} more` : '')
  }
  if (obj.__shape === 'tree') {
    const values = (obj.values as (string | number | null)[]) ?? []
    const truncated = (obj.truncated as number | undefined) ?? 0
    const parts = values.map((x) =>
      x === null ? 'null' : typeof x === 'string' ? JSON.stringify(x) : String(x)
    )
    return '[' + parts.join(', ') + ']' + (truncated > 0 ? ` …+${truncated} more` : '')
  }
  const keys = Object.keys(obj).filter((k) => k !== '__class__')
  return '{' + keys.map((k) => `${k}: ${renderValue(obj[k])}`).join(', ') + '}'
}
