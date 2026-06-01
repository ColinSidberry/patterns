'use client'

import { useState } from 'react'
import { AlgoProblem, ApproachCard, ArrayRowState, DPRowState, DefinedTerm } from '@/data/algo-types'
import { TTSStatus } from '@/lib/useKokoroTTS'
import { AnnotatedText } from './AnnotatedText'
import { ArrayRowViz } from './ArrayRowViz'
import { DPRowViz } from './DPRowViz'
import { LinkedListViz } from './LinkedListViz'
import { TreeViz } from './TreeViz'
import { GridViz } from './GridViz'
import { StaircaseViz } from './StaircaseViz'
import { TTSButton } from './TTSButton'

function TermAnnotatedText({ text, definedTerms }: { text: string; definedTerms?: DefinedTerm[] }) {
  if (!definedTerms?.length) return <>{text}</>
  const escaped = definedTerms.map(d => d.term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const re = new RegExp(`\\b(${escaped.join('|')})\\b`, 'gi')
  const parts = text.split(re)
  const termMap = new Map(definedTerms.map(d => [d.term.toLowerCase(), d.definition]))
  return (
    <>
      {parts.map((part, i) => {
        const def = termMap.get(part.toLowerCase())
        if (def) {
          return (
            <span key={i} className="relative inline group/term cursor-help">
              <span className="text-amber-400 underline decoration-dashed underline-offset-2">{part}</span>
              <span className="absolute bottom-full left-0 mb-2 z-50 hidden group-hover/term:block w-60 text-xs bg-[#181825] border border-[#45475a] text-[#a6adc8] rounded-lg p-2.5 shadow-xl leading-relaxed pointer-events-none whitespace-normal">
                {def}
              </span>
            </span>
          )
        }
        return <span key={i}>{part}</span>
      })}
    </>
  )
}

function SectionDivider({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 mt-1">
      <span className="text-[10px] font-semibold text-[#45475a] uppercase tracking-widest shrink-0">{label}</span>
      <div className="flex-1 border-t border-[#313244]" />
    </div>
  )
}

function CardView({ card, isHovered, onEnter, onLeave }: {
  card: ApproachCard
  isHovered: boolean
  onEnter: () => void
  onLeave: () => void
}) {
  const base = 'flex flex-col rounded-xl border transition-all cursor-default select-none'
  const hoverBorder = isHovered
    ? 'border-indigo-600'
    : 'border-[#313244] hover:border-[#45475a]'

  if (card.type === 'trace') {
    return (
      <div
        className={`${base} ${hoverBorder} gap-0 overflow-hidden`}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <div className="px-4 pt-3 pb-2">
          <p className="text-xs text-[#6c7086] font-medium">{card.label}</p>
        </div>
        <div className="px-4 pb-3 flex flex-col gap-1.5">
          {card.inputs.map((input, i) => (
            <div key={i} className="flex items-baseline gap-2">
              <span className="text-xs font-mono text-[#a6adc8]">{input.label}</span>
              <span className="text-xs font-mono font-semibold text-[#cdd6f4]">{input.value}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-[#313244] px-4 py-2.5 bg-[#181825]">
          <span className="text-sm font-mono text-[#a6e3a1]">{card.result}</span>
        </div>
      </div>
    )
  }

  if (card.type === 'equation') {
    return (
      <div className={`${base} border-[#313244] p-4 gap-3`}>
        <p className="text-sm text-[#a6adc8] leading-relaxed">{card.insight}</p>
        <div className="bg-[#181825] rounded-lg px-4 py-3 border border-[#313244]">
          <code className="text-sm font-mono text-[#cba6f7]">{card.formula}</code>
        </div>
      </div>
    )
  }

  if (card.type === 'insight') {
    return (
      <div
        className={`${base} ${hoverBorder} p-4 gap-2`}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <p className="text-sm text-[#6c7086] font-medium">{card.question}</p>
        <p className="text-sm text-[#cdd6f4] leading-relaxed">
          <TermAnnotatedText text={card.answer} definedTerms={card.definedTerms} />
        </p>
      </div>
    )
  }

  if (card.type === 'reveal') {
    return (
      <div className={`${base} border-indigo-600/40 p-4 gap-2`}>
        <p className="text-xs text-[#6c7086] font-medium">Pattern</p>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-[#cdd6f4]">This is a</span>
          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-300 border border-indigo-700/50">
            {card.pattern}
          </span>
          <span className="text-sm text-[#cdd6f4]">problem.</span>
        </div>
      </div>
    )
  }

  if (card.type === 'decision') {
    const lIsSmaller = card.shorterSide === 'l'
    return (
      <div
        className={`${base} ${hoverBorder} gap-0 overflow-hidden`}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
      >
        <div className="flex items-center justify-center gap-8 px-4 py-4">
          <div className={`flex flex-col items-center gap-1 ${lIsSmaller ? 'text-amber-400' : 'text-[#585b70]'}`}>
            <span className="text-[10px] font-mono text-[#6c7086]">height[l]</span>
            <span className="text-3xl font-mono font-bold">{card.heightL}</span>
            {lIsSmaller && <span className="text-[9px] font-mono text-amber-500/70 tracking-widest uppercase">step</span>}
          </div>
          <span className="text-xl font-mono text-[#45475a] mt-1">{lIsSmaller ? '<' : '>'}</span>
          <div className={`flex flex-col items-center gap-1 ${!lIsSmaller ? 'text-amber-400' : 'text-[#585b70]'}`}>
            <span className="text-[10px] font-mono text-[#6c7086]">height[r]</span>
            <span className="text-3xl font-mono font-bold">{card.heightR}</span>
            {!lIsSmaller && <span className="text-[9px] font-mono text-amber-500/70 tracking-widest uppercase">step</span>}
          </div>
        </div>
        <div className="border-t border-[#313244] px-4 py-2.5 bg-[#181825]">
          <p className="text-xs text-[#6c7086] leading-relaxed">{card.reason}</p>
        </div>
      </div>
    )
  }

  return null
}

interface HoverState {
  key: string
  highlight?: number[]
  highlightTerms?: string[]
  pointers?: Record<string, number>
}

interface Props {
  problem: AlgoProblem
  backLabel?: string
  continueLabel?: string
  onBack: () => void
  onContinue: () => void
  ttsSpeak?: (text: string) => void
  ttsStatus?: TTSStatus
  ttsActiveText?: string | null
}

export function ApproachPanel({ problem, backLabel = '← Understand', continueLabel = 'Walkthrough →', onBack, onContinue, ttsSpeak, ttsStatus = 'idle', ttsActiveText = null }: Props) {
  const [hoverState, setHoverState] = useState<HoverState | null>(null)
  const approach = problem.approach!

  // If a card is hovered and its section has its own vizState, use that instead
  const activeSectionIdx = hoverState ? parseInt(hoverState.key.split('-')[0]) : -1
  const hoveredCardIdx = hoverState ? parseInt(hoverState.key.split('-')[1]) : -1
  const sectionVizOverride = activeSectionIdx >= 0
    ? approach.sections[activeSectionIdx]?.vizState
    : undefined
  const hoveredCard = activeSectionIdx >= 0 && hoveredCardIdx >= 0
    ? approach.sections[activeSectionIdx]?.cards[hoveredCardIdx]
    : undefined

  const activeVizState = (() => {
    // Section-level override — dispatch per viz type and card type
    if (sectionVizOverride) {
      if (sectionVizOverride.type === 'staircase' && hoverState?.highlight?.[0] !== undefined) {
        return { ...sectionVizOverride, highlightStep: hoverState.highlight[0] }
      }
      if (sectionVizOverride.type === 'tree' && hoverState?.highlight?.length) {
        // insight cards → amber highlightPath (duplicates); trace cards → indigo activeNodes (referenced children)
        if (hoveredCard?.type === 'insight') {
          return { ...sectionVizOverride, highlightPath: hoverState.highlight, activeNodes: undefined }
        }
        return { ...sectionVizOverride, activeNodes: hoverState.highlight, highlightPath: undefined }
      }
      if (sectionVizOverride.type === 'grid' && hoverState?.highlight?.length) {
        // highlight encodes [r, c] pairs — decode into [number, number][] for active cells
        const pairs: [number, number][] = []
        for (let i = 0; i + 1 < hoverState.highlight.length; i += 2) {
          pairs.push([hoverState.highlight[i], hoverState.highlight[i + 1]])
        }
        return { ...sectionVizOverride, active: pairs }
      }
      return sectionVizOverride
    }

    if (!approach.vizState) return null
    if (approach.vizState.type === 'array-row') {
      return {
        ...approach.vizState,
        highlight: hoverState?.highlight,
        pointers: hoverState?.pointers ?? {},
        note: hoverState ? undefined : approach.vizState.note,
      } as ArrayRowState
    }
    if (approach.vizState.type === 'dp-row') {
      return {
        ...approach.vizState,
        activeIndex: hoverState?.highlight?.[0] ?? -1,
        note: hoverState ? undefined : approach.vizState.note,
      } as DPRowState
    }
    // Other viz types: pass through unchanged
    return approach.vizState
  })()

  const activeTerms = hoverState?.highlightTerms ?? []

  const handleEnter = (si: number, ci: number, card: ApproachCard) => {
    setHoverState({
      key: `${si}-${ci}`,
      highlight: card.type === 'trace' || card.type === 'decision'
        ? card.highlight
        : card.type === 'insight'
          ? card.highlight
          : undefined,
      highlightTerms: card.type === 'trace' || card.type === 'insight' ? card.highlightTerms : undefined,
      pointers: card.type === 'decision' ? card.pointers : undefined,
    })
  }

  return (
    <div className="flex h-full">
      {/* Left — problem text + viz */}
      <div className="w-[460px] shrink-0 flex flex-col bg-[#1e1e2e] border-r border-[#313244]">
        <div className="flex-1 min-h-0 overflow-y-auto px-5 pt-5 pb-3">
          <p className="text-[11px] font-semibold text-[#45475a] uppercase tracking-wide mb-3">Problem</p>
          <pre className="text-sm text-[#a6adc8] leading-relaxed whitespace-pre-wrap font-sans">
            <AnnotatedText text={problem.question} activeTerms={activeTerms} />
          </pre>
        </div>

        {activeVizState && (
          <div className="shrink-0 px-4 pt-3 pb-3 border-t border-[#313244]">
            {activeVizState.type === 'array-row' && <ArrayRowViz state={activeVizState} />}
            {activeVizState.type === 'dp-row' && <DPRowViz state={activeVizState} />}
            {activeVizState.type === 'linked-list' && <LinkedListViz state={activeVizState} />}
            {activeVizState.type === 'tree' && <TreeViz state={activeVizState} />}
            {activeVizState.type === 'grid' && <GridViz state={activeVizState} />}
            {activeVizState.type === 'staircase' && <StaircaseViz state={activeVizState} />}
            {activeVizState.note && (
              <p className="text-[10px] text-[#6c7086] leading-relaxed mt-2">{activeVizState.note}</p>
            )}
          </div>
        )}

        <div className="border-t border-[#313244] px-4 py-3 shrink-0 bg-[#1e1e2e]">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="text-sm text-[#6c7086] hover:text-[#a6adc8] transition-colors px-2 py-1"
            >
              {backLabel}
            </button>
            <button
              onClick={onContinue}
              className="ml-auto flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors"
            >
              {continueLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Right — sections + cards */}
      <div className="flex-1 min-w-0 overflow-y-auto bg-[#13131a]">
        <div className="max-w-xl mx-auto px-6 py-6 flex flex-col gap-3">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded font-mono bg-indigo-900/30 text-indigo-400">
              Approach
            </span>
            <h3 className="text-sm font-semibold text-[#cdd6f4]">How do you arrive at the solution?</h3>
          </div>

          {approach.sections.map((section, si) => (
            <div key={si} className="flex flex-col gap-3">
              <SectionDivider label={section.label} />
              {section.description && (
                <div className="flex items-start gap-2 -mt-1">
                  <p className="text-sm text-[#a6adc8] leading-relaxed flex-1">{section.description}</p>
                  {ttsSpeak && (
                    <TTSButton
                      text={section.description}
                      speak={ttsSpeak}
                      status={ttsStatus}
                      activeText={ttsActiveText}
                    />
                  )}
                </div>
              )}
              {section.cards.map((card, ci) => (
                <CardView
                  key={ci}
                  card={card}
                  isHovered={hoverState?.key === `${si}-${ci}`}
                  onEnter={() => handleEnter(si, ci, card)}
                  onLeave={() => setHoverState(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
