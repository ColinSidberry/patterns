import { AlgoProblem } from '../algo-types'

const TREE_NODES = [3, 9, 20, null, null, 15, 7] as (number | null)[]

export const maxDepthBinaryTree: AlgoProblem = {
  id: 'max-depth-binary-tree',
  title: 'Maximum Depth of Binary Tree',
  difficulty: 'Easy',
  pattern: 'Depth-First Search',

  question: `Given the root of a binary tree, return its maximum depth.

A binary tree's maximum depth is the number of nodes along
the longest path from the root node down to the farthest leaf node.

Example 1:
  Input: root = [3,9,20,null,null,15,7]
  Output: 3

Example 2:
  Input: root = [1,null,2]
  Output: 2

Constraints: 0 ≤ n ≤ 10⁴, -100 ≤ Node.val ≤ 100`,

  starterCode: `function maxDepth(root: TreeNode | null): number {
  // Your solution here
}`,

  solutionCode: `function maxDepth(root: TreeNode | null): number {
  if (root === null) return 0
  const left = maxDepth(root.left)
  const right = maxDepth(root.right)
  return 1 + Math.max(left, right)
}`,

  codeSections: [
    { label: 'Base case',    startLine: 2, endLine: 2 },
    { label: 'Recurse',      startLine: 3, endLine: 4 },
    { label: 'Return depth', startLine: 5, endLine: 5 },
  ],

  understanding: [
    {
      question: "What does 'depth' mean here?",
      answer: "The number of nodes along the longest root-to-leaf path. For the tree [3,9,20,null,null,15,7], the path 3→20→15 has 3 nodes, so max depth = 3.",
      highlightTerms: ['maximum depth'],
    },
    {
      question: "Why do null nodes return 0?",
      answer: "A null node has no depth — it contributes nothing. Returning 0 is the base case that stops the recursion. Without it, the function would recurse forever.",
      highlightTerms: ['null'],
    },
    {
      question: "Why is it 1 + max(left, right) and not just max(left, right)?",
      answer: "The '+1' accounts for the current node itself. Each level of recursion adds 1 for the node it's visiting. The max() picks whichever subtree is deeper.",
      highlightTerms: ['maximum depth'],
    },
  ],

  steps: [
    // ── Call maxDepth(3) ──────────────────────────────────────────────────────
    {
      id: 'mdt-1',
      label: 'Enter maxDepth(3)',
      phaseLabel: 'Root',
      currentLine: 2,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 0,
        highlightPath: [0],
      },
      vars: { node: 3 },
      description: 'Call maxDepth(3). root is not null, so we skip the base case and will recurse into both subtrees.',
    },

    // ── Call maxDepth(9) ──────────────────────────────────────────────────────
    {
      id: 'mdt-2',
      label: 'Enter maxDepth(9)',
      phaseLabel: 'Left subtree',
      currentLine: 3,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 1,
        highlightPath: [0, 1],
      },
      vars: { node: 9 },
      description: 'Recurse left: call maxDepth(9). root is not null, so skip the base case.',
    },
    {
      id: 'mdt-3',
      label: 'maxDepth(null) — left of 9',
      phaseLabel: 'Left subtree',
      currentLine: 2,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 1,
        highlightPath: [0, 1],
      },
      vars: { node: 'null' },
      description: 'Left child of 9 is null → returns 0 immediately (base case).',
    },
    {
      id: 'mdt-4',
      label: 'maxDepth(null) — right of 9',
      phaseLabel: 'Left subtree',
      currentLine: 2,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 1,
        highlightPath: [0, 1],
      },
      vars: { node: 'null' },
      description: 'Right child of 9 is null → returns 0 immediately (base case).',
    },
    {
      id: 'mdt-5',
      label: 'maxDepth(9) returns 1',
      phaseLabel: 'Left subtree',
      currentLine: 5,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 1,
        highlightPath: [0, 1],
      },
      vars: { node: 9, left: 0, right: 0 },
      calc: 'return 1 + Math.max(left, right)\n     = 1 + Math.max(0, 0)\n     = 1 + 0\n     = 1',
      description: 'Both subtrees of 9 are null (depth 0). maxDepth(9) = 1 + max(0, 0) = 1.',
      isPausePoint: true,
    },

    // ── Call maxDepth(20) ─────────────────────────────────────────────────────
    {
      id: 'mdt-6',
      label: 'Enter maxDepth(20)',
      phaseLabel: 'Right subtree',
      currentLine: 4,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 2,
        highlightPath: [0, 2],
      },
      vars: { node: 20, left: 1 },
      description: 'left=1 is stored. Now recurse right: call maxDepth(20).',
    },

    // ── Call maxDepth(15) ─────────────────────────────────────────────────────
    {
      id: 'mdt-7',
      label: 'Enter maxDepth(15)',
      phaseLabel: 'Right subtree',
      currentLine: 3,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 5,
        highlightPath: [0, 2, 5],
      },
      vars: { node: 15 },
      description: 'Recurse left from 20: call maxDepth(15). root is not null, skip base case.',
    },
    {
      id: 'mdt-8',
      label: 'maxDepth(null) — left of 15',
      phaseLabel: 'Right subtree',
      currentLine: 2,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 5,
        highlightPath: [0, 2, 5],
      },
      vars: { node: 'null' },
      description: 'Left child of 15 is null → returns 0.',
    },
    {
      id: 'mdt-9',
      label: 'maxDepth(null) — right of 15',
      phaseLabel: 'Right subtree',
      currentLine: 2,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 5,
        highlightPath: [0, 2, 5],
      },
      vars: { node: 'null' },
      description: 'Right child of 15 is null → returns 0.',
    },
    {
      id: 'mdt-10',
      label: 'maxDepth(15) returns 1',
      phaseLabel: 'Right subtree',
      currentLine: 5,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 5,
        highlightPath: [0, 2, 5],
      },
      vars: { node: 15, left: 0, right: 0 },
      calc: 'return 1 + Math.max(left, right)\n     = 1 + Math.max(0, 0)\n     = 1',
      description: 'maxDepth(15) = 1 + max(0, 0) = 1.',
      isPausePoint: true,
    },

    // ── Call maxDepth(7) ──────────────────────────────────────────────────────
    {
      id: 'mdt-11',
      label: 'Enter maxDepth(7)',
      phaseLabel: 'Right subtree',
      currentLine: 4,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 6,
        highlightPath: [0, 2, 6],
      },
      vars: { node: 7 },
      description: 'Recurse right from 20: call maxDepth(7). root is not null, skip base case.',
    },
    {
      id: 'mdt-12',
      label: 'maxDepth(null) — left of 7',
      phaseLabel: 'Right subtree',
      currentLine: 2,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 6,
        highlightPath: [0, 2, 6],
      },
      vars: { node: 'null' },
      description: 'Left child of 7 is null → returns 0.',
    },
    {
      id: 'mdt-13',
      label: 'maxDepth(null) — right of 7',
      phaseLabel: 'Right subtree',
      currentLine: 2,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 6,
        highlightPath: [0, 2, 6],
      },
      vars: { node: 'null' },
      description: 'Right child of 7 is null → returns 0.',
    },
    {
      id: 'mdt-14',
      label: 'maxDepth(7) returns 1',
      phaseLabel: 'Right subtree',
      currentLine: 5,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 6,
        highlightPath: [0, 2, 6],
      },
      vars: { node: 7, left: 0, right: 0 },
      calc: 'return 1 + Math.max(left, right)\n     = 1 + Math.max(0, 0)\n     = 1',
      description: 'maxDepth(7) = 1 + max(0, 0) = 1.',
      isPausePoint: true,
    },

    // ── maxDepth(20) resolves ─────────────────────────────────────────────────
    {
      id: 'mdt-15',
      label: 'maxDepth(20) returns 2',
      phaseLabel: 'Right subtree',
      currentLine: 5,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 2,
        highlightPath: [0, 2],
      },
      vars: { node: 20, left: 1, right: 1 },
      calc: 'return 1 + Math.max(left, right)\n     = 1 + Math.max(1, 1)\n     = 1 + 1\n     = 2',
      description: 'Both children of 20 returned 1. maxDepth(20) = 1 + max(1, 1) = 2.',
      isPausePoint: true,
    },

    // ── maxDepth(3) resolves ──────────────────────────────────────────────────
    {
      id: 'mdt-16',
      label: 'maxDepth(3) returns 3',
      phaseLabel: 'Root',
      currentLine: 5,
      state: {
        type: 'tree',
        nodes: TREE_NODES,
        activeIndex: 0,
        highlightPath: [0],
      },
      vars: { node: 3, left: 1, right: 2 },
      calc: 'return 1 + Math.max(left, right)\n     = 1 + Math.max(1, 2)\n     = 1 + 2\n     = 3',
      description: 'left=1 (subtree of 9), right=2 (subtree of 20). maxDepth(3) = 1 + max(1, 2) = 3. The answer is 3.',
      isPausePoint: true,
    },
  ],

  failureModes: [
    {
      id: 'left-only',
      label: 'Ignores right subtree',
      shortLabel: 'return 1+left',
      solutionCode: `function maxDepth(root: TreeNode | null): number {
  if (root === null) return 0
  const left = maxDepth(root.left)
  const right = maxDepth(root.right)
  return 1 + left
}`,
      brokenSteps: [
        {
          id: 'mdt-broken-1',
          label: 'Enter maxDepth(3)',
          phaseLabel: 'Root',
          currentLine: 2,
          state: {
            type: 'tree',
            nodes: TREE_NODES,
            activeIndex: 0,
            highlightPath: [0],
          },
          vars: { node: 3 },
          description: 'Call maxDepth(3). root is not null, proceed to compute left and right.',
        },
        {
          id: 'mdt-broken-2',
          label: 'left = maxDepth(9) = 1',
          phaseLabel: 'Root',
          currentLine: 3,
          state: {
            type: 'tree',
            nodes: TREE_NODES,
            activeIndex: 0,
            highlightPath: [0],
          },
          vars: { node: 3, left: 1 },
          description: 'left subtree of 3 is node 9 (leaf). maxDepth(9) = 1.',
        },
        {
          id: 'mdt-broken-3',
          label: 'right = maxDepth(20) = 2 — ignored',
          phaseLabel: 'Root',
          currentLine: 4,
          state: {
            type: 'tree',
            nodes: TREE_NODES,
            activeIndex: 0,
            highlightPath: [0],
          },
          vars: { node: 3, left: 1, right: 2 },
          description: 'right subtree of 3 has depth 2, but the bug ignores it entirely.',
        },
        {
          id: 'mdt-broken-4',
          label: 'Returns 2 — wrong answer',
          phaseLabel: 'Root',
          currentLine: 5,
          state: {
            type: 'tree',
            nodes: TREE_NODES,
            activeIndex: 0,
            highlightPath: [0],
          },
          vars: { node: 3, left: 1, right: 2 },
          calc: 'return 1 + left\n     = 1 + 1\n     = 2   ← should be 3',
          description: 'Bug: return 1 + left ignores right=2. Returns 2 instead of the correct answer 3.',
        },
      ],
      fixSteps: [
        {
          id: 'mdt-fix-1',
          label: 'Use Math.max(left, right)',
          phaseLabel: 'Root',
          currentLine: 5,
          state: {
            type: 'tree',
            nodes: TREE_NODES,
            activeIndex: 0,
            highlightPath: [0],
          },
          vars: { node: 3, left: 1, right: 2 },
          calc: 'return 1 + Math.max(left, right)\n     = 1 + Math.max(1, 2)\n     = 1 + 2\n     = 3   ✓',
          description: 'Fix: use 1 + Math.max(left, right). right=2 is deeper, so the correct answer is 3.',
        },
      ],
    },
  ],
}
