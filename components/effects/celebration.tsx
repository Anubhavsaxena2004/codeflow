'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Skull } from 'lucide-react'
import { GameButton, RankEmblem } from '@/components/ui/game'

interface Piece {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  color: string
  spin: number
  angle: number
  flip: number
  round: boolean
}

// Confetti palette: gold, green, purple, plus the current world color
function getConfettiPalette(worldColor?: string): string[] {
  const base = ['#f5b301', '#22c55e', '#a855f7']
  return worldColor ? [worldColor, ...base] : base
}

function burst(width: number, height: number, colors: string[], count: number): Piece[] {
  const palette = getConfettiPalette(colors[0])
  const maxCount = Math.min(count, 120) // Prompt rule: at most 120 particles

  return Array.from({ length: maxCount }, (_, index) => {
    const left = index % 2 === 0
    const speed = 10 + Math.random() * 8
    const angle = (left ? -60 : -120) + (Math.random() - 0.5) * 40
    const radians = (angle * Math.PI) / 180
    return {
      x: left ? -10 : width + 10,
      y: height * 0.72,
      vx: Math.cos(radians) * speed,
      vy: Math.sin(radians) * speed,
      size: 6 + Math.random() * 6,
      color: palette[Math.floor(Math.random() * palette.length)],
      spin: (Math.random() - 0.5) * 0.3,
      angle: Math.random() * Math.PI,
      flip: Math.random() * Math.PI,
      round: Math.random() < 0.3,
    }
  })
}

export function Celebration({
  colors,
  boss = false,
  rankUp = null,
  onDismiss,
}: {
  colors: string[]
  boss?: boolean
  rankUp?: number | null
  onDismiss?: () => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const previousFocusRef = useRef<HTMLElement | null>(null)
  const [banner, setBanner] = useState(boss || !!rankUp)
  const [mounted, setMounted] = useState(false)
  const [flash, setFlash] = useState(boss)

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null
    setMounted(true)
    return () => {
      // Return focus to where it was before celebration overlay
      previousFocusRef.current?.focus?.()
    }
  }, [])

  // Single flash for boss at most 20% opacity, disappears after 300ms
  useEffect(() => {
    if (boss) {
      const flashTimer = window.setTimeout(() => setFlash(false), 300)
      return () => window.clearTimeout(flashTimer)
    }
  }, [boss])

  // Dismiss on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setBanner(false)
        onDismiss?.()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onDismiss])

  const dismiss = () => {
    setBanner(false)
    onDismiss?.()
  }

  useEffect(() => {
    if (!mounted) return
    const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    // Auto-dismiss banner after 2.5s
    const hide = window.setTimeout(() => dismiss(), rankUp ? 3200 : 2500)
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context || prefersReduced) return () => window.clearTimeout(hide)

    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const width = window.innerWidth
    const height = window.innerHeight
    element.width = width * ratio
    element.height = height * ratio
    context.scale(ratio, ratio)

    const pieces = burst(width, height, colors, 120)
    const started = performance.now()
    const lifetime = 2500 // Confetti stops after 2.5s
    let frame = 0

    const draw = (now: number) => {
      const age = now - started
      context.clearRect(0, 0, width, height)
      context.globalAlpha = age > lifetime - 600 ? Math.max(0, (lifetime - age) / 600) : 1
      for (const piece of pieces) {
        piece.vy += 0.32
        piece.vx *= 0.985
        piece.vy *= 0.985
        piece.x += piece.vx
        piece.y += piece.vy
        piece.angle += piece.spin
        piece.flip += 0.12
        context.save()
        context.translate(piece.x, piece.y)
        context.rotate(piece.angle)
        context.scale(1, Math.cos(piece.flip))
        context.fillStyle = piece.color
        if (piece.round) {
          context.beginPath()
          context.arc(0, 0, piece.size / 2.2, 0, Math.PI * 2)
          context.fill()
        } else {
          context.fillRect(-piece.size / 2, -piece.size / 4, piece.size, piece.size / 2)
        }
        context.restore()
      }
      if (age < lifetime) {
        frame = requestAnimationFrame(draw)
      } else {
        context.clearRect(0, 0, width, height)
      }
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(hide)
    }
  }, [mounted, colors])

  if (!mounted) return null

  const announcement = boss
    ? 'Boss defeated! Level complete!'
    : rankUp
      ? `Rank up! You reached Rank ${rankUp}!`
      : 'Level complete!'

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={announcement}
      className="fixed inset-0 z-[70] grid place-items-center p-4 pointer-events-auto"
    >
      <div className="sr-only" aria-live="polite">
        {announcement}
      </div>

      {/* Screen flash: at most 20% opacity, single time */}
      {flash && (
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 bg-[#ef4444]/20 transition-opacity duration-300"
        />
      )}

      {/* Confetti canvas */}
      <canvas ref={canvas} className="pointer-events-none fixed inset-0 size-full" aria-hidden />

      {banner && (
        <div className="relative z-10 flex flex-col items-center gap-4 text-center max-w-sm sm:max-w-md animate-banner">
          {boss && (
            <div className="relative flex flex-col items-center gap-2.5 rounded-2xl bg-gradient-to-r from-[#b91c1c] via-[#ea580c] to-[#d97706] p-6 text-white shadow-[0_20px_60px_rgb(185_28_28/0.45)] ring-4 ring-white/70">
              <div className="flex items-center gap-3">
                <Skull className="size-10 shrink-0 animate-bounce" aria-hidden />
                <h2 className="font-display text-[26px] sm:text-[34px] font-bold tracking-tight text-white leading-none">
                  BOSS DEFEATED!
                </h2>
              </div>
              <p className="text-sm font-medium text-white/90">
                Incredible mastery of this world&apos;s challenges!
              </p>
              <div className="mt-3">
                <GameButton variant="primary" size="md" onClick={dismiss} autoFocus>
                  Continue
                </GameButton>
              </div>
            </div>
          )}

          {rankUp && !boss && (
            <div className="relative flex flex-col items-center gap-3 rounded-2xl bg-gradient-to-br from-[#7c3aed] via-[#6d28d9] to-[#4c1d95] p-6 text-white shadow-[0_20px_60px_rgb(109_40_217/0.45)] ring-4 ring-white/70">
              {/* Rotating rays behind emblem */}
              <div className="relative grid place-items-center">
                <div
                  className="pointer-events-none absolute -inset-8 opacity-30 animate-spin [animation-duration:12s]"
                  aria-hidden
                >
                  <svg viewBox="0 0 100 100" className="size-full fill-white">
                    <polygon points="50,50 45,0 55,0" />
                    <polygon points="50,50 85,15 95,25" />
                    <polygon points="50,50 100,45 100,55" />
                    <polygon points="50,50 85,85 75,95" />
                    <polygon points="50,50 45,100 55,100" />
                    <polygon points="50,50 15,85 5,75" />
                    <polygon points="50,50 0,45 0,55" />
                    <polygon points="50,50 15,15 25,5" />
                  </svg>
                </div>
                <RankEmblem rank={rankUp} size={64} className="shadow-lg relative z-1" />
              </div>
              <div className="leading-tight">
                <span className="block text-xs font-bold uppercase tracking-widest text-[#fde047]">
                  Rank up!
                </span>
                <span className="block font-display text-[28px] sm:text-[36px] font-bold text-white">
                  Rank {rankUp}
                </span>
              </div>
              <div className="mt-2">
                <GameButton variant="primary" size="md" onClick={dismiss} autoFocus>
                  Continue
                </GameButton>
              </div>
            </div>
          )}
        </div>
      )}
    </div>,
    document.body,
  )
}
