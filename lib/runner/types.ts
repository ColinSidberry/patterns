import type { ParamHint, TestCase, TestKind } from '@/data/algo-monster-types'

export interface RunRequest {
  userCode: string
  testKind: TestKind
  entryFunction?: string
  className?: string
  paramHints?: ParamHint[]
  returnHint?: ParamHint
  tests: TestCase[]
}

export type TestResult =
  | { status: 'pass'; index: number; input: string; output: string }
  | { status: 'fail'; index: number; details: string; input: string }
  | { status: 'error'; index: number; message: string; input: string; line?: number }
  | { status: 'no-expected'; index: number; input: string; output?: string }

export interface ConsoleEntry {
  kind: 'log' | 'info' | 'warn' | 'error'
  testIndex: number | null
  values: string[]
}

export type RunResponse =
  | { kind: 'compile-error'; message: string; line?: number }
  | { kind: 'timeout' }
  | { kind: 'results'; results: TestResult[]; durationMs: number; logs: ConsoleEntry[] }
