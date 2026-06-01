'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { AlgoProblem, AlgoStep, AlgoFailureMode } from '@/data/algo-types'

export type AlgoMode = 'happy' | string

export interface UseAlgoSequenceReturn {
  steps: AlgoStep[]
  currentIndex: number
  currentStep: AlgoStep
  totalSteps: number
  mode: AlgoMode
  activeFailureMode: AlgoFailureMode | null
  isFirst: boolean
  isLast: boolean
  isPlaying: boolean
  advance: () => void
  back: () => void
  goTo: (index: number) => void
  setMode: (mode: AlgoMode) => void
  togglePlay: () => void
  started: boolean
  start: () => void
  reset: () => void
  swipeHandlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
  }
}

const PLAY_INTERVAL_MS = 1400

export function useAlgoSequence(problem: AlgoProblem): UseAlgoSequenceReturn {
  const [mode, setModeState] = useState<AlgoMode>('happy')
  const [currentIndex, setCurrentIndex] = useState(0)
  const [started, setStarted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)

  const failureModes = problem.failureModes ?? []

  const activeFailureMode =
    mode === 'happy' ? null : (failureModes.find((f) => f.id === mode) ?? null)

  const activeSolutionCode =
    activeFailureMode?.solutionCode ?? problem.solutionCode

  const steps: AlgoStep[] =
    mode === 'happy'
      ? problem.steps
      : activeFailureMode
        ? [...activeFailureMode.brokenSteps, ...activeFailureMode.fixSteps]
        : problem.steps

  const totalSteps = steps.length
  const currentStep = steps[Math.min(currentIndex, totalSteps - 1)]
  const isLast = currentIndex === totalSteps - 1

  const advance = useCallback(() => {
    setCurrentIndex((i) => {
      const next = Math.min(i + 1, totalSteps - 1)
      return next
    })
  }, [totalSteps])

  const back = useCallback(() => {
    setIsPlaying(false)
    setCurrentIndex((i) => Math.max(i - 1, 0))
  }, [])

  const goTo = useCallback(
    (index: number) => {
      setIsPlaying(false)
      setCurrentIndex(Math.max(0, Math.min(index, totalSteps - 1)))
    },
    [totalSteps],
  )

  const setMode = useCallback((newMode: AlgoMode) => {
    setModeState(newMode)
    setCurrentIndex(0)
    setIsPlaying(false)
    if (newMode !== 'happy') setStarted(true)
  }, [])

  const start = useCallback(() => {
    setStarted(true)
    setCurrentIndex(0)
  }, [])

  const reset = useCallback(() => {
    setStarted(false)
    setCurrentIndex(0)
    setIsPlaying(false)
    setModeState('happy')
  }, [])

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => {
      if (!p && isLast) {
        setCurrentIndex(0)
        return true
      }
      return !p
    })
  }, [isLast])

  // Auto-advance when playing
  useEffect(() => {
    if (!isPlaying) return
    const id = setInterval(() => {
      setCurrentIndex((i) => {
        if (i >= totalSteps - 1) {
          setIsPlaying(false)
          return i
        }
        return i + 1
      })
    }, PLAY_INTERVAL_MS)
    return () => clearInterval(id)
  }, [isPlaying, totalSteps])

  const touchStartX = useRef<number | null>(null)
  const swipeHandlers = {
    onTouchStart: (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX },
    onTouchEnd: (e: React.TouchEvent) => {
      if (touchStartX.current === null) return
      const delta = touchStartX.current - e.changedTouches[0].clientX
      if (Math.abs(delta) > 50) delta > 0 ? advance() : back()
      touchStartX.current = null
    },
  }

  useEffect(() => {
    if (!started) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') advance()
      if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') back()
      if (e.key === ' ') { e.preventDefault(); togglePlay() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [started, advance, back, togglePlay])

  return {
    steps, currentIndex, currentStep, totalSteps,
    mode, activeFailureMode,
    isFirst: currentIndex === 0,
    isLast,
    isPlaying,
    advance, back, goTo, setMode, togglePlay, started, start, reset, swipeHandlers,
  }
}
