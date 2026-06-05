'use client'

// "Head-to-head" panel for custom-comparator sort problems. The step tracer
// only instruments the entry function's own body, never the comparator
// callback that native sort invokes — so those pairwise decisions are
// invisible in the normal trace. Here we run the reference solution once with
// Array.prototype.sort wrapped to record every (a, b) → winner the sort asked
// about, then render them. Auto-hides if the solution never sorts with a
// comparator. Runs only the trusted reference solution on a single tiny test
// input, synchronously, restoring sort in a finally.

import { useMemo } from 'react'

interface Call {
  a: string
  b: string
  r: number // sign of comparator result: <0 → a first, >0 → b first, 0 → tie
}

interface Captured {
  calls: Call[]
  sorted: string[] | null
  result: unknown
  capped: boolean
}

const MAX_CALLS = 300

function fmt(v: unknown): string {
  return typeof v === 'string' ? JSON.stringify(v) : String(v)
}

function capture(code: string, entryFn: string, input: unknown): Captured | null {
  const calls: Call[] = []
  let sorted: unknown[] | null = null
  let used = false
  let capped = false
  const orig = Array.prototype.sort
  try {
    // eslint-disable-next-line no-extend-native
    Array.prototype.sort = function (this: unknown[], cmp?: (a: unknown, b: unknown) => number) {
      if (typeof cmp === 'function') {
        used = true
        const wrapped = (a: unknown, b: unknown) => {
          const r = cmp(a, b)
          if (calls.length < MAX_CALLS) calls.push({ a: fmt(a), b: fmt(b), r: Math.sign(r) })
          else capped = true
          return r
        }
        const res = orig.call(this, wrapped) as unknown[]
        if (!sorted) sorted = [...res]
        return res
      }
      return orig.call(this, cmp as undefined) as unknown[]
    } as typeof Array.prototype.sort

    const fn = new Function(`${code}\nreturn ${entryFn};`)() as (...a: unknown[]) => unknown
    const args = Array.isArray(input) ? input : [input]
    const result = fn(...args)
    if (!used) return null
    return { calls, sorted: sorted ? (sorted as unknown[]).map(fmt) : null, result, capped }
  } catch {
    return null
  } finally {
    // eslint-disable-next-line no-extend-native
    Array.prototype.sort = orig
  }
}

interface Props {
  solutionJS?: string
  entryFunction?: string
  testInput?: unknown
}

export function ComparatorTrace({ solutionJS, entryFunction, testInput }: Props) {
  const data = useMemo(() => {
    if (!solutionJS || !entryFunction || testInput === undefined) return null
    return capture(solutionJS, entryFunction, testInput)
  }, [solutionJS, entryFunction, testInput])

  if (!data || data.calls.length === 0) return null

  return (
    <div>
      <h3 className="text-[10px] uppercase tracking-wider text-[#6c7086] font-semibold mb-2">
        Comparator calls — how the sort ordered them
      </h3>
      <p className="text-xs text-[#a6adc8] leading-relaxed mb-3">
        Each row is one head-to-head the sort engine ran. They have <span className="text-[#cdd6f4]">no inherent order</span> —
        sort picks pairs as it needs; the input order doesn&apos;t change the result.
      </p>
      <div className="rounded-lg border border-[#313244] bg-[#181825] overflow-hidden">
        <div className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-2 text-[10px] uppercase tracking-wider text-[#6c7086] border-b border-[#313244]">
          <span>compared</span>
          <span>verdict</span>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {data.calls.map((c, i) => (
            <div
              key={i}
              className="grid grid-cols-[1fr_auto] gap-x-4 px-4 py-1.5 text-sm border-b border-[#313244]/40 last:border-0"
            >
              <span className="font-mono text-[#cdd6f4]">
                {c.a} <span className="text-[#6c7086]">vs</span> {c.b}
              </span>
              <span
                className={
                  c.r < 0 ? 'text-cyan-300' : c.r > 0 ? 'text-amber-300' : 'text-[#6c7086]'
                }
              >
                {c.r < 0 ? `${c.a} first` : c.r > 0 ? `${c.b} first` : 'tie'}
              </span>
            </div>
          ))}
        </div>
      </div>
      {data.capped && (
        <p className="text-[10px] text-[#6c7086] mt-1">Showing the first {MAX_CALLS} comparisons.</p>
      )}
      {data.sorted && (
        <p className="text-xs text-[#a6adc8] mt-3">
          <span className="text-[#6c7086]">Final order:</span>{' '}
          <span className="font-mono text-[#cdd6f4]">{data.sorted.join(', ')}</span>
          {' → '}
          <span className="font-mono text-emerald-300">{fmt(data.result)}</span>
        </p>
      )}
    </div>
  )
}
