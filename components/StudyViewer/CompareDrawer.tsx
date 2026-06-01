'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { Difficulty, SlotEntry } from '@/data/algo-monster-types'
import { chapterSlugForPattern } from '@/lib/codex'
import { SlotTable } from './SlotTable'
import { CodeBlock } from './CodeBlock'

export interface SiblingEntry {
  id: string
  title: string
  difficulty?: Difficulty
  slotTemplate?: SlotEntry[] | null
  solutionJS?: string
}

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy:   'text-green-400',
  medium: 'text-yellow-400',
  hard:   'text-red-400',
}

const STORAGE_PREFIX = 'patterns:code:'

interface Props {
  currentId: string
  patternName: string
  patternId: string
  siblings: SiblingEntry[]
  tagSiblings?: SiblingEntry[]
}

export function CompareDrawer({ currentId, patternName, patternId, siblings, tagSiblings = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [hasCode, setHasCode] = useState<Set<string>>(new Set())

  const allSiblings = [...siblings, ...tagSiblings]

  // Detect siblings with non-empty saved code so we can flag them as "started".
  // Guard the setState with content-equality: returning the same Set ref when
  // nothing changed lets React bail out and breaks any render→effect→render
  // loop if a parent passes new sibling array refs each render.
  useEffect(() => {
    const found = new Set<string>()
    try {
      for (const s of allSiblings) {
        const v = localStorage.getItem(STORAGE_PREFIX + s.id)
        if (v && v.trim().length > 30) found.add(s.id)
      }
    } catch {
      // localStorage unavailable
    }
    setHasCode((prev) => {
      if (prev.size === found.size) {
        let same = true
        for (const id of found) if (!prev.has(id)) { same = false; break }
        if (same) return prev
      }
      return found
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siblings, tagSiblings])

  // Esc closes the drawer
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (allSiblings.length === 0) return null

  const checkedSiblings = allSiblings.filter((s) => checked.has(s.id))

  return (
    <>
      {/* Right-edge trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="fixed right-0 top-1/3 z-40 bg-[#1e1e2e] border border-r-0 border-[#313244] hover:bg-[#252537] hover:border-indigo-500/50 transition-colors rounded-l-md px-2 py-4 flex flex-col items-center gap-2 shadow-lg"
        style={{ writingMode: 'vertical-rl' }}
      >
        <span className="text-xs font-semibold text-indigo-300 tracking-widest uppercase">
          Compare
        </span>
        <span className="text-[10px] font-mono text-[#6c7086]">
          {allSiblings.length}
        </span>
      </button>

      {/* Backdrop */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          aria-hidden
          className="fixed inset-0 z-40 bg-black/40"
        />
      )}

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 bottom-0 z-50 w-[640px] max-w-[92vw] bg-[#13131a] border-l border-[#313244] shadow-2xl transform transition-transform duration-200 flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[#313244] shrink-0">
          <div className="flex flex-col gap-1 flex-1 min-w-0">
            <span className="text-[10px] uppercase tracking-widest text-[#6c7086]">
              Compare with sibling
            </span>
            <Link
              href={`/patterns/${patternId}`}
              className="text-sm font-semibold text-[#cdd6f4] hover:text-indigo-300 transition-colors truncate"
            >
              Pattern: {patternName} →
            </Link>
            {chapterSlugForPattern(patternId) && (
              <Link
                href={`/codex/${encodeURIComponent(chapterSlugForPattern(patternId)!)}`}
                className="text-[11px] text-amber-300/90 hover:text-amber-200 transition-colors w-fit"
                title="Listen to / read the Codex chapter for this pattern"
              >
                📖 Codex chapter →
              </Link>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="text-[#6c7086] hover:text-[#cdd6f4] text-lg shrink-0 leading-none"
            aria-label="Close drawer"
          >
            ×
          </button>
        </div>

        <div className="flex-1 overflow-y-auto flex flex-col">
          <div className="px-5 py-3 border-b border-[#313244] flex flex-col gap-3">
            <SiblingGroup
              label="Pattern siblings"
              siblings={siblings}
              currentId={currentId}
              checked={checked}
              hasCode={hasCode}
              onToggle={toggle}
            />
            {tagSiblings.length > 0 && (
              <SiblingGroup
                label="Conceptual siblings"
                siblings={tagSiblings}
                currentId={currentId}
                checked={checked}
                hasCode={hasCode}
                onToggle={toggle}
              />
            )}
          </div>

          <div className="px-5 py-4 flex flex-col gap-4">
            {checkedSiblings.length === 0 ? (
              <p className="text-xs text-[#6c7086] italic">
                Check siblings above to see their reference solutions side by side.
              </p>
            ) : (
              checkedSiblings.map((s) => (
                <SiblingCard key={s.id} sibling={s} />
              ))
            )}
          </div>
        </div>
      </aside>
    </>
  )
}

function SiblingGroup({
  label,
  siblings,
  currentId,
  checked,
  hasCode,
  onToggle,
}: {
  label: string
  siblings: SiblingEntry[]
  currentId: string
  checked: Set<string>
  hasCode: Set<string>
  onToggle: (id: string) => void
}) {
  if (siblings.length === 0) return null
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-[#6c7086] font-semibold mb-1 px-2">
        {label}
      </div>
      <ul className="flex flex-col gap-1">
        {siblings.map((s) => {
          const isCurrent = s.id === currentId
          const isChecked = checked.has(s.id)
          const started = hasCode.has(s.id)
          return (
            <li key={s.id}>
              <label
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-sm cursor-pointer transition-colors ${
                  isChecked
                    ? 'bg-indigo-900/30 text-[#cdd6f4]'
                    : 'text-[#a6adc8] hover:bg-[#1e1e2e]'
                } ${isCurrent ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  disabled={isCurrent}
                  onChange={() => onToggle(s.id)}
                  className="accent-indigo-500"
                />
                <span className="font-mono text-xs truncate flex-1">
                  {s.id}
                </span>
                {s.difficulty && (
                  <span
                    className={`text-[10px] uppercase ${DIFFICULTY_COLOR[s.difficulty]}`}
                  >
                    {s.difficulty}
                  </span>
                )}
                {started && (
                  <span
                    className="text-emerald-400 text-xs"
                    title="You have code saved for this problem"
                  >
                    ✓
                  </span>
                )}
                {isCurrent && (
                  <span className="text-[10px] uppercase text-[#6c7086]">
                    current
                  </span>
                )}
              </label>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function SiblingCard({ sibling }: { sibling: SiblingEntry }) {
  const hasSlots = Array.isArray(sibling.slotTemplate) && sibling.slotTemplate.length > 0
  return (
    <div className="rounded-lg border border-[#313244] bg-[#1e1e2e] overflow-hidden">
      <div className="flex items-baseline gap-2 px-4 py-2.5 border-b border-[#313244] bg-[#181825]">
        <Link
          href={`/study/${sibling.id}`}
          className="text-sm font-semibold text-[#cdd6f4] hover:text-indigo-300 transition-colors truncate"
        >
          {sibling.title}
        </Link>
        {sibling.difficulty && (
          <span className={`text-[10px] uppercase ${DIFFICULTY_COLOR[sibling.difficulty]}`}>
            {sibling.difficulty}
          </span>
        )}
        <span className="ml-auto text-[10px] uppercase tracking-wider text-[#6c7086]">
          Reference
        </span>
      </div>
      <div className="p-3">
        {hasSlots ? (
          <SlotTable slots={sibling.slotTemplate!} />
        ) : sibling.solutionJS ? (
          <CodeBlock code={sibling.solutionJS} />
        ) : (
          <p className="text-xs text-[#6c7086] italic">No reference solution available.</p>
        )}
      </div>
    </div>
  )
}
