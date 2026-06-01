'use client'

import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { MockConfig } from '@/data/types'

interface Props {
  mock: MockConfig
  stepLabel: string
  stepDescription: string
  onLike: () => void
  liked: boolean
  started: boolean
}

export function InstagramMock({ mock, stepLabel, stepDescription, onLike, liked, started }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col h-full">
      {/* IG header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
        <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 p-0.5">
          <div className="w-full h-full rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
            {mock.username[0].toUpperCase()}
          </div>
        </div>
        <div>
          <p className="text-sm font-semibold text-gray-900">{mock.username}</p>
          <p className="text-xs text-gray-400">{mock.location}</p>
        </div>
        <button className="ml-auto text-gray-400 text-lg">···</button>
      </div>

      {/* Photo */}
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        {mock.image ? (
          <Image
            src={mock.image}
            alt={mock.caption}
            fill
            className="object-cover"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100 flex items-center justify-center">
            <div className="text-4xl">🌅</div>
          </div>
        )}

        {/* Like animation overlay */}
        <AnimatePresence>
          {liked && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1.2, opacity: 1 }}
              exit={{ scale: 2, opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <span className="text-6xl drop-shadow-lg">❤️</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Action row */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-4 mb-2">
          <button
            onClick={onLike}
            className="text-2xl transition-transform active:scale-90 hover:scale-110"
            aria-label="Like post"
          >
            <AnimatePresence mode="wait">
              <motion.span
                key={liked ? 'liked' : 'not-liked'}
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 15 }}
              >
                {liked ? '❤️' : '🤍'}
              </motion.span>
            </AnimatePresence>
          </button>
          <button className="text-2xl text-gray-600 hover:text-gray-900 transition-colors">💬</button>
          <button className="text-2xl text-gray-600 hover:text-gray-900 transition-colors">↗</button>
          <button className="text-2xl text-gray-600 hover:text-gray-900 transition-colors ml-auto">🔖</button>
        </div>

        <p className="text-sm font-semibold text-gray-900 mb-1">
          {liked ? `${mock.likeCount.replace(/,(\d+)$/, (_, n) => `,${String(parseInt(n) + 1).padStart(n.length, '0')}` )}` : mock.likeCount} likes
        </p>
        <p className="text-sm text-gray-700">
          <span className="font-semibold">{mock.username}</span>{' '}
          <span className="text-gray-500">{mock.caption}</span>
        </p>
      </div>

      {/* Step badge */}
      <div className="mx-4 mb-4 mt-2">
        {!started ? (
          <button
            onClick={onLike}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl py-2.5 transition-colors"
          >
            Tap to like and start the walkthrough →
          </button>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={stepLabel}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              className="bg-indigo-50 border border-indigo-200 rounded-xl px-3 py-2.5"
            >
              <p className="text-xs font-semibold text-indigo-700 mb-0.5">{stepLabel}</p>
              <p className="text-xs text-indigo-500 leading-snug">{stepDescription}</p>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
