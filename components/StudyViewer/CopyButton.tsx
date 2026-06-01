'use client'

import { useState } from 'react'

interface Props {
  text: string | (() => string)
  label?: string
  className?: string
}

export function CopyButton({ text, label = 'Copy', className }: Props) {
  const [state, setState] = useState<'idle' | 'copied' | 'error'>('idle')

  const handleClick = async () => {
    const value = typeof text === 'function' ? text() : text
    try {
      await navigator.clipboard.writeText(value)
      setState('copied')
      setTimeout(() => setState('idle'), 1200)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 1200)
    }
  }

  return (
    <button
      onClick={handleClick}
      className={
        className ??
        `text-xs font-medium px-2.5 py-1 rounded-md border transition-colors ${
          state === 'copied'
            ? 'bg-emerald-900/30 border-emerald-500/50 text-emerald-300'
            : state === 'error'
              ? 'bg-red-900/30 border-red-500/50 text-red-300'
              : 'bg-[#181825] border-[#313244] text-[#a6adc8] hover:border-[#45475a]'
        }`
      }
    >
      {state === 'copied' ? 'Copied!' : state === 'error' ? 'Failed' : label}
    </button>
  )
}
