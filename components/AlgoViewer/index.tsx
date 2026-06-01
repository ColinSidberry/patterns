'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { AlgoProblem, StaircaseState } from '@/data/algo-types'
import { useAlgoSequence } from '@/lib/useAlgoSequence'
import { tokenizeLine, TOKEN_COLORS } from '@/lib/tokenize'
import { useKokoroTTS, stripForSpeech } from '@/lib/useKokoroTTS'
import { AlgoStepPanel } from './AlgoStepPanel'
import { ArrayRowViz } from './ArrayRowViz'
import { DPRowViz } from './DPRowViz'
import { StaircaseViz } from './StaircaseViz'
import { GridViz } from './GridViz'
import { SolutionCodePanel } from './SolutionCodePanel'
import { ApproachPanel } from './ApproachPanel'
import { AnnotatedText } from './AnnotatedText'
import { TTSButton } from './TTSButton'
import { FailureModeBar } from '@/components/SequenceViewer/FailureModeBar'
import { FailureModeSheet } from '@/components/SequenceViewer/FailureModeSheet'

type PathHandler = { text: string; onHover: () => void; onLeave: () => void }

// Parse a plain-text segment, splitting out any pathHandler matches
function segmentize(s: string, handlers: PathHandler[]): { t: 'text' | 'path'; content: string; handler?: PathHandler }[] {
  if (!handlers.length) return [{ t: 'text', content: s }]
  let remaining = s
  const out: { t: 'text' | 'path'; content: string; handler?: PathHandler }[] = []
  while (remaining.length > 0) {
    let first: { idx: number; h: PathHandler } | null = null
    for (const h of handlers) {
      const idx = remaining.indexOf(h.text)
      if (idx !== -1 && (first === null || idx < first.idx)) first = { idx, h }
    }
    if (!first) { out.push({ t: 'text', content: remaining }); break }
    if (first.idx > 0) out.push({ t: 'text', content: remaining.slice(0, first.idx) })
    out.push({ t: 'path', content: first.h.text, handler: first.h })
    remaining = remaining.slice(first.idx + first.h.text.length)
  }
  return out
}

// Renders answer text with **bold** markers, \n line breaks, and hoverable path annotations
function AnswerText({ text, pathHandlers = [] }: { text: string; pathHandlers?: PathHandler[] }) {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, li) => {
        const boldParts = line.split(/(\*\*[^*]+\*\*)/)
        return (
          <span key={li}>
            {li > 0 && <br />}
            {boldParts.map((part, pi) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={pi} className="font-semibold text-[#e2e8f0]">{part.slice(2, -2)}</strong>
              }
              return segmentize(part, pathHandlers).map((seg, si) =>
                seg.t === 'path' ? (
                  <span
                    key={`${pi}-${si}`}
                    onMouseEnter={seg.handler!.onHover}
                    onMouseLeave={seg.handler!.onLeave}
                    className="underline decoration-dashed underline-offset-2 decoration-indigo-400/60 text-indigo-300 hover:text-indigo-200 cursor-default transition-colors"
                  >
                    {seg.content}
                  </span>
                ) : (
                  <span key={`${pi}-${si}`}>{seg.content}</span>
                )
              )
            })}
          </span>
        )
      })}
    </>
  )
}

const DIFFICULTY_COLOR: Record<string, string> = {
  Easy:   'bg-green-900/30 text-green-400',
  Medium: 'bg-yellow-900/30 text-yellow-400',
  Hard:   'bg-red-900/30 text-red-400',
}

interface Props {
  problem: AlgoProblem
}

export function AlgoViewer({ problem }: Props) {
  const seq = useAlgoSequence(problem)
  const tts = useKokoroTTS()
  const [questionVisible, setQuestionVisible] = useState(false)
  const [keyMomentsOnly, setKeyMomentsOnly] = useState(false)
  const [understandingDone, setUnderstandingDone] = useState(false)
  const [approachDone, setApproachDone] = useState(false)
  const [hoveredQuestion, setHoveredQuestion] = useState<number | null>(null)
  // activePath per question index — set directly by text span hover, not animated
  const [pathPhases, setPathPhases] = useState<Record<number, number>>({})
  const setActivePath = (qi: number, path: number) => setPathPhases(p => ({ ...p, [qi]: path }))
  const clearActivePath = (qi: number) => setPathPhases(p => { const n = { ...p }; delete n[qi]; return n })

  const hasUnderstanding = (problem.understanding?.length ?? 0) > 0
  const hasApproach = !!problem.approach

  // Reset phases when user goes back to problem screen
  useEffect(() => {
    if (!seq.started) {
      setUnderstandingDone(false)
      setApproachDone(false)
      setQuestionVisible(false)
    }
  }, [seq.started])

  const failureModes = problem.failureModes ?? []
  const brokenStepCount = seq.activeFailureMode?.brokenSteps.length ?? 0

  const allSteps = [
    ...problem.steps,
    ...(problem.failureModes ?? []).flatMap(fm => [...fm.brokenSteps, ...fm.fixSteps]),
  ]
  const maxVarsCount = Math.max(0, ...allSteps.map(s => Object.keys(s.vars).length))

  const leftPanelRef = useRef<HTMLDivElement>(null)
  const stepContentRef = useRef<HTMLDivElement>(null)
  const [bottomSpacerHeight, setBottomSpacerHeight] = useState(0)

  useEffect(() => {
    if (!questionVisible) {
      setBottomSpacerHeight(0)
      return
    }
    const frame = requestAnimationFrame(() => {
      const scrollArea = leftPanelRef.current
      const stepContent = stepContentRef.current
      if (!scrollArea || !stepContent) return
      setBottomSpacerHeight(Math.max(0, scrollArea.clientHeight - stepContent.offsetHeight))
    })
    return () => cancelAnimationFrame(frame)
  }, [questionVisible])

  const visibleSteps = keyMomentsOnly
    ? seq.steps.filter((s) => s.isPausePoint)
    : seq.steps

  const visibleIndex = keyMomentsOnly
    ? visibleSteps.indexOf(seq.currentStep)
    : seq.currentIndex

  const goToVisible = (idx: number) => {
    const step = visibleSteps[idx]
    if (!step) return
    seq.goTo(seq.steps.indexOf(step))
  }

  const solutionCode = seq.activeFailureMode?.solutionCode ?? problem.solutionCode
  const activeHighlightTerms = hoveredQuestion !== null
    ? (problem.understanding?.[hoveredQuestion]?.highlightTerms ?? [])
    : []

  const onUnderstandingStep = seq.started && hasUnderstanding && !understandingDone
  const onApproachStep = seq.started && hasApproach && !approachDone && (!hasUnderstanding || understandingDone)

  // ── Shared left panel chrome ───────────────────────────────────────────────
  // Question panel + scrollable inner + pinned footer used in both understanding
  // and walkthrough. Extracted as inline to share refs without prop-drilling.

  return (
    <div className="flex flex-col h-screen bg-[#13131a]">
      {/* ── Header ── */}
      <header className="bg-[#1e1e2e] border-b border-[#313244] px-4 lg:px-6 py-3 shrink-0 z-10">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3 flex-wrap">
          <Link href="/" className="text-indigo-400 font-semibold text-base hover:text-indigo-300 shrink-0">
            Fundamentals
          </Link>
          <span className="text-[#45475a]">/</span>
          <span className="text-sm text-[#a6adc8] font-medium truncate">{problem.title}</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_COLOR[problem.difficulty]}`}>
            {problem.difficulty}
          </span>

          <div className="ml-auto flex items-center gap-3 shrink-0">
            {seq.started && !onUnderstandingStep && !onApproachStep && (
              <span className="text-xs text-[#6c7086] hidden sm:block">
                Step {seq.currentIndex + 1} of {seq.totalSteps}
                <span className="ml-2 text-[#45475a] hidden md:inline">· ← → or Space</span>
              </span>
            )}
            {seq.started && !onUnderstandingStep && !onApproachStep && (
              <button
                onClick={() => {
                  const willShow = !questionVisible
                  setQuestionVisible(willShow)
                  if (willShow && leftPanelRef.current) {
                    leftPanelRef.current.scrollTop = 0
                  }
                }}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-all ${
                  questionVisible
                    ? 'bg-indigo-900/30 border-indigo-700 text-indigo-300'
                    : 'bg-[#313244] border-[#45475a] text-[#6c7086] hover:border-indigo-700 hover:text-indigo-400'
                }`}
              >
                📋 Question
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ── Main ── */}
      <div className="flex-1 min-h-0 overflow-hidden" {...(seq.started && !onUnderstandingStep ? seq.swipeHandlers : {})}>
        {!seq.started ? (
          /* ── Pre-start ── */
          <div className="h-full max-w-screen-xl mx-auto px-4 lg:px-6 py-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="overflow-y-auto flex flex-col gap-5">
              <div>
                <h1 className="text-xl font-bold text-[#cdd6f4] mb-1">{problem.title}</h1>
                <div className="flex items-center gap-2 mb-4">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_COLOR[problem.difficulty]}`}>
                    {problem.difficulty}
                  </span>
                </div>
                <pre className="text-sm text-[#a6adc8] leading-relaxed whitespace-pre-wrap font-sans">
                  <AnnotatedText text={problem.question} activeTerms={[]} />
                </pre>
              </div>
              <button
                onClick={() => seq.start()}
                className="self-start bg-indigo-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl hover:bg-indigo-500 transition-colors"
              >
                Start walkthrough →
              </button>
            </div>

            {/* Starter code */}
            <div className="flex flex-col rounded-xl overflow-hidden border border-[#313244] min-h-0">
              <div className="bg-[#181825] px-4 py-2 flex items-center gap-2 border-b border-[#313244] shrink-0">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/60" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                  <div className="w-3 h-3 rounded-full bg-green-500/60" />
                </div>
                <span className="text-xs text-[#6c7086] font-mono ml-2">starter.ts</span>
              </div>
              <div className="bg-[#1e1e2e] flex-1 py-4 font-mono text-sm overflow-y-auto">
                {problem.starterCode.split('\n').map((lineText, idx) => (
                  <div key={idx} className="flex items-start px-0">
                    <span
                      className="select-none shrink-0 text-right pr-4 pl-4 text-[#45475a]"
                      style={{ width: 48, fontSize: 11, paddingTop: 1 }}
                    >
                      {idx + 1}
                    </span>
                    <span className="whitespace-pre">
                      {tokenizeLine(lineText).map((token, ti) => (
                        <span key={ti} style={{ color: TOKEN_COLORS[token.type] }}>{token.text}</span>
                      ))}
                      {!lineText && ' '}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

        ) : onApproachStep ? (
          /* ── Approach step ── */
          <ApproachPanel
            problem={problem}
            backLabel={hasUnderstanding ? '← Understand' : '← Problem'}
            onBack={() => hasUnderstanding ? setUnderstandingDone(false) : seq.reset()}
            onContinue={() => setApproachDone(true)}
            ttsSpeak={tts.speak}
            ttsStatus={tts.status}
            ttsActiveText={tts.activeText}
          />

        ) : onUnderstandingStep ? (
          /* ── Understanding step ── */
          <div className="flex h-full">
            {/* Left panel — question text only, with hover-driven highlights */}
            <div className="w-[460px] shrink-0 flex flex-col bg-[#1e1e2e] border-r border-[#313244]">
              <div className="flex-1 min-h-0 overflow-y-auto px-5 py-5">
                <p className="text-[11px] font-semibold text-[#45475a] uppercase tracking-wide mb-3">Problem</p>
                <pre className="text-sm text-[#a6adc8] leading-relaxed whitespace-pre-wrap font-sans">
                  <AnnotatedText text={problem.question} activeTerms={activeHighlightTerms} />
                </pre>
              </div>
              <div className="border-t border-[#313244] px-4 py-3 shrink-0 bg-[#1e1e2e]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={seq.reset}
                    className="text-sm text-[#6c7086] hover:text-[#a6adc8] transition-colors px-2 py-1"
                  >
                    ← Problem
                  </button>
                  <button
                    onClick={() => setUnderstandingDone(true)}
                    className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                  >
                    {hasApproach ? 'Approach →' : 'Walkthrough →'}
                  </button>
                </div>
              </div>
            </div>

            {/* Right panel — Q&A cards */}
            <div className="flex-1 min-w-0 overflow-y-auto bg-[#13131a]">
              <div className="max-w-xl mx-auto px-6 py-6 flex flex-col gap-4">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded font-mono bg-indigo-900/30 text-indigo-400">
                    Understand
                  </span>
                  <h3 className="text-sm font-semibold text-[#cdd6f4]">Before you walk through</h3>
                </div>

                {(problem.understanding ?? []).map((q, i) => {
                  const pathHandlers: PathHandler[] = (q.pathAnnotations ?? []).map(ann => ({
                    text: ann.text,
                    onHover: () => setActivePath(i, ann.path),
                    onLeave: () => clearActivePath(i),
                  }))
                  const hasPaths = q.visual?.type === 'staircase' && !!(q.visual as StaircaseState).paths?.length
                  const staircaseState = q.visual?.type === 'staircase'
                    ? hasPaths
                      ? { ...(q.visual as StaircaseState), activePath: pathPhases[i] }
                      : (q.visual as StaircaseState)
                    : null

                  return (
                    <div
                      key={i}
                      onMouseEnter={() => setHoveredQuestion(i)}
                      onMouseLeave={() => setHoveredQuestion(null)}
                      className={`flex flex-col gap-2 p-4 rounded-xl border transition-all cursor-default ${
                        hoveredQuestion === i
                          ? 'bg-[#1e1e2e] border-indigo-600'
                          : 'bg-[#1e1e2e] border-[#313244] hover:border-[#45475a]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm text-[#6c7086] font-medium">{q.question}</p>
                        <TTSButton
                          text={stripForSpeech(q.answer)}
                          speak={tts.speak}
                          status={tts.status}
                          activeText={tts.activeText}
                        />
                      </div>
                      <p className="text-[15px] text-[#cdd6f4] leading-relaxed font-[450]">
                        <AnswerText text={q.answer} pathHandlers={pathHandlers} />
                      </p>
                      {q.visual?.type === 'array-row' && (
                        <div className="bg-[#181825] rounded-xl border border-[#313244] p-4 mt-1">
                          <ArrayRowViz state={q.visual} />
                        </div>
                      )}
                      {q.visual?.type === 'dp-row' && (
                        <div className="bg-[#181825] rounded-xl border border-[#313244] p-4 mt-1">
                          <DPRowViz state={q.visual} />
                        </div>
                      )}
                      {staircaseState && (
                        <div className="bg-[#181825] rounded-xl border border-[#313244] p-4 mt-1">
                          <StaircaseViz state={staircaseState} />
                        </div>
                      )}
                      {q.visual?.type === 'grid' && (
                        <div className="bg-[#181825] rounded-xl border border-[#313244] p-4 mt-1">
                          <GridViz state={q.visual} />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

        ) : (
          /* ── Walkthrough ── */
          <div className="flex h-full">
            <div className="w-[460px] shrink-0 flex flex-col bg-[#1e1e2e] border-r border-[#313244]">

              <div ref={leftPanelRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">

                {questionVisible && (
                  <div className="border-b border-[#313244] px-4 py-4 bg-[#181825]">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-[11px] font-semibold text-[#45475a] uppercase tracking-wide">Problem</h3>
                      <button
                        onClick={() => setQuestionVisible(false)}
                        className="text-[#45475a] hover:text-[#6c7086] text-sm leading-none"
                      >
                        ✕
                      </button>
                    </div>
                    <pre className="text-xs text-[#a6adc8] leading-relaxed whitespace-pre-wrap font-sans">
                      <AnnotatedText text={problem.question} activeTerms={[]} />
                    </pre>
                  </div>
                )}

                <div ref={stepContentRef} className="px-4 py-4">
                  <AlgoStepPanel
                    step={seq.currentStep}
                    stepIndex={seq.currentIndex}
                    mode={seq.mode}
                    failureModeLabel={seq.activeFailureMode?.label ?? null}
                    brokenStepCount={brokenStepCount}
                    maxVarsCount={maxVarsCount}
                  />
                </div>

                {questionVisible && bottomSpacerHeight > 0 && (
                  <div aria-hidden style={{ height: bottomSpacerHeight }} />
                )}
              </div>

              <div className="border-t border-[#313244] px-4 py-3 shrink-0 bg-[#1e1e2e]">
                <div className="flex items-center gap-2 mb-2">
                  <button
                    onClick={seq.isFirst
                      ? hasApproach
                        ? () => setApproachDone(false)
                        : hasUnderstanding
                          ? () => setUnderstandingDone(false)
                          : seq.reset
                      : seq.back
                    }
                    className="text-sm text-[#6c7086] hover:text-[#a6adc8] transition-colors px-2 py-1"
                  >
                    {seq.isFirst && hasApproach ? '← Approach' : seq.isFirst && hasUnderstanding ? '← Understand' : '← Back'}
                  </button>

                  <button
                    onClick={seq.togglePlay}
                    className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
                  >
                    {seq.isPlaying ? '⏸ Pause' : '▶ Play'}
                  </button>

                  <button
                    onClick={seq.advance}
                    disabled={seq.isLast}
                    className="text-sm text-indigo-400 disabled:opacity-30 hover:text-indigo-300 font-medium transition-colors px-2 py-1"
                  >
                    Next →
                  </button>

                  <div className="ml-auto text-xs text-[#6c7086]">
                    {seq.currentIndex + 1} / {seq.totalSteps}
                  </div>
                </div>

                <div
                  className={`flex items-center text-xs px-3 py-1.5 rounded-lg border w-full transition-all ${
                    keyMomentsOnly
                      ? 'bg-indigo-900/30 border-indigo-700 text-indigo-300 font-medium'
                      : 'bg-[#181825] border-[#313244] text-[#6c7086]'
                  }`}
                >
                  <button
                    onClick={() => {
                      setKeyMomentsOnly((v) => !v)
                      if (!keyMomentsOnly) {
                        const nearest = seq.steps
                          .slice(0, seq.currentIndex + 1)
                          .filter((s) => s.isPausePoint)
                          .at(-1)
                        if (nearest) seq.goTo(seq.steps.indexOf(nearest))
                      }
                    }}
                    className="flex items-center gap-2 flex-1 bg-transparent border-0 p-0 text-left cursor-pointer text-inherit"
                  >
                    <span className="text-[10px]">{keyMomentsOnly ? '●' : '○'}</span>
                    Key moments only
                  </button>

                  {keyMomentsOnly && (
                    <div className="ml-auto flex items-center gap-1">
                      {visibleSteps.map((s, i) => (
                        <button
                          key={s.id}
                          onClick={() => goToVisible(i)}
                          className={`rounded-full transition-all ${
                            i === visibleIndex
                              ? 'w-2.5 h-2.5 bg-indigo-500'
                              : 'w-1.5 h-1.5 bg-indigo-800 hover:bg-indigo-600'
                          }`}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0 overflow-hidden">
              <SolutionCodePanel
                solutionCode={solutionCode}
                currentLine={seq.currentStep.currentLine}
                vars={seq.currentStep.vars}
                codeSections={problem.codeSections}
                pattern={problem.pattern}
              />
            </div>
          </div>
        )}
      </div>

      {failureModes.length > 0 && seq.started && !onUnderstandingStep && (
        <>
          <FailureModeBar
            failureModes={failureModes as never}
            mode={seq.mode}
            onSetMode={seq.setMode}
          />
          <FailureModeSheet
            failureModes={failureModes as never}
            mode={seq.mode}
            onSetMode={seq.setMode}
            started={seq.started}
          />
        </>
      )}
    </div>
  )
}
