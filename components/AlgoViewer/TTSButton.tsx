'use client'

import { TTSStatus } from '@/lib/useKokoroTTS'

interface Props {
  text: string
  speak: (text: string) => void
  status: TTSStatus
  activeText: string | null
  className?: string
}

export function TTSButton({ text, speak, status, activeText, className = '' }: Props) {
  const isActive = activeText === text
  const isLoading = isActive && (status === 'loading-model' || status === 'generating')
  const isPlaying = isActive && status === 'playing'

  return (
    <button
      onClick={(e) => { e.stopPropagation(); speak(text) }}
      className={`shrink-0 w-6 h-6 flex items-center justify-center rounded transition-colors ${
        isPlaying ? 'text-indigo-400' : 'text-[#45475a] hover:text-[#6c7086]'
      } ${className}`}
      title={isPlaying ? 'Stop' : 'Read aloud'}
    >
      {isLoading ? (
        <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : isPlaying ? (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="4" height="12" rx="1" />
          <rect x="14" y="6" width="4" height="12" rx="1" />
        </svg>
      ) : (
        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02z" />
        </svg>
      )}
    </button>
  )
}
