'use client'

import { useRef, useEffect } from 'react'
import { SourceFile, CodeLine } from '@/data/types'

interface Props {
  sourceFiles: SourceFile[]
  activeFile: string
  startLine?: number   // 1-indexed line in full file where snippet begins
  snippetLines: CodeLine[]  // to know which lines within range have highlight:true
  onTabChange: (name: string) => void
}

export function CodeIDE({ sourceFiles, activeFile, startLine, snippetLines, onTabChange }: Props) {
  const highlightRef = useRef<HTMLDivElement>(null)
  const file = sourceFiles.find(f => f.name === activeFile) ?? sourceFiles[0]

  const snippetLen = snippetLines.length
  const hlStart = startLine ?? 0   // 0 means no highlight
  const hlEnd = hlStart > 0 ? hlStart + snippetLen - 1 : 0

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ block: 'center', behavior: 'smooth' })
    }
  }, [activeFile, startLine])

  if (!file) return null

  return (
    <div className="flex flex-col h-full bg-[#1e1e2e] overflow-hidden">
      {/* Tabs */}
      <div className="shrink-0 flex items-end overflow-x-auto bg-[#161622] border-b border-white/5 scrollbar-none">
        {sourceFiles.map(f => {
          const isActive = f.name === activeFile
          return (
            <button
              key={f.name}
              onClick={() => onTabChange(f.name)}
              className={`shrink-0 flex items-center gap-2 px-4 py-2.5 text-xs font-mono border-r border-white/5 transition-colors relative ${
                isActive
                  ? 'bg-[#1e1e2e] text-gray-200'
                  : 'bg-[#161622] text-gray-500 hover:text-gray-400'
              }`}
            >
              {isActive && (
                <span className="absolute top-0 left-0 right-0 h-[2px] bg-indigo-500" />
              )}
              <FileIcon language={f.language} />
              {f.name}
            </button>
          )
        })}
      </div>

      {/* Breadcrumb */}
      {hlStart > 0 && (
        <div className="shrink-0 px-4 py-1.5 bg-[#161622] border-b border-white/5 flex items-center gap-1 font-mono text-[11px] text-gray-500">
          <span>{file.name}</span>
          <span className="text-gray-700">›</span>
          <span className="text-indigo-400">lines {hlStart}–{hlEnd}</span>
        </div>
      )}

      {/* Code */}
      <div className="flex-1 overflow-y-auto font-mono text-[13px] leading-[22px]">
        <table className="w-full border-collapse">
          <tbody>
            {file.content.map((line, i) => {
              const lineNum = i + 1
              const inRange = hlStart > 0 && lineNum >= hlStart && lineNum <= hlEnd
              const snippetOffset = lineNum - hlStart  // 0-indexed within snippet
              const isHighlighted = inRange && snippetLines[snippetOffset]?.highlight === true
              const isFirst = lineNum === hlStart
              const isLast = lineNum === hlEnd

              return (
                <tr
                  key={lineNum}
                  ref={isFirst ? (el => { if (el) (highlightRef as any).current = el }) : undefined}
                  className={inRange ? (isHighlighted ? 'bg-indigo-500/15' : 'bg-indigo-950/30') : ''}
                >
                  {/* Line number */}
                  <td
                    className={`select-none text-right pr-4 pl-4 w-12 shrink-0 align-top py-0 ${
                      inRange ? 'text-indigo-400/60' : 'text-gray-700'
                    }`}
                    style={{ minWidth: 48 }}
                  >
                    {lineNum}
                  </td>

                  {/* Gutter accent */}
                  <td className="w-1 p-0 align-top">
                    {inRange && (
                      <div
                        className={`w-full h-[22px] ${
                          isFirst ? 'rounded-tl' : isLast ? 'rounded-bl' : ''
                        } bg-indigo-500/40`}
                      />
                    )}
                  </td>

                  {/* Code content */}
                  <td className="pl-3 pr-6 py-0 align-top whitespace-pre">
                    <span className={getLineColor(line, isHighlighted)}>
                      {line || '\u00A0'}
                    </span>
                  </td>
                </tr>
              )
            })}
            {/* Bottom padding */}
            <tr><td colSpan={3} className="h-16" /></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function FileIcon({ language }: { language: string }) {
  if (language === 'python') {
    return <span className="text-yellow-400/70 text-[10px]">py</span>
  }
  return <span className="text-blue-400/70 text-[10px]">ts</span>
}

function getLineColor(text: string, isHighlighted: boolean): string {
  if (!text.trim()) return 'text-transparent'
  const t = text.trim()
  if (t.startsWith('#') || t.startsWith('//')) return isHighlighted ? 'text-gray-400' : 'text-gray-600'
  if (t.startsWith('from ') || t.startsWith('import ')) return 'text-green-400/80'
  if (/\b(async|await|def |return|if |for |while |class )\b/.test(text)) {
    return isHighlighted ? 'text-indigo-200' : 'text-blue-300/80'
  }
  if (/"[^"]*"|'[^']*'/.test(text)) return isHighlighted ? 'text-indigo-200' : 'text-emerald-300/80'
  return isHighlighted ? 'text-indigo-100' : 'text-gray-300'
}
