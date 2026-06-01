import type { SlotEntry, SlotKind } from '@/data/algo-monster-types'
import { SyntaxHighlight } from './SyntaxHighlight'

interface Props {
  slots: SlotEntry[]
}

// Style per kind. Goal:
//   - Scaffold anchors (UPPERCASE) read as section headers
//   - Sub-step scaffolding (lowercase) reads quiet — boilerplate the eye skips
//   - [BRACKETED] variable steps stand out (the per-problem work)
//   - base/recurse (recursive scaffold) styled like loop-open/return tier
function labelClass(kind: SlotKind | undefined): string {
  switch (kind) {
    case 'init':
    case 'loop-open':
    case 'return':
    case 'base':
    case 'recurse':
      return 'text-indigo-300 font-semibold uppercase tracking-wide'
    case 'variable':
      return 'text-[#f9e2af] font-semibold'
    case 'scaffold':
      return 'text-[#6c7086] font-medium'
    case 'loop-close':
      return 'text-[#45475a] font-mono'
    default:
      return 'text-[#a6adc8]'
  }
}

function codeRowClass(kind: SlotKind | undefined): string {
  switch (kind) {
    case 'variable':
      return 'border-l-2 border-[#f9e2af]/60'
    case 'init':
    case 'return':
    case 'base':
      return 'border-l-2 border-indigo-500/60'
    case 'loop-open':
    case 'recurse':
      return 'border-l-2 border-indigo-500/60'
    case 'loop-close':
      return 'border-l-2 border-[#313244]'
    case 'scaffold':
      return 'border-l-2 border-[#313244]'
    default:
      return 'border-l-2 border-transparent'
  }
}

export function SlotTable({ slots }: Props) {
  return (
    <div className="rounded-lg overflow-hidden border border-[#313244] bg-[#181825]">
      <div className="grid" style={{ gridTemplateColumns: 'max-content 1fr' }}>
        {slots.map((slot, i) => {
          const indent = slot.indent ?? 0
          return (
            <div key={i} className="contents group">
              <div
                className={`pr-6 py-2 text-xs flex items-start whitespace-nowrap ${labelClass(slot.kind)}`}
                style={{ paddingLeft: 16 + indent * 16 }}
              >
                {slot.label || <span className="opacity-30">·</span>}
              </div>
              <div className={`pl-4 pr-4 py-2 font-mono text-[13px] text-[#cdd6f4] ${codeRowClass(slot.kind)}`}>
                <SyntaxHighlight code={slot.code} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
