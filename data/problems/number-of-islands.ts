import { AlgoProblem } from '../algo-types'

// Original grid (never mutated — used as cells baseline before any DFS)
const ORIG: string[][] = [
  ['1', '1', '0'],
  ['0', '1', '0'],
  ['1', '0', '1'],
]

// Helper to deep-clone a 2-D array
function g(cells: string[][]): string[][] {
  return cells.map((row) => [...row])
}

// Grid snapshots as DFS progresses
const G_after_00: string[][] = [
  ['0', '1', '0'],
  ['0', '1', '0'],
  ['1', '0', '1'],
]
const G_after_01: string[][] = [
  ['0', '0', '0'],
  ['0', '1', '0'],
  ['1', '0', '1'],
]
const G_after_11: string[][] = [
  ['0', '0', '0'],
  ['0', '0', '0'],
  ['1', '0', '1'],
]
const G_after_20: string[][] = [
  ['0', '0', '0'],
  ['0', '0', '0'],
  ['0', '0', '1'],
]
const G_final: string[][] = [
  ['0', '0', '0'],
  ['0', '0', '0'],
  ['0', '0', '0'],
]

export const numberOfIslands: AlgoProblem = {
  id: 'number-of-islands',
  title: 'Number of Islands',
  difficulty: 'Medium',
  pattern: 'Depth-First Search',

  question: `Given an m × n 2D binary grid where '1' represents land and '0' represents water, return the number of islands.

An island is surrounded by water and is formed by connecting adjacent land cells horizontally or vertically. You may assume all four edges of the grid are surrounded by water.

Example 1:
  Input:  [["1","1","1","1","0"],
           ["1","1","0","1","0"],
           ["1","1","0","0","0"],
           ["0","0","0","0","0"]]
  Output: 1

Example 2:
  Input:  [["1","1","0","0","0"],
           ["1","1","0","0","0"],
           ["0","0","1","0","0"],
           ["0","0","0","1","1"]]
  Output: 3

Constraints:
  m == grid.length
  n == grid[i].length
  1 ≤ m, n ≤ 300
  grid[i][j] is '0' or '1'`,

  starterCode: `function numIslands(grid: string[][]): number {
  // Your solution here
}`,

  solutionCode: `function numIslands(grid: string[][]): number {
  let count = 0
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === '1') {
        dfs(grid, r, c)
        count++
      }
    }
  }
  return count
}
function dfs(grid: string[][], r: number, c: number): void {
  if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return
  if (grid[r][c] !== '1') return
  grid[r][c] = '0'
  dfs(grid, r + 1, c)
  dfs(grid, r - 1, c)
  dfs(grid, r, c + 1)
  dfs(grid, r, c - 1)
}`,

  codeSections: [
    { label: 'Count islands', startLine: 2, endLine: 11 },
    { label: 'DFS flood fill', startLine: 13, endLine: 21 },
  ],

  understanding: [
    {
      question: "How many islands does this grid (Example 2) contain?",
      answer: "Three. The four connected '1's in the top-left form one island. The lone '1' in the middle is a second. The two '1's in the bottom-right are a third.",
      highlightTerms: ["island"],
      visual: {
        type: 'grid',
        cells: [
          ['1', '1', '0', '0', '0'],
          ['1', '1', '0', '0', '0'],
          ['0', '0', '1', '0', '0'],
          ['0', '0', '0', '1', '1'],
        ],
      },
    },
    {
      question: "A program scans a 2D array the same way you read a book — left to right across row 0, then row 1, row 2, row 3. Which land cells does it encounter in Example 2, and in what order?",
      answer: "Seven cells: (0,0), (0,1) in row 0 — then (1,0), (1,1) in row 1 — then (2,2) — then (3,3), (3,4). The four cells of island 1, highlighted below, appear at four separate points in the scan. Without extra logic, each one triggers count++. You'd return 7, not 3.",
      visual: {
        type: 'grid',
        cells: [
          ['1', '1', '0', '0', '0'],
          ['1', '1', '0', '0', '0'],
          ['0', '0', '1', '0', '0'],
          ['0', '0', '0', '1', '1'],
        ],
        active: [[0, 0], [0, 1], [1, 0], [1, 1]],
      },
    },
    {
      question: "The scan finds (0,0) and counts it as island 1. Then it finds (0,1) — also part of island 1. How do you prevent (0,1) from being counted as a new island?",
      answer: "When you find (0,0), spread to every connected '1' before the scan continues. From (0,0), check all four neighbors: (1,0) and (0,1) are land — spread to them. From those, check their neighbors: (1,1) is land — spread there too. Change each cell to '0' as you arrive. By the time the scan reaches (0,1), it reads water. It skips it.",
      highlightTerms: ["connecting adjacent land cells horizontally or vertically"],
    },
    {
      question: "After the spread from (0,0) finishes, what does the scan see for the rest of island 1?",
      answer: "Water. Every cell of island 1 — (0,0), (0,1), (1,0), (1,1) — has been changed to '0'. The scan continues past all of them without triggering a count. It then reaches (2,2): untouched land. New island.\n\n**Find one cell, spread to consume the whole island, count once. The rest of the island becomes invisible to the scan.**",
      highlightTerms: ["number of islands"],
    },
  ],

  approach: {
    sections: [
      {
        label: 'Connected Components',
        description: "A 2D grid is a 2D array — you scan it with two for loops: one over rows, one over columns. That double loop visits every cell, left to right across each row, top to bottom. In code this is the same pattern as Understanding Q2. What makes it a graph problem is how you think about each cell: each '1' is a node, and nodes that are horizontal or vertical neighbors are connected. An island is a connected component — a group of nodes where any node can reach any other through connected neighbors. The problem asks how many connected components exist. That reframe makes the algorithm obvious: scan every cell, and each time you find one that has not been consumed, you have found a new component.",
        cards: [
          {
            type: 'insight',
            question: "What makes two land cells part of the same island?",
            answer: "Reachability. If you can walk from one cell to the other by stepping only onto '1' cells — horizontally or vertically — they are in the same island. In Example 2, (0,0) and (1,1) are the same island because the path (0,0)→(1,0)→(1,1) stays entirely on land. (2,2) cannot be reached from any of those four cells — it is its own island.",
          },
        ],
      },
      {
        label: 'Depth-First Search',
        description: "The spreading step has a name: depth-first search, or DFS. When the function finds a land neighbor to visit, it immediately dives into that neighbor completely before coming back to check the next one. It calls itself recursively — each call marks its cell '0', then calls dfs on all four neighbors. Each of those calls does the same. The recursion unwinds only when every direction hits water or a grid edge. By then, the entire island has been consumed. In Example 2, dfs(0,0) spreads through island 1 in this order, going down first:",
        vizState: {
          type: 'grid',
          cells: [
            ['1', '1', '0', '0', '0'],
            ['1', '1', '0', '0', '0'],
            ['0', '0', '1', '0', '0'],
            ['0', '0', '0', '1', '1'],
          ],
        },
        cards: [
          {
            type: 'trace',
            label: 'dfs(0, 0) — start',
            highlight: [0, 0],
            inputs: [{ label: 'r', value: 0 }, { label: 'c', value: 0 }],
            result: "grid[0][0] = '0'",
          },
          {
            type: 'trace',
            label: 'dfs(1, 0) — dive down first',
            highlight: [1, 0],
            inputs: [{ label: 'r', value: 1 }, { label: 'c', value: 0 }],
            result: "grid[1][0] = '0'",
          },
          {
            type: 'trace',
            label: 'dfs(1, 1) — then right',
            highlight: [1, 1],
            inputs: [{ label: 'r', value: 1 }, { label: 'c', value: 1 }],
            result: "grid[1][1] = '0'",
          },
          {
            type: 'trace',
            label: 'dfs(0, 1) — back up',
            highlight: [0, 1],
            inputs: [{ label: 'r', value: 0 }, { label: 'c', value: 1 }],
            result: "grid[0][1] = '0'",
          },
        ],
      },
      {
        label: 'Guard Conditions',
        description: "The dfs function would spread forever if it had no way to stop. Every call checks two conditions at the very top — before marking, before recursing — that cover every dead end the recursion can reach.",
        cards: [
          {
            type: 'insight',
            question: "What are the two conditions that make dfs return immediately?",
            answer: "First: the cell is out of bounds — r is negative or equals the number of rows, or c is negative or equals the number of columns. Second: the cell is not '1' — it is either original water, or land that a previous dfs call already changed to '0'. In both cases there is nothing to claim, so the function returns without doing anything.",
          },
        ],
      },
      {
        label: 'In-Place Marking',
        description: "Setting grid[r][c] = '0' the moment dfs arrives at a cell does two things at once: it stops any future dfs call from re-entering that cell (caught by the second guard), and it makes the main scan skip the cell because it no longer reads as land.",
        cards: [
          {
            type: 'insight',
            question: "Why change '1' to '0' instead of keeping a separate set of visited cells?",
            answer: "A separate set uses O(m × n) extra space for coordinates. Writing '0' directly into the grid is free — the grid already exists. The second guard condition catches any re-entry immediately, so no cell is ever processed twice and no extra memory is needed.",
          },
        ],
      },
      {
        label: 'Edge Cases',
        description: "Most edge cases fall naturally out of the two guard conditions. One detail the problem statement calls out is worth confirming.",
        cards: [
          {
            type: 'insight',
            question: "Do diagonal neighbors count as part of the same island?",
            answer: "No. dfs recurses in exactly four directions — up, down, left, right. A '1' at (0,0) has no path to a '1' at (1,1) — they would be two separate islands even if diagonally adjacent. The problem statement says land cells connect horizontally or vertically only.",
          },
        ],
      },
      {
        label: 'Pattern',
        cards: [
          { type: 'reveal', pattern: 'Depth-First Search' },
        ],
      },
    ],
  },

  steps: [
    // ── Step 1: initialize count ──────────────────────────────────────────────
    {
      id: 'ni-1',
      label: 'Initialize count = 0',
      phaseLabel: 'Count islands',
      currentLine: 2,
      state: {
        type: 'grid',
        cells: g(ORIG),
        note: 'count = 0',
      },
      vars: { count: 0 },
      description: 'Set count to 0. We will increment it each time we find a new island.',
    },

    // ── Step 2: outer loop r=0 ────────────────────────────────────────────────
    {
      id: 'ni-2',
      label: 'Outer loop: r = 0',
      phaseLabel: 'Count islands',
      currentLine: 3,
      state: {
        type: 'grid',
        cells: g(ORIG),
        note: 'r = 0',
      },
      vars: { r: 0, count: 0 },
      description: 'Begin outer loop. r=0, condition 0 < 3 is true. Scanning row 0.',
    },

    // ── Step 3: inner loop c=0 ────────────────────────────────────────────────
    {
      id: 'ni-3',
      label: 'Inner loop: c = 0',
      phaseLabel: 'Count islands',
      currentLine: 4,
      state: {
        type: 'grid',
        cells: g(ORIG),
        active: [[0, 0]],
        note: 'r=0, c=0',
      },
      vars: { r: 0, c: 0, count: 0 },
      description: 'Begin inner loop. c=0, condition 0 < 3 is true. Checking cell (0,0).',
    },

    // ── Step 4: check grid[0][0]='1' → true ──────────────────────────────────
    {
      id: 'ni-4',
      label: "grid[0][0] = '1' → enter DFS",
      phaseLabel: 'Count islands',
      currentLine: 5,
      state: {
        type: 'grid',
        cells: g(ORIG),
        active: [[0, 0]],
        note: "grid[0][0] = '1'",
      },
      vars: { r: 0, c: 0, count: 0 },
      calc: "grid[0][0] = '1' → condition true",
      description: "grid[0][0] is '1' (land). Condition is true — call dfs to flood-fill this island.",
      isPausePoint: true,
    },

    // ── Step 5: call dfs(grid, 0, 0) ─────────────────────────────────────────
    {
      id: 'ni-5',
      label: 'Call dfs(grid, 0, 0)',
      phaseLabel: 'DFS flood fill',
      currentLine: 6,
      state: {
        type: 'grid',
        cells: g(ORIG),
        active: [[0, 0]],
        note: 'entering dfs(0,0)',
      },
      vars: { r: 0, c: 0, count: 0 },
      description: 'Enter dfs(grid, 0, 0). Will flood-fill all land cells connected to (0,0).',
      isPausePoint: true,
    },

    // ── Step 6: dfs(0,0) bounds + value checks ────────────────────────────────
    {
      id: 'ni-6',
      label: 'dfs(0,0): bounds OK, cell = "1"',
      phaseLabel: 'DFS flood fill',
      currentLine: 14,
      state: {
        type: 'grid',
        cells: g(ORIG),
        active: [[0, 0]],
        note: 'dfs(0,0): checks pass',
      },
      vars: { r: 0, c: 0, count: 0 },
      description: 'Bounds check: 0 ≥ 0 and 0 < 3 — OK. Value check: grid[0][0] = "1" — OK. Continue.',
    },

    // ── Step 7: mark grid[0][0]='0' ──────────────────────────────────────────
    {
      id: 'ni-7',
      label: "Mark grid[0][0] = '0'",
      phaseLabel: 'DFS flood fill',
      currentLine: 16,
      state: {
        type: 'grid',
        cells: g(G_after_00),
        visited: [[0, 0]],
        note: "grid[0][0] = '0'",
      },
      vars: { r: 0, c: 0, count: 0 },
      description: "Mark (0,0) as visited by setting it to '0'. This prevents re-counting.",
      isPausePoint: true,
    },

    // ── Step 8: dfs(0,0) recurse down → (1,0)='0' returns ────────────────────
    {
      id: 'ni-8',
      label: 'dfs(0,0) → recurse down to (1,0)',
      phaseLabel: 'DFS flood fill',
      currentLine: 17,
      state: {
        type: 'grid',
        cells: g(G_after_00),
        visited: [[0, 0]],
        active: [[1, 0]],
        note: "dfs(1,0): grid[1][0]='0' → return",
      },
      vars: { r: 1, c: 0, count: 0 },
      description: "Recurse down: dfs(1, 0). grid[1][0] is '0' (water) — not land, return immediately.",
    },

    // ── Step 9: dfs(0,0) recurse up → (-1,0) OOB ─────────────────────────────
    {
      id: 'ni-9',
      label: 'dfs(0,0) → recurse up to (-1,0) — OOB',
      phaseLabel: 'DFS flood fill',
      currentLine: 18,
      state: {
        type: 'grid',
        cells: g(G_after_00),
        visited: [[0, 0]],
        note: 'dfs(-1,0): r < 0 → return',
      },
      vars: { r: -1, c: 0, count: 0 },
      description: 'Recurse up: dfs(-1, 0). r=-1 < 0 — out of bounds, return immediately.',
    },

    // ── Step 10: dfs(0,0) recurse right → (0,1)='1' → enter new dfs ──────────
    {
      id: 'ni-10',
      label: "dfs(0,0) → recurse right to (0,1) = '1'",
      phaseLabel: 'DFS flood fill',
      currentLine: 19,
      state: {
        type: 'grid',
        cells: g(G_after_00),
        visited: [[0, 0]],
        active: [[0, 1]],
        note: "dfs(0,1): grid[0][1]='1' → enter",
      },
      vars: { r: 0, c: 1, count: 0 },
      description: "Recurse right: dfs(0, 1). grid[0][1] is '1' — land. Bounds OK, entering dfs(0,1).",
      isPausePoint: true,
    },

    // ── Step 11: dfs(0,1) mark + recurse down → (1,1)='1' ────────────────────
    {
      id: 'ni-11',
      label: "dfs(0,1): mark '0', recurse down to (1,1)",
      phaseLabel: 'DFS flood fill',
      currentLine: 16,
      state: {
        type: 'grid',
        cells: g(G_after_01),
        visited: [[0, 0], [0, 1]],
        active: [[1, 1]],
        note: "grid[0][1]='0', dfs(1,1): grid[1][1]='1' → enter",
      },
      vars: { r: 0, c: 1, count: 0 },
      description: "Mark (0,1) as '0'. Recurse down to (1,1) — grid[1][1] is '1' (land). Enter dfs(1,1).",
    },

    // ── Step 12: dfs(1,1) mark, all neighbors are OOB or '0' ─────────────────
    {
      id: 'ni-12',
      label: "dfs(1,1): mark '0', all neighbors OOB or '0'",
      phaseLabel: 'DFS flood fill',
      currentLine: 16,
      state: {
        type: 'grid',
        cells: g(G_after_11),
        visited: [[0, 0], [0, 1], [1, 1]],
        note: 'dfs(1,1) complete — no more land neighbors',
      },
      vars: { r: 1, c: 1, count: 0 },
      description: "Mark (1,1) as '0'. Its four neighbors: (2,1)='0', (0,1)='0' already, (1,2)='0', (1,0)='0'. All return immediately. dfs(1,1) is done.",
      isPausePoint: true,
    },

    // ── Step 13: back in dfs(0,1): remaining neighbors ───────────────────────
    {
      id: 'ni-13',
      label: 'dfs(0,1): remaining neighbors return',
      phaseLabel: 'DFS flood fill',
      currentLine: 18,
      state: {
        type: 'grid',
        cells: g(G_after_11),
        visited: [[0, 0], [0, 1], [1, 1]],
        note: 'dfs(0,1): up OOB, left=(0,0) already 0',
      },
      vars: { r: 0, c: 1, count: 0 },
      description: "Back in dfs(0,1): recurse up → dfs(-1,1) OOB. Recurse left → dfs(0,0) grid='0', returns. Recurse right → dfs(0,2) grid[0][2]='0', returns. dfs(0,1) is done.",
    },

    // ── Step 14: dfs(0,0) recurse left → (0,-1) OOB ──────────────────────────
    {
      id: 'ni-14',
      label: 'dfs(0,0) → recurse left to (0,-1) — OOB',
      phaseLabel: 'DFS flood fill',
      currentLine: 20,
      state: {
        type: 'grid',
        cells: g(G_after_11),
        visited: [[0, 0], [0, 1], [1, 1]],
        note: 'dfs(0,-1): c < 0 → return',
      },
      vars: { r: 0, c: -1, count: 0 },
      description: 'Back in dfs(0,0): recurse left → dfs(0,-1). c=-1 < 0 — out of bounds, return.',
    },

    // ── Step 15: dfs(0,0) complete ────────────────────────────────────────────
    {
      id: 'ni-15',
      label: 'dfs(0,0) complete — island 1 fully marked',
      phaseLabel: 'DFS flood fill',
      currentLine: 6,
      state: {
        type: 'grid',
        cells: g(G_after_11),
        visited: [[0, 0], [0, 1], [1, 1]],
        note: 'dfs(0,0) returned',
      },
      vars: { r: 0, c: 0, count: 0 },
      description: "dfs(0,0) has returned. The entire first island — (0,0), (0,1), (1,1) — is now marked '0'. Back in the outer loops.",
      isPausePoint: true,
    },

    // ── Step 16: count++ → count=1 ───────────────────────────────────────────
    {
      id: 'ni-16',
      label: 'count++ → count = 1',
      phaseLabel: 'Count islands',
      currentLine: 7,
      state: {
        type: 'grid',
        cells: g(G_after_11),
        visited: [[0, 0], [0, 1], [1, 1]],
        note: 'count = 1',
      },
      vars: { r: 0, c: 0, count: 1 },
      description: 'One island found and fully flood-filled. Increment count to 1.',
      isPausePoint: true,
    },

    // ── Step 17: scan c=1, grid[0][1]='0' — skip ─────────────────────────────
    {
      id: 'ni-17',
      label: "c=1: grid[0][1]='0' — skip",
      phaseLabel: 'Count islands',
      currentLine: 5,
      state: {
        type: 'grid',
        cells: g(G_after_11),
        visited: [[0, 0], [0, 1], [1, 1]],
        active: [[0, 1]],
        note: "grid[0][1]='0' → skip",
      },
      vars: { r: 0, c: 1, count: 1 },
      description: "c increments to 1. grid[0][1]='0' (already marked). Condition false — skip.",
    },

    // ── Step 18: scan c=2, grid[0][2]='0' — skip ─────────────────────────────
    {
      id: 'ni-18',
      label: "c=2: grid[0][2]='0' — skip",
      phaseLabel: 'Count islands',
      currentLine: 5,
      state: {
        type: 'grid',
        cells: g(G_after_11),
        visited: [[0, 0], [0, 1], [1, 1]],
        active: [[0, 2]],
        note: "grid[0][2]='0' → skip",
      },
      vars: { r: 0, c: 2, count: 1 },
      description: "c increments to 2. grid[0][2]='0' (water). Condition false — skip.",
    },

    // ── Step 19: outer loop r=1, scan all cols — all '0' ─────────────────────
    {
      id: 'ni-19',
      label: "r=1: all cells '0' — skip entire row",
      phaseLabel: 'Count islands',
      currentLine: 3,
      state: {
        type: 'grid',
        cells: g(G_after_11),
        visited: [[0, 0], [0, 1], [1, 1]],
        note: 'row 1: all water',
      },
      vars: { r: 1, count: 1 },
      description: "r increments to 1. Scan c=0,1,2: grid[1][0]='0', grid[1][1]='0' (marked), grid[1][2]='0'. No land found — skip entire row.",
    },

    // ── Step 20: r=2, c=0, grid[2][0]='1' → enter DFS ───────────────────────
    {
      id: 'ni-20',
      label: "r=2, c=0: grid[2][0]='1' — new island",
      phaseLabel: 'Count islands',
      currentLine: 5,
      state: {
        type: 'grid',
        cells: g(G_after_11),
        visited: [[0, 0], [0, 1], [1, 1]],
        active: [[2, 0]],
        note: "grid[2][0]='1' → new island",
      },
      vars: { r: 2, c: 0, count: 1 },
      description: "r=2, c=0. grid[2][0] is '1' — a new island. Call dfs(grid, 2, 0).",
      isPausePoint: true,
    },

    // ── Step 21: dfs(2,0) marks cell, no land neighbors ──────────────────────
    {
      id: 'ni-21',
      label: "dfs(2,0): mark '0', neighbors all water/OOB",
      phaseLabel: 'DFS flood fill',
      currentLine: 16,
      state: {
        type: 'grid',
        cells: g(G_after_20),
        visited: [[0, 0], [0, 1], [1, 1], [2, 0]],
        note: 'dfs(2,0) complete',
      },
      vars: { r: 2, c: 0, count: 1 },
      description: "Mark (2,0) as '0'. Neighbors: (3,0) OOB, (1,0)='0', (2,1)='0', (2,-1) OOB. dfs(2,0) done.",
    },

    // ── Step 22: count++ → count=2 ───────────────────────────────────────────
    {
      id: 'ni-22',
      label: 'count++ → count = 2',
      phaseLabel: 'Count islands',
      currentLine: 7,
      state: {
        type: 'grid',
        cells: g(G_after_20),
        visited: [[0, 0], [0, 1], [1, 1], [2, 0]],
        note: 'count = 2',
      },
      vars: { r: 2, c: 0, count: 2 },
      description: 'Second island found and marked. Increment count to 2.',
      isPausePoint: true,
    },

    // ── Step 23: scan c=1, grid[2][1]='0' — skip ─────────────────────────────
    {
      id: 'ni-23',
      label: "r=2, c=1: grid[2][1]='0' — skip",
      phaseLabel: 'Count islands',
      currentLine: 5,
      state: {
        type: 'grid',
        cells: g(G_after_20),
        visited: [[0, 0], [0, 1], [1, 1], [2, 0]],
        active: [[2, 1]],
        note: "grid[2][1]='0' → skip",
      },
      vars: { r: 2, c: 1, count: 2 },
      description: "c=1. grid[2][1]='0' — water. Skip.",
    },

    // ── Step 24: r=2, c=2, grid[2][2]='1' → enter DFS ───────────────────────
    {
      id: 'ni-24',
      label: "r=2, c=2: grid[2][2]='1' — new island",
      phaseLabel: 'Count islands',
      currentLine: 5,
      state: {
        type: 'grid',
        cells: g(G_after_20),
        visited: [[0, 0], [0, 1], [1, 1], [2, 0]],
        active: [[2, 2]],
        note: "grid[2][2]='1' → new island",
      },
      vars: { r: 2, c: 2, count: 2 },
      description: "r=2, c=2. grid[2][2] is '1' — a new island. Call dfs(grid, 2, 2).",
      isPausePoint: true,
    },

    // ── Step 25: dfs(2,2) marks cell, no land neighbors ──────────────────────
    {
      id: 'ni-25',
      label: "dfs(2,2): mark '0', neighbors all water/OOB",
      phaseLabel: 'DFS flood fill',
      currentLine: 16,
      state: {
        type: 'grid',
        cells: g(G_final),
        visited: [[0, 0], [0, 1], [1, 1], [2, 0], [2, 2]],
        note: 'dfs(2,2) complete',
      },
      vars: { r: 2, c: 2, count: 2 },
      description: "Mark (2,2) as '0'. Neighbors: (3,2) OOB, (1,2)='0', (2,3) OOB, (2,1)='0'. dfs(2,2) done.",
    },

    // ── Step 26: count++ → count=3 ───────────────────────────────────────────
    {
      id: 'ni-26',
      label: 'count++ → count = 3',
      phaseLabel: 'Count islands',
      currentLine: 7,
      state: {
        type: 'grid',
        cells: g(G_final),
        visited: [[0, 0], [0, 1], [1, 1], [2, 0], [2, 2]],
        note: 'count = 3',
      },
      vars: { r: 2, c: 2, count: 3 },
      description: 'Third island found and marked. Increment count to 3.',
      isPausePoint: true,
    },

    // ── Step 27: loops exit ───────────────────────────────────────────────────
    {
      id: 'ni-27',
      label: 'Loops exit — all cells scanned',
      phaseLabel: 'Count islands',
      currentLine: 10,
      state: {
        type: 'grid',
        cells: g(G_final),
        visited: [[0, 0], [0, 1], [1, 1], [2, 0], [2, 2]],
        note: 'all cells scanned',
      },
      vars: { r: 3, count: 3 },
      description: 'r increments to 3. 3 ≥ 3 (grid.length) — outer loop condition false. All cells have been scanned.',
    },

    // ── Step 28: return count=3 ───────────────────────────────────────────────
    {
      id: 'ni-28',
      label: 'return count = 3',
      phaseLabel: 'Count islands',
      currentLine: 11,
      state: {
        type: 'grid',
        cells: g(G_final),
        visited: [[0, 0], [0, 1], [1, 1], [2, 0], [2, 2]],
        note: 'return 3',
      },
      vars: { count: 3, return: 3 },
      description: 'Return count = 3. The grid contains 3 distinct islands.',
      isPausePoint: true,
    },
  ],

  failureModes: [
    {
      id: 'no-mark',
      label: 'Infinite loop on island',
      shortLabel: 'skip grid[r][c]="0"',
      solutionCode: `function numIslands(grid: string[][]): number {
  let count = 0
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      if (grid[r][c] === '1') {
        dfs(grid, r, c)
        count++
      }
    }
  }
  return count
}
function dfs(grid: string[][], r: number, c: number): void {
  if (r < 0 || r >= grid.length || c < 0 || c >= grid[0].length) return
  if (grid[r][c] !== '1') return
  // grid[r][c] = '0'  ← REMOVED: cell never marked as visited
  dfs(grid, r + 1, c)
  dfs(grid, r - 1, c)
  dfs(grid, r, c + 1)
  dfs(grid, r, c - 1)
}`,
      brokenSteps: [
        {
          id: 'ni-broken-1',
          label: 'dfs(0,0): no mark — still "1"',
          phaseLabel: 'DFS flood fill',
          currentLine: 17,
          state: {
            type: 'grid',
            cells: g(ORIG),
            active: [[0, 0]],
            note: 'grid[0][0] still "1" — not marked!',
          },
          vars: { r: 0, c: 0, count: 0 },
          description: 'dfs(0,0) runs but skips the mark step. grid[0][0] is still "1". Recursing down to (1,0)="0", up to (-1,0) OOB, right to (0,1)="1" — will enter dfs(0,1).',
          isPausePoint: true,
        },
        {
          id: 'ni-broken-2',
          label: 'dfs(0,1) → recurse back to (0,0) still "1"',
          phaseLabel: 'DFS flood fill',
          currentLine: 20,
          state: {
            type: 'grid',
            cells: g(ORIG),
            active: [[0, 0]],
            note: '(0,0) still "1" → re-enters dfs!',
          },
          vars: { r: 0, c: 0, count: 0 },
          description: "Inside dfs(0,1), recurse left → dfs(0,0). grid[0][0] is still '1' — not marked. dfs(0,0) is entered again, repeating the cycle. Stack overflow.",
          isPausePoint: true,
        },
      ],
      fixSteps: [
        {
          id: 'ni-fix-1',
          label: "Add grid[r][c] = '0' before recursion",
          phaseLabel: 'DFS flood fill',
          currentLine: 16,
          state: {
            type: 'grid',
            cells: g(G_after_00),
            visited: [[0, 0]],
            active: [[0, 0]],
            note: "grid[0][0] = '0' — marked immediately",
          },
          vars: { r: 0, c: 0, count: 0 },
          description: "Fix: add grid[r][c] = '0' before any recursive calls. Now (0,0) is marked as water immediately. When dfs(0,1) recurses back left to (0,0), grid[0][0] is '0' — the value check returns immediately. No infinite loop.",
          isPausePoint: true,
        },
      ],
    },
  ],
}
