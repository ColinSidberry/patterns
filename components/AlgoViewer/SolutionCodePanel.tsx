'use client'

import { tokenizeLine, TOKEN_COLORS } from '@/lib/tokenize'
import { CodeSection, PATTERN_TEMPLATES } from '@/data/algo-types'

interface Props {
  solutionCode: string
  currentLine: number                         // 1-indexed
  vars: Record<string, string | number>
  codeSections?: CodeSection[]
  pattern?: string
}

function getLineHint(lineText: string, vars: Record<string, string | number>): string {
  if (!/\b(let|const|var)\b/.test(lineText)) return ''
  const hits: string[] = []
  for (const [key, value] of Object.entries(vars)) {
    const re = new RegExp(`(?<![\\w])${key}(?![\\w])`)
    if (re.test(lineText)) hits.push(`${key}=${value}`)
  }
  return hits.join('      ')
}

export function SolutionCodePanel({ solutionCode, currentLine, vars, codeSections, pattern }: Props) {
  const lines = solutionCode.split('\n')

  const sectionLabelAtLine = new Map<number, string>()
  const dividerBeforeLine = new Set<number>()
  if (codeSections) {
    codeSections.forEach((s, i) => {
      sectionLabelAtLine.set(s.startLine, s.label)
      if (i > 0) dividerBeforeLine.add(s.startLine)
    })
  }

  const hasSections = (codeSections?.length ?? 0) > 0
  const LABEL_W = 88

  const templateSlots = pattern ? (PATTERN_TEMPLATES[pattern] ?? []) : []
  const activeSlots = new Set(codeSections?.map(s => s.label) ?? [])

  return (
    <div className="h-full flex flex-col font-mono text-sm leading-relaxed bg-[#1e1e2e]">
      {/* Tab bar */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#313244] shrink-0">
        <div className="flex gap-1.5">
          <div className="w-3 h-3 rounded-full bg-red-500/50" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
          <div className="w-3 h-3 rounded-full bg-green-500/50" />
        </div>
        <span className="text-xs text-[#6c7086] ml-2">solution.ts</span>
      </div>

      {/* Template strip */}
      {templateSlots.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-4 py-2.5 border-b border-[#313244] shrink-0">
          {templateSlots.map(slot => {
            const active = activeSlots.has(slot)
            return (
              <span
                key={slot}
                className="text-[10px] font-medium px-2 py-0.5 rounded border select-none"
                style={active
                  ? { background: 'rgba(99,102,241,0.15)', color: '#a5b4fc', borderColor: 'rgba(99,102,241,0.4)' }
                  : { background: 'transparent', color: '#313244', borderColor: '#313244' }
                }
              >
                {slot}
              </span>
            )
          })}
        </div>
      )}

      {/* Code lines */}
      <div className="flex-1 overflow-y-auto px-0 py-4">
        {lines.map((lineText, idx) => {
          const lineNum = idx + 1
          const isActive = lineNum === currentLine
          const hint = isActive ? '' : getLineHint(lineText, vars)
          const tokens = tokenizeLine(lineText)
          const sectionLabel = sectionLabelAtLine.get(lineNum)
          const showDivider = dividerBeforeLine.has(lineNum)

          return (
            <div key={idx}>
              {showDivider && (
                <div className="border-t border-[#313244] mx-0 my-1" />
              )}

              <div
                className="flex items-start group"
                style={{
                  backgroundColor: isActive ? '#2a2d4a' : 'transparent',
                  transition: 'background-color 0.15s ease',
                  opacity: isActive ? 1 : 0.45,
                }}
              >
                {/* Section label column */}
                {hasSections && (
                  <span
                    className="shrink-0 text-right pr-3 select-none"
                    style={{
                      width: LABEL_W,
                      color: '#cdd6f4',
                      fontSize: 10,
                      paddingTop: 2,
                      lineHeight: '1.5',
                    }}
                  >
                    {sectionLabel ?? ''}
                  </span>
                )}

                {/* Line number */}
                <span
                  className="select-none shrink-0 text-right pr-4 pl-4"
                  style={{
                    width: 48,
                    color: isActive ? '#7c7f93' : '#45475a',
                    fontSize: 11,
                    paddingTop: 1,
                  }}
                >
                  {lineNum}
                </span>

                {/* Syntax-highlighted code */}
                <span className="whitespace-pre pr-6 flex-shrink-0">
                  {tokens.map((token, ti) => (
                    <span key={ti} style={{ color: TOKEN_COLORS[token.type] }}>
                      {token.text}
                    </span>
                  ))}
                  {!lineText && ' '}
                </span>

                {/* Inline hint — declaration lines only, non-active */}
                {hint && (
                  <span
                    className="shrink-0 pr-6 text-[11px] whitespace-pre opacity-70"
                    style={{ color: '#5c6480', paddingTop: 2 }}
                  >
                    {hint}
                  </span>
                )}

                {/* Active line — each var on its own line */}
                {isActive && Object.keys(vars).length > 0 && (
                  <div
                    className="shrink-0 pr-6 text-[11px] leading-relaxed"
                    style={{ color: '#89b4fa', paddingTop: 1 }}
                  >
                    {Object.entries(vars).map(([k, v]) => (
                      <div key={k}>{k}={v}</div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
