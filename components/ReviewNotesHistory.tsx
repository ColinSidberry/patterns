'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import { listAllNotes, type Note } from '@/lib/notes'
import { Markdown } from './StudyViewer/Markdown'

interface ProblemMeta {
  title: string
  pattern: string | null
}

interface Props {
  problemMeta: Record<string, ProblemMeta>
}

interface Group {
  problemId: string
  title: string
  notes: Note[]
}

export function ReviewNotesHistory({ problemMeta }: Props) {
  const [open, setOpen] = useState(false)
  const [notes, setNotes] = useState<Note[]>([])
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const refresh = () => setNotes(listAllNotes())

  useEffect(() => {
    refresh()
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key.startsWith('patterns:notes:') || e.key.startsWith('patterns:note:')) {
        refresh()
      }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    window.addEventListener('storage', onStorage)
    window.addEventListener('focus', refresh)
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('focus', refresh)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (panelRef.current?.contains(t)) return
      if (buttonRef.current?.contains(t)) return
      setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  // listAllNotes is already newest-first; preserve that within each group
  // and order groups by their most-recent note.
  const groups = useMemo<Group[]>(() => {
    const byId = new Map<string, Note[]>()
    for (const n of notes) {
      const arr = byId.get(n.problemId)
      if (arr) arr.push(n)
      else byId.set(n.problemId, [n])
    }
    const out: Group[] = []
    for (const [problemId, list] of byId) {
      out.push({
        problemId,
        title: problemMeta[problemId]?.title ?? problemId,
        notes: list,
      })
    }
    out.sort((a, b) => b.notes[0]!.createdAt.localeCompare(a.notes[0]!.createdAt))
    return out
  }, [notes, problemMeta])

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        onClick={() => {
          refresh()
          setOpen((v) => !v)
        }}
        title={`Notes${notes.length > 0 ? ` (${notes.length})` : ''}`}
        className={`text-sm px-2 py-1 rounded-md border transition-colors flex items-center gap-1.5 ${
          open
            ? 'bg-amber-900/30 border-amber-500/50 text-amber-200'
            : 'bg-[#181825] border-[#313244] text-[#a6adc8] hover:border-[#45475a]'
        }`}
      >
        <span>📝</span>
        <span className="text-[11px]">Notes</span>
        {notes.length > 0 && (
          <span className="text-[11px] font-mono tabular-nums">{notes.length}</span>
        )}
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-1.5 w-[28rem] max-h-[70vh] overflow-y-auto rounded-lg border border-[#313244] bg-[#1e1e2e] shadow-xl z-40"
        >
          <header className="px-3 py-2 border-b border-[#313244] flex items-baseline gap-2 sticky top-0 bg-[#1e1e2e] z-10">
            <span className="text-[11px] uppercase tracking-wider text-[#6c7086] font-semibold">
              All notes
            </span>
            <span className="text-[11px] text-[#6c7086]">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'} · {groups.length}{' '}
              {groups.length === 1 ? 'problem' : 'problems'}
            </span>
          </header>
          {groups.length === 0 ? (
            <p className="px-3 py-6 text-xs text-[#6c7086] italic text-center">
              No notes yet. Add one in the Notes section of any problem.
            </p>
          ) : (
            <ul className="divide-y divide-[#313244]">
              {groups.map((g) => (
                <li key={g.problemId} className="px-3 py-2.5">
                  <Link
                    href={`/study/${g.problemId}`}
                    onClick={() => setOpen(false)}
                    className="text-[12px] uppercase tracking-wider text-indigo-300 font-semibold hover:text-indigo-200"
                  >
                    {g.title}
                  </Link>
                  <ul className="mt-1.5 flex flex-col gap-2">
                    {g.notes.map((n) => (
                      <li
                        key={n.id}
                        className="rounded-md bg-[#181825] border border-[#313244] px-2.5 py-2"
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-[13px] font-medium text-[#cdd6f4] truncate flex-1">
                            {n.title || '(untitled)'}
                          </span>
                          <span className="text-[10px] text-[#6c7086] font-mono shrink-0">
                            {formatDate(n.createdAt)}
                          </span>
                        </div>
                        {n.body.trim() && (
                          <div className="mt-1.5">
                            <Markdown text={n.body} />
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
