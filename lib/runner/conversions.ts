// Convert between LeetCode-style array representations and live node structures
// for linked lists and binary trees. Used by the code runner worker to bridge
// JSON test fixtures and the user's algorithm code.

export class ListNode {
  val: number | string
  next: ListNode | null
  constructor(val: number | string, next: ListNode | null = null) {
    this.val = val
    this.next = next
  }
}

export class TreeNode {
  val: number | string
  left: TreeNode | null
  right: TreeNode | null
  constructor(
    val: number | string,
    left: TreeNode | null = null,
    right: TreeNode | null = null
  ) {
    this.val = val
    this.left = left
    this.right = right
  }
}

export function arrayToList(
  arr: (number | string | null)[] | null | undefined
): ListNode | null {
  if (!arr || arr.length === 0) return null
  let head: ListNode | null = null
  for (let i = arr.length - 1; i >= 0; i--) {
    const v = arr[i]
    if (v === null) continue
    head = new ListNode(v as number | string, head)
  }
  return head
}

export function listToArray(head: ListNode | null): (number | string)[] {
  const out: (number | string)[] = []
  const seen = new Set<ListNode>()
  let curr = head
  while (curr) {
    if (seen.has(curr)) {
      out.push('<cycle>')
      break
    }
    seen.add(curr)
    out.push(curr.val)
    curr = curr.next
  }
  return out
}

// LeetCode level-order with explicit nulls for missing children. The first
// element is the root; subsequent elements fill out the tree breadth-first,
// skipping any slot whose parent is null.
export function arrayToTree(
  arr: (number | string | null)[] | null | undefined
): TreeNode | null {
  if (!arr || arr.length === 0 || arr[0] === null) return null
  const root = new TreeNode(arr[0] as number | string)
  const queue: TreeNode[] = [root]
  let i = 1
  while (queue.length > 0 && i < arr.length) {
    const node = queue.shift()!
    if (i < arr.length) {
      const lv = arr[i++]
      if (lv !== null) {
        node.left = new TreeNode(lv as number | string)
        queue.push(node.left)
      }
    }
    if (i < arr.length) {
      const rv = arr[i++]
      if (rv !== null) {
        node.right = new TreeNode(rv as number | string)
        queue.push(node.right)
      }
    }
  }
  return root
}

export function treeToArray(
  root: TreeNode | null
): (number | string | null)[] {
  if (!root) return []
  const out: (number | string | null)[] = []
  const queue: (TreeNode | null)[] = [root]
  while (queue.length > 0) {
    const node = queue.shift()!
    if (node === null) {
      out.push(null)
    } else {
      out.push(node.val)
      queue.push(node.left)
      queue.push(node.right)
    }
  }
  while (out.length > 0 && out[out.length - 1] === null) out.pop()
  return out
}
