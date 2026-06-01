import Link from 'next/link'
import algoEntriesRaw from '@/data/algo_monster_problems.json'
import type { AlgoMonsterEntry } from '@/data/algo-monster-types'
import { ReviewQueue } from '@/components/ReviewQueue'
import { ReviewNotesHistory } from '@/components/ReviewNotesHistory'
import { getCoreIds } from '@/lib/coreCatalog'

const algoEntries = algoEntriesRaw as AlgoMonsterEntry[]

const problemMeta: Record<
  string,
  {
    title: string
    pattern: string | null
    difficulty?: AlgoMonsterEntry['difficulty']
  }
> = {}
for (const e of algoEntries) {
  problemMeta[e.id] = {
    title: e.title,
    pattern: e.pattern,
    ...(e.difficulty && { difficulty: e.difficulty }),
  }
}

export default function ReviewPage() {
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
          <span className="text-sm font-medium text-[#cdd6f4]">Review</span>
          <div className="ml-auto flex items-center gap-3">
            <ReviewNotesHistory problemMeta={problemMeta} />
            <Link
              href="/progress"
              className="text-xs text-[#6c7086] hover:text-[#a6adc8] underline decoration-dotted underline-offset-2"
            >
              Progress
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-screen-md mx-auto px-4 lg:px-6 py-8">
        <ReviewQueue problems={problemMeta} coreIds={getCoreIds()} />
      </main>
    </div>
  )
}
