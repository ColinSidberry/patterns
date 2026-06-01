'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pattern } from '@/data/types'
import { UseSequenceReturn } from '@/lib/useSequence'
import { SequenceMiniMap } from './SequenceMiniMap'
import { CodeIDE } from './CodeIDE'

interface Props {
  pattern: Pattern
  seq: UseSequenceReturn
  isOpen: boolean
  onClose: () => void
}

export function CodeFocusModal({ pattern, seq, isOpen, onClose }: Props) {
  const [activeFile, setActiveFile] = useState<string>('')

  // Sync active file to current step's file whenever step changes or modal opens
  useEffect(() => {
    if (isOpen && seq.currentStep) {
      setActiveFile(seq.currentStep.code.file)
    }
  }, [isOpen, seq.currentIndex, seq.currentStep])

  // Escape to close
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  const sourceFiles = pattern.sourceFiles ?? []
  const step = seq.currentStep
  const isCurrentFileActive = activeFile === step?.code.file

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="fixed inset-0 z-50 flex flex-col bg-[#0f0f1a]"
        >
          {/* Top bar */}
          <div className="shrink-0 flex items-center gap-3 px-4 h-12 bg-[#1a1a2e] border-b border-white/5">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-xs font-mono text-gray-500 hover:text-gray-300 transition-colors shrink-0"
            >
              <span>←</span>
              <span>walkthrough</span>
            </button>

            <div className="flex-1 text-center">
              <span className="text-sm font-medium text-gray-300">
                {step?.label}
              </span>
              <span className="ml-3 text-xs text-gray-600 font-mono">
                Step {seq.currentIndex + 1} of {seq.totalSteps}
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={seq.back}
                disabled={seq.isFirst}
                className="px-3 py-1 text-xs font-mono rounded border border-white/10 text-gray-400 hover:text-gray-200 hover:border-white/20 disabled:opacity-30 transition-colors"
              >
                ← prev
              </button>
              <button
                onClick={seq.advance}
                disabled={seq.isLast}
                className="px-3 py-1 text-xs font-mono rounded bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-30 transition-colors"
              >
                next →
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="flex-1 min-h-0 grid grid-cols-[380px_1fr]">
            {/* Left: Sequence mini map */}
            <div className="border-r border-white/5 overflow-hidden">
              <SequenceMiniMap
                actors={pattern.actors}
                steps={seq.steps}
                currentIndex={seq.currentIndex}
                onStepClick={(i) => {
                  seq.goTo(i)
                  // sync file tab to the clicked step
                  setActiveFile(seq.steps[i]?.code.file ?? activeFile)
                }}
              />
            </div>

            {/* Right: IDE */}
            <div className="overflow-hidden">
              {sourceFiles.length > 0 ? (
                <CodeIDE
                  sourceFiles={sourceFiles}
                  activeFile={activeFile}
                  startLine={isCurrentFileActive ? step?.code.startLine : undefined}
                  snippetLines={isCurrentFileActive ? (step?.code.lines ?? []) : []}
                  onTabChange={setActiveFile}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-600 font-mono text-sm">
                  No source files defined for this pattern.
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
