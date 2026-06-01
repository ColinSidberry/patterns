'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Pattern, Step, FailureMode } from '@/data/types'

export type SequenceMode = 'happy' | string // 'happy' or a failureMode.id

export interface UseSequenceReturn {
  steps: Step[]
  currentIndex: number
  currentStep: Step
  totalSteps: number
  mode: SequenceMode
  activeFailureMode: FailureMode | null
  isFirst: boolean
  isLast: boolean
  advance: () => void
  back: () => void
  goTo: (index: number) => void
  setMode: (mode: SequenceMode) => void
  started: boolean
  start: () => void
  swipeHandlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
  }
}

export function useSequence(pattern: Pattern): UseSequenceReturn {
  const [mode, setModeState] = useState<SequenceMode>('happy')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [started, setStarted] = useState(false)

  const activeFailureMode =
    mode === 'happy'
      ? null
      : pattern.failureModes.find((f) => f.id === mode) ?? null

  const steps: Step[] =
    mode === 'happy'
      ? pattern.steps
      : activeFailureMode
        ? [...activeFailureMode.brokenSteps, ...activeFailureMode.fixSteps]
        : pattern.steps

  const totalSteps = steps.length
  const currentStep = steps[Math.min(currentIndex, totalSteps - 1)]

  const advance = useCallback(() => {
    setCurrentIndex((i) => Math.min(i + 1, totalSteps - 1))
  }, [totalSteps])

  const back = useCallback(() => {
    setCurrentIndex((i) => Math.max(i - 1, 0))
  }, [])

  const goTo = useCallback((index: number) => {
    setCurrentIndex(Math.max(0, Math.min(index, totalSteps - 1)))
  }, [totalSteps])

  const setMode = useCallback((newMode: SequenceMode) => {
    setModeState(newMode)
    setCurrentIndex(0)
    setStarted(newMode !== 'happy' ? true : false)
  }, [])

  const start = useCallback(() => {
    setStarted(true)
    setCurrentIndex(0)
  }, [])

  // Swipe gesture support
  const touchStartX = useRef<number | null>(null)
  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => {
      touchStartX.current = e.touches[0].clientX
    },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchStartX.current === null) return
      const delta = touchStartX.current - e.changedTouches[0].clientX
      if (Math.abs(delta) > 50) {
        delta > 0 ? advance() : back()
      }
      touchStartX.current = null
    },
  }

  // Keyboard navigation
  useEffect(() => {
    if (!started) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') advance()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') back()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [started, advance, back])

  return {
    steps,
    currentIndex,
    currentStep,
    totalSteps,
    mode,
    activeFailureMode,
    isFirst: currentIndex === 0,
    isLast: currentIndex === totalSteps - 1,
    advance,
    back,
    goTo,
    setMode,
    started,
    start,
    swipeHandlers,
  }
}
