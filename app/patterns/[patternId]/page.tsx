import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  buildComparison,
  getAllPatternIds,
  getDesignProblems,
  getPattern,
} from '@/lib/patterns'
import {
  DesignPatternView,
  PatternComparison,
  type ClientDesignProblem,
  type ClientPattern,
  type ClientProblem,
  type ClientRow,
} from '@/components/PatternComparison'

interface Props {
  params: Promise<{ patternId: string }>
}

export default async function PatternPage({ params }: Props) {
  const { patternId } = await params
  const pattern = getPattern(patternId)
  if (!pattern) notFound()

  const clientPattern: ClientPattern = {
    id: pattern.id,
    name: pattern.name,
    module: pattern.module,
    scaffold: pattern.scaffold,
    ...(pattern.shortDescription && { shortDescription: pattern.shortDescription }),
    ...(pattern.whenToUse && { whenToUse: pattern.whenToUse }),
  }

  const isDesign = pattern.scaffold === 'design' || !pattern.slots

  let body: React.ReactNode
  let problemCount = 0

  if (isDesign) {
    const designProblems: ClientDesignProblem[] = getDesignProblems(patternId).map(
      (p) => ({
        id: p.id,
        title: p.title,
        solutionJS: p.solutionJS,
        ...(p.difficulty && { difficulty: p.difficulty }),
      })
    )
    problemCount = designProblems.length
    body = <DesignPatternView pattern={clientPattern} problems={designProblems} />
  } else {
    const built = buildComparison(patternId)
    if (!built) notFound()
    const problems: ClientProblem[] = built.problems.map((p) => ({
      id: p.id,
      title: p.title,
      studyOrder: p.studyOrder,
      hasSlots: p.hasSlots,
      ...(p.difficulty && { difficulty: p.difficulty }),
    }))
    const rows: ClientRow[] = built.rows.map((r) => ({
      key: r.key,
      description: r.description,
      cells: r.cells,
      ...(r.kind && { kind: r.kind }),
    }))
    problemCount = problems.length
    body = (
      <PatternComparison pattern={clientPattern} problems={problems} rows={rows} />
    )
  }

  return (
    <div className="min-h-screen bg-[#13131a]">
      <header className="bg-[#1e1e2e] border-b border-[#313244] px-4 lg:px-6 py-3 sticky top-0 z-30">
        <div className="max-w-screen-xl mx-auto flex items-center gap-3 flex-wrap">
          <Link
            href="/"
            className="text-indigo-400 font-semibold text-base hover:text-indigo-300 shrink-0"
          >
            Fundamentals
          </Link>
          <span className="text-[#45475a]">/</span>
          <Link
            href="/"
            className="text-sm text-[#a6adc8] hover:text-indigo-300 transition-colors"
          >
            Patterns
          </Link>
          <span className="text-[#45475a]">/</span>
          <span className="text-sm font-medium text-[#cdd6f4]">{pattern.name}</span>
          <span className="text-xs text-[#6c7086] ml-2">
            {problemCount} {problemCount === 1 ? 'problem' : 'problems'}
          </span>
          <span className="text-xs text-[#6c7086]">· {pattern.module}</span>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-4 lg:px-6 py-6 flex flex-col gap-5">
        {(pattern.shortDescription || pattern.whenToUse) && (
          <section className="rounded-lg border border-[#313244] bg-[#1e1e2e] px-5 py-4 flex flex-col gap-2">
            {pattern.shortDescription && (
              <p className="text-sm text-[#cdd6f4] leading-snug">
                {pattern.shortDescription}
              </p>
            )}
            {pattern.whenToUse && (
              <p className="text-xs text-[#a6adc8] leading-snug">
                <span className="text-[10px] uppercase tracking-wider text-[#6c7086] mr-2">
                  When to use
                </span>
                {pattern.whenToUse}
              </p>
            )}
          </section>
        )}

        {body}
      </main>
    </div>
  )
}

export function generateStaticParams() {
  return getAllPatternIds().map((patternId) => ({ patternId }))
}
