// Trace-completeness spec — independent of anchors.
//
// Anchors verify what the prose claims. This spec verifies that the
// worker → frame → renderer pipeline preserves pointer state at every
// step of the trace, including unanchored steps (page-load, terminal
// state, mid-loop iter checks). Catches bugs the anchor spec misses
// because no anchor maps to the buggy step.
//
// Strategy: walk every step via the Next button. At each step, record
// the rendered pointer set as a string. Concatenate into a "trajectory"
// snapshot and compare to a recorded baseline at
// tests/viz/__snapshots__/<problemId>-trajectory.txt.
//
// First run writes the baseline. Subsequent runs fail on drift; the
// author reviews the diff and either fixes the regression or refreshes
// the baseline (`rm` the file and re-run).

import { test, expect, type Page } from 'playwright/test'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const CATALOG_PATH = resolve(__dirname, '../../data/algo_monster_problems.json')
const SNAPSHOT_DIR = resolve(__dirname, '__snapshots__')

interface VizConfig { type: string; pointers?: { from: string }[] }
interface CatalogEntry { id: string; viz?: VizConfig }

function loadProblems(): CatalogEntry[] {
  return JSON.parse(readFileSync(CATALOG_PATH, 'utf8')) as CatalogEntry[]
}

async function openUnderstand(page: Page) {
  await page.getByRole('button', { name: 'Understand' }).click()
  await expect(page.locator('[data-trace-root="understand"]')).toBeVisible()
}

async function waitForReady(page: Page) {
  await expect(page.locator('[data-trace-root="understand"]'))
    .toHaveAttribute('data-trace-status', 'ready', { timeout: 10_000 })
}

async function readPointersAndCells(page: Page): Promise<{
  step: string
  pointers: string
  cells: string
}> {
  const root = page.locator('[data-trace-root="understand"]')
  const step = (await root.getAttribute('data-current-step')) ?? '?'

  // Family detection by viz root attr
  const gridRoot = page.locator('[data-viz-root="grid-bfs"]')
  const isGrid = (await gridRoot.count()) > 0

  if (isGrid) {
    // Grid-bfs: cells are 2D (row,col), pointers are cellPointers (label
    // + row + col), counters captured inline.
    const gridCells = await page.locator('[data-cell-row]').evaluateAll((els) =>
      els.map((e) => ({
        r: Number(e.getAttribute('data-cell-row')),
        c: Number(e.getAttribute('data-cell-col')),
        v: e.getAttribute('data-cell-value') ?? '',
      }))
    )
    // Group by row for readable output
    const byRow = new Map<number, string[]>()
    for (const cell of gridCells) {
      const arr = byRow.get(cell.r) ?? []
      arr[cell.c] = cell.v
      byRow.set(cell.r, arr)
    }
    const rows = [...byRow.keys()].sort((a, b) => a - b)
    const cells = '[' + rows.map((r) => `[${(byRow.get(r) ?? []).join(',')}]`).join(',') + ']'
    const cellPtrs = await page.locator('[data-cell-pointer-label]').evaluateAll((els) =>
      els.map((e) => ({
        label: e.getAttribute('data-cell-pointer-label') ?? '',
        r: e.getAttribute('data-cell-pointer-row') ?? '',
        c: e.getAttribute('data-cell-pointer-col') ?? '',
      }))
    )
    cellPtrs.sort((a, b) => a.label.localeCompare(b.label))
    const ptrStr = cellPtrs.map((p) => `${p.label}@(${p.r},${p.c})`).join(',')
    const counters = await page.locator('[data-counter-label]').evaluateAll((els) =>
      els.map((e) => ({
        label: e.getAttribute('data-counter-label') ?? '',
        value: e.getAttribute('data-counter-value') ?? '',
      }))
    )
    counters.sort((a, b) => a.label.localeCompare(b.label))
    const counterStr = counters.map((c) => `${c.label}=${c.value}`).join(',')
    const pointers = [ptrStr, counterStr].filter(Boolean).join(' | ')
    return { step, pointers, cells }
  }

  // Pointers — sorted by name for stable comparison
  const ptrs = await page.locator('[data-pointer-name]').evaluateAll((els) =>
    els.map((e) => ({
      name: e.getAttribute('data-pointer-name') ?? '',
      idx: e.getAttribute('data-pointer-index') ?? '',
    }))
  )
  ptrs.sort((a, b) => a.name.localeCompare(b.name))
  const pointers = ptrs.map((p) => `${p.name}@${p.idx}`).join(',')
  // Cells (or nodes for linked-list, including null cap + sentinel info)
  const arrayCells = await page.locator('[data-cell-index]').evaluateAll((els) =>
    els.map((e) => e.getAttribute('data-cell-value') ?? '')
  )
  let cells: string
  if (arrayCells.length > 0) {
    cells = `[${arrayCells.join(',')}]`
  } else {
    const linkedNodes = await page.locator('[data-node-index]').evaluateAll((els) =>
      els.map((e) => {
        const v = e.getAttribute('data-node-value') ?? ''
        const sent = e.getAttribute('data-node-sentinel') === 'true'
        const nullCap = e.getAttribute('data-node-null') === 'true'
        return sent ? `(${v})` : nullCap ? `~${v}` : v
      })
    )
    cells = `[${linkedNodes.join(',')}]`
  }
  return { step, pointers, cells }
}

const problems = loadProblems().filter((p) => p.viz)

if (!existsSync(SNAPSHOT_DIR)) mkdirSync(SNAPSHOT_DIR, { recursive: true })

for (const problem of problems) {
  test.describe(`completeness: ${problem.id}`, () => {
    test('pointer trajectory across all steps', async ({ page }) => {
      await page.goto(`/study/${problem.id}`)
      await openUnderstand(page)
      await waitForReady(page)

      const root = page.locator('[data-trace-root="understand"]')
      const total = Number(await root.getAttribute('data-total-steps'))
      expect(total).toBeGreaterThan(0)

      // Walk to step 0 first (using Prev button), then step forward
      // through every step. The seed effect may have started us mid-trace
      // (first-step-with-pointers heuristic), so we deliberately rewind
      // to capture the very-first state too.
      const prevBtn = page.locator('[data-trace-root="understand"] button[aria-label="Previous step"]')
      const nextBtn = page.locator('[data-trace-root="understand"] button[aria-label="Next step"]')

      while (!(await prevBtn.isDisabled())) {
        await prevBtn.click()
      }

      const lines: string[] = []
      lines.push(`# trajectory for ${problem.id} (totalSteps=${total})`)
      lines.push(`# format: step N | cells=[...] | pointers=name@idx,...`)
      lines.push(`# linked-list cell notation: (X)=sentinel, ~X=null-cap`)
      for (let i = 0; i < total; i++) {
        const { step, pointers, cells } = await readPointersAndCells(page)
        // Sanity: data-current-step should match our loop counter
        expect(Number(step)).toBe(i)
        lines.push(`step ${step.padStart(2, ' ')} | cells=${cells} | pointers=${pointers}`)
        if (i < total - 1) await nextBtn.click()
      }

      const trajectory = lines.join('\n') + '\n'
      const snapshotPath = resolve(SNAPSHOT_DIR, `${problem.id}-trajectory.txt`)
      if (!existsSync(snapshotPath)) {
        writeFileSync(snapshotPath, trajectory, 'utf8')
        console.log(`[viz-completeness] wrote new baseline: ${snapshotPath}`)
        return
      }
      const baseline = readFileSync(snapshotPath, 'utf8')
      if (trajectory !== baseline) {
        // Write the actual to <id>-trajectory.actual.txt for diffing
        const actualPath = resolve(SNAPSHOT_DIR, `${problem.id}-trajectory.actual.txt`)
        writeFileSync(actualPath, trajectory, 'utf8')
      }
      expect(trajectory, `trajectory drift — review actual vs baseline at ${snapshotPath}`)
        .toBe(baseline)
    })
  })
}
