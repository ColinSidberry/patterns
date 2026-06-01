// Parameterized spec for visualization anchor correctness.
// Reads the catalog JSON, finds problems with a viz config, and for each
// anchor: opens the Understand accordion, hovers the anchor, and asserts
// the expected pointer/cell state.
//
// Run a single problem: `VIZ_PROBLEM_ID=remove_element npx playwright test`
// Run all viz'd problems:  `npx playwright test`

import { test, expect, type Page } from 'playwright/test'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const CATALOG_PATH = resolve(__dirname, '../../data/algo_monster_problems.json')

interface Anchor {
  phrase: string
  occurrence?: number
  step: number
}

interface PointerCfg {
  from: string
  side: 'top' | 'bottom'
  label?: string
}

interface VizConfig {
  type: 'array-pointers' | 'linked-list-pointers' | 'grid-bfs'
  arrayVar?: string
  listVar?: string
  pointers?: PointerCfg[]      // not present on grid-bfs
  anchors?: Anchor[]
}

interface CatalogEntry {
  id: string
  viz?: VizConfig
}

function loadProblems(): CatalogEntry[] {
  const raw = readFileSync(CATALOG_PATH, 'utf8')
  return JSON.parse(raw) as CatalogEntry[]
}

function classifyPhrase(
  phrase: string,
  pointers: PointerCfg[]
): { kind: 'pointer-eq'; varName: string; expectedIndex: number }
  | { kind: 'pointer-bare'; varName: string }
  | { kind: 'array-literal'; values: string[] }
  | { kind: 'array-2d-literal'; rows: string[][] }
  | { kind: 'unknown' } {
  // For each pointer, try matching by `from` (e.g., "curr.next") OR by
  // `label` (e.g., "next"). Prose typically uses the user-friendly label,
  // but the data-pointer-name attribute uses `from`, so we always return
  // the `from` value as varName.
  for (const p of pointers) {
    const aliases = [p.from]
    if (p.label && p.label !== p.from) aliases.push(p.label)
    for (const alias of aliases) {
      const prefix = alias + '='
      if (phrase.startsWith(prefix)) {
        const rest = phrase.slice(prefix.length)
        const n = Number(rest)
        if (Number.isFinite(n)) return { kind: 'pointer-eq', varName: p.from, expectedIndex: n }
      }
      if (phrase === alias) return { kind: 'pointer-bare', varName: p.from }
    }
  }
  const trimmed = phrase.trim()
  // Try JSON-parsing the literal — handles both 1D and 2D arrays robustly,
  // since hand-splitting on ',' breaks for nested arrays.
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return { kind: 'array-literal', values: [] }
        // 2D iff every element is itself an array (uniform shape)
        if (parsed.every((row) => Array.isArray(row))) {
          return {
            kind: 'array-2d-literal',
            rows: parsed.map((row) => (row as unknown[]).map((v) => String(v))),
          }
        }
        return { kind: 'array-literal', values: parsed.map((v) => String(v)) }
      }
    } catch {
      // Fall through to legacy split parser below
    }
    const inner = trimmed.slice(1, -1).trim()
    if (inner === '') return { kind: 'array-literal', values: [] }
    const values = inner.split(',').map((s) => s.trim())
    return { kind: 'array-literal', values }
  }
  return { kind: 'unknown' }
}

async function openUnderstand(page: Page) {
  // The Understand accordion is closed by default. The header is a button
  // containing the <h2>Understand</h2> heading.
  const button = page.getByRole('button', { name: 'Understand' })
  await expect(button).toBeVisible()
  const root = page.locator('[data-trace-root="understand"]')
  if (!(await root.isVisible().catch(() => false))) {
    await button.click()
  }
  await expect(root).toBeVisible()
}

async function waitForTraceReady(page: Page) {
  const root = page.locator('[data-trace-root="understand"]')
  await expect(root).toHaveAttribute('data-trace-status', 'ready', { timeout: 10_000 })
  // Total steps populated.
  const total = await root.getAttribute('data-total-steps')
  expect(Number(total)).toBeGreaterThan(0)
}

async function readPointerIndex(page: Page, varName: string): Promise<number | null> {
  const el = page.locator(`[data-pointer-name="${varName}"]`).first()
  if ((await el.count()) === 0) return null
  const idx = await el.getAttribute('data-pointer-index')
  return idx === null ? null : Number(idx)
}

async function readCellValues(page: Page): Promise<string[]> {
  // Array-pointers: [data-cell-index][data-cell-value]
  // Linked-list-pointers: [data-node-index][data-node-value]
  // For linked-list, skip sentinel cells (data-node-sentinel="true") —
  // prose's array literals describe the logical list, not the chain
  // including the dummy.
  const arrayCells = page.locator('[data-cell-index]')
  const arrayCount = await arrayCells.count()
  if (arrayCount > 0) {
    const out: string[] = []
    for (let i = 0; i < arrayCount; i++) {
      const v = await arrayCells.nth(i).getAttribute('data-cell-value')
      out.push(v ?? '')
    }
    return out
  }
  const nodes = page.locator('[data-node-index]')
  const n = await nodes.count()
  const out: string[] = []
  for (let i = 0; i < n; i++) {
    const isSentinel = await nodes.nth(i).getAttribute('data-node-sentinel')
    if (isSentinel === 'true') continue
    const v = await nodes.nth(i).getAttribute('data-node-value')
    out.push(v ?? '')
  }
  return out
}

// Read grid-bfs cells as a 2D string array. Returns [] if the page isn't
// rendering a grid viz.
async function readGridCells(page: Page): Promise<string[][]> {
  const cells = await page.locator('[data-cell-row]').evaluateAll((els) =>
    els.map((e) => ({
      r: Number(e.getAttribute('data-cell-row')),
      c: Number(e.getAttribute('data-cell-col')),
      v: e.getAttribute('data-cell-value') ?? '',
    }))
  )
  if (cells.length === 0) return []
  const byRow = new Map<number, string[]>()
  for (const cell of cells) {
    const arr = byRow.get(cell.r) ?? []
    arr[cell.c] = cell.v
    byRow.set(cell.r, arr)
  }
  return [...byRow.keys()].sort((a, b) => a - b).map((r) => byRow.get(r) ?? [])
}

const problems = loadProblems()
const filterId = process.env.VIZ_PROBLEM_ID
const candidates = problems.filter((p) => {
  if (!p.viz) return false
  if (filterId && p.id !== filterId) return false
  return true
})

if (candidates.length === 0) {
  test('no viz problems matched the filter', () => {
    throw new Error(`No problems with viz config matched VIZ_PROBLEM_ID=${filterId ?? '<unset>'}`)
  })
}

for (const problem of candidates) {
  const viz = problem.viz!
  const pointerCfgs = viz.pointers ?? []
  const anchors = viz.anchors ?? []

  test.describe(`viz: ${problem.id}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.goto(`/study/${problem.id}`)
      await openUnderstand(page)
      await waitForTraceReady(page)
    })

    test('has at least one anchor', () => {
      expect(anchors.length).toBeGreaterThan(0)
    })

    for (const a of anchors) {
      const occ = a.occurrence ?? 1
      const key = `${a.phrase}::${occ}`
      const cls = classifyPhrase(a.phrase, pointerCfgs)

      test(`anchor "${key}" → step ${a.step}`, async ({ page }) => {
        const span = page.locator(`[data-anchor-key="${key}"]`)
        await expect(span, `anchor span ${key} not found in DOM`).toHaveCount(1)
        await span.hover()

        // Active flag flips on hovered anchor.
        await expect(span).toHaveAttribute('data-anchor-active', 'true')

        // Trace step advances to the anchor's step.
        const root = page.locator('[data-trace-root="understand"]')
        await expect(root).toHaveAttribute('data-current-step', String(a.step))

        // Per-classification assertions.
        if (cls.kind === 'pointer-eq') {
          const idx = await readPointerIndex(page, cls.varName)
          expect(
            idx,
            `expected pointer "${cls.varName}" at index ${cls.expectedIndex} for anchor "${key}"`
          ).toBe(cls.expectedIndex)

          // Per-pointer hover semantics: only this pointer should reflect
          // the snapped value (others retain prior position). We can't
          // assert "didn't move" without a baseline, so we just check that
          // the named pointer landed at N.
        } else if (cls.kind === 'pointer-bare') {
          const idx = await readPointerIndex(page, cls.varName)
          expect(
            idx,
            `pointer "${cls.varName}" should exist after hovering anchor "${key}"`
          ).not.toBeNull()
          expect(idx).toBeGreaterThanOrEqual(0)
        } else if (cls.kind === 'array-literal') {
          const cells = await readCellValues(page)
          // Accept either an exact match OR a prefix match — the latter
          // handles in-place algorithms (e.g., remove_element) where the
          // logical "output" is `nums.slice(0, slow)` while the live array
          // still contains trailing junk.
          const exact = cells.length === cls.values.length
            && cells.every((c, i) => c === cls.values[i])
          const prefixOk = cls.values.length <= cells.length
            && cls.values.every((v, i) => v === cells[i])
          expect(
            exact || prefixOk,
            `array literal "${a.phrase}" should match (or prefix-match) the rendered cells [${cells.join(', ')}] at step ${a.step}`
          ).toBe(true)
        } else if (cls.kind === 'array-2d-literal') {
          const grid = await readGridCells(page)
          const same = grid.length === cls.rows.length
            && grid.every((row, r) =>
              row.length === cls.rows[r].length
              && row.every((v, c) => v === cls.rows[r][c]))
          expect(
            same,
            `2D literal "${a.phrase}" should match the rendered grid ${JSON.stringify(grid)} at step ${a.step}`
          ).toBe(true)
        }
        // 'unknown' → no extra assertion beyond active+step. Author can
        // tighten the inference rules over time.
      })
    }

    // Group bare-pointer anchors by phrase. If a phrase appears multiple
    // times as a bare-pointer reference (e.g., `slow` mentioned thrice in
    // prose to describe successive states), each hover should land on a
    // distinct rendered pointer state — otherwise the anchors are stuck
    // and the visual won't move in the way the prose narrates.
    const bareGroups = new Map<string, { occ: number; varName: string }[]>()
    for (const a of anchors) {
      const cls = classifyPhrase(a.phrase, pointerCfgs)
      if (cls.kind !== 'pointer-bare') continue
      const arr = bareGroups.get(a.phrase) ?? []
      arr.push({ occ: a.occurrence ?? 1, varName: cls.varName })
      bareGroups.set(a.phrase, arr)
    }
    for (const [phrase, occs] of bareGroups) {
      if (occs.length < 2) continue
      const sorted = [...occs].sort((a, b) => a.occ - b.occ)
      test(`bare pointer "${phrase}" — ${sorted.length} occurrences land on distinct states`, async ({ page }) => {
        // Distinct state = (pointer-index, value-at-that-cell) pair. For
        // linked-list, a pointer can stay at the same chain index across a
        // splice but the cell underneath shows a different value — those
        // are still semantically distinct visual states.
        const seen: string[] = []
        for (const { occ, varName } of sorted) {
          const span = page.locator(`[data-anchor-key="${phrase}::${occ}"]`)
          await span.hover()
          const idx = await readPointerIndex(page, varName)
          if (typeof idx !== 'number') continue
          const cells = await readCellValues(page)
          // Cells exclude sentinels (per readCellValues); pointer indices
          // include them. For a linked-list with sentinelCount=1, pointer
          // idx 0 is the sentinel (no entry in `cells`), idx 1 is cells[0].
          // We label sentinel positions distinctly and the null cap
          // distinctly so they don't collide with real cells.
          const totalNodes = await page.locator('[data-node-index]').count()
          const arrayCellCount = await page.locator('[data-cell-index]').count()
          const isLinkedList = arrayCellCount === 0 && totalNodes > 0
          let label: string
          if (isLinkedList) {
            const sentinelCount = await page.locator('[data-node-sentinel="true"]').count()
            const nullCapIdx = totalNodes - 1
            if (idx < sentinelCount) label = `sentinel@${idx}`
            else if (idx === nullCapIdx) label = `null@${idx}`
            else label = `${idx}:${cells[idx - sentinelCount] ?? '?'}`
          } else {
            label = `${idx}:${cells[idx] ?? '?'}`
          }
          seen.push(label)
        }
        const distinct = new Set(seen)
        expect(
          distinct.size,
          `bare pointer "${phrase}" has ${sorted.length} occurrences but they only landed on ${distinct.size} distinct state(s) [${seen.join(', ')}] — repeated bare mentions should describe successive states`
        ).toBe(sorted.length)
      })
    }

    test('arrow-key navigation updates current step', async ({ page }) => {
      const root = page.locator('[data-trace-root="understand"]')
      const initial = Number(await root.getAttribute('data-current-step'))

      // Use the on-screen Next button to avoid focus surprises with key events.
      // The Understand panel renders → / ← controls.
      const nextBtn = page.locator(
        '[data-trace-root="understand"] button[aria-label="Next step"]'
      )
      const prevBtn = page.locator(
        '[data-trace-root="understand"] button[aria-label="Previous step"]'
      )
      await nextBtn.click()
      await expect(root).toHaveAttribute('data-current-step', String(initial + 1))
      await prevBtn.click()
      await expect(root).toHaveAttribute('data-current-step', String(initial))
    })
  })
}
