// Minimal markdown renderer for understand/approach prose.
// Supports: paragraphs (blank-line separated), `inline code`, **bold**, *italic*.
// Single newlines inside a paragraph become <br />.

import React from 'react'

type Token =
  | { t: 'text'; v: string }
  | { t: 'code'; v: string }
  | { t: 'bold'; v: string }
  | { t: 'italic'; v: string }

function tokenizeInline(s: string): Token[] {
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

function renderInline(s: string, key: string) {
  const tokens = tokenizeInline(s)
  return tokens.map((tok, i) => {
    if (tok.t === 'code') {
      return (
        <code
          key={`${key}-${i}`}
          className="px-1 py-0.5 rounded bg-[#181825] text-[#f5c2e7] font-mono text-[0.9em]"
        >
          {tok.v}
        </code>
      )
    }
    if (tok.t === 'bold') return <strong key={`${key}-${i}`} className="font-semibold text-[#e2e8f0]">{tok.v}</strong>
    if (tok.t === 'italic') return <em key={`${key}-${i}`} className="italic">{tok.v}</em>
    return <React.Fragment key={`${key}-${i}`}>{tok.v}</React.Fragment>
  })
}

function renderLineWithBreaks(s: string, key: string) {
  const lines = s.split('\n')
  return lines.map((line, i) => (
    <React.Fragment key={`${key}-l${i}`}>
      {i > 0 && <br />}
      {renderInline(line, `${key}-l${i}`)}
    </React.Fragment>
  ))
}

interface Props {
  text: string
  className?: string
}

export function Markdown({ text, className = '' }: Props) {
  const paragraphs = text.split(/\n\s*\n/)
  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {paragraphs.map((para, i) => (
        <p key={i} className="text-[15px] text-[#cdd6f4] leading-relaxed">
          {renderLineWithBreaks(para.trim(), `p${i}`)}
        </p>
      ))}
    </div>
  )
}
