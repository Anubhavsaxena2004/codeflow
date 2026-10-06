'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { Volume2, VolumeX } from 'lucide-react'
import { GameTooltip } from '@/components/ui/game'
import { cn } from '@/lib/utils'

export type SoundEffect = 'click' | 'success' | 'error' | 'levelUp'

interface SoundContextValue {
  enabled: boolean
  toggle: () => void
  play: (sound: SoundEffect) => void
}

const SoundContext = createContext<SoundContextValue | null>(null)

const SOUND_STORAGE_KEY = 'codeflow-sound'
const MASTER_VOLUME = 0.25

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const audioCtxRef = useRef<AudioContext | null>(null)

  // Read setting after mount to avoid hydration mismatch
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(SOUND_STORAGE_KEY)
      if (stored === 'on') {
        setEnabled(true)
      }
    } catch {
      // localStorage may be unavailable in private browsing
    }
  }, [])

  const getAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null
    if (!audioCtxRef.current) {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
      if (AudioCtxClass) {
        audioCtxRef.current = new AudioCtxClass()
      }
    }
    if (audioCtxRef.current && audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume().catch(() => {})
    }
    return audioCtxRef.current
  }, [])

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      try {
        window.localStorage.setItem(SOUND_STORAGE_KEY, next ? 'on' : 'off')
      } catch {
        // ignore storage errors
      }
      if (next) {
        // Initialize context on user gesture
        getAudioContext()
      }
      return next
    })
  }, [getAudioContext])

  const play = useCallback(
    (sound: SoundEffect) => {
      if (!enabled) return
      if (typeof document !== 'undefined' && document.hidden) return

      const ctx = getAudioContext()
      if (!ctx) return

      try {
        const masterGain = ctx.createGain()
        masterGain.gain.setValueAtTime(MASTER_VOLUME, ctx.currentTime)
        masterGain.connect(ctx.destination)

        const now = ctx.currentTime

        switch (sound) {
          case 'click': {
            // An 8ms triangle blip at about 660 Hz, very quiet
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'triangle'
            osc.frequency.setValueAtTime(660, now)
            gain.gain.setValueAtTime(0.08, now)
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.008)
            osc.connect(gain)
            gain.connect(masterGain)
            osc.start(now)
            osc.stop(now + 0.008)
            break
          }

          case 'success': {
            // Rising two-note chime, C6 (1046.5 Hz) then G6 (1567.98 Hz), 90ms each, sine wave
            const osc1 = ctx.createOscillator()
            const gain1 = ctx.createGain()
            osc1.type = 'sine'
            osc1.frequency.setValueAtTime(1046.5, now)
            gain1.gain.setValueAtTime(0.18, now)
            gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.09)
            osc1.connect(gain1)
            gain1.connect(masterGain)
            osc1.start(now)
            osc1.stop(now + 0.09)

            const osc2 = ctx.createOscillator()
            const gain2 = ctx.createGain()
            osc2.type = 'sine'
            osc2.frequency.setValueAtTime(1567.98, now + 0.09)
            gain2.gain.setValueAtTime(0.2, now + 0.09)
            gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.18)
            osc2.connect(gain2)
            gain2.connect(masterGain)
            osc2.start(now + 0.09)
            osc2.stop(now + 0.18)
            break
          }

          case 'error': {
            // Soft low "bonk", about 180 Hz triangle, 140ms with a quick decay; gentle, never harsh
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()
            osc.type = 'triangle'
            osc.frequency.setValueAtTime(180, now)
            osc.frequency.exponentialRampToValueAtTime(140, now + 0.14)
            gain.gain.setValueAtTime(0.18, now)
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14)
            osc.connect(gain)
            gain.connect(masterGain)
            osc.start(now)
            osc.stop(now + 0.14)
            break
          }

          case 'levelUp': {
            // 4-note arpeggio C–E–G–C, 70ms each, with a soft tail
            const notes = [523.25, 659.25, 783.99, 1046.5]
            notes.forEach((freq, idx) => {
              const start = now + idx * 0.07
              const isLast = idx === 3
              const duration = isLast ? 0.35 : 0.07
              const osc = ctx.createOscillator()
              const gain = ctx.createGain()
              osc.type = 'sine'
              osc.frequency.setValueAtTime(freq, start)
              gain.gain.setValueAtTime(0.2, start)
              gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
              osc.connect(gain)
              gain.connect(masterGain)
              osc.start(start)
              osc.stop(start + duration)
            })
            break
          }
        }
      } catch {
        // Catch any audio context play error quietly
      }
    },
    [enabled, getAudioContext],
  )

  return <SoundContext.Provider value={{ enabled, toggle, play }}>{children}</SoundContext.Provider>
}

export function useSound() {
  const context = useContext(SoundContext)
  if (!context) {
    return {
      enabled: false,
      toggle: () => {},
      play: () => {},
    }
  }
  return context
}

export function SoundToggle({ className, variant = 'cf' }: { className?: string; variant?: 'cf' | 'ide' }) {
  const { enabled, toggle } = useSound()

  const variantClasses =
    variant === 'ide'
      ? 'text-(--ide-muted) hover:text-(--ide-heading) hover:bg-(--ide-hover) focus-visible:ring-(--focus-ring)'
      : 'text-(--cf-muted) hover:text-(--cf-text) hover:bg-black/5 dark:hover:bg-white/5 focus-visible:ring-(--focus-ring)'

  return (
    <GameTooltip content={enabled ? 'Sound on' : 'Sound off'} side="bottom">
      <button
        type="button"
        aria-pressed={enabled}
        aria-label="Sound effects"
        onClick={toggle}
        className={cn(
          'flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors duration-150',
          'focus-visible:outline-none focus-visible:ring-2',
          variantClasses,
          className,
        )}
      >
        {enabled ? <Volume2 className="size-4.5 sm:size-5" /> : <VolumeX className="size-4.5 sm:size-5" />}
      </button>
    </GameTooltip>
  )
}
