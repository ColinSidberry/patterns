'use client'

// Read-only banner showing the helper classes the runner injects as globals.
// Stays visible regardless of saved localStorage code — solves the previous
// "starter preamble disappears once user touches the editor" + "user defines
// `class ListNode { value }` and crashes because runner provides `.val`" issues.

import type { ParamHint } from '@/data/algo-monster-types'

interface Props {
  paramHints?: ParamHint[]
  returnHint?: ParamHint
}

interface Helper {
  name: string
  shape: string
  signature: string
}

const HELPERS: Record<'linkedList' | 'tree', Helper> = {
  linkedList: {
    name: 'ListNode',
    shape: '{ val, next }',
    signature: 'new ListNode(val, next = null)',
  },
  tree: {
    name: 'TreeNode',
    shape: '{ val, left, right }',
    signature: 'new TreeNode(val, left = null, right = null)',
  },
}

export function ProvidedHelpers({ paramHints, returnHint }: Props) {
  const hints = new Set<ParamHint>()
  if (paramHints) for (const h of paramHints) if (h) hints.add(h)
  if (returnHint) hints.add(returnHint)

  const used: Helper[] = []
  if (hints.has('linkedList')) used.push(HELPERS.linkedList)
  if (hints.has('tree')) used.push(HELPERS.tree)

  if (used.length === 0) return null

  return (
    <div className="rounded-lg border border-cyan-500/30 bg-cyan-950/20 px-4 py-2.5 flex flex-col gap-1.5">
      <div className="text-[10px] uppercase tracking-wider text-cyan-300 font-semibold">
        Provided helpers · auto-available as globals
      </div>
      {used.map((h) => (
        <div key={h.name} className="flex items-baseline gap-3 flex-wrap text-xs font-mono">
          <span className="text-cyan-300 font-semibold">{h.name}</span>
          <span className="text-[#a6adc8]">{h.shape}</span>
          <span className="text-[#6c7086]">— {h.signature}</span>
        </div>
      ))}
      <div className="text-[10px] text-[#6c7086] italic mt-0.5">
        Use these field names as-is. Do not redefine.
      </div>
    </div>
  )
}
