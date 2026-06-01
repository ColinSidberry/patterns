import { AlgoProblem } from '../algo-types'

// solutionCode line map (1-indexed):
// 1  function trap(height: number[]): number {
// 2    let l = 0, r = height.length - 1
// 3    let maxL = 0, maxR = 0
// 4    let trapped = 0
// 5    while (l < r) {
// 6      if (height[l] < height[r]) {
// 7        if (height[l] >= maxL) maxL = height[l]
// 8        else trapped += maxL - height[l]
// 9        l++
// 10     } else {
// 11       if (height[r] >= maxR) maxR = height[r]
// 12       else trapped += maxR - height[r]
// 13       r--
// 14     }
// 15   }
// 16   return trapped
// 17 }

const V = [4, 2, 0, 3, 2, 5]

export const trappingRainWater: AlgoProblem = {
  id: 'trapping-rain-water',
  title: 'Trapping Rain Water',
  difficulty: 'Hard',
  pattern: 'Two Pointers',

  question: `Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining.

Example 1:
  Input:  height = [4,2,0,3,2,5]
  Output: 9

Example 2:
  Input:  height = [0,1,0]
  Output: 1

Constraints:
  • n == height.length
  • 1 ≤ n ≤ 2 × 10^4
  • 0 ≤ height[i] ≤ 10^5`,

  starterCode: `function trap(height: number[]): number {

}`,

  solutionCode: `function trap(height: number[]): number {
  let l = 0, r = height.length - 1
  let maxL = 0, maxR = 0
  let trapped = 0
  while (l < r) {
    if (height[l] < height[r]) {
      if (height[l] >= maxL) maxL = height[l]
      else trapped += maxL - height[l]
      l++
    } else {
      if (height[r] >= maxR) maxR = height[r]
      else trapped += maxR - height[r]
      r--
    }
  }
  return trapped
}`,

  steps: [
    // ── Setup ──
    {
      id: 's-init-lr',
      label: 'Initialize l and r',
      phaseLabel: 'Setup',
      currentLine: 2,
      isPausePoint: true,
      vars: { l: 0, r: 5 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 0, r: 5 },
        showBars: true,
        note: 'Widest possible window — pointers will converge inward.',
      },
      description: 'Start l at index 0, r at the last index. We scan inward from both ends.',
    },
    {
      id: 's-init-max',
      label: 'Initialize maxL = maxR = 0',
      phaseLabel: 'Setup',
      currentLine: 3,
      vars: { l: 0, r: 5, maxL: 0, maxR: 0 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 0, r: 5 },
        showBars: true,
      },
      description: 'maxL and maxR track the tallest bar seen so far from each side — they determine the water level.',
    },
    {
      id: 's-init-trapped',
      label: 'Initialize trapped = 0',
      phaseLabel: 'Setup',
      currentLine: 4,
      vars: { l: 0, r: 5, maxL: 0, maxR: 0, trapped: 0 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 0, r: 5 },
        showBars: true,
      },
      description: 'trapped accumulates the total water volume.',
    },

    // ── Iteration 1 — maxL update, no water ──
    {
      id: 's-while-1',
      label: 'Check: l < r?',
      phaseLabel: 'Loop',
      currentLine: 5,
      vars: { l: 0, r: 5, maxL: 0, maxR: 0, trapped: 0 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 0, r: 5 },
        showBars: true,
      },
      description: 'l=0 < r=5 → true. Enter the loop.',
    },
    {
      id: 's-compare-1',
      label: 'height[l]=4 < height[r]=5 → left',
      phaseLabel: 'Evaluate',
      currentLine: 6,
      isPausePoint: true,
      vars: { l: 0, r: 5, maxL: 0, maxR: 0, trapped: 0 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 0, r: 5 },
        highlight: [0],
        showBars: true,
        note: 'height[l] < height[r] — the left side is shorter, so maxL is the constraint. Process left.',
      },
      description: 'height[l]=4 < height[r]=5 → the right wall is taller, so the left side\'s running max bounds the water level. We process the left pointer.',
    },
    {
      id: 's-update-maxL-1',
      label: 'height[l] ≥ maxL → maxL = 4',
      phaseLabel: 'Evaluate',
      currentLine: 7,
      vars: { l: 0, r: 5, maxL: 4, maxR: 0, trapped: 0 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 0, r: 5 },
        highlight: [0],
        showBars: true,
        note: 'height[l]=4 ≥ maxL=0 — new high-water mark. No valley here so no water.',
      },
      description: 'height[0]=4 ≥ maxL=0 → update maxL to 4. This bar is at or above the current bound, so no water pools here.',
    },
    {
      id: 's-move-l-1',
      label: 'l++ → l = 1',
      phaseLabel: 'Move',
      currentLine: 9,
      isPausePoint: true,
      vars: { l: 1, r: 5, maxL: 4, maxR: 0, trapped: 0 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 1, r: 5 },
        showBars: true,
      },
      description: 'Advance l to index 1. maxL=4 is now established — any left-side bar shorter than 4 will trap water.',
    },

    // ── Iteration 2 — trap 2 units ──
    {
      id: 's-while-2',
      label: 'Check: l < r?',
      phaseLabel: 'Loop',
      currentLine: 5,
      vars: { l: 1, r: 5, maxL: 4, maxR: 0, trapped: 0 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 1, r: 5 },
        showBars: true,
      },
      description: 'l=1 < r=5 → true. Continue.',
    },
    {
      id: 's-trap-2',
      label: 'trapped += maxL − height[l] = 2',
      phaseLabel: 'Compute',
      currentLine: 8,
      isPausePoint: true,
      vars: { l: 1, r: 5, maxL: 4, maxR: 0, trapped: 2 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 1, r: 5 },
        highlight: [1],
        showBars: true,
        note: 'height[l]=2 < maxL=4 — valley. Water fills to maxL.',
      },
      calc: `trapped += maxL - height[l]
       = 4 - height[1]
       = 4 - 2
       = 2`,
      description: 'height[1]=2 < height[r]=5 (process left). height[1]=2 < maxL=4 → valley. Water trapped = maxL − height[l] = 2. trapped=2.',
    },
    {
      id: 's-move-l-2',
      label: 'l++ → l = 2',
      phaseLabel: 'Move',
      currentLine: 9,
      vars: { l: 2, r: 5, maxL: 4, maxR: 0, trapped: 2 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 2, r: 5 },
        showBars: true,
      },
      description: 'Advance l to index 2 — the deepest valley.',
    },

    // ── Iteration 3 — trap 4 units ──
    {
      id: 's-while-3',
      label: 'Check: l < r?',
      phaseLabel: 'Loop',
      currentLine: 5,
      vars: { l: 2, r: 5, maxL: 4, maxR: 0, trapped: 2 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 2, r: 5 },
        showBars: true,
      },
      description: 'l=2 < r=5 → true. Continue.',
    },
    {
      id: 's-trap-3',
      label: 'trapped += maxL − height[l] = 4',
      phaseLabel: 'Compute',
      currentLine: 8,
      isPausePoint: true,
      vars: { l: 2, r: 5, maxL: 4, maxR: 0, trapped: 6 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 2, r: 5 },
        highlight: [2],
        showBars: true,
        note: 'Deepest valley: height=0. Fills all the way to maxL=4.',
      },
      calc: `trapped += maxL - height[l]
       = 4 - height[2]
       = 4 - 0
       = 4`,
      description: 'height[2]=0 — the deepest valley. Water fills to maxL=4, trapping 4 units. trapped=6.',
    },
    {
      id: 's-move-l-3',
      label: 'l++ → l = 3',
      phaseLabel: 'Move',
      currentLine: 9,
      vars: { l: 3, r: 5, maxL: 4, maxR: 0, trapped: 6 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 3, r: 5 },
        showBars: true,
      },
      description: 'Advance l to index 3.',
    },

    // ── Return ──
    {
      id: 's-return',
      label: 'Pointers meet — return trapped = 9',
      phaseLabel: 'Return',
      currentLine: 16,
      isPausePoint: true,
      vars: { l: 5, r: 5, maxL: 4, maxR: 5, trapped: 9 },
      state: {
        type: 'array-row',
        values: V,
        pointers: { l: 5, r: 5 },
        showBars: true,
        note: 'Every bar has been evaluated exactly once in O(n) time.',
      },
      description: 'Remaining steps (l=3,4): trap 1 and 2 more units respectively. When l and r meet at index 5, every bar has been processed. Return trapped=9.',
    },
  ],

  understanding: [
    {
      question: 'What is the data structure?',
      answer: 'An integer array height — each element is the height of a vertical bar at that index.',
      highlightTerms: ['n non-negative integers', 'elevation map'],
    },
    {
      question: 'What does it represent?',
      answer: 'Vertical bars that can trap rainwater in the valleys between them. Water in a valley is capped by the shorter of the tallest bars on either side.',
      highlightTerms: ['elevation map', 'width of each bar is 1'],
      visual: {
        type: 'array-row',
        values: V,
        pointers: { l: 0, r: 5 },
        showBars: true,
        note: 'Valley at index 2 (height=0): water level = min(maxL=4, maxR=5) − 0 = 4 units.',
      },
    },
    {
      question: 'What are we optimizing for?',
      answer: 'Total trapped water — the sum across every bar of how much water sits above it, bounded by the running max from each side.',
      highlightTerms: ['how much water it can trap'],
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
        values: V,
        frames: [
          { pointers: { l: 0, r: 5 },                 note: 'Start: l=0, r=5 — widest window' },
          { pointers: { l: 0, r: 5 }, highlight: [0], note: 'height[l]=4 < height[r]=5 → step l' },
          { pointers: { l: 1, r: 5 }, highlight: [1], note: 'height[l]=2 < height[r]=5 → step l' },
          { pointers: { l: 2, r: 5 }, highlight: [2], note: 'height[l]=0 < height[r]=5 → step l  (deepest valley)' },
          { pointers: { l: 3, r: 5 }, highlight: [3], note: 'height[l]=3 < height[r]=5 → step l' },
          { pointers: { l: 4, r: 5 }, highlight: [4], note: 'height[l]=2 < height[r]=5 → step l' },
          { pointers: { l: 5, r: 5 },                 note: 'Pointers meet — every bar evaluated in O(n)' },
        ],
      },
      {
        label: 'Ex 2 — both sides move',
        values: [2, 0, 3, 0, 2],
        frames: [
          { pointers: { l: 0, r: 4 },                 note: 'Start: l=0, r=4' },
          { pointers: { l: 0, r: 4 }, highlight: [0], note: 'height[l]=2 ≤ height[r]=2 → step l' },
          { pointers: { l: 1, r: 4 }, highlight: [1], note: 'height[l]=0 < height[r]=2 → step l' },
          { pointers: { l: 2, r: 4 }, highlight: [4], note: 'height[l]=3 > height[r]=2 → step r  ← switches sides' },
          { pointers: { l: 2, r: 3 }, highlight: [3], note: 'height[l]=3 > height[r]=0 → step r' },
          { pointers: { l: 2, r: 2 },                 note: 'Pointers meet — done' },
        ],
      },
    ],
    sections: [
      {
        label: 'Naive',
        cards: [
          {
            type: 'trace',
            label: 'Try bar index 1',
            highlight: [1],
            inputs: [
              { label: 'height[1]',       value: 2 },
              { label: 'maxLeft',         value: 4 },
              { label: 'maxRight',        value: 5 },
              { label: 'min(maxL, maxR)', value: 4 },
            ],
            result: '4 − 2 = 2 units trapped',
          },
          {
            type: 'trace',
            label: 'Try bar index 2 — deepest valley',
            highlight: [2],
            inputs: [
              { label: 'height[2]',       value: 0 },
              { label: 'maxLeft',         value: 4 },
              { label: 'maxRight',        value: 5 },
              { label: 'min(maxL, maxR)', value: 4 },
            ],
            result: '4 − 0 = 4 units trapped',
          },
          {
            type: 'trace',
            label: 'Try bar index 3',
            highlight: [3],
            inputs: [
              { label: 'height[3]',       value: 3 },
              { label: 'maxLeft',         value: 4 },
              { label: 'maxRight',        value: 5 },
              { label: 'min(maxL, maxR)', value: 4 },
            ],
            result: '4 − 3 = 1 unit trapped',
          },
        ],
      },
      {
        label: 'Equation',
        cards: [
          {
            type: 'equation',
            insight: 'Every bar needed the same two things: the tallest bar to its left, and the tallest bar to its right. Water rises to the shorter of those two walls.',
            formula: 'water[i] = min(maxLeft, maxRight) − height[i]',
          },
        ],
      },
      {
        label: 'Approach',
        cards: [
          {
            type: 'insight',
            question: 'MaxLeft is free — can you get maxRight for free too?',
            answer: 'Walking left-to-right, maxLeft is a running max you carry along — it costs nothing extra. By symmetry, a second pointer starting at the far right and walking inward maintains maxRight the same way. Neither pointer ever rescans — both maxes update in O(1) at each step.',
          },
          {
            type: 'insight',
            question: 'Both pointers walk inward — which one do you step?',
            answer: 'Compare the current heights. If height[l] ≤ height[r], the right wall is already at least as tall — left is the constraint. Compute water at l and step l. If height[r] < height[l], flip it. The taller side waits; the shorter side is safe to evaluate.',
          },
        ],
      },
      {
        label: 'Decision',
        description: 'Recall: water[i] = min(maxL, maxR) − height[i]. When height[r] ≥ height[l], the right side already exceeds the left — the min resolves to maxL no matter what sits between l and r. The taller side has done its job. You can evaluate bar l with certainty and step it inward. Hover each card to see the choice on the array.',
        cards: [
          {
            type: 'decision',
            heightL: 4,
            heightR: 5,
            shorterSide: 'l',
            reason: 'Right wall is already taller. Left is the constraint — evaluate bar l, then step l inward.',
            highlight: [0],
            pointers: { l: 0, r: 5 },
          },
          {
            type: 'decision',
            heightL: 3,
            heightR: 2,
            shorterSide: 'r',
            reason: 'Left wall is already taller. Right is the constraint — evaluate bar r, then step r inward.',
            highlight: [4],
            pointers: { l: 3, r: 4 },
          },
        ],
      },
      {
        label: 'Edge Cases',
        cards: [
          {
            type: 'insight',
            question: 'What about the bars at each end?',
            answer: 'The outermost bars (l=0 and r=n−1) are the walls themselves — nothing behind them means they can never trap water. The first step from each end contributes 0 but establishes the initial running max. This is why l and r start at the edges.',
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
    { label: 'Initialize',   startLine: 2,  endLine: 4  },
    { label: 'Loop',         startLine: 5,  endLine: 5  },
    { label: 'Compare',      startLine: 6,  endLine: 6  },
    { label: 'Update bound', startLine: 7,  endLine: 8  },
    { label: 'Move pointer', startLine: 9,  endLine: 9  },
    { label: 'Return',       startLine: 16, endLine: 16 },
  ],

  failureModes: [
    {
      id: 'taller-side',
      label: 'Wrong: process the taller side',
      shortLabel: 'Taller side',
      solutionCode: `function trap(height: number[]): number {
  let l = 0, r = height.length - 1
  let maxL = 0, maxR = 0
  let trapped = 0
  while (l < r) {
    if (height[l] > height[r]) {   // BUG: should be <
      if (height[l] >= maxL) maxL = height[l]
      else trapped += maxL - height[l]
      l++
    } else {
      if (height[r] >= maxR) maxR = height[r]
      else trapped += maxR - height[r]
      r--
    }
  }
  return trapped
}`,
      brokenSteps: [
        {
          id: 'bw-compare',
          label: 'BUG: height[l] > height[r]?',
          phaseLabel: 'broken',
          currentLine: 6,
          isPausePoint: true,
          vars: { l: 0, r: 5, maxL: 0, maxR: 0, trapped: 0 },
          state: {
            type: 'array-row',
            values: V,
            pointers: { l: 0, r: 5 },
            highlight: [0, 5],
            showBars: true,
            note: 'BUG: 4 > 5 is false → else: processes right. Should process left (shorter side).',
          },
          description: 'BUG: the condition is > instead of <. height[0]=4 > height[5]=5 is false → falls to else: processes the RIGHT side. The right wall (height=5) is taller — it should never be processed first.',
        },
        {
          id: 'bw-wrong-move',
          label: 'else: maxR = 5, r-- → r = 4',
          phaseLabel: 'broken',
          currentLine: 11,
          vars: { l: 0, r: 4, maxL: 0, maxR: 5, trapped: 0 },
          state: {
            type: 'array-row',
            values: V,
            pointers: { l: 0, r: 4 },
            highlight: [5],
            showBars: true,
            note: 'maxR locked to 5 too early — right-side water calculations will be inflated.',
          },
          description: 'maxR=5 is set from the tallest bar (index 5) on the very first step. r moves to 4. The left side (maxL=0) hasn\'t been established yet.',
        },
        {
          id: 'bw-skipped',
          label: 'Index 2 never processed — return 7',
          phaseLabel: 'broken',
          currentLine: 16,
          isPausePoint: true,
          vars: { l: 2, r: 2, maxL: 4, maxR: 5, trapped: 7 },
          state: {
            type: 'array-row',
            values: V,
            pointers: { l: 2, r: 2 },
            highlight: [2],
            showBars: true,
            note: 'Index 2 (deepest valley, height=0) was never evaluated. 4 units of water lost.',
          },
          description: 'After the wrong first move, l and r eventually converge at index 2 without either pointer ever processing it. The 4 units at the deepest valley are lost. Return 7 instead of 9.',
        },
      ],
      fixSteps: [
        {
          id: 'fix-condition',
          label: 'Fix: height[l] < height[r] → process left',
          phaseLabel: 'Fix',
          currentLine: 6,
          isPausePoint: true,
          vars: { l: 0, r: 5, maxL: 0, maxR: 0, trapped: 0 },
          state: {
            type: 'array-row',
            values: V,
            pointers: { l: 0, r: 5 },
            highlight: [0],
            showBars: true,
            note: 'Always process the SHORTER side — its running max is the binding constraint.',
          },
          description: 'Fix: use < not >. height[l]=4 < height[r]=5 → true → process left. The shorter side\'s max bound determines the water level, so we always process the shorter side first.',
        },
      ],
    },
  ],
}
