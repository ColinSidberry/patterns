'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Difficulty } from '@/data/algo-monster-types'

type Scaffold = 'iterative' | 'recursive' | 'dp' | 'design'

export interface ClientEntry {
  id: string
  title: string
  difficulty?: Difficulty
}

export interface ClientPattern {
  id: string
  name: string
  scaffold: Scaffold
  shortDescription?: string
  entries: ClientEntry[]
}

export interface ClientModule {
  name: string
  unpatterned: ClientEntry[]
  patterns: ClientPattern[]
}

export interface ClientData {
  modules: ClientModule[]
  totalProblems: number
  totalCore: number
  totalPatterns: number
  corePerPattern: number
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

type EntryKind = 'core' | 'extra' | 'neutral'

function EntryRow({ entry, kind }: { entry: ClientEntry; kind: EntryKind }) {
  const textColor =
    kind === 'core' ? 'text-[#cdd6f4]' : kind === 'extra' ? 'text-[#6c7086]' : 'text-[#a6adc8]'
  const dotColor = kind === 'core' ? 'text-emerald-400' : 'text-transparent'
  return (
    <li>
      <Link
        href={`/study/${entry.id}`}
        className={`flex items-baseline gap-2 py-1 px-2 -mx-2 rounded transition-colors hover:bg-[#252537] ${textColor}`}
      >
        <span className={`inline-block w-2.5 shrink-0 text-xs leading-none ${dotColor}`}>●</span>
        <span className="truncate text-sm">{entry.title}</span>
        {entry.difficulty && (
          <span className={`text-[10px] uppercase tracking-wide ${DIFFICULTY_COLOR[entry.difficulty]}`}>
            {entry.difficulty}
          </span>
        )}
      </Link>
    </li>
  )
}

function PatternAccordion({
  pattern,
  corePerPattern,
  coreOnly,
}: {
  pattern: ClientPattern
  corePerPattern: number
  coreOnly: boolean
}) {
  const coreEntries = pattern.entries.slice(0, corePerPattern)
  const extraEntries = pattern.entries.slice(corePerPattern)
  const total = pattern.entries.length
  return (
    <details className="group/pat" open={coreOnly}>
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-baseline gap-2 py-1.5 px-2 -mx-2 rounded hover:bg-[#252537]/50 transition-colors">
        <span className="inline-block w-3 text-[#6c7086] text-[10px] font-mono transition-transform group-open/pat:rotate-90">
          ▶
        </span>
        <span className="text-sm font-medium text-[#cdd6f4]">{pattern.name}</span>
        <span
          className={`text-[10px] font-mono uppercase tracking-wide px-1.5 py-0.5 rounded ${SCAFFOLD_COLOR[pattern.scaffold]}`}
        >
          {pattern.scaffold}
        </span>
        <span className="text-xs text-[#6c7086]">
          {coreOnly ? `${coreEntries.length} core` : `${total} ${total === 1 ? 'problem' : 'problems'} · ${coreEntries.length} core`}
        </span>
      </summary>
      <div className="pl-5 pr-2 py-2">
        {pattern.shortDescription && (
          <p className="text-xs text-[#6c7086] mb-2 italic">{pattern.shortDescription}</p>
        )}
        <ul className="flex flex-col">
          {coreEntries.map((e) => (
            <EntryRow key={e.id} entry={e} kind="core" />
          ))}
          {!coreOnly && extraEntries.length > 0 && (
            <>
              <li className="mt-2 mb-1 text-[10px] uppercase tracking-wider text-[#45475a] pl-5">
                Extra practice
              </li>
              {extraEntries.map((e) => (
                <EntryRow key={e.id} entry={e} kind="extra" />
              ))}
            </>
          )}
        </ul>
      </div>
    </details>
  )
}

function ModuleAccordion({
  mod,
  corePerPattern,
  coreOnly,
  defaultOpen,
}: {
  mod: ClientModule
  corePerPattern: number
  coreOnly: boolean
  defaultOpen: boolean
}) {
  const moduleCore = mod.patterns.reduce((n, p) => n + Math.min(corePerPattern, p.entries.length), 0)
  const moduleTotal = mod.patterns.reduce((n, p) => n + p.entries.length, 0) + mod.unpatterned.length

  // In core-only mode, hide modules with no core problems entirely.
  if (coreOnly && moduleCore === 0) return null

  return (
    <details
      open={coreOnly ? true : defaultOpen}
      className="group/mod border-b border-[#313244] last:border-b-0"
    >
      <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-baseline gap-3 py-3 px-2 -mx-2 rounded hover:bg-[#252537]/40 transition-colors">
        <span className="inline-block w-3 text-[#6c7086] text-xs font-mono transition-transform group-open/mod:rotate-90">
          ▶
        </span>
        <span className="text-base font-semibold text-[#cdd6f4]">{mod.name}</span>
        <span className="text-xs text-[#6c7086]">
          {mod.patterns.length > 0 &&
            `${mod.patterns.length} ${mod.patterns.length === 1 ? 'pattern' : 'patterns'} · `}
          {coreOnly ? `${moduleCore} core` : `${moduleTotal} problems · ${moduleCore} core`}
        </span>
      </summary>
      <div className="pl-6 pr-2 pb-5 pt-1 flex flex-col gap-3">
        {!coreOnly && mod.unpatterned.length > 0 && (
          <ul className="flex flex-col">
            {mod.unpatterned.map((e) => (
              <EntryRow key={e.id} entry={e} kind="neutral" />
            ))}
          </ul>
        )}
        {mod.patterns.map((p) => (
          <PatternAccordion
            key={p.id}
            pattern={p}
            corePerPattern={corePerPattern}
            coreOnly={coreOnly}
          />
        ))}
      </div>
    </details>
  )
}

export function AlgoIndex({ data }: { data: ClientData }) {
  const [coreOnly, setCoreOnly] = useState(false)
  return (
    <>
      <div className="py-4 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4 text-xs text-[#6c7086]">
          <span>
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1.5 align-middle" />
            Core problem (do these for interview prep)
          </span>
          <span>·</span>
          <span>Modules in AlgoMaster study order</span>
        </div>
        <button
          onClick={() => setCoreOnly((v) => !v)}
          className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
            coreOnly
              ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50'
              : 'bg-[#313244] border-[#45475a] text-[#a6adc8] hover:bg-[#3a3a52]'
          }`}
        >
          {coreOnly ? `● Core only · ${data.totalCore}` : `Show core only · ${data.totalCore}`}
        </button>
      </div>
      <div className="flex flex-col">
        {data.modules.map((m, i) => (
          <ModuleAccordion
            key={m.name}
            mod={m}
            corePerPattern={data.corePerPattern}
            coreOnly={coreOnly}
            defaultOpen={i === 0}
          />
        ))}
      </div>
    </>
  )
}
