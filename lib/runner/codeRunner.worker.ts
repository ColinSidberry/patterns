/// <reference lib="webworker" />
import {
  ListNode,
  TreeNode,
  arrayToList,
  arrayToTree,
  listToArray,
  treeToArray,
} from './conversions'
import type {
  ConsoleEntry,
  RunRequest,
  RunResponse,
  TestResult,
} from './types'
import type { ParamHint } from '@/data/algo-monster-types'

declare const self: DedicatedWorkerGlobalScope

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/
const SOURCE_URL = 'user-code.js'

function isValidIdent(name: string | undefined): name is string {
  return !!name && IDENT.test(name)
}

// ── Line-number mapping ────────────────────────────────────────────────────
// `new Function(body)` runs `body` in a wrapper that adds an implicit
// signature line ahead of it. To translate stack-trace line numbers back to
// the user's source, probe once with a known-line throw and record the offset
// V8 reports.
const PROBE_LINE = (() => {
  try {
    new Function(`//# sourceURL=${SOURCE_URL}\nthrow new Error('__probe__')`)()
  } catch (e) {
    const m = new RegExp(`${SOURCE_URL}:(\\d+):`).exec(
      (e as Error).stack || ''
    )
    if (m) return parseInt(m[1], 10)
  }
  return 2
})()

function extractUserLine(err: Error): number | undefined {
  const stack = err.stack || ''
  const m = new RegExp(`${SOURCE_URL}:(\\d+):`).exec(stack)
  if (!m) return undefined
  const reported = parseInt(m[1], 10)
  const line = reported - PROBE_LINE + 1
  return line > 0 ? line : undefined
}

// ── Console capture ────────────────────────────────────────────────────────
const consoleLog: ConsoleEntry[] = []
let currentTestIdx: number | null = null

function installConsoleCapture() {
  const wrap =
    (kind: ConsoleEntry['kind']) =>
    (...args: unknown[]) => {
      consoleLog.push({
        kind,
        testIndex: currentTestIdx,
        values: args.map((a) => safeStringify(a)),
      })
    }
  ;(self as unknown as { console: Console }).console = {
    log: wrap('log'),
    info: wrap('info'),
    warn: wrap('warn'),
    error: wrap('error'),
    debug: wrap('log'),
    trace: wrap('log'),
  } as unknown as Console
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true
  if (a === null || b === null) return a === b
  if (typeof a !== typeof b) return false
  if (typeof a !== 'object') return false
  if (Array.isArray(a)) {
    if (!Array.isArray(b) || a.length !== b.length) return false
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false
    }
    return true
  }
  if (Array.isArray(b)) return false
  const ak = Object.keys(a as object)
  const bk = Object.keys(b as object)
  if (ak.length !== bk.length) return false
  for (const k of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, k)) return false
    if (
      !deepEqual(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k]
      )
    ) {
      return false
    }
  }
  return true
}

function safeStringify(v: unknown): string {
  if (v === undefined) return 'undefined'
  try {
    const seen = new WeakSet()
    return JSON.stringify(v, (_k, val) => {
      if (typeof val === 'object' && val !== null) {
        if (seen.has(val)) return '<cycle>'
        seen.add(val)
      }
      return val
    })
  } catch {
    return String(v)
  }
}

function convertInput(value: unknown, hint: ParamHint | undefined): unknown {
  if (hint === 'linkedList') {
    return arrayToList(value as (number | string | null)[])
  }
  if (hint === 'tree') {
    return arrayToTree(value as (number | string | null)[])
  }
  return value
}

function convertReturn(value: unknown, hint: ParamHint | undefined): unknown {
  if (hint === 'linkedList') return listToArray(value as ListNode | null)
  if (hint === 'tree') return treeToArray(value as TreeNode | null)
  return value
}

function loadSymbol(userCode: string, name: string): unknown {
  const body = `//# sourceURL=${SOURCE_URL}\n${userCode}\nreturn typeof ${name} !== 'undefined' ? ${name} : undefined;`
  const factory = new Function('ListNode', 'TreeNode', body)
  return factory(ListNode, TreeNode)
}

function runFunctionTests(req: RunRequest): TestResult[] {
  if (!isValidIdent(req.entryFunction)) {
    throw new Error(`Invalid entryFunction: ${String(req.entryFunction)}`)
  }
  const fn = loadSymbol(req.userCode, req.entryFunction) as
    | ((...args: unknown[]) => unknown)
    | undefined
  if (typeof fn !== 'function') {
    throw new Error(`Function "${req.entryFunction}" is not defined`)
  }
  const results: TestResult[] = []
  req.tests.forEach((rawTest, i) => {
    currentTestIdx = i
    const test = rawTest as { input?: unknown; expected?: unknown }
    const inputArr = Array.isArray(test.input)
      ? (test.input as unknown[])
      : test.input === undefined
        ? []
        : [test.input]
    let convertedInput: unknown[]
    try {
      convertedInput = inputArr.map((v, j) =>
        convertInput(v, req.paramHints?.[j] ?? null)
      )
    } catch (e) {
      results.push({
        status: 'error',
        index: i,
        message: `Input conversion failed: ${(e as Error).message}`,
        input: safeStringify(inputArr),
      })
      return
    }
    let actual: unknown
    try {
      actual = fn(...convertedInput)
    } catch (e) {
      const err = e as Error
      const line = extractUserLine(err)
      results.push({
        status: 'error',
        index: i,
        message: err.message || String(e),
        input: safeStringify(inputArr),
        ...(line !== undefined && { line }),
      })
      return
    }
    const converted = convertReturn(actual, req.returnHint ?? null)
    const inputStr = safeStringify(inputArr)
    if (!('expected' in test)) {
      results.push({
        status: 'no-expected',
        index: i,
        input: inputStr,
        output: safeStringify(converted),
      })
      return
    }
    if (deepEqual(converted, test.expected)) {
      results.push({
        status: 'pass',
        index: i,
        input: inputStr,
        output: safeStringify(converted),
      })
    } else {
      results.push({
        status: 'fail',
        index: i,
        details: `Expected: ${safeStringify(test.expected)}\nActual:   ${safeStringify(converted)}`,
        input: inputStr,
      })
    }
  })
  return results
}

function describeOps(operations: string[], args: unknown[][]): string {
  return operations
    .map((op, j) => {
      const a = (args[j] || []).map((v) => safeStringify(v)).join(', ')
      return `${op}(${a})`
    })
    .join(' → ')
}

function runClassTests(req: RunRequest): TestResult[] {
  if (!isValidIdent(req.className)) {
    throw new Error(`Invalid className: ${String(req.className)}`)
  }
  const Cls = loadSymbol(req.userCode, req.className) as
    | (new (...args: unknown[]) => Record<string, unknown>)
    | undefined
  if (typeof Cls !== 'function') {
    throw new Error(`Class "${req.className}" is not defined`)
  }
  const results: TestResult[] = []
  req.tests.forEach((rawTest, i) => {
    currentTestIdx = i
    const test = rawTest as {
      operations?: string[]
      args?: unknown[][]
      expected?: unknown[]
    }
    const operations = test.operations || []
    const args = test.args || []
    const inputDesc = describeOps(operations, args)
    if (operations.length === 0) {
      results.push({
        status: 'error',
        index: i,
        message: 'No operations in test',
        input: inputDesc,
      })
      return
    }
    let instance: Record<string, unknown>
    try {
      instance = new Cls(...(args[0] || []))
    } catch (e) {
      const err = e as Error
      const line = extractUserLine(err)
      results.push({
        status: 'error',
        index: i,
        message: `Constructor: ${err.message}`,
        input: inputDesc,
        ...(line !== undefined && { line }),
      })
      return
    }
    const opReturns: unknown[] = [null]   // index 0 = constructor
    if (!test.expected) {
      try {
        for (let j = 1; j < operations.length; j++) {
          const op = operations[j]
          const method = instance[op]
          if (typeof method !== 'function') {
            throw new Error(`Method "${op}" not defined`)
          }
          opReturns[j] = (method as (...a: unknown[]) => unknown).apply(
            instance,
            args[j] || []
          )
        }
        results.push({
          status: 'no-expected',
          index: i,
          input: inputDesc,
          output: safeStringify(opReturns),
        })
      } catch (e) {
        const err = e as Error
        const line = extractUserLine(err)
        results.push({
          status: 'error',
          index: i,
          message: err.message,
          input: inputDesc,
          ...(line !== undefined && { line }),
        })
      }
      return
    }
    let firstFail: { opIdx: number; expected: unknown; actual: unknown } | null =
      null
    let runtimeError: string | null = null
    let runtimeErrorLine: number | undefined = undefined
    for (let j = 1; j < operations.length; j++) {
      const op = operations[j]
      const method = instance[op]
      if (typeof method !== 'function') {
        runtimeError = `Op ${j}: method "${op}" not defined`
        break
      }
      let ret: unknown
      try {
        ret = (method as (...a: unknown[]) => unknown).apply(
          instance,
          args[j] || []
        )
      } catch (e) {
        const err = e as Error
        runtimeError = `Op ${j} (${op}): ${err.message}`
        runtimeErrorLine = extractUserLine(err)
        break
      }
      opReturns[j] = ret
      const exp = test.expected[j]
      // LeetCode convention: `null` in `expected` for void methods that
      // implicitly return `undefined`. Treat as equivalent for class ops.
      const matches =
        (exp === null && ret === undefined) || deepEqual(ret, exp)
      if (!matches && !firstFail) {
        firstFail = { opIdx: j, expected: exp, actual: ret }
      }
    }
    if (runtimeError) {
      results.push({
        status: 'error',
        index: i,
        message: runtimeError,
        input: inputDesc,
        ...(runtimeErrorLine !== undefined && { line: runtimeErrorLine }),
      })
    } else if (firstFail) {
      const opName = operations[firstFail.opIdx]
      const argStr = (args[firstFail.opIdx] || [])
        .map((v) => safeStringify(v))
        .join(', ')
      results.push({
        status: 'fail',
        index: i,
        details: `Op ${firstFail.opIdx} — ${opName}(${argStr})\nExpected: ${safeStringify(firstFail.expected)}\nActual:   ${safeStringify(firstFail.actual)}`,
        input: inputDesc,
      })
    } else {
      results.push({
        status: 'pass',
        index: i,
        input: inputDesc,
        output: safeStringify(opReturns),
      })
    }
  })
  return results
}

installConsoleCapture()

self.onmessage = (ev: MessageEvent<RunRequest>) => {
  const req = ev.data
  consoleLog.length = 0
  currentTestIdx = null
  const start = performance.now()
  let response: RunResponse
  try {
    const results =
      req.testKind === 'class'
        ? runClassTests(req)
        : runFunctionTests(req)
    response = {
      kind: 'results',
      results,
      durationMs: performance.now() - start,
      logs: consoleLog.slice(),
    }
  } catch (e) {
    const err = e as Error
    const line = extractUserLine(err)
    response = {
      kind: 'compile-error',
      message: err.message || String(e),
      ...(line !== undefined && { line }),
    }
  }
  self.postMessage(response)
}
