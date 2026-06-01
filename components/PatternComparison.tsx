'use client'

import Link from 'next/link'
import type { Difficulty, SlotKind } from '@/data/algo-monster-types'
import { tokenizeLine, TOKEN_COLORS } from '@/lib/tokenize'

type Scaffold = 'iterative' | 'recursive' | 'dp' | 'design'

export interface ClientProblem {
  id: string
  title: string
  difficulty?: Difficulty
  studyOrder: number
  hasSlots: boolean
}

export interface ClientRow {
  key: string
  description: string
  kind?: SlotKind
  cells: (string | null)[]
}

export interface ClientPattern {
  id: string
  name: string
  module: string
  scaffold: Scaffold
  shortDescription?: string
  whenToUse?: string
}

export interface ClientDesignProblem {
  id: string
  title: string
  difficulty?: Difficulty
  solutionJS: string
}

const SCAFFOLD_COLOR: Record<Scaffold, string> = {
  iterative: 'bg-indigo-900/30 text-indigo-300',
  recursive: 'bg-violet-900/30 text-violet-300',
  dp:        'bg-fuchsia-900/30 text-fuchsia-300',
  design:    'bg-cyan-900/30 text-cyan-300',
}

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy:   'text-green-400',
  medium: 'text-yellow-400',
  hard:   'text-red-400',
}

function labelClass(kind: SlotKind | undefined): string {
  switch (kind) {
    case 'init':
    case 'loop-open':
    case 'return':
    case 'base':
    case 'recurse':
      return 'text-indigo-300 font-semibold uppercase tracking-wide'
    case 'variable':
      return 'text-[#f9e2af] font-semibold'
    case 'scaffold':
      return 'text-[#6c7086] font-medium'
    default:
      return 'text-[#a6adc8]'
  }
}

function HighlightedCode({ code }: { code: string }) {
  return (
    <pre className="text-[12.5px] font-mono text-[#cdd6f4] leading-relaxed whitespace-pre overflow-x-auto">
      {code.split('\n').map((line, i) => (
        <div key={i}>
          {tokenizeLine(line).map((t, ti) => (
            <span key={ti} style={{ color: TOKEN_COLORS[t.type] }}>
              {t.text}
            </span>
          ))}
          {!line && ' '}
        </div>
      ))}
    </pre>
  )
}

const COL_WIDTH = 360
const LABEL_WIDTH = 180

export function PatternComparison({
  pattern,
  problems,
  rows,
}: {
  pattern: ClientPattern
  problems: ClientProblem[]
  rows: ClientRow[]
}) {
  if (problems.length === 0) {
    return (
      <p className="text-sm text-[#6c7086]">
        No problems are tagged with this pattern yet.
      </p>
    )
  }
  if (rows.length === 0) {
    return (
      <p className="text-sm text-[#6c7086]">
        No slot grid for this pattern (the canonical slot definitions are
        missing). Visit individual problems instead.
      </p>
    )
  }
  return (
    <div className="rounded-lg border border-[#313244] bg-[#1e1e2e] overflow-hidden">
      <div className="overflow-x-auto">
        <div
          className="grid"
          style={{
            gridTemplateColumns: `${LABEL_WIDTH}px repeat(${problems.length}, ${COL_WIDTH}px)`,
          }}
        >
          {/* Header row */}
          <div
            className="sticky left-0 z-20 bg-[#181825] border-b border-r border-[#313244] px-4 py-3"
            style={{ minHeight: 64 }}
          >
            <span
              className={`text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded ${SCAFFOLD_COLOR[pattern.scaffold]}`}
            >
              {pattern.scaffold}
            </span>
          </div>
          {problems.map((p, i) => (
            <Link
              key={p.id}
              href={`/study/${p.id}`}
              className={`bg-[#181825] border-b border-[#313244] px-4 py-3 flex flex-col gap-1 hover:bg-[#252537] transition-colors ${i < problems.length - 1 ? 'border-r border-[#313244]' : ''}`}
            >
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-[#cdd6f4] truncate">
                  {p.title}
                </span>
                {p.difficulty && (
                  <span
                    className={`text-[10px] uppercase ${DIFFICULTY_COLOR[p.difficulty]}`}
                  >
                    {p.difficulty}
                  </span>
                )}
              </div>
              <span className="text-[10px] text-[#6c7086] font-mono">
                {p.id}
                {!p.hasSlots && ' · no slots'}
              </span>
            </Link>
          ))}

          {/* Data rows */}
          {rows.map((row, ri) => (
            <RowCells
              key={row.key + ri}
              row={row}
              problems={problems}
              isLast={ri === rows.length - 1}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function RowCells({
  row,
  problems,
  isLast,
}: {
  row: ClientRow
  problems: ClientProblem[]
  isLast: boolean
}) {
  const borderB = isLast ? '' : 'border-b border-[#313244]'
  return (
    <>
      <div
        className={`sticky left-0 z-10 bg-[#181825] border-r border-[#313244] px-4 py-3 flex flex-col gap-1 ${borderB}`}
      >
        <div className={`text-xs ${labelClass(row.kind)}`}>{row.key}</div>
        <div className="text-[10px] text-[#6c7086] leading-snug">
          {row.description}
        </div>
      </div>
      {problems.map((p, i) => {
        const code = row.cells[i]
        const borderR =
          i < problems.length - 1 ? 'border-r border-[#313244]' : ''
        return (
          <div
            key={p.id}
            className={`bg-[#13131a] px-3 py-3 ${borderB} ${borderR}`}
          >
            {code ? (
              <HighlightedCode code={code} />
            ) : (
              <span className="text-[11px] text-[#45475a] italic">—</span>
            )}
          </div>
        )
      })}
    </>
  )
}

export function DesignPatternView({
  pattern,
  problems,
}: {
  pattern: ClientPattern
  problems: ClientDesignProblem[]
}) {
  if (problems.length === 0) {
    return (
      <p className="text-sm text-[#6c7086]">
        No problems are tagged with this pattern yet.
      </p>
    )
  }
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {problems.map((p) => (
        <Link
          key={p.id}
          href={`/study/${p.id}`}
          className="rounded-lg border border-[#313244] bg-[#1e1e2e] hover:border-indigo-500/50 transition-colors flex flex-col"
        >
          <div className="px-4 py-3 border-b border-[#313244] flex items-baseline gap-2">
            <span className="text-sm font-semibold text-[#cdd6f4] truncate">
              {p.title}
            </span>
            {p.difficulty && (
              <span
                className={`text-[10px] uppercase ${DIFFICULTY_COLOR[p.difficulty]}`}
              >
                {p.difficulty}
              </span>
            )}
            <span className="text-[10px] text-[#6c7086] font-mono ml-auto">
              {pattern.scaffold}
            </span>
          </div>
          <div className="px-4 py-3 max-h-[400px] overflow-auto">
            <HighlightedCode code={p.solutionJS} />
          </div>
        </Link>
      ))}
    </div>
  )
}
