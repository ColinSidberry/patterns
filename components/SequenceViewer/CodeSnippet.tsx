'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { CodeLine } from '@/data/types'

interface Props {
  file: string
  lines: CodeLine[]
  stepKey: string
  onExpand?: () => void
}

export function CodeSnippet({ file, lines, stepKey, onExpand }: Props) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepKey}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
        className="rounded-xl overflow-hidden border border-gray-700"
      >
        {/* File tab */}
        <div className="bg-gray-800 px-4 py-2 flex items-center gap-2 border-b border-gray-700">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
            <div className="w-3 h-3 rounded-full bg-green-500/60" />
          </div>
          <span className="text-xs text-gray-400 font-mono ml-2">{file}</span>
          {onExpand && (
            <button
              onClick={onExpand}
              className="ml-auto flex items-center gap-1 text-[11px] font-mono text-indigo-400 hover:text-indigo-300 bg-indigo-900/40 hover:bg-indigo-800/50 px-2 py-0.5 rounded transition-colors"
              title="Open full file view"
            >
              <span>⊞</span>
              <span>expand</span>
            </button>
          )}
        </div>

        {/* Code */}
        <div className="bg-gray-900 px-4 py-3 font-mono text-sm overflow-x-auto">
          {lines.map((line, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 px-1 py-0.5 rounded transition-colors ${
                line.highlight ? 'bg-indigo-500/20' : ''
              }`}
            >
              <span className="text-gray-600 select-none text-xs pt-0.5 w-5 text-right shrink-0">
                {line.text ? i + 1 : ''}
              </span>
              <span className={`leading-relaxed whitespace-pre ${getLineColor(line.text, line.highlight)}`}>
                {line.text || '\u00A0'}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function getLineColor(text: string, highlight?: boolean): string {
  if (!text) return 'text-gray-500'
  if (text.trimStart().startsWith('#')) return 'text-gray-500'
  if (highlight) return 'text-indigo-200'
  if (text.includes('await ') || text.includes('async ') || text.includes('return ')) return 'text-blue-300'
  if (text.includes('"') || text.includes("'")) return 'text-green-300'
  return 'text-gray-200'
}
