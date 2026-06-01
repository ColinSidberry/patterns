'use client'

import { useEffect, useRef, useState } from 'react'
import {
  appendNote,
  deleteNote,
  listNotesForProblem,
  updateNote,
  type Note,
} from '@/lib/notes'
import { Markdown } from './Markdown'

interface Props {
  problemId: string
}

export function NotesPanel({ problemId }: Props) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  // Id of the entry that the current draft represents. Null until the first
  // save in this visit; cleared on problem change so the next save creates
  // a new entry.
  const [draftId, setDraftId] = useState<string | null>(null)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [history, setHistory] = useState<Note[]>([])
  const [historyOpen, setHistoryOpen] = useState(false)
  const historyPanelRef = useRef<HTMLDivElement>(null)
  const historyButtonRef = useRef<HTMLButtonElement>(null)

  // Reset draft + form whenever the problem changes (covers SPA navigation;
  // a hard refresh remounts the component, which also clears state).
  useEffect(() => {
    setTitle('')
    setBody('')
    setDraftId(null)
    setSavedAt(null)
    setHistory(listNotesForProblem(problemId))
  }, [problemId])

  // Keep history in sync with cross-tab / cross-component writes.
  useEffect(() => {
    const refresh = () => setHistory(listNotesForProblem(problemId))
    const onStorage = (e: StorageEvent) => {
      if (!e.key || e.key === `patterns:notes:${problemId}`) refresh()
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [problemId])

  // Close the history dropdown on outside-click / Escape.
  useEffect(() => {
    if (!historyOpen) return
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (historyPanelRef.current?.contains(t)) return
      if (historyButtonRef.current?.contains(t)) return
      setHistoryOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHistoryOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [historyOpen])

  const canSave = title.trim().length > 0 || body.trim().length > 0

  const handleSave = () => {
    if (!canSave) return
    if (draftId) {
      const updated = updateNote(problemId, draftId, title, body)
      if (updated) {
        setSavedAt(updated.createdAt)
      } else {
        // The draft id no longer exists (e.g., deleted from history).
        // Create a fresh entry instead.
        const created = appendNote(problemId, title, body)
        setDraftId(created.id)
        setSavedAt(created.createdAt)
      }
    } else {
      const created = appendNote(problemId, title, body)
      setDraftId(created.id)
      setSavedAt(created.createdAt)
    }
    setHistory(listNotesForProblem(problemId))
  }

  const handleStartNew = () => {
    setTitle('')
    setBody('')
    setDraftId(null)
    setSavedAt(null)
  }

  const handleDeleteFromHistory = (noteId: string) => {
    deleteNote(problemId, noteId)
    if (noteId === draftId) handleStartNew()
    else setHistory(listNotesForProblem(problemId))
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Note title — short, what tripped you up"
        className="w-full px-3 py-2 rounded-md bg-[#181825] border border-[#313244] text-sm text-[#cdd6f4] focus:border-indigo-500 outline-none"
      />
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="The lesson — what to remember next time. Markdown: **bold**, *italic*, `code`."
        rows={6}
        className="w-full px-3 py-2 rounded-md bg-[#181825] border border-[#313244] text-sm text-[#cdd6f4] focus:border-indigo-500 outline-none font-mono leading-relaxed resize-y"
      />
      <div className="flex items-center gap-3 text-xs">
        <button
          onClick={handleSave}
          disabled={!canSave}
          className={`px-3 py-1 rounded-md border text-xs font-medium transition-colors ${
            canSave
              ? 'bg-indigo-600/20 border-indigo-500/50 text-indigo-200 hover:bg-indigo-600/30'
              : 'bg-[#181825] border-[#313244] text-[#6c7086] cursor-not-allowed'
          }`}
        >
          {draftId ? 'Update' : 'Save'}
        </button>
        {draftId && (
          <button
            onClick={handleStartNew}
            className="px-3 py-1 rounded-md border border-[#313244] bg-[#181825] text-[#a6adc8] hover:border-[#45475a] hover:text-[#cdd6f4] transition-colors text-xs"
          >
            Start new note
          </button>
        )}
        <span className="text-[#6c7086]">
          {savedAt
            ? `Saved · ${new Date(savedAt).toLocaleString(undefined, {
                month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
              })}`
            : ''}
        </span>
        <div className="relative ml-auto">
          <button
            ref={historyButtonRef}
            onClick={() => setHistoryOpen((v) => !v)}
            className={`px-2 py-1 rounded-md border text-xs transition-colors ${
              historyOpen
                ? 'bg-amber-900/30 border-amber-500/50 text-amber-200'
                : 'bg-[#181825] border-[#313244] text-[#a6adc8] hover:border-[#45475a]'
            }`}
            title="View prior notes for this problem"
          >
            History {history.length > 0 && <span className="font-mono">({history.length})</span>}
          </button>
          {historyOpen && (
            <div
              ref={historyPanelRef}
              className="absolute right-0 top-full mt-1.5 w-96 max-h-[60vh] overflow-y-auto rounded-lg border border-[#313244] bg-[#1e1e2e] shadow-xl z-40"
            >
              <header className="px-3 py-2 border-b border-[#313244] flex items-baseline gap-2 sticky top-0 bg-[#1e1e2e]">
                <span className="text-[11px] uppercase tracking-wider text-[#6c7086] font-semibold">
                  History
                </span>
                <span className="text-[11px] text-[#6c7086]">{history.length}</span>
              </header>
              {history.length === 0 ? (
                <p className="px-3 py-6 text-xs text-[#6c7086] italic text-center">
                  No notes for this problem yet.
                </p>
              ) : (
                <ul className="divide-y divide-[#313244]">
                  {history.map((n) => (
                    <li key={n.id} className="px-3 py-3 flex flex-col gap-1.5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-[#cdd6f4] truncate flex-1">
                          {n.title || '(untitled)'}
                        </span>
                        <span className="text-[10px] text-[#6c7086] font-mono shrink-0">
                          {formatDate(n.createdAt)}
                        </span>
                        <button
                          onClick={() => handleDeleteFromHistory(n.id)}
                          className="text-[10px] text-[#6c7086] hover:text-red-400 transition-colors shrink-0"
                          title="Delete this note"
                        >
                          ✕
                        </button>
                      </div>
                      {n.body.trim() && (
                        <div className="text-[12px] text-[#a6adc8]">
                          <Markdown text={n.body} />
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>
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
