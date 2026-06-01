import { AlgoProblem } from '../algo-types'

// solutionCode line map (1-indexed):
// 1  function reverseList(head: ListNode | null): ListNode | null {
// 2    let prev: ListNode | null = null
// 3    let curr = head
// 4    while (curr !== null) {
// 5      const next = curr.next
// 6      curr.next = prev
// 7      prev = curr
// 8      curr = next
// 9    }
// 10   return prev
// 11 }

const NODES = [
  { id: '1', val: 1 },
  { id: '2', val: 2 },
  { id: '3', val: 3 },
  { id: '4', val: 4 },
  { id: '5', val: 5 },
]

export const reverseLinkedList: AlgoProblem = {
  id: 'reverse-linked-list',
  title: 'Reverse Linked List',
  difficulty: 'Easy',
  pattern: 'Two Pointers',

  question: `Given the head of a singly linked list, reverse the list, and return the reversed list.

Example 1:
  Input: head = [1,2,3,4,5]
  Output: [5,4,3,2,1]

Example 2:
  Input: head = [1,2]
  Output: [2,1]

Constraints: 0 ≤ n ≤ 5000, -5000 ≤ Node.val ≤ 5000`,

  starterCode: `function reverseList(head: ListNode | null): ListNode | null {
  // Your solution here
}`,

  solutionCode: `function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null
  let curr = head
  while (curr !== null) {
    const next = curr.next
    curr.next = prev
    prev = curr
    curr = next
  }
  return prev
}`,

  codeSections: [
    { label: 'Initialize',    startLine: 2,  endLine: 3  },
    { label: 'Reverse loop',  startLine: 4,  endLine: 9  },
    { label: 'Return',        startLine: 10, endLine: 10 },
  ],

  understanding: [
    {
      question: "What's wrong with naive reversal?",
      answer: "You can't just flip arrows as you go — once you redirect curr.next to prev, you lose the reference to the rest of the list. That's why `next` must be saved first.",
      highlightTerms: ['reverse'],
    },
    {
      question: 'Why do we need three pointers?',
      answer: 'prev tracks the new head of the reversed section. curr is the node being reversed. next saves the rest of the list before curr.next is overwritten — without it, the original chain is lost.',
      highlightTerms: ['singly linked list'],
    },
    {
      question: 'What does the loop invariant look like after k iterations?',
      answer: 'prev points to node k (the new head of the reversed prefix). curr points to node k+1 (next to process). The first k nodes are fully reversed; nodes k+1..n are untouched.',
      highlightTerms: ['head'],
    },
  ],

  steps: [
    // ── Setup ──────────────────────────────────────────────────────────────────

    {
      id: 'init-prev',
      label: 'let prev = null',
      phaseLabel: 'Initialize',
      currentLine: 2,
      vars: { prev: 'null' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: -1 },
        reversed: 0,
        note: 'prev starts at null — the new tail will point here.',
      },
      description: 'Initialize prev to null. When the last node is reversed, it will point back to null.',
    },
    {
      id: 'init-curr',
      label: 'let curr = head',
      phaseLabel: 'Initialize',
      currentLine: 3,
      isPausePoint: true,
      vars: { prev: 'null', curr: 'node(1)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: -1, curr: 0 },
        reversed: 0,
        note: 'curr starts at head — we will walk it forward each iteration.',
      },
      description: 'curr = head = node(1). We will process each node in turn, reversing its pointer.',
    },

    // ── Iteration 1 ────────────────────────────────────────────────────────────

    {
      id: 'loop-check-1',
      label: 'curr !== null? (iter 1)',
      phaseLabel: 'Loop',
      currentLine: 4,
      vars: { prev: 'null', curr: 'node(1)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: -1, curr: 0 },
        reversed: 0,
      },
      description: 'curr = node(1) ≠ null → true. Enter the loop.',
    },
    {
      id: 'save-next-1',
      label: 'next = curr.next → node(2)',
      phaseLabel: 'Loop',
      currentLine: 5,
      vars: { prev: 'null', curr: 'node(1)', next: 'node(2)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: -1, curr: 0, next: 1 },
        reversed: 0,
        note: 'Save next before we overwrite curr.next.',
      },
      description: 'Save curr.next = node(2) into next. This is critical — we are about to overwrite curr.next.',
    },
    {
      id: 'redirect-1',
      label: 'curr.next = prev → node(1) → null',
      phaseLabel: 'Loop',
      currentLine: 6,
      vars: { prev: 'null', curr: 'node(1)', next: 'node(2)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: -1, curr: 0, next: 1 },
        reversed: 0,
        note: 'node(1).next now points to null (prev). The arrow will flip after prev advances.',
      },
      description: 'Redirect node(1).next → null (prev). Node(1) is now reversed.',
    },
    {
      id: 'advance-prev-1',
      label: 'prev = curr → prev at node(1)',
      phaseLabel: 'Loop',
      currentLine: 7,
      vars: { prev: 'node(1)', curr: 'node(1)', next: 'node(2)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 0, curr: 0, next: 1 },
        reversed: 0,
      },
      description: 'prev advances to curr = node(1). prev now marks the new head of the reversed prefix.',
    },
    {
      id: 'advance-curr-1',
      label: 'curr = next → curr at node(2)',
      phaseLabel: 'Loop',
      currentLine: 8,
      isPausePoint: true,
      vars: { prev: 'node(1)', curr: 'node(2)', next: 'node(2)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 0, curr: 1, next: 1 },
        reversed: 1,
        note: 'After iteration 1: node(1) reversed, prev=node(1), curr=node(2).',
      },
      description: 'curr advances to next = node(2). One node reversed. Reversed prefix: [1]. Remaining: [2→3→4→5].',
    },

    // ── Iteration 2 ────────────────────────────────────────────────────────────

    {
      id: 'loop-check-2',
      label: 'curr !== null? (iter 2)',
      phaseLabel: 'Loop',
      currentLine: 4,
      vars: { prev: 'node(1)', curr: 'node(2)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 0, curr: 1 },
        reversed: 1,
      },
      description: 'curr = node(2) ≠ null → true. Continue loop.',
    },
    {
      id: 'save-next-2',
      label: 'next = curr.next → node(3)',
      phaseLabel: 'Loop',
      currentLine: 5,
      vars: { prev: 'node(1)', curr: 'node(2)', next: 'node(3)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 0, curr: 1, next: 2 },
        reversed: 1,
        note: 'Save node(2).next = node(3) before overwriting.',
      },
      description: 'Save next = node(2).next = node(3).',
    },
    {
      id: 'redirect-2',
      label: 'curr.next = prev → node(2) → node(1)',
      phaseLabel: 'Loop',
      currentLine: 6,
      vars: { prev: 'node(1)', curr: 'node(2)', next: 'node(3)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 0, curr: 1, next: 2 },
        reversed: 1,
        note: 'node(2).next now points to node(1).',
      },
      description: 'Redirect node(2).next → node(1) (prev). Node(2) is now reversed.',
    },
    {
      id: 'advance-prev-2',
      label: 'prev = curr → prev at node(2)',
      phaseLabel: 'Loop',
      currentLine: 7,
      vars: { prev: 'node(2)', curr: 'node(2)', next: 'node(3)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 1, curr: 1, next: 2 },
        reversed: 1,
      },
      description: 'prev = node(2). The reversed prefix now starts at node(2).',
    },
    {
      id: 'advance-curr-2',
      label: 'curr = next → curr at node(3)',
      phaseLabel: 'Loop',
      currentLine: 8,
      isPausePoint: true,
      vars: { prev: 'node(2)', curr: 'node(3)', next: 'node(3)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 1, curr: 2, next: 2 },
        reversed: 2,
        note: 'After iteration 2: [2→1→null] reversed, curr=node(3).',
      },
      description: 'curr = node(3). Two nodes reversed. Reversed prefix: [2→1]. Remaining: [3→4→5].',
    },

    // ── Iteration 3 ────────────────────────────────────────────────────────────

    {
      id: 'loop-check-3',
      label: 'curr !== null? (iter 3)',
      phaseLabel: 'Loop',
      currentLine: 4,
      vars: { prev: 'node(2)', curr: 'node(3)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 1, curr: 2 },
        reversed: 2,
      },
      description: 'curr = node(3) ≠ null → true. Continue loop.',
    },
    {
      id: 'save-next-3',
      label: 'next = curr.next → node(4)',
      phaseLabel: 'Loop',
      currentLine: 5,
      vars: { prev: 'node(2)', curr: 'node(3)', next: 'node(4)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 1, curr: 2, next: 3 },
        reversed: 2,
        note: 'Save node(3).next = node(4).',
      },
      description: 'Save next = node(3).next = node(4).',
    },
    {
      id: 'redirect-3',
      label: 'curr.next = prev → node(3) → node(2)',
      phaseLabel: 'Loop',
      currentLine: 6,
      vars: { prev: 'node(2)', curr: 'node(3)', next: 'node(4)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 1, curr: 2, next: 3 },
        reversed: 2,
        note: 'node(3).next now points to node(2).',
      },
      description: 'Redirect node(3).next → node(2). Node(3) is now reversed.',
    },
    {
      id: 'advance-prev-3',
      label: 'prev = curr → prev at node(3)',
      phaseLabel: 'Loop',
      currentLine: 7,
      vars: { prev: 'node(3)', curr: 'node(3)', next: 'node(4)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 2, curr: 2, next: 3 },
        reversed: 2,
      },
      description: 'prev = node(3). Reversed prefix now starts at node(3).',
    },
    {
      id: 'advance-curr-3',
      label: 'curr = next → curr at node(4)',
      phaseLabel: 'Loop',
      currentLine: 8,
      isPausePoint: true,
      vars: { prev: 'node(3)', curr: 'node(4)', next: 'node(4)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 2, curr: 3, next: 3 },
        reversed: 3,
        note: 'After iteration 3: [3→2→1→null] reversed, curr=node(4).',
      },
      description: 'curr = node(4). Three nodes reversed. Reversed prefix: [3→2→1]. Remaining: [4→5].',
    },

    // ── Iteration 4 ────────────────────────────────────────────────────────────

    {
      id: 'loop-check-4',
      label: 'curr !== null? (iter 4)',
      phaseLabel: 'Loop',
      currentLine: 4,
      vars: { prev: 'node(3)', curr: 'node(4)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 2, curr: 3 },
        reversed: 3,
      },
      description: 'curr = node(4) ≠ null → true. Continue loop.',
    },
    {
      id: 'save-next-4',
      label: 'next = curr.next → node(5)',
      phaseLabel: 'Loop',
      currentLine: 5,
      vars: { prev: 'node(3)', curr: 'node(4)', next: 'node(5)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 2, curr: 3, next: 4 },
        reversed: 3,
        note: 'Save node(4).next = node(5).',
      },
      description: 'Save next = node(4).next = node(5).',
    },
    {
      id: 'redirect-4',
      label: 'curr.next = prev → node(4) → node(3)',
      phaseLabel: 'Loop',
      currentLine: 6,
      vars: { prev: 'node(3)', curr: 'node(4)', next: 'node(5)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 2, curr: 3, next: 4 },
        reversed: 3,
        note: 'node(4).next now points to node(3).',
      },
      description: 'Redirect node(4).next → node(3). Node(4) is now reversed.',
    },
    {
      id: 'advance-prev-4',
      label: 'prev = curr → prev at node(4)',
      phaseLabel: 'Loop',
      currentLine: 7,
      vars: { prev: 'node(4)', curr: 'node(4)', next: 'node(5)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 3, curr: 3, next: 4 },
        reversed: 3,
      },
      description: 'prev = node(4). Reversed prefix now starts at node(4).',
    },
    {
      id: 'advance-curr-4',
      label: 'curr = next → curr at node(5)',
      phaseLabel: 'Loop',
      currentLine: 8,
      isPausePoint: true,
      vars: { prev: 'node(4)', curr: 'node(5)', next: 'node(5)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 3, curr: 4, next: 4 },
        reversed: 4,
        note: 'After iteration 4: [4→3→2→1→null] reversed, curr=node(5).',
      },
      description: 'curr = node(5). Four nodes reversed. Reversed prefix: [4→3→2→1]. Remaining: [5].',
    },

    // ── Iteration 5 ────────────────────────────────────────────────────────────

    {
      id: 'loop-check-5',
      label: 'curr !== null? (iter 5)',
      phaseLabel: 'Loop',
      currentLine: 4,
      vars: { prev: 'node(4)', curr: 'node(5)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 3, curr: 4 },
        reversed: 4,
      },
      description: 'curr = node(5) ≠ null → true. Continue loop.',
    },
    {
      id: 'save-next-5',
      label: 'next = curr.next → null',
      phaseLabel: 'Loop',
      currentLine: 5,
      vars: { prev: 'node(4)', curr: 'node(5)', next: 'null' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 3, curr: 4, next: -1 },
        reversed: 4,
        note: 'Save node(5).next = null (end of original list).',
      },
      description: 'Save next = node(5).next = null. This is the last node.',
    },
    {
      id: 'redirect-5',
      label: 'curr.next = prev → node(5) → node(4)',
      phaseLabel: 'Loop',
      currentLine: 6,
      vars: { prev: 'node(4)', curr: 'node(5)', next: 'null' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 3, curr: 4, next: -1 },
        reversed: 4,
        note: 'node(5).next now points to node(4).',
      },
      description: 'Redirect node(5).next → node(4). The final node is now reversed.',
    },
    {
      id: 'advance-prev-5',
      label: 'prev = curr → prev at node(5)',
      phaseLabel: 'Loop',
      currentLine: 7,
      vars: { prev: 'node(5)', curr: 'node(5)', next: 'null' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 4, curr: 4, next: -1 },
        reversed: 4,
      },
      description: 'prev = node(5). This will be the new head of the fully reversed list.',
    },
    {
      id: 'advance-curr-5',
      label: 'curr = next → curr = null',
      phaseLabel: 'Loop',
      currentLine: 8,
      isPausePoint: true,
      vars: { prev: 'node(5)', curr: 'null', next: 'null' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 4, curr: -1 },
        reversed: 5,
        note: 'curr is now null — all 5 nodes reversed.',
      },
      description: 'curr = null. All nodes reversed. Full reversed list: [5→4→3→2→1→null].',
    },

    // ── Loop exit + return ──────────────────────────────────────────────────────

    {
      id: 'loop-exit',
      label: 'curr !== null? → false, exit loop',
      phaseLabel: 'Loop',
      currentLine: 4,
      vars: { prev: 'node(5)', curr: 'null' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 4, curr: -1 },
        reversed: 5,
        note: 'curr = null → loop condition false. Exit.',
      },
      description: 'curr = null → false. Loop exits. All 5 nodes have been reversed.',
    },
    {
      id: 'return',
      label: 'return prev → node(5)',
      phaseLabel: 'Return',
      currentLine: 10,
      isPausePoint: true,
      vars: { prev: 'node(5)' },
      state: {
        type: 'linked-list',
        nodes: NODES,
        pointers: { prev: 4 },
        reversed: 5,
        note: 'prev is the new head of the reversed list: [5,4,3,2,1].',
      },
      description: 'Return prev = node(5), the new head of the reversed list [5→4→3→2→1→null].',
    },
  ],

  failureModes: [
    {
      id: 'lost-tail',
      label: 'Forgot to save next',
      shortLabel: 'next not saved',
      solutionCode: `function reverseList(head: ListNode | null): ListNode | null {
  let prev: ListNode | null = null
  let curr = head
  while (curr !== null) {
    curr.next = prev
    prev = curr
    curr = curr.next
  }
  return prev
}`,
      brokenSteps: [
        {
          id: 'b-init-prev',
          label: 'prev = null, curr = head',
          phaseLabel: 'Initialize',
          currentLine: 2,
          isPausePoint: true,
          vars: { prev: 'null', curr: 'node(1)' },
          state: {
            type: 'linked-list',
            nodes: NODES,
            pointers: { prev: -1, curr: 0 },
            reversed: 0,
            note: 'Setup looks the same. The bug appears in the loop.',
          },
          description: 'prev = null, curr = head = node(1). Same initialization.',
        },
        {
          id: 'b-loop-check',
          label: 'curr !== null? → true',
          phaseLabel: 'Loop',
          currentLine: 4,
          vars: { prev: 'null', curr: 'node(1)' },
          state: {
            type: 'linked-list',
            nodes: NODES,
            pointers: { prev: -1, curr: 0 },
            reversed: 0,
          },
          description: 'curr = node(1) ≠ null → true. Enter loop.',
        },
        {
          id: 'b-redirect',
          label: 'BUG: curr.next = prev immediately',
          phaseLabel: 'broken',
          currentLine: 5,
          isPausePoint: true,
          vars: { prev: 'null', curr: 'node(1)' },
          state: {
            type: 'linked-list',
            nodes: NODES,
            pointers: { prev: -1, curr: 0 },
            reversed: 0,
            note: 'BUG: node(1).next is now null. The rest of the list [2→3→4→5] is lost!',
          },
          description: 'BUG: curr.next = prev overwrites node(1).next = null immediately. We never saved node(2) — nodes 2..5 are now unreachable.',
        },
        {
          id: 'b-advance-prev',
          label: 'prev = curr → prev at node(1)',
          phaseLabel: 'broken',
          currentLine: 6,
          vars: { prev: 'node(1)', curr: 'node(1)' },
          state: {
            type: 'linked-list',
            nodes: NODES,
            pointers: { prev: 0, curr: 0 },
            reversed: 1,
          },
          description: 'prev = node(1). prev advances correctly.',
        },
        {
          id: 'b-advance-curr',
          label: 'curr = curr.next → curr = null!',
          phaseLabel: 'broken',
          currentLine: 7,
          isPausePoint: true,
          vars: { prev: 'node(1)', curr: 'null' },
          state: {
            type: 'linked-list',
            nodes: NODES,
            pointers: { prev: 0, curr: -1 },
            reversed: 1,
            note: 'curr.next was just set to prev (null) — so curr = null. Loop exits after one iteration.',
          },
          description: 'curr = curr.next = null (we just set it to prev!). The loop exits immediately after one node.',
        },
        {
          id: 'b-loop-exit',
          label: 'curr !== null? → false, exit early',
          phaseLabel: 'broken',
          currentLine: 4,
          vars: { prev: 'node(1)', curr: 'null' },
          state: {
            type: 'linked-list',
            nodes: NODES,
            pointers: { prev: 0, curr: -1 },
            reversed: 1,
            note: 'Only 1 node processed. Nodes 2–5 are gone.',
          },
          description: 'curr = null → exit. Only node(1) was reversed. Nodes 2–5 are permanently lost.',
        },
        {
          id: 'b-return',
          label: 'return prev = node(1) (should be node(5))',
          phaseLabel: 'broken',
          currentLine: 9,
          isPausePoint: true,
          vars: { prev: 'node(1)' },
          state: {
            type: 'linked-list',
            nodes: NODES,
            pointers: { prev: 0 },
            reversed: 1,
            note: 'Result is just [1→null]. Expected [5→4→3→2→1→null].',
          },
          description: 'Return node(1) — a list of one node. The original chain was severed on line 5.',
        },
      ],
      fixSteps: [
        {
          id: 'fix-save-next',
          label: 'Fix: save next BEFORE redirecting',
          phaseLabel: 'Fix',
          currentLine: 5,
          isPausePoint: true,
          vars: { prev: 'null', curr: 'node(1)', next: 'node(2)' },
          state: {
            type: 'linked-list',
            nodes: NODES,
            pointers: { prev: -1, curr: 0, next: 1 },
            reversed: 0,
            note: 'Save next = curr.next FIRST. Now we can safely overwrite curr.next.',
          },
          description: 'Fix: add `const next = curr.next` before `curr.next = prev`. With next saved, advancing curr = next is safe — the rest of the list is preserved.',
        },
      ],
    },
  ],
}
