import { AlgoProblem } from '../algo-types'

export const climbingStairs: AlgoProblem = {
  id: 'climbing-stairs',
  title: 'Climbing Stairs',
  difficulty: 'Easy',
  pattern: 'Dynamic Programming',
  question: `You are climbing a staircase. It takes n steps to reach the top.

Each time you can either climb 1 or 2 steps. In how many distinct ways can you climb to the top?

Example 1:
  Input: n = 2
  Output: 2
  Explanation: [1,1] or [2]

Example 2:
  Input: n = 5
  Output: 8
  Explanation: [1,1,1,1,1], [1,1,1,2], [1,1,2,1], [1,2,1,1],
               [2,1,1,1], [1,2,2], [2,1,2], [2,2,1]

Constraints: 1 ≤ n ≤ 45`,

  starterCode: `function climbStairs(n: number): number {
  // Your solution here
}`,

  solutionCode: `function climbStairs(n: number): number {
  if (n <= 2) return n
  const dp = new Array(n + 1).fill(0)
  dp[1] = 1
  dp[2] = 2
  for (let i = 3; i <= n; i++) {
    dp[i] = dp[i - 1] + dp[i - 2]
  }
  return dp[n]
}`,

  codeSections: [
    { label: 'Base cases', startLine: 2, endLine: 5 },
    { label: 'Build dp',   startLine: 6, endLine: 8 },
    { label: 'Return',     startLine: 9, endLine: 9 },
  ],

  understanding: [
    {
      question: "Start with n = 2. Write out every distinct way to reach the top.",
      answer: "Two paths: [1, 1] takes two single steps (0 → 1 → 2), and [2] jumps directly to the top (0 → 2). Hover a path to trace it below.",
      highlightTerms: ['1 or 2 steps'],
      pathAnnotations: [
        { text: '(0 → 1 → 2)', path: 0 },
        { text: '(0 → 2)', path: 1 },
      ],
      visual: {
        type: 'staircase',
        n: 2,
        paths: [[0, 1, 2], [0, 2]],
      },
    },
    {
      question: "Now try n = 3. How many distinct ways can you count?",
      answer: "Three: [1,1,1], [1,2], and [2,1]. The count went from 2 to 3. Try n = 4 next and notice what's driving it.",
      highlightTerms: ['distinct ways', '1 or 2 steps'],
      pathAnnotations: [
        { text: '[1,1,1]', path: 0 },
        { text: '[1,2]', path: 1 },
        { text: '[2,1]', path: 2 },
      ],
      visual: {
        type: 'staircase',
        n: 3,
        paths: [[0, 1, 2, 3], [0, 1, 3], [0, 2, 3]],
      },
    },
    {
      question: "You're at step 4. Which steps could you have come from?",
      answer: "Only step 3 (one step back) or step 2 (two steps back) — those are the only legal moves, so those are the only origins. We already know: 3 ways to reach step 3, 2 ways to reach step 2. So there must be exactly 3 + 2 = 5 ways to reach step 4.\n\nThe same logic holds for every step:\n\n**ways(n) = ways(n−1) + ways(n−2)**\n\nThat's the pattern. The Approach section turns it into an efficient algorithm.",
      highlightTerms: ['1 or 2 steps'],
      visual: {
        type: 'staircase',
        n: 4,
        highlightStep: 4,
        mode: 'incoming',
        stepCounts: [null, 1, 2, 3, null],
        note: 'Step 4 can only be reached from step 3 (3 ways) or step 2 (2 ways)',
      },
    },
  ],

  approach: {
    sections: [
      {
        label: 'Naive',
        description: 'Translating ways(n) = ways(n−1) + ways(n−2) directly into code means calling the function recursively — once for n−1, once for n−2. Let\'s see what that tree looks like for n = 4.',
        vizState: {
          type: 'tree',
          nodes: [4, 3, 2, 2, 1, 1, 0, 1, 0],
          note: 'Hover a card to highlight its nodes',
        },
        cards: [
          {
            type: 'trace',
            label: 'ways(4)',
            highlight: [1, 2],
            inputs: [
              { label: 'came from step 3 →', value: 'ways(3) = ?' },
              { label: 'came from step 2 →', value: 'ways(2) = ?' },
            ],
            result: 'ways(3) + ways(2)',
          },
          {
            type: 'trace',
            label: 'ways(3)',
            highlight: [3, 4],
            inputs: [
              { label: 'came from step 2 →', value: 'ways(2) = ?' },
              { label: 'came from step 1 →', value: 'ways(1) = 1' },
            ],
            result: 'ways(2) + ways(1)   ← ways(2) again!',
          },
          {
            type: 'insight',
            question: 'What\'s the problem with this approach?',
            highlight: [2, 3],
            answer: 'Look at the amber nodes — ways(2) appears twice in this tree, even though n is just 4. Both copies are computed entirely from scratch, even though the answer is the same. That\'s the waste. And it compounds: every call to ways(n) spawns two more — ways(n−1) and ways(n−2). Those two each spawn two more. At every level the work doubles, which is exactly where 2ⁿ comes from. Add one step to the input and the entire tree roughly doubles in size.',
          },
        ],
      },
      {
        label: 'Recurrence',
        description: 'The problem is visible right there in the tree: ways(2) gets computed twice at just n = 4, and the duplication compounds with every step. The fix is to recognize this as a dynamic programming recurrence — compute each answer exactly once and look it up after that.',
        cards: [
          {
            type: 'equation',
            insight: "For any step i, there are exactly two ways to arrive: a one-step jump from step i−1, or a two-step jump from step i−2. No other origins exist. The count is always the sum of those two.",
            formula: 'dp[i] = dp[i−1] + dp[i−2]',
          },
        ],
      },
      {
        label: 'Build the Table',
        description: 'Here\'s what that looks like in practice. We fill a table left to right — each entry is a single addition using the two values already stored. Hover a step to see which two feed it.',
        vizState: {
          type: 'staircase',
          n: 5,
          mode: 'incoming',
        },
        cards: [
          {
            type: 'trace',
            label: 'Base cases',
            highlight: [1],
            inputs: [
              { label: 'dp[1]', value: '1  (only one move: [1])' },
              { label: 'dp[2]', value: '2  ([1,1] or [2])' },
            ],
            result: 'dp [ 1, 2, ?, ?, ? ]',
          },
          {
            type: 'trace',
            label: 'dp[3]',
            highlight: [3],
            inputs: [
              { label: 'dp[2]', value: 2 },
              { label: 'dp[1]', value: 1 },
            ],
            result: 'dp[3] = 2 + 1 = 3',
          },
          {
            type: 'trace',
            label: 'dp[4]',
            highlight: [4],
            inputs: [
              { label: 'dp[3]', value: 3 },
              { label: 'dp[2]', value: 2 },
            ],
            result: 'dp[4] = 3 + 2 = 5',
          },
          {
            type: 'trace',
            label: 'dp[5]',
            highlight: [5],
            inputs: [
              { label: 'dp[4]', value: 5 },
              { label: 'dp[3]', value: 3 },
            ],
            result: 'dp[5] = 5 + 3 = 8  ✓',
          },
        ],
      },
      {
        label: 'Space Optimization',
        description: 'That works, but notice what each step actually needed: just the two values directly before it. Everything older was never read again, which means we can drop the array entirely.',
        cards: [
          {
            type: 'insight',
            question: 'Do we need the whole array?',
            answer: 'No. Roll two variables forward and throw away the rest: prev2=1, prev1=2 → next=3, shift → prev2=2, prev1=3 → next=5, shift → ... → 8. Same answer, O(1) space. This is the Fibonacci sequence in disguise.',
            definedTerms: [
              { term: 'Fibonacci', definition: 'A sequence where each value is the sum of the two before it: 1, 1, 2, 3, 5, 8, 13… Climbing stairs is exactly this, starting from 1, 2.' },
            ],
          },
        ],
      },
      {
        label: 'Edge Cases',
        description: 'One detail left before the solution is complete — the recurrence needs two previous values to work, which means it can\'t start from nothing.',
        cards: [
          {
            type: 'insight',
            question: 'Why handle n ≤ 2 separately?',
            answer: "dp[1] and dp[2] can't be derived from the recurrence — there's nothing to look back at. They're the seeds that start the chain. The early return for n ≤ 2 also means we never allocate an array for trivial inputs.",
          },
        ],
      },
      {
        label: 'Pattern',
        cards: [
          { type: 'reveal', pattern: '1D Dynamic Programming (Fibonacci)' },
        ],
      },
    ],
  },

  steps: [
    {
      id: 'cs-1',
      label: 'Check n ≤ 2',
      phaseLabel: 'Guard',
      currentLine: 2,
      state: { type: 'dp-row', values: [null, null, null, null, null], activeIndex: -1 },
      vars: { n: 5 },
      description: 'n=5 > 2, so the guard is false. We skip the early return and proceed to build the dp array.',
    },
    {
      id: 'cs-2',
      label: 'Initialize dp array',
      phaseLabel: 'Base cases',
      currentLine: 3,
      state: { type: 'dp-row', values: [null, null, null, null, null], activeIndex: -1 },
      vars: { n: 5 },
      description: 'Create a dp array of length n+1=6. dp[i] will store the number of distinct ways to reach step i.',
      isPausePoint: true,
    },
    {
      id: 'cs-3',
      label: 'dp[1] = 1',
      phaseLabel: 'Base cases',
      currentLine: 4,
      state: { type: 'dp-row', values: [1, null, null, null, null], activeIndex: 0 },
      vars: { n: 5, 'dp[1]': 1 },
      description: 'Base case: exactly 1 way to reach step 1 — take a single 1-step move.',
      isPausePoint: true,
    },
    {
      id: 'cs-4',
      label: 'dp[2] = 2',
      phaseLabel: 'Base cases',
      currentLine: 5,
      state: { type: 'dp-row', values: [1, 2, null, null, null], activeIndex: 1 },
      vars: { n: 5, 'dp[1]': 1, 'dp[2]': 2 },
      description: 'Base case: 2 ways to reach step 2 — [1,1] or [2].',
      isPausePoint: true,
    },
    {
      id: 'cs-5',
      label: 'Loop: i = 3',
      phaseLabel: 'Build dp',
      currentLine: 6,
      state: { type: 'dp-row', values: [1, 2, null, null, null], activeIndex: 2 },
      vars: { n: 5, i: 3, 'dp[1]': 1, 'dp[2]': 2 },
      description: 'Enter the loop at i=3. The condition 3 ≤ 5 is true. dp[3] is still empty.',
    },
    {
      id: 'cs-6',
      label: 'dp[3] = dp[2] + dp[1]',
      phaseLabel: 'Build dp',
      currentLine: 7,
      state: { type: 'dp-row', values: [1, 2, 3, null, null], activeIndex: 2 },
      vars: { n: 5, i: 3, 'dp[1]': 1, 'dp[2]': 2, 'dp[3]': 3 },
      calc: 'dp[3] = dp[i-1] + dp[i-2]\n     = dp[2]  + dp[1]\n     = 2     + 1\n     = 3',
      description: 'To reach step 3, you came from step 2 (2 ways) or step 1 (1 way). dp[3] = 2 + 1 = 3.',
      isPausePoint: true,
    },
    {
      id: 'cs-7',
      label: 'Loop: i = 4',
      phaseLabel: 'Build dp',
      currentLine: 6,
      state: { type: 'dp-row', values: [1, 2, 3, null, null], activeIndex: 3 },
      vars: { n: 5, i: 4, 'dp[1]': 1, 'dp[2]': 2, 'dp[3]': 3 },
      description: 'i increments to 4. The condition 4 ≤ 5 is still true. dp[4] is empty.',
    },
    {
      id: 'cs-8',
      label: 'dp[4] = dp[3] + dp[2]',
      phaseLabel: 'Build dp',
      currentLine: 7,
      state: { type: 'dp-row', values: [1, 2, 3, 5, null], activeIndex: 3 },
      vars: { n: 5, i: 4, 'dp[2]': 2, 'dp[3]': 3, 'dp[4]': 5 },
      calc: 'dp[4] = dp[i-1] + dp[i-2]\n     = dp[3]  + dp[2]\n     = 3     + 2\n     = 5',
      description: 'dp[4] = dp[3] + dp[2] = 3 + 2 = 5.',
      isPausePoint: true,
    },
    {
      id: 'cs-9',
      label: 'Loop: i = 5',
      phaseLabel: 'Build dp',
      currentLine: 6,
      state: { type: 'dp-row', values: [1, 2, 3, 5, null], activeIndex: 4 },
      vars: { n: 5, i: 5, 'dp[3]': 3, 'dp[4]': 5 },
      description: 'i increments to 5. Last iteration — 5 ≤ 5 is true. dp[5] is still empty.',
    },
    {
      id: 'cs-10',
      label: 'dp[5] = dp[4] + dp[3]',
      phaseLabel: 'Build dp',
      currentLine: 7,
      state: { type: 'dp-row', values: [1, 2, 3, 5, 8], activeIndex: 4 },
      vars: { n: 5, i: 5, 'dp[3]': 3, 'dp[4]': 5, 'dp[5]': 8 },
      calc: 'dp[5] = dp[i-1] + dp[i-2]\n     = dp[4]  + dp[3]\n     = 5     + 3\n     = 8',
      description: 'dp[5] = dp[4] + dp[3] = 5 + 3 = 8. There are 8 distinct ways to climb 5 stairs.',
      isPausePoint: true,
    },
    {
      id: 'cs-11',
      label: 'Loop exits',
      phaseLabel: 'Build dp',
      currentLine: 6,
      state: { type: 'dp-row', values: [1, 2, 3, 5, 8], activeIndex: -1 },
      vars: { n: 5, i: 6, 'dp[5]': 8 },
      description: 'i increments to 6. 6 > 5 (n), so the loop condition fails and we exit.',
    },
    {
      id: 'cs-12',
      label: 'Return dp[5] = 8',
      phaseLabel: 'Return',
      currentLine: 9,
      state: { type: 'dp-row', values: [1, 2, 3, 5, 8], activeIndex: 4 },
      vars: { n: 5, 'dp[5]': 8, return: 8 },
      description: 'Return dp[n] = dp[5] = 8.',
      isPausePoint: true,
    },
  ],

  failureModes: [
    {
      id: 'one-step-only',
      label: 'Forgot dp[i-2]',
      shortLabel: 'dp[i]=dp[i-1]',
      solutionCode: `function climbStairs(n: number): number {
  if (n <= 2) return n
  const dp = new Array(n + 1).fill(0)
  dp[1] = 1
  dp[2] = 2
  for (let i = 3; i <= n; i++) {
    dp[i] = dp[i - 1]
  }
  return dp[n]
}`,
      brokenSteps: [
        {
          id: 'cs-broken-1',
          label: 'dp[3] = dp[2]  ← wrong',
          phaseLabel: 'Build dp',
          currentLine: 7,
          state: { type: 'dp-row', values: [1, 2, 2, null, null], activeIndex: 2 },
          vars: { n: 5, i: 3, 'dp[1]': 1, 'dp[2]': 2, 'dp[3]': 2 },
          description: 'dp[3] = dp[2] = 2. Wrong — should be 3. By forgetting dp[i-2], we only count paths ending in a 1-step, missing every path that ends with a 2-step.',
        },
      ],
      fixSteps: [
        {
          id: 'cs-fix-1',
          label: 'dp[3] = dp[2] + dp[1]',
          phaseLabel: 'Build dp',
          currentLine: 7,
          state: { type: 'dp-row', values: [1, 2, 3, null, null], activeIndex: 2 },
          vars: { n: 5, i: 3, 'dp[1]': 1, 'dp[2]': 2, 'dp[3]': 3 },
          calc: 'dp[3] = dp[i-1] + dp[i-2]\n     = dp[2]  + dp[1]\n     = 2     + 1\n     = 3',
          description: 'Fix: dp[3] = dp[2] + dp[1] = 2 + 1 = 3. Both terms are required — one for each of the two possible final moves.',
        },
      ],
    },
  ],
}
