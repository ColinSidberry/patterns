'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Pattern } from '@/data/types'
import { useSequence } from '@/lib/useSequence'
import { InstagramMock } from './InstagramMock'
import { StepPanel } from './StepPanel'
import { ProgressDots } from './ProgressDots'
import { FailureModeBar } from './FailureModeBar'
import { FailureModeSheet } from './FailureModeSheet'
import { CodeFocusModal } from './CodeFocus'

interface Props {
  pattern: Pattern
}

export function SequenceViewer({ pattern }: Props) {
  const seq = useSequence(pattern)
  const [liked, setLiked] = useState(false)
  const [focusOpen, setFocusOpen] = useState(false)
  const hasSourceFiles = (pattern.sourceFiles?.length ?? 0) > 0

  const handleLike = () => {
    if (!seq.started) {
      setLiked(true)
      seq.start()
    }
  }

  const brokenStepCount =
    seq.activeFailureMode?.brokenSteps.length ?? 0

  const stepLabels = seq.steps.map((s) => s.label)

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Nav */}
      <header className="bg-white border-b border-gray-200 px-4 lg:px-6 py-3 shrink-0">
        <div className="max-w-screen-xl mx-auto flex items-center gap-4">
          <Link href="/" className="text-indigo-600 font-semibold text-base hover:text-indigo-700">
            Fundamentals
          </Link>
          <span className="text-gray-300">/</span>
          <span className="text-sm text-gray-600 font-medium">{pattern.title}</span>
          {seq.started && (
            <span className="ml-auto text-xs text-gray-400">
              Step {seq.currentIndex + 1} of {seq.totalSteps}
              <span className="ml-2 text-gray-300 hidden sm:inline">· ← → to navigate</span>
            </span>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 min-h-0 overflow-hidden" {...(seq.started ? seq.swipeHandlers : {})}>
        <div className="h-full max-w-screen-xl mx-auto px-4 lg:px-6 py-4 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* Left: Instagram mock */}
          <div className="hidden lg:block min-h-0">
            <InstagramMock
              mock={pattern.mock}
              stepLabel={seq.started ? seq.currentStep.label : ''}
              stepDescription={seq.started ? seq.currentStep.description.slice(0, 90) + (seq.currentStep.description.length > 90 ? '...' : '') : ''}
              onLike={handleLike}
              liked={liked}
              started={seq.started}
            />
          </div>

          {/* Right: Step panel */}
          <div className="min-h-0 overflow-y-auto">
            {!seq.started ? (
              /* Pre-start state */
              <div className="h-full flex flex-col items-center justify-center text-center px-8 gap-6">
                {/* Mobile like button */}
                <div className="lg:hidden">
                  <div className="w-20 h-20 rounded-full bg-pink-50 border-2 border-pink-200 flex items-center justify-center text-4xl mb-2">
                    🤍
                  </div>
                  <p className="text-sm text-gray-400 mb-4">Tap the heart to start</p>
                  <button
                    onClick={handleLike}
                    className="bg-indigo-600 text-white text-sm font-medium px-6 py-2.5 rounded-xl hover:bg-indigo-700 transition-colors"
                  >
                    Start walkthrough →
                  </button>
                </div>
                <div className="hidden lg:block">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{pattern.title}</h2>
                  <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-6">{pattern.description}</p>
                  <p className="text-sm text-gray-400">← Tap the heart button to begin</p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col gap-4 pb-4">
                <StepPanel
                  step={seq.currentStep}
                  stepIndex={seq.currentIndex}
                  actors={pattern.actors}
                  mode={seq.mode}
                  failureModeLabel={seq.activeFailureMode?.label ?? null}
                  brokenStepCount={brokenStepCount}
                  onExpand={hasSourceFiles ? () => setFocusOpen(true) : undefined}
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress + nav */}
      {seq.started && (
        <div className="bg-white border-t border-gray-200 shrink-0 pb-safe">
          <div className="max-w-screen-xl mx-auto px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={seq.back}
                disabled={seq.isFirst}
                className="text-sm text-gray-500 disabled:opacity-30 hover:text-gray-900 transition-colors py-2 shrink-0"
              >
                ← Back
              </button>
              <div className="flex-1">
                <ProgressDots
                  total={seq.totalSteps}
                  current={seq.currentIndex}
                  labels={stepLabels}
                  onGoTo={seq.goTo}
                />
              </div>
              <button
                onClick={seq.advance}
                disabled={seq.isLast}
                className="text-sm text-indigo-600 disabled:opacity-30 hover:text-indigo-800 font-medium transition-colors py-2 shrink-0"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Failure mode controls */}
      <FailureModeBar
        failureModes={pattern.failureModes}
        mode={seq.mode}
        onSetMode={seq.setMode}
      />
      <FailureModeSheet
        failureModes={pattern.failureModes}
        mode={seq.mode}
        onSetMode={seq.setMode}
        started={seq.started}
      />

      <CodeFocusModal
        pattern={pattern}
        seq={seq}
        isOpen={focusOpen}
        onClose={() => setFocusOpen(false)}
      />
    </div>
  )
}
