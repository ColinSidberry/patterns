import { AlgoProblem } from '../algo-types'

// solutionCode line map (1-indexed):
// 1  function maxArea(height: number[]): number {
// 2    let l = 0, r = height.length - 1
// 3    let max = 0
// 4    while (l < r) {
// 5      const area = Math.min(height[l], height[r]) * (r - l)
// 6      max = Math.max(max, area)
// 7      if (height[l] < height[r]) l++
// 8      else r--
// 9    }
// 10   return max
// 11 }

const V = [1, 8, 6, 2, 5, 4, 8, 3, 7]

export const containerWithMostWater: AlgoProblem = {
  id: 'container-with-most-water',
  title: 'Container With Most Water',
  difficulty: 'Medium',
  pattern: 'Two Pointers',

  question: `You are given an integer array height of length n. There are n vertical lines drawn such that the two endpoints of the i-th line are (i, 0) and (i, height[i]).

Find two lines that together with the x-axis form a container, such that the container contains the most water.

Return the maximum amount of water a container can store.

Example 1:
  Input:  height = [1,8,6,2,5,4,8,3,7]
  Output: 49
  Explanation: Lines at index 1 (height 8) and index 8 (height 7)
               form the best container: min(8,7) × 7 = 49.

Example 2:
  Input:  height = [1,1]
  Output: 1

Constraints:
  • n == height.length
  • 2 ≤ n ≤ 10^5
  • 0 ≤ height[i] ≤ 10^4`,

  starterCode: `function maxArea(height: number[]): number {

}`,

  solutionCode: `function maxArea(height: number[]): number {
  let l = 0, r = height.length - 1
  let max = 0
  while (l < r) {
    const area = Math.min(height[l], height[r]) * (r - l)
    max = Math.max(max, area)
    if (height[l] < height[r]) l++
    else r--
  }
  return max
}`,

  steps: [
    // ── Setup ──
    {
      id: 's-init-lr',
      label: 'Initialize l and r',
      phaseLabel: 'Setup',
      currentLine: 2,
      isPausePoint: true,
      vars: { l: 0, r: 8 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 0, r: 8 },
        showBars: true,
        note: 'Widest possible window — any inward move shrinks width.',
      },
      description: 'Start l at index 0, r at the last index. Maximum possible width of 8 units.',
    },
    {
      id: 's-init-max',
      label: 'Initialize max = 0',
      phaseLabel: 'Setup',
      currentLine: 3,
      vars: { l: 0, r: 8, max: 0 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 0, r: 8 },
        showBars: true,
      },
      description: 'max will track the best area found so far.',
    },
    // ── Iteration 1 ──
    {
      id: 's-while-1',
      label: 'Check: l < r?',
      phaseLabel: 'Loop',
      currentLine: 4,
      vars: { l: 0, r: 8 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 0, r: 8 },
        showBars: true,
      },
      description: 'l=0 < r=8 → true. Enter the loop.',
    },
    {
      id: 's-area-1',
      label: 'area = min(1, 7) × 8 = 8',
      phaseLabel: 'Compute',
      currentLine: 5,
      isPausePoint: true,
      vars: { l: 0, r: 8, area: 8, max: 0 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 0, r: 8 },
        highlight: [0],
        showBars: true,
        note: 'height[l]=1 is the bottleneck.',
      },
      calc: `area = Math.min(height[l], height[r]) * (r - l)
     = min(height[0], height[8]) × (8 − 0)
     = min(1, 7) × 8
     = 8`,
      description: 'Width is r−l=8. Height is capped at the shorter wall.',
    },
    {
      id: 's-max-1',
      label: 'max = max(0, 8) = 8',
      phaseLabel: 'Compute',
      currentLine: 6,
      vars: { l: 0, r: 8, area: 8, max: 8 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 0, r: 8 },
        showBars: true,
      },
      calc: `max = Math.max(max, area)
    = Math.max(0, 8)
    = 8`,
      description: 'Update best area seen so far.',
    },
    {
      id: 's-move-l-1',
      label: 'height[l] < height[r] → l++',
      phaseLabel: 'Move',
      currentLine: 7,
      isPausePoint: true,
      vars: { l: 1, r: 8, area: 8, max: 8 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 1, r: 8 },
        showBars: true,
        note: 'Moving the taller wall can only hurt — shorter wall stays the limit.',
      },
      description: 'height[l]=1 < height[r]=7 → l is the bottleneck. l++ to try a taller left wall.',
    },
    // ── Iteration 2 ──
    {
      id: 's-while-2',
      label: 'Check: l < r?',
      phaseLabel: 'Loop',
      currentLine: 4,
      vars: { l: 1, r: 8 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 1, r: 8 },
        showBars: true,
      },
      description: 'l=1 < r=8 → true. Continue the loop.',
    },
    {
      id: 's-area-2',
      label: 'area = min(8, 7) × 7 = 49',
      phaseLabel: 'Compute',
      currentLine: 5,
      isPausePoint: true,
      vars: { l: 1, r: 8, area: 49, max: 8 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 1, r: 8 },
        highlight: [8],
        showBars: true,
        note: 'height[r]=7 is now the bottleneck.',
      },
      calc: `area = Math.min(height[l], height[r]) * (r - l)
     = min(height[1], height[8]) × (8 − 1)
     = min(8, 7) × 7
     = 49`,
      description: 'New best! l moved to index 1 (height 8).',
    },
    {
      id: 's-max-2',
      label: 'max = max(8, 49) = 49',
      phaseLabel: 'Compute',
      currentLine: 6,
      vars: { l: 1, r: 8, area: 49, max: 49 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 1, r: 8 },
        showBars: true,
      },
      calc: `max = Math.max(max, area)
    = Math.max(8, 49)
    = 49`,
      description: 'New best — update max to 49.',
    },
    {
      id: 's-move-r-2',
      label: 'height[l] ≥ height[r] → r--',
      phaseLabel: 'Move',
      currentLine: 8,
      vars: { l: 1, r: 7, area: 49, max: 49 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 1, r: 7 },
        showBars: true,
        note: 'height[r]=7 is the shorter wall — move it inward.',
      },
      description: 'height[l]=8 ≥ height[r]=7 → else: r-- → r=7.',
    },
    // ── Return ──
    {
      id: 's-return',
      label: 'Pointers meet — return max = 49',
      phaseLabel: 'Return',
      currentLine: 10,
      isPausePoint: true,
      vars: { max: 49 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 1, r: 1 },
        showBars: true,
        note: 'Every pair of walls has been considered exactly once.',
      },
      description: 'Remaining iterations find no better area. When l and r meet, every possible pair has been evaluated in O(n) time. Return max = 49.',
    },
  ],

  understanding: [
    {
      question: 'What is the data structure?',
      answer: 'An integer array height — each element is the height of a vertical line drawn at that index.',
      highlightTerms: ['integer array height'],
    },
    {
      question: 'What does it represent?',
      answer: 'Two walls forming a container. The shorter wall sets the height; the gap between indices is the width.',
      highlightTerms: ['vertical lines', 'height[i]', 'x-axis form a container'],
      visual: {
        type: 'array-row',
        values: V,
        pointers: { l: 0, r: 8 },
        showBars: true,
        note: 'Area = min(height[l], height[r]) × (r − l) = min(1, 7) × 8 = 8',
      },
    },
    {
      question: 'What are we optimizing for?',
      answer: 'Maximum box area — the best pair of walls that maximizes min(height[l], height[r]) × (r − l).',
      highlightTerms: ['most water', 'maximum amount of water'],
    },
  ],

  approach: {
    vizState: {
      type: 'array-row',
      values: V,
      pointers: {},
      showBars: true,
    },
    playback: [
      {
        label: 'Ex 1 — l always shorter',
        values: [1, 2, 3, 4, 5],
        frames: [
          { pointers: { l: 0, r: 4 },                 note: 'Start: l=0, r=4 — widest window' },
          { pointers: { l: 0, r: 4 }, highlight: [0], note: 'height[l]=1 < height[r]=5 → step l' },
          { pointers: { l: 1, r: 4 }, highlight: [1], note: 'height[l]=2 < height[r]=5 → step l' },
          { pointers: { l: 2, r: 4 }, highlight: [2], note: 'height[l]=3 < height[r]=5 → step l' },
          { pointers: { l: 3, r: 4 }, highlight: [3], note: 'height[l]=4 < height[r]=5 → step l' },
          { pointers: { l: 4, r: 4 },                 note: 'Pointers meet — done' },
        ],
      },
      {
        label: 'Ex 2 — both sides move',
        values: V,
        frames: [
          { pointers: { l: 0, r: 8 },                 note: 'Start: l=0, r=8 — widest window' },
          { pointers: { l: 0, r: 8 }, highlight: [0], note: 'height[l]=1 < height[r]=7 → step l' },
          { pointers: { l: 1, r: 8 }, highlight: [8], note: 'height[l]=8 > height[r]=7 → step r  ← switches' },
          { pointers: { l: 1, r: 7 }, highlight: [7], note: 'height[l]=8 > height[r]=3 → step r' },
          { pointers: { l: 1, r: 6 }, highlight: [1], note: 'height[l]=8 = height[r]=8 → step l (equal)' },
          { pointers: { l: 2, r: 6 }, highlight: [2], note: 'height[l]=6 < height[r]=8 → step l' },
          { pointers: { l: 3, r: 6 }, highlight: [3], note: 'height[l]=2 < height[r]=8 → step l' },
          { pointers: { l: 4, r: 6 }, highlight: [4], note: 'height[l]=5 < height[r]=8 → step l' },
          { pointers: { l: 5, r: 6 }, highlight: [5], note: 'height[l]=4 < height[r]=8 → step l' },
          { pointers: { l: 6, r: 6 },                 note: 'Pointers meet — max area = 49' },
        ],
      },
    ],
    sections: [
      {
        label: 'Naive',
        cards: [
          {
            type: 'trace',
            label: 'Try bars 0 and 8 — widest pair',
            highlight: [0],
            inputs: [
              { label: 'height[l]',       value: 1 },
              { label: 'height[r]',       value: 7 },
              { label: 'min(h[l], h[r])', value: 1 },
              { label: 'r − l',           value: 8 },
            ],
            result: '1 × 8 = 8',
          },
          {
            type: 'trace',
            label: 'Try bars 1 and 8 — taller left wall',
            highlight: [8],
            inputs: [
              { label: 'height[l]',       value: 8 },
              { label: 'height[r]',       value: 7 },
              { label: 'min(h[l], h[r])', value: 7 },
              { label: 'r − l',           value: 7 },
            ],
            result: '7 × 7 = 49',
          },
          {
            type: 'trace',
            label: 'Try bars 1 and 6 — equal heights',
            inputs: [
              { label: 'height[l]',       value: 8 },
              { label: 'height[r]',       value: 8 },
              { label: 'min(h[l], h[r])', value: 8 },
              { label: 'r − l',           value: 5 },
            ],
            result: '8 × 5 = 40',
          },
        ],
      },
      {
        label: 'Equation',
        cards: [
          {
            type: 'equation',
            insight: 'Every pair has two factors: the shorter wall caps the height, and the index gap sets the width. To maximize area you need both as large as possible.',
            formula: 'area = min(height[l], height[r]) × (r − l)',
          },
        ],
      },
      {
        label: 'Approach',
        cards: [
          {
            type: 'insight',
            question: 'The naive tries all pairs. What pattern lets us skip most of them?',
            answer: 'Start with the widest possible window (l=0, r=n-1). Any inward move shrinks width. The only way area can improve is if the height cap rises — which requires the shorter wall to increase. Moving the taller wall inward keeps the same cap but loses width: area can only worsen.',
            definedTerms: [{
              term: 'monotonic',
              definition: 'A relationship that only moves in one direction. Here: moving the taller wall inward can only shrink or maintain area — it can never improve it.',
            }],
          },
          {
            type: 'insight',
            question: 'Which wall do you move, and why is that safe?',
            answer: 'Always move the shorter wall. When height[l] ≤ height[r], height[l] is the cap — moving r inward shrinks width while height[l] still sets the ceiling. Area can only worsen. Moving l gives a chance to find a taller wall that raises the cap. The taller side has done its job.',
            definedTerms: [{
              term: 'greedy',
              definition: 'At each step you make a locally optimal choice that is guaranteed to be globally correct — no backtracking needed.',
            }],
          },
        ],
      },
      {
        label: 'Decision',
        description: 'Recall: area = min(height[l], height[r]) × (r − l). When height[l] ≤ height[r], height[l] is the cap — moving r inward shrinks width while the ceiling stays the same or drops. Only moving the shorter wall can raise the cap. Hover each card to see the choice on the array.',
        cards: [
          {
            type: 'decision',
            heightL: 1,
            heightR: 7,
            shorterSide: 'l',
            reason: 'Left wall is shorter — it sets the height cap. Moving right only shrinks width. Step l to find a taller replacement.',
            highlight: [0],
            pointers: { l: 0, r: 8 },
          },
          {
            type: 'decision',
            heightL: 8,
            heightR: 7,
            shorterSide: 'r',
            reason: 'Right wall is shorter — it sets the height cap. Left wall is already taller and has done its job. Step r inward.',
            highlight: [8],
            pointers: { l: 1, r: 8 },
          },
        ],
      },
      {
        label: 'Edge Cases',
        cards: [
          {
            type: 'insight',
            question: 'Why start with l=0 and r=n-1?',
            answer: 'This gives the maximum possible width. Every inward step reduces width — so starting at the outermost bars guarantees you consider the widest containers first. When heights are equal (height[l] = height[r]), stepping either pointer is safe since the other side is at least as tall.',
          },
        ],
      },
      {
        label: 'Pattern',
        cards: [
          {
            type: 'reveal',
            pattern: 'Two Pointers',
          },
        ],
      },
    ],
  },

  codeSections: [
    { label: 'Initialize', startLine: 2,  endLine: 3  },
    { label: 'Loop',       startLine: 4,  endLine: 4  },
    { label: 'Evaluate',   startLine: 5,  endLine: 6  },
    { label: 'Compare',    startLine: 7,  endLine: 9  },
    { label: 'Return',     startLine: 10, endLine: 10 },
  ],

  failureModes: [
    {
      id: 'wrong-wall',
      label: 'Wrong: always move taller wall',
      shortLabel: 'Wrong wall',
      solutionCode: `function maxArea(height: number[]): number {
  let l = 0, r = height.length - 1
  let max = 0
  while (l < r) {
    const area = Math.min(height[l], height[r]) * (r - l)
    max = Math.max(max, area)
    if (height[l] > height[r]) l++   // BUG: moving taller wall
    else r--
  }
  return max
}`,
      brokenSteps: [
        {
          id: 'bw-area-1',
          label: 'area = min(1, 7) × 8 = 8',
          phaseLabel: 'Compute',
          currentLine: 5,
          isPausePoint: true,
          vars: { l: 0, r: 8, area: 8, max: 0 },
          state: {
            type: 'array-row',
            values: V,
            pointers: { l: 0, r: 8 },
            showBars: true,
          },
          description: 'First iteration looks the same — area=8.',
        },
        {
          id: 'bw-max-1',
          label: 'max = max(0, 8) = 8',
          phaseLabel: 'Compute',
          currentLine: 6,
          vars: { l: 0, r: 8, area: 8, max: 8 },
          state: {
            type: 'array-row',
            values: V,
            pointers: { l: 0, r: 8 },
            showBars: true,
          },
          description: 'max updated to 8.',
        },
        {
          id: 'bw-wrong-condition',
          label: 'BUG: height[l] > height[r]?',
          phaseLabel: 'broken',
          currentLine: 7,
          isPausePoint: true,
          vars: { l: 0, r: 8, area: 8, max: 8 },
          state: {
            type: 'array-row',
            values: V,
            pointers: { l: 0, r: 8 },
            highlight: [0, 8],
            showBars: true,
            note: 'Skipping the best pair (l=1, r=8) — r will never reach index 8 again.',
          },
          description: 'BUG: checking height[l] > height[r] → 1 > 7 is false. Falls to else: r-- will fire instead of l++.',
        },
        {
          id: 'bw-wrong-move',
          label: 'else r-- → moves taller wall!',
          phaseLabel: 'broken',
          currentLine: 8,
          vars: { l: 0, r: 7, area: 8, max: 8 },
          state: {
            type: 'array-row',
            values: V,
            pointers: { l: 0, r: 7 },
            highlight: [8],
            showBars: true,
          },
          description: 'r-- → r=7. We moved the TALLER wall (height=7). l=0 (height=1) is still the bottleneck — we gained nothing and lost width.',
        },
        {
          id: 'bw-wrong-result',
          label: 'Return max = 8 (should be 49)',
          phaseLabel: 'broken',
          currentLine: 10,
          isPausePoint: true,
          vars: { max: 8 },
          state: {
            type: 'array-row',
            values: V,
            pointers: { l: 0, r: 0 },
            showBars: true,
            note: 'l=0 (height=1) capped every area. Optimal pair (1,8) was never evaluated.',
          },
          description: 'l stayed at index 0 the whole time — height=1 capped every area. Return 8, not 49.',
        },
      ],
      fixSteps: [
        {
          id: 'fix-shorter-wall',
          label: 'Fix: move the shorter wall (l)',
          phaseLabel: 'Fix',
          currentLine: 7,
          isPausePoint: true,
          vars: { l: 1, r: 8, area: 8, max: 8 },
          state: {
            type: 'array-row',
            values: V,
            pointers: { l: 1, r: 8 },
            highlight: [0],
            showBars: true,
            note: 'Move l (shorter) — only moving the shorter wall can improve the area.',
          },
          description: 'Fix: use < not >. height[l]=1 < height[r]=7 → true → l++. Now l=1 (height=8), enabling the optimal pairing.',
        },
      ],
    },
  ],
}
