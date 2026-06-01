'use client'

import { useRef, useCallback, useState } from 'react'

export type TTSStatus = 'idle' | 'loading-model' | 'generating' | 'playing'

// Module-level singleton — model loads once across all hook instances
let ttsInstance: any = null
let loadPromise: Promise<any> | null = null

async function getTTS(): Promise<any> {
  if (ttsInstance) return ttsInstance
  if (!loadPromise) {
    loadPromise = (async () => {
      const { KokoroTTS } = await import('kokoro-js')
      ttsInstance = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0', { dtype: 'q8' })
      return ttsInstance
    })()
  }
  return loadPromise
}

export function stripForSpeech(text: string): string {
  return text.replace(/\*\*/g, '').replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim()
}

export function useKokoroTTS() {
  const [status, setStatus] = useState<TTSStatus>('idle')
  const [activeText, setActiveText] = useState<string | null>(null)
  const sourceRef = useRef<AudioBufferSourceNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const activeTextRef = useRef<string | null>(null)

  const stop = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop() } catch { /* already stopped */ }
      sourceRef.current.disconnect()
      sourceRef.current = null
    }
    activeTextRef.current = null
    setStatus('idle')
    setActiveText(null)
  }, [])

  const speak = useCallback(async (text: string) => {
    // Toggle off if this text is already active
    if (activeTextRef.current === text) {
      stop()
      return
    }
    stop()

    activeTextRef.current = text
    setActiveText(text)
    setStatus(ttsInstance ? 'generating' : 'loading-model')

    try {
      const tts = await getTTS()
      setStatus('generating')

      const result = await tts.generate(text, { voice: 'af_sarah' })

      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)()
      }
      const ctx = audioCtxRef.current
      if (ctx.state === 'suspended') await ctx.resume()

      const audioData = result.audio as Float32Array<ArrayBuffer>
      const buffer = ctx.createBuffer(1, audioData.length, result.sampling_rate)
      buffer.copyToChannel(audioData, 0)

      const source = ctx.createBufferSource()
      source.buffer = buffer
      source.connect(ctx.destination)
      sourceRef.current = source

      setStatus('playing')
      source.onended = () => {
        setStatus('idle')
        setActiveText(null)
        activeTextRef.current = null
        sourceRef.current = null
      }
      source.start()
    } catch (err) {
      console.error('[TTS]', err)
      setStatus('idle')
      setActiveText(null)
      activeTextRef.current = null
    }
  }, [stop])

  return { speak, stop, status, activeText }
}
