import { notFound } from 'next/navigation'
import { getProblemById, getAllProblemIds, getNeighbors } from '@/lib/algoMonster'
import { StudyViewer, type StudyEntry } from '@/components/StudyViewer'
import type { SiblingEntry } from '@/components/StudyViewer/CompareDrawer'
import { getPattern, getPatternMembers, getTagSiblings } from '@/lib/patterns'
import { getCoreIds } from '@/lib/coreCatalog'
import { deriveSlotLabels } from '@/lib/runner/slotMapping'

interface Props {
  params: Promise<{ problemId: string }>
}

export default async function StudyPage({ params }: Props) {
  const { problemId } = await params
  const entry = getProblemById(problemId)
  if (!entry) notFound()
  const { prev, next } = getNeighbors(problemId)
  const studyEntry: StudyEntry = {
    id: entry.id,
    title: entry.title,
    difficulty: entry.difficulty,
    pattern: entry.pattern,
    leetcodeUrl: entry.leetcodeUrl,
    question: entry.question?.trim() || entry.practiceQuestion?.trim() || '',
    understand: entry.understand,
    approach: entry.approach,
    slotTemplate: entry.slotTemplate,
    solutionJS: entry.solutionJS,
    testKind: entry.testKind,
    className: entry.className,
    entryFunction: entry.entryFunction,
    paramNames: entry.paramNames,
    paramHints: entry.paramHints,
    returnHint: entry.returnHint,
    tests: entry.tests,
    complexity: entry.complexity,
    viz: entry.viz,
  }
  let siblings: SiblingEntry[] = []
  let patternName: string | null = null
  if (entry.pattern) {
    const pat = getPattern(entry.pattern)
    patternName = pat?.name ?? null
    siblings = getPatternMembers(entry.pattern).map((m) => ({
      id: m.id,
      title: m.title,
      ...(m.difficulty && { difficulty: m.difficulty }),
      ...(m.slotTemplate !== undefined && { slotTemplate: m.slotTemplate }),
      ...(m.solutionJS && { solutionJS: m.solutionJS }),
    }))
  }

  // Tag-based conceptual siblings: same tag, different pattern. Excludes
  // anything already in the pattern-sibling list to avoid duplicates.
  const patternSiblingIds = new Set(siblings.map((s) => s.id))
  const tagSiblings: SiblingEntry[] = getTagSiblings(entry.id, entry.tags, patternSiblingIds).map(
    (m) => ({
      id: m.id,
      title: m.title,
      ...(m.difficulty && { difficulty: m.difficulty }),
      ...(m.slotTemplate !== undefined && { slotTemplate: m.slotTemplate }),
      ...(m.solutionJS && { solutionJS: m.solutionJS }),
    }),
  )

  // Derive slot-label overlay (lineNumber → label) for the IDE view.
  // Returns {} if neither curated slotTemplate nor AST auto-derive yields
  // a usable mapping.
  const slotLabelMap = entry.solutionJS
    ? deriveSlotLabels(entry.solutionJS, entry.entryFunction, entry.slotTemplate ?? null)
    : new Map<number, string>()
  const slotLabels: Record<number, string> = {}
  for (const [k, v] of slotLabelMap) slotLabels[k] = v

  return (
    <StudyViewer
      entry={studyEntry}
      prevId={prev?.id ?? null}
      nextId={next?.id ?? null}
      patternName={patternName}
      siblings={siblings}
      tagSiblings={tagSiblings}
      coreIds={getCoreIds()}
      {...(Object.keys(slotLabels).length > 0 && { slotLabels })}
    />
  )
}

export function generateStaticParams() {
  return getAllProblemIds().map((problemId) => ({ problemId }))
}
