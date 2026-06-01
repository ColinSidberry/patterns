'use client'

import { AlgoStep } from '@/data/algo-types'
import { ArrayRowViz } from './ArrayRowViz'
import { DPRowViz } from './DPRowViz'
import { LinkedListViz } from './LinkedListViz'
import { TreeViz } from './TreeViz'
import { GridViz } from './GridViz'
import { StaircaseViz } from './StaircaseViz'

interface Props {
  step: AlgoStep
  stepIndex: number
  mode: string
  failureModeLabel: string | null
  brokenStepCount: number
  maxVarsCount: number
}

export function AlgoStepPanel({ step, stepIndex, mode, failureModeLabel, brokenStepCount, maxVarsCount }: Props) {
  const isBroken = mode !== 'happy' && stepIndex < brokenStepCount

  // Each var row is ~28px + 24px vertical padding
  const varsMinHeight = maxVarsCount * 28 + 24

  return (
    <div className="flex flex-col gap-4">
      {/* Phase + label */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded font-mono ${
          isBroken
            ? 'bg-red-900/30 text-red-400'
            : mode !== 'happy'
              ? 'bg-green-900/30 text-green-400'
              : 'bg-indigo-900/30 text-indigo-400'
        }`}>
          {isBroken ? '⚡ broken' : mode !== 'happy' ? '✓ fix' : step.phaseLabel}
        </span>
        {failureModeLabel && !isBroken && (
          <span className="text-[11px] text-green-400 font-medium">{failureModeLabel}</span>
        )}
        <h3 className="text-sm font-semibold text-[#cdd6f4]">{step.label}</h3>
      </div>

      {/* Visualization */}
      <div className="bg-[#181825] rounded-xl border border-[#313244] p-4">
        {step.state.type === 'array-row' && (
          <ArrayRowViz state={step.state} isBroken={isBroken} />
        )}
        {step.state.type === 'dp-row' && (
          <DPRowViz state={step.state} isBroken={isBroken} />
        )}
        {step.state.type === 'linked-list' && (
          <LinkedListViz state={step.state} isBroken={isBroken} />
        )}
        {step.state.type === 'tree' && (
          <TreeViz state={step.state} isBroken={isBroken} />
        )}
        {step.state.type === 'grid' && (
          <GridViz state={step.state} isBroken={isBroken} />
        )}
        {step.state.type === 'staircase' && (
          <StaircaseViz state={step.state} isBroken={isBroken} />
        )}
      </div>

      {/* Vars — fixed min-height so panel doesn't resize between steps */}
      {maxVarsCount > 0 && (
        <div
          className="bg-[#11111b] rounded-lg px-4 py-3 font-mono text-sm"
          style={{ minHeight: varsMinHeight }}
        >
          {Object.entries(step.vars).map(([k, v]) => (
            <div key={k} className="flex items-baseline gap-2">
              <span className="text-[#585b70]">{k}</span>
              <span className="text-[#45475a]">=</span>
              <span className="text-[#cdd6f4] font-semibold">{String(v)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Calc block */}
      {step.calc && (
        <pre className="text-xs text-[#6c7086] font-mono leading-relaxed bg-[#181825] rounded-lg px-4 py-3 overflow-x-auto whitespace-pre">
          {step.calc}
        </pre>
      )}

      {/* Description */}
      <p className="text-sm text-[#6c7086] leading-relaxed">{step.description}</p>

      {/* Note */}
      {step.state.note && (
        <p className="text-xs text-[#6c7086] leading-relaxed border-l-2 border-indigo-700 pl-3">
          {step.state.note}
        </p>
      )}
    </div>
  )
}
