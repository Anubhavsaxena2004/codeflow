'use client'

import { useRef, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * Tilts its content towards the pointer, with a glare that follows it (styles in globals.css).
 * Only on a mouse or pen; touch screens and reduced motion get a still card.
 */
export function Tilt({ children, className, max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const element = useRef<HTMLDivElement>(null)

  const move = (event: React.PointerEvent) => {
    const node = element.current
    if (!node || event.pointerType === 'touch') return
    const box = node.getBoundingClientRect()
    const x = (event.clientX - box.left) / box.width
    const y = (event.clientY - box.top) / box.height
    node.style.setProperty('--rx', `${(0.5 - y) * max}deg`)
    node.style.setProperty('--ry', `${(x - 0.5) * max}deg`)
    node.style.setProperty('--gx', `${x * 100}%`)
    node.style.setProperty('--gy', `${y * 100}%`)
  }

  const leave = () => {
    element.current?.style.setProperty('--rx', '0deg')
    element.current?.style.setProperty('--ry', '0deg')
  }

  return (
    <div ref={element} onPointerMove={move} onPointerLeave={leave} className={cn('tilt', className)}>
      {children}
      <span aria-hidden className="tilt-glare" />
    </div>
  )
}
