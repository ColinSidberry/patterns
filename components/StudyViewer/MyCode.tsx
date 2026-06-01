'use client'

import { useEffect, useRef, useState, Fragment } from 'react'
import type { ParamHint, TestCase, TestKind } from '@/data/algo-monster-types'
import { tokenizeLine, TOKEN_COLORS } from '@/lib/tokenize'
import { TestRunner } from './TestRunner'
import { ProvidedHelpers } from './ProvidedHelpers'
import { CopyButton } from './CopyButton'
import { buildCopyTemplate } from '@/lib/copyTemplate'

interface Props {
  problemId: string
  testKind?: TestKind
  className?: string
  entryFunction?: string
  paramNames?: string[]
  paramHints?: ParamHint[]
  returnHint?: ParamHint
  tests?: TestCase[]
  solutionJS?: string
}

// Helper classes (ListNode, TreeNode) are auto-injected as globals by the
// runner. We surface them in a read-only banner above the editor (see
// `ProvidedHelpers`) so the field shapes are always visible without bloating
// the user's editable code.
function defaultStarter({ testKind, className, entryFunction, paramNames }: Props): string {
  if (testKind === 'class' && className) {
    return `class ${className} {\n  \n}\n`
  }
  if (entryFunction) {
    const params = (paramNames ?? []).join(', ')
    return `function ${entryFunction}(${params}) {\n  \n}\n`
  }
  return ''
}

const STORAGE_PREFIX = 'patterns:code:'

// Render `code` as a flat token stream — newlines preserved, no per-line wrapper
// divs — so that `<pre>` whitespace lines up exactly with a textarea overlay.
function HighlightedSource({ code }: { code: string }) {
  const lines = code.split('\n')
  return (
    <>
      {lines.map((line, i) => (
        <Fragment key={i}>
          {i > 0 && '\n'}
          {tokenizeLine(line).map((t, ti) => (
            <span key={ti} style={{ color: TOKEN_COLORS[t.type] }}>
              {t.text}
            </span>
          ))}
        </Fragment>
      ))}
    </>
  )
}

export function MyCode(props: Props) {
  const storageKey = STORAGE_PREFIX + props.problemId
  const starter = defaultStarter(props)
  const [value, setValue] = useState(starter)
  const [hydrated, setHydrated] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const preRef = useRef<HTMLPreElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const gutterRef = useRef<HTMLDivElement>(null)
  const valueRef = useRef(value)
  valueRef.current = value
  const getCode = () => valueRef.current

  const lineCount = value.split('\n').length || 1

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved !== null) setValue(saved)
    } catch {
      // localStorage unavailable; fall back to starter
    }
    setHydrated(true)
  }, [storageKey])

  // Debounced save
  useEffect(() => {
    if (!hydrated) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, value)
      } catch {
        // Quota errors etc — ignore
      }
    }, 500)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, hydrated, storageKey])

  // Sync overlays to the textarea's scroll position
  const syncScroll = () => {
    const ta = taRef.current
    if (!ta) return
    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop
      preRef.current.scrollLeft = ta.scrollLeft
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = ta.scrollTop
    }
  }

  // Editor niceties: Tab → 2 spaces, Enter → preserve indent, opening
  // bracket → auto-insert closer (or wrap selection), close bracket → step
  // over an existing match.
  const PAIRS: Record<string, string> = { '{': '}', '[': ']', '(': ')' }
  const CLOSERS: Record<string, true> = { ')': true, ']': true, '}': true }

  const replaceSelection = (
    ta: HTMLTextAreaElement,
    insert: string,
    cursorAt: number
  ) => {
    const { selectionStart, selectionEnd } = ta
    const next = value.slice(0, selectionStart) + insert + value.slice(selectionEnd)
    setValue(next)
    requestAnimationFrame(() => {
      ta.selectionStart = ta.selectionEnd = selectionStart + cursorAt
    })
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const ta = e.currentTarget
    if (e.key === 'Tab' && e.shiftKey) {
      e.preventDefault()
      // Shift+Tab: un-indent the current line (or every line in the
      // selection) by up to 2 leading spaces. Cursor / selection
      // re-anchored to compensate for removed characters.
      const { selectionStart, selectionEnd } = ta
      // Find line bounds covering the selection.
      const firstLineStart = value.lastIndexOf('\n', selectionStart - 1) + 1
      // For a selection ending at a line start, the LAST line we touch
      // is the previous line (don't un-indent past the selection end).
      const lastEnd =
        selectionEnd > selectionStart && value[selectionEnd - 1] === '\n'
          ? selectionEnd - 1
          : selectionEnd
      const before = value.slice(0, firstLineStart)
      const region = value.slice(firstLineStart, lastEnd)
      const after = value.slice(lastEnd)

      // Strip up to 2 leading spaces from each line in the region.
      const lines = region.split('\n')
      let removedFromFirst = 0
      let removedTotal = 0
      const stripped = lines.map((line, idx) => {
        let n = 0
        while (n < 2 && line[n] === ' ') n++
        if (idx === 0) removedFromFirst = n
        removedTotal += n
        return line.slice(n)
      })
      const newRegion = stripped.join('\n')
      const next = before + newRegion + after
      setValue(next)
      requestAnimationFrame(() => {
        const newStart = Math.max(firstLineStart, selectionStart - removedFromFirst)
        const newEnd = Math.max(newStart, selectionEnd - removedTotal)
        ta.selectionStart = newStart
        ta.selectionEnd = newEnd
      })
      return
    }
    if (e.key === 'Tab') {
      e.preventDefault()
      replaceSelection(ta, '  ', 2)
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const { selectionStart, selectionEnd } = ta
      const before = value.slice(0, selectionStart)
      const after = value.slice(selectionEnd)
      const lineStart = before.lastIndexOf('\n') + 1
      const currentLine = before.slice(lineStart)
      const leading = /^[ \t]*/.exec(currentLine)?.[0] ?? ''
      const insert = '\n' + leading
      const next = before + insert + after
      setValue(next)
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = selectionStart + insert.length
      })
      return
    }
    if (PAIRS[e.key]) {
      e.preventDefault()
      const { selectionStart, selectionEnd } = ta
      const close = PAIRS[e.key]
      const sel = value.slice(selectionStart, selectionEnd)
      if (sel.length > 0) {
        const next =
          value.slice(0, selectionStart) +
          e.key +
          sel +
          close +
          value.slice(selectionEnd)
        setValue(next)
        requestAnimationFrame(() => {
          ta.selectionStart = selectionStart + 1
          ta.selectionEnd = selectionEnd + 1
        })
      } else {
        replaceSelection(ta, e.key + close, 1)
      }
      return
    }
    if (CLOSERS[e.key]) {
      const { selectionStart, selectionEnd } = ta
      // Step over an already-present matching closer instead of duplicating.
      if (selectionStart === selectionEnd && value[selectionStart] === e.key) {
        e.preventDefault()
        requestAnimationFrame(() => {
          ta.selectionStart = ta.selectionEnd = selectionStart + 1
        })
      }
    }
  }

  const reset = () => {
    setValue(starter)
    try {
      localStorage.removeItem(storageKey)
    } catch {
      // Ignore
    }
  }

  // Identical typography on the <pre> and <textarea> so characters overlap
  // exactly. Any divergence (font, line-height, padding) breaks alignment.
  const GUTTER_WIDTH = 44
  const baseStyle: React.CSSProperties = {
    fontFamily:
      'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    fontSize: 13,
    lineHeight: '1.6',
    tabSize: 2,
    margin: 0,
    border: 0,
    whiteSpace: 'pre',
  }
  const codeStyle: React.CSSProperties = {
    ...baseStyle,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: GUTTER_WIDTH + 8,
    paddingRight: 16,
  }
  const gutterStyle: React.CSSProperties = {
    ...baseStyle,
    paddingTop: 12,
    paddingBottom: 12,
    paddingLeft: 0,
    paddingRight: 8,
    color: '#45475a',
    textAlign: 'right',
    background: '#13131a',
    borderRight: '1px solid #313244',
    width: GUTTER_WIDTH,
  }

  return (
    <div className="flex flex-col gap-3">
      <ProvidedHelpers paramHints={props.paramHints} returnHint={props.returnHint} />
      <div className="relative rounded-lg border border-[#313244] bg-[#181825] focus-within:border-indigo-500 transition-colors overflow-hidden">
        <div
          ref={gutterRef}
          aria-hidden
          style={gutterStyle}
          className="absolute left-0 top-0 bottom-0 overflow-hidden pointer-events-none select-none"
        >
          {Array.from({ length: lineCount }, (_, i) => (i + 1).toString()).join(
            '\n'
          )}
        </div>
        <pre
          ref={preRef}
          aria-hidden
          style={{ ...codeStyle, color: '#cdd6f4' }}
          className="absolute inset-0 overflow-hidden pointer-events-none"
        >
          <HighlightedSource code={value} />
          {'\n '}
        </pre>
        <textarea
          ref={taRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onScroll={syncScroll}
          onKeyDown={onKeyDown}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          style={{
            ...codeStyle,
            color: 'transparent',
            caretColor: '#cdd6f4',
            background: 'transparent',
            resize: 'vertical',
          }}
          className="relative block w-full min-h-[280px] outline-none"
        />
      </div>
      <div className="flex items-center gap-3 text-xs text-[#6c7086]">
        <span>Saved locally · Cmd+Z works</span>
        <div className="ml-auto flex items-center gap-2">
          <CopyButton text={() => buildCopyTemplate(props.problemId, getCode(), props.solutionJS ?? '')} label="Copy" />
          <button
            onClick={reset}
            className="text-[#6c7086] hover:text-[#a6adc8] transition-colors"
          >
            Reset to starter
          </button>
        </div>
      </div>
      {props.tests && props.tests.length > 0 && props.testKind && (
        <TestRunner
          getCode={getCode}
          testKind={props.testKind}
          tests={props.tests}
          {...(props.entryFunction !== undefined && { entryFunction: props.entryFunction })}
          {...(props.className !== undefined && { className: props.className })}
          {...(props.paramHints !== undefined && { paramHints: props.paramHints })}
          {...(props.returnHint !== undefined && { returnHint: props.returnHint })}
        />
      )}
    </div>
  )
}
