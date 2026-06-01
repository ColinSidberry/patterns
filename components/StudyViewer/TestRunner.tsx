'use client'

import { useEffect, useRef, useState } from 'react'
import type { ParamHint, TestCase, TestKind } from '@/data/algo-monster-types'
import type {
  ConsoleEntry,
  RunRequest,
  RunResponse,
  TestResult,
} from '@/lib/runner/types'

interface Props {
  getCode: () => string
  testKind: TestKind
  entryFunction?: string
  className?: string
  paramHints?: ParamHint[]
  returnHint?: ParamHint
  tests: TestCase[]
}

const TIMEOUT_MS = 5000

type RunState =
  | { kind: 'idle' }
  | { kind: 'running' }
  | { kind: 'compile-error'; message: string; line?: number }
  | { kind: 'timeout' }
  | { kind: 'results'; results: TestResult[]; durationMs: number; logs: ConsoleEntry[] }

export function TestRunner({
  getCode,
  testKind,
  entryFunction,
  className,
  paramHints,
  returnHint,
  tests,
}: Props) {
  const [state, setState] = useState<RunState>({ kind: 'idle' })
  const workerRef = useRef<Worker | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      workerRef.current?.terminate()
      workerRef.current = null
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const runTests = () => {
    workerRef.current?.terminate()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)

    const worker = new Worker(
      new URL('@/lib/runner/codeRunner.worker.ts', import.meta.url),
      { type: 'module' }
    )
    workerRef.current = worker

    worker.onmessage = (ev: MessageEvent<RunResponse>) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      const r = ev.data
      if (r.kind === 'results') {
        setState({
          kind: 'results',
          results: r.results,
          durationMs: r.durationMs,
          logs: r.logs,
        })
      } else if (r.kind === 'compile-error') {
        setState({
          kind: 'compile-error',
          message: r.message,
          ...(r.line !== undefined && { line: r.line }),
        })
      } else {
        setState({ kind: 'timeout' })
      }
      worker.terminate()
      workerRef.current = null
    }

    worker.onerror = (ev) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      setState({
        kind: 'compile-error',
        message: ev.message || 'Worker error',
      })
      worker.terminate()
      workerRef.current = null
    }

    timeoutRef.current = setTimeout(() => {
      worker.terminate()
      workerRef.current = null
      setState({ kind: 'timeout' })
    }, TIMEOUT_MS)

    const req: RunRequest = {
      userCode: getCode(),
      testKind,
      tests,
      ...(entryFunction !== undefined && { entryFunction }),
      ...(className !== undefined && { className }),
      ...(paramHints !== undefined && { paramHints }),
      ...(returnHint !== undefined && { returnHint }),
    }
    setState({ kind: 'running' })
    worker.postMessage(req)
  }

  const isRunning = state.kind === 'running'
  const passCount =
    state.kind === 'results'
      ? state.results.filter((r) => r.status === 'pass').length
      : 0
  const failCount =
    state.kind === 'results'
      ? state.results.filter((r) => r.status === 'fail').length
      : 0
  const errorCount =
    state.kind === 'results'
      ? state.results.filter((r) => r.status === 'error').length
      : 0
  const smokeCount =
    state.kind === 'results'
      ? state.results.filter((r) => r.status === 'no-expected').length
      : 0

  return (
    <div className="flex flex-col gap-3 mt-4">
      <div className="flex items-center gap-3">
        <button
          onClick={runTests}
          disabled={isRunning}
          className={`text-sm font-medium px-3 py-1.5 rounded-md border transition-colors ${
            isRunning
              ? 'bg-[#313244] border-[#45475a] text-[#6c7086] cursor-not-allowed'
              : 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50'
          }`}
        >
          {isRunning ? 'Running…' : `Run tests (${tests.length})`}
        </button>
        {state.kind === 'results' && (
          <span className="text-xs text-[#6c7086]">
            <span className="text-emerald-400">{passCount} passed</span>
            {failCount > 0 && (
              <>
                {' · '}
                <span className="text-red-400">{failCount} failed</span>
              </>
            )}
            {errorCount > 0 && (
              <>
                {' · '}
                <span className="text-orange-400">{errorCount} errored</span>
              </>
            )}
            {smokeCount > 0 && (
              <>
                {' · '}
                <span className="text-[#a6adc8]">{smokeCount} smoke</span>
              </>
            )}
            {' · '}
            <span>{Math.round(state.durationMs)}ms</span>
          </span>
        )}
      </div>

      {state.kind === 'timeout' && (
        <div className="rounded-md border border-orange-500/40 bg-orange-900/20 px-3 py-2 text-sm text-orange-300">
          Timed out after {TIMEOUT_MS / 1000}s — likely an infinite loop. Worker
          terminated.
        </div>
      )}

      {state.kind === 'compile-error' && (
        <div className="rounded-md border border-red-500/40 bg-red-900/20 px-3 py-2 text-sm">
          <div className="font-medium text-red-300 mb-1">
            Failed to load
            {state.line !== undefined && (
              <span className="ml-2 font-mono text-xs text-red-400">
                line {state.line}
              </span>
            )}
          </div>
          <pre className="text-xs text-red-200 whitespace-pre-wrap font-mono">
            {state.message}
          </pre>
        </div>
      )}

      {state.kind === 'results' && (
        <>
          {state.logs.filter((l) => l.testIndex === null).length > 0 && (
            <ConsoleSection
              title="Console (top-level)"
              entries={state.logs.filter((l) => l.testIndex === null)}
            />
          )}
          <ul className="flex flex-col gap-1">
            {state.results.map((r) => (
              <ResultRow
                key={r.index}
                result={r}
                logs={state.logs.filter((l) => l.testIndex === r.index)}
              />
            ))}
          </ul>
        </>
      )}
    </div>
  )
}

function ConsoleSection({
  title,
  entries,
}: {
  title: string
  entries: ConsoleEntry[]
}) {
  if (entries.length === 0) return null
  return (
    <div className="rounded-md border border-[#313244] bg-[#11111b] px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[#6c7086] mb-1">
        {title}
      </div>
      <ConsoleLines entries={entries} />
    </div>
  )
}

const CONSOLE_COLOR: Record<ConsoleEntry['kind'], string> = {
  log: 'text-[#a6adc8]',
  info: 'text-cyan-300',
  warn: 'text-yellow-300',
  error: 'text-red-300',
}

function ConsoleLines({ entries }: { entries: ConsoleEntry[] }) {
  return (
    <pre className="text-xs font-mono whitespace-pre-wrap break-words flex flex-col gap-0.5">
      {entries.map((e, i) => (
        <span key={i} className={CONSOLE_COLOR[e.kind]}>
          {e.kind !== 'log' && (
            <span className="opacity-60 mr-1">[{e.kind}]</span>
          )}
          {e.values.join(' ')}
        </span>
      ))}
    </pre>
  )
}

function ResultRow({
  result,
  logs,
}: {
  result: TestResult
  logs: ConsoleEntry[]
}) {
  const label = `Test ${result.index + 1}`
  const hasLogs = logs.length > 0
  if (result.status === 'pass') {
    return (
      <li className="rounded-md border border-emerald-500/20 bg-emerald-900/5 px-3 py-2">
        <div className="flex items-baseline gap-2 text-sm">
          <span className="text-emerald-400 font-mono">✓</span>
          <span className="text-[#cdd6f4] font-medium">{label}</span>
        </div>
        <IO input={result.input} output={result.output} />
        {hasLogs && <Logs entries={logs} />}
      </li>
    )
  }
  if (result.status === 'no-expected') {
    return (
      <li className="rounded-md border border-[#313244] bg-[#181825]/40 px-3 py-2">
        <div className="flex items-baseline gap-2 text-sm">
          <span className="text-[#6c7086] font-mono">·</span>
          <span className="text-[#a6adc8] font-medium">{label}</span>
          <span className="text-xs text-[#6c7086]">
            no expected value — ran without throwing
          </span>
        </div>
        <IO input={result.input} {...(result.output !== undefined && { output: result.output })} />
        {hasLogs && <Logs entries={logs} />}
      </li>
    )
  }
  if (result.status === 'error') {
    return (
      <li className="rounded-md border border-orange-500/30 bg-orange-900/10 px-3 py-2">
        <div className="flex items-baseline gap-2 text-sm">
          <span className="text-orange-400 font-mono">⚠</span>
          <span className="text-[#cdd6f4] font-medium">{label}</span>
          <span className="text-xs text-orange-300">threw</span>
          {result.line !== undefined && (
            <span className="text-xs font-mono text-orange-300">
              line {result.line}
            </span>
          )}
        </div>
        <pre className="mt-1 ml-5 text-xs font-mono text-orange-200 whitespace-pre-wrap break-words">
          {result.message}
        </pre>
        <pre className="mt-1 ml-5 text-xs font-mono text-[#6c7086] whitespace-pre-wrap break-words">
          Input: {result.input}
        </pre>
        {hasLogs && <Logs entries={logs} />}
      </li>
    )
  }
  return (
    <li className="rounded-md border border-red-500/30 bg-red-900/10 px-3 py-2">
      <div className="flex items-baseline gap-2 text-sm">
        <span className="text-red-400 font-mono">✗</span>
        <span className="text-[#cdd6f4] font-medium">{label}</span>
      </div>
      <pre className="mt-1 ml-5 text-xs font-mono text-[#6c7086] whitespace-pre-wrap break-words">
        Input: {result.input}
      </pre>
      <pre className="mt-1 ml-5 text-xs font-mono text-[#cdd6f4] whitespace-pre-wrap break-words">
        {result.details}
      </pre>
      {hasLogs && <Logs entries={logs} />}
    </li>
  )
}

function IO({ input, output }: { input: string; output?: string }) {
  return (
    <div className="mt-1 ml-5 text-xs font-mono whitespace-pre-wrap break-words flex flex-col gap-0.5">
      <div>
        <span className="text-[#6c7086]">Input:&nbsp;&nbsp;</span>
        <span className="text-[#a6adc8]">{input}</span>
      </div>
      {output !== undefined && (
        <div>
          <span className="text-[#6c7086]">Output: </span>
          <span className="text-[#cdd6f4]">{output}</span>
        </div>
      )}
    </div>
  )
}

function Logs({ entries }: { entries: ConsoleEntry[] }) {
  return (
    <div className="mt-2 ml-5 rounded border border-[#313244] bg-[#11111b] px-2 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-[#6c7086] mb-1">
        Console
      </div>
      <ConsoleLines entries={entries} />
    </div>
  )
}
