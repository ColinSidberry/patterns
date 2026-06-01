import Link from 'next/link'
import { patterns as sysdesignPatterns } from '@/data/index'
import algoEntriesRaw from '@/data/algo_monster_problems.json'
import patternsRaw from '@/data/patterns.json'
import type { AlgoMonsterEntry } from '@/data/algo-monster-types'
import { AlgoIndex, type ClientData, type ClientEntry, type ClientModule, type ClientPattern } from '@/components/AlgoIndex'
import { DueTodayBadge } from '@/components/DueTodayBadge'
import { getCoreIds, isCoreProblem } from '@/lib/coreCatalog'

type Scaffold = 'iterative' | 'recursive' | 'dp' | 'design'
interface RawAlgoPattern {
  id: string
  name: string
  module: string
  scaffold: Scaffold
  shortDescription?: string
}

const algoEntries = algoEntriesRaw as AlgoMonsterEntry[]
const algoPatterns = (patternsRaw as { patterns: RawAlgoPattern[] }).patterns

const CORE_PER_PATTERN = 2

// ── Build serializable data for the client AlgoIndex once at module load ──

function entryToClient(e: AlgoMonsterEntry): ClientEntry {
  return { id: e.id, title: e.title!, difficulty: e.difficulty }
}

const patternsById = new Map<string, RawAlgoPattern>()
for (const p of algoPatterns) patternsById.set(p.id, p)

interface ModuleBuild {
  name: string
  minOrder: number
  unpatterned: AlgoMonsterEntry[]
  patternedByPatternId: Map<string, AlgoMonsterEntry[]>
}

const moduleMap = new Map<string, ModuleBuild>()
for (const e of algoEntries) {
  const mname = e.module ?? '(uncategorized)'
  let mod = moduleMap.get(mname)
  if (!mod) {
    mod = { name: mname, minOrder: e.studyOrder, unpatterned: [], patternedByPatternId: new Map() }
    moduleMap.set(mname, mod)
  }
  mod.minOrder = Math.min(mod.minOrder, e.studyOrder)
  if (e.pattern) {
    const list = mod.patternedByPatternId.get(e.pattern)
    if (list) list.push(e)
    else mod.patternedByPatternId.set(e.pattern, [e])
  } else {
    mod.unpatterned.push(e)
  }
}
for (const mod of moduleMap.values()) {
  mod.unpatterned.sort((a, b) => a.studyOrder - b.studyOrder)
  for (const list of mod.patternedByPatternId.values()) {
    list.sort((a, b) => a.studyOrder - b.studyOrder)
  }
}

const orderedModules = [...moduleMap.values()].sort((a, b) => a.minOrder - b.minOrder)

const clientModules: ClientModule[] = orderedModules.map((mod) => {
  const orderedPatternIds = [...mod.patternedByPatternId.entries()]
    .map(([pid, list]) => ({ pid, min: list[0].studyOrder }))
    .sort((a, b) => a.min - b.min)
    .map((x) => x.pid)
  const patterns: ClientPattern[] = []
  for (const pid of orderedPatternIds) {
    const def = patternsById.get(pid)
    if (!def) continue
    const cp: ClientPattern = {
      id: def.id,
      name: def.name,
      scaffold: def.scaffold,
      entries: mod.patternedByPatternId.get(pid)!.map(entryToClient),
    }
    if (def.shortDescription) cp.shortDescription = def.shortDescription
    patterns.push(cp)
  }
  return {
    name: mod.name,
    unpatterned: mod.unpatterned.map(entryToClient),
    patterns,
  }
})

const totalProblems = algoEntries.length
// Use the curated core list as the authoritative count so the home-page
// header stays in sync with /progress, the badge, and the calendar.
const totalCore = getCoreIds().length
// Keep first-N-per-pattern visualization data for downstream consumers that
// still want it; not used for the displayed count anymore.
void CORE_PER_PATTERN
void isCoreProblem

const clientData: ClientData = {
  modules: clientModules,
  totalProblems,
  totalCore,
  totalPatterns: algoPatterns.length,
  corePerPattern: CORE_PER_PATTERN,
}

// ─────────────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#13131a]">
      <header className="bg-[#1e1e2e] border-b border-[#313244] px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="text-xl font-semibold text-indigo-400">Fundamentals</span>
          <div className="flex items-center gap-3">
            <Link
              href="/progress"
              className="text-xs font-medium px-3 py-1 rounded-full border border-[#313244] bg-[#1e1e2e] text-[#a6adc8] hover:text-indigo-300 hover:border-indigo-500/50 transition-colors"
              title="Per-pattern readiness"
            >
              Progress
            </Link>
            <DueTodayBadge coreIds={getCoreIds()} />
            <span className="text-sm text-[#6c7086]">Interactive Patterns</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 flex flex-col gap-5">
        {/* ═══ System Design ═══ */}
        <details className="group rounded-2xl border border-[#313244] bg-[#1e1e2e] overflow-hidden">
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-3 px-6 py-4 hover:bg-[#252537] transition-colors">
            <span className="inline-block w-3 text-[#6c7086] text-xs font-mono transition-transform group-open:rotate-90">
              ▶
            </span>
            <h2 className="text-xl font-bold text-[#cdd6f4]">System Design Patterns</h2>
            <span className="text-xs text-[#6c7086]">{sysdesignPatterns.length} patterns</span>
          </summary>
          <div className="px-6 pb-6 pt-2 border-t border-[#313244]">
            <p className="text-sm text-[#6c7086] mb-5">
              Animated sequence diagrams — see every hop, failure mode, and fix with real code.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {sysdesignPatterns.map((pattern) => (
                <Link
                  key={pattern.id}
                  href={`/${pattern.id}`}
                  className="group/card bg-[#13131a] rounded-2xl border border-[#313244] p-5 hover:border-indigo-500 transition-all duration-150"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-900/30 flex items-center justify-center text-indigo-400 text-base">
                      ⟳
                    </div>
                    <span className="text-xs font-medium text-[#6c7086] bg-[#313244] rounded-full px-2 py-1">
                      {pattern.steps.length} steps
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-[#cdd6f4] mb-1 group-hover/card:text-indigo-400 transition-colors">
                    {pattern.title}
                  </h3>
                  <p className="text-sm text-[#6c7086] leading-snug mb-3">{pattern.subtitle}</p>
                  <div className="flex items-center gap-1 flex-wrap">
                    {pattern.failureModes.slice(0, 4).map((fm) => (
                      <span
                        key={fm.id}
                        className="text-xs text-orange-400 bg-orange-900/20 rounded-full px-2 py-0.5"
                      >
                        {fm.shortLabel}
                      </span>
                    ))}
                    {pattern.failureModes.length > 4 && (
                      <span className="text-xs text-[#6c7086]">
                        +{pattern.failureModes.length - 4} more
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </details>

        {/* ═══ Algorithm Patterns ═══ */}
        <details
          open
          className="group rounded-2xl border border-[#313244] bg-[#1e1e2e] overflow-hidden"
        >
          <summary className="cursor-pointer list-none [&::-webkit-details-marker]:hidden flex items-center gap-3 px-6 py-4 hover:bg-[#252537] transition-colors">
            <span className="inline-block w-3 text-[#6c7086] text-xs font-mono transition-transform group-open:rotate-90">
              ▶
            </span>
            <h2 className="text-xl font-bold text-[#cdd6f4]">Algorithm Patterns</h2>
            <span className="text-xs text-[#6c7086]">
              {clientData.modules.length} modules · {clientData.totalPatterns} patterns · {clientData.totalProblems} problems · {clientData.totalCore} core
            </span>
          </summary>
          <div className="px-6 pb-2 pt-2 border-t border-[#313244]">
            <AlgoIndex data={clientData} />
          </div>
        </details>
      </main>
    </div>
  )
}
