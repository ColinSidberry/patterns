'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { AlgoMonsterEntry, Difficulty } from '@/data/algo-monster-types'

// Only the fields the viewer actually renders. Trimming server-side keeps
// rawText/explanation/lessonExamples out of the RSC payload sent to the client.
export type StudyEntry = Pick<
  AlgoMonsterEntry,
  | 'id' | 'title' | 'difficulty' | 'pattern' | 'leetcodeUrl'
  | 'question' | 'understand' | 'approach'
  | 'slotTemplate' | 'solutionJS'
  | 'testKind' | 'className' | 'entryFunction' | 'paramNames'
  | 'paramHints' | 'returnHint' | 'tests'
  | 'complexity' | 'viz'
>
import { AccordionSection } from './AccordionSection'
import { Markdown } from './Markdown'
import { QuestionRenderer } from './QuestionRenderer'
import { CodeBlock } from './CodeBlock'
import { MyCode } from './MyCode'
import { CompareDrawer, type SiblingEntry } from './CompareDrawer'
import { SrsControls } from './SrsControls'
import { PageStopwatch } from './PageStopwatch'
import { NotesPanel } from './NotesPanel'
import { DevNotesInbox } from './DevNotesInbox'
import { SolutionDebugger } from './SolutionDebugger'
import { UnderstandViz } from './UnderstandViz'
import { StudyNav } from './StudyNav'
import { TraceProvider } from './TraceProvider'
import { DueTodayBadge } from '@/components/DueTodayBadge'

const DIFFICULTY_COLOR: Record<Difficulty, string> = {
  easy:   'bg-green-900/30 text-green-400',
  medium: 'bg-yellow-900/30 text-yellow-400',
  hard:   'bg-red-900/30 text-red-400',
}

interface Props {
  entry: StudyEntry
  prevId: string | null
  nextId: string | null
  patternName?: string | null
  siblings?: SiblingEntry[]
  tagSiblings?: SiblingEntry[]
  slotLabels?: Record<number, string>   // line# → slot label, derived server-side
  coreIds?: string[]                    // for the header daily-count badge
}

export function StudyViewer({ entry, prevId, nextId, patternName, siblings, tagSiblings, slotLabels, coreIds }: Props) {
  const hasUnderstand = !!entry.understand
  const hasApproach = !!entry.approach
  const hasReferenceCode = !!entry.solutionJS

  // Both SolutionDebugger and UnderstandViz read from a shared TraceContext
  // — wrap the main in TraceProvider whenever we have a function-style
  // executable solution. The provider runs ONE worker for both consumers.
  const useTraceProvider = !!(
    entry.solutionJS &&
    entry.entryFunction &&
    entry.testKind === 'function' &&
    entry.tests && entry.tests.length > 0
  )

  // Asymmetric accordion: opening a section closes any open ones ABOVE it
  // (you've moved past them), but leaves anything BELOW alone (you may be
  // referencing it). Clicking an open section just closes that one.
  const SECTION_ORDER = ['question', 'understand', 'approach', 'my-code', 'reference'] as const
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set(['question']))
  const onToggle = (id: string) => {
    setOpenIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
        return next
      }
      const clickedIdx = SECTION_ORDER.indexOf(id as typeof SECTION_ORDER[number])
      for (const openId of next) {
        const idx = SECTION_ORDER.indexOf(openId as typeof SECTION_ORDER[number])
        if (idx >= 0 && idx < clickedIdx) next.delete(openId)
      }
      next.add(id)
      return next
    })
  }

  return (
    <div className="flex flex-col min-h-screen bg-[#13131a]">
      {/* Dev-only: drains `.dev-notes-inbox.json` into localStorage on mount.
          No-ops in production (the API returns 404). */}
      <DevNotesInbox />
      {/* ── Header ── */}
      <header className="bg-[#1e1e2e] border-b border-[#313244] px-4 lg:px-6 py-3 shrink-0 z-10 sticky top-0">
        <div className="max-w-screen-md mx-auto flex items-center gap-3 flex-wrap">
          <Link
            href="/"
            className="text-indigo-400 font-semibold text-base hover:text-indigo-300 shrink-0"
          >
            Fundamentals
          </Link>
          <span className="text-[#45475a]">/</span>
          {entry.leetcodeUrl ? (
            <a
              href={entry.leetcodeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-[#a6adc8] font-medium truncate hover:text-indigo-300 underline decoration-dotted underline-offset-2 transition-colors"
              title="Open on LeetCode"
            >
              {entry.title} ↗
            </a>
          ) : (
            <span className="text-sm text-[#a6adc8] font-medium truncate">
              {entry.title}
            </span>
          )}
          {entry.difficulty && (
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${DIFFICULTY_COLOR[entry.difficulty]}`}
            >
              {entry.difficulty}
            </span>
          )}
          {/* Pattern badge intentionally omitted from the header — it
              tips off the technique before the user has tried to
              recognize it. The pattern is still surfaced in the
              Reference Solution slot labels and on /patterns/[id]. */}

          <div className="ml-auto flex items-center gap-2 shrink-0">
            {coreIds && <DueTodayBadge coreIds={coreIds} />}
            <PageStopwatch problemId={entry.id} />
            <StudyNav
              currentId={entry.id}
              {...(coreIds && { coreIds })}
              fallbackPrevId={prevId}
              fallbackNextId={nextId}
            />
          </div>
        </div>
      </header>

      {/* ── Body ── */}
      <main className="flex-1 max-w-screen-md w-full mx-auto px-4 lg:px-6 py-6 flex flex-col gap-4">
      <BodyTraceWrap
        active={useTraceProvider}
        code={entry.solutionJS ?? ''}
        entryFunction={entry.entryFunction ?? ''}
        {...(entry.paramHints && { paramHints: entry.paramHints })}
        {...(entry.returnHint && { returnHint: entry.returnHint })}
        tests={entry.tests ?? []}
        vizConfig={entry.viz ?? null}
      >
        <AccordionSection id="question" title="Question" open={openIds.has('question')} onToggle={onToggle}>
          <div className="pt-3">
            {entry.question ? (
              <QuestionRenderer text={entry.question} />
            ) : (
              <p className="text-sm text-[#6c7086] italic">No problem statement available.</p>
            )}
          </div>
        </AccordionSection>

        {hasUnderstand && (
          <AccordionSection id="understand" title="Understand" open={openIds.has('understand')} onToggle={onToggle}>
            {entry.viz && useTraceProvider ? (
              <div className="pt-3">
                <UnderstandViz text={entry.understand!} vizConfig={entry.viz} />
              </div>
            ) : (
              <Markdown text={entry.understand!} className="pt-3" />
            )}
          </AccordionSection>
        )}

        {hasApproach && (
          <AccordionSection id="approach" title="Approach" open={openIds.has('approach')} onToggle={onToggle}>
            <Markdown text={entry.approach!} className="pt-3" />
          </AccordionSection>
        )}

        <AccordionSection id="my-code" title="My Code" open={openIds.has('my-code')} onToggle={onToggle}>
          <div className="pt-3">
            <MyCode
              problemId={entry.id}
              testKind={entry.testKind}
              className={entry.className}
              entryFunction={entry.entryFunction}
              paramNames={entry.paramNames}
              paramHints={entry.paramHints}
              returnHint={entry.returnHint}
              tests={entry.tests}
              {...(entry.solutionJS && { solutionJS: entry.solutionJS })}
            />
          </div>
        </AccordionSection>

        {hasReferenceCode && (
          <AccordionSection
            id="reference"
            title="Reference Solution"
            open={openIds.has('reference')}
            onToggle={onToggle}
          >
            <div className="pt-3 flex flex-col gap-6">
              {useTraceProvider ? (
                <SolutionDebugger
                  code={entry.solutionJS!}
                  problemId={entry.id}
                  {...(entry.paramNames && { paramNames: entry.paramNames })}
                  {...(slotLabels && { slotLabels })}
                />
              ) : (
                <CodeBlock code={entry.solutionJS!} />
              )}

              {/* Complexity, Spaced Repetition, Notes — bucketed under the
                  Reference Solution accordion (no separate fold). */}
              <div className="border-t border-[#313244]" />

              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-[#6c7086] font-semibold mb-2">
                  Complexity
                </h3>
                {entry.complexity ? (
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                      <div>
                        <span className="text-[#6c7086] mr-2">Time:</span>
                        <span className="font-mono text-emerald-300">
                          {entry.complexity.time}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#6c7086] mr-2">Space:</span>
                        <span className="font-mono text-cyan-300">
                          {entry.complexity.space}
                        </span>
                      </div>
                    </div>
                    {entry.complexity.notes && (
                      <p className="text-xs text-[#a6adc8] leading-relaxed">
                        {entry.complexity.notes}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-[#6c7086] italic">
                    No complexity data — this entry has no executable solution.
                  </p>
                )}
              </div>

              <div className="border-t border-[#313244]" />

              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-[#6c7086] font-semibold mb-2">
                  Spaced Repetition
                </h3>
                <SrsControls problemId={entry.id} {...(siblings && { siblings })} />
              </div>

              <div className="border-t border-[#313244]" />

              <div>
                <h3 className="text-[10px] uppercase tracking-wider text-[#6c7086] font-semibold mb-2">
                  Notes
                </h3>
                <NotesPanel problemId={entry.id} />
              </div>
            </div>
          </AccordionSection>
        )}
      </BodyTraceWrap>
      </main>

      {entry.pattern && patternName && siblings && (siblings.length > 1 || (tagSiblings && tagSiblings.length > 0)) && (
        <CompareDrawer
          currentId={entry.id}
          patternName={patternName}
          patternId={entry.pattern}
          siblings={siblings}
          {...(tagSiblings && tagSiblings.length > 0 && { tagSiblings })}
        />
      )}
    </div>
  )
}

// ── Trace context wrap ────────────────────────────────────────────────────
// Wraps the body in TraceProvider when we have an executable function-style
// solution. SolutionDebugger and UnderstandViz both consume the same trace
// state via useTrace(), so stepping in either one updates the other.

import type { ParamHint, TestCase, VizConfig } from '@/data/algo-monster-types'

function BodyTraceWrap({
  active, code, entryFunction, paramHints, returnHint, tests, vizConfig, children,
}: {
  active: boolean
  code: string
  entryFunction: string
  paramHints?: ParamHint[]
  returnHint?: ParamHint
  tests: TestCase[]
  vizConfig: VizConfig | null
  children: React.ReactNode
}) {
  if (!active) return <>{children}</>
  return (
    <TraceProvider
      code={code}
      entryFunction={entryFunction}
      {...(paramHints && { paramHints })}
      {...(returnHint && { returnHint })}
      tests={tests}
      vizConfig={vizConfig}
    >
      {children}
    </TraceProvider>
  )
}

