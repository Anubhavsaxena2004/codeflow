'use client'

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Crown, Skull } from 'lucide-react'

// The moment a level is passed: confetti from both sides of the screen, plus a banner for a
// defeated boss or a new rank. Purely visual; it never blocks clicks and cleans up after itself.

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

const PALETTE = ['#22c55e', '#06b6d4', '#7c3aed', '#f97316', '#facc15', '#ec4899']

function burst(width: number, height: number, colors: string[], count: number): Piece[] {
  const pick = [...colors, ...PALETTE]
  return Array.from({ length: count }, (_, index) => {
    const left = index % 2 === 0
    const speed = 11 + Math.random() * 9
    const angle = (left ? -60 : -120) + (Math.random() - 0.5) * 40
    const radians = (angle * Math.PI) / 180
    return {
      x: left ? -10 : width + 10,
      y: height * 0.72,
      vx: Math.cos(radians) * speed,
      vy: Math.sin(radians) * speed,
      size: 6 + Math.random() * 7,
      color: pick[Math.floor(Math.random() * pick.length)],
      spin: (Math.random() - 0.5) * 0.3,
      angle: Math.random() * Math.PI,
      flip: Math.random() * Math.PI,
      round: Math.random() < 0.3,
    }
  })
}

export function Celebration({ colors, boss = false, rankUp = null }: { colors: string[]; boss?: boolean; rankUp?: number | null }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [banner, setBanner] = useState(boss || !!rankUp)
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!mounted) return
    const hide = window.setTimeout(() => setBanner(false), rankUp ? 3400 : 2300)
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return () => window.clearTimeout(hide)

    const ratio = Math.min(window.devicePixelRatio || 1, 2)
    const width = window.innerWidth
    const height = window.innerHeight
    element.width = width * ratio
    element.height = height * ratio
    context.scale(ratio, ratio)

    const pieces = burst(width, height, colors, boss ? 220 : 150)
    const started = performance.now()
    const lifetime = 3200
    let frame = 0

    const draw = (now: number) => {
      const age = now - started
      context.clearRect(0, 0, width, height)
      context.globalAlpha = age > lifetime - 700 ? Math.max(0, (lifetime - age) / 700) : 1
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
        // Scaling one axis by cos() makes each piece look like it is flipping in 3D.
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
      if (age < lifetime) frame = requestAnimationFrame(draw)
      else context.clearRect(0, 0, width, height)
    }
    frame = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(hide)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one burst per mount
  }, [mounted])

  if (!mounted) return null
  return createPortal(
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[70]">
      {boss && <div className="animate-flash absolute inset-0 bg-[radial-gradient(circle,#fecaca,#dc2626)]" />}
      <canvas ref={canvas} className="absolute inset-0 size-full" />
      {banner && (
        <div className="absolute inset-0 grid place-items-center p-6">
          <div className="animate-banner flex flex-col items-center gap-2 text-center">
            {boss && (
              <div className="flex items-center gap-3 rounded-3xl bg-gradient-to-br from-[#f87171] to-[#991b1b] px-7 py-4 text-white shadow-[0_20px_60px_rgb(220_38_38/0.45)] ring-4 ring-white/70">
                <Skull className="size-10" />
                <span className="text-3xl font-black tracking-wide">BOSS DEFEATED!</span>
              </div>
            )}
            {rankUp && (
              <div className="flex items-center gap-3 rounded-3xl bg-gradient-to-br from-[#a855f7] to-[#5b21b6] px-7 py-4 text-white shadow-[0_20px_60px_rgb(124_58_237/0.45)] ring-4 ring-white/70">
                <Crown className="size-9 fill-[#fde047] text-[#fde047]" />
                <span className="text-left leading-tight">
                  <span className="block text-sm font-bold uppercase tracking-widest opacity-85">Rank up!</span>
                  <span className="block text-3xl font-black">Rank {rankUp}</span>
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}
