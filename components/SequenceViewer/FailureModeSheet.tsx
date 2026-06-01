'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FailureMode } from '@/data/types'
import { SequenceMode } from '@/lib/useSequence'

interface Props {
  failureModes: FailureMode[]
  mode: SequenceMode
  onSetMode: (mode: SequenceMode) => void
  started: boolean
}

export function FailureModeSheet({ failureModes, mode, onSetMode, started }: Props) {
  const [open, setOpen] = useState(false)

  const handleSelect = (id: string) => {
    onSetMode(mode === id ? 'happy' : id)
    setOpen(false)
  }

  return (
    <>
      {/* Pill trigger */}
      <div className={`lg:hidden fixed left-1/2 -translate-x-1/2 z-30 transition-all ${started ? 'bottom-20' : 'bottom-6'}`}>
        <button
          onClick={() => setOpen(true)}
          className={`flex items-center gap-2 px-5 py-3 rounded-full shadow-lg text-sm font-semibold transition-all ${
            mode !== 'happy'
              ? 'bg-orange-500 text-white'
              : 'bg-indigo-600 text-white'
          }`}
        >
          {mode !== 'happy' ? '⚡' : '⊕'}{' '}
          {mode !== 'happy'
            ? failureModes.find((f) => f.id === mode)?.shortLabel ?? 'Failure mode'
            : 'Failure modes'}
        </button>
      </div>

      {/* Sheet overlay */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/60 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#1e1e2e] rounded-t-2xl z-50 pb-safe border-t border-[#313244]"
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-[#45475a] rounded-full" />
              </div>

              <div className="px-5 pb-2">
                <h3 className="text-base font-semibold text-[#cdd6f4] mb-1">Failure modes</h3>
                <p className="text-sm text-[#6c7086] mb-4">Select one to overlay on the sequence</p>

                <button
                  onClick={() => { onSetMode('happy'); setOpen(false) }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl mb-2 border transition-all ${
                    mode === 'happy'
                      ? 'bg-indigo-900/30 border-indigo-700 text-indigo-300'
                      : 'bg-[#181825] border-[#313244] text-[#a6adc8] hover:border-indigo-700'
                  }`}
                >
                  <span className="text-sm font-medium">✓ Happy Path</span>
                  {mode === 'happy' && <span className="text-xs text-indigo-400">Active</span>}
                </button>

                <div className="flex flex-col gap-2 pb-6">
                  {failureModes.map((fm) => (
                    <button
                      key={fm.id}
                      onClick={() => handleSelect(fm.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        mode === fm.id
                          ? 'bg-orange-900/30 border-orange-700 text-orange-300'
                          : 'bg-[#181825] border-[#313244] text-[#a6adc8] hover:border-orange-700'
                      }`}
                    >
                      <span className="text-sm font-medium">{fm.label}</span>
                      {mode === fm.id
                        ? <span className="text-xs text-orange-400">Active</span>
                        : <span className="text-[#45475a]">›</span>
                      }
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
