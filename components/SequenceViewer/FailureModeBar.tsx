'use client'

import { FailureMode } from '@/data/types'
import { SequenceMode } from '@/lib/useSequence'

interface Props {
  failureModes: FailureMode[]
  mode: SequenceMode
  onSetMode: (mode: SequenceMode) => void
}

export function FailureModeBar({ failureModes, mode, onSetMode }: Props) {
  return (
    <div className="hidden lg:flex shrink-0 items-center gap-2 px-6 py-3 bg-[#1e1e2e] border-t border-[#313244] flex-wrap">
      <span className="text-xs text-[#6c7086] font-medium mr-1 shrink-0">Failure modes:</span>
      <button
        onClick={() => onSetMode('happy')}
        className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
          mode === 'happy'
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'text-[#6c7086] border-[#313244] hover:border-indigo-700 hover:text-indigo-400'
        }`}
      >
        ✓ Happy Path
      </button>
      {failureModes.map((fm) => (
        <button
          key={fm.id}
          onClick={() => onSetMode(mode === fm.id ? 'happy' : fm.id)}
          className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
            mode === fm.id
              ? 'bg-orange-500 text-white border-orange-500'
              : 'text-[#6c7086] border-[#313244] hover:border-orange-700 hover:text-orange-400'
          }`}
        >
          {mode === fm.id ? '⚡' : '○'} {fm.shortLabel}
        </button>
      ))}
    </div>
  )
}
