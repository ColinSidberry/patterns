// Core-problem enumeration. "Core" is a hand-curated list (see
// `CURATED_CORE_IDS` below) — the problems Colin has explicitly chosen as
// the daily-rotation set, mirroring the AlgoMonster Foundation + Problem-set
// progression. Add to / reorder this array to evolve the curriculum; every
// downstream surface (calendar, /progress, /review queue, badge, milestones)
// re-derives from it on next refresh.
//
// Server-side only — reads the master JSON directly. Client components
// receive serialized snapshots via the page they're rendered into.

import raw from '@/data/algo_monster_problems.json'
import patternsRaw from '@/data/patterns.json'
import type { AlgoMonsterEntry, Difficulty } from '@/data/algo-monster-types'

// Hand-curated core list. Order is the intended teaching progression; the
// "New today" queue surfaces these in this order (subject to dailyMin pacing).
export const CURATED_CORE_IDS: string[] = [
  // ── Foundation ───────────────────────────────────────────────────────
  // Arrays
  'find_maximum',
  'count_occurrences',
  // Strings
  'is_palindrome',
  'reversing_strings',
  // Linked List (3 — Colin flagged this area as weakest)
  'remove_nth_node',
  'delete_all_occurrences',
  'doubly_linked_lists',
  // Queue
  'simulate_print_queue',
  'time_needed_to_buy_tickets',
  // Hash Tables / Sets
  'contains_duplicate',
  'count_frequencies',
  // Stack
  'valid_parentheses',
  'remove_adjacent_duplicates_in_string',
  // Sorting
  'count_swaps_bubble_sort',
  'sort_by_frequency',
  'largest_number_from_array',
  'can_make_arithmetic_progression',
  'minimum_difference_pairs',
  // ── Problem set ──────────────────────────────────────────────────────
  // Binary Search
  'binary_search_intro',
  'binary_search_boundary',
  // Sorted Array
  'binary_search_first_element_not_smaller_than_target',
  'binary_search_duplicates',
  // Implicitly Sorted Arrays
  'min_in_rotated_sorted_array',
  'peak_of_mountain_array',
  // Two Pointers — Same Direction
  'remove_duplicates',
  'middle_of_linked_list',
  // Two Pointers — Opposite Direction
  'two_sum_sorted',
  'valid_palindrome',
  // Sliding Window
  'subarray_sum_fixed',
  'find_all_anagrams',
  // Prefix Sum
  'subarray_sum',
  // Cycle Finding
  'linked_list_cycle',
  // Sliding Window — Variable
  'longest_substring_without_repeating_characters',
  'subarray_sum_longest',
  // Tree DFS Recursive
  'visible_tree_node',
  'balanced_binary_tree',
  // Binary Search Tree
  'valid_bst',
  'lowest_common_ancestor_on_bst',
  // Backtracking — Generate
  'letter_combinations_of_phone_number',
  'permutations',
  'generate_parentheses',
  // Combinatorics with dedup
  'three_sum',
  'combination_sum',
  // Backtracking-flavored DP (pruning)
  'word_break',
  'coin_change',
  // Tree BFS Level Order
  'binary_tree_level_order_traversal',
  'binary_tree_right_side_view',
  // Graph — Adjlist BFS
  'shortest_path_unweight',
  'word_ladder',
  // Graph — Grid
  'number_of_islands',
  'knight_shortest_path',
  // Topological Sort
  'task_scheduling',
  'course_schedule',
  // Dijkstra
  'dijkstra_intro',
  // Union-Find / MST
  'mst_intro',
  // Heap (top-k)
  'k_closest_points',
  'kth_largest_element_in_an_array',
  // DP — 1D
  'climbing_stairs',
  'house_robber',
  'nth_tribonacci',
  'min_cost_climbing_stairs',
  'minimum_cost_for_tickets',
  'partition_array_max_sum',
  'longest_string_chain',
  // DP — 2D Grid
  'robot_unique_path',
  'minimal_path_sum',
  'unique_paths_with_obstacles',
  'dungeon_game',
  // DP — Sequence (LCS family)
  'longest_common_subsequence',
  'edit_distance',
  'distinct_subsequence',
  'shortest_common_supersequence',
  // DP — Non-constant transition
  'largest_divisible_subset',
  'longest_increasing_subsequence',
  // DP — Knapsack (weight-only)
  'knapsack_weight_only',
  'perfect_squares',
  'equal_subsets',
  'target_sum',
  // DP — Knapsack (weight+value)
  'knapsack_intro',
  'bounded_knapsack',
  // DP — Interval
  'longest_palindromic_subsequence',
  'coin_game',
  // DP — Bitmask
  'min_cost_to_visit_every_node',
  // DP — Tree
  'house_robber_iii',
  // DP — Topological / DFS+memo
  'longest_increasing_path_matrix',
  // Binary Search — Answer Space
  'sqrt',
  // Prefix Sum / Range Query (data structure design)
  'range_sum_query_immutable',
]

// Kept for legacy reads; no longer drives selection.
export const CORE_PER_PATTERN = 2

const entries = raw as AlgoMonsterEntry[]

type Scaffold = 'iterative' | 'recursive' | 'dp' | 'design'
interface RawAlgoPattern {
  id: string
  name: string
  module: string
  scaffold: Scaffold
  shortDescription?: string
}
const patterns = (patternsRaw as { patterns: RawAlgoPattern[] }).patterns

export interface CorePatternSummary {
  id: string
  name: string
  module: string
  scaffold: Scaffold
  coreIds: string[]    // curated entries within this pattern, in declared order
  allIds: string[]     // every entry in this pattern, ordered by studyOrder
}

const patternIndex = new Map<string, RawAlgoPattern>()
for (const p of patterns) patternIndex.set(p.id, p)

const entryById = new Map<string, AlgoMonsterEntry>()
for (const e of entries) entryById.set(e.id, e)

const byPattern = new Map<string, AlgoMonsterEntry[]>()
for (const e of entries) {
  if (!e.pattern) continue
  if (!byPattern.has(e.pattern)) byPattern.set(e.pattern, [])
  byPattern.get(e.pattern)!.push(e)
}
for (const list of byPattern.values()) list.sort((a, b) => a.studyOrder - b.studyOrder)

// Validate the curated list at module load — fail loudly if any ID is
// missing or duplicated. Catches typos when adding to the list.
const coreIdSet = new Set<string>()
const missing: string[] = []
for (const id of CURATED_CORE_IDS) {
  if (coreIdSet.has(id)) {
    throw new Error(`CURATED_CORE_IDS: duplicate id "${id}"`)
  }
  if (!entryById.has(id)) {
    missing.push(id)
  }
  coreIdSet.add(id)
}
if (missing.length > 0) {
  throw new Error(`CURATED_CORE_IDS: unknown id(s): ${missing.join(', ')}`)
}

// Per-pattern slices of curated IDs, preserving declared order.
const curatedByPattern = new Map<string, string[]>()
for (const id of CURATED_CORE_IDS) {
  const e = entryById.get(id)!
  if (!e.pattern) continue
  if (!curatedByPattern.has(e.pattern)) curatedByPattern.set(e.pattern, [])
  curatedByPattern.get(e.pattern)!.push(id)
}

// Only patterns that contain at least one curated problem appear in the
// per-pattern progress breakdown.
const summaries: CorePatternSummary[] = []
for (const p of patterns) {
  const curatedIds = curatedByPattern.get(p.id) ?? []
  if (curatedIds.length === 0) continue
  const list = byPattern.get(p.id) ?? []
  summaries.push({
    id: p.id,
    name: p.name,
    module: p.module,
    scaffold: p.scaffold,
    coreIds: curatedIds,
    allIds: list.map((e) => e.id),
  })
}

const patternIdByProblemId = new Map<string, string>()
for (const e of entries) if (e.pattern) patternIdByProblemId.set(e.id, e.pattern)

export function getCorePatterns(): CorePatternSummary[] {
  return summaries
}

export function getCoreIds(): string[] {
  // Preserves CURATED_CORE_IDS order so the "New today" queue surfaces
  // problems in the intended teaching sequence.
  return [...CURATED_CORE_IDS]
}

export function isCoreProblem(id: string): boolean {
  return coreIdSet.has(id)
}

// IDs of curated core problems that are not attached to any pattern. They
// count toward overall totals + Ready/RTI projection but won't appear in
// the per-pattern table on /progress. Logged for visibility.
export const ORPHAN_CORE_IDS: string[] = CURATED_CORE_IDS.filter((id) => {
  const e = entryById.get(id)
  return !e?.pattern
})

export interface ProblemMeta {
  title: string
  pattern: string | null
  patternName?: string
  difficulty?: Difficulty
  isCore: boolean
}

export function getProblemMetaMap(): Record<string, ProblemMeta> {
  const out: Record<string, ProblemMeta> = {}
  for (const e of entries) {
    const meta: ProblemMeta = {
      title: e.title,
      pattern: e.pattern,
      isCore: coreIdSet.has(e.id),
    }
    if (e.pattern) {
      const p = patternIndex.get(e.pattern)
      if (p) meta.patternName = p.name
    }
    if (e.difficulty) meta.difficulty = e.difficulty
    out[e.id] = meta
  }
  return out
}

// Suppress unused-export lint on patternIdByProblemId (kept for future use).
void patternIdByProblemId
