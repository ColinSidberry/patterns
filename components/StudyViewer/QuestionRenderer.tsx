// Specialized renderer for the AlgoMaster `question` text format.
//
// AlgoMaster questions follow a consistent shape:
//   <intro paragraph(s)>
//   Input:
//     <description or `key: value` lines>
//   Output:
//     <description or value lines>
//   Constraints:
//     <one-per-line constraints>
//   Examples:
//     Example 1:
//     Input: ...
//     Output: ...
//     Explanation: ...
//
// We bold the section labels and wrap each `Example N:` block in a code-style
// bordered card so the whole example reads visually distinct from prose.
// Markdown niceties also handled: **bold**, `inline code`, fenced ```code```
// blocks, and `- ` / `* ` bullet lists.

import React from 'react'

const SECTION_LABEL_RE = /^(Input|Output|Constraints|Examples|Explanation|Note|Notes|Parameters|Return|Returns|Prerequisite|Prerequisites)$/i
const INLINE_LABEL_RE = /^(Input|Output|Explanation|Parameters|Return|Returns|Prerequisite|Prerequisites):\s*(.*)$/i
const EXAMPLE_HEADER_RE = /^Example\s*\d+:?\s*$/i
const FOR_EXAMPLE_RE = /^For\s+example:?\s*$/i
const TRY_IT_RE = /^Try\s+it\s+yourself[.!]?\s*$/i
const BULLET_RE = /^[-*]\s+(.+)$/
const FENCE_RE = /^```/

interface Block {
  kind: 'paragraph' | 'example' | 'list' | 'code'
  lines: string[]
  // for example, the heading line ("Example 1:") preserved
  heading?: string
}

function splitIntoBlocks(text: string): Block[] {
  // First pass: extract fenced code blocks so they survive paragraph splitting.
  const lines = text.split('\n')
  const blocks: Block[] = []
  let i = 0

  // Buffer for non-code lines; flushed into paragraph splitter when we hit a fence.
  let buffer: string[] = []
  const flushBuffer = () => {
    if (buffer.length === 0) return
    const chunk = buffer.join('\n').trim()
    buffer = []
    if (!chunk) return
    for (const b of splitProseIntoBlocks(chunk)) blocks.push(b)
  }

  while (i < lines.length) {
    const line = lines[i]
    if (FENCE_RE.test(line.trim())) {
      flushBuffer()
      const codeLines: string[] = []
      i++
      while (i < lines.length && !FENCE_RE.test(lines[i].trim())) {
        codeLines.push(lines[i])
        i++
      }
      i++ // skip closing fence
      blocks.push({ kind: 'code', lines: codeLines })
      continue
    }
    buffer.push(line)
    i++
  }
  flushBuffer()

  return blocks
}

function splitProseIntoBlocks(text: string): Block[] {
  const paragraphs = text.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const blocks: Block[] = []

  for (const para of paragraphs) {
    const lines = para.split('\n').map((l) => l.trim()).filter(Boolean)
    if (lines.length === 0) continue

    // Drop "Try it yourself" footer lines wholesale.
    const filtered = lines.filter((l) => !TRY_IT_RE.test(l))
    if (filtered.length === 0) continue

    // Source often has `Examples` (the section header) directly above
    // `Example 1:` with no blank line between. Split that paragraph so
    // the section header becomes its own block AND the example header is
    // recognized below.
    if (
      filtered.length > 1 &&
      /^Examples?:?$/i.test(filtered[0]) &&
      EXAMPLE_HEADER_RE.test(filtered[1])
    ) {
      blocks.push({ kind: 'paragraph', lines: ['**Examples**'] })
      const rest = filtered.slice(1)
      const heading = rest[0]
      const bodyLines = rest.slice(1)
      blocks.push({ kind: 'example', heading, lines: bodyLines })
      continue
    }

    if (EXAMPLE_HEADER_RE.test(filtered[0])) {
      const heading = filtered[0]
      const bodyLines = filtered.slice(1)
      blocks.push({ kind: 'example', heading, lines: bodyLines })
      continue
    }

    // If the previous block was an example with no body, fold in.
    const prev = blocks[blocks.length - 1]
    const startsNewSection =
      SECTION_LABEL_RE.test(filtered[0].replace(/:$/, '')) ||
      EXAMPLE_HEADER_RE.test(filtered[0]) ||
      FOR_EXAMPLE_RE.test(filtered[0])
    if (prev && prev.kind === 'example' && prev.lines.length === 0 && !startsNewSection) {
      prev.lines = filtered
      continue
    }

    // Bullet run within a paragraph → split into (optional lead-in paragraph)
    // + list block. Allows constructions like:
    //   The class must support these methods:
    //   - enqueue(value): ...
    //   - dequeue(): ...
    const firstBulletIdx = filtered.findIndex((l) => BULLET_RE.test(l))
    if (firstBulletIdx !== -1) {
      const tail = filtered.slice(firstBulletIdx)
      if (tail.every((l) => BULLET_RE.test(l))) {
        const head = filtered.slice(0, firstBulletIdx)
        if (head.length > 0) blocks.push({ kind: 'paragraph', lines: head })
        blocks.push({ kind: 'list', lines: tail.map((l) => l.replace(BULLET_RE, '$1')) })
        continue
      }
    }

    // Section header on its own line ("Constraints:", "Parameters:",
    // "For example:", etc.) → emit as a labeled bold marker. The body
    // follows as the next paragraph.
    if (filtered.length === 1) {
      const bare = filtered[0].replace(/:$/, '')
      if (SECTION_LABEL_RE.test(bare)) {
        blocks.push({ kind: 'paragraph', lines: [`**${bare}**`] })
        continue
      }
      if (FOR_EXAMPLE_RE.test(filtered[0])) {
        blocks.push({ kind: 'paragraph', lines: ['**For example**'] })
        continue
      }
    }

    blocks.push({ kind: 'paragraph', lines: filtered })
  }

  return blocks
}

// Render inline markdown: `code`, **bold**. Returns React fragments.
function renderInlineMarkdown(text: string): React.ReactNode {
  const out: React.ReactNode[] = []
  // Combined regex for `code` and **bold**; iterate matches in order.
  const re = /`([^`]+)`|\*\*([^*]+)\*\*/g
  let lastIdx = 0
  let m: RegExpExecArray | null
  let key = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > lastIdx) out.push(text.slice(lastIdx, m.index))
    if (m[1] !== undefined) {
      out.push(
        <code
          key={`c${key++}`}
          className="font-mono text-[13px] bg-[#181825] text-[#f5c2e7] px-1 py-[1px] rounded"
        >
          {m[1]}
        </code>
      )
    } else if (m[2] !== undefined) {
      out.push(
        <strong key={`b${key++}`} className="font-semibold text-[#e2e8f0]">
          {m[2]}
        </strong>
      )
    }
    lastIdx = re.lastIndex
  }
  if (lastIdx < text.length) out.push(text.slice(lastIdx))
  return out.length === 1 ? out[0] : <>{out}</>
}

function renderInlineLine(line: string, _key: string): React.ReactNode {
  // Inline label: "Input: head = [1, 2, 3]" → bold "Input:" + mono value
  const m = line.match(INLINE_LABEL_RE)
  if (m) {
    return (
      <>
        <span className="font-semibold text-[#e2e8f0]">{m[1]}:</span>{' '}
        {m[2] ? <span className="font-mono text-[#a6e3a1]">{m[2]}</span> : null}
      </>
    )
  }

  // Bare section label: "Input" / "Output" / "Constraints" → bold
  const bare = line.replace(/:$/, '')
  if (SECTION_LABEL_RE.test(bare)) {
    return <span className="font-semibold text-[#e2e8f0] uppercase tracking-wide text-xs">{bare}</span>
  }

  // **bold** marker on its own line
  const boldMatch = line.match(/^\*\*(.+)\*\*$/)
  if (boldMatch) {
    return <span className="font-semibold text-[#e2e8f0] uppercase tracking-wide text-xs">{boldMatch[1]}</span>
  }

  return renderInlineMarkdown(line)
}

function ParagraphBlock({ lines }: { lines: string[] }) {
  return (
    <div className="flex flex-col gap-1 text-[15px] text-[#cdd6f4] leading-relaxed">
      {lines.map((line, i) => (
        <div key={i}>{renderInlineLine(line, `pl${i}`)}</div>
      ))}
    </div>
  )
}

function ListBlock({ lines }: { lines: string[] }) {
  return (
    <ul className="flex flex-col gap-1 text-[15px] text-[#cdd6f4] leading-relaxed pl-4">
      {lines.map((line, i) => (
        <li key={i} className="list-disc marker:text-[#6c7086]">
          {renderInlineMarkdown(line)}
        </li>
      ))}
    </ul>
  )
}

function CodeBlock({ lines }: { lines: string[] }) {
  return (
    <pre className="rounded-lg border border-[#313244] bg-[#181825] px-4 py-3 overflow-x-auto text-[13px] font-mono text-[#cdd6f4] leading-relaxed">
      {lines.join('\n')}
    </pre>
  )
}

function ExampleBlock({ heading, lines }: { heading: string; lines: string[] }) {
  return (
    <div className="rounded-lg border border-[#313244] bg-[#181825] overflow-hidden">
      <div className="px-4 py-2 border-b border-[#313244] bg-[#1e1e2e]">
        <span className="text-xs font-semibold uppercase tracking-wide text-indigo-300">
          {heading.replace(/:$/, '')}
        </span>
      </div>
      <div className="px-4 py-3 flex flex-col gap-1 font-mono text-[13px] text-[#cdd6f4] leading-relaxed">
        {lines.map((line, i) => {
          const m = line.match(INLINE_LABEL_RE)
          if (m) {
            return (
              <div key={i} className="flex gap-2">
                <span className="font-sans text-xs font-semibold uppercase tracking-wide text-[#a6adc8] shrink-0 pt-[2px]" style={{ width: 80 }}>
                  {m[1]}
                </span>
                <span className={m[1].toLowerCase() === 'explanation' ? 'font-sans text-[14px] text-[#cdd6f4]' : 'text-[#a6e3a1]'}>
                  {m[2]}
                </span>
              </div>
            )
          }
          return (
            <div key={i} className="font-sans text-[14px] text-[#a6adc8]">
              {line}
            </div>
          )
        })}
      </div>
    </div>
  )
}

interface Props {
  text: string
}

export function QuestionRenderer({ text }: Props) {
  const blocks = splitIntoBlocks(text)
  return (
    <div className="flex flex-col gap-4">
      {blocks.map((b, i) => {
        if (b.kind === 'example') {
          return <ExampleBlock key={i} heading={b.heading!} lines={b.lines} />
        }
        if (b.kind === 'list') {
          return <ListBlock key={i} lines={b.lines} />
        }
        if (b.kind === 'code') {
          return <CodeBlock key={i} lines={b.lines} />
        }
        return <ParagraphBlock key={i} lines={b.lines} />
      })}
    </div>
  )
}
