'use client'

// "Head-to-head" panel for custom-comparator sort problems. The step tracer
// only instruments the entry function's own body, never the comparator
// callback that native sort invokes — so those pairwise decisions are
// invisible in the normal trace.
//
// The naive thing (dump every comparison the engine ran) is hard to read: the
// engine asks pairwise questions in an internal, non-left-to-right order, so
// the list looks scrambled and you can't see "progress" in it. So instead we
// LEAD with the legible view: walk the FINAL sorted order and show, for each
// adjacent pair, the single comparison that justifies "this one comes before
// that one." That reads top-to-bottom like the result does. The raw engine
// calls are still available below, clearly labelled as implementation detail.
//
// We run the trusted reference solution once with Array.prototype.sort wrapped
// to (a) capture the comparator and (b) log the calls, then restore sort in a
// finally. Auto-hides if the solution never sorts with a comparator.

import { useMemo } from 'react'

type Cmp = (a: unknown, b: unknown) => number

interface Call {
  a: string
  b: string
  r: number // sign of comparator result: <0 → a first, >0 → b first, 0 → tie
}

interface ChainLink {
  a: string
  b: string
  r: number // RAW comparator return for the adjacent pair (sign = who's first)
}

interface Captured {
  calls: Call[]
  chain: ChainLink[]
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
  let sortedRaw: unknown[] | null = null
  let capturedCmp: Cmp | null = null
  let used = false
  let capped = false
  const orig = Array.prototype.sort
  try {
    // eslint-disable-next-line no-extend-native
    Array.prototype.sort = function (this: unknown[], cmp?: Cmp) {
      if (typeof cmp === 'function') {
        used = true
        capturedCmp = cmp
        const wrapped = (a: unknown, b: unknown) => {
          const r = cmp(a, b)
          if (calls.length < MAX_CALLS) calls.push({ a: fmt(a), b: fmt(b), r: Math.sign(r) })
          else capped = true
          return r
        }
        const res = orig.call(this, wrapped) as unknown[]
        if (!sortedRaw) sortedRaw = [...res]
        return res
      }
      return orig.call(this, cmp as undefined) as unknown[]
    } as typeof Array.prototype.sort

    const fn = new Function(`${code}\nreturn ${entryFn};`)() as (...a: unknown[]) => unknown
    const args = Array.isArray(input) ? input : [input]
    const result = fn(...args)
    if (!used) return null

    // Build the justified chain by re-running the (raw, un-wrapped) comparator
    // on each adjacent pair of the final order. These calls are intentionally
    // NOT logged into `calls` — they're our own, not the engine's.
    const chain: ChainLink[] = []
    if (sortedRaw && capturedCmp && (sortedRaw as unknown[]).length > 1) {
      const arr = sortedRaw as unknown[]
      for (let i = 0; i < arr.length - 1; i++) {
        let rr: number
        try {
          rr = (capturedCmp as Cmp)(arr[i], arr[i + 1])
        } catch {
          rr = 0
        }
        chain.push({ a: fmt(arr[i]), b: fmt(arr[i + 1]), r: Number.isFinite(rr) ? rr : 0 })
      }
    }

    return {
      calls,
      chain,
      sorted: sortedRaw ? (sortedRaw as unknown[]).map(fmt) : null,
      result,
      capped,
    }
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
        How the comparator built this order
      </h3>
      <p className="text-xs text-[#a6adc8] leading-relaxed mb-4">
        A comparator doesn&apos;t walk the array left-to-right. It just answers one question over and
        over — <span className="font-mono text-[#cdd6f4]">cmp(a, b)</span>: <span className="text-cyan-300">negative</span> →
        a goes first, <span className="text-amber-300">positive</span> → b goes first,{' '}
        <span className="text-[#6c7086]">0</span> → tie. The final order is just the one arrangement
        where <em>every</em> neighbor agrees with that rule. Read it top-to-bottom:
      </p>

      {/* ── The legible view: final order as a justified chain ── */}
      {data.sorted && data.chain.length > 0 && (
        <div className="rounded-lg border border-[#313244] bg-[#181825] px-4 py-3 mb-3">
          <div className="flex flex-col">
            {data.sorted.map((el, i) => (
              <div key={i}>
                <div className="font-mono text-base text-[#cdd6f4] py-0.5">{el}</div>
                {i < data.chain.length && (
                  <div className="flex items-center gap-2 pl-3 border-l border-[#45475a] ml-2 py-1 text-xs">
                    <span className="text-[#6c7086]">↓</span>
                    <span className="font-mono text-[#a6adc8]">
                      cmp({data.chain[i]!.a}, {data.chain[i]!.b}) ={' '}
                      <span className={data.chain[i]!.r < 0 ? 'text-cyan-300' : data.chain[i]!.r > 0 ? 'text-amber-300' : 'text-[#6c7086]'}>
                        {data.chain[i]!.r}
                      </span>
                    </span>
                    <span className="text-[#6c7086]">→</span>
                    <span className="text-[#a6adc8]">
                      {data.chain[i]!.r < 0 ? (
                        <><span className="font-mono text-[#cdd6f4]">{data.chain[i]!.a}</span> ranks above <span className="font-mono text-[#cdd6f4]">{data.chain[i]!.b}</span></>
                      ) : (
                        <>tie — kept in original order</>
                      )}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {data.sorted && (
        <p className="text-xs text-[#a6adc8] mb-4">
          <span className="text-[#6c7086]">Result:</span>{' '}
          <span className="font-mono text-[#cdd6f4]">[{data.sorted.join(', ')}]</span>
          {' → '}
          <span className="font-mono text-emerald-300">{fmt(data.result)}</span>
        </p>
      )}

      {/* ── Implementation detail: the engine's actual (scrambled) calls ── */}
      <details className="group">
        <summary className="text-xs text-[#6c7086] hover:text-[#a6adc8] cursor-pointer select-none">
          Every comparison the engine actually ran ({data.calls.length}
          {data.capped ? '+' : ''}) — in its own order, not yours
        </summary>
        <p className="text-[11px] text-[#6c7086] leading-relaxed mt-2 mb-2">
          This list looks scrambled on purpose — the sort engine picks pairs in whatever order its
          algorithm needs. You can&apos;t read &quot;progress&quot; here; the order above is the
          only thing that matters.
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
                  className={c.r < 0 ? 'text-cyan-300' : c.r > 0 ? 'text-amber-300' : 'text-[#6c7086]'}
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
      </details>
    </div>
  )
}
