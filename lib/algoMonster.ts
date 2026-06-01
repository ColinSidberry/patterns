import raw from '@/data/algo_monster_problems.json'
import type { AlgoMonsterEntry } from '@/data/algo-monster-types'

const entries = raw as AlgoMonsterEntry[]

const byId: Record<string, AlgoMonsterEntry> = {}
for (const e of entries) byId[e.id] = e

const ordered = [...entries].sort((a, b) => a.studyOrder - b.studyOrder)

const orderedIndexById: Record<string, number> = {}
ordered.forEach((e, i) => { orderedIndexById[e.id] = i })

export function getProblemById(id: string): AlgoMonsterEntry | undefined {
  return byId[id]
}

export function getAllProblemIds(): string[] {
  return entries.map((e) => e.id)
}

export function getNeighbors(id: string): {
  prev: AlgoMonsterEntry | null
  next: AlgoMonsterEntry | null
} {
  const i = orderedIndexById[id]
  if (i === undefined) return { prev: null, next: null }
  return {
    prev: i > 0 ? ordered[i - 1] : null,
    next: i < ordered.length - 1 ? ordered[i + 1] : null,
  }
}
