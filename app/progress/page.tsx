import Link from 'next/link'
import { getCorePatterns, getCoreIds, getProblemMetaMap } from '@/lib/coreCatalog'
import { ProgressView } from '@/components/ProgressView'

export default function ProgressPage() {
  const patterns = getCorePatterns()
  const coreIds = getCoreIds()
  // Trim the catalog meta to just the fields the day-detail UI renders, so
  // the RSC payload stays small.
  const fullMeta = getProblemMetaMap()
  const problemMeta: Record<string, { title: string; pattern: string | null; difficulty?: typeof fullMeta[string]['difficulty'] }> = {}
  for (const [id, m] of Object.entries(fullMeta)) {
    problemMeta[id] = {
      title: m.title,
      pattern: m.pattern,
      ...(m.difficulty && { difficulty: m.difficulty }),
    }
  }
  return (
    <div className="min-h-screen bg-[#13131a]">
      <header className="bg-[#1e1e2e] border-b border-[#313244] px-4 lg:px-6 py-3 sticky top-0 z-30">
        <div className="max-w-screen-md mx-auto flex items-center gap-3">
          <Link
            href="/"
            className="text-indigo-400 font-semibold text-base hover:text-indigo-300"
          >
            Fundamentals
          </Link>
          <span className="text-[#45475a]">/</span>
          <span className="text-sm font-medium text-[#cdd6f4]">Progress</span>
          <Link
            href="/review"
            className="ml-auto text-xs text-[#6c7086] hover:text-[#a6adc8] underline decoration-dotted underline-offset-2"
          >
            Review queue
          </Link>
        </div>
      </header>
      <main className="max-w-screen-md mx-auto px-4 lg:px-6 py-8">
        <ProgressView patterns={patterns} coreIds={coreIds} problemMeta={problemMeta} />
      </main>
    </div>
  )
}
